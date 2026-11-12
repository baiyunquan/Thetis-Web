using System;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Thetis.Hosting
{
    // Deliberately limited host diagnostics: no TCI, radio commands, binary data or DSP access.
    internal static class DiagnosticWebSocket
    {
        public static void Run(Stream stream, HostHttpRequest request)
        {
            Action<JObject> send = null;
            HostWebSocket.Run(stream, request, value => {
                if (value["requestId"]?.Type != JTokenType.String || ((string)value["requestId"]).Length > 128 || value["value"] == null) return false;
                send(new JObject { ["requestId"] = value["requestId"].DeepClone(), ["value"] = value["value"].DeepClone() });
                return true;
            }, (write, close) => { send = write; return true; });
        }
    }
}