# Robôs desligados (11/11/2026)

Pedido do Rodrigo: diminuir os robôs do GitHub Actions. A conta foi suspensa em 06/11
(mais de 200 rodadas por dia) e a Meta vai testar o app; nada pode rodar ou publicar sozinho.

O GitHub só executa arquivos dentro de `.github/workflows/`. Os arquivos desta pasta
ficam guardados, sem rodar. Para religar um, mova de volta com o OK do Rodrigo.

Continuam ligados: `ci` (só em PR), `deploy-nexus-cloudflare`, `nexus-campanha-diaria`
(manual), `nexus-agendar-pasta` (pasta `agendamentos/`) e os que o Nexus chama quando
precisa montar arte: `art-compose`, `carousel-card-render`, `social-format-render`.

Desligados: android-apps, atlas-giltec-ci, gemini-fichas, library-ingest, nexus-audit,
nexus-autofix, nexus-core-autonomy, nexus-graphify, nexus-instagram-force,
nexus-overnight-regression, radar-preview-check, reel-template-render,
video-template-render, video-youtube-ingest, video-youtube-search, video-youtube-smoke.
