using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace Thetis.Hosting
{
    public sealed class HostHttpRequest
    {
        public string Raw { get; private set; }
        public string Method { get; private set; }
        public string Target { get; private set; }
        public string Path { get; private set; }
        public Dictionary<string, string> Headers { get; private set; }
        public bool IsWebSocket { get { return HasToken("Upgrade", "websocket") && HasToken("Connection", "upgrade"); } }
        public string Header(string name) { return Headers.TryGetValue(name, out var value) ? value : ""; }
        public bool HasToken(string name, string value) { return Array.Exists(Header(name).Split(','), x => x.Trim().Equals(value, StringComparison.OrdinalIgnoreCase)); }

        public static HostHttpRequest Read(Stream stream)
        {
            // Read exactly the header: coalesced first WebSocket frame remains in the stream.
            var data = new List<byte>();
            while (data.Count < 16384)
            {
                int next = stream.ReadByte();
                if (next < 0) throw new EndOfStreamException();
                if (next > 127 || next == 0) throw new InvalidDataException("Invalid HTTP header.");
                data.Add((byte)next);
                int n = data.Count;
                if (n >= 4 && data[n - 4] == 13 && data[n - 3] == 10 && data[n - 2] == 13 && data[n - 1] == 10)
                    return Parse(Encoding.ASCII.GetString(data.ToArray()));
            }
            throw new InvalidDataException("HTTP header exceeds 16 KiB.");
        }

        public static HostHttpRequest Parse(string raw)
        {
            string[] lines = raw.Split(new[] { "\r\n" }, StringSplitOptions.None);
            string[] first = lines[0].Split(' ');
            if (first.Length != 3 || first[2] != "HTTP/1.1" || !Regex.IsMatch(first[0], "^[A-Z]+$") || !first[1].StartsWith("/"))
                throw new InvalidDataException("Invalid HTTP request line.");
            var request = new HostHttpRequest { Raw = raw, Method = first[0], Target = first[1], Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) };
            foreach (string line in lines)
            {
                if (line == lines[0] || line.Length == 0) continue;
                int colon = line.IndexOf(':');
                if (colon < 1 || !Regex.IsMatch(line.Substring(0, colon), "^[A-Za-z0-9-]+$")) throw new InvalidDataException("Invalid HTTP header.");
                string key = line.Substring(0, colon);
                if (request.Headers.ContainsKey(key)) throw new InvalidDataException("Duplicate HTTP header.");
                request.Headers.Add(key, line.Substring(colon + 1).Trim());
            }
            if (request.Header("Host").Length == 0 || request.Header("Transfer-Encoding").Length > 0 || (request.Header("Content-Length").Length > 0 && request.Header("Content-Length") != "0"))
                throw new InvalidDataException("Host required; request bodies are unsupported.");
            string encoded = request.Target.Split('?', '#')[0];
            if (Regex.IsMatch(encoded, @"%(?![0-9a-fA-F]{2})")) throw new InvalidDataException("Malformed URL escape.");
            request.Path = Uri.UnescapeDataString(encoded);
            return request;
        }
    }

    internal static class HostHttpResponse
    {
        public static void Write(Stream stream, int status, string reason, byte[] body = null, bool head = false, string type = "text/plain; charset=utf-8", string extra = "")
        {
            body = body ?? Encoding.UTF8.GetBytes(status + " " + reason);
            Header(stream, status, reason, body.LongLength, type, extra);
            if (!head) stream.Write(body, 0, body.Length);
            stream.Flush();
        }
        public static void Header(Stream stream, int status, string reason, long length, string type, string extra)
        {
            byte[] bytes = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type + "\r\nContent-Length: " + length +
                "\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\n" + extra + "\r\n");
            stream.Write(bytes, 0, bytes.Length);
        }
    }
}
