# Step 02: Shared Backend and Exclusive Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Track work with checkboxes. This document plans future implementation; it does not claim services/tests already exist.

**Goal:** Run one shared radio application model through either WinForms or Code, with the frontend selected before initialization and no hidden operational WinForms tree in Code mode.

**Architecture:** Extract state, settings application, command dispatch and behavior-owning lifetimes into form-independent services inside the existing managed project. WinForms becomes an adapter; the browser uses a typed, versioned channel through the existing embedded server. Keep native exports unchanged.

**Tech Stack:** Windows x64, net48-compatible C#, current native C/C++ libraries, TypeScript browser extension and the qualified Step 01 embedded host.

**Spec:** [Overall layout and contracts][overview], [source analysis][analysis] and [Step 01][step01].

## Global Constraints

- Depends on qualified Step 01; preserve one operational frontend chosen before Console/splash creation.
- No backend service may require Form/Control handles, reflection-based event-handler RPC or browser timer precision.
- Preserve native ABI, net48, configuration keys/backups, external CAT/TCI/MIDI/PTT behavior and existing initialization order where behavior depends on it.
- Keep the existing managed project and CMake/CLI staging; no framework migration, IDE artifacts or extra production server. Port remains 50001.
- Every independent code/configuration/asset operation passes targeted checks and the required Release pipeline, then receives a coherent commit. No emojis.

## Review Focus

1. A saved EQ/XVTR/PureSignal/profile value loads without the old form but never reaches DSP: compare effective state, not only deserialized values.
2. Browser reload/new session receives an old command or acknowledgment: reject stale generations and never replay PTT.
3. CAT/MIDI callbacks arrive during startup/shutdown: preserve ordering and use one UI-neutral dispatcher without blocking audio callbacks.
4. WinForms and Code use different settings keys or cancel behavior: preserve schema and feature-specific transactions across mode restarts.
5. Code mode accidentally constructs an invisible form to keep the application alive: require a no-form startup/lifetime test, including eager helper constructors.

## Proposed files and shared interface contract

Create `Project Files/Source/Console/RadioServices/{RadioApplication.cs,RadioContracts.cs,RadioCommandDispatcher.cs,RadioSettingsService.cs,RadioCapabilityService.cs,HostFileAccess.cs}` and `Hosting/{UiMode.cs,ApplicationBootstrap.cs,RadioControlChannel.cs}`. Add explicit [project][project] entries. Adapt [Main][main], [InitConsole][init], [Setup persistence/application][settings], [NetworkIO][network], [Audio][audio], [cmaster][cmaster], [TCI][tci], [CAT dispatch][cat-dispatch] and behavior-owning forms as extraction proceeds.

Create `ui/thetis-extension/src/contracts.ts`, `transport/radioClient.ts`, `state/radioModel.ts` and shared test fixtures. Create proposed `tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj`, `BootstrapTests.cs`, `SettingsCompatibilityTests.cs`, `CommandDispatchTests.cs`, plus `ui/thetis-extension/test/backend.test.ts` and `test/e2e/backend.spec.ts`. Use a Windows net48-compatible test runner with fake native/radio adapters; preserve the `dotnet test` command contract consumed by later plans.

Core proposed types:

- `ReceiverId = 'rx1' | 'rx2' | 'sub'`; wire frequency is a validated safe integer number of Hz. The C# equivalent uses Int64 and checks browser-safe representation plus actual model limits. Adapters alone convert existing MHz and zero-based indices.
- `RadioCommand {requestId, sessionGeneration, operation, target?, expectedRevision?, payload}`. Feature plans define typed operation/payload unions. expectedRevision is optional and used for stale-sensitive editing transactions, not required on every high-rate tuning/telemetry action.
- `CommandResult {requestId, sessionGeneration, accepted, revision, error?}`; errors have stable code, useful message and field/capability detail. The backend owns effective values and clamping/rejection semantics.
- `RadioSnapshot {schemaVersion:1, sessionGeneration, revision, connectionState, capabilities, receivers, ...domainPayloads}` and `RadioStateEvent {schemaVersion:1, sessionGeneration, revision, changes}`. Revision orders application state; raw audio/IQ/graphics use separate bounded streams, not one giant JSON event per sample.
- `RadioClient.execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>`, `subscribe(listener: (event: RadioStateEvent) => void): Disposable`.
- `RadioApplication.Start(UiMode mode)`, `Stop()`, `GetSnapshot()` and serialized `RadioCommandDispatcher.Execute(RadioCommand command): CommandResult`. Feature services implement domain operations and publish state through this owner, not new independent sockets.

Expose an opaque host-file access boundary; Step 06 names the shared HostFileRef DTO. The browser never supplies an unrestricted engine filesystem path. Preserve each existing import/export dialog's useful choices through that boundary.

## Task 1: Extract settings and effective startup state

