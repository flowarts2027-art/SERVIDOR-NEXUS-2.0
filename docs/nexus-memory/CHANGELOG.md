# Histórico de alterações feitas pelo Work

## 2026-10-14 07h30 BRT — branch fix/planos-robo (não publicado)
- Rodrigo definiu prazo de entrega: até 5 dias.
- whatsapp-knowledge.js: incluído o pacote "Instagram que responde sozinho" (R$ 197), "pagamento único" nos pacotes e o prazo de 5 dias; removido o limite antigo "não vender resposta automática" (o auto-responder funciona em produção desde 2026-10-11). 335 testes ok.
- Doc "Planos e preços Flow Arts" atualizado com o prazo.
- Pergunta aberta ao Rodrigo: ele falou em "construir o site" em 5 dias, mas a Flow Arts não tem pacote de site. Decidir se vende site (e o preço).

## 2026-10-14 — caçador de clientes (5c162b5, deploy ok)
- Pedido do Rodrigo (07h17–07h19 BRT): achar empresas sem site, fracas em propaganda e com potencial, no Brasil todo; enquanto a Meta não libera, ele manda a primeira mensagem pelo próprio celular.
- feat: cloudflare/src/prospects.js. Busca na API oficial do Google Places (Text Search, campos com telefone/site = SKU Enterprise, 1.000 grátis/mês). Limite de 30 buscas por dia. Nicho x 43 cidades grandes, em rodízio. Guarda só empresas abertas, sem site próprio (Instagram, Linktree, iFood etc. contam como "sem site") e com telefone. Nota 0–10 (avaliações, nota, poucas fotos, celular). Quem é marcado "não quer" nunca volta.
- Mensagem pronta (sem preço, com link da página do nicho e "se preferir não receber, é só avisar"). Botão abre wa.me no WhatsApp do Rodrigo; nada é enviado pelo servidor.
- Chave do Google: o Rodrigo digita no painel; salva criptografada em nexus_state (prospects/google-key). Também aceita o secret GOOGLE_PLACES_API_KEY.
- Rotas Master (com login): GET /api/master/prospects, POST /search, POST /key, POST /:id/status.
- Master → Contatos: painel "Caçador de clientes" (public/prospects-ui.js) com etapas Novos / Mandei mensagem / Responderam / Reunião marcada / Não querem. Conferido com dados de exemplo no celular e no computador.
- test: prospects.test.mjs (6 testes). 335 testes ok.
- 07h26 BRT: Rodrigo deu OK; publicado (Deploy NEXUS Cloudflare success). Sem chave do Google ainda: o painel mostra o campo da chave. Falta criar a chave no Google Cloud (computador do Rodrigo, cartão cadastrado, cota diária e alerta de gasto).
- 07h26 BRT: a pedido do Rodrigo, criado o doc "Planos e preços Flow Arts" (Claude Docs, https://claude.ai/artifact/Gq4mAemEMUNAxWw1ixsr3b) com os planos do site, respostas rápidas e o que não prometer. Prazo de entrega ficou como pergunta em aberto.
- Achado: whatsapp-knowledge.js não tem o pacote "Instagram que responde sozinho" (R$ 197) e diz para não vender resposta automática, mas o site vende. Ajustar quando a IA for responder os planos (pedido do Rodrigo: "depois a gente ajusta").

## 2026-10-14 — contador de visitas do site (22c5cea, deploy ok 10:13 UTC)
- Pedido do Rodrigo: ver as visitas do site no painel Master.
- feat: contador de visitas sem dados pessoais (cloudflare/src/site-analytics.js). Tabela D1 `site_visits_daily` (dia, página, origem, visitas), criada na hora. Sem IP, cookie ou identificador. Robôs ficam de fora.
- Rotas: `POST /api/site/hit` (público, sempre 204) e `GET /api/master/site-stats` (só com login do Master).
- Aviso de visita (sendBeacon) na home, /exemplo e nas 3 páginas de nicho (gerador atualizado).
- Master: aba "Site" (public/site-stats.js) com hoje / 7 dias / 30 dias, gráfico por dia, de onde vieram e páginas mais vistas. Conferido com dados de exemplo no celular e no computador.
- test: site-analytics.test.mjs (3 testes); menu do Master com 8 itens. 329 testes ok.
- 07h12 BRT: Rodrigo deu OK; push na main; deploy "Deploy NEXUS Cloudflare" success. Ainda NÃO conferido no ar (Chrome desconectado; o terminal não alcança o site). Próximo passo: Rodrigo abre flowarts.com.br, depois Master → Site, e confere se aparece 1 visita hoje.

## 2026-10-12 — branch feat/whatsapp-atendente
- feat: atendente virtual da Flow Arts no WhatsApp (whatsapp-knowledge.js, resposta automática com liga/desliga, pausa por conversa, passagem para humano, fallback seguro).
- feat: aba WhatsApp no Master (public/whatsapp-inbox.js).
- fix: WHATSAPP_CLIENT_ID de globalplay-streaming para primeiro-teste; texto antigo "uso próprio ou revenda" removido; ordem das mensagens.
- test: whatsapp-agent.test.mjs com SQLite real (10 testes); menu do Master com 7 itens.

## 2026-10-12
- 13h46 BRT: Perfil da Empresa no Google criado (Rodrigo, guiado): Flow Arts, categoria Agência de marketing digital, área Brasil, telefone, site flowarts.com.br, 4 serviços + 2 personalizados, descrição. Já aparece como verificado ("Você gerencia este Perfil") com a logo. Sem fotos da empresa e sem avaliações ainda.
- 13h31 BRT: Search Console (Rodrigo, guiado): propriedade de domínio flowarts.com.br verificada (provedor de domínio), sitemap https://flowarts.com.br/sitemap.xml enviado, indexação da home solicitada. Existe sitemap antigo de 2018 (dono anterior) na lista, ignorar.
- 13h24 BRT: no PC do Rodrigo o site dava DNS_PROBE_FINISHED_NXDOMAIN (cache antigo). Resolvido com ipconfig /flushdns; site abriu. Rodrigo vai trocar o link da bio para flowarts.com.br.
- Domínio flowarts.com.br (Hostinger) com nameservers da Cloudflare; zona conferida ATIVA no painel da Cloudflare.
- Site e SEO (3c7a5b4 + 6cdf87e, deploys ok 16:15 e 16:20 UTC; conferido no navegador: flowarts.com.br e www abrem o site sem pular para /site, painel.flowarts.com.br abre o login, robots.txt no ar): rotas custom_domain no wrangler.jsonc (flowarts.com.br, www, painel.flowarts.com.br; workers.dev continua). site.html com título, descrição, canonical, Open Graph e dados estruturados (ProfessionalService + FAQPage). robots.txt (esconde /api, /login, /portal, /master, /b/, /brinde, /downloads) e sitemap.xml. exemplo.html com canonical. 311 testes ok.

## 2026-10-11
- 21h30 BRT — AUTO-RESPONDER FUNCIONANDO (prova em produção): após migrar para o app "Flow Arts Nexus" (publicado, sem portfólio; ID do app do Instagram 1642200040634174, salvo no Master pelo Rodrigo) e reconectar @flowarts2026 (BUSINESS), a API passou a devolver os comentários (count = igCount). Fix e1e837b (comentário sem username: usa from.id; reinscrição do webhook quando o token muda). Run 00:30 UTC: checked 3, replied 3, errors 0 — DM + resposta pública para 3 comentários "Quero" da globalplay_streaming; webhook inscrito com o token novo (ok). Falta testar o aviso na hora (webhook) com um comentário novo.
- 5366b6e: Master permite trocar ID + chave do app do Instagram.
- 17h41: demo do Café Brisa com 3 posts e imagens boas (conferido por print do Rodrigo). Bug: legenda sem campanha incluía o contentFocus (instrução interna). fix c2058ca (deploy ~17h46 BRT): legenda usa a oferta da marca; demo profileVersion demo2 refaz os rascunhos do café.
- 17h15: link /exemplo colocado na bio do @flowarts2026 (Rodrigo). Testes de lead removidos pelo próprio Rodrigo (conferido: 0 leads). Rascunho de 12/10 12:00 refeito com o tema certo ("Hashtags locais: como ser encontrado no Rio", profileVersion f), imagem em geração. Carrossel "Tráfego pago" de 11/10 19:00 aprovado e pronto.
- 16h59: Rodrigo apagou sem querer o cliente demo-cafe no Master; o cron (ensureDemoClient) recriou às 17h00 BRT (conferido: demo-cafe online). Posts do café começam do zero.
- Teste real de /exemplo (16h31–16h34): 2 envios do Rodrigo, com dados de outra pessoa, chegaram como leads "hot" de primeiro-teste (source landing, nextAction) — conferido via /api/master/leads. Rodrigo deve removê-los pelo novo botão.
- feat (9235031, deploy ~16h40 BRT): botão "Remover contato" (dois toques) na aba Contatos; bloqueado na demo.
- feat (ca93dfd, deploy ~16h30 BRT): página de captura /exemplo (conferida no ar) → POST /api/public/lead → lead "quente" da Flow Arts (source landing, contact, nextAction 24h) → aba Contatos com botão WhatsApp. Envio real ainda não testado em produção (Rodrigo vai testar com os próprios dados).
- 9ad6091: CNPJ no rodapé de /privacidade e /termos (conferido no ar).
- feat (8ceda17, deploy ~15h56 BRT): páginas públicas /privacidade (com #exclusao-de-dados) e /termos, conferidas no ar.
- Meta app NEXUS IA CENTRAL > Configurações básicas (com OK do Rodrigo, 15h58): e-mail de contato flowarts2027@gmail.com (era o da Global Play), Política de Privacidade, Termos e Instruções de exclusão apontando para as páginas acima (antes: Google Ads e facebook.com), categoria Negócio e Páginas (era Entretenimento). Conferido após recarregar.
- feat (ff7e4fb, deploy ~15h53 BRT): "Lembrar a senha" no login do Master (novo) e autopreenchimento no login do cliente, via gerenciador de senhas do navegador (Credential Management API). Pedido do Rodrigo.
- Card de custo conferido no ar às 15h49: US$ 2,75 em 7 dias, 2 posts com imagem → US$ 1,37/post, US$ 16,49 para 12 posts/mês (superestimado: inclui gasto da Global Play e imagens refeitas). Café Brisa aparece online no Master (2.045 tokens, 0 posts).
- feat (4e35a10, deploy ~15h50 BRT): card "Custo da IA por cliente" no Master (GET /api/master/openai/cost-report?days=7): custo real OpenAI (chave admin) ÷ posts com imagem; custo por post e de 1 cliente com 12 posts/mês. Valores reais ainda não conferidos (precisa de login no Master).
- fix (561ba2b + 3ebec79, deploy ~15h45 BRT): Rodrigo apontou post de 12/10 12:00 ruim (tema repetido de 11/10 e tela do notebook/objetos só com blocos de cor). Causas: Criador usava o tema do dia de hoje para posts de amanhã; prompt "sem texto" gerava telas vazias; cenas pediam "abstrato" e "amostras de cor". Agora: tema pelo dia do post; 8 cenas que se revezam (Marina só em 1); telas com feed/painel realistas e proibição de blocos de cor. profileVersion 2026-10-11f refaz rascunhos não aprovados. Resultado visual ainda não conferido.
- feat (a3aa935, deploy ~15h28 BRT): relatório FORJA "Posts que trouxeram seguidores" na aba Números; snapshot pede follows/profile_visits dos 3 posts mais recentes (não Reels); Radar pesa follows x10 e visitas x2. Ainda não confirmado se a Meta devolve follows para a Flow Arts (só 2 seguidores).
- feat (c617e82, deploy ok 18:16 UTC): demonstração pública. /demo → /portal.html?demo=1 (conferido no ar: abre sem senha, aviso de café fictício). Cliente demo-cafe "Café Brisa" criado pelo cron (src/demo-client.js), nunca publica (BLOCKED_PUBLISH_CLIENTS), pausa sozinho com 8 posts; GET /api/demo/panel público com campos seguros e cache de 5 min. Primeiros posts do café ainda não confirmados.
- feat (aeadde7, deploy ok ~14h55 BRT): agentes recebem o perfil de marketing (.agents/product-marketing.md, criado no Claude Code do PC com respostas do Rodrigo): regras em avoidTopics (sem preços, sem citar Global Play/clientes/concorrentes, sem inventar resultados, sem prometer seguidores/vendas) e, no plano do Estrategista, `audiencePains` e `objectionsToAnswer`. profileVersion não mudou (rascunhos atuais mantidos). Testes 259/259.
- PC do Rodrigo: plugin marketing-skills (coreyhaines31/marketingskills) adicionado ao Claude Code; conta GitHub playprimetrafego-tech virou colaboradora (Write) do repositório para o PC poder enviar commits.
- feat (0bfdf7b, aguardando OK para push): calendário do mês com capas na aba Posts do painel do cliente; rota GET /api/portal/calendar?month=AAAA-MM com o plano da campanha Flow Arts (só dias de hoje em diante). Corrigido travamento do painel quando insights vinham sem `totals` (ficava em "Conecte o Instagram"); blocos renderizam isolados e há estado "Carregando…". Testes 257/257; visual conferido em 390px e 1280px com dados simulados.
- chore (9721a60, deploy ok 16:52 UTC): auto-responder grava `igCount` (comments_count do Instagram) por post. Resultado: Instagram diz 2 comentários, API devolve 0.
- feat: auto-responder de comentários (`comment-autoreply.js`), roda a cada cron: comentário com QUERO/EXEMPLO/preço/info nos 4 posts mais recentes → DM privada (private reply) com link wa.me/5521964816185 + resposta pública "Te chamei no direct! 📩"; uma vez por comentário, até 3 por execução, janela de 7 dias. Status em `GET /api/master/clients/:id/autoreply-status`.
- feat: posts presos em `publishing` há 15+ min são conferidos no Instagram pela legenda: achou → `published` com mediaId; não achou → `failed` (`publish_interrupted`). Evita post duplicado e status errado.
- fix: COPY CHIEF aceita CTA com "Salve", "EXEMPLO", "comentários" e "Responda" (antes recusava "Salve para usar depois").
- fix: Reel aprovado vira post de imagem quando o GitHub recusa o render (token ausente/inválido ou conta suspensa). Em produção o token do Worker é da conta globalplay27 suspensa (403 "account was suspended").
- fix: imagens da Flow Arts saem limpas (sem texto sobreposto); o overlay de texto falhava (`IMAGES_TRANSFORM_ERROR 9432 missing field font`) e o DESIGNER descartava a imagem e pedia outra.
- fix: revisor visual julga a Flow Arts pelo perfil de marketing (sem exigência de TV/entretenimento).
- feat: `POST /api/master/clients/:id/reset-agent-memory` (zera estado aprendido dos agentes e rascunhos vencidos de perfis antigos).
- fix: erro de orçamento diário da OpenAI não conta como tentativa de imagem; rascunhos da Flow Arts vencidos por `media_generation_exhausted` com horário ainda válido são refeitos pelo Creator.
- feat: `POST /api/master/clients/:id/clear-pending-posts`; `/api/clients` esconde clientes `archived`.
- feat: painel do cliente refeito do zero (celular primeiro): Início, Posts (aprovar/pedir ajuste), Números, Contatos, Conta. Ferramenta de vídeo/trailer, envio do PC e logo removidos da tela (rotas de vídeo continuam no servidor).
- feat: `GET /api/portal/insights` (seguidores, alcance e métricas por post, cache de 30 min em nexus_state) e `GET /api/portal/contact` (WhatsApp da Flow Arts).
- feat: WhatsApp da Flow Arts (5521964816185) no perfil de marca + `whatsappLink`.
- feat: Master enxuto — menu com 6 itens (Visão geral, Clientes, Postagens, Agentes, Contatos, Integrações); Campanhas e Suporte viram atalhos; Integrações lista o Instagram de todos os clientes; textos de Global Play/Ragnar removidos do HTML.
- fix: rascunhos não aprovados de perfil antigo são apagados em qualquer horário; saudação do painel usa o nome da marca.
- ci: checagens do painel antigo de vídeo trocadas pelas do painel novo.

## 2026-10-10
- feat: trava de publicação para ragnar-one, globalplay-streaming e global-play-streaming (`publisher.js`).
- fix: `/api/master/instagram/accounts-status` lista todos os clientes cadastrados.
- feat: `client-brand.js` — perfil de marca por cliente; Flow Arts (`primeiro-teste`) com nicho Marketing digital para imagens, hashtags e CTA.
- test: e2e do Instagram passou a usar cliente neutro de fixture; novos testes da trava e do perfil Flow Arts.
- docs: deploy automático explicado em `cloudflare/README.md`.
- feat: Flow Arts liberada para gerar imagens próprias com IA (`IMAGE_GENERATION_CLIENTS`).
- fix: palavras de comentário/CTA ("quero", "comente", "conteudo") não viram tema; sem 3 temas úteis, usa os temas do perfil.
- feat: painel Master › Postagens & custos mostra prévia (imagem + legenda + aprovação).
- feat: campanha de 30 dias da Flow Arts (`flowarts-campaign.js`) ligada ao Estrategista; carrossel com plano próprio; Reels via repositório novo, com fallback para imagem sem token.
- feat: botões Aprovar/Recusar no painel Master (`POST /api/master/posts/decision`, usa `decidePost`). Aprovado = Publisher publica no horário após Copy Chief e Designer aprovarem.
- feat: rascunhos não aprovados da Flow Arts feitos antes do perfil de marca (`profileVersion`) são apagados e refeitos pelo Creator.


## 2026-10-10 — limpeza de legado da raiz (executada localmente, não implantada)
- Removidos: `server.js` (Express legado, ~365 KB), `instagram-intelligence.js`, `Dockerfile`, `.dockerignore`, `.env.example` (variáveis Railway/Express), `data/` (clients.json e .gitkeep), `windows-app/`, workflow `windows-installer.yml`, arquivos de gatilho `.github/force-*.txt` e `.nexus/force-*.txt`.
- `deploy-nexus-cloudflare.yml`: removidas as duas linhas que faziam `node --check windows-app/*`.
- `CLAUDE_HANDOFF.md` movido para `docs/archive/CLAUDE_HANDOFF-video-2026-10.md` (histórico do bug do vídeo; não é instrução vigente).
- `.gitignore` ampliado (`.dev.vars`, `.wrangler/`, `.wrangler-dry-run/`). `THIRD_PARTY_NOTICES.md` mantido: atribuição MIT do instagram-agent-skill, cujos conceitos seguem nos nomes de skills de `agent-core.js`.
- Nada em `cloudflare/src` foi alterado. Mantidos de propósito (o Worker ainda depende): `services/youtube-downloader`, `render.yaml`, `scripts/local-youtube`, `scripts/build-local-helper-zip.py`, `public/nexus-baixar-no-pc.zip`, workflows de vídeo.

## 2026-09-28 — ler arte pelo binding Cloudflare (preparado)
- Substituída a autochamada HTTP do Worker pelo binding nativo ASSETS na conferência dos bytes da peça revisada. O hash e o bloqueio em caso de falha permanecem. Teste cobre o binding.

## 2026-09-28 — revisão fixada de uma arte Ragnar (preparado)
- Arte JPEG fornecida pelo proprietário foi inspecionada visualmente no Work. Revisão do Designer reconhece exclusivamente sua URL exata e SHA-256 conferido nos bytes antes de aprovar os seis critérios; troca do arquivo falha fechada. Demais imagens continuam com revisão OpenAI. Evita elevar o limite de gasto diário, atingido nesta tarde.

## 2026-09-28 — diagnóstico objetivo do bloqueio visual (preparado)
- Designer persiste os seis pareceres booleanos quando rejeita uma mídia. Health expõe apenas estado, campos booleanos e indicador da URL antiga corrompida; não expõe imagem, texto livre da avaliação nem credenciais. Necessário para saber por que a nova imagem de Ragnar segue sem aprovação.

## 2026-09-28 — priorizar recuperação de postagem Ragnar vencida (preparado)
- `postingProfile` ignora as três URLs PNG corrompidas também quando gravadas na configuração, permitindo fallback ao JPEG válido. O Creator agora procura uma postagem aprovada e vencida do dia sem imagem antes de distribuir mídia a horários futuros; tenta a antiga imagem bloqueada somente se ela for válida e ainda não tiver sido reavaliada. Mantidos os gates de Copy Chief, Designer e revisão visual.

## 2026-09-28 — trocar mídia Ragnar corrompida (preparado)
- Identificados três PNGs com checksum de IDAT inválido. Adicionado JPEG decodificável derivado de arte própria do usuário. Pool padrão aponta para o novo arquivo; Designer descarta URLs antigas e Creator impede sua reutilização. Mantidos gates e antirrepetição.

## 2026-09-28 — parâmetro OpenAI sanitizado (preparado)
- Falha HTTP agora registra somente `code` e nome do parâmetro estruturado ou categoria fixa. Mensagem livre do provedor não aparece no health, prevenindo vazamento de URLs e dados.

## 2026-09-28 — orçamento de requisições externas (preparado)
- Limitada a três mídias por snapshot a coleta das cinco métricas de insights, preservando os dados básicos de até 25. Executor passa a processar um job por invocação do cron, que roda a cada minuto. Destina-se a ficar abaixo das 50 subrequests externas do plano gratuito mesmo com Radar, Auditor e revisão no mesmo ciclo.

## 2026-09-28 — diagnóstico limitado de revisão antiga (preparado)
- Erros antigos `visual_review_unavailable` com tentativas esgotadas poderão ser diagnosticados uma vez adicional após PR #31, com no máximo uma chamada visual no ciclo e marca persistente. Health passa a mostrar contagem de tentativas e marca diagnóstica sem expor imagem/token.

## 2026-09-28 — limites nas consultas Graph (preparado)
- Acrescentado timeout de 8 segundos nas leituras de mídia, insights e perfil do Radar/Auditor. Essas consultas antes aguardavam rede indefinidamente. Sem alteração no gate visual ou na seleção de posts; efeito em produção ainda não confirmado.

## 2026-09-27 — captação observável (local, aguardando deploy)
- Coleta horária por padrão para Global Play e Ragnar; desligamento explícito preservado. Timeouts Meta e indicadores agregados de captação adicionados ao health. CTA de comentário QUERO em todas as pautas e formato rotulado como imagem real.
- Testes antigos alinhados ao fiscal visual v2; novo teste cobre padrão e opt-out. 15 testes e checagem sintática passaram. Sem postagem ou DM de teste.

## 2026-09-27 — Autorrecuperação de post sem mídia
- Corrigido o Creator para não ignorar um slot diário já existente quando ele está sem mídia.
- Quando surge uma mídia válida no pool, o Creator a vincula ao post incompleto, zera tentativas/erro, redefine os gates como pendentes e devolve o post ao fluxo Copy Chief → Designer → Publisher.
- Validação local aprovada com checagem de sintaxe e bundle Wrangler; aguarda CI/deploy para confirmação em produção.

## 2026-09-27 — Fechamento uniforme do Publisher
- Preparada correção para exigir Copy Chief e Designer aprovados também no envio manual e no `publisher-sweep`, eliminando os dois desvios que podiam contornar os fiscais.
- Limitadas a três as tentativas por post nos três caminhos de publicação; falhas manuais agora incrementam `retryCount`.
- Validação local concluída: `node --check` em todos os módulos do Worker e bundle `wrangler deploy --dry-run` sem erro.
- A correção ainda requer commit, CI/deploy e evidência de produção antes de ser considerada implantada.

## 2026-09-27 — Auditoria inicial
- Identificado repositório operacional `globalplay27/SERVIDOR-GLOBAL-PLAY`, branch `main`, commit `292649157`.
- Conferidos GitHub Actions, health público e diagnósticos públicos.
- Rastreado fluxo de código de cron a Meta e três rotas de publicação.
- Identificada aprovação visual baseada em flags, sem inspeção da imagem, além de caminhos que ignoram gates; limite de retentativas de posts ausente.
- Criada memória permanente de sete documentos, sem mudanças no runtime e sem novas publicações.
- Estado da falha específica do Ragnar continua pendente da leitura de logs/linhas D1 de produção.
- Adicionado `AGENTS.md` na raiz para orientar sessões futuras a ler a memória e registrar resultados; commit `5951333904b076d04a9ca179745fe3f3e868a1e7`, deploy GitHub Actions bem-sucedido.

## 2026-09-27 — Diagnóstico de acesso ao D1
- Criados `.github/workflows/nexus-audit.yml` e `.github/scripts/nexus-audit.mjs`: consultas SELECT, saída reduzida sem legendas, mídia ou tokens, falha explícita quando a leitura falha. Workflow é disparado ao mudar esses dois arquivos e pode ser executado manualmente.
- Teste em [Actions 36321480825](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36321480825) retornou código Cloudflare `7403` em todas as consultas, nenhuma linha operacional lida. CI/deploy passou. Não houve mudança do Worker, postagens ou permissões.

## 2026-09-27 — Destravamento do agendador/publicador
- Confirmada inundação da fila por `lead-hunter` e jobs presos em `running`.
- Adicionados deduplicação de jobs pendentes, recuperação de execução presa, prioridade de Publisher/ciclo, captação automática opt-in e descarte controlado do backlog desativado.
- Publisher passou a selecionar somente posts com mídia e dois gates aprovados, no máximo um por conta/ciclo; backlog inválido não bloqueia conteúdo válido.
- Horários padrão consolidados em 09:00, 12:00 e 18:00 BRT.
- Publicação real de `@globalplay_streaming` confirmada às 12:21 BRT. Ragnar permaneceu sem publicação porque o conteúdo vencido estava sem mídia e reprovado pelo Designer.
- Rota temporária de diagnóstico sanitizado criada para a investigação e removida ao final.

## 2026-09-27 — Pool de mídia Ragnar
- Geradas e revisadas três imagens 9:16, de cena única e tema nórdico, com TV preenchida, sem texto, logos, colagens ou símbolos esportivos.
- Assets adicionados em `public/assets/ragnar/nordic-cinema-01.png` até `03.png`.
- `postingProfile` passa a fornecer esse pool ao `ragnar-one` quando o painel não possui mídia configurada, preservando URLs personalizadas quando existirem.

## Retomada — 2026-09-27 20h UTC
Preparada fiscalização visual real para Global Play e exigência do parecer nos publicadores principal, manual e sweep. Adicionados seis testes sem rede e timeout de 20s na chamada OpenAI. Mantidas credenciais por cliente, orçamento diário e exclusões de escopo. Nenhuma geração de imagem ou publicação de teste.

## 2026-10-02 — estabilização do painel do cliente / vídeos
- Rotas `/portal*`, `/client-lite.js` e `/client-lite.css` passaram a `run_worker_first`.
- O Worker passou a devolver o shell e assets do cliente com `no-store/no-cache`; versão do `client-lite.js` avançou para evitar reutilização do bundle antigo.
- Upload principal passou de 25 MB para 90 MB e de `arrayBuffer()` para `file.stream()` no R2.
- Teste de regressão garante aba Vídeos, lista de jobs, geração/download e limite de upload.
- CI ganhou validação do workspace no domínio de produção após deploy, com retentativa de propagação. Corrigido falso negativo do próprio verificador causado por `pipefail` com `grep -q`.
- PRs de runtime: #72, #73 e #74. Nenhuma publicação Meta foi disparada.

## 2026-10-02 — redirecionamento circular do portal confirmado
- Sessão desktop retomou os chats sobre painel do cliente, aba Vídeos e render MP4. Fonte operacional main c664e44a58b695a710df70cac68da35873fa9a69.
- Produção: GET /portal e /portal.html retornaram HTTP 307 Location: /portal; fetch seguindo redirects terminou em redirect count exceeded. /client-lite.js respondeu 200/no-store.
- Run 37022109435: deploy Cloudflare passou, Verify client video workspace falhou. Não era apenas propagação/cache.
- Correção: ASSETS busca /portal, caminho canônico de portal.html, evitando devolver redirect para a própria rota. Cache no-store preservado.
- Validação local: 102/102 testes passaram, incluindo seis testes GET/HEAD para /portal, /portal.html e /login simulando canonicalização Cloudflare. Produção corrigida ainda depende de implantação; upload/render/download autenticados continuam pendentes.


## 2026-10-02 — correção implantada e abertura confirmada
- PR #76 integrada como 27ef7a925d8f6bf735a54268e0d9ab0af70e2574. CI do PR 37087267048 aprovado.
- Run 37087333583: migrations, bundle, deploy Cloudflare e Verify client video workspace passaram. A verificação de autonomia estava em execução na consulta; seu resultado não é prova do fluxo de vídeo.
- Verificação HTTP independente após deploy: /portal, /portal.html e /login responderam 200, sem Location, com no-store, data-tab="videos" e video-job-list presentes.
- A abertura do painel está corrigida. Próximo passo: entrar com sessão de cliente e validar upload de MP4, renderização e download; essas etapas autenticadas não foram executadas nesta sessão.

## 2026-10-03 — modelo completo Michael, preparado localmente
- Proprietário forneceu nexus-video.mp4 e d508edaee92dab30f7a2e822192dde70.mp4 e pediu as cinco partes do modelo: celular, lançamento/pipoca, elenco, avaliações e filmes parecidos. Confirmou Michael como filme do teste; capa oficial e sinopse dentro do celular; remover Slim e marcas repetidas.
- Causa da capa vazia confirmada no código: /media/library exige sessão de portal, mas o workflow fazia download sem cookies. Preparada rota /api/internal/video-render/poster protegida pelo token do job, com isolamento de cliente e rejeição de traversal.
- Preparado renderizador Python/Pillow/FFmpeg com cinco partes e preset Michael/2026. Pôster oficial de michael.movie; nove retratos e créditos verificados no Rotten Tomatoes; avaliações são sínteses em português de relatos reais, com atribuição; relacionados são sugestões editoriais, não resultados de recomendação automática.
- Celular/mão e pipoca são novos assets gerados pelo ImageGen com referência; composição segue a sequência do modelo, mas não é cópia idêntica quadro a quadro dos elementos gráficos originais. Não afirmar fidelidade exata sem conferência do proprietário.
- Render local real: outputs/michael-modelo-nexus.mp4, 30s, H.264/AAC, 1080x1920, 4687983 bytes. Cinco partes inspecionadas visualmente e decodificação completa sem erro. 102 testes existentes e dois novos testes do callback passaram; sintaxe JS aprovada.
- Primeira renderização foi descartada após sobrescrita concorrente dos PNGs durante leitura FFmpeg; refeita em pasta separada com playlist concat e verificada sem erro.
- Workflow novo seleciona o preset para Michael/2026. Outros títulos seguem o renderizador anterior; ainda não há catálogo automático genérico de elenco, avaliações e relacionados.
- Produção atual main 14a89ab62f793b058dac09c11fa4e9de55e6144a. Nenhuma renderização autenticada R2/GitHub executada nesta sessão; alteração ainda não implantada. Consulta HTTP do host a /health foi recusada com 403 e não é prova de serviço indisponível.
- Próximo passo: publicar a alteração para revisão, validar CI e implantação, depois executar upload -> render -> download autenticado do Michael no painel. Registrar evidência de produção separada do MP4 local.

## 2026-10-03 — implantação e teste autenticado
- PR #77 integrada; merge ff0e04f33cdea75746700b4d8bbe5f5c4496413a. Deploy Cloudflare run 37121419546: implantação e verificação da área de vídeos aprovadas. CI: 104 testes e render Linux aprovados.
- Cliente entrou no painel. Gerar novamente em Michael iniciou run 37121597001; render e upload R2 concluídos. Painel exibiu MP4 pronto 100%; download autenticado funcionou (90s, 1080x1920, H264/AAC), decodificação integral sem erro.
- Conferência detectou capa antiga de trailer substituindo pôster oficial. Corrigido em 7e6f18bb4cb3ea24bce09534c02632893a307454: preset Michael sempre usa o pôster oficial verificado. Nova geração run 37121790617 em andamento. Registrar download e inspeção final separadamente.

## 2026-10-03 — ampliação autorizada do modelo
- Proprietário determinou que o modelo seja padrão para todos os próximos filmes e séries; pediu aba de busca YouTube e Reacher como exemplo. Determinou editar a fonte completa, sem corte em 90 segundos.
- Implementados busca assíncrona YouTube via yt-dlp, seleção de catálogo, importação por link, modelo genérico data-driven e duração integral. Upload multipart R2 remove o limite de 95 MiB do resultado.
- Catálogo de séries: TVmaze, elenco real, nota atribuída e sugestões por gênero. Filmes: Apple/iTunes; informações ausentes aparecem como indisponíveis, sem inventar depoimentos/elenco. Michael mantém preset com pôster oficial. Créditos TVmaze CC BY-SA no vídeo.
- Primeiro smoke genérico Reacher detectou sinopse maior que a tela; corrigido trecho legível com reticências. Render real de 3s sem duration explícita preservou 3s. Testes novos de domínio YouTube, seleção exata de catálogo e isolamento multipart passaram.
- Ainda falta CI, implantação e teste autenticado de busca/importação/edição integral Reacher; não considerar essa ampliação concluída apenas pelo código local.


## 2026-10-03 — trailers oficiais em português e WhatsApp
- Pedido expresso: todos os filmes e séries devem usar somente trailers oficiais dublados em português; resultado em inglês foi reportado pelo proprietário.
- Busca ampliada para 20 resultados, filtro exige canal verificado de distribuidor reconhecido e indícios de português; rejeita inglês/legendado. Geração por busca ou link confere idioma do áudio em três amostras via Whisper e interrompe se não confirmado. Prefere faixa de áudio pt quando disponível.
- Campo de WhatsApp e asset oficial Meta adicionados; número salvo por cliente e aplicado nas cinco partes.
- 108 testes Node passaram e sintaxe client-lite aprovada. CI, implantação desta correção e conferência real do áudio ainda pendentes; não afirmar produção validada.
- Continuidade: PR78 já integrou modelo genérico e duração integral; resta concluir biblioteca de vídeos e campanha semanal com publicação automática. Não confundir com campanhas de imagens existentes.



## 2026-10-03 — evidência atual e pendências reais
- PR79 integrada em f229fcaa1cb238492f85ff72e31a4dfd504d4c1d. Run37124002993: deploy e verificação da área de vídeos aprovados. 108 testes Node e 4 testes Python aprovados; render smoke de 91s preservado.
- Ajuste seguinte identifica Prime Video Brasil pelo channel_id UCuNjvqjTzw9LcD9PVpTVWRA, pois yt-dlp retorna channel_is_verified=null para esse canal real. ID confirmado pelo trailer htlUwNs2AjQ publicado em artigo oficial About Amazon Brasil. Run37124467288: deploy e verificação do painel aprovados.
- Busca autenticada Reacher agora mostra trailers do Prime Video Brasil e não os resultados ingleses anteriores. Screenshot salvo em outputs/nexus-busca-oficial-portugues.png. Ainda apareceu um título não correspondente; próximo ajuste deve filtrar correspondência do título consultado sem liberar canais não oficiais.
- Teste real Reacher run37124512978 falhou no download: YouTube pediu Sign in to confirm you are not a bot no GitHub runner. Não houve render nem upload desse job; não afirmar que geração YouTube funciona. Metadados consultados do computador local confirmaram faixa pt e duração122s para htlUwNs2AjQ, mas não comprovam MP4 renderizado.
- Não exportar cookies ou credenciais para contornar o bloqueio. Próximos passos: resolver importação automática com acesso autorizado; conferir idioma real e MP4 completo; implementar botão Enviar para biblioteca e integrar campanha semanal/publicação automática. Usuário pediu agilidade e perguntou o que falta; esses três itens foram informados claramente.


## 2026-10-03 — confirmação do original e validação do painel
Correção incremental sobre main 469eff9. Ingestão utiliza o endpoint existente /ingest do serviço Render; /ingest respondeu 400 invalid_source_url para corpo vazio, confirmando a rota. Falhas de transporte/timeout deixavam jobs em importing 10%; agora persistem failed, liberam token e apresentam erro. Upload e callback verificam HEAD, tamanho e propriedade do objeto R2. Laboratório e render só liberam com original confirmado; ingestão não dispara render automaticamente. Resultado só é ready após confirmação R2. MP4 local exige assinatura ftyp. Estados, isolamento e decisões de postagens preservam campos D1; RADAR corrigido de followersDelta inexistente para followerDelta; ciclo manual usa scheduler existente; métricas ausentes não viram zeros reais.
Evidência local: 113 testes unitários aprovados. Integração HTTP com SQLite real e emulador R2: upload 514422 bytes, render FFmpeg 1080x1920 / 5s, download 1331908 bytes com hash íntegro, acesso sem sessão 401, MP4 falso 415, campanhas por cliente, aprovar/reprovar e ciclo dos 13 agentes aprovados. Dispatch GitHub simulado nesse teste; produção ainda não validada nesta etapa. Novo teste reproduzível scripts/test-client-workspace.mjs integrado no CI Node22. Layout existente preservado; removidas duas decorações sem conteúdo (emoji/círculo).
Próximo passo: CI Linux (bundle local Windows bloqueado por leitura de diretório ancestral), deploy e E2E autenticado em produção. Não afirmar R2 remoto/render remoto comprovados até executar.

## 2026-10-03 — retomada desktop: card ausente no upload direto
- Pedido retomado: Reacher, card inspirado na referência Predador, sem SLIM e menor tempo de preparação; não alterar velocidade/duração.
- main conferido: 0654757da204e603b73cdca13859b9de58bc582e. Painel autenticado mostrou job video_24f685fcd852426a8236038e pronto. Download real: 1080x1920, H.264/AAC, 125.527007s, 29889081 bytes; frame aos 10s sem card. Usuário confirmou Reacher.
- Causa: upload direto não coletava título/sinopse, usando nome UUID do arquivo; workflow permitia sucesso sem card. Correção local exige metadados, reaproveita seleção existente, permite gerar novamente usando original confirmado e rejeita render sem sinopse antes de dispatch.
- Validação: 114/114 testes Node, sintaxe e integração HTTP/SQLite/R2 emulado (oito casos) passaram. Render local completo com card: 1080x1920, 30fps, duração preservada 125.527007s. Isso não comprova implantação nem novo render no R2 remoto.
- PR/deploy e validação autenticada após implantação ainda pendentes. Referência Predador original não está anexada nesta sessão; não afirmar fidelidade exata. Nenhuma postagem Instagram enviada.
## 2026-10-04 — YouTube primeiro no PC

Preparado auxiliar local em scripts/local-youtube, pacote public/nexus-baixar-no-pc.zip, botão principal Baixar no PC e guia de upload com metadados preservados. CI inclui 5 testes helper; testes frontend exercitam abertura síncrona sem fetch e links inválidos. Download local e upload real executados; ajuste ainda não implantado neste registro.


## 2026-10-08 — Falha de download YouTube no GitHub e recuperação via PC
- Evidência de produção: run 37856611085, job 113582203315, NEXUS YouTube Ingest #21, iniciou 22:57 UTC e falhou na etapa "Download compatible video source". Log do yt-dlp: `Sign in to confirm you're not a bot`. Upload ao R2 e render não executados; mensagem `youtube_authentication_required` exibida corretamente no painel.
- Branch `fix/youtube-local-retry-after-auth-20261008`: criada recuperação para o mesmo job em falha via novo ticket local de uso único (45 min) e botão "Gerar pelo meu PC". Mantém título, sinopse, pôster, elenco e configurações do vídeo; não reutiliza token de ingestão anterior.
- Pedidos `server_generate` sem fonte oficial direta não devem mais abrir trabalhos destinados a falhar na autenticação do YouTube. Fonte direta do catálogo segue permitida.
- Se o auxiliar PC recusar o retry, registrar falha real, sem redisparar o importador bloqueado. Testes automatizados foram adicionados, mas execução, CI, deploy e render ponta a ponta ainda NÃO VALIDADOS neste registro. Não houve alteração de regras Instagram, credenciais nem cookies.
- Mudanças propostas: rota autenticada de retry local no mesmo job, prevenção de retry de YouTube bloqueado no servidor e botão de recuperação no painel. Aguardam CI e implantação.


## 2026-10-08 — recuperação do pôster no retry do vídeo
- Pedido: corrigir erro `video_official_poster_required` no painel cliente para Homem-Aranha: Um Novo Dia; usuário autorizou avançar automaticamente e acionou os agentes Nexus.
- Defeito reproduzido localmente: job com título exato salvo e sem selectedYoutubeTitle usava busca genérica antiga, impedindo o reconhecimento Sony no retry. Resolver, portal e dispatcher agora usam identidade exata; busca genérica e trailer conflitante continuam bloqueados.
- MP4 original preservado; gate de imagem oficial mantido. Mensagem UI deixa de sugerir seleção que o botão retry não consome.
- Evidência: 206/206 testes Worker aprovados, quatro testes funcionais novos com handler/session/SQLite e R2 emulado; bundle Wrangler aprovado. Sony/GitHub simulados nos testes.
- CI anterior 37858499363 e health produção aprovados. Captura não correlacionada ao registro D1; pôster remoto/MP4 final do job real ainda não comprovados. Alteração local aguardando CI/implantação.
- Próximo passo: publicar alteração no GitHub, confirmar CI/deploy e repetir geração do job original; só declarar solução funcional após render/download comprovados.


## 2026-10-09 — referências Instagram e teste único autorizado
- Integrados prompts/versionamento das referências, imagens R2 no modelo, quatro cards separados e Reel com zoom. Corrigida composição Global Play com raster PNG. Teste controlado passa testId, registra state R2 e mediaId/permalink e bloqueia revisão indisponível. Disparador paralelo removido do workflow dedicado; test timeout600s e recuperação D1 excluída do teste. Ainda local, sem deploy/publicação.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.

## 2026-10-12 — Brinde "siga para liberar" no QUERO
- Pedido do Rodrigo: direct com uma frase só, sem link longo do WhatsApp; a pessoa segue, depois preenche o WhatsApp numa página e recebe o brinde.
- Novo `cloudflare/src/gift.js`: link curto `/b/CODIGO` (guardado em nexus_state "gift-link", 30 dias), botão "Já segui" confere `is_user_follow_business` no Instagram, formulário nome + WhatsApp vira contato quente no painel (source instagram-brinde), e libera o guia `/brinde/guia` ("10 ideias de post que trazem clientes").
- `comment-autoreply.js`: DM agora é "Siga @flowarts2026 e pegue seu brinde aqui 🎁 <link>". Sem NEXUS_SECRET_KEY volta ao texto antigo.
- Se o Instagram não deixar ver se a pessoa segue, a página pede para mandar "SEGUI" no direct e tocar de novo.
- Testes: 289 + novos de gift passando. Ainda não enviado (aguardando OK).
- 22:50 (Rodrigo): texto do direct bagunçado. Agora o direct é só "Me siga para receber o conteúdo 🎁" + botão "Baixar conteúdo" (modelo de botão do Instagram; se recusar, manda a frase com o link). A página confere sozinha ao abrir; se não segue, diz "Você precisa me seguir primeiro". Prova real do 1º envio: 22:45, DM com link curto chegou na playprime2027.

## 2026-10-12 — Ideias do pacote instagram-agent (Jake Schincariol, MIT)
- Rodrigo pediu para analisar a página do Notion "instagram-agent: 13 skills". O pacote só escreve texto; o Nexus já publica, gera imagem, responde QUERO e mede seguidores (Radar).
- Aplicado: `cloudflare/src/caption-polish.js` + uso em agent-runtime: até 5 hashtags (limite do Instagram desde dez/2025; antes aceitava 6), remove travessão e caracteres invisíveis, primeira linha com até 125 caracteres, e lista de frases de robô no prompt. 294 testes passando.
- 23:03 (Rodrigo): o pedido para seguir tem que acontecer no direct; só quem segue recebe o botão "Baixar conteúdo". Novo `cloudflare/src/gift-dm.js`: comentário QUERO → direct "Me siga para receber o conteúdo 🎁" + botão rápido "Já segui"; o NEXUS lê o direct a cada minuto (novo cron "* * * * *", leve, sai antes do agendador); se a pessoa não segue → "Você precisa me seguir primeiro" + "Já segui"; se segue → botão "Baixar conteúdo" (abre /b/CODIGO com nome + WhatsApp + guia). Comentários QUERO agora são lidos a cada 5 min. 299 testes.
- 23:12 (Rodrigo): página do brinde no estilo do exemplo guias.vibehub.academy. Formulário virou uma janela só (Nome, E-mail, WhatsApp +55, sem caixinha; aviso de privacidade embaixo); a conferência de "segue?" roda escondida e a tela "Você precisa me seguir primeiro" só aparece para quem não segue. Guia novo em tema escuro: bônus no topo (post de exemplo grátis → WhatsApp), "Ir direto para as ideias", Baixar PDF, 3 números, 10 passos com legenda pronta + botão Copiar, "Marcar como feito" com barra de progresso salva no celular, e dica no fim. Contato salvo com e-mail.
- 23:19 (Rodrigo): tocou "Já segui" sem seguir e nada voltou. Diagnóstico: o cron "* * * * *" está registrado na Cloudflare mas não disparou nenhuma vez (só os de 15 min aparecem no Observability); rodando na mão (GET /api/master/clients/primeiro-teste/gift-inbox-run) a lógica funcionou e mandou "Você precisa me seguir primeiro" (stage not_following). Também vimos POST no webhook às 23:23: a Meta está mandando avisos de mensagens. Correção: o webhook agora trata "Já segui" (quick reply GIFT_FOLLOWED ou texto) e responde na hora; a leitura a cada minuto fica de reserva. 301 testes.

## 2026-10-12 manhã
- Prova real (07:21): globalplay_streaming tocou "Já segui" sem seguir → recebeu "Você precisa me seguir primeiro"; depois de seguir → recebeu "Baixar conteúdo", abriu o formulário e liberou o guia (gift.unlocks=1). O cron de 1 min passou a disparar durante a noite.
- Problemas relatados: PDF não baixa (window.print não funciona no navegador do Instagram) e respostas demoradas.
- Causa da demora: os avisos da Meta chegam (14 POST/h, status 200), mas o `entry.id` do aviso é o `user_id` da conta profissional, diferente do `id` salvo no login (profile.id). O Nexus não achava o cliente e ignorava. Correção: `clientForInstagramUser` pergunta `me?fields=user_id` e guarda (nexus_state ig-webhook-id); resumo dos últimos avisos (sem texto) em `webhookLog` no autoreply-status.
- PDF real gerado com Playwright a partir do guia: `public/downloads/guia-10-ideias-flowarts.pdf` (4 páginas); botão "Baixar PDF" agora é link de download. Regerar o PDF se o guia mudar.
- 07:33 (Rodrigo): análise de guias.vibehub.academy/d9tdr (repositório msitarzewski/agency-agents, 382 papéis, MIT). Conclusão: o Nexus já segue o "time pequeno + arquivo de contexto + aprovação humana". Criado `.claude/agents/revisor.md` (crítica sem ver o processo + conferência de fatos, inspirado no testing-reality-checker, adaptado à Flow Arts). CEO, Marketing e Vendas agora mandam rascunhos para o Revisor antes do Rodrigo. Vendas: removida a regra antiga que proibia vender a resposta automática (ela já funciona).
- 07:36 (Rodrigo): regras do Revisor dentro do Nexus. Novo `cloudflare/src/brand-guard.js` (reviewCopy): confere a legenda de clientes com perfil de marca e aponta promessa de resultado, preço (quando o perfil proíbe), Global Play/Ragnar, pressa falsa e prova inventada. Não bloqueia: `listPosts` devolve `reviewWarnings` e o painel mostra "⚠️ Revisor: confira antes de aprovar" no post não publicado (client-lite.js v110, css v107). Sem IA, sem custo. 304 testes.
- 07:39 (Rodrigo): (1) quem já segue não precisa pedir: no comentário o Nexus tenta `is_user_follow_business`; se true, o 1º direct já é o botão "Baixar conteúdo" (marca done). Se o Instagram não deixar ver (sem conversa ainda), manda "Me siga..." + "Já segui" e o toque é respondido na hora. (2) Posts sem "Comente QUERO": Flow Arts ganhou `giftCta` ('Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁'); vira a chamada única dos posts novos (ensureGiftCta) e o cron de 15 min coloca a chamada nos posts prontos ainda não publicados (`gift-cta-fix.js`, só sem media_id). 306 testes.
- 07:44 (Rodrigo pediu auditoria ponta a ponta + imagens melhores; 0 seguidores e 0 visualizações). Correções no código (ver KNOWN_ISSUES 2026-10-12 Auditoria):
  - ai-growth.js: max_output_tokens 1100 → 7000 (resposta não é mais cortada).
  - campaign-copy.js (novo): IA escreve gancho + 3 dicas práticas para cada post da campanha de marca; texto fixo só como reserva.
  - media-generation.js: imagens de marca com o gancho escrito em português (brandHeadline) + "FLOW ARTS" pequeno; feed/carrossel 1080×1350 (4:5), reel 1080×1920; agent-runtime passa o gancho como título (não mais a frase do briefing).
  - format-builder.js: cards do carrossel de marca com títulos reais (gancho, 1º ponto, "Faça isso toda semana", "Comente QUERO e ganhe o guia grátis").
  - caption-polish.js: chamada única (remove "Responda nos comentários", "Salve para...", etc. quando há o QUERO); o cron corrige posts prontos.
  - Meta de seguidores para marca: 1.000 em 90 dias (ignora valores > 100.000).
  - 309 testes.
- 08:12 (Rodrigo): criou token GitHub granular "nexus-reels-2" (conta flowarts2027-art, só SERVIDOR-NEXUS-2.0, Actions + Contents leitura/gravação, 90 dias) e trocou o segredo GITHUB_ACTIONS_TOKEN na Cloudflare ele mesmo. Conferido no painel: GITHUB_INGEST_REPOSITORY = flowarts2027-art/SERVIDOR-NEXUS-2.0. Ainda sem prova de Reel renderizado: o 1º teste real é o post Reel das 12:00 de 12/10 (já aprovado).
- 10:00 (Rodrigo enviou 2 PDFs). PDF 1 (agentes Vendas/Assistente/Qualificação/Agendamento): não fala de alcance; útil depois para o agente de Vendas e para o WhatsApp do Nexus (que ainda tem texto antigo "uso próprio ou revenda"). Pendente de decisão. PDF 2 ("alcance massivo com perfil zero"): aplicado.
  - A) `cloudflare/src/reach-playbook.js` (REACH_RULES) entra no prompt da legenda da campanha (campaign-copy.js) e do cérebro de crescimento (ai-growth.js).
  - B) `flowarts-campaign.js`: dias 13–17 trocados por sequência de 10 posts de alcance (5 Reels, 3 carrosséis, 2 posts), cada um com cena própria (5º campo da linha); visualBrief não diz mais "No text" (conflitava com o gancho escrito na imagem). 311 testes.
