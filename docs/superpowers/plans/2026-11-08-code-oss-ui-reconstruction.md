# Thetis Code OSS UI Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. This document is a milestone roadmap, not authorization to execute implementation or an assertion that all later API details are settled.

**Goal:** Reconstruct current reachable WinForms functionality in a Code OSS browser workbench with newly written radio panels, retaining WinForms as an exclusive alternative chosen before boot.

**Architecture:** Preserve native DSP/audio/radio code and extract shared C# application services. Both frontends use those services; the browser reaches them through the existing embedded endpoint on port 50001. Package the standalone Code workbench and a parent-owned browser extension, without a production Node server.

**Tech Stack:** Windows x64, CMake/MSVC/Ninja, existing .NET Framework 4.8-compatible C#, TypeScript browser extension, HTML/CSS and browser graphics/media facilities. The inspected Code checkout identifies pnpm 12.16.0 and Node 24.22.1 for building assets.

**Spec:** [Source analysis and proposed design][design], with the [form and Setup inventory][inventory]. Read both before turning a milestone into executable tasks. The user has chosen the workbench/custom-panel approach and retained WinForms; the detailed design is proposed for review.

## Global constraints

- Select one operational frontend before application initialization; switch by restart.
- Preserve native ABI, calling conventions, DSP behavior and .NET Framework 4.8 compatibility.
- No additional production Node, Python, Kestrel or other web server; embedded HTTP/WebSocket endpoint remains port 50001.
- Do not introduce Visual Studio IDE artifacts. Keep build/debug/staging declarations in the established CMake and CLI configuration.
- Keep custom frontend source outside both upstream submodules. Commit submodule changes separately if any eventually become necessary.
- Stage assets into the configured runtime deployment root using the established staging mechanism.
- Preserve settings/schema/backup compatibility, external command sources and domain-specific comments/licensing.
- No emojis in authored documents, code comments, commit messages or output.
- Every code/configuration/asset operation passes the required full Release build before completion and receives a coherent Git commit.

## Review focus

1. Browser reload or connection loss while transmit, CW queue or recording is active: backend state remains authoritative; no stale transmit action is replayed.
2. Profiles and hardware-specific settings loaded without their old forms: restored values must actually reach DSP/hardware, not silently revert to defaults.
3. State changes from CAT/MIDI/physical controls while a panel is open or reconnecting: every panel converges on the backend state without feedback loops.
4. Code webview service-worker/origin loading: loopback success must not be presented as LAN/remote-browser compatibility.
5. Timing and lifecycle: asset loads, subscriptions and panel recreation must not create duplicate workers, leak clients, block audio callbacks or terminate backend services unexpectedly.

Each item has an owning test/check below. Qualification must include the applicable hardware, firmware, audio driver and browser combinations; unsupported combinations remain explicit.

## How to use the roadmap

The twelve milestones below include the inventory milestone. Each is a release/evidence boundary and contains multiple small operations. Do not turn an entire large form family into one commit. At the start of each milestone, write its small executable plan with exact DTOs, tests and files, based on the interfaces already accepted in earlier milestones. This avoids inventing hundreds of unverified handler-level tasks before the backend contract exists.

Proposed new source boundaries are `ui/code-oss-host/` for the embedder, `ui/thetis-extension/` for the browser extension and panels, and focused hosting/application-service folders within the existing managed project. These locations are proposals, not existing modules. Initial extraction stays in the current project. Existing [project declarations][project], [build presets][presets], [CMake staging][cmake] and [build script][build] own integration.

The form-editor order differs from backend-service extraction order. EQ, transverter, CW, meter and PureSignal state currently participate in startup; their required state/lifecycle must be made independent in milestone 2 even though their full browser editors are delivered later.

## Milestone 0: Establish the parity baseline

**Sources:** [Inventory][inventory], [Console][console], [Setup][setup], [manual][manual], [network guide][network-manual], [CAT reference][cat-manual].

