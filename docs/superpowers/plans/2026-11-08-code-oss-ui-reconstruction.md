# Thetis Code OSS UI: overall view and ten-step baseline

Status, 2026-11-09: Stage 1 foundation implementation is present and undergoing packaged-runtime qualification. Trusted cross-machine LAN acceptance remains open. Stages 2-10 remain future implementation. There are **exactly ten separate implementation plans**; qualification belongs to every step.

The [Stage 1 record][step01], [runtime instructions](D:/workspace/Thetis/ui/README.md) and [qualification evidence](D:/workspace/Thetis/docs/ui-parity/qualification.md) distinguish implemented behavior, measured local results and unqualified deployment/hardware cases. The normal browser package loads the maintained Thetis extension. The old WebUI is removed from CMake deployment; the root entry opens Code. WinForms and legacy TCI remain.

## Intended result

Retain WinForms and select one operational frontend before boot. Build the browser UI as a parent-owned Code OSS extension and embedding host, using shared C# application services and existing native DSP/audio/radio libraries. Routine feature development leaves upstream Code source untouched and does not embed TOTW as the replacement interface.

Preserve the original operating relationships: power/gains left, VFOs above the central spectrum, meter/band/mode/filter controls right, tuning/DSP and mode-dependent controls below the spectrum, and RX2 along the bottom. Functional parity includes validation, settings, hardware effects, external controllers, persistence, errors and background jobs. Legacy skin compatibility is explicit work, with reports for unsupported properties rather than an untested pixel-identical rendering promise.

The user's Code screenshot establishes the navigation model: an Activity Bar container contains several native views like Open Editors, Outline and Timeline. Each independently moveable/hideable Thetis section must be its own contributed view. Users choose which optional containers/sections to expose. A giant HTML accordion does not provide equivalent workbench movement and visibility.

## Actual pictures and source evidence

Actual WinForms screenshots were inspected in the [manual][manual], pages 10-11, 36-53, 54-67, 94, 96, 100-101 and 106, and the newer [network guide][network], pages 1-5. The pictures are historical; current [designer][designer], [resources][resources] and [ResizeConsole][resize] resolve later additions, group coordinates and conditional layout. No Thetis window was running during planning. This evidence is rendered real manual screenshots plus current source, not a claimed live runtime screenshot or a fabricated application rendering.

| Original group | Current source evidence | Target relationship |
|---|---|---|
| Power/options at left x=5 | [Power/options members][power] | Operate / Power & Transmit in Primary Side Bar |
| AF/RF/AGC/drive/attenuation left column | [Gain members][gain] | Operate / Audio & RF Gain, below power |
| VFO A/B top, sync/recall/step between | [VFO A][vfo-a], [VFO B][vfo-b], [middle controls][vfo-middle] | Console editor header |
| Spectrum central, baseline 710 by 300 | [Resource position][spectrum] | Largest central Console area below VFOs |
| Meter, Band, Mode, Filter at right | [Meter][meter], [Band][band], [Mode][mode], [Filter][filter] | Secondary Side Bar in that order |
| Tuning/DSP/display/mixer below spectrum | [Tuning][tuning], [DSP][dsp], [Mixer][mixer] | Lower Console operating deck |
| Phone/CW/digital/FM share one lower slot | [Position][mode-slot], [mode selection][mode-selection] | One lower Console region changes with authoritative mode |
| RX2 controls run along bottom | [RX2][rx2], [RX2 meter][rx2-meter] | Bottom Console RX2 strip; RX2 spectrum stays central |

Coordinates explain proximity, not browser pixel specifications. Existing WinForms itself resizes controls.

## Expanded layout

```text
 Code menu / title / command centre
 +------+----------------------+--------------------------------------+----------------------+
 | Act. | PRIMARY SIDE BAR     | EDITOR AREA                          | SECONDARY SIDE BAR   |
 | Bar  | Operate              | Native tabs: Console | EQ | Setup   | Receiver Controls    |
 |      |                      |                                      |                      |
 | O    | Power & Transmit     | VFO A | Sync / Step / Recall | VFO B | Meters               |
 | M    |                      | Backend / RX-TX identity / Stop       |                      |
 | A    | Audio & RF Gain      |                                      | Bands                |
 | R    |                      | RX1 spectrum / waterfall             |                      |
 | D    | Device / Readiness   | RX2 spectrum / waterfall if enabled  | Modes                |
 | S    | (initially collapsed)|                                      |                      |
 | G    |                      | Pan / Zoom / Display                 | Filters / VAR edges  |
 |      |                      | Tuning + DSP + Mixer | Mode controls |                      |
 |      |                      | RX2 operating strip                  | Optional RF sections |
 +------+----------------------+--------------------------------------+----------------------+
 | BOTTOM PANEL (optional): CWX | Recordings | Schedules | Logs | CAT / Sequence            |
 +---------------------------------------------------------------------------------------+
 | STATUS BAR: engine / device / RX-TX / audio / sequence and fault summary                 |
 +---------------------------------------------------------------------------------------+
```

