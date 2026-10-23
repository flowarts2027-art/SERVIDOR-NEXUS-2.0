# Graph Report - SERVIDOR-NEXUS-2.0  (2026-10-23)

## Corpus Check
- 362 files · ~1,159,736 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 28 file(s) not represented in the graph (top: .xml 6, .css 6, (none) 5)

## Summary
- 3111 nodes · 7457 edges · 162 communities (137 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f66e489`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- client-lite.js
- business-profile.js
- app.js
- ref_node_assert
- lead-hunter.js
- src/crm.js
- daily-prospects.js
- media-generation.js
- prospects.js
- extended-agents.js
- whatsapp-agent.js
- github-video-render.js
- portal.js
- instagram.js
- gift.js
- auto-reel.js
- auth.js
- showcase.js
- comment-autoreply.js
- client-campaign.js
- build_promo_card.py
- src/viral-radar.js
- pathlib
- render_carousel.py
- Histórico de alterações feitas pelo Work
- master-openai.js
- signup.js
- helper.py
- master.js
- video-catalog.js
- gift-dm.js
- campaign-copy.js
- auto_cinematic_cut.py
- caption-templates.js
- push.js
- subprocess
- agent-runtime.js
- video-metadata-enrichment.js
- src/manual-carousel.js
- gift-materials.js
- publisher.js
- Próximas ações
- 2026-10-21 BRT — TAREFA PARA O CHATGPT: criar os 3 posts de hoje da Flow Arts (09h, 12h e 19h)
- public/crm.js
- test_premium_editor_browser.cjs
- HelperTests
- schema.sql
- master-workspace.js
- gerar_paginas_nicho.py
- src/captador.js
- client-autoreply.js
- nexus-autofix.mjs
- Instalar o Nexus no HD novo (Windows)
- client-uploads.js
- executor.js
- scripts
- landing.js
- main.py
- test_clean_trailer_background.py
- Estado do Nexus 2.0
- Grade de formatos — Flow Arts e Quatree Dog (decisão do Rodrigo, 22/10/2026)
- autonomy-health-summary.js
- public/captador.js
- video-overlay-ui.js
- verify_portuguese_trailer.py
- json
- nexus-audit.mjs
- os
- scheduler.js
- Testes e evidências
- public/master-upload.js
- whatsapp-inbox.js
- 0001_init.sql
- openai.js
- insights.js
- video-overlay-core.js
- Problemas conhecidos
- Campanha de 30 dias — Quatree Dog (@ericsson_quatree)
- Decisões e limites
- flowarts-campaign.js
- site-analytics.test.mjs
- Product Marketing Context — Flow Arts
- nexus-core-autonomy.mjs
- posts.js
- getClient
- package.json
- make_handler
- content-policy.js
- POSICIONAMENTO — Flow Arts x apps de agendamento (21/10/2026)
- nemotron-audit-budget.test.mjs
- post-learning.js
- public/animated-reel.js
- campanha.js
- examples.js
- prospects-ui.js
- signups.js
- test-client-workspace.mjs
- caption-polish.js
- crm-instagram-ui.test.mjs
- agent-blueprint-v3.js
- enviar.js
- NEXUS AI — Arquitetura GitHub + Cloudflare
- master-push.js
- negocio.js
- scene-grammar.js
- scheduled
- poll
- site-stats.js
- 0008_video_render_pipeline.sql
- render_reel.sh
- agendar-pasta.sh
- Passagem de trabalho — ChatGPT → Claude Code
- Standup Flow Arts — 2026-10-11
- Quadro compartilhado de tarefas — Flow Arts / Nexus
- video-demand-catalog.js
- Servidor Nexus — Cloudflare
- Implantação do Agente WhatsApp
- Passagem de trabalho — Claude Code → ChatGPT
- Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts)
- Nexus 2.0 — instruções para o Claude Code
- NVIDIA Nemotron 3 Ultra — isolated, budgeted internal adapter
- Procedimento de recuperação do Nexus no Windows
- Auditoria do Nexus — 16/10/2026 (leitura; só o que foi comprovado)
- Auditoria dos painéis — 2026-10-11 (manhã)
- Nexus 2.0 — Recuperação segura
- Nexus 2.0 — instruções para agentes de trabalho
- revisor.md
- Issue 96 — execução Nexus Core
- NEXUS AI 2.0
- Third-party notices
- Visão da Flow Arts
- Baixar YouTube no PC e enviar ao Nexus
- metricas.md
- LEIA.md
- youtube-downloader/README.md
- PLANO DE CRESCIMENTO — Flow Arts (a partir de 22/10/2026, revisar em 19/11)
- video-related-library.js
- Pasta agendamentos — posts prontos da Flow Arts
- ref_node_fs
- index.js
- REGRA FIXA — ChatGPT cria 3 posts por dia da Flow Arts e envia ao painel
- brandProfileVersion
- format-builder.test.mjs
- src/master-upload.js
- autoreply.js
- format-builder.js

## God Nodes (most connected - your core abstractions)
1. `Histórico de alterações feitas pelo Work` - 150 edges
2. `handlePortalApi()` - 92 edges
3. `Próximas ações` - 85 edges
4. `fetch()` - 64 edges
5. `Estado do Nexus 2.0` - 59 edges
6. `handleMaster()` - 54 edges
7. `clientBrand()` - 45 edges
8. `brandProfileVersion()` - 45 edges
9. `runCreator()` - 44 edges
10. `getClient()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `2026-10-19 ~13h40 BRT — Caçador: 10 por dia, limpeza de quem não respondeu, sempre com exemplo (branch, sem deploy)` --references--> `clearNoReply()`  [INFERRED]
  docs/nexus-memory/CHANGELOG.md → cloudflare/src/daily-prospects.js
- `2026-10-13 — Hook Lab colocava frase de filme em todos os clientes` --references--> `runHookLab()`  [INFERRED]
  docs/nexus-memory/CHANGELOG.md → cloudflare/src/extended-agents.js
- `2026-10-08 — Regressão: bloqueio preventivo impediu download` --references--> `startYouTubeVideoIngest()`  [INFERRED]
  docs/nexus-memory/TEST_RESULTS.md → cloudflare/src/github-video-render.js
- `2026-10-18 — Imagens por IA pausadas até ter mais clientes` --references--> `generateOriginalMedia()`  [INFERRED]
  docs/nexus-memory/DECISIONS.md → cloudflare/src/media-generation.js
- `Quebrado ou insuficiente conforme código` --references--> `publishInstagramImage()`  [INFERRED]
  docs/nexus-memory/PROJECT_STATE.md → cloudflare/src/publisher.js

## Import Cycles
- None detected.

## Communities (162 total, 25 thin omitted)

### Community 0 - "client-lite.js"
Cohesion: 0.09
Nodes (62): actionsButtonsHtml(), actionsHtml(), api(), autoReviewed(), boot(), bootDemo(), calendarPostsByDay(), cancelPost() (+54 more)

### Community 1 - "business-profile.js"
Cohesion: 0.30
Nodes (10): BUSINESS_FIELDS, businessProfileView(), clean(), handleBusinessProfilePortal(), MESSAGES, normalizeBusinessProfile(), normalizeOrderCode(), saveBusinessProfile() (+2 more)

### Community 2 - "app.js"
Cohesion: 0.08
Nodes (57): agentCoreAuto, agentCoreClient, agentCoreRefresh, agentCoreRunAll, agentCoreSave, agentCoreStatusMeta(), api(), assumeClient() (+49 more)

### Community 3 - "ref_node_assert"
Cohesion: 0.03
Nodes (46): app, master, runtime, runtime, row, css, html, js (+38 more)

### Community 4 - "lead-hunter.js"
Cohesion: 0.19
Nodes (20): prepareOdinCoordination(), collectMetaComments(), defaultConfig(), discardLead(), leadHunterConfig(), leadHunterView(), localQualification(), parseJson() (+12 more)

### Community 5 - "src/crm.js"
Cohesion: 0.10
Nodes (58): readWeek(), addFromProspect(), addFromWhatsApp(), addHistory(), addProspectLater(), archiveContact(), brasiliaClock(), brasiliaDay() (+50 more)

### Community 6 - "daily-prospects.js"
Cohesion: 0.22
Nodes (13): clearNoReply(), DAILY_TARGET, dailySettings(), FOCUS_NICHES, handleDailyRoute(), nicheOrder(), readState(), runDailyProspects() (+5 more)

### Community 7 - "media-generation.js"
Cohesion: 0.10
Nodes (18): FLOW_MARK_PNG, FLOW_MARK_WIDTH, FLOWARTS_STYLES, pickFlowArtsStyle(), GLOBAL_PLAY_BRAND_PNG, GLOBAL_PLAY_REEL_BAND_PNG, bytesFromBase64(), composeBrandOverlay() (+10 more)

### Community 8 - "prospects.js"
Cohesion: 0.15
Nodes (34): alreadyKnown(), CITY_POINTS, cleanCity(), DAILY_SEARCH_LIMIT, ensureProspectSchema(), FIELD_MASK, firstMessage(), FOOD_NICHES (+26 more)

### Community 9 - "extended-agents.js"
Cohesion: 0.15
Nodes (32): agentCoreState(), patchAgentCoreState(), recordAgentExecution(), BUSINESS_HOOKS, clamp(), compactWords(), ledgerRows(), parseJson() (+24 more)

### Community 10 - "whatsapp-agent.js"
Cohesion: 0.11
Nodes (32): autoReply(), autoReplyEnabled(), buildDraft(), bytesToHex(), cleanPhone(), configStatus(), equalHex(), handleWhatsAppProtected() (+24 more)

### Community 11 - "github-video-render.js"
Cohesion: 0.12
Nodes (22): clipKeyPrefix(), failAutoRender(), handleGitHubVideoRenderCallback(), loadJob(), LOCAL_FALLBACK_NOTICE, LOCAL_HELPER_NO_RESPONSE_MS, LOCAL_HELPER_STALLED_MS, localHelperStaleReason() (+14 more)

### Community 12 - "portal.js"
Cohesion: 0.11
Nodes (36): agentExecutions(), clearPortalSessionCookie(), portalClientView(), ingestTimeoutDetail(), saveLeadHunterConfig(), catalogCandidateScore(), catalogTitleCandidateFromYoutube(), connectionSummary() (+28 more)

### Community 13 - "instagram.js"
Cohesion: 0.15
Nodes (29): upsertClient(), allowedReturnOrigin(), assertInstagramAllowed(), base64UrlToBytes(), base64UrlToText(), connectInstagramWithToken(), disconnectInstagramUser(), getMasterInstagramSummary() (+21 more)

### Community 14 - "gift.js"
Cohesion: 0.13
Nodes (32): b64url(), escapeHtml(), fromB64url(), GIFT_BUTTON, GIFT_CHECK, GIFT_DM_TEXT, GIFT_GUIDE, GIFT_LEAD (+24 more)

### Community 15 - "auto-reel.js"
Cohesion: 0.06
Nodes (55): ANIMATED_REEL_FAIL_PATH, ANIMATED_REEL_SCENES, ANIMATED_REEL_TEMPLATE, ANIMATED_REEL_UPLOAD_PATH, animatedReelEnabled(), animatedReelStatus(), clean(), createAnimatedReel() (+47 more)

### Community 16 - "auth.js"
Cohesion: 0.14
Nodes (35): AUTH_LOGIN_MAX_ATTEMPTS, AUTH_LOGIN_WINDOW_SECONDS, authenticatePortalUser(), authPepper(), bytesToBase64Url(), bytesToHex(), cleanConfiguredValue(), configuredCredentialMatches() (+27 more)

### Community 17 - "showcase.js"
Cohesion: 0.12
Nodes (30): BUNDLED_NICHES, BUNDLED_ORIGIN, BUNDLED_VERSION, bundledExample(), BUNDLED_EXAMPLES, seedBundledExamples(), esc(), EXAMPLE_MESSAGES (+22 more)

### Community 18 - "comment-autoreply.js"
Cohesion: 0.14
Nodes (30): clientForInstagramUser(), commentAutoReplyStatus(), commentsFromWebhook(), ensureWebhookSubscription(), graph(), handleInstagramWebhook(), hexOf(), INTEREST_PATTERN (+22 more)

### Community 19 - "client-campaign.js"
Cohesion: 0.14
Nodes (33): nextMedia(), stageOwnInstagramImage(), addDays(), AI_IMAGES_MONTH_CAP, aiImagesAccess(), ART_TYPES, CAMPAIGN_DAYS, CAMPAIGN_POSTS_PER_DAY (+25 more)

### Community 20 - "build_promo_card.py"
Cohesion: 0.18
Nodes (30): add_logo(), circle_image(), clean(), contain(), draw_cast_scene(), load_person(), draw_contact_badge(), draw_cta_scene() (+22 more)

### Community 21 - "src/viral-radar.js"
Cohesion: 0.14
Nodes (27): nicheHashtags(), getState(), putState(), activeRadarNiches(), BLOCKED, FB_SCOPES, graph(), graphGet() (+19 more)

### Community 22 - "pathlib"
Cohesion: 0.08
Nodes (5): main(), preparar(), FakeReply, TestPortraits, RelatedTitleArtworkTests

### Community 23 - "render_carousel.py"
Cohesion: 0.35
Nodes (8): cabecalho(), colar_foto(), fonte(), fonte_que_cabe(), main(), montar(), seta(), texto_com_halo()

### Community 24 - "Histórico de alterações feitas pelo Work"
Cohesion: 0.01
Nodes (136): 2026-09-27 — Auditoria inicial, 2026-09-27 — Autorrecuperação de post sem mídia, 2026-09-27 — captação observável (local, aguardando deploy), 2026-09-27 — Destravamento do agendador/publicador, 2026-09-27 — Diagnóstico de acesso ao D1, 2026-09-27 — Fechamento uniforme do Publisher, 2026-09-28 — diagnóstico limitado de revisão antiga (preparado), 2026-09-28 — diagnóstico objetivo do bloqueio visual (preparado) (+128 more)

### Community 25 - "master-openai.js"
Cohesion: 0.24
Nodes (17): adminKey(), b64ToBytes(), bytesToB64(), costReport(), cryptoKey(), decryptSecret(), encryptSecret(), fetchCosts() (+9 more)

### Community 26 - "signup.js"
Cohesion: 0.16
Nodes (24): insertPortalUserRecord(), portalUsernameTaken(), newManagedClientConfig(), slugify(), THEME_COLORS, approveSignupRequest(), clean(), createSignupRequest() (+16 more)

### Community 27 - "helper.py"
Cohesion: 0.11
Nodes (19): Acceptance criteria, Claude handoff — Nexus 2.0 video correction, Current architecture relevant to the bug, Current known failure, Files you must inspect, Goal, Latest relevant commits, Required fix direction (+11 more)

### Community 28 - "master.js"
Cohesion: 0.13
Nodes (28): agentCoreClientView(), agentCoreDashboard(), dayKey(), queueManualAgentRun(), clearMasterSessionCookie(), deleteMasterSession(), masterSessionCookie(), parseCookies() (+20 more)

### Community 29 - "video-catalog.js"
Cohesion: 0.22
Nodes (24): inferCatalogMetadataFromUpload(), uploadCatalogQuery(), catalogItemById(), catalogMetadata(), catalogPreviewUrl(), catalogSearchAliases(), claimEntityIds(), claimFilename() (+16 more)

### Community 30 - "gift-dm.js"
Cohesion: 0.17
Nodes (22): messageBuilder(), checkFollows(), askMessage(), downloadMessage(), FOLLOWED_PATTERN, FOLLOWED_TITLE, followedReply(), graph() (+14 more)

### Community 31 - "campaign-copy.js"
Cohesion: 0.17
Nodes (18): brandRules(), consultGrowthAI(), extractText(), localDay(), shouldRefreshGrowthAI(), campaignCopyPrompt(), extractText(), writeCampaignCaption() (+10 more)

### Community 32 - "auto_cinematic_cut.py"
Cohesion: 0.16
Nodes (10): assemble(), candidates_for_scenes(), probe(), process(), run(), scene_ranges(), select_segments(), visual_score() (+2 more)

### Community 33 - "caption-templates.js"
Cohesion: 0.23
Nodes (10): CTA, EXTRA, GENERIC, N, OPEN, orderCodeLine(), phoneLabel(), withOrderCode() (+2 more)

### Community 34 - "push.js"
Cohesion: 0.41
Nodes (11): b64url(), enc, ensurePushSchema(), fromB64url(), handlePushRoute(), pushPublicKey(), removeSubscription(), saveSubscription() (+3 more)

### Community 35 - "subprocess"
Cohesion: 0.15
Nodes (12): bounded(), build_manifest(), format_number(), main(), prepare_image(), command(), ffmpeg(), TrailerPosterFallbackTests (+4 more)

### Community 36 - "agent-runtime.js"
Cohesion: 0.10
Nodes (39): clientCreativeReferenceNotes(), finalizeOdinCoordination(), instagramMediaInsights(), instagramSnapshot(), isBudgetError(), ledgerRows(), localDay(), mediaKey() (+31 more)

### Community 37 - "video-metadata-enrichment.js"
Cohesion: 0.18
Nodes (16): norm(), officialMovieFromTrailer(), SPIDER_BRAND_NEW_DAY, verifyOfficialMoviePoster(), bareName(), clean(), enrichVerifiedFilmPresentation(), fetchRelatedFranchiseFilms() (+8 more)

### Community 38 - "src/manual-carousel.js"
Cohesion: 0.33
Nodes (6): createManualCarousel(), handleManualCarouselMaster(), IMAGE_TYPES, MANUAL_CAROUSEL_MESSAGES, schedulePost(), send()

### Community 39 - "gift-materials.js"
Cohesion: 0.14
Nodes (11): dmText(), wantsReply(), BY_KEYWORD, DEFAULT_MATERIAL, GIFT_CTA_PATTERN, GIFT_MATERIALS, GUIA, materialForComment() (+3 more)

### Community 40 - "publisher.js"
Cohesion: 0.07
Nodes (43): CLIENTS, dayKey(), CLIENTS, emergencyPublisherDiagnostic(), isoTime(), reply(), emergencyCaption(), emergencyCarousel() (+35 more)

### Community 41 - "Próximas ações"
Cohesion: 0.02
Nodes (85): 2026-09-28, incidente de publicação, 2026-10-02 — correção implantada e abertura confirmada, 2026-10-02 — próximo passo do painel de cliente, 2026-10-02 — retomada desktop, 2026-10-03 — ampliação autorizada do modelo, 2026-10-03 — confirmação do original e validação do painel, 2026-10-03 — evidência atual e pendências reais, 2026-10-03 — implantação e teste autenticado (+77 more)

### Community 42 - "2026-10-21 BRT — TAREFA PARA O CHATGPT: criar os 3 posts de hoje da Flow Arts (09h, 12h e 19h)"
Cohesion: 0.29
Nodes (7): 2026-10-21 BRT — TAREFA PARA O CHATGPT: criar os 3 posts de hoje da Flow Arts (09h, 12h e 19h), Entrega esperada do ChatGPT, ⚠️ Leia antes de tudo: o que é a Flow Arts, Post 1 — 09:00, Post 2 — 12:00 (dia 21 da campanha), Post 3 — 19:00 (dia 21 da campanha), Regras (valem para os 3 posts)

### Community 43 - "public/crm.js"
Cohesion: 0.19
Nodes (18): call(), card(), contactActions(), dayLabel(), downloadFiles(), exampleFiles(), hoursBadge(), instagramLink() (+10 more)

### Community 44 - "test_premium_editor_browser.cjs"
Cohesion: 0.17
Nodes (6): root, server, types, css, layout, portal

### Community 46 - "schema.sql"
Cohesion: 0.05
Nodes (55): connections, idx_connections_client, idx_portal_sessions_client, idx_portal_users_username, idx_post_ledger_client_updated, idx_scheduled_jobs_due, idx_video_clips_client, idx_video_clips_job (+47 more)

### Community 47 - "master-workspace.js"
Cohesion: 0.26
Nodes (15): activeMasterGuidance(), addDirective(), campaignKey(), campaignPrefix(), createCampaign(), directivesKey(), filterMasterGuidance(), listCampaigns() (+7 more)

### Community 48 - "gerar_paginas_nicho.py"
Cohesion: 0.33
Nodes (3): e(), outros_links(), pagina()

### Community 49 - "src/captador.js"
Cohesion: 0.06
Nodes (73): alreadyKnown(), CAP_STATUSES, CAPTADOR_MAX_LIMIT, CAPTADOR_MONTHLY_LIMIT, CAPTADOR_NICHES, CAPTADOR_OSM_TAGS, CAPTADOR_PRICE, captadorConfig() (+65 more)

### Community 50 - "client-autoreply.js"
Cohesion: 0.18
Nodes (21): buildDm(), buildDmMessage(), clean(), clientAutoReplyConfig(), defaultDm(), defaultKeywords(), fold(), GENERAL_WORDS (+13 more)

### Community 51 - "nexus-autofix.mjs"
Cohesion: 0.18
Nodes (18): action(), gh(), issueOnce(), now, BAD_CONCLUSIONS, CYCLE_CLIENTS, eligibleCodePatch(), healthIncidents() (+10 more)

### Community 52 - "Instalar o Nexus no HD novo (Windows)"
Cohesion: 0.22
Nodes (8): Bloco 1: instalar os programas, Bloco 2: trazer o projeto, Bloco 3: Graphify (mapa do código), Bloco 4: entrar no Claude Code, Bom saber, Instalar o Nexus no HD novo (Windows), O que está no backup, O que NÃO está no backup (e não se perde com o HD)

### Community 53 - "client-uploads.js"
Cohesion: 0.15
Nodes (12): checkImage(), checkVideo(), CLIENT_UPLOAD_MESSAGES, createClientUpload(), files(), IMAGE_TYPES, isMp4(), UPLOAD_TYPES (+4 more)

### Community 54 - "executor.js"
Cohesion: 0.24
Nodes (13): automationEnabled(), compareDueJobs(), duePosts(), JOB_KIND_PRIORITY, parseJson(), processDueJobs(), publishGuard(), recoverStuckPublishing() (+5 more)

### Community 55 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, wrangler, name, private, scripts, check, d1:migrations:apply, d1:migrations:apply:local (+7 more)

### Community 56 - "landing.js"
Cohesion: 0.29
Nodes (8): clean(), handleLandingLead(), json(), LANDING_CLIENT_ID, LANDING_SEGMENTS, validateLandingLead(), upsertLead(), ok

### Community 57 - "main.py"
Cohesion: 0.23
Nodes (7): _auth(), _download_and_upload(), health(), ingest(), IngestRequest, _report_failure(), _safe_name()

### Community 58 - "test_clean_trailer_background.py"
Cohesion: 0.43
Nodes (4): CleanTrailerBackgroundTests, diff_mean(), run_ffmpeg(), workflow_fullscreen_graph()

### Community 59 - "Estado do Nexus 2.0"
Cohesion: 0.03
Nodes (59): 2026-09-27 23h BRT — captação de leads (em implantação), 2026-09-28 12h50 BRT — publicação parada, 2026-09-28 13h10 BRT — confirmação do bloqueio, 2026-09-28 13h15 BRT — orçamento de chamadas externas, 2026-09-28 13h20 BRT — erro OpenAI mudou após limite, 2026-09-28 13h35 BRT — Global Play publicado, mídia Ragnar corrompida, 2026-09-28 13h53 BRT — Ragnar ainda sem postagem, 2026-09-28 ~13h BRT — implantação parcial (+51 more)

### Community 60 - "Grade de formatos — Flow Arts e Quatree Dog (decisão do Rodrigo, 22/10/2026)"
Cohesion: 0.33
Nodes (5): 1. Flow Arts (@flowarts2026) — 5 por dia, 2. Quatree Dog (@ericsson_quatree) — 2 a 3 por dia, 3. Como fazer cada formato, 4. Conferir antes de salvar, Grade de formatos — Flow Arts e Quatree Dog (decisão do Rodrigo, 22/10/2026)

### Community 61 - "autonomy-health-summary.js"
Cohesion: 0.27
Nodes (9): buildAutonomyHealthSummary(), EXPECTED_AUTONOMY_AGENTS, moduleKey(), parseJson(), summarizeClientState(), autonomyOverallHealthy(), clientAutonomyHealthy(), all() (+1 more)

### Community 62 - "public/captador.js"
Cohesion: 0.24
Nodes (12): call(), configForm(), dailyBlock(), hoursBadge(), leadActions(), leadCard(), load(), materialBlock() (+4 more)

### Community 63 - "video-overlay-ui.js"
Cohesion: 0.35
Nodes (12): add(), buildPremiumLayout(), change(), controls(), field(), notify(), render(), renderTimeline() (+4 more)

### Community 64 - "verify_portuguese_trailer.py"
Cohesion: 0.23
Nodes (4): VerificationTests, clean(), reject(), verify()

### Community 65 - "json"
Cohesion: 0.13
Nodes (9): main(), post_progress(), seconds(), error(), send(), ArtworkParser, main(), get() (+1 more)

### Community 66 - "nexus-audit.mjs"
Cohesion: 0.15
Nodes (8): c, clients, e, j, n, o, p, u

### Community 67 - "os"
Cohesion: 0.18
Nodes (11): draw_fit(), extract_reference_frame(), font(), load_metadata(), make_background(), materialize_metadata(), prepare_template(), render_fixed() (+3 more)

### Community 68 - "scheduler.js"
Cohesion: 0.07
Nodes (41): runCronIteration(), isPublishingWindow(), parts(), PUBLISHING_POLICY, publishingGate(), sameSaoPauloDay(), saoPauloDay(), shouldExpireDraft() (+33 more)

### Community 69 - "Testes e evidências"
Cohesion: 0.05
Nodes (38): 2026-09-28 ~13h BRT — timeout Graph, 2026-09-28 — arte Ragnar inspecionada, 2026-09-28 — leitura interna da arte Ragnar, 2026-10-02 — correção implantada e abertura confirmada, 2026-10-02 — estabilidade da área Vídeos, 2026-10-02 — redirecionamento circular do portal confirmado, 2026-10-03 — ampliação autorizada do modelo, 2026-10-03 — confirmação do original e validação do painel (+30 more)

### Community 70 - "public/master-upload.js"
Cohesion: 0.33
Nodes (9): applyType(), captionFor(), fillCaptions(), fillClients(), render(), slots(), start(), typeNow() (+1 more)

### Community 71 - "whatsapp-inbox.js"
Cohesion: 0.42
Nodes (11): api(), loadInbox(), loadStatus(), openThread(), refresh(), renderContactState(), renderList(), renderSwitch() (+3 more)

### Community 72 - "0001_init.sql"
Cohesion: 0.24
Nodes (10): agent_executions, clients, idx_agent_exec_client_created, idx_support_client_status, idx_video_jobs_client_created, nexus_state, portal_sessions, support_tickets (+2 more)

### Community 73 - "openai.js"
Cohesion: 0.30
Nodes (11): ensureRuntimeStatusTable(), estimateLunaCost(), openAIResponses(), recordUsage(), openAIKeyForClient(), openAIKeyStatus(), runtimeStatus(), saoPauloDay() (+3 more)

### Community 74 - "insights.js"
Cohesion: 0.33
Nodes (7): clientInsights(), num(), parseJson(), readCache(), summarizeSnapshot(), writeCache(), snapshot

### Community 76 - "Problemas conhecidos"
Cohesion: 0.05
Nodes (38): 2026-09-28 13h10 — revisão Ragnar esgotada, 2026-09-28 — dois bloqueios de publicação, 2026-09-28 — limite de chamadas externas do Worker gratuito, 2026-09-28 — resposta 400 na revisão Ragnar, 2026-09-28 — três mídias padrão Ragnar inválidas, 2026-10-02 — correção implantada e abertura confirmada, 2026-10-02 — painel de vídeos, 2026-10-02 — redirecionamento circular do portal confirmado (+30 more)

### Community 78 - "Campanha de 30 dias — Quatree Dog (@ericsson_quatree)"
Cohesion: 0.15
Nodes (12): 10. Falta do cliente / do Rodrigo, 1. Auditoria da conta (perfil público, 22/10/2026, só leitura), 2. Ajustes do perfil (o cliente faz no celular, antes do Dia 1), 3. Objetivo e público, 4. Ritmo, 5. Calendário dos 30 dias (feed, 09h), 6. Busca de clientes (10 por dia, no painel dele), 7. Artes: material do cliente primeiro (+4 more)

### Community 80 - "Decisões e limites"
Cohesion: 0.07
Nodes (29): 2026-10-02 — decisão atual sobre vídeo no painel, 2026-10-03 — ampliação autorizada do modelo, 2026-10-03 — confirmação do original e validação do painel, 2026-10-03 — evidência atual e pendências reais, 2026-10-03 — modelo completo Michael, preparado localmente, 2026-10-03 — trailers oficiais em português e WhatsApp, 2026-10-04 — YouTube primeiro no PC, 2026-10-09 — deploy de referências e falha real do teste controlado (+21 more)

### Community 81 - "flowarts-campaign.js"
Cohesion: 0.05
Nodes (41): CAMPAIGN_CLIENTS, campaignCalendar(), campaignDayIndex(), CTA, DAYS, FLOW_ARTS_CAMPAIGN_DAYS, FLOWARTS_REAL_VIDEO_REELS, flowArtsCampaignForDay() (+33 more)

### Community 82 - "site-analytics.test.mjs"
Cohesion: 0.33
Nodes (9): cleanPath(), ensureSiteSchema(), handleSiteHit(), saoPauloDay(), SITE_EVENTS, siteStats(), TAGGED_SOURCES, visitSource() (+1 more)

### Community 83 - "Product Marketing Context — Flow Arts"
Cohesion: 0.13
Nodes (14): Brand Voice, Changelog, Competitive Landscape, Customer Language, Differentiation, Goals, Objections, Personas (+6 more)

### Community 84 - "nexus-core-autonomy.mjs"
Cohesion: 0.31
Nodes (9): currentRunId, DOTS, dryRun, fetchHealth(), gh(), healthIncidents(), main(), routeWorkflow() (+1 more)

### Community 85 - "posts.js"
Cohesion: 0.26
Nodes (13): cancelPost(), decidePost(), decodeBase64Image(), parseJson(), postImageKeyBelongsToClient(), postRow(), publishPostNow(), requestPostRevision() (+5 more)

### Community 86 - "getClient"
Cohesion: 0.30
Nodes (9): AGENT_CORE_MODULES, NEXUS_COORDINATOR_ID, NEXUS_WORKER_MODULES, normalizeAgentCoreConfig(), parseJson(), saveAgentCoreConfig(), getClient(), parseJson() (+1 more)

### Community 88 - "package.json"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, check, deploy, dev, version

### Community 89 - "make_handler"
Cohesion: 0.47
Nodes (8): make_handler(), do_GET(), do_OPTIONS(), do_POST(), host_valid(), origin(), send(), session()

### Community 90 - "content-policy.js"
Cohesion: 0.50
Nodes (6): COMMERCIAL_CLIENTS, commercialContentPolicy(), commercialCopyAllowed(), commercialPromptGuard(), hasResellerOffer(), isCommercialClient()

### Community 91 - "POSICIONAMENTO — Flow Arts x apps de agendamento (21/10/2026)"
Cohesion: 0.29
Nodes (6): 1. O que eles são (sites lidos em 21/10), 2. Nossa mensagem, 3. Série de posts (encaixe no PLANO; ChatGPT usa nos próximos dias), 4. Respostas prontas (Direct e WhatsApp), 5. Onde eles são mais fortes (cuidado), POSICIONAMENTO — Flow Arts x apps de agendamento (21/10/2026)

### Community 92 - "nemotron-audit-budget.test.mjs"
Cohesion: 0.50
Nodes (5): auditWithNemotron(), nemotronAuditConfig(), reserveNemotronAuditSlot(), enabled(), fakeD1()

### Community 93 - "post-learning.js"
Cohesion: 0.31
Nodes (9): CHECKPOINTS, dueMetricCheckpoints(), ensureLearningSchema(), featureSignature(), POST_METRIC_CHECKPOINTS, recentPostFeatures(), recentPublishedPostFeatures(), recordMetricCheckpoints() (+1 more)

### Community 94 - "public/animated-reel.js"
Cohesion: 0.43
Nodes (7): acompanhar(), carregar(), carregarVitrine(), mostrar(), mostrarVitrine(), salvar(), salvarVitrine()

### Community 95 - "campanha.js"
Cohesion: 0.46
Nodes (7): artSection(), call(), choice(), load(), render(), settingsForm(), summary()

### Community 96 - "examples.js"
Cohesion: 0.46
Nodes (6): call(), describe(), load(), render(), row(), uploader()

### Community 97 - "prospects-ui.js"
Cohesion: 0.39
Nodes (5): actions(), card(), hoursBadge(), load(), move()

### Community 98 - "signups.js"
Cohesion: 0.43
Nodes (6): call(), esc(), load(), render(), setCount(), when()

### Community 99 - "test-client-workspace.mjs"
Cohesion: 0.18
Nodes (7): backgroundTasks, db, env, evidence, MEDIA, objects, server

### Community 100 - "caption-polish.js"
Cohesion: 0.22
Nodes (12): ensureGiftCta(), FIRST_LINE_MAX, limitHashtags(), MAX_HASHTAGS, OTHER_ASK_LINE, polishCaption(), QUERO_PATTERN, ROBOT_PHRASES (+4 more)

### Community 101 - "crm-instagram-ui.test.mjs"
Cohesion: 0.20
Nodes (3): base, assetSource, context

### Community 102 - "agent-blueprint-v3.js"
Cohesion: 0.33
Nodes (5): AGENT_CORE_MODULES, NEXUS_AGENT_SYSTEM_VERSION, NEXUS_AUTONOMY_CONTRACT, NEXUS_COORDINATOR_ID, NEXUS_WORKER_MODULES

### Community 103 - "enviar.js"
Cohesion: 0.47
Nodes (3): render(), setupFields(), updateCount()

### Community 104 - "NEXUS AI — Arquitetura GitHub + Cloudflare"
Cohesion: 0.18
Nodes (10): Clientes, Cloudflare, Dados, Fluxo, GitHub, Meta / Instagram, NEXUS AI — Arquitetura GitHub + Cloudflare, OpenAI (+2 more)

### Community 106 - "master-push.js"
Cohesion: 0.80
Nodes (4): call(), enablePush(), loadDaily(), refreshPush()

### Community 107 - "negocio.js"
Cohesion: 0.70
Nodes (4): call(), field(), load(), render()

### Community 108 - "scene-grammar.js"
Cohesion: 0.28
Nodes (12): diversifyHashtags(), diversifyHook(), diversifyScene(), GRAMMARS, HASHTAG_SETS, hashtagOverlap(), HOOKS, norm() (+4 more)

### Community 109 - "scheduled"
Cohesion: 0.33
Nodes (6): DEMO_MAX_POSTS, demoClientRecord(), ensureDemoClient(), isD1Emergency(), scheduled(), 2026-09-27 23h BRT — alteração de captação

### Community 110 - "poll"
Cohesion: 1.00
Nodes (3): drive(), poll(), render()

### Community 111 - "site-stats.js"
Cohesion: 0.60
Nodes (5): bars(), compare(), diagnosis(), fillDays(), load()

### Community 126 - "agendar-pasta.sh"
Cohesion: 0.35
Nodes (11): cleanup(), client_exists(), CLIENT_OK, fail(), image_named(), mime(), note(), process_slot() (+3 more)

### Community 127 - "Passagem de trabalho — ChatGPT → Claude Code"
Cohesion: 0.14
Nodes (13): 2026-10-19 — Integração Marketing ↔ Claude ↔ Nexus para posts, 2026-10-19 — Limite diário da NVIDIA para auditoria, 2026-10-19 — Ponte compartilhada e prospecção Flow Arts, 2026-10-19 — PRIORIDADE ZERO do Claude: Getify e MySQL, 2026-10-19 — Regras finais de busca e follow-up (Flow Arts), 2026-10-20 — CRM: abrir Direct e copiar mensagem por nicho, 2026-10-20 — CRM: contato manual no Instagram (validado localmente, sem deploy), 2026-10-20 — CRM: escolha manual Instagram ou WhatsApp na mesma entrega (+5 more)

### Community 128 - "Standup Flow Arts — 2026-10-11"
Cohesion: 0.20
Nodes (9): Dados que faltam, Marketing, O que precisa da aprovação do Rodrigo, Prioridade número um, Rodrigo, Standup Flow Arts — 2026-10-11, Tarefas por departamento, Trabalho que ocupa tempo, mas não traz cliente agora (+1 more)

### Community 129 - "Quadro compartilhado de tarefas — Flow Arts / Nexus"
Cohesion: 0.29
Nodes (6): 2026-10-20 — Canal manual do CRM, 2026-10-20 — CRM Direct, 2026-10-21 — Correção de estado (Claude), Convenções de estado, Critérios de aceite da ponte, Quadro compartilhado de tarefas — Flow Arts / Nexus

### Community 130 - "video-demand-catalog.js"
Cohesion: 0.18
Nodes (19): normalizeRenderComposition(), startGitHubVideoRender(), catalogIdentityConfidence(), editDistance(), allowedPoster(), dailyYoutubeDemandPosterWarmup(), indexCatalogResults(), normalize() (+11 more)

### Community 131 - "Servidor Nexus — Cloudflare"
Cohesion: 0.22
Nodes (8): Banco, Componentes, Deploy, Deploy automático, Regra de arquitetura, Secrets, Servidor Nexus — Cloudflare, Validação

### Community 132 - "Implantação do Agente WhatsApp"
Cohesion: 0.22
Nodes (8): Arquitetura, Comportamento, Endpoint do webhook, Implantação do Agente WhatsApp, Passo a passo do Rodrigo (2026-10-12), Rotas internas, Segurança herdada e reforçada, Variáveis obrigatórias no Cloudflare

### Community 134 - "Passagem de trabalho — Claude Code → ChatGPT"
Cohesion: 0.07
Nodes (27): 2026-10-21 19h30 BRT — CRM: 14 contatos parados há mais de 24 h arquivados, 2026-10-21 19h30 BRT — REGRA FIXA: ChatGPT cria 3 posts por dia e envia ao painel, 2026-10-21 19h BRT — Envio da pasta `agendamentos` para o painel funcionou (correção em PR), 2026-10-21 20h30 BRT — SEO técnico do site e foto da consultora removida (PR, aguarda OK), 2026-10-21 20h BRT — Planos com mais conteúdos no site (PR, depende de merge), 2026-10-21 21h30 BRT — PLANO DE CRESCIMENTO e standup automático do CEO, 2026-10-21 21h BRT — Auditoria do site flowarts.com.br e painel "Está dando resultado?", 2026-10-21 22h30 BRT — Posicionamento contra apps de agendamento (PR, aguarda OK) (+19 more)

### Community 135 - "Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts)"
Cohesion: 0.22
Nodes (8): Fechamento: passagem de bastão, Formato recomendado de cada registro, Início de cada sessão, Limites, privacidade e custos, Melhorias opcionais futuras (não implementadas aqui), Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts), Regra fixa do ChatGPT: 3 posts por dia, Repartição de trabalho preferida

