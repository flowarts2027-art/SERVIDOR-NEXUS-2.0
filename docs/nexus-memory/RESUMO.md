# Resumo do Nexus 2.0 — ler PRIMEIRO (atualizado em 27/11/2026)

Este é o único arquivo de memória que toda sessão lê inteiro. Ele substitui a leitura dos 11 arquivos grandes
(cerca de 1 MB, ou uns 250 mil tokens por sessão). O histórico continua guardado: veja "Onde está o resto".
**Mantenha este arquivo curto (até ~12 KB).** Ao terminar uma tarefa, atualize as seções abaixo
em vez de só acrescentar texto no fim.

## O que é
- Nexus: postador automático de Instagram da Flow Arts (agência de marketing e automação com IA). Cada cliente tem um
  painel; o Rodrigo administra tudo pelo Master. Site da agência: flowarts.com.br. Painel: painel.flowarts.com.br.
- Código: Cloudflare Worker em `cloudflare/` (D1 + R2 + crons de 1 e 15 min), páginas em `public/`.
  Repositório público: `flowarts2027-art/SERVIDOR-NEXUS-2.0`. Não guardar aqui dados pessoais, contatos de clientes,
  saúde, dinheiro pessoal, tokens ou senhas.
- Mapa do código: `graphify-out/` (atualizado em 27/11/2026, commit `3f79ba65`).

## Como trabalhar
- Testes: `cd cloudflare && node --test test/*.test.mjs` (1060 testes em 27/11). Rodar antes de todo commit.
- Sempre em branch + pull request. O Rodrigo faz o merge (mande o link direto do PR).
- **Merge na `main` que mexe em `cloudflare/**` ou `public/**` publica o Nexus** (`deploy-nexus-cloudflare.yml`,
  que roda os testes antes). Avise isso no PR.
- Nada de publicação real no Instagram para testar. Posts só saem com a aprovação do Rodrigo ou do cliente no painel
  (exceção: a substituta automática de "cliente nunca fica sem post").
- Ao terminar: atualizar este resumo e escrever 3 a 6 linhas no fim do `HANDOFF_CLAUDE.md`
  (ChatGPT: `HANDOFF_CHATGPT.md`).

## Clientes (ids)
- Flow Arts `primeiro-teste` (@flowarts2026) e Nexus AI `nexus-ai` (@nexusai_system): vendem a automação; campanha do
  brinde "30 legendas prontas" (flowarts.com.br/brinde).
- `daniela-martins` (depilação/epilação e sobrancelha; moldura própria verde-oliva, logo embaixo no meio).
- `maskara-assessoria` (despachante de armas de fogo; ver `REGRA_IMAGENS_MASKARA.md`).
- `quatree-dog` (ração Quatree; foco em venda, ver `QUATREE_DIRETRIZ_VENDAS.md`), `adimax-eduardo-soares` (Adimax).
- GILTEC (locação de equipamentos): `giltec` (Rose, **pausada** em `NEXUS_PAUSED_CLIENTS`), `giltec-locacoes` (Sheila),
  `giltec-neto`. Artes da GILTEC já chegam com texto: só recebem a logo.
- Outros com briefing: `grafica-flash-color`, `trevo-cosmeticos`. Sem briefing (sem moldura): Luciana Carvalho,
  Sabor do Campo, Café Brisa, Meta Review.
- Travados para publicar: Ragnar, Global Play, `demo-cafe` (`BLOCKED_PUBLISH_CLIENTS` em `publisher.js`).

## Como as artes chegam hoje
1. O Rodrigo faz as fotos no Gemini (Gem "FOTOS NEXUS"): só foto, sem texto e sem logo. POST com o assunto à
   esquerda; STORY com o assunto em cima.
2. Envia pela Biblioteca do Master (favorito "Enviar ao Nexus", em lotes de 5) ou pelo conector MCP.
3. O Nexus monta a moldura do cliente (`art-frame.js`, textos em `scripts/social/campanha/textos_*.json`) e cola a logo
   salva no Master. Arte que já chega com texto só recebe a logo. A IA nunca desenha logo.
