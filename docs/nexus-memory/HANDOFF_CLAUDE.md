## 2026-11-04 19:45 BRT — Painel da Quatree Dog com a logo e as cores reais (Claude)
- Origem → destino: Claude → ChatGPT e próximas sessões do Claude.
- Pedido: logo oficial no menu, igual à Daniela, e cores reais da logo no lugar das do PR #574.
- Logo: o Rodrigo citou o nome `quatree-logo`; em Downloads só havia `quatreedog.jfif` (447×447, fundo laranja, Q vermelho, nome marrom). Convertido para PNG em `public/brand/quatree-logo.png`, sem alterar a arte.
- Cores medidas na imagem: laranja #E88400, vermelho #C03C34, marrom #88401C, branco.
- Decisões: menu marrom com texto branco; item ativo laranja com texto marrom-escuro, porque branco sobre laranja dá 2,6:1. Logo quadrada: 200×100 no menu, com recorte só por CSS (Daniela: 200×85).
- Evidências: Chrome sem tela, 1280 e 390 px, tema forçado na demonstração: 0 contraste baixo, 0 azul, mesmos botões e abas. Daniela e cliente sem tema continuam iguais.
- Não conferido: painel real da Quatree. Estado: PR aguardando revisão, não implantado.
- Próximo passo: depois do merge, abrir o painel real e conferir Início, Posts e Números.

## 2026-11-04 18:10 BRT — Verificação do Instagram passa a olhar os clientes ativos (Claude)
- Origem → destino: Claude → ChatGPT e próximas sessões do Claude.
- Pedido e objetivo: o Rodrigo pediu para investigar a falha do `NEXUS Overnight Regression` e vigiar só clientes ativos com Instagram conectado.
- Diagnóstico: `/api/instagram-publishing-health` olhava só `globalplay-streaming` e `ragnar-one`, ambos arquivados. O token da Ragnar One retornou `http_400`, então o passo falhava. Último sucesso: 03/11 12:36 BRT. Nenhum cliente ativo era vigiado.
- Decisão: lista nova com `daniela-martins`, `giltec`, `maskara-assessoria`, `nexus-ai`, `primeiro-teste` e `quatree-dog`. Todos têm métricas de hoje e posts recentes. Token da Ragnar One não será renovado.
- Executado: lista trocada em `cloudflare/src/index.js`, `.github/workflows/nexus-overnight-regression.yml` e `.github/scripts/nexus-autofix-policy.mjs` (com o teste dele), e `clients.length === 2` virou `managed.length`. Branch `claude/saude-instagram-clientes-ativos`, PR sem merge.
- Estado: PR aguardando revisão. Não implantado.
- Próximo passo: depois do merge e do deploy, abrir `/api/instagram-publishing-health` e ver se os 6 clientes vêm com `ok: true`. Se um cliente falhar, é aviso real e precisa de análise.
- Fora deste PR: `.github/scripts/nexus-audit.mjs` ainda olha só os dois clientes arquivados.
- Bloqueios / autorização: o merge depende do OK do Rodrigo, porque mexe em `cloudflare/` e publica no site.

## 2026-11-04 19:55 BRT — Nomes mostrados nos painéis (Claude)
- Pedido: tela do cliente `primeiro-teste` mostrar "Flow Arts", e topo da Quatree mostrar "Olá, Quatree Dog — Vendedor Ericsson", sem mudar os IDs.
- Executado: novo `cloudflare/src/client-display.js`, usado só em respostas de tela (Master, painel do cliente, conector, aviso de aprovação).
- Decisão: não alterar o nome salvo no banco. Migrations não rodam no deploy, e o nome salvo alimenta marca e legendas: "Quatree Dog — Vendedor Ericsson" iria parar nas legendas.
- Estado: PR aguardando revisão, não implantado. Não conferido no painel real.
- Próximo passo: depois do merge, ver o Master e o topo do painel da Quatree.

## 2026-11-04 17:37 BRT — Graphify: reinstalado no PC e teste de economia de tokens (Claude)
- Origem → destino: Claude → ChatGPT e próximas sessões do Claude.
- Pedido e objetivo: o Rodrigo pediu para verificar se o Graphify economiza tokens neste projeto.
- Diagnóstico: `graphify.exe` estava quebrado neste PC (`uv trampoline failed to canonicalize script path`) e a pasta `uv/tools` estava vazia, então `graphify query` e os hooks de `.claude/settings.local.json` não podiam funcionar. Causa provável, não comprovada: a pasta foi recriada em 28/10.
- Executado com o OK do Rodrigo: `uv tool install --force "graphifyy[sql]"` (versão 0.9.102), `git pull --ff-only` (389 commits) e `uv tool update-shell` (`.local/bin` no PATH do usuário). `--force` foi preciso porque os atalhos antigos bloqueavam a instalação.
- Efeitos colaterais: a primeira consulta atualizou a skill local de 0.9.94 para 0.9.102 (cópia antiga em `SKILL.md.bak`, fora do Git; o Rodrigo decidiu manter a skill nova). Os hooks do Git refazem o mapa neste PC depois de um pull; a reconstrução terminou sem mudança de estrutura.
- Evidências: `main` local igual ao GitHub em `5004519` após `git fetch` (0 à frente, 0 atrás). `graphify --version` = 0.9.102. `graphify` encontrado em processo novo com o PATH salvo. Hooks `hook-guard read` e `search` saíram com código 0, testados só com entrada vazia. O workflow do mapa continua rodando (commit do mapa de hoje).
- Resultado do teste de tokens: ver `TEST_RESULTS.md`. Resumo: `graphify query "manual-reel.js"` custou cerca de 1.900 tokens, quase igual a ler o arquivo (cerca de 1.870), e não trouxe `public/manual-reel.js`. Consulta em frases custou cerca de 2.300 e errou o lugar.
- Código: nenhum alterado. Sem deploy, sem publicação. Este registro vai no PR da branch `claude/graphify-regra-tokens`.
- Estado: Graphify instalado e verificado no PC. Regra nova do `CLAUDE.md` em PR, aguardando revisão.
- Limite desta sessão: os sete arquivos de `AGENTS.md` não foram lidos inteiros (cerca de 125 mil tokens); li `BRIDGE_PROTOCOL.md` e o início do `TASK_BOARD.md`. Sessões do Nexus na nuvem não puderam ser conferidas.
- Regra nova, com o OK do Rodrigo: arquivo conhecido, abrir direto; função conhecida, buscar o nome no `graph.json`; `graphify query` só para ligações entre partes ou quando não souber onde procurar.
- Próximo passo: o Rodrigo revisa e faz o merge do PR.
- Bloqueios / autorização: o merge depende do OK do Rodrigo.

## 2026-11-04 20:05 BRT — Vigia do Instagram por regra, sem lista fixa (Claude)
- Pedido: vigiar todo cliente ativo com Instagram conectado; novo entra sozinho, arquivado sai sozinho.
- Executado: `watchedInstagramClients` e `instagramPublishingHealth` em `cloudflare/src/instagram-credentials.js`. Sem lista fixa em `index.js`, `nexus-overnight-regression.yml` e `nexus-autofix-policy.mjs`.
- Regra: `status='online'` com linha em `connections` (`meta` ou `instagram`). Token vencido continua vigiado, para gerar alerta. Lista vazia ou banco fora do ar dão `ok:false`.
- Evidência: em produção, antes do merge, os 6 clientes atuais vieram com `ok:true`. Testes com SQLite real.
- Fora deste PR: `.github/scripts/nexus-audit.mjs` ainda olha só os dois clientes arquivados.
- Estado: PR aguardando revisão, não implantado.
- Próximo passo: o Worker e o workflow precisam ir juntos. Depois do deploy, abrir `/api/instagram-publishing-health` e conferir os 6 clientes.

## 2026-11-04 18:52 BRT — Painel da Quatree Dog com as cores da marca (Claude)
- Origem → destino: Claude → ChatGPT e próximas sessões do Claude.
- Pedido e objetivo: o Rodrigo pediu para mudar só as cores do painel da `quatree-dog`: vermelho #C8102E, vermelho escuro #8B0A1F, prata #B8BCC2, branco e texto #2B2B2B.
- Logo: não há logo oficial da Quatree no repositório nem nas branches da Quatree. As cores são as passadas pelo Rodrigo, sem conferência pela logo.
- Executado: tema `html[data-client-theme="quatree-dog"]` em `public/client-lite.css`; `CLIENT_THEMES` em `public/client-lite.js` aceita tema sem logo (a marca do NEXUS fica); versões de cache em `public/portal.html`; teste em `cloudflare/test/nexus-logo-brand.test.mjs`.
- Decisões: prata só em bordas e detalhes. Verde de aprovar e WhatsApp e laranja de aviso ficaram mais escuros só neste tema, para leitura. Selos de formato usam 4 tons diferentes.
- Evidências: Chrome sem tela, demonstração com o tema forçado, 1280 px e 390 px, 12 itens de menu e 4 abas de Posts. Sem contraste baixo e sem azul restante. Mesmos botões e abas antes e depois. Daniela e cliente sem tema continuam iguais. Testes 777/778; a falha é a do cron por CRLF no Windows.
- Não conferido: painel real da Quatree e cartão de seguidores, que a demonstração não desenha. O Calendário foi visto com resposta simulada, porque na demonstração essa rota pede login.
- Estado: PR aguardando revisão. Não implantado.
- Próximo passo: depois do merge e do deploy, abrir o painel real da Quatree e conferir Início, Posts e Números.
- Bloqueios / autorização: o merge depende do OK do Rodrigo, porque mexe em `public/` e publica no site.

## 2026-11-04 20:30 BRT — Grupos de clientes: Quatree Dog com Ericsson e Eduardo (Claude)
- Pedido: criar grupos; campanha do grupo sobe para todos os vendedores com as mesmas imagens, legenda com o nome do vendedor e um pouco diferente; painéis com logo e cores da Quatree.
- Executado: `CLIENT_GROUPS` e `clientGroup` em `cloudflare/src/clients.js`; `cloudflare/src/client-groups.js`; destino `grupo:quatree-dog` em Master, Enviar artes e conector; campo Vendedor na Conta do painel e na tabela do Master; topo "Olá, Quatree Dog — Vendedor <nome>".
- Eduardo: cliente `quatree-dog-eduardo`, criado sozinho na primeira abertura do Master depois do deploy, em `setup`, sem Instagram e sem senha.
- Decisões: grupo fica no código, como `CLIENT_THEMES`, porque migrations não rodam no deploy. Legenda varia por modelo fixo, sem IA. Vendedor que não é o 1º perde linhas com telefone ou @ do outro. Campanha de grupo sempre vai sem moldura, para as imagens serem iguais.
- Limite: `agendamentos/` por pasta ainda não aceita grupo. Reenvio só evita duplicar quando a campanha tem dia e hora.
- Estado: PR aguardando revisão, não implantado. Nada foi criado em produção.
- Próximo passo: depois do merge e do deploy, abrir o Master, definir a senha do Eduardo e conectar o Instagram dele.

## 2026-11-04 03h BRT — Instagram @nexusai_system: auditoria + campanha de 7 dias (só documentação)

- Pedido do Rodrigo: auditar o Instagram antigo do Global Play, agora renomeado para Nexus (@nexusai_system), e criar estratégia de 7 dias para ele começar as artes no ChatGPT. Perfil vai funcionar igual ao da Flow Arts.
- Feito no navegador (com o OK dele): categoria trocada para "Serviço de marketing na internet"; e-mail comercial trocado para o da Flow Arts. Link extra `globalplay.fun` ficou: o Instagram não deixa editar links nesta conta agora.
- Erro 409 ao criar o cliente no Master: o cliente `nexus-ai` já existia (status setup). Não foi criado outro.
- Criado `docs/nexus-memory/CAMPANHA_NEXUS_AI_7D.md` (05/11 a 11/11): auditoria, posicionamento, grade 09h carrossel 4 cartões + 12h post + 19h post + 3 stories, temas por dia e regras de envio para `agendamentos/clientes/nexus-ai/`.
- Nenhum código, deploy ou publicação.
- Pendências: arquivo da logo N do Nexus (não existe no repositório); conexão do Instagram ao painel; decisão do Rodrigo sobre arquivar os 155 posts antigos.
- Próximo passo: Rodrigo cola no ChatGPT o prompt do fim do arquivo e faz o dia 05/11.

## 2026-11-04 20:50 BRT — Planos em cartões no celular (Claude)
- Pedido: na Conta dos clientes, trocar a tabela "Planos e upgrade" por 3 cartões empilhados só no celular; no computador manter a tabela; sem mudar preços, textos e botões.
- Executado: `public/planos.js` gera tabela e cartões com as mesmas peças. `public/client-lite.css` troca por CSS abaixo de 900 px, o mesmo limite do menu de celular.
- Decisão: vale para todos os clientes, inclusive a Daniela, porque a tela é compartilhada e o pedido fala do painel dos clientes.
- Evidências: Chrome sem tela, 390 e 1280 px, sem tema, Daniela e Quatree, com planos simulados: 3 cartões empilhados, textos e links iguais aos da tabela, sem rolagem lateral.
- Observação: a etiqueta "Seu plano" (`.tag-ok`) tem contraste 3,14 fora dos cartões novos, igual a antes. Foi corrigida só nos cartões.
- Estado: PR aguardando revisão, não implantado. Não conferido com login real.
- Próximo passo: depois do merge, abrir a Conta no celular.

## 2026-11-03 23h BRT — Pacote do painel: aviso, planos, campanha nova, David, testes e auditoria (PR aberto)

- Pedido do Rodrigo: fazer todas as etapas restantes do repasse do ChatGPT num PR só.
- **Aviso vermelho** no topo do cartão do post (logo abaixo do selo Feed/Carrossel/Stories), no painel do cliente: "Se não pedir ajuste até DD/MM às HH:MM (1 hora antes), este post será publicado automaticamente." Depois do prazo: "Prazo de ajuste encerrado…". Mesma regra do `auto-approve.js`; não aparece em post de IA, reajuste pedido, post sem janela de 1 hora ou aprovado pelo próprio cliente. Botão Aprovar não mudou.
- **Tabela de planos** (planos.js): Resposta R$ 39,99, Postador R$ 97, Combo R$ 119,99 (economize R$ 17), cada um com cor; botão "Solicitar este plano" abre o WhatsApp comercial 21 96481-6185 com o plano escrito. Preços lidos do catálogo `plans.js`.
- **Campanha diária da Flow Arts** (`conteudo.json`, primeiro-teste): 3 dias reescritos só para automação do Instagram (sem Captador/leads). Conferido por render com foto falsa: texto inteiro, sem corte.
- **David (WhatsApp)**: preço R$ 39,99, combo R$ 119,99, tirado Captador/Essencial/Completo.
- **Radar**: volta da conexão do Instagram só leva ao Radar a Flow Arts.
- **Testes**: 6 testes antigos atualizados para as decisões novas (Master verde, R$ 39,99, combo, site sem vídeo antigo). Suíte 768/768. Wrangler dry-run não rodou aqui (sem rede para npm); o CI roda.
- Auditoria completa: `AUDITORIA_2026-11-03.md`.

## 2026-11-03 22h BRT — Publicação automática após 1 hora de silêncio (PR aberto)

- Pedido do Rodrigo (repasse do ChatGPT, item 2): post que ele mandou ao painel sai no horário mesmo sem o cliente clicar; só trava se o cliente pedir reajuste.
- Feito: agente novo `cloudflare/src/auto-approve.js`, no cron de 1 minuto. Quando falta 1 hora para o horário, post `pending` com `createdBy` master ou mcp (Master, Enviar artes, conector, Biblioteca, campanha Gemini) vira `approved` e ganha `autoApproval.status = "aprovado_por_silencio"`. Publicação, tentativas (retryCount < 3) e trava de duplicar continuam as que já existiam no Publisher.
- Não aprova: reajuste pedido (`correction_requested`) ou post já refeito por reajuste (`revisionRequestedAt`), cancelado, excluído, reprovado, publicado, post criado pelos agentes de IA, post atrasado mais de 6 horas. Post que chegou com menos de 1 hora de antecedência fica esperando e é marcado `sem_janela`.
- Testes: 7 novos (SQLite real). Suíte: 754/760; as 6 falhas já falham na main (testes antigos de cor azul do Master, marca, site e planos).
- Pendente (próximos passos, um por vez): aviso vermelho no topo da arte no painel do cliente; tabela de planos; auditoria logo/Radar/alcance; legendas antigas com Captador.

## 2026-11-03 10h BRT — Hashtag #FlowArts trocada por #FlowArtsMarketing

- Motivo: #flowarts no Instagram é a hashtag de malabarismo (poi, bambolê). Rodrigo pediu para tirar.
- Feito: troca em `cloudflare/src/client-brand.js`, `cloudflare/src/gemini-campaign.js`, `gemini/clientes/flow-arts.md` e legendas de `scripts/social/campanha/conteudo.json`. Testes do Worker: 753/753.
- Atenção: legendas já salvas em `agendamentos/` (branch agendamentos) não foram mexidas; conferir antes de aprovar.
- Pendente: `conteudo.json` ainda tem legendas falando do Captador/leads; reescrever para o novo foco (só automação do Instagram).

## 2026-11-02 23h BRT — Sistemática de imagens do ChatGPT + novo foco Flow Arts

- Pedido do Rodrigo: o ChatGPT se embolava em campanhas de 7 dias (imagens duplicadas, mosaico, logo errada).
- Feito: criado `docs/nexus-memory/SISTEMATICA_IMAGENS_CHATGPT.md` e aviso no `AGENTS.md`. Só documentação; nenhum código, deploy ou publicação.
- Decisão do Rodrigo: Flow Arts foca só na automação do Instagram; campanhas sem busca de leads; tirar a hashtag #flowart.
- Pendente (03/11): tirar #flowart das legendas geradas pelo código dos painéis; repaginar o site (trocar vídeo do fundo).

# Passagem de trabalho — Claude Code → ChatGPT

## 2026-11-01 — Quatree Dog: campanha de carrosséis por linha (7 dias) passada ao ChatGPT

- Pedido do Rodrigo: 3 carrosséis por dia, 2 imagens cada, 7 dias, um produto real por carrossel, uma linha de ração por dia, **igual à imagem de referência** que ele mandou.
- Regras e plano em `docs/nexus-memory/clientes/quatree/CARROSSEL_LINHAS_7D.md`.
- Claude fez 1 carrossel de teste (Supreme), mas não ficou igual ao modelo. Gerador de imagem do Claude sem créditos. **Produção fica com o ChatGPT.**
- A imagem de referência e o PDF do catálogo **não estão no repositório**: o Rodrigo anexa no chat do ChatGPT.
- Nada enviado ao painel. Próximo passo: ChatGPT faz o Dia 1 (3 carrosséis Supreme), mostra ao Rodrigo e envia ao painel `quatree-dog` esperando aprovação.


## 2026-10-29 22h25 — Texto nas artes: busca corrigida (PR aberto)

- Conferido em produção depois da v3: nenhum post novo entrava na fila. Causa: no SQL, `NOT (artChecked = 1 AND ...)` com artChecked NULL dá NULL e a linha some. Só o post com artChecked da v1 entrava.
- Correção: COALESCE na condição. Teste novo roda a busca num SQLite de verdade (`node:sqlite`).
- Próximo passo: depois do deploy, conferir as 7 peças de 30/10 da Flow Arts (1 passo por minuto, ~15 min).

## 2026-10-29 22h15 — Cliente nova Daniela Martins: padrão e prompt (PR aberto)

- Auditoria do Instagram @daniela_martins1547 feita no navegador (resumo na ficha).
- Padrão: tema `daniela` (café escuro + dourado, nome escrito por código, sem logo oficial ainda) e 5 textos de feed + 2 de story em `textos_upload.json`. Prévia conferida: texto inteiro, sem corte.
- Ficha: `docs/nexus-memory/clientes/daniela-martins/README.md`. Prompt do ChatGPT: `PROMPT_CHATGPT.md` na mesma pasta.
- Texto nas artes v3 (mesmo PR): conferido em produção que só 1 das 7 peças de 30/10 da Flow Arts foi feita; a rodada de 1 minuto estourava o tempo e travava a fila. Agora cada rodada faz um passo só (conferir OU escrever uma imagem) e salva em `formatBuild.artSteps`; post que falha 4 vezes é marcado e a fila anda. Testes 684/685.
- Pendente: ela aceitar o convite de testador e conectar o Instagram no painel; ligar a resposta automática QUERO no painel dela.

## 2026-10-29 21h55 — Texto nas artes v2 (PR aberto)

- Conferido em produção (dados do painel da Flow Arts): o agente rodou, mas só 1 post por rodada e a IA marcou a foto do homem na janela como "já tem texto" (letreiros dos prédios). Os outros posts de 30/10 ficaram sem conferir.
- Correção: pergunta nova para a IA (só conta título/frase de arte por cima; letreiro, marca e relógio não contam), `artCheckVersion: 2` para reconferir os posts já marcados pela v1, e o agente passou para o cron de 1 minuto (1 post por vez).
- Testes: 683/684 (falha antiga em gemini-campaign).
- Próximo passo: Rodrigo aprovar o merge; em até ~10 minutos os posts de 30/10 da Flow Arts ganham o texto. Conferir no painel.

## 2026-10-29 21h30 — Regra fixa: texto do Nexus em toda imagem enviada sem texto (PR aberto)

