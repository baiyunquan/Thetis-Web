# AGENTS.md

> **Target Environment:** Windows 10/11 x64 | CMake + MSVC + Ninja | .NET SDK CLI | VS Code

---

## 0. Mandatory AI Self-Commit Protocol

> **CRITICAL MANDATE FOR AI AGENTS:**  
> Whenever an AI Agent implements or completes an independent, coherent, and atomic part of a task in this repository, **the AI Agent MUST immediately execute a Git commit (`git commit`) autonomously**.  
> Never accumulate multiple unrelated tasks or incremental milestones into a single monolithic, ambiguous commit. Every commit message must be precise, professional, and descriptive (following conventional commit conventions such as `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), and commit messages **MUST NEVER contain any emojis or pictographs**.

---

## 1. Core Architectural Tenets

1. **Strictly Decoupled from Visual Studio IDE**:
   The repository has been permanently migrated from legacy Visual Studio solutions to a modern, decoupled **CMake + MSVC + .NET CLI** toolchain. Development is centered around **Visual Studio Code** and CLI automation.
2. **Embedded Single-Port WebUI Integration**:
   The WebUI is served directly by Thetis on port 50001 via HTTP/WebSocket multiplexing. No secondary web server (Node.js, Python, Kestrel, etc.) is allowed for runtime operation.
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

### Rule 3: Single-Port Multiplexing Architecture (Port 50001)
- [`TCIServer.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/TCIServer.cs) and [`Hosting/`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/Hosting/) provide the authoritative implementation for the embedded WebUI and TCI server.
- Standard HTTP 1.1 GET requests: Handled by `CodeHost` and `HostHttp` to serve static WebUI and Code OSS browser assets directly from `web/`.
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

### Rule 5: Strict Prohibition of Emojis (No Emojis)
- All technical documentation, code comments, Git commit messages, and AI Agent output texts **MUST NEVER contain any emoji or pictographic characters**.
- Maintain the highest level of rigor, seriousness, and industrial-grade technical professionalism throughout the codebase.

### Rule 6: Immediate Git Commit per Completed Atomic Operation
- Immediately upon completing any distinct, self-contained, and verified atomic technical operation (e.g., creating or updating architecture specifications, refactoring a module, fixing build issues, adjusting build configurations), the AI Agent **MUST execute a Git commit (`git commit`) right away**.
- Commit messages must follow semantic conventions, clearly stating the exact intent and scope of the changes. Never defer commits or merge multiple unrelated tasks into an ambiguous single commit.