4. A arte espera aprovação no painel; depois publica no horário fixo do cliente (`REGRA_HORARIOS_CLIENTES.md`).
- O ChatGPT foi cancelado pelo Rodrigo em 20/11; as regras dele (`SISTEMATICA_IMAGENS_CHATGPT.md`) ficam para referência.

## Regras que mais pesam (detalhes no AGENTS.md)
- Nexus não escreve texto na arte (`NEXUS_WRITES_TEXT_ON_ARRIVAL = false`), exceto a moldura de painel dos clientes
  com briefing. Foto do post nunca fica embaixo do painel (`FEED_PHOTO_SCALE` 86%).
- Clientes nunca publicam no mesmo minuto. Arte nunca sai cortada nem fora de proporção.
- Nunca usar #flowart/#flowarts (é malabarismo): usar #FlowArtsMarketing.
- Contato do CRM de busca sem mensagem em 24 h é apagado. Nada de envio automático a quem não chamou.
- Não gastar com API paga nem ligar automação nova sem OK do Rodrigo.

## Estado em 27/11/2026
- No ar: correções da auditoria (trava do login antes da senha; páginas de status só com login; nenhuma página abre
  dentro de outro site; webhook do Instagram sem senha padrão; testes antes do deploy) e privacidade da memória.
- Meta: App Review reenviado em 11/11 (conferir o estado). Até o app ficar Live, o direct do QUERO só chega a testadores.
- WhatsApp: aviso de arte para aprovar ligado para todos menos a Maskara.
- Alcance baixo na Flow Arts e no Nexus AI: estratégia atual é o brinde no link da bio + SEO
  (/brinde e /nexus-movies pedidos ao Google em 26/11; conferir o Search Console a partir de 03/12).
- O Nexus Movies (produto de vídeo de trailer) fica em outro repositório: `flowarts2027-art/banner-do-dia`.

- Moldura/logo com IA fora do ar (27/11): foto pura ganha a moldura e a logo vai no canto padrão; antes saía sem nada.

- Cota grátis do Workers AI (27/11): imagens só até 5.500 neurônios/dia (`ai-budget.js`); o resto fica para as checagens da moldura. Nada pago na Cloudflare.

- Foto sempre à esquerda (27/11): POST com a pessoa nos 45% da esquerda; STORY nos 37% de cima (`photo-zone.js`); post com pessoa à direita é espelhado.

- Moldura nova sem painel (27/11): texto direto na foto, botão centralizado embaixo, tarja fininha na cor do cliente com a logo; checagem de defeito da IA.

## Pendências abertas
- Rodrigo: trocar o link da bio do @nexusai_system para flowarts.com.br/brinde (só pelo celular).
- Conferir 1 arte real com o fundo desfocado do post (o blur do Cloudflare Images não tem teste local).
- Antes de reconfigurar o webhook do Instagram na Meta: conferir o segredo `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`.
- PRs antigos abertos (lista com `gh api repos/flowarts2027-art/SERVIDOR-NEXUS-2.0/pulls`): muitos são de outubro e
  podem estar velhos; perguntar ao Rodrigo antes de juntar.

## Onde está o resto (ler só quando a tarefa precisar)
- Regras fixas por assunto: os arquivos `REGRA_*.md`, `PADRAO_ARTES.md`, `REGRAS_ENVIO_ARTES.md`,
  `FORMATOS_POSTAGENS.md`, `MARKETING_POSICIONAMENTO.md`, `clientes/<id>/`.
- Histórico: `HANDOFF_CLAUDE.md` e `HANDOFF_CHATGPT.md` (só as entradas recentes) e `arquivo/` (tudo de antes).
- Arquivos grandes antigos (`PROJECT_STATE`, `ARCHITECTURE`, `DECISIONS`, `KNOWN_ISSUES`, `TEST_RESULTS`,
  `NEXT_ACTIONS`, `CHANGELOG`, `TASK_BOARD`): **não ler inteiros**. Procure o assunto com grep e abra só o trecho.