- 10:05–11:22: deploy do commit c4cb420 falhou 2x no passo "Deploy Worker" com erro da Cloudflare ("Unable to fetch bindings, routes, or services metadata from the dashboard. Please try again later."). Não era código. Rerun às 14:22 UTC: sucesso.
- 12:09: post Reel das 12:00 não saiu. formatBuild failed 3x com "social_reel_dispatch_failed_404 Not Found" (08:27, já com o token novo) e ficou travado (a reserva para imagem só cobria 401/403). Correção: reserva cobre 401/403/404/409/422 e, ao bater 3 tentativas, Reel aprovado sai como imagem em vez de ficar travado. Nova rota GET /api/master/github-check (mostra só status/permissões, nunca o token) para diagnosticar o acesso do token ao repositório.
- 12:12: /api/master/github-check mostrou o token novo válido (login flowarts2027-art), mas GITHUB_INGEST_REPOSITORY na Cloudflare tem 2 espaços no começo ("  flowarts2027-art/SERVIDOR-NEXUS-2.0") → 404. Correção: .trim() em todo uso dessa variável.
- 12:16: depois do deploy, /api/master/github-check = ok (repo acessível, push:true). Reels devem renderizar a partir do próximo post Reel aprovado (13/10 12:00). Post Reel de 12/10 12:00 sai como imagem (bateu o limite de tentativas antes da correção). Lembrete agendado para 13/10 12:20 conferir.

