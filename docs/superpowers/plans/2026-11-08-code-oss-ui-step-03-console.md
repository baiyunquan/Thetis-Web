# Step 03: Main Console, Connection and Receiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Track work with checkboxes. This is a future plan, not a claim of delivered UI or qualified hardware.

**Goal:** Deliver the first real operating slice in the original spatial arrangement: essential connection Setup, left power/gain, top VFOs, centre spectra, right receiver controls and the lower operating/RX2 deck.

**Architecture:** Replace synthetic Step 01 models with Step 02's authoritative snapshots, commands and capabilities. Each native section projects the same extension-owned model. Reconstruct the central Console as one editor surface so VFOs, plots and everyday operating groups remain adjacent.

**Tech Stack:** Existing net48 managed/native engine, TypeScript browser extension, browser graphics and current Code view/editor APIs. No secondary server or direct Code source edits.

**Spec:** [Overall layout][overview], [Step 02 contract][step02], [manual screenshots][manual], [current network guide][network-guide] and [source inventory][inventory].

## Global Constraints

- Depend on qualified Steps 01-02; preserve exclusive startup, native ABI, net48 and current persistence.
- Use RadioCommand/CommandResult/RadioSnapshot/RadioStateEvent and the exact RadioClient API from Step 02; canonical IDs rx1/rx2/sub, validated integer Hz and backend-published ranges/units.
- Layout follows source proximity rather than fixed pixels. Preserve native section hide/move/collapse and user state, including Code's single-view header behavior.
- RX/TX identity and unavailable/stale state remain explicit. Do not expose unqualified transmit or topology operations as working controls; later steps complete them.
- Every independent implementation operation passes targeted checks and the mandatory Release build before a coherent commit. No IDE artifacts, extra production server or emojis.

## Review Focus

1. Discovery selects a different NIC/radio or custom-radio path than Windows: compare complete connection inputs and outcomes.
2. A late VFO response overwrites newer external tuning: render only authoritative generation/revision and preserve active-edit conflict semantics.
3. RX2 data is drawn against RX1 axes or controls: require explicit receiver/stream identities.
4. User hides the gain sidebar or switches mode: preserve backend state, focus and panel layout without restarting services.
5. Skin/scaling/scroll behavior clips values or changes gain accidentally: test actual controls at supported sizes and input methods.

## Files, operations and region ownership

Proposed C# files: `RadioServices/ConnectionService.cs`, `ReceiverService.cs`, `ReceiverContracts.cs`, `DisplayStreamService.cs` within the existing Console project. Adapt [NetworkIO][network], [radio discovery][discovery], [radio list][radio-list], [Console frequency][frequency], [power][power], gain/DSP and [display pipeline][display] without changing native exports.

Proposed UI files: `ui/thetis-extension/src/panels/console/{ConsolePanel.ts,VfoStrip.ts,OperatingDeck.ts,Rx2Strip.ts,SpectrumView.ts}`, `panels/operation/{PowerView.ts,GainView.ts,DeviceView.ts}`, `panels/tuning/ReceiverSummaryViews.ts`, `panels/setup/SetupEditor.ts`, `state/receiverModel.ts`. Extend existing Step 01 view/panel registries and theme tokens; do not create a second transport or fake editor-tab strip.

Proposed tests: `tests/Thetis.RadioServices.Tests/{ConnectionTests.cs,ReceiverTests.cs,DisplayFrameTests.cs}`, `ui/thetis-extension/test/console.test.ts`, `test/e2e/console.spec.ts`.

Operations extend the shared envelope: `radio.discover`, `radio.selectDevice`, `radio.connect`, `radio.power`, `receiver.setFrequency`, `receiver.setMode`, `receiver.setFilter`, `receiver.setGain`, `receiver.setDsp`. Each payload uses typed fields and explicit receiver/device identities. Step 04 introduces complete topology/VFO-transfer/CTUN transactions. Step 05 qualifies transmit commands; show their current state but gate unqualified actions.

`ConnectionService.GetOptions()` supplies supported protocol/NIC/radio/discovery settings and readiness. `ReceiverService.Execute(ReceiverCommand)` returns the shared result. `DisplayFrame {receiverId,sequence,startHz,binWidthHz,binCount,powerDb,calibration}` is a proposed separate bounded display payload; validate lengths/finite values and source-defined calibration. Do not substitute an unqualified client FFT for the existing calibrated display output.

## Task 1: Essential connection Setup and readiness

- [ ] Add failing `ConnectionOptionsMatchLegacy`, `CustomRadioBypassesDiscovery`, `FirstFoundIsNotPersistedAsFixedDevice`, `NoNicOrRadioReportsActualError` and `UnsupportedFirmwarePortOptionIsUnavailable` cases from copied network fixtures.
- [ ] Run managed `--filter Connection` and `pnpm --dir ui run test -- console`; require new cases to fail before implementation.
- [ ] Extract backend discovery/options, selected NIC/radio, model/protocol, directed address/port, first-found/custom behavior, random/fixed listen port, interface/subnet/protocol filters and watchdog effects. Respect firmware restrictions documented in the network guide and current source; browser UDP is not the discovery implementation.
- [ ] Open General/Hardware/Network in the wide modeless Setup editor from `thetis-setup`; use the collapsed Operate device section for readiness/selection summary and links. Add explicit pending/timeout/error feedback and no automatic unexpected connection attempt on view reveal. Pass fixtures/browser checks, Release-build and commit.

