# HANDOFF_CLAUDE

Só as entradas recentes. Antes de 2026-11-17: `arquivo/HANDOFF_CLAUDE_ate-2026-11-17.md`. Resumo atual: `RESUMO.md`.
Escreva no FIM, 3 a 6 linhas por entrada.

## 18/11/2026 — Regra de imagens da Maskara (PR aberto, sem merge)
- Pedido do Rodrigo: o ChatGPT bloqueia imagens com arma nas campanhas da Maskara e os DOTs entregam imagens ruins.
- Criado `docs/nexus-memory/REGRA_IMAGENS_MASKARA.md` com o jeito certo de pedir (contexto legal, arma parada em mesa/bancada/maleta, nunca na mão, sem texto e sem logo), 3 modelos de pedido e o plano B sem arma. Aviso no `AGENTS.md`.
- A regra não desliga o filtro da OpenAI; só padroniza o pedido. Só documentação, sem código, sem deploy.
- Próximo passo: Rodrigo aprova o merge e manda o ChatGPT ler a regra.
- 18/11 (mesmo PR): auditoria dos DOTs. Causa da logo errada: o ChatGPT não tem carimbador de verdade; qualquer edição de imagem dele redesenha a logo. O carimbador real é o Nexus (`ja_tem_texto: false` no `nexus_enviar_arte`), mas ele usava só a identidade fixa do deploy (na Maskara, só o nome escrito) e ignorava a logo salva no Master.
- Correção em `cloudflare/src/mcp-server.js`: com `ja_tem_texto: false`, o conector lê a marca do cliente (`effectiveBrand`) e passa o `logoKey` do Master para `composeFramed`. Sem logo no Master ou com erro na leitura, mantém a identidade do deploy. Descrição do campo `ja_tem_texto` agora manda usar `false` e nunca pedir logo à IA. 3 testes novos em `art-frame.test.mjs`; suíte 1038 de 1038.
- Regras dos DOTs atualizadas: `DOTS_MARKETING_TRANSFERENCIA.md`, `SISTEMATICA_IMAGENS_CHATGPT.md`, `AGENTS.md` e `REGRA_IMAGENS_MASKARA.md` (Maya entrega foto limpa; Bento envia com `ja_tem_texto: false`; ninguém pede logo à IA).
- ATENÇÃO deploy: o PR mexe em `cloudflare/**`; o merge na `main` dispara `deploy-nexus-cloudflare.yml`.
- Próximo passo: depois do merge, o ChatGPT reler as regras e enviar 1 arte de teste da Maskara com `ja_tem_texto: false`; conferir no painel se a logo é a do Master.

## 18/11/2026 — logo com fundo próprio sem cartão branco (Claude, sessão na nuvem)
- Pedido do Rodrigo: a logo oficial da GILTEC (quadrado azul-escuro) aparecia no painel do cliente dentro de um cartão branco, que ele achou feio. Logo e cores das contas GILTEC, Quatree Dog e Adimax foram reenviadas pelo Master hoje (logo salva no Master, para o carimbador usar).
- Causa: `public/brand-editor.js` marcava a logo como "escura" (`logoDark`) e o painel (`client-lite.js`) põe logo escura num cartão branco.
- Correção: `isDarkLogo` devolve `false` quando a borda inteira da logo é opaca (logo com fundo próprio). Logos transparentes escuras continuam com cartão. Teste ajustado em `brand-editor.test.mjs`; suíte 1038 de 1038.
- O servidor só recalcula `logoDark` quando a logo muda: depois do deploy, reenviar a logo da GILTEC (Rose, Neto, Sheila) pelo Master.
- ATENÇÃO deploy: mexe em `public/**`; o merge na `main` dispara `deploy-nexus-cloudflare.yml`.

