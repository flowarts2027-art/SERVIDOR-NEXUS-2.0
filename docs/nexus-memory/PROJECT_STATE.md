# Estado do Nexus 2.0

## 2026-10-12 ~16h10 BRT — correção: Master deslogava sozinho
- Causa (introduzida no deploy 1b141f7): rotas /api/whatsapp/* aceitavam só Bearer NEXUS_SECRET_KEY; o Master usa cookie → 401 → api() do app.js redireciona para o login. O contador do menu chamava a rota ao abrir, então o painel deslogava em qualquer tela.
- Correção 2c8217e: rotas aceitam resolveMasterSession (Bearer ou cookie); whatsapp-inbox.js tem helper próprio que nunca redireciona. Teste de regressão; 319/319. Deploy run 38295842935 com sucesso.
- Rodrigo colocou na Cloudflare os 4 segredos (WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN de teste, WHATSAPP_APP_SECRET). Uma variável de texto com nome/valor trocados foi criada por engano e apagada; Rodrigo foi orientado a trocar a senha pessoal que apareceu nela.
- Aprendizado: os testes da aba usaram API simulada e não pegaram a autenticação real. Testar rotas novas do Master com sessão de cookie.
- Próximo: Rodrigo confere a aba WhatsApp ("Conectado") e configura o webhook na Meta.

## 2026-10-12 ~15h45 BRT — atendente de WhatsApp implantado (robô desligado)
- Rodrigo deu OK. PR #109 integrado em main 1b141f7; deploy Cloudflare run 38292599222 concluído com sucesso. Conferência HTTP direta da aba não feita nesta sessão (permissão de rede). Robô começa desligado; segredos da Meta ainda não colocados; nenhuma mensagem real trocada pelo Nexus.
- Próximo: Rodrigo digita os 4 segredos do WhatsApp na Cloudflare e configura o webhook na Meta.

## 2026-10-12 tarde — atendente de WhatsApp com IA (código pronto, detalhes)
- Rodrigo decidiu: começar com número de teste da Meta e depois um chip pré-pago só para o robô (número sai do app do celular). Acompanhar conversas pelo painel Master. IA = OpenAI já existente. IA pode falar preços.
- Meta: app novo "Flow Arts WhatsApp" (portfólio Rodrigo Carvalho, separado do app do Instagram). Número de teste +1 555 142-0295; mensagem modelo chegou no celular do Rodrigo. Token de teste gerado (24 h); segredos ainda não colocados na Cloudflare; webhook ainda não configurado.
- Código (branch `feat/whatsapp-atendente`): cliente do WhatsApp trocado para `primeiro-teste`; `whatsapp-knowledge.js` com fatos/preços da Flow Arts; resposta automática com liga/desliga (desligada por padrão), pausa por conversa, passagem para humano, aviso seguro se a IA falhar, pedido de texto para áudio; aba WhatsApp no Master (lista, conversa, responder, pausar/religar). Hora das mensagens recebidas passou a ser a do Nexus (ordem da conversa).
- Evidência: 318/318 testes locais (10 do WhatsApp com SQLite real e Meta/OpenAI simuladas); tela conferida em navegador de teste com dados simulados. Nenhuma mensagem real enviada pelo Nexus; nada implantado.

## 2026-10-11 — projeto preparado no PC do proprietário e perfil de marketing
- Pedido: baixar o projeto em `C:\Users\playprime\nexus` e deixar pronto para rodar. Feito: clone, dependências instaladas, 247/247 testes e bundle dry-run aprovados. Sem deploy, sem `wrangler dev`, sem publicação.
- Criado `.agents/product-marketing.md` (contexto de marketing da Flow Arts para as skills de marketing do Claude Code; não é lido pelo Worker). Decisões em DECISIONS.md.

## 2026-10-11 ~09h50 BRT — primeira publicação da Flow Arts
- Proprietário aprovou os 2 posts. Post das 12:00 (Reel) caiu para imagem porque o token GitHub do Worker era da conta suspensa (403); foi publicado no Instagram (perfil passou de 2 para 3 posts, conferido no navegador), mas o ledger ficou em `publishing` (invocação interrompida após o media_publish). Corrigido com recuperação automática: às 13:25 UTC o ledger foi marcado `published` (mediaId 17890778682616932, https://www.instagram.com/p/DeWq1MNCX80/, `recoveredFromStuckPublishing`).
- Carrossel das 19:00: Copy Chief aprovado após correção do CTA; 4 cartões montados; aguardando horário.
- Proprietário criou token fine-grained na conta flowarts2027-art (Contents e Actions read/write, só SERVIDOR-NEXUS-2.0), trocou `GITHUB_ACTIONS_TOKEN` e `GITHUB_INGEST_REPOSITORY` (agora flowarts2027-art/SERVIDOR-NEXUS-2.0) no Worker. Primeiro Reel animado ainda não testado.

## 2026-10-11 ~08h20 BRT — primeiras imagens da Flow Arts
- Memória dos agentes da Flow Arts zerada (`reset-agent-memory`: estado apagado, 24 rascunhos antigos e 27 registros de aprendizado). Após o ciclo de 11:16 UTC: 0 menções a streaming no estado.
- Ciclo de 11:16 UTC gerou as 2 imagens do dia (12:00 Reels, 19:00 carrossel) com `clean_brand_image`; inspecionadas visualmente: cenas de marketing no Rio, paleta azul-marinho, persona da marca, sem texto. Aguardando aprovação do proprietário no painel.
- Uso de tokens do dia ~60k de 150k.
- Carrossel monta 4 cartões só depois da aprovação; Reels dependem do token do GitHub no Worker ter acesso ao repositório novo (não verificado).

## 2026-10-11 ~07h BRT — Global Play encerrada
- A pedido do proprietário: `globalplay-streaming` com status `paused` e 48 postagens não publicadas apagadas (fila, falhas e vencidas) + 1 trabalho agendado, pela rota nova `POST /api/master/clients/:id/clear-pending-posts`. Restam só 12 registros publicados (histórico; os posts continuam no Instagram).
- Ragnar One: 54 postagens não publicadas apagadas. Ragnar e Global Play com status `archived` (somem das listas do Master; `/api/clients?all=1` mostra). Único cliente ativo: Flow Arts (`primeiro-teste`).
- Imagens liberadas: limite diário de tokens da Flow Arts 30.000 → 150.000 (texto já consumia ~32k/dia, ~US$ 0,02).

## 2026-10-11 manhã — painel do cliente novo
- Proprietário aprovou a lista da auditoria e passou o WhatsApp 21964816185.
- Constatado no código: o Nexus não responde comentários nem envia DM. O texto que leva para o site da Global Play não vem do Nexus (origem a confirmar com o proprietário).
- Painel do cliente refeito; testes locais 242/242.
- Saldo OpenAI: a API não expõe saldo pré-pago; o Master estima saldo = último saldo informado − custo real desde então (Admin API). Base antiga US$ 3,12 (01/10) já consumida (gasto US$ 3,51) → mostrava 0. Registrado novo saldo informado pelo proprietário: US$ 5,53 em 2026-10-11 ~06:40. Texto do painel explica a estimativa.
- Leitura automática do saldo: implementada tentativa na rota não oficial `/v1/dashboard/billing/credit_grants` (Admin key do painel e project key). Em produção (deploy b3159df) a OpenAI recusou as duas chaves → `balanceSource: estimate`. Sem rota oficial (suporte OpenAI, 09/2026). O proprietário só precisa informar o saldo após recargas.

## 2026-10-10 ~21h30 BRT — repositório novo, trava das contas de streaming, Flow Arts
- Código completo enviado para `flowarts2027-art/SERVIDOR-NEXUS-2.0` (merge com o histórico de recuperação, sem force-push). README antigo de recuperação movido para `docs/RECUPERACAO-ESTADO.md`.
- Secret `CLOUDFLARE_API_TOKEN` criado pelo proprietário (template Edit Cloudflare Workers, conta diamantehinode2015). Deploy GitHub Actions run #2 (commit 3b319e7) e #3 (9bb48d6) concluídos com sucesso, incluindo a verificação do portal ao vivo.
- Decisão do proprietário: parar Global Play e Ragnar One. Motivo: não há confirmação de licença do serviço vendido, e o pipeline usa cartazes oficiais/trailers de estúdios. Trava `BLOCKED_PUBLISH_CLIENTS` em `cloudflare/src/publisher.js` recusa imagem, vídeo e carrossel para `ragnar-one`, `globalplay-streaming` e `global-play-streaming`.
- Produção (lido pelo painel Master): `ragnar-one` com status `paused`; cliente duplicado `global-play-streaming` apagado pelo proprietário; `globalplay-streaming` segue `online` (protegido contra exclusão), sem conseguir publicar.
- Flow Arts (`primeiro-teste`, @flowarts2026): OAuth Instagram retornou `oauth=success` em 2026-10-10 ~21h20. Após o deploy 51f3e03 (sucesso), `/api/master/instagram/accounts-status` confirmou `primeiro-teste`: connected, tokenValid, accountMatches, validation ok, expira em 2026-12-10.
- Perfil de marca de marketing para Flow Arts em `cloudflare/src/client-brand.js` (imagem, hashtags, CTA, foco e temas manhã/tarde/noite; nome/nicho salvos no painel têm prioridade).
- Constatado em produção: 27 rascunhos antigos da Flow Arts (status ready/expired, aprovação pending) criados antes do perfil, com legenda genérica e hashtags #Streaming. Nenhum publicado.
- Auditoria do Instagram @flowarts2026 registrada em `AUDITORIA-FLOW-ARTS.md` e repassada ao perfil de marca (profileVersion 2026-10-11c): agência de marketing com IA, Rio de Janeiro, CTA "EXEMPLO".
- Painel Master: prévia de posts e botões Aprovar/Recusar. Proprietário recusou o rascunho antigo de 2026-10-11 18:00.
- Constatado às 00:51 UTC: Creator refez os 3 rascunhos (versão do perfil gravada), mas temas ainda vinham de termos de pesquisa (streaming/entretenimento); corrigido com temas e ganchos próprios da marca.
- Testes locais: 238/238 aprovados. Nenhuma publicação real foi feita.


## 2026-10-10 — limpeza de legado preparada localmente
- Código de legado Express/Railway/Windows removido da raiz do repositório (lista em CHANGELOG). `cloudflare/src` intacto. Bundle e 67 arquivos de teste aprovados localmente. Implantação e produção não verificadas nesta sessão.

## 2026-09-28 14h30 BRT — leitura externa do asset falhou no Worker
- PR #39 integrou e deploy 36458303602 passou. Designer do post Ragnar vencido retornou `pinned_asset_unavailable` em 17:29 UTC. O JPEG público responde, mas a chamada feita de dentro do Worker ao próprio domínio falhou. Correção preparada para ler pelo binding `env.ASSETS.fetch`, verificando o mesmo SHA-256; publicação ainda não confirmada.

## 2026-09-28 14h25 BRT — orçamento visual diário esgotado
- Post vencido Ragnar `2026-09-28:1000` recebeu nova mídia após PR #37, mas `visualReview:unavailable`, motivo `openai_daily_budget_reached`. Não elevar limite de tokens. A arte original do usuário, convertida a JPEG 900×1125, foi inspecionada: cena única de sala, TV com navio nórdico genérico, marca Ragnar One e CTA legíveis. SHA-256 `93ec7bbe06be6783beb197e1bcfd838ef66064b4fe3f66d9a37a0b7bf7ae68e2`. Aprovação exclusiva por URL/hash preparada; publicação ainda não confirmada.

## 2026-09-28 14h19 BRT — recuperação executada, Designer rejeitou novamente
- PR #37 integrado e deploy 36455812092 aprovado. Ciclo Ragnar 17:05 UTC ficou preso e foi recuperado em 17:16. No ciclo 17:18 Creator/Designer/Publisher rodaram, mas o post vencido `2026-09-28:1000` terminou sem mídia e com `designer_replacement_queued`; OpenAI reportou sucesso em 17:19. Falta distinguir os critérios visuais rejeitados. Não houve publicação Ragnar confirmada.

## 2026-09-28 13h53 BRT — Ragnar ainda sem postagem
- Após PR #36 implantado, `/api/autonomy-health` às 16:52 UTC mostrou Creator e Copy Chief ativos, mas Publisher Ragnar ainda com `candidates:0`, `published:0`; posts vencidos do dia continuavam sem imagem. A imagem válida foi alocada a uma postagem futura, demonstrando falha na prioridade de recuperação. Correção preparada para priorizar um post vencido e filtrar URLs antigas também da configuração salva. Publicação Ragnar ainda não confirmada.

## 2026-09-28 13h35 BRT — Global Play publicado, mídia Ragnar corrompida
- Global Play publicou post `agentcore:globalplay-streaming:2026-09-28:1200` em 16:27:42 UTC, `mediaIdPresent:true`, gate Designer e revisão v2 aprovados. Isso comprova fluxo Meta para essa conta, não continuidade automática de mídia.
- Ragnar permaneceu em `candidates:0`. Seus três PNGs padrão em `public/assets/ragnar/nordic-cinema-01..03.png` falharam na verificação de integridade de PNG (`bad header checksum in IDAT`), apesar de responderem HTTP 200 com `image/png`. Isso explica a resposta OpenAI 400 `invalid_value` para esse conjunto; URL pública/Content-Type não garantem imagem decodificável.
- Mídia própria já fornecida pelo proprietário, `Saga nórdica no conforto do seu sofá.png`, foi verificada como PNG decodificável, inspecionada visualmente (cena única, TV preenchida, marca Ragnar One e CTA) e convertida para JPEG válido de 900×1125 para o pool. Correção preparada para trocar o pool e descartar referências aos três PNGs quebrados, preservando revisão visual antes de postar. Ainda sem publicação Ragnar confirmada.

## 2026-09-28 13h20 BRT — erro OpenAI mudou após limite
- Após PR #34, Ragnar voltou a receber resposta HTTP da OpenAI, mas `400 invalid_value`; revisão ainda não aprovada e nenhuma postagem nova. Isso sustenta que o limite de subrequests era um bloqueio, mas revela uma segunda falha no payload ou acesso à imagem.
- Preparado diagnóstico seguro do parâmetro inválido: só o campo estruturado do erro ou uma categoria fixa é registrado, jamais mensagem livre, URL ou chave. Confirmar campo em produção antes de modificar o pedido visual.

## 2026-09-28 13h15 BRT — orçamento de chamadas externas
- Produção após PR #33: Ragnar executa Designer/Publisher, mas zero posts elegíveis. `openai.status:transport_error` / `openai_transport_error` apareceu em 16:11 UTC; revisão permanece indisponível, sem postagem. Global Play permanece sem mídia válida para posts do dia.
- Causa estrutural identificada por código e limite oficial: plano gratuito do Cloudflare permite 50 subrequests externos por invocação; o ciclo fazia Radar e Auditor, cada qual consultando até 25 mídias × cinco métricas, e o executor rodava até três jobs na mesma invocação. Exceder o limite é hipótese forte para a falha de transporte OpenAI; deve ser confirmado após reduzir a contagem e observar produção.
- Correção preparada: manter metadados de até 25 mídias, buscar insights detalhados de até três por snapshot e executar um job por invocação do cron. Nenhum gate dispensado, imagem gerada ou postagem de teste enviada.

## 2026-09-28 13h10 BRT — confirmação do bloqueio
- Proprietário verificou Instagram sem postagem. Produção às 13h06: Ragnar voltou a completar ciclos e executar Publisher, mas `candidates:0`; mídia presente e revisões `visual_review_unavailable` ou ausentes. Global Play continua com mídia ausente e Publisher sem execução recente.
- PR #31 implantado com diagnóstico de transporte OpenAI. Postagens antigas com três tentativas esgotadas não fazem nova chamada, logo a causa continua `unknown`. Preparada uma única tentativa diagnóstica por mídia antiga com erro genérico, sujeita ao limite de uma chamada visual por ciclo e sem relaxar aprovação.
- Banner recente do Global Play examinado: muitos quadros e textos pequenos, inadequado para contornar a revisão visual. Não foi posto no pool nem publicado.

## 2026-09-28 ~13h BRT — implantação parcial
- PR #32 integrado como `922c65b`; GitHub Actions 36447607442 concluiu deploy com sucesso. Isso limita as chamadas Graph do Radar/Auditor a 8 segundos; primeira leitura do Worker após deploy ainda mostrou Publisher antigo, e uma consulta subsequente expirou. Não declarar publicação restaurada.
- Próximo diagnóstico: observar execução recente de Publisher e falha categorizada da revisão Ragnar após PR #31; prover fonte de mídia original e única Global Play. Manter gates.

## 2026-09-28 12h50 BRT — publicação parada
- Produção: heartbeat do cron atualizado, mas Publisher das duas contas sem nova execução havia cerca de três horas; vários `agent-core-cycle` e `lead-hunter` marcados `stale_running_job_recovered`. Global Play tem posts aprovados sem mídia e `designer_replacement_queued`; Ragnar tem posts com imagem, mas revisão visual indisponível ou parecer ausente. `candidates:0` não significa publicação bem-sucedida.
- Correção preparada nesta sessão: limite de 8 segundos em cada consulta Graph do Radar/Auditor; não altera gates nem envia posts. A hipótese de requisições Graph presas como causa dos jobs longos exige validação após deploy.
- Há PR #31 simultâneo para distinguir falhas de transporte/orçamento OpenAI; ainda não integrado na leitura inicial. Global Play segue sem fonte comprovada de mídia inédita; não reativar geração paga ou repetir imagem usada.

## 2026-09-27 23h BRT — captação de leads (em implantação)
- Produção antes da alteração: `/api/autonomy-health` respondeu cron saudável, 13 agentes vistos nas duas contas e `leadHunterRuns:0` no último minuto. Isso não comprova zero leads totais, apenas ausência de varredura naquele tick.
- Código identificado: Lead Hunter automático desligado por padrão; Odin podia registrar sucesso ao classificar uma lista vazia. A última leitura de produção da configuração efetiva, contagem de leads e erros Meta ainda depende do novo diagnóstico sanitizado.
- Correção local: padrão de varredura horária para `globalplay-streaming` e `ragnar-one`, respeitando desligamento explícito; timeouts nas chamadas Meta; diagnóstico público agregado de execução/volume; CTA de intenção comercial em cada pauta e formato real de imagem.
- Testes locais: 15/15 e sintaxe dos módulos aprovada; bundle Wrangler dry-run aprovado. Deploy e execução real ainda não confirmados neste registro.

Atualizado em 2026-09-27, aproximadamente 12:24 BRT. Esta página separa constatação de código, verificação de produção e itens não confirmados.

## Incidente de 2026-09-27 — fila de publicação
- Causa confirmada em produção: jobs `lead-hunter` acumulavam a cada minuto e alguns permaneciam em `running`, mantendo dezenas de itens à frente dos publicadores.
- Correção implantada: um job pendente por tipo/cliente, recuperação de jobs presos, prioridade para Publisher/ciclo central, captação automática opt-in e drenagem da fila antiga sem executar captação desativada.
- Publisher agora ignora o backlog sem mídia/gates e seleciona no máximo um post publicável por conta/ciclo. Horários padrão fixados em 09:00, 12:00 e 18:00 BRT.
- Evidência real: `@globalplay_streaming` publicou com sucesso em 2026-09-27 12:21 BRT; `post_ledger` marcou `published`, sem erro e com execução Publisher `published:1`.
- `@ragnarplay1` não tinha post publicável vencido: o post das 09:00 estava sem mídia e com Designer rejeitado. Nenhuma imagem ruim foi forçada. Há mídia aprovada em agenda futura, mas a qualidade visual continua limitada ao gate superficial já documentado.
- Em seguida foram adicionadas três mídias verticais próprias para Ragnar em `public/assets/ragnar/`, com cena única, TV preenchida e tema nórdico, sem texto/logos/colagem. O perfil Ragnar usa esse conjunto como pool padrão quando não há URLs configuradas no painel.

## Confirmado funcionando
- Workflow GitHub Actions [36314891089](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36314891089) terminou com sucesso, inclusive a etapa `Deploy servidor-nexus to Cloudflare` para o commit citado.
- `GET /health` respondeu 200 em 2026-09-27 12:38:31 UTC: Worker, D1, R2 e assets disponíveis; indicador de chave OpenAI compartilhada e Ragnar = configurada (sem teste de chamada).
- `GET /api/portal/diagnostic`: D1 acessível, 3 clientes e 2 usuários de portal. `GET /api/master/diagnostic`: D1 acessível, 1 usuário Master e credenciais Master configuradas. Não são provas de login funcional, conexão Meta, cron ou publicação.
- Há rotas de OAuth Instagram, cron, ledger de posts e publicação implementadas no repositório operacional.

## Quebrado ou insuficiente conforme código
- Fiscal visual aprova flags declaradas pelo Creator; não examina pixels da mídia. Uma imagem ruim pode receber `designer: approved`.
- `posts.js:publishPostNow` e `executor.js:runPublisherSweep` não exigem os dois pareceres `qualityGates` antes da Meta API. `agent-runtime.js:runPublisher` exige, mas confia no parecer superficial do Designer.
- Post `failed` é elegível em ciclos posteriores sem limite de `retryCount` no Publisher; o sweep também seleciona `failed`.
- Declarações de `format: reel/carousel/story` no Creator são publicadas com `publishInstagramImage`; rótulos de formato não comprovam formato entregue.

## Infraestrutura atual
- Fonte operacional: [globalplay27/SERVIDOR-GLOBAL-PLAY](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY), branch `main`, diretório `cloudflare/`.
- Worker `servidor-nexus` em `https://servidor-nexus.diamantehinode2015.workers.dev`; D1 `servidor-nexus`; R2 `servidor-nexus-media`; cron configurado para cada minuto; GitHub Actions CI/deploy.
- `globalplay27/nexus-ai-2.0` é outro repositório: seu README o descreve como construção separada e diz que o Nexus atual não seria alterado até migração. Não confundir com runtime ativo.
- O repositório operacional ainda contém artefatos legados como `server.js`, `render.yaml` e `services/youtube-downloader`. Sua presença não comprova execução. Não reativar Railway.

## Contas integradas
- Código e migração semeiam `ragnar-one` / `@ragnarplay1` e `globalplay-streaming` / `@globalplay_streaming`. D1 reporta 3 clientes, mas seus IDs e status atuais não foram lidos. Tokens, escopos, validade, identidade Meta e publicação de cada conta permanecem não confirmados.
- Para Ragnar, `instagram-credentials.js` prefere secret do Worker e usa ID IG fixado no código; para Global Play prefere secrets. OAuth em D1 é fallback. Essa prioridade deve ser comparada com as conexões reais.

## Último teste e resultado confirmado
- 2026-09-27 13:10 UTC: [auditoria de leitura D1](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36321480825) falhou antes de retornar qualquer linha; resposta estruturada da Cloudflare com código `7403`. O CI/deploy do mesmo commit passou. Código 7403 aponta para conta inválida ou não autorizada para esse serviço; o token de deploy não comprova permissão de leitura D1.
- O health e os diagnósticos públicos continuam provando Worker/D1 acessíveis; a leitura temporária do Worker confirmou a fila e uma publicação real posterior confirmou o caminho até a Meta para Global Play. Para Ragnar, a ausência de mídia publicável foi confirmada, mas a próxima publicação válida ainda precisa ser observada.
- Uma rota temporária e sanitizada do próprio Worker permitiu ler o estado operacional sem tokens, legendas ou URLs; ela foi removida após a investigação.

## Próximo passo exato
Implantar a autorrecuperação do Creator e observar se os posts incompletos do Ragnar recebem as novas mídias e atravessam Copy Chief → Designer → Publisher. Depois obter leitura autorizada dos registros D1 para correlacionar jobs, fiscais, publicações e métricas das duas contas.

## Retomada — 2026-09-27 20h UTC
Retomada em 27/09/2026: main 45de28b; CI/deploy 36338210500 concluído com sucesso. Health atual responde ok/D1/R2. Correção preparada: inspeção real da imagem para Global Play, bloqueio uniforme nos três publicadores, cache por URL e até três tentativas. Sem chamada real de visão nem consulta autenticada ao ledger nesta sessão; execução em produção ainda não comprovada.

## Implantação observada — 2026-09-27 23:12 BRT
- PR #25 integrado em `main` (merge `252d5bb93bcb4ecff8442aa4b5908be113a77568`). Workflow 36368885402 aprovou testes, bundle, deploy Cloudflare e verificação pública de autonomia.
- `/api/autonomy-health` após deploy: cron saudável, `leadHunterRuns:2` naquele tick; Global Play e Ragnar com `leadCapture.autoEnabled:true`, última varredura `success`, `lastAnalyzed:0`, `lastNew:0`, `totalLeads:0`. Portanto a coleta opera, mas não encontrou comentários utilizáveis; não há lead captado. A causa da ausência de interações exige métricas de alcance e conversão antes de atribuição.
- O teste demonstra coleta de comentários, não leitura de DMs, respostas automáticas nem geração de nova mídia. Próximo passo: analisar alcance, comentários e criativos por publicação e habilitar um funil de resposta aos contatos recebidos com rastreio de conversão.

## 2026-10-02 — painel do cliente / área de vídeos
- O `main` recebeu as correções de estabilidade do portal em PRs #72–#74: `/portal`, `/client-lite.js` e `/client-lite.css` passam pelo Worker; o shell do cliente recebe `cache-control: no-store`; a aba `Vídeos` continua presente no HTML e possui teste de regressão.
- O limite local de upload deixou de ser 25 MB. Vídeos são aceitos até 90 MB e enviados ao R2 com `file.stream()`, reservando margem dentro do limite total de 100 MB da requisição Cloudflare Free para capa e campos multipart.
- O fluxo já existente de vídeo permanece: upload → `video_jobs` → geração pelo workflow FFmpeg → MP4 → download pelo cliente. O template do workflow já desenha smartphone, título, metadados e sinopse; ele não foi reescrito nesta correção.
- GitHub Actions comprovou sintaxe, testes e bundle. Deploys dos commits `e824ac47`, `ede028ed` e `3f934cf1` concluíram a etapa Cloudflare com sucesso. As duas últimas verificações pós-deploy ficaram vermelhas por problemas no verificador; o último deles foi identificado como `pipefail` + `grep -q`, corrigido em seguida. A validação autenticada upload → render → download ainda precisa ser feita no painel pelo proprietário.

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

Pedido de 04/10: priorizar YouTube → MP4 no PC → upload existente → geração; geração direta fica para depois. Main inicial f2f184c, CI/deploy 37216437278 aprovado. Helper local e frontend preparados; download real pelo botão local WlpK6_BDNgE salvo no PC e enviado no portal autenticado, job video_0b304a947f584b37900e0ecc em generating/38%. Resultado remoto e implantação deste ajuste ainda pendentes.


## 2026-10-08 — Falha de download YouTube no GitHub e recuperação via PC
- Evidência de produção: run 37856611085, job 113582203315, NEXUS YouTube Ingest #21, iniciou 22:57 UTC e falhou na etapa "Download compatible video source". Log do yt-dlp: `Sign in to confirm you're not a bot`. Upload ao R2 e render não executados; mensagem `youtube_authentication_required` exibida corretamente no painel.
- Branch `fix/youtube-local-retry-after-auth-20261008`: criada recuperação para o mesmo job em falha via novo ticket local de uso único (45 min) e botão "Gerar pelo meu PC". Mantém título, sinopse, pôster, elenco e configurações do vídeo; não reutiliza token de ingestão anterior.
- Pedidos `server_generate` sem fonte oficial direta não devem mais abrir trabalhos destinados a falhar na autenticação do YouTube. Fonte direta do catálogo segue permitida.
- Se o auxiliar PC recusar o retry, registrar falha real, sem redisparar o importador bloqueado. Testes automatizados foram adicionados, mas execução, CI, deploy e render ponta a ponta ainda NÃO VALIDADOS neste registro. Não houve alteração de regras Instagram, credenciais nem cookies.
- Situação após o diagnóstico: bloqueio do YouTube no GitHub é comprovado. A correção foi preparada em branch, sem resultado final de produção comprovado.


## 2026-10-08 — recuperação do pôster no retry do vídeo
- Pedido: corrigir erro `video_official_poster_required` no painel cliente para Homem-Aranha: Um Novo Dia; usuário autorizou avançar automaticamente e acionou os agentes Nexus.
- Defeito reproduzido localmente: job com título exato salvo e sem selectedYoutubeTitle usava busca genérica antiga, impedindo o reconhecimento Sony no retry. Resolver, portal e dispatcher agora usam identidade exata; busca genérica e trailer conflitante continuam bloqueados.
- MP4 original preservado; gate de imagem oficial mantido. Mensagem UI deixa de sugerir seleção que o botão retry não consome.
- Evidência: 206/206 testes Worker aprovados, quatro testes funcionais novos com handler/session/SQLite e R2 emulado; bundle Wrangler aprovado. Sony/GitHub simulados nos testes.
- CI anterior 37858499363 e health produção aprovados. Captura não correlacionada ao registro D1; pôster remoto/MP4 final do job real ainda não comprovados. Alteração local aguardando CI/implantação.
- Próximo passo: publicar alteração no GitHub, confirmar CI/deploy e repetir geração do job original; só declarar solução funcional após render/download comprovados.


## 2026-10-09 — referências de imagens para carrosséis e Reels (bloqueado pelos arquivos)
- Pedido: continuar implantação das imagens geradas como referência de postagens Instagram. Usuário informou que estão no chat e pediu localizar as duas últimas imagens em Downloads.
- Busca executada no ambiente cloud: `/home/agent/downloads` e `/workspace/shared/downloads` vazios; nenhuma referência correspondente nos arquivos de imagem do workspace. Pasta Downloads do computador pessoal não está montada; imagens do chat anterior não disponíveis neste contexto.
- Diagnóstico de código: `media-generation.js` envia somente `input_text`; notas da biblioteca e URLs de campanha entram como texto no Creator. Carrosséis geram cards sem imagens de referência; Reels usam `payload.imageUrl` como fonte. Nenhuma integração nova implementada.
- Main remoto confirmado via conector GitHub: `f1bd4d3daf04733656611657c43b0b48ca8026db`, igual ao checkout. Autonomy run 37948406103 reportou success, sem comprovar publicação ou aplicação das referências.
- Sem alteração de runtime, deploy, geração paga ou publicação Meta nesta sessão. Próximo passo: receber as duas imagens exatas por anexo ou disponibilização no ambiente; identificar cliente/uso, integrar referência visual e validar geração/carrossel/Reel antes de declarar implantação.


## 2026-10-09 — referências Instagram e teste único autorizado
- Integração local: direção visual das duas referências enviadas nesta conversa aplicada ao Global Play. Arquivos binários dos anexos não disponíveis no cloud; não afirmar uso de pixels exatos. Quatro cards independentes, 1080x1350, cinema/catálogo/infantil/futebol; Reel1080x1920 com faixa inferior e zoom10s. Deploy e postagem pendentes.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.