## Task 2: Reconstruct the left and right operating sections

- [ ] Add `GainMetadataMatchesBackend`, `SidebarScrollDoesNotChangeGain`, `HiddenViewDoesNotChangeRadio` and `ReceiverTargetDoesNotEnableRx2`. Use distinct RX1/RX2 test values, disabled capabilities and source-defined min/max/steps/units.
- [ ] Run managed `--filter Receiver` and the Console UI selector; require failure for unsupported edits and accidental scroll changes.
- [ ] Bind independently registered `thetis.operation.power`, `.gain`, `.device` and right-side `thetis.receiver.meters`, `.bands`, `.modes`, `.filters`. Preserve left power/options and gain grouping, and right meter/band/mode/filter order from [current resource positions][resources]. Show source-supported state and qualified receive controls; Step 04 finishes full preset/topology editing.
- [ ] Read/write only through the shared model/services. Give the right groups explicit target context, retain source-global versus receiver-local ownership, and avoid suggesting RX2/sub controls that hardware lacks. Pass unit/E2E plus Release, then commit this section operation.

## Task 3: VFO strip and lower Console operating deck

- [ ] Write `VfoIntegerHzRoundTrip`, `StaleGenerationDoesNotOverwriteNewTune`, `ModeSwitchPreservesDeckCollapseAndFocus` and `CodeTextEntryDoesNotTriggerRadioShortcuts`. Include legacy invalid/unavailable sentinel state represented as unavailable, not as a tunable negative frequency.
- [ ] Run receiver/UI selectors and confirm the new cases fail. Record digit/wheel/entry behavior and mode/filter effects against Windows fixtures.
- [ ] Place VFO A, sync/step/recall and VFO B above spectra. Keep tuning/DSP/display/mixer below plots, with phone/CW/digital/FM controls in the original lower mode slot and RX2 summary along the bottom. Initial capability-limited fields may display backend state; incomplete actions remain unavailable until their owning step qualifies them.
- [ ] Apply Step 01 theme/component/state tokens from the beginning. Scope radio shortcuts to intended focused surfaces and provide reveal commands plus persistent backend/TX identity and Stop/abort routing. Pass layout/input/state tests, Release-build and commit.

## Task 4: Calibrated spectra, waterfall and basic meters

- [ ] Add `FrameReceiverAndAxisMapping`, `InvalidFrameIsRejected`, `SlowViewUsesBoundedQueue`, `MetersUseQualifiedCalibration` and `ReconnectClearsStaleFrameGeneration`. Replay known injected tones/recorded analyzer frames and distinct receiver sequences.
- [ ] Run managed `--filter DisplayFrame` and the UI selector; verify the absent renderer/validation causes failures.
- [ ] Publish qualified existing analyzer/display data off timing-sensitive callbacks. Render initial panadapter/waterfall, source-defined averaging/scale, selected passband and tune markers, mouse tuning and basic meter readouts. Keep raw stream and control-state queues separate; expose sequence/drop diagnostics and configured frame limits rather than an unbounded history.
- [ ] Show RX2 plots/summary for qualified enabled states without inventing topology operations. Step 04 completes topology mutations and Step 08 all remaining DisplayMode variants. Compare axes/calibration/receiver mapping to Windows evidence, run visible-browser E2E/load checks and Release, then commit.

## Embedded qualification and handoff

Demonstrate on the actual packaged workbench/embedded endpoint: select a supported device, connect, power receive, tune, change mode/filter/gain, view calibrated spectrum/waterfall and hear the selected local backend audio route. Inspect real screenshots/errors at Expanded/Compact/scaling variants; test both sidebars hidden, native section movement, split editor, theme change, reconnect and state restoration.

Compare separate Windows/Code runs with copied settings, external CAT/TCI tuning and unavailable-device failures. Check receiver identity, settings round-trip, no unqualified TX and bounded stream/controller load. Hardware/driver behavior requires equipment evidence; fixtures alone do not qualify it. Record limitations so a receive-only slice is not advertised as full Console parity.

```powershell
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter Connection
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter Receiver
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter DisplayFrame
pnpm --dir ui run test -- console
pnpm --dir ui run test:e2e -- console
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Step 04 reuses these commands/models and regions for full receiver workflows and editors. Step 05 extends the lower mode slot and left transmit options, rather than redesigning the workbench again.

[overview]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[step02]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-02-backend.md>
[manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis manual_1.1.pdf>
[network-guide]: <D:/workspace/Thetis/Documentation/Radio/Thetis Network Settings_0.2.pdf>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[network]: <D:/workspace/Thetis/Project Files/Source/Console/HPSDR/NetworkIO.cs:27>
[discovery]: <D:/workspace/Thetis/Project Files/Source/Console/HPSDR/clsRadioDiscovery.cs>
[radio-list]: <D:/workspace/Thetis/Project Files/Source/Console/ucRadioList.cs:53>
[frequency]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:18260>
[power]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:19734>
[display]: <D:/workspace/Thetis/Project Files/Source/Console/display.cs>
[resources]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx>