## 2026-10-12 tarde — domínio e site
- Rodrigo comprou flowarts.com.br na Hostinger (1º ano R$ 1; renovação R$ 64,99). Zona criada na Cloudflare (plano Free), nameservers mia/todd.ns.cloudflare.com salvos na Hostinger às 12:52 (antes dava erro porque o .com.br estava "Cadastrando-se"). Zona pendente até o registro propagar.
- Site novo `public/site.html` com o logo do Rodrigo (`public/brand/flowarts-logo.webp`, símbolo e ícone): hero com celular mostrando o fluxo QUERO → "Me siga" → "Já segui" → "Baixar conteúdo" → contato no WhatsApp; "Teste agora" (comentar QUERO no @flowarts2026); pacotes (R$ 197 Instagram que responde sozinho, R$ 147 5 Reels, R$ 97 10 posts, R$ 67 logo); como funciona; perguntas; rodapé com CNPJ. index.js: raiz de flowarts.com.br/www serve /site.html; outros hosts continuam indo para /login.
- PENDENTE: quando a zona ficar ativa, adicionar em wrangler.jsonc "workers_dev": true + routes custom_domain (flowarts.com.br, www, painel.flowarts.com.br). Não fazer antes: deploy com custom_domain em zona pendente falha.

## 2026-10-12 — Correção do carrossel (texto cortado e descrição vazando)
- Pedido do Rodrigo pelo app (prints do post de @flowarts2026): título do topo cortado e card 2 com "1. Balcão de uma pequena loja fictícia, com cartaz...".
- Causa 1: imagem gerada em 1024x1536 e recortada para 1080x1350 (fit cover) corta ~9% em cima e embaixo; o prompt mandava o título no terço superior. Corrigido em `media-generation.js`: texto começa 18% abaixo do topo e nada nos 15% de baixo.
- Causa 2: `format-builder.js` usava `features.scene` como título do card 2. Agora usa `firstTipOverlay` (ângulo curto ou "1. Comece por aqui").
- Testes: 320/320 passando. Commit local; push só com OK do Rodrigo. O post já publicado não muda: precisa ser refeito.

