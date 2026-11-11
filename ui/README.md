# Thetis Code OSS Foundation

The maintained frontend is a browser extension in [thetis-extension](D:/workspace/Thetis/ui/thetis-extension/package.json), loaded by the parent-owned [embedding host](D:/workspace/Thetis/ui/code-oss-host/src/bootstrap.ts). Code OSS supplies native containers, views, editor tabs, splits and layout storage. Custom radio controls run in isolated webviews. Ordinary UI development leaves the Code submodule unchanged.

The Console is explicitly synthetic. Power, MOX, Tune and PTT remain disabled. Stage 2 owns shared radio services and frontend selection; Stage 3 owns live reception and Console reconstruction. See the [ten-stage roadmap](D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-reconstruction.md).

## Build and launch

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
& './Project Files/bin/x64/Release/Thetis.exe' -code-demo
```

Open [the workbench](http://localhost:50001/code/). Demo mode starts the embedded C# listener on port 50001 before creating Console or initializing native radio libraries. Stop Thetis before rebuilding or switching to normal WinForms startup. The build script stops it automatically.

Pins: Code OSS 1.146.0, revision `fdefc478b9148c1a47f913b3ec618a1226d9f600`, Node 24.22.1 and pnpm 12.16.0. [build-code-web.ps1](D:/workspace/Thetis/ui/build-code-web.ps1), CMake target `code_web`, builds upstream browser bundles and caches them by revision, tools, locks and options. `-RebuildCode` invalidates the cache. [build-ui.ps1](D:/workspace/Thetis/ui/build-ui.ps1), target `thetis_ui`, restores the frozen frontend lock and packages application code with cached Code bundles. Enabled staging depends on current output and fails for missing/incompatible bundles. [build.mjs](D:/workspace/Thetis/ui/build.mjs) emits the identity and public-file allowlist.

For frontend development:

```powershell
$env:PATH = "$PWD/build/tools/node-v24.22.1-win-x64;$env:PATH"
node build/tools/pnpm-12.16.0/package/bin/pnpm.mjs --dir ui run build
node build/tools/pnpm-12.16.0/package/bin/pnpm.mjs --dir ui run test -- foundation
node build/tools/pnpm-12.16.0/package/bin/pnpm.mjs --dir ui run typecheck
```

UI changes reuse Code bundles. Run the full Release pipeline to stage changes beneath `Project Files/bin/x64/Release/web/code/` before browser qualification. No Node process serves requests. [Tasks](D:/workspace/Thetis/.vscode/tasks.json) separate upstream bundles from application UI; the [Foundation launch](D:/workspace/Thetis/.vscode/launch.json) builds before starting demo mode.

## Workbench behavior

The Activity Bar exposes Operate, Memories, Audio, RF, Display & Skins, Setup and Diagnostics. Operate initially has Power & Transmit and Audio & RF Gain expanded, Device & Readiness collapsed. Receiver Controls on the right has Meters, Bands, Modes and Filters. PureSignal and Diversity start hidden. CWX, Recordings, Schedules and logs occupy optional bottom containers.

Each section is an independent native TreeView or WebviewView. Console occupies a normal editor tab. Use native menus/title bars to move, hide or collapse views. Code persists those choices. Console opens on first use; its serializer restores an open tab. A deliberately closed Console stays closed. **Thetis: Open Console** reopens it. **Thetis: Restore Default Layout** resets native view locations, reveals default sections, closes the bottom Panel and opens Console. Public APIs do not reset exact widths/every collapse state; Device may remain expanded. A single visible view can merge its header into its container.

Native browser storage flushes asynchronously, normally every five seconds. Abrupt reload before that flush can lose recent layout/editor changes; qualification waits for actual IndexedDB state, without writing native storage keys. The native **Developer: Reload Window** command takes Code's ordered shutdown/flush path. Code also guards the first 100 ms of context-menu mouse-up events; keyboard menu actions provide deterministic native input during automation.

Periodic collection also requires the workbench document to have focus. WebKit can leave that document blurred after closing an isolated webview. Click the empty editor to return focus and allow storage to flush, or use **Developer: Reload Window**. Reloading while blurred can restore the last saved tab. Qualification records this native limitation and uses physical workbench input before observing saved state.

Built Code can select Explorer after a raw browser cold start even when Operate was selected before reload. Its [startup policy](D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/layout.ts) distinguishes cold starts from **Developer: Reload Window**. Selecting Operate again reveals the persisted view locations, visibility and collapse state. Foundation preserves this upstream policy rather than forcing the initial layout on every activation; active-container selection after raw reload is a known limitation.

VFO edits use integer Hz. Receiver selection targets synthetic mode/filter/band/gain actions; selecting RX2 does not enable its plot. Recreated panels receive the latest shared snapshot. Plots can be paused. Classic/Midnight skins affect panel tokens independently of the workbench theme. Automatic, Expanded, Compact and Touch densities are available. Legacy XML/PNG import belongs to Stage 8.

Controls enable after a ready/snapshot handshake. Pointer/focus/action/acknowledgement traces appear in **Thetis: Show Interaction Trace** and Sequence / Interaction Trace. The extension owns one non-radio diagnostic socket; webviews communicate through it.

## Embedded endpoints and LAN

| Endpoint | Purpose |
|---|---|
| `/code/` | Workbench |
| `/code/host-config.json` | Endpoint templates and build identity |
| `/code/health` | Connection counts and radio-initialization status |
| `/code/diagnostics` | Diagnostic WebSocket echo |
| Existing plain TCI upgrade route | Legacy TCI compatibility in normal mode |

Code hosting admits loopback and `192.168.0.0/16`, including the lab's `192.168.3.0/24` and workspace's `192.168.114.0/24`, with no browser/device identity filter. The firewall helper uses the same `/16` scope. Existing TLS behavior is unchanged; further TLS/DNS qualification work was stopped at the user's direction on 2026-11-12. The [procedure](D:/workspace/Thetis/docs/ui-parity/lan-setup.md) and [helper](D:/workspace/Thetis/ui/setup-code-host.ps1) remain available for explicit use. Defaults: `thetis.home.arpa`, `*.thetis.home.arpa`, port 50001. Private keys stay in the Windows certificate store; only the public CA certificate is exported. Trust installation and the application-scoped firewall rule are explicit options.

Clients must resolve base/wildcard names and reach the server directly. Proxy bypass rules may need both names. Automation disables the isolated Firefox test profile's system proxy because this workstation's proxy intercepts hashed `.localhost` requests. Windows proxy settings and application policy remain unchanged.

## Verification

Start staged demo mode before browser tests:

```powershell
node build/tools/pnpm-12.16.0/package/bin/pnpm.mjs --dir ui run test:e2e -- foundation
powershell -NoProfile -ExecutionPolicy Bypass -File tests/Thetis.Hosting.Tests/run.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tests/Thetis.Resources.Tests/run.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ui/baseline/test-setup-certificates.ps1
node --test ui/baseline/*.test.mjs
pwsh -NoProfile -File ui/test-static-content.ps1
```

The hosting harness stops Thetis; restart it before later browser runs. [Playwright](D:/workspace/Thetis/ui/playwright.config.ts) accepts `THETIS_BASE_URL` for trusted LAN HTTPS; certificate errors fail tests. Install Playwright engines as development tools; Edge must be installed locally. Screenshots, raw browser/network logs, traces and results go beneath `build/foundation-evidence/`. Known upstream messages remain visible; unexpected failures require investigation.

The net48 harness tests real TCP/TLS 1.2, framing, header/frame preservation, restrictions and stop/restart cleanup. It creates/removes an isolated leaf certificate. The helper integration test creates/reuses an isolated CA/leaf pair, checks non-exportable keys and unchanged trust, then removes test certificates. Neither configures production DNS/trust/firewall rules.

The resource probe runs an isolated net48 AppDomain with the staged application's binding policy and reads the Database Manager startup image. It constructs no radio services or Forms. It guards the resource-reader version redirect required by CLI-generated resources and the deployed dependency version; it does not qualify a complete visible WinForms startup.

The [qualification record](D:/workspace/Thetis/docs/ui-parity/qualification.md) separates local automation from remote-client, WinForms and hardware evidence. A TLS harness does not establish trusted cross-machine browser acceptance. Historical pictures do not override current reachable handlers. The original [Hello World extension](D:/workspace/Thetis/ui/hello-world/package.json) and host remain reference fixtures; normal packaging loads Thetis.

Playwright is pinned to 1.60.0 after reproducing an assertion in 1.61.1's Firefox worker-WebSocket observer. [The 1.60 observer source](https://github.com/microsoft/playwright/blob/v1.60.0/packages/playwright-core/src/server/firefox/ffPage.ts) predates that path. Exact Code AgentPluginService and temporary WebKit webview errors are classified by [source-specific checks](D:/workspace/Thetis/ui/tests/foundation/browser-errors.ts), retained in raw evidence, and never used to accept a missing visible panel.

The parent-owned [controller compatibility adapter](D:/workspace/Thetis/ui/code-oss-host/compat/webview-controller.mjs) fixes an activated service worker failing to control a remounted Firefox webview. Packaging adapts two generated copies, validates the exact Code revision and normalized upstream asset digests, and recalculates the strict inline-script CSP digest. A same-origin message asks the existing worker to claim its own scope. Code's tracked source and cached upstream bundles remain unchanged. Build metadata identifies the adapter; a Code update or changed asset fails packaging until requalified. No browser policy, origin check or certificate validation is disabled.
