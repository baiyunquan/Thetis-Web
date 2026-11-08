# Step 08: Skins, Displays and Meter Gadgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete display/meter behavior and provide browser-native appearance plus explicit legacy skin compatibility and host-managed skin workflows.

**Architecture:** Extend step 01 theme tokens and step 03 display telemetry; retain calibration, gadget commands and persistent appearance settings in shared C# services. Convert legacy skin XML/PNG into a browser presentation manifest with a compatibility report. Keep Code workbench layout separate from radio configuration and skin geometry.

**Tech Stack:** .NET Framework 4.8-compatible C#, existing display/meter models, TypeScript, browser graphics, Code theme integration, managed and browser tests.

**Spec:** [Authoritative overall UI/layout and sequence](<D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>); supporting [design](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>) and [inventory](<D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>). This is future implementation work; the following paths and interfaces are proposals.

## Global Constraints

- Preserve WinForms and exclusive boot-selected modes; keep runtime assets on the embedded C# endpoint, port 50001. No production Node server or long-term direct Code source modifications.
- Extend the [proposed contracts](<D:/workspace/Thetis/ui/thetis-extension/src/contracts.ts>) and consume the [proposed RadioClient](<D:/workspace/Thetis/ui/thetis-extension/src/transport/radioClient.ts>): `execute(command: RadioCommand): Promise<CommandResult>`, `getSnapshot(): Promise<RadioSnapshot>`, `subscribe(listener: (event: RadioStateEvent) => void): Disposable`.
- Receiver IDs are `rx1`, `rx2`, `sub`; frequencies use integer Hz. Gadget actions reuse qualified commands from steps 03–07; TypeScript does not reproduce radio rules.
- Preserve Operate left, independent meters/bands/modes/filters right, and Console editor VFO/spectrum/DSP+tuning+display/mode controls/RX2 ordering. Bottom Panel remains auxiliary CWX/recording/schedules/logs. Skins cannot move these controls into unrelated regions.
- Hiding a view stops its rendering/subscription, never the engine, recording or scheduled work. Preserve saved user placement; single-view header merging must leave titles/actions accessible.
- Each task's passing checks include `powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release`, using [build.ps1](<D:/workspace/Thetis/build.ps1>) to terminate Thetis before staging; then commit that coherent operation. Qualification belongs inside each task.

## Review Focus

1. Missing PNG states, unknown XML controls and font substitutions must produce explicit compatibility findings and usable fallbacks; task 1 owns tests.
2. Cancelled/offline downloads, malformed archives and removal of the selected skin must preserve a valid installed selection; task 2 owns tests.
3. Display switching under RX2/TX/resize load must retain calibrated axes and avoid unbounded frame accumulation; task 3 owns tests.
4. A gadget must retain units/ranges, receiver identity and current backend state after recreation, without replaying its last command; task 4 owns tests.
5. High contrast, keyboard use and restored layouts must remain operable when imported imagery has unreadable labels or fixed dimensions; task 5 owns tests.

## Proposed files and contracts

Create [RadioServices/Appearance](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/>) files [LegacySkinImporter.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/LegacySkinImporter.cs>), [SkinCatalogService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/SkinCatalogService.cs>), [DisplayService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/DisplayService.cs>), [GadgetService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/GadgetService.cs>), [AppearanceContracts.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/AppearanceContracts.cs>); add explicit entries in [Thetis.csproj](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>). Bind existing Skin/Setup/display/meter adapters to these services without replacing DSP algorithms.

Create browser files [skins/SkinManagerEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/skins/SkinManagerEditor.ts>), [skins/LegacySkinRenderer.ts](<D:/workspace/Thetis/ui/thetis-extension/src/skins/LegacySkinRenderer.ts>), [display/DisplayRenderer.ts](<D:/workspace/Thetis/ui/thetis-extension/src/display/DisplayRenderer.ts>), [gadgets/GadgetRegistry.ts](<D:/workspace/Thetis/ui/thetis-extension/src/gadgets/GadgetRegistry.ts>), [gadgets/GadgetEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/gadgets/GadgetEditor.ts>); extend [theme/tokens.ts](<D:/workspace/Thetis/ui/thetis-extension/src/theme/tokens.ts>) and [theme/radioTheme.ts](<D:/workspace/Thetis/ui/thetis-extension/src/theme/radioTheme.ts>) from step 01.

Contract additions: `SkinManifest`, `SkinCompatibilityReport { mapped, approximated, unsupported, missingAssets }`, `SkinJobState`, `DisplaySettings`, extensions of Step 03's existing `DisplayFrame`, `GadgetDescriptor` and persisted `GadgetContainer`. Snapshots contain selected skin ID, display settings and gadget configuration; control events carry job/configuration progress; display frames retain Step 03's separate bounded stream and sequence contract. Asset references are opaque IDs resolved through the staged endpoint, never arbitrary browser-visible Windows paths.

