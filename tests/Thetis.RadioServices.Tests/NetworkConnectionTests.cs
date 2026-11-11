using System;
using System.Net;
using Thetis;
using Thetis.RadioServices;

internal static class NetworkConnectionTests
{
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static RadioInfo Radio(bool custom = false) => new RadioInfo {
        IpAddress = IPAddress.Parse("192.168.3.20"), Protocol = RadioDiscoveryRadioProtocol.P1,
        DiscoveryPortBase = 1024, DeviceType = HPSDRHW.Hermes, CodeVersion = 103, IsCustom = custom
    };
    private static NicRadioScanResult Nic() => new NicRadioScanResult { LocalIPv4 = IPAddress.Parse("192.168.3.165") };
    private static RadioConnectionRequest Request(RadioInfo radio, NicRadioScanResult nic = null, bool rediscover = true, bool match = false)
        => new RadioConnectionRequest(nic ?? Nic(), radio, 0, HPSDRModel.ANAN100, HPSDRHW.Hermes, rediscover, true, ScanPerformanceProfile.Safe, match);
    public static void CustomAndFirstFoundBypassRediscovery()
    {
        int scans = 0, native = 0;
        var connector = new RadioNetworkConnection((options, ip) => { scans++; return null; }, (remote, port, local, listen, protocol, model) => {
            native++; Check(remote == "192.168.3.20" && local == "192.168.3.165" && port == 1024 && listen == 0 && protocol == 0, "connection inputs changed"); return 0;
        });
        Check(connector.Connect(Request(Radio(true))).Code == 0, "custom radio failed");
        Check(connector.Connect(Request(Radio(), rediscover: false)).Code == 0, "first-found radio rediscovered");
        Check(scans == 0 && native == 2, "bypass rules changed");
    }
    public static void DiscoveryOptionsAndReturnedProtocolArePreserved()
    {
        var discovered = Nic(); var radio = Radio(); radio.Protocol = RadioDiscoveryRadioProtocol.P2; discovered.Radios.Add(radio);
        var connector = new RadioNetworkConnection((options, ip) => {
            Check(options.ScanPerformance == ScanPerformanceProfile.Safe && options.ProtocolMode == RadioDiscoveryProtocolMode.Auto, "scan options lost");
            Check(options.IgnoreSubnetCheck && !options.IncludeOtherInterfaceTypes && options.AllowAPIPA && options.IncludeGeneralBroadcast && !options.AllowLoopback, "interface policy changed");
            return discovered;
        }, (remote, port, local, listen, protocol, model) => { Check(protocol == 1, "negotiated protocol lost"); return 0; });
        var result = connector.Connect(Request(Radio()));
        Check(result.Code == 0 && result.DiscoveryUpdate == discovered && result.Protocol == 1, "discovered selection lost");
    }
    public static void InvalidSelectionAndFirmwareDoNotInitializeNative()
    {
        int calls = 0;
        var invalid = Nic(); var radio = Radio(); radio.DeviceType = HPSDRHW.HermesII; radio.CodeVersion = 102; invalid.Radios.Add(radio);
        var connector = new RadioNetworkConnection((options, ip) => invalid, (remote, port, local, listen, protocol, model) => { calls++; return 0; });
        Check(connector.Connect(new RadioConnectionRequest(null, Radio(), 0, HPSDRModel.ANAN100, HPSDRHW.Hermes)).Code == -105, "missing NIC code changed");
        Check(connector.Connect(new RadioConnectionRequest(Nic(), null, 0, HPSDRModel.ANAN100, HPSDRHW.Hermes)).Code == -106, "missing radio code changed");
        Check(connector.Connect(Request(Radio())).Code == -101 && calls == 0, "invalid firmware reached native initialization");
    }
}
