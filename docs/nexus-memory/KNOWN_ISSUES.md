# Problemas conhecidos

## 2026-10-21 — Alertas falsos do monitoramento (correção em PR, branch fix/monitor-flowarts)
- Overnight Regression falha desde 20/10 e o Sentinel abre "agent_cycle" para Global Play e Ragnar (#331, #333, #334, #335): ambos procuram clientes arquivados que não aparecem mais em `/api/autonomy-health`. O PR passa a vigiar a `primeiro-teste`.
- Ainda aberto: `/api/autonomy-health` tem `ok=false` enquanto Creator, Designer e Format Builder estiverem pausados (agentes "stale"), o que gera #332 todo dia. `/api/instagram-publishing-health` só valida as contas arquivadas; incluir a Flow Arts exige mudança no Worker.

## 2026-10-18 — Reels da Flow Arts barrados no fiscal visual (corrigido em PR)
- Reel animado/pronto ficava em "Aprovado · será publicado" sem sair (quality_gate_pending por visualReview incompleto). Correção no PR de 18/10 ~17h30; confirmar em produção depois do deploy (status published e link no Instagram).

## 2026-10-12 — CI vermelho antes desta mudança
- `ci.yml` falha no passo "Test editor overlay export pipeline" desde pelo menos 6cdf87e/53ef006 (main). Os passos seguintes (bundle Wrangler, workspace) ficam pulados no CI. O deploy segue pelo `deploy-nexus-cloudflare.yml`. Os dois scripts Python do passo passam localmente; o log do GitHub não pôde ser baixado nesta sessão (403 no blob). Investigar os testes Node `.cjs` do mesmo passo.

## 2026-10-11 — CI falha no passo de vídeo
- "NEXUS CI" falha em "Test editor overlay export pipeline" (scripts de overlay de vídeo) desde pelo menos e5999bc, antes do calendário. Recurso de vídeo foi retirado do painel; decidir se remove o passo ou conserta. Deploy da Cloudflare não depende dele (deploy de 301c2d5 ok, calendário no ar e conferido às 14h20).

## 2026-10-11 — auto-responder não via comentários (Flow Arts) — RESOLVIDO às 21h30 (app novo publicado "Flow Arts Nexus")
- Prova em produção (cron 17:00 UTC, commit 9721a60): o Instagram informa `comments_count` = 2 nos posts 17890778682616932 e 18097278191413005, mas `GET /{media}/comments` devolve 0 itens, sem erro.
- Verificado no app Meta NEXUS IA CENTRAL (2077454426196873, empresa "Rodrigo Carvalho", modo desenvolvimento): testadores do Instagram flowarts2026, globalplay_streaming e ragnarplay1; o convite da globalplay_streaming está aceito desde 29/09 (conferido pelo Rodrigo em instagram.com/accounts/manage_access). O comentário de teste foi feito pela globalplay_streaming.
- Permissões do caso de uso Instagram: business_basic, content_publish, manage_comments e manage_messages "Pronto para teste"; `instagram_business_manage_insights` NÃO está adicionada ao caso de uso.
- Hipóteses: (1) token da Flow Arts emitido sem o escopo de comentários → reconectar o Instagram da Flow Arts; (2) filtro do modo desenvolvimento → App Review/Acesso avançado. Ainda sem confirmação.
- 11/10 18h15: conta @flowarts2026 trocada de Criador para Comercial (Rodrigo) e novo comentário QUERO pela globalplay_streaming. Run 23:30 UTC: ainda count 0 em todos os posts, e igCount não subiu (2, 0, 2, 0) — o comentário novo nem entrou na contagem da Meta. Hipótese conta Criador descartada/inconclusiva. Caminho: verificação da empresa + App Review.
- 11/10 20h40: causa real confirmada no app Meta: "Seu app deve estar com o status de publicado para receber webhooks"; URL de callback vazia. O auto-responder antigo (Global Play/Ragnar) usava webhook de outro servidor/app (Global zap / AGENTE CLAIRE, não estão na conta de desenvolvedor atual — só NEXUS IA CENTRAL e Agente Atlas, ambos em desenvolvimento). Receptor criado no NEXUS (8d7c24f, /api/meta/instagram/webhook, verify token padrão "nexus-flowarts-instagram", assinatura com a chave do app IG) e conferido no ar. Botão "Publicar" do app está DESATIVADO até a verificação da empresa ficar completa (status "Incompleto").
- Carrossel "Tráfego pago" publicado (media 17952017187292803 aparece no run de 23:30 UTC).
- Painel do cliente (portal) mostrou "Conecte o Instagram" e 0 posts publicados, embora o Worker leia a conta normalmente. Investigar.

## Abertos em 2026-10-10
- Painel Master: card de status do Instagram em `public/index.html`/`app.js` mostra só Global Play e Ragnar; Flow Arts não aparece na tela (a API já lista todos).
- Painel: nome/nicho do cliente "PRIMEIRO TESTE" não pode ser editado pela interface.
- Painel: "Uso por cliente" mostra percentuais configurados, não consumo real; contagem de clientes na visão geral diverge do total.
- Workflows agendados (AutoFix a cada 30 min, Core Autonomy a cada 15 min) rodam no repositório novo; "Nexus read-only production audit" e "NEXUS Overnight Regression" falharam na primeira execução.


## 2026-09-28 — três mídias padrão Ragnar inválidas
- `PIL.Image.verify()` falhou nos três PNGs `nordic-cinema-01..03.png` com checksum IDAT inválido. A revisão OpenAI retornou HTTP 400 `invalid_value`; o Publisher não vê candidatos. A substituição por mídia válida do proprietário está preparada, mas post real ainda pendente.
- O novo pool possui só uma mídia inédita confirmada. Depois da primeira publicação, será necessária uma fonte contínua de outras imagens originais; não repetir o mesmo criativo nem liberar revisão.

## 2026-09-28 — resposta 400 na revisão Ragnar
- Reduzido o consumo de requisições externas; status OpenAI mudou de `openai_transport_error` para HTTP 400 `invalid_value` às 16:17:59 UTC. Imagem pública Ragnar respondeu HTTP 200 / image/png a HEAD. O campo rejeitado não é exposto pelo diagnóstico atual; correção preparada para expor apenas parâmetro sanitizado.

## 2026-09-28 — limite de chamadas externas do Worker gratuito
- A revisão visual do Ragnar passou a registrar `openai_transport_error` após o PR #33. O ciclo fazia até 250 consultas de insights para Radar e Auditor juntos, além de outras chamadas; o executor podia executar três jobs na mesma invocação, acima do limite externo de 50 do Worker gratuito. Redução preparada, resultado real ainda pendente.
- Mesmo se a revisão Ragnar passar, Global Play não possui mídia nova válida e não publica até suprir essa dependência.

## 2026-09-28 13h10 — revisão Ragnar esgotada
- PR #31 foi implantado, mas `openai.status: unknown` persistia; imagens de Ragnar continuaram sem parecer aprovado. A lógica anterior vedava diagnóstico adicional ao chegar a três tentativas. Correção limitada a uma nova tentativa por mídia antiga com falha genérica, com `diagnosticRetry` persistido. Resultado real pendente.

## 2026-09-28 — dois bloqueios de publicação
- Health ao vivo às ~12h45 BRT: cron saudável, Publisher das duas contas com última execução ~09h44 BRT, jobs de ciclo recuperados como obsoletos repetidamente. Consultas Graph do Radar/Auditor sem timeout identificadas no código; timeout de 8 segundos preparado, efeito em produção ainda pendente.
- Global Play: posts aprovados sem `imageUrl` e Designer pendente (`designer_replacement_queued`); não há pool padrão Global Play. Correção de timeout não cria mídia.
- Ragnar: imagens presentes, mas parte dos posts tem `visual_review_unavailable` e parte tem Designer aprovado sem parecer v2 correspondente. O publicador exige parecer visual efetivo; investigar razão sanitizada da OpenAI após o PR #31. Não liberar o gate à força.

## Captação de leads ainda sem comprovação ponta a ponta
O health anterior exibia Odin `success`, mas não indicava coleta automática, qualidade do acesso Meta ou leads. A mudança local habilita coleta horária padrão e expõe números agregados; falta observar `lastRunStatus`, `lastAnalyzed`, `lastNew` e `totalLeads` em produção. O coletor contempla comentários recentes da própria conta, não DMs; sem comentários de intenção não pode gerar leads genuínos. Configuração explicitamente desligada no D1 continuará desligada.

## P0 — Ragnar não publica consistentemente
- Causa operacional de fila confirmada e corrigida em 2026-09-27: captação automática inundava a fila e jobs presos impediam o Publisher de avançar.
- O post Ragnar das 09:00 de 2026-09-27 também não era publicável: mídia ausente e Designer rejeitado. O sistema agiu corretamente ao não enviá-lo.
- Hipóteses a verificar com D1/logs: cliente offline, jobs falhos, mídia única indisponível, gates pendentes, secret Meta e IG ID divergentes, token/escopos, erro no container ou publicação, cron não executado.
- Evidência de código: `instagram-credentials.js` prioriza secret Ragnar com ID IG fixo; `agent-runtime.js` bloqueia mídia ausente/repetida; `scheduled_jobs` registra erro. Nenhuma dessas hipóteses equivale ao erro efetivo.
- Nova causa de código corrigida localmente: o Creator ignorava slots já existentes sem mídia; agora reaproveita mídia nova do pool e reabre o fluxo de fiscalização. Permanece aberto até deploy e evidência real.

## P0 — Controle visual deixa passar arte ruim
- Causa de código identificada: `runCreator` grava flags `visualPolicy` sempre verdadeiras; `runDesigner` confere essas flags e presença de URL, não o conteúdo da imagem. `runPublisher` aceita `designer: approved`.
- Caminhos adicionais: `publishPostNow` e `runPublisherSweep` não verificam `qualityGates`.
- Falta correlacionar o post específico por ID e origem para dizer por qual caminho ele passou.

## P1 — Retentativas sem teto
- `runPublisher` incrementa `retryCount` após falha mas seleciona `failed` indefinidamente. `runPublisherSweep` faz o mesmo. O job da fila tem teto de 3, porém isso não limita novas tentativas do post nos ciclos futuros.
- Efeito de custo depende de onde ocorre a falha; a geração atual do ciclo é local, mas chamadas Meta e rotas OpenAI existem.
- Correção local preparada: filtros e bloqueios com teto de três tentativas no Publisher principal, sweep e envio manual. Permanece aberto até CI/deploy e evidência de produção.

## P1 — Evidência de fiscais em produção ausente
- Código registra `agent_executions`; não houve leitura autenticada da tabela nesta sessão. Existência de arquivos e `SKILL.md` não prova execução.
- `COPY CHIEF` valida comprimento/CTA; `DESIGNER` valida metadados; `AUDITOR` compara métricas. Não equiparar estes registros a avaliação visual real.

## P2 — Engajamento baixo
- Relato do proprietário; métricas atuais, alcance, salvamentos, impressões e base comparativa não foram lidos. O Radar do código calcula principalmente curtidas e comentários de até 25 mídias; análise causal pendente de dados.

## Bloqueio de investigação
- `dash.cloudflare.com` neste navegador mostrou verificação humana persistente em 2026-09-27. Conector Cloudflare/D1 não está disponível nesta sessão. Diagnósticos públicos não expõem logs/linhas de posts.
- Contornado apenas durante o incidente por uma rota temporária sanitizada no Worker; rota removida após colher a evidência.

## P0 — Leitura de produção D1 indisponível pelo CI
- Workflow [36321480825](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36321480825): cada `wrangler d1 execute --remote --json` falhou com código Cloudflare `7403` antes de devolver linhas. CI/deploy passou no mesmo commit. Hipótese principal: token permite Worker deploy, mas não D1 direto, ou conta associada ao token não autoriza D1. Não foi feita alteração de permissão.
- O workflow `nexus-audit.yml` e script executam apenas SELECT, omitem legendas/tokens/URLs, e agora falham corretamente quando as consultas falham. Seu último status vermelho representa ausência de acesso diagnóstico, não um teste do cron/Instagram.

## Retomada — 2026-09-27 20h UTC
Pendências desta retomada: fonte contínua de mídia nova continua ausente; Global Play usa URLs configuradas/rascunhos existentes. Visão real ainda precisa de evidência de execução e saldo disponível. Cache identifica URL, não hash dos pixels. Métricas reais e replicação ao Ragnar não concluídas. Sem acesso autenticado ao D1 nesta sessão.

## 2026-10-02 — painel de vídeos
- Causa de código para uploads locais falharem: frontend e backend impunham 25 MB. Corrigido para 90 MB com streaming R2; ainda falta prova ponta a ponta com um arquivo real autenticado.
- Causa provável para a aba parecer alternar/sumir: rotas do portal e seus assets podiam ser servidas diretamente como Static Assets, fora do Worker. Agora passam por `run_worker_first` e recebem `no-store`; confirmar no navegador do cliente após novo login/reload.
- A checagem externa `Workers Builds: servidor-nexus` já aparecia vermelha no `main` antes destas mudanças. A implantação oficial de `.github/workflows/ci.yml` consegue executar `wrangler deploy`; investigar o build externo separadamente para não confundi-lo com o deploy canônico.
- A checagem `Verify Nexus production autonomy` também já falhava depois de deploys bem-sucedidos e é independente do workspace de vídeos.

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
## 2026-10-04 — YouTube primeiro no PC

Botão anterior Baixar do YouTube também tentava download no servidor e falhou no teste do usuário. Download PC funciona nesta rede, mas outros vídeos podem ser bloqueados. Auxiliar exige Python/Node/FFmpeg existentes e inicialização neste PC. Metadados de áudio pt do YouTube podem coexistir com tag eng no contêiner; seleção explícita pt é exigida, tag final é normalizada para por, sem afirmar transcrição/audição validada. Arquivos ficam em videos ao lado do auxiliar; link Salvar uma cópia usa download do navegador.


## 2026-10-08 — Falha de download YouTube no GitHub e recuperação via PC
- Evidência de produção: run 37856611085, job 113582203315, NEXUS YouTube Ingest #21, iniciou 22:57 UTC e falhou na etapa "Download compatible video source". Log do yt-dlp: `Sign in to confirm you're not a bot`. Upload ao R2 e render não executados; mensagem `youtube_authentication_required` exibida corretamente no painel.
- Branch `fix/youtube-local-retry-after-auth-20261008`: criada recuperação para o mesmo job em falha via novo ticket local de uso único (45 min) e botão "Gerar pelo meu PC". Mantém título, sinopse, pôster, elenco e configurações do vídeo; não reutiliza token de ingestão anterior.
- Pedidos `server_generate` sem fonte oficial direta não devem mais abrir trabalhos destinados a falhar na autenticação do YouTube. Fonte direta do catálogo segue permitida.
- Se o auxiliar PC recusar o retry, registrar falha real, sem redisparar o importador bloqueado. Testes automatizados foram adicionados, mas execução, CI, deploy e render ponta a ponta ainda NÃO VALIDADOS neste registro. Não houve alteração de regras Instagram, credenciais nem cookies.
- A exigência anti-bot do YouTube no ambiente GitHub permanece externa ao Nexus; download local de fontes autorizadas ainda pode falhar conforme vídeo, rede e permissões. A melhoria do fluxo de recuperação não remove o bloqueio da plataforma.

## 2026-10-08 — Download indevidamente bloqueado antes do dispatch
- A regressão do PR #164 rejeitou preventivamente `server_generate`/ `download` no Worker com `local_helper_required`, mesmo sem testar o link específico. Necessário permitir tentativa no servidor com erro verdadeiro de importação e PC apenas opcional. Correção proposta na branch `fix/youtube-server-first-optional-pc-20261008`; GitHub/Cloudflare e MP4 em produção pendentes.


## 2026-10-09 — referências Instagram e teste único autorizado
- Arquivos binários dos anexos do chat não montados; implementação registra text-direction até biblioteca R2 com imagens. Composição IMAGES.text anterior não aplicava marca confiável; Global Play usa PNG pré-renderizado. R2 get/put de teste não é lock atômico: evitar execuções concorrentes. Falha após Meta requer conferir mediaId antes de qualquer novo testId. Produção não validada.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.

- Segunda revisão automática identificou notas privadas R2 preexistentes incluídas no prompt do Creator. Retirada leitura/inclusão dessas notas e instruções privadas do workspace no nextMedia desta alteração. Prompt de mídia recebe direção criativa do post e direção visual do chat. Nenhuma biblioteca de referências é lida para gerar imagens.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.

## 2026-10-12 — Mensagens antigas da Global Play na conversa de teste
- Rodrigo viu "REVENDA", "Acessar site" (globalplay.fun) e "Vim pelo Instagram da Global Play" no direct.
- Diagnóstico: a conversa é entre flowarts2026 e globalplay_streaming. As mensagens de revenda e os botões foram enviados pela conta globalplay_streaming (robô antigo da Global Play, desde 23/09). Não existem no código do Nexus (nem no histórico do git).
- O DM do Nexus (00:30 UTC de 12/10) saiu certo: texto Flow Arts + wa.me com "Comentei no Instagram da Flow Arts".
- A automação do Meta Business Suite da Global Play ("Perguntas e respostas") está desativada; o robô antigo vem de fora do Nexus.
- Próximo passo: testar com uma conta pessoal que não seja a Global Play. Opcional: na conta globalplay_streaming, remover apps antigos em Configurações › Apps e sites.

## 2026-10-12 — Webhook da Meta não chega (lastWebhook sempre null)
- Documentação da Meta: webhooks de comments/messages exigem acesso avançado + verificação da empresa + app Live. O app "Flow Arts Nexus" está Live mas sem acesso avançado.
- Contorno: leitura do direct a cada 1 min (gift-dm.js) e dos comentários a cada 5 min. Quando o CNPJ estiver verificado, pedir acesso avançado e o aviso fica instantâneo.

## 2026-10-12 — Auditoria ponta a ponta (alcance zero, 2 seguidores)
Fatos verificados (perfil público, /api/master/posts, /api/master/agent-core):
- @flowarts2026: 4 posts, 2 seguidores (contas de teste do Rodrigo). Rótulo "Perfil gerado por IA" visível; campo Nome = "Marina"; bio ainda diz "Rio de Janeiro".
- Cérebro de crescimento (ai-growth.js) falhava em TODO ciclo: "Unterminated string in JSON" (max_output_tokens 1100 cortava a resposta) → creativeBatch vazio → strategySource "fallback-rules". Também retentava a cada ciclo, gastando cota.
- Posts da campanha Flow Arts NUNCA usavam texto da IA (`caption = campaignItem ? "" : ...`) → corpo fixo "A Flow Arts ajuda com isso: ..." sem dica real.
- Imagens da marca saíam sem texto de propósito (clean_brand_image) e o "título" passado era a 1ª frase do briefing em inglês ("Portrait 4:5 single image..."). Tamanho 1024×1536 (2:3), fora do 4:5 do feed. Cena muitas vezes sem relação com o tema.
- Posts com duas chamadas ("Responda nos comentários." + "Comente QUERO").
- Meta de crescimento 1.000.000 seguidores em 30 dias (33.334/dia) para todos os clientes.
- Reels: despacho de render no GitHub falha com "Sorry. Your account was suspended" (token GITHUB_ACTIONS_TOKEN de conta suspensa; repositório padrão do vídeo ainda globalplay27/SERVIDOR-GLOBAL-PLAY). Todo Reel vira imagem estática. rendererAvailable=false.
- Cota de texto da OpenAI: 30.000 tokens/dia (NEXUS_OPENAI_DAILY_TOKEN_LIMIT); posts já expiraram por openai_daily_budget_reached.