## 18/11/2026 (tarde) — Nexus não escreve mais texto; só cola a logo do Master (Claude, sessão na nuvem)
- Pedido do Rodrigo: arte da GILTEC chegou com texto e sem logo. Ele mandou tirar a regra de "só carimbar foto limpa" e parar de escrever texto no painel ("já teve muito erro de escrever por cima"). Texto, só no ChatGPT.
- `art-frame.js`: `NEXUS_WRITES_TEXT_ON_ARRIVAL = false`, nova `stampLogo` (cola só a logo do Master, sem cortar nem encolher a arte) e `logoPositionFor` (canto de cima à direita; Daniela Martins embaixo, no meio).
- `client-uploads.js`: toda imagem que chega (conector, Master, painel do cliente) ganha a logo do Master; sem logo salva, vai como veio; erro ao colar não trava o envio.
- `mcp-server.js`: o conector não monta mais moldura de texto; `ja_tem_texto` ficou só por compatibilidade (schema igual, para não quebrar o ChatGPT).
- `art-text-fix.js`: o agente que escrevia texto em post aberto fica parado pela mesma chave.
- Fora do escopo: substitutas geradas pelo próprio Nexus (`post-watcher.js`, "cliente nunca sem post") continuam como estavam.
- Testes: suíte inteira passando (1038).
- ATENÇÃO deploy: mexe em `cloudflare/**`; o merge dispara `deploy-nexus-cloudflare.yml`.
- Próximo passo: enviar a logo da Daniela Martins pelo Master; testar 1 arte da GILTEC e conferir a logo no painel antes de aprovar.
- 18/11 (16h30): carimbo da logo testado na GILTEC (funcionou). Rodrigo pediu logo com o dobro do tamanho sem cortar no post: `stampLogo` agora usa 20% da largura (story 22%; Daniela embaixo 30%) e margem de 5% (a grade 3:4 do perfil corta ~3% de cada lado). Suíte inteira passando. Merge dispara o deploy.
- 18/11 (17h20): na arte "Exaustores para obra" (GILTEC) a logo cobriu o título. Correção: `stampLogo` recorta cada canto e pergunta à IA grátis (mesmo modelo da checagem de texto) se há texto; usa o primeiro canto livre (cima-direita, cima-esquerda, baixo-direita, baixo-esquerda; Daniela começa embaixo no meio). Nenhum livre: a arte vai sem logo e o upload registra "sem-logo-canto-ocupado". Regra do canto livre também em `SISTEMATICA_IMAGENS_CHATGPT.md`. A arte dos exaustores já carimbada precisa ser reenviada pelo ChatGPT.
- 18/11 (17h30): Rodrigo não conseguia deixar o menu do painel da GILTEC amarelo (o "Cor do texto" era escurecido para dar leitura e virava marrom). Agora o menu usa a cor PURA (`colors.menu`), com letras pretas ou brancas (`colors.onMenu`); títulos e links continuam com a versão escurecida (`colors.text`). Editor do Master mostra e regrava a cor pura. Precisa salvar de novo a cor no Master para valer.
- 18/11 (18h): Rodrigo pediu para pausar só a GILTEC da Rose; a Sheila (`giltec-locacoes`) tinha entrado na pausa por engano. Tirada de `NEXUS_PAUSED_CLIENTS` (fica só `giltec`). Posts dela que perderam o horário foram reagendados pelo painel dela (rota `/api/portal/posts/:id/schedule`): posts de 13, 14, 15, 16 e 18/11 para 26 a 30/11 às 09:32; stories de 13, 14, 15, 16 e 18/11 para 23 a 27/11 às 17:37. Ficaram aprovados e agendados.

