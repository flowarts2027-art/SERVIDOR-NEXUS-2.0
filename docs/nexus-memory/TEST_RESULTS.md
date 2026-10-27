# Testes e evidências

## 2026-10-27 20h52 BRT — Redesign visual do painel do cliente
- `node --check public/client-lite.js`: aprovado.
- Parse básico de `public/portal.html` e `git diff --check`: aprovados.
- `npm run check`: Wrangler dry-run aprovado; 206 assets lidos. Permanecem somente os avisos preexistentes de chaves duplicadas em `master.js`, `portal.js` e `posts.js`.
- `node --test test/*.test.mjs`: **600/600 pass**, 0 falhas, 0 cancelados, 0 skipped.
- Não houve navegador autenticado, deploy, push ou publicação real nesta sessão.

## 2026-10-22 18:34 BRT — Integração artes 2× 2
- Worker:561/561, incluindo UI Master/CRM; repetidos após correção CSS.
- QA controlado:21 downloads pelo CRM com nomes e bytes corretos, sem envio; Master 21/21 e upload único.
- Bundle Wrangler local e deploy final 39858182963 aprovados.
- Navegador real em produção:21 páginas do domínio público; cada imagem natural 1080× 1350 carregada. Cafeteria após 900fec9:428× 535 renderizados.
- Não validado: sessão Master autenticada. Conferência HTTP GitHub anterior 403; não há prova de SHA-256 remoto pelo script.

## 2026-10-20 — CRM: escolha manual Instagram ou WhatsApp na mesma entrega
- Pedido confirmado: escolher um dos dois canais, com texto e modelo do nicho; nada é enviado automaticamente.
- Implementado: seletor Instagram | WhatsApp, preferência local no navegador (Instagram como padrão); WhatsApp abre wa.me com a mensagem por nome/nicho preenchida e respeita revisão; Instagram abre Direct e copia texto. Edição preservada ao alternar canal, sem alterar opção antiga de envio Flow. Modelo baixado mantém nicho/nome no arquivo; anexar continua manual. Asset crm.js v10.
- Evidências: 541/541 testes Worker; 10 testes de UI cobrem canais, preferência, ausência de contato, revisão e nenhuma chamada de envio automático. Chromium verificou links de ambos os canais, texto revisado, clipboard e preferência após reload com destinos externos simulados. Bundle Wrangler aprovado; diff sem erros. Não houve envio ou entrega real.
- Estado: incluído na mesma branch fix/crm-direct-mensagem para revisão/publicação manual; sem merge/deploy nesta tarefa. A vitrine completa de 21 artes segue não comprovada; existem sete nichos embarcados. Próximo passo: publicar a branch e conferir canal, destinatário, texto e anexo do modelo real no painel.

## 2026-10-20 — CRM: abrir Direct e copiar mensagem por nicho

- Complemento do pedido: mensagem + modelo do mesmo nicho por empresa. Botão de download identifica nicho e tipo; arquivos incluem nicho e nome do contato para evitar trocas. Há imagens embarcadas de sete nichos (bar, dentista, clínica, farmácia, mercado, oficina, hotel); coleção completa de 21 não disponível nesta sessão, vitrine remota não inspecionada. Anexo no Direct permanece manual.
- Pedido: abrir a conversa da empresa com abordagem adequada ao nicho. Limite explicado: link do Instagram não garante preenchimento da DM; usuário ainda cola e envia.
- Implementado: botão “Copiar mensagem e abrir Direct” usa ig.me/m/perfil, copia mensagem atual ou revisada e mantém navegação nativa. Texto editável por contato, instrução para colar e alternativa manual se clipboard falhar. Sem envio automático ou texto em query string. Asset crm.js v9.
- Backend: instagramMessage com nome/negócio e conteúdo dos 21 nichos, recalculado após edição; exemplo somente se cadastrado; mensagem anterior preservada para fluxos existentes.
- Validação: 536/536 testes Worker; bundle Wrangler aprovado com avisos preexistentes. Chromium confirmou clipboard com texto editado + abertura do destino Direct, usando rotas externas simuladas (sem contato real). Instagram autenticado, roteamento real e produção NÃO VALIDADOS.
- Estado: branch fix/crm-direct-mensagem preparada para revisão/publicação manual; sem merge ou deploy nesta tarefa. Próximo passo: publicar e conferir conta destinatária, colagem e mensagem de nicho no Instagram.