**Produces:** A versioned behavior ledger and reference scenarios tied to the current checkout.

- [x] Identify compile-listed form/UserControl declarations, Setup page candidates, major startup couplings and relevant manual sections.
- [ ] Expand every reachable UI surface into behavior rows: ID, source handler, control/menu/shortcut, capability condition, initial state/action/result, units/ranges, persistence, external command equivalent and evidence.
- [ ] Resolve reachability of dormant/diagnostic forms and differences between the 2020 manual and current source. Keep explicit exclusions with reasons.
- [ ] Capture representative Windows-mode configurations and reference traces for RX1, RX2/subreceiver, split/CTUN, all operating mode groups, profiles, audio, hardware selection and error paths. Copy test configurations rather than editing the operator's live database.
- [ ] Record a hardware/browser matrix, including P1/P2, receive-only behavior, one/dual ADC, selected ASIO/VAC paths and local versus remote browser use.
- [ ] Review and commit the baseline as its own operation.

**Acceptance:** Every form/page candidate has an owner and reachability classification; no claim that a control count proves behavior coverage. Numerical/timing tolerances for later comparisons are measured and recorded before accepting those replacements.

## Milestone 1: Prove the packaged browser workbench

**First new UI:** A diagnostic panel with synthetic data, not an operational radio frontend.

**Sources to change:** [HTTP response and static lookup][http], [upgrade handling][ws], [CMake][cmake]; parent-owned host/extension modules. **Reference:** [Code web packaging][code-build], [web embedder API][web-api], [webview bootstrap][webview].

**Consumes:** Pinned Code source and existing embedded endpoint. **Produces:** A repeatable staged shell/extension package and verified browser-origin arrangement.

- [ ] Check the pinned upstream build prerequisites and create a clean packaging recipe using its declared pnpm version. The inspected `vscode-web` targets are starting points; their existence alone does not establish a complete clean-build recipe.
- [ ] Package a standalone host page and browser extension; use the embedder's built-in-extension URI option and no Code remote authority.
- [ ] Add required static resource types and early HTTP/upgrade routing. Keep resource policy and protocol dispatch explicit; preserve TCI behavior.
- [ ] Configure locally packaged webview assets with the required hashed-hostname origin arrangement. Test the candidate wildcard-localhost approach without weakening origin validation.
- [ ] Verify extension activation, webview script execution, service-worker control, an `asWebviewUri` resource, panel-to-extension-to-C# diagnostic round-trip, cold reload and panel recreation.
- [ ] Repeat a cold load with external network access blocked, using a clean browser profile. Required CDN/marketplace access is a failure.
- [ ] Measure client/thread/resource cleanup while loading the asset graph, and verify ordinary TCI still behaves correctly.
- [ ] Define and test the secure LAN deployment separately if remote browsers are in scope: trusted origin, wildcard webview hostnames/certificates, HTTPS/WSS and coexistence with existing plain TCI clients on port 50001.
- [ ] Pass the full Release build and targeted hosting checks; commit the working proof with its actual limitations.

**Acceptance:** A working webview/worker/extension on the actual embedded server, with no secondary production server. The ledger records loopback and remote results separately. If origin/transport hosting fails, resolve it before implementing many radio panels.

## Milestone 2: Extract startup, settings and command ownership

**Sources to change:** [Main/Console][startup], [InitConsole][init], [Setup][setup], [NetworkIO][network], [Audio][audio], [TCI][tci], [CAT dispatcher][dispatcher] and lifecycle-owning forms/services.

**Consumes:** Behavior baseline and proven host. **Produces:** Shared state/command/lifecycle interfaces and an exclusive UI-mode bootstrap.