## 20/11/2026 — Moldura automática da Daniela Martins (Claude, sessão na nuvem)
- Pedido do Rodrigo: o ChatGPT demora, erra e repete imagem. As fotos da Daniela passam a vir do Gemini (Gem "FOTOS NEXUS", só foto, sem texto) e o painel dela aplica a identidade dela sozinho. Ele escolheu: o Nexus escreve os textos.
- `scripts/social/moldura_daniela.py` + `campanha/textos_daniela.json`: 9 textos de post (7 depilação, 2 sobrancelha) e 6 de story, todos vendendo a depilação com a Daniela. Camadas transparentes feitas no deploy (chamado por `molduras_upload.py`). Fontes OFL novas em `scripts/social/fonts` (Gelasio, Crimson Text itálico, Montserrat).
- `art-frame.js`: `PANEL_CLIENTS`, `hasPanel`, `pickPanel` (tema + contador no R2 `molduras-estado/<cliente>.json`), `isEyebrowPhoto`, `composePanel` (foto cobre a tela + moldura + logo do Master no centro da faixa de baixo; sem logo no Master, usa `public/brand/daniela-martins-logo.png`). `visionAsk` devolve null quando a IA falha.
- `client-uploads.js`: para a Daniela, foto sem texto ganha a moldura (`moldura-da-cliente`); com texto, só a logo como antes. Outros clientes não mudam (`NEXUS_WRITES_TEXT_ON_ARRIVAL` continua false).
- Testes: `test/art-panel.test.mjs` (6); suíte inteira 1046 de 1046.
- ATENÇÃO deploy: mexe em `cloudflare/**` e nos arquivos da moldura; o merge na `main` dispara `deploy-nexus-cloudflare.yml`.
- Próximo passo: depois do merge, subir 1 foto do Gemini no painel da Daniela e conferir a arte antes de aprovar.

## 20/11/2026 (tarde) — Botão "Enviar ao Nexus" (Gemini → Biblioteca) e correção da moldura da Daniela
- Rodrigo cancelou o ChatGPT; as fotos agora vêm do Gemini (Gem "FOTOS NEXUS", conta compartilhada). Sem API por enquanto (não pode pagar este mês).
- Teste de 20/11: das 16 fotos enviadas à Biblioteca da Daniela, as de post saíram SEM moldura: `artText` = "ja-tinha-texto" (a IA grátis disse que havia texto em foto limpa) e "sem-logo-erro". Os stories saíram com "moldura-da-cliente". E 5 posts viraram 1 carrossel (lote enviado junto).
- Correção: `addToLibrary` marca fotos com `origem=gemini` como `clean` e `single`; `planLibrary` nunca junta `single` em carrossel; `organizeLibrary` manda `fotoLimpa=1`; `createClientUpload` pula a pergunta "já tem texto?" quando `fotoLimpa=1`.
- Novo: `public/gemini.html` (página para arrastar o favorito "Enviar ao Nexus") e receptor em `public/biblioteca.js` (`/biblioteca?gemini=1`): o favorito pega as fotos da conversa do Gemini, deixa em 1080x1350 / 1080x1920 e manda por postMessage; o Rodrigo escolhe o cliente, desmarca o que não quer e envia.
- Testes: 1047 de 1047.
- ATENÇÃO deploy: mexe em `cloudflare/**` e `public/**`; o merge dispara o deploy.
- Próximo passo: depois do merge, testar com 1 foto da Daniela; depois reenviar as fotos de 23–25/11 da Daniela pelo botão (os posts atuais estão sem moldura e esperando aprovação).


## 2026-11-20 (11h) — Claude: moldura de painel para todos os clientes
- Pedido do Rodrigo: toda foto pura (Gemini) que sobe em qualquer painel ganha a moldura do cliente (cor, textos, logo), igual à Daniela.
- Feito: `scripts/social/moldura_clientes.py` + `scripts/social/campanha/textos_clientes.json` (Flow Arts, Nexus AI, Maskara, Quatree Dog, Adimax, GILTEC e vendedores, Gráfica Flash Color, Trevo Cosméticos). `hasPanel` deixou de ser só da Daniela; tema "geral" para os outros (`panelThemeFor`).
- Fora por falta de briefing: Luciana Carvalho, Sabor do Campo, Café Brisa, Meta Review.
- Testes: 1048/1048. Merge autorizado pelo Rodrigo nesta data.
- Também: 10 imagens velhas (29/10) presas na Biblioteca da Flow Arts foram tiradas a pedido dele.
- Próximo passo: conferir uma foto real subindo em outro cliente; atualizar o Gem FOTOS NEXUS com o tema de cada cliente.

