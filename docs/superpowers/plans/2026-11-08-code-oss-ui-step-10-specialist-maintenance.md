# Step 10: Specialist and Maintenance Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct the remaining active astronomy, wideband, diagnostic, search, database and maintenance workflows and close their parity ledger ownership.

**Architecture:** C# services own acquisition, host files, database operations and machine actions. Code uses native editor tabs for wide plots/tables, Diagnostics views for narrow readouts and bottom Panel views for logs. Qualification accompanies the remaining features.

**Tech Stack:** Windows 10/11 x64; CMake/MSVC/Ninja; .NET Framework 4.8-compatible C#; TypeScript browser extension; browser plot rendering and the embedded endpoint.

**Spec:** Read the [authoritative overall view][overall], [source design][design] and [surface inventory][inventory]. New paths/interfaces are proposals; implementation commands have not been executed.

## Global Constraints

- Select one operational frontend before application initialization; switch by restart.
- Preserve native ABI, calling conventions, DSP behavior and .NET Framework 4.8 compatibility.
- Embedded HTTP/WebSocket endpoint remains port 50001; no additional production web server.
- Preserve settings/schema/backup compatibility, external command sources and domain-specific comments/licensing.
- Keep parent-owned frontend code outside upstream submodules; explicitly include new managed sources in the existing project and established staging configuration.
- Stop Thetis before compiling/staging through build scripts; pass the full Release pipeline and commit each complete operation. No Visual Studio IDE artifacts or emojis.

## Review Focus

1. Database management is requested while receiving/transmitting or Setup has unfinished edits: preserve power-off, exclusion and confirmation semantics without partial configuration changes.
2. An astronomy destination is unwritable or imported CSV is malformed: preserve useful errors and close resources without reporting successful acquisition/export.
3. A specialist editor is hidden, closed or reloaded during acquisition: follow the recorded feature lifecycle and avoid duplicate radio streams/jobs.
4. A Finder result points to a hidden or hardware-inapplicable control: navigate precisely or explain capability limits; never instantiate WinForms to discover controls.
5. Packet loss/log bursts or denied host-admin actions occur during radio operation: bound UI delivery and preserve backend operation and privilege/error behavior.

---

## Ownership, placement and interfaces

Radio Astronomy, Wideband and RF diagnostic plots open native editor tabs; optional `thetis.bandwidth` belongs in Diagnostics. Finder is primary navigation/results and opens the precise Setup control. Database Manager retains a blocking application transaction and modal confirmation. General Options, Tests and maintenance pages stay under Setup; logs use bottom Panel views. Console spectra, under-spectrum controls and RX2 strip remain in the Console editor.

**Source baseline:** [astronomy acquisition/CSV][ra], [wideband lifecycle/options][wideband], [bandwidth sampling][bandwidth], [Finder indexing/navigation][finder], [database gate][db-gate], [database operations][db-form], [sequence diagnostics][sequence], [general logs][logs], [startup log][startup-log] and [Setup][setup]. Astronomy averages the current receiver meter samples and owns timer/file state; preserve measured baseline units and arithmetic rather than introducing a new averaging formula. Wideband is a separate ADC acquisition path; its current close disables WB and cancels display work. Bandwidth samples every 500 ms, uses smoothing factor 0.7 and supports KB/s versus Mbit/s.

**Proposed files:** create [SpecialistContracts.cs][service-contracts], [AstronomyService.cs][ra-service], [WidebandService.cs][wb-service], [DatabaseManagementService.cs][db-service], [MaintenanceService.cs][maintenance-service], [specialistContracts.ts][ui-contracts], [specialistEditors.ts][ui-editors], [finderIndex.ts][ui-finder], [unit tests][ui-tests], [browser tests][e2e-tests] and [managed fixtures][managed-tests]. Modify existing adapters, [Thetis.csproj][project], [manifest][manifest], [shared contracts][contracts] and [radio client][client]. Register through step 01's entry.

Consume the shared `execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>` and `subscribe(listener: (event: RadioStateEvent) => void): Disposable`. Maintain schemaVersion 1, sessionGeneration and monotonic revision; receiver IDs are `rx1|rx2|sub` and frequencies integer Hz. Proposed `SpecialistOperation` is a typed union for astronomy start/stop/import/export, wideband open/configure/close, diagnostics and maintenance. Dispatcher-called services expose `GetSnapshot(): SpecialistSnapshot` and family-specific operations; stream telemetry uses existing bounded subscriptions, never a new WebSocket server.

