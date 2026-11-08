@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo          Thetis CMake + MSVC CLI Builder
echo =======================================================

set "CONFIG=Release"
set "BUILD_ALL=0"
set "TARGET=native_core"

:parse_args
if "%~1"=="" goto after_args
if /i "%~1"=="debug" (
    set "CONFIG=Debug"
) else if /i "%~1"=="release" (
    set "CONFIG=Release"
) else if /i "%~1"=="all" (
    set "BUILD_ALL=1"
    set "TARGET=ThetisApp"
) else if /i "%~1"=="clean" (
    echo Cleaning build directory...
    if exist "build" rmdir /s /q "build"
    echo Clean completed.
    exit /b 0
) else (
    echo Unknown argument: %~1
    echo Usage: build.bat [release^|debug] [all] [clean]
    exit /b 1
)
shift
goto parse_args

:after_args

:: Stop any running Thetis instance to prevent file locks during build
taskkill /f /im Thetis.exe >nul 2>&1

:: Check if cl.exe is already in PATH
where cl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] MSVC compiler found in current environment.
    goto check_cmake
)

:: Locate vswhere
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo [ERROR] vswhere.exe not found at "%VSWHERE%".
    exit /b 1
)

:: Locate Visual Studio Installation
for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -property installationPath`) do (
    set "VS_DIR=%%i"
)

if "%VS_DIR%"=="" (
    echo [ERROR] Could not find a valid Visual Studio installation.
    exit /b 1
)

echo [INFO] Found Visual Studio at: %VS_DIR%
set "VCVARSALL=%VS_DIR%\VC\Auxiliary\Build\vcvarsall.bat"
if not exist "%VCVARSALL%" (
    echo [ERROR] vcvarsall.bat not found at "%VCVARSALL%".
    exit /b 1
)

echo [INFO] Initializing MSVC x64 build environment...
set "PATH=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer;%PATH%"
call "%VCVARSALL%" x64 >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to initialize MSVC x64 environment.
    exit /b 1
)

:check_cmake
where cmake.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] cmake.exe was not found in PATH. Please install CMake and add it to PATH.
    exit /b 1
)

:: Check git submodules
if exist ".git" (
    echo [INFO] Synchronizing git submodules...
    git submodule update --init --recursive
)

:: Check NuGet packages if building full application
if "%BUILD_ALL%"=="1" (
    if not exist "Project Files\Source\packages" (
        echo [INFO] Restoring NuGet packages...
        set "NUGET_DIR=%LOCALAPPDATA%\Microsoft\MSBuild\NuGet"
        if not exist "!NUGET_DIR!" mkdir "!NUGET_DIR!"
        set "NUGET_EXE=!NUGET_DIR!\nuget.exe"
        if not exist "!NUGET_EXE!" (
            echo [INFO] Downloading nuget.exe...
            powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe' -OutFile '!NUGET_EXE!'"
        )
        "!NUGET_EXE!" restore "Project Files\Source\Console\Thetis.csproj" -PackagesDirectory "Project Files\Source\packages"
    )
)

echo.
echo [INFO] Configuring CMake with Ninja (Configuration: %CONFIG%)...
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=%CONFIG% -DCMAKE_C_COMPILER=cl -DCMAKE_CXX_COMPILER=cl
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] CMake configuration failed.
    exit /b 1
)

echo.
echo [INFO] Building target [%TARGET%] (%CONFIG%)...
cmake --build build --target %TARGET%
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    exit /b 1
)

echo.
echo [INFO] Staging runtime dependencies to Project Files/bin/x64/%CONFIG%...
cmake --build build --target stage_to_project_bin

echo.
echo =======================================================
echo                 Build Successful!
echo =======================================================
echo Built native DLLs located in:
echo   - build\bin
echo   - Project Files\bin\x64\%CONFIG%
if "%BUILD_ALL%"=="1" (
    echo Built Thetis application located in:
    echo   - Project Files\bin\x64\%CONFIG%\Thetis.exe
)
echo =======================================================
