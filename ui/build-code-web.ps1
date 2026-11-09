param([switch]$SkipInstall, [switch]$RebuildCode)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$code = Join-Path $repo 'submodules/vscode'
$toolsDir = Join-Path $repo 'build/tools'
$nodeVersion = (Get-Content (Join-Path $code '.nvmrc') -Raw).Trim().TrimStart('v')
$package = Get-Content (Join-Path $code 'package.json') -Raw | ConvertFrom-Json
$pnpmVersion = $package.packageManager.Split('@')[1]
$nodeDir = Join-Path $toolsDir "node-v$nodeVersion-win-x64"
$node = Join-Path $nodeDir 'node.exe'
$pnpmDir = Join-Path $toolsDir "pnpm-$pnpmVersion"
$pnpm = Join-Path $pnpmDir 'package/bin/pnpm.mjs'
[IO.Directory]::CreateDirectory($toolsDir) | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not (Test-Path -LiteralPath $node)) {
    $archiveName = "node-v$nodeVersion-win-x64.zip"
    $archive = Join-Path $toolsDir $archiveName
    $url = "https://nodejs.org/dist/v$nodeVersion"
    Invoke-WebRequest -UseBasicParsing "$url/$archiveName" -OutFile $archive
    $checksums = (Invoke-WebRequest -UseBasicParsing "$url/SHASUMS256.txt").Content
    $line = @($checksums -split "`n" | Where-Object { $_.Trim().EndsWith(" $archiveName") })[0]
    if (-not $line -or (Get-FileHash $archive -Algorithm SHA256).Hash -ne ($line.Trim() -split '\s+')[0]) {
        throw 'Node archive checksum mismatch.'
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $toolsDir -Force
}
if (-not (Test-Path -LiteralPath $pnpm)) {
    $metadata = Invoke-RestMethod "https://registry.npmjs.org/pnpm/$pnpmVersion"
    $archive = Join-Path $toolsDir "pnpm-$pnpmVersion.tgz"
    Invoke-WebRequest -UseBasicParsing $metadata.dist.tarball -OutFile $archive
    $digest = [Security.Cryptography.SHA512]::Create()
    try { $integrity = 'sha512-' + [Convert]::ToBase64String($digest.ComputeHash([IO.File]::ReadAllBytes($archive))) }
    finally { $digest.Dispose() }
    if ($integrity -ne $metadata.dist.integrity) { throw 'pnpm archive integrity mismatch.' }
    [IO.Directory]::CreateDirectory($pnpmDir) | Out-Null
    & tar -xzf $archive -C $pnpmDir
    if ($LASTEXITCODE -ne 0) { throw 'pnpm extraction failed.' }
}
$env:PATH = $nodeDir + ';' + $env:PATH
if ((& $node --version) -ne "v$nodeVersion") { throw 'Incorrect Node version.' }
if ((& $node $pnpm --version) -ne $pnpmVersion) { throw 'Incorrect pnpm version.' }

if (-not $RebuildCode) {
    & $node (Join-Path $PSScriptRoot 'scripts/code-cache.mjs') --check
    if ($LASTEXITCODE -eq 0) { return }
}

if (-not $SkipInstall) {
    foreach ($install in @($code, (Join-Path $code 'build'), (Join-Path $code 'remote'))) {
        Push-Location $install
        try {
            $arguments = @('install', '--frozen-lockfile', '--ignore-scripts', '--reporter', 'append-only')
            if ($install -eq (Join-Path $code 'remote')) { $arguments += @('--filter', 'vscode-web...') }
            & $node $pnpm @arguments
            if ($LASTEXITCODE -ne 0) { throw "Dependency install failed in $install" }
        } finally { Pop-Location }
    }
}

# Upstream's bundler deletes this output directory. Verify its absolute boundary first.
$bundle = [IO.Path]::GetFullPath((Join-Path $code 'out-vscode-web'))
if ((Split-Path $bundle -Parent) -ne [IO.Path]::GetFullPath($code)) { throw 'Invalid bundle output path.' }
Push-Location $code
try {
    $font = Join-Path $code 'src/vs/base/browser/ui/codicons/codicon/codicon.ttf'
    Copy-Item -LiteralPath (Join-Path $code 'node_modules/@vscode/codicons/dist/codicon.ttf') -Destination $font -Force
    & $node --max-old-space-size=16384 build/next/index.ts bundle --target web --out out-vscode-web --nls
    if ($LASTEXITCODE -ne 0) { throw 'Code OSS web compilation failed.' }
} finally { Pop-Location }
& $node (Join-Path $PSScriptRoot 'scripts/code-cache.mjs') --write
if ($LASTEXITCODE -ne 0) { throw 'Code OSS browser cache stamp failed.' }
Write-Host 'Code OSS browser bundle built. The thetis_ui target builds and packages application panels.'
