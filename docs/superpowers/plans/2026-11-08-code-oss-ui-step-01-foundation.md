# Step 01: Baseline, Workbench and Embedded Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Track work with checkboxes. This is a future plan, not implementation authorization or test evidence.

**Goal:** Establish traceable WinForms behavior and a real multi-section Code browser workbench delivered by Thetis, with stable layout and skin foundations.

**Architecture:** Package the pinned standalone workbench with a parent-owned host and browser extension. Register independently addressable native views around a synthetic Console editor, use diagnostic C# messages until Step 02 supplies radio services, and serve all runtime assets through the existing port.

**Tech Stack:** Existing CMake/MSVC/Ninja and net48 C#; browser TypeScript/CSS, esbuild, Vitest and Playwright. Use the checked-out Code [packageManager][code-package] and [.nvmrc][node-version] pins, presently pnpm 12.16.0 and Node 24.22.1; lock new frontend dependencies before CI.

**Spec:** [Overall layout and ten-step baseline][overview], [source inventory][inventory], [source architecture analysis][analysis].

## Global Constraints

- Keep upstream Code source untouched for ordinary UI changes; all custom source belongs to the parent repository.
- Embedded C# HTTP/WebSocket delivery remains port 50001; no production Node/Python/Kestrel server or Code remote authority.
- Preserve net48/native ABI, established build/staging declarations, comments/licensing and WinForms behavior. Do not create IDE artifacts.
- Use actual source/manual screenshots as reference, copied test configurations, and explicit capability/qualification records. Never energize a radio to prove a synthetic shell.
- Every implementation operation passes the required Release pipeline and its targeted checks before a coherent commit. No product implementation is performed by writing this plan.

## Review Focus

1. A workbench loads but its webview origin/service worker fails: require a scripted custom panel and local-resource round-trip.
2. A user hides/moves/collapses views: preserve preferences without altering radio state or forcing layout on reload.
3. Asset requests become radio clients or leak threads: classify HTTP/upgrades early and verify cleanup.
4. A skin/CDN/font is missing offline: report/fallback predictably and require no third-party runtime resource.
5. Historical pictures differ from current code: ledger distinguishes current, historical, conditional and dormant behavior.

## Files and interfaces

Proposed create: `ui/package.json`, `ui/pnpm-workspace.yaml`, `ui/pnpm-lock.yaml`, `ui/playwright.config.ts`, `ui/vitest.config.ts`; `ui/code-oss-host/index.html`, `src/bootstrap.ts`; `ui/thetis-extension/package.json`, `src/extension.ts`, `src/workbench/viewRegistry.ts`, `panelRegistry.ts`, `src/theme/tokens.ts`, `radioTheme.ts`; `ui/tests/foundation/hosting.e2e.ts`, `layout.e2e.ts`, `theme.test.ts`, `baseline.test.ts`; `docs/ui-parity/behaviors.md` and `docs/ui-parity/qualification.md`.

Proposed managed create: `Project Files/Source/Console/Hosting/EmbeddedAssetRouter.cs` and `DiagnosticChannel.cs`. Modify [TCIServer][tci], [Thetis.csproj][project], [CMake][cmake], [presets][presets] and [build.ps1][build] only as needed for deterministic packaging/staging.

Proposed exports: `registerThetisViews(context): Disposable`, `openThetisPanel(id: string, options?: {beside?: boolean}): Promise<void>`, `applyRadioTheme(root: HTMLElement, tokens: RadioThemeTokens): void`. The registry owns native view/panel IDs from the overview. `DiagnosticEcho {requestId: string; value: string}` is an isolated non-radio message, not the Step 02 application protocol.

Define `ui/package.json` scripts `build`, `test` (Vitest run), `test:e2e` (Playwright test), forwarding selectors so later plans' `pnpm --dir ui run test -- <feature>` and `test:e2e -- <feature>` commands have one meaning. An E2E runner may use Node; the pages under qualification must come from C#, not a Node dev server.

Configure Vitest for `**/*.test.ts` and the domain-local `thetis-extension/src/{rf,skins,display,gadgets}/**/*.spec.ts`; exclude browser E2E files. Configure Playwright for `tests/foundation/*.e2e.ts`, `thetis-extension/test/e2e/**/*.spec.ts` and `tests/e2e/**/*.e2e.ts`. Positional selectors below match file paths, not invented scenario aliases. Require nonzero collected tests. Initialize the minimal test workspace/runner with Task 1; Task 2 extends it with production build/packaging.

## Task 1: Build the interaction and picture baseline

- [ ] Create the minimal test workspace/runner declared above and ledger rows for each [inventory][inventory] candidate: old control/handler, real screenshot/manual page, new view/editor ID, initial state/action/result, units/ranges, persistence, capability, external mapping and test. Validate duplicate/missing owners with a small checker in the UI test command; production packaging follows in Task 2.
- [ ] Read [Console resource geometry][resources] and [manual][manual] screenshots with current handlers; classify historical Wave/spot UI, dormant rxa, unfinished frmFilterManager and diagnostic helpers. Capture Windows reference fixtures from copied profiles before real radio integration; mark evidence not yet obtainable as unqualified.
- [ ] Test `baselineEveryActiveSurfaceHasAnOwner` and `historicalScreenshotDoesNotOverrideCurrentHandler`, including an intentionally unassigned row that must fail. Run `pnpm --dir ui run test -- foundation` after the runner exists; restore a complete ledger and require pass.
- [ ] Record hardware/driver/browser variants and measured numerical/timing baseline fields, without inventing tolerances. Commit the baseline/checker as one completed operation after applicable checks.

