using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace Thetis.RadioServices
{
    public sealed class RadioCommandDispatcher : IDisposable
    {
        private sealed class Work
        {
            public RadioCommand Command;
            public Connection Connection;
            public CancellationToken Cancellation;
            public readonly TaskCompletionSource<CommandResult> Result = new TaskCompletionSource<CommandResult>(TaskCreationOptions.RunContinuationsAsynchronously);
        }
        private sealed class Connection
        {
            public long HighWater;
            public readonly Dictionary<long, Tuple<RadioCommand, CommandResult>> Results = new Dictionary<long, Tuple<RadioCommand, CommandResult>>();
            public readonly Queue<long> Order = new Queue<long>();
        }
        private sealed class Registration : IDisposable
        {
            private Action close;
            public Registration(Action close) { this.close = close; }
            public void Dispose() { Interlocked.Exchange(ref close, null)?.Invoke(); }
        }
        private readonly RadioApplication application;
        private readonly IRadioCommandTarget target;
        private readonly BlockingCollection<Work> queue;
        private readonly Dictionary<string, Connection> connections = new Dictionary<string, Connection>(StringComparer.Ordinal);
        private readonly object gate = new object();
        private readonly CancellationTokenSource lifetime = new CancellationTokenSource();
        private readonly Thread worker;
        private readonly int resultCapacity;
        private bool stopping;

        public RadioCommandDispatcher(RadioApplication application, IRadioCommandTarget target, int capacity = 256, int resultCapacity = 256)
        {
            if (capacity < 1 || resultCapacity < 1) throw new ArgumentOutOfRangeException();
            this.application = application ?? throw new ArgumentNullException(nameof(application));
            this.target = target ?? throw new ArgumentNullException(nameof(target)); this.resultCapacity = resultCapacity;
            queue = new BlockingCollection<Work>(capacity);
            worker = new Thread(Run) { IsBackground = true, Name = "Thetis radio command dispatcher" }; worker.Start();
        }

        public IDisposable OpenConnection(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length > 128) throw new ArgumentException("Invalid connection identity.");
            lock (gate)
            {
                if (stopping) throw new ObjectDisposedException(nameof(RadioCommandDispatcher));
                if (connections.ContainsKey(id)) throw new InvalidOperationException("Connection identity is already registered.");
                var connection = new Connection(); connections.Add(id, connection);
                return new Registration(() => { lock (gate) { if (connections.TryGetValue(id, out var current) && ReferenceEquals(current, connection)) connections.Remove(id); } });
            }
        }

        public Task<CommandResult> ExecuteAsync(RadioCommand command, CancellationToken cancellationToken)
        {
            if (command == null) throw new ArgumentNullException(nameof(command));
            lock (gate)
            {
                if (stopping) return Task.FromResult(Error(command, "stopping", "The application is stopping."));
                if (command.ConnectionId == null || !connections.TryGetValue(command.ConnectionId, out var connection))
                    return Task.FromResult(Error(command, "staleConnection", "Reconnect and obtain a new snapshot."));
                var work = new Work { Command = command, Connection = connection, Cancellation = cancellationToken };
                if (!queue.TryAdd(work)) work.Result.SetResult(Error(command, "busy", "The command queue is full; the command was not applied."));
                return work.Result.Task;
            }
        }

        private CommandResult Error(RadioCommand command, string code, string message) => new CommandResult(command, application.GetSnapshot(), new RadioError(code, message));
        private void Run()
        {
            foreach (var work in queue.GetConsumingEnumerable())
            {
                try { work.Result.TrySetResult(Execute(work)); }
                catch (Exception ex) { work.Result.TrySetResult(Error(work.Command, "applicationFailed", ex.Message)); }
            }
        }
        private CommandResult Execute(Work work)
        {
            var command = work.Command;
            lock (gate)
            {
                if (stopping) return Error(command, "stopping", "The application is stopping.");
                if (!connections.TryGetValue(command.ConnectionId, out var registered) || !ReferenceEquals(registered, work.Connection))
                    return Error(command, "staleConnection", "The connection has closed.");
            }
            var snapshot = application.GetSnapshot();
            if (command.SessionGeneration != snapshot.SessionGeneration) return Error(command, "staleGeneration", "The backend has restarted; obtain a new snapshot.");
            if (command.Sequence < 1 || command.Sequence > RadioWire.MaxSafeInteger || string.IsNullOrEmpty(command.RequestId) || command.RequestId.Length > 128)
                return Error(command, "invalidEnvelope", "A request identity and positive safe sequence are required.");
            var connection = work.Connection;
            if (connection.Results.TryGetValue(command.Sequence, out var cached))
                return command.SameAs(cached.Item1) ? cached.Item2 : Error(command, "duplicateMismatch", "A sequence cannot identify different commands.");
            if (command.Sequence <= connection.HighWater) return Error(command, "oldSequence", "This sequence has already been processed; it will not be reapplied.");
            connection.HighWater = command.Sequence;
            CommandResult result;
            if (work.Cancellation.IsCancellationRequested) result = Error(command, "cancelled", "The command was cancelled before application.");
            else if (command.ExpectedRevision.HasValue && command.ExpectedRevision != snapshot.Revision) result = Error(command, "conflict", "The state has changed; refresh before applying this edit.");
            else if (!snapshot.Capabilities.Contains(command.Operation)) result = Error(command, "unavailable", "This operation is not available in the current state.");
            else if (Validate(command, snapshot) is RadioError validation) result = new CommandResult(command, snapshot, validation);
            else
            {
                try
                {
                    using (var cancellation = CancellationTokenSource.CreateLinkedTokenSource(work.Cancellation, lifetime.Token))
                    {
                        var mutation = target.ApplyAsync(command, snapshot, cancellation.Token).GetAwaiter().GetResult();
                        // Once a native mutation returns effective state, publish it even if the caller has since disconnected.
                        result = new CommandResult(command, application.Commit(mutation));
                    }
                }
                catch (OperationCanceledException) { result = Error(command, "cancelled", "The operation was cancelled."); }
                catch (Exception ex) { result = Error(command, "applicationFailed", ex.Message); }
            }
            connection.Results.Add(command.Sequence, Tuple.Create(command, result)); connection.Order.Enqueue(command.Sequence);
            while (connection.Order.Count > resultCapacity) connection.Results.Remove(connection.Order.Dequeue());
            return result;
        }
        private static RadioError Validate(RadioCommand command, RadioSnapshot state)
        {
            if (command.Operation == "receiver.setFrequency")
            {
                if (!new[] { "rx1", "rx2", "sub" }.Contains(command.Target) || !state.Receivers.Any(x => x.Id == command.Target))
                    return new RadioError("invalidTarget", "The receiver does not exist in the current topology.");
                var payload = command.Payload;
                if (payload.Count != 2 || payload["vfo"]?.Type != JTokenType.String || !new[] { "a", "b" }.Contains((string)payload["vfo"]) ||
                    payload["frequencyHz"]?.Type != JTokenType.Integer || !long.TryParse(payload["frequencyHz"].ToString(), out long hz) || hz < 0 || hz > RadioWire.MaxSafeInteger)
                    return new RadioError("invalidPayload", "Frequency requires VFO a/b and a nonnegative safe integer number of Hz.");
            }
            return null;
        }
        public void Dispose()
        {
            lock (gate) { if (stopping) return; stopping = true; connections.Clear(); queue.CompleteAdding(); }
            lifetime.Cancel();
            if (Thread.CurrentThread != worker && !worker.Join(10000)) throw new TimeoutException("Radio command worker did not stop within 10 seconds.");
        }
    }
}