The letters label Operate, Memories, Audio, RF, Display & Skins, Setup and Diagnostics in this drawing; actual icon artwork is not specified. This is a spatial diagram, not a screenshot. Everyday tuning/DSP and mode controls stay inside Console below its plots, so selecting logs in the bottom Panel cannot hide them. Auxiliary editors use real Code tabs/split groups and preferably open beside Console when space permits.

An open Console keeps backend/TX identity and stop/abort access visible when side regions are hidden. Named commands reveal hidden controls. Closing/hiding Console or another view never powers down the engine or implicitly cancels a backend job.

## Containers, sections and initial state

Stable IDs below are proposed extension identities. Only one container is active in a given region at a time; Primary and Secondary can be visible together. A navigation container is not a backend lifetime.

| Container / region | Native sections or navigation | First-open state |
|---|---|---|
| `thetis-operation` / Activity Bar, Primary | `thetis.operation.power`, `thetis.operation.gain`, `thetis.operation.device` | Default primary; power/gain expanded, device collapsed |
| `thetis-memories` / Activity Bar, Primary | Band Stack, Memory Groups, Quick Recall | Optional entry; compact lists open full editors or anchored recall |
| `thetis-audio` / Activity Bar, Primary | Routes, TX Profiles, EQ/CFC, recording links | Optional; large editing remains central |
| `thetis-rf` / Activity Bar, Primary | PureSignal, Diversity, XVTR, Calibration, RF Path | Optional, capability-aware |
| `thetis-display` / Activity Bar, Primary | Display Modes, Meters/Gadgets, Skins, Layout Presets | Optional; foundation provides basic skin/layout access |
| `thetis-setup` / Activity Bar, Primary | Searchable General/HW, Audio, Display, DSP, Transmit, PA, Appearance, Keyboard, Controllers, Tests | Optional; opens exact page in wide Setup editor |
| `thetis-diagnostics` / Activity Bar, Primary | Connection, Bandwidth, Sequence, CAT/TCI, Logs, Finder/maintenance | Optional; faults offer focused actions |
| `thetis-receiver-controls` / Secondary | `thetis.receiver.meters`, `thetis.receiver.bands`, `thetis.receiver.modes`, `thetis.receiver.filters`, `thetis.receiver.pureSignal`, `thetis.receiver.diversity` | Default right; first four as qualified, RF extras initially hidden |
| `thetis-tasks` / bottom Panel | `thetis.tasks.cwx`, `thetis.tasks.recordings`, `thetis.tasks.schedules` | Region closed until requested |
| `thetis-logs` / bottom Panel | `thetis.logs.engine`, `thetis.logs.sequence`, `thetis.logs.cat` | Region closed until requested |

Right controls show an explicit RX1/RX2 target. Changing that presentation selection does not enable/retune a receiver. Commands carry an explicit target. RX2 retains its own bottom operating summary. Capability contexts, user visibility and collapse state are different concepts.

The pinned [contribution schema][views] supports activitybar, secondarySidebar and panel containers directly. Container IDs use alphanumeric/underscore/hyphen characters, so the container names above are hyphenated; dotted view IDs are separate identities. Each view is registered independently. Preserve native exceptions: a single remaining visible view may merge its header with the container title and expand; hiding the last view requires hiding the container/region. Do not promise independent headers in that native single-view case.

[defaultLayout][layout-api] supplies first-open editors/grid and view IDs, not arbitrary sidebar dimensions or a full collapse map. [Listed views are expanded][layout-restore], so omit initially collapsed views from that list. Leave force off normally. Keep stable workspace/profile identity and use native [view persistence][view-state], without editing internal storage keys.

`thetis.layout.restoreDefault` restores presentation through supported actions and reopens Console. Native Reset View Locations is narrower; document unsupported factory width/collapse reset rather than patching storage. Neither action changes frequency, radio settings, skin selection or running jobs.

