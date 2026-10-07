# Local static server for previewing the site.
# Usage: powershell -ExecutionPolicy Bypass -File tools\serve.ps1 [-Port 8080] [-Open]
# Stop: Ctrl+C or close the window.

param(
  [int]$Port = 8080,
  [switch]$Open
)

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\') + '\'
$prefix = "http://localhost:$Port/"

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
  '.txt'  = 'text/plain; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff2'= 'font/woff2'
  '.mp4'  = 'video/mp4'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Site is running: $prefix  (Ctrl+C to stop)"
if ($Open) { Start-Process $prefix }

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
      $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
      if ($relative -eq '' -or $relative.EndsWith('/')) { $relative += 'index.html' }
      $path = [IO.Path]::GetFullPath((Join-Path $root $relative))

      # Do not serve anything outside the project folder
      if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $path -PathType Leaf)) {
        $response.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      } else {
        $ext = [IO.Path]::GetExtension($path).ToLower()
        $type = $types[$ext]
        if (-not $type) { $type = 'application/octet-stream' }
        $response.ContentType = $type
        $response.Headers.Add('Cache-Control', 'no-store')
        $bytes = [IO.File]::ReadAllBytes($path)
      }
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host "$($response.StatusCode) $($request.Url.AbsolutePath)"
    } catch {
      Write-Host "Error: $_"
    } finally {
      $response.Close()
    }
  }
} finally {
  $listener.Stop()
}
