# Step 05: Audio, Transmit and Mode Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct audio processing, TX profiles, native/browser audio and phone/CW/digital/FM operation with qualified transmit behavior.

**Architecture:** Extend the shared C# state/services established in step 02; WinForms and Code dispatch through identical rules. Audio editors are extension-provided wide editors, while daily mode controls stay below the Console spectrum. Native host audio and optional browser media have separate identities and lifetimes.

**Tech Stack:** Existing .NET Framework 4.8-compatible C#, Windows native DSP/audio ABI, TypeScript browser extension and browser media facilities; packaged Code OSS served on port 50001.

**Spec:** [Overall ten-step plan](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>), [design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [inventory](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>).

## Global Constraints

- Depends on qualified steps 01–04, including frontend-independent restoration and TX-VFO state. Queued CW and recording arrive in step 06; advanced RF calibration in step 07.
- Preserve selectable WinForms, existing settings/profile formats, native ABI and upstream Code source; use the existing port 50001 endpoint without a secondary production server.
- Extend `RadioCommand`, `CommandResult`, `RadioSnapshot`, `RadioStateEvent`; consume `execute(command)`, `getSnapshot()` and `subscribe(listener)` from step 02. Receiver IDs are `rx1|rx2|sub`; radio frequencies use integer Hz.
- Backend owns settings, validation, DSP routing and TX arbitration. Browser reconnection obtains state and never replays PTT/MOX/tune.
- Every operation passes its targeted checks and `powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release` before committing. This script stops Thetis before compiling/staging. No IDE artifacts or emojis.

## Review Focus

1. Browser loss during momentary PTT releases only that browser's ownership; physical/CAT ownership is not cancelled (Task 3).
2. Loading an old TX profile changes actual EQ/CFC/VAC/DSP state without constructing their forms (Task 6).
3. A dragged EQ frequency cannot cross the source-defined spacing boundary or apply to the wrong DSP channel (Task 1).
4. Browser microphone denial/removal produces no TX and does not reconfigure Windows audio devices (Task 5).
5. A VAC/ASIO device disappears during use; backend reports failure and other audio routes retain their state (Task 4).

## File and interface boundaries

The following are **proposed** source/test files. C# services live under `Project Files/Source/Console/RadioServices/`, included through the existing [managed project](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj:1>): `AudioTransmitContracts.cs`, `EqualizerService.cs`, `CfcService.cs`, `TransmitService.cs`, `AudioRoutingService.cs`, `TxProfileService.cs`.

Extend proposed `ui/thetis-extension/src/contracts.ts`; reuse `transport/radioClient.ts`, `workbench/viewRegistry.ts` and `workbench/panelRegistry.ts`. Create `panels/audio/{equalizerEditor.ts,cfcEditor.ts,audioRoutingView.ts,txProfileEditor.ts,browserAudio.ts}` and `panels/console/modeControls.ts` beneath that `src` root. Test files are `tests/Thetis.RadioServices.Tests/{AudioTransmitTests.cs,TxProfileTests.cs}`, `ui/thetis-extension/test/audio-transmit.test.ts` and `ui/thetis-extension/test/e2e/audio-transmit.spec.ts`.

Shared payloads: `EqProfile {target:rx|tx,kind:graphic|parametric,enabled,preampDb,points:[{bandId,frequencyHz,gainDb,q}],minHz,maxHz}`; `CfcProfile {enabled,bandCount,minHz,maxHz,precompDb,posteqDb,compressionPoints,eqPoints}` uses the same point shape. Typed setting edits use `{target:rx1|rx2|tx|vac1|vac2|host,settingId,value:boolean|number|string}` with backend-published descriptors enumerating permitted IDs, units/ranges and capability conditions, derived from the step-01 ledger and step-02 settings registry. These IDs are domain settings, never control/event-handler names.

### Task 1: Reconstruct graphic and parametric EQ

**Files:** Proposed `EqualizerService.cs`, `equalizerEditor.ts`, contracts/tests; adapt [EQ state and DSP routing](<D:/workspace/Thetis/Project Files/Source/Console/eqform.cs:2998>) and reuse [parametric validation](<D:/workspace/Thetis/Project Files/Source/Console/ucParametricEq.cs:1169>).

**Interfaces:** `CommandResult EqualizerService.SetProfile(EqProfile profile)` handles `audio.setEq`; snapshot `audio.eq` carries effective profiles and constraints.

- [ ] Add `EqSpacingAndRoutingMatchLegacy`: assert adjacent points obey existing minimum spacing, Q/gain bounds match copied source fixtures and RX updates target existing main/sub channels rather than silently adding RX2 EQ. Include reset/enable and all current graphic/parametric band-count choices.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter AudioTransmit` and `pnpm --dir ui run test -- audio-transmit`; require new cases to fail.
- [ ] Extract DSP updates/settings serialization; implement `thetis.equalizerEditor` with graph, numeric edits, RX/TX switching, live-update policy and reset. Launch from an independently hideable Audio section.
- [ ] Pass unit checks and `pnpm --dir ui run test:e2e -- audio-transmit`; compare profile JSON and applied native parameters in both frontends, then run the full Release command.
- [ ] Stage this operation's explicit paths and commit `feat: reconstruct shared audio equalizers`.

### Task 2: Deliver CFC and speech processing

**Files:** Proposed `CfcService.cs`, `cfcEditor.ts`, contracts/tests; adapt [current CFC behavior](<D:/workspace/Thetis/Project Files/Source/Console/frmCFCConfig.cs:109>) and [speech processing](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:28829>).

**Interfaces:** `CommandResult CfcService.SetProfile(CfcProfile profile)` handles `audio.setCfc`; `audio.setSetting` uses the bounded settings descriptors for compression, leveler/ALC, VOX/DEXP and microphone/line processing.

- [ ] Add `CfcBandCountAndSpanMatchLegacy`: assert band choices `[5,10,18]` and source editor minimum span `1000` Hz. Add `SpeechSettingsReachDspWithoutForms` covering enable/reset, frequency/Q/gain and microphone path.
- [ ] Run Task 1's unit commands; confirm new failures.
- [ ] Extract compression/EQ curves, pre/post gain and live-update behavior into the service. Register wide `thetis.cfcEditor`; preserve existing settings keys and profile ownership.
- [ ] Pass curve/serialization/DSP differential tests and E2E graph/numeric edits; verify rejected input leaves backend revision/state coherent. Run the full Release command.
- [ ] Stage this slice and commit `feat: reconstruct CFC and speech processing`.

### Task 3: Establish transmit and daily mode controls

**Files:** Proposed `TransmitService.cs`, `modeControls.ts`, contracts/tests; adapt [MOX transitions](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:29297>), [monitor](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:28975>) and [mode/profile selection](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:8083>).

**Interfaces:** `CommandResult TransmitService.Request(TransmitIntent intent)`; `tx.request` carries `{action:mox|tune|monitor|duplex|drive|ptt,enabled?,drive?,leaseId?}` with action-specific validation. `mode.setSetting` uses backend descriptors for phone/CW/digital/FM fields. Snapshot exposes requested/effective TX, owner, inhibit reason and effective drive limit.

- [ ] Add `BrowserPttLossCannotCancelPhysicalOwner`, `ReconnectNeverReplaysTransmit` and `ModeSwitchKeepsEffectiveTxRules`; assert lease expiry releases browser momentary PTT exactly once and stale-generation requests cannot transmit.
- [ ] Run Task 1's unit commands; confirm new failures.
- [ ] Implement ownership through step 02's dispatcher; preserve physical/CAT arbitration and source-derived hardware/profile limits. Render phone mic/processing, CW pitch/speed/keyer, digital routing and FM deviation/CTCSS/repeater controls to the right below the spectrum; retain DSP/VFO functions on the left. Do not move daily controls to the bottom panel.
- [ ] Pass simulated contention/inhibit tests and both-frontend hardware scenarios using the approved reference fixture; compare waveform/meter traces within step-01 measured tolerances. Run E2E and full Release checks; unsupported hardware cannot count as a pass.
- [ ] Stage this slice and commit `feat: add qualified transmit and mode controls`.

### Task 4: Complete native audio and VAC settings

**Files:** Proposed `AudioRoutingService.cs`, `audioRoutingView.ts`, contracts/tests; adapt [VAC operations](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:30869>), [Setup restoration](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:2230>) and [audio engine](<D:/workspace/Thetis/Project Files/Source/Console/audio.cs:1>).

**Interfaces:** `CommandResult AudioRoutingService.Apply(AudioSettingEdit edit)` handles `audio.setSetting`; snapshots publish host device identities, VAC1/VAC2 routes, rates, channels, IQ and latency/resampling capabilities.

- [ ] Add `MissingNativeDevicePreservesOtherRoutes` and `VacRestoreAppliesAllRoutingFields`; assert explicit device error and unchanged unrelated routes, including cmASIO and VAC2 RX2/split/bypass behavior.
- [ ] Run Task 1's unit commands; confirm new failures.
- [ ] Implement Audio sections and detailed settings editor through backend descriptors, including supported drivers/devices, channel/rate/buffer/IQ and advanced options. Keep gain/MultiRX/VAC operational controls beside their established Console/Operate neighbors.
- [ ] Pass fixture tests, hot-removal/recovery E2E and qualified native driver loopback checks; measure latency/dropouts against the baseline. Run the full Release command.
- [ ] Stage this slice and commit `feat: reconstruct native audio and VAC settings`.

### Task 5: Add optional browser audio

**Files:** Proposed `browserAudio.ts`, contracts/tests; integrate established media transport with [existing TCI streams](<D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:981>) without a new server.

**Interfaces:** `BrowserAudioController.start(receiver: ReceiverId, microphone: boolean): Promise<void>` and `stop(): Promise<void>`; backend advertises supported stream formats/rates/buffering. Lifecycle belongs to the extension model; microphone ownership is tied to Task 3's session lease.

- [ ] Add `DeniedOrRemovedMicrophoneNeverStartsTx`; assert zero TX commands before permission succeeds, tracks close on stop, browser-owned PTT releases on failure and host audio configuration remains equal.
- [ ] Run UI unit/E2E tests and confirm these new cases fail.
- [ ] Implement explicit RX start/stop, user-gesture permission, device selection, bounded queues and visible transport errors. Gate by step 01's qualified origin/browser matrix; distinguish browser devices from Windows host devices.
- [ ] Pass permission/autoplay/device-change/reconnect tests with real media checks; record measured buffering/dropouts and local versus remote results separately. Run the full Release command.
- [ ] Stage this slice and commit `feat: add qualified browser audio sessions`.

### Task 6: Complete profile interoperability and integrated qualification

**Files:** Proposed `TxProfileService.cs`, `txProfileEditor.ts`, `TxProfileTests.cs`; adapt [profile load](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:9286>) and [save/delete](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:9585>).

**Interfaces:** `CommandResult TxProfileService.Execute(TxProfileCommand command)`; `txProfile.edit {action:load|save|saveAs|delete|copy|import|export,name,sourceName?}` retains existing serialization and change-report semantics; file transfers use step 02's host-file abstraction.

- [ ] Add `LegacyProfileRestoresDspWithoutForms`: compare EQ/CFC, filters, processing, routing, drive and mode-group profile state before/after Code-to-Windows restart on copied databases. Add dirty-profile save/replace/delete cancellation cases.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter TxProfile` and UI tests; require new failures.
- [ ] Implement editor/actions and backend transactions, preserving auto-save/recovery and current profile warning/highlight behavior.
- [ ] Pass targeted unit/E2E and full Release checks; attach per-mode/native-driver/browser qualification evidence to every owned ledger row. Fail acceptance for stale TX replay, mismatched DSP/profile state or an advertised unfinished route.
- [ ] Stage this operation and evidence; commit `feat: preserve TX profile interoperability`.
