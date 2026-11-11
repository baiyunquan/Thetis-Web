[CmdletBinding()]
param([ValidateSet('All','Database','Prompts')][string]$Suite = 'All')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtime = Join-Path $repo 'Project Files/bin/x64/Release'
$fixture = Join-Path $repo ('build/backend-probe-' + [Guid]::NewGuid().ToString('N'))
$domain = $null
try {
    [IO.Directory]::CreateDirectory($fixture) | Out-Null
    $probe = Join-Path $fixture 'Thetis.DatabaseLifetimeProbe.dll'
    Add-Type -Path @((Join-Path $PSScriptRoot 'DatabaseLifetimeProbe.cs'),(Join-Path $PSScriptRoot 'PromptBridgeProbe.cs')) -ReferencedAssemblies System.Data,System.Xml,System.Core -OutputAssembly $probe
    $setup = New-Object AppDomainSetup
    $setup.ApplicationBase = $runtime
    $setup.ConfigurationFile = Join-Path $runtime 'Thetis.exe.config'
    $domain = [AppDomain]::CreateDomain('Thetis database lifetime check', $null, $setup)
    if ($Suite -in @('All','Database')) {
        $check = $domain.CreateInstanceFromAndUnwrap($probe, 'Thetis.Tests.DatabaseLifetimeProbe')
        Write-Host $check.ToString()
    }
    if ($Suite -in @('All','Prompts')) {
        $check = $domain.CreateInstanceFromAndUnwrap($probe, 'Thetis.Tests.PromptBridgeProbe')
        Write-Host $check.ToString()
    }
} finally {
    if ($domain) { [AppDomain]::Unload($domain) }
    $parent = [IO.Path]::GetFullPath((Join-Path $repo 'build'))
    if ((Split-Path $fixture -Parent) -ne $parent -or (Split-Path $fixture -Leaf) -notmatch '^backend-probe-[a-f0-9]{32}$') { throw 'Invalid backend fixture cleanup path.' }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