Unit selectors use proposed [skins.spec.ts](<D:/workspace/Thetis/ui/thetis-extension/src/skins/skins.spec.ts>), [display.spec.ts](<D:/workspace/Thetis/ui/thetis-extension/src/display/display.spec.ts>) and [gadgets.spec.ts](<D:/workspace/Thetis/ui/thetis-extension/src/gadgets/gadgets.spec.ts>). E2E selectors identify scenarios in proposed [appearance.e2e.ts](<D:/workspace/Thetis/ui/tests/e2e/appearance.e2e.ts>).

### Task 1: Legacy XML/PNG import and native theme adaptation

**Sources:** [Skin restore/fallback](<D:/workspace/Thetis/Project Files/Source/Console/Skin.cs:126>), [eight image states](<D:/workspace/Thetis/Project Files/Source/Console/Skin.cs:67>), [supported control families](<D:/workspace/Thetis/Project Files/Source/Console/Skin.cs:216>). **Files:** proposed importer, renderer and appearance contracts; extend theme foundation.

**Interfaces:** `LegacySkinImporter.Import(string hostSkinId): SkinImportResult`; `appearance.skins.import(hostSkinId)` returns manifest/report IDs.

- [ ] Add `LegacySkin_AllStatesAndNestedControls` and `LegacySkin_MissingAssetsReportsFallback` in [proposed AppearanceBehaviorTests.cs](<D:/workspace/Thetis/tests/Thetis.RadioServices.Tests/AppearanceBehaviorTests.cs>): assert `Assert.Equal(8, mapped.ButtonStates.Count)` and `Assert.Contains(missingAsset, report.MissingAssets)`; cover nested controls, alpha, Console fallback, missing XML, unavailable fonts and unknown properties.
- [ ] Run `dotnet test tests/Thetis.RadioServices.Tests/Thetis.RadioServices.Tests.csproj -c Release --filter LegacySkin`; expect failed mapping assertions.
- [ ] Implement mappings for buttons, checkboxes, radio buttons, combos, labels, numeric/text inputs, trackbars, pictures and containers. Preserve source identity and original assets; report geometry/font/native-control approximations. Extend semantic tokens for selected/disabled/focus/TX/error/meter states; do not promise pixel identity or inject legacy XML as HTML.
- [ ] Pass managed and `pnpm --dir ui run test -- skins`; verify preview state transitions and report completeness against representative installed skins, run Release, then commit `feat: import legacy skin assets with compatibility reports`.

### Task 2: Host skin catalog, preview and installation workflow

**Sources:** [catalog/download service](<D:/workspace/Thetis/Project Files/Source/Console/clsThetisSkinService.cs:125>), [download/install UI](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:28095>), [selected-skin removal](<D:/workspace/Thetis/Project Files/Source/Console/setup.cs:28265>). **Files:** proposed [SkinCatalogService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/SkinCatalogService.cs>), [SkinManagerEditor.ts](<D:/workspace/Thetis/ui/thetis-extension/src/skins/SkinManagerEditor.ts>); adapt current Setup handlers.

**Interfaces:** Add `appearance.skins.catalog(serverId)`, `.preview(entryId)`, `.install(entryId)`, `.cancel(jobId)`, `.select(skinId)`, `.uninstall(skinId)`; host owns server configuration, package validation and storage.

- [ ] Write `SkinInstall_CancelPreservesSelection`, `SkinArchive_EscapesRejected` and `SkinRemoval_SelectsValidFallback`; assert `Assert.Equal(before.SelectedId, cancelled.SelectedId)` and `Assert.True(remaining.Contains(afterRemoval.SelectedId))`; cover offline errors, cleanup, meter-only/root-folder handling and removal confirmation.
- [ ] Run managed `--filter SkinCatalog`; expect failing workflow assertions.
- [ ] Implement progress/error/cancel states, previews and compatibility-report links; mirror Windows catalog/server editing and download/use behavior. Keep configured roots, archive extraction and file locks on Windows; browser uploads yield host handles. Preserve existing root-layout options while rejecting path escape.
- [ ] Pass managed and `pnpm --dir ui run test:e2e -- appearance`; compare installed directories and selected settings across mode restarts, including unavailable servers, then Release-build and commit `feat: reconstruct host-managed skin catalog workflows`.

### Task 3: All display modes and overlays

**Sources:** [DisplayMode](<D:/workspace/Thetis/Project Files/Source/Console/enums.cs:134>), [display pipeline](<D:/workspace/Thetis/Project Files/Source/Console/display.cs>), [spot appearance](<D:/workspace/Thetis/Project Files/Source/Console/SpotManager2.cs>). **Files:** proposed [DisplayService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/DisplayService.cs>), [DisplayRenderer.ts](<D:/workspace/Thetis/ui/thetis-extension/src/display/DisplayRenderer.ts>); extend Console display controls.

**Interfaces:** `display.configure(receiver, settings: DisplaySettings)`; `DisplayFrame` includes receiver, mode, sequence, timestamp, calibrated axes and mode-specific samples.

