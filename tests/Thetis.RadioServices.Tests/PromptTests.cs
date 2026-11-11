using System;
using System.Linq;
using System.Threading;
using Thetis.RadioServices;

internal static class PromptTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    public static void WaitsForExplicitValidResponse()
    {
        using (var prompts = new StartupPromptService()) {
            var task = prompts.RequestAsync("Database", "Update the database?", new[] { "yes", "no" }, "no", CancellationToken.None);
            Check(!task.IsCompleted, "prompt silently chose a default");
            var first = prompts.GetPending().Single();
            var afterReconnect = prompts.GetPending().Single();
            Check(first.Id == afterReconnect.Id && first.DefaultChoice == "no", "reconnect changed the pending choice");
            Check(!prompts.Respond(first.Id, "ok") && !task.IsCompleted, "invalid choice accepted");
            Check(prompts.Respond(first.Id, "yes") && task.GetAwaiter().GetResult() == "yes", "valid response was lost");
            Check(!prompts.Respond(first.Id, "no") && prompts.GetPending().Count == 0, "answered prompt reused");
        }
    }
    public static void ShutdownCancelsPendingDecisions()
    {
        var prompts = new StartupPromptService();
        var task = prompts.RequestAsync("Wisdom", "Rebuild?", new[] { "yes", "no" }, "no", CancellationToken.None);
        prompts.Dispose();
        bool cancelled = false;
        try { task.GetAwaiter().GetResult(); } catch (OperationCanceledException) { cancelled = true; }
        Check(cancelled && prompts.GetPending().Count == 0, "shutdown left a waiting initializer");
    }
    public static void CancellationRemovesOnlyItsOwnPrompt()
    {
        using (var prompts = new StartupPromptService())
        using (var token = new CancellationTokenSource()) {
            var cancelled = prompts.RequestAsync("One", "First", new[] { "ok" }, "ok", token.Token);
            var active = prompts.RequestAsync("Two", "Second", new[] { "ok" }, "ok", CancellationToken.None);
            token.Cancel();
            bool wasCancelled = false;
            try { cancelled.GetAwaiter().GetResult(); } catch (OperationCanceledException) { wasCancelled = true; }
            Check(wasCancelled && !active.IsCompleted && prompts.GetPending().Single().Title == "Two", "cancellation removed another prompt");
            var prompt = prompts.GetPending().Single();
            Check(prompts.Respond(prompt.Id, "ok") && active.GetAwaiter().GetResult() == "ok", "surviving prompt lost");
        }
    }
}