## 2026-11-20 (19h30) — Claude: Biblioteca envia em lotes de 5
- Problema comprovado: em envios de 27 fotos (Adimax e Maskara), cerca de metade saiu sem moldura (`sem-moldura-erro`) e, na Maskara, 18 posts saíram repetidos (apagados à mão). As 23 artes sem moldura foram montadas no navegador e trocadas por `/biblioteca/trocar`.
- Correção: `public/biblioteca.js` manda as fotos em lotes de 5 (um pedido por lote, em sequência), no envio do Gemini e no envio comum. Botão travado contra clique duplo. Também saíram: frases novas da Maskara (aquisição legal e transferência de titularidade) e nova tentativa da moldura (PR 663); Biblioteca `?completar=AAAA-MM-DD` (PR 662).
- Gemini: habilidade "fotos-nexus" criada (cópia das regras do Gem FOTOS NEXUS); embalagens oficiais da Adimax anexadas ao Gem.
- Próximo passo: conferir o próximo envio grande; levar para o servidor o encaixe da foto no story (hoje feito à mão).

## 21/11/2026 — Claude: brinde "30 legendas prontas" (link da bio) + campanha da Flow Arts
- Contexto: auditoria do alcance. Flow Arts (25 seguidores) e Nexus AI quase sem alcance; Daniela Martins alcança 2 a 4% dos seguidores (normal). Rodrigo decidiu focar num brinde grátis no link da bio. O "Comente BRINDE" no direct fica para depois do app Live (hoje só testadores recebem o direct).
- Feito no Instagram (com OK dele): bio do @nexusai_system trocada (era de IPTV); nome "Nexus AI | Automação de Instagram" salvo na Central de Contas. O link (globalplay.fun) só muda pelo celular.
- Novo: `public/brinde.html` (flowarts.com.br/brinde): nome + WhatsApp + tipo de negócio → baixa `public/downloads/30-legendas-flowarts.pdf` na hora e mostra o botão do teste grátis no WhatsApp.
- `cloudflare/src/landing.js`: `/api/public/lead` aceita `oferta: "brinde"` (sem nome do negócio); vira contato MORNO no CRM da Flow Arts (`primeiro-teste:brinde:<whats>`, source_url `/brinde`, próxima ação em 24 h). `site-analytics.js` passa a contar visitas de `/brinde` (links pessoais `/brinde/...` continuam fora).
- PDF: fonte em `scripts/social/brinde/30-legendas.html`, gerar com `python3 scripts/social/brinde/gerar_pdf.py`.
- Campanha: Rodrigo quer as fotos feitas no Gemini (só foto, sem texto) e a moldura do Nexus com as frases. `textos_clientes.json` da Flow Arts agora tem 7 textos de feed e 3 de story do brinde; novo campo opcional `botao` troca o "COMENTE QUERO" (Flow Arts: "BAIXE GRÁTIS NA BIO"/"TOQUE NO LINK DA BIO"; os outros clientes não mudam). Um carrossel de teste (24/11 12h, feito por código) entrou no painel esperando aprovação: recusar.
- Testes: 1051/1051. ATENÇÃO: mexe em `cloudflare/**` e `public/**`; o merge dispara o deploy.
- Próximo passo: Rodrigo trocar o link da bio do @flowarts2026 para flowarts.com.br/brinde (só pelo celular) e aprovar a campanha; depois fazer o mesmo no Nexus AI.
- 21/11 (9h): fotos do brinde feitas no Gemini (conta zyclow171, Gem FOTOS NEXUS) e enviadas pela Biblioteca à Flow Arts; moldura nova aplicada. Rodrigo escolheu trocar as legendas e já aprovar: 7 posts, um por dia, 25/11 a 01/12 às 12h, com legendas do brinde (rota do painel /content, que aprova). Correção: `gift-cta-fix.js` não põe mais o "Comente QUERO" em posts com `source=client_manual` (legenda trocada à mão no painel). Teste novo `test/gift-cta-fix.test.mjs`; suíte 1052/1052.

