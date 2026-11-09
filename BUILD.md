# Thetis-Web Build Guide (BUILD.md)

This document provides complete instructions for building, packaging, verifying, and launching **Thetis-Web** from the command line and Visual Studio Code on Windows x64.

---

## 1. Overview & Build Architecture

The repository is completely decoupled from Visual Studio solution files (`.sln` / `.vcxproj`). It uses a modern dual-toolchain build system:
- **Native C/C++ Core (`PA19.dll`, `wdsp.dll`, `cmASIO.dll`, `ChannelMaster.dll`)**: Defined via [CMakeLists.txt](file:///d:/workspace/Thetis/CMakeLists.txt) and compiled using Microsoft Visual C++ (`cl.exe`) with the Ninja build generator.
- **Managed C# Application (`Thetis.exe`, `Midi2Cat.dll`, `RawInput.dll`)**: Defined via [`Thetis.csproj`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/Thetis.csproj) and built via modern .NET SDK CLI (`dotnet build`).
- **Code OSS Browser Workbench (`web/code/`)**: Built and packaged via [ui/build-code-web.ps1](file:///d:/workspace/Thetis/ui/build-code-web.ps1) and [ui/build-ui.ps1](file:///d:/workspace/Thetis/ui/build-ui.ps1), then staged alongside native DLLs.

---

## 2. Prerequisites

Ensure the following tools are installed on your Windows 10/11 64-bit system:

| Tool / Dependency | Minimum Version | Description |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 / 11 64-bit | Required target runtime (x64) |
| **MSVC Toolchain** | Visual Studio 2022 or Build Tools | Workload: "Desktop development with C++" (MSVC v143 and Windows SDK) |
| **CMake** | >= 3.20 | Native build definition system |
| **Ninja** | >= 1.10 (recommended) | Fast parallel build execution engine |
| **.NET SDK** | 8.0 / 9.0 / 10.0 | Provides `dotnet build` with .NET Framework 4.8 targeting |
| **Git** | Latest | Required for source control and Submodule synchronization |
| **Node.js & pnpm** | Node 24.22.1 / pnpm 12.16.0 | Pinned tools for Code OSS Web UI (automatically managed by scripts) |

---

## 3. Quick Start: One-Click Build Scripts

The repository includes automated build scripts that detect Visual Studio toolchain paths, synchronize submodules, restore NuGet packages, compile native and managed targets, and stage runtime files.

### Using PowerShell (Recommended):
```powershell
# Full build: native core DLLs, managed C# Thetis.exe, and staged web assets (Release)
.\build.ps1 -All -Config Release

# Fast native-only build: recompile C/C++ DSP and channel router DLLs
.\build.ps1 -Config Release

# Debug configuration build
.\build.ps1 -All -Config Debug

# Clean build cache
.\build.ps1 -Clean
```

### Using Command Prompt (CMD):
```cmd
:: Full Release build
build.bat Release all

:: Native core only
build.bat Release

:: Full Debug build
build.bat Debug all

:: Clean build directory
build.bat clean
```

> [!NOTE]
> The build scripts automatically detect and terminate any running `Thetis.exe` instances to prevent Windows file-lock errors (`Permission denied` on `PA19.dll` or `Thetis.exe`).

---

## 4. Visual Studio Code Integration

Pre-configured development tasks and launch profiles are available in `.vscode/`:

1. **Default Build**: Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> to run `Build All (Release)`.
2. **Task Palette**: Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, select `Tasks: Run Task`:
   - `Build All (Release)`: Full native and managed compilation.
   - `Build Native Core Only (CMake)`: Incremental C/C++ compilation.
   - `Build C# Thetis Only (dotnet)`: Incremental C# compilation.
   - `Build Code OSS Web Demo`: Compiles Code OSS browser workbench and UI host.
   - `Clean Build Directory`: Deletes `build/` cache.
3. **Debugging / Running**: Select from the Run & Debug panel (<kbd>F5</kbd>):
   - `Launch Thetis (Release)`: Runs full radio application with WebUI enabled (`-web`).
   - `Launch Code OSS Web Demo (no radio)`: Runs diagnostic Web host without hardware (`-code-demo`).

---

## 5. Step-by-Step Manual Command-Line Build

To build manually or integrate with CI/CD environments:

```powershell
# Step 1: Synchronize Git submodules
git submodule update --init --recursive

# Step 2: Restore C# NuGet dependencies
nuget restore "Project Files/Source/Console/Thetis.csproj" -PackagesDirectory "Project Files/Source/packages"

# Step 3: Configure CMake with MSVC and Ninja
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=cl -DCMAKE_CXX_COMPILER=cl

# Step 4: Build native C/C++ targets (ChannelMaster, wdsp, cmASIO, PA19)
cmake --build build --target native_core

# Step 5: Build C# managed application via dotnet CLI
dotnet build "Project Files/Source/Console/Thetis.csproj" -c Release -p:Platform=x64

# Step 6: Stage binaries and dependencies to execution folder
cmake --build build --target stage_to_project_bin
```

---

## 6. Code OSS Browser Workbench Build

To build or refresh the new Code OSS browser workbench foundation:

```powershell
# 1. Build upstream Code OSS web bundle
powershell -NoProfile -ExecutionPolicy Bypass -File ./ui/build-code-web.ps1

# 2. Build Thetis extension, theme tokens, and custom browser host
powershell -NoProfile -ExecutionPolicy Bypass -File ./ui/build-ui.ps1

# 3. Stage web assets to Thetis execution folder
powershell -NoProfile -ExecutionPolicy Bypass -File ./ui/stage-code-web.ps1 -Destination "Project Files/bin/x64/Release/web"
```

---

## 7. Verification & Automated Tests

Run test suites before committing changes:

```powershell
# 1. Run Thetis.Hosting C# integration test suite
powershell -NoProfile -ExecutionPolicy Bypass -File tests/Thetis.Hosting.Tests/run.ps1

# 2. Run UI frontend Vitest unit test suite (38 tests)
& './build/tools/node-v24.22.1-win-x64/node.exe' ui/scripts/test.mjs unit
```

---

## 8. Launching Thetis

### Mode A: Code OSS Browser WebUI Diagnostic (No Radio Required)
Starts Thetis loopback Web and WebSocket host on port 50001 without initializing SDR hardware:
```powershell
& './Project Files/bin/x64/Release/Thetis.exe' -code-demo
```
- Browser URL: [http://localhost:50001/code/](http://localhost:50001/code/)
- Health Check: [http://localhost:50001/code/health](http://localhost:50001/code/health)

### Mode B: Full Radio Operation with WebUI
Starts SDR hardware processing and enables WebUI server on port 50001:
```powershell
& './Project Files/bin/x64/Release/Thetis.exe' -web
```
- Code OSS UI: [http://localhost:50001/code/](http://localhost:50001/code/)
- Classic TOTW WebUI: [http://localhost:50001/](http://localhost:50001/)
- Desktop WinForms UI: Displayed on local screen.

### Mode C: Standard Desktop WinForms Mode
```powershell
& './Project Files/bin/x64/Release/Thetis.exe'
```

---

## 9. Troubleshooting

### Q1: `Permission denied` when copying `PA19.dll` or `Thetis.exe`
- **Cause**: A previous instance of `Thetis.exe` is still running in the background, locking native DLLs and the executable.
- **Fix**: Run `Stop-Process -Name Thetis -Force -ErrorAction SilentlyContinue`, then restart the build.

### Q2: Missing submodules during build
- **Cause**: Submodule repositories have not been cloned or updated.
- **Fix**: Run `git submodule update --init --recursive`.

### Q3: Missing `cl.exe` or Visual Studio environment variables
- **Cause**: Building from a command prompt without MSVC environment initialized.
- **Fix**: Use [build.ps1](file:///d:/workspace/Thetis/build.ps1) or [build.bat](file:///d:/workspace/Thetis/build.bat), which automatically detect and load `vcvarsall.bat x64`.
