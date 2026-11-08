# Thetis Code OSS UI reconstruction: source analysis and proposed design

Date: 2026-11-08. Status: proposed architecture and functional scope; implementation has not started.

## 1. Intent and agreed direction

Retain the Windows Forms frontend and build a new frontend consisting of a Code OSS browser workbench plus newly written custom radio panels. Select one operational frontend before application initialization. Preserve the existing Windows native DSP, audio and radio networking implementation. The Code frontend must eventually reproduce the current WinForms functionality, including configuration and less frequently used workflows.

The user selected Code workbench integration with custom panels/webviews. This does not require a fork of Code's internal widget system. Proposed extension, host-page and radio-panel sources belong in the parent repository, outside the upstream Code submodule. The existing TOTW frontend is not the implementation of these panels.

For this proposal, **1:1 means functional parity**, including interaction semantics, validation, persistence, hardware effects, external control and recovery. Code controls layout, tabs and themes. Pixel-identical WinForms skins and identical native OS window behavior are not assumed. Any required visual compatibility should be made an explicit acceptance item rather than silently counted as functional parity.

This is a substantial migration that can be divided into reviewable milestones. A completed early milestone is not a claim of full UI parity.

## 2. Evidence and limits of the scan

The parent source baseline at scan start was `ed66e979deaf57ddbb8c9c5c524826b404e0e139`. At document verification, the parent had advanced through the user's documentation/submodule commits to `1b74677e`; the analysed application sources were unchanged. The local Code checkout and committed gitlink are `fdefc478b9148c1a47f913b3ec618a1226d9f600`. The existing submodule addition and unrelated documentation/release-note changes are outside this analysis operation.

The scan followed explicit compile entries in [Thetis.csproj][project] and its [Midi2Cat][midi-project] and [RawInput][raw-project] project references. A static declaration scan found 236 listed C# files, 56 distinct Form-derived class names and 16 UserControl-derived class names. These are source-surface observations, not 56 independently reachable production windows. Conditional compilation, helper dialogs, diagnostic classes and dormant forms require separate reachability classification.

The [Setup designer][setup-designer] constructs 89 TabPage objects, including nested pages and gadget-property pages; some are hidden or removed for particular hardware. Its static control-construction observations are 4,472, compared with 624 for the [Console designer][console-designer]. Labels, containers and menus are included. These counts indicate migration size; they do not measure independent functions or runtime widget counts. The [source inventory][inventory] lists every discovered form, UserControl and Setup TabPage candidate and explains the counting method.

All three supplied PDFs were extracted to text outside the repository. Relevant workflow sections were inspected, and screenshots were visually reviewed on user-manual pages 10, 11, 36, 54, 56, 59 and 67 and network-guide pages 1-3. This is not a claim that every page or every event-handler branch was individually audited.

| Reference | Role in the reconstruction | Important limitation |
|---|---|---|
| [Thetis user manual, revision 1.1][manual], 130 pages | Main operating groups, display modes, auxiliary forms, Setup and peripheral workflows | The document is from 2020; current source includes later features and changed UI |
| [Thetis Network Settings, revision 0.2][network-manual], 8 pages | Current discovery, NIC selection, custom radio, protocol, port and watchdog behavior | Several hardware/firmware capabilities are explicitly conditional or provisional |
| [CAT command reference, V3][cat-manual], 116 pages | External-control semantics and functional groups for differential checks | Historical commands and examples must be reconciled with current [CATCommands][cat] and [CATStructs.xml][cat-structs] |
| [Local Code OSS README][code-readme] and pinned source | Browser workbench, extension packaging, resource hosting and supported UI mechanisms | No Code build or browser hosting test was performed |

Manuals are evidence, not instructions to change the machine or operate a transmitter. Where a manual and current source disagree, the parity ledger must record the discrepancy. Current reachable WinForms behavior is the proposed baseline. A manual-only historical feature is not automatically a requirement to reintroduce removed code.

## 3. Why the backend work comes before most panel work

### 3.1 Startup and behavior currently belong to forms

