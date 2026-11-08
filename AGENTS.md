# AGENTS.md

> **Target Environment:** Windows 10/11 x64 | CMake + MSVC + Ninja | .NET SDK CLI | VS Code

---

## 1. Core Architectural Tenets

1. **Strictly Decoupled from Visual Studio IDE**:
   The repository has been permanently migrated from legacy Visual Studio solutions to a modern, decoupled **CMake + MSVC + .NET CLI** toolchain. Development is centered around **Visual Studio Code** and CLI automation.
2. **Embedded Single-Port WebUI Integration**:
   The WebUI ([thetis-on-the-web](file:///d:/workspace/Thetis/submodules/thetis-on-the-web)) is embedded as a Git Submodule and served directly by Thetis on port 50001 via HTTP/WebSocket multiplexing. No secondary web server (Node.js, Python, etc.) is allowed for runtime operation.
3. **Zero Configuration Drift**:
   All build and debug tasks are declaratively defined in [CMakeLists.txt](file:///d:/workspace/Thetis/CMakeLists.txt), [CMakePresets.json](file:///d:/workspace/Thetis/CMakePresets.json), and [.vscode/](file:///d:/workspace/Thetis/.vscode/).

---

## 2. Invariant Rules (NON-NEGOTIABLE)

### Rule 1: NEVER Reintroduce Visual Studio IDE Artifacts
- **Forbidden Files**:
  - Do NOT generate, restore, or commit `.sln`, `.vcxproj`, `.vcxproj.filters`, `.vcxproj.user` files.
  - Do NOT commit `.vs/` directories.
- **Native C/C++**:
  - All native libraries (`ChannelMaster.dll`, `wdsp.dll`, `cmASIO.dll`, `PA19.dll`) must be declared and maintained purely through [CMakeLists.txt](file:///d:/workspace/Thetis/CMakeLists.txt) and its sub-directory CMakeLists files.
- **Managed C#**:
  - Maintained purely through [`Thetis.csproj`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/Thetis.csproj) and built via `dotnet build` or MSBuild CLI.

### Rule 2: Strict Directory & Staging Layout
The repository follows a strict separation between source trees, build caches, and the runtime deployment folder:
- **Source Code**:
  - Native C/C++ sources: [Project Files/Source/](file:///d:/workspace/Thetis/Project%20Files/Source/) (`ChannelMaster/`, `wdsp/`, `cmASIO/`, `portaudio/`)
  - Managed C# sources: [Project Files/Source/Console/](file:///d:/workspace/Thetis/Project%20Files/Source/Console/)
- **Runtime Deployment Root (`Project Files/bin/x64/<Config>/`)**:
  - Thetis expects all runtime assets in its execution folder.
  - `Thetis.exe`, native DLLs (`*.dll`), skins (`Skins/`), wisdom files (`Wisdom/`), and WebUI files (`web/`) must be staged here.
  - Native build artifacts must be staged using the CMake target `stage_to_project_bin`.
- **Git Submodules (`submodules/`)**:
  - [submodules/thetis-on-the-web](file:///d:/workspace/Thetis/submodules/thetis-on-the-web) is tracked as an independent Git Submodule.
  - Do NOT commit uncommitted direct file modifications from the submodule into the parent repository commits. Manage upstream pull requests or submodule pointers cleanly.

### Rule 3: Single-Port Multiplexing Architecture (Port 50001)
- [`TCIServer.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/TCIServer.cs) is the authoritative implementation for the embedded WebUI and TCI server.
- Standard HTTP 1.1 GET requests: Handled by `sendHttpResponse()` to serve static WebUI files directly from `web/`.
- WebSocket upgrade requests: Upgraded via RFC 6455 to full-duplex TCI protocol for binary IQ/Audio streams and rig control.
- Never add external web servers (e.g. Node.js, Express, Python Flask, Kestrel) for WebUI delivery in production runtime.

### Rule 4: Windows Process Lifecycle & File Lock Prevention
- On Windows, running `Thetis.exe` locks itself and all loaded native DLLs (`PA19.dll`, `wdsp.dll`, etc.).
- Attempting to build or stage while `Thetis.exe` is running results in fatal `Permission denied` errors.
- Protocol:
  - Always terminate running `Thetis.exe` instances before compiling or copying files.
  - [build.ps1](file:///d:/workspace/Thetis/build.ps1) and [build.bat](file:///d:/workspace/Thetis/build.bat) include automated process termination (`Stop-Process -Name Thetis -Force`). AI agents must utilize these scripts or terminate the process before running builds.

---

## 3. Build & Verification Protocol for AI Agents

Whenever making changes to code, project configuration, or assets, AI agents MUST execute and pass the following verification pipeline before declaring completion:

### Primary Verification Command:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./build.ps1 -All -Config Release
```

---

## 4. Code Standards & Conventions

### C / C++ Native Core
- **Toolchain**: Microsoft Visual C++ (`cl.exe`) x64.
- **Language Standards**: C99 for DSP cores (`wdsp`, `ChannelMaster`, `PortAudio`), C++17 for C++ helpers.
- **ABI / P-Invoke Integrity**:
  - Native functions exported to C# must preserve exact function signatures, calling conventions (`__stdcall` / `__cdecl`), and structure packing (`#pragma pack`).
  - Do not alter function export declarations without synchronizing corresponding C# `[DllImport]` signatures in [`console.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/console.cs), [`cmaster.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/cmaster.cs), or [`wdsp.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/wdsp.cs).

### C# Managed Application
- **Framework**: .NET Framework 4.8 compatible (using C# 9.0/10.0 syntax enabled by modern Roslyn MSBuild compiler).
- **GUI & Threading**:
  - Windows Forms architecture.
  - Cross-thread UI updates must properly use `InvokeRequired` / `BeginInvoke`.
  - Signal processing callbacks (ASIO, PortAudio, TCI network streams) run on high-priority worker threads; never perform blocking UI operations in audio/IQ callbacks.
- **Preservation of Comments & Licensing**:
  - Maintain documentation integrity. Preserve all existing copyright headers, license disclaimers, and domain-specific RF comments.

### Markdown Documentation & Links
- Any documentation, analysis, or artifacts authored by agents must provide clickable links for all referenced files using the `file:///` format (with forward slashes for Windows paths).
- Code symbols (classes, functions, structs) should link to the specific file or line range when applicable.

---

## 5. Agent Operational & Documentation Rules (NON-NEGOTIABLE)

### Rule 5: 严禁使用任何表情符号 (No Emojis)
- 所有技术文档、代码注释、提交信息 (Git commit message) 以及 Agent 输出文本中，**绝对严禁使用任何表情符号 (Emoji / Pictographs)**。
- 必须保持文档与代码库的高度严肃、严谨与工业级技术专业性。

### Rule 6: 每次完成一个完整操作即执行 Git 提交 (Git Commit per Complete Operation)
- 每当完成一个完整、自洽、独立的技术操作（例如创建或更新架构文档、重构功能模块、修复编译问题、调整构建配置等），**必须立即执行一次 Git 提交** (`git commit`)。
- 提交信息必须规范、明确表达修改意图（推荐遵循语义化提交风格），严禁将多个毫不相关的操作累计成一个模糊的大提交。
