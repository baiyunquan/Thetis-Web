using System;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Thetis.Hosting
{
    public sealed class CodeHost : IDisposable
    {
        private readonly string root;
        private readonly HostingConfiguration configuration;
        private readonly bool radioInitialized;
        private readonly HashSet<string> assets = new HashSet<string>(StringComparer.Ordinal);
        private readonly JObject build;
        private readonly object lifecycle = new object();
        private readonly HashSet<TcpClient> clients = new HashSet<TcpClient>();
        private bool stopped;
        private int diagnosticConnections;
        public int ActiveConnections { get { lock (lifecycle) return clients.Count; } }
        public bool IsStopped { get { lock (lifecycle) return stopped; } }

        public CodeHost(string webRoot, HostingConfiguration configuration, bool radioInitialized = false)
        {
            this.root = Path.GetFullPath(webRoot);
            this.configuration = configuration;
            this.radioInitialized = radioInitialized;
            string manifestPath = Path.Combine(root, "code", "asset-manifest.json");
            if (File.Exists(manifestPath))
            {
                JObject manifest = JObject.Parse(File.ReadAllText(manifestPath));
                if (!(manifest["files"] is JArray files)) throw new InvalidDataException("Code asset manifest must contain files.");
                foreach (JToken file in files)
                {
                    string path = (string)file;
                    if (path == null || !SafePath("/code/" + path) || path.StartsWith("/")) throw new InvalidDataException("Unsafe path in Code asset manifest.");
                    assets.Add("/code/" + path);
                }
                var identity = manifest["build"] as JObject ?? manifest;
                build = new JObject { ["codeCommit"] = (string)identity["codeCommit"] ?? "unknown", ["uiBuildId"] = (string)identity["uiBuildId"] ?? "unknown" };
            }
            else build = new JObject { ["codeCommit"] = "unknown", ["uiBuildId"] = "unknown" };
        }

        // Dispatch runs before TCPIPtciSocketListener construction and owns browser sockets.
        // The legacy callback takes ownership only for plaintext TCI WebSocket requests.
        public void Dispatch(TcpClient client, Action<TcpClient, byte[]> legacy = null)
        {
            if (!Register(client)) return;
            DispatchRegistered(client, legacy);
        }

        // Ownership starts on the accept thread, before a ThreadPool callback can be delayed.
        public void QueueClient(TcpClient client, Action<TcpClient, byte[]> legacy = null)
        {
            if (!Register(client)) return;
            try { ThreadPool.QueueUserWorkItem(_ => DispatchRegistered(client, legacy)); }
            catch
            {
                lock (lifecycle) clients.Remove(client);
                client.Close();
                throw;
            }
        }

        private bool Register(TcpClient client)
        {
            lock (lifecycle)
            {
                if (!stopped) { clients.Add(client); return true; }
            }
            client.Close();
            return false;
        }

        public void Stop()
        {
            lock (lifecycle)
            {
                if (stopped) return;
                stopped = true;
                // Closing the TCP socket interrupts SslStream authentication and blocked reads.
                // Keep repeated Stop calls serialized until every owned socket is closed.
                foreach (TcpClient client in clients) client.Close();
                clients.Clear();
            }
        }

        public void Dispose() { Stop(); }

        private void DispatchRegistered(TcpClient client, Action<TcpClient, byte[]> legacy)
        {
            bool handedOff = false;
            try
            {
                if (IsStopped) return;
                client.NoDelay = true;
                client.ReceiveTimeout = 10000;
                client.SendTimeout = 10000;
                byte[] first = new byte[1];
                if (client.Client.Receive(first, 0, 1, SocketFlags.Peek) != 1) return;
                bool tls = first[0] == 0x16;
                Stream stream = client.GetStream();
                if (tls)
                {
                    if (!configuration.TlsEnabled) return;
                    var secure = new SslStream(stream, false);
                    stream = secure;
                    secure.AuthenticateAsServer(configuration.Certificate, false, SslProtocols.Tls12, false);
                }
                try
                {
                    HostHttpRequest request = HostHttpRequest.Read(stream);
                    if (!tls && legacy != null && request.HasToken("Upgrade", "websocket") && request.Header("Sec-WebSocket-Key").Length != 0 &&
                        request.Path != "/code" && !request.Path.StartsWith("/code/", StringComparison.Ordinal))
                    {
                        lock (lifecycle)
                        {
                            if (stopped) return;
                            // The callback must not marshal to the UI or block. Serializing this
                            // transfer with Stop prevents late callbacks entering a new server.
                            legacy(client, Encoding.ASCII.GetBytes(request.Raw));
                            clients.Remove(client);
                            handedOff = true;
                        }
                        return;
                    }
                    HandleRequest(stream, request, ((IPEndPoint)client.Client.RemoteEndPoint).Address, tls);
                }
                catch (InvalidDataException) { HostHttpResponse.Write(stream, 400, "Bad Request"); }
                finally { if (!handedOff) stream.Dispose(); }
            }
            catch (IOException ex) { System.Diagnostics.Debug.Print("Code host connection: " + ex.Message); }
            catch (SocketException ex) { System.Diagnostics.Debug.Print("Code host socket: " + ex.Message); }
            catch (AuthenticationException ex) { System.Diagnostics.Debug.Print("Code host TLS: " + ex.Message); }
            catch (Exception ex) { System.Diagnostics.Debug.Print("Code host request rejected: " + ex.Message); }
            finally
            {
                if (!handedOff) client.Close();
                lock (lifecycle) clients.Remove(client);
            }
        }

        public void HandleRequest(Stream stream, HostHttpRequest request, IPAddress remote, bool tls)
        {
            bool head = request.Method == "HEAD";
            if (!HostingConfiguration.IsCodePeer(remote)) { HostHttpResponse.Write(stream, 403, "Forbidden", head: head); return; }
            if (!SafePath(request.Path)) { HostHttpResponse.Write(stream, 403, "Forbidden", head: head); return; }
            if (request.Method != "GET" && !head) { HostHttpResponse.Write(stream, 405, "Method Not Allowed", head: head); return; }
            if (!tls && !IPAddress.IsLoopback(remote.IsIPv4MappedToIPv6 ? remote.MapToIPv4() : remote))
            {
                HostHttpResponse.Write(stream, 302, "Found", new byte[0], head, extra: "Location: https://" + configuration.BaseHost + ":50001" + (request.Path == "/" ? "/code/" : request.Target) + "\r\n");
                return;
            }
            string authority = request.Header("Host");
            string host = authority.EndsWith(":50001", StringComparison.Ordinal) ? authority.Substring(0, authority.Length - 6) : "";
            // Existing loopback tools may address the listener by IPv4 literal.
            if (!configuration.IsAllowedHost(host, tls) && !(host == "127.0.0.1" && !tls && IPAddress.IsLoopback(remote)))
            { HostHttpResponse.Write(stream, 403, "Forbidden", head: head); return; }
            string canonical = tls ? configuration.BaseHost : "localhost";
            string scheme = tls ? "https" : "http";
            string origin = request.Header("Origin");
            string cors = "";
            if (origin.Length > 0)
            {
                if (!AllowedOrigin(origin, tls)) { HostHttpResponse.Write(stream, 403, "Forbidden", head: head); return; }
                cors = "Access-Control-Allow-Origin: " + origin + "\r\nVary: Origin\r\n";
            }
            if (request.Path == "/") { HostHttpResponse.Write(stream, 302, "Found", new byte[0], head, extra: "Location: /code/\r\n"); return; }
            if (request.Path == "/code") { HostHttpResponse.Write(stream, 302, "Found", new byte[0], head, extra: "Location: /code/\r\n"); return; }
            if (request.Path == "/code/host-config.json")
            {
                string address = scheme + "://" + canonical + ":50001";
                Json(stream, new JObject {
                    ["mode"] = "foundation", ["baseUrl"] = address + "/code/",
                    ["webviewEndpoint"] = scheme + "://{{uuid}}." + canonical + ":50001/code/vscode/out/vs/workbench/contrib/webview/browser/pre/",
                    ["extensionHostEndpoint"] = scheme + "://{{uuid}}." + canonical + ":50001/code/vscode",
                    ["diagnosticEndpoint"] = (tls ? "wss" : "ws") + "://" + canonical + ":50001/code/diagnostics", ["build"] = build.DeepClone()
                }, head, cors);
                return;
            }
            if (request.Path == "/code/health")
            {
                Json(stream, new JObject { ["mode"] = "foundation", ["status"] = "ok", ["connections"] = ActiveConnections,
                    ["diagnosticConnections"] = Volatile.Read(ref diagnosticConnections), ["radioInitialized"] = radioInitialized, ["build"] = build.DeepClone() }, head, cors);
                return;
            }
            if (request.Path == "/code/diagnostics")
            {
                if (head || !request.IsWebSocket || origin.Length == 0) { HostHttpResponse.Write(stream, 400, "Bad Request", head: head); return; }
                Interlocked.Increment(ref diagnosticConnections);
                // Persistent browser diagnostics use a quiet heartbeat, separate from HTTP header deadlines.
                if (stream.CanTimeout) stream.ReadTimeout = 60000;
                try { DiagnosticWebSocket.Run(stream, request); }
                finally { Interlocked.Decrement(ref diagnosticConnections); }
                return;
            }
            if (request.IsWebSocket) { HostHttpResponse.Write(stream, 404, "Not Found", head: head); return; }
            string path = request.Path.EndsWith("/", StringComparison.Ordinal) ? request.Path + "index.html" : request.Path;
            if (!assets.Contains(path)) { HostHttpResponse.Write(stream, 404, "Not Found", head: head); return; }
            EmbeddedWebContent.SendResponse(stream, request.Raw, root, cors);
        }

        public bool AllowedOrigin(string origin, bool tls)
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var value) || value.Port != 50001 || value.UserInfo.Length != 0 || value.AbsolutePath != "/" || value.Query.Length != 0 || value.Fragment.Length != 0)
                return false;
            return value.Scheme == (tls ? "https" : "http") && configuration.IsAllowedHost(value.Host, tls);
        }

        private static void Json(Stream stream, JObject value, bool head, string cors)
        { HostHttpResponse.Write(stream, 200, "OK", Encoding.UTF8.GetBytes(value.ToString(Formatting.None)), head, "application/json; charset=utf-8", cors); }

        private static bool SafePath(string path)
        {
            if (!path.StartsWith("/", StringComparison.Ordinal) || path.Contains("\\") || path.Contains(":") || path.Contains("%") || path.Contains("//")) return false;
            foreach (char c in path) if (char.IsControl(c) || c == '?' || c == '#' || c == '*') return false;
            foreach (string part in path.Split('/')) if (part == "." || part == ".." || part.EndsWith(".", StringComparison.Ordinal) || part.EndsWith(" ", StringComparison.Ordinal)) return false;
            return true;
        }
    }
}
