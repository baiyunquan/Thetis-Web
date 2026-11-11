using System;
using System.Collections;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace Thetis.Tests
{
    public sealed class PromptBridgeProbe : MarshalByRefObject
    {
        public override string ToString()
        {
            var assembly = Assembly.LoadFrom(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Thetis.exe"));
            var serviceType = assembly.GetType("Thetis.RadioServices.StartupPromptService", true);
            var bridge = assembly.GetType("Thetis.LegacyMessages", true);
            var broker = Activator.CreateInstance(serviceType);
            var show = bridge.GetMethod("Show");
            var parameters = show.GetParameters();
            bridge.GetProperty("Prompts").SetValue(null, broker, null);
            Task<object> response = null;
            try
            {
                response = Task.Factory.StartNew(() => show.Invoke(null, new object[] {
                    "Do not open a native dialog", "Prompt boundary fixture", Enum.ToObject(parameters[2].ParameterType, 4),
                    Enum.ToObject(parameters[3].ParameterType, 32), Enum.ToObject(parameters[4].ParameterType, 256),
                    Enum.ToObject(parameters[5].ParameterType, 0)
                }));
                object pending = null;
                if (!SpinWait.SpinUntil(() => {
                    foreach (object item in (IEnumerable)serviceType.GetMethod("GetPending").Invoke(broker, null)) { pending = item; return true; }
                    return false;
                }, 5000)) throw new InvalidOperationException("Legacy prompt did not reach the shared broker.");
                var promptType = pending.GetType();
                string id = (string)promptType.GetProperty("Id").GetValue(pending, null);
                if ((string)promptType.GetProperty("DefaultChoice").GetValue(pending, null) != "no")
                    throw new InvalidOperationException("Legacy default button changed.");
                serviceType.GetMethod("Respond").Invoke(broker, new object[] { id, "no" });
                if (!response.Wait(5000) || response.Result.ToString() != "No") throw new InvalidOperationException("Legacy response was not mapped back correctly.");
                var manager = assembly.GetType("Thetis.DBMan", true);
                if (manager.GetField("_frm_dbman", BindingFlags.Static | BindingFlags.NonPublic).GetValue(null) != null)
                    throw new InvalidOperationException("Shared prompting constructed a database presentation object.");
                return "PASS Legacy initialization prompt uses shared choices/defaults without opening an operational form.";
            }
            finally
            {
                ((IDisposable)broker).Dispose();
                bridge.GetProperty("Prompts").SetValue(null, null, null);
                if (response != null) { try { response.Wait(5000); } catch (AggregateException) { } }
            }
        }
    }
}
