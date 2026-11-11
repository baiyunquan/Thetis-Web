# Step 02: Shared Backend and Exclusive Frontend Startup Implementation Plan

> Approved for implementation on 2026-11-12. Execute the eight packages below within Stage 2; retain the overall ten-stage roadmap. Qualification belongs to each package. This document records progress without claiming unimplemented behavior.

**Goal:** Run the same shared radio backend through either WinForms or Code, selected before initialization, without operational Forms/Controls in Code mode. Stage 3 owns the live receiving interface.

**Architecture:** Extract behavior incrementally, migrate the WinForms adapter to each shared service, then connect the browser. Shared C# owns settings, effective state, native resources, workers and shutdown. One extension-owned connection/model serves all Code panels.

**Tech stack:** Existing Windows x64 CMake/MSVC/net48 project, current native ABI, pinned Code OSS, TypeScript/esbuild/Vitest/Playwright. No new production web server.

## Confirmed decisions and constraints

- Ordinary launch shows a chooser, initially selecting Windows and remembering the last confirmed choice. Explicit `-ui:windows` / `-ui:code` shortcuts bypass it without changing that choice. Dispose the chooser before backend initialization.
- Keep `-code-demo` as an isolated synthetic mode; reject conflicting mode arguments.
- Code admits one controlling browser connection. Additional tabs/browsers are rejected, with an explicit Retry action; no viewer mode or handover workflow.
- Closing a browser leaves the backend running. Provide graceful Stop and Restart commands even during startup prompts.
- Preserve explicit autostart and existing CAT/TCI/MIDI/PTT behavior through shared services. Browser attachment alone never powers the radio.
- Keep existing hosting behavior and `192.168.0.0/16`; no TLS/DNS/certificate/login work.
- Preserve settings keys, profile/database selection, backup/recovery and feature-specific Apply/Cancel semantics. Browser presentation preferences stay separate.
- Code constructs no hidden Console, Setup, CWX or other operational Form/Control. Driver-required STA/message services are allowed.
- Keep native exports, net48, CLI builds, runtime staging and Windows behavior. Each independently verified operation receives a conventional commit.

## Shared interfaces

- `RadioApplication.StartAsync(options, cancellationToken)`, `StopAsync(cancellationToken)` and `GetSnapshot()`.
- `RadioCommandDispatcher.ExecuteAsync(command, cancellationToken)`; browser `RadioClient.execute`, `getSnapshot` and disposable `subscribe`.
- Schema version 1, backend generation and monotonically ordered revision. Explicit `rx1`/`rx2`/`sub` receiver and separate `a`/`b` VFO identities; validated integer Hz.
- Commands carry request ID, backend generation, connection ID, positive sequence, typed operation/payload and optional expected revision.
- Publish effective applied values; a failed native call cannot produce a successful acknowledgment.
- Bounded queues/results, duplicate high-water marks and no mutation replay after reconnect. A fresh connection receives a snapshot before ordinary mutations.
- `/code/control` uses existing WS/WSS configuration. First atomically admitted connection controls; others receive `controllerBusy` then close, with no snapshot/subscription. Heartbeat 15 seconds; unresponsive ownership released after 45 seconds. Cleanup releases only its own connection.
- Port 50001 belongs to the embedded host independently of TCI enablement. Share it when legacy TCI uses 50001; retain a separate legacy listener for configured ports such as 50005. Windows exposes no operational Code channel.

## Work packages and embedded checks

### 2.A: Behavior record and shared contracts

- [x] Record startup/settings/callback/shutdown behavior owners and ordering from current source.
- [x] Implement immutable snapshots, typed results, ordered bounded dispatch and subscriptions.
- [x] Check shared C#/TypeScript JSON fixtures, concurrency, duplicate eviction, stale identities, conflicts, invalid values and failed native application.
- [x] Run targeted tests, Release pipeline and commit. New services alone do not qualify legacy migration.

### 2.B: Settings without semantic changes

- [ ] Replace control-walking persistence with explicit mappings, preserving keys, representations and unrelated entries/layout.
- [ ] Cover State/Options/profiles/filters/EQ/routing/calibration and required feature settings, ordered application, backups/migrations and Apply/Cancel.
- [ ] Compare Windows-Code-Windows copied-profile round trips and effective native values; test corruption and interrupted writes.
- [ ] Verify, Release-build and commit each independent mapping/service extraction.