## 26/11/2026 — Claude: skills do ECC adaptadas (só documentação, sem código)
- Pedido do Rodrigo: auditar o repositório github.com/affaan-m/ECC (MIT) e implantar o que serve para o Nexus, o CRM e o Nexus Movies.
- Feito: 7 skills em português em `.claude/skills/`: campanha-marketing, voz-da-marca, motor-de-conteudo, legendas-por-rede, inteligencia-de-leads, seguranca-agente-ia, auditoria-producao. Todas seguem as regras do AGENTS.md (logo só pelo Nexus, foto sem texto, lote de 7 dias, nada sai sem aprovação, nunca envio automático a estranhos). Crédito em `THIRD_PARTY_NOTICES.md`.
- NÃO instalado de propósito: hooks, workflows, agentes em massa e o coletor no GitHub Actions do ECC (gasto de limite e risco de nova suspensão).
- Não dispara deploy (não mexe em `cloudflare/**` nem `public/**`). Testes de código não mudam.
- Nexus Movies (repositório banner-do-dia): acesso negado nesta sessão; as skills de vídeo (Remotion, FFmpeg), instalador do Windows e design ficam pendentes para lá.
- Próximo passo: Rodrigo aprovar o PR; depois criar o `voz.md` do primeiro cliente com a skill voz-da-marca.

## 26/11/2026 (17h40) — Claude: campanha de 7 dias do Nexus AI (brinde), textos da moldura
- Rodrigo aprovou o ângulo "brinde grátis" (30 legendas prontas no link da bio + teste grátis de 7 dias) para o @nexusai_system, usando a skill campanha-marketing.
- Feito: `textos_clientes.json` do `nexus-ai` com 7 textos de feed e 3 de story do brinde (botão "BAIXE GRÁTIS NA BIO" / "TOQUE NO LINK DA BIO"); os 4+2 textos antigos saíram (ficam no histórico do git). Molduras conferidas localmente com `molduras_upload.py`.
- Correção: `textos_clientes.json` entrou nos caminhos do `deploy-nexus-cloudflare.yml` (antes, mudar só esse arquivo não refazia as molduras).
- Testes: 1052/1052. ATENÇÃO: o merge dispara o deploy.
- Fotos: serão feitas no Gemini (Gem FOTOS NEXUS), só foto, sem texto e sem logo; robôs fofos (Claude laranja, ChatGPT branco), tema azul, luz dourada; POST com o assunto à esquerda, STORY com o assunto em cima.
- Pendente: Rodrigo trocar o link da bio do @nexusai_system para flowarts.com.br/brinde (só pelo celular).

