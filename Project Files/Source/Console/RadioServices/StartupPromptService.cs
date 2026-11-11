using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Thetis.RadioServices
{
    public sealed class StartupPrompt
    {
        public string Id { get; }
        public string Title { get; }
        public string Message { get; }
        public IReadOnlyList<string> Choices { get; }
        public string DefaultChoice { get; }
        internal StartupPrompt(string title, string message, string[] choices, string defaultChoice)
        {
            Id = Guid.NewGuid().ToString("N"); Title = title; Message = message;
            Choices = new ReadOnlyCollection<string>(choices); DefaultChoice = defaultChoice;
        }
    }
    public sealed class StartupPromptService : IDisposable
    {
        private sealed class Pending
        {
            public StartupPrompt Prompt;
            public readonly TaskCompletionSource<string> Result = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        }
        private readonly object gate = new object();
        private readonly Dictionary<string, Pending> pending = new Dictionary<string, Pending>(StringComparer.Ordinal);
        private bool stopped;
        public event Action Changed;
        public event Action<Exception> ObserverFaulted;

        public IReadOnlyList<StartupPrompt> GetPending()
        {
            lock (gate) return new ReadOnlyCollection<StartupPrompt>(pending.Values.Select(x => x.Prompt).ToArray());
        }
        public async Task<string> RequestAsync(string title, string message, IEnumerable<string> choices, string defaultChoice, CancellationToken cancellationToken)
        {
            string[] values = choices?.ToArray() ?? throw new ArgumentNullException(nameof(choices));
            if (string.IsNullOrWhiteSpace(title) || message == null || values.Length < 1 || values.Length > 8 ||
                values.Any(x => string.IsNullOrWhiteSpace(x)) || values.Distinct(StringComparer.Ordinal).Count() != values.Length || !values.Contains(defaultChoice))
                throw new ArgumentException("A prompt requires unique choices and an explicit available default.");
            cancellationToken.ThrowIfCancellationRequested();
            var item = new Pending { Prompt = new StartupPrompt(title, message, values, defaultChoice) };
            lock (gate)
            {
                if (stopped) throw new ObjectDisposedException(nameof(StartupPromptService));
                if (pending.Count >= 32) throw new InvalidOperationException("Too many pending startup decisions.");
                pending.Add(item.Prompt.Id, item);
            }
            Notify();
            // A browser connection is intentionally absent from this lifetime. Reconnect sees the same prompt identity.
            using (cancellationToken.Register(() => Cancel(item)))
                return await item.Result.Task.ConfigureAwait(false);
        }
        public bool Respond(string id, string choice)
        {
            Pending item;
            lock (gate)
            {
                if (id == null || !pending.TryGetValue(id, out item) || !item.Prompt.Choices.Contains(choice)) return false;
                pending.Remove(id);
                item.Result.TrySetResult(choice);
            }
            Notify(); return true;
        }
        private void Cancel(Pending item)
        {
            lock (gate)
            {
                if (!pending.Remove(item.Prompt.Id)) return;
                item.Result.TrySetCanceled();
            }
            Notify();
        }
        private void Notify()
        {
            if (Changed == null) return;
            foreach (Action observer in Changed.GetInvocationList())
                try { observer(); } catch (Exception ex) { try { ObserverFaulted?.Invoke(ex); } catch { } }
        }
        public void Dispose()
        {
            lock (gate)
            {
                if (stopped) return; stopped = true;
                foreach (var item in pending.Values) item.Result.TrySetCanceled();
                pending.Clear();
            }
            Notify();
        }
    }
}