- Pedido do Rodrigo: imagens que ele sobe pelo painel do cliente chegavam sem texto; quer que toda imagem enviada ao painel de qualquer cliente receba as frases do Nexus e entre no formato sem cortar.
- Causa: a moldura de texto (`art-frame.js`) só rodava no conector MCP; o envio pelo painel do cliente e pelo "Enviar artes" do Master (`createClientUpload`) pulava essa etapa.
- Correção: `createClientUpload` (client-uploads.js) agora, para feed, carrossel e story em imagem: a IA grátis do Cloudflare só responde SIM/NAO "já tem texto?"; se NAO, o Nexus cola a moldura do cliente (logo, título, vantagens, botão, número do cartão no carrossel); se SIM ou na dúvida, não escreve por cima e só ajusta o formato sem cortar. Capa de Reels nunca recebe moldura. `jaTemTexto=1` pula a checagem (o conector já usa).
- Só vale para clientes com moldura em `scripts/social/campanha/textos_upload.json` (Flow Arts, GILTEC, Maskara, Quatree). Cliente novo precisa ganhar textos lá.
- Testes: 682/683; a única falha (`gemini-campaign.test.mjs`) já falha na main.
- Agente novo "Texto nas artes" (`cloudflare/src/art-text-fix.js`, cron de 15 min, 6 posts por rodada): passa em todos os painéis nos posts que ainda não saíram, uma vez por post (`formatBuild.artChecked`), e coloca a moldura nas imagens sem texto que já estavam lá. Assim o Rodrigo não precisa pedir de novo.
- Também em 29/10: carrossel da Flow Arts de 30/10 às 15h (3 imagens inéditas, texto do Nexus) enviado pelo conector, esperando aprovação. Imagens no ramo `midia-flowarts-2026-10-30`.
- Próximo passo: Rodrigo aprovar o merge do PR #467; até 15 min depois do deploy, os 6 posts/stories de 30/10 da Flow Arts ganham o texto sozinhos.

## 2026-10-29 21h — Convite de testador do Instagram no cadastro de cliente (PR aberto)

- Pedido do Rodrigo: ao criar o painel de um cliente novo, já facilitar o convite de testador do Instagram, enquanto o app da Meta não está Live; depois o passo é retirado.
- Limite real: a Meta não tem API pública para adicionar testador do Instagram nem para ler se o convite está pendente. Adicionar o @ continua sendo um clique manual do Rodrigo na Meta. Decisão do Rodrigo: opção semiautomática (sem robô de navegador).
- Master (Novo cliente): campo novo "Instagram do cliente"; o @ é salvo em `clients.instagram` (validado em `cloudflare/src/master.js`). Depois de criar, aparece o cartão "Convite de testador (Meta)" com o botão "Copiar @ e abrir Meta". O texto de "Copiar acesso" ganha a linha para aceitar o convite.
- Painel do cliente (`public/client-lite.js`): quando não conectado, mostra 2 passos grandes: 1) Abrir convite (instagram.com/accounts/manage_access, aba Convites de testador) e 2) Conectar Instagram. Chave `MODO_TESTE_META = true`; quando o app ficar Live, mudar para false e o passo 1 some.
- Testes: 680/681; a única falha (`gemini-campaign.test.mjs`, fila do Master) já falha na main sem esta mudança.
- Próximo passo: Rodrigo aprovar o merge; criar a cliente nova pelo Master com o @ dela.

## 2026-10-29 — Limpeza de 2 dias também no CRM da Flow Arts (PR aberto)

- Pedido do Rodrigo: limpar do CRM da Flow Arts os contatos que ficaram 2 dias sem mensagem e aplicar a auto limpeza a todos os clientes.
- Diagnóstico: a regra de 28/10 (`cleanupLeads`, captador.js) já vale para o Captador de todos os clientes, mas o CRM da Flow Arts usa outra tabela (`crm_contacts`, daily-prospects.js) e não tinha a regra; havia contatos "atrasado 8 dias".
- Correção: `archiveStaleCrm` em `cloudflare/src/daily-prospects.js`, chamada a cada ciclo de `runDailyProspects`. Arquiva (não apaga) contato em "Para chamar" sem mensagem e criado há mais de 2 dias; quem já recebeu mensagem fica. Teste novo em `test/daily-prospects.test.mjs`.
- Testes: 637/638; a única falha (`gemini-campaign.test.mjs`, fila do Master 4 !== 6) já falha na main sem esta mudança.
- Também em 29/10: artes da Maskara (9) e da Flow Arts (5) feitas por código no padrão do Nexus e enviadas por Enviar artes para 29/10, esperando aprovação. Nada aprovado nem publicado pelo assistente.
- Observação: a busca diária da Flow Arts ainda usa `FOCUS_NICHES` de comida (21/10), mas o foco da Flow Arts mudou em 23/10 para vendedores que precisam de leads. Ajuste pendente, depende do Rodrigo.
- Próximo passo: Rodrigo aprovar o merge do PR; depois do deploy, o próximo ciclo (15 min) arquiva os contatos antigos.

## 2026-10-28 — Atualização: logo recebida e pacote correto 3 posts + 3 stories

- Pedido mais recente de Rodrigo corrige o escopo: **3 posts, sendo 1 carrossel, e 3 stories**, somente 28/10/2026. Campanha permanece diária, não mensal.
- Logo original recebida e salva em `docs/nexus-memory/clientes/giltec/logo-giltec.png` na main, commit `14fca6681715f14652d551db8a7566ec1249c375`; blob relido `f4224d2c73ce36ba3c95695252d46314d77ccd3e`. SHA-256 original: `3ef3e00415d42537120342a3082baa76f7eeef8816d3c0796c25f169f4788871`. PNG original preservado, sem redesenho nem mudança de cor; nenhuma imagem .b64 ou staging criada.
- 7 imagens finais entregues: 09h carrossel com compactador e betoneira (2 cartões separados); 12h post martelete; 19h post gerador; stories exclusivos de construção residencial, reforma comercial e obra viária. Stories usam cenas de contexto sem repetir equipamento nem inventar produtos de locação. Não reutilizam fotos dos posts.
- Logo original composta por cima em todos os 7 PNGs, tamanho nativo 245×238, sem modificar os pixels. Posts 1080×1350, stories 1080×1920; logo em posição superior direita, com margem segura de topo nos stories. Só a marca contém texto; demais chamadas ficam fora da foto.
- Verificação: inspeção visual do conjunto, 7 hashes distintos, comparação pixel a pixel da logo aprovada, `checar-arte.py` aprovado. ZIP íntegro com imagens, logo, legendas e instruções.
- Legenda 09h atualizada para carrossel no commit `4d22e3156cfc7e34d4c389a0c79a13b0a04431c1`; demais legendas mantêm WhatsApp da Rose, QUERO e hashtags RJ.
- **Painel: ZERO novos uploads confirmados.** Aberta /artes.html; mensagem observada: “Entre no Master primeiro. Depois volte para esta página.” Sem sessão autenticada, envio bloqueado. Não houve aprovação ou publicação. Aplicado fallback autorizado pelo usuário: entrega do pacote final no chat.
- Entrega persistida: GILTEC_2026-10-28_Com_Logo.zip, arquivo `libfile_6c06b4b272a08191933f4aff1417e446`. As imagens finais estão no pacote entregue, NÃO afirmar que foram gravadas na pasta agendamentos remota. Logo e legendas estão no GitHub.
- Próximo passo: enviar os 7 arquivos pela página Enviar artes, cliente GILTEC, dia 28/10, agrupar os dois cartões no mesmo post e selecionar os 3 stories. Conferir conteúdos antigos para evitar duplicação. Não mudar a data automaticamente.
- Esta entrada substitui estados anteriores “logo não recebida” e “somente 3 feeds”. Regra permanente de logo original e envio direto após finalização continua válida; login do Master é o bloqueio atual. Cadastro operacional D1 não alterado; cadastro documental atualizado.


## 2026-10-28 — Regra permanente da logo oficial GILTEC

GILTEC: toda arte, de toda campanha, leva a logo oficial (docs/nexus-memory/clientes/giltec/logo-giltec.png). A IA não escreve texto dentro da imagem; a logo é aplicada por cima depois que a imagem fica pronta. Nunca recriar ou redesenhar a logo: usar sempre o arquivo original.

- Aplicar o arquivo original no canto inferior direito ou superior, sem cobrir o equipamento, em tamanho legível e discreto, preservando cores, letras e proporções.
- Fluxo autorizado por Rodrigo: terminou as imagens com a logo → enviar diretamente ao painel GILTEC, esperando aprovação, sem pedir novamente. Não aprovar nem publicar. Em erro, informar e entregar as imagens para Enviar artes.
- Campanha diária. Escopo atual: as três imagens de 28/10/2026 (compactador, martelete e gerador), sem gerar campanha de 30 dias.
- **Estado real:** regra documentada; arquivo original da logo não foi disponibilizado como anexo acessível nesta mensagem. O caminho acima é o destino definido, NÃO comprovação de arquivo salvo. Aplicação da logo e envio das três imagens permanecem pendentes do original. Nenhum upload novo realizado nesta etapa.


## 2026-10-28 — GILTEC diária: três imagens entregues no chat; envio manual pendente
- Origem: ChatGPT → Claude/Rodrigo. Entrada adicionada pelo ChatGPT a pedido expresso do Rodrigo; histórico preservado.
- Escopo confirmado: SOMENTE 28/10/2026. Campanha GILTEC é diária; não produzir 30 dias. Pedido atual exige imagens sem texto, com espaço para composição pelo sistema.
- Continuidade: main consultada em `6e452903bc6385750769daa1ebb65e75a73ba052`, cujo título registra exclusão da campanha GILTEC 28/10 para refação. Pasta GILTEC ausente nessa árvore. O envio histórico Actions 40594908362 foi verificado nos logs: três uploads antigos (09h carrossel, 12h e 19h feeds). Isso NÃO comprova o estado atual do painel nem o cancelamento das peças antigas.
- Produção desta sessão: 3 imagens novas individuais, geradas sequencialmente e mostradas imediatamente no chat: 09h compactador/placa vibratória em obra viária; 12h martelete/rompedor em reforma interna; 19h gerador em canteiro externo ao fim da tarde. Nenhum story, Reel ou carrossel novo. Grade simplificada para três feeds conforme escopo de posts de hoje e equipamentos confirmados, sem repetir equipamento.
- Imagens ilustrativas de IA, sem headline/logo incorporada; não são fotografias do estoque real. Dimensões reais 1122×1402, aproximadamente 4:5 (não 1080×1350). Conferência visual realizada; checar-arte.py passou e os três SHA-256 são distintos.
- Legendas salvas em main: `agendamentos/clientes/giltec/2026-10-28/{0900,1200,1900}/legenda.txt`. Chamada ao WhatsApp da Rose sem inventar número, palavra QUERO conforme CAMPANHA_GILTEC.md e hashtags RJ. Commits: 913f85908164f37a96aebc7b7c586d4da1b788dc, 1275f94a11144479477afd0ed99117af30209f7b, 78e4a54dd57b6b7092c4e1ba7f7219fe5b996d1b.
- Bloqueio comprovado: `git push --dry-run` falhou por ausência de autenticação HTTPS. Não usar Base64 nem staging, não modificar workflows. Aplicada alternativa expressamente autorizada: imagens entregues no chat para página Enviar artes.
- Estado: 3 imagens geradas/entregues e 3 legendas gravadas. ZERO imagens novas enviadas ao painel nesta sessão; nenhuma aprovação/publicação realizada. Não afirmar campanha concluída no painel.
- Próximo passo exato: Rodrigo salvar as três imagens do chat, abrir /artes.html, selecionar GILTEC e 28/10/2026 e enviar como três posts individuais, aguardando aprovação. Conferir primeiro se as peças antigas foram canceladas para evitar duplicação. Horários são slots editoriais; o script recusa horários já passados, sem autorização para transferir a campanha para outro dia.


Este arquivo é preenchido pelo **Claude Code** ao fim de cada sessão relevante para o Nexus / Flow Arts. Não é preenchimento automático nem acesso aos prompts privados do Claude. Consulte `BRIDGE_PROTOCOL.md` e `TASK_BOARD.md`.

## 2026-10-27 23h20 BRT — GILTEC: imagens repetidas e carrossel cortado
- **Pedido do Rodrigo:** a campanha da GILTEC só tem betoneira; o ChatGPT repete mesmo orientado. Corrigir o possível.
- **Visto nas artes de 28/10 (`agendamentos/clientes/giltec/2026-10-28/`):** betoneira em 3 peças; compactador, martelete e gerador repetidos entre carrossel e stories. Os 5 cartões do carrossel são tiras estreitas e borradas no meio de um fundo azul liso (imagem larga cortada). O print do painel do Rodrigo mostrou o mesmo post "Soluções em locação" duas vezes e tudo como "Aprovado · será publicado".
- **Feito (branch `fix/giltec-artes-qualidade`):** `.github/scripts/checar-arte.py` + chamada em `agendar-pasta.sh`: recusa arte com faixa vazia de cor lisa nas laterais ou em cima/embaixo (os 5 cartões da GILTEC seriam recusados; 56 exemplos de nicho, Quatree e os outros posts passam). Workflow instala Pillow. Regras novas em `CAMPANHA_GILTEC.md` (um equipamento por peça, betoneira no máximo 1 por dia, rodízio de cenas, cartões inteiros); ponteiros em `AGENTS.md` e `BRIDGE_PROTOCOL.md`.
- **Não feito:** cancelar no painel (a sessão não tem login de Master). Os 3 stories da GILTEC de 28/10 **não** foram reenviados (repetem equipamento do carrossel).
- **Próximo passo:** Rodrigo cancelar no painel o carrossel das 09h de 28/10 e o post repetido; ChatGPT refazer o carrossel e as peças seguindo `CAMPANHA_GILTEC.md`; Rodrigo dizer quais outros equipamentos a GILTEC aluga.

## 2026-10-27 23h BRT — GILTEC: Captador de construção, 10 por dia com WhatsApp, mensagem da Rose
- **Origem → destino:** Claude → ChatGPT
- **Pedido do Rodrigo:** a GILTEC aluga equipamentos de construção civil. O CRM/Captador do painel dela deve buscar construtoras, obras em rodovias, reformas e tudo ligado a construção; colocar 10 contatos com WhatsApp por dia no painel; mensagem pronta da vendedora **Rose**, da **GILTEC Locações**.
- **Feito (branch `feat/giltec-captador-construcao`):** `CAPTADOR_EXTRA_NICHES` em `cloudflare/src/captador.js` (Construtora, Engenharia civil, Terraplenagem, Pavimentação e obras em rodovias, Reformas e empreiteiras), só para o Captador dos clientes (os 21 nichos da vitrine e o Caçador do Master não mudam). No mapa grátis, também procura pelo NOME (construtora, engenharia, terraplenagem, asfalto, rodovia, reforma, empreiteira). Ramo de construção/locação → esses tipos + Material de construção. Busca diária com opção **"Só empresas com WhatsApp (celular)"** (ligada por padrão nesse ramo; 4 buscas por rodada). `CAPTADOR_PRESETS.giltec`: Captador ligado, limite 600 buscas/mês, busca diária ligada, mensagem "Aqui é Rose, da GILTEC Locações" + o que ela aluga + pedido para mandar a lista e os valores. O preset só vale enquanto o cliente não salvar outra coisa no painel.
- **Testes:** `test/captador-giltec.test.mjs` (5 novos); suíte 607/607. Busca real no mapa grátis não testada daqui (rede da sessão bloqueia).
- **Limite honesto:** o mapa grátis tem poucas empresas com celular. Em cidade pequena pode dar menos de 10 por dia; mais cidades ajudam.
- **Cidades (Rodrigo, 27/10 22h28):** estado do Rio de Janeiro inteiro. `RJ_STATE_CITIES` (92 cidades, das maiores para as menores) em `captador-regions.js`, padrão do preset da GILTEC; limite 1.500 buscas/mês (mapa grátis, sem custo). A busca roda cidade por cidade, com os 6 tipos em cada uma. Suíte 607/607.
- **Pendente:** merge com o OK do Rodrigo (publica o Worker). Depois, conferir no painel da GILTEC a aba "Separadas hoje" no dia seguinte.

## 2026-10-27 22h40 BRT — Volta o envio de imagens pelo ChatGPT no modo Work (os dois jeitos valem)
- **Origem → destino:** Claude → ChatGPT
- **Pedido do Rodrigo:** o ChatGPT no modo Work criava a campanha e subia as imagens direto para o painel do cliente; manter esse jeito **e** a página Enviar artes.
- **Diagnóstico (Actions de hoje):** o modo Work SOBE imagens. Quatree Dog 28/10 entrou no painel (execução 40597414392: 1 carrossel + 3 stories, esperando aprovação). GILTEC 28/10: 3 posts entraram (40594908362), mas os **3 stories não**. Erros do envio: (1) GILTEC foi primeiro para a raiz `agendamentos/2026-10-28/`, que é o **painel da Flow Arts** (40592878378: 6 peças da GILTEC entraram no painel da Flow Arts); (2) depois foi para pasta sem data (`clientes/giltec/0900/`), que era ignorada em silêncio e travou os stories como "imagem repetida"; (3) o retry só mexeu nas legendas, então os stories não foram tentados de novo; (4) o reenvio manual por data nunca achava pastas de clientes.
- **Corrigido (branch `fix/work-envio-imagens`):** `.github/scripts/achar-slots.sh` novo (pasta errada vira erro com o caminho certo; mudou um arquivo de um dia de um cliente → o dia inteiro é conferido, sem duplicar); `agendar-pasta.sh` não compara imagem com pasta errada; reenvio manual por data acha `clientes/<id>/AAAA-MM-DD`. Regras dos dois jeitos no topo de `BRIDGE_PROTOCOL.md` e `REGRA_POSTS_DIARIOS.md`; `KNOWN_ISSUES.md` e `agendamentos/README.md` atualizados.
- **Testes:** casos reais de hoje simulados (pasta sem data → erro; retry só de legenda → inclui os stories; Quatree → 4 pastas); modo seco do envio ok com cópia em pasta errada; YAML e `bash -n` ok; suíte Worker 602/602.
- **Pendente (precisa do OK do Rodrigo):** merge do PR; depois reenviar 28/10 (Actions → Run workflow, data 2026-10-28) para os 3 stories da GILTEC; e cancelar no painel da **Flow Arts** as 6 peças da GILTEC que caíram lá por engano.

## 2026-10-27 22h BRT — Tema do Manus, botão "Sair" e página "Enviar artes"
- **Origem → destino:** Claude → ChatGPT / Manus
- **Pedido do Rodrigo:** corrigir o painel do cliente "sem opção de sair", auditar o tema trocado com o Manus, achar alternativa para o envio de imagens que o ChatGPT não consegue fazer e atualizar esta memória.
- **Auditoria do tema (commits bd4ae4e e ec8f34f, Manus, direto na `main`, já publicados):**
  1. O menu lateral do computador ficou com altura fixa e `overflow: hidden`: em telas baixas (notebook) os últimos itens eram cortados, inclusive **Conta**, onde fica o "Sair do painel". Por isso o cliente "não achava" como sair.
  2. O botão "Sair do painel" era cinza-claro, sem destaque, no fim da aba Conta.
  3. O topo tinha `min-height: 112px` numa linha de 92px e invadia o conteúdo.
  4. O aviso da demonstração ficou branco sobre fundo branco (ilegível) no computador.
  - IDs, rotas, aprovação e conexão Meta não foram alterados pelo Manus (conferido no diff).
- **Corrigido (branch `fix/portal-sair-tema-manus`):** botão **Sair** fixo no topo (computador e celular) + botão da aba Conta em destaque, os dois com confirmação; menu lateral com rolagem e versão compacta em telas baixas; topo com altura automática; aviso da demonstração legível. Arquivos: `public/portal.html`, `public/client-lite.css`, `public/client-lite.js` (cache `css v131`, `js v130`). Na demonstração os botões de sair continuam escondidos.
- **Testes:** `node --test` 600/600; `node --check` ok; conferido em navegador sem interface (1366×620 e 390×844) com a página de demonstração. Painel real com login não testado.
- **Envio de imagens pelo ChatGPT — diagnóstico:** o conector do GitHub do ChatGPT só grava texto. Imagens (PNG/JPG) não sobem; a tentativa de 27/10 com arquivos `.b64` foi revertida (ae0a425). Não é erro do Nexus.
- **Decisão do Rodrigo:** página **Enviar artes** (`/artes.html`). Ele salva as imagens do ChatGPT no celular e escolhe todas de uma vez; a página monta posts (09h/12h/19h, 2+ imagens = carrossel) e stories (09h, 10h30, 12h, 16h, 19h), puxa a legenda de `agendamentos/.../HHMM/legenda.txt` no GitHub e envia pela rota já existente `/api/master/upload`, **esperando aprovação**. Bloqueia imagem repetida e horário já ocupado (`noDuplicate`). Converte HEIC/arquivo grande para JPEG no celular.
- **Servidor:** `GET /api/master/legendas` (só com login do Master) lê as legendas pelo endereço raw do GitHub (branch `agendamentos`, depois `main`). `agendar-pasta.sh`: pasta só com legenda vira aviso, não erro.
- **Regra nova para o ChatGPT:** em `REGRA_POSTS_DIARIOS.md` e `BRIDGE_PROTOCOL.md` (topo). Permissão: escrever em `docs/nexus-memory/` e `agendamentos/`; código só por PR.
- **Testes:** suíte 602/602 (2 novos); página testada em navegador sem interface com servidor falso: 8 imagens → 1 carrossel + 2 posts + 3 stories, repetida barrada. Produção não testada.
- **Deploy:** nenhum. Merge na `main` publica sozinho; só com o OK do Rodrigo.
- **Próximo passo:** Rodrigo aprovar o PR #425; depois testar o "Sair" e a página Enviar artes no celular, com um dia de teste.

## 2026-10-24 10h05 BRT — Combo Completo + Tráfego e upgrade pelo painel do cliente
- **Decisão do Rodrigo:** combo **Completo + Tráfego por R$ 897/mês** (separado R$ 1.094; economia de R$ 197). A verba do anúncio continua à parte, no cartão do cliente.
- **Feito:** plano `completo-trafego` (dá Captador e Tráfego), opção "➕ Adicional com desconto" dentro do card do Completo no site; `cloudflare/src/upgrades.js` + `public/planos.js`: na aba Conta do painel, "Planos e upgrade" com todos os planos (base, adicionais e avulsos), Pix copia e cola com o valor e botão "Já paguei"; `public/upgrades-master.js`: em Clientes, "Clientes mudando de plano" com Aprovar/Recusar. Aprovar: plano base troca o plano (guarda o antigo em `planHistory`), adicional liga o Captador/Tráfego, avulso fica em `purchases` para o Rodrigo entregar.
- **Regra atual:** a troca de plano cobra o 1º mês cheio do plano novo (sem proporcional). Rodrigo pode pedir para cobrar só a diferença.
- Testes: 600/600.