- [ ] Write failing `StartupAppliesProfileWithoutForms`, `LegacySettingsRoundTripAcrossModes` and `CorruptDatabaseRetainsBackupAndError` cases using copied fixtures. Assert effective mode/filter/EQ/route/calibration values and backing key equality, not only successful XML parsing.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter SettingsCompatibility`; require new cases to expose missing extraction.
- [ ] Extract typed settings readers/application order from [SaveOptions/recovery][settings], including model selection, forced updates and selective Apply/Cancel behavior. Preserve legacy keys and backup/schema rules; move UI layout into separate presentation storage.
- [ ] Adapt WinForms to display shared state and route edits through the same feature operations. Pass reference state/backup fixtures and full Release build; commit this settings operation.

## Task 2: Establish command dispatch and typed transport

- [ ] Add `ConcurrentSourcesConverge`, `RejectsOldSessionGeneration`, `DuplicateRequestDoesNotRepeatMutation`, `StaleTransactionalEditReturnsConflict` and `SnapshotGapResynchronizesWithoutPttReplay`. Assert one effective transition, ordered revision and no replayed keying.
- [ ] Run managed `--filter CommandDispatch` and `pnpm --dir ui run test -- backend`; confirm these new cases fail.
- [ ] Implement the dispatcher/model/channel, reserving a control route independently of legacy TCI. Resolve authorization/session/origin at the boundary; validate payload types and feature capability in C#. Bound queues and move slow serialization/network output off audio/IQ callbacks. Preserve TCI handshake/framing and command behavior.
- [ ] Implement the exact shared RadioClient API above. Recreated views resubscribe to the extension-owned model, obtain snapshots after gaps/session changes and show pending/error state without inventing acknowledged radio values. Pass tests, actual endpoint E2E and Release build; commit.

## Task 3: Remove behavior lifetimes from eager forms

- [ ] Trace eager construction in [InitConsole][init], including PureSignal, meters, CWX, serial listeners, EQ, Setup, XVTR, memories and restored profiles. Add `NoOperationalFormsRequiredForReadyState` and `LifecycleOrderMatchesReference`, with fake adapters that record ordering and worker counts.
- [ ] Run managed `--filter Bootstrap`; require a failure when a constructor creates a Form/Control or depends on its handle. Record legitimate native STA/driver requirements separately from presentation.
- [ ] Extract required worker/state lifetimes before eliminating each form dependency. Preserve CWX-before-serial ordering, meter-before-state recovery, EQ/XVTR/PureSignal configuration application and supported background services. Later editors may be missing; their required loaded behavior cannot disappear. Capability-gate genuinely unqualified optional features explicitly.
- [ ] Replace synchronous Console.Invoke assumptions in CAT/TCI/native callbacks with the UI-neutral dispatcher; keep WinForms marshaling solely in its adapter. Pass Windows baseline, no-form startup and bounded shutdown tests; run Release and commit each independent extracted service.

## Task 4: Select the frontend before initialization

- [ ] Add `UiSelectionPrecedesAnyForm`, `CodeStopReleasesNativeResources`, `ExternalCallbackDuringShutdownIsRejected` and `ModeRestartKeepsSettings`. Assert one backend and zero Form-derived presentation objects in Code mode; Windows mode still opens Console normally.
- [ ] Implement proposed `-ui:windows` and `-ui:code` parsing in ApplicationBootstrap before [current Main construction][main]. Default remains Windows until the qualified Code slice is deliberately selected. Use a host lifetime independent of an operational form; a necessary STA/message service is not permission to hide a Console.
- [ ] Reuse existing shutdown/restart/instance semantics with the selected frontend. Launch the Windows backend before opening a browser; the browser sandbox cannot launch local executables. Never add a second operational interface as a compatibility fallback.
- [ ] Run managed/transport/E2E lifecycle checks and Release build; commit the bootstrap operation and record supported versus unqualified service combinations.

## Embedded qualification and handoff

Compare separate Windows/Code runs from the same copied settings. Check startup/readiness/errors, late external callbacks, shutdown/restart, repeated sessions, stale commands and no hidden forms. Reopen/move/hide synthetic views while verifying the same backend generation and state. Test stream/controller load for bounded memory, callback latency and client cleanup; use real hardware for driver/radio shutdown/readiness evidence rather than claiming fake-adapter results cover it.

```powershell
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter Bootstrap
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter SettingsCompatibility
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter CommandDispatch
pnpm --dir ui run test -- backend
pnpm --dir ui run test:e2e -- backend
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Step 03 consumes authoritative snapshots/capabilities/commands and independently running lifecycle. Completion requires effective state and worker behavior, not a blank browser connected to a hidden WinForms application.

[overview]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[analysis]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>
[step01]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-01-foundation.md>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[main]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1404>
[init]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1704>
[settings]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs:1520>
[network]: <D:/workspace/Thetis/Project Files/Source/Console/HPSDR/NetworkIO.cs:27>
[audio]: <D:/workspace/Thetis/Project Files/Source/Console/audio.cs>
[cmaster]: <D:/workspace/Thetis/Project Files/Source/Console/cmaster.cs>
[tci]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:6804>
[cat-dispatch]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:15592>