## 2026-10-20 — CRM: contato manual no Instagram (validado localmente, sem deploy)
- Pedido confirmado: botão de contato deve abrir o Instagram da empresa.
- Implementado: Abrir Instagram + Copiar mensagem; exemplos baixados para anexo manual; sem perfil, aviso e cadastro em Detalhes; início encaminha ao CRM sem abrir WhatsApp. Versão do asset crm.js atualizada.
- Backend persiste perfil validado, preserva nas importações e recupera marcador legado nas notas; limpar o perfil impede reaparecimento. Nenhuma mensagem enviada.
- Evidências: suíte Worker 531/531; revalidação CRM/backend/daily/UI 30/30; bundle Wrangler aprovado com avisos preexistentes de chaves duplicadas; diff sem erros. UI exercitada por DOM simulado, navegador real e produção não validados.
- Próximo passo: revisar e publicar esta alteração; conferir em produção que o perfil correto abre e ausência de perfil mostra aviso. Sem commit, push ou deploy nesta tarefa.

## 2026-10-11 — preparação local no PC Windows (C:\Users\playprime\nexus)
- Repositório clonado do GitHub. `npm install` em `cloudflare/` (34 pacotes; scripts de instalação de esbuild/workerd não aprovados pelo npm, sem efeito no bundle).
- `node --test test/*.test.mjs`: 247/247 aprovados (Node 24.21).
- `wrangler deploy --dry-run`: bundle gerado (769 KiB). Nada foi publicado; produção não consultada.

## 2026-10-10
- `node --test cloudflare/test/*.test.mjs`: 229/229 aprovados (ambiente cloud; `wrangler` não instalado localmente, bundle validado pelo GitHub Actions no deploy).


## 2026-10-10 — verificação após limpeza de legado (local)
- Antes e depois da remoção: `wrangler deploy --dry-run` saiu com 0 nos dois casos.
- 67 arquivos de teste de `cloudflare/test/` executados um a um com `node --test`: 0 falhas antes e depois.
- `node --check public/client-lite.js` e `py_compile scripts/build_promo_card.py` aprovados; 13 workflows YAML parseiam sem erro.
- Varredura de segredos no código: nenhuma chave real (único alerta foi um PNG em base64).
- Não executado: CI remoto, deploy, produção. Isto prova que o bundle e os testes não dependiam dos arquivos removidos, não que a produção esteja saudável.

## 2026-09-28 — leitura interna da arte Ragnar
- Os sete testes de revisão passaram com ASSETS simulado; chamada externa dentro do Worker retornou `pinned_asset_unavailable` em produção, por isso esta mudança ainda exige validação após deploy.

## 2026-09-28 — arte Ragnar inspecionada
- JPEG extraído de `main`, 900×1125, SHA-256 `93ec7bbe06be6783beb197e1bcfd838ef66064b4fe3f66d9a37a0b7bf7ae68e2`; inspecionado visualmente. Sete testes `visual-review.test.mjs` passaram, incluindo aprovação com bytes idênticos e bloqueio após troca dos bytes mesmo quando existia aprovação anterior. Ainda sem evidência de publicação real.