- [ ] Map eager construction and settings-application order, including EQ, XVTR, CWX, PureSignal, meters, memory scheduling, serial/MIDI and hardware callbacks.
- [ ] Extract configuration loading/application from control instantiation. Preserve existing setting keys, profile semantics, backups and forced hardware/DSP application; use fixture round-trips to compare resulting state.
- [ ] Introduce a serialized application-command dispatcher and typed snapshot/notification contract. Add capability flags and explicit errors. Migrate Windows mode to it incrementally, comparing command outcomes to the recorded baseline.
- [ ] Audit current TCI and CAT coverage per feature. Retain existing protocols and add an explicitly routed, versioned application protocol for missing lifecycle/settings operations.
- [ ] Extract every behavior-owning component required to restore the tested startup configuration without constructing forms. Optional unsupported services must be capability-gated, never silently replaced by default values.
- [ ] Implement proposed `-ui:windows` / `-ui:code` resolution before Console/splash/rendering creation, with one backend process. In true Code mode, verify no hidden operational form tree or WinForms-rendering dependency is created.
- [ ] Test corrupted/old settings, absent devices, startup/shutdown ordering, mode restart, external command dispatch and repeated startup. Confirm current Windows mode still works.
- [ ] Pass the full Release build and targeted state/lifecycle checks; commit each independent extracted service or bootstrap operation.

**Acceptance:** Code-mode backend can load the supported reference configuration and reach a ready state independently of WinForms. A hidden Console is not acceptance evidence. This may be the largest foundational milestone; extracting only a frequency property does not complete it.

## Milestone 3: Reconstruct essential Setup and an RX1 Console

**First operating UI:** Network/radio selection and a usable single-receiver Console.

**Old surfaces:** Essential [Setup][setup] pages, [ucRadioList][radio-list], [frmAddCustomRadio][custom-radio], [frmIPv4Picker][ipv4], and [Console][console].

**Consumes:** Ready/configuration/capability and RX1 command contracts. **Produces:** Qualified first live-radio vertical slice.

- [ ] Implement backend-led discovery, NIC selection, model/protocol and radio list management, including first-found and custom-radio semantics, directed address/port, timeout/error state and relevant firmware restrictions.
- [ ] Reconstruct power/connect, readiness/status, RX1 VFO entry/step/band/mode/filter, AF/AGC/attenuation/squelch/mute and basic DSP selection.
- [ ] Add calibrated panadapter/waterfall, click tuning and basic signal meter. Use recorded display data to check axis/units/overlay mapping.
- [ ] Include essential ADC/audio routing and restored configuration effects. Make unqualified functions visibly unavailable rather than apparently operational.
- [ ] Compare Windows and Code sequences for connect/disconnect, no radio, invalid selection, restored frequency and external CAT/TCI changes. Reconnect must fetch authoritative state without repeated commands.
- [ ] Verify settings survive a restart into the other UI mode. Pass the full Release build and feature checks; commit coherent vertical slices.

**Acceptance:** A user can select a supported radio, start reception, tune and hear audio with matching state and persisted configuration. No transmit completeness or full Console parity is claimed yet.

## Milestone 4: Complete everyday receiving and frequency editors

**Old surfaces:** Remaining receive-related Console controls; [FilterForm][filter], [frmBandStack2][bandstack], [MemoryForm][memory], [quick-recall popup][quickrecall], [notch popup][notch] and bandwidth/VAR controls.

**Consumes:** Tuning/receiver state from milestone 3. **Produces:** Dual-RX and memory/filter operations with stable reusable commands.