[Main][startup] always constructs Console and calls Application.Run with it. The constructor initializes controls, loads the database, creates the radio, initializes display and meter behavior, and eventually starts rendering. Existing `-web`/`-tci` options enable the endpoint during this normal path; they do not select a separate frontend.

[InitConsole][init-console] eagerly creates auxiliary forms and systems, including PureSignal, meters, CWX, serial listeners, EQ, Setup and transverter state. Initialization order matters: meters precede saved-state recovery, and CWX is created before serial callbacks can create it on the wrong thread. Some constructors start background workers.

[VFOAFreq][frequency] dispatches through the WinForms thread, updates a textbox and invokes its focus handler. [PowerOn][power] is a checkbox-backed property. [NetworkIO.InitRadio][radio-init] reads the selected radio and discovery options through Setup controls. A frontend rewrite therefore needs application-service extraction, not just a new visual layer.

### 3.2 Persistence is part of the functional contract

[Setup.SaveOptions][save-options] serializes control-named settings. Recovery order and forced events apply settings to the application and hardware. Apply, Cancel and close behavior must be inspected individually; it is unsafe to replace the existing settings behavior with a universal browser form transaction.

[MemoryList][memory-list] separately persists memory entries, and [MemoryForm][memory-scheduler] contains a scheduler. [Database management][db-manager] can switch configuration and restart the application. Preserve existing schema and backup behavior, and separate machine/radio settings from browser layout preferences. Do not let a new browser panel overwrite existing settings with defaults before its values have loaded.

### 3.3 External command sources must survive frontend changes

CAT, TCI, MIDI, physical PTT and Andromeda are existing command sources. The new frontend must use the same authoritative state and rules as those sources. [ThreadSafeCatParse][cat-dispatch] currently uses Console's invocation handle; a UI-neutral dispatcher must replace that dependency before a real Code-only engine can run without forms.

Do not implement radio behavior independently in TypeScript. Do not call WinForms click handlers by name over a generic remote interface. Extract typed operations and publish validated state changes.

## 4. Chosen architecture and alternatives

| Approach considered | Fit | Decision |
|---|---|---|
| Browser workbench with a Thetis web extension and new custom panels | Uses supported Code contributions for views, commands, tabs, shortcuts and themes; custom radio content uses webviews | User-selected direction |
| Internal Code workbench contributions and custom widget fork | Gives deeper UI integration but ties the radio UI to internal Code changes | Not required by the selected direction |
| Embed or adapt existing TOTW wholesale | Reuses a current interface but does not produce the requested independently reconstructed system | Outside the requested implementation |

Proposed ownership:

| Component | Responsibility |
|---|---|
| Existing native libraries | DSP, radio UDP protocols, hardware audio, timing-sensitive work; retain ABI and calling conventions |
| Shared C# application services | Radio lifecycle, settings, capabilities, validated commands, snapshots, event publication, meters, scheduling, calibration and external control |
| WinForms adapter | Existing frontend calling shared services and displaying their state |
| Embedded endpoint, port 50001 | Static workbench/extension assets, HTTP resource handling and distinct WebSocket protocols |
| Parent-owned browser host | Instantiate the standalone Code workbench, configure locally packaged resources and extension, select initial layout |
| Thetis browser extension | Panel registration/lifecycle, commands, transport session and synchronization |
| New radio panels | Render state and collect operator input; spectrum uses browser graphics; audio uses browser media facilities where selected |

Begin extraction within the existing managed project to avoid an unnecessary simultaneous framework/project migration. A separate core assembly can follow when dependencies actually permit it. Preserve .NET Framework 4.8 compatibility and the current CMake/MSVC/Ninja/.NET CLI build.

The command/state contract should include per-receiver identity, capabilities, units, validation errors, command acknowledgments, snapshot version and ordered state revisions. Browser reconnection obtains a fresh snapshot and resumes subscriptions; it must not replay stale transmit commands. Settings edits follow the legacy behavior defined for that feature. Exact DTOs belong in the first executable contract plan after the hosting proof.

