# Step 06: CW Messages, Recording and Scheduled Memories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct CW messages, current recording/playback and functional scheduled memories as backend jobs independent of panel visibility.

**Architecture:** Extend the form-independent runtime established in step 02 rather than starting new workers from views. C# owns keying, recording and scheduling; the Code extension displays snapshots and issues typed operations. Auxiliary bottom-panel views preserve the visible Console and daily controls.

**Tech Stack:** Existing .NET Framework 4.8-compatible C#, existing native keyer/DSP/recorder interfaces, TypeScript Code browser extension, existing embedded endpoint on port 50001.

**Spec:** [Overall ten-step plan](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>), [design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [inventory](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>).

## Global Constraints

- Depends on qualified steps 01–05, especially settings/lifetime, memories, TX ownership and audio routing.
- Preserve selectable WinForms, native ABI, settings formats and upstream Code source; no production server beyond the existing port 50001 endpoint.
- Extend `RadioCommand`, `CommandResult`, `RadioSnapshot`, `RadioStateEvent`; use step 02's `execute(command)`, `getSnapshot()` and `subscribe(listener)`. Receiver IDs are `rx1|rx2|sub`; radio frequencies use integer Hz.
- Backend jobs survive view hide/dispose/reload. Reopening subscribes and fetches state; it never starts a duplicate job. Process shutdown and explicit stop retain backend ownership rules.
- Distinguish engine-host files from browser upload/downloads. Keep keying/scheduling off browser timers and all blocking work off audio callbacks.
- Each operation passes targeted checks and `powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release` before its commit; this script stops Thetis before compiling/staging. No IDE artifacts or emojis.

## Review Focus

1. Closing/reloading CWX while a message sends preserves one queue; Stop releases its own key/PTT state (Task 1).
2. A Morse definition edit containing excess elements/comments preserves current normalization and Cancel semantics (Task 2).
3. Recording encounters disk-full or a missing output device; one terminal error closes the file and restores playback processing (Task 3).
4. Browser timezone differs from the engine or its clock changes; schedules use engine-local legacy semantics and do not duplicate an accepted occurrence (Task 4).
5. A scheduled memory becomes due during transmit or while recording is busy; backend preserves the characterized priority and visible outcome (Task 4).

## File and interface boundaries

All following paths are **proposed** unless linked as existing. Add `CwJobService.cs`, `CwDefinitionService.cs`, `RecordingJobService.cs`, `MemoryScheduleService.cs` and `JobContracts.cs` under `Project Files/Source/Console/RadioServices/`, included through the existing [managed project](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj:1>). Extend the lifetime services extracted in step 02; do not create parallel keyer/recorder instances.

Extend proposed `ui/thetis-extension/src/contracts.ts`; reuse `transport/radioClient.ts`, `workbench/viewRegistry.ts` and `workbench/panelRegistry.ts`. Create `panels/cw/{cwxView.ts,definitionDialog.ts}`, `panels/recording/recordingView.ts` and `panels/memories/scheduleView.ts` under that `src` root; extend step 04's `panels/memories/memoryEditor.ts`.

Create `tests/Thetis.RadioServices.Tests/{CwJobTests.cs,RecordingJobTests.cs,MemoryScheduleTests.cs}`, `ui/thetis-extension/test/cw-recording.test.ts` and `ui/thetis-extension/test/e2e/cw-recording.spec.ts`. Shared snapshot `jobs` carries `{jobId,kind,state,progress,error?,owner}` with `kind:cw|record|play|schedule` and `state:queued|running|paused|completed|cancelled|failed`; job-specific details retain queue counts, file metadata and schedule occurrence identity. Extend shared contracts with `HostFileRef {id:string,displayName:string,scope:'engine'}`; recording destination/file tokens contain these opaque references. Step 02's backend file adapter resolves them; browser code never receives unrestricted host paths.

### Task 1: Complete shared CW messages and queue control

**Files:** Proposed `CwJobService.cs`, `JobContracts.cs`, `cwxView.ts`, CW tests; adapt [CWX queue operations](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:650>), [timing callback](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:1802>) and [message encoding](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:2422>).

**Interfaces:** `CommandResult CwJobService.Execute(CwCommand command)` handles `cw.enqueue {jobId,text?,messageSlot?}`, `cw.editMessage {slot,text}`, `cw.keyboard {text,operation:append|backspace|clear}`, `cw.setPaused {paused}`, `cw.setSpeed {wpm}` and `cw.stop {jobId?}`. Slots are existing messages 1–9; reject enqueue specifying both text and slot.

- [ ] Add `CwxReloadKeepsSingleQueue`, `StopClearsOwnedKeyAndPtt` and `CatAndUiShareCwQueue`. Assert message speed metadata is `[1,99]` WPM from [CWX controls](<D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:1337>), original pause/loop/long-dash/space encoding remains equal, and reconnect submits zero enqueue commands.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter CwJob` and `pnpm --dir ui run test -- cw-recording`; require these new cases to fail.
- [ ] Extract remaining message/persistence/keyboard behavior into the existing keyer runtime. Register bottom-panel `thetis.tasks.cwx`; keep Console visible, expose queue/pause/clear/Stop and scope shortcuts to CWX focus. CAT-fed text enters the same service.
- [ ] Pass unit checks and `pnpm --dir ui run test:e2e -- cw-recording`; compare deterministic key/PTT event sequences and approved hardware timing traces against the baseline. Run the full Release command.
- [ ] Stage this operation and commit `feat: reconstruct shared CW message workflows`.

### Task 2: Reconstruct the Morse definition editor

**Files:** Proposed `CwDefinitionService.cs`, `definitionDialog.ts` and CW tests; adapt [current cwedit](<D:/workspace/Thetis/Project Files/Source/Console/cwedit.cs:252>).

**Interfaces:** `CommandResult CwDefinitionService.Save(CwDefinitionEdit edit)` handles `cw.setDefinition {character,elements,comment}`; snapshot includes definitions. Message-slot editing stays in Task 1; cwedit edits Morse definitions.

- [ ] Add `DefinitionNormalizationAndCancelMatchLegacy`: assert normalized elements length `9` and comment length `10` from [current leave handlers](<D:/workspace/Thetis/Project Files/Source/Console/cwedit.cs:304>), preserved padding/truncation, and Cancel sends no command. Verify subsequent encoding uses the saved definition.
- [ ] Run Task 1's unit commands; confirm new failures.
- [ ] Implement a small in-panel modal within CWX with original/current definition previews and Save/Cancel; reproduce the legacy normalizer rather than introducing a new character grammar.
- [ ] Pass unit/E2E tests for save/reopen/cancel and external queue activity during editing; run the full Release command.
- [ ] Stage this slice and commit `feat: reconstruct CW definition editing`.

### Task 3: Reconstruct current record/playback and host-file operations

**Files:** Proposed `RecordingJobService.cs`, `recordingView.ts`, recorder tests; adapt [current recorder](<D:/workspace/Thetis/Project Files/Source/Console/clsAudioRecordPlayback.cs:1154>), [playback](<D:/workspace/Thetis/Project Files/Source/Console/clsAudioRecordPlayback.cs:1736>) and [meter recording actions](<D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs:11614>).

**Interfaces:** `CommandResult RecordingJobService.Execute(RecordingCommand command)` handles `record.start {jobId,destinationToken,engine:wdsp|pc,receiver,rxSource:iq|audio,txSource:mic|iq,sampleRateHz,bitDepth}`, `record.stop {jobId}`, `play.start {jobId,fileToken,engine,deviceId?,gainDb}` and `play.stop {jobId}`. Bit depth choices map to [current enums](<D:/workspace/Thetis/Project Files/Source/Console/clsAudioRecordPlayback.cs:54>); host device IDs/rates come from step 05.

- [ ] Add `RecordingFailureTerminatesOnceAndRestoresProcessing`, `PanelDisposeDoesNotStopRecording` and `BrowserPathIsNotEnginePath`; assert valid WAV metadata/closed handles, existing busy policy and restored temporary EQ/processing/MOX/VAC changes after playback failure.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter RecordingJob` and UI tests; confirm failure.
- [ ] Adapt the existing recorder; expose bottom-panel `thetis.tasks.recordings` with current quick/voice/wave operations and Setup Recording options. Use step 02's host-file tokens for engine paths; explicit import/download transfers do not treat browser paths as Windows paths. Preserve WAV/JSON/optional current MP3 support without restoring the historical Wave window.
- [ ] Pass busy/device/disk-full and panel lifecycle tests, inspect completed headers/lengths and compare fixture audio within recorded tolerances. Run E2E and full Release checks.
- [ ] Stage this slice and commit `feat: reconstruct recording and playback jobs`.

### Task 4: Reconstruct functional scheduled memories

**Files:** Proposed `MemoryScheduleService.cs`, `scheduleView.ts`, schedule tests and existing planned memory editor; extract [scheduler](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:1010>) from [form-started lifetime](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:268>).

**Interfaces:** `CommandResult MemoryScheduleService.Edit(MemoryScheduleEdit edit)` handles `memory.setSchedule {memoryId,engineLocalStart,weekly,monthly,durationMinutes,recording,legacyScheduleOn,extra}` and `schedule.cancel {jobId}`. Weekly/monthly are mutually exclusive. Backend publishes its timezone ID, due time and stable occurrence/job IDs; an injected engine clock drives tests.

- [ ] Add `ScheduleUsesEngineClockExactlyOnce`, `TransmitAndBusyScheduleMatchLegacy` and `LegacyScheduleFlagsStayCompatible`. Characterize engine-local minute comparisons, weekly/ordinal-month recurrence, clock/DST changes, first-match ordering, power restoration and cancellation from copied Windows traces. Pin duration `[0,120]` minutes from [current clamp](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:961>).
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter MemorySchedule` and UI tests; confirm the new service assertions fail.
- [ ] Move execution to the existing backend scheduler lifetime; expose bottom-panel `thetis.tasks.schedules` and a Schedule section in the full memory editor. Preserve source eligibility based on weekly/monthly; retain `ScheduleOn` data without promising unsupported one-shot execution. Deduplicate each accepted occurrence independently of subscription count.
- [ ] Pass fake-clock, transmit-busy, recorder-busy, cross-timezone and real backend hide/reload checks. Compare actual [RECPOST behavior](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:12116>): use existing recorder rate/routes rather than the obsolete “48k” comment; do not claim inert `RECPOST1` restores settings. Run full Release checks.
- [ ] Stage this slice and commit `feat: reconstruct backend memory schedules`.

### Task 5: Qualify combined auxiliary-job lifecycle

**Files:** Extend the proposed job tests/E2E files and feature evidence in step 01's parity ledger; service/view changes belong to the task that fixes any discovered defect.

**Interfaces:** Consume job snapshots, step 02's session/revision contract and step 05's TX ownership; no new worker-start method on view activation.

- [ ] Add `AllAuxiliaryViewsReopenWithoutDuplicateWorkers`; assert stable job IDs and one backend worker per existing owner across CWX/recording/schedule hide, dispose, reconnect and frontend restart. Verify explicit stop/shutdown policies separately from panel closure.
- [ ] Run the three managed filters above and UI tests; confirm the new lifecycle case fails before integration fixes.
- [ ] Complete adapter subscription/disposal wiring and persistent message/schedule state; retain recoverable recording files after shutdown, without promising automatic job restart unsupported by legacy behavior.
- [ ] Pass unit/E2E and full Release checks; attach Windows/Code queue, file, scheduled-event and CAT traces for every owned ledger row. Fail acceptance for duplicate jobs, stale TX actions, file corruption, missing functional schedule behavior or an advertised unfinished operation.
- [ ] Stage lifecycle fixes/evidence and commit `test: qualify CW recording and scheduler lifecycle`.