### Community 136 - "Nexus 2.0 — instruções para o Claude Code"
Cohesion: 0.29
Nodes (6): Como falar com o Rodrigo (proprietário), Como trabalhar neste projeto, Continuidade de trabalho com ChatGPT — ponte no GitHub, Departamentos da Flow Arts (subagentes), graphify, Nexus 2.0 — instruções para o Claude Code

### Community 137 - "NVIDIA Nemotron 3 Ultra — isolated, budgeted internal adapter"
Cohesion: 0.29
Nodes (6): Fail-closed configuration, NVIDIA Nemotron 3 Ultra — isolated, budgeted internal adapter, Safety boundaries, Scope, Tests, Verified Cloudflare D1 migration limitation (08/10/2026)

### Community 138 - "Procedimento de recuperação do Nexus no Windows"
Cohesion: 0.29
Nodes (6): Depois da extração, Execução, Importante, Procedimento de recuperação do Nexus no Windows, Se o script falhar, Segurança

### Community 140 - "Auditoria do Nexus — 16/10/2026 (leitura; só o que foi comprovado)"
Cohesion: 0.33
Nodes (5): Auditoria do Nexus — 16/10/2026 (leitura; só o que foi comprovado), Comprovado, Comprovado, NÃO corrigido, Feito agora, Não verificado

