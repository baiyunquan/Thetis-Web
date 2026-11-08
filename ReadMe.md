# Thetis-Web

[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-blue.svg)](https://microsoft.com/windows)
[![Build System](https://img.shields.io/badge/Build-CMake%20%2B%20MSVC%20%2B%20Ninja-brightgreen.svg)](CMakeLists.txt)
[![Managed Runtime](https://img.shields.io/badge/.NET-4.8%20%2F%20CLI%20SDK-purple.svg)](Project%20Files/Source/Console/Thetis.csproj)
[![WebUI](https://img.shields.io/badge/WebUI-Thetis%20On%20The%20Web-orange.svg)](submodules/thetis-on-the-web)
[![TCI Protocol](https://img.shields.io/badge/TCI-v2.0%20(Port%2050001)-green.svg)](Project%20Files/Source/Console/TCIServer.cs)

**Thetis-Web** 是专为 OpenHPSDR / ANAN 系列软件无线电 (SDR) 打造的现代化、高集成度版本。本项目**完全脱离了庞大笨重的 Visual Studio IDE** 依赖，重构为纯 **CMake + MSVC + .NET CLI** 构建流水线，并在 VS Code 中提供开箱即用的一流开发、构建与调试体验。

同时，本项目内置深度集成了 [Thetis On The Web (TOTW)](https://github.com/baiyunquan/thetis-on-the-web) 网页端客户端，通过创新的**单端口多路复用网络架构（Port 50001）**，无需任何额外 Node.js / Python Web 服务，直接在浏览器中实现高分辨率 IQ 频谱瀑布流、双向 TCI 音频串流（RX 扬声器 + TX 浏览器麦克风发射）及全功能电台控制。

---

## 目录 (Table of Contents)

- [核心特色](#核心特色)
- [项目架构与模块说明 (STRUCTURE.md)](#项目架构与模块说明-structuremd)
- [环境与依赖要求](#环境与依赖要求)
- [编译与构建指南](#编译与构建指南)
  - [1. 一键脚本构建 (推荐)](#1-一键脚本构建-推荐)
  - [2. VS Code 原生集成构建](#2-vs-code-原生集成构建)
  - [3. CLI 分步手动构建](#3-cli-分步手动构建)
  - [构建产物目录结构](#构建产物目录结构)
- [程序启动指南](#程序启动指南)
  - [方式一：启动标准桌面版 (Desktop Mode)](#方式一启动标准桌面版-desktop-mode)
  - [方式二：启动 WebUI 网页控制模式 (Web Remote Mode)](#方式二启动-webui-网页控制模式-web-remote-mode)
- [WebUI 单端口多路复用机制详解](#webui-单端口多路复用机制详解)
- [WebUI 常用快捷键](#webui-常用快捷键)
- [Git Submodule 子模块管理](#git-submodule-子模块管理)
- [常见问题排查 (FAQ)](#常见问题排查-faq)
- [许可证与鸣谢](#许可证与鸣谢)

---

## 核心特色

1. **彻底摆脱 Visual Studio IDE 束缚**：
   - 清理所有旧版 `.sln`、`.vcxproj` 及 `.vs/` 冗余配置文件；
   - 原生 C/C++ 算法与硬件核心（`PA19.dll`、`wdsp.dll`、`cmASIO.dll`、`ChannelMaster.dll`）统一使用现代 [CMakeLists.txt](file:///d:/workspace/Thetis/CMakeLists.txt) 管理，支持 Ninja 并行加速；
   - 托管层 C# 程序通过现代 `dotnet build` 工具链直接编译。
2. **VS Code 优先的深度集成**：
   - 预置 [.vscode/tasks.json](file:///d:/workspace/Thetis/.vscode/tasks.json)：`Ctrl + Shift + B` 一键多任务编译；
   - 预置 [.vscode/launch.json](file:///d:/workspace/Thetis/.vscode/launch.json)：一键启动、混合代码断点调试；
   - 预置推荐插件配置与路径搜索。
3. **内置 WebUI 零配置即开即用**：
   - 将 [thetis-on-the-web](file:///d:/workspace/Thetis/submodules/thetis-on-the-web) 作为 Git Submodule 直接嵌入主仓库；
   - 编译系统自动将 WebUI 静态文件同步至运行目录 `web/`；
   - 主程序内建 HTTP 静态服务器与 WebSocket 服务，单个端口（50001）承载页面访问与双向 TCI 高速通信。
4. **浏览器标准安全源（Secure Context）**：
   - 通过 `http://localhost:50001/` 访问，浏览器自动授予麦克风与 Web Audio 高级音频权限，无缝开启浏览器在线发射（TX）与接收（RX）。

---

---

## 项目架构与模块说明 (STRUCTURE.md)

本项目拥有详细的原生 C/C++ 算法、通道路由网络、音频驱动、托管 C# 应用程序及单端口 WebUI 的架构与接口技术剖析。

详细内容请参阅：[STRUCTURE.md](file:///d:/workspace/Thetis/STRUCTURE.md)
- **底层原生 DSP 核心**：[wdsp](file:///d:/workspace/Thetis/Project%20Files/Source/wdsp/) (FFTW3, RNNoise, SpecBleach, MMCSS)
- **原生通道路由与网络引擎**：[ChannelMaster](file:///d:/workspace/Thetis/Project%20Files/Source/ChannelMaster/) (Protocol 1 & 2, WinSock2, 无锁环形缓冲区)
- **底层音频驱动**：[cmASIO](file:///d:/workspace/Thetis/Project%20Files/Source/cmASIO/) (Steinberg ASIO SDK) 与 [PA19](file:///d:/workspace/Thetis/cmake/PA19.cmake) (PortAudio 19.7, WASAPI, WDM-KS, MME)
- **托管 C# 应用程序**：[Thetis Console](file:///d:/workspace/Thetis/Project%20Files/Source/Console/) (SharpDX DirectX 11/2D, SkiaSharp, NAudio, WinForms)
- **单端口 50001 服务与 WebUI 客户端**：[TCIServer.cs](file:///d:/workspace/Thetis/Project%20Files/Source/Console/TCIServer.cs) 与 [thetis-on-the-web](file:///d:/workspace/Thetis/submodules/thetis-on-the-web)
- **系统与第三方库接口矩阵**：全景技术栈依赖清单与端到端数据流拓扑图

---

## 环境与依赖要求

在开始构建前，请确保系统已安装以下工具：

| 工具 / 依赖 | 最低要求版本 | 说明 |
| :--- | :--- | :--- |
| **操作系统** | Windows 10 / 11 64-bit | 纯 64 位 (x64) 运行环境 |
| **MSVC 编译器** | Visual Studio 2022 或 Build Tools | 仅需安装 "使用 C++ 的桌面开发" 工作负载中的 MSVC v143 编译器与 Windows 10/11 SDK |
| **CMake** | >= 3.20 | 跨平台原生构建定义工具 |
| **Ninja** | >= 1.10 (推荐) | 超高速并行构建执行器 |
| **.NET SDK** | .NET 8.0 / 9.0 / 10.0 | 提供 `dotnet build` 命令（需包含 .NET Framework 4.8 目标包支持） |
| **Git** | 最新版本 | 包含 submodule 支持 |

---

## 编译与构建指南

### 1. 一键脚本构建 (推荐)

仓库根目录提供了全自动环境探测与编译脚本，能自动检测 MSVC 路径、同步 Submodule、还原 NuGet 并完整编译原生动态库与 C# 程序：

#### 使用 PowerShell (推荐)：
```powershell
# 完整编译 Release 版本 (推荐)
.\build.ps1 -All -Config Release

# 仅编译原生 C/C++ 核心 DLL (快速迭代底层算法)
.\build.ps1 -Config Release

# 编译 Debug 调试版本
.\build.ps1 -All -Config Debug

# 清理构建缓存
.\build.ps1 -Clean
```

#### 使用 CMD 命令行：
```cmd
:: 完整编译 Release 版本
build.bat Release all

:: 仅编译原生核心 DLL
build.bat Release

:: 完整编译 Debug 版本
build.bat Debug all

:: 清理构建目录
build.bat clean
```

> [!TIP]
> 运行构建脚本时，如果发现后台有未关闭的 `Thetis.exe`，脚本会自动尝试停止该进程，以防 DLL 文件锁导致 `Permission denied` 报错。

---

### 2. VS Code 原生集成构建

在 VS Code 中打开本仓库：
- **默认构建**：直接按下快捷键 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd>，触发 `Build All (Release)` 任务。
- **选择性任务**：按下 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>，输入 `Tasks: Run Task` 并回车：
  - `Build All (Release)`：完整构建所有模块 (Release)
  - `Build All (Debug)`：完整构建所有模块 (Debug)
  - `Build Native Core Only (CMake)`：仅增量编译原生 C/C++ DLL
  - `Build C# Thetis Only (dotnet)`：仅增量编译 C# 应用程序
  - `Clean Build Directory`：清理 CMake build 缓存
  - `Update Git Submodules`：同步更新 WebUI 等子模块代码

---

### 3. CLI 分步手动构建

如果你需要在 CI/CD 环境或自定义流水线中分步构建：

```powershell
# 1. 确保子模块就绪
git submodule update --init --recursive

# 2. 还原 C# NuGet 依赖
nuget restore "Project Files/Source/Console/Thetis.csproj" -PackagesDirectory "Project Files/Source/packages"

# 3. 使用 CMake 编译原生 C/C++ 动态库 (Ninja + MSVC)
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=cl -DCMAKE_CXX_COMPILER=cl
cmake --build build --target native_core

# 4. 使用 dotnet 编译 C# 应用程序
dotnet build "Project Files/Source/Console/Thetis.csproj" -c Release -p:Platform=x64

# 5. 执行部署目标 (将 DLL 与 WebUI 同步至 bin 输出目录)
cmake --build build --target stage_to_project_bin
```

---

### 构建产物目录结构

构建完成后，所有最终可执行程序与依赖均位于 [Project Files/bin/x64/Release/](file:///d:/workspace/Thetis/Project%20Files/bin/x64/Release/)：

```text
Project Files/bin/x64/Release/
├── Thetis.exe                     # C# 主程序
├── ChannelMaster.dll              # 多通道信号路由核心 (Native)
├── wdsp.dll                       # 数字信号处理算法核心 (Native)
├── cmASIO.dll                     # 低延迟 ASIO 音频驱动层 (Native)
├── PA19.dll                       # PortAudio 跨平台音频接口 (Native)
├── web/                           # 嵌入式 WebUI 静态资源目录
│   ├── totw.html                  # WebUI 单文件入口 (TOTW)
│   ├── index.html                 # 软链接/重定向入口
│   └── ...                        # 相关前端脚本与样式
├── Skins/                         # 界面皮肤资源
└── *.dll                          # C# 依赖托管库 (NAudio, Newtonsoft.Json 等)
```

---

## 程序启动指南

### 方式一：启动标准桌面版 (Desktop Mode)

1. **直接运行可执行文件**：
   双击运行 `Project Files\bin\x64\Release\Thetis.exe`。
2. **在 VS Code 中启动**：
   在 VS Code 运行与调试面板选择 **"Launch Thetis (Release)"**，按 <kbd>F5</kbd> 或 <kbd>Ctrl</kbd> + <kbd>F5</kbd>。

> [!NOTE]
> **首次启动特别说明**：
> 首次运行 Thetis 时，底层的 WDSP 核心会自动调用 FFTW 算法库为本机 CPU 指令集规划最佳 FFT 执行计划（Wisdom Plan，文件位于 `Project Files/bin/x64/Release/Wisdom/wdspWisdom00`）。
> **初次生成需耗时 1~2 分钟**，期间界面可能短暂等待，这是正常现象。一旦 Wisdom 文件生成完毕，后续启动均为秒级启动。

---

### 方式二：启动 WebUI 网页控制模式 (Web Remote Mode)

Thetis-Web 完美支持在任何内网设备或移动终端的浏览器中远程操控电台：

#### 1. 命令行快速拉起 WebUI
通过添加 `-web`（或 `-tci`、`-webui`）参数启动 Thetis：
```powershell
.\Project Files\bin\x64\Release\Thetis.exe -web
```
该参数会指示 Thetis 在启动时**自动开启内置 TCI 服务器与 WebUI 静态资源服务器**（默认监听 `50001` 端口）。

#### 2. 在桌面程序中手动启用
如果你已通过常规方式打开了 Thetis 桌面版：
1. 点击主界面菜单栏上的 **Setup** 按钮；
2. 切换到 **CAT Control** 或 **TCI** 选项卡；
3. 勾选 **Enable TCI Server** 复选框（默认端口保持 `50001`）；
4. TCI 服务器与 WebUI 将即刻在后台开始监听。

#### 3. 浏览器访问
打开现代浏览器（推荐 Google Chrome、Microsoft Edge 或 Safari），输入以下地址：
- **本机访问**：[`http://localhost:50001/`](http://localhost:50001/)
- **局域网其它电脑/平板/手机访问**：`http://<你的电脑局域网IP>:50001/`

浏览器将立即加载呈现 Thetis On The Web 交互界面：
- 点击顶部工具栏的 **CONNECT** 按钮即可建立 WebSocket 握手；
- 界面将实时显示高帧率 4096-pt FFT 频谱与瀑布图；
- 浏览器扬声器自动输出电台解调音频。

---

## WebUI 单端口多路复用机制详解

传统的 SDR Web 控制方案通常需要部署两个独立服务：一个负责渲染网页的 HTTP Web 服务器（如 Node.js / Nginx），另一个是电台的控制端口（如 TCI 50001）。这带来了安装依赖多、跨域端口冲突等问题。

**Thetis-Web 采用创新的单端口多路复用架构**：
```mermaid
flowchart LR
    Browser["现代浏览器 (Chrome/Edge/Safari)"]
    Port["Thetis 50001 端口 (TCIServer.cs)"]
    WebFolder["本地静态目录 (bin/web/totw.html)"]
    SDRCore["Thetis 信号处理与硬件控制核心"]

    Browser -- "1. 浏览器打开: GET /" --> Port
    Port -- "读取并返回 totw.html 静态资源" --> WebFolder
    WebFolder -. "渲染交互界面" .-> Browser

    Browser -- "2. 点击 Connect: Upgrade: websocket" --> Port
    Port <--> "3. TCI v2.0 全双工长连接 (IQ/音频流 & 控制指令)" <--> SDRCore
```

- **HTTP 1.1 静态文件分发**：当浏览器发送标准 HTTP GET 请求（如请求根路径 `/`）时，[`TCIServer.cs`](file:///d:/workspace/Thetis/Project%20Files/Source/Console/TCIServer.cs) 拦截并直接读取程序本地 `web/` 目录中的 `totw.html` 及相关资产，极速返回静态网页。
- **WebSocket 协议升级**：当网页加载完成并建立 `ws://` 握手时，服务器平滑转入 TCI v2.0 双全工模式，传输高频 IQ 数据、浮点音频流与频率/模式控制指令。
- **标准安全上下文 (Secure Context)**：由于页面直接托管在 `http://localhost:50001/`，浏览器天然将其识别为安全源（Trustworthy Origin），因此能直接授权使用麦克风（Web Audio API `getUserMedia`），使得浏览器直接在线发射 (TX) 成为可能。

---

## WebUI 常用快捷键

| 快捷键 | 功能操作 |
| :--- | :--- |
| <kbd>Space</kbd> (空格键) | **PTT 发射** (按住发射 / 点击切换) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | VFO 频率步进增加 / 减少 |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | VFO 大步进调整 (×10) |
| <kbd>Ctrl</kbd> + 滚轮 | 频谱窗口缩放 (Zoom In / Out) |
| 双击频谱区 | 重置频谱缩放到默认全景视图 |
| <kbd>M</kbd> | 将当前频率保存至记忆信道 (Memory) |
| <kbd>F1</kbd> ~ <kbd>F4</kbd> | 快速调谐至记忆信道 1~4 |
| <kbd>D</kbd> | 开关数字通信模式标记 (FT8 / FT4 / WSPR / PSK) |
| <kbd>X</kbd> | 开关 DX Cluster 实时电报台呼叫点图层 |
| <kbd>P</kbd> | 开关频谱峰值保持 (Peak Hold) |
| <kbd>?</kbd> | 打开/关闭网页快捷键帮助窗口 |

---

## Git Submodule 子模块管理

WebUI 源码作为 Git Submodule 挂载在 [submodules/thetis-on-the-web](file:///d:/workspace/Thetis/submodules/thetis-on-the-web)。

若需要同步上游 WebUI 最新更新：
```powershell
# 同步并拉取最新子模块提交
git submodule update --remote --merge submodules/thetis-on-the-web

# 重新运行构建脚本以将新资源部署到 bin/web/
.\build.ps1 -All -Config Release
```

---

## 常见问题排查 (FAQ)

### Q1: 编译时出现 `Permission denied` 或无法写入 `PA19.dll` / `Thetis.exe`
- **原因**：之前启动的 `Thetis.exe` 仍在后台运行，Windows 系统锁定了正在运行的动态库与可执行文件。
- **解决**：在终端执行 `Stop-Process -Name Thetis -Force`，或直接再次运行 `.\build.ps1 -All -Config Release`（脚本内部会自动清理残留进程）。

### Q2: 浏览器打开 `http://localhost:50001/` 提示无法连接
- **原因**：Thetis 启动时未启用 TCI 服务器。
- **解决**：
  1. 使用 `Thetis.exe -web` 参数启动；
  2. 或者在 Thetis 桌面 GUI 中打开 `Setup` -> `TCI` -> 勾选 `Enable TCI Server`。

### Q3: WebUI 无法使用麦克风进行 TX 发射
- **原因**：部分现代浏览器（如 Chrome）对非 `localhost` 且非 `https://` 的远程内网 IP 会限制麦克风访问。
- **解决**：
  - 本机访问使用 `http://localhost:50001/` 即可正常使用麦克风；
  - 局域网跨设备访问时，可在 Chrome 打开 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`，添加你的内网地址（如 `http://192.168.1.100:50001`）为安全源。

---

## 许可证与鸣谢

- 本项目基于 OpenHPSDR / [ramdor/Thetis](https://github.com/ramdor/Thetis) 与 [thetis-on-the-web](https://github.com/baiyunquan/thetis-on-the-web)。
- 原生核心遵循开源许可证（详见 [LICENSE](file:///d:/workspace/Thetis/LICENSE) 与 [LICENSE-DUAL-LICENSING](file:///d:/workspace/Thetis/LICENSE-DUAL-LICENSING)）。
- 衷心感谢 OpenHPSDR 社区、Richie (MW0LGE)、OE3IDE、n9bc 及所有无线电爱好者的杰出贡献！
