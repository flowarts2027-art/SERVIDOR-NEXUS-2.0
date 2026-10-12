# Histórico de alterações feitas pelo Work

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