## 2026-10-24 09h50 BRT — Tráfego pago: botão Impulsionar pronto, desligado até a Meta liberar
- **Decisões do Rodrigo (24/10):** a verba do anúncio é paga no **cartão do cliente, direto na Meta** (não passa pela Flow Arts); a Flow Arts cobra a gestão no plano **Tráfego, R$ 397/mês** (Pix, como os outros planos).
- **Feito:** `cloudflare/src/ads.js` (pedido de impulsionamento, conexão pelo login do Facebook com Página + conta de anúncios, criação de campanha → conjunto → criativo do post do Instagram → anúncio com botão do WhatsApp; apaga a campanha se der erro no meio), rotas `/api/portal/ads*` e `/api/master/ads`, plano `trafego` em `plans.js`, `public/ads.js` (botão "🚀 Impulsionar" nos posts publicados, formulário com valor/dia, dias, cidade, raio e confirmação do total; bloco "Anúncios" em Conta), bloco "Tráfego para clientes" no Master, card do plano e pergunta no site. O login do Facebook usa o mesmo retorno do Radar (`/api/oauth/facebook/callback`), sem configurar nada novo no app.
- **Desligado:** só funciona com `NEXUS_ADS=on` na Cloudflare, depois que a Meta aprovar `ads_management` (e a verificação da empresa). Enquanto isso o painel mostra "aguardando liberação" e guarda quem tentou impulsionar (aparece no Master).
- **Não testado com a Meta de verdade** (sem permissão ainda). Testes locais: 597/597. Ao ligar, testar primeiro com a Flow Arts e R$ 10/dia.
- **Próximo passo:** pedir na análise do app da Meta as permissões `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`; depois criar `NEXUS_ADS=on`.

## 2026-10-24 08h00 BRT — Site: vídeos com som, Captador animado e pacote para pessoa física (PR #406)
- **Pedido do Rodrigo:** continuar as alterações do site flowarts.com.br.
- **Feito (branch `site-som-captador`, `public/site.html` e 2 vídeos):** vídeos da obra e do Reel com som (começam mudos; a pessoa liga). O painel do Captador no topo troca de busca sozinho: 5 exemplos (construtoras BH, distribuidoras Campinas, galpões Curitiba, transportadoras Goiânia, lojas de materiais Recife), cada um com mensagem pronta. Nomes ilustrativos. Parado para quem pede menos movimento; pausa fora da tela.
- **Testes:** 594/594, sobre a `main` 5dde3bc.
- **Pacote pessoa física (pedido do Rodrigo, 24/10):** site mostra "Você vende para empresas?" (Captador + Essencial) e "Você vende para pessoa física?" (Essencial ou Completo, só Instagram) e uma pergunta nova no FAQ. No painel do cliente, quem vende para pessoa física não vê a aba Buscar. No Master (Prospecção › Captador para clientes) há a caixinha "Vende para pessoa física". Padrão automático pelo nicho (despachante, CAC, armas = pessoa física; resto = empresas). `cloudflare/src/captador.js` (`audience` no acesso), `public/captador.js` v11, `public/prospects-ui.js` v16.
- **Pendente:** Rodrigo apontou que o vídeo `reel-vendedor-2.mp4` fala "cliente" duas vezes; a sessão não tem como transcrever o áudio, então espera ele dizer o trecho.
- **Estado:** PR #406 aguardando o OK do Rodrigo; o merge publica o site.

## 2026-10-23 20h50 BRT — Site novo: público agora é VENDEDOR e REPRESENTANTE
- **Decisão do Rodrigo (voz, 23/10):** comida/cafeteria não trouxe cliente. O público da Flow Arts passa a ser quem vive de prospectar empresa (aluguel de equipamentos, representante comercial, energia solar, seguro, consórcio). A busca de leads é o produto principal; o Instagram é o cartão de visita. Pessoa física (ex.: Maskara) fica num pacote só de Instagram, sem a busca no painel (ainda não feito).
- **Feito (branch `site-vendedores`, `public/site.html`):** título "Novos clientes todo dia no seu WhatsApp.", vídeos de vendedor (topo, Reel, obra) no lugar da cafeteria, comparação "Procurar cliente no Google cansa.", lista de perfis no lugar das portas de nicho, rodapé sem links de comida (as páginas de nicho continuam no ar e no sitemap). Saiu o vídeo da cafeteria com bug. Testes de site ajustados; 593/593.
- **Não mexido:** preços dos pacotes (R$ 197 / R$ 697). O Rodrigo pensa em R$ 350 por mês para os primeiros clientes; esperar a decisão dele.
- **PARA O CHATGPT:** posts diários da Flow Arts devem parar de falar com cafeteria/padaria e falar com vendedores e representantes. Fotos do site novo: o Rodrigo vai mandar as 6 imagens (vendedor no carro, obra, representante, lista, energia solar, WhatsApp); sem texto, sem comida.
- **Estado:** PR aguardando o OK do Rodrigo; merge na `main` publica o site.

## 2026-10-23 19h05 BRT — Quatree: usar TODAS as linhas de ração
- **Pedido do Rodrigo:** o ChatGPT só gera imagens da linha Supreme; precisa gerar de todas as linhas, para cães e gatos, usando o site oficial.
- **Causa provável:** a página quatreepet.com.br/produtos mostra só a Supreme; as outras linhas ficam em /produtos/cao e /produtos/gato.
- **Feito:** seção 7 em `QUATREE_DIRETRIZ_VENDAS.md` com as 9 linhas (5 cães, 4 gatos), links de cada uma e regra de rodízio (todas na semana, gato todo dia, Supreme no máximo 1 por dia). Só documentação; nada implantado.
- **Próximo passo (ChatGPT):** nas próximas artes do Quatree, abrir a página da linha, seguir o rodízio e registrar a linha de cada peça no HANDOFF_CHATGPT.

## 2026-10-23 15h50 BRT — Caçador só mostra quem tem WhatsApp
- **Pedido do Rodrigo:** o Caçador (Google Maps) entregava muitos números sem WhatsApp; ele quer só WhatsApp.
- **Diagnóstico:** a busca diária automática já filtrava celular, mas a busca manual do Caçador (Google e mapa grátis) aceitava telefone fixo e só marcava "Telefone fixo (pode não ter WhatsApp)". O Google costuma dar só o fixo da empresa.
- **Feito (branch `fix/cacador-so-whatsapp`, `cloudflare/src/prospects.js`):** `placeToProspect` e `osmToProspect` só aceitam (1) número de link wa.me/api.whatsapp.com no lugar do site, (2) `contact:whatsapp` do mapa, ou (3) celular (11 dígitos com 9), procurando em todos os campos de telefone. Fixo sem link de WhatsApp fica de fora. Novas funções `whatsappFromUrl` e `pickMobile`.
- **Não mexido:** Captador dos clientes (`captador.js`), que é ferramenta de cada assinante.
- **Limite honesto:** celular não garante WhatsApp; não há verificação oficial gratuita de número. O filtro tira os fixos, que eram a maior parte das falhas.
- **Testes:** 593/593 (`node --test test/*.test.mjs`), com teste novo de fixo, link wa.me e celular.
- **Estado:** PR aguardando o OK do Rodrigo; merge na `main` faz deploy.

## 2026-10-23 12h20 BRT — Maskara: palavra agora é QUERO
- **Pedido do Rodrigo:** a palavra da Maskara passa a ser "QUERO" (CTA "Comenta QUERO abaixo"), não mais "DOCUMENTOS".
- **Feito (branch `fix/maskara-palavra-quero`):** palavras padrão do ramo despachante sem "documentos" (fica "quero" e as gerais); teste ajustado; `CAMPANHA_MASKARA_7D.md` atualizado.
- **Para o ChatGPT:** em todas as peças novas da Maskara, arte e legenda com "Comenta QUERO abaixo". Nunca mais "DOCUMENTOS".
- **Depende do painel:** se a Maskara já tiver lista salva em Conta › Respostas automáticas, trocar "documentos" por "quero" lá (a lista salva vale mais que a padrão).

## 2026-10-23 11h55 BRT — Story travava o feed do mesmo horário (Maskara)
- **Relato do Rodrigo:** o story da Maskara saiu no Instagram, mas o post do feed que o cliente aprovou não saiu.
- **Causa no código:** o Publisher contava o story como "post publicado" e esperava 90 min antes do próximo; e só publicava 1 item por rodada. Com post + story no mesmo horário, o story saía e o feed ficava travado.
- **Correção (branch `fix/story-nao-trava-feed`):** `executor.js` não conta stories nos 90 min; em cada rodada sai no máximo 1 feed (com os 90 min) e 1 story (sem esperar o feed). Teste novo `test/story-feed-spacing.test.mjs`; 592/592 testes.
- **Não conferido:** registros de produção (sessão sem acesso às Actions/D1). Depois do deploy, conferir se o feed das 10h30/12h saiu.
- **Próximo passo:** Rodrigo aprovar o merge do PR; o deploy é automático.

## 2026-10-23 11h40 BRT — Auditoria Maskara e correção da resposta no direct
- **Pedido do Rodrigo:** auditar o painel da Maskara e corrigir tudo.
- **Achados:** (1) artes pedem "DOCUMENTOS no direct", mas só comentário disparava resposta — **corrigido no código** (PR desta entrada). (2) às 10h05 as peças foram canceladas e recriadas para hoje; a aprovação do cliente feita antes ficou nas canceladas, por isso a de 10h30 caiu no Master. O botão Aprovar do cliente já publica direto, sem Master. (3) legendas de hoje não citam DOCUMENTOS (só "envie mensagem no direct"); com a correção, a palavra no direct passa a responder.
- **Depende do painel (não dá pelo código):** em Conta › Respostas automáticas da Maskara, ligar e conferir a palavra "documentos" e o WhatsApp em "Meu negócio". Se já houver lista salva, a palavra padrão nova não entra sozinha.
- **Para o ChatGPT:** em peças futuras, usar o mesmo CTA na arte e na legenda ("Responda DOCUMENTOS no direct") e o mesmo logo da Maskara em todas.
- Ao mover peças de dia, a aprovação não acompanha: avisar o cliente para aprovar de novo.

## 2026-10-23 09h40 BRT — Maskara: campanha de 30 dias, conferência antes do envio
- **Pedido do Rodrigo:** o ChatGPT gera todas as imagens; o Claude envia ao painel da Maskara as peças de hoje e mantém a campanha em 30 dias (24/10 a 22/11).
- **Conferido:** branch `agendamentos` e todas as outras branches: **0 imagens ou vídeos da Maskara** (as 42 peças antigas foram apagadas em b99c33e). Nada a enviar ainda. Painel do Master com sessão expirada (não conferido). Convite de testador: @maskara.silva **aceitou** (sem "Pendente" em 23/10 09h30). Conta precisa ser profissional e conectada no painel.
- **Para o ChatGPT:** salvar as peças do dia em `agendamentos/clientes/maskara-assessoria/AAAA-MM-DD/HHMM/` (posts: `imagem.jpg` ou `01.jpg…` ou `video.mp4`+`capa.jpg`, com `legenda.txt`) e `HHMM-story/story.jpg`. Cada pasta precisa chegar 10 minutos antes do horário. O push na branch `agendamentos` dispara o envio sozinho; avisar o Rodrigo para o Claude conferir.
- **Tamanho da campanha:** 30 dias = 90 posts (77 imagens + 13 Reels) e 90 stories (`CAMPANHA_MASKARA_7D.md`).

## 2026-10-23 08h35 BRT — Maskara Assessoria: 3 posts + 3 stories por dia
- Rodrigo ajustou o ritmo da campanha de 7 dias para 3 posts (09h, 12h, 19h) e 3 stories (09h, 12h, 19h) por dia. `CAMPANHA_MASKARA_7D.md` atualizado.

## 2026-10-23 08h40 BRT — PARA O CHATGPT: campanha de 7 dias da Maskara Assessoria
- **Pedido do Rodrigo:** preparar a campanha do nicho do cliente novo (despachante de documentação de armas para CACs), teste grátis de 7 dias (24/10 a 30/10).
- **Feito pelo Claude:** auditoria do perfil público e plano em `CAMPANHA_MASKARA_7D.md`. Nicho e @ ajustados no cadastro (`maskara-assessoria`, @maskara.silva). Convite de testador enviado (pendente). O perfil ainda é pessoal: precisa virar conta profissional para o Nexus publicar.
- **Para o ChatGPT:** criar os posts de 24/10 a 30/10 seguindo `CAMPANHA_MASKARA_7D.md` (seção 3 é obrigatória: só serviço de documentação, sem arma em destaque, sem venda, sem preço, sem promessa) e `FORMATOS_POSTAGENS.md` (nunca repetir imagem). Pasta `agendamentos/clientes/maskara-assessoria/`.
- **Também registrado:** Luciana Carvalho (@lucianacarvalhoficial) recebeu convite de testador em 23/10 (pendente).

## 2026-10-23 08h10 BRT — Captador do Quatree
- Pedido do Rodrigo: tirar da busca do Quatree os tipos que não são dele; busca manual não funcionava; busca diária de 10 achou 3; cidades e bairros de Uberlândia e região.
- Feito (branch `fix/captador-quatree`): ver CHANGELOG 23/10 08h10. Pendente: depois do deploy, olhar o `googleError` de uma busca para saber por que o Google falha (a chave existe no Master).

## 2026-10-23 07h50 BRT — Master v2
- Pedido do Rodrigo: tirar abas duplicadas, Postagens igual à tabela de clientes com botão excluir, Agentes e Site como painel holográfico, trocar a logo preta.
- Feito (branch `feat/master-v2`): ver CHANGELOG 23/10 07h50. Conferido em prévia local com dados de exemplo. 580/580 testes.

## 2026-10-23 07h20 BRT — Master mais coeso e fácil de ler
- Pedido do Rodrigo: login azul igual ao do cliente; clientes como planilha com cor alternada; menos informação solta e menos rolagem; ícones melhores; painel clicável; adaptado para dislexia.
- Feito (branch `feat/master-coeso`): ver CHANGELOG 23/10 07h20. Nada foi apagado do código: o que é pouco usado ficou em blocos fechados. Conferido em prévia local com dados de exemplo. 579/579 testes.
- Próximo passo: Rodrigo aprova o PR e diz o que ainda incomoda.

## 2026-10-23 06h50 BRT — PARA O CHATGPT (URGENTE): refazer a campanha de HOJE do Quatree
- **Pedido do Rodrigo (06h45):** refazer todo o conteúdo do Quatree de hoje (23/10). Ele vai excluir no painel os posts antigos.
- **O que refazer:** as 7 pastas de `agendamentos/clientes/quatree-dog/2026-10-23/` (feed 09h, 12h e 19h; carrossel 15h; stories 09h, 12h e 19h), **seguindo `QUATREE_DIRETRIZ_VENDAS.md`**: embalagem Quatree em destaque em todas as peças, uma linha por peça, chamada de venda, nada inventado do rótulo, imagem nova em cada peça (o GitHub recusa imagem idêntica).
- **Como:** troque os arquivos dentro das mesmas pastas (mesmos horários). O envio sobe de novo porque o Rodrigo excluiu os antigos (post excluído libera o horário).
- **Horário:** cada pasta precisa chegar pelo menos 10 minutos antes da hora. Se a das 09h não der tempo, use 10h30 (`1030/` e `1030-story/`) e avise o Rodrigo.
- **Nada é publicado sem a aprovação do Rodrigo.** Ao terminar, registrar em `HANDOFF_CHATGPT.md` o que foi enviado e o resultado do Actions.

## 2026-10-23 06h50 BRT — PARA O CHATGPT: Quatree é VENDA, toda peça mostra produto
- **Pedido do Rodrigo:** o ChatGPT está fugindo nas postagens do Quatree; o objetivo é mostrar os produtos, o cliente quer venda. Auditar e deixar orientação.
- **Auditoria (pasta `agendamentos/clientes/quatree-dog/2026-10-23/`):** 3 de 9 peças mostram produto (os 3 feeds). Os 3 stories (porta da loja, gato brincando, caderno) e os 3 cartões do carrossel das 15h ("boas perguntas", conversa, caderno) não mostram nada da Quatree. Legendas com "conheça / consulte", sem pedir o pedido.
- **Regra nova:** `QUATREE_DIRETRIZ_VENDAS.md` (embalagem em destaque em toda peça, uma linha por peça, chamada de venda, nada inventado do rótulo, modelos de feed, carrossel, story, Reel e legenda, checklist). Ligada em `FORMATOS_POSTAGENS.md`, `CAMPANHA_QUATREE_30D.md` e `AGENTS.md`.
- **Para o ChatGPT:** seguir a diretriz a partir do próximo conteúdo. Refazer os stories e o carrossel de 23/10 só se o Rodrigo pedir.
- **Rodrigo decide:** recusar ou não, no painel do Quatree, os 3 stories e o carrossel das 15h de 23/10.