## 2026-10-13 — aviso de post aprovado que não saiu (item 1 da auditoria)
- Pedido do Rodrigo: corrigir o item 1 de `AUDITORIA-2026-10-13.md`.
- `scheduler.js`: nova `expireStalePosts`. Post aprovado vencido (>24 h, ready/scheduled/failed) agora recebe `error='approved_post_missed'`; rascunho sem aprovação continua `stale_ready_expired`. Os dois seguem `expired` (não publicam atrasados). Estado do scheduler guarda `missedApprovedPosts`.
- `public/app.js` (Master › Posts): status `expired` aparece como VENCIDA; aviso no topo com quantos aprovados não saíram; texto "Aprovado · NÃO foi publicado" no lugar de "publica no horário" quando o post terminou sem sair; erros traduzidos.
- Teste novo `expire-approved-posts.test.mjs` (SQLite real). 322/322. Em branch `fix/aviso-post-aprovado`; não implantado até o OK do Rodrigo. Posts que já venceram antes desta mudança continuam com o erro antigo.
- Implantado com OK do Rodrigo (09h22): main 150e9e1, deploy run 38396871374 com sucesso. Conferência do painel ao vivo não feita desta sessão (rede bloqueada); Rodrigo confere em Master › Posts.

## 2026-10-13 — CI virou "só testes" (item 2 da auditoria)
- Causa do CI vermelho: `scripts/test_premium_editor_layout.cjs` conferia o editor de vídeo antigo, que não está em nenhuma página de `public/`.
- Achado importante: o `ci.yml` antigo, depois dos testes, aplicava migrações no D1 de produção, fazia um segundo deploy, refazia o ZIP do instalador e chamava `/api/emergency-publish-now` (publicação de emergência). O vermelho estava, sem querer, impedindo isso.
- Novo `ci.yml`: só checagem de sintaxe, testes do AutoFix, 322 testes do Worker, testes do render de overlay e bundle do Wrangler. Sem deploy, sem D1 remoto, sem publicação. Deploy continua no `deploy-nexus-cloudflare.yml`. Versão antiga guardada em `docs/legacy/ci-antigo-2026-10-13.yml.txt`.
- Saíram junto: passos da Global Play/Ragnar (cartazes, trailers, iTunes, Commons), editor premium e workspace de vídeo.
- Atenção: migrações novas do D1 não são mais aplicadas sozinhas (na prática já não eram, porque o CI parava antes). Quando houver migração nova, aplicar com `npm run d1:migrations:apply` e o OK do Rodrigo.
- Teste `issue100-production` passou a conferir que o CI não implanta nem publica. Local: 322/322, AutoFix 4/4, overlay ok. Bundle do Wrangler não rodou nesta sessão (npm sem rede); é o mesmo passo do deploy, que funciona.
- Branch `fix/ci-somente-testes`; aguardando OK do Rodrigo.
- CI novo rodou VERDE no GitHub no PR #122 (commit 9a6dc99), incluindo o bundle do Wrangler. Precisou instalar python3-pil e fontes no passo de overlay.

