# Code OSS browser Hello World

This diagnostic builds the checked-out [Code OSS source](<D:/workspace/Thetis/submodules/vscode>) and loads the [Hello World browser extension](<D:/workspace/Thetis/ui/hello-world/package.json>) in its real browser extension host. The extension opens an editor webview, contributes `Thetis: Hello World` to the command palette, adds a status-bar entry, and exchanges messages with its panel.

Thetis serves the distribution at [http://localhost:50001/code/](http://localhost:50001/code/). The `-code-demo` startup branch in [console.cs](<D:/workspace/Thetis/Project Files/Source/Console/console.cs>) enters the loopback diagnostic listener in [TCIServer.cs](<D:/workspace/Thetis/Project Files/Source/Console/TCIServer.cs>) before creating the Console form. This mode initializes no radio engine and starts no second web server. Stop any running Thetis instance before switching modes. The normal WinForms and legacy WebUI startup paths are retained.

## Build and run

From the repository root on Windows x64:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./ui/build-code-web.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
& './Project Files/bin/x64/Release/Thetis.exe' -code-demo
```

Open [the browser demo](http://localhost:50001/code/). Click **Test Extension Host**; the text changes to `Extension host replied: 1`, then increments on subsequent clicks. Close the editor tab and use **Thetis: Hello World** from the command palette, or click the status-bar entry, to reopen it.

The [build script](<D:/workspace/Thetis/ui/build-code-web.ps1>) downloads the Node version in [`.nvmrc`](<D:/workspace/Thetis/submodules/vscode/.nvmrc>) and pnpm version in [Code's package manifest](<D:/workspace/Thetis/submodules/vscode/package.json>) into the ignored build tools directory. It verifies the archives, installs frozen dependencies with install scripts disabled, and invokes the upstream `build/next/index.ts bundle --target web --out out-vscode-web --nls` target. It builds the browser workbench and its workers, rather than an Electron desktop executable. Native Node add-ons, all bundled language extensions, and Copilot extensions are unnecessary for this test and are not built.

The [packager](<D:/workspace/Thetis/ui/package-code-web.mjs>) assembles browser runtime dependencies, upstream license notices, two theme extensions, the host page, and Hello World. The normal CMake `stage_to_project_bin` target stages the result to the runtime web directory. Build outputs and dependency caches stay ignored; the Code OSS submodule's tracked sources are unchanged.

The [VS Code tasks](<D:/workspace/Thetis/.vscode/tasks.json>) provide **Build Code OSS Web Demo**, and the [launch configurations](<D:/workspace/Thetis/.vscode/launch.json>) provide **Launch Code OSS Web Demo (no radio)**. CMake also exposes the optional `code_web` target. Build the browser demo once before launching; the normal Release build stages the cached distribution without rebuilding Code.

For extension/host changes only, use the pinned Node executable to run the packager again, then run the normal Thetis Release build. For upstream Code changes, rerun the build script; `-SkipInstall` skips only dependency installation.

## Verification

```powershell
./build/tools/node-v24.22.1-win-x64/node.exe --test ui/hello-world/test/extension.test.js
pwsh -NoProfile -File ./ui/test-static-content.ps1
# Start Thetis -code-demo before this browser test; Microsoft Edge must be installed.
./build/tools/node-v24.22.1-win-x64/node.exe ./ui/test-code-web.mjs
```

The [extension tests](<D:/workspace/Thetis/ui/hello-world/test/extension.test.js>) cover command reuse, disposal, panel reopening, CSP, and the button message exchange. The [static responder tests](<D:/workspace/Thetis/ui/test-static-content.ps1>) cover ten HTTP scenarios, including traversal rejection, directory indexes, HEAD, WebAssembly MIME types, and worker isolation headers. The [Edge test](<D:/workspace/Thetis/ui/test-code-web.mjs>) checks workbench startup, two actual webview/worker message exchanges, command reuse, reload, uncaught page errors, and failed local resources. It saves screenshots and browser logs in the ignored build test directory.

On 2026-11-09, Code OSS 1.146.0 at `fdefc478b9148c1a47f913b3ec618a1226d9f600`, the full Thetis Release pipeline, six extension tests, and ten static-response scenarios passed. The final Edge flow passed four consecutive fresh-browser runs, including reload, with zero page/network failures. Earlier runs intermittently missed the first button reply. The test now waits for Code's visible `active-frame`, and panel/host message traces are retained; the cause of the earlier intermittent failure is not established. Continue startup/input qualification when extending this diagnostic.

## Scope and limitations

This proves the extension-based browser workbench approach. It does not implement the radio UI, a headless radio backend, or remote/LAN deployment. Loopback HTTP and `*.localhost` provide the secure contexts required by browser workers, cryptography, and webview service workers. A later network deployment needs HTTPS and controlled isolated webview origins.

Code OSS currently logs background AI customization file-watcher errors for unavailable local `.copilot`, `.claude`, and `.agents` folders, a missing remote-agent/debugging warning, and web shutdown/sandbox warnings. These originate in the unmodified upstream workbench and do not prevent the tested Hello World flow; raw console messages are retained in the test log. The test rejects uncaught JavaScript errors and failed local asset loads.

The mandatory full Release build exposed a missing resource serialization setting in the existing C# project. The [project](<D:/workspace/Thetis/Project Files/Source/Console/Thetis.csproj>) now enables preserialized resources using its existing `System.Resources.Extensions` dependency so the .NET SDK CLI build succeeds.
