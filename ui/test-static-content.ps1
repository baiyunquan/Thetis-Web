$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$source = Join-Path $repo 'Project Files/Source/Console/EmbeddedWebContent.cs'
if (-not (Test-Path -LiteralPath $source)) { throw 'EmbeddedWebContent has not been implemented.' }
Add-Type -Path $source

$fixture = Join-Path $repo ('build/code-web-test/' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory((Join-Path $fixture 'nested')) | Out-Null
[IO.File]::WriteAllText((Join-Path $fixture 'index.html'), '<h1>hello</h1>')
[IO.File]::WriteAllText((Join-Path $fixture 'nested/index.html'), 'nested')
[IO.File]::WriteAllBytes((Join-Path $fixture 'test.wasm'), [byte[]](0,97,115,109))

function Response([string]$request) {
    $stream = New-Object IO.MemoryStream
    try {
        [Thetis.EmbeddedWebContent]::SendResponse($stream, $request, $fixture)
        return [Text.Encoding]::UTF8.GetString($stream.ToArray())
    } finally { $stream.Dispose() }
}
function Expect([string]$actual, [string]$expected) {
    if (-not $actual.Contains($expected)) { throw "Missing '$expected' in response: $actual" }
}

Expect (Response "GET / HTTP/1.1`r`n`r`n") '<h1>hello</h1>'
Expect (Response "GET /nested/?v=1 HTTP/1.1`r`n`r`n") 'nested'
$wasm = Response "GET /test.wasm?vscode-coi=3 HTTP/1.1`r`n`r`n"
Expect $wasm 'Content-Type: application/wasm'
Expect $wasm 'Content-Length: 4'
Expect $wasm 'Cross-Origin-Embedder-Policy: require-corp'
Expect (Response "GET /%2e%2e/private.txt HTTP/1.1`r`n`r`n") '403 Forbidden'
Expect (Response "GET /..%5cprivate.txt HTTP/1.1`r`n`r`n") '403 Forbidden'
Expect (Response "GET /C:/private.txt HTTP/1.1`r`n`r`n") '403 Forbidden'
Expect (Response "GET /absent HTTP/1.1`r`n`r`n") '404 Not Found'
Expect (Response "POST / HTTP/1.1`r`n`r`n") '405 Method Not Allowed'
$head = Response "HEAD / HTTP/1.1`r`n`r`n"
Expect $head '200 OK'
if ($head.Contains('<h1>')) { throw 'HEAD must omit the body.' }
Write-Host 'Static content checks passed (10 scenarios).'