## 2026-10-13 — SEO: nome "Flow Arts Marketing" no site
- Search Console já estava verificado (domínio, via Cloudflare) e a home já indexada (feito em 12/10). Sitemap reenviado com URL completa em 13/10.
- Pedido do Rodrigo: o nome "Flow Arts" se confunde com "flow arts" (malabarismo). `public/site.html`: título "Flow Arts Marketing | IA e Instagram para pequenos negócios" (59 caracteres), og:site_name e og:title com "Flow Arts Marketing", schema ProfessionalService com alternateName ["Flow Arts Marketing", "Flow Arts Agência de Marketing"]. H1 e textos visíveis não mudaram.
- 322/322. Branch `fix/seo-flow-arts-marketing`; aguardando OK do Rodrigo. Depois do deploy: Search Console › Inspeção de URL › Solicitar indexação.
- Implantado com OK do Rodrigo (11h17): main 193e66d, deploy com sucesso; título e og:site_name novos conferidos no ar em flowarts.com.br.

## 2026-10-13 — 3 páginas de nicho no site (SEO)
- Pedido do Rodrigo: mais conteúdo no site; escolheu "uma página por tipo de negócio". Primeiras: /marketing-para-cafeteria, /marketing-para-salao-de-beleza, /marketing-para-lanchonete.
- Cada página: problema do nicho, 5 ideias de post úteis, como funciona, preços oficiais (de `whatsapp-knowledge.js`), FAQ e chamada para WhatsApp/exemplo grátis. Dados para o Google: Service, FAQPage e BreadcrumbList. ~500 palavras cada. Sem resultados, clientes ou números inventados; sem citar resposta automática.
- Gerador: `scripts/site/gerar_paginas_nicho.py` (para criar novos nichos, adicione em NICHOS e rode `python3 scripts/site/gerar_paginas_nicho.py public`).
- Páginas no `sitemap.xml` e no rodapé do `site.html`. Conferidas em celular (390 px) e computador sem rolagem lateral. Teste `site-niche-pages.test.mjs`; 324/324.
- Branch `feat/paginas-nicho`; aguardando OK do Rodrigo. Depois do deploy: pedir indexação das 3 URLs no Search Console.
- Implantado com OK do Rodrigo (11h32): main 5bb31f0, deploy com sucesso; /marketing-para-cafeteria conferida no ar. Próximo: Rodrigo pede indexação das 3 URLs no Search Console.

