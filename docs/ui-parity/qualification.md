# Foundation qualification record

Stage 1 implementation passes local packaged browser qualification on 2026-11-09: 42/42 tests across Edge, Firefox and WebKit, plus a headed Edge smoke test. Trusted cross-machine acceptance on `192.168.0.0/24` and complete normal WinForms/legacy TCI acceptance remain open. This record distinguishes synthetic presentation, host transport, native WinForms and live radio evidence. It does not certify 1:1 radio behavior.

## Build and visible result

The distribution uses Code OSS 1.146.0, revision `fdefc478b9148c1a47f913b3ec618a1226d9f600`, Node 24.22.1 and pnpm 12.16.0. Current UI build: `cac645333037c6a7841aa768524c934cd090fbe7559e36b3a4d32a4f5afa7d34`. The upstream cache fingerprint is `82ddb3c930c8e0b7ad430464f29b2ef53104577da81598f3df485a4f8bfda7ff`; packaging exposes 769 allowlisted files.

The [actual packaged browser capture](D:/workspace/Thetis/docs/ui-parity/reference/foundation-stage1.png) shows the initial layout: power/gains on the left, VFOs and synthetic plots in Console, receiver sections on the right, and host/demo status below. It was captured from Thetis's staged endpoint, not a mockup. The [historical manual picture](D:/workspace/Thetis/docs/ui-parity/reference/manual-1.1-page-10.png) remains a separate source reference.

Application customization lives in the parent-owned [host](D:/workspace/Thetis/ui/code-oss-host/src/bootstrap.ts) and [extension](D:/workspace/Thetis/ui/thetis-extension/src/extension.ts). Code's tracked sources and upstream bundle cache are unchanged. Packaging applies the guarded `webview-controller-claim-v1` [adapter](D:/workspace/Thetis/ui/code-oss-host/compat/webview-controller.mjs) to two generated webview assets. It checks the exact revision/content digests, recomputes the inline-script CSP hash and permits only a same-origin request to the existing worker. A changed upstream asset fails packaging until requalified. The final distribution therefore includes an identified compatibility adaptation.

## Local checks

| Check | Observed result | Scope |
|---|---|---|
| Required Release pipeline | Pass; subsequent builds reuse the qualified Code bundle | Native/managed build and current UI staging; [build log](D:/workspace/Thetis/build/foundation-release.log) |
| Frontend unit tests / TypeScript | 46 tests pass; strict typecheck passes | Synthetic model, ownership ledger, themes, registry, status, previews, cache and controller adaptation |
| Independent baseline / Hello World fixture | 14 baseline/setup-policy tests and 6 fixture tests pass | Discovery/validation and retained diagnostic fixture; [baseline log](D:/workspace/Thetis/build/foundation-baseline.log) |
| Static content / staging | 10 static scenarios pass; fresh/upgrade staging passes | Traversal, MIME, HEAD, missing files, complete manifest, stale root/Code removal and unowned-path rejection |
| net48 embedded hosting | Pass; zero compiler warnings/errors | Real TCP/TLS 1.2 routing, framing, malformed messages, limits, slow-drip deadline, stop/restart and coalesced header/frame preservation; [log](D:/workspace/Thetis/build/foundation-hosting.log) |
| Certificate helper | Actual isolated CA/leaf creation, validation and reuse pass | Public-only export, non-exportable keys, SAN/EKU/issuer checks and unchanged trust; owned test certificates/keys removed; [log](D:/workspace/Thetis/build/foundation-certificates.log) |
| Deployed WinForms resource reader | Pass, 32x32 startup image | [Resource probe](D:/workspace/Thetis/tests/Thetis.Resources.Tests/run.ps1) reproduces the former 4.0.0.0 reader binding failure, then passes with the deployed 10.0.0.8 redirect; [log](D:/workspace/Thetis/build/foundation-resources.log) |
| Browser matrix | 42/42 pass in 12.2 minutes; headed Edge smoke also passes | [Suite](D:/workspace/Thetis/ui/playwright.config.ts), [log](D:/workspace/Thetis/build/foundation-e2e.log), [JSON results](D:/workspace/Thetis/build/foundation-evidence/browser-results.json) and [headed log](D:/workspace/Thetis/build/foundation-headed.log) |

The TLS harness deliberately accepts its isolated, untrusted test leaf in its test client. This proves TLS transport and routing; it does not prove a browser trusts the production CA. Browser qualification keeps `ignoreHTTPSErrors: false`.

The [browser suite](D:/workspace/Thetis/ui/tests/foundation/hosting.e2e.ts) exercises the actual packaged process on `http://localhost:50001/code/`, including the browser extension worker, isolated scripted views and a custom browser-to-C# echo. The [interaction tests](D:/workspace/Thetis/ui/tests/foundation/interaction.e2e.ts) use physical browser mouse/keyboard/touch input, ready/action/acknowledgement traces, synthetic RX targeting, state restoration, disabled transmit controls, preview navigation and diagnostics beyond the former idle deadline. No forced DOM clicks or arbitrary startup sleeps qualify input.

