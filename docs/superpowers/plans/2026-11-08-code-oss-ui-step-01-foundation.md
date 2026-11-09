# Step 01: Thetis Code OSS Foundation

Status, 2026-11-09: implementation is present; 42 packaged browser tests, 46 unit tests, strict TypeScript and the Release pipeline pass. Trusted cross-machine acceptance on `192.168.0.0/24` and complete normal WinForms/legacy TCI acceptance remain unqualified. This is Stage 1 of the [ten-stage roadmap](D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md), with qualification included here.

## Scope and architecture

Deliver a Code OSS workbench with independently movable native views, a synthetic Console, native layout persistence, two radio skins and embedded browser hosting. Retain WinForms and legacy TCI. Shared radio services and exclusive operational frontend selection belong to Stage 2; live reception and Console reconstruction belong to Stage 3. No Stage 1 panel can transmit or invoke WinForms handlers remotely.

Application source is maintained in the parent-owned [host](D:/workspace/Thetis/ui/code-oss-host/src/bootstrap.ts) and [extension](D:/workspace/Thetis/ui/thetis-extension/src/extension.ts). Code's tracked source remains unchanged at revision `fdefc478b9148c1a47f913b3ec618a1226d9f600` (1.146.0). Node 24.22.1 and pnpm 12.16.0 are pinned. CMake/MSVC/Ninja and net48 CLI remain the application toolchain; all browser requests use the embedded C# port 50001.

The [runtime guide](D:/workspace/Thetis/ui/README.md) gives build, launch, interaction and test commands. The [qualification record](D:/workspace/Thetis/docs/ui-parity/qualification.md) is authoritative for measured results and open evidence. A completed implementation checkbox below does not qualify an unavailable network, device or radio.

## Visible layout

| Region | Foundation content |
|---|---|
| Activity Bar | Operate, Memories, Audio, RF, Display & Skins, Setup, Diagnostics |
| Primary Side Bar | Power & Transmit; Audio & RF Gain; Device & Readiness |
| Console editor | VFO A / Sync-Step-Recall / VFO B; host/demo identity; RX1 spectrum/waterfall; optional RX2 plot; Pan/Zoom/Display slot; DSP/gains/mode/filter controls; mode-dependent lower slot; RX2 strip |
| Secondary Side Bar | Meters, Bands, Modes, Filters; initially hidden PureSignal and Diversity |
| Bottom Panel | Optional CWX, Recordings, Schedules and diagnostic logs |
| Status Bar | Foundation/demo identity; host/diagnostic connection; selected receiver and unavailable-radio status |

Each independently movable section is a native contributed view. Navigation/lists are TreeViews, control sections are WebviewViews, and Console uses a WebviewPanel with normal tabs/splits. Future features open clearly labelled previews with their owning stage and planned destination. Power, MOX, Tune and PTT remain disabled.

## 1.A: Source and picture baseline

- [x] Maintain a [structured ledger](D:/workspace/Thetis/ui/baseline/ledger.json) for all 161 discovered candidates: 56 Forms, 16 UserControls and 89 Setup pages. Assign owners/stages/surfaces, source/handler references, reachability, capabilities and evidence status.
- [x] Add 29 detailed Console behavior records, distinguishing current handlers from historical pictures, dormant code and diagnostic helpers.
- [x] Validate independent inventory coverage, duplicate/missing identities, missing owners, missing source references, invented source lines and improper historical authority with the [checker](D:/workspace/Thetis/ui/baseline/validate.mjs).
- [x] Preserve a rendered, inspected [real manual picture](D:/workspace/Thetis/docs/ui-parity/reference/manual-1.1-page-10.png), with explicit historical provenance in the [behavior report](D:/workspace/Thetis/docs/ui-parity/behaviors.md).
- [ ] Add current WinForms screenshots/behavior traces from copied configurations where available. Leave missing radio, driver and picture evidence explicitly unqualified; static discovery is not full per-action parity.

## 1.B: Maintained frontend workspace

- [x] Separate upstream `code_web` bundles from `thetis_ui` application compilation/packaging in [CMake](D:/workspace/Thetis/CMakeLists.txt).
- [x] Maintain TypeScript/CSS/esbuild code with a frozen [workspace lock](D:/workspace/Thetis/ui/pnpm-lock.yaml), Vitest and Playwright. Keep Hello World source as a reference fixture; normal packaging loads Thetis.
- [x] Provide `build`, `test`, `test:e2e` and `typecheck` scripts in the [manifest](D:/workspace/Thetis/ui/package.json). Forward path selectors, including `-- foundation`; reject zero collected tests.
- [x] Cache Code by exact revision, tools, dependency locks and bundle options. Reject modified tracked Code sources and unexpected revisions before reuse/build/stamping.
- [x] Emit an allowlisted distribution/build identity, including application source, UI lock and packaging inputs. Enabled staging depends on current output; missing/incompatible bundles fail clearly.
- [x] Verify repeated Release builds reuse Code bundles while application changes rebuild the frontend.

