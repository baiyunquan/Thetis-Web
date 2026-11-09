# Foundation qualification record

The [baseline ledger](D:/workspace/Thetis/ui/baseline/ledger.json) records static current-source references and a historical manual screenshot. Every discovery/behavior row is currently unqualified for live Windows capture, Code interaction parity and hardware. Test success proves the ledger's consistency and discovery coverage; it does not certify the radio or any browser/device combination.

| Evidence | Current status | Evidence still required |
|---|---|---|
| Source coverage | 56 Forms + 16 UserControls + 89 Setup TabPages assigned and independently validated against the [inventory](D:/workspace/Thetis/docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md) | Expand individual actions for every reachable surface; compile listing alone does not prove exposure |
| Historical picture | [Manual page 10 PNG](D:/workspace/Thetis/docs/ui-parity/reference/manual-1.1-page-10.png) rendered and visually inspected | Current live Windows screenshots from copied profiles; record app revision, skin, display mode, RX2 state and capability flags |
| Live Windows reference | Unqualified | Separate Windows-mode run with known copied settings, no transmitter activation; record initial state/action/result for each behavior |
| Workbench and embedded hosting | Separate implementation/test evidence required | Real embedded port 50001 browser runs, resource/worker boot, native view state, reload, cleanup and legacy TCI coexistence |
| LAN trust/DNS helper | Read-only planning and [isolated CA/leaf/reuse checks](D:/workspace/Thetis/ui/baseline/test-setup-certificates.ps1) pass; test certificates/keys removed; trust/firewall unchanged | .NET Framework SslStream checks; explicit DNS/trust setup and real remote browser/device proof |
| 192.168.0.0/24 remote clients | Unqualified | Actual client/source address in that subnet, routed server address, Private-profile app rule, trusted wildcard HTTPS and WSS |
| Numerical calibration | Unmeasured; ledger tolerances are `null` | Fixed replay/real reference data with units, sample rate, averaging, gain and calibration settings; measured acceptance bounds |
| Timing and resource cleanup | Unmeasured; timing tolerances are `null` | Recorded transport/display/audio timing, dropped-frame behavior, thread/client/process counts around repeated cold loads/reloads |

The current helper's automatic NIC selection observed `192.168.114.100`, outside `192.168.0.0/24`. That observation supplies no cross-machine proof for the requested client subnet. Routing may permit access, but must be measured on the intended network. The [LAN setup procedure](D:/workspace/Thetis/docs/ui-parity/lan-setup.md) describes the explicit trust and firewall choices.

| Qualification dimension | Required variants and records | Current evidence |
|---|---|---|
| Display geometry | 1280x720, 1920x1080 and 2560x1440; 100%, 125%, 150%, 200% scaling where available; expanded/collapsed and moved/hidden sections | Unqualified; historical page does not represent current rendering |
| Receiver identity | RX1, RX2 and subreceiver; CTUN, locks, sync, split and TX-source combinations | Current-handler references only; radio execution unqualified |
| Radio capability | Record model, firmware, protocol, ADC/DDC routing, supported RX2/diversity/PS/XVTR features and disconnected/unsupported states | No radio model or firmware qualified |
| Windows audio | Exact ASIO/PortAudio/VAC device, driver version, rate/buffer format and absent-device errors | No audio driver qualified |
| Browser/device | Edge and Chrome desktop, plus intended mobile/device browsers; exact version, OS, secure-context state, wildcard origin and service-worker outcome | No LAN/browser/device combination qualified by the baseline |
| Browser permission | CA trust chain, wildcard DNS, microphone permission if later used; permission denied/revoked cases | No permission/trust installation performed by planning tests |
| Settings persistence | Copied profile before/after; band/mode/filter restore; Apply/Cancel/restart semantics; external updates while a panel is hidden | Pending differential traces |

Keep source/current-handler observations separate from measured effects. For each future run, record the commit, copied-profile identifier, machine/client identity, exact initial state, action, authoritative state trace, screenshot/recording paths and whether actual hardware was involved. Record measurement units and derived tolerances rather than choosing convenient thresholds. Missing devices and unavailable capabilities are evidence cases, not grounds to fabricate successful output.

Run the required [Release pipeline](D:/workspace/Thetis/build.ps1) after code/configuration/asset changes and attach its actual result to the completed operation. The pipeline stops Thetis before staging to prevent Windows executable/DLL locks. A green Release build establishes build/staging integrity and leaves radio/LAN qualification open.