### 2.C: Native initialization and shutdown

- [ ] Extract DSP/wisdom/cache/router/audio/network lifetime; remove shared Console/Setup/cursor/dialog dependencies.
- [ ] Preserve native order and ASIO STA requirements. Separate initialization/readiness/powered receive; roll back partial initialization and make stop idempotent.
- [ ] Check native call ordering, injected failures, missing drivers/devices, repeated start/stop and actual staged DSP cleanup.
- [ ] Verify, Release-build and commit.

### 2.D: Background behavior and controllers

- [ ] Extract EQ/XVTR/profile/PureSignal application, meter acquisition, CWX runtime, CAT/TCI/MIDI/PTT and remaining supported startup workers in dependency order.
- [ ] Adapt WinForms event handlers and state notifications to shared operations. Do not drop loaded behavior because its editor comes later.
- [ ] Explicitly report unsupported enabled capabilities/faults; never silently ignore them or claim qualification.
- [ ] Check controller responses/mutations, worker lifetime/order, profile effects, cancellation and races. Use fake hardware for transmit checks. Verify, Release-build and commit per service.

### 2.E: Exclusive startup and notifications

- [ ] Move entry-point ownership out of Console; implement chooser/arguments and shared lifetime.
- [ ] Start Code hosting before DB/DSP initialization. Present typed startup progress and prompts rather than backend MessageBoxes.
- [ ] Preserve DB/wisdom choices; disconnected browsers do not accept prompts. Stop cancels pending startup and Restart retains mode/arguments after complete shutdown.
- [ ] Check selection order, chooser cancellation, no operational forms, reconnecting prompts and graceful stop/restart. Verify, Release-build and commit.

### 2.F: Embedded control channel

- [ ] Reuse request classification/framing; separate assets, diagnostics, control and legacy TCI.
- [ ] Enforce one browser, identity/generation/schema checks, bounded state output, fresh snapshot and gap resynchronization.
- [ ] Extend health/host configuration with actual frontend/lifecycle/control state.
- [ ] Check simultaneous connections, rejected tabs, reconnect/cleanup races, malformed frames, slow consumers, restart and shared/custom TCI ports. Verify, Release-build and commit.

### 2.G: Authoritative workbench integration

- [ ] Separate demo and operational stores; bind readiness/status/diagnostics and VFO editing through the same backend operation as Windows.
- [ ] Display authoritative values, pending/errors and unavailable controls. Synthetic plots never masquerade as live data.
- [ ] Keep stable views/layout/serializer/skins/responsiveness; recreated views reuse the model. Never import demo values into radio settings.
- [ ] Check physical first input, external edits, recreated views, rejection/retry, reconnect, layout and store isolation. Verify, Release-build and commit.

### 2.H: Repeatable packaging and evidence

- [ ] Maintain an executable net48 harness following repository conventions, with selectors that fail on zero tests.
- [ ] Maintain packaged browser acceptance and separate-mode copied-profile comparisons, recording package identity, phases, effective settings and cleanup measurements.
- [ ] Exercise the staged build on the existing lab machine via its established connection method; distinguish actual lab evidence from local/fake tests.
- [ ] Update downstream contract/test references in place, preserving ten stages. Verify, Release-build and commit.

## Acceptance commands

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/Thetis.RadioServices.Tests/run.ps1
pnpm --dir ui run build
pnpm --dir ui run test -- backend
pnpm --dir ui run test:e2e -- backend
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Completion requires working exclusive startup, equivalent effective settings, one admitted browser, no replay/restart on reload, preserved Windows/controllers, reachable prompts/Stop/Restart, no hidden forms and bounded resources across repeated runs. Stage 3 consumes the resulting lifecycle, contracts, settings, adapters and client for connection Setup, receive controls and calibrated plots.

## Implementation evidence

The [source extraction record](file:///D:/workspace/Thetis/docs/ui-parity/backend-extraction.md) identifies actual dependencies and the evidence boundary. The approved plan is the task authority; unchecked packages remain required work.