Use bounded display/telemetry queues and avoid synchronous UI work in audio/IQ callbacks. Keep keying and scheduling in C#, independent of browser timers, focus and panel visibility. Existing local ASIO/VAC and physical controls remain backend capabilities even when the browser runs elsewhere.

## 5. Browser hosting is a first milestone, not an assumption

The local [Code package manifest][code-package] identifies version 1.146.0 and pnpm 12.16.0; [.nvmrc][code-node] specifies Node 24.22.1 for build-time tooling. This records the checked-out source, not a claim about a public release. [Web packaging targets][code-build] include `vscode-web` and `vscode-web-min`, producing a sibling `vscode-web` distribution. Confirm prerequisite build tasks on a clean checkout before declaring a reproducible build recipe. Node is allowed for asset building; it must not become the production web server.

Use the standalone workbench entry and [embedder options][code-web-api], with `additionalBuiltinExtensions` pointing to the packaged Thetis extension. Leave Code `remoteAuthority` unset: Thetis's TCI endpoint is not a Code remote-agent server. Do not simply copy the upstream server-template HTML, which expects server substitution and a different entry point.

### 5.1 Webview origins and secure context

The [webview host][webview-element] substitutes an identity into the endpoint hostname. Its [bootstrap][webview-pre] checks the hashed parent-origin identity, uses crypto.subtle and starts a module service worker. A same-origin path such as `/code/webview/` alone does not satisfy the pinned hostname check.

A **candidate**, not yet tested, for same-machine use is a workbench at `http://localhost:50001/code/` and webviews under `http://{{uuid}}.localhost:50001/...`. Verify wildcard localhost resolution and secure-context handling in the selected browsers. Explicitly override the [default CDN endpoint][code-product] with matching local assets; offline operation must not rely on a marketplace or CDN.

LAN/remote browsers are a separate deployment gate: raw HTTP to a LAN IP is not an established secure context for these webviews or microphone access. A likely design needs trusted HTTPS, wildcard webview hostnames/certificates and WSS within the C# endpoint. Coexistence with existing plain HTTP/WS TCI clients on the same TCP port is unresolved and must be designed and tested. Do not claim remote browser support from a successful localhost demonstration, or remove origin checks to force it to load.

### 5.2 Existing server gaps

[serveHttpContent][http] performs minimal static lookup and strips query information. The MIME/response implementation lacks some bundle-resource types and policy handling needed to evaluate the Code package. [WebSocket handling][ws-dispatch] currently treats each upgraded connection as TCI. [Accepted connections][accept-clients] create TCI listener state before the request type is known. A large workbench asset graph needs early HTTP/upgrade classification and measured connection/thread cleanup.

Preserve TCI compatibility while adding an explicitly routed application protocol. Preserve worker/resource query information and apply headers intentionally; do not blindly enable cross-origin isolation for all assets. Serve only staged runtime assets, with canonical path validation and explicit Host/origin rules when hashed webview hostnames are supported.

The first proof must demonstrate an activating browser extension, a scripted webview, service-worker/resource loading, a round-trip to C#, reload/recreation and offline cold start through the actual embedded server. A workbench screenshot alone does not prove the chosen UI architecture.

## 6. What must be reconstructed

### 6.1 Main Console

The user manual's pages 36-53 identify the operating groups: power/RX2, monitor/tune/MOX/duplex/PureSignal, VFOs, bands, modes, filters, gains/attenuation/squelch, split and VFO transfers, RIT/XIT, RX DSP, MultiRX, mode-dependent controls, PC audio, displays, meters, status, menus and keyboard/mouse actions. Reconcile these against [current Console][console] and [current menus][console-designer].

Test RX1, RX2 and subreceiver separately. Split/CTUN/VFO locks and which receiver supplies TX are state rules. A frequency display alone does not cover them. Start with panadapter/waterfall and normal interaction; complete the [display-mode enumeration][display-modes], including scope, phase, histogram and combined displays before claiming display parity.

### 6.2 Setup is a cross-cutting family

