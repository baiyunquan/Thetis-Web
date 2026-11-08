# Step 07: Advanced RF and Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct PureSignal, AmpView, diversity, transverters and hardware calibration with shared backend behavior and reversible configuration round-trips.

**Architecture:** Extend the services established in step 02; keep RF calculations, calibration workers and correction state in C#. Thin WinForms and browser adapters consume the same operations. Compact RF views provide monitoring and frequent actions; large editors provide advanced settings, plots and tables.

**Tech Stack:** .NET Framework 4.8-compatible C#, existing native DSP, TypeScript browser extension, Code OSS webviews, managed behavioral tests and browser end-to-end tests.

**Spec:** [Authoritative overall UI/layout and sequence](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>). Also read the [design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [source inventory](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>). This document proposes future implementation; no RF operation is authorized or performed by writing it.

## Global Constraints

- Retain WinForms; select exactly one operational frontend before initialization using proposed `-ui:windows` or `-ui:code`; switching requires restart.
- Serve staged assets and application WebSockets from the existing C# endpoint on port 50001. Keep extension sources parent-owned and avoid direct Code source changes.
- Consume `RadioClient.execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>` and `subscribe(listener: (event: RadioStateEvent) => void): Disposable` from the [proposed shared client](<D:/workspace/Thetis/ui/thetis-extension/src/transport/radioClient.ts>). Extend the [proposed contracts](<D:/workspace/Thetis/ui/thetis-extension/src/contracts.ts>); never invoke form click handlers remotely.
- Receiver IDs are `rx1`, `rx2`, `sub`; frequencies are integer Hz. Only the backend adapter converts legacy frequency representations. Preserve native ABI and explicit [project compile entries](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>).
- Hiding, moving or disposing a view removes its subscription, never its active RF loop. Connection recovery obtains current state without replaying calibration or transmit requests.
- Every task below includes behavioral and hardware qualification. Before each coherent commit, pass `powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release`; the [build script](<D:/workspace/Thetis/build.ps1>) terminates Thetis before compiling/staging. No final qualification-only task exists.

## Review Focus

1. Editor closure during calibration must preserve one backend worker and the same operation identity on reopening; covered by task 1.
2. Correction-file failure must preserve previous applied correction and expose a useful error; covered by task 2.
3. Unsupported hardware or changed ADC/DDC allocation must reject incompatible diversity operations without partially changing routing; covered by task 3.
4. Transverter boundary, RX-only and power settings must survive both UI modes without a second TypeScript frequency calculation; covered by task 4.
5. Calibration cancellation or radio loss must release temporary transmit/routing state according to baseline behavior, without reporting success; covered by task 5.

## Proposed file boundaries and shared interfaces

All new paths here are proposals. Create feature services under [RadioServices/AdvancedRf](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/>): [PureSignalService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/PureSignalService.cs>), [DiversityService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/DiversityService.cs>), [TransverterService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/TransverterService.cs>), [RfHardwareService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/RfHardwareService.cs>) and [RfContracts.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/RfContracts.cs>). Each service owns one feature's state and commands; add explicit compile entries. Preserve existing form layouts while replacing their behavioral ownership with service bindings.

Create browser adapters under [src/rf](<D:/workspace/Thetis/ui/thetis-extension/src/rf/>): [PureSignalView.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/PureSignalView.ts>), [PureSignalEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/PureSignalEditor.ts>), [AmpViewEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/AmpViewEditor.ts>), [DiversityView.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/DiversityView.ts>), [TransverterEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/TransverterEditor.ts>), [HardwareRfEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/HardwareRfEditor.ts>). Extend the [proposed extension manifest](<D:/workspace/Thetis/ui/thetis-extension/package.json>) with RF navigation commands and editors. Register optional `thetis.receiver.pureSignal` and `thetis.receiver.diversity` inside existing `thetis-receiver-controls`, initially hidden/collapsed; preserve default meters/bands/modes/filters ordering and saved user placement. Native single-view header merging must retain an accessible view title/action path.

Extend contracts with `RadioSnapshot.rf: RfSnapshot`, containing `pureSignal`, `diversity`, `transverters`, `hardware` and capability/revision fields. Commands below join `RadioCommand`; acknowledgments identify the accepted operation and authoritative revision. Test files are [proposed managed tests](<D:/workspace/Thetis/tests/Thetis.RadioServices.Tests/AdvancedRfBehaviorTests.cs>), [browser unit tests](<D:/workspace/Thetis/ui/thetis-extension/src/rf/rf.spec.ts>) and [browser scenarios](<D:/workspace/Thetis/ui/tests/e2e/advanced-rf.e2e.ts>).

### Task 1: PureSignal control ownership and compact view

**Sources:** [state machine and calibration](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:466>), [worker transitions](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:633>). **Files:** proposed [PureSignalService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/PureSignalService.cs>), [RfContracts.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/RfContracts.cs>), [PureSignalView.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/PureSignalView.ts>); adapt [PSForm](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs>).

**Interfaces:** Add `rf.pureSignal.setAuto(enabled)`, `rf.pureSignal.singleCalibrate()` and `rf.pureSignal.reset()`; publish operation ID, calibration count, feedback quality, correction-applied state and attenuation state.

- [ ] Write `PureSignal_ViewClosureKeepsSingleOperation`: start calibration, dispose/recreate two views; assert `Assert.Equal(start.Id, reopened.OperationId)` and `Assert.Equal(1, fixture.CalibrationWorkerCount)`, unchanged reset count and fresh snapshot; external changes update both adapters.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter PureSignal`; expect failure at missing shared ownership assertions.
- [ ] Implement service-owned transitions and compact controls; keep advanced settings in [PureSignalEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/PureSignalEditor.ts>). Restore saved state once before observers attach; browser controls must not start a second timer.
- [ ] Pass the managed selector and `pnpm --dir ui run test:e2e -- advanced-rf`; compare Windows/Code enable, single/reset, bad-feedback recovery and attenuation traces on qualified equipment. Record model/firmware and unmet hardware cases, run the Release pipeline, then commit `feat: share PureSignal control state across frontends` with only task files.

### Task 2: Correction files and AmpView

**Sources:** [save/restore behavior](<D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:524>), [plot acquisition](<D:/workspace/Thetis/Project Files/Source/Console/AmpView.cs:355>). **Files:** extend [PureSignalService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/PureSignalService.cs>); create [PureSignalEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/PureSignalEditor.ts>), [AmpViewEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/AmpViewEditor.ts>); adapt both legacy forms.

**Interfaces:** Add `rf.pureSignal.saveCorrection(hostFileId)` and `rf.pureSignal.restoreCorrection(hostFileId)` through existing host-file services; publish bounded `AmpViewFrame` samples with units and revision.

- [ ] Write `Correction_RestoreFailurePreservesAppliedState` and `AmpView_ClosingPlotDoesNotResetCorrection`; assert `Assert.False(failedRestore.Success)` and `Assert.Equal(before.CorrectionHash, after.CorrectionHash)` for malformed/missing files; successful save/restore reproduces metadata and numeric samples.
- [ ] Run the managed `--filter Correction` selector and `pnpm --dir ui run test -- rf`; expect failing round-trip/state assertions.
- [ ] Implement host-file operations with baseline auto-calibration interactions; provide advanced control and AmpView editor tabs/splits. Publish plot frames independently from control state; discard obsolete frames rather than blocking RF callbacks.
- [ ] Pass both selectors and `pnpm --dir ui run test:e2e -- advanced-rf`; qualify restore/enable/reset sequencing against Windows, including unreadable files and connection recovery, then Release-build and commit `feat: reconstruct correction workflows and AmpView`.

### Task 3: Diversity calculations, memories and routing

**Source:** [phase/steering calculation](<D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs:1834>). **Files:** proposed [DiversityService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/DiversityService.cs>), [DiversityView.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/DiversityView.ts>); adapt [DiversityForm](<D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs>).

**Interfaces:** Add `rf.diversity.configure(settings: DiversitySettings)` and `rf.diversity.recall(memoryId)`; settings include gain/phase, steering, spacing, calibration offset, reference antenna and attenuation-link choices.

- [ ] Write `Diversity_IncompatibleDdcAllocationIsAtomic` and `Diversity_MemoryRoundTripPreservesScalars`; assert `Assert.Equal(before.Routes, rejected.Routes)` and `Assert.Equal(reference.Scalars, restored.Scalars)` for an incompatible allocation and saved memory respectively.
- [ ] Run managed `--filter Diversity`; expect failure before extraction.
- [ ] Extract existing formulas and coupled receiver/Setup changes into the service; expose compact right-side controls plus expanded editor navigation, preserving memory persistence and capability restrictions.
- [ ] Pass managed and `pnpm --dir ui run test:e2e -- advanced-rf`; compare both UI modes over frequency changes, external encoders and supported RX1/RX2 allocations, then Release-build and commit `feat: share diversity routing and calibration`.

### Task 4: Transverter tables and translated tuning

**Source:** [transverter implementation](<D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs>), including [tune/power effects](<D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs:5948>). **Files:** proposed [TransverterService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/TransverterService.cs>), [TransverterEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/TransverterEditor.ts>); adapt XVTR form.

**Interfaces:** Add `rf.transverters.update(entryId, settings: TransverterSettings)`; snapshot includes translated/IF frequencies, bounds, labels, RX-only, PA/relay, gain and power/tune choices.

- [ ] Write `Transverter_BoundariesAndRxOnlyRoundTrip`: exercise lower/upper limits and one-Hz neighbors, overlapping/disabled entries; assert `Assert.Equal(reference.IfHz, restored.IfHz)` and `Assert.False(rxOnly.CanTransmit)`, plus baseline validation after Windows/Code restart.
- [ ] Run managed `--filter Transverter`; expect failing translated-state assertions.
- [ ] Implement a full editor table with contextual edit dialogs; use backend translation for VFO, band and meter updates. Preserve existing per-band limits and serialization.
- [ ] Pass managed and `pnpm --dir ui run test:e2e -- advanced-rf`, compare persisted database values and tuning traces, run Release, then commit `feat: reconstruct transverter configuration and translation`.

### Task 5: PA calibration, device controls and RF paths

**Sources:** [frequency/level calibration](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:6504>), [PA calibration](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:9782>), [RF paths](<D:/workspace/Thetis/Project Files/Source/Console/Path_Illustrator.cs>). **Files:** proposed [RfHardwareService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AdvancedRf/RfHardwareService.cs>), [HardwareRfEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/rf/HardwareRfEditor.ts>); bind related Setup pages and path view.

**Interfaces:** Add `rf.hardware.startCalibration(kind, bands)`, `rf.hardware.cancelCalibration(operationId)`, `rf.hardware.configure(settings)`; publish progress, result, effective route graph and supported controls.

- [ ] Write `RfCalibration_RadioLossRestoresTemporaryState` and `RfPaths_ReflectCapabilityAndRelayChanges`; assert `Assert.False(interrupted.Succeeded)` and `Assert.Equal(reference.CleanupState, interrupted.State)`; antenna/ADC/BPF/LPF/ATU edits must change the expected route edges.
- [ ] Run managed `--filter RfHardware`; expect failed cleanup/route assertions.
- [ ] Implement PA gain/watt-meter, frequency/level/volts/amps calibration and device options in real editor tabs; generate RF diagrams from effective state. Keep confirmations/context edits dialogs and unsupported controls explanatory.
- [ ] Pass managed and `pnpm --dir ui run test:e2e -- advanced-rf`; qualify numerical calibration results, cancellation and persistence on each advertised model/firmware. Attach evidence to owned inventory rows, run Release, then commit `feat: reconstruct RF hardware calibration and path editors`.
