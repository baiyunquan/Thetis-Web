using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Thetis.RadioServices;

internal static class Program
{
    private static void Check(bool value, string detail) { if (!value) throw new Exception(detail); }
    private static int Main(string[] args)
    {
        var cases = new Dictionary<string, Action> {
            ["Dispatch.OrdersConcurrentCommands"] = OrdersConcurrentCommands,
            ["Dispatch.DuplicateDoesNotMutate"] = DuplicateDoesNotMutate,
            ["Dispatch.RejectsOldIdentityAndConflicts"] = RejectsOldIdentityAndConflicts,
            ["Dispatch.EffectiveFailureDoesNotCommit"] = EffectiveFailureDoesNotCommit,
            ["Dispatch.SnapshotCannotBeMutated"] = SnapshotCannotBeMutated,
            ["Dispatch.StoppedDispatcherRejectsCommands"] = StoppedDispatcherRejectsCommands
            , ["Contracts.SharedWireFixtureRoundTrips"] = SharedWireFixtureRoundTrips
            , ["Settings.MergePreservesOtherSettings"] = SettingsTests.MergePreservesOtherSettings
            , ["Settings.AtomicWritePreservesSchemaAndPreviousFileOnFailure"] = SettingsTests.AtomicWritePreservesSchemaAndPreviousFileOnFailure
            , ["Settings.LegacyFrequencyUsesInvariantSixDecimals"] = SettingsTests.LegacyFrequencyUsesInvariantSixDecimals
            , ["Prompts.WaitsForExplicitValidResponse"] = PromptTests.WaitsForExplicitValidResponse
            , ["Prompts.ShutdownCancelsPendingDecisions"] = PromptTests.ShutdownCancelsPendingDecisions
            , ["Prompts.CancellationRemovesOnlyItsOwnPrompt"] = PromptTests.CancellationRemovesOnlyItsOwnPrompt
            , ["Lifecycle.StartsOnceAndStopsOnce"] = LifecycleTests.StartsOnceAndStopsOnce
            , ["Lifecycle.PartialFailureRollsBackAndRetainsFault"] = LifecycleTests.PartialFailureRollsBackAndRetainsFault
            , ["Lifecycle.StopCancelsInitializationPrompt"] = LifecycleTests.StopCancelsInitializationPrompt
            , ["Network.CustomAndFirstFoundBypassRediscovery"] = NetworkConnectionTests.CustomAndFirstFoundBypassRediscovery
            , ["Network.DiscoveryOptionsAndReturnedProtocolArePreserved"] = NetworkConnectionTests.DiscoveryOptionsAndReturnedProtocolArePreserved
            , ["Network.InvalidSelectionAndFirmwareDoNotInitializeNative"] = NetworkConnectionTests.InvalidSelectionAndFirmwareDoNotInitializeNative
        };
        string selector = args.FirstOrDefault() ?? "All";
        var selected = cases.Where(x => selector == "All" || x.Key.IndexOf(selector, StringComparison.OrdinalIgnoreCase) >= 0).ToArray();
        if (selected.Length == 0) { System.Console.Error.WriteLine("No tests selected: " + selector); return 2; }
        int failed = 0;
        foreach (var test in selected)
        {
            try { test.Value(); System.Console.WriteLine("PASS " + test.Key); }
            catch (Exception ex) { failed++; System.Console.Error.WriteLine("FAIL " + test.Key + ": " + ex); }
        }
        System.Console.WriteLine($"{selected.Length - failed} passed; {failed} failed");
        return failed == 0 ? 0 : 1;
    }