Do not reconstruct Setup in one final task. The initial connection UI needs General/HW, model/protocol, discovery/NIC/radio selection, ADC routing and essential audio/readiness settings. Later stages add full DSP, transmit profiles, calibration, hardware controls, appearance, keyboard, external control and diagnostic pages. Every discovered page appears in the inventory, including hardware-dependent and gadget configuration pages.

The network guide adds discovery speed; all/specific NIC; subnet filtering; targeted addresses/ports; discovered and custom radios; first-found semantics; fixed/random listen ports; protocol matching; interface-type filters; watchdog; and host-admin operations. Discovery is Windows backend work, not browser UDP. Preserve unsupported firmware options as unsupported; the guide explicitly says configurable P2 port notification is not supported by current firmware at its writing.

Machine-admin operations such as firewall repair and registry changes remain explicit Windows backend actions with their existing privilege/error behavior. The planning task has not executed them.

### 6.3 Standalone forms and their hidden behavior

| Family | Source-backed parity work and dependency |
|---|---|
| Filters | [FilterForm][filter] is the active preset editor; preserve names, VAR edges, width, CW/digital offsets and immediate effects |
| Band stacks | [frmBandStack2][bandstack] and [BandStackManager][bandstack-model] retain CTUN, centre frequency, mode/submode, variable filters, zoom, locking and update-on-leave semantics |
| Memory/quick recall | [MemoryForm][memory] and [quick recall][quickrecall] require full recall state, editing, storage, backup and scheduling, not frequency-only bookmarks |
| EQ/CFC/profiles | [EQForm][eq] includes graphic and parametric behavior beyond the old manual; [CFC configuration][cfc] and TX profiles share state and DSP routing |
| CW | [CWX][cwx] and [cwedit][cwedit] include message/macros, queueing, edits, CAT-fed text, stop semantics and backend timing |
| Recording/playback | [Current recording state][record-state] and [meter gadgets][meters] own important present-day operations; reconcile the old manual's Wave form with current sources rather than recreating a historical window by name |
| Spots | [SpotManager2][spots] and [Console spot actions][spot-actions] retain TCI/SWL ingestion, visibility, metadata, lifetime/expiry, receiver-specific click-to-tune/mode changes, lookup actions and outbound click notifications; milestone 4 owns behavior, milestone 8 completes display/appearance variants |
| PureSignal | [PSForm][ps] owns an active control loop, calibration, attenuation and correction files; [AmpView][amp] provides coupled correction plots |
| Diversity/transverters | [DiversityForm][diversity] changes IQ/DDC/routing; [XVTRForm][xvtr] changes translated frequency, band availability and power/tune behavior |
| Meters/gadgets | [MeterType][meter-types] includes VFO, buttons, filters, macros, clocks, LEDs, rotator, web images, recording and voice playback; [meter containers][meter-form] need their own substantial migration |
| Hardware views | [RF path illustration][paths], wideband, calibration, antennas/BPF and device-specific Setup pages have radio/model-dependent behavior |
| Peripherals | [MIDI commands][midi] and [Andromeda][andromeda] must keep executing during migration; browser replacements for their editors follow stable shared commands |
| Specialist/maintenance | [RAForm][ra], [wideband][wideband], [Finder][finder], DB management, logs, progress/error dialogs and About/release notes remain tracked work |

Classify [frmFilterManager][dormant-filter] as compiled but unfinished/apparently unused: its code implements construction and More/Less sizing, with no established active preset-editor path. The [extra receiver rxa][rxa] is also compiled, but its creation/exposure in [cmaster][rxa-callsite] is commented out. Both remain visible in the inventory. They do not automatically become requirements for new functionality. Diagnostic/helper classes are similarly distinguished from normal operator forms.

## 7. Startup modes and migration policy

Proposed arguments are `-ui:windows` and `-ui:code`, matching the style of current arguments. These arguments do not exist yet. Resolve the mode before constructing Console, splash screens, display renderers or optional windows. Use one backend process and one selected operational frontend. Switching mode requires a restart; configuration remains compatible between modes.