### Community 141 - "Auditoria dos painéis — 2026-10-11 (manhã)"
Cohesion: 0.33
Nodes (5): Auditoria dos painéis — 2026-10-11 (manhã), Decisões do proprietário na conversa por voz (2026-10-10 noite), Ordem proposta de execução, Painel do cliente — o que existe hoje, Painel Master — o que existe hoje (10 itens de menu)

### Community 142 - "Nexus 2.0 — Recuperação segura"
Cohesion: 0.33
Nodes (5): Estado em 10/10/2026, Limites do backup, Nexus 2.0 — Recuperação segura, Próximo passo (sem repetir PowerShell), Regra de segurança

### Community 143 - "Nexus 2.0 — instruções para agentes de trabalho"
Cohesion: 0.50
Nodes (3): Continuidade entre chat, Work e voz, Nexus 2.0 — instruções para agentes de trabalho, Ponte de memória entre ChatGPT e Claude Code (2026-10-19)

### Community 144 - "revisor.md"
Cohesion: 0.50
Nodes (3): O que conferir, nesta ordem, O que entregar, Regras

### Community 145 - "Issue 96 — execução Nexus Core"
Cohesion: 0.50
Nodes (3): Dots / entregáveis, Issue 96 — execução Nexus Core, Regra de release

### Community 146 - "NEXUS AI 2.0"
Cohesion: 0.50
Nodes (3): NEXUS AI 2.0, Operação, Validação e publicação