## Task 2: Package the standalone workbench and browser extension

- [ ] Write failing `packagedHostUsesLocalBrowserExtension` and `hostDoesNotConfigureCodeRemoteAuthority` tests against a staged fixture manifest. Missing local extension or a TCI endpoint configured as remoteAuthority must fail.
- [ ] Determine the pinned [web packaging prerequisites][web-build] on a clean checkout; the presence of a gulp target alone is not a complete recipe. Package the standalone web entry and matching assets, not upstream server-template HTML. Keep generated output in build caches and stage only distribution files.
- [ ] Create the parent host/extension and use [additionalBuiltinExtensions][embedder] plus configuration defaults. Pin dependencies/lockfile, expose the UI scripts above, and connect package/staging checks to the established build declarations. Code itself rebuilds only when its pin/package changes.
- [ ] Run targeted tests, `pnpm --dir ui run build`, and the full Release command below; verify staged runtime assets, then commit the packaging operation.

## Task 3: Implement native region/section registrations and skin tokens

- [ ] Add failing `nativeSectionsHaveIndependentIds`, `containerIdsMatchPinnedSchema`, `collapsedDeviceViewStaysCollapsedOnReload`, `moveAndHideDoesNotRecreateEngine` and `singleRemainingViewUsesNativeHeaderBehavior` cases. Container IDs must match the pinned schema's alphanumeric/underscore/hyphen rule; dotted IDs remain valid view IDs but must not be used for containers.
- [ ] Register the overview's Primary containers, Secondary receiverControls and bottom tasks/logs containers with [contribution points][views]. Use independent WebviewViews for control sections and native TreeViews for navigation/lists. Open the synthetic Console through createWebviewPanel, with real native tabs/splits.
- [ ] Seed Expanded layout only on first open. Do not list collapsed sections in defaultLayout.views or force the seed on normal startup. Implement the explicitly presentation-only restore command through supported actions; respect native single-view header/hide exceptions.
- [ ] Define semantic surface/text/selection/disabled/focus/fault and instrument color tokens in the proposed theme files, plus stable component/state IDs for later legacy skin mapping. Keep workbench theme separate. Test two contrasting skins, missing-asset fallback and theme changes without losing synthetic panel state; pass and commit this operation.

## Task 4: Prove embedded resource, worker and diagnostic routing

- [ ] Write failing `scriptedPanelLoadsThrough50001`, `webviewAssetAndWorkerLoadOffline`, `diagnosticEchoReturnsSameRequestId`, `assetLoadDoesNotCreatePersistentTciClient` and `unknownAssetCannotEscapeStagingRoot` checks. Exercise query preservation, MIME, host validation and malformed requests.
- [ ] Add early HTTP/upgrade classification around [current dispatch][dispatch], canonical asset routing and required MIME/headers. Reserve a diagnostic path separately from legacy TCI upgrades. Preserve existing TCI clients, audio/IQ framing and cleanup.
- [ ] Supply locally packaged hashed-hostname webview endpoints matching the pinned [origin check/service worker][webview]. Test candidate wildcard localhost resolution/secure context. If it fails, resolve within the supported architecture before implementing radio panels; never remove origin checks to force a demonstration.
- [ ] Exercise cold load/reload, panel recreation and offline loading in visible Edge/Chrome. Record loopback separately from LAN; secure remote support must additionally prove trusted HTTPS/WSS/wildcard names and coexistence with legacy plain TCI on the same port. Run foundation E2E, full Release and cleanup checks, then commit.

## Embedded qualification and handoff

Pass requires real Primary/Secondary/bottom registrations, an activating browser extension, scripted webview/resource/service-worker loading and diagnostic echo on Thetis's actual endpoint. Inspect screenshots and console/network failures at the overview's size/scaling matrix. Test two or more views, a single remaining view, region closure, movement, saved state, explicit restore and offline startup. Record process/thread/client counts before/after repeated loads and preserve legacy TCI behavior.

```powershell
pnpm --dir ui run test -- foundation
pnpm --dir ui run test:e2e -- foundation
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

These commands are future acceptance commands, not results of this documentation task. Step 02 consumes the proven host, view IDs, theme contract, test scripts and ledger; it replaces diagnostic data with authoritative application services.

[overview]: <D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md>
[inventory]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md>
[analysis]: <D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-reconstruction-design.md>
[manual]: <D:/workspace/Thetis/Documentation/Radio/Thetis manual_1.1.pdf>
[resources]: <D:/workspace/Thetis/Project Files/Source/Console/console.resx>
[code-package]: <D:/workspace/Thetis/submodules/vscode/package.json:3>
[node-version]: <D:/workspace/Thetis/submodules/vscode/.nvmrc:1>
[web-build]: <D:/workspace/Thetis/submodules/vscode/build/gulpfile.vscode.web.ts:95>
[embedder]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/web.api.ts:249>
[views]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/api/browser/viewsExtensionPoint.ts:60>
[webview]: <D:/workspace/Thetis/submodules/vscode/src/vs/workbench/contrib/webview/browser/pre/index.html:350>
[dispatch]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:2982>
[tci]: <D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs:1882>
[project]: <D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>
[cmake]: <D:/workspace/Thetis/CMakeLists.txt>
[presets]: <D:/workspace/Thetis/CMakePresets.json>
[build]: <D:/workspace/Thetis/build.ps1>
