param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot 'videos'),
    [string]$PythonPath,
    [string]$FfmpegPath,
    [string]$NodePath,
    [int]$Port = 8765,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
# Dependencies stay beside this helper. No system installation or credentials.
$runtimeDirectory = Join-Path $PSScriptRoot '.runtime'
if (-not $PythonPath) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
    if (Test-Path -LiteralPath $bundledPython) { $PythonPath = $bundledPython }
    else {
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
        if ($pythonCommand -and $pythonCommand.Source -notlike '*WindowsApps*') { $PythonPath = $pythonCommand.Source }
        else {
            $pyCommand = Get-Command py -ErrorAction SilentlyContinue
            if ($pyCommand) { $PythonPath = (& $pyCommand.Source -3 -c 'import sys;print(sys.executable)') }
        }
    }
}
if (-not $PythonPath -or -not (Test-Path -LiteralPath $PythonPath)) { throw 'Python 3.10+ não encontrado. Informe -PythonPath com o Python existente.' }
if (-not $FfmpegPath) { $FfmpegPath = (Get-Command ffmpeg -ErrorAction Stop).Source }
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
$probePath = Join-Path (Split-Path -Parent $FfmpegPath) 'ffprobe.exe'
if (-not (Test-Path -LiteralPath $probePath)) { throw 'ffprobe precisa estar ao lado do ffmpeg.' }
New-Item -ItemType Directory -Force -Path $runtimeDirectory, $OutputDirectory | Out-Null
& $PythonPath -c 'import sys;sys.path.insert(0,sys.argv[1]);from yt_dlp import YoutubeDL' $runtimeDirectory 2>$null
if ($LASTEXITCODE -ne 0) {
    & $PythonPath -m pip install --disable-pip-version-check --target $runtimeDirectory 'yt-dlp[default]==2026.8.19'
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar a dependência privada yt-dlp.' }
}
$arguments = @((Join-Path $PSScriptRoot 'helper.py'), '--deps', $runtimeDirectory, '--output', $OutputDirectory, '--ffmpeg', $FfmpegPath, '--node', $NodePath, '--port', $Port)
# Run hidden, retaining diagnostic logs next to the private runtime.
$quotedArguments = $arguments | ForEach-Object { '"' + $_ + '"' }
$service = Start-Process -FilePath $PythonPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'stdout.log') -RedirectStandardError (Join-Path $runtimeDirectory 'stderr.log')
Start-Sleep -Milliseconds 800
if ($service.HasExited) { throw ('Serviço local não iniciou. Consulte ' + (Join-Path $runtimeDirectory 'stderr.log')) }
# O auxiliar roda oculto. O painel envia /handoff diretamente; nenhuma página localhost é aberta.
Write-Output ('Nexus local: http://127.0.0.1:' + $Port + '/ — PID ' + $service.Id)
Write-Output ('Vídeos salvos em: ' + (Resolve-Path -LiteralPath $OutputDirectory))
