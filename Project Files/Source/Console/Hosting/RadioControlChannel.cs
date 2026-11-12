using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Thetis.RadioServices;

namespace Thetis.Hosting
{
    public sealed class RadioControlChannel : IDisposable
    {
        private sealed class Session
        {
            public readonly string Id = Guid.NewGuid().ToString("N");
            public readonly Stream Stream;
            public readonly BlockingCollection<object> Output = new BlockingCollection<object>(32);
            public readonly AutoResetEvent Wake = new AutoResetEvent(false);
            public RadioSnapshot Latest;
            public IDisposable Connection;
            public long LastReceived = Stopwatch.GetTimestamp();
            public int PromptsDirty = 1, Closed;
            public Session(Stream stream) { Stream = stream; }
            public void Signal() { if (Volatile.Read(ref Closed) == 0) { try { Wake.Set(); } catch (ObjectDisposedException) { } } }
            public void Close()
            {
                if (Interlocked.Exchange(ref Closed, 1) != 0) return;
                Interlocked.Exchange(ref Connection, null)?.Dispose();
                try { Wake.Set(); Stream.Dispose(); } catch (IOException) { } catch (ObjectDisposedException) { }
            }
            public void Queue(object message)
            {
                if (Volatile.Read(ref Closed) != 0) return;
                if (!Output.TryAdd(message)) Close(); // A slow browser cannot retain an unbounded acknowledgment queue.
                Signal();
            }
        }
        private readonly object gate = new object();
        private readonly RadioApplication application;
        private readonly RadioCommandDispatcher dispatcher;
        private readonly TimeSpan idleTimeout;
        private Session active;
        private bool disposed;
        public int ActiveConnections { get { lock (gate) return active == null ? 0 : 1; } }
        public RadioSnapshot GetSnapshot() => application.GetSnapshot();
        public RadioControlChannel(RadioApplication application, RadioCommandDispatcher dispatcher, TimeSpan? idleTimeout = null)
        {
            this.application = application ?? throw new ArgumentNullException(nameof(application));
            this.dispatcher = dispatcher ?? throw new ArgumentNullException(nameof(dispatcher));
            this.idleTimeout = idleTimeout ?? TimeSpan.FromSeconds(45);
            if (this.idleTimeout <= TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(idleTimeout));
        }
        public void Run(Stream stream, HostHttpRequest request)
        {
            Session session;
            lock (gate) { session = disposed || active != null ? null : (active = new Session(stream)); }
            if (session == null)
            {
                HostWebSocket.Run(stream, request, _ => false, (send, close) => {
                    send(new JObject { ["type"] = "rejected", ["code"] = "controllerBusy", ["message"] = "Already in use" });
                    close(1008); return false;
                });
                return;
            }
            IDisposable connection = null;
            Timer deadline = null;
            Thread writer = null;
            Action<RadioSnapshot> changed = snapshot => { Interlocked.Exchange(ref session.Latest, snapshot); session.Signal(); };
            Action promptsChanged = () => { Interlocked.Exchange(ref session.PromptsDirty, 1); session.Signal(); };
            try
            {
                connection = dispatcher.OpenConnection(session.Id);
                session.Connection = connection;
                application.StateChanged += changed;
                application.Prompts.Changed += promptsChanged;
                HostWebSocket.Run(stream, request, message => Receive(session, message), (send, close) => {
                    var snapshot = application.GetSnapshot();
                    send(ToJson(new { type = "welcome", schemaVersion = 1, connectionId = session.Id, snapshot }));
                    writer = new Thread(() => WriteLoop(session, send, snapshot.Revision)) { IsBackground = true, Name = "Thetis control output" };
                    writer.Start();
                    int interval = (int)Math.Max(1, Math.Min(1000, idleTimeout.TotalMilliseconds / 4));
                    deadline = new Timer(_ => {
                        double seconds = (Stopwatch.GetTimestamp() - Interlocked.Read(ref session.LastReceived)) / (double)Stopwatch.Frequency;
                        if (seconds >= idleTimeout.TotalSeconds) session.Close();
                    }, null, interval, interval);
                    return true;
                }, 65536);
            }
            finally
            {
                application.StateChanged -= changed;
                application.Prompts.Changed -= promptsChanged;
                deadline?.Dispose(); session.Close(); connection?.Dispose();
                lock (gate) if (ReferenceEquals(active, session)) active = null;
                if (writer != null && !writer.Join(11000)) throw new TimeoutException("Control output worker did not stop.");
                // Output may still be referenced by an in-flight command continuation; it owns no native handle.
                session.Wake.Dispose();
            }
        }
        private static JObject ToJson(object value) => JObject.Parse(RadioWire.Serialize(value));
        private void WriteLoop(Session session, Action<JObject> send, long lastRevision)
        {
            try
            {
                while (Volatile.Read(ref session.Closed) == 0)
                {
                    while (session.Output.TryTake(out var message)) send(ToJson(message));
                    var snapshot = Interlocked.Exchange(ref session.Latest, null);
                    if (snapshot != null && snapshot.Revision > lastRevision)
                    { send(ToJson(new { type = "snapshot", snapshot })); lastRevision = snapshot.Revision; }
                    if (Interlocked.Exchange(ref session.PromptsDirty, 0) != 0)
                        send(ToJson(new { type = "prompts", prompts = application.Prompts.GetPending() }));
                    session.Wake.WaitOne(1000);
                }
            }
            catch (Exception ex) when (ex is IOException || ex is ObjectDisposedException || ex is JsonException) { session.Close(); }
        }
        private bool Receive(Session session, JObject message)
        {
            if (Volatile.Read(ref session.Closed) != 0) return false;
            try
            {
                switch ((string)message["type"])
                {
                    case "heartbeat": session.Queue(new { type = "heartbeat" }); break;
                    case "snapshot": session.Queue(new { type = "snapshot", snapshot = application.GetSnapshot() }); break;
                    case "respond":
                        if (message["promptId"]?.Type != JTokenType.String || message["choice"]?.Type != JTokenType.String) return false;
                        string promptId = (string)message["promptId"];
                        session.Queue(new { type = "promptResult", promptId, accepted = application.Prompts.Respond(promptId, (string)message["choice"]) });
                        break;
                    case "command":
                        if (message["schemaVersion"]?.Type != JTokenType.Integer || (string)message["schemaVersion"] != "1" || !(message["command"] is JObject value)) return false;
                        if (value["sequence"]?.Type != JTokenType.Integer || !(value["payload"] is JObject payload) ||
                            value["requestId"]?.Type != JTokenType.String || value["sessionGeneration"]?.Type != JTokenType.String ||
                            value["connectionId"]?.Type != JTokenType.String || value["operation"]?.Type != JTokenType.String ||
                            value["target"]?.Type != JTokenType.String ||
                            value["expectedRevision"] != null && value["expectedRevision"].Type != JTokenType.Null && value["expectedRevision"].Type != JTokenType.Integer) return false;
                        if ((string)value["connectionId"] != session.Id) return false;
                        var command = new RadioCommand((string)value["requestId"], (string)value["sessionGeneration"], session.Id,
                            (long)value["sequence"], (string)value["operation"], (string)value["target"], payload, (long?)value["expectedRevision"]);
                        _ = dispatcher.ExecuteAsync(command, CancellationToken.None).ContinueWith(task => {
                            if (task.Status == TaskStatus.RanToCompletion) session.Queue(new { type = "result", result = task.Result });
                            else session.Close();
                        }, TaskScheduler.Default);
                        break;
                    default: return false;
                }
                Interlocked.Exchange(ref session.LastReceived, Stopwatch.GetTimestamp());
                return true;
            }
            catch (Exception ex) when (ex is JsonException || ex is FormatException || ex is OverflowException || ex is ArgumentException) { return false; }
        }
        public void Dispose()
        {
            lock (gate) { if (disposed) return; disposed = true; active?.Close(); }
        }
    }
}
