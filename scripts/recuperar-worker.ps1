# Nexus 2.0 - recuperacao local (somente leitura na Cloudflare)
# Executar no Windows PowerShell, apos instalar Node.js:
# powershell -ExecutionPolicy Bypass -File .\scripts\recuperar-worker.ps1
# Nao faz deploy, nao apaga recursos e nao envia codigo para GitHub.
$ErrorActionPreference = 'Stop'
$workerName = 'servidor-nexus'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFolder = Join-Path $HOME "NEXUS-RECUPERACAO-$timestamp"
New-Item -ItemType Directory -Path $backupFolder -ErrorAction Stop | Out-Null
Write-Host "Pasta local de recuperacao: $backupFolder"
Write-Host 'Esta etapa NAO envia arquivos para o GitHub nem publica na Cloudflare.'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js nao encontrado. Instale Node.js (nodejs.org) e execute o script novamente.'
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx nao encontrado. Reinstale Node.js (nodejs.org).'
}
Push-Location $backupFolder
try {
  Write-Host 'Abrindo autenticacao oficial da Cloudflare, se necessaria...'
  & npx --yes wrangler@4 whoami
  if ($LASTEXITCODE -ne 0) {
    & npx --yes wrangler@4 login
    if ($LASTEXITCODE -ne 0) { throw 'O login Cloudflare nao foi concluido.' }
  }
  Write-Host "Tentando recuperar uma copia LOCAL do Worker '$workerName'..."
  Write-Host 'Se houver pergunta para publicar/deploy, responda NAO.'
  & npx --yes wrangler@4 init --from-dash $workerName
  if ($LASTEXITCODE -ne 0) {
    throw 'A copia automatica falhou. Verifique a mensagem; nao faca deploy. Consulte RECUPERACAO.md.'
  }
  Write-Host 'Copia local concluida pelo Wrangler. Verifique o conteudo antes de qualquer envio.'
  Write-Host "Arquivos locais: $backupFolder"
  Write-Host 'Proteja esta pasta: ela pode conter configuracoes privadas.'
} finally {
  Pop-Location
}
