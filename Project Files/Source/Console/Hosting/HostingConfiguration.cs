using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;

namespace Thetis.Hosting
{
    public sealed class HostingConfiguration
    {
        public string BaseHost { get; private set; }
        public X509Certificate2 Certificate { get; private set; }
        public bool TlsEnabled { get { return Certificate != null; } }

        public HostingConfiguration(string baseHost = "thetis.home.arpa", X509Certificate2 certificate = null)
        {
            baseHost = (baseHost ?? "").ToLowerInvariant();
            if (baseHost.Length > 220 || !Regex.IsMatch(baseHost, @"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*$") || baseHost.EndsWith(".localhost"))
                throw new InvalidDataException("Code host baseHost must be a DNS name such as thetis.home.arpa.");
            BaseHost = baseHost;
            Certificate = certificate;
            if (certificate != null) ValidateCertificate(certificate, baseHost);
        }

        public static HostingConfiguration Load(string path = null)
        {
            path = path ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Thetis", "CodeHost", "hosting.json");
            if (!File.Exists(path)) return new HostingConfiguration();
            try
            {
                JObject config = JObject.Parse(File.ReadAllText(path));
                string host = (string)config["baseHost"] ?? "thetis.home.arpa";
                string thumbprint = ((string)config["certificateThumbprint"] ?? "").Replace(" ", "");
                if (thumbprint.Length == 0) return new HostingConfiguration(host);
                if (!Regex.IsMatch(thumbprint, "^[a-fA-F0-9]{40}$")) throw new InvalidDataException("Invalid certificateThumbprint.");
                using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadOnly);
                    var matches = store.Certificates.Find(X509FindType.FindByThumbprint, thumbprint, false);
                    if (matches.Count != 1) throw new InvalidDataException("Configured leaf certificate was not found in CurrentUser/My.");
                    return new HostingConfiguration(host, matches[0]);
                }
            }
            catch (Exception ex) when (!(ex is OutOfMemoryException))
            {
                throw new InvalidDataException("Cannot start embedded Code host using " + path + ": " + ex.Message, ex);
            }
        }

        private static void ValidateCertificate(X509Certificate2 certificate, string host)
        {
            if (!certificate.HasPrivateKey || certificate.NotBefore.ToUniversalTime() > DateTime.UtcNow || certificate.NotAfter.ToUniversalTime() <= DateTime.UtcNow)
                throw new InvalidDataException("Code TLS certificate must be current and include its private key.");
            var names = new System.Collections.Generic.List<string>();
            foreach (X509Extension extension in certificate.Extensions)
            {
                if (extension is X509BasicConstraintsExtension basic && basic.CertificateAuthority)
                    throw new InvalidDataException("Code TLS certificate must be a leaf certificate.");
                if (extension is X509EnhancedKeyUsageExtension usage && !usage.EnhancedKeyUsages.Cast<System.Security.Cryptography.Oid>().Any(x => x.Value == "1.3.6.1.5.5.7.3.1"))
                    throw new InvalidDataException("Code TLS certificate must permit server authentication.");
                if (extension.Oid.Value != "2.5.29.17") continue;
                byte[] der = extension.RawData;
                int offset = 0;
                if (der.Length == 0 || der[offset++] != 0x30) throw new InvalidDataException("Invalid certificate SAN.");
                int end = ReadLength(der, ref offset) + offset;
                while (offset < end)
                {
                    int tag = der[offset++];
                    int length = ReadLength(der, ref offset);
                    if (length < 0 || offset + length > der.Length) throw new InvalidDataException("Invalid certificate SAN.");
                    if (tag == 0x82) names.Add(Encoding.ASCII.GetString(der, offset, length).ToLowerInvariant());
                    offset += length;
                }
            }
            if (!names.Contains(host) || !names.Contains("*." + host))
                throw new InvalidDataException("Code TLS certificate SAN must include " + host + " and *." + host + ".");
        }

        private static int ReadLength(byte[] bytes, ref int offset)
        {
            if (offset >= bytes.Length) throw new InvalidDataException("Invalid certificate SAN length.");
            int length = bytes[offset++];
            if (length < 128) return length;
            int count = length & 127;
            if (count == 0 || count > 4 || offset + count > bytes.Length) throw new InvalidDataException("Invalid certificate SAN length.");
            length = 0;
            for (int i = 0; i < count; i++) length = checked(length * 256 + bytes[offset++]);
            return length;
        }

        public static bool IsCodePeer(IPAddress address)
        {
            if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
            if (IPAddress.IsLoopback(address)) return true;
            byte[] bytes = address.GetAddressBytes();
            return bytes.Length == 4 && bytes[0] == 192 && bytes[1] == 168 && bytes[2] == 0;
        }

        public bool IsAllowedHost(string host, bool tls)
        {
            string suffix = tls ? BaseHost : "localhost";
            if (string.Equals(host, suffix, StringComparison.OrdinalIgnoreCase)) return true;
            if (!tls && (string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase) || string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase))) return true;
            return Regex.IsMatch(host ?? "", @"^(?:(?:v--)?[0-9a-v]{52}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\." + Regex.Escape(suffix) + "$", RegexOptions.IgnoreCase);
        }
    }
}