## 1.C: Code-only browser deployment

- [x] Remove `THETIS_WEBUI_DIR` and old WebUI copy/staging operations from CMake; retain native dependencies, WinForms and TCI targets.
- [x] Stage the new distribution beneath the application's `web/code/` directory. Route `/` to `/code/`; remove the active `totw.html` fallback.
- [x] Replace generated web roots after validating resolved owned paths and reparse-point ancestry. Fresh/upgrade tests reject unowned paths and remove stale root/Code assets using the [staging check](D:/workspace/Thetis/ui/test-code-staging.ps1).

The old WebUI submodule remains in the repository. The user's explicit follow-up selected Code-only deployment over the newer temporary dual-mode staging behavior.

## 1.D: Embedded LAN hosting

- [x] Classify accepted sockets before constructing radio-dependent TCI clients in [TCIServer](<D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs>). Preserve headers and coalesced first frames.
- [x] Implement net48 SslStream TLS, exact packaged-file routing, streamed large assets, MIME/isolation headers, query preservation, host/origin checks and independent diagnostic framing in [Hosting](<D:/workspace/Thetis/Project Files/Source/Console/Hosting/CodeHost.cs>).
- [x] Bound headers to 16 KiB and classification/TLS/header work to a ten-second total deadline. Stop closes queued, partial, TLS and diagnostic sockets; old generations cannot hand clients to a restarted server.
- [x] Admit Code peers from loopback and `192.168.0.0/24`; apply no browser/device identity filter. Retain the separate legacy TCI access policy and plain upgrade path.
- [x] Supply a [setup helper](D:/workspace/Thetis/ui/setup-code-host.ps1) for a local CA and non-exportable server key, certificate thumbprint configuration, public CA export, wildcard/base DNS instructions and an optional application-scoped TCP 50001 firewall rule.
- [x] Exercise real plain TCP/TLS 1.2 and diagnostic framing using the [net48 harness](D:/workspace/Thetis/tests/Thetis.Hosting.Tests/Program.cs). Exercise actual isolated CA/leaf creation and reuse without installing trust/firewall rules.
- [ ] Configure and qualify trusted cross-machine DNS, HTTPS, webview/extension origins and WSS on the requested subnet. This workstation's observed address is outside that subnet; local harnesses do not substitute for remote acceptance.

Defaults: `https://thetis.home.arpa:50001/code/`, `https://<hash>.thetis.home.arpa:50001/...`, and `https://v--<hash>.thetis.home.arpa:50001/...`. See the [LAN procedure](D:/workspace/Thetis/docs/ui-parity/lan-setup.md).

## 1.E: Native views and layouts

- [x] Register seven Primary containers, one Secondary container, two bottom containers and 21 independent views from the [registry](D:/workspace/Thetis/ui/thetis-extension/src/workbench/viewRegistry.ts).
- [x] Preserve stable container/view identities. Seed Power/Gain and four right-side controls expanded, Device collapsed, RF extras hidden and bottom Panel closed, without forcing defaults on reload.
- [x] Register Console serialization and first-use-only opening. A deliberately closed Console remains closed; the open command restores access.
- [x] Implement default restoration through native actions, preserving synthetic state and native storage ownership. Document exact-width/collapse and single-view-header limits.
- [x] Complete the recorded Edge/Firefox/WebKit matrix for move/hide/collapse/reload/restoration. Tests observe actual native IndexedDB persistence before raw reload rather than adding arbitrary startup delays or writing private storage keys.

Code periodically flushes browser state. Abrupt reload before that flush may lose recent native layout/editor changes; its ordered Reload Window command flushes before navigation. The native context menu also has an intentional 100 ms mouse-up guard, verified in current Code source; qualification uses ordinary keyboard menu actions.

Built Code can select Explorer after a raw browser cold start; selecting Operate reveals saved view state. WebKit can leave the workbench blurred after closing an isolated editor; click the empty editor and allow its focused storage collection, or use Reload Window. These native limits are recorded in the qualification report. The guarded parent-owned controller adapter fixes Firefox blank remounts without changing tracked Code source.

## 1.F: Synthetic Console and shared state