The [layout tests](D:/workspace/Thetis/ui/tests/foundation/layout.e2e.ts) move, collapse, hide, reload and restore independent native views. [Presentation tests](D:/workspace/Thetis/ui/tests/foundation/presentation.e2e.ts) cover 1280x720, 1920x1080 and 2560x1440, 390x844 portrait touch, two independent radio/workbench themes, missing-image-independent CSS controls, browser scale factors 1/1.25/1.5/2 and blocked internet access. Chromium can expose a different DPR in isolated child frames; both ratios and canvas dimensions are recorded. These are browser-emulation checks, not physical Windows DPI or actual mobile-device acceptance.

The [lifecycle test](D:/workspace/Thetis/ui/tests/foundation/lifecycle.e2e.ts) records four cold contexts per engine. After closing each context, diagnostics must return to zero and the sole temporary HTTP client must be the health request itself. Raw startup times, browser versions, connection counts and network events are attached. [Process checkpoints](D:/workspace/Thetis/build/foundation-evidence/host-process-matrix.json) also record handles, threads, memory and loaded modules. These bounded observations do not establish an unlimited-duration leak or RF performance guarantee.

## Findings and native limitations

- Firefox remount/reload could leave an activated service worker without a controlling client. The guarded packaging adapter corrects this; browser qualification requires every initially visible scripted view to become ready.
- WebKit lost a pause click when focus reconciliation replaced the button's unchanged text node between pointer-down and pointer-up. The application now preserves unchanged text nodes. The retained failing trace records down/up at the same button without a click; the corrected physical-input test passes.
- Responsive density writes inside ResizeObserver delivery caused WebKit loop errors. Layout writes now run in the next animation frame. ResizeObserver errors remain unexpected failures, rather than being globally filtered.
- Code's [built startup policy](D:/workspace/Thetis/submodules/vscode/src/vs/workbench/browser/layout.ts) can select Explorer after a raw browser cold start. Selecting Operate again reveals the saved view state. Foundation does not force `defaultLayout` on every reload. Active-container restoration on raw cold starts remains a native limitation.
- Code collects browser state periodically, normally every five seconds, while its workbench document is focused. Closing an isolated WebKit editor can leave that document blurred. Click the empty editor and allow storage to flush, or use **Developer: Reload Window**. Raw reload while blurred/before collection can restore the last saved tab. Tests observe actual IndexedDB state; they never write private storage keys.
- Code intentionally guards the first 100 ms of native context-menu mouse-up events. Tests use ordinary keyboard menu selection. Supported restoration actions do not guarantee exact widths/all collapse states; Device can remain expanded, and a sole view can merge its header into its container.
- Source-specific Code AgentPluginService and temporary webview-document errors remain visible in raw logs. Explicit reload/close/view-disposal cancellations are recorded with their reason. Other page/resource failures fail the tests. Playwright 1.60.0 avoids the reproduced 1.61.1 Firefox worker-WebSocket observer assertion; the application applies no browser identity filter.

The earlier Hello World intermittent click misses are not retroactively attributed to one of these findings without matching evidence.

## Open acceptance

| Area | Current evidence and remaining work |
|---|---|
| Requested LAN | This host currently has `192.168.114.100`/`192.168.114.101`, with no `192.168.0.0/24` interface. No separate client on the requested subnet has been tested. Qualify wildcard DNS, trusted CA, HTTPS, extension/webview origins and WSS using the [LAN procedure](D:/workspace/Thetis/docs/ui-parity/lan-setup.md). No production trust/firewall/DNS changes were performed. |
| Normal WinForms / legacy TCI | The isolated copied-profile attempt loaded ChannelMaster, PA19, wdsp and cmASIO after the resource-reader fix, but exposed no configured listener during 45 seconds. The process was stopped, and the original database hash remained unchanged. [Probe record](D:/workspace/Thetis/build/foundation-evidence/winforms-compatibility.json). Complete a visible normal startup and actual legacy handshake/read query before claiming this compatibility dimension. |
| Current Windows reference pictures | Native computer-use capture is unavailable in this session. Historical manual PNGs and static designer/handler evidence do not substitute for current visible WinForms captures. |
| Source-to-behavior parity | The [ledger](D:/workspace/Thetis/ui/baseline/ledger.json) assigns 161 candidates and 29 detailed Console behaviors. This proves discovery consistency and ownership, not complete per-action reachability or 1:1 implementation. Preserve capability/reachability/evidence gaps in the [behavior report](D:/workspace/Thetis/docs/ui-parity/behaviors.md). |
| Radio / audio / external control | No radio model, firmware, RF calibration, audio driver, live receive/transmit timing, hardware effects or operational CAT/TCI control has been qualified. Synthetic Stage 1 tests cannot qualify them. Shared services belong to Stage 2; live reception begins in Stage 3. |
| Real displays/devices | Actual Windows scaling, intended mobile browsers and trusted remote-device behavior remain unqualified. Record browser/OS, scale, profile, skin, receiver/capabilities and units for each run. |

Stage 1 remains open until the required deployment, LAN and compatibility evidence supports completion. Keep its qualification within the [Stage 1 plan](D:/workspace/Thetis/docs/superpowers/plans/2026-11-08-code-oss-ui-step-01-foundation.md) and preserve the overall ten-stage roadmap.