## 2026-10-13 — seção "Para o seu tipo de negócio" na home
- Rodrigo não viu as páginas novas (estavam só no rodapé). Nova seção `#para-quem` no `site.html`, antes de "Como funciona", com links para as 3 páginas de nicho. Conferida no celular sem rolagem lateral. Branch `feat/menu-paginas-nicho`.
- CONFLITO a decidir pelo Rodrigo: a home vende "Instagram que responde sozinho" por R$ 197 (pagamento único) com resposta automática no direct, e o hero diz "responde quem comenta, na hora". Já `whatsapp-knowledge.js` (preços oficiais, OK de 12/10) tem "Instagram no Automático" R$ 297 + R$ 697/mês e proíbe vender resposta automática a comentários enquanto a Meta não aprovar. As páginas de nicho usam os preços do `whatsapp-knowledge.js`.
- Decisão do Rodrigo (11h49): vale o preço da página principal ("A"). Páginas de nicho regeradas com os 4 pacotes da home (R$ 197 único, R$ 147, R$ 97, R$ 67). 324/324.
- PENDENTE de confirmação: `whatsapp-knowledge.js` (robô) e `empresa/visao.md` ainda têm o plano mensal R$ 297 + R$ 697 e a regra de não vender resposta automática. Não alterados até o Rodrigo confirmar. Alerta dado: a resposta automática a comentários depende do app publicado na Meta, que espera a verificação da empresa.

