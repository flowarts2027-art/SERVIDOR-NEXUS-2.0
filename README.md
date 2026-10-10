# Nexus 2.0 — Recuperação segura

## Estado em 10/10/2026

- **Código do Worker recuperado LOCALMENTE; ainda NÃO enviado a este repositório.**
- Repositório novo: `flowarts2027-art/SERVIDOR-NEXUS-2.0`.
- GitHub anterior: `globalplay27/SERVIDOR-GLOBAL-PLAY` (conta bloqueada).
- Worker em produção: `servidor-nexus`, hospedado na Cloudflare. Não alterar o deploy, D1, R2 nem secrets durante a recuperação.
- Login Wrangler na Cloudflare concluído com sucesso no computador do proprietário.
- O comando `wrangler init --from-dash` falhou por incompatibilidade com **Assets**; a recuperação foi feita por outro procedimento.
- Backup local encontrado no histórico: `C:\\NEXUS-RECUPERACAO\\nexus-worker-backup.bin` (~757.598 bytes).
- JavaScript extraído no histórico: `C:\\NEXUS-RECUPERACAO\\nexus-extraido\\index.js` (~757.415 bytes).
- `node --check` no JavaScript extraído terminou sem erro de sintaxe reportado.
- **Não repetir comandos de download/extração:** essa etapa já foi concluída no computador.
- O GitHub novo ainda **não contém** o código resgatado; o arquivo local não está disponível automaticamente para esta integração.

## Próximo passo (sem repetir PowerShell)

1. Transferir o arquivo `nexus-extraido/index.js` já recuperado para um ambiente autorizado de análise. Pode ser por envio de arquivo nesta conversa ou por um fluxo no **modo Work** que tenha acesso à cópia do arquivo / conta Cloudflare.
2. **Revisar segredos e dados sensíveis antes de qualquer publicação.** Este repositório está **PÚBLICO**. Não colocar nele tokens, chaves, credenciais, arquivos `.env` ou dados de clientes.
3. Só depois de uma revisão, reconstruir o projeto (configuração Wrangler, recursos D1/R2, arquivos estáticos e fluxos GitHub Actions) em branch/ambiente de teste.
4. Validar saúde, painel, agentes, Instagram e geração de vídeo antes de modificar o ambiente de produção.

## Limites do backup

O `index.js` extraído pode ser um **bundle de produção**, não uma cópia exata do antigo repositório com histórico Git, assets e arquivos de configuração. D1, R2 e segredos da Cloudflare requerem inventário separado. A existência de um backup local **não confirma** recuperação integral do Nexus.

## Regra de segurança

**Não fazer deploy, delete ou reset de produção durante a recuperação.**