- [ ] Add RX2 and subreceiver routing, independent gain/pan/DSP state, VFO A/B copying/swapping, split selection state, CTUN, locks, RIT/XIT, zero-beat and IF-to-VFO behavior. Qualify their TX consequences before exposing transmit in milestone 5.
- [ ] Reconstruct filter preset editing and VAR edges/width with mode-specific CW/digital semantics; integrate notch editing and display interaction.
- [ ] Reconstruct band-stack CRUD, selection, locking, filters, centre frequency, CTUN, zoom, update-on-leave and persistence through the existing model.
- [ ] Reconstruct memory CRUD, copy/select/recall and quick recall with complete state: frequency/mode, filters, AGC, step, split/TX-frequency data and FM fields. Defer scheduled execution explicitly to milestone 6.
- [ ] Reconstruct [TCI/SWL spots][spots] and associated Setup options: ingestion/removal, visibility, metadata and lifetime/expiry, receiver-specific highlighting and click-to-tune/mode changes, callsign lookup actions and outbound spot-click notifications. Test both receivers, expired/removed spots and external spot updates. Milestone 8 completes all display/appearance variants.
- [ ] Exercise mouse-wheel/digit tuning, context menus and keyboard commands, including focus conflicts with normal Code editing shortcuts.
- [ ] Compare Windows/Code sequences for both receivers and memory round-trips; verify all panels follow external command changes and layout recreation does not reset radio state.
- [ ] Pass the full Release build and targeted checks; commit filter, band-stack and memory operations independently.

**Acceptance:** Everyday receiving workflows and frequency editors match the qualified baseline. Do not substitute the unfinished frmFilterManager for the active FilterForm.

## Milestone 5: Audio, transmit and mode-dependent controls

**Old surfaces:** [EQForm][eq], [parametric EQ control][parametric], [CFC configuration][cfc], Console phone/CW/digital/FM sections, Setup Audio/DSP/Transmit pages and TX profiles.

**Consumes:** Shared settings, receiver/routing and transmit-owner state. **Produces:** Qualified transmit/audio workflows and profile interoperability.

- [ ] Reconstruct RX/TX graphic EQ and current parametric modes, frequencies/Q/gains, enable/reset, backend channel routing and profile serialization.
- [ ] Reconstruct CFC, compression, leveler/ALC, VOX/DEXP, microphone/line routing, RX/TX filters and profile load/save/delete/copy semantics.
- [ ] Implement monitor, MOX, tune, duplex, drive/limits, split/TX receiver, FM deviation/CTCSS/repeater controls and basic CW pitch/speed/keyer configuration using backend rules.
- [ ] Reconstruct VAC1/VAC2, cmASIO/audio-device, rate/channel/IQ and advanced settings. Keep local backend audio separate from browser RX/microphone streaming.
- [ ] Qualify browser media permission, start/stop, buffering and device changes where browser audio is supported. Preserve Windows host-driver operations as backend actions.
- [ ] Test TX ownership and loss of the UI connection: no replayed PTT, duplicate release or stuck state caused by panel focus/reload. Compare waveform/meter behavior and profile outcomes using appropriate fixtures and hardware.
- [ ] Pass the full Release build and targeted checks; commit independently reviewable audio/profile/mode slices.

**Acceptance:** Qualified phone, digital, FM and basic CW operating paths, matching TX profile state and limits. PureSignal/diversity specialist qualification and queued CW messages remain later milestones.

## Milestone 6: CW messages, recording and scheduled memories

**Old surfaces:** [CWX][cwx], [cwedit][cwedit], memory scheduling, current recording/playback controls in [MeterManager][meters] and Setup Recording.

**Consumes:** TX, keyer, audio routing, file-operation and memory contracts. **Produces:** Background tasks independent of panel lifetime.

- [ ] Reconstruct CW message editing, macros, keyboard entry, queue status/stop and CAT-fed CW. Keep real-time keying, queues and timing in C#.
- [ ] Reconstruct current voice/wave record/play, relevant RX/TX or pre/post-DSP choices, paths/formats and file operations. Reconcile old manual Wave-window descriptions with the current reachable UI.
- [ ] Move scheduler execution out of MemoryForm before exposing browser scheduling; preserve time/date/recurrence/duration, retune/power behavior and recording completion behavior that is actually functional in the baseline.
- [ ] Distinguish browser downloads/uploads from files on the Windows engine host. A remote browser filesystem is not the backend filesystem.
- [ ] Test panel closure/reload during CW, recording and a scheduled event; verify exactly one active backend job, accurate state on reopen, cancellation and persistence. Test CAT CW alongside the new UI.
- [ ] Pass the full Release build and targeted checks; commit CW, recording and scheduling separately.

