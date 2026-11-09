#requires -version 5.1
<#
.SYNOPSIS
Prepare per-user certificates and DNS instructions for the embedded Thetis Code host.
.DESCRIPTION
Default execution creates/reuses non-exportable keys in CurrentUser\My, exports
only a public root certificate and writes the per-user hosting configuration.
Trust and the scoped Windows firewall rule require their explicit switches.
PlanOnly is read-only even when those switches are supplied.
#>
[CmdletBinding()]
param(
    [ValidatePattern('^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$')]
    [string]$BaseHost = 'thetis.home.arpa',
    [string]$ServerAddress,
    [string]$ExecutablePath,
    [switch]$InstallTrust,
    [switch]$ConfigureFirewall,
    [switch]$PlanOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (!$ExecutablePath) { $ExecutablePath = Join-Path $PSScriptRoot '..\Project Files\bin\x64\Release\Thetis.exe' }

function Test-RoutableIPv4([string]$Address) {
    $parsedAddress = $null
    if (![System.Net.IPAddress]::TryParse($Address, [ref]$parsedAddress)) { return $false }
    if ($parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { return $false }
    $octets = $parsedAddress.GetAddressBytes()
    return $octets[0] -ne 0 -and $octets[0] -ne 127 -and $octets[0] -lt 224 -and
        !($octets[0] -eq 169 -and $octets[1] -eq 254) -and $Address -ne '255.255.255.255'
}

function Get-ServerAddressPlan {
    if ($ServerAddress) {
        if (!(Test-RoutableIPv4 $ServerAddress)) { throw 'ServerAddress must be a routable IPv4 address, not loopback/link-local/unspecified/multicast.' }
        return @{ address = ([System.Net.IPAddress]::Parse($ServerAddress)).ToString(); selection = 'explicit'; candidates = @($ServerAddress) }
    }
    $addresses = @()
    if (Get-Command Get-NetIPConfiguration -ErrorAction SilentlyContinue) {
        foreach ($network in @(Get-NetIPConfiguration -ErrorAction SilentlyContinue)) {
            if ($network.NetAdapter -and $network.NetAdapter.Status -eq 'Up' -and $network.IPv4DefaultGateway) {
                foreach ($assignedAddress in @($network.IPv4Address)) {
                    if ($assignedAddress -and (Test-RoutableIPv4 $assignedAddress.IPAddress)) { $addresses += $assignedAddress.IPAddress }
                }
            }
        }
    }
    $addresses = @($addresses | Sort-Object -Unique)
    if ($addresses.Count -eq 1) { return @{ address = $addresses[0]; selection = 'auto-single-routable-interface'; candidates = $addresses } }
    return @{ address = $null; selection = 'unresolved-select-routable-interface'; candidates = $addresses }
}

function Get-DerLength([byte[]]$Bytes, [ref]$Offset) {
    if ($Offset.Value -ge $Bytes.Length) { throw 'Malformed certificate extension length.' }
    [int]$lengthByte = $Bytes[$Offset.Value]
    $Offset.Value++
    if ($lengthByte -lt 128) { return $lengthByte }
    $byteCount = $lengthByte -band 127
    if ($byteCount -eq 0 -or $byteCount -gt 4 -or $Offset.Value + $byteCount -gt $Bytes.Length) { throw 'Malformed certificate extension length.' }
    [int]$length = 0
    for ($index = 0; $index -lt $byteCount; $index++) { $length = ($length -shl 8) -bor $Bytes[$Offset.Value]; $Offset.Value++ }
    return $length
}

function Get-CertificateDnsNames([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate) {
    $san = @($Certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' })
    if ($san.Count -ne 1) { return @() }
    [byte[]]$bytes = $san[0].RawData
    if ($bytes.Length -lt 2 -or $bytes[0] -ne 48) { return @() }
    [int]$offset = 1
    $total = Get-DerLength $bytes ([ref]$offset)
    if ($offset + $total -ne $bytes.Length) { return @() }
    $names = @()
    while ($offset -lt $bytes.Length) {
        $tag = $bytes[$offset]; $offset++
        $length = Get-DerLength $bytes ([ref]$offset)
        if ($length -lt 0 -or $offset + $length -gt $bytes.Length) { return @() }
        if ($tag -eq 130) { $names += [System.Text.Encoding]::ASCII.GetString($bytes, $offset, $length) }
        $offset += $length
    }
    return $names
}

function Test-AccessibleNonExportableKey([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate) {
    $rsaKey = $null
    try {
        if (!$Certificate.HasPrivateKey) { return $false }
        $rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($Certificate)
        if (!$rsaKey) { return $false }
        if ($rsaKey -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
            if ($rsaKey.CspKeyContainerInfo.Exportable) { return $false }
        } elseif ($rsaKey -is [System.Security.Cryptography.RSACng]) {
            if ($rsaKey.Key.ExportPolicy -ne [System.Security.Cryptography.CngExportPolicies]::None) { return $false }
        } else { return $false }
        # Exercise private-key access under the same Windows identity used by Thetis.
        $challenge = [System.Text.Encoding]::UTF8.GetBytes('Thetis CodeHost private-key accessibility check')
        $signature = $rsaKey.SignData($challenge, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        return $rsaKey.VerifyData($challenge, $signature, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    } catch { return $false } finally { if ($rsaKey) { $rsaKey.Dispose() } }
}

function Test-ManagedAuthority([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate) {
    if ($Certificate.Subject -ne 'CN=Thetis CodeHost Local CA' -or $Certificate.Issuer -ne $Certificate.Subject -or
        $Certificate.FriendlyName -ne 'Thetis CodeHost Local CA v1' -or $Certificate.NotBefore -gt (Get-Date) -or $Certificate.NotAfter -lt (Get-Date).AddMonths(14)) { return $false }
    $constraints = @($Certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.19' })
    $usage = @($Certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.15' })
    if ($constraints.Count -ne 1 -or !$constraints[0].CertificateAuthority -or $usage.Count -ne 1 -or
        !($usage[0].KeyUsages -band [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign)) { return $false }
    return Test-AccessibleNonExportableKey $Certificate
}

function Test-ManagedLeaf([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate,
    [System.Security.Cryptography.X509Certificates.X509Certificate2]$Authority) {
    if ($Certificate.FriendlyName -ne "Thetis CodeHost $BaseHost v1" -or $Certificate.NotBefore -gt (Get-Date) -or
        $Certificate.NotAfter -lt (Get-Date).AddDays(30) -or $Certificate.NotAfter -gt $Authority.NotAfter) { return $false }
    $dnsNames = @(Get-CertificateDnsNames $Certificate)
    if ($dnsNames.Count -ne 2 -or $dnsNames -notcontains $BaseHost -or $dnsNames -notcontains "*.$BaseHost") { return $false }
    $eku = @($Certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' })
    $constraints = @($Certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.19' })
    if ($eku.Count -ne 1 -or @($eku[0].EnhancedKeyUsages | Where-Object { $_.Value -eq '1.3.6.1.5.5.7.3.1' }).Count -ne 1 -or
        $constraints.Count -ne 1 -or $constraints[0].CertificateAuthority -or !(Test-AccessibleNonExportableKey $Certificate)) { return $false }
    $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
    try {
        $chain.ChainPolicy.ExtraStore.Add($Authority) | Out-Null
        $chain.ChainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
        $chain.ChainPolicy.VerificationFlags = [System.Security.Cryptography.X509Certificates.X509VerificationFlags]::AllowUnknownCertificateAuthority
        if (!$chain.Build($Certificate)) { return $false }
        return $chain.ChainElements[$chain.ChainElements.Count - 1].Certificate.Thumbprint -eq $Authority.Thumbprint
    } finally { $chain.Dispose() }
}

$addressPlan = Get-ServerAddressPlan
$configurationDirectory = Join-Path $env:LOCALAPPDATA 'Thetis\CodeHost'
$configurationPath = Join-Path $configurationDirectory 'hosting.json'
$publicRootPath = Join-Path $configurationDirectory 'thetis-codehost-root-ca.cer'
$resolvedExecutable = [System.IO.Path]::GetFullPath($ExecutablePath)
$scopeNotice = 'Firewall opt-in permits only Private-profile clients in 192.168.0.0/24; DNS/trust and a real client connection must be qualified independently.'
if ($addressPlan.address -and !$addressPlan.address.StartsWith('192.168.0.')) {
    $scopeNotice = "Selected server address $($addressPlan.address) is outside 192.168.0.0/24; this helper does not promise reachability from that subnet. Routing and client access require separate verification."
}
$plan = [ordered]@{
    planOnly = [bool]$PlanOnly
    baseHost = $BaseHost
    serverAddress = $addressPlan.address
    addressSelection = $addressPlan.selection
    candidateAddresses = @($addressPlan.candidates)
    dnsRecords = @(@{ name = $BaseHost; type = 'A'; address = $addressPlan.address }, @{ name = "*.$BaseHost"; type = 'A'; address = $addressPlan.address })
    certificateStore = 'Cert:\CurrentUser\My'
    keyPolicy = 'NonExportable'
    certificateNames = @($BaseHost, "*.$BaseHost")
    configPath = $configurationPath
    publicRootCertificatePath = $publicRootPath
    installTrust = [bool]$InstallTrust
    trustStore = 'Cert:\CurrentUser\Root'
    configureFirewall = [bool]$ConfigureFirewall
    firewall = @{ name = 'Thetis-CodeHost-50001-Private-1921680'; protocol = 'TCP'; localPort = 50001; remoteAddress = '192.168.0.0/24'; profile = 'Private'; program = $resolvedExecutable }
    scopeNotice = $scopeNotice
    clients = 'All browser/device clients; no User-Agent filtering. Each client needs both DNS names resolved and explicit CA trust.'
    unresolvedDnsInstruction = 'If serverAddress is null, select a routable server NIC address and rerun with -ServerAddress. Configure both DNS A records to that chosen address; never publish loopback or 0.0.0.0.'
}
if ($PlanOnly) { $plan | ConvertTo-Json -Depth 6; return }

if ($ConfigureFirewall) {
    $windowsIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $windowsPrincipal = New-Object System.Security.Principal.WindowsPrincipal($windowsIdentity)
    if (!$windowsPrincipal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) { throw '-ConfigureFirewall requires an elevated PowerShell session under the same Windows account as Thetis.' }
    if (!(Test-Path -LiteralPath $resolvedExecutable -PathType Leaf)) { throw "Firewall program does not exist: $resolvedExecutable. Build Release or pass -ExecutablePath." }
}

$authority = @(Get-ChildItem Cert:\CurrentUser\My | Where-Object { Test-ManagedAuthority $_ } | Sort-Object NotAfter -Descending) | Select-Object -First 1
if (!$authority) {
    $authority = New-SelfSignedCertificate -Type Custom -Subject 'CN=Thetis CodeHost Local CA' -FriendlyName 'Thetis CodeHost Local CA v1' `
        -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 `
        -Provider 'Microsoft Software Key Storage Provider' -KeyExportPolicy NonExportable -KeyUsage CertSign,CRLSign `
        -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0') -NotBefore (Get-Date).AddMinutes(-5) -NotAfter (Get-Date).AddYears(10)
    if (!(Test-ManagedAuthority $authority)) { throw 'Created CA failed non-exportable key/basic-constraints validation.' }
}
$leaf = @(Get-ChildItem Cert:\CurrentUser\My | Where-Object { Test-ManagedLeaf $_ $authority } | Sort-Object NotAfter -Descending) | Select-Object -First 1
if (!$leaf) {
    # CAPI SChannel KeyExchange supports the net48 SslStream server path.
    $leaf = New-SelfSignedCertificate -Type Custom -Subject "CN=$BaseHost" -FriendlyName "Thetis CodeHost $BaseHost v1" `
        -DnsName @($BaseHost, "*.$BaseHost") -Signer $authority -CertStoreLocation 'Cert:\CurrentUser\My' `
        -Provider 'Microsoft RSA SChannel Cryptographic Provider' -KeySpec KeyExchange -KeyAlgorithm RSA -KeyLength 2048 `
        -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage DigitalSignature,KeyEncipherment `
        -TextExtension @('2.5.29.19={critical}{text}ca=0', '2.5.29.37={text}1.3.6.1.5.5.7.3.1') `
        -NotBefore (Get-Date).AddMinutes(-5) -NotAfter (Get-Date).AddYears(1)
    if (!(Test-ManagedLeaf $leaf $authority)) { throw 'Created server certificate failed SAN/EKU/issuer/private-key validation.' }
}

New-Item -ItemType Directory -Path $configurationDirectory -Force | Out-Null
Export-Certificate -Cert $authority -FilePath $publicRootPath -Type CERT -Force | Out-Null
$configuration = [ordered]@{ baseHost = $BaseHost; certificateThumbprint = $leaf.Thumbprint }
$temporaryConfig = Join-Path $configurationDirectory ('hosting-' + [Guid]::NewGuid().ToString('N') + '.tmp')
try {
    [System.IO.File]::WriteAllText($temporaryConfig, ($configuration | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $temporaryConfig -Destination $configurationPath -Force
} finally { if (Test-Path -LiteralPath $temporaryConfig) { Remove-Item -LiteralPath $temporaryConfig -Force } }

if ($InstallTrust) { Import-Certificate -FilePath $publicRootPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null }
if ($ConfigureFirewall) {
    $ruleParameters = @{ Name = $plan.firewall.name; Direction = 'Inbound'; Action = 'Allow'; Enabled = 'True'; Profile = 'Private'; Protocol = 'TCP'; LocalPort = 50001; RemoteAddress = '192.168.0.0/24'; Program = $resolvedExecutable }
    if (Get-NetFirewallRule -Name $plan.firewall.name -ErrorAction SilentlyContinue) { Set-NetFirewallRule @ruleParameters | Out-Null }
    else { New-NetFirewallRule @ruleParameters -DisplayName 'Thetis CodeHost TCP 50001 (192.168.0.0/24 only)' | Out-Null }
}

Write-Host "Hosting configuration: $configurationPath"
Write-Host "Public CA certificate: $publicRootPath"
Write-Host "Server certificate CurrentUser\My thumbprint: $($leaf.Thumbprint)"
Write-Host 'CA/server private keys remain non-exportable in CurrentUser\My. Run Thetis under this Windows identity.'
Write-Host "Trust installed for current user: $([bool]$InstallTrust); firewall configured: $([bool]$ConfigureFirewall)."
$dnsTarget = if ($addressPlan.address) { $addressPlan.address } else { '<chosen-routable-server-address>' }
Write-Host "Configure LAN DNS: $BaseHost A $dnsTarget"
Write-Host "Configure LAN DNS: *.$BaseHost A $dnsTarget"
if (!$addressPlan.address) { Write-Host $plan.unresolvedDnsInstruction }
Write-Host $scopeNotice
Write-Host $plan.clients
Write-Host 'Import only the public CA certificate on each intended browser/device through its explicit trust workflow; never distribute private keys.'
Write-Host "After DNS and trust are configured, open https://${BaseHost}:50001/code/ and qualify WSS, wildcard webviews and service workers separately."
