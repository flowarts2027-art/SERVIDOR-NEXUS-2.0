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
- Código e remotes (10/11/2026): a conta `flowarts2027-art` do GitHub foi restaurada. O repositório principal volta a ser `https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0` (`main` e `agendamentos`). Antes de usar o PC, confira `git remote -v`, o histórico local e as alterações não enviadas; aponte o remote principal ao GitHub apenas após a conferência. Não envie novas alterações ao GitLab `flow-arts-marketing-digital/servidor-nexus-flowarts`: ele é temporário e será arquivado depois da checagem dos serviços. Ver `docs/nexus-memory/RETORNO_GITHUB_2026-11-10.md`.
- Deploy (10/11/2026): a restauração do GitHub **não autoriza publicação**. Até verificar credenciais e workflows GitHub Actions/Cloudflare, mantenha o procedimento manual pelo PC em `nexus-deploy` (`cd cloudflare && npm run deploy`), **somente com OK explícito do Rodrigo** e após os testes do `docs/nexus-memory/HANDOFF_CLAUDE.md`. Não presuma que um push na `main` dispara ou não dispara deploy; verifique a configuração antes de qualquer merge. Não publique de outra pasta nem religue automações.
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
- Para achar código, use o caminho mais barato (teste de 04/11/2026 em `docs/nexus-memory/TEST_RESULTS.md`). **Arquivo conhecido:** abra direto. **Função ou nome conhecido:** busque o nome em `graphify-out/graph.json`, do jeito descrito na regra abaixo, e abra só o trecho. **Ligações entre partes, ou quando não souber onde procurar:** use `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"` ou `graphify explain "<conceito>"`. Cada `graphify query` custa cerca de 2 mil tokens e pergunta em frases pode trazer o lugar errado: confirme no código. Ponha esta regra em todo prompt de subagente que explore código.
- **Sem o comando `graphify` (sessão na nuvem, 22/10/2026):** não instale nada. Leia primeiro `graphify-out/GRAPH_REPORT.md` (só as partes que importam) e procure em `graphify-out/graph.json` pelo nome da função ou do arquivo para achar o arquivo e a linha. **Atenção: `graph.json` é uma linha só de 3 MB; nunca leia o arquivo inteiro nem use Grep comum nele.** Use sempre só o pedaço: Grep com `-o: true` e um padrão como `"label":"NOME[^}]*` (ou `"source_file":"cloudflare/src/ARQUIVO.js"[^}]*`), com `head_limit` baixo. Depois abra só esse trecho do código. O mapa pode estar atrasado em relação à `main` (veja "Built from commit" no relatório): confirme no código antes de mudar.
- Graphify após restauração do GitHub (10/11/2026): confira o estado do workflow `.github/workflows/nexus-graphify.yml` antes de contar com atualização automática; o mapa pode estar atrasado. Enquanto não validado, atualize pelo PC em `nexus-deploy` com `graphify update .`, revise e envie apenas `graphify-out` ao GitHub.
- O automático do Claude Code (hook) fica só no PC do Rodrigo, em `.claude/settings.local.json`; não suba esse arquivo.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
