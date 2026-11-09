# Embedded Code host LAN setup

The [Windows PowerShell 5.1 helper](D:/workspace/Thetis/ui/setup-code-host.ps1) prepares certificates for `thetis.home.arpa` and `*.thetis.home.arpa`, then writes `%LOCALAPPDATA%\Thetis\CodeHost\hosting.json` containing `baseHost` and `certificateThumbprint`. The C# embedded server remains the only runtime host on TCP 50001. Build-time Node tools do not serve the application.

Start with its read-only JSON plan. Explicitly supplying an address avoids selecting the wrong NIC when several routable interfaces exist.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ui/setup-code-host.ps1 -PlanOnly
powershell -NoProfile -ExecutionPolicy Bypass -File ui/setup-code-host.ps1 -PlanOnly -ServerAddress 192.168.0.10
```

Replace the example address with the server's reachable address. Automatic selection accepts a single connected adapter with a default IPv4 gateway and a usable IPv4 address. With zero or multiple candidates the helper prints instructions to choose a routable address; it does not publish `0.0.0.0`, guess a client subnet or silently modify DNS. Explicit loopback, link-local, multicast and unspecified addresses are rejected.

Default execution creates or reuses a valid managed local CA and leaf certificate in `Cert:\CurrentUser\My`. Both private keys are non-exportable. The CA has signing usage and CA basic constraints; the leaf has exactly the base and wildcard SANs, server-auth EKU and a CAPI SChannel KeyExchange key suitable for the .NET Framework server path. The helper validates expiration, issuer chain, SAN/EKU/basic constraints and private-key signing access before writing configuration. It reuses valid managed certificates; leaf renewal is required when fewer than 30 days remain, and CA reuse requires enough lifetime for a new leaf. It exports only the public CA certificate, never a PFX or private key.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ui/setup-code-host.ps1 -ServerAddress 192.168.0.10
```

The helper prints the public root certificate path: `%LOCALAPPDATA%\Thetis\CodeHost\thetis-codehost-root-ca.cer`. Run Thetis under the same Windows identity so its CurrentUser store/private keys are accessible. The hosting configuration stores a thumbprint rather than a private-key file or password. Key/certificate behavior follows Microsoft's [New-SelfSignedCertificate documentation](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate?view=windowsserver2025-ps); the [RSA private-key API supports .NET Framework 4.8](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.rsacertificateextensions.getrsaprivatekey).

No trust store or firewall rule changes occur by default. Opt in separately when desired:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ui/setup-code-host.ps1 -InstallTrust -ServerAddress 192.168.0.10
# Elevated session, same Windows account as Thetis:
powershell -NoProfile -ExecutionPolicy Bypass -File ui/setup-code-host.ps1 -ConfigureFirewall -ServerAddress 192.168.0.10
```

`-InstallTrust` imports the public CA into the current user's Root store only. Other clients each need an explicit trust installation through their OS/browser/device workflow. Transfer only the public CA certificate and verify its fingerprint through a trusted channel. The helper never installs trust silently on other devices.

`-ConfigureFirewall` requires elevation and the actual [Release executable](D:/workspace/Thetis/Project%20Files/bin/x64/Release/Thetis.exe), or an explicit `-ExecutablePath`. It creates/updates only the named Thetis CodeHost rule, with the executable program path, inbound TCP local port 50001, Private profile and `RemoteAddress 192.168.0.0/24`. It does not broaden the allowed subnet to match the current NIC. A server outside that subnet requires verified routing; a rule alone proves no connectivity. `-PlanOnly -InstallTrust -ConfigureFirewall` describes both intentions without applying them or creating certificates/files.

Configure the LAN DNS resolver with both A records, replacing the example server address:

```text
thetis.home.arpa    A    192.168.0.10
*.thetis.home.arpa  A    192.168.0.10
```

Both names must resolve from every intended client. A hosts file cannot provide wildcard DNS. The wildcard is needed for the pinned workbench's per-webview hostnames, including local service-worker/resource loading. Open `https://thetis.home.arpa:50001/code/` after DNS and client trust are installed. Keep origin validation and certificate checks enabled. HTTPS/WSS and existing plain TCI share the embedded endpoint; validate their coexistence on the actual deployment.

All browser/device clients are eligible under the chosen network/trust scope. There is no User-Agent allowlist. Eligibility does not promise support for every device: record actual secure-context, TLS, WSS, wildcard-host, webview and service-worker results in the [qualification record](D:/workspace/Thetis/docs/ui-parity/qualification.md). Setup does not establish radio parity, microphone permissions or access to Windows ASIO/VAC hardware from a remote browser.

Read-only regressions are in the [Node setup tests](D:/workspace/Thetis/ui/baseline/setup-host.node.test.mjs) and [foundation tests](D:/workspace/Thetis/ui/tests/foundation/baseline.test.ts). They never create certificates, install trust or modify firewall rules.

The separate [certificate integration check](D:/workspace/Thetis/ui/baseline/test-setup-certificates.ps1) exercises actual CA/leaf creation, independent SAN/EKU/key-policy checks, public-only export, configuration and idempotent reuse with a unique test host and temporary local configuration. It snapshots the user's certificates, preserves pre-existing ones and removes only its newly generated managed certificates/keys afterward. It does not pass either trust/firewall switch. This proves the helper's certificate path on the test Windows identity; it does not prove remote browser trust or LAN reachability.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ui/baseline/test-setup-certificates.ps1
```
