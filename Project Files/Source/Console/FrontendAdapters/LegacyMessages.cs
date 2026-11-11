using System;
using System.Linq;
using System.Threading;
using System.Windows.Forms;
using Thetis.RadioServices;

namespace Thetis
{
    // Compatibility boundary for legacy initialization paths. Only Windows mode invokes MessageBox.
    internal static class LegacyMessages
    {
        private static StartupPromptService prompts;
        public static StartupPromptService Prompts
        {
            get { return Volatile.Read(ref prompts); }
            set { Volatile.Write(ref prompts, value); }
        }
        public static DialogResult Show(string text, string caption, MessageBoxButtons buttons = MessageBoxButtons.OK,
            MessageBoxIcon icon = MessageBoxIcon.None, MessageBoxDefaultButton defaultButton = MessageBoxDefaultButton.Button1,
            MessageBoxOptions options = 0)
        {
            var broker = Prompts;
            if (broker == null) return MessageBox.Show(text, caption, buttons, icon, defaultButton, options);
            string[] choices;
            switch (buttons)
            {
                case MessageBoxButtons.OK: choices = new[] { "ok" }; break;
                case MessageBoxButtons.OKCancel: choices = new[] { "ok", "cancel" }; break;
                case MessageBoxButtons.YesNo: choices = new[] { "yes", "no" }; break;
                case MessageBoxButtons.YesNoCancel: choices = new[] { "yes", "no", "cancel" }; break;
                case MessageBoxButtons.RetryCancel: choices = new[] { "retry", "cancel" }; break;
                case MessageBoxButtons.AbortRetryIgnore: choices = new[] { "abort", "retry", "ignore" }; break;
                default: throw new NotSupportedException("Unsupported legacy prompt choices: " + buttons);
            }
            int index = Math.Min((int)defaultButton / 256, choices.Length - 1);
            string response = broker.RequestAsync(caption, text, choices, choices[index], CancellationToken.None).GetAwaiter().GetResult();
            return (DialogResult)Enum.Parse(typeof(DialogResult), response, true);
        }
    }
}
