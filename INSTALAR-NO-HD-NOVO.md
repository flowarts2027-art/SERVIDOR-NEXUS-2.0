# Instalar o Nexus no HD novo (Windows)

Atualizado em 22/10/2026. Vale para o backup `Nexus-backup-2026-10-22.zip` e para o GitHub.

## O que está no backup
- Todo o código do Nexus na versão de 22/10/2026: CRM no painel da Flow Arts, mapa do Graphify e a regra do Graphify no `CLAUDE.md`.
- A memória do projeto (`docs/nexus-memory/`), que o ChatGPT e o Claude leem.

## O que NÃO está no backup (e não se perde com o HD)
- **Senhas, chaves e tokens:** ficam guardados na Cloudflare e no GitHub. Nunca coloque esses dados em arquivo.
- **Banco de dados (clientes, posts, CRM) e as imagens:** ficam na Cloudflare (D1 e R2). O painel continua funcionando sem o seu PC.
- **O automático do Graphify no PC** (`.claude/settings.local.json`): é criado de novo no Bloco 3.

Use os blocos abaixo no **PowerShell**, um comando por vez.

## Bloco 1: instalar os programas
1. `winget install Git.Git`
2. `winget install OpenJS.NodeJS.LTS`
3. `winget install astral-sh.uv`
4. `irm https://claude.ai/install.ps1 | iex` (instala o Claude Code)
5. Feche o PowerShell e abra de novo.

## Bloco 2: trazer o projeto
1. `cd "$HOME\Documents"`
2. `git clone https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0.git`
   - Sem internet: extraia o `Nexus-backup-2026-10-22.zip` em Documentos, numa pasta chamada `SERVIDOR-NEXUS-2.0`. Depois, com internet, prefira o `git clone`, porque o zip não tem o histórico do Git.
3. `cd SERVIDOR-NEXUS-2.0`
4. `git status -sb` (tem que mostrar `## main...origin/main`)

## Bloco 3: Graphify (mapa do código)
1. `uv tool install "graphifyy[sql]"`
2. `uv tool update-shell`, depois feche e abra o PowerShell e volte para a pasta: `cd "$HOME\Documents\SERVIDOR-NEXUS-2.0"`
3. `graphify install`
4. `graphify claude install`
5. `graphify hook install`

Depois do Bloco 3, faça só isto:
- Se existir o arquivo `.claude\settings.json`, renomeie: `Rename-Item .claude\settings.json settings.local.json`. Ele aponta para o seu PC e não pode ir para o GitHub.
- Se `git status` mostrar `CLAUDE.md` mudado, desfaça: `git checkout CLAUDE.md`. A regra do Graphify já está lá.

## Bloco 4: entrar no Claude Code
1. `claude --version` (tem que mostrar um número)
2. `claude` (abre o login no navegador; entre com a sua conta)

## Bom saber
- O mapa do Graphify se atualiza sozinho no GitHub a cada mudança na `main`. Não precisa rodar nada para isso.
- Na primeira vez que você fizer `git push`, o Git abre o navegador para entrar no GitHub.
- Se algum comando der erro, mande o texto do erro no chat, sem senhas.
