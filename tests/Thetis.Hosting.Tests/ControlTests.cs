using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Thetis.Hosting;
using Thetis.RadioServices;

partial class Program
{
    private sealed class ControlTarget : IRadioCommandTarget
    {
        public int Calls;
        public Task<RadioMutation> ApplyAsync(RadioCommand command, RadioSnapshot snapshot, CancellationToken token)
        {
            Calls++;
            return Task.FromResult(new RadioMutation(new[] { new ReceiverState("rx1", (long)command.Payload["frequencyHz"], snapshot.Receivers[0].VfoBHz) }));
        }
    }
    private static JObject ReadJson(Stream stream)
    {
        var frame = ReadFrame(stream); Check(frame.Item1 == 1, "Expected control text frame");
        return JObject.Parse(Encoding.UTF8.GetString(frame.Item2));
    }
    private static void SendJson(Stream stream, JObject value) => Frame(stream, 1, Encoding.UTF8.GetBytes(value.ToString(Newtonsoft.Json.Formatting.None)));
    private static JObject Until(Stream stream, string type)
    {
        for (int i = 0; i < 16; i++) { var value = ReadJson(stream); if ((string)value["type"] == type) return value; }
        throw new Exception("Expected control message " + type);
    }
    static void ControlTransport(string root, HostingConfiguration config, bool tls = false)
    {
        var app = new RadioApplication(); var target = new ControlTarget();
        app.Publish("ready", new[] { new ReceiverState("rx1", 14200001, 7100000) }, new[] { "receiver.setFrequency" });
        using (var dispatcher = new RadioCommandDispatcher(app, target))
        using (var control = new RadioControlChannel(app, dispatcher))
        using (var host = new CodeHost(root, config, control: control))
        {
            string authority = tls ? "thetis-test.home.arpa:50001" : "localhost:50001";
            string firstId = null;
            Exchange(host, tls, null, stream => {
                Write(stream, Upgrade(authority, tls).Replace("/code/diagnostics", "/code/control"));
                Expect(ReadHeader(stream), "101 Switching Protocols");
                var welcome = Until(stream, "welcome"); firstId = (string)welcome["connectionId"];
                Check((long)welcome["snapshot"]["receivers"][0]["vfoAHz"] == 14200001, "initial snapshot missing");
                Exchange(host, tls, null, second => {
                    Write(second, Upgrade(authority, tls).Replace("/code/diagnostics", "/code/control"));
                    Expect(ReadHeader(second), "101 Switching Protocols");
                    Check((string)ReadJson(second)["code"] == "controllerBusy", "second browser was admitted");
                    Check(ReadFrame(second).Item1 == 8 && control.ActiveConnections == 1, "rejection changed the owner");
                });
                var command = new JObject {
                    ["requestId"] = "control-1", ["sessionGeneration"] = app.GetSnapshot().SessionGeneration,
                    ["connectionId"] = firstId, ["sequence"] = 1, ["operation"] = "receiver.setFrequency", ["target"] = "rx1",
                    ["payload"] = new JObject { ["vfo"] = "a", ["frequencyHz"] = 14074001 }
                };
                var envelope = new JObject { ["type"] = "command", ["schemaVersion"] = 1, ["command"] = command };
                SendJson(stream, envelope);
                Check((bool)Until(stream, "result")["result"]["accepted"], "control command rejected");
                SendJson(stream, envelope);
                Check((bool)Until(stream, "result")["result"]["accepted"] && target.Calls == 1, "duplicate applied twice");
                var prompt = app.Prompts.RequestAsync("Wisdom", "Rebuild?", new[] { "yes", "no" }, "no", CancellationToken.None);
                var prompts = Until(stream, "prompts");
                while (((JArray)prompts["prompts"]).Count == 0) prompts = Until(stream, "prompts");
                SendJson(stream, new JObject { ["type"] = "respond", ["promptId"] = (string)prompts["prompts"][0]["id"], ["choice"] = "no" });
                Check(prompt.Wait(3000) && prompt.Result == "no", "startup choice did not reach backend");
                Frame(stream, 8, new byte[] { 3, 232 });
            });
            Check(control.ActiveConnections == 0, "disconnected controller retained ownership");
            Exchange(host, tls, null, stream => {
                Write(stream, Upgrade(authority, tls).Replace("/code/diagnostics", "/code/control"));
                Expect(ReadHeader(stream), "101 Switching Protocols"); var welcome = Until(stream, "welcome");
                Check((string)welcome["connectionId"] != firstId && (long)welcome["snapshot"]["receivers"][0]["vfoAHz"] == 14074001, "reconnect lost authoritative state or reused identity");
                Frame(stream, 8, new byte[] { 3, 232 });
            });
        }
        app.Prompts.Dispose();
        var idleApp = new RadioApplication();
        idleApp.Publish("ready", new[] { new ReceiverState("rx1", 7100000, 14200000) }, new[] { "receiver.setFrequency" });
        using (var dispatcher = new RadioCommandDispatcher(idleApp, new ControlTarget()))
        using (var idle = new RadioControlChannel(idleApp, dispatcher, TimeSpan.FromMilliseconds(200)))
        using (var host = new CodeHost(root, config, control: idle))
        {
            Exchange(host, tls, null, stream => {
                Write(stream, Upgrade(tls ? "thetis-test.home.arpa:50001" : "localhost:50001", tls).Replace("/code/diagnostics", "/code/control"));
                Expect(ReadHeader(stream), "101 Switching Protocols"); Until(stream, "welcome");
                bool closed = false;
                try { while (stream.ReadByte() != -1) { } closed = true; }
                catch (IOException ex) {
                    var error = ex.InnerException as System.Net.Sockets.SocketException;
                    Check(error == null || error.SocketErrorCode != System.Net.Sockets.SocketError.TimedOut, "Unresponsive controller waited for socket timeout"); closed = true;
                }
                Check(closed, "Unresponsive controller was not closed");
            });
            Check(idle.ActiveConnections == 0 && idleApp.GetSnapshot().Lifecycle == "ready", "Expired browser retained ownership or stopped the backend");
        }
        idleApp.Prompts.Dispose();
        System.Console.WriteLine("PASS: embedded control admits one browser, rejects others, applies typed commands once, retains prompts and resynchronizes reconnects (" + (tls ? "TLS" : "plain") + ").");
    }
}
