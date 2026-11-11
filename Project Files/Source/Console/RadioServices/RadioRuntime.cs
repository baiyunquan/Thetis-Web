using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Thetis.RadioServices
{
    public sealed class RadioStartOptions
    {
        public string Frontend { get; }
        public string DataPath { get; }
        public IReadOnlyList<string> Arguments { get; }
        public RadioStartOptions(string frontend, string dataPath, IEnumerable<string> arguments)
        {
            if (frontend != "windows" && frontend != "code") throw new ArgumentException("Unknown operational frontend.");
            Frontend = frontend; DataPath = Path.GetFullPath(dataPath);
            Arguments = new ReadOnlyCollection<string>((arguments ?? Array.Empty<string>()).ToArray());
        }
    }
    public sealed class RadioRuntimeState
    {
        public IReadOnlyList<ReceiverState> Receivers { get; }
        public IReadOnlyList<string> Capabilities { get; }
        public RadioRuntimeState(IEnumerable<ReceiverState> receivers, IEnumerable<string> capabilities)
        {
            Receivers = new ReadOnlyCollection<ReceiverState>(receivers.ToArray());
            Capabilities = new ReadOnlyCollection<string>(capabilities.ToArray());
        }
    }
    // StopAsync must release even a partially initialized runtime and must be safe after a failed StartAsync.
    public interface IRadioRuntime
    {
        Task<RadioRuntimeState> StartAsync(RadioStartOptions options, StartupPromptService prompts, CancellationToken cancellationToken);
        Task StopAsync(CancellationToken cancellationToken);
    }
}
