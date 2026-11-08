# Step 09: Controllers and Peripheral Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct controller configuration, mapping editors, diagnostic tools and contextual UI requests while preserving continuous backend CAT/TCI/MIDI/PTT/Andromeda operation.

**Architecture:** The controller services extracted in step 02 remain authoritative. Browser editors use the shared typed command transport; Windows retains its adapters over the same services. Hardware requests select controls in the chosen frontend without constructing operational WinForms windows in Code mode.

**Tech Stack:** Windows 10/11 x64; CMake/MSVC/Ninja; .NET Framework 4.8-compatible C#; TypeScript browser extension; native Code views and editor tabs.

**Spec:** Read the [authoritative overall view][overall], [source design][design] and [surface inventory][inventory]. This is future implementation work; proposed files and commands below have not been created or executed by this planning operation.

## Global Constraints

- Select one operational frontend before application initialization; switch by restart.
- Preserve native ABI, calling conventions, DSP behavior and .NET Framework 4.8 compatibility.
- Embedded HTTP/WebSocket endpoint remains port 50001; no additional production web server.
- Keep custom frontend source outside both upstream submodules; preserve CMake/CLI staging and existing settings/schema/backup compatibility.
- Stop Thetis before compiling/staging through the established build scripts; pass the full Release pipeline for each code/configuration/asset operation.
- No Visual Studio IDE artifacts or emojis; commit each complete, independently verified operation.

## Review Focus

1. A controller changes state while an editor has unsaved mappings: revisions prevent silent overwrite; normal controller execution continues.
2. A disconnected or busy COM/MIDI device fails to open: report the actual failure and retain the previous valid configuration.
3. Repeated physical popup requests arrive during browser reload: reveal the appropriate selected-frontend control without duplicate workers or hidden forms.
4. An operator types a radio shortcut in a Code text editor: ordinary editing must not tune or key the radio.
5. CAT test input is malformed or lacks its terminator: preserve current parser behavior and execute each explicit submission once.

---

## Ownership, placement and interfaces

Setup navigation owns controller pages. Wide MIDI and Andromeda tables open in native editor tabs; optional `thetis.logs.cat` uses the `thetis-logs` bottom container or an editor tab when width requires it. Reuse the receiverControls meters/bands/modes/filters views and Console's original under-spectrum controls; controller popups must not move these controls into the bottom Panel. Native views retain user movement, hiding and persistence rules from step 01.

**Existing sources:** [Setup serial/Andromeda initialization][setup-init], [keyboard initialization][keyboard], [Andromeda actions/popups][andromeda], [mapping editor][andromeda-editor], [MIDI mapping/feedback][midi-manager], [MIDI editor][midi-editor], [CAT tester][cat-tester]. CAT tester appends `;`, calls the existing parser and clears input. Andromeda's current popup paths include gain, diversity, modes, filters, bands, VFO, band stacks, mode-dependent settings and display settings; preserve their context and receiver selection.

**Proposed files:** create [controller contracts][controller-contracts], [ControllerSettingsService.cs][controller-service], [ControllerUiRequestRouter.cs][request-router], [ControllerSettingsRepository.cs][midi-repository], [controllerContracts.ts][ui-contracts], [controllerEditors.ts][ui-editors], [controllerUiRequests.ts][ui-requests], [unit tests][ui-tests], [browser tests][e2e-tests] and [managed fixtures][managed-tests]. Modify [Thetis.csproj][project] and [Midi2Cat.csproj][midi-project] for explicit inclusion, existing adapters above, [extension manifest][manifest], [shared contracts][contracts] and [radio client][client]. These frontend paths are proposed; use step 01's actual extension registration entry.

Consume `RadioClient.execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>` and `subscribe(listener: (event: RadioStateEvent) => void): Disposable`. Keep schemaVersion 1, monotonic revision, sessionGeneration, receiver IDs `rx1|rx2|sub`, and integer Hz; obtain actual bounds from backend capabilities.