- [ ] Add parameterized `Display_AllTwelveModesPreserveAxes` to [proposed display.spec.ts](<D:/workspace/Thetis/ui/thetis-extension/src/display/display.spec.ts>): SPECTRUM, PANADAPTER, SCOPE, SCOPE2, PHASE, PHASE2, WATERFALL, HISTOGRAM, PANAFALL, PANASCOPE, SPECTRASCOPE, OFF; assert `expect(frame.axes).toEqual(reference.axes)` and OFF's no-drawing behavior.
- [ ] Run `pnpm --dir ui run test -- display`; expect unsupported-mode/axis failures.
- [ ] Implement mode renderers, averaging/peak, pan/zoom, waterfall timing/colors, filter/notch/TX/spot overlays, split layouts and RX2/TX transitions. Reuse step 04 spot actions; complete label/density/own-call appearance without duplicating lifetime logic.
- [ ] Pass unit checks and `pnpm --dir ui run test:e2e -- appearance`; compare recorded numeric fixtures plus images, latency/frame-drop/audio metrics under resize and dual RX against step 01 baseline tolerances. Assert bounded queues, run Release, then commit `feat: complete receiver display modes and overlays`.

### Task 4: Meter ranges, containers and every active gadget family

**Sources:** [Reading and MeterType](<D:/workspace/Thetis/Project Files/Source/Console/MeterManager.cs:79>), [containers](<D:/workspace/Thetis/Project Files/Source/Console/frmMeterDisplay.cs>), [macro configuration](<D:/workspace/Thetis/Project Files/Source/Console/frmMacroButtonConfig.cs>). **Files:** proposed [GadgetService.cs](<D:/workspace/Thetis/Project Files/Source/Console/RadioServices/Appearance/GadgetService.cs>), registry/editor; bind current meter adapters.

**Interfaces:** `gadgets.configure(container: GadgetContainer)` and `gadgets.invoke(gadgetId, action)`; descriptors expose supported readings, actual calibrated ranges/units and qualified command mappings.

- [ ] Add `Gadgets_AllEnumEntriesHaveBehavior` and `Gadget_ReopenDoesNotReplayCommand`; enumerate active MeterType excluding NONE/LAST, including legacy `ACG_MAX_MAG`; assert `expect(missingTypes).toEqual([])` and `expect(reopenCommandCount).toBe(0)`; cover min/max/overrange, RX/TX/sub, persistence and disposal.
- [ ] Run managed `--filter Gadget` and `pnpm --dir ui run test -- gadgets`; expect missing coverage and replay failures.
- [ ] Implement measurement/magic-eye/cross/history/custom bars; VFO/dial/filter, clocks/text/spacer/LED/web-image, band/mode/filter/antenna/tune-step/other/Discord buttons, macros/variables, data outputs/rotator and wave/voice controls. Reuse backend ranges and steps 04–07 commands; preserve unavailable-device reasons and host file semantics.
- [ ] Pass selectors and `pnpm --dir ui run test:e2e -- appearance`; compare numeric ranges, macro results, recording continuity and persisted containers with Windows, including meter skin imagery, then Release-build and commit `feat: reconstruct meter containers and gadget behavior`.

### Task 5: Appearance accessibility and saved operating layouts

**Sources:** [gradient controls](<D:/workspace/Thetis/Project Files/Source/Console/ucLGPicker.cs>), [info bar](<D:/workspace/Thetis/Project Files/Source/Console/ucInfoBar.cs>), [legacy resizing](<D:/workspace/Thetis/Project Files/Source/Console/console.cs:36863>). **Files:** extend proposed theme adapters, skin renderer and gadget editor; extend shared layout contribution from step 01.

**Interfaces:** `appearance.configure(settings)` stores radio colors/gradients/skin choices; existing layout commands store workbench region/view preferences separately.

- [ ] Add `Appearance_HighContrastOverridesUnreadableSkin` and `Layout_RestorePreservesIndependentViews` to [proposed appearance.e2e.ts](<D:/workspace/Thetis/ui/tests/e2e/appearance.e2e.ts>); assert `await expect(dspControls).toBeVisible()` while Logs is selected; test focus, numeric alternatives and independent view hide/move/collapse/reopen.
- [ ] Run `pnpm --dir ui run test:e2e -- appearance`; expect accessibility/restoration failures.
- [ ] Implement high-contrast/focus overrides, scalable typography/targets, gradient editing, info-bar actions and collapsed/touch equivalents; provide explicit layout reset without resetting radio settings. Preserve user placement on ordinary activation.
- [ ] Pass scenarios at 125/150/200% Windows scaling, browser zoom, narrow/wide viewports and native single-view header merging. Confirm zero duplicate subscriptions and unchanged engine jobs after reload, update owned inventory evidence, run Release, then commit `feat: qualify appearance and persistent operating layouts`.
