using System;
using System.Collections.Generic;

namespace Thetis.RadioServices
{
    // UI-neutral state owner. Native adapters publish only effective values; a view never owns this lifetime.
    public sealed class RadioApplication
    {
        private readonly object gate = new object();
        private RadioSnapshot snapshot = new RadioSnapshot(Guid.NewGuid().ToString("N"), 0, "created", null, null);
        public event Action<RadioSnapshot> StateChanged;
        public event Action<Exception> ObserverFaulted;
        public RadioSnapshot GetSnapshot() { lock (gate) return snapshot; }

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