### Community 147 - "Third-party notices"
Cohesion: 0.50
Nodes (3): instagram-agent-skill, Inter (fonte dos títulos do carrossel), Third-party notices

### Community 156 - "PLANO DE CRESCIMENTO — Flow Arts (a partir de 22/10/2026, revisar em 19/11)"
Cohesion: 0.20
Nodes (9): 1. Onde estamos (números lidos em 21/10), 2. Público: um só, por 4 semanas, 3. A oferta que abre a porta, 4. Instagram: cada horário tem uma função, 5. Distribuição: o que realmente traz gente (Rodrigo, até 30 min por dia), 6. Site: falar com o mesmo público, 7. Metas das próximas 4 semanas (metas, não previsão), 8. O que precisa do OK do Rodrigo (+1 more)

### Community 158 - "video-related-library.js"
Cohesion: 0.47
Nodes (6): key(), norm(), readRelatedTitles(), rememberRelatedTitles(), safeArtwork(), safeRelated()

### Community 162 - "Pasta agendamentos — posts prontos da Flow Arts"
Cohesion: 0.40
Nodes (4): O que vai dentro de cada pasta, Onde salvar, Pasta agendamentos — posts prontos da Flow Arts, Regras do envio

### Community 163 - "ref_node_fs"
Cohesion: 0.15
Nodes (14): clock(), COMMERCIAL_WEEK, DAY_NAMES, dayList(), empty(), googleHours(), hm(), hoursStatus() (+6 more)

