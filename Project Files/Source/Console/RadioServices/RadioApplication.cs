using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Thetis.RadioServices
{
    // UI-neutral state owner. Native adapters publish only effective values; a view never owns this lifetime.
    public sealed class RadioApplication
    {
        private readonly object gate = new object();
        private readonly object lifetimeGate = new object();
        private readonly IRadioRuntime runtime;
        private readonly CancellationTokenSource lifetime = new CancellationTokenSource();
        private Task startTask, stopTask, runtimeStopTask;
        private bool runtimeEntered, stopRequested;
        public StartupPromptService Prompts { get; } = new StartupPromptService();
        private RadioSnapshot snapshot = new RadioSnapshot(Guid.NewGuid().ToString("N"), 0, "created", null, null);
        public RadioApplication(IRadioRuntime runtime = null) { this.runtime = runtime; }
        public event Action<RadioSnapshot> StateChanged;
        public event Action<Exception> ObserverFaulted;
        public RadioSnapshot GetSnapshot() { lock (gate) return snapshot; }

        public Task StartAsync(RadioStartOptions options, CancellationToken cancellationToken)
        {
            if (options == null) throw new ArgumentNullException(nameof(options));
            lock (lifetimeGate)
            {
                if (stopRequested) throw new InvalidOperationException("A stopped application requires a new backend generation.");
                if (runtime == null) throw new InvalidOperationException("No operational radio runtime has been installed.");
                return startTask ?? (startTask = Task.Run(() => StartCore(options, cancellationToken)));
            }
        }
        private async Task StartCore(RadioStartOptions options, CancellationToken cancellationToken)
        {
            using (var cancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, lifetime.Token))
            {
                try
                {
                    lock (lifetimeGate)
                    {
                        cancellation.Token.ThrowIfCancellationRequested();
                        runtimeEntered = true;
                        SetLifecycle("initializing");
                    }
                    var ready = await runtime.StartAsync(options, Prompts, cancellation.Token).ConfigureAwait(false);
                    lock (lifetimeGate)
                    {
                        cancellation.Token.ThrowIfCancellationRequested();
                        Publish("ready", ready.Receivers, ready.Capabilities);
                    }
                }
                catch (Exception ex)
                {
                    Exception failure = ex;
                    try { await StopRuntimeOnce().ConfigureAwait(false); }
                    catch (Exception cleanup) { failure = new AggregateException("Startup and rollback failed.", ex, cleanup); }
                    lock (lifetimeGate) if (!stopRequested) SetLifecycle("faulted", failure.Message);
                    if (!ReferenceEquals(ex, failure)) throw failure;
                    throw;
                }
            }
        }
        public Task StopAsync(CancellationToken cancellationToken)
        {
            Task stopping;
            lock (lifetimeGate)
            {
                stopRequested = true;
                stopping = stopTask ?? (stopTask = Task.Run(StopCore));
            }
            return AwaitWithCancellation(stopping, cancellationToken);
        }
        private async Task StopCore()
        {
            lock (lifetimeGate) SetLifecycle("stopping");
            lifetime.Cancel();
            Prompts.Dispose();
            Task starting;
            lock (lifetimeGate) starting = startTask;
            if (starting != null) { try { await starting.ConfigureAwait(false); } catch { /* Fault remains in the snapshot; rollback is awaited below. */ } }
            try
            {
                await StopRuntimeOnce().ConfigureAwait(false);
                lock (lifetimeGate) SetLifecycle("stopped");
            }
            catch (Exception ex) { lock (lifetimeGate) SetLifecycle("faulted", ex.Message); throw; }
        }
        private Task StopRuntimeOnce()
        {
            lock (lifetimeGate)
            {
                if (!runtimeEntered) return Task.CompletedTask;
                return runtimeStopTask ?? (runtimeStopTask = Task.Run(() => runtime.StopAsync(CancellationToken.None)));
            }
        }
        private void SetLifecycle(string lifecycle, string fault = null)
        {
            var current = GetSnapshot();
            Publish(lifecycle, current.Receivers, lifecycle == "ready" ? current.Capabilities : Array.Empty<string>(), fault ?? current.Fault);
        }
        private static async Task AwaitWithCancellation(Task task, CancellationToken token)
        {
            if (!token.CanBeCanceled) { await task.ConfigureAwait(false); return; }
            var cancelled = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            using (token.Register(() => cancelled.TrySetResult(true)))
            {
                if (await Task.WhenAny(task, cancelled.Task).ConfigureAwait(false) != task) token.ThrowIfCancellationRequested();
                await task.ConfigureAwait(false);
            }
        }

        // Subscribers must enqueue work rather than serialize or write sockets here. Publication order is revision order.
        public RadioSnapshot Publish(string lifecycle, IEnumerable<ReceiverState> receivers, IEnumerable<string> capabilities, string fault = null)
        {
            lock (gate)
            {
                snapshot = new RadioSnapshot(snapshot.SessionGeneration, checked(snapshot.Revision + 1), lifecycle, receivers, capabilities, fault);
                if (StateChanged != null)
                    foreach (Action<RadioSnapshot> observer in StateChanged.GetInvocationList())
                        try { observer(snapshot); }
                        catch (Exception ex) { try { ObserverFaulted?.Invoke(ex); } catch { } }
                return snapshot;
            }
        }

        internal RadioSnapshot Commit(RadioMutation mutation)
        {
            lock (gate) return Publish(snapshot.Lifecycle, mutation.Receivers, snapshot.Capabilities, snapshot.Fault);
        }
    }
}