## 2026-10-13 — Hook Lab colocava frase de filme em todos os clientes
- Achado ao pegar imagens da demo: legendas do Café Brisa começavam com "Você está assistindo errado e nem percebeu.", "Filme bom não salva uma experiência ruim." etc. Causa: `runHookLab` em `extended-agents.js` usava um banco fixo de ganchos de streaming (Global Play) para qualquer cliente, inclusive Flow Arts.
- Correção: `STREAMING_HOOKS` só para globalplay/ragnar; demais clientes usam `BUSINESS_HOOKS` (pequeno negócio). Legenda que já começa com gancho de filme em cliente não-streaming é trocada no próximo ciclo (posts ready/scheduled), e o gancho salvo em creativeFeatures não é reaproveitado.
- Teste `hook-lab-business-hooks.test.mjs` (SQLite real, demo-cafe e primeiro-teste). 326/326. Branch `fix/hook-lab-frases-filme`; aguardando OK.
- Implantado com OK do Rodrigo (22h04): main 7f3c1d0, deploy com sucesso. Legendas da demo e da Flow Arts se corrigem no próximo ciclo do Hook Lab (posts ready/scheduled); conferir a /demo depois.
## 2026-10-13 — site mais visual (em andamento, branch `feat/site-visual`)
- Pedido do Rodrigo: "ninguém lê, as imagens falam mais". Analisado o PDF "Claude Web Designers" (skills Kowalski/Impeccable/Taste + Figma/Playwright): mesma ideia feita aqui com a skill de design + Playwright; skills de terceiros não instaladas. Rodrigo escolheu usar posts reais + visuais novos (opção C).
- Nova home: celular grande com perfil cheio de posts (destaque), antes e depois em dois celulares, galeria de posts para arrastar, como funciona com a conversa animada, portas por tipo de negócio com imagem, pacotes com menos texto, perguntas fechadas. Cabeçalho, título, dados do Google (JSON-LD) e preços mantidos.
- Saiu a faixa "Teste agora: comente QUERO" (a resposta automática ainda espera a Meta).
- Imagens: lista POSTS no script da página aponta para /brand/posts/post-1..6.webp; sem o arquivo aparece bloco provisório. Aguardando 4–6 imagens de posts do Rodrigo.
- Fontes da página em `scripts/site/site-visual.css` e `site-visual.body.html`. Celular 390 px sem rolagem lateral. 324/324. Não implantado.
- Implantado com OK do Rodrigo (22h16): site novo no ar, com 12 imagens reais de posts (Flow Arts e demo Café Brisa) servidas de /media/posts/.

