param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$nodeDir = Join-Path $repo 'build/tools/node-v24.22.1-win-x64'
$node = Join-Path $nodeDir 'node.exe'
$pnpm = Join-Path $repo 'build/tools/pnpm-12.16.0/package/bin/pnpm.mjs'
if (-not (Test-Path -LiteralPath $node)) { throw 'Build the Code browser bundle to prepare the pinned tools first.' }
$env:PATH = $nodeDir + ';' + $env:PATH
$stamp = Join-Path $repo 'build/ui-dependencies.sha256'
$digest = ((Get-FileHash (Join-Path $PSScriptRoot 'pnpm-lock.yaml') -Algorithm SHA256).Hash)
if (-not $SkipInstall -and (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules/esbuild')) -or -not (Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $digest)) {
    & $node $pnpm --dir $PSScriptRoot install --frozen-lockfile --ignore-scripts --reporter append-only
    if ($LASTEXITCODE -ne 0) { throw 'Frozen UI dependency install failed.' }
    [IO.File]::WriteAllText($stamp, $digest)
}
& $node (Join-Path $PSScriptRoot 'build.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Thetis UI build failed.' }