## 2026-10-22 23h59 BRT — Botão Excluir em todos os posts do painel do cliente
- Pedido do Rodrigo: botão excluir em todos os posts, até nos aprovados.
- Feito (mesma branch `fix/painel-formato-menu`, PR #384): não publicado → cancela e some; publicado → some só do painel (no Instagram continua). 579/579 testes.

## 2026-10-22 23h55 BRT — Painel do cliente: tipo do post visível e menu arrumado
- Pedido do Rodrigo: deixar claro no painel se o post é feed, Reels ou stories; o painel da Flow Arts estava bagunçado no computador (menu lateral só com ícones).
- Feito (branch `fix/painel-formato-menu`): selo colorido com o tipo em cada post e no "próximo post"; menu em cima no computador. 578/578 testes. Conferido em prévia local (demo).
- Para o ChatGPT: o tipo vem do arquivo da pasta (imagem.jpg = Feed, 01.jpg… = Carrossel, video.mp4 = Reels, story.jpg = Stories). Use o arquivo certo.
## 2026-10-22 23h45 BRT — PARA O CHATGPT: nunca repetir imagem
- **Pedido do Rodrigo:** o ChatGPT nunca pode criar imagens iguais para postagens. Ele pediu stories para Flow Arts e Quatree e viu a mesma imagem do post no story.
- **Diagnóstico (branch `agendamentos`, 23/10):** no Quatree, o carrossel das 15h (`01.jpg`, `02.jpg`, `03.jpg`) é cópia exata das imagens das 09h, 12h e 19h. Na Flow Arts, os stories são arquivos diferentes, mas o Nexus também publicava sozinho a imagem do post como story (story automático), e todas as artes do dia eram pão de queijo com café.
- **Feito (branch `fix/sem-imagem-repetida`):** regra fixa no topo de `FORMATOS_POSTAGENS.md` (+ `REGRA_POSTS_DIARIOS.md`, `CAMPANHA_QUATREE_30D.md`, `AGENTS.md`); `agendar-pasta.sh` recusa imagem idêntica a outra pasta do mesmo cliente ou repetida na própria pasta (testado em cópia local: a pasta do Quatree 15h foi recusada); story automático desligado em `publisher.js` (só liga com `NEXUS_AUTO_STORY="true"`). 578/578 testes.
- **Para o ChatGPT agora:** refazer o carrossel do Quatree de 23/10 15h com 3 artes novas; variar as cenas da Flow Arts.
- **Pendente do Rodrigo:** se o carrossel repetido do Quatree (23/10 15h) já está no painel, recusar ou cancelar.

## 2026-10-22 23h40 BRT — Planos com nomes curtos e cadastro com Pix
- **Pedido do Rodrigo:** (1) letras maiores e mais fáceis de ler, sem barra lateral (ele é disléxico e autista); (2) planos com nomes e valores; o cliente escolhe o plano num link, vê o passo a passo, paga no Pix (chave CNPJ do site) e cai um pedido no Master para aprovar; o painel do cliente mostra o plano.
- **Decisões:** todos os produtos do site viram planos; nomes curtos escolhidos pelo Claude (Rodrigo pode trocar): Essencial, Completo, Captador, Site, Responde, Reels 5, Posts 10, Logo.
- **Feito (branch `feat/planos-pix-leitura`):** `cloudflare/src/plans.js` (lista e Pix copia e cola), `signup.js` (plano, valor, fundador, conferência antes do Pix, config.plan ao aprovar), `clients.js` (plano no painel), `public/cadastro.html` (4 passos), `public/signups.js` (plano e aviso no Master), `public/client-lite.js` + `portal.html` ("Seu plano" na Conta), `public/site.html` e `whatsapp-knowledge.js` (nomes e botões Contratar), `public/styles.css` + `index.html` (leitura fácil no Master). 578/578 testes.
- **Limite:** o Pix é fixo; não existe confirmação automática. O Rodrigo confere o valor no banco antes de aprovar.
- **No app do Claude:** não dá para mudar por código. Configurações › Aparência › Fonte do chat › "Dyslexic friendly"; a barra lateral pode ser fechada, não removida.
- **Para o ChatGPT:** continua sem preço nos posts. Link para contratar: flowarts.com.br/cadastro.
- **Próximo passo:** Rodrigo aprova o PR; testar um cadastro de verdade só se ele quiser.

## 2026-10-22 23h05 BRT — Planos do site mais completos
- Pedido do Rodrigo: os planos do site seguem a grade nova. Básico: 30 posts no feed, 12 Reels e 30 stories por mês. Com Vídeo: 30 no feed, 30 Reels em vídeo de verdade e 60 stories. Robô do WhatsApp com o mesmo texto.
- Branch `feat/planos-formatos`; 574/574 testes; o merge publica o site.
- Para o ChatGPT: clientes do Básico recebem cerca de 3 Reels por semana e 1 story por dia (igual à grade do Quatree em `FORMATOS_POSTAGENS.md`).
## 2026-10-22 23h10 BRT — PARA O CHATGPT: grade nova com Reels e stories (Flow Arts e Quatree)
- **Pedido do Rodrigo:** postar carrossel, stories, feed e Reels nos dois perfis, com mais posts por dia se for preciso.
- **Regra nova:** `FORMATOS_POSTAGENS.md`. Flow Arts: 09h carrossel, 10h30 story, 12h Reel, 16h story, 19h feed (o Nexus já repete o carrossel e o feed como story). Quatree: 09h feed todo dia, 12h Reel ter/qui/sáb, 18h story todo dia.
- **Conferido no código:** a pasta `agendamentos/` já aceita `story.jpg`, `story.mp4`, `video.mp4` + `capa.jpg` em qualquer horário `HHMM` (`agendar-pasta.sh`). Nenhuma mudança de código.
- **Limites:** story pelo envio automático não tem enquete nem link; Reel sem música (só áudio silencioso).
- **Vale a partir de 23/10.** Também atualizados: `REGRA_POSTS_DIARIOS.md`, `CAMPANHA_QUATREE_30D.md`, `AGENTS.md`.
- **Oferta nova (PR #378):** já está na `main` (merge b34a6c7, feito pelo Rodrigo).

## 2026-10-22 23h BRT — Conselho (Founder Skill) da Flow Arts, oferta nova e código de pedido
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido:** Rodrigo rodou todas as etapas da Founder Skill (simulação de conselho, concorrentes, compradores, preço, oferta, financeiro, marketing, marca, operação, lançamento), pediu auditoria e mandou aplicar as mudanças sugeridas no site e no Nexus. Os relatórios ficaram fora do repositório (público).
- **Resultado (simulado, não é prova):** 0 de 20 compradores simulados nas duas ofertas; a objeção nº 1 é falta de prova real (café/padaria parecido com pedidos medidos). O negócio empata com poucos clientes; a meta de retirada do Rodrigo ainda não fecha. Limite do MEI (R$ 81 mil/ano) limita o número de clientes a R$ 197; conferir com contador.
- **Correções do Rodrigo:** o Quatree Dog é amigo e **cliente teste, não pagante**. As "5 a 10 horas" eram o tempo dele construindo o Nexus, não o tempo por cliente (este ainda será medido).
- **Decisões:** cancelamento "é só avisar no WhatsApp"; Básico R$ 197/mês sem entrada; fundador R$ 147 nos 3 primeiros meses (3 vagas, até 30/11/2026); garantia do 1º mês; **resposta automática com botão do WhatsApp entra no Básico** (regra antiga em `empresa/visao.md` atualizada); "exemplo grátis" vira "3 posts grátis".
- **Alterado (branch `feat/oferta-197`):** `public/site.html` (preço, fundador, garantia, cancelamento, resposta automática e código de pedido no Básico, botões "Quero 3 posts grátis", texto escuro no botão verde), `public/exemplo.html` (título "3 posts grátis"), `cloudflare/src/whatsapp-knowledge.js` (robô com os mesmos textos), **código de pedido**: campo novo em Meu negócio (`business-profile.js`, `public/negocio.js`), `clientBrand().orderCode`, `withOrderCode()` em `caption-templates.js` aplicado no envio do Master/pasta `agendamentos/` (`master-upload.js`) e nas legendas prontas; mensagem do Caçador para comida oferece "3 posts com as fotos da [empresa], grátis" (`prospects.js`). Testes novos `order-code.test.mjs`; 574/574.
- **Estado:** juntado pelo Rodrigo na `main` (PR #378, merge b34a6c7); deploy automático.
- **Para o ChatGPT:** ver a seção "Oferta nova" no topo de `REGRA_POSTS_DIARIOS.md`. Posts da Flow Arts continuam sem preço.
- **Próximo passo:** Rodrigo faz o merge; cadastrar o código de pedido de cada cliente em Meu negócio; fazer os 3 posts grátis para 1 padaria e 1 café conhecidos; lançamento 05/11.

## 2026-10-22 22h05 BRT — PARA O CHATGPT: palavra TABELA em toda legenda do Quatree Dog
- **Origem → destino:** Claude Code → ChatGPT. Pedido do Rodrigo.
- O Instagram @ericsson_quatree agora tem **resposta automática de comentários** (publicado em 22/10, PR #375). Quem comenta uma palavra da lista recebe no direct a mensagem com o WhatsApp do Ericsson.
- **Regra para toda legenda do Quatree:** terminar com `Comente TABELA que eu te mando a tabela de revenda no direct 📩` (antes das hashtags). Detalhes na seção "REGRA FIXA DA LEGENDA" de `CAMPANHA_QUATREE_30D.md`.
- Stories: "Comente TABELA" ou "Responda TABELA" na arte.
- Não usar outra palavra sem o Rodrigo mudar a lista no painel.

## 2026-10-22 20h35 BRT — PARA O CHATGPT: campanha de 30 dias do Quatree Dog (@ericsson_quatree)
- **Origem → destino:** Claude Code → ChatGPT. Pedido do Rodrigo: auditar a conta do cliente, montar a campanha de 30 dias e acionar o ChatGPT para começar.
- **Plano completo:** `docs/nexus-memory/CAMPANHA_QUATREE_30D.md` (auditoria, ajustes do perfil, calendário de 30 dias de 26/10 a 24/11, prospecção, regras das artes).
- **Regra das artes:** base = banners e arquivos do PRÓPRIO cliente, que o Rodrigo vai enviar. Não usar a vitrine da Flow Arts. O ChatGPT só adapta formato (4:5 ou 9:16) e completa o que faltar, sem inventar preço, sabor, peso, selo ou benefício.
- **Primeira tarefa do ChatGPT:** quando o Rodrigo mandar os banners, preparar a semana 1 (dias 1 a 7, 26/10 a 01/11): arte + legenda de cada dia, para o Rodrigo revisar. Entregar ao Rodrigo; não publicar.
- **Como chega ao painel do cliente:** salvar na branch `agendamentos`, pasta `agendamentos/clientes/quatree-dog/AAAA-MM-DD/HHMM/` (publicado em 22/10 20h40). O post entra no painel do cliente esperando aprovação.
- **Bloqueios:** região a confirmar (parece Uberlândia MG); cliente precisa aceitar o convite de testador (enviado 22/10 20h23) e conectar @ericsson_quatree no painel.
- **Executado nesta passagem:** só documentação. Nenhum post criado, enviado ou publicado.

## 2026-10-22 19h30 BRT — CRM, Caçador e exemplos saíram do Master e foram para o painel da Flow Arts
- **Origem → destino:** Claude Code → ChatGPT. Pedido do Rodrigo (19h13): "ajusta os CRMs do Nexus para o painel da Flow Arts; não preciso dele no painel Nexus; a Flow Arts é um cliente". OK para publicar às 19h23.
- **O que mudou:** painel do cliente Flow Arts (`primeiro-teste`) ganhou a aba **CRM** (busca diária e aviso no celular, Falar hoje, novo contato, mensagem modelo, todos os contatos, **Caçador** e **Exemplos por nicho**). Só a Flow Arts vê a aba (`flowCrm` na sessão do portal).
- **Master:** saíram o menu CRM, a tela CRM, o Caçador e os Exemplos. "Caçador" virou **Acessos** (Captador para clientes, Imagem por IA, Leads do Odin e a chave do Google Maps). O cartão do Início abre `/portal.html?tab=crm`. O link antigo `?view=crm` também redireciona.
- **Servidor:** novas rotas `/api/portal/flow/<crm|prospects|showcase|push>/…`, só com login do cliente Flow Arts; chamam a mesma lógica das rotas do Master (os dados são os mesmos; nada foi migrado nem apagado). As rotas `/api/master/…` continuam.
- **Aviso no celular:** abre o painel da Flow Arts na aba CRM. Quem ativou o aviso pelo Master precisa ativar de novo no painel da Flow Arts.
- **Testes:** 561/561. Bundle do Wrangler não conferido (sessão sem acesso ao npm). Navegador e produção: conferir depois do deploy.
- **Próximo passo:** Rodrigo entra no painel com o login da Flow Arts → aba CRM → confere a lista e liga o aviso no celular.
- **Outra branch, NÃO publicada:** `feat/captador-busca-diaria-cliente` (busca diária de 10 empresas no painel de cada cliente + Direct + `agendamentos/clientes/<id>/`). Pausada a pedido do Rodrigo; a conta do cliente vai mudar.

## 2026-10-22 17h20 BRT — COBRANÇA: terminar e ENVIAR as artes 2×2 dos 21 nichos (FLOW-ARTES-001)
- **Origem → destino:** Claude Code → ChatGPT, a pedido do Rodrigo ("cobra ele na memória").
- **Padrão combinado entre Rodrigo e ChatGPT (vale para TODOS os 21 nichos):** **uma única imagem por nicho, 4:5 (1080×1350), com 4 cenas em grade 2×2.** Nada de vídeo e nada de carrossel de 5 cartões como modelo do nicho. O ChatGPT já criou as artes, mas **não terminou de enviar**.
- **Situação conferida no Master hoje (`/api/master/showcase`):** o modelo dos nichos está misturado. Restaurante e Pet shop estão com **vídeo**; Bar, Dentista, Clínica, Farmácia, Mercado, Oficina e Hotel/pousada estão com **carrossel de 5 cartões**; os outros 12 estão **sem modelo**: cafeteria, lanchonete, padaria, salão, academia, ração, agropecuária, veterinário, roupas, imobiliária, contabilidade e material de construção. **Todos os 21 devem passar para a arte 2×2**, inclusive os que já têm vídeo ou carrossel.
- **Prioridade:** cafeteria, padaria e lanchonete primeiro (foco de público da Flow Arts), depois restaurante e bar, depois o resto.
- **Mesmo padrão em todas:** mesma moldura, mesmo estilo de foto realista, mesma posição do logo e mesma ordem de cenas em todos os nichos. Não pode ter uma arte diferente das outras. Texto sem erro de português (regra de 16/10 em `DECISIONS.md`).
- **Chaves dos 21 nichos (nome da pasta):** restaurante, cafeteria, lanchonete, padaria, bar, salao, academia, pet, racao, agropecuaria, veterinario, dentista, clinica, farmacia, mercado, roupas, oficina, hotel, imobiliaria, contabilidade, material.
- **Como entregar:** numa branch própria (ex.: `feat/artes-nicho-2x2`), uma arte por nicho em `public/exemplos-nicho/<chave>/arte-2x2.jpg`, e abrir PR. **Não juntar na `main`**: mexer em `public/` publica o site, e isso precisa do OK do Rodrigo. Pode enviar em partes (por exemplo, os 3 prioritários primeiro).
- **Depois da entrega (Claude):** troca a vitrine para usar a arte 2×2 de cada nicho no lugar do vídeo e do carrossel, roda os testes e publica com o OK do Rodrigo.
- **Ao terminar, registrar em `HANDOFF_CHATGPT.md`** quais nichos foram enviados, a branch/PR e quais faltam.

## 2026-10-22 09h BRT — Análise dos "11 repositórios de IA do GitHub" (LER ANTES DE INSTALAR)
- **Origem → destino:** Claude Code → ChatGPT, a pedido do Rodrigo. Base: PDF "Os 11 repositórios de IA do GitHub pra testar esta semana" (fabiano.app). Conferi no GitHub em 22/10 o founder-skill (MIT, 1.341 estrelas, push 07/10), video-shotcraft (Apache-2.0, 12.879 estrelas, push 17/10), slides_maker (MIT, push 22/10) e vindex (MIT, 10 estrelas, push 23/07). Os outros 7 não conferi.
- **Regra principal: nenhum deles vai para dentro do Nexus.** O Nexus é um Worker da Cloudflare (`cloudflare/`, `public/`); esses projetos rodam num computador, com Python, Docker, Node com ffmpeg ou placa de vídeo. Não adicionar código, dependência nem fluxo do GitHub ao Nexus por causa deles. Se algum for usado, é como **ferramenta no PC do Rodrigo**, fora do repositório.
- **PC do Rodrigo:** Windows, vídeo Intel HD (sem NVIDIA), 10 GB de RAM, sem Docker e sem ffmpeg.
- **Pode testar (grátis, sem chave de API):** 1) **Founder Skill** (`Jakeschincariol/founder-skill`): validar oferta e preço da Flow Arts no Claude Code; é o melhor primeiro teste. 2) **slide-maker** (`addsumtech/slides_maker`): propostas e apresentações em .pptx; pede LibreOffice.
- **Só com decisão do Rodrigo:** 3) **Video Shotcraft**: vídeo a partir das telas do site; pede ffmpeg; Remotion pode exigir licença paga para empresa; e o `AGENTS.md` diz para **não restaurar corte/edição de vídeo**.
- **Não usar agora:** Maestro (exige NVIDIA e a licença proíbe uso comercial); vindex (Mac com chip M; não roda no Windows); Image Blaster, MiroFish, BambooAI e ArtCraft (cobram API ou créditos em dólar; o Rodrigo quer custo zero); WeKnora (Docker, pesado para 10 GB); OpenChatCut (edição de vídeo, AGPL).
- **Erro no PDF:** o rodapé aponta o vindex para o slides_maker; o certo é `github.com/vaibhav-space/vindex`.
- **Nada foi instalado.** Qualquer instalação, chave de API ou gasto precisa do OK do Rodrigo.

## 2026-10-22 08h45 BRT — Posts de hoje JÁ ESTÃO no painel (não criar de novo)
- Os 3 posts de 22/10 (09h, 12h, 19h) foram criados pela **Plataforma IA** do Rodrigo (programa local que usa o ChatGPT pelo plano dele) e enviados por ele com 1 clique para `agendamentos/2026-10-22/` na branch `agendamentos` (commit `b1cbf8a`). O fluxo "NEXUS Agendar conteúdo pronto" terminou com sucesso (execução 39772024382). Estão no painel esperando a aprovação do Rodrigo.
- **ChatGPT: não crie os posts de 22/10 de novo.** O lembrete abaixo está atendido.
- A partir de agora a Plataforma IA cria os 3 posts sozinha todo dia às 6h30 e o Rodrigo envia com 1 clique. Antes de criar posts de um dia, confira se `agendamentos/AAAA-MM-DD/` já existe na branch `agendamentos`, para não duplicar.

## 2026-10-22 08h BRT — LEMBRETE: posts de hoje ainda não estão no painel
- **Origem → destino:** Claude Code → ChatGPT, a pedido do Rodrigo.
- **Conferido às 08h09:** a branch `agendamentos` não tem a pasta `agendamentos/2026-10-22/`. Nenhum dos 3 posts de hoje chegou ao painel.
- **Pedido do Rodrigo:** gere as imagens e as legendas dos 3 posts de hoje e envie ao painel da Flow Arts para ele aprovar.
- **Como fazer:** siga `REGRA_POSTS_DIARIOS.md` (09h, 12h, 19h; 4:5, 1080×1350; 1 dos 3 com "App de agendar post não cria post"). Salve em `agendamentos/2026-10-22/0900/`, `1200/` e `1900/` na branch `agendamentos`, confira o fluxo em Actions e avise o Rodrigo.
- **Atenção ao horário:** o post precisa chegar 10 minutos antes. Se 09h já tiver passado quando você ler isto, não envie o de 09h: envie 12h e 19h e avise o Rodrigo qual ficou de fora.
- **Nada é publicado sem o Rodrigo aprovar no painel.**

## 2026-10-21 22h30 BRT — Posicionamento contra apps de agendamento (PR, aguarda OK)
- **Origem → destino:** Claude Code → ChatGPT.
- **Pedido do Rodrigo:** comparar com mLabs, Postgrain, Metricool, Buffer e Hootsuite e criar marketing a nosso favor.
- **Feito:** `MARKETING_POSICIONAMENTO.md` (pesquisa, mensagem "App de agendar post não cria post", série de 5 posts e respostas prontas); seção "App de agendar post não cria post." no site, antes dos planos, com 3 colunas (app, social media, Flow Arts) e botão para o exemplo grátis; pergunta nova no FAQ e nos dados do Google; o atendente do WhatsApp sabe responder a comparação sem falar mal nem citar preço de concorrente. Teste `site-comparacao.test.mjs`.
- **Para o ChatGPT:** use a série de posts da seção 3 nos próximos dias, dentro da função de cada horário. Não cite marcas nem preços.

## 2026-10-21 22h BRT — Plano técnico no ar (PR #356, deploy ccb0ea9)
- **Origem → destino:** Claude Code → ChatGPT.
- **No ar e conferido:** (1) o Caçador só busca cafeteria, padaria, lanchonete, restaurante e bar; (2) o topo do site diz "Fotos e posts que dão fome no seu cliente." e o botão leva a `/exemplo`, que pede 3 fotos do cardápio pelo WhatsApp; (3) links com `?de=` marcam a origem da visita no painel.
- **Links para usar nos posts, na bio e nas mensagens:**
  - Bio: `flowarts.com.br/exemplo?de=instagram`
  - Stories: `flowarts.com.br/exemplo?de=stories`
  - WhatsApp: `flowarts.com.br/?de=whatsapp`
- **Para o ChatGPT:** nas mensagens de Direct do dia, convide para o exemplo grátis e, se for mandar link, use `flowarts.com.br/exemplo?de=instagram`.

## 2026-10-21 21h30 BRT — PLANO DE CRESCIMENTO e standup automático do CEO
- **Origem → destino:** Claude Code → ChatGPT.
- **Pedido do Rodrigo:** replanejar forma de postar, tipo de conteúdo e público no Instagram, no site e em tudo; e colocar o CEO para rodar sozinho.
- **Feito:** `PLANO_CRESCIMENTO.md` (público único de comida local, oferta "exemplo grátis", função de cada horário, distribuição, site, metas de 4 semanas). `REGRA_POSTS_DIARIOS.md` passa a seguir o plano (09h útil, 12h antes e depois, 19h conversa) e pede 5 mensagens de Direct por dia para o Rodrigo. `empresa/metricas.md` atualizado.
- **Standup automático:** tarefa agendada local "CEO da Flow Arts — standup diário", todo dia às 7h no computador do Rodrigo (roda com o app aberto). Salva em `empresa/standup/` na branch `empresa-standup`; nunca na `main`.
- **Estado:** PR aguardando o OK do Rodrigo. Só documentação, sem deploy.
- **Para o ChatGPT:** a partir do merge, leia o PLANO e o standup do dia antes de criar os posts.

## 2026-10-21 21h BRT — Auditoria do site flowarts.com.br e painel "Está dando resultado?"
- **Origem → destino:** Claude Code → ChatGPT.
- **Números reais (D1, contador desde 14/10, lidos por fluxo temporário `ops/site-auditoria`, só totais):** 67 páginas vistas em 8 dias (3 a 16 por dia). Origem: 58 diretas (link sem origem, provavelmente o próprio Rodrigo e testes), 3 Google, 1 Instagram, 1 Facebook, 1 WhatsApp. Páginas: 58 na principal, 8 nas de nicho, 1 no /exemplo. **0 pedidos de exemplo grátis.** Cliques no WhatsApp **não eram medidos**.
- **Conclusão:** o site ainda não traz clientes; quase não chega gente de fora.
- **Feito (PR):** o site passa a contar cliques nos botões do WhatsApp (só números) e ignora as visitas de quem abrir `flowarts.com.br/?eu=1`. A aba Site do Master ganhou "Está dando resultado?": entradas (com comparação), cliques no WhatsApp, pedidos de exemplo, taxa e um diagnóstico curto.
- **Para o ChatGPT:** levar gente ao site é o gargalo. Usar o link flowarts.com.br na bio e em Stories; posts das 12h podem apontar para a página do nicho (ex.: /marketing-para-cafeteria).
- **Pendência:** a branch `ops/site-auditoria` pode ser apagada pelo Rodrigo.

## 2026-10-21 20h30 BRT — SEO técnico do site e foto da consultora removida (PR, aguarda OK)
- **Origem → destino:** Claude Code → ChatGPT.
- **Pedido do Rodrigo:** corrigir 4 falhas de SEO e tirar do site a foto da "Consultora da Flow Arts com materiais da marca" (persona de IA com tom azul).
- **Alterado:** `cloudflare/src/site-host.js` + `index.js` (http:// e www. → 301 para https://flowarts.com.br); `public/sitemap.xml` (sem /demo, com `lastmod`); nova imagem `public/brand/flowarts-share.jpg` 1200×630 usada no `og:image` das 13 páginas e no gerador de páginas de nicho; galeria do site sem a foto da consultora. Teste novo `site-host.test.mjs`.
- **Pendente:** Rodrigo não gostou da fonte do site (Unbounded nos títulos); falta ele escolher a nova.
- **Estado:** PR aberto; o merge faz deploy.

## 2026-10-21 20h BRT — Planos com mais conteúdos no site (PR, depende de merge)
- **Origem → destino:** Claude Code → ChatGPT.
- **Decisão do Rodrigo:** Básico com 30 conteúdos/mês e Vídeo com 60, preços iguais (ver `DECISIONS.md`). Modelo: arte de comparação de planos que ele enviou.
- **Alterado:** `public/site.html` (cards e JSON-LD), `scripts/site/site-visual.body.html`, `cloudflare/src/whatsapp-knowledge.js`, `empresa/visao.md`.
- **Estado:** PR aberto. O merge faz deploy (muda `public/` e `cloudflare/`).
- **Para o ChatGPT:** em posts e textos, usar 30 e 60 conteúdos. Continua proibido citar preço nos posts.

## 2026-10-21 19h30 BRT — CRM: 14 contatos parados há mais de 24 h arquivados
- **Origem → destino:** Claude Code → ChatGPT.
- **Pedido do Rodrigo:** tirar do CRM do Master os contatos sem uso há 24 h. Ele escolheu arquivar os 14 parados, incluindo as 3 conversas do WhatsApp.
- **Como:** arquivar (`archived=1`), igual ao botão do painel. Não apaga: o histórico fica no D1. Feito por um fluxo temporário do GitHub com o segredo `CLOUDFLARE_D1_TOKEN` (branch `ops/crm-contagem`), que só registrou contagens, sem nomes nem telefones.
- **Evidência:** antes havia 25 ativos (21 "chamar" do Caçador, 1 "contato", 3 "conversando" do WhatsApp), 14 com última mudança antes de 20/10 22:24 UTC. Execução de 21/10 ~22:30 UTC: "Arquivados: 14". Depois: 11 ativos (10 "chamar", 1 "contato").
- **Pendência:** a branch `ops/crm-contagem` ainda existe (o app bloqueou a exclusão por mim). Ela só roda com novo push; o Rodrigo pode apagá-la no GitHub.

## 2026-10-21 19h30 BRT — REGRA FIXA: ChatGPT cria 3 posts por dia e envia ao painel
- **Origem → destino:** Rodrigo (via Claude Code) → ChatGPT.
- **Decisão do Rodrigo:** o ChatGPT cria todo dia os posts das 09h, 12h e 19h da Flow Arts, no padrão de arte do Nexus, e envia pela pasta `agendamentos/`. Os posts chegam ao painel esperando aprovação; só o Rodrigo aprova.
- **Onde está a regra:** `REGRA_POSTS_DIARIOS.md` (rotina, arquivos, padrão da arte e do texto, checklist). Também citada em `AGENTS.md` e `BRIDGE_PROTOCOL.md`.
- **Estado:** o fluxo está na `main` (PR #346, c8c0990) e foi testado com 1 post. Esta regra é só documentação, em PR próprio.
- **Próximo passo:** a partir de 22/10, o ChatGPT segue a regra todo dia e registra o resultado em `HANDOFF_CHATGPT.md`.

## 2026-10-21 19h BRT — Envio da pasta `agendamentos` para o painel funcionou (correção em PR)
- **Origem → destino:** Claude Code → ChatGPT.
- **Problema:** o token de deploy (`CLOUDFLARE_API_TOKEN`) não lê o banco D1, então o fluxo não achava a Flow Arts e não subia nada.
- **Feito:** o Rodrigo criou na Cloudflare um token só de D1 (Editar) e o guardou no GitHub como segredo `CLOUDFLARE_D1_TOKEN` (21:53 UTC). Na branch `agendamentos`, o fluxo usa esse token, aceita só respostas válidas do D1 e trata erro da API como falha. Também passou a ignorar arquivos apagados da pasta, para não reenviar post ao remover um arquivo.
- **Evidência:** execução 39682635642 (branch `agendamentos`, 21:55 UTC) → "2026-10-22/1500: post enviado ao painel, esperando aprovação". O Rodrigo confirmou que o post apareceu no painel. É um post de teste marcado "NÃO APROVAR"; não aprovar.
- **Removido do PR:** a pasta de teste `agendamentos/2026-10-22/1500`.
- **Testes:** Node/Python não estão nesta máquina; só `bash -n` no script. A prova é a execução real acima.
- **Estado:** PR da branch `agendamentos` para a `main` aberto, **aguardando merge do Rodrigo**. Sem mudança em `cloudflare/` ou `public/`, então o merge não faz deploy.
- **Próximo passo:** depois do merge, o ChatGPT pode salvar os posts do dia em `agendamentos/AAAA-MM-DD/HHMM/`. O Rodrigo pode apagar/reprovar o post de teste no painel.

## 2026-10-21 BRT — ROTINA DIÁRIA DO CHATGPT: 3 posts por dia direto no painel
- **Origem → destino:** Rodrigo (via Claude Code) → ChatGPT. O Rodrigo quer que o ChatGPT crie as artes (sem gastar tokens da OpenAI do Nexus) e que elas cheguem sozinhas ao painel.
- **Estado (atualizado 21/10 19h):** o envio **funciona na branch `agendamentos`** com o segredo `CLOUDFLARE_D1_TOKEN` (ver entrada acima). O erro 7403 do token antigo está resolvido. A correção vai para a `main` no PR #346; a branch `agendamentos` continua sendo onde os posts são salvos.
- **Como funciona:** cada post salvo em `agendamentos/AAAA-MM-DD/HHMM/` sobe para o painel da Flow Arts **esperando a aprovação do Rodrigo**. Nada é publicado sem o OK dele. Detalhes em `agendamentos/README.md`.

### O que fazer todo dia (até umas 08h de Brasília)
1. Ler as "REGRAS NOVAS PARA OS POSTS" logo abaixo (público de comida, 70% dica útil, sem robô/neon/azul, nada de circo).
2. Criar 3 posts do dia: **09:00, 12:00 e 19:00**. Preferir carrossel 4:5 (1080×1350); post de 1 imagem para pergunta ou prova.
3. Salvar cada um na branch `agendamentos` do repositório `flowarts2027-art/SERVIDOR-NEXUS-2.0`:
   - `agendamentos/AAAA-MM-DD/0900/` → `01.jpg`, `02.jpg`… (ou `imagem.jpg`) + `legenda.txt`
   - `agendamentos/AAAA-MM-DD/1200/` → idem
   - `agendamentos/AAAA-MM-DD/1900/` → idem
   - Se a branch `agendamentos` não existir, criar a partir da `main` atual.
4. Conferir na aba Actions do GitHub o fluxo "NEXUS Agendar conteúdo pronto": cada post deve aparecer como "enviado ao painel, esperando aprovação".
5. Avisar o Rodrigo que os 3 posts estão no painel para ele aprovar, e registrar em `HANDOFF_CHATGPT.md` (sem colar imagens nem dados privados).

### Se não conseguir salvar imagens no GitHub
Entregue as 3 artes e as 3 legendas ao Rodrigo, identificadas por horário. Ele sobe no Master › Postagens › "Subir conteúdo do cliente" (cliente Flow Arts, deixar o cliente aprovar). Registre no `HANDOFF_CHATGPT.md` que o envio pelo GitHub não funcionou e o motivo.

## 2026-10-21 BRT — REGRAS NOVAS PARA OS POSTS DA FLOW ARTS (auditoria do Instagram) — vale para TODO post a partir de hoje
- **Origem → destino:** Rodrigo (via Claude Code) → ChatGPT. Pedido do Rodrigo: auditar o Instagram e mandar ao ChatGPT como melhorar os posts para ter mais visualizações.
- **Diagnóstico completo:** topo de `AUDITORIA-FLOW-ARTS.md`. Resumo: 9 seguidores; os 12 posts de 13/10 a 20/10 somam 1 curtida e 2 comentários de teste. Quase todo post é anúncio ("A Flow cuida do seu Instagram"), cada post fala com um nicho diferente, e o visual usa robôs, neon e azul, que a marca proíbe.
- **Estado:** regras registradas. O Nexus (código) ainda não foi alterado; os agentes de imagem continuam pausados desde 16/10.
- **Aplicar também aos 3 posts de hoje (tarefa logo abaixo).**

### Regras (siga ao criar cada post)
```yaml
objetivo: "mais visualizações de NÃO seguidores; medir por envios, salvamentos e visitas ao perfil"
publico_foco_14_dias:
  quem: "donos de negócios de comida local: pizzarias, cafés, confeitarias, lanchonetes e restaurantes pequenos"
  por_que: "já é o tema da maioria dos posts e das cenas; um público só ajuda o Instagram a saber para quem mostrar"
  proibido: "pular de nicho a cada post (pet shop, estética automotiva etc.) nestas 2 semanas"
mistura_de_conteudo:
  util_para_o_dono: 70%   # dica que ele aplica hoje sem contratar ninguém
  prova: 20%              # produto funcionando: painel aprovando, QUERO → direct → guia, antes/depois
  oferta: 10%             # no máximo 1 em cada 10 posts fala "a Flow Arts faz por você"
proibido_no_texto:
  - "abrir com 'Você cuida do X. A Flow cuida do seu Instagram' (repetido demais)"
  - "preço, cliente inventado, número inventado, depoimento inventado, promessa de seguidores ou vendas"
formato_preferido:
  - "carrossel 4:5 de 5 a 7 cartões com passo a passo ou checklist (gera salvamento)"
  - "Reel só se for vídeo real de 7 a 15 s com gancho no 1º segundo; imagem com zoom NÃO"
  - "post de imagem única só para pergunta ou prova"
gancho:
  max_palavras_na_arte: 7
  regra: "fala da dor do dono, não da Flow Arts; tem que caber inteiro na arte, sem corte"
  exemplos:
    - "Sua pizza é boa. A foto não."
    - "3 fotos que todo café deveria postar"
    - "Por que ninguém comenta seus posts"
visual:
  - "foto realista de negócio de comida de verdade, luz natural, cores naturais"
  - "NADA de robô, neon, holograma, tom azul ou cara de ficção científica"
  - "mesmo modelo em todos: mesma fonte, título sempre na mesma posição, dentro da área segura"
  - "sem logo (é colocado depois); nada de circo, acrobacia ou malabares"
legenda:
  linha_1: "palavra-chave de busca + gancho (ex.: 'Marketing para pizzaria: ...')"
  corpo: "3 a 5 frases curtas ou passos numerados"
  cta_principal: "pedir ENVIO ou SALVAMENTO: 'Mande para um dono de pizzaria' / 'Salve para usar no próximo post'"
  cta_final: 'Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁'
  hashtags: "3 a 5, do público foco (ex.: #MarketingParaRestaurantes #Pizzaria #Confeitaria #PequenosNegocios #FlowArts)"
frequencia: "1 post por dia bem feito vale mais que 3 fracos; os 3 de hoje seguem por pedido do Rodrigo"
```

### O que NÃO depende do ChatGPT (fica para o Rodrigo decidir)
1. **Distribuição:** com 9 seguidores, nenhum post sozinho alcança muita gente. Precisa de ação diária: 20 a 30 min comentando de verdade em perfis de negócios de comida, Stories todo dia e posts em colaboração com negócios que receberem o exemplo grátis.
2. **Anúncio pago** de R$ 10 a 20 por dia, por 7 dias: só com OK do Rodrigo.
3. **Métricas:** para medir de verdade, o Rodrigo manda 1 vez por semana os Insights de 7 dias (visualizações, % de não seguidores, envios, salvamentos, visitas ao perfil, seguidores ganhos).
4. **Nexus (código):** alinhar campanha e agentes a estas regras exige mudar o Worker (deploy). Proposto ao Rodrigo; nada alterado.

## 2026-10-21 BRT — TAREFA PARA O CHATGPT: criar os 3 posts de hoje da Flow Arts (09h, 12h e 19h)
- **Origem → destino:** Rodrigo (via Claude Code) → ChatGPT. Pedido explícito do Rodrigo para registrar aqui; ele vai pedir ao ChatGPT para ler e executar.
- **Estado:** planejado. Nada criado, enviado ou agendado pelo Claude.

### ⚠️ Leia antes de tudo: o que é a Flow Arts
- **Flow Arts = agência de marketing e automação com IA** para pequenos negócios do Brasil, atendidos 100% online. Instagram: @flowarts2026.
- **NÃO é "flow arts" de circo.** Nada de acrobacia, malabares, poi, bambolê, bastão, fogo, contorcionismo, dança, palco, circo ou artistas performáticos. Se a imagem ou o texto lembrar isso, está errado: refaça.
- O que a Flow Arts vende: marketing e automação de Instagram 24h com IA, além de sites, fotos e vídeos para pequenos negócios.
- Público: donos de pequenos negócios (cafés, salões, lojas, restaurantes, prestadores de serviço) que não têm tempo para postar.
- Tom: próximo, direto, prático e confiante; frases curtas; pt-BR simples; transparente sobre o uso de IA.

### Regras (valem para os 3 posts)
- Formato: **post de imagem 4:5 (1080×1350)**. Sem vídeo (decisão do Rodrigo em 14/10).
- Imagem: fotografia realista, cores naturais, luz natural. **Sem tom azul, filtro azul ou neon.** Sem logo (é colocado depois). Uma cena clara. Pessoas só como donos de negócio ou clientes comuns.
- Texto na arte: só o título curto indicado abaixo, em português, sem erro de digitação. Confira letra por letra.
- Proibido: preços ou valores; citar Global Play, outros clientes ou concorrentes; inventar clientes, números, resultados ou depoimentos; prometer seguidores ou vendas; falar de streaming ou entretenimento.
- Legenda: gancho na 1ª linha → problema → dica → CTA do post → linha final do brinde: `Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁`
- Hashtags: `#FlowArts #MarketingDigital #Automacao #InteligenciaArtificial #PequenosNegocios`

### Post 1 — 09:00
- **Tema:** erros de imagem que afastam clientes de pequenos negócios.
- **Título na arte:** "Esse erro afasta seus clientes"
- **Gancho da legenda:** "Seu Instagram pode estar afastando clientes sem você perceber."
- **Conteúdo:** 3 erros comuns (foto escura e tremida, perfil sem bio clara, posts sem padrão) e como corrigir cada um.
- **CTA:** "Salve para usar depois."
- **Cena da imagem:** antes e depois do mesmo produto de uma padaria ou café, lado a lado sobre uma mesa: à esquerda, foto escura e amadora de celular; à direita, a mesma foto clara e profissional.

### Post 2 — 12:00 (dia 21 da campanha)
- **Tema:** perguntas que todo cliente faz antes de contratar marketing com IA.
- **Título na arte:** "Antes de contratar, você pergunta isso?"
- **Gancho da legenda:** "Você tem alguma destas 3 dúvidas antes de contratar marketing com IA?"
- **Conteúdo:** responder com honestidade 3 dúvidas: (1) "Imagem de IA parece falsa?" → por isso existe o exemplo grátis antes de contratar; (2) "Vou perder o controle do meu Instagram?" → nada é publicado sem a aprovação do cliente no painel; (3) "Deve ser caro?" → a IA reduz o custo de estúdio e produção; peça o exemplo grátis primeiro. Sem citar preço.
- **CTA:** "Qual dessas é a sua dúvida? Responda nos comentários."
- **Cena da imagem:** dona de um pequeno salão ou café, sentada no balcão, olhando o celular com expressão de dúvida, luz natural de fim de tarde.

### Post 3 — 19:00 (dia 21 da campanha)
- **Tema:** transparência — o que a IA faz e o que a gente revisa.
- **Título na arte:** "A IA cria. A gente revisa."
- **Gancho da legenda:** "Sim, usamos IA. E é por isso que você ganha tempo."
- **Conteúdo:** a IA ajuda a criar fotos, textos e ideias de post; uma pessoa revisa tudo; o cliente aprova no painel antes de qualquer publicação; nada sai sem o OK dele.
- **CTA:** "Siga a Flow Arts para mais dicas de marketing com IA."
- **Cena da imagem:** mesa de trabalho vista de cima: notebook com uma grade de fotos de produtos de um café, celular mostrando um feed, caderno com anotações de revisão e uma xícara de café; sem pessoas.

### Entrega esperada do ChatGPT
1. As 3 artes 4:5 e as 3 legendas completas, identificadas por horário (09h, 12h, 19h).
2. Antes de entregar, conferir: nenhuma imagem com circo, acrobacia ou malabares; texto da arte sem erro; sem tom azul; sem preço; sem cliente inventado.
3. Entregar ao Rodrigo para revisão. **Não publicar.** O Rodrigo sobe no painel e aprova; só depois o Nexus publica no horário.
4. Registrar o resultado em `HANDOFF_CHATGPT.md`, sem colar as imagens nem dados privados.

## 2026-10-21 BRT — Monitoramento passa a vigiar a Flow Arts (PR #338, integrado)
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido:** Rodrigo pediu, em branch própria e sem merge, trocar Global Play/Ragnar pela Flow Arts (`primeiro-teste`) no monitoramento e no teste noturno.
- **Diagnóstico (só leitura):** os alertas #331, #333, #334 e #335 eram falsos. O teste noturno e o Sentinel procuravam `globalplay-streaming` e `ragnar-one`, que estão arquivados e não aparecem mais em `/api/autonomy-health`; o `jq` saía com código 4. O #332 (`ok=false`) é real: `CREATOR`, `DESIGNER` e `FORMAT BUILDER` estão pausados desde 16/10 e ficam "stale".
- **Alterado (branch `fix/monitor-flowarts`):** `.github/workflows/nexus-overnight-regression.yml` confere o ciclo da `primeiro-teste` (sem exigir agentes frescos, por causa da pausa); `.github/scripts/nexus-autofix-policy.mjs` separa `CYCLE_CLIENTS` (Flow Arts) de `INSTAGRAM_CLIENTS`; testes em `nexus-autofix.test.mjs`. Nada em `cloudflare/` ou `public/`, então o merge não faz deploy.
- **Não alterado de propósito:** a checagem do Instagram continua nas contas antigas, porque `/api/instagram-publishing-health` só valida essas duas. Incluir a Flow Arts exige mudar o Worker (deploy) — decisão do Rodrigo. `nexus-audit.mjs` e o comando de `nexus-core-autonomy.yml` para `ragnar-one` também não foram mexidos.
- **Testes:** não rodados localmente (Node ausente). O CI do PR roda `nexus-autofix.test.mjs`; o teste noturno só usa a `main`, então só é comprovado depois do merge.
- **Resultado:** com OK do Rodrigo, PR #338 juntado (71df078). CI e Overnight Regression passaram em 71df078; sem deploy. Alertas #331, #333, #334 e #335 fechados como falsos. #332 segue aberto (agentes pausados).

## 2026-10-21 BRT — Auditoria da memória e correção do estado do CRM
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido e objetivo:** Rodrigo pediu uma auditoria do Nexus (memória do ChatGPT + mudanças recentes no Git) e depois a correção da memória sobre o PR #330, numa branch própria.
- **Decisões confirmadas:** só documentação; nenhum código, deploy ou mensagem. `HANDOFF_CHATGPT.md` não foi editado (é histórico do ChatGPT); a correção ficou aqui, no `PROJECT_STATE.md` e no `TASK_BOARD.md`.
- **Executado e evidências:**
  - Lidos `BRIDGE_PROTOCOL`, `TASK_BOARD`, `HANDOFF_CHATGPT`, `HANDOFF_CLAUDE`, `PROJECT_STATE`, `KNOWN_ISSUES` e `AUDITORIA-NEXUS-2026-10-16`.
  - Git: `main` local = `origin/main` = f31375f (merge do PR #330, 20/10 10:47 BRT). O PR #328 também está na `main`. Diff de código desde 19/10: 9 arquivos (+414/−60), CRM e testes.
  - Corrigido: `TASK_BOARD` (linha CRM-INSTAGRAM-001 estava fora da tabela e dizia "sem deploy"; BRIDGE-001 atualizado) e `PROJECT_STATE` (nota de correção no topo). Branch `docs/memoria-merge-pr330`.
  - Testes não reexecutados: Node não está instalado na máquina desta sessão; `gh` também não, então o workflow de deploy não foi consultado.
- **Problemas encontrados para acompanhar:**
  - `PROJECT_STATE.md` (entradas de 12/10) cita telefone, CNPJ e um vazamento de senha pessoal. O repositório é público; avaliar com o Rodrigo se esses trechos devem ser resumidos.
  - "Prioridade zero" (Getify/MySQL) segue sem confirmação do Rodrigo.
  - CI vermelho no passo de overlay de vídeo desde 11/10 (ver `KNOWN_ISSUES`).
- **Estado:** integrado à `main` no PR #336 (be02f72); somente documentação, sem deploy.
- **Próximo passo para quem assumir:** conferir no GitHub Actions o deploy de f31375f e testar no Master um contato real do CRM, sem enviar mensagem. Ao registrar novas entregas, marcar o estado depois do merge.
- **Bloqueios / autorização necessária:** merge desta branch e qualquer teste em produção dependem do OK do Rodrigo.

## Instruções deste arquivo
- **Ao assumir:** leia a entrada mais recente em `HANDOFF_CHATGPT.md`, os sete arquivos de memória citados em `AGENTS.md` e o quadro `TASK_BOARD.md`.
- **Ao terminar:** acrescente no topo uma entrada com data/hora de Brasília, tarefa, decisões, arquivos/commits/PRs efetivamente alterados, testes reais e falhas, status de deploy, pendências e próximo passo para o ChatGPT.
- **Segurança:** não colar segredos, prompts confidenciais, conversas completas nem dados identificáveis de clientes neste repositório público.

## 2026-10-28 (07h) — GILTEC: 7 artes com logo enviadas ao painel (Claude)
- Pedido do Rodrigo: o limite do ChatGPT Work acabou; Claude pegou as imagens já prontas e subiu ao painel.
- Origem: pacote do ChatGPT `GILTEC_2026-10-28_Com_Logo.zip` (biblioteca do ChatGPT), mesmas 7 imagens descritas em `clientes/giltec/README.md`, já com a logo oficial. Conferência visual feita: logo presente nas 7; posts 1080×1350, stories 1080×1920.
- Envio pela rota do Master `/api/master/upload` (mesma da página Enviar artes), cliente `giltec`, dia 28/10/2026, `approval=cliente`, `noDuplicate=1`. Resposta 200 e `approval: pending` em todos:
  - Carrossel 09:00 (compactador + betoneira, 2 cartões) com legenda 0900 do GitHub
  - Post 12:00 martelete com legenda 1200
  - Post 19:00 gerador com legenda 1900
  - Stories 09:00 (obra de casa), 12:00 (reforma), 19:00 (rodovia)
- Estado: no painel da GILTEC esperando aprovação do cliente. Nada aprovado nem publicado pelo Claude. Imagens NÃO foram gravadas em `agendamentos/` (evitar reenvio duplicado).
- Próximo passo: cliente aprova no painel. Amanhã: ChatGPT cria só os posts do dia, com a logo, sem repetir o equipamento principal no mesmo horário.

## 2026-10-28 (07h30) — Campanha diária com o Gemini (PR aberto, aguardando OK do Rodrigo)
- Pedido do Rodrigo: o ChatGPT Work e os chats têm limite diário; ele quer que o Nexus gere as artes sozinho com o Gemini. Ele criou a chave no Google AI Studio e gravou o segredo `GEMINI_API_KEY` no Worker `servidor-nexus` (Cloudflare). A chave nunca passou pelo chat nem pelo repositório.
- Código novo: `cloudflare/src/gemini-campaign.js` + `cloudflare/src/client-logos.js` (logo original da GILTEC embutida, sem redesenho).
  - Cron de 15 min: entre 6h e 8h de Brasília gera o pacote do dia de cada cliente em `GEMINI_DAILY_CLIENTS` (começa só com `giltec`).
  - Pacote GILTEC: carrossel 09h (2 cartões), post 12h, post 19h e 3 stories (09h, 12h, 19h). Ciclo de 4 dias: 4 equipamentos confirmados, um por peça; mesmo horário nunca repete o equipamento do dia anterior; betoneira alterna carrossel/post.
  - Imagens: `gemini-2.5-flash-image` (Nano Banana), 4:5 e 9:16, sem texto. Logo aplicada por cima (canto superior direito) via binding IMAGES.
  - Legendas: primeiro as do GitHub (`agendamentos/clientes/giltec/...`), senão o Gemini escreve (`gemini-2.5-flash`), sempre com QUERO; senão a legenda pronta do nicho.
  - Envio pelo mesmo caminho do Master (`masterUpload`), `approval=cliente`, `noDuplicate=1`: tudo fica ESPERANDO APROVAÇÃO.
  - Limite de gasto: `GEMINI_MONTHLY_LIMIT_USD=20` (para de gerar ao chegar). Custo estimado US$ 0,039/imagem (`GEMINI_IMAGE_COST_USD`).
  - Botão/rota manual: `POST /api/master/gemini-campanha` {clientId, date} com login do Master.
- Testes: 614/614 na suíte (7 novos em `test/gemini-campaign.test.mjs`). Dry-run do wrangler não rodou na nuvem (sem rede para npm); o deploy do GitHub confere.
- Não altera a pausa da OpenAI (`NEXUS_IMAGE_GENERATION` continua desligada).
- Próximo passo: Rodrigo aprova o PR → deploy automático → amanhã (29/10) às 6h o Nexus gera a GILTEC sozinho. Conferir no painel às 8h. Depois: logo automática também na página Enviar artes e outros clientes.

## 2026-10-28 (07h45) — Mesmo PR #430: regras de formato no Gemini + Captador da GILTEC
- Regras completas de formato no pedido de cada imagem do Gemini (sem texto, sem borda, espaço da logo, zonas seguras do story, EPI, ângulo diferente por peça). Resumo em `docs/nexus-memory/GEMINI_IMAGENS.md`. Logo do story desceu para baixo dos 14% de cima.
- Captador da GILTEC (pedido do Rodrigo): o foco não é loja de material de construção. Tipos agora: construtora, reformas/empreiteiras, pavimentação/obras em rodovias, terraplenagem, engenharia civil e **locadoras de equipamentos** (novo). "Material de construção" saiu.
  - Nos tipos de construção, loja de material, ferragem, depósito, madeireira e home center são descartados da busca (Google e mapa grátis).
  - A lista antiga salva no painel da GILTEC é trocada uma vez pela nova (versão 2026-10-28); depois respeita o que o cliente salvar.
  - Contatos de loja de material que já estavam na lista continuam lá; o cliente pode pular.
- Testes: suíte completa verde (ver PR). Falta o merge do Rodrigo.

## 2026-10-28 (08h) — Painel: artes GILTEC movidas; Gemini ganha a Flow Arts
- Achado no painel: 6 artes da GILTEC (tema azul com título, ícones e "COMENTE QUERO") estavam no painel da **Flow Arts**, já aprovadas para sair às 9h no @flowarts2026. Com o OK do Rodrigo: excluídas da Flow Arts e reenviadas ao painel da GILTEC (carrossel 09h com 5 cartões, posts 12h e 19h, 3 stories), esperando aprovação, com as mesmas legendas. As 6 "só foto" que o Claude subiu às 7h na GILTEC foram excluídas (sem duplicar horário).
- Atenção: o carrossel movido tem cartões estreitos no meio de fundo azul (o defeito da Regra 3 do CAMPANHA_GILTEC). Rodrigo avisado.
- Rodrigo gostou do tema dessas artes para a GILTEC, mas pediu mais variedade de equipamento (betoneira demais). Próximo trabalho: o Nexus montar título, ícones e botão por cima da foto do Gemini, sem a IA escrever texto.
- Gemini: novo plano da **Flow Arts** (`primeiro-teste`), tema da agência e sem equipamentos da GILTEC; 3 temas em rodízio (Captador de clientes; "App de agendar post não cria post"; Instagram como cartão de visita). Carrossel 09h com 5 cartões, posts 12h e 19h, 3 stories; símbolo da Flow Arts pequeno embaixo. A Flow Arts NÃO está no automático das 6h (só pela rota manual do Master), para não brigar com o ChatGPT.
- Regras de obra (EPI) agora só nas artes da GILTEC.

## 2026-10-28 (08h) — Imagens grátis no Cloudflare (sem plano pago)
- Teste real às 07h43: a rota manual chamou o Gemini e o Google recusou todas as imagens (429 RESOURCE_EXHAUSTED): a chave está no plano grátis, que não gera imagem. Nada gasto, nada enviado. Rodrigo NÃO quer plano pago.
- Solução: Workers AI do próprio Cloudflare (binding `AI`), cota grátis de 10 mil neurônios por dia. Modelo `@cf/black-forest-labs/flux-2-klein-4b` com tamanho livre (1024×1280 feed, 768×1344 story); reserva `flux-1-schnell`. Custo contado = 0.
- Legendas: Gemini (se a chave responder) → senão Llama 3.3 no Cloudflare (grátis) → senão legenda pronta do nicho. Sempre com QUERO.
- Variável `NEXUS_FREE_IMAGE_PROVIDER=cloudflare` (troca para `gemini` se um dia houver plano pago). O nome do módulo continua `gemini-campaign.js`.
- Risco: o token de deploy precisa aceitar o binding `ai`; conferir o deploy depois do merge.

## 2026-10-28 (08h10) — Geração manual em fila + diagnóstico; resposta automática da GILTEC
- Depois do deploy do Cloudflare Workers AI (PR #433), a rota manual da Flow Arts (29/10) ficou mais de 4 minutos sem responder e nada chegou ao painel. Sem acesso aos logs da Cloudflare nesta sessão.
- Correção: o POST `/api/master/gemini-campanha` só coloca o pedido numa fila; o cron de 1 minuto (até 15 min de execução) gera. GET na mesma rota mostra andamento, resultado e erro. Nova rota `POST /api/master/gemini-teste` gera 1 imagem sem enviar e mostra modelo, tempo e erro. Tempo máximo por chamada de IA: 90 s (imagem), 60 s (reserva e legenda).
- Resposta automática da GILTEC (@rose.giltec3): verificado pelo Master que está DESLIGADA no painel da GILTEC (`enabled:false`), nunca rodou, e a GILTEC não tem WhatsApp cadastrado em "Meu negócio". Por isso o comentário QUERO não recebe direct. Falta: número de WhatsApp da Rose e ligar a resposta automática (com o OK do Rodrigo). O webhook da Meta está chegando para outras contas.
- 08h05: Rodrigo excluiu a campanha da Flow Arts de 29/10 (gerada pelo Cloudflare): "horrível, sem sentido, sem texto nas imagens e com logo duplicada" (a IA inventou um símbolo além do verdadeiro). Decisão: **pausar** a geração automática (`GEMINI_DAILY_CLIENTS` vazio) até o novo estilo com título, ícones e botão escritos por código (como as artes azuis da GILTEC que ele aprovou).
- 08h05: com o OK do Rodrigo, preenchido o "Meu negócio" da GILTEC (locação de equipamentos, estado do RJ, WhatsApp da Rose) e **ligada** a resposta automática da GILTEC (QUERO, preço, valor, orçamento, aluguel, locação, info, interesse → direct da Rose com botão do WhatsApp).

## 2026-10-28 (08h40) — Campanha diária com texto escrito por código (GILTEC e Flow Arts)
- Rodrigo aprovou o estilo da prévia (logo verdadeira, título de 3 linhas com a última em destaque, 3 vantagens com ícones, botão "COMENTE QUERO"; no story "MANDE QUERO NO DIRECT").
- Novo fluxo `.github/workflows/nexus-campanha-diaria.yml`, todo dia às 4h17 (Brasília) e manual (workflow_dispatch com dia e clientes): pede as fotos à IA grátis do Cloudflare (`POST /api/master/foto`, sessão temporária do Master), monta as artes com `scripts/social/campanha_diaria.py` (Pillow, fonte Inter), confere com `checar-arte.py` e sobe pelo `agendar-pasta.sh` (esperando aprovação; não duplica horário). Guarda as artes na branch `agendamentos`.
- Textos fixos em `scripts/social/campanha/conteudo.json` (sem IA no texto): GILTEC com ciclo de 4 equipamentos (um por peça) e 6 stories; Flow Arts com 3 temas em rodízio (App de agendar não cria post; Captador de clientes; Instagram como cartão de visita). Legenda que o ChatGPT deixar na pasta tem prioridade.
- A geração do Worker (`gemini-campaign.js`, cron das 6h) continua pausada (`GEMINI_DAILY_CLIENTS` vazio).

## 2026-10-28 (09h) — Padrão fixo das artes (texto nunca em cima de pessoa)
- Campanha de 29/10 (GILTEC e Flow Arts) subiu ao painel às 08h40 pelo fluxo novo (12 peças, esperando aprovação). Rodrigo: imagens da Flow Arts boas, mas o texto passava por cima da cabeça das pessoas e a fonte ficou ruim. Pediu uma regra permanente.
- Criado `docs/nexus-memory/PADRAO_ARTES.md` (citado no AGENTS.md): título em faixa própria em cima, vantagens e botão em faixa própria embaixo, foto só no meio; fundo das faixas = a própria foto desfocada e escurecida; Montserrat ExtraBold (o GitHub baixa do google/fonts; reserva Inter); uma logo só.
- `campanha_diaria.py` reescrito nesse padrão; `checar-arte.py` aprova. Fluxo ganhou o modo **prévia** (não manda ao painel; grava na branch `previa-artes`).
- Próximo passo: merge → prévia de 29/10 → se o Rodrigo aprovar, trocar as 12 peças de 29/10 no painel pelas novas.

## 2026-10-28 (10h) — Biblioteca de artes (todos os clientes) + regra do Manus
- Pedido do Rodrigo: subir várias artes de uma vez e o Nexus organizar sozinho (legenda, story/post/carrossel, horários, apagar repetidas), no painel de todos os clientes; e integrar o Manus para gerar as imagens.
- Código: `cloudflare/src/art-library.js`. Painel do cliente: aba **Biblioteca** (`public/biblioteca.js`, rotas `/api/portal/biblioteca`). Master: `/biblioteca.html` (rotas `/api/master/biblioteca?clientId=`), botão no Master.
  - Repetida (mesmo arquivo) é descartada na hora. Imagem em pé (altura ≥ 1,5× largura) = story; 2 a 5 imagens do mesmo envio = carrossel das 09h; o resto = post de 12h/19h.
  - Legenda escrita olhando a imagem (`@cf/meta/llama-4-scout-17b-16e-instruct`, grátis), com o QUERO; se falhar, legenda pronta do ramo.
  - Programa nos próximos horários livres (7 dias), esperando aprovação. De hora em hora o cron programa o que ficou livre.
  - Tira da fila posts repetidos (mesma imagem) que ainda não saíram, ficando o primeiro.
- Regra para o Manus: `docs/nexus-memory/MANUS_REGRA.md` (segue o PADRAO_ARTES e envia pela Biblioteca do Master).
- 28/10 09h30: Rodrigo excluiu as peças de 29/10 da Flow Arts; pediu a campanha da Flow Arts para HOJE (28/10). Rodada manual 40688399031 (só 12h e 19h e stories; 09h já tinha passado). As 6 peças antigas da GILTEC de 29/10 continuam no painel.
- Testes: 624/624.

## 2026-10-28 (11h) — Fichas dos clientes para o app do Gemini (fluxo manual)
- Pedido do Rodrigo: usar a assinatura do Gemini (app, sem API) para gerar as artes de cada cliente, no computador, e subir pelo painel do próprio cliente, até decidir outra solução. Não quer criar documento no Drive para cada cliente.
- Criada a pasta `gemini/` (PR `feat/gemini-fichas`): `LEIA-PRIMEIRO.md` (papel do Gemini + padrão das artes), `clientes/giltec.md`, `quatree-dog.md`, `maskara-assessoria.md`, `flow-arts.md`, `_MODELO.md` (cliente novo) e `logos/` (GILTEC e Flow Arts).
- Branch pequena `gemini` (só essas fichas e logos) já publicada, commit `f212bda`. O Rodrigo importa ela no Gemini: + → Importar código → link da branch.
- Fluxo `.github/workflows/gemini-fichas.yml`: depois do merge, toda mudança em `gemini/` na main recopia a branch `gemini` sozinha.
- **Diferença do PADRAO_ARTES:** neste fluxo manual não há código para escrever o texto e pôr a logo (a página Enviar artes não faz isso). O Gemini faz a arte completa, seguindo o mesmo layout (faixas em cima e embaixo, texto fora das pessoas). O Rodrigo confere a ortografia e a logo antes de subir.
- Cores da Maskara (escuro + dourado) são sugestão: o Rodrigo ainda não deu as cores oficiais.
- O Gemini do app lê uma cópia da branch no momento da importação e não escreve no GitHub.
- Próximo passo: Rodrigo aprova o PR; testar com a GILTEC no Gemini.

## 2026-10-28 — Botão da Biblioteca de artes no Master
- Pedido do Rodrigo: ele não achava a Biblioteca no Master (era um link azul fino em Postagens).
- Mudança: `public/index.html` — o link virou um botão grande verde, com letra branca e forte, logo abaixo de "Enviar artes do dia".
- Testes do Worker: 624/624 passando.
- Próximo passo: Rodrigo sobe as artes da GILTEC (30/10 a 01/11) pela Biblioteca, um envio por grupo (cartões do carrossel juntos, posts juntos, stories juntos).

## 2026-10-28 — Miniaturas da Biblioteca apareciam quebradas no Master
- Causa comprovada no navegador do Rodrigo: ele estava logado no Master e no painel da Flow Arts ao mesmo tempo. Em `/media/library/<cliente>/...` o Nexus achava a sessão do painel (outro cliente) e nem conferia a do Master → 401.
- Correção: `cloudflare/src/index.js` (mediaResponse) passa a conferir o Master quando a sessão do painel é de outro cliente. Testes 624/624.
- Ponto em aberto: a Biblioteca programa no próximo horário livre, inclusive hoje (um post da GILTEC caiu em 28/10 19h, e o Rodrigo queria a partir de 30/10).

## 2026-10-28 — Biblioteca pula dia que já tem postagem
- Pedido do Rodrigo: "se já tiver alguma para o dia, ajusta para o dia seguinte".
- `cloudflare/src/art-library.js`: `freeSlots` agora conta as postagens desde 00h do dia (Brasília). Dia com qualquer post (feed) fica fora para o feed; dia com story fica fora para story. Posts que a própria Biblioteca programou não fecham o dia (ela continua enchendo os outros horários). Janela passou de 7 para 14 dias.
- Testes 624/624. Teste novo cobre dia ocupado, dia da própria Biblioteca e story separado.

## 2026-10-28 — Biblioteca escreve o texto nas artes que chegam sem texto
- Pedido do Rodrigo: imagens da GILTEC subiram só com a logo e faixas azuis vazias; o Nexus deve escrever o texto.
- `public/biblioteca.js`: ao subir, mede as faixas de cima e de baixo; se estão vazias, refaz a arte no padrão (PADRAO_ARTES.md) no navegador: logo verdadeira (`public/brand/giltec-logo.png`), título 3 linhas Montserrat ExtraBold, foto só no meio, 3 vantagens e botão. Botão novo "Pôr texto nas artes que estão sem texto" refaz as que já estavam programadas.
- `cloudflare/src/art-text.js` (rota `/texto`): a IA grátis só diz o assunto (lista fixa); o texto vem de tabela revisada. Só GILTEC tem tabela por enquanto.
- `art-library.js` `replaceProgrammedImage` (rota `/trocar`): grava a nova imagem com outro nome e troca o endereço no post (post publicado não muda).
- Testado no Chrome do Rodrigo com as artes reais: 9 de 14 detectadas como vazias e refeitas; as já com texto ficaram de fora. 2 artes vazias não são detectadas (faixa inclinada fina e uma com a cabeça do operário dentro da faixa) e ficam como estão.
- GILTEC aluga também cortadora, alisadora, guincho, escoras e torre de iluminação; marcas Buffalo, Toyama, CSM (ficha `gemini/clientes/giltec.md`).
- Testes 628/628.
- Pendências pedidas no mesmo dia: Captador da GILTEC ainda traz loja de material de construção; regra para todos: contato do CRM de busca sem mensagem em 2 dias é apagado; campanha da Maskara com imagens automáticas do Cloudflare.

## 2026-10-28 — Captador da GILTEC e limpeza de 2 dias no CRM (todos os clientes)
- Pedido do Rodrigo: ainda apareciam 2 lojas de material de construção na busca da GILTEC; e regra para todos: contato sem mensagem em 2 dias sai do CRM de busca.
- `captador.js`: filtro de loja de material mais forte (mat. de construção, cerâmica, telhas, loja, revestimentos, tipo `building_materials`...). "Casa do Construtor" (rede de locação) NÃO é mais cortada. Novo `cleanupLeads`: tira contatos em "hoje"/"novo" criados há mais de 2 dias e lojas de material que entraram antes do filtro; grava em `captador_skips` para não voltarem. Enviado, depois e fechou ficam. Roda ao abrir o Captador e antes de cada busca diária.
- Tipos novos para construção: incorporadora, empreiteira, saneamento, andaimes (versão de nichos `2026-10-28b` troca a lista salva da GILTEC uma vez).
- Mensagem da Rose cita todos os equipamentos e as marcas Buffalo, Toyama, CSM (se a GILTEC salvou outra mensagem no painel, vale a dela).
- Testes 630/630.

## 2026-10-28 — Maskara na campanha diária automática (Cloudflare)
- Pedido do Rodrigo: a campanha da Maskara passa a ter imagens automáticas pelo Cloudflare.
- `scripts/social/campanha/conteudo.json`: cliente `maskara-assessoria` com 4 dias que se alternam (post 09h, 12h, 19h + 3 stories), textos da ficha (CR, CRAF, guia, SIGMA, SINARM), legendas com "Comenta QUERO abaixo" e as hashtags da ficha. Fotos: escritório/documentos e clube de tiro SEM arma à vista.
- `scripts/social/campanha_diaria.py`: tema "maskara" (preto, dourado, botão "COMENTA QUERO ABAIXO"); post de 1 imagem às 09h quando o dia tem `post0900`. Sem logo oficial: escreve "MASKARA ASSESSORIA" por código no lugar (trocar quando o Rodrigo mandar a logo).
- Workflow `nexus-campanha-diaria.yml`: clientes padrão agora "giltec primeiro-teste maskara-assessoria" (todo dia 4h17). Tudo vai ao painel ESPERANDO APROVAÇÃO (na Maskara, o próprio cliente aprova e sai sozinho).
- Testado com fotos falsas (FOTO_FALSA=1): 6 peças geradas, textos certos.

## 2026-10-28 — Site novo da Flow Arts (flowarts.com.br)
- Pedido do Rodrigo: refazer o site, mais sofisticado e com movimento; não gostou do vídeo do celular no início nem do azul em excesso. Referências escolhidas: Attio e Igloo. Tema clean nas cores da logo (prata, quase preto, azul elétrico só nos detalhes). Aprovou a prévia e pediu para publicar.
- `public/site.html` reescrito: topo com globo 3D (pontos azuis = clientes), contador animado, cartões de empresas e botões de cidade (nomes ilustrativos); Como funciona; Instagram como cartão de visita (conversa animada, sem vídeo); comparação; pacotes com abas "empresas / pessoa física"; perguntas em `<details>`; chamada final; rodapé. Fonte Atkinson Hyperlegible + Manrope. Tudo para com "reduzir movimento" ou economia de dados. Botão fixo do WhatsApp no celular sem cobrir o rodapé.
- Correções da auditoria: selo "Captador de brinde" só no Completo; Tráfego e Completo + Tráfego aparecem como "Em breve" (dependem da Meta); FAQ e dados do Google atualizados ("Como eu pago?" sem "pagamento único").
- Páginas antigas indexadas (12 `marketing-para-*` e `/exemplo`): continuam no ar e no sitemap e agora ficam ligadas numa aba discreta do rodapé ("Outros segmentos que atendemos"), para o Google e o cliente chegarem ao site novo.
- Mantidos: dados do Google (JSON-LD), contador de visitas e cliques no WhatsApp, links de cadastro e WhatsApp. Sitemap: data da página inicial 2026-10-28.
- Testes: 630/630 (2 testes do vídeo antigo trocados por testes do site novo e da aba discreta). Conferido no navegador (Playwright) em 1440px e 390px, sem rolagem lateral.
- Pendente: merge do PR pelo Rodrigo (deploy automático). Próximo: atualizar Privacidade e Termos para citar o Captador (LGPD) e, depois, reescrever as páginas antigas como páginas por tipo de vendedor.

## 2026-10-28 — Site: cara de classificado de empresas
- Pedido do Rodrigo: o site precisa ter cara de oportunidade para o vendedor, como um classificado de empresas. Aprovou trocar o globo por um mural.
- Início: no lugar do globo, mural "Classificados de empresas" com contador de oportunidades e anúncios subindo devagar (pausa com o mouse), selos "Oportunidade nova" / "Aberta agora", telefone escondido e botão "Ver contato" (abre o WhatsApp da Flow Arts). Botões de cidade trocam o mural.
- Seção nova "Oportunidades de hoje" logo abaixo do início: filtros por ramo (Construção, Mercados e atacados, Transportadoras, Indústrias, Clínicas e escritórios) com 6 anúncios cada.
- Nomes de exemplo e telefones mascarados no código (só DDD + ••••-••••), com aviso "ilustrativos". Vídeo de fundo (marca d'água, 1920x1080) já estava no ar pelo PR #448.
- Testes: 630/630. Conferido em 1440px e 390px. Pendente: merge do Rodrigo.

## 2026-10-28 — Postar no Facebook junto com o Instagram
- Pedido do Rodrigo: "todo dia, postagem que for pro Instagram, quero que vá pro Facebook também". O Instagram da Flow Arts já está ligado à Página do Facebook (ele conferiu).
- Diagnóstico: o Nexus publica pelo login do Instagram (`graph.instagram.com`), que não posta no Facebook. O login do Facebook já existia (Radar e Tráfego, retorno `/api/oauth/facebook/callback`).
- Feito: `cloudflare/src/facebook-page.js` (novo). Conecta a Página pelo login do Facebook com `pages_manage_posts`, guarda a chave da Página criptografada (`facebook-page/connection/<cliente>`). Depois que post, carrossel ou Reel sai no Instagram, `publishInstagramPost` só anota na fila `facebook-crosspost`; o cron de 1 minuto publica um item por vez na Página (foto, carrossel com `attached_media`, Reel como vídeo). Stories não vão. Erro da Meta: tenta 3 vezes e guarda o último erro. Nunca derruba nem atrasa o Instagram.
- Master › Integrações › "Postar no Facebook": botão Conectar Página e Pausar/Ligar (`public/facebook-page.js`). Desligar tudo: `NEXUS_FACEBOOK=off` na Cloudflare.
- Testes: 637/637 (7 novos em `test/facebook-page.test.mjs`). Nada publicado de verdade.
- Pendente: merge do Rodrigo; depois ele toca em Conectar Página no Master e autoriza a Página da Flow Arts. Para clientes que não são admins do app, a Meta precisa aprovar `pages_manage_posts` na análise do app.

## 2026-10-28 (noite) — Alice: atendente do WhatsApp com Gemini (ouve áudio, vê imagem, parece gente)
- Pedido do Rodrigo: agente humanizada no WhatsApp da Flow Arts, com as informações do site, chamada Alice, que ouve áudio e entende imagem; e os 4 "truques" de atendente quase humana (voz, digitando, mensagens picadas, memória). Sem pagar API.
- Feito nesta branch (`feat/whatsapp-alice`): `cloudflare/src/whatsapp-alice.js` (novo) e mudanças em `whatsapp-agent.js` e `whatsapp-knowledge.js`.
  - Com o segredo `GEMINI_API_KEY` (o mesmo das imagens, plano grátis), a resposta passa a ser do Gemini (`gemini-2.5-flash`, troca com `WHATSAPP_GEMINI_MODEL`). Voltar ao ChatGPT: variável `WHATSAPP_AI=openai`. Se o Gemini falhar, cai no caminho antigo (OpenAI → aviso seguro).
  - Áudio e imagem: baixa o arquivo da Meta com o token e manda direto ao Gemini; o que ela ouviu/viu fica salvo no histórico como "[áudio] ..." / "[imagem] ...".
  - Jeito de gente: "digitando…" (marca como lida + typing_indicator), pausa de 1 a 4,5 s por mensagem e 1 a 3 mensagens curtas.
  - Memória por contato: coluna nova `memory_json` em `whatsapp_contacts` (nome, negócio, cidade, vende para, interesse, observação), só com o que a pessoa disse.
  - Conhecimento atualizado pelo site de 28/10 (Captador R$ 97, Tráfego "em breve", Completo + Tráfego R$ 897, avulsos, links de cadastro). Saiu a "garantia do 1º mês", que não está no site — confirmar com o Rodrigo se ainda vale.
  - Limite de envio por hora: 30 → 90 (cada resposta pode ter até 3 mensagens).
- NÃO feito: resposta em ÁUDIO (voz). O Gemini TTS devolve áudio cru (PCM) e o WhatsApp não aceita esse formato; precisa de um conversor para MP3/OGG. O registro de pacotes npm não estava acessível nesta sessão. Fica para o próximo PR.
- Testes: 9 novos em `test/whatsapp-alice.test.mjs` (Gemini/Meta simulados) + 11 antigos do WhatsApp passando. Nada enviado de verdade.
- Situação na Meta (print do Rodrigo, 28/10 21h17): aviso "Sua empresa está restrita" — a empresa Rodrigo Carvalho não pode mais integrar clientes à Plataforma do WhatsApp Business (violação de termos/política, segundo a Meta). Rodrigo diz que o número atual só fez o teste e não responde ninguém. Rodrigo quer trocar o número; ainda não feito.
- Próximo: (1) Rodrigo faz login no navegador para conferir o status do número/token e a restrição; (2) pedir revisão ao suporte da Meta; (3) trocar número e atualizar `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` na Cloudflare; (4) merge do PR e teste com uma mensagem do celular dele.

## 2026-10-28 — QUERO no comentário → direct (ideia do ChatbotX)
- Pedido do Rodrigo: avaliar o ChatbotX (github.com/ChatbotXIO/ChatbotX, MIT) e trazer só o que for bom para o Nexus, de graça. Decisão dele: manter o Nexus e pegar só peças do ChatbotX. A tela do ChatbotX não entra (precisa de PostgreSQL, Redis e servidor 24h; não roda no Cloudflare grátis).
- Problema atacado: quem comenta QUERO (ex.: GILTEC) não recebe o direct.
- Diagnóstico (código, sem prova de produção): o Nexus mandava o direct para `graph.instagram.com/{id da conta}/messages`. O ChatbotX usa `me/messages` com o token da conta. O próprio Nexus já registra que o id do login é diferente do id que a Meta manda no aviso, então o caminho por id pode falhar.
- Feito: `cloudflare/src/ig-send.js` (novo). Todo direct (resposta privada ao comentário, palavra no direct e "Já segui") sai primeiro por `me/messages`; se a Meta responder com erro, tenta o caminho antigo por id. Em falha de rede não repete (evita direct duplicado). Ligado em `comment-autoreply.js`, `dm-keyword-reply.js` e `gift-dm.js`.
- Testes: 641/641 (4 novos em `test/ig-send.test.mjs`; 3 testes antigos ajustados para o endereço novo). Nada enviado de verdade.
- Pendente: merge do Rodrigo. Depois, um comentário QUERO de teste num post da GILTEC para conferir em `commentAutoReplyStatus` (lastWebhook/recent). Se ainda falhar, o erro da Meta fica gravado ali.
- Próximo passo combinado: Caixa de conversas no painel (Instagram + WhatsApp), também com base no ChatbotX.
## 2026-10-29 — Conector MCP do Nexus, passo 1 (só leitura)
- Pedido do Rodrigo: montar um MCP do Nexus para o Claude e o ChatGPT (ideia vista no ChatFyre, que liga o Claude a automação de Instagram). Foco: Flow Arts.
- Feito: `cloudflare/src/mcp-server.js` (novo) + rota em `src/index.js` + `/mcp*` em `run_worker_first`. MCP "Streamable HTTP" em modo JSON, sem sessão.
- Ferramentas, TODAS só leitura: `nexus_listar_clientes`, `nexus_ver_agenda` (post_ledger, hora de Brasília), `nexus_ver_metricas` (mesmos números do painel: seguidores, alcance, seguidores ganhos por post). Nada publica, agenda, apaga ou manda mensagem.
- Acesso: endereço `https://painel.flowarts.com.br/mcp/<chave>`. A chave é o segredo `NEXUS_MCP_TOKEN` (mínimo 24 caracteres) que o Rodrigo cria na Cloudflare. Sem ele o conector responde "desligado". Desligar: apagar o segredo ou `NEXUS_MCP=off`. Quem tiver o link completo consegue LER; por isso o passo 1 é só leitura.
- Testes: 14 novos em `test/mcp-server.test.mjs`; suíte 652/653. A 1 falha (`gemini-campaign.test.mjs` › "fila do Master") já falha na `main` sem esta mudança.
- Pendente: merge do Rodrigo; depois ele cria o segredo e adiciona o conector no Claude (Conectores › personalizado) e no ChatGPT.
- Próximo passo (2): login de verdade (OAuth, como o ChatFyre) no lugar da chave no link, e só então ferramentas de escrita (subir arte na Biblioteca, sempre chegando pendente de aprovação).

## 2026-10-29 (17h) — MCP do Nexus no ar e conectado
- PR #459 com merge e deploy feitos. Segredo `NEXUS_MCP_TOKEN` criado pelo Rodrigo na Cloudflare (a 1ª chave era curta demais; a regra é ter 24+ caracteres).
- Conferido em produção: `/mcp/<chave errada>` responde 401 (ligado e protegido).
- Conectado no Claude (conector personalizado) e no ChatGPT (Plugins › Adicionar › "Adicionar servidor MCP personalizado", sem autenticação; aparece como "Nexus2.0"). Rodrigo confirmou que funciona no Claude.
- Próximo passo: login de verdade (OAuth) no lugar da chave no link; depois ferramentas de escrita sempre pendentes de aprovação.

## 2026-10-29 (18h) — Auditoria do Instagram da Flow Arts e campanha de 30/10
- Pedido do Rodrigo: auditoria completa e campanha de amanhã ajustada, com comando para o ChatGPT.
- Dados: conector MCP do Nexus (métricas e agenda) e perfil no navegador. Resultado em `AUDITORIA_INSTAGRAM_FLOWARTS_2026-10-29.md`.
- Feito: `scripts/social/campanha/conteudo.json` (só `primeiro-teste`): 3 dias novos para vendedores/representantes, sem `post1200`. `campanha_diaria.py`: `post1200` virou opcional (GILTEC e Maskara continuam com o das 12h). Testado com FOTO_FALSA=1 em 30/10, 31/10 e 01/11 (Flow Arts: 5 peças; GILTEC e Maskara: 6 cada). Textos cabem nas artes.
- Avisos no topo de `REGRA_POSTS_DIARIOS.md` e na seção da Flow Arts de `FORMATOS_POSTAGENS.md`; entrada no `TASK_BOARD.md`.
- Nada publicado, aprovado ou enviado. Branch `agendamentos` sem pastas de 30/10 (conferido), então a campanha automática gera tudo amanhã.
- Pendente: merge do Rodrigo antes das 04h17 de 30/10; merge do PR #454 (QUERO → direct); bio, link `?de=instagram` e destaques no Instagram (ele mesmo).
- Próximo: em 06/11 o Claude puxa os números pelo Nexus e compara (alcance de Reel × post, seguidores por post).

## 2026-10-29 (18h30) — MCP passo 2: enviar arte ao painel
- Pedido do Rodrigo: o ChatGPT (modo comum, sem Work) mandar as artes direto ao painel do cliente pelo conector, porque erra muito no caminho atual.
- Feito: ferramenta `nexus_enviar_arte` em `cloudflare/src/mcp-server.js`. Post (1 imagem), story (1 imagem) ou carrossel (2 a 5, campos `imagem`…`imagem5`). Usa `_meta["openai/fileParams"]` para o ChatGPT passar a imagem da conversa (link temporário), ou `imagens_urls` (https). O Worker baixa, confere se é JPG/PNG/WEBP de até 8 MB e chama a MESMA função do Master (`masterUpload`, agora com `overrides` de origem) com aprovação "cliente": **sempre esperando aprovação**, sem horário repetido (`noDuplicate`). Origem gravada como `mcp:upload`. Limite: 60 envios em 24 h. Desligar só o envio: `NEXUS_MCP_WRITE=off`.
- Testes: 9 novos (23 no arquivo). Suíte 665/666 (a falha antiga de `gemini-campaign` continua, não é desta mudança).
- Não confirmado ainda: se o ChatGPT entrega para a ferramenta uma imagem que ele mesmo GEROU (com imagem anexada, o mecanismo é o oficial). Primeiro teste real depois do merge.
- Recomendado ao Rodrigo: trocar a chave `NEXUS_MCP_TOKEN` (agora o link permite enviar ao painel). Próximo: login de verdade (OAuth) no lugar da chave no link.

## 2026-10-29 (19h) — Texto automático nas artes enviadas pelo conector
- Problema (Rodrigo, 29/10): o ChatGPT subiu 6 peças do Quatree Dog para 31/10 pelo `nexus_enviar_arte` e elas foram ao painel **sem nada escrito** (foto crua). Antes disso o ChatGPT não via a ferramenta: faltava apertar "Atualizar ferramentas" no plugin Nexus2.0 (feito pelo Claude no Chrome do Rodrigo; o modo de desenvolvedor já estava ligado).
- Causa: o texto por código só existia na página Biblioteca (no navegador) e só para a GILTEC.
- Feito: `nexus_enviar_arte` agora escreve logo, título (3 linhas), 3 vantagens e botão em toda foto que chega sem texto, no próprio Worker:
  - `scripts/social/molduras_upload.py` gera, no deploy, molduras transparentes com o mesmo desenho do `PADRAO_ARTES.md` (Montserrat, faixa de cima e de baixo, foto só no meio) a partir de `scripts/social/campanha/textos_upload.json` (textos revisados por cliente: quatree-dog, giltec, maskara-assessoria, primeiro-teste). Saída em `public/molduras/` (não vai para o git).
  - `cloudflare/src/art-frame.js` cola com o binding IMAGES: fundo desfocado + véu na cor do cliente + foto no meio (corta no máximo 10% em cima e embaixo) + moldura + número do cartão no carrossel.
  - Parâmetro novo `ja_tem_texto` (padrão false). Se a montagem falhar, **nada** vai ao painel (erro claro para o ChatGPT). Cliente sem moldura: vai como veio, com aviso.
  - Tema novo `quatree` em `campanha_diaria.py`: verde-petróleo + laranja, chamada "COMENTE TABELA" / story "RESPONDA TABELA" (QUATREE_DIRETRIZ_VENDAS.md). Sem logo oficial no Nexus: nome escrito por código.
  - Deploy (`deploy-nexus-cloudflare.yml`) gera as molduras antes de publicar.
- Testes: 9 novos em `test/art-frame.test.mjs`.
- Pendente: merge do Rodrigo; depois apagar as 6 peças cruas de 31/10 do Quatree e pedir ao ChatGPT para reenviar as mesmas fotos (agora saem com texto). Logo oficial da Quatree, se o Rodrigo mandar.
- (19h30) Regra nova pedida pelo Rodrigo depois do post cortado das 11h do Quatree (agentcore, aprovado, saiu às ~17h50): `toInstagramJpeg` não corta mais arte fora do formato; encaixa inteira com fundo desfocado (tolerância 3%). Reel animado continua com corte (`crop: true`). Testes em `test/no-crop.test.mjs`. Imagens que já estavam guardadas no painel antes disso não mudam.


## 2026-10-30 — Roteador de IA grátis (lista awesome-free-llm-apis)
- **Pedido do Rodrigo:** "implantar" github.com/mnfst/awesome-free-llm-apis no Nexus e no agente do WhatsApp. O repositório é só uma lista de APIs grátis, não um programa.
- **Feito (branch `feat/ia-gratis-router`):** `cloudflare/src/free-llm.js` tenta, em ordem, Groq → Gemini → OpenRouter (`openrouter/free`) → Mistral → NVIDIA → Workers AI. Pula quem não tem chave; se um falhar ou der limite (429), passa ao próximo. Ordem: `FREE_LLM_ORDER`; modelo: `FREE_LLM_<NOME>_MODEL`. Provedores sem chave que guardam conversas (Kilo, LLM7) ficaram de fora por causa dos dados de clientes.
- **Ligado em:** legendas da campanha diária (`gemini-campaign.js`): depois do Gemini, usa a fila grátis (antes era só Workers AI).
- **Testes:** 6 novos passando. Suíte: 691/692; a falha (teste 306, fila do Master) já existia na `main` antes desta mudança.
- **Não feito:** nenhuma chave cadastrada, nenhum deploy. Sem chaves novas, o comportamento é igual ao de hoje (cai no Workers AI).
- **Próximo passo:** Rodrigo cria as chaves grátis (Groq, OpenRouter) e cadastra como segredos no Cloudflare; depois do merge do PR #452 (Alice), ligar a Alice nessa fila como reserva do Gemini.

## 2026-10-30 — Alice com reserva grátis (PR #452)
- PR #473 (fila de IAs grátis) foi aprovado pelo Rodrigo e o Deploy NEXUS Cloudflare passou. Ele cadastrou o segredo `GROQ_API_KEY` no Cloudflare (dito por ele; não conferido no painel).
- PR #452 estava com conflito (só no HANDOFF_CLAUDE.md): `main` mesclada na branch, mantendo as duas anotações.
- Alice: se o Gemini falhar ou der limite, responde pela fila grátis sem o Gemini (Groq primeiro). A reserva só lê texto; com áudio/imagem, pede para a pessoa escrever.
- Testes: 3 novos. Suíte 703/704; a falha (teste 306, fila do Master) já existia na `main` (CI da main falhando desde 30/10 01h UTC).
- Próximo passo: Rodrigo aprova o PR #452; depois, investigar o teste 306.

## 2026-10-30 (08h20) — Painel da Daniela Martins com a marca dela
- Pedido do Rodrigo: trocar as cores do painel da cliente `daniela-martins` pela paleta do manual dela (verde-oliva #746E44, dourado em gradiente, branco) e mostrar a logo dela no lugar do NEXUS quando ela entra.
- Feito (branch `feat/painel-tema-daniela`): `CLIENT_THEMES` + `applyClientTheme()` em `public/client-lite.js` (liga pelo id do cliente depois do login; volta ao padrão ao sair). Tema em `public/client-lite.css` (`html[data-client-theme="daniela-martins"]`). Logo e símbolo com fundo transparente em `public/brand/daniela-martins-logo.png` e `-simbolo.png`, tirados do PDF de apresentação da marca. Celular: logo no topo verde. Computador: menu lateral verde-oliva com a logo.
- Conferido em navegador sem tela (modo demonstração com o tema forçado). Outros clientes não mudam.
- Testes: 703/704; a falha é a antiga (teste 306, fila do Master).
- Próximo passo: Rodrigo aprova o PR; depois conferir no painel real da Daniela.

## 2026-10-30 (14h50) — Conector MCP aceita story em VÍDEO (PR feat/mcp-story-video)
- Pedido do Rodrigo: subir pelo conector um vídeo (story) e postar nos stories 3 vezes por dia.
- Feito: `nexus_enviar_arte` ganhou os campos `video` / `video_url` (MP4 até 50 MB, só formato story). A imagem, se vier, vira a capa; sem imagem usa uma capa lisa só para a miniatura. O vídeo vai como está (sem texto por cima) e chega SEMPRE esperando aprovação. O servidor já publicava story em vídeo (`publishInstagramStory` com `videoUrl`); só faltava a porta do conector.
- Testes: 705 de 706 passam; a única falha (`fila do Master: ... cron de 1 minuto`) já falhava na `main` antes desta mudança.
- Limite do Instagram: a API oficial NÃO coloca figurinha de link (WhatsApp) no story. Story com link clicável só postando pelo app.
- Próximo passo: Rodrigo aprova o merge; depois do deploy, programar o vídeo 3x por dia em horários livres (09h, 12h e 19h já têm stories).

## 2026-11-01 (07h) — Radar Comercial: auditoria + Vigia de concorrentes + ícones do menu (branch `feat/radar-vigia-concorrentes-20261101`)
- **Auditoria (main `e48f2ba`):** o painel do Radar está pronto (leads em D1, nota, aprovação manual, WhatsApp só após aprovar, POST de métricas de campanha bloqueado). Testes do Radar 18/18. **Mas a busca automática não traz ninguém:** ela depende de `RADAR_FEED_URL`/`RADAR_FEED_HOST`, e nenhuma fonte (feed) foi criada. O segredo fica no Cloudflare e não foi conferido daqui.
- **Pedido do Rodrigo:** achar clientes no Instagram pelos comentários dos posts de concorrentes. A Meta NÃO entrega quem comentou nem a lista de seguidores de outra conta; scraping arriscaria a conta @flowarts2026. Decisão dele: fazer as 3 formas permitidas abaixo.
- **Feito (código, não publicado):**
  1. *Colar o @* — `POST …/commercial-radar/commenter-lead`: ele lê o comentário público, cola o @ (e o link do post); o lead entra como `novo` com o post como prova; consulta opcional pela Business Discovery para pegar o nome.
  2. *Vigia* — `radar-competitor-watch.js`: todo dia 09h07 BRT (ou botão "Olhar agora") olha pela Business Discovery os posts dos perfis cadastrados e marca os que tiveram muitos comentários (≥15 e ≥2× a mediana, últimos 45 dias). Guarda só quantidade, nunca quem comentou. Não cria lead sozinho.
  3. *Isca* — `comment-autoreply.js`: comentário com palavra de interesse num post da **própria** Flow Arts também vira lead no Radar (só cliente `primeiro-teste`). Nada de DM nova: a resposta do brinde continua como antes.
  - Tela: bloco "Vigia de concorrentes" no Radar (campo @/link, lista com ×, cards "Posts que bombaram" com campo para colar o @, e "Viu alguém comentando em outro post?").
  - **Menu de baixo de todos os painéis:** ícones de texto (⌂ ▦ ◷ ⌕ ☰) trocados por SVG do mesmo tamanho; conferido em foto 390 px (barra e janela "Mais").
- **Testes:** 7 novos. Suíte 743/744; a falha (`captador-daily`, "busca diária separa empresas em 'hoje'") também falha na `main` sem esta mudança.
- **Depende de:** conexão "facebook-radar" da Flow Arts ativa no Master (a mesma do Radar de virais). Sem ela, o Vigia mostra o aviso e não inventa resultado. Perfil pessoal/privado não aparece na Business Discovery.
- **Próximo passo:** Rodrigo aprova o PR; depois cadastra no Radar os 3 perfis que ele segue e toca "Olhar agora". Fonte da Receita Federal (empresas novas) ficou para depois.

## 2026-11-01 (07h35) — Ajustes pedidos depois do merge do PR #496 (branch `fix/radar-aviso-menu-20261101`)
- **Menu de baixo da Flow Arts com sobra à direita:** causa real era `public/flow-crm.css` forçando 6 colunas no celular (`.flow-crm .tabbar`), com só 5 botões visíveis. Agora 5 colunas. Conferido em foto 360 px com a classe `flow-crm`.
- **Aviso de campanha no topo do Radar** ("Radar preparado para a próxima campanha…"): removido a pedido do Rodrigo. A caixa só aparece se a fonte automática estiver ligada ou se der erro.
- Botões "Atualizar" e "Olhar agora" não quebram mais a palavra no celular.
- **CRM: regra de limpeza passou de 2 dias para 24 horas** (pedido do Rodrigo): `STALE_CRM_DAYS` (CRM da Flow Arts), `archiveDormantHunterLeads` (contatos do Caçador sem resposta), `STALE_LEAD_DAYS` (Captador de todos os clientes) e `archiveStaleFlowLeads` (interações). Continua arquivando (o Nexus não traz a mesma empresa de novo); quem já recebeu mensagem, conversa ou cadastro manual fica. O Captador agora compara a data de verdade (antes comparava texto, e datas com "T" escapavam no mesmo dia).
- Teste `flow-lead-stale` usava data fixa e quebraria com o relógio; agora usa a hora atual.
- **Não conferido:** quantos contatos existem hoje no banco de produção (sem acesso ao D1 daqui). A limpeza roda no cron junto do Caçador diário; após o deploy, o próximo ciclo deve arquivar os antigos.
- **Próximo passo:** Rodrigo aprova o PR; depois abrir o CRM e confirmar que sumiram os contatos com mais de 24 horas sem mensagem.

## 2026-11-01 — Atendente do WhatsApp passa a se chamar David
- Pedido do Rodrigo: trocar o nome da atendente virtual do WhatsApp (Alice) por um nome masculino; escolheu **David**. Só o nome muda, o resto já estava configurado.
- Mudado: `cloudflare/src/whatsapp-knowledge.js` (agentName e persona no masculino) e a frase de apresentação em `cloudflare/src/whatsapp-alice.js`; testes de `whatsapp-alice.test.mjs` atualizados (12/12 passam). Nomes internos das funções (alice*) ficaram iguais.
- Testes: 743/744. A falha é em `captador-daily.test.mjs` e já falha na `main` sem esta mudança (não relacionada).
- Estado: branch `claude/atendente-david`, PR aberto, esperando o OK do Rodrigo para o merge (deploy só depois do merge na `main`).
- Pendente à parte: o número novo do WhatsApp (+55 21 9648x-xxxx) já está conectado na Meta, mas o servidor ainda usa o número antigo; trocar o Phone Number ID e o token nos segredos da Cloudflare (o Rodrigo digita o token).

## 2026-11-01 (manhã) — WhatsApp do David e Radar de virais: estado real
- Radar de virais: Página "Flow Arts Marketing" estava ligada ao Instagram da Global Play; foi religada ao @flowarts2026 e o Radar reconectado (callback do Nexus confirmou @flowarts2026). `instagram_basic` adicionada para teste no app NEXUS IA CENTRAL. Pendente: a busca por hashtag exige o recurso "Instagram Public Content Access" aprovado na análise do app (erro #10); Rodrigo decidiu deixar para depois.
- Atendente renomeada Alice → David (PR #498, aprovado e no ar).
- WhatsApp: a Meta desativou em 31/10/2026 o portfólio "Rodrigo Carvalho" e suas contas do WhatsApp (Termos de Uso Aceitável, "permanente"). Por isso nenhum número pode ser adicionado lá. Pedido de análise enviado em 01/11 às ~08:40 (resposta em 24–48 h por e-mail/Gerenciador).
- O segredo WHATSAPP_PHONE_NUMBER_ID foi trocado pelo Rodrigo para o número que fica no portfólio Global Play; o token atual NÃO tem acesso a ele (erro 100/33 no /api/whatsapp/number-check). Ou seja, o David está sem número funcionando até a revisão.
- Decisão do Rodrigo: esperar a revisão; não usar o portfólio Global Play para contornar (risco de ser visto como evasão do bloqueio).
- Próximo passo: quando a Meta responder, se reativar, adicionar o número novo na conta do WhatsApp do portfólio Rodrigo Carvalho (o usuário do sistema nexus-whatsapp já tem acesso) e voltar o WHATSAPP_PHONE_NUMBER_ID para o novo número.

## 2026-11-02 (17h) — Aviso no WhatsApp do cliente quando chega arte para aprovar (branch `claude/aviso-whatsapp-aprovacao`)
- Pedido do Rodrigo: quando tiver post novo no painel do cliente esperando aprovação, o cliente recebe uma mensagem no WhatsApp.
- Feito: `cloudflare/src/client-approval-notify.js`, chamado no cron de 15 minutos (`index.js`). Olha o `post_ledger` (approval_status `pending`, status `ready`, horário futuro) — vale para qualquer caminho de envio (conector MCP, Master, campanhas). Uma mensagem por cliente com a quantidade de artes; não repete as mesmas artes; intervalo mínimo de 3 h por cliente; só das 08h às 20h de Brasília. Pula Flow Arts (`primeiro-teste`), Café Brisa (`demo-cafe`), clientes travados e quem não está online; `config.approvalWhatsapp = false` desliga para um cliente. Número vem de `config.contact.whatsapp` ou `config.contact.phone`. Registro em `client_approval_notices` (tabela criada sozinha). Erro da Meta não marca as artes (tenta de novo no próximo ciclo).
- **Desligado por padrão.** Liga com `CLIENT_APPROVAL_WHATSAPP=on` e `CLIENT_APPROVAL_TEMPLATE=<nome do modelo>` (idioma `CLIENT_APPROVAL_TEMPLATE_LANG`, padrão pt_BR). Sai pelo número oficial da Flow Arts com mensagem modelo (obrigatório quando a empresa manda primeiro).
- Modelo sugerido para pedir na Meta (categoria Utilidade, pt_BR), nome `aviso_arte_painel`: "Olá, {{1}}! Tem {{2}} arte(s) nova(s) esperando a sua aprovação no painel da Flow Arts. Acesse: <link do painel>". {{1}} = primeiro nome, {{2}} = quantidade.
- Testes: 6 novos (`client-approval-notify.test.mjs`). Suíte completa 750/750.
- Bloqueio: contas do WhatsApp do portfólio Rodrigo Carvalho desativadas pela Meta (revisão pedida em 01/11). Sem número funcionando, nada sai mesmo ligado.
- Próximo passo: Rodrigo aprova o PR (fica desligado). Quando a Meta reativar: pedir o modelo, conferir o número de cada cliente no cadastro e ligar as duas variáveis.

## 2026-11-02 — SEO: páginas antigas de nicho fora do Google (branch seo/paginas-antigas-noindex)
- Pedido do Rodrigo (auditoria de SEO): o Google ainda via o site como "comida/comércio local". Escolheu a opção de esconder, não redirecionar.
- Feito: as 13 páginas `public/marketing-para-*.html` agora têm `noindex,follow`; saíram do `sitemap.xml`; o bloco "Outros segmentos que atendemos" saiu do rodapé de `public/site.html`.
- Mantido de propósito: as páginas continuam abrindo, porque o Captador (`cloudflare/src/prospects.js`) manda esses links como exemplo de site. `/exemplo` continua no sitemap.
- Testes: 750/750. Aguardando o merge do Rodrigo; deploy automático depois.
- Próximo passo: título da home com "Flow Arts Marketing" + frases de busca (ex.: "lista de empresas com WhatsApp"); depois Search Console.
- (mesma branch, 02/11) Home `public/site.html`: título "Lista de empresas com WhatsApp para vendedores | Flow Arts Marketing", descrição nova com "achar clientes", og:title e nome no schema = "Flow Arts Marketing" (o nome sozinho "Flow Arts" se confunde com malabarismo no Google). H1 não mudou. 751/751 testes.

## 2026-11-02 (21h) — Claude: planos novos no cadastro, painéis, robô e site
- `cloudflare/src/plans.js`: lista nova (postador, resposta, trafego, site, logo). `upgrades.js`: base = postador; adicionais = resposta e trafego; destaque no Postador.
- `whatsapp-knowledge.js`: robô/David com os preços novos; não oferece Captador nem Reels.
- `public/site.html`: cartões dos 3 planos (sem abas empresa/pessoa física), FAQ e schema com preços novos; avulsos só Site e Logo. 12 páginas `marketing-para-*` com a lista nova. Master: Tráfego R$ 297 e Captador "fora da venda".
- Testes: 751/751. Falta (próximo passo): reescrever o topo do site, que ainda vende o Captador ("Novos clientes todo dia no seu WhatsApp").

## 2026-11-02 (23h) — Claude: topo do site vende o Postador (sem Captador)
- `public/site.html`: título/descrição/og falam do Postador (R$ 97); topo novo "Seu Instagram postando sozinho, todo dia." com a "Agenda do seu Instagram" (exemplo de 4 publicações aprovadas); saiu a seção de classificados/oportunidades; 3 passos novos (conte, a Flow Arts cria, você aprova); seção do QUERO virou a Resposta Automática (R$ 39,90); comparação "App de agendar post não cria post"; chamada final pede exemplo grátis; FAQ sem a pergunta da busca de clientes.
- Testes 751/751. Próximo passo: depois do merge, conferir o site no celular.


## 2026-11-04 07:15 BRT — Rascunho do David no Master (Claude)
- Contexto: o WhatsApp comercial ficou conectado ao Master (coexistência com o app WhatsApp Business). Robô **desligado**. O texto da tela dizia "a IA só escreve rascunhos", mas a tela não mostrava os rascunhos; no banco havia 10 pendentes em 04/11.
- Observado nos rascunhos: o David tratou uma cliente que já é do Nexus como contato novo. Por isso **não ligar o robô** neste número até ele saber quem já é cliente (pendência).
- Feito: quadro "Rascunho do David" + botão "Usar rascunho" (só preenche a caixa), filtro `phone` em /api/whatsapp/drafts, rascunho usado vira `sent`. Testes 769/769. Branch `feat/whatsapp-rascunho-david`, PR aberto; **merge só com OK do Rodrigo**.
- Próximo passo: depois do merge, abrir Master › WhatsApp e conferir o quadro numa conversa; depois ensinar o David a reconhecer clientes do Nexus.

- 07:30 BRT: PR #546 (rascunho do David) foi para a main pelo Rodrigo; deploy Cloudflare ok; quadro conferido no Master.

## 2026-11-04 07:45 BRT — David reconhece clientes (Claude)
- Pedido do Rodrigo: o David deve reconhecer todos os clientes do Master e todo cliente novo, e também os clientes do streaming (recarga do painel e suporte).
- Clientes do streaming não ficam no Master, então o Rodrigo marca a conversa com o botão "É cliente do streaming".
- Feito na branch `feat/whatsapp-cliente-conhecido` (PR aberto; merge só com OK do Rodrigo). Robô continua desligado.
- Próximo passo: depois do merge, marcar as conversas do streaming no Master e conferir os rascunhos novos.

## 04/11/2026 — postagens falhando com "Too many subrequests" (Claude)
- Sintoma: desde ~10:30 posts/stories de vários clientes (Flow Arts, Daniela, Nexus AI) ficaram "failed".
- Causa (lida no ledger via conector, PR #551): `Too many subrequests by single Worker invocation`. A rodada de 15 min roda dezenas de tarefas juntas e a publicação fica sem limite.
- Correção (PR fix/publicar-sem-limite-subrequests): minutos 7/22/37/52 do cron de 1 min só rodam `processDueJobs`; erro de limite do Worker não gasta tentativa e posts presos por ele voltam à fila. Testes 776/776.
- Próximo passo: depois do deploy, conferir no `nexus_ver_agenda` se os "failed" com esse erro saíram.
- 04/11 12:45 — depois do deploy do PR #553 os posts presos não saíram às 12:37. Ajuste: o minuto só de publicar passa a rodar a cada 5 min (minutos terminados em 2 e 7) e com 1 job por vez (`maxJobs: 1`), como já era a regra antiga do plano grátis (50 pedidos externos por rodada). Testes 776/776.
- 04/11 13:20 — com o #555 no ar, o carrossel 12h da Daniela saiu, mas o story 12:05 e o post 13h dela falharam de novo na rodada de 15 min. Ajuste final: a rodada de 15 min não processa mais `publisher-sweep` (`skipKind`); só o minuto próprio publica (`onlyKind`, 1 por vez, a cada 5 min). O agendador também volta a enfileirar posts que gastaram as 3 tentativas só por "Too many subrequests". Testes 776/776.

## 05/11/2026 — Grupo de clientes GILTEC (Claude)
- Pedido do Rodrigo: grupo GILTEC igual ao da Quatree, com a Rose (`giltec`) e a Sheila, que ele liga pelo Master.
- PR #582: topo "GILTEC — Vendedora Rose", logo oficial e tema `giltec` no painel.
- PR do grupo (`claude/grupo-giltec`): grupo em `CLIENT_GROUPS`, palavra "Vendedora", fechamentos próprios da locação e campos Grupo e Vendedora no Novo cliente e no Acesso. A escolha fica em `config.group`, sem migration.
- `sharedBrand` (só GILTEC): quem entra herda da Rose molduras com logo, textos das artes e Captador do RJ. A mensagem do Captador sai no nome de cada vendedora. Campanha do grupo GILTEC não pula mais a moldura: imagem sem texto ganha logo, a mesma para todas. Quatree continua como estava.
- Produção: já existe `giltec-locacoes` (setup, Instagram da Sheila). Nada foi ligado nem criado pelo código. Falta o Rodrigo confirmar e ligar pelo botão Acesso.
- Limites: a campanha diária automática (`nexus-campanha-diaria.yml` e pasta `agendamentos/`) ainda sobe só para a Rose. O Captador das duas busca as mesmas cidades e pode achar as mesmas empresas. Falta decidir como dividir.
- Testes: `node --test test/*.test.mjs` 812 de 813; a falha é a do cron por CRLF no Windows, que já existia. Wrangler dry-run aprovado. Chrome sem tela com dados simulados. Não conferido com login real. Sem merge e sem deploy.
- Próximo passo: Rodrigo junta os PRs, abre Clientes > Acesso de Giltec Locações, escolhe GILTEC, escreve Sheila e salva. Depois confere o painel dela e faz uma campanha de teste, sem aprovar.

## 05/11/2026 — Espaçar postagens dos clientes (Claude)
- Pedido do Rodrigo: 8 publicações saíram juntas às 09:00. Regra em `REGRA_HORARIOS_CLIENTES.md`.
- Achados: crons de 15 min e 1 min; publicação só nos minutos terminados em 2 e 7, 1 job por vez; a fila só era preenchida na rodada de 15 min; o ciclo de agentes também publicava na rodada de 15 min (PR #561 aberto).
- PR #585: o SQL de 20 minutos não entrou no D1 (erro de autenticação) e a agenda real confirma isso. Retirei SQL, teste e workflow, porque desfariam os 10 minutos.
- Feito: `client-slots.js`, `publish-budget.js`, `publisher-round.js`, `enqueueDuePublishers`; a mudança do #561 foi incluída.
- Mudança de regra: limite do Worker agora gasta tentativa (máximo 3), como pedido.
- Testes: 833 de 834, falha só por CRLF no Windows. Dry-run aprovado. Sem merge e sem deploy.
- Próximo passo: Rodrigo aprova o merge. Depois seguir `NEXT_ACTIONS.md`.

## 05/11/2026 — Master: nome do painel e quadro de postagens faltando (Claude)
- Pedido do Rodrigo: lápis para trocar o nome do painel e quadro "Postagens faltando" no topo do Master.
- Feito: `client-name.js`, `missing-posts.js`, sino, quadro, lápis e `/artes.html?cliente=<id>`.
- O id e `clients.name` não mudam. O nome novo fica em `config.displayName`.
- WhatsApp: regra pronta e desligada (`NEXUS_MISSING_POSTS_WHATSAPP=false`). Falta modelo aprovado pela Meta.
- Testes: só a falha do cron por CRLF no Windows. Dry-run aprovado. Sem login real, sem merge e sem deploy.
- Próximo passo: Rodrigo aprova o merge. Depois seguir `NEXT_ACTIONS.md`.

## 05/11/2026 — Resultado do espaçamento e investigação das artes (Claude)
- Espaçamento: story da GILTEC das 15:15 saiu (`published` no ledger). Detalhes em `TEST_RESULTS.md`. PR #561 fechado a pedido do Rodrigo.
- Pedido novo do Rodrigo: janelas por formato (Story, Post/Carrossel, Reels) e regra de envio para o ChatGPT. A mensagem chegou cortada no item 2. **Nada foi implementado.** Branch vazia: `fix/janelas-por-formato-20261105`.
- Achados no código: `toInstagramJpeg` corta até 3% de diferença e encolhe acima disso; a janela Post força 1080x1350, inclusive arte 1:1; `composeFramed` encolhe a foto e pode cortar até 10% em cima e embaixo; o agente "Texto nas artes" aplica moldura em posts abertos.
- `ja_tem_texto` protege, mas o painel do cliente e o Master não mandam esse campo. Neles quem decide é a IA, olhando uma cópia pequena.
- Hipótese, ainda não provada: a IA responde "não tem texto" para arte pronta e a moldura encolhe e corta. As 21 artes de 05/11 em `agendamentos` têm o tamanho certo.
- Leitura do D1 de produção foi bloqueada pela permissão da sessão. Sem exemplo real desta semana; o registrado é o post da Quatree de 29/10.
- Próximo passo: Rodrigo reenvia o resto do pedido, indica um post errado ou autoriza a leitura, e decide se foto sem texto no tamanho certo ainda recebe moldura.

## 05/11/2026 — Janelas por formato e regras de envio (Claude)
- Corrige a hipótese anterior: a moldura da IA não causou os casos atuais. Só 6 posts da Flow Arts de 30/10 usaram moldura.
- Causas reais: arte no formato errado cortada pelo código antigo (Quatree, 29/10); agente usando arte de story em post de feed; faixas lisas já na arte enviada (GILTEC).
- Feito: `art-format.js`, `window-alert.js`, janelas no painel, no Master e em Enviar artes, trava antes de publicar (`format_mismatch`), `formato` obrigatório e `reels` no conector, Biblioteca recusando tamanho sem janela, texto por cima da foto inteira e Daniela sem texto.
- Item 6: os 2 posts de agente são soltos pelo alinhador depois do deploy e voltam a pedir imagem. Os 4 stories da GILTEC precisam de arte nova; não foram alterados.
- Sem merge e sem deploy.
- Próximo passo: Rodrigo aprova o merge. Depois seguir `NEXT_ACTIONS.md`.

## 05/11/2026 — Vigia "cliente nunca fica sem post" (Claude)
- Achados: 04/11 da Quatree foi correção pedida, sem erro. 05/11 14:50 foi limite de subrequests na montagem, em rascunho nunca aprovado. Nada substituía porque esse mecanismo não existia.
- Feito: `post-watcher.js`, `takeLibraryArt`, `imageZonesBlocked`, `mediaSize`, selo no painel, alerta vermelho no quadro e WhatsApp desligado.
- Tamanho 9:16 do gerador corrigido para 1008x1792, porque 768x1344 não é 9:16.
- Fora do pedido literal: Quatree sem imagem gerada, correção pedida fora do vigia.
- Sem merge e sem deploy. Geração real nunca testada.
- Próximo passo: Rodrigo aprova o merge. Depois seguir `NEXT_ACTIONS.md`.

## 05/11/2026 — Ajustes do vigia pedidos pelo Rodrigo (Claude)
- Mesmo PR #594. Correção pedida nas próximas 6 horas vira alerta vermelho no quadro, sem publicar.
- GILTEC pausada por `NEXUS_PAUSED_CLIENTS`: sem ciclo de agentes, vigia, publicação e quadro. Fora da campanha diária no GitHub.
- Fila de 06/11 registrada em `NEXT_ACTIONS.md`. Sem merge e sem deploy.

## 05/11/2026 — Marca do cliente (Claude)
- Feito: `brand-editor.js`, aba Marca, campo no "Novo cliente", `client-identity.js`, `art-title.js`, `compor_arte.py` e `art-compose.yml`.
- A camada do deploy não leva mais a logo: ela vai em `marca-feed.png` e `marca-story.png`.
- Testes e limites em `TEST_RESULTS.md` e `KNOWN_ISSUES.md`. Sem merge e sem deploy.
- Próximo passo: Rodrigo aprova o merge e cria o painel da Adimax.

## 05/11/2026 — Adimax sem imagem gerada (Claude)
- Feito: `receivesGeneratedImage` em `post-watcher.js`. Vale para `adimax`, `adimax-eduardo` e outros ids com a palavra adimax.
- Rascunho de agente também não vale como original para a Adimax. Biblioteca e artes da campanha continuam valendo.
- Testes do vigia dinâmico em `client-identity.test.mjs` passaram a usar `loja-nova`.
- Sem merge e sem deploy.

## 05/11/2026 — Logo inteira no painel (Claude)
- Feito: corte, aviso de capa, `logoDark`, cartão, menu na cor do cliente, logo no topo do celular e lápis com nome e marca.
- Conferido no Chrome sem tela com a capa real da Adimax, em 1280 e 500 px, com dados simulados.
- A logo salva da Adimax ainda é a capa, com cores padrão. Precisa de logo nova e cores `#F2A900` e preto depois do deploy.
- Eduardo saiu do grupo Quatree Dog. O painel `quatree-dog-eduardo` continua existindo, fora do grupo, sem receber campanha.
- Avisos do que é aceito em `public/upload-rules.js`, acima dos botões de envio de arte e de logo.
- Sem aviso, porque a lista do Rodrigo não cobre: material do Captador, foto do Reel animado e criativo de referência.
- Sem merge e sem deploy.

## 05/11/2026 — Quadro com "Criar com agente" (Claude)
- Feito: `agent-art.js`, `canCreateArt`, rota `/api/master/missing-posts/create`, quadro sem o que já passou, link com `dia`, página Enviar artes em 2 + 2.
- A geração real ainda não rodou em produção. Testes usam gerador simulado.
- Vigia bloqueado para a GILTEC, a pedido do Rodrigo, mesmo fora da pausa. Vale para todo o grupo GILTEC e Quatree.
- Rodrigo apagou o painel da Adimax e vai criar de novo pelo "Novo cliente" depois do merge.
- Sem merge e sem deploy.

## 06/11/2026 — Acesso e grupos no Master (Claude)
- Causa da senha em branco: o servidor nunca gerava a senha, apesar do texto "Gerada automaticamente". Sem senha, nem criava o login.
- Feito: `generatePortalPassword`, `client-access.js`, rota `/api/master/clients/:id/access`, `POST /api/master/groups`, `savedGroups`, `findGroup`, `createGroup`, `inheritBrandWord`.
- Senha curta e usuário repetido agora são recusados antes de criar o cliente.
- `giltec-neto` e `adimax-eduardo-soares` seguem sem login até o Rodrigo usar o Copiar acesso depois do deploy.
- A ficha de `adimax-eduardo-soares` está com `#e2a107`, salva pelo Master. Não foi alterada.
- Sem merge e sem deploy.

## 06/11/2026 — Deploy conferido, Nexus AI e Pedir ajuste (Claude)
- #600 já estava publicado. Depois dele, a `main` só recebeu fichas, sem código.
- Nexus AI: marca salva em produção pelo Master, a pedido do Rodrigo. Ficha atualizada. Nenhuma arte foi criada.
- Feito: `client-revision.js`, `REVISION_REASON` em `post-watcher.js`, `openRevisionTicket` em `posts.js`, tela do cliente. Regra em `REGRA_PEDIR_AJUSTE.md`.
- O fluxo antigo apagava a imagem e chamava o ciclo dos agentes, que podia gerar para Quatree e Daniela. Agora isso só vale para carrossel de quem usa imagem gerada.
- #603 segue aberto. Sem merge e sem deploy do Pedir ajuste.
