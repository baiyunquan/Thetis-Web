using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Thetis.RadioServices;

internal static class LifecycleTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private sealed class Runtime : IRadioRuntime
    {
        public int Starts, Stops;
        public bool Fail, Prompt;
        public readonly TaskCompletionSource<bool> Entered = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task<RadioRuntimeState> StartAsync(RadioStartOptions options, StartupPromptService prompts, CancellationToken token)
        {
            Starts++; Entered.TrySetResult(true);
            if (Prompt) await prompts.RequestAsync("Wisdom", "Rebuild?", new[] { "yes", "no" }, "no", token).ConfigureAwait(false);
            token.ThrowIfCancellationRequested();
            if (Fail) throw new InvalidOperationException("fixture initialization failed");
            return new RadioRuntimeState(new[] { new ReceiverState("rx1", 14200001, 7100000) }, new[] { "receiver.setFrequency" });
        }
        public Task StopAsync(CancellationToken token) { Stops++; return Task.CompletedTask; }
    }
    public static void StartsOnceAndStopsOnce()
    {
        var runtime = new Runtime();
        var app = new RadioApplication(runtime);
        var options = new RadioStartOptions("code", "profile", Array.Empty<string>());
        Task.WaitAll(app.StartAsync(options, CancellationToken.None), app.StartAsync(options, CancellationToken.None));
        Check(runtime.Starts == 1 && app.GetSnapshot().Lifecycle == "ready", "duplicate runtime start");
        Task.WaitAll(app.StopAsync(CancellationToken.None), app.StopAsync(CancellationToken.None));
        Check(runtime.Stops == 1 && app.GetSnapshot().Lifecycle == "stopped", "duplicate shutdown");
    }
    public static void PartialFailureRollsBackAndRetainsFault()
    {
        var runtime = new Runtime { Fail = true };
        var app = new RadioApplication(runtime);
        bool failed = false;
        try { app.StartAsync(new RadioStartOptions("code", "profile", Array.Empty<string>()), CancellationToken.None).GetAwaiter().GetResult(); }
        catch (InvalidOperationException) { failed = true; }
        Check(failed && runtime.Stops == 1 && app.GetSnapshot().Lifecycle == "faulted", "partial runtime was not rolled back");
        Check(app.GetSnapshot().Fault.Contains("fixture initialization failed"), "startup error lost");
        app.StopAsync(CancellationToken.None).GetAwaiter().GetResult();
        Check(runtime.Stops == 1, "rollback resources stopped again");
    }
    public static void StopCancelsInitializationPrompt()
    {
        var runtime = new Runtime { Prompt = true };
        var app = new RadioApplication(runtime);
        var start = app.StartAsync(new RadioStartOptions("code", "profile", Array.Empty<string>()), CancellationToken.None);
        runtime.Entered.Task.GetAwaiter().GetResult();
        app.StopAsync(CancellationToken.None).GetAwaiter().GetResult();
        bool cancelled = false;
        try { start.GetAwaiter().GetResult(); } catch (OperationCanceledException) { cancelled = true; }
        Check(cancelled && runtime.Stops == 1 && app.GetSnapshot().Lifecycle == "stopped", "stop left startup blocked");
        Check(app.Prompts.GetPending().Count == 0, "shutdown retained prompt");
    }
}
