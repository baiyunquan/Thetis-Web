param([Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$target = [IO.Path]::GetFullPath($Destination)
# Accept the former .../web/code argument, but replace the entire generated web root.
if ((Split-Path $target -Leaf) -eq 'code') { $target = Split-Path $target -Parent }
$binRoot = [IO.Path]::GetFullPath((Join-Path $repo 'Project Files/bin')) + [IO.Path]::DirectorySeparatorChar
$buildRoot = [IO.Path]::GetFullPath((Join-Path $repo 'build')) + [IO.Path]::DirectorySeparatorChar
$runtime = $target.StartsWith($binRoot, [StringComparison]::OrdinalIgnoreCase) -and $target.Substring($binRoot.Length) -match '^(x64|x86)\\(Release|Debug)\\web$'
$native = $target.StartsWith($buildRoot, [StringComparison]::OrdinalIgnoreCase) -and $target.Substring($buildRoot.Length) -match '^(?:[a-zA-Z0-9_-]+\\)*bin\\web$'
if (-not ($runtime -or $native)) {
    throw "Refusing to replace an unexpected staging path: $target"
}
$cursor = $target
while ($cursor.Length -ge $repo.Length) {
    if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Refusing a reparse point in staging path: $cursor" }
    $cursor = Split-Path $cursor -Parent
}
if (Get-Process Thetis -ErrorAction SilentlyContinue) { throw 'Stop Thetis before staging browser assets.' }
$source = Join-Path $repo 'build/code-web'
if (-not (Test-Path -LiteralPath (Join-Path $source 'asset-manifest.json'))) { throw 'Build the Thetis UI before staging.' }
if (-not (Test-Path -LiteralPath $target)) {
    [IO.Directory]::CreateDirectory($target) | Out-Null
}

# 1. Stage Code OSS assets to $target/code
$codeTarget = Join-Path $target 'code'
if (Test-Path -LiteralPath $codeTarget) {
    Remove-Item -LiteralPath $codeTarget -Recurse -Force
}
[IO.Directory]::CreateDirectory($codeTarget) | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $codeTarget -Recurse -Force

# 2. Stage Thetis On The Web (TOTW) submodule assets to $target root
$totwSource = Join-Path $repo 'submodules/thetis-on-the-web'
if (Test-Path -LiteralPath (Join-Path $totwSource 'totw.html')) {
    Copy-Item -Path (Join-Path $totwSource 'totw.html') -Destination (Join-Path $target 'totw.html') -Force
    Copy-Item -Path (Join-Path $totwSource 'totw.html') -Destination (Join-Path $target 'index.html') -Force
    foreach ($item in @('images', 'scripts', 'website')) {
        $subPath = Join-Path $totwSource $item
        if (Test-Path -LiteralPath $subPath) {
            Copy-Item -Path $subPath -Destination $target -Recurse -Force
        }
    }
}