Produce `ControllerSettingsService.GetSnapshot(): ControllerSnapshot` and `Apply(operation: ControllerOperation): ControllerResult`, called by the serialized backend dispatcher. The proposed contract defines typed `serial.configure`, `network.configure`, `midi.saveMapping`, `midi.loadPreset`, `andromeda.save`, `andromeda.reset`, `keyboard.save` and `cat.test` operations. Configuration writes carry expectedRevision. `ControllerUiRequest` carries requestId, receiverId and a typed target from the existing popup families. These feature types extend the shared envelope rather than creating another transport.

### Task 1: Serial/network configuration and CAT tester

**Files:** existing Setup/CAT adapters, proposed controller contracts/service, manifest and controller editors/tests.

- [ ] Write `ControllerConfigurationTests` for four CAT ports, PTT line options, Andromeda selection, network listener settings, no ports, busy port and invalid values. Compare settings and actual listener/device outcomes with copied WinForms fixtures; failed reconfiguration must not masquerade as success. This pins Review Focus 2.
- [ ] Run the managed selector below; confirm tests expose missing browser-service behavior. Implement device enumeration and setting application through existing backend services, preserving enable/disable ordering and CAT/TCI compatibility.
- [ ] Write `CatTesterTests`: submitting `FA` sends `FA;` once; submitting `FA;` adds nothing; response/error equals the current parser; reconnection never resubmits. Pin Review Focus 5 and verify parser definitions against current [CATStructs.xml][cat-structs].
- [ ] Implement `runCatTest(input: string): Promise<CommandResult>` in controller editors through `cat.test`. Show command/response with source-compatible execution semantics and parser errors; do not interpret CAT independently in TypeScript.
- [ ] Pass targeted tests and Release build; commit this configuration/tester operation.

### Task 2: MIDI mapping and feedback editor

**Files:** MIDI repository/project and existing MIDI adapters; proposed controller service/editors/tests.

- [ ] Capture fixtures for per-device mappings, learned min/max, control type, command assignment, button down/up/set-value output strings and preset load/save/organize dialogs. Preserve validation in the [current MIDI editor][midi-editor]; the browser must not require Web MIDI permission to configure Windows devices.
- [ ] Write `MidiMappingTests`: round-trip an existing database, reject invalid output messages, preserve device identity when enumeration order changes, detect revision conflict, and preserve button/slider/LED feedback. Verify the intended behavior on the baseline before assigning any new hot-plug policy. This pins Review Focus 1.
- [ ] Implement repository `ReadMappings(string deviceName): IReadOnlyList<ControllerMapping>` and `SaveMappings(string deviceName, IReadOnlyList<ControllerMapping> mappings): void` over existing database semantics. Keep this dependency inside Midi2Cat so it does not reference the Console assembly.
- [ ] Reconstruct table selection, learn/edit/delete, preset dialogs and diagnostics in the native MIDI editor tab. Reopen after save/reload and compare values with WinForms; test real MIDI input/output and concurrent CAT/TCI state changes.
- [ ] Pass targeted tests and Release build; commit the MIDI operation.

### Task 3: Andromeda editor and frontend UI requests

**Files:** existing Andromeda adapters and proposed request router/contracts/editors/tests.

- [ ] Write `AndromedaEditorTests` covering pushbuttons, encoders, indicators, menu rows, insertion/deletion, normal/G2 resets and Save versus Close. Record existing dataset mutation behavior instead of assuming a universal Cancel transaction.
- [ ] Implement these tables against the existing dataset and enumeration values; preserve menu timeout/sticky/shift and hardware feedback semantics in C#.
- [ ] Implement `ControllerUiRequestRouter.Publish(ControllerUiRequest request): void` and `revealControllerTarget(request: ControllerUiRequest): Promise<void>`. Windows dispatches to existing forms; Code dispatches to the corresponding native view/editor and focuses the requested control. A request reveals UI without reexecuting the radio action.
- [ ] Write `ControllerUiRequestTests`: duplicate a requestId across hide/move/reload, then send distinct gain/band/mode/filter/VFO/display requests. Assert no extra radio command from revealing UI, distinct physical actions remain effective, no operational Form creation and no stale-request replay after sessionGeneration changes. Qualify actual Andromeda feedback and unavailable receivers. This pins Review Focus 3.
- [ ] Pass targeted tests and Release build; commit the Andromeda operation.

