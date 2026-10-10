# Recuperacao local de assets publicos do Nexus. Nao faz deploy.
param(
  [string]$BaseUrl = "https://servidor-nexus.diamantehinode2015.workers.dev",
  [string]$Destino = "C:\NEXUS-RECUPERACAO\assets-publicos"
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$base = $BaseUrl.TrimEnd('/')
$paths = @("/", "/index.html", "/portal.html", "/master", "/master/", "/favicon.ico")
$seen = New-Object 'System.Collections.Generic.HashSet[string]'
$queue = New-Object 'System.Collections.Generic.Queue[string]'
foreach ($p in $paths) { $queue.Enqueue($p) }
$report = @()
while ($queue.Count -gt 0 -and $seen.Count -lt 150) {
  $p = $queue.Dequeue()
  if ($p -notmatch '^/[a-zA-Z0-9_./%-]+$' -or $p.Contains('..') -or !$seen.Add($p)) { continue }
  $uri = $base + $p
  try {
    $res = Invoke-WebRequest -Uri $uri -UseBasicParsing -MaximumRedirection 3 -TimeoutSec 20
    $type = [string]$res.Headers['Content-Type']
    $content = [string]$res.Content
    if ($res.StatusCode -ne 200 -or $type -match 'application/json' -or $content -match '(?i)<form[^>]+(login|password)') { continue }
    $name = $p.TrimStart('/')
    if (!$name -or $name.EndsWith('/')) { $name += 'index.html' }
    if ($name -notmatch '\.[a-zA-Z0-9]+$') { $name += '.html' }
    $file = Join-Path $Destino ($name.Replace('/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path $file) | Out-Null
    if ($res.RawContentStream) {
      $stream = New-Object System.IO.MemoryStream
      $res.RawContentStream.CopyTo($stream)
      [System.IO.File]::WriteAllBytes($file, $stream.ToArray())
    } else { [System.IO.File]::WriteAllText($file, $content) }
    $report += [pscustomobject]@{ path=$p; file=$name; bytes=(Get-Item $file).Length; type=$type }
    if ($type -match '(text/html|javascript|text/css)' -or $name -match '\.(html|css|js)$') {
      $matches = [regex]::Matches($content, '(?:src|href)\s*=\s*["'']([^"'']+)["'']')
      foreach ($m in $matches) {
        $raw = $m.Groups[1].Value
        if ($raw.StartsWith('/')) { $target=$raw.Split('?')[0] }
        elseif ($raw -match '^(https?:|//|data:|#|mailto:|javascript:)') { continue }
        else { $target=('/' + (($p.TrimStart('/') -split '/')[0..([Math]::Max(0,($p.TrimStart('/') -split '/').Length-2))] -join '/') + '/' + $raw).Replace('//','/') }
        if ($target -match '\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?|html)$' -and !$seen.Contains($target)) { $queue.Enqueue($target) }
      }
    }
  } catch {
    $report += [pscustomobject]@{ path=$p; file=''; bytes=0; type=('ERROR: ' + $_.Exception.Message) }
  }
}
$report | Export-Csv -Path (Join-Path $Destino 'inventario.csv') -NoTypeInformation -Encoding UTF8
Write-Host "Inventario local criado em $Destino"
$report | Format-Table -AutoSize
Write-Host "ATENCAO: arquivos publicos nao equivalem ao codigo-fonte completo. Revise antes de enviar ao GitHub."
