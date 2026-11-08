param([Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$binRoot = [IO.Path]::GetFullPath((Join-Path $repo 'Project Files/bin')) + [IO.Path]::DirectorySeparatorChar
$target = [IO.Path]::GetFullPath($Destination)
$relative = $target.Substring([Math]::Min($binRoot.Length, $target.Length))
if (-not $target.StartsWith($binRoot, [StringComparison]::OrdinalIgnoreCase) -or $relative -notmatch '^(x64|x86)\\(Release|Debug)\\web\\code$') {
    throw "Refusing to replace an unexpected staging path: $target"
}
$source = Join-Path $repo 'build/code-web'
if (-not (Test-Path -LiteralPath (Join-Path $source 'index.html'))) { throw 'Build Code OSS web first.' }
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
[IO.Directory]::CreateDirectory($target) | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
