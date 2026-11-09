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
# The validated web root is generated output owned by this target. Replacing it
# clears old WebUI files as well as obsolete files from earlier Code packages.
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
$codeTarget = Join-Path $target 'code'
[IO.Directory]::CreateDirectory($codeTarget) | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $codeTarget -Recurse -Force
