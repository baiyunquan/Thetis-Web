#requires -version 5.1
# Isolated, reversible helper integration check. Never installs trust or firewall rules.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$helperPath = Join-Path $PSScriptRoot '..\setup-code-host.ps1'
$priorLocalAppData = $env:LOCALAPPDATA
$testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('thetis-helper-certs-' + [Guid]::NewGuid().ToString('N'))
$testBaseHost = 'thetis-helper-test.home.arpa'
$priorCertificates = @(Get-ChildItem Cert:\CurrentUser\My | ForEach-Object { $_.Thumbprint })
$priorRoots = @(Get-ChildItem Cert:\CurrentUser\Root | ForEach-Object { $_.Thumbprint })
function Assert-Condition([bool]$Condition, [string]$Message) { if (!$Condition) { throw $Message } }
function Assert-NonExportableKey([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate) {
    $privateKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($Certificate)
    try {
        if ($privateKey -is [System.Security.Cryptography.RSACng]) {
            Assert-Condition ($privateKey.Key.ExportPolicy -eq [System.Security.Cryptography.CngExportPolicies]::None) 'Certificate private key is exportable.'
        } elseif ($privateKey -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
            Assert-Condition (!$privateKey.CspKeyContainerInfo.Exportable) 'Certificate private key is exportable.'
        } else { throw 'Unexpected RSA key provider.' }
    } finally { if ($privateKey) { $privateKey.Dispose() } }
}
try {
    $env:LOCALAPPDATA = $testDirectory
    & $helperPath -BaseHost $testBaseHost -ServerAddress '192.168.114.100'
    $configPath = Join-Path $testDirectory 'Thetis\CodeHost\hosting.json'
    $first = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    Assert-Condition ($first.baseHost -eq $testBaseHost) 'Helper did not write the selected base host.'
    $leaf = Get-Item -LiteralPath ('Cert:\CurrentUser\My\' + $first.certificateThumbprint)
    Assert-Condition $leaf.HasPrivateKey 'Leaf has no accessible private key.'
    $names = @($leaf.DnsNameList | ForEach-Object { $_.Unicode })
    Assert-Condition ($names.Count -eq 2 -and $names -contains $testBaseHost -and $names -contains "*.$testBaseHost") 'Leaf SANs do not match base and wildcard names.'
    $serverAuth = @($leaf.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' })
    Assert-Condition ($serverAuth.Count -eq 1 -and @($serverAuth[0].EnhancedKeyUsages | Where-Object { $_.Value -eq '1.3.6.1.5.5.7.3.1' }).Count -eq 1) 'Leaf lacks server-auth EKU.'
    Assert-NonExportableKey $leaf
    $publicRootPath = Join-Path $testDirectory 'Thetis\CodeHost\thetis-codehost-root-ca.cer'
    $publicRoot = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($publicRootPath)
    Assert-Condition (!$publicRoot.HasPrivateKey) 'Public CA export contains a private key.'
    $authority = Get-Item -LiteralPath ('Cert:\CurrentUser\My\' + $publicRoot.Thumbprint)
    $caConstraints = @($authority.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.19' })
    Assert-Condition ($caConstraints.Count -eq 1 -and $caConstraints[0].CertificateAuthority) 'Root lacks CA basic constraints.'
    Assert-NonExportableKey $authority
    $afterFirst = @(Get-ChildItem Cert:\CurrentUser\My | ForEach-Object { $_.Thumbprint })
    & $helperPath -BaseHost $testBaseHost -ServerAddress '192.168.114.100'
    $second = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    Assert-Condition ($first.certificateThumbprint -eq $second.certificateThumbprint) 'Valid leaf was not reused.'
    $afterSecond = @(Get-ChildItem Cert:\CurrentUser\My | ForEach-Object { $_.Thumbprint })
    Assert-Condition (@(Compare-Object $afterFirst $afterSecond).Count -eq 0) 'Idempotent rerun created certificates.'
    $rootIsTrusted = Test-Path -LiteralPath ('Cert:\CurrentUser\Root\' + $publicRoot.Thumbprint)
    Assert-Condition ($rootIsTrusted -eq ($priorRoots -contains $publicRoot.Thumbprint)) 'Helper changed CA trust without -InstallTrust.'
    Assert-Condition (@(Get-ChildItem -LiteralPath (Split-Path -Parent $configPath) -Filter '*.pfx').Count -eq 0) 'Helper exported a PFX.'
    Write-Host 'PASS: CA/leaf creation, SAN/EKU/issuer/key validation, public-only export, config, reuse and unchanged trust.'
} finally {
    $env:LOCALAPPDATA = $priorLocalAppData
    foreach ($certificate in @(Get-ChildItem Cert:\CurrentUser\My)) {
        if ($priorCertificates -notcontains $certificate.Thumbprint -and
            $certificate.FriendlyName -in @('Thetis CodeHost Local CA v1', "Thetis CodeHost $testBaseHost v1")) {
            Remove-Item -LiteralPath ('Cert:\CurrentUser\My\' + $certificate.Thumbprint) -DeleteKey
        }
    }
    $absoluteTestDirectory = [System.IO.Path]::GetFullPath($testDirectory)
    $absoluteTempDirectory = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (!$absoluteTestDirectory.StartsWith($absoluteTempDirectory, [System.StringComparison]::OrdinalIgnoreCase) -or
        [System.IO.Path]::GetFileName($absoluteTestDirectory) -notlike 'thetis-helper-certs-*') { throw 'Refusing cleanup outside the integration-test temporary directory.' }
    if (Test-Path -LiteralPath $absoluteTestDirectory) { Remove-Item -LiteralPath $absoluteTestDirectory -Recurse -Force }
}
