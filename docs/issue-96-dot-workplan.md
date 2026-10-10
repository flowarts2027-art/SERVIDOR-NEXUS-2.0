# Issue 96 — execução Nexus Core

Status: em andamento, sem deploy validado.

## Dots / entregáveis
- Client UI: integrar o motor `public/video-overlay-core.js` ao painel; prévia 9:16 arrastável e layout premium responsivo.
- Video: criar serialização das camadas e implementação correspondente no render MP4; os efeitos da prévia devem corresponder ao exportado.
- Fixer: corrigir falha de seletor em `setLogoPosition`: usa `$` (querySelector) mas chama `.forEach`; deve usar `$$` (querySelectorAll). Validar também logo, texto e corte.
- QA: testar mouse, touchpad, toque, texto ao digitar, ícones play/pause, seleção do corte, logo, upload PC, busca e download.
- Sentinel: revisar CI, deploy e confirmar commit implantado e eventos de render/callback.
- Auditor: bloquear conclusão quando a prévia diferir do MP4, ou houver falha de publicação.

## Regra de release
Não mesclar na `main` nem anunciar conclusão sem testes ponta a ponta. As tarefas acima são responsabilidades documentadas: este arquivo não aciona agentes sozinho.