    private sealed class Rig : IDisposable
    {
        public readonly RadioApplication App = new RadioApplication();
        public readonly Target Backend = new Target();
        public readonly RadioCommandDispatcher Dispatcher;
        public readonly IDisposable Connection;
        public Rig(int cache = 2) {
            App.Publish("ready", new[] { new ReceiverState("rx1", 14200000, 7100000) }, new[] { "receiver.setFrequency" });
            Dispatcher = new RadioCommandDispatcher(App, Backend, capacity: 32, resultCapacity: cache);
            Connection = Dispatcher.OpenConnection("client-1");
        }
        public RadioCommand Command(long sequence, long hz = 14000000, string receiver = "rx1", string generation = null, string connection = "client-1", long? revision = null)
            => new RadioCommand("request-" + sequence, generation ?? App.GetSnapshot().SessionGeneration, connection, sequence,
                "receiver.setFrequency", receiver, new JObject { ["vfo"] = "a", ["frequencyHz"] = hz }, revision);
        public void Dispose() { Connection.Dispose(); Dispatcher.Dispose(); }
    }
    private sealed class Target : IRadioCommandTarget
    {
        public int Calls;
        public bool Fail;
        public Task<RadioMutation> ApplyAsync(RadioCommand command, RadioSnapshot current, CancellationToken token)
        {
            token.ThrowIfCancellationRequested();
            Calls++;
            if (Fail) throw new InvalidOperationException("native operation failed");
            long hz = (long)command.Payload["frequencyHz"];
            return Task.FromResult(new RadioMutation(new[] { new ReceiverState(command.Target, hz, current.Receivers[0].VfoBHz) }));
        }
    }
    private static CommandResult Execute(Rig rig, RadioCommand command) => rig.Dispatcher.ExecuteAsync(command, CancellationToken.None).GetAwaiter().GetResult();
    private static void OrdersConcurrentCommands()
    {
        using (var rig = new Rig()) {
            var tasks = Enumerable.Range(1, 20).Select(n => rig.Dispatcher.ExecuteAsync(rig.Command(n, 14000000 + n), CancellationToken.None)).ToArray();
            Task.WaitAll(tasks);
            Check(tasks.All(x => x.Result.Accepted), "commands rejected");
            Check(tasks.Select(x => x.Result.Revision).SequenceEqual(Enumerable.Range(2, 20).Select(x => (long)x)), "revisions not ordered");
            Check(rig.App.GetSnapshot().Receivers[0].VfoAHz == 14000020 && rig.Backend.Calls == 20, "effective value lost");
        }
    }
    private static void DuplicateDoesNotMutate()
    {
        using (var rig = new Rig()) {
            var command = rig.Command(1);
            Check(Execute(rig, command).Accepted && Execute(rig, command).Accepted && rig.Backend.Calls == 1, "duplicate was applied");
            Execute(rig, rig.Command(2)); Execute(rig, rig.Command(3));
            Check(Execute(rig, command).Error.Code == "oldSequence" && rig.Backend.Calls == 3, "evicted duplicate was applied");
            Check(!Execute(rig, rig.Command(3, 15000000)).Accepted, "changed duplicate reused cached acknowledgment");
        }
    }
    private static void RejectsOldIdentityAndConflicts()
    {
        using (var rig = new Rig()) {
            Check(Execute(rig, rig.Command(1, generation: "old")).Error.Code == "staleGeneration", "old generation accepted");
            Check(Execute(rig, rig.Command(1, connection: "other")).Error.Code == "staleConnection", "unregistered connection accepted");
            Check(Execute(rig, rig.Command(1, revision: 0)).Error.Code == "conflict", "stale transaction accepted");
            Check(Execute(rig, rig.Command(2, receiver: "rx9")).Error.Code == "invalidTarget", "invalid receiver accepted");
            Check(Execute(rig, rig.Command(3, hz: 9007199254740992)).Error.Code == "invalidPayload", "unsafe Hz accepted");
            Check(rig.Backend.Calls == 0, "invalid command reached backend");
        }
    }
    private static void EffectiveFailureDoesNotCommit()
    {
        using (var rig = new Rig()) {
            rig.Backend.Fail = true;
            var before = rig.App.GetSnapshot();
            var result = Execute(rig, rig.Command(1));
            Check(!result.Accepted && result.Error.Code == "applicationFailed", "native failure acknowledged");
            Check(rig.App.GetSnapshot().Revision == before.Revision && rig.App.GetSnapshot().Receivers[0].VfoAHz == before.Receivers[0].VfoAHz, "failed value committed");
        }
    }
    private static void SnapshotCannotBeMutated()
    {
        using (var rig = new Rig()) {
            var command = rig.Command(1);
            command.Payload["frequencyHz"] = 123;
            Check((long)command.Payload["frequencyHz"] == 14000000, "payload aliased");
            var before = rig.App.GetSnapshot();
            Execute(rig, command);
            Check(before.Receivers[0].VfoAHz == 14200000 && before.Revision == 1, "published snapshot mutated");
            rig.Connection.Dispose();
            Check(Execute(rig, rig.Command(2)).Error.Code == "staleConnection", "disposed connection retained");
        }
    }
    private static void StoppedDispatcherRejectsCommands()
    {
        using (var rig = new Rig()) {
            rig.Dispatcher.Dispose();
            Check(Execute(rig, rig.Command(1)).Error.Code == "stopping", "stopped dispatcher accepted a command");
        }
    }
    private static void SharedWireFixtureRoundTrips()
    {
        var fixture = JObject.Parse(File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "radio-snapshot-v1.json")));
        var snapshot = fixture.ToObject<RadioSnapshot>();
        Check(snapshot.SchemaVersion == 1 && snapshot.Receivers[0].VfoAHz == 14200001 && snapshot.Receivers[1].VfoAHz == null, "wire fixture changed");
        Check(JToken.DeepEquals(fixture, JObject.Parse(RadioWire.Serialize(snapshot))), "managed wire format differs from browser fixture");
    }
}