**Acceptance:** Matching queue/task results and persistent state without relying on browser timer precision or window visibility.

## Milestone 7: Advanced RF and calibration forms

**Order within the family:** [PSForm][ps] then [AmpView][amp]; [DiversityForm][diversity]; [XVTRForm][xvtr]; related PA/antenna/ADC/device-specific settings and [RF paths][paths].

**Consumes:** Qualified TX/dual-RX operation, display telemetry, file operations and capability model. **Produces:** Advanced hardware workflows with baseline behavior.

- [ ] Reconstruct PureSignal normal/advanced controls, control-loop status, correction-file save/restore, two-tone/single calibration and attenuation/routing effects; follow with AmpView plots.
- [ ] Reconstruct diversity gain/phase/steering/calibration, model restrictions and coupled receiver/DDC/Setup changes.
- [ ] Reconstruct transverter tables, translated tuning, band buttons/names, RX-only/PA choices and per-band power/tune behavior; verify frequency recalculation at boundaries.
- [ ] Complete PA gain/watt-meter/level calibration, antennas/filters/relays/ATU and hardware-specific options. Read capability and firmware constraints from the backend.
- [ ] Reconstruct the RF-path view from authoritative route state rather than assuming a fixed radio topology.
- [ ] Test state restoration when an editor closes and qualified hardware/model/firmware transitions; compare calibration commands and outcomes on the relevant equipment.
- [ ] Pass the full Release build and feature checks; commit each form family/calibration operation independently.

**Acceptance:** Each advanced feature has hardware evidence or remains explicitly unqualified. Plot similarity alone does not establish matching calibration behavior.

## Milestone 8: Full displays, meter containers and appearance

**Old surfaces:** [Display pipeline][display], [frmMeterDisplay][meter-form], [ucMeter][ucmeter], Setup Meters/Gadgets, appearance/gradients, [macro-button configuration][macro] and gadget-property controls.

**Consumes:** Qualified operating commands, telemetry and recording. **Produces:** Full display/gadget coverage and persistent Code layouts.

- [ ] Complete all current display modes, including spectrum, scope/scope2, phase/phase2, histogram, panafall/panascope/spectrascope and off, plus averaging/peak/zoom/pan/overlays and receiver/transmit interactions.
- [ ] Reconstruct all required RX/TX meter readings, calibrated ranges/units, configurable containers and layout persistence.
- [ ] Reconstruct gadget behavior: VFO/dial/filter displays, band/mode/filter/antenna/tune-step buttons, macros/variables, clocks, LEDs, history, rotator/data outputs, web-image panels and record/play controls.
- [ ] Reconstruct appearance settings, color/gradient controls, collapsed/touch layouts and the agreed equivalent of skin behavior. Document any intentional native-window/bitmap-skin differences.
- [ ] Test all gadget commands against the same service APIs as Console, and verify opening/closing/reparenting/reloading panels cleans up subscriptions.
- [ ] Measure graphics/audio behavior against baseline tolerances under simultaneous stream and control load, using bounded data queues.
- [ ] Pass the full Release build and targeted visual/behavior checks; commit by display mode or gadget family.

**Acceptance:** Every active meter/gadget and display behavior is represented in the ledger. Basic S-meter/forward-power support from early milestones does not complete this family.

## Milestone 9: Peripheral editors and workbench interaction parity

**Old surfaces:** Setup Serial/Network/MIDI CAT/Keyboard/Andromeda, [MIDI setup and dialogs][midi-project], [Andromeda editor/popups][andromeda], [CAT tester][cat-tester], relevant serial/variable pickers.

**Consumes:** Shared commands and new-panel activation IDs. **Produces:** Complete configuration and UI requests for existing external controllers.