## 26/11/2026 (18h) — Claude: Nexus AI, moldura mais clara e fotos refeitas
- Rodrigo achou o painel azul-escuro (#031438) pesado e pediu algo mais clean: `nexus-ai` passa a painel #2f86e8 e destaque branco (opção B do teste). Só cor; textos do brinde iguais.
- Os 7 posts do brinde foram apagados do painel (robôs cortados pela moldura; 1 já aprovado, Rodrigo se arrependeu). Os 3 stories ficaram.
- Rodrigo não gostou dos robôs "de massinha"; mandou referência: robôs brancos brilhantes com visor preto e olhos de luz (azul ChatGPT, laranja Claude), neon, cena real. Fotos novas pedidas ao Gemini nesse estilo, com o assunto bem à esquerda.
- Lição: a Biblioteca do Master só funciona logada em painel.flowarts.com.br (o endereço workers.dev dá 401).

## 26/11/2026 (18h15) — Claude: regra "foto do post não fica embaixo do painel"
- Pedido do Rodrigo: regra no Nexus para ajustar o tamanho da foto e o painel da moldura nunca cobrir o assunto.
- Feito: `composePanel` (POST) põe a foto com 86% (`FEED_PHOTO_SCALE`) no canto de cima à esquerda, com a mesma foto desfocada (Cloudflare Images, blur 60) no fundo. Story não mudou. Vale para todos os clientes com moldura de painel (inclui Daniela).
- Gemini: pedir o assunto à esquerda, mas a foto cobrindo a imagem inteira. Pedir "medida em %" fez o Gemini devolver foto pequena com área branca.
- Testes: 1052/1052 (`art-panel.test.mjs` atualizado). O merge dispara o deploy. Falta conferir 1 arte real depois do deploy (o blur do Images não tem teste local).

## 26/11/2026 (18h50) — Claude: SEO, pesquisa de palavras e brinde aberto ao Google
- Search Console (conta flowarts2027, /u/1, 3 meses): 225 impressões, 3 cliques, quase só buscas pela marca ("flow artes", "flow arts"). Não serve para descobrir demanda.
- Google Trends (Brasil, 30 dias): "legendas para instagram" (29) > "automação instagram" (16); "postagem automática" e "resposta automática instagram" ~0. Em alta em entretenimento na semana: "blade runner 2099" (ideia para o Nexus Movies).
- Feito: /brinde liberado no robots.txt (downloads seguem bloqueados), entrou no sitemap, título/descrição/H1 com "legendas para Instagram", meta robots index e JSON-LD (WebPage + CreativeWork grátis). Teste novo `site-seo-brinde.test.mjs`.
- Próximo passo: depois do deploy, pedir a indexação de /brinde no Search Console; depois a página do Nexus Movies com o filme em alta da semana.

## 26/11/2026 (19h10) — Claude: página /nexus-movies no site da Flow Arts
- Pedido do Rodrigo: propaganda do Nexus Movies no site. Página nova `public/nexus-movies.html` (mesmo molde das páginas de serviço): o que é, o que faz, passo a passo (Escolher, Banner, Vídeo, Legenda), perguntas, botão "Testar grátis por 7 dias" para https://nexusmovies.pages.dev/. Sem preço (o crédito é configurável no painel) e sem imagem de filme (direito autoral).
- Entrou no sitemap, no `run_worker_first` e no rodapé da home e das 3 páginas de serviço. Teste novo `site-nexus-movies.test.mjs`; suíte 1057/1057.
- Pendente: vídeo de exemplo na página (precisa de um vídeo nosso, sem trailer de estúdio); pedir indexação depois do deploy.
- Nexus Movies (repo banner-do-dia): PR #33 — vídeo não sai mais mudo sem aviso ("O Guerreiro Banido" saiu sem faixa de som). O ajudante baixou o trailer do link com som no teste; a mensagem que o Rodrigo viu era "escolha o filme primeiro".

## 27/11/2026 (10h40) — Claude: correções de segurança da auditoria (skill auditoria-producao)
- Login do Master (`/api/auth/login`, `/master-login`, `/api/master/desktop-login`, `/api/master/access`): a trava por IP vem ANTES de conferir a senha. Antes, quem tentava adivinhar seguia tentando e entrava se acertasse, mesmo bloqueado. Com o D1 fora do ar, o login segue liberado.
- `/api/instagram-publishing-health` (consultava a Meta para cada cliente, sem login) e `/api/emergency-publisher-status` agora pedem a chave interna (Bearer) ou o login do Master. O `nexus-autofix.mjs` manda o Bearer quando tiver `NEXUS_SECRET_KEY`.
- `frameGuard` (`cloudflare/src/frame-guard.js`): toda resposta sai com `X-Frame-Options: DENY` e `frame-ancestors 'none'`.
- Webhook do Instagram: sem senha padrão no código; sem o segredo `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` a verificação falha (antes de reconfigurar o webhook na Meta, conferir que o segredo existe na Cloudflare).
- Deploy: `deploy-nexus-cloudflare.yml` roda os testes do Worker antes de publicar.
- Testes: 1060/1060 (teste novo `auditoria-seguranca-20261127.test.mjs`).
- Próximo: PR de privacidade (tirar dados pessoais da memória pública) e PR da memória enxuta.
## 27/11/2026 (10h50) — Claude: privacidade da memória pública
- Tirados do repositório público dados pessoais de saúde e de situação financeira do Rodrigo (CLAUDE.md, .claude/agents/ceo.md, HANDOFF_CLAUDE.md, NEXT_ACTIONS.md e comentários de CSS). As regras de comunicação continuam (frases curtas, um passo por vez, letra grande).
- Regra: nunca gravar na memória do repositório saúde, dinheiro pessoal, família ou documentos do Rodrigo ou de clientes (ver BRIDGE_PROTOCOL).
- O histórico antigo do Git ainda guarda o texto; só deixar o repositório privado tira de vez.

## 27/11/2026 (11h15) — Claude: memória enxuta
- Novo `RESUMO.md` (~6 KB): estado atual, clientes, fluxo das artes, regras e pendências. É o único arquivo lido inteiro em toda sessão.
- AGENTS.md, CLAUDE.md e BRIDGE_PROTOCOL: em vez dos 11 arquivos grandes (~1 MB), ler o RESUMO e as últimas entradas dos handoffs; o resto só por grep.
- Handoffs antigos foram para `arquivo/` (Claude até 17/11, ChatGPT até 04/11). Nada foi apagado.
- Sem código, sem deploy (não mexe em `cloudflare/**` nem `public/**`).

## 27/11/2026 (18h40) — Claude: moldura e logo não somem quando a IA grátis falha
- Causa provável de 2 posts da Daniela sem moldura e sem logo (vistos no Instagram em 27/11): a IA grátis (checagem "já tem texto?") falhou; o Nexus contava como "já tem texto", pulava a moldura e depois via todos os cantos como "ocupados" (`no_free_corner`), indo a foto pura.
- Correção: `imageTextAnswer` devolve null quando a IA não responde; foto pura (todos menos GILTEC e Quatree, `TEXT_ART_CLIENTS_RE`) segue para a moldura; `stampLogo` usa o canto padrão quando a IA não responde (canto ocupado de verdade continua pulado). Relatório do upload ganha "ia-indisponivel".
- Testes: 1063/1063 (3 novos em `art-frame.test.mjs`).
- Próximo: trava de cota grátis do Workers AI (reservar parte dos 10.000 neurônios/dia para as checagens) e geração automática para os clientes (menos GILTEC), com biblioteca de embalagens reais da Adimax e da Quatree.

## 27/11/2026 (19h) — Claude: trava da cota grátis do Workers AI (imagens)
- Pedido do Rodrigo: "na Cloudflare não pode ser pago nada". Novo `cloudflare/src/ai-budget.js`: as imagens só usam até 5.500 dos 10.000 neurônios grátis do dia (variável `NEXUS_AI_IMAGE_NEURONS`, nunca acima de 70%); o resto fica para as checagens da moldura e legendas. Zera às 00:00 UTC (21h de Brasília).
- `cloudflareImage` reserva antes de chamar a IA; sem cota (ou erro 4006 da Cloudflare) devolve `cota_gratis_imagens` e não tenta o modelo reserva. Sem banco, não gera.
- Contagem pela tabela oficial: FLUX.2 klein 4B ~26 neurônios por pedaço de 512x512 (post 4:5 ~157, story ~209); schnell ~96.
- Testes: 1069/1069 (`ai-budget.test.mjs` novo).
- Próximo: geração automática para os clientes (menos GILTEC) usando essa cota, com embalagens reais da Adimax e da Quatree; conferir se a conta da Cloudflare está no plano grátis do Workers.

## 27/11/2026 (19h15) — Claude: teste real da geração grátis + foto sempre à esquerda
- Teste real (Master, Flow Arts): `/api/master/foto` gerou 1 foto em 14 s (FLUX.2 klein 4B, com a cota nova); upload com `fotoLimpa=1` montou a moldura e a logo (`moldura-da-cliente`). Erro achado: a IA pôs a pessoa à direita e o painel a cobriu. Post de teste (20/12) recusado; "Gerar imagem por IA sozinho" da Flow Arts ligado só durante o teste e desligado de novo.
- Medidas das molduras (todas iguais, geradas com `moldura_clientes.py`/`moldura_daniela.py`): post: painel a partir de 43% da arte = 50% da foto (foto a 86%); faixa da logo abaixo da foto; story: painel a partir de 40,4%.
- Novo `photo-zone.js`: regra de composição na frente de todo pedido ao `cloudflareImage` (post: 45% da esquerda; story: 37% de cima) e conferência do lado pela IA grátis com espelhamento do post se a pessoa sair à direita. `COMMON_RULES` não manda mais centralizar.
- Testes: 1074/1074 (`photo-zone.test.mjs`).
- Próximo: liberar a geração automática para os clientes (menos GILTEC) e a biblioteca de embalagens reais da Adimax e da Quatree.
