<#
.SYNOPSIS
    Builds Thetis using CMake and MSVC from PowerShell command line (decoupled from Visual Studio IDE).

.PARAMETER Config
    Build configuration: "Release" (default) or "Debug".

.PARAMETER All
    Builds both native C/C++ core DLLs and managed C# Thetis.exe.

.PARAMETER Clean
    Cleans previous build output.
#>

param(
    [ValidateSet("Release", "Debug")]
    [string]$Config = "Release",

    [switch]$All,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "         Thetis CMake + MSVC CLI Builder (PowerShell)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if ($Clean) {
    if (Test-Path "build") {
        Write-Host "[INFO] Cleaning 'build' directory..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "build"
    }
    Write-Host "[OK] Clean complete." -ForegroundColor Green
    return
}

# 1. Locate MSVC environment
$clCmd = Get-Command cl.exe -ErrorAction SilentlyContinue
if (-not $clCmd) {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) {
        throw "vswhere.exe not found at '$vswhere'. Please ensure Visual Studio or Build Tools is installed."
    }

    $vsPath = & $vswhere -latest -products * -property installationPath
    if (-not $vsPath) {
        throw "Could not find a valid Visual Studio installation."
    }

    Write-Host "[INFO] Found Visual Studio at: $vsPath" -ForegroundColor DarkGray
    $vcvarsall = Join-Path $vsPath "VC\Auxiliary\Build\vcvarsall.bat"
    if (-not (Test-Path $vcvarsall)) {
        throw "vcvarsall.bat not found at '$vcvarsall'."
    }

    Write-Host "[INFO] Initializing MSVC x64 build environment..." -ForegroundColor DarkGray
    $env:PATH = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer;$($env:PATH)"

    # Import environment variables from vcvarsall.bat
    $tempFile = [System.IO.Path]::GetTempFileName()
    cmd /c "call `"$vcvarsall`" x64 >nul && set > `"$tempFile`""
    Get-Content $tempFile | ForEach-Object {
        if ($_ -match '^(.*?)=(.*)$') {
            Set-Item "env:$($matches[1])" $matches[2]
        }
    }
    Remove-Item -Force $tempFile
}

# Stop any running Thetis instance to prevent file locks during build
Get-Process Thetis -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Check CMake and Ninja
$cmakeCmd = Get-Command cmake.exe -ErrorAction SilentlyContinue
if (-not $cmakeCmd) {
    throw "cmake.exe not found in PATH. Please install CMake and add it to PATH."
}

# 2.5 Ensure Git submodules are initialized
if (Test-Path ".git") {
    Write-Host "[INFO] Synchronizing git submodules..." -ForegroundColor DarkGray
    & git submodule update --init --recursive
}

$target = if ($All) { "ThetisApp" } else { "native_core" }

# 3. Restore NuGet if building all
if ($All -and -not (Test-Path "Project Files\Source\packages")) {
    Write-Host "[INFO] Restoring NuGet packages..." -ForegroundColor Yellow
    $nugetDir = "$env:LOCALAPPDATA\Microsoft\MSBuild\NuGet"
    if (-not (Test-Path $nugetDir)) { New-Item -ItemType Directory -Path $nugetDir -Force | Out-Null }
    $nugetPath = Join-Path $nugetDir "nuget.exe"
    if (-not (Test-Path $nugetPath)) {
        Write-Host "[INFO] Downloading nuget.exe..." -ForegroundColor DarkGray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri "https://dist.nuget.org/win-x86-commandline/latest/nuget.exe" -OutFile $nugetPath
    }
    & $nugetPath restore "Project Files\Source\Console\Thetis.csproj" -PackagesDirectory "Project Files\Source\packages"
}

# 4. Configure with CMake
Write-Host "`n[INFO] Configuring CMake with Ninja (Configuration: $Config)..." -ForegroundColor Cyan
& cmake -B build -G Ninja "-DCMAKE_BUILD_TYPE=$Config" -DCMAKE_C_COMPILER=cl -DCMAKE_CXX_COMPILER=cl
if ($LASTEXITCODE -ne 0) {
    throw "CMake configuration failed."
}

# 5. Build
Write-Host "`n[INFO] Building target [$target] ($Config)..." -ForegroundColor Cyan
& cmake --build build --target $target
if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

# 6. Stage to project bin
Write-Host "`n[INFO] Staging runtime dependencies to Project Files/bin/x64/$Config..." -ForegroundColor DarkGray
& cmake --build build --target stage_to_project_bin

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "                Build Successful!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Built native DLLs located in:"
Write-Host "  - build\bin"
Write-Host "  - Project Files\bin\x64\$Config"
if ($All) {
    Write-Host "Built Thetis application located in:"
    Write-Host "  - Project Files\bin\x64\$Config\Thetis.exe"
}
Write-Host "=======================================================" -ForegroundColor Green