### Task 1: Radio Astronomy acquisition and host CSV operations

**Files:** existing RA adapter, proposed astronomy service/contracts/editor/tests and project inclusion.

- [ ] Capture WinForms fixtures for measurements-per-point, RX1/RX2 values, dBm/linear display, axes, file date/comment, read/write and start/stop. Record close/reopen behavior and designer-enforced ranges.
- [ ] Write `AstronomyTests`: deterministic samples match baseline integration/output columns; stop flushes once; invalid axis pairs follow existing correction rules; malformed CSV/unwritable destination yields an explicit error without an orphan writer. This pins Review Focus 2.
- [ ] Implement `AstronomyService.Start(RaOptions options): SpecialistResult`, `Stop(string acquisitionId): SpecialistResult`, `Import(HostFileId fileId): SpecialistResult` and `Export(RaExportOptions options): SpecialistResult`. C# owns sampling and file handles; browser renders snapshots/points and requests typed operations. HostFileId is an opaque token from the existing host-file workflow, not a browser path.
- [ ] Reconstruct the native Astronomy editor, including controls, labels and graph axes. Test browser upload/download separately from engine-host file selection; compare fixture CSV content and plots, then qualify actual receiver meter acquisition.
- [ ] Hide/reload/reopen during acquisition and apply the captured lifecycle explicitly; distinguish transient iframe recreation from an intentional close. Assert one acquisition and correct restored status. Pass selectors/Release and commit this operation. This owns the astronomy part of Review Focus 3.

### Task 2: Wideband and diagnostics

**Files:** existing wideband/bandwidth/sequence/log adapters, proposed wideband/maintenance services and editors/tests.

- [ ] Write `WidebandTests` for supported ADC/model/protocol, frame size, update rate, averaging, scaling and persisted options. `Close(string viewSessionId): SpecialistResult` must release the acquisition once and preserve existing disable behavior; transient reload must not accidentally create a second stream. Qualify open/close across hardware disconnect and unsupported firmware. This completes Review Focus 3.
- [ ] Implement `WidebandService.Open(WidebandOptions options): SpecialistResult`, `Configure(WidebandOptions options): SpecialistResult` and `Close(string viewSessionId): SpecialistResult` over the existing acquisition route. Preserve baseline spectrum units/axes and hardware bounds; do not substitute the normal receiver FFT.
- [ ] Reconstruct Bandwidth units/smoothing/reset, sequence warnings, clear/copy text/image, capture executable/interface/ring-buffer options, and general/startup/progress logs. Preserve the source's separate logging enable state and clear behavior. Map OS clipboard/download limitations explicitly in the browser.
- [ ] Write `DiagnosticBurstTests`: bounded delivery under packet-loss/log bursts, correct warning state after clear, no UI work in radio/audio callbacks, and deterministic capture-tool failures. Missing external capture software remains an explicit backend capability/error. Pass targeted tests/Release and commit diagnostics independently. This pins the load half of Review Focus 5.

### Task 3: Database Manager transaction and restart

**Files:** existing database manager/model adapters, proposed database service/editor/tests.

- [ ] Capture fixtures for active/available/backup lists, new/duplicate/rename/remove, activation, import/export, making backups available, backup-on-start/shutdown, backup now, pruning and failure/cancel paths. Current [entry gate][db-gate] requires power-off and excludes an open Setup window; activation [requests restart][db-activate].
- [ ] Write `DatabaseManagementTests`: declined power-off, failed power-off, active Setup edit, cancelled activation, invalid import, inaccessible backup and repeated submissions leave the original active database intact. Test only copied temporary data. This pins Review Focus 1.
- [ ] Implement `Begin(DatabaseSessionRequest request): DatabaseSessionResult`, `Apply(DatabaseOperation operation): SpecialistResult` and `End(string transactionId): void` on DatabaseManagementService. Operations carry transactionId, requestId and expectedRevision; backend owns exclusion and rechecks mutable preconditions. Never replay activation/deletion/import after reconnect. Preserve existing confirmations and restart ownership.
- [ ] Reconstruct lists/actions with the same transaction boundaries. Lose the browser connection mid-operation, reopen from authoritative status and verify exactly one outcome. Restart separately into Windows and Code using the same copied database; compare backups/schema/settings. Pass tests/Release and commit the database operation.

### Task 4: Finder, remaining Setup and cumulative completion

**Files:** proposed Finder index/maintenance service/editor/tests, existing Setup/About/progress adapters and the shared parity ledger.