## 2026-09-28 ~13h BRT — timeout Graph
- PR #32: 15/15 testes locais, `node --check` e `git diff --check` aprovados; CI do PR 36447459567 aprovado. Merge `922c65b`; deploy workflow 36447607442 concluído com sucesso.
- Após deploy, primeira leitura pública ainda mostrou última execução Publisher ~09h44 BRT e jobs em `running`/`stale_running_job_recovered`; consulta posterior ao endpoint expirou em 15 segundos. Não há publicação nova confirmada. A correção do timeout não está validada como solução suficiente.
- PR #31 de diagnóstico de transporte OpenAI permanece separado e aberto nesta observação. Nenhuma postagem de teste ou chamada Meta de publicação foi enviada nesta sessão.

## 2026-09-27 23h BRT — alteração de captação
- Antes: resposta pública de `/api/autonomy-health` mostrou cron saudável, 13 agentes por conta e `leadHunterRuns:0` no tick observado. Não havia resumo público das coletas.
- Local: `node --test cloudflare/test/*.test.mjs` passou 15/15 após atualizar testes antigos para o fiscal visual v2 e o estado atual do Suporte; `node --check` passou em todos os módulos; Wrangler dry-run gerou bundle. Nenhum comentário sintético, publicação ou mensagem Meta foi enviado.
- Pendente: CI/deploy da mudança e verificação da primeira varredura Meta real de cada conta.

| Horário (UTC, 2026-09-27) | Componente | Resultado | Evidência / limite |
|---|---|---|---|
| ~17:48 | Autorrecuperação do Creator | Validação local aprovada | Post diário existente sem mídia passa a receber mídia nova do pool, volta a `ready` e exige nova fiscalização. Sintaxe e bundle Wrangler aprovados; produção ainda não observada. |
| ~17:35 | Política uniforme de publicação | Validação local aprovada | Todos os arquivos `cloudflare/src/*.js` passaram em `node --check`; `npm run check` gerou o bundle Wrangler. Ainda não prova deploy ou execução em produção. |
| ~12:37 | GitHub | Repositório operacional identificado | `SERVIDOR-GLOBAL-PLAY/main@292649157`; estrutura `cloudflare/`. O README do outro `nexus-ai-2.0` o descreve como não migrado. |
| 11:11 (conclusão do run) | CI/deploy | Sucesso | [Actions 36314891089](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36314891089), inclusive etapa de deploy. Não comprova funcionamento de cron/Meta. |
| 12:38:31 | `GET /health` | HTTP 200 | `ok:true`, runtime Cloudflare, `d1-ready`, `r2-bound`, assets bound, indicadores de chave OpenAI configurada. |
| ~12:39 | `GET /api/portal/diagnostic` | HTTP 200 | `clients:3`, `portalUsers:2`, D1 acessível. Não identifica quais clientes estão online. |
| ~12:39 | `GET /api/master/diagnostic` | HTTP 200 | `masterUsers:1`, credenciais Master configuradas. Não houve login. |
| ~12:42 | Cloudflare Dashboard | Acesso bloqueado | Página `Executando verificação de segurança` / `Confirme que é humano`, persistiu após uma recarga. Nenhuma tentativa de contornar. |
| ~12:40 | Inspeção estática dos gates | Falha de desenho confirmada | `agent-runtime.js:480-493` seta flags; `extended-agents.js:runDesigner` só confere URL/flags; `posts.js:220-291` e `executor.js:runPublisherSweep` não conferem gates. |
| ~12:40 | Inspeção do limite de publicação | Ausente | `agent-runtime.js:520-615` lê `failed` e incrementa `retryCount` sem teto; `executor.js` também relê `failed`. |
| ~12:40 | Postagem real / Meta | Não executada | Pedido expresso de não publicar na primeira auditoria. Falha do Ragnar ainda não localizada em linha/log real. |
| ~12:45 | Documentação e continuidade | Deploy bem-sucedido | Commit `5951333904b076d04a9ca179745fe3f3e868a1e7`, [Actions 36319976227](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36319976227). Apenas documentos/`AGENTS.md`; cron/Meta não testados. |
| 13:00–13:10 | Leitura D1 via GitHub Actions | Falha | [Execução 36321480825](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36321480825): código Cloudflare `7403` em consultas somente SELECT; nenhuma linha retornou. Deploy do commit passou. Sem teste de publicação. |
| 15:16–15:23 | Diagnóstico sanitizado pelo Worker | Causa confirmada | Cron ativo; jobs `lead-hunter` por minuto, jobs presos em `running`, dezenas em `scheduled`; Publisher ficava atrás do backlog. Nenhum token, legenda ou URL de mídia foi retornado. |
| 15:21:12 | Publicação Global Play | Sucesso real | `agentcore:globalplay-streaming:2026-09-27:1100` passou a `published`; Publisher registrou 1 publicada, 0 falhas. |
| 15:23 | Fila após correção | Recuperada | Heartbeat continuou a cada minuto, sem novos jobs de captação; somente publicadores antigos em conclusão. Post Ragnar vencido continuou bloqueado por mídia ausente/Designer rejeitado. |
| ~15:28 | Pool de mídia Ragnar | Validado localmente | 3 PNGs RGB 941×1672, proporção vertical próxima de 9:16, arquivos distintos por SHA-256; revisão visual confirmou uma cena, TV preenchida e ausência de texto/colagem. |