Windows mode is the regression reference during migration. Code mode initially exposes only qualified slices and reports its capability limits. A release advertised as 1:1 must have no missing active feature rows.

The first backend extraction milestone must explicitly address eagerly created behavior in Setup, EQ, transverters, CWX, meters and PureSignal, even though their browser editors arrive later. Their saved state and required processing cannot silently disappear. Optional features that cannot yet run independently must be identified and gated rather than replaced with default behavior.

A hidden Console can be a developer compatibility experiment, but it does not satisfy the proposed Code-only startup contract. This roadmap does not prescribe shipping a hidden operational WinForms tree or running two operator interfaces together. The hosting proof may use synthetic/diagnostic data before real radio integration; it needs no second operational frontend.

## 8. Parity evidence and completion rules

Maintain a ledger with: stable feature ID; form/control/menu/shortcut; current source/handler; relevant manual section; hardware/capability condition; initial state; action; expected state/hardware effect; units/range/validation; persistence; external-control mapping; replacement panel; test evidence; status. Use one row per behavior, not just per control. For example, a VFO field has separate digit-wheel, keyboard-entry, click-tune, lock, split and restore behaviors.

Acceptance is based on the same controlled initial configuration and equivalent action sequences in separate Windows-mode and Code-mode runs. Compare authoritative state, settings, commands and outputs. Include mode changes, reloads, missing devices, lost connections, unavailable features and malformed edits. A replay trace can replace hardware for deterministic application rules, but radio/driver/calibration checks need hardware evidence.

Keep control-path tests separate from high-rate display/audio checks. Validate all current display modes, measurement units/calibration, TX/RX overlays and interactions. Do not assume a client-side FFT with different calibration and averaging is equivalent to the existing [display pipeline][display]. Define and measure numerical/timing tolerances against a recorded baseline before accepting a replacement.

Closing/reloading a panel must not duplicate workers, lose settings or make a transmit state depend on browser focus. Verify disconnect and reconnect behavior for PTT/CWX, recording and schedules. Preserve established keying/timeouts and test them explicitly.

For every future code/configuration/asset change, stop Thetis through the approved build scripts and pass the repository's required command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Add targeted managed/extension/browser checks for the changed feature and one coherent commit per completed operation. This analysis changes Markdown only, so it does not run the application build or claim hardware verification.

## 9. Work sequence and remaining decisions

The [implementation roadmap][plan] defines twelve milestones, including an initial inventory milestone. The first reconstructed operating surface is **essential Setup/Network plus the RX1 Console**, after the hosting and lifecycle foundations. The first auxiliary editors are **FilterForm, band stack and memory recall**, followed by audio/EQ/profiles and CW/recording. Advanced calibration, gadgets, peripheral editors and specialist forms follow explicit dependencies.

Pending implementation decisions are narrow and testable: verified loopback webview origin arrangement; secure LAN transport/legacy TCI coexistence; exact application DTOs and per-feature TCI/CAT coverage; hardware/browser qualification matrix; and whether any historical/manual-only or pixel-skin compatibility is required. None is evidence that implementation or full parity has already been achieved. No calendar estimate is reliable before the hosting and initial vertical-slice measurements.

