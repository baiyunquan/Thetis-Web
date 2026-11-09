param()
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$fixture = Join-Path $repo ('build/staging-check-' + [Guid]::NewGuid().ToString('N'))
$web = Join-Path $fixture 'bin/web'
function Assert([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
try {
    [IO.Directory]::CreateDirectory((Join-Path $web 'old-assets')) | Out-Null
    [IO.File]::WriteAllText((Join-Path $web 'totw.html'), 'obsolete WebUI')
    [IO.File]::WriteAllText((Join-Path $web 'old-assets/stale.js'), 'obsolete asset')
    & (Join-Path $PSScriptRoot 'stage-code-web.ps1') -Destination $web
    Assert (@(Get-ChildItem -LiteralPath $web).Count -eq 1) 'Upgrade retained obsolete root WebUI files.'
    Assert (Test-Path -LiteralPath (Join-Path $web 'code/asset-manifest.json')) 'Upgrade did not stage the public manifest.'
    [IO.File]::WriteAllText((Join-Path $web 'code/obsolete-extension.js'), 'obsolete extension')
    & (Join-Path $PSScriptRoot 'stage-code-web.ps1') -Destination $web
    Assert (!(Test-Path -LiteralPath (Join-Path $web 'code/obsolete-extension.js'))) 'Upgrade retained an obsolete Code asset.'
    $manifest = Get-Content -Raw -LiteralPath (Join-Path $web 'code/asset-manifest.json') | ConvertFrom-Json
    foreach ($file in $manifest.files) { Assert (Test-Path -LiteralPath (Join-Path $web ('code/' + $file))) "Missing packaged file: $file" }
    $rejected = $false
    try { & (Join-Path $PSScriptRoot 'stage-code-web.ps1') -Destination (Join-Path $fixture 'not-owned/web') }
    catch { $rejected = $_.Exception.Message -like '*unexpected staging path*' }
    Assert $rejected 'An unowned destination was accepted.'
    Write-Host 'PASS: clean staging, upgrade removal, complete assets and unowned-path rejection.'
} finally {
    $expectedParent = [IO.Path]::GetFullPath((Join-Path $repo 'build'))
    if ((Split-Path $fixture -Parent) -ne $expectedParent -or (Split-Path $fixture -Leaf) -notmatch '^staging-check-[a-f0-9]{32}$') { throw 'Invalid staging fixture cleanup path.' }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
