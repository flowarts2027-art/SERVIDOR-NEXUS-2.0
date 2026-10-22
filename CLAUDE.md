# Nexus 2.0 — instruções para o Claude Code

@AGENTS.md

## Como falar com o Rodrigo (proprietário)
- Ele é autista e disléxico. Responda em português do Brasil, devagar, um passo por vez, com frases curtas.
- Antes de começar uma tarefa, diga em uma frase o que vai fazer.
- Peça só o necessário. Senhas, tokens e chaves: ele mesmo digita; nunca peça para colar no chat.
- Depois de cada passo que depende dele, espere a resposta antes de seguir.
- Pedido dele (2026-10-14): mande procedimentos em blocos de no máximo 5 passos curtos, para economizar o consumo diário.
- Quando tiver muita coisa para dizer, mande um resumo bem explicado, não um texto longo.
- Evite pedir print. Use o acesso ao navegador quando der e só peça print quando não houver outro jeito.

## Como trabalhar neste projeto
- Leia os arquivos de `docs/nexus-memory/` antes de mudar qualquer coisa (regra do AGENTS.md).
- Único cliente ativo: Flow Arts (`primeiro-teste`, @flowarts2026), agência de marketing e automação com IA. Global Play e Ragnar One estão arquivados e travados para publicar (`BLOCKED_PUBLISH_CLIENTS` em `cloudflare/src/publisher.js`); não reativar.
- Perfil da marca, temas e campanha: `cloudflare/src/client-brand.js` e `cloudflare/src/flowarts-campaign.js`.
- Painel do cliente: `public/portal.html`, `public/client-lite.js`, `public/client-lite.css`. Painel Master: `public/index.html`, `public/app.js`.
- Testes: `cd cloudflare && node --test test/*.test.mjs`. Rode antes de todo commit.
- Deploy: todo push na `main` que muda `cloudflare/` ou `public/` publica na Cloudflare sozinho. Só faça push com os testes passando e com o OK do Rodrigo.
- Nada de publicação real no Instagram para testar. Posts só saem depois que o Rodrigo aprova no painel.
- Ao terminar, atualize `docs/nexus-memory/` com o que foi feito de verdade e o próximo passo.

## Departamentos da Flow Arts (subagentes)
- `.claude/agents/ceo.md`, `marketing.md`, `vendas.md`, `revisor.md` (o Revisor critica e confere fatos antes de chegar ao Rodrigo). Contexto comum em `empresa/visao.md` e `empresa/metricas.md`.
- Standup diário: peça "CEO, rode o standup de hoje". O arquivo fica em `empresa/standup/`.
- Eles só rascunham e recomendam. Publicar, enviar mensagem, gastar ou prometer algo ao cliente: só com o OK do Rodrigo.

## Continuidade de trabalho com ChatGPT — ponte no GitHub

Na abertura de cada sessão, além das leituras exigidas por `AGENTS.md`, consulte `docs/nexus-memory/BRIDGE_PROTOCOL.md`, `TASK_BOARD.md` e **a entrada mais recente** de `HANDOFF_CHATGPT.md`. Antes de alterar arquivos, verifique se outra branch/PR já implementa o pedido; resuma para o Rodrigo o que existe e o que falta.

Ao final, acrescente em `docs/nexus-memory/HANDOFF_CLAUDE.md` um resumo objetivo das decisões, alterações comprovadas, testes, estado do deploy e próximo passo, para que o ChatGPT possa retomar. Nunca informe que leu chats privados ou prompts que não foram escritos na memória. Não publicar alterações na `main`, gastar recursos ou enviar mensagens a terceiros sem as autorizações aplicáveis. Consulte também as regras de privacidade do `BRIDGE_PROTOCOL.md` porque o repositório é público.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- **Sem o comando `graphify` (sessão na nuvem, 22/10/2026):** não instale nada. Leia primeiro `graphify-out/GRAPH_REPORT.md` (só as partes que importam) e procure em `graphify-out/graph.json` com Grep pelo nome da função ou do arquivo (`"label"`, `"source_file"`, `"source_location"`) para achar o arquivo e a linha. Depois abra só esse trecho do código. O mapa pode estar atrasado em relação à `main` (veja "Built from commit" no relatório): confirme no código antes de mudar.
- O mapa se atualiza sozinho no GitHub a cada push na `main` (`.github/workflows/nexus-graphify.yml`); ninguém precisa rodar nada no PC.
- O automático do Claude Code (hook) fica só no PC do Rodrigo, em `.claude/settings.local.json`; não suba esse arquivo.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