### Task 4: Keyboard scope and cumulative controller qualification

**Files:** existing keyboard adapter, manifest, proposed controller editors/tests and step 01 parity ledger.

- [ ] Write `ControllerFocusTests`: radio shortcuts act only in their declared radio context; text boxes, Code editors, dialogs and IME input retain editing; held-key release/focus loss follows the established backend TX ownership rules. This pins Review Focus 4.
- [ ] Implement focus-scoped Code keybindings and webview keyboard messages; preserve the legacy keyboard mapping editor and resolve conflicts explicitly without global key interception.
- [ ] Run equivalent WinForms/Code sequences from copied settings: configure ports, map controls, save/restart into the other UI, exercise getters/setters and LEDs, then hide/reload every editor during concurrent CAT/MIDI/TCI/PTT activity. Compare authoritative revisions and feedback; record hardware/driver/browser qualifications and failures per feature.
- [ ] Run the planned commands; require passing selectors and exit code 0 from Release. Verify existing RX/TX/CWX/recording workflows remain qualified, single-frontend boot holds and resource counts return to baseline. Commit the verified focus/qualification operation and update ledger evidence.

```powershell
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter "Feature=Controllers"
pnpm --dir ui run test -- controllers
pnpm --dir ui run test:e2e -- controllers
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

The test infrastructure is proposed in steps 01–02. Tag managed fixtures `Feature=Controllers`; fail verification if any selector discovers zero tests. Complete only when every active controller/editor row has evidence or an explicit hardware limitation; missing browser editors must never disable supported backend controllers.

[overall]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[design]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[setup-init]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs:448>
[keyboard]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs:990>
[andromeda]: <D:/workspace/Thetis/Project Files/Source/Console/Andromeda/Andromeda.cs:3929>
[andromeda-editor]: <D:/workspace/Thetis/Project Files/Source/Console/Andromeda/AndromedaEditForm.cs:349>
[midi-manager]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/MidiMessageManager.cs:118>
[midi-editor]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.IO/MidiDeviceSetup.cs:176>
[cat-tester]: <D:/workspace/Thetis/Project Files/Source/Console/CAT/CATTester.cs:192>
[cat-structs]: <D:/workspace/Thetis/Project Files/Source/Console/CAT/CATStructs.xml>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[midi-project]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.csproj>
[controller-contracts]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/ControllerContracts.cs>
[controller-service]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/ControllerSettingsService.cs>
[request-router]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/ControllerUiRequestRouter.cs>
[midi-repository]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/ControllerSettingsRepository.cs>
[ui-contracts]: <D:/workspace/Thetis/ui/thetis-extension/src/features/controllers/controllerContracts.ts>
[ui-editors]: <D:/workspace/Thetis/ui/thetis-extension/src/features/controllers/controllerEditors.ts>
[ui-requests]: <D:/workspace/Thetis/ui/thetis-extension/src/features/controllers/controllerUiRequests.ts>
[ui-tests]: <D:/workspace/Thetis/ui/thetis-extension/src/features/controllers/controllers.test.ts>
[e2e-tests]: <D:/workspace/Thetis/ui/thetis-extension/test/e2e/controllers.spec.ts>
[managed-tests]: <D:/workspace/Thetis/tests/Thetis.RadioServices.Tests/ControllersTests.cs>
[manifest]: <D:/workspace/Thetis/ui/thetis-extension/package.json>
[contracts]: <D:/workspace/Thetis/ui/thetis-extension/src/contracts.ts>
[client]: <D:/workspace/Thetis/ui/thetis-extension/src/transport/radioClient.ts>