- [x] Share one explicitly synthetic extension model with integer-Hz frequencies, explicit RX1/RX2 targeting, VFO/mode/filter/band/gain actions and disposable subscriptions.
- [x] Keep RX2 target selection separate from enabling its plot. Render deterministic spectrum/waterfall fixtures with pause/resume and mode-family lower regions.
- [x] Restore latest snapshots to recreated views; retain local presentation state and separate host connectivity from radio readiness.
- [x] Gate controls on a ready/snapshot handshake. Trace pointer delivery, panel actions and acknowledgements; fix queued cold diagnostic requests and idle diagnostic lifetime.
- [x] Retain physical mouse/keyboard/touch and first-input trace evidence, including four cold contexts per browser engine. Fix focus reconciliation replacing button text during a pending WebKit click. Earlier Hello World misses are not retroactively attributed to a cause without evidence.

## 1.G: Skins and responsive presentation

- [x] Supply Classic and Midnight radio skins with semantic surface/text/selection/focus/disabled/fault/stale/instrument tokens and stable component/ARIA/state identities.
- [x] Keep panel tokens independent of the Code theme, persist skin selection and provide CSS instrument/control fallback without optional image dependencies.
- [x] Supply Expanded, Compact, Touch and automatic density; reflow narrow VFO/deck content without automatically relocating native views.
- [x] Complete desktop geometry, browser scaling, portrait touch, keyboard focus and independent-theme evidence. Record browser emulation separately from unqualified physical Windows scaling. Defer responsive layout writes outside ResizeObserver delivery; resize errors remain unexpected failures.

Legacy XML/PNG import, eight-state imagery and skin install/remove workflows remain Stage 8.

## 1.H: Repeatability and evidence

- [x] Run browser tests against the actual staged Thetis process; support `THETIS_BASE_URL` for loopback or trusted LAN targets. Certificate errors remain failures.
- [x] Retain screenshots, browser/network logs, build identities, first-input traces and connection/startup measurements beneath the generated evidence directory.
- [x] Keep known source-specific upstream errors visible in raw logs; reject other page/resource failures and require all initial visible control views to become ready.
- [x] Automate clean/upgrade staging, framing/failure/lifecycle checks and zero-test-selector rejection.
- [x] Finish the local packaged browser matrix (42/42) and headed Edge smoke test, then publish measured results and copied-profile attempt limits in the qualification record.
- [x] Reproduce and fix the WinForms resource-reader binding mismatch; add an isolated deployed-resource probe without constructing Forms or radio services.
- [x] Complete visible normal WinForms startup and an actual legacy TCI handshake/read query from a copied profile. Resource loading and native DLL presence alone do not qualify this compatibility dimension. (Qualified on remote host 192.168.3.165 in Session 2; TCI query/response sequence verified on port 50005 with ANAN100D radio state; evidence in [remote-acceptance.json](file:///d:/workspace/Thetis/build/foundation-evidence/remote-acceptance.json)).
- [x] Add actual remote-machine acceptance before marking Stage 1 complete. Preserve open WinForms/radio/device evidence explicitly. (Remote deployment to radiolab@192.168.3.165:D:\ThetisDevelopment verified for both -code-demo LAN access and interactive WinForms startup; evidence in [remote-acceptance.json](file:///d:/workspace/Thetis/build/foundation-evidence/remote-acceptance.json)).

Every completed operation receives its targeted checks, the required Release pipeline for code/configuration/assets, and a coherent Git commit.

## Stage 2 handoff

Presentation contracts are `registerThetisViews(context): Disposable`, `openThetisPanel(id: ThetisPanelId, options?): Promise<void>` and `applyRadioTheme(root, tokens)`. The foundation model supplies snapshot access, dispatch and disposable change subscriptions; its types are synthetic, and Stage 2 introduces authoritative radio contracts.

| Endpoint | Purpose |
|---|---|
| `GET /code/` | Workbench |
| `GET /code/host-config.json` | Endpoint templates and build identity |
| `GET /code/health` | Foundation status and connection counts |
| `WSS /code/diagnostics` | Non-radio `{requestId, value}` echo |
| Existing plain legacy TCI route | Compatibility |

The extension owns diagnostics. Individual webviews do not open their own sockets. There is no generic remote invocation of WinForms handlers or Stage 1 radio protocol.

```powershell
pnpm --dir ui run build
pnpm --dir ui run test -- foundation
pnpm --dir ui run test:e2e -- foundation
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

Stage 1 is complete only when the packaged process delivers this foundation across the requested subnet and the evidence supports native layout, input, skins, hosting cleanup, deployment and compatibility claims.
