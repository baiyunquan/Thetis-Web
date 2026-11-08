using System;
using System.IO;
using System.Text;

namespace Thetis
{
    // Shared static-file response for the Code OSS browser diagnostic.
    public static class EmbeddedWebContent
    {
        public static void SendResponse(Stream stream, string request, string root)
        {
            string[] firstLine = request.Split(new[] { '\r', '\n' }, 2)[0].Split(' ');
            if (firstLine.Length < 3)
            {
                Write(stream, 400, "Bad Request", "text/plain", Encoding.UTF8.GetBytes("400 Bad Request"), false, false);
                return;
            }
            bool head = firstLine[0] == "HEAD";
            if (firstLine[0] != "GET" && !head)
            {
                Write(stream, 405, "Method Not Allowed", "text/plain", Encoding.UTF8.GetBytes("405 Method Not Allowed"), false, false);
                return;
            }
            string target = firstLine[1];
            bool isolated = target.Contains("vscode-coi=3");
            string path;
            try
            {
                string decoded = Uri.UnescapeDataString(target.Split('?', '#')[0]);
                if (!decoded.StartsWith("/") || decoded.Contains("\\") || decoded.Contains(":"))
                    throw new UnauthorizedAccessException();
                string basePath = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
                path = Path.GetFullPath(Path.Combine(basePath, decoded.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
                if (!path.StartsWith(basePath, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(path + Path.DirectorySeparatorChar, basePath, StringComparison.OrdinalIgnoreCase))
                    throw new UnauthorizedAccessException();
                if (Directory.Exists(path)) path = Path.Combine(path, "index.html");
            }
            catch (UnauthorizedAccessException)
            {
                Write(stream, 403, "Forbidden", "text/plain", Encoding.UTF8.GetBytes("403 Forbidden"), head, isolated);
                return;
            }
            catch (Exception ex) when (ex is ArgumentException || ex is NotSupportedException || ex is PathTooLongException || ex is UriFormatException)
            {
                Write(stream, 400, "Bad Request", "text/plain", Encoding.UTF8.GetBytes("400 Bad Request"), head, isolated);
                return;
            }
            if (!File.Exists(path))
            {
                Write(stream, 404, "Not Found", "text/plain", Encoding.UTF8.GetBytes("404 Not Found"), head, isolated);
                return;
            }
            string type;
            switch (Path.GetExtension(path).ToLowerInvariant())
            {
                case ".html": type = "text/html; charset=utf-8"; break;
                case ".js": case ".mjs": type = "application/javascript; charset=utf-8"; break;
                case ".css": type = "text/css; charset=utf-8"; break;
                case ".json": case ".map": type = "application/json; charset=utf-8"; break;
                case ".wasm": type = "application/wasm"; break;
                case ".svg": type = "image/svg+xml"; break;
                case ".png": type = "image/png"; break;
                case ".jpg": case ".jpeg": type = "image/jpeg"; break;
                case ".gif": type = "image/gif"; break;
                case ".webp": type = "image/webp"; break;
                case ".ico": type = "image/x-icon"; break;
                case ".woff": type = "font/woff"; break;
                case ".woff2": type = "font/woff2"; break;
                case ".ttf": type = "font/ttf"; break;
                case ".mp3": type = "audio/mpeg"; break;
                case ".txt": type = "text/plain; charset=utf-8"; break;
                default: type = "application/octet-stream"; break;
            }
            Write(stream, 200, "OK", type, File.ReadAllBytes(path), head, isolated);
        }

        private static void Write(Stream stream, int status, string reason, string type, byte[] body, bool head, bool isolated)
        {
            string headers = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type +
                "\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\n" +
                "Cache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\n" +
                "Cross-Origin-Resource-Policy: cross-origin\r\nX-Content-Type-Options: nosniff\r\n";
            if (isolated) headers += "Cross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\n";
            byte[] bytes = Encoding.ASCII.GetBytes(headers + "\r\n");
            stream.Write(bytes, 0, bytes.Length);
            if (!head) stream.Write(body, 0, body.Length);
            stream.Flush();
        }
    }
}