## Original auxiliary windows to workbench surfaces

| Original surface | New destination and semantics |
|---|---|
| Setup | Wide modeless editor; Primary Setup navigation opens exact pages; retain individual live-apply/Apply/Cancel/restart rules |
| MemoryForm, full BandStack and active FilterForm | Wide editors; compact Band Stack remains an optional Memories view and anchored popup |
| EQForm, parametric EQ and CFC | Wide editors/splits preserving RX/TX relationships |
| CWX and cwedit | Bottom CWX task view; scoped Morse-definition dialog |
| PureSignal/AmpView | Optional compact right section, advanced editor and split plot |
| Diversity | Optional narrow right section preserving gain/phase/steering; larger plot editor on demand |
| XVTR, PA calibration, RF Path Illustrator | Wide editors reached through RF/Setup |
| Meters/gadgets | Basic right meter view plus optional instruments; full gadget configuration editor |
| Wideband/Radio Astronomy | Separate plot editors and acquisition state |
| MIDI/Andromeda | Wide mapping editors; runtime popup requests use selected frontend |
| CAT tester, bandwidth/sequence/general logs | Bottom diagnostics; larger editor for wide data |
| Finder | Primary results/navigation opening precise settings pages |
| DB manager, macro configuration, About, pickers, CW definitions | Preserve deliberate scoped blocking semantics; native quick input only for simple selections |
| Notch, Quick Recall, information and Andromeda popups | Anchored keyboard-accessible contextual controls, not an icon per popup |

[Setup uses Show()][setup-show], while [DB manager][db-dialog], [macro configuration][macro-dialog] and [CW definitions][cw-dialog] use ShowDialog. [BandStack2][band-popup] supports persistent and popup modes. Size alone does not decide modality. The [inventory][inventory] assigns every discovered form/control/page to an owner. Dormant rxa and unfinished/apparently unused frmFilterManager remain triaged; active FilterForm remains the preset editor.

## Layout variants, skins and accessibility

Expanded follows the diagram. Classic/Collapsed maximizes plots and retains commands for hidden controls. Andromeda/Touch reuses actions in larger-target Console/popup layouts. Persist user relocation, closure and restart state. Narrow layouts stack VFOs/decks and permit explicit Compact selection; do not move user views automatically on each resize.

Qualify 1920x1080/1366x768 Expanded, 1024x768 Compact, intended touch size and 100/125/150/200% scaling/zoom. Preserve readable numeric labels and plots; record unsupported arrangements. VFO entry, CW typing and ordinary Code editors need different focus scopes. Sidebar scrolling must not change gain. RX/TX, stale/fault and unavailable states need text as well as color; plots need numeric alternatives.

Step 01 creates proposed `src/theme/tokens.ts` and `src/theme/radioTheme.ts`; Step 03 uses them for real controls. Step 08 completes XML/PNG import, eight image states, meter imagery and catalog/preview/install/select/remove. Thetis styles are panel-scoped. Workbench theme and radio skin remain separate choices, optionally following each other. Host assets are served through the embedded endpoint, not remote browser file paths.

## Shared implementation boundaries

Proposed roots: `ui/code-oss-host/`, `ui/thetis-extension/`, and focused RadioServices/hosting folders inside the current managed project. Preserve net48, explicit compile entries, native ABI and existing CMake/MSVC/Ninja/.NET CLI staging. Pin/qualify Code updates, build Code separately from normal panel changes, and leave Code remoteAuthority unset.

Step 02 defines RadioCommand, CommandResult, RadioSnapshot and RadioStateEvent in proposed `ui/thetis-extension/src/contracts.ts`. RadioClient exposes `execute(command): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>` and `subscribe(listener): Disposable`. Snapshot schemaVersion starts at 1, with sessionGeneration and monotonic revision. Feature plans extend domain payloads. Receiver IDs are rx1/rx2/sub; frequency is validated integer Hz, translated to legacy MHz/indices only by backend adapters with model-specific bounds.

Services own state/settings/validation/timing/jobs. Views own presentation and disposable subscriptions. Recreated views fetch authoritative state after session/revision gaps and never replay stale PTT. Backend files use opaque references rather than unrestricted browser-supplied paths.

Delivery remains one embedded C# endpoint on port 50001. Step 01 proves hashed webview origins, worker/service-worker resources and offline loading. Qualify localhost separately from secure LAN TLS/WSS and legacy plain TCI coexistence. No production Node/Python/Kestrel server.