- [ ] Keep CAT/TCI/MIDI/PTT service execution working throughout earlier milestones; now reconstruct their full configuration/testing editors and feedback mapping.
- [ ] Reconstruct Andromeda button/encoder/indicator/menu editing and gain/band/mode/filter/display/VFO/mode-dependent popups using reusable radio panels.
- [ ] Replace external-controller requests to show WinForms windows with UI-neutral actions dispatched to the selected frontend.
- [ ] Reconstruct keyboard mappings, shortcuts, touch/wheel behavior and focus rules. Explicitly test typing/editing in Code without accidental radio actions.
- [ ] Verify physical-controller feedback and CAT getters/setters after UI, hardware and protocol changes; reconcile historical CAT reference examples against current code.
- [ ] Pass the full Release build and targeted peripheral checks; commit by controller/editor family.

**Acceptance:** External input and its editors reach the same state as Windows mode, and no controller action opens an operational WinForms window in Code mode.

## Milestone 10: Specialist, maintenance and remaining Setup surfaces

**Old surfaces:** [RAForm][ra], [wideband][wideband], [Finder][finder], [DB manager][db], [bandwidth monitor][bandwidth], sequence/general/progress logs, About/release notes and remaining Startup/Options/Tests/maintenance settings.

**Consumes:** Stable lifecycle, file operations, telemetry and qualified configuration services. **Produces:** Closure of the long-tail active-feature ledger.

- [ ] Reconstruct Radio Astronomy acquisition/integration/plot axes and host CSV file operations; reconstruct wideband's separate packet/acquisition route and restoration behavior.
- [ ] Reconstruct bandwidth/sequence diagnostics and test/signal-generation surfaces with their hardware restrictions.
- [ ] Reconstruct DB selection/import/export/backup/reset and restart semantics, verifying compatibility with Windows mode on copied test databases.
- [ ] Reconstruct Finder/help navigation, remaining informational panels and progress/error dialogs as Code actions/views/notifications with equivalent useful information.
- [ ] Close every remaining active Setup-page row, including backend machine-admin actions with existing privilege/error handling. Treat dormant diagnostic-only forms separately.
- [ ] Verify specialist tasks continue or stop according to their baseline when panels close, and that mode restarts preserve the expected configuration.
- [ ] Pass the full Release build and targeted checks; commit each coherent specialist or maintenance operation.

**Acceptance:** No active workflow remains unassigned. The user does not need to switch modes to configure an otherwise advertised Code-mode feature.

## Milestone 11: Qualify and release functional parity

**Consumes:** All implemented ledger rows and milestone evidence. **Produces:** An auditable parity report, build package and known-limitations list.

- [ ] Execute differential scenarios in separate Windows and Code runs from the same copied baseline configurations. Cover every active feature row and capability condition in the qualified matrix.
- [ ] Exercise offline cold load, browser restart/reload, transport loss/reconnect, changing devices, radio/network failure, invalid edits and corrupted settings.
- [ ] Exercise concurrent CAT/MIDI/TCI and streaming loads, verifying state consistency and no audio-callback blocking, duplicate workers or growing resource counts.
- [ ] Confirm all qualified native audio, browser media, display, TX/calibration, scheduled task and persistence checks against recorded numerical/timing criteria.
- [ ] Verify mode selection precedes UI construction, only one operational frontend exists, runtime staging is complete and no production Node process is required.
- [ ] Run the required full Release pipeline and final targeted qualification checks; commit the release operation and publish a parity matrix distinguishing passed, unsupported-by-hardware, intentionally excluded and unfinished behavior.

**Acceptance:** Zero unfinished active features within the declared qualification scope. Keep WinForms as the requested selectable frontend. Removing it is a separate future decision, not this roadmap's final step.

## First implementation handoff

Implement milestone 1 first after review of this proposal. Its hard outcome is a scripted Code webview on Thetis's own endpoint. Milestone 0's interaction ledger continues alongside that proof; do not claim the current source-surface inventory has already completed it. Next, detail milestone 2 with exact service interfaces and reference-state tests. The first real operating UI is milestone 3's Setup/network plus RX1 Console.

