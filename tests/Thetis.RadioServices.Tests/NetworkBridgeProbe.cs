using System;
using System.IO;
using System.Reflection;

namespace Thetis.Tests
{
    public sealed class NetworkBridgeProbe : MarshalByRefObject
    {
        public override string ToString()
        {
            var assembly = Assembly.LoadFrom(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Thetis.exe"));
            var requestType = assembly.GetType("Thetis.RadioServices.RadioConnectionRequest", true);
            var constructor = requestType.GetConstructors()[0];
            var parameters = constructor.GetParameters();
            var request = constructor.Invoke(new object[] { null, null, 0,
                Enum.Parse(parameters[3].ParameterType, "ANAN100"), Enum.Parse(parameters[4].ParameterType, "Hermes"),
                true, true, Enum.Parse(parameters[7].ParameterType, "Safe"), false });
            var network = assembly.GetType("Thetis.NetworkIO", true);
            var method = network.GetMethod("InitRadio", new[] { requestType, typeof(Action<>).MakeGenericType(assembly.GetType("Thetis.NicRadioScanResult", true)) });
            var result = method.Invoke(null, new object[] { request, null });
            if ((int)result.GetType().GetProperty("Code").GetValue(result, null) != -105)
                throw new InvalidOperationException("Missing NIC did not retain the native adapter error code.");
            var console = assembly.GetType("Thetis.Console", true);
            var owner = console.GetField("_theConsole", BindingFlags.Static | BindingFlags.NonPublic);
            if (owner == null || owner.GetValue(null) != null) throw new InvalidOperationException("Network adapter acquired an operational Console.");
            return "PASS Shared network initialization rejects missing NIC without constructing Console/Setup or initializing radio hardware.";
        }
    }
}
