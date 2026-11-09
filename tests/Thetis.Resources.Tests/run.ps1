[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtime = Join-Path $repo 'Project Files/bin/x64/Release'
$fixture = Join-Path $repo ('build/resource-probe-' + [Guid]::NewGuid().ToString('N'))
$domain = $null
Get-Process Thetis -ErrorAction SilentlyContinue | Stop-Process -Force
try {
    [IO.Directory]::CreateDirectory($fixture) | Out-Null
    $probe = Join-Path $fixture 'Thetis.ResourceProbe.dll'
    Add-Type -Path (Join-Path $PSScriptRoot 'ResourceProbe.cs') -ReferencedAssemblies System.Drawing -OutputAssembly $probe
    $setup = New-Object AppDomainSetup
    $setup.ApplicationBase = $runtime
    $setup.ConfigurationFile = Join-Path $runtime 'Thetis.exe.config'
    $domain = [AppDomain]::CreateDomain('Thetis deployed resource check', $null, $setup)
    $check = $domain.CreateInstanceFromAndUnwrap($probe, 'Thetis.Tests.ResourceProbe')
    Write-Host $check.ToString()
} finally {
    if ($domain) { [AppDomain]::Unload($domain) }
    $parent = [IO.Path]::GetFullPath((Join-Path $repo 'build'))
    if ((Split-Path $fixture -Parent) -ne $parent -or (Split-Path $fixture -Leaf) -notmatch '^resource-probe-[a-f0-9]{32}$') { throw 'Invalid resource fixture cleanup path.' }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