## Exactly ten implementation plans

| Step | Plan | Qualified visible effect |
|---|---|---|
| 01 | [Foundation, baseline and hosting][step01] | Source/picture traceability, real multi-section shell, synthetic Console and skin/layout foundation |
| 02 | [Shared backend and exclusive boot][step02] | Independent lifecycle/state/settings, one selected frontend, no hidden operational forms |
| 03 | [Main Console and receiving][step03] | Left power/gain, top VFOs, central plots, right receiver controls, lower deck/RX2 and essential connection setup |
| 04 | [Tuning, filters, memories and spots][step04] | Compact memory views, full editors, contextual controls and receiver-aware spots |
| 05 | [Audio and transmit][step05] | EQ/CFC/profiles, native/browser routes and mode-dependent operating controls |
| 06 | [CW messages, recording and schedules][step06] | Auxiliary task views and persistent C# jobs, preserving actual legacy behavior |
| 07 | [Advanced RF and calibration][step07] | PureSignal/AmpView, Diversity, XVTR, calibration and routing |
| 08 | [Skins, displays and gadgets][step08] | Full legacy-skin workflows, display modes and meter/gadget tools |
| 09 | [Controllers and interaction][step09] | CAT/MIDI/Andromeda, hardware feedback and scoped shortcuts |
| 10 | [Specialist and maintenance][step10] | RA, wideband, diagnostics, DB/Finder/remaining Setup and active-inventory closure |

## Qualification in every step

Each plan includes files/interfaces, checkable tasks and targeted browser/WinForms/hardware acceptance. Stage 1's existing modules are identified in its execution record; modules proposed for Stages 2-10 are future work. The [behavior ledger](D:/workspace/Thetis/ui/baseline/ledger.json) records original handlers, picture/source references, target surfaces, capabilities, initial state/action/result, units/ranges, persistence, external mapping and evidence status.

Run the packaged workbench in a visible browser on the actual embedded endpoint. Test inputs and native hide/collapse/move/reset/reload; inspect screenshots/browser errors and backend outcomes. Compare separate Windows and Code runs from copied configurations. Each step incorporates applicable offline/reconnect, malformed state, concurrent controllers, audio/display load and resource cleanup, plus regression checks on earlier slices. Removing the former final milestone does not remove these checks.

Every code/configuration/asset change passes the required command and targeted checks before coherent completed operations are committed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Use the build script's process termination before staging and relaunch the selected mode for UI checks. This operation changes Markdown only; no application, browser or hardware test is claimed to have passed.

[manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis manual_1.1.pdf>
[network]: <D:/workspace/Thetis/Documentation/Radio/Thetis Network Settings_0.2.pdf>
[designer]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs>
[resources]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx>
[resize]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:36863>
[power]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:5897>
[gain]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:6716>
[vfo-a]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:15745>
[vfo-b]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:16150>
[vfo-middle]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:7143>
[spectrum]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:10867>
[meter]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:11023>
[band]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:15361>
[mode]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:15328>
[filter]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:11698>
[tuning]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:6675>
[dsp]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:6660>
[mixer]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:6616>
[mode-slot]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:12415>
[mode-selection]: <D:/workspace/Thetis/Project Files/Source/Console/Andromeda/Andromeda.cs:4176>
[rx2]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:13714>
[rx2-meter]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx:16456>
[views]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/api/browser/viewsExtensionPoint.ts:60>
[layout-api]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/web.api.ts:745>
[layout-restore]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/layout.ts:1093>
[view-state]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/services/views/common/viewContainerModel.ts:90>
[setup-show]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:48447>
[db-dialog]: <D:/workspace/Thetis/Project Files/Source/Console/clsDBMan.cs:214>
[macro-dialog]: <D:/workspace/Thetis/Project Files/Source/Console/frmMacroButtonConfig.cs:219>
[cw-dialog]: <D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:2120>
[band-popup]: <D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.cs:402>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[step01]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-01-foundation.md>
[step02]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-02-backend.md>
[step03]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-03-console.md>
[step04]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-04-tuning-memory.md>
[step05]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-05-audio-transmit.md>
[step06]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-06-cw-recording.md>
[step07]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-07-advanced-rf.md>
[step08]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-08-skins-displays.md>
[step09]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-09-controllers.md>
[step10]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-10-specialist-maintenance.md>
