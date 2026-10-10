# Nexus 2.0 — Recuperação segura

## Situação confirmada em 10/10/2026

**A recuperação dos arquivos e dados críticos avançou; a aplicação completa ainda não foi homologada.**

- Repositório novo: `flowarts2027-art/SERVIDOR-NEXUS-2.0`; branch de recuperação: `recovery/nexus-20261010`.
- **Código do Worker recuperado:** `index.js` já está nesta branch. É um bundle de produção (não necessariamente os fontes modulares e o histórico da conta antiga); passou por verificação de sintaxe `node --check`.
- **Cloudflare de produção:** Worker `servidor-nexus` existente; nenhum deploy foi necessário para importar os backups nem para atualizar estes documentos.
- **D1:** dois dumps SQL preservados no computador do proprietário, com SHA-256 conferido. Ambos passaram por importação local SQLite e `PRAGMA integrity_check`: `servidor-nexus` com **23 tabelas**, `globalplay-site-db` com **9 tabelas**.
- **R2:** cópia local dos **123 objetos** (24.988.330 bytes) reportada como verificada pelo proprietário; dados privados não enviados a este repositório.
- `NEXUS_SECRET_KEY` existe como segredo de produção, mas seu **valor não foi recuperado**. Preservar a configuração ativa. Não alterar essa chave.

## O que falta — sem repetir backups nem reinstalar ferramentas

1. Verificar e preservar os **assets estáticos dos painéis** vinculados a `ASSETS`, que podem não estar incluídos no bundle ou no backup R2. Há um script de coleta pública em `scripts/recuperar-assets-publicos.ps1`, mas sua execução e completude ainda não foram confirmadas.
2. Reconstruir ou conferir `wrangler.toml`, routes, triggers/cron, Durable Objects e todos os bindings, sem publicar segredos.
3. **Criado** workflow `.github/workflows/recuperacao-validacao.yml` para `node --check`, compilação e diagnóstico Python, **sem deploy nem credenciais**. O arquivo está na branch; o resultado de execução do GitHub Actions ainda precisa ser confirmado.
4. Validar funcionalmente o painel master/cliente, as APIs, Instagram e o módulo de **geração de vídeo** (inclusive auxiliar Windows), primeiro sem operações destrutivas e só depois com teste autorizado.
5. Planejar eventual deploy com validação e rollback; **nenhuma restauração em produção é autorizada por este documento**.

## Diagnóstico Python (somente leitura)

O script `scripts/diagnostico_nexus.py` foi incluído nesta branch. Usa apenas a biblioteca padrão do Python. A partir da pasta do repositório, executar `python scripts/diagnostico_nexus.py` para inventariar o bundle recuperado, conferir SHA-256 dos dumps locais disponíveis, testar rapidamente cópias SQLite já restauradas e detectar arquivos ausentes. O script **não restaura nem altera dados**, não usa chaves, não publica nada e não substitui testes do painel ou vídeo. Para CI, a variante `python scripts/diagnostico_nexus.py --repo-only` verifica somente o repositório. A execução local no PC do proprietário ainda não foi confirmada.

## Segurança e arquivos locais

Os dumps SQL, cópias R2, segredos, tokens, registros de clientes e metadados privados continuam **fora do GitHub público**. O local privado confirmado dos dumps é `C:\NEXUS-RECUPERACAO\backups-cloudflare\d1-20261010-102025`. A restauração isolada foi criada na subpasta `teste-python-20261010-103706`.

O que já foi feito **não precisa ser repetido**. A validação de integridade dos bancos não é prova de que o gerador de vídeos e os painéis estejam funcionando.

Consulte `STATUS-RECUPERACAO-20261010.md` para o histórico técnico detalhado.
