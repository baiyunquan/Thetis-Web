using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Thetis.Hosting
{
    // Shared net48 text-WebSocket framing. Endpoint handlers retain their own payload and lifetime rules.
    internal static class HostWebSocket
    {
        private static readonly UTF8Encoding StrictUtf8 = new UTF8Encoding(false, true);

        public static void Run(Stream stream, HostHttpRequest request, Func<JObject, bool> onMessage, Func<Action<JObject>, Action<int>, bool> onOpen, int maxMessage = 4096)
        {
            if (maxMessage < 1) throw new ArgumentOutOfRangeException(nameof(maxMessage));
            byte[] key;
            try { key = Convert.FromBase64String(request.Header("Sec-WebSocket-Key")); }
            catch (FormatException) { HostHttpResponse.Write(stream, 400, "Bad Request"); return; }
            if (request.Header("Sec-WebSocket-Version") != "13" || key.Length != 16)
            { HostHttpResponse.Write(stream, 400, "Bad Request"); return; }
            string accept;
            using (var sha = SHA1.Create())
                accept = Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(request.Header("Sec-WebSocket-Key") + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));
            byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
            stream.Write(header, 0, header.Length);
            stream.Flush();
            if (!onOpen(value => Send(stream, 1, Encoding.UTF8.GetBytes(value.ToString(Formatting.None))), code => Close(stream, code))) return;
            using (var message = new MemoryStream())
            {
                bool fragmented = false;
                try
                {
                    while (true)
                    {
                        int first = stream.ReadByte();
                        if (first < 0) return;
                        int second = ReadByte(stream);
                        bool fin = (first & 128) != 0;
                        int opcode = first & 15;
                        if ((first & 112) != 0 || (second & 128) == 0) { Close(stream, 1002); return; }
                        ulong length = (uint)(second & 127);
                        if (length == 126)
                        {
                            length = (uint)(ReadByte(stream) * 256 + ReadByte(stream));
                            if (length < 126) { Close(stream, 1002); return; }
                        }
                        else if (length == 127)
                        {
                            length = 0;
                            for (int i = 0; i < 8; i++) length = (length << 8) | (uint)ReadByte(stream);
                            if (length < 65536 || (length & 0x8000000000000000UL) != 0) { Close(stream, 1002); return; }
                        }
                        bool control = opcode >= 8;
                        if (control && (!fin || length > 125)) { Close(stream, 1002); return; }
                        if (length > (ulong)maxMessage || (!control && (ulong)message.Length + length > (ulong)maxMessage)) { Close(stream, 1009); return; }
                        byte[] mask = ReadExact(stream, 4);
                        byte[] body = ReadExact(stream, (int)length);
                        for (int i = 0; i < body.Length; i++) body[i] ^= mask[i % 4];
                        if (opcode == 8)
                        {
                            if (body.Length == 1) { Close(stream, 1002); return; }
                            if (body.Length >= 2)
                            {
                                int code = body[0] * 256 + body[1];
                                if (!((code >= 1000 && code <= 1014 && code != 1004 && code != 1005 && code != 1006) || (code >= 3000 && code <= 4999)))
                                { Close(stream, 1002); return; }
                                StrictUtf8.GetString(body, 2, body.Length - 2);
                            }
                            Send(stream, 8, body); return;
                        }
                        if (opcode == 9) { Send(stream, 10, body); continue; }
                        if (opcode == 10) continue;
                        if (opcode != 0 && opcode != 1) { Close(stream, opcode == 2 ? 1003 : 1002); return; }
                        if ((opcode == 0 && !fragmented) || (opcode == 1 && fragmented)) { Close(stream, 1002); return; }
                        message.Write(body, 0, body.Length);
                        fragmented = !fin;
                        if (!fin) continue;
                        string json = StrictUtf8.GetString(message.ToArray());
                        JObject value;
                        try { value = JObject.Parse(json); }
                        catch (JsonException) { Close(stream, 1007); return; }
                        if (!onMessage(value)) { Close(stream, 1008); return; }
                        message.SetLength(0);
                    }
                }
                catch (DecoderFallbackException) { Close(stream, 1007); }
                catch (EndOfStreamException) { }
            }
        }

        private static int ReadByte(Stream stream) { int value = stream.ReadByte(); if (value < 0) throw new EndOfStreamException(); return value; }
        private static byte[] ReadExact(Stream stream, int length)
        {
            byte[] data = new byte[length];
            int offset = 0;
            while (offset < length)
            {
                int count = stream.Read(data, offset, length - offset);
                if (count == 0) throw new EndOfStreamException();
                offset += count;
            }
            return data;
        }
        private static void Close(Stream stream, int code) { Send(stream, 8, new byte[] { (byte)(code >> 8), (byte)code }); }
        private static void Send(Stream stream, int opcode, byte[] body)
        {
            lock (stream)
            {
                stream.WriteByte((byte)(128 | opcode));
                if (body.Length < 126) stream.WriteByte((byte)body.Length);
                else if (body.Length <= 65535) { stream.WriteByte(126); stream.WriteByte((byte)(body.Length >> 8)); stream.WriteByte((byte)body.Length); }
                else
                {
                    stream.WriteByte(127);
                    for (int shift = 56; shift >= 0; shift -= 8) stream.WriteByte((byte)((ulong)body.Length >> shift));
                }
                stream.Write(body, 0, body.Length);
                stream.Flush();
            }
        }
    }
}