Próximo teste necessário: consultas de leitura D1 aos últimos jobs, execuções e posts de cada cliente, mascarando URLs privadas/tokens e registrando IDs, horários, erros e gates. Nenhum teste sintético deve enviar conteúdo à Meta.

## Retomada — 2026-09-27 20h UTC
Retomada: seis testes locais de visão passaram (imagem enviada, reprovação de TV/colagem/marca, JSON inválido, cache/invalidação por URL, backoff/teto de tentativas, barreira nos publicadores). Todos os módulos passaram node --check. GET /health retornou ok/D1/R2. Nenhuma chamada real à Meta/OpenAI foi feita pelos testes. Bundle e deploy devem ser registrados após conclusão.

Bundle Wrangler dry-run aprovado nesta retomada. Testes adicionados ao CI antes do deploy.

## Implantação confirmada — revisão visual Global Play
- Commit `cbe562ced29a3e644104ac64fe816190acf58979`, [CI 36347542955](https://github.com/globalplay27/SERVIDOR-GLOBAL-PLAY/actions/runs/36347542955): seis testes, sintaxe, bundle e etapa de deploy concluídos com sucesso.
- Health após deploy: ok, D1 pronto, R2 e assets vinculados.
- Navegador do portal exibe login, sem sessão autenticada. Execução real do Designer e post_ledger ainda não consultados. Nenhuma postagem de teste disparada.

## 2026-10-02 — estabilidade da área Vídeos
- PR #72: testes de JS/Worker/Node passaram. Primeiro dry-run falhou porque `/portal*` tornava `/portal-login` redundante em `run_worker_first`; a regra duplicada foi removida e o run 37020749427 passou.
- Merge `e824ac47`, run 37020915371: migrations, deploy Cloudflare, verificação do workspace de vídeo, Master e recuperação passaram. O job terminou vermelho apenas em `Verify Nexus production autonomy`, problema já existente e fora deste escopo.
- PR #73, run 37021212788: limite seguro de 90 MB passou em sintaxe, testes e bundle. Merge `ede028ed` implantou com sucesso; a checagem imediata do workspace falhou.
- PR #74, run 37021511042: verificador com retentativas passou nos testes de PR. Merge `3f934cf1` implantou; a checagem pós-deploy ainda falhou. Revisão do script encontrou falso negativo determinístico: com `set -o pipefail`, `printf ... | grep -q` pode falhar quando o grep encerra o pipe cedo. A correção troca pipes por here-strings; precisa ser confirmada no próximo run de `main`.
- Nenhuma postagem Instagram foi usada para testar estas mudanças.

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

119/119 testes Node aprovados; 5/5 testes helper aprovados (URL, pt obrigatório, preferir HTTPS, sessão/Origin/CSRF/Host e falha de disco sai de busy). Auditor encontrou erro de formulário sobrescrito por polling e mkdir fora try; ambos corrigidos. Download CLI real WlpK6_BDNgE 136+140 identificado pt: 15.439.509 bytes, H.264/AAC, 1280x720, 125.527075s, decode integral exit0. Botão helper real chegou ready100 e salvou ff87aeba54b0cc1f48c74fde5724e31b/video.mp4. Upload autenticado disparou job video_0b304a947f584b37900e0ecc, observado38%. Callback/resultado remoto ainda pendente.

## 2026-10-07/08 BRT — Nexus AutoFix seguro (PR #117)
- Núcleo `.github/scripts/nexus-autofix.mjs`, política e testes gravados no GitHub em branch isolada. O sistema detecta falhas de Actions na SHA atual da main, aplica apenas uma reexecução delimitada após espera de 20 minutos, consulta saúde do Worker e das conexões e cria issues idempotentes para incidentes persistentes. **Não implementa reparo arbitrário de código**: não altera ou faz merge automático de código, não publica na Meta e não mexe em credenciais.
- Segurança: paths de código privilegiado são proibidos pelo gate; logs passam por mascaramento; timeout, limitação de tentativas e isolamento por SHA. Modo de testes não executa ações externas.
- PR #117: CI run 37716090132 aprovado, incluindo `Validate Nexus AutoFix safety and self-recovery`, testes de Node, render/editor, frontend e bundle Worker. A aprovação do CI não prova a primeira execução agendada com token GitHub nem uma falha recuperada realmente.
- Próxima evidência: após merge, conferir o primeiro workflow `NEXUS AutoFix` em `main`, confirmar o relatório da execução e depois testar o caminho de incidente/reexecução em falha legítima não forçada.

## 2026-10-07 BRT — Painel Cliente: modo editável em construção
- Pedido atual: suspender o modo Vídeo editável no painel e manter apenas um botão visível e desabilitado com o aviso "Em construção". A geração Automática, busca de trailers, upload manual, WhatsApp e download original continuam disponíveis.
- Alterações preparadas em PR #119: `public/portal.html` define o botão `#video-mode-edit` como `disabled`; `public/client-lite.js` impede seleção por código e despacho de edição, remove o atalho "Editar este vídeo" dos jobs; `public/client-lite.css` destaca a indisponibilidade e versões dos assets são atualizadas.
- Evidência QA: CI do PR run 37717175885 **success**. Testes Node de regressão, segurança AutoFix, video smoke, Chromium desktop e mobile (botão inativo e editor oculto), integração HTTP/SQLite/R2 e bundle passaram; os testes de publicação Meta/geração de vídeo em produção não fazem parte desta alteração.
- Próximo passo: merge em `main`, confirmar deploy Cloudflare e realizar leitura do HTML/CSS/JS do portal em produção. O editor continua no código para implementação futura, mas não fica acessível no painel.

## 2026-10-07 BRT — Vídeo automático: corte cinematográfico e modelo Lanternas
- Nova referência visual fornecida pelo proprietário: `lanternas teste 2(1).mp4` (arquivo de 151,5s, 720x1280, 30fps, H.264/AAC); o smartphone mostra pôster e sinopse do título. Vídeo `homem aranha(1).mp4` anterior tinha celular sem pôster e avaliações fictícias assinadas "NEXUS".
- Escopo em branch `feat/cinematic-auto-cut-40s-20261007`: script `scripts/auto_cinematic_cut.py` analisa proxy silencioso de baixa resolução com PySceneDetect 0.7.1, seleciona trechos visuais por atividade, conserva 4s de abertura e 6s de encerramento (se fonte >40s), concatena com FFmpeg, preserva áudio real. Se fonte <=40s, mantém duração original. Seleção é heurística visual e não prova compreensão da narrativa.
- `.github/workflows/video-template-render.yml` somente no `CREATION_MODE != edit` usa a fonte curta de até 40s para o mesmo renderizador promocional 9:16; editor manual continua desabilitado na UI. A etapa de promo continua com cenas de celular/pipoca/elenco/avaliações/relacionados e logo/WhatsApp.
- `scripts/build_promo_card.py` agora bloqueia smartphone sem pôster válido (erro explícito `video_official_poster_required`); opiniões inventadas com assinatura "NEXUS" foram removidas, usando apenas avaliações reais e fatos do catálogo; sem avaliações mostra informação objetiva.
- QA adicionado a `scripts/test_auto_cinematic_cut.py`: plano temporal de 40s, MP4 FFmpeg com H.264/AAC e abertura/final reais, trailers <40s, pôster exigido e revisão de avaliações; CI passa a executar os testes em Linux. Resultados reais pendentes até execução do CI. Sem publicação Instagram ou uso de chaves/cookies de terceiros.
- Critérios ainda pendentes: CI verde, merge, render autenticado R2 -> GitHub -> retorno MP4 para um vídeo >40s com pôster oficial e avaliação humana visual comparando ao modelo; não declarar vídeo novo aprovado somente pelo CI.

## 2026-10-08 — Revisão Lanternas: 60s, tela inteira, busca mais responsiva e cartões pretos
- Referência: `lanternas mais curto.mp4` fornecido pelo proprietário após corte de 40s; opinião: 40s diminuiu demais o trailer, e as imagens em tela inteira são as melhores. Novo pedido: +20s, cartões de avaliações pretos com estrelas amarelas e correção da busca lenta no painel.
- Branch `feat/video-60s-fast-search-gold-reviews-20261008`: corte de 60s como padrão (`scripts/auto_cinematic_cut.py`, workflow); mantém abertura/final e áudio. Proxy de detecção passa de 8fps/320px para 6fps/288px para reduzir sobrecarga da análise; não afirmar aceleração fim-a-fim sem medir produção.
- Vídeo passa a reservar aproximadamente os últimos 18s antes do CTA para trailer em tela cheia, sem o celular e cards. O smartphone mantém pôster oficial, abertura preservada e editor manual continua desabilitado.
- `scripts/build_promo_card.py`: cartões de avaliações pretos com contorno dourado, texto branco, estrelas amarelas somente quando há nota original explícita /5 ou /10; não inventa pontuação ou avaliações.
- Busca: `cloudflare/src/portal.js` elimina repetição sequencial de Wikidata e passa a reutilizar resultados do catálogo, com limite de 5s por consulta; `public/client-lite.js` informa progresso, libera o botão assim que a busca é iniciada, detecta falha, permite pesquisar novamente e ignora resposta desatualizada.
- Testes: ampliar `scripts/test_auto_cinematic_cut.py` para MP4 H264/AAC de 68s reduzido para 60s, abertura/final, estrelas verificadas e fundo preto; `scripts/test_premium_editor_browser.cjs` valida fluxo de busca no Chromium desktop/mobile. Aguardar CI, deploy e novo render autenticado antes de chamar a geração real validada.

## 2026-10-08 — Busca de trailers: feedback visual enquanto os resultados carregam
- Pedido: na busca "homem aranha", a mensagem "Sem vertical oficial..." apareceu abaixo do botão antes que os cartões fossem percebidos pelo cliente; o botão retornou ao estado normal e não houve indicador de que o servidor ainda consultava o YouTube.
- Patch da UI: exibir spinner circular CSS e "Buscando trailers, aguarde…" durante dispatch/poll, incluindo breve retry, com `aria-busy` true; manter campo de texto utilizável e botão "Nova busca" após dispatch; remover spinner somente após renderizar cartões, erro ou esgotamento; mostrar "Resultados encontrados abaixo" ao concluir.
- Scripts: `public/client-lite.js`, `public/client-lite.css`, `public/portal.html`; cache busters JS 78 CSS 44. Testes em `scripts/test_premium_editor_browser.cjs` para desktop/mobile simulam polling assíncrono e verificam estado acessível do spinner antes/depois do resultado.
- Sem mudança em algoritmo YouTube, conta Instagram, duração do vídeo ou editor desabilitado. Validação de produção pendente até CI, merge e deploy.

## 2026-10-08 — Render Homem-Aranha falha por pôster oficial indisponível
- Evidência de produção: tela do cliente em 08/10/2026 03:23 BRT mostra job `homem aranha` com `video_official_poster_required`, mesmo com botão `Baixar original`, `Assistir no YouTube` e `Gerar vídeo agora`. Fonte original pronta; falha específica da capa. Aprovado o fluxo 60s, não reativar editor.
- Causa: `scripts/build_promo_card.py` recusa celular sem pôster (corretamente), mas `.github/workflows/video-template-render.yml` apenas registrava ausência de imagem, não criava substituto da mesma fonte. Catálogo pode não encontrar o pôster de títulos genéricos.
- Correção nesta branch `fix/video-poster-trailer-frame-fallback-20261008`: primeiro tentar baixar o pôster oficial/catálogo. Se faltar, usar `scripts/trailer_frame_poster.py` para extrair quadro visual do vídeo já baixado em R2, evitando cenas pretas, e gerar capa vertical com etiqueta explícita `CAPA DO TRAILER`. Sem pegar imagem de filme não confirmado, sem criar pôster falso. `scripts/build_promo_card.py` continua recusando falta completa de material.
- QA: `scripts/test_trailer_frame_poster.py` com FFmpeg MP4 sintético, capa 720x1080 verificada, tela do celular e outras cenas renderizadas, rejeição de vídeo preto/ausente. CI tem etapa específica. Validar CI e Cloudflare antes de pedir ao usuário que acione `Gerar vídeo agora`; retry reutiliza a fonte original e não exige re-download.
- Esta mudança não demonstra que a geração real do job falhado já terminou: requer usuário clicar `Gerar vídeo agora` ou execução autenticada equivalente.

## 2026-10-08 — Regressão comprovada: cena limpa 9:16 duplica trailer na parte superior
- Inspeção direta de dois MP4 enviados pelo proprietário: `spider man.mp4` (60.07s, 720x1280, 30fps) duplicou a cena horizontal nítida em cima da faixa central aos ~48-50s; a área inferior apenas fica embaçada. `lanternas teste 2(2).mp4` (151.5s, 720x1280, 30fps) exemplifica a composição correta aos ~105s: centro nítido, topo e base com uma única imagem ampliada e desfocada de fundo, cortada pela faixa central.
- Causa exata: filtro `[bg][hero]overlay=(W-w)/2:47[base]` era incondicional, e filtro posterior adicionava `fullhero` central durante a janela `CLEAN_START ... SCENE_LAST`. Assim surgiam duas imagens nítidas sobre o mesmo fundo.
- Patch: desabilitar o overlay superior `[hero]` **somente durante a janela limpa** com `enable='not(between(t,CLEAN_START,SCENE_LAST))'`, mantendo único `[srcbg]` ampliado e blurred por toda a tela, mesmo instante de vídeo, e `[fullhero]` central nítido. Nada muda no áudio, no algoritmo de 60s, nos cards promocionais, na capa, ou no editor desabilitado.
- QA `scripts/test_clean_trailer_background.py`: extrai os estágios `[scene-base]` do filtro FFmpeg de produção, renderiza source de teste; compara pixels de topo/rodapé com fundo borrado isolado, compara faixa central e simula o filtro anterior para garantir que reproduz a duplicação. Incluído como etapa de CI, sem assets proprietários.
- Aceite final: CI verde, PR integrado, deploy Cloudflare concluído e novo MP4 do usuário inspecionado; não confundir teste sintético de composição com E2E autêntico de job R2 + GitHub + download.

## 2026-10-08 — disparo controlado de publicação Instagram
- Solicitação do usuário: ainda não apareceu postagem no Instagram após correção do gate.
- Ação: disparar CI com `[force-instagram-test] [force-ragnar-test]` para executar os publicadores controlados de Global Play e Ragnar e registrar evidência do resultado real.

- 2026-10-08T17:57:23.373Z - Trigger controlled Global Play commercial creative validation after carousel quality fix. [force-instagram-test]

- 2026-10-08T18:03:09.156Z - Retry controlled Global Play commercial creative after emergency budget bypass deploy. [force-instagram-test]

- 2026-10-08T18:06:36.978Z - Retry controlled Global Play commercial creative after token propagation retry fix. [force-instagram-test]

- 2026-10-08T18:12:09.235Z - Retry controlled Global Play commercial creative after media timeout fix. [force-instagram-test]

- 2026-10-08T18:17:55.656Z - Direct workflow controlled Global Play commercial publish after quality fixes. [force-instagram-test]


## 2026-10-08 — Falha de download YouTube no GitHub e recuperação via PC
- Evidência de produção: run 37856611085, job 113582203315, NEXUS YouTube Ingest #21, iniciou 22:57 UTC e falhou na etapa "Download compatible video source". Log do yt-dlp: `Sign in to confirm you're not a bot`. Upload ao R2 e render não executados; mensagem `youtube_authentication_required` exibida corretamente no painel.
- Branch `fix/youtube-local-retry-after-auth-20261008`: criada recuperação para o mesmo job em falha via novo ticket local de uso único (45 min) e botão "Gerar pelo meu PC". Mantém título, sinopse, pôster, elenco e configurações do vídeo; não reutiliza token de ingestão anterior.
- Pedidos `server_generate` sem fonte oficial direta não devem mais abrir trabalhos destinados a falhar na autenticação do YouTube. Fonte direta do catálogo segue permitida.
- Se o auxiliar PC recusar o retry, registrar falha real, sem redisparar o importador bloqueado. Testes automatizados foram adicionados, mas execução, CI, deploy e render ponta a ponta ainda NÃO VALIDADOS neste registro. Não houve alteração de regras Instagram, credenciais nem cookies.
- **Próximo QA**: CI do PR, teste do botão em painel autenticado com auxiliar Windows aberto, checagem do MP4 no R2, render 9:16, callback e download. O código sozinho não comprova recuperação.

## 2026-10-08 — Regressão: bloqueio preventivo impediu download
- O usuário mostrou 409 no card de Homem-Aranha: 'O YouTube bloqueia downloads no servidor. Abra o Auxiliar NEXUS no PC'. A condição `sourceProvider === "youtube" && action !== "local_generate"` em `cloudflare/src/portal.js` recusava o job antes de tentar a fonte.
- Reparado em branch `fix/youtube-server-first-optional-pc-20261008`: remover somente o bloqueio preventivo. `server_generate` e `download` retornam ao fluxo existente de `startYouTubeVideoIngest`; o resultado real continua dependente do YouTube e dos retornos do importador.
- UI: servidor é caminho padrão, botão Baixar MP4 inicia importação sem render, e PC é alternativa explícita. Testes novos exigem este contrato. Até CI/deploy/teste de usuário, marcar NÃO VALIDADO.
- Auditor NVIDIA Nemotron foi consultado no código e documentação; adapter desativado, sem rota real e não usado para solucionar autenticação YouTube. Nenhum uso de chave ou faturamento NVIDIA.


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
- QA local:65/65 arquivos Node aprovados; novos casos funcionais testam quatro imagens/reviews, idempotência sequencial e bloqueio de marca/revisão/formato inválido. Wrangler dry-run aprovado com XDG_CONFIG_HOME no workspace. Smoke FFmpeg do zoom:MP4 real10s,1080x1920,300frames. Nenhuma chamada OpenAI/Meta real feita pelos testes; não prova qualidade visual de arte gerada nem publicação.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.
