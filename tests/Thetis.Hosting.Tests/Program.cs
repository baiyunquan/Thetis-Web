using System;
using System.IO;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using Newtonsoft.Json.Linq;
using Thetis;
using Thetis.Hosting;

partial class Program
{
    static void Main()
    {
        try { Run(); }
        catch (Exception ex) { System.Console.Error.WriteLine("FAIL: " + ex.GetType().Name + ": " + ex.Message); Environment.ExitCode = 1; }
    }
    static void Run()
    {
        // Removing the production hosting boundary must fail before any native DLL is loaded.
        if (typeof(EmbeddedWebContent).Assembly.GetType("Thetis.Hosting.CodeHost") == null)
            throw new Exception("FAIL: embedded Code host does not exist independently of the radio engine");
        string fixture = Path.Combine(Path.GetTempPath(), "thetis-host-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(fixture, "code"));
        try
        {
            File.WriteAllText(Path.Combine(fixture, "code", "index.html"), "packaged-code");
            File.WriteAllText(Path.Combine(fixture, "code", "private.txt"), "not packaged");
            File.WriteAllBytes(Path.Combine(fixture, "code", "worker.wasm"), new byte[] { 0, 97, 115, 109 });
            File.WriteAllText(Path.Combine(fixture, "code", "asset-manifest.json"), "{\"files\":[\"index.html\",\"worker.wasm\"],\"codeCommit\":\"abc123\",\"uiBuildId\":\"test-build\"}");
            var config = new HostingConfiguration();
            var host = new CodeHost(fixture, config);
            Expect(Response(host, "/code/health"), "\"radioInitialized\":false");
            Expect(Response(host, "/code/host-config.json"), "http://{{uuid}}.localhost:50001/code/vscode");
            Expect(Response(host, "/code/host-config.json"), "test-build");
            Expect(Response(host, "/"), "Location: /code/");
            Expect(Response(host, "/code/?query=one"), "packaged-code");
            Expect(Response(host, "/code/worker.wasm?vscode-coi=3"), "Content-Type: application/wasm");
            Expect(Response(host, "/code/worker.wasm?vscode-coi=3"), "Cross-Origin-Embedder-Policy: require-corp");
            Expect(Response(host, "/code/private.txt"), "404 Not Found");
            Expect(Response(host, "/code/%2e%2e/private.txt"), "403 Forbidden");
            Expect(Response(host, "/code/index.html::$DATA"), "403 Forbidden");
            Expect(Response(host, "/code/", "evil.example:50001"), "403 Forbidden");
            Expect(Response(host, "/code/", "localhost:50001", "192.169.1.2"), "403 Forbidden");
            Expect(Response(host, "/code/", "192.168.0.29:50001", "192.168.0.8"), "Location: https://thetis.home.arpa:50001/code/");
            Expect(Response(host, "/code/", "thetis.home.arpa:50001", "192.168.0.8", true), "packaged-code");
            Expect(Response(host, "/code/", "thetis.home.arpa:50001", "192.168.3.165", true), "packaged-code");
            Expect(Response(host, "/code/", "thetis.home.arpa:50001", "192.168.114.100", true), "packaged-code");
            Expect(Response(host, "/code/", "localhost:50001", "127.0.0.1", true), "403 Forbidden");
            string head = Response(host, "/code/", method: "HEAD");
            Expect(head, "Content-Length: 13");
            if (head.Contains("packaged-code")) throw new Exception("HEAD leaked response body");
            foreach (string ip in new[] { "127.0.0.1", "::1", "192.168.0.0", "192.168.0.1", "192.168.3.165", "192.168.114.100", "192.168.255.255", "::ffff:192.168.114.100" })
                Check(HostingConfiguration.IsCodePeer(IPAddress.Parse(ip)), "Code peer rejected: " + ip);
            foreach (string ip in new[] { "10.0.0.1", "192.167.255.255", "192.169.0.0", "::ffff:192.169.0.1", "2001:db8::1" })
                Check(!HostingConfiguration.IsCodePeer(IPAddress.Parse(ip)), "Code peer accepted: " + ip);
            Check(config.IsAllowedHost(new string('a', 52) + ".localhost", false), "hashed localhost rejected");
            Check(config.IsAllowedHost("v--0m8b9nohqg40ofbl1bips6o0pfe1l81siob3tceg1g3utpesh6c8.localhost", false), "pinned Code extension-host v-- origin rejected");
            Check(!config.IsAllowedHost("v--short.localhost", false), "invalid extension-host hash accepted");
            Check(!config.IsAllowedHost("evil.localhost", false), "non-hashed localhost accepted");
            Check(!config.IsAllowedHost("thetis.home.arpa.evil.example", true), "suffix host attack accepted");
            Reject(() => new HostingConfiguration("evil/name"));
            string invalid = Path.Combine(fixture, "invalid.json");
            File.WriteAllText(invalid, "{\"certificateThumbprint\":\"deadbeef\"}");
            Reject(() => HostingConfiguration.Load(invalid));
            Reject(() => HostHttpRequest.Parse("GET /code/%zz HTTP/1.1\r\nHost: localhost:50001\r\n\r\n"));
            Reject(() => HostHttpRequest.Parse("GET / HTTP/1.1\r\nHost: a\r\nHost: b\r\n\r\n"));
            byte[] header = Encoding.ASCII.GetBytes("GET / HTTP/1.1\r\nHost: localhost:50001\r\n\r\nX");
            using (var coalesced = new MemoryStream(header))
            {
                HostHttpRequest.Read(coalesced);
                Check(coalesced.ReadByte() == 'X', "HTTP parser consumed first frame");
            }
            HandshakeDeadline(fixture, config);
            Transport(host, false);
            ControlTransport(fixture, config);
            Lifecycle(fixture, config, false);
            string thumbprint = Environment.GetEnvironmentVariable("THETIS_HOST_TEST_CERT");
            Check(!string.IsNullOrEmpty(thumbprint), "Run harness with THETIS_HOST_TEST_CERT to prove real net48 TLS");
            using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
            {
                store.Open(OpenFlags.ReadOnly);
                var certificates = store.Certificates.Find(X509FindType.FindByThumbprint, thumbprint, false);
                Check(certificates.Count == 1, "TLS fixture certificate missing");
                Reject(() => new HostingConfiguration("wrong.home.arpa", certificates[0]));
                string validConfig = Path.Combine(fixture, "hosting.json");
                File.WriteAllText(validConfig, new JObject { ["baseHost"] = "thetis-test.home.arpa", ["certificateThumbprint"] = thumbprint }.ToString());
                Check(HostingConfiguration.Load(validConfig).TlsEnabled, "Configured CurrentUser/My leaf did not enable TLS");
                var secure = new CodeHost(fixture, new HostingConfiguration("thetis-test.home.arpa", certificates[0]));
                Transport(secure, true);
                ControlTransport(fixture, new HostingConfiguration("thetis-test.home.arpa", certificates[0]), true);
                Lifecycle(fixture, new HostingConfiguration("thetis-test.home.arpa", certificates[0]), true);
            }
            System.Console.WriteLine("PASS: host routing, peer/host restrictions, allowlisted assets, config, HEAD and header/frame preservation.");
        }
        finally { Directory.Delete(fixture, true); }
    }
    static void HandshakeDeadline(string fixture, HostingConfiguration config)
    {
        using (var deadlineHost = new CodeHost(fixture, config))
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var worker = new Thread(() => deadlineHost.Dispatch(listener.AcceptTcpClient()));
            worker.Start();
            try
            {
                using (var client = new TcpClient())
                {
                    client.Connect(IPAddress.Loopback, ((IPEndPoint)listener.LocalEndpoint).Port);
                    var stream = client.GetStream();
                    // Every byte arrives well within the socket's per-read timeout.
                    // A total header deadline must still release the worker.
                    using (var drip = new Timer(_ => { try { stream.WriteByte((byte)'G'); } catch (IOException) { } catch (ObjectDisposedException) { } }, null, 0, 200))
                        Check(worker.Join(12500), "Slow headers exceeded the ten-second total handshake budget");
                }
                Check(deadlineHost.ActiveConnections == 0, "Expired handshake retained an asset client");
            }
            finally { deadlineHost.Stop(); listener.Stop(); worker.Join(2000); }
        }
        System.Console.WriteLine("PASS: slow header bytes cannot extend the total connection handshake deadline.");
    }
    static string Response(CodeHost host, string path, string authority = "localhost:50001", string ip = "127.0.0.1", bool tls = false, string method = "GET")
    {
        using (var stream = new MemoryStream())
        {
            host.HandleRequest(stream, HostHttpRequest.Parse(method + " " + path + " HTTP/1.1\r\nHost: " + authority + "\r\n\r\n"), IPAddress.Parse(ip), tls);
            return Encoding.UTF8.GetString(stream.ToArray());
        }
    }
    static void Expect(string response, string value) { Check(response.Contains(value), "Missing " + value + " in " + response); }
    static void Check(bool pass, string message) { if (!pass) throw new Exception(message); }
    static void Reject(Action action) { try { action(); } catch (InvalidDataException) { return; } throw new Exception("Invalid input accepted"); }
    static void StopHost(CodeHost host)
    {
        host.Stop();
    }
    static void QueueHost(CodeHost host, TcpClient client, Action<TcpClient, byte[]> legacy)
    {
        host.QueueClient(client, legacy);
    }
    static void Lifecycle(string root, HostingConfiguration config, bool tls)
    {
        // Stop must close sockets before their 10-second header/diagnostic timeouts.
        // Otherwise a previous listener can still act after a replacement starts.
        foreach (string phase in new[] { "silent", "partial-header", "partial-tls", "diagnostic" })
        {
            var old = new CodeHost(root, config);
            StopHost(new CodeHost(root, config));
            var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
            int legacy = 0;
            using (var client = new TcpClient())
            {
                client.Connect((IPEndPoint)listener.LocalEndpoint);
                client.ReceiveTimeout = 2000; client.SendTimeout = 2000;
                TcpClient accepted = listener.AcceptTcpClient();
                listener.Stop();
                QueueHost(old, accepted, (socket, bytes) => { Interlocked.Increment(ref legacy); socket.Close(); });
                Check(old.ActiveConnections == 1, "Queued socket was not owned by its original host");
                Stream stream = client.GetStream();
                if (phase == "partial-tls") { stream.Write(new byte[] { 22, 3, 3, 0, 100, 1 }, 0, 6); stream.Flush(); }
                if (phase == "partial-header") Write(stream, "GET /legacy HTTP/1.1\r\nHost: localhost:50001\r\nUpgrade: websocket\r\n");
                if (phase == "diagnostic")
                {
                    if (tls)
                    {
                        var secure = new SslStream(stream, false, (sender, cert, chain, errors) => true);
                        secure.AuthenticateAsClient("thetis-test.home.arpa", null, SslProtocols.Tls12, false);
                        stream = secure;
                    }
                    Write(stream, Upgrade(tls ? "thetis-test.home.arpa:50001" : "localhost:50001", tls));
                    Expect(ReadHeader(stream), "101 Switching Protocols");
                }
                StopHost(old);
                Check(old.ActiveConnections == 0, "Stopped host retained owned " + phase + " socket");
                bool closed = false;
                try { closed = stream.ReadByte() == -1; }
                catch (IOException ex)
                {
                    var error = ex.InnerException as SocketException;
                    Check(error == null || error.SocketErrorCode != SocketError.TimedOut, "Stop left client waiting for timeout");
                    closed = true;
                }
                Check(closed, "Stop failed to close " + phase + " socket");
                Check(SpinWait.SpinUntil(() => Response(old, "/code/health").Contains("\"diagnosticConnections\":0"), 2000), "Stopped diagnostic handler did not release its connection counter");
                Check(legacy == 0, "Partial request entered legacy client during stop");
                StopHost(old);
            }
            // A queued callback retaining the previous host may execute after replacement.
            // It must reject the socket even if its complete legacy header is ready.
            var delayed = new TcpListener(IPAddress.Loopback, 0); delayed.Start();
            using (var client = new TcpClient())
            {
                client.Connect((IPEndPoint)delayed.LocalEndpoint); client.ReceiveTimeout = 2000;
                TcpClient accepted = delayed.AcceptTcpClient(); delayed.Stop();
                Write(client.GetStream(), Upgrade("localhost:50001", false).Replace("/code/diagnostics", "/legacy"));
                var replacement = new CodeHost(root, config);
                old.Dispatch(accepted, (socket, bytes) => { Interlocked.Increment(ref legacy); socket.Close(); });
                Check(legacy == 0 && old.ActiveConnections == 0 && replacement.ActiveConnections == 0, "Old generation attached a delayed legacy client");
                StopHost(replacement);
            }
        }
        if (!tls) AtomicHandoff(root, config);
        System.Console.WriteLine("PASS: stop closes queued/partial HTTP/TLS/diagnostic sockets and rejects old-generation handoff (" + (tls ? "TLS" : "plain") + ").");
    }
    static void AtomicHandoff(string root, HostingConfiguration config)
    {
        using (var entered = new ManualResetEvent(false))
        using (var release = new ManualResetEvent(false))
        using (var stopping = new ManualResetEvent(false))
        using (var stopped = new ManualResetEvent(false))
        using (var host = new CodeHost(root, config))
        using (var client = new TcpClient())
        {
            var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
            client.Connect((IPEndPoint)listener.LocalEndpoint);
            var accepted = listener.AcceptTcpClient(); listener.Stop();
            host.QueueClient(accepted, (socket, prefix) => { entered.Set(); release.WaitOne(2000); socket.Close(); });
            Write(client.GetStream(), Upgrade("localhost:50001", false).Replace("/code/diagnostics", "/legacy"));
            Check(entered.WaitOne(2000), "Legacy handoff did not start");
            var stop = new Thread(() => { stopping.Set(); host.Stop(); stopped.Set(); }); stop.Start();
            try
            {
                Check(stopping.WaitOne(2000), "Stop did not start");
                Check(!stopped.WaitOne(100), "Stop returned while an old-generation handoff was still executing");
            }
            finally { release.Set(); Check(stop.Join(2000), "Stop deadlocked with legacy handoff"); }
            Check(stopped.WaitOne(0) && host.ActiveConnections == 0, "Handoff did not release ownership before stop completed");
        }
    }
    static void Transport(CodeHost host, bool tls)
    {
        string authority = tls ? "thetis-test.home.arpa:50001" : "localhost:50001";
        int legacy = 0;
        Exchange(host, tls, (client, prefix) => { Interlocked.Increment(ref legacy); client.Close(); }, stream =>
        {
            Write(stream, "GET /code/health HTTP/1.1\r\nHost: " + authority + "\r\n\r\n");
            Expect(new StreamReader(stream).ReadToEnd(), "\"radioInitialized\":false");
        });
        Check(legacy == 0, "Asset request constructed legacy TCI client");
        Exchange(host, tls, null, stream =>
        {
            Write(stream, Upgrade(authority, tls));
            // Deliberately coalesce a fragment and ping with the request before reading 101.
            Frame(stream, 1, Encoding.UTF8.GetBytes("{\"requestId\":\"frag"), false);
            Frame(stream, 9, Encoding.ASCII.GetBytes("ping"));
            Frame(stream, 0, Encoding.UTF8.GetBytes("ment\",\"value\":{\"x\":7}}"));
            Expect(ReadHeader(stream), "101 Switching Protocols");
            var pong = ReadFrame(stream); Check(pong.Item1 == 10 && Encoding.ASCII.GetString(pong.Item2) == "ping", "Fragment ping was not answered");
            var echo = ReadFrame(stream); Check(echo.Item1 == 1, "Expected text echo");
            var value = JObject.Parse(Encoding.UTF8.GetString(echo.Item2));
            Check((string)value["requestId"] == "fragment" && (int)value["value"]["x"] == 7, "Echo changed diagnostic request");
            Frame(stream, 8, new byte[] { 3, 232 });
            var close = ReadFrame(stream); Check(close.Item1 == 8 && close.Item2[0] == 3 && close.Item2[1] == 232, "Close was not acknowledged");
        });
        foreach (string scenario in new[] { "unmasked", "oversized", "continuation", "binary", "invalidUtf8", "closeLength", "reserved" })
            Exchange(host, tls, null, stream =>
            {
                Write(stream, Upgrade(authority, tls)); Expect(ReadHeader(stream), "101 Switching Protocols");
                int code = 1002;
                if (scenario == "unmasked") { stream.WriteByte(129); stream.WriteByte(0); }
                if (scenario == "oversized") { stream.WriteByte(129); stream.WriteByte(254); stream.WriteByte(32); stream.WriteByte(0); code = 1009; }
                if (scenario == "continuation") Frame(stream, 0, new byte[0]);
                if (scenario == "binary") { Frame(stream, 2, new byte[0]); code = 1003; }
                if (scenario == "invalidUtf8") { Frame(stream, 1, new byte[] { 0xff }); code = 1007; }
                if (scenario == "closeLength") Frame(stream, 8, new byte[] { 0 });
                if (scenario == "reserved") Frame(stream, 3, new byte[0]);
                stream.Flush();
                var close = ReadFrame(stream);
                Check(close.Item1 == 8 && close.Item2.Length == 2 && close.Item2[0] * 256 + close.Item2[1] == code, "Wrong close code for " + scenario);
            });
        Exchange(host, tls, null, stream =>
        {
            Write(stream, Upgrade(authority, tls).Replace((tls ? "https" : "http") + "://" + authority, "https://evil.example:50001"));
            Expect(new StreamReader(stream).ReadToEnd(), "403 Forbidden");
        });
        if (!tls)
            Exchange(host, false, (client, prefix) =>
            {
                Check(Encoding.ASCII.GetString(prefix).StartsWith("GET /legacy"), "Legacy header lost");
                Check(client.GetStream().ReadByte() == 42, "Legacy first frame lost");
                Interlocked.Increment(ref legacy);
                Write(client.GetStream(), "legacy-ok"); client.Close();
            }, stream =>
            {
                Write(stream, Upgrade(authority, false).Replace("/code/diagnostics", "/legacy")); stream.WriteByte(42);
                Expect(new StreamReader(stream).ReadToEnd(), "legacy-ok");
            });
        Check(host.ActiveConnections == 0, "Code connection leaked after cleanup");
        System.Console.WriteLine("PASS: " + (tls ? "TLS 1.2" : "plain TCP") + " host-only routing, diagnostic echo/fragment/ping/close, masking/UTF8/size/opcode rejection and socket cleanup.");
    }
    static string Upgrade(string authority, bool tls) { return "GET /code/diagnostics HTTP/1.1\r\nHost: " + authority + "\r\nOrigin: " + (tls ? "https" : "http") + "://" + authority + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n"; }
    static void Exchange(CodeHost host, bool tls, Action<TcpClient, byte[]> legacy, Action<Stream> use)
    {
        var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        Exception serverError = null;
        var worker = new Thread(() => { try { host.Dispatch(listener.AcceptTcpClient(), legacy); } catch (Exception ex) { serverError = ex; } });
        worker.Start();
        try
        {
            using (var client = new TcpClient())
            {
                client.Connect((IPEndPoint)listener.LocalEndpoint); client.ReceiveTimeout = 4000; client.SendTimeout = 4000;
                Stream stream = client.GetStream();
                if (tls)
                {
                    var secure = new SslStream(stream, false, (sender, cert, chain, errors) => true);
                    secure.AuthenticateAsClient("thetis-test.home.arpa", null, SslProtocols.Tls12, false);
                    stream = secure;
                }
                using (stream) use(stream);
            }
        }
        finally { listener.Stop(); Check(worker.Join(5000), "Server failed to release connection"); }
        if (serverError != null) throw serverError;
    }
    static void Write(Stream stream, string text) { byte[] bytes = Encoding.ASCII.GetBytes(text); stream.Write(bytes, 0, bytes.Length); stream.Flush(); }
    static string ReadHeader(Stream stream)
    {
        var value = new StringBuilder();
        while (value.Length < 16384) { int next = stream.ReadByte(); Check(next >= 0, "Unexpected header EOF"); value.Append((char)next); if (value.ToString().EndsWith("\r\n\r\n")) return value.ToString(); }
        throw new Exception("Header too large");
    }
    static void Frame(Stream stream, int opcode, byte[] bytes, bool fin = true)
    {
        stream.WriteByte((byte)((fin ? 128 : 0) | opcode));
        if (bytes.Length < 126) stream.WriteByte((byte)(128 | bytes.Length));
        else { stream.WriteByte(254); stream.WriteByte((byte)(bytes.Length >> 8)); stream.WriteByte((byte)bytes.Length); }
        byte[] mask = { 1, 2, 3, 4 }; stream.Write(mask, 0, 4);
        for (int i = 0; i < bytes.Length; i++) stream.WriteByte((byte)(bytes[i] ^ mask[i % 4])); stream.Flush();
    }
    static Tuple<int, byte[]> ReadFrame(Stream stream)
    {
        int first = stream.ReadByte(), second = stream.ReadByte(); Check(first >= 0 && second >= 0 && (second & 128) == 0, "Bad server frame");
        int length = second & 127; if (length == 126) length = stream.ReadByte() * 256 + stream.ReadByte();
        byte[] bytes = new byte[length]; for (int i = 0; i < length; i++) { int next = stream.ReadByte(); Check(next >= 0, "Frame truncated"); bytes[i] = (byte)next; }
        return Tuple.Create(first & 15, bytes);
    }
}
