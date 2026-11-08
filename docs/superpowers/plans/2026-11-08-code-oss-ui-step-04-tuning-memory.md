# Step 04: Tuning, Filters, Memories and Spots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete everyday receiving with both receivers, filter editing, band stacks, full memories, quick recall and current spot behavior.

**Architecture:** Extend step 02's shared C# services and authoritative snapshots; both frontends use the same operations. An upstream Code extension registers native views and wide editors, while extension-owned models survive webview recreation. Tuning rules remain in C#.

**Tech Stack:** Windows x64, existing .NET Framework 4.8 project, TypeScript browser extension, packaged Code OSS, existing HTTP/WebSocket endpoint on port 50001.

**Spec:** [Overall ten-step plan](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>), [design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [inventory](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>).

## Global Constraints

- Depends on qualified steps 01–03; implement this plan later, not during planning.
- Preserve selectable WinForms, existing persistence/native ABI, port 50001 and upstream Code source; no secondary production server or IDE artifacts.
- Receiver IDs are `rx1`, `rx2`, `sub`; wire frequencies are integer Hz. Validate conversion to existing MHz and TCI receiver indices in C#.
- Consume `execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>` and `subscribe(listener: (event: RadioStateEvent) => void): Disposable`; extend existing envelopes, revisions and capabilities.
- Backend owns radio settings; Code owns layout. No browser-to-form-handler RPC, default-value overwrite or command replay on reconnect.
- Every independent operation below passes targeted checks and `powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release` before its commit; the script terminates Thetis before compiling/staging. No emojis.

## Review Focus

1. Editing a filter while CAT changes its mode rejects a stale edit without overwriting the new mode (Task 2).
2. A locked band-stack entry retains its data when leaving the band, yet can be unlocked (Task 3).
3. Duplicate-named memories with split and FM fields retain distinct identities across save/reload (Task 4).
4. A spot expires between pointer selection and click; no stale tuning or click notification occurs (Task 5).
5. Focus inside a memory text editor prevents digit/wheel shortcuts from retuning either receiver (Task 1).

## File and interface boundaries

All following source/test files are **proposed**, unless explicitly linked as existing. Create C# files under `Project Files/Source/Console/RadioServices/` and include them through the existing [managed project](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj:1>).

- `TuningMemoryContracts.cs`, `TuningMemoryService.cs`, `SpotService.cs`: domain DTOs and shared behavior.
- Extend step 02's proposed `ui/thetis-extension/src/contracts.ts`; reuse `transport/radioClient.ts`, `workbench/viewRegistry.ts` and `workbench/panelRegistry.ts`.
- Create `ui/thetis-extension/src/panels/tuning/{receiverControls.ts,filterEditor.ts,notchEditor.ts}`, `panels/memories/{bandStackView.ts,memoryEditor.ts,quickRecall.ts}` and `panels/spots/spotModel.ts`.
- Tests: `tests/Thetis.RadioServices.Tests/TuningMemoryTests.cs`, `SpotTests.cs`; `ui/thetis-extension/test/tuning-memory.test.ts`; `ui/thetis-extension/test/e2e/tuning-memory.spec.ts`.

Feature commands extend `RadioCommand`: `receive.setTopology {rx2Enabled,subEnabled}`, `receive.setVfoOperation {receiver,operation}` (`copyAToB|copyBToA|swapAB|zeroBeat|ifToVfo`), `receive.setTuningState {receiver,ctun,locked,ritEnabled,ritHz,xitEnabled,xitHz,txVfo}` (`txVfo: a|b`), `filter.setPreset`, `notch.edit`, `bandStack.edit`, `memory.edit`, `memory.recall`, `quickRecall.recall` and `spot.activate`. Each uses step 02's command identity, session generation and expected revision. Gain/pan/DSP operations reuse step 03's receiver commands. Service methods are `CommandResult Execute(TuningMemoryCommand command)` and `CommandResult Activate(SpotActivateCommand command)`; use distinct typed DTOs for each command payload, not reflected control names.

### Task 1: Finish receiver workflows and their Console placement

**Files:** Proposed `TuningMemoryContracts.cs`, `TuningMemoryService.cs`, `receiverControls.ts` and both tuning-memory tests; extraction reference: [current Console](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:7504>).

**Interfaces:** Extend snapshots with topology, pan/routing, CTUN/locks/RIT/XIT and TX-VFO selection; retain step 03's frequency/mode/filter identity. Preserve source-global versus receiver-local ownership; a receiver ID does not invent independent XIT or unsupported subreceiver controls.

- [ ] Write `ReceiverWorkflowPreservesTarget` and `EditorFocusDoesNotTune`: assert RX2 changes never mutate RX1; editing memory text produces zero tune commands. Include subreceiver enable/disable, VFO transfers, split selection, RIT/XIT, zero beat and IF-to-VFO against copied Windows traces.
- [ ] Run `pnpm --dir ui run test -- tuning-memory` and `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter TuningMemory`; require the new assertions to fail before implementation.
- [ ] Implement shared state transitions; put meters/bands/modes/filters into independent right-side `thetis-receiver-controls` views with explicit receiver context. Keep DSP/VFO functions below the Console spectrum, mode controls to their right and RX2 strip at the bottom; preserve the Operate gain/MultiRX/VAC proximity.
- [ ] Pass targeted tests and `pnpm --dir ui run test:e2e -- tuning-memory`; compare both receiver traces, CAT/TCI changes and layout recreation. Require no unintended TX and identical committed receiver state; run the full Release command.
- [ ] Commit only this operation: `git commit -m "feat: complete shared receiver tuning workflows"` after explicitly staging its changed paths.

### Task 2: Reconstruct the active filter and notch editors

**Files:** Proposed `filterEditor.ts`, `notchEditor.ts`, C# service/contracts and tests; modify behavior adapters in [FilterForm](<D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs:681>) and [notch popup](<D:/workspace/Thetis/Project Files/Source/Console/frmNotchPopup.cs:48>).

**Interfaces:** `FilterPresetEdit {receiver,mode,presetId,name,lowHz,highHz}`; `NotchEdit {receiver,id,action:create|update|delete,centerHz,widthHz,depth}`. Snapshot publishes effective edges/width and backend validation; notch depth choices come from the legacy model.

- [ ] Add `FilterLocalBoundsAndModeConflict`: assert editor edge metadata is `[-10000,10000]` Hz and width `[10,20000]` Hz from [current bounds](<D:/workspace/Thetis/Project Files/Source/Console/FilterForm.cs:374>), and stale-mode edits cannot commit. Add `NotchCwOffsetMatchesLegacy` for CWL/CWU and both receivers.
- [ ] Run the Task 1 unit commands; require these new cases to fail.
- [ ] Extract preset name/VAR/width/drag behavior and mode-specific CW/digital offsets. Register `thetis.filterEditor` as a wide editor; offer notch edits from the spectrum popup. These are local editor limits, not universal RF limits; do not substitute unfinished FilterManager.
- [ ] Pass unit/E2E checks with preset round-trip, drag boundaries and external mode changes; compare effective DSP settings to Windows traces and run the full Release command.
- [ ] Stage this slice and commit `feat: add shared filter and notch editors`.

### Task 3: Deliver compact and expanded band stacks

**Files:** Proposed `bandStackView.ts`, service/contracts and tests; adapt [band-stack form](<D:/workspace/Thetis/Project Files/Source/Console/frmBandStack2.cs:58>) and reuse [existing model](<D:/workspace/Thetis/Project Files/Source/Console/clsBandStackManager.cs:339>).

**Interfaces:** `BandStackEdit {action:add|update|delete|select|setLock,filterId,entryId,entry?}`; `entry` carries existing GUID, frequency/centre Hz, mode/submode, CTUN, filter/edges, zoom, lock and description.

- [ ] Add `LockedEntrySurvivesLeaveAndCanUnlock` and `BandStackRoundTripAllFields`; assert update-on-leave preserves locked data and unlocking succeeds.
- [ ] Run Task 1's unit commands and confirm failure in these cases.
- [ ] Implement commands through the existing model and persistence. Register a collapsible, independently hideable `thetis.memories.bandStack` section; expose expanded editing through popup/editor actions, retaining filters, return selection and update-on-leave preferences.
- [ ] Pass unit/E2E tests for filtering, wrap/selection, locks, restart and Windows/Code round-trip; run the full Release command.
- [ ] Stage this slice and commit `feat: reconstruct band stack workflows`.

### Task 4: Preserve full memories and quick recall

**Files:** Proposed `memoryEditor.ts`, `quickRecall.ts`, service/contracts and tests; adapt [MemoryForm](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryForm.cs:459>), preserve [MemoryList persistence](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryList.cs:93>) and [quick-recall precision](<D:/workspace/Thetis/Project Files/Source/Console/frmQuickRecallPopupList.cs:109>).

**Interfaces:** `MemoryEdit {action:create|update|copy|delete,id?,record?}`; serialize every field from [MemoryRecord](<D:/workspace/Thetis/Project Files/Source/Console/Memory/MemoryRecord.cs:182>), mapping frequencies and repeater MHz offsets to integer Hz. Recall payload is `{id,receiver}`; quick recall uses `{entryId,receiver}`. Preserve schedule fields without starting new schedule behavior until step 06.

- [ ] Add `DuplicateNamesRetainIdentityAndFmSplitState` and `QuickRecallKeepsOneHzPrecision`; assert full record equality after persistence and unambiguous selection by ID.
- [ ] Run Task 1's unit commands; confirm new tests fail.
- [ ] Implement wide `thetis.memoryEditor`, quick-recall popup, list search/group/copy/recall and existing close/save behavior. Keep unsaved text local while backend revisions update acknowledged state; display conflicts explicitly.
- [ ] Pass CRUD, copied-database recovery, legacy backup and cross-frontend recall tests; E2E must show the Console remains available after quick recall. Run the full Release command.
- [ ] Stage this slice and commit `feat: reconstruct full memories and quick recall`.

### Task 5: Preserve spots and close this feature's qualification

**Files:** Proposed `SpotService.cs`, `spotModel.ts`, `SpotTests.cs` and E2E tests; adapt [spot ingestion](<D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs:474>) and [Console spot actions](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:48873>).

**Interfaces:** `SpotActivateCommand {spotId,receiver,action:tune|lookupQrz|lookupHamQth}`; publish spot IDs, metadata, frequency Hz, visibility and expiry. Retain existing outbound spot-click notification semantics.

- [ ] Add `ExpiredSpotCannotTuneOrNotify` and `SpotLifetimeUnitsMatchLegacy`: assert ordinary lifetime uses minutes, SWL uses seconds and SWL zero means no expiry; verify replacement removes obsolete highlights on both receivers using [expiry source](<D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs:235>).
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter Spot` and the tuning-memory UI tests; confirm failure.
- [ ] Implement backend ingestion/removal/expiry and receiver-specific activation, preserving mode changes, lookup gestures and notification receiver mapping. Expose behavior settings here; step 08 owns remaining appearance variants.
- [ ] Pass targeted unit/E2E and full Release checks; record passed/unsupported/unfinished rows for every step-04 ledger item, including external updates and reconnect. Fail acceptance for any advertised unfinished behavior or unmatched state trace.
- [ ] Stage this slice and evidence; commit `feat: preserve spot interactions in Code UI`.
