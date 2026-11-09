$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Get-Process Thetis -ErrorAction SilentlyContinue | Stop-Process -Force
dotnet build (Join-Path $PSScriptRoot 'Thetis.Hosting.Tests.csproj') -c Release --nologo
if ($LASTEXITCODE -ne 0) { throw 'Hosting harness build failed.' }
# Isolated, untrusted leaf fixture: never placed in Root and always removed with its key.
$certificate = New-SelfSignedCertificate -DnsName 'thetis-test.home.arpa','*.thetis-test.home.arpa' -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddDays(1) -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -FriendlyName 'Thetis hosting integration test fixture'
$priorCertificate = $env:THETIS_HOST_TEST_CERT
try {
    $env:THETIS_HOST_TEST_CERT = $certificate.Thumbprint
    $exeCandidates = @(
        (Join-Path $PSScriptRoot 'bin/Release/net48/Thetis.Hosting.Tests.exe'),
        (Join-Path $PSScriptRoot 'bin/x64/Release/net48/Thetis.Hosting.Tests.exe')
    )
    $exe = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $exe) { throw 'Thetis.Hosting.Tests.exe not found in build outputs.' }
    & $exe
    if ($LASTEXITCODE -ne 0) { throw 'Hosting harness failed.' }
} finally {
    $env:THETIS_HOST_TEST_CERT = $priorCertificate
    Remove-Item -LiteralPath ('Cert:\CurrentUser\My\' + $certificate.Thumbprint) -DeleteKey
}
