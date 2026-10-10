# Baixar YouTube no PC e enviar ao Nexus

Este auxiliar roda apenas no computador. No fluxo automático, o painel envia um handoff assinado para o helper em `127.0.0.1:8765/handoff`; o helper baixa o trailer, valida o MP4 e envia o arquivo automaticamente ao job do Nexus. A página local continua disponível apenas como diagnóstico/fallback.

Abra `INICIAR.cmd`, ou execute no PowerShell:

```powershell
powershell -NoProfile -File .\scripts\local-youtube\start.ps1
```

A página abre em `http://127.0.0.1:8765/`. A seleção do painel também pode abrir `http://127.0.0.1:8765/?url=LINK_YOUTUBE_CODIFICADO`. O auxiliar precisa estar iniciado neste computador. Após terminar, selecione o arquivo mostrado em **Enviar do PC** no Nexus; a seleção de catálogo/título deve permanecer no painel.

Requisitos existentes: Python 3.10+, Node e FFmpeg/ffprobe no PATH. O launcher encontra primeiro o Python do runtime Codex e também aceita `-PythonPath`, `-NodePath`, `-FfmpegPath`, `-OutputDirectory`, `-Port` e `-NoBrowser`. Instala somente yt-dlp e suas dependências no diretório privado `.runtime`, sem alterar o Python do sistema. Os vídeos ficam na pasta `videos` ao lado do helper por padrão; `.runtime` e `videos` não devem ir ao Git.

O auxiliar exige faixa de áudio identificada pelo YouTube como português, prefere H.264/AAC até 720p e valida o MP4 via ffprobe. Se necessário converte o vídeo para H.264 sem cortar sua duração. Não infere que o canal é oficial: a seleção oficial continua responsabilidade da busca do painel. Sem faixa pt confirmada ou acima de 90 MB, falha explicitamente. Nenhum cookie de navegador é lido. Bloqueios do YouTube podem continuar ocorrendo para alguns vídeos.

O servidor escuta somente `127.0.0.1`, valida Host, Origin, sessão e CSRF; não habilita CORS. Os links de arquivo acessam somente jobs prontos registrados em memória, com ID aleatório. Não há endpoint para ler caminhos arbitrários nem envio automático ao Worker.

Para encerrar, use `Stop-Process -Id PID` com o PID mostrado pelo launcher. Isso não apaga vídeos prontos. Arquivos ficam no disco após reiniciar; abra-os diretamente na pasta indicada.

Teste offline (sem baixar):

```powershell
python -m unittest discover -s scripts/local-youtube -p 'test_*.py'
```


## Fluxo automático atual

1. Mantenha o auxiliar NEXUS iniciado no PC.
2. No painel, clique em **Gerar vídeo**.
3. O painel cria um job `local_generate` e envia um ticket curto ao helper local.
4. O helper baixa no PC e faz upload automático para o Worker.
5. O Nexus inicia a renderização sem upload manual.

Versões antigas do helper, sem a rota `/handoff`, precisam ser reiniciadas a partir do pacote atualizado.
