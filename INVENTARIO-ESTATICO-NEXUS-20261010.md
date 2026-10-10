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

## Estado
Nenhuma mudança no Worker de produção foi realizada por este inventário. Backups de D1 e R2 ainda NÃO estão confirmados.