## 2026-10-13 — plano mensal no site
- Rodrigo notou que o site só tinha pacotes de pagamento único. Pensou em R$ 350 + R$ 95/mês; alertado de que 12 posts com imagem custam ~US$ 16/mês em IA (estimativa de 12/10), decidiu manter o preço que já existia.
- `site.html`: bloco em destaque "Instagram no Automático" — R$ 297 de entrada + R$ 697/mês, 12 posts/mês (4 Reels, 4 carrosséis, 4 posts), postagem automática após aprovação, painel com números, preço de fundador (3 primeiros, 6 meses), sem fidelidade (aviso de 30 dias). Oferta adicionada ao JSON-LD. Resposta automática NÃO entra no plano (depende da Meta). Igual ao `whatsapp-knowledge.js`.

## 2026-10-13 ~23h BRT — WhatsApp com número próprio
- Verificação da empresa recusada de novo pela Meta. Caminho sem verificação: número próprio (chip Vivo +55 21 99855-9965) registrado no app Flow Arts WhatsApp (Messaging Account ID 2899837553722059, phone number ID 1357206410813430), "Assinar webhooks" ligado (era o passo que faltava; a regra de app publicado é do Instagram). Limites sem verificação: 2 números, 250 conversas iniciadas pela empresa/24 h.
- Rodrigo trocou na Cloudflare WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN (token permanente de usuário do sistema "nexus-whatsapp", função Funcionário, permissões whatsapp_business_messaging e management; o admin já existente "administrador" NÃO foi apagado).
- Teste 23h12/23h15: mensagens "Oi" CHEGARAM ao Nexus (inbox ok, IA gerou rascunho), mas o envio falhou com whatsapp_http_400 (motivo não guardado). Suspeitas: falta forma de pagamento na conta do WhatsApp ou PIN de duas etapas.
- Branch `fix/whatsapp-erro-detalhado`: erro de envio passa a guardar código e explicação da Meta. 326/326. Aguardando OK para implantar.
- 23h40: token novo conferido no depurador da Meta (app Atendente Flow Arts 1455830946652181, System User, nunca expira, whatsapp_business_messaging/management "all objects"); envio continua `whatsapp_http_400_100: Authorization Error`. Rodrigo apagou o app antigo "Agente Atlas" (sem uso). Nova rota só leitura `GET /api/whatsapp/number-check` (Master) consulta o número na Meta (status, platform_type, name_status, limite) para ver se está ativo na Cloud API.
- 23h45: number-check no ar: número CONNECTED, CLOUD_API, LIVE, nome Flow Arts AVAILABLE_WITHOUT_REVIEW, TIER_250. Envio ainda recusado; branch fix/whatsapp-erro-completo guarda a recusa completa da Meta (tipo, códigos, mensagem, detalhes).
- 00h13 (14/10): forma de pagamento adicionada na conta do WhatsApp; verificação da empresa enviada de novo ("Em processamento"). Teste 5 às 03:13 UTC: chegou, IA respondeu, envio ainda recusado `OAuthException | code=100 | Authorization Error`. Descartados: token (depurador ok, all objects), número (CONNECTED/CLOUD_API/LIVE), pagamento. Suspeita restante: app "Atendente Flow Arts" em modo desenvolvimento bloqueando envio a números fora da lista de teste, ou formato do destinatário. Próximo: testar envio pela tela "Enviar mensagem" da Meta (mostra o motivo) e checar o `to` enviado pelo Nexus.
- 06h47 (14/10): verificação da empresa pelo domínio. Metatag facebook-domain-verification adicionada em public/site.html (o e-mail "pla...@gmail.com" vem do registro da Receita e o Rodrigo não lembra; dados da empresa corrigidos conforme o CCMEI: nome empresarial, bairro, CNPJ, site).
- 06h53 (14/10): domínio flowarts.com.br VERIFICADO na Meta (metatag). Verificação da empresa reenviada por domínio + CCMEI: "Em análise", ~2 dias úteis. Ao aprovar: publicar o app Atendente Flow Arts e testar o robô (envio hoje falha com OAuthException code 100).
