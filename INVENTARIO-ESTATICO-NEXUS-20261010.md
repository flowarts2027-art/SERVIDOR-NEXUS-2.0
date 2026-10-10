# Inventário estático do Worker Nexus 2.0 — 2026-10-10

Origem: bundle recuperado `index.js` (14.121 linhas), validado com `node --check`. Este inventário NÃO comprova bindings instalados, dados D1/R2, cron ativo ou disponibilidade da produção.

## Resultado da inspeção
- Sintaxe JavaScript: passou em `node --check`.
- 92 caminhos de API com comparação direta de pathname/path encontrados (contagem de código, não testes de endpoints).
- 47 nomes distintos referenciados como `env.NOME` (referências no código, não confirmação de configuração).
- Handler `scheduled(` presente (não confirma cron trigger configurado).
- Referências a D1: `env.DB`; mídia: `env.MEDIA`, `env.IMAGES`, `env.ASSETS`.
- Chave crítica: `NEXUS_SECRET_KEY` é usada na criptografia AES-GCM de credenciais e na autenticação. Não substituir nem divulgar.
- APIs relevantes: `/api/health`, `/api/autonomy-health`, `/api/instagram-publishing-health`, `/api/master/diagnostic`, `/api/portal/diagnostic`, `/api/emergency-publisher-diagnostic`.
- O painel retorna `github: connected` e `cloudflare: connected` como strings fixas no código: não utilizar esses indicadores como prova de integração real.

## Ordem segura de recuperação
1. Inventariar bindings, triggers e versões do Worker em Cloudflare (somente leitura).
2. Exportar D1 e confirmar integridade do backup, com armazenamento privado.
3. Inventariar/copiar R2 com preservação de arquivos.
4. Preservar nomes e valores existentes dos segredos no ambiente Cloudflare; nunca comitar segredos no repositório público.
5. Só então configurar CI/CD com aprovação para deploy e testar painéis, Instagram e vídeo.

## Atualização de recuperação — 10/10/2026

- Este documento começou como um inventário anterior aos backups. A informação de que D1/R2 ainda não estavam confirmados está superada.
- `index.js` recuperado e presente nesta branch; sintaxe validada, mas não representa necessariamente os arquivos-fonte originais.
- Dumps D1 restaurados localmente com `PRAGMA integrity_check = ok`: **23 tabelas** no `servidor-nexus` e **9 tabelas** no `globalplay-site-db`.
- Backup R2 privado de **123 objetos** reportado como verificado pelo proprietário.
- Leitura do bundle confirma presença de rotas `/api/portal/videos/search`, `/api/portal/videos/youtube`, `/api/local-video-ingest/status` e `/api/internal/video-render/progress`. **Presença da rota no código não demonstra que renderização ou upload estejam funcionando.**
- A verificação pública das rotas do Worker e o teste funcional de vídeo ainda não foram concluídos.
- Os assets de painel e configurações de execução ainda precisam ser recuperados ou comparados com a versão ativa.
- Nenhum deploy nem alteração de produção foi realizado neste inventário. Segredos e backups seguem fora do GitHub público.