This document changes no application source, build configuration or assets. The analysis operation validates document references and source evidence, then commits only its own documents; it leaves existing staged submodule additions and unrelated user changes intact.

[design]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[presets]: <D:/workspace/Thetis/CMakePresets.json>
[cmake]: <D:/workspace/Thetis/CMakeLists.txt>
[build]: <D:/workspace/Thetis/build.ps1>
[manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis manual_1.1.pdf>
[network-manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis Network Settings_0.2.pdf>
[cat-manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis-CAT-Command-Reference-Guide-V3.pdf>
[console]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs>
[setup]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs>
[startup]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1404>
[init]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1704>
[http]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:1882>
[ws]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:2982>
[tci]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs>
[code-build]: <D:/workspace/Thetis/submodules/vscode/build/gulpfile.vscode.web.ts:95>
[web-api]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/web.api.ts:249>
[webview]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/contrib/webview/browser/pre/index.html:350>
[network]: <D:/workspace/Thetis/Project Files/Source/Console/HPSDR/NetworkIO.cs:27>
[audio]: <D:/workspace/Thetis/Project Files/Source/Console/audio.cs>
[dispatcher]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:15592>
[radio-list]: <D:/workspace/Thetis/Project Files/Source/Console/ucRadioList.cs:53>
[custom-radio]: <D:/workspace/Thetis/Project Files/Source/Console/frmAddCustomRadio.cs:54>
[ipv4]: <D:/workspace/Thetis/Project Files/Source/Console/frmIPv4Picker.cs:49>
[filter]: <D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs:52>
[bandstack]: <D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.cs:56>
[memory]: <D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:45>
[quickrecall]: <D:/workspace/Thetis/Project Files/Source/Console/frmQuickRecallPopupList.cs:47>
[notch]: <D:/workspace/Thetis/Project Files/Source/Console/frmNotchPopup.cs:48>
[spots]: <D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs:474>
[eq]: <D:/workspace/Thetis/Project Files/Source/Console/eqform.cs:54>
[parametric]: <D:/workspace/Thetis/Project Files/Source/Console/ucParametricEq.cs:52>
[cfc]: <D:/workspace/Thetis/Project Files/Source/Console/frmCFCConfig.cs:53>
[cwx]: <D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:69>
[cwedit]: <D:/workspace/Thetis/Project Files/Source/Console/cwedit.cs:50>
[meters]: <D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs>
[ps]: <D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:57>
[amp]: <D:/workspace/Thetis/Project Files/Source/Console/AmpView.cs:58>
[diversity]: <D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs:59>
[xvtr]: <D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs:47>
[paths]: <D:/workspace/Thetis/Project Files/Source/Console/Path_Illustrator.cs:12>
[display]: <D:/workspace/Thetis/Project Files/Source/Console/display.cs>
[meter-form]: <D:/workspace/Thetis/Project Files/Source/Console/frmMeterDisplay.cs:49>
[ucmeter]: <D:/workspace/Thetis/Project Files/Source/Console/ucMeter.cs:60>
[macro]: <D:/workspace/Thetis/Project Files/Source/Console/frmMacroButtonConfig.cs:48>
[midi-project]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.csproj>
[andromeda]: <D:/workspace/Thetis/Project Files/Source/Console/Andromeda/Andromeda.cs>
[cat-tester]: <D:/workspace/Thetis/Project Files/Source/Console/CAT/CATTester.cs:13>
[ra]: <D:/workspace/Thetis/Project Files/Source/Console/RAForm.cs:55>
[wideband]: <D:/workspace/Thetis/Project Files/Source/Console/wideband.cs:14>
[finder]: <D:/workspace/Thetis/Project Files/Source/Console/frmFinder.cs:55>
[db]: <D:/workspace/Thetis/Project Files/Source/Console/frmDBMan.cs:48>
[bandwidth]: <D:/workspace/Thetis/Project Files/Source/Console/frmBandwidth.cs:46>