- [ ] Write `FinderTests` for labels, tooltips, keywords, full names and CAT descriptions, including hidden/unavailable controls. Implement `searchFinder(query: string, options: FinderOptions): readonly FinderResult[]` over the ledger-derived index; stable result IDs resolve to editor/control IDs. Preserve source search options and useful highlighting without traversing hidden Forms. This pins Review Focus 4.
- [ ] Assign every remaining active control/page/helper to an owner: General Options, Tests/signal generation, firewall/registry/host operations, About/version/release information, progress/errors and residual Setup. Reuse earlier services for already implemented RF/audio/display actions. Keep compiled `rxa` and unfinished `frmFilterManager` explicitly triaged; do not invent replacement features from declarations alone.
- [ ] Implement `MaintenanceService.Apply(MaintenanceOperation operation): SpecialistResult` with enumerated source-backed actions. Write `HostMaintenanceTests` for denied privilege, missing tools and operation failure; display actionable results and preserve existing privilege boundaries. This completes Review Focus 5.
- [ ] Run cumulative WinForms/Code scenarios from copied settings, concurrent CAT/MIDI/TCI changes, hide/move/reload, offline cold start, mode restart and resource cleanup. Apply earlier display/audio/TX/calibration/schedule tolerances. Record hardware/browser coverage; require no unfinished active feature in the declared scope.
- [ ] Run selectors and the mandatory Release command below, update every remaining ledger row with evidence, and commit each independently verified feature operation. Retain WinForms as the selectable alternative. No eleventh release/qualification-only step is required.

```powershell
dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter "Feature=Specialist"
pnpm --dir ui run test -- specialist
pnpm --dir ui run test:e2e -- specialist
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Commands use proposed step 01–02 infrastructure. Tag managed fixtures `Feature=Specialist`; require nonzero test discovery, passing scenarios, Release exit 0, hardware evidence and cumulative earlier-step results.

[overall]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[design]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[ra]: <D:/workspace/Thetis/Project Files/Source/Console/RAForm.cs:125>
[wideband]: <D:/workspace/Thetis/Project Files/Source/Console/wideband.cs:49>
[bandwidth]: <D:/workspace/Thetis/Project Files/Source/Console/frmBandwidth.cs:48>
[finder]: <D:/workspace/Thetis/Project Files/Source/Console/frmFinder.cs:316>
[db-gate]: <D:/workspace/Thetis/Project Files/Source/Console/clsDBMan.cs:172>
[db-activate]: <D:/workspace/Thetis/Project Files/Source/Console/clsDBMan.cs:962>
[db-form]: <D:/workspace/Thetis/Project Files/Source/Console/frmDBMan.cs:231>
[sequence]: <D:/workspace/Thetis/Project Files/Source/Console/frmSeqLog.cs:74>
[logs]: <D:/workspace/Thetis/Project Files/Source/Console/frmLog.cs:60>
[startup-log]: <D:/workspace/Thetis/Project Files/Source/Console/clsProgressLog.cs:87>
[setup]: <D:/workspace/Thetis/Project Files/Source/Console/setup.cs>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[service-contracts]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/SpecialistContracts.cs>
[ra-service]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/AstronomyService.cs>
[wb-service]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/WidebandService.cs>
[db-service]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/DatabaseManagementService.cs>
[maintenance-service]: <D:/workspace/Thetis/Project Files/Source/Console/RadioServices/MaintenanceService.cs>
[ui-contracts]: <D:/workspace/Thetis/ui/thetis-extension/src/features/specialist/specialistContracts.ts>
[ui-editors]: <D:/workspace/Thetis/ui/thetis-extension/src/features/specialist/specialistEditors.ts>
[ui-finder]: <D:/workspace/Thetis/ui/thetis-extension/src/features/specialist/finderIndex.ts>
[ui-tests]: <D:/workspace/Thetis/ui/thetis-extension/src/features/specialist/specialist.test.ts>
[e2e-tests]: <D:/workspace/Thetis/ui/thetis-extension/test/e2e/specialist.spec.ts>
[managed-tests]: <D:/workspace/Thetis/tests/Thetis.RadioServices.Tests/SpecialistTests.cs>
[manifest]: <D:/workspace/Thetis/ui/thetis-extension/package.json>
[contracts]: <D:/workspace/Thetis/ui/thetis-extension/src/contracts.ts>
[client]: <D:/workspace/Thetis/ui/thetis-extension/src/transport/radioClient.ts>
