using System;
using System.Net;

namespace Thetis.RadioServices
{
    public sealed class RadioConnectionRequest
    {
        public bool HasNic { get; }
        public string LocalAddress { get; }
        public RadioInfo Radio { get; }
        public int ListenPort { get; }
        public HPSDRModel Model { get; }
        public HPSDRHW ExpectedHardware { get; }
        public bool Rediscover { get; }
        public bool LimitInterfacesToEthernetWifi { get; }
        public ScanPerformanceProfile ScanProfile { get; }
        public bool ProtocolMustMatch { get; }
        public RadioConnectionRequest(NicRadioScanResult nic, RadioInfo radio, int listenPort, HPSDRModel model,
            HPSDRHW expectedHardware, bool rediscover = true, bool limitInterfacesToEthernetWifi = true,
            ScanPerformanceProfile scanProfile = ScanPerformanceProfile.Balanced, bool protocolMustMatch = false)
        {
            HasNic = nic != null; LocalAddress = nic?.LocalIPv4?.ToString();
            // Capture the connection metadata; a caller editing its discovery list cannot change an in-flight request.
            if (radio != null) Radio = new RadioInfo {
                IpAddress = radio.IpAddress == null ? null : IPAddress.Parse(radio.IpAddress.ToString()),
                Protocol = radio.Protocol, DeviceType = radio.DeviceType, CodeVersion = radio.CodeVersion,
                BetaVersion = radio.BetaVersion, Protocol2Supported = radio.Protocol2Supported,
                DiscoveryPortBase = radio.DiscoveryPortBase, IsCustom = radio.IsCustom
            };
            ListenPort = listenPort; Model = model; ExpectedHardware = expectedHardware; Rediscover = rediscover;
            LimitInterfacesToEthernetWifi = limitInterfacesToEthernetWifi; ScanProfile = scanProfile; ProtocolMustMatch = protocolMustMatch;
        }
    }
    public sealed class RadioConnectionResult
    {
        public int Code { get; }
        public RadioInfo Radio { get; }
        public int Protocol { get; }
        public NicRadioScanResult DiscoveryUpdate { get; }
        public string FirmwareError { get; }
        public string BoardMismatch { get; }
        internal RadioConnectionResult(int code, RadioInfo radio = null, int protocol = 0, NicRadioScanResult discovery = null, string firmwareError = "", string boardMismatch = "")
        { Code = code; Radio = radio; Protocol = protocol; DiscoveryUpdate = discovery; FirmwareError = firmwareError; BoardMismatch = boardMismatch; }
    }
    public sealed class RadioNetworkConnection
    {
        private readonly Func<RadioDiscoveryOptions, IPAddress, NicRadioScanResult> discover;
        private readonly Func<string, int, string, int, int, int, int> initialize;
        public RadioNetworkConnection(Func<RadioDiscoveryOptions, IPAddress, NicRadioScanResult> discover,
            Func<string, int, string, int, int, int, int> initialize)
        { this.discover = discover ?? throw new ArgumentNullException(nameof(discover)); this.initialize = initialize ?? throw new ArgumentNullException(nameof(initialize)); }

        public RadioConnectionResult Connect(RadioConnectionRequest request, Action<NicRadioScanResult> selectionResolved = null)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (!request.HasNic) return new RadioConnectionResult(-105); // no nic currently selected
            var radio = request.Radio;
            if (radio == null) return new RadioConnectionResult(-106); // no radio currently selected
            string radioIP = radio.IpAddress?.ToString();
            if (!IPAddress.TryParse(radioIP, out var target)) return new RadioConnectionResult(-103);
            if (!IPAddress.TryParse(request.LocalAddress, out var local)) return new RadioConnectionResult(-104);
            int port = radio.DiscoveryPortBase;
            int protocol = radio.Protocol == RadioDiscoveryRadioProtocol.P1 ? 0 : 1;
            NicRadioScanResult update = null;
            if (!radio.IsCustom && request.Rediscover)
            {
                var options = new RadioDiscoveryOptions {
                    IgnoreSubnetCheck = true, IncludeEthernet = true, IncludeWireless = true,
                    IncludeOtherInterfaceTypes = !request.LimitInterfacesToEthernetWifi, AllowLoopback = false,
                    AllowAPIPA = true, IncludeGeneralBroadcast = true, DiscoveryPortBase = port,
                    BindLocalPort = request.ListenPort, ScanPerformance = request.ScanProfile,
                    FixedTargetIp = target, FixedLocalIp = local,
                    ProtocolMode = request.ProtocolMustMatch ? (protocol == 0 ? RadioDiscoveryProtocolMode.P1Only : RadioDiscoveryProtocolMode.P2Only) : RadioDiscoveryProtocolMode.Auto
                };
                // Check via a single nic that matches where we expect the radio to be.
                update = discover(options, local);
                if (update?.Radios == null || update.Radios.Count != 1) return new RadioConnectionResult(-1);
                radio = update.Radios[0];
                protocol = radio.Protocol == RadioDiscoveryRadioProtocol.P1 ? 0 : 1; // update to the result (for auto)
                if (radio.DeviceType == HPSDRHW.HermesII && radio.CodeVersion < 103)
                    return new RadioConnectionResult(-101, firmwareError: "Invalid Firmware!\nRequires 10.3 or greater. ");
                // Windows updates its selected row before native initialization, preserving the original ordering.
                selectionResolved?.Invoke(update);
            }
            int result = initialize(radioIP, port, request.LocalAddress, request.ListenPort, protocol, (int)request.Model);
            string mismatch = "";
            if (result == 0)
            {
                bool expected;
                switch (request.Model)
                {
                    case HPSDRModel.REDPITAYA:
                        expected = radio.DeviceType == HPSDRHW.Hermes || radio.DeviceType == HPSDRHW.OrionMKII; // can be these two
                        break;
                    case HPSDRModel.ANAN10:
                    case HPSDRModel.ANAN10E:
                    case HPSDRModel.ANAN100:
                    case HPSDRModel.ANAN100B:
                        expected = radio.DeviceType == HPSDRHW.Hermes || radio.DeviceType == HPSDRHW.HermesII; // can be these two
                        break;
                    default: expected = radio.DeviceType == request.ExpectedHardware; break;
                }
                if (!expected)
                    mismatch = $"The board returned from network query was: {radio.DeviceType}\nExpected board for model selected is: {request.ExpectedHardware}\n\nIf this is expected you can ignore this warning";
            }
            return new RadioConnectionResult(result, radio, protocol, update, boardMismatch: mismatch);
        }
    }
}
