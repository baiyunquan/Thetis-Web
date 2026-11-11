param([string]$Suite = 'All')
$ErrorActionPreference = 'Stop'
dotnet build (Join-Path $PSScriptRoot 'Thetis.RadioServices.Tests.csproj') -c Release --nologo
if ($LASTEXITCODE -ne 0) { throw 'Radio services harness build failed.' }
& (Join-Path $PSScriptRoot 'bin/Release/net48/Thetis.RadioServices.Tests.exe') $Suite
if ($LASTEXITCODE -ne 0) { throw 'Radio services harness failed.' }