### Community 167 - "index.js"
Cohesion: 0.15
Nodes (24): authRateKey(), clearLoginFailures(), loginRateLimitStatus(), recordLoginFailure(), requestIp(), asset(), authorized(), autonomyHealth() (+16 more)

### Community 169 - "REGRA FIXA — ChatGPT cria 3 posts por dia da Flow Arts e envia ao painel"
Cohesion: 0.20
Nodes (9): Arquivos de cada pasta, Conferir antes de salvar (os 3 posts), GRADE NOVA (Rodrigo, 22/10/2026, 22h59): 5 por dia com Reel e stories, Oferta nova (Rodrigo, 22/10/2026) — vale a partir de agora, Padrão da arte (o mesmo do Nexus: `cloudflare/src/flowarts-styles.js` e `client-brand.js`), Padrão do conteúdo, REGRA FIXA — ChatGPT cria 3 posts por dia da Flow Arts e envia ao painel, Rotina diária (terminar até 08h de Brasília) (+1 more)

### Community 171 - "brandProfileVersion"
Cohesion: 0.10
Nodes (29): reviewCopy(), RULES, brandProfileVersion(), CLIENT_BRAND_DEFAULTS, clientBrand(), DEMO_CLIENT_ID, GENERATION_PAUSED_CLIENTS, IMAGE_GENERATION_CLIENTS (+21 more)