[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[plan]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[midi-project]: <D:/workspace/Thetis/Project Files/Source/Midi2Cat/Midi2Cat.csproj>
[raw-project]: <D:/workspace/Thetis/Project Files/Source/RawInput/RawInput.csproj>
[manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis manual_1.1.pdf>
[network-manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis Network Settings_0.2.pdf>
[cat-manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis-CAT-Command-Reference-Guide-V3.pdf>
[code-readme]: <D:/workspace/Thetis/submodules/vscode/README.md>
[console]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:85>
[console-designer]: <D:/workspace/Thetis/Project Files/Source/Console/console.Designer.cs:4100>
[setup-designer]: <D:/workspace/Thetis/Project Files/Source/Console/setup.designer.cs:10>
[startup]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1404>
[init-console]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:1704>
[frequency]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:18260>
[power]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:19734>
[radio-init]: <D:/workspace/Thetis/Project Files/Source/Console/HPSDR/NetworkIO.cs:27>
[save-options]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs:1520>
[memory-list]: <D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryList.cs:113>
[memory-scheduler]: <D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:1010>
[db-manager]: <D:/workspace/Thetis/Project Files/Source/Console/clsDBMan.cs:962>
[cat-dispatch]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:15592>
[cat]: <D:/workspace/Thetis/Project Files/Source/Console/CAT/CATCommands.cs>
[cat-structs]: <D:/workspace/Thetis/Project Files/Source/Console/CAT/CATStructs.xml>
[code-package]: <D:/workspace/Thetis/submodules/vscode/package.json:3>
[code-node]: <D:/workspace/Thetis/submodules/vscode/.nvmrc:1>
[code-build]: <D:/workspace/Thetis/submodules/vscode/build/gulpfile.vscode.web.ts:95>
[code-web-api]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/web.api.ts:249>
[webview-element]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/contrib/webview/browser/webviewElement.ts:604>
[webview-pre]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/contrib/webview/browser/pre/index.html:350>
[code-product]: <D:/workspace/Thetis/submodules/vscode/product.json:39>
[http]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:1882>
[ws-dispatch]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:2982>
[accept-clients]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:7298>
[filter]: <D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs:734>
[bandstack]: <D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.cs:56>
[bandstack-model]: <D:/workspace/Thetis/Project Files/Source/Console/clsBandStackManager.cs:131>
[memory]: <D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:45>
[quickrecall]: <D:/workspace/Thetis/Project Files/Source/Console/frmQuickRecallPopupList.cs:47>
[eq]: <D:/workspace/Thetis/Project Files/Source/Console/eqform.cs:2387>
[cfc]: <D:/workspace/Thetis/Project Files/Source/Console/frmCFCConfig.cs:53>
[cwx]: <D:/workspace/Thetis/Project Files/Source/Console/cwx.cs:755>
[cwedit]: <D:/workspace/Thetis/Project Files/Source/Console/cwedit.cs:268>
[ps]: <D:/workspace/Thetis/Project Files/Source/Console/PSForm.cs:63>
[amp]: <D:/workspace/Thetis/Project Files/Source/Console/AmpView.cs:381>
[diversity]: <D:/workspace/Thetis/Project Files/Source/Console/DiversityForm.cs:1834>
[xvtr]: <D:/workspace/Thetis/Project Files/Source/Console/xvtr.cs:5653>
[meters]: <D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs>
[meter-types]: <D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs:178>
[meter-form]: <D:/workspace/Thetis/Project Files/Source/Console/frmMeterDisplay.cs:49>
[record-state]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:53616>
[spots]: <D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs:54>
[spot-actions]: <D:/workspace/Thetis/Project Files/Source/Console/console.cs:48873>
[paths]: <D:/workspace/Thetis/Project Files/Source/Console/Path_Illustrator.cs:12>
[midi]: <D:/workspace/Thetis/Project Files/Source/Console/Midi2CatCommands.cs:57>
[andromeda]: <D:/workspace/Thetis/Project Files/Source/Console/Andromeda/Andromeda.cs:3929>
[ra]: <D:/workspace/Thetis/Project Files/Source/Console/RAForm.cs:125>
[wideband]: <D:/workspace/Thetis/Project Files/Source/Console/wideband.cs:50>
[finder]: <D:/workspace/Thetis/Project Files/Source/Console/frmFinder.cs:55>
[dormant-filter]: <D:/workspace/Thetis/Project Files/Source/Console/frmFilterManager.cs:55>
[rxa]: <D:/workspace/Thetis/Project Files/Source/Console/rxa.cs:15>
[rxa-callsite]: <D:/workspace/Thetis/Project Files/Source/Console/cmaster.cs:1859>
[display-modes]: <D:/workspace/Thetis/Project Files/Source/Console/enums.cs:134>
[display]: <D:/workspace/Thetis/Project Files/Source/Console/display.cs>
