# Nexus 2.0 — instruções para o Claude Code

@AGENTS.md

## Como falar com o Rodrigo (proprietário)
- Ele é autista e disléxico. Responda em português do Brasil, devagar, um passo por vez, com frases curtas.
- Antes de começar uma tarefa, diga em uma frase o que vai fazer.
- Peça só o necessário. Senhas, tokens e chaves: ele mesmo digita; nunca peça para colar no chat.
- Depois de cada passo que depende dele, espere a resposta antes de seguir.

## Como trabalhar neste projeto
- Leia os arquivos de `docs/nexus-memory/` antes de mudar qualquer coisa (regra do AGENTS.md).
- Único cliente ativo: Flow Arts (`primeiro-teste`, @flowarts2026), agência de marketing e automação com IA. Global Play e Ragnar One estão arquivados e travados para publicar (`BLOCKED_PUBLISH_CLIENTS` em `cloudflare/src/publisher.js`); não reativar.
- Perfil da marca, temas e campanha: `cloudflare/src/client-brand.js` e `cloudflare/src/flowarts-campaign.js`.
- Painel do cliente: `public/portal.html`, `public/client-lite.js`, `public/client-lite.css`. Painel Master: `public/index.html`, `public/app.js`.
- Testes: `cd cloudflare && node --test test/*.test.mjs`. Rode antes de todo commit.
- Deploy: todo push na `main` que muda `cloudflare/` ou `public/` publica na Cloudflare sozinho. Só faça push com os testes passando e com o OK do Rodrigo.
- Nada de publicação real no Instagram para testar. Posts só saem depois que o Rodrigo aprova no painel.
- Ao terminar, atualize `docs/nexus-memory/` com o que foi feito de verdade e o próximo passo.