### Community 172 - "format-builder.test.mjs"
Cohesion: 0.25
Nodes (6): agentCore, executor, extended, formatBuilder, index, publisher

### Community 173 - "src/master-upload.js"
Cohesion: 0.31
Nodes (10): captionNiche(), captionVariants(), readyCaption(), activeClient(), handleMasterUpload(), masterUpload(), MESSAGES, nextCaption() (+2 more)

### Community 175 - "autoreply.js"
Cohesion: 0.83
Nodes (3): call(), load(), render()

### Community 181 - "format-builder.js"
Cohesion: 0.09
Nodes (40): CAROUSEL_AGENT_VERSION, CAROUSEL_CARD_COUNT, CAROUSEL_ROLES, charCount(), clean(), extractText(), FOOTER_MAX, FORBIDDEN (+32 more)

## Knowledge Gaps
- **2 isolated node(s):** `CLIENT_OK`, `wrangler`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1216 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startGitHubVideoRender()` connect `video-demand-catalog.js` to `video-metadata-enrichment.js`, `github-video-render.js`, `portal.js`, `helper.py`, `video-catalog.js`, `video-related-library.js`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `CLIENT_OK`, `wrangler` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `client-lite.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09474206349206349 - nodes in this community are weakly interconnected._
- **Why does `Current known failure` connect `helper.py` to `video-demand-catalog.js`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0768361581920904 - nodes in this community are weakly interconnected._
- **Why does `upload_to_nexus()` connect `helper.py` to `json`, `pathlib`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `ref_node_assert` be split into smaller, more focused modules?**
  _Cohesion score 0.03343070431678027 - nodes in this community are weakly interconnected._