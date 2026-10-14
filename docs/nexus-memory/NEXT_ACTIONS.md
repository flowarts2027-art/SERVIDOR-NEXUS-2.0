# Próximas ações

## Caçador de leads (2026-10-14) — código pronto na branch feat/cacador-leads, não publicado
- Pedido do Rodrigo: repetir um projeto antigo do n8n. Buscar empresas no Google Maps, montar uma lista de leads, a IA conversa, oferece os planos, marca reunião e passa para o WhatsApp dele. De preferência grátis.
- Resposta dada: dá para fazer dentro do próprio Nexus, sem n8n. A busca usa a API oficial do Google (tem cota grátis), não raspagem. O primeiro contato frio pelo WhatsApp Cloud API vai contra a regra da Meta (exige opt-in e modelo pago) e pode bloquear o número. Proposta: o Nexus monta a lista e o rascunho; o Rodrigo manda a primeira mensagem; quando o lead responde, a atendente IA continua, oferece plano, marca reunião e avisa o Rodrigo.
- Rodrigo escolheu: Brasil todo, empresas sem site; ele manda a 1ª mensagem pelo celular. Depois, trocar para o robô do WhatsApp quando a Meta liberar.
- 2026-10-14: Google pediu R$ 150 de pré-pagamento; Rodrigo recusou. Busca trocada para OpenStreetMap (grátis). Próximo passo: OK para publicar feat/cacador-osm → primeira busca real em Master → Contatos → conferir se o Worker alcança overpass-api.de.

## Próximo passo exato (2026-10-14 10h00, sessão terminando)
1. Pedir o OK do Rodrigo e publicar a branch feat/cacador-google ANTES de ele salvar a chave (a versão no ar ainda grava todos os dados do Google).
2. Rodrigo completa R$ 120 no Google Cloud (conta 014D52-2FFA79-70D022) e segue o passo a passo da chave enviado no chat: ativar Places API (New) no projeto flow-arts-nexus → Criar credenciais → Chave de API → restringir só à Places API (New) → cota diária e orçamento com alerta → digitar a chave em Master → Contatos → "Chave do Google Maps".
3. Depois: primeira busca real e conferir no D1 que só os contatos chamados ficam guardados.
- 10h11: Places API ativada e chave "Maps Platform API Key" criada no projeto flow-arts-nexus (conta flowarts2027; restrita às 32 APIs do Maps, sem tela de restrição por API; restrição de aplicativo: Nenhum). Orçamento NÃO criado: o Google diz que a conta de faturamento está encerrada/inativa (falta completar R$ 120 do pré-pagamento). Até ativar, a chave não vai buscar. Chave ainda NÃO salva no Master.

## Verificação da empresa na Meta (2026-10-14 08h52)
- Status: "Mais informações são necessárias" (empresa "Rodrigo Carvalho", ID 2082464929068014). O documento enviado para provar o telefone +55 21 99855-9965 não foi aceito: precisa mostrar razão social E esse telefone (contrato, alvará, extrato/carta bancária, conta de água/luz/gás/telefone).
- 09h00–09h10: Cartão CNPJ (12/10) mostra telefone ERRADO na Receita: (21) 9985-5996 (falta um dígito). Nome empresarial: 65.299.616 RODRIGO ALEXANDRE DE CARVALHO. Conta de luz do Rodrigo não mostra telefone. Rodrigo vai usar o WhatsApp só para a própria empresa.
- Diagnóstico ao vivo (09h07): número 1357206410813430 CONNECTED, account_mode LIVE, TIER_250, nome "Flow Arts" AVAILABLE_WITHOUT_REVIEW. Mensagens recebidas chegam (última "Bom dia" 07h27). Permissões do app em acesso padrão ("Pronto para teste"). "Verificação do acesso" é de provedor de tecnologia: não se aplica. Recomendado NÃO excluir o app.
- Teste de envio com OK do Rodrigo (09h08, para 5521964816185): de novo "whatsapp_http_400: OAuthException | code=100 | Authorization Error". Leitura do número com o mesmo token funciona. Hipótese nova: o token não tem a permissão whatsapp_business_messaging (só management), ou o usuário do sistema não tem o número com controle total. Obs.: o envio manual pausou o robô nessa conversa (bot_paused=1).
- 09h21–09h22 (14/10): FUNCIONOU. Rodrigo gerou o token na tela 'Enviar mensagem' (Etapa 2) da Meta e o teste 'Integration Test' chegou no WhatsApp dele. Às 09h22 ele mandou 'OI, bom dia' e o Nexus respondeu sozinho ('Sou a assistente virtual da Flow Arts...'), registrado como sent_auto no D1. A versão v26.0 continua e funciona: a branch fix/whatsapp-versao-graph (v25.0) NÃO foi publicada por não ser necessária. Causa provável do erro antigo: faltava concluir esse passo de token/autorização do app na conta do WhatsApp. A verificação da empresa não foi necessária para o robô responder.
- Caminho sugerido: tirar o Cartão CNPJ na Receita, ver qual telefone aparece nele e usar exatamente esse telefone e esse documento na Meta. Alternativa: conta de telefone/luz no nome que bate com a razão social e com o número.

## Captador de clientes (ferramenta R$ 97/mês)
- Código pronto (branch feat/captador-clientes). Antes de vender: confirmar por alguns dias que o Overpass (mapa grátis) responde; ele deu 504 em 14/10 de manhã. Se continuar instável, avaliar servidor Overpass próprio ou Google (custo por busca).
- Quando a Meta liberar o número: ajustes finais (robô oferece o Captador e manda o link do portal).

## Robô do WhatsApp: planos e contrato (plano aprovado pelo Rodrigo em 2026-10-14 08h34, ainda não feito)
- Planos: quando o cliente perguntar preço, o robô responde e manda o link https://flowarts.com.br/#pacotes. Automático.
- Contrato: página pública do contrato-modelo no site (só depois da revisão de advogado/contador e do nome do responsável). Quando o cliente disser que quer fechar, o robô prepara a mensagem com o link e o Rodrigo aprova o envio por um botão "Enviar contrato" no painel (regra do CLAUDE.md: prometer algo ao cliente só com OK do Rodrigo). Não enviar sozinho.
- Tudo só funciona depois que a Meta liberar o app "Atendente Flow Arts".
- Branch feat/manutencao-site (manutenção R$ 29/mês ou R$ 297/ano no robô) pronta, esperando OK para publicar.

## Google Maps (decisão 2026-10-14 08h29; atualizado 09h43)
- 09h43: Rodrigo pagou R$ 30 (campo "Outro valor" aceita mínimo R$ 30; eu tinha dito errado que só aceitava R$ 150) na conta de faturamento 014D52-2FFA79-70D022. Pagamento concluído; crédito aparece em até 24 h. Falta ver se a conta ativa com R$ 30 (a tela diz "pelo menos R$ 150 para ser ativado"). Se ativar: Places API (New) + chave restrita + cota.
- 09h48: Google pediu mais R$ 120 para ativar (R$ 30 não ativa). Rodrigo coloca outro dia. O Master já está pronto para o Google (caixa "Opcional: usar o Google Maps" em Contatos). Atenção: os termos do Google Maps proíbem guardar os dados dos lugares por muito tempo (só o place_id); antes de usar em escala, mudar o caçador para guardar só o place_id e buscar os detalhes na hora. O Captador dos clientes continua no mapa grátis.
- Rodrigo: vai pagar os R$ 150 de pré-pagamento do Google quando fechar o primeiro cliente. Então: Places API (New) no projeto flow-arts-nexus, chave restrita só a essa API, cota diária, e ele digita a chave em Master → Contatos (caixa "Opcional: usar o Google Maps").
- Até lá: busca grátis pelo OpenStreetMap, que às vezes fica fora do ar.

## Visitas do site (2026-10-14)
- No ar desde 22c5cea. Conferir: abrir flowarts.com.br e depois Master → aba Site; deve contar 1 visita hoje. Se ficar em zero, olhar POST /api/site/hit no navegador.
- Talvez citar o contador em privacidade.html (só números, sem dados pessoais). Perguntar ao Rodrigo antes.

## Domínio (2026-10-12)
1. Rodrigo: trocar o link da bio do @flowarts2026 para flowarts.com.br.
2. FEITO 12/10: Search Console verificado, sitemap enviado, home pedida. Conferir em alguns dias se a home foi indexada.
3. FEITO 12/10: Perfil da Empresa criado e verificado. Próximo: pedir 3 a 5 avaliações reais (link em Solicitar avaliações) e subir fotos de posts.
4. Opcional: URLs de privacidade/termos do app Meta para o domínio novo.


## Próximo passo exato (2026-10-11 16h30 BRT)
1. Rodrigo testa /exemplo com os próprios dados e confere o contato na aba Contatos do painel.
2. Rodrigo coloca https://servidor-nexus.diamantehinode2015.workers.dev/exemplo na bio do Instagram @flowarts2026.
3. Checagem 17:50: posts novos da Flow Arts (tema/imagem corrigidos), Café Brisa na demo, follows no relatório.
4. Em 2–3 dias: Cartão CNPJ com telefone novo → verificação da empresa na Meta.
5. Depois da verificação: Publicar o app → em "Configurar webhooks" colocar URL https://servidor-nexus.diamantehinode2015.workers.dev/api/meta/instagram/webhook e o verify token, assinar o campo "comments" → testar comentário QUERO. A inscrição da conta (me/subscribed_apps) o NEXUS faz sozinho (estado em /api/portal/autoreply-status → webhook).

## Standup CEO (2026-10-11)
- Primeiro standup gravado em `empresa/standup/2026-10-11.md`. Só recomendação, nada enviado nem publicado.
- Prioridade recomendada: Rodrigo envia as 3 primeiras mensagens aos cafés da lista, depois de conferir se a /demo tem posts do Café Brisa.
- Falta o dado: quantas mensagens já foram enviadas e respostas recebidas.

## Próximo passo exato (2026-10-11 15h20 BRT)
1. Conferir se o cron criou o cliente demo-cafe e se os agentes geraram posts com imagem (ver /api/demo/panel).
2. Ajustar o texto "Contatos recentes" da tela Início no modo demonstração.
3. FEITO 15h30: lista de 10 cafés (Tijuca, Botafogo, Méier; dados do Google Maps) e mensagem base com frase pessoal por café, no Claude Docs "Prospecção Flow Arts — 10 cafés do Rio" (553fbc57-d271-43e3-90f3-2bf7efc6ad11), com status por café. Rodrigo envia; máximo 3 por dia; nenhuma mensagem foi enviada por Claude.
4. Medir o custo de OpenAI por cliente durante 1 semana (oferta R$ 297 + R$ 697).
5. Conferir em /api/portal/insights se `follows`/`profileVisits` chegam (permissão instagram_business_manage_insights não está no caso de uso do app Meta).
6. FEITO: departamentos CEO/Marketing/Vendas (e819ebf); standup do CEO rodou no PC (bd01d83).
7. Verificação da empresa na Meta (11/10 16h): Rodrigo começou com o CCMEI; a Meta pede documento com razão social + telefone. CCMEI não tem telefone; Cartão CNPJ tinha telefone antigo. Rodrigo atualizou o cadastro do MEI (telefone celular atual e e-mail flowarts2027@gmail.com) no Portal do Empreendedor; aguardar alguns dias até o Cartão CNPJ mostrar o telefone novo, então refazer a verificação com o Cartão CNPJ ("Documento fiscal da empresa") e site /privacidade (já mostra o CNPJ, commit 9ad6091).
8. Publicar o app Meta: falta (a) Verificação da empresa "Rodrigo Carvalho" (2082464929068014, não verificada; Rodrigo envia documentos), (b) Verificação do acesso (provedor de tecnologia, depois da a), (c) Análise do app para instagram_business_manage_comments / manage_messages / manage_insights com vídeos de demonstração.

## Próximo passo exato (2026-10-11 14h BRT)
1. Rodrigo reconecta o Instagram da Flow Arts pelo painel (logado como flowarts2026, aceitando todas as permissões).
2. Depois do próximo cron, conferir `/api/portal/autoreply-status`: `count` deve igualar `igCount`.
3. Se continuar 0: pedir Acesso avançado / App Review de instagram_business_manage_comments e manage_messages (exige verificação da empresa).
4. Adicionar `instagram_business_manage_insights` ao caso de uso do app.
5. Investigar por que o portal do cliente mostra "Conecte o Instagram".

## Próximo passo exato (2026-10-11 manhã, após execução)
- Feito e verificado em produção: painel do cliente novo (celular), Master com 6 menus, Integrações com todos os clientes, campanha Flow Arts gerando posts novos (12:00 Reels, 19:00 carrossel), STORY/VIRAL com perfil da marca.
- Bloqueio atual das imagens: `openai_daily_budget_reached` (limite diário de 30.000 tokens do cliente consumido pelos agentes de texto). Decisão do proprietário: aumentar o limite diário da Flow Arts no Master (Visão geral › Uso por cliente) ou manter.
- Reels: CONFIRMADO que o token GitHub do Worker é da conta suspensa (403). Para Reels animados, o proprietário precisa criar um token na conta flowarts2027-art e salvar como secret `GITHUB_ACTIONS_TOKEN` no Worker. Até lá, Reels saem como imagem.
- Funil EU QUERO: o Nexus não responde comentários nem DM; construir resposta automática (private reply) com link wa.me/5521964816185 e descobrir de onde vem o texto que leva ao site da Global Play.
- `globalplay-streaming` segue online (travado para publicar); sugerir pausar.

## Análise de 3 artigos Castilho IA (2026-10-11 15h BRT) — Rodrigo quer empreender
Pedido: "analise e agregue o que vai nos ajudar". Nada implementado ainda; aguardando escolha do Rodrigo.
- FORJA (números → estratégia → calendário cheio): Nexus já tem estratégia (.agents/product-marketing.md) e calendário cheio (campanha + calendário no painel). Falta o ciclo de números: relatório semanal "quais posts trouxeram seguidores" e pesos por pilar. Requer adicionar `instagram_business_manage_insights` ao caso de uso do app Meta.
- 7 repositórios/7 ofertas: lição de negócio = vender resultado, setup + mensalidade, limites por escrito, revisão humana, testar custo de API antes de precificar. A oferta da Flow Arts equivale à "operação de conteúdo". Plano de 7 dias: demo com cliente fictício → 10 negócios reais → 10 mensagens (Rodrigo aprova) → reuniões. Preços: Rodrigo decide; não usar as faixas em dólar do artigo.
- Startup OS (7 departamentos): montar versão própria (sem copiar prompts) começando por CEO + Marketing + Vendas, com empresa/visao.md, metricas.md, decisoes.md e standup diário.

## Ideias da Castilho IA (2026-10-11 14h BRT, só leitura dos títulos; artigos exigem cadastro)
Pedido do Rodrigo: ver o que dá para trazer do blog castilhoia.com para o Nexus (CRM + Instagram). Nada implementado ainda.
- Página de material grátis da Flow Arts com cadastro (nome, WhatsApp, segmento) gravando no CRM.
- CRM com "próxima ação" e data em cada contato (follow-up de 7 dias).
- Regra "a IA não inventa" também nas respostas de DM e WhatsApp.
- Comentário com palavra-chave → material na DM (já existe; depende do acesso da Meta).
- Inspiração apenas; não copiar textos do site.
- 14h10: Rodrigo escolheu começar pelo calendário com capas (feito, commit 0bfdf7b). Depois: prompt de entrevista do cliente novo; prompt reunião → proposta.
- Skills de marketing avaliadas (artigo 4-claude-skills-marketing; repositórios conferidos no GitHub, todos com LICENSE): recomendada primeiro coreyhaines31/marketingskills no Claude Code do PC; claude-ads quando começar tráfego pago; as outras duas depois. Ler o SKILL.md antes de instalar.
- Conexão da Flow Arts já tem o escopo instagram_business_manage_comments (conectada 11/10 09:38, conta MEDIA_CREATOR); reconectar não resolve o auto-responder. Caminho: App Review / acesso avançado.

## Próximo passo exato (2026-10-10 noite)
0. Campanha de 30 dias da Flow Arts ativa no código (profileVersion 2026-10-11e). Conferir no painel os posts do dia com formato da campanha; pedir ao proprietário o token do GitHub para os Reels.
1. (Feito 2026-10-10) Token Instagram da Flow Arts confirmado válido.
2. Se o proprietário quiser, pausar também `globalplay-streaming` (ainda gasta OpenAI a cada ciclo, mas não publica).
3. Conferir em Postagens & custos o primeiro post novo da Flow Arts (imagem gerada + legenda de marketing). Depois, mudar status de `primeiro-teste` para ativo de produção e acompanhar o primeiro ciclo de criação da Flow Arts sem publicação real; depois, uma única publicação controlada.
4. Investigar as falhas das tarefas "Nexus read-only production audit" e "NEXUS Overnight Regression".


## Após a limpeza de 2026-10-10
1. Revisar o diff, integrar via PR e confirmar CI/deploy verdes. Só então tratar a limpeza como concluída em produção.
2. Decidir o destino do vídeo: (a) cortar de vez (Worker + testes + workflows + Render) ou (b) isolar em módulo próprio. Hoje é o fluxo que mais falha e o que menos contribui para publicar sozinho.
3. Escolher um único workflow de deploy (`ci.yml` ou `deploy-nexus-cloudflare.yml`) e aposentar o outro, para evitar deploys concorrentes.
4. Revisar os gatilhos `[force-instagram-test]` e `[force-ragnar-test]` do `ci.yml`: publicam de verdade a partir de uma mensagem de commit.
5. Alinhar a documentação ao cron real (`*/15 * * * *`; alguns textos ainda dizem "cada minuto").
6. Depois, seguir o plano: fonte contínua de mídia autônoma, política de revisão em duas camadas e adaptadores multi-plataforma.

## Binding de arte Ragnar, 2026-09-28 14h30 BRT
- Implantar leitura via ASSETS, conferir parecer aprovado e `mediaIdPresent:true`/`publishedAt` na próxima postagem vencida. Se falhar, ler estado do binding e o código sanitizado sem enfraquecer gate. Resolver reposição contínua de arte após destravar uma postagem.

## Arte verificada Ragnar, 2026-09-28 14h25 BRT
- Implantar aprovação restrita à arte inspecionada e conferir CI/deploy. Observar o post vencido atravessar Designer e Publisher; exigir media ID e horário da Meta em produção. Se hash divergir, não liberar. Depois prover novas artes únicas, sem geração paga automática, para sustentar postagem contínua.

## Diagnóstico Ragnar, 2026-09-28 14h19 BRT
- Implantar campos booleanos de revisão, observar motivo objetivo da rejeição da nova mídia e corrigir a peça ou a falha de estado correspondente. Repassar gates completos e comprovar `mediaIdPresent:true`/`publishedAt` antes de declarar publicação. Evitar repetição de arte em futuros posts.

## Postagem Ragnar, 2026-09-28 13h53 BRT
- Implantar correção de recuperação prioritária, verificar CI e deploy. Aguardar Creator → Copy Chief → Designer → Publisher; confirmar `mediaIdPresent:true` e `publishedAt` em produção antes de dizer que o Ragnar publicou. Se a revisão reprovar a nova arte, registrar o motivo e não contornar o gate. Resolver depois o fornecimento contínuo de peças únicas sem geração paga automática.

## Mídia Ragnar, 2026-09-28 13h35
1. Implantar JPEG válido e excluir do pool as três URLs de PNG corrompido; deixar Designer limpar posts antigos com essas URLs e Creator vincular a mídia nova.
2. Observar avaliação visual real, Publisher e `publishedAt`/ID de mídia Ragnar. Se a imagem não passar na revisão, registrar motivo e criar outra peça original válida.
3. Montar fonte contínua de imagens inéditas e de cena única após a publicação controlada. Global Play publicou às 13h27 BRT, mas também precisa de abastecimento contínuo de mídia aprovada.

## Resposta 400 do Ragnar, 2026-09-28
1. Observar `openai.code` após diagnóstico sanitizado do parâmetro inválido. Corrigir exclusivamente o campo rejeitado; repetir uma revisão e manter o gate visual obrigatório.
2. Confirmar status publicado e identificador na Meta/Instagram. Global Play ainda depende de nova mídia simples e original.

## Correção do orçamento de subrequests, 2026-09-28
1. Implantar o teto de três mídias com insights por snapshot e um job por cron. Observar que `openai.status` muda de `transport_error` para `ok`/HTTP classificável e que uma imagem recebe parecer v2 aprovado ou rejeitado.
2. Verificar Publisher com candidato elegível e resultado real `publishedAt`/ID da mídia. Se o transporte continuar falhando, investigar detalhe sanitizado da exceção no Worker sem expor chave.
3. Prover imagem inédita, simples e revisável ao Global Play por fonte autorizada; o banner recente com muitos textos/quadros não é substituto adequado.

## Diagnóstico 2026-09-28 13h10
1. Implantar tentativa diagnóstica única da revisão Ragnar; observar `reviewReason`, `reviewAttempts`, `diagnosticRetry` e `openai.status` no health. Corrigir a causa específica retornada; não liberar gate sem aprovação.
2. Global Play: criar mídia inédita de cena única, com textos legíveis e sem afirmações não comprovadas, por fonte autorizada; passar pela revisão e vincular a uma postagem vencida.
3. Confirmar `publishedAt`, ID/permalink em produção e visualização na conta; deploy/cron não substituem essa confirmação.

## 2026-09-28, incidente de publicação
1. Validar a alteração de timeout do Graph em CI e produção. Confirmar que os jobs deixam de virar `stale_running_job_recovered` e que Publisher volta a registrar execução recente.
2. Integrar/observar PR #31 e ler no health a categoria efetiva da falha OpenAI do Ragnar. Corrigir transporte, orçamento ou modelo conforme evidência; manter revisão visual obrigatória.
3. Providenciar mídia original inédita e revisável para Global Play; o pool padrão está vazio. Não reutilizar mídia já publicada nem supor que imagem será gerada automaticamente.
4. Confirmar post elegível e, só após execução real, `publishedAt`, `media_id` e permalink. Nenhum post de teste foi enviado nesta sessão.

## Captação, após implantação
1. Verificar CI/deploy do commit novo e consultar `/api/autonomy-health`: `leadCapture.autoEnabled`, `lastRunAt`, `lastRunStatus`, `lastAnalyzed`, `lastNew`, `totalLeads` por conta.
2. Se `autoEnabled:false`, verificar configuração salva no portal sem sobrepor escolha explícita. Se `lastRunStatus:warning`, ler erros autenticados da última varredura e conferir permissão `instagram_business_manage_comments`.
3. Comparar alcance, comentários com intenção, leads captados e contatos convertidos ao longo de 7 e 14 dias. Ajustar ganchos e oferta com base em dados; não prometer seguidores ou leads específicos.

1. Implantar a autorrecuperação de slots sem mídia e confirmar no D1 que o Creator registrou `repairedIds` antes do próximo Publisher.
1. Subir e validar no CI a política uniforme que exige os dois gates e limita cada post a três tentativas em todos os caminhos de publicação.
2. Confirmar no próximo horário válido (18:00 BRT para Global Play; próxima mídia aprovada para Ragnar) que a fila permanece livre e que não há novo acúmulo de captação.
2. Repor uma fonte sustentável de mídia única para Ragnar. O post vencido das 09:00 estava sem mídia e não deve ser forçado; sem nova mídia o controle de qualidade continuará bloqueando corretamente.
3. Correlacionar uma publicação ruim do Global Play com a linha do ledger, `qualityGates`, origem da imagem, pareceres e rota de envio. Confirmar se houve bypass manual/sweep ou aprovação superficial.
4. Comparar contadores reais de `agent_executions` e heartbeat do scheduler com horários esperados e `token_usage` com rotas OpenAI. Identificar processos não executados e gastos evitáveis.
5. Corrigir **uma causa raiz** por vez, com mudança pequena e teste sem postagem: gate único antes de qualquer Meta API, parecer visual baseado em mídia realmente inspecionada ou revisão humana explícita, falha fechada, limite de tentativas e erro objetivo.
6. Validar com teste interno e logs D1; se indispensável, uma única publicação real controlada. Só então marcar a correção como confirmada.
7. Com publicação e qualidade estáveis, levantar métricas de alcance/interações/frequência e propor experimentos de conteúdo sem promessa de seguidores.

Em toda sessão: ler os sete documentos; revalidar commit/deploy e serviços; atualizar teste, decisão, problema, estado e próximo passo antes de encerrar.

## Retomada — 2026-09-27 20h UTC
Prioridade atual: concluir CI/deploy da revisão visual Global Play, obter evidência autenticada do Designer e do ledger sem publicar testes; resolver fonte de mídia nova respeitando proibição de reativar geração paga; depois métricas e replicação para Ragnar. Não confundir o deploy anterior 45de28b com funcionamento ponta a ponta.

## Diretriz do proprietário e ponto de retomada — 2026-09-27 17:25 BRT

- Rodrigo confirmou que o objetivo é cada função do Nexus executar autonomamente, detectar falhas e ajustar conteúdo conforme desempenho, sem depender de cobranças ou verificações manuais recorrentes. Se alguma função não cumprir seu papel, investigar, corrigir e validar. Relatou falta de visualizações; não há medição atual que permita quantificar ou atribuir a causa.
- Prioridade preservada: concluir Global Play primeiro e depois aplicar o padrão ao Ragnar com identidade própria. Manter exclusões de Railway, Hyve, agentes independentes e funções de vídeo removidas. Não reativar geração paga sem autorização compatível.
- Verificação feita nesta sessão: GET /health respondeu ok, Cloudflare Workers, D1 ready, R2 e assets vinculados. Isso não confirma cron, métricas, saldo OpenAI nem execução individual dos agentes.
- Código local inspecionado em c1c0d4d: runAuditor classifica desempenho por curtidas e comentários; runStrategist recebe contexto com auditor, mas não utiliza esse parecer para mudar a pauta. Listar reach/shares/saves como KPIs não comprova sua coleta ou uso. Há chamada de feedback no ciclo, porém falta integração efetiva dos resultados à decisão.
- A memória existente confirma pendências de fonte contínua de mídia nova, evidência de fiscalização visual em produção e replicação ao Ragnar. Não registrar essas etapas como concluídas.
- Acesso confirmado ao repositório operacional pelo conector GitHub. Consulta adicional de rede para commit/deploy foi cancelada antes da decisão de aprovação; não foi concluída. Nenhuma alteração de runtime, publicação de teste ou consulta autenticada ao ledger foi executada nesta sessão.
- Próximo passo concreto: conferir main/deploy por acesso autorizado e obter registros atuais de agent_executions, scheduler e post_ledger. Em seguida corrigir o consumo de resultados pelo Estrategista/Creator, validar com dados simulados sem postagem e verificar execução real. Implementar acompanhamento automático de falhas com recuperação limitada e indicação clara do que exige intervenção.
- Critério de conclusão: evidência por função de execução recente, entradas/saídas, erros e recuperação; conteúdo novo aprovado e publicação registrada; métricas reais alimentando decisões seguintes. Não prometer visualizações, viralização ou número de seguidores.
- Continuidade: ler estes documentos antes de buscar histórico. Esta atualização registra direção e diagnóstico, não conclusão da autonomia.

## 2026-10-02 — próximo passo do painel de cliente
1. Confirmar no próximo run de `main` que `Deploy servidor-nexus` e `Verify client video workspace` passam com o verificador sem pipe.
2. No painel autenticado, abrir `Vídeos`, enviar um MP4 real com menos de 90 MB, preencher título e sinopse, gerar o MP4 e baixar o resultado.
3. Inspecionar o arquivo final: smartphone visível em primeiro plano, título/sinopse alinhados, sem elementos gráficos indevidos e download funcional. Se falhar, usar o ID/status de `video_jobs` e o run `video-template-render` para localizar a etapa; não alterar publicação Instagram para esse teste.
4. Tratar separadamente os problemas preexistentes de `Verify Nexus production autonomy` e `Workers Builds: servidor-nexus`.

## 2026-10-02 — retomada desktop
Implantar correção do redirect circular, exigir GET /portal = 200 sem Location e aba Vídeos presente. Depois validar upload/render/download com sessão de cliente autorizada.


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

Concluir revisão e implantação do botão Baixar no PC + ZIP auxiliar. Confirmar geração do job video_0b304a947f584b37900e0ecc, baixar resultado e verificar duração/visual. Reiniciar helper atualizado após correções de erro e repetir teste do botão. Não declarar geração direta YouTube resolvida.


## 2026-10-04 — backlog comercial e editor de vídeo no painel
- Após o fluxo "Gerar direto" ficar estável, evoluir o painel do cliente para campanha semanal/multi-dia com carrosséis de vídeo: permitir 7 vídeos ou 21 vídeos para programação de até 3 publicações por dia, com horários configuráveis.
- Postagem programada, automação e agentes devem exigir plano ativo e liberação no Nexus Master; geração de vídeo pode permanecer disponível separadamente para teste, sem ativar agentes OpenAI.
- Adicionar editor de corte no próprio painel: player com timeline, play/pause, scrub, avanço/retrocesso frame a frame, marcação de ponto inicial e final, visualização da duração escolhida e prévia antes de renderizar.
- O corte deve ser não destrutivo: salvar start/end no job e usar FFmpeg no pipeline para extrair o trecho selecionado antes de aplicar o template Nexus. Preservar a opção "trailer inteiro".
- Prioridade: não implementar esta fase antes de fechar e validar o Gerar direto de ponta a ponta; tratar editor e redesign profissional do painel como segunda fase.


## 2026-10-04 — modo de edição manual no painel
- Criar dois modos no módulo de vídeo:
  1. **Automático**: usa o template Nexus padrão já definido para trailer/filme/série, com pôster, sinopse, elenco, CTA, WhatsApp, logo e composição automática.
  2. **Editável**: cliente controla a montagem antes do render.
- No modo Editável, oferecer abas/controles para:
  - corte por timeline com início/fim e avanço frame a frame;
  - texto livre e texto final/CTA;
  - upload/seleção de logo diferente por vídeo;
  - posicionamento e tamanho da logo;
  - inclusão de elementos gráficos permitidos (moldura, barra, bloco de texto, imagem própria);
  - escolha de moldura/layout;
  - ativar/desativar pôster, sinopse, elenco, avaliações e relacionados;
  - prévia antes do render final.
- Implementação recomendada: editor não destrutivo. Salvar todas as escolhas como JSON de composição do job e aplicar no backend com FFmpeg/Pillow; não editar o MP4 original no navegador.
- Preservar presets para evitar complexidade excessiva no mobile. O modo Editável deve começar com poucos layouts/presets profissionais, não um editor irrestrito.
- Prioridade continua sendo concluir o Gerar direto antes de iniciar esta fase.


## 2026-10-08 — Falha de download YouTube no GitHub e recuperação via PC
- Evidência de produção: run 37856611085, job 113582203315, NEXUS YouTube Ingest #21, iniciou 22:57 UTC e falhou na etapa "Download compatible video source". Log do yt-dlp: `Sign in to confirm you're not a bot`. Upload ao R2 e render não executados; mensagem `youtube_authentication_required` exibida corretamente no painel.
- Branch `fix/youtube-local-retry-after-auth-20261008`: criada recuperação para o mesmo job em falha via novo ticket local de uso único (45 min) e botão "Gerar pelo meu PC". Mantém título, sinopse, pôster, elenco e configurações do vídeo; não reutiliza token de ingestão anterior.
- Pedidos `server_generate` sem fonte oficial direta não devem mais abrir trabalhos destinados a falhar na autenticação do YouTube. Fonte direta do catálogo segue permitida.
- Se o auxiliar PC recusar o retry, registrar falha real, sem redisparar o importador bloqueado. Testes automatizados foram adicionados, mas execução, CI, deploy e render ponta a ponta ainda NÃO VALIDADOS neste registro. Não houve alteração de regras Instagram, credenciais nem cookies.
- Próximo passo do vídeo bloqueado: obter CI verde do PR de recuperação, revisar/mesclar, confirmar deploy Cloudflare, abrir Auxiliar no Windows e clicar **Gerar pelo meu PC** no mesmo job. Validar criação de ticket, handoff, upload R2, workflow render, download e composição visual; não afirmar sucesso sem MP4 final.

## 2026-10-08 — Voltar a gerar/baixar sem obrigar auxiliar
- CI e deploy para `fix/youtube-server-first-optional-pc-20261008`; verificar que "Gerar vídeo" usa `server_generate`, que "Baixar MP4" usa `download` e gera "Baixar original" após R2, e que "Usar meu PC" exige clique explícito.
- Confirmar no painel autenticado com trailer autorizado; se a importação YouTube falhar por anti-bot, apresentar motivo e permitir o PC apenas como fallback. Não declarar download ou render bem-sucedido sem MP4 real.


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
- Branch feat/globalplay-social-references-20261009: subir alteração, CI do PR, integrar e confirmar deploy. Depois UMA execução pós-deploy via CI [force-instagram-test], testId=SHA. Workflow dedicado não usa marker push, recuperação D1 omitida nesse teste. Conferir resposta posts.mediaId/permalink e imagens reais; sem retry cego se resultado ambíguo.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.

## 2026-10-12 — Próximos do pacote instagram-agent
- Traduzir as 26 fórmulas de gancho (hooks.json do repositório Jakeschincariol/instagram-agent-skill, MIT) e dar ao agente que escreve os posts.
- Rodrigo: trocar o campo Nome do perfil @flowarts2026 de "Marina" para algo pesquisável, ex.: "Marina | Marketing com IA".
- Testar o brinde siga-para-liberar (botão "Baixar conteúdo") com um comentário novo da playprime2027.
- Testar os 4 agentes (CEO, Marketing, Vendas, Revisor) com a bateria de 8 pedidos do guia d9tdr (prompt 4): pedidos típicos, falta de informação, restrição, fora da área, informação errada embutida.
- Avaliar trechos do sales-discovery-coach (agency-agents, MIT) para as perguntas da 1ª conversa do agente de Vendas.

## 2026-10-12 — Depois da auditoria (dependem do Rodrigo)
1. Reels: criar um token novo do GitHub na conta flowarts2027-art e trocar o segredo GITHUB_ACTIONS_TOKEN do Worker (+ GITHUB_INGEST_REPOSITORY = flowarts2027-art/SERVIDOR-NEXUS-2.0). Sem isso não sai Reel.
2. Decidir cota diária de texto da OpenAI (hoje 30.000 tokens) — legendas da IA + imagens disputam a mesma cota.
3. Perfil: Nome "Marina | Marketing com IA"; bio "Atendimento em todo o Brasil"; avaliar trocar a foto de IA pelo logo ou foto real (rótulo "Perfil gerado por IA").
4. Aprovar os posts no painel todo dia (só 4 publicados até agora).
5. 15 min/dia de interação manual (comentar em perfis de pequenos negócios) e stories.

## 2026-10-12 — Vendas e próximos produtos (conversa com o Rodrigo)
- Rodrigo está em casa com o pé quebrado e sem receber; prioridade é caixa rápido. Lembrete dado: ver auxílio por incapacidade no Meu INSS (acidente dispensa carência) — ele confirma no 135.
- Ofertas sugeridas: "Instagram que responde sozinho" (resposta automática QUERO→direct→WhatsApp + 10 posts) R$ 197; "5 Reels com IA" R$ 147; "10 posts prontos" R$ 97; logo R$ 67. Mensagens prontas entregues no chat.
- Global Play: continua travada (sem comprovação de licença). Rodrigo perguntou sobre IPTV; resposta: não fazemos marketing de IPTV sem licença. Sugerido: cláusula nos Termos + trava de nichos ilegais no Nexus (não feito, aguardando OK).
- DEPOIS (Rodrigo pediu adiar): atendente de WhatsApp com IA. Precisa de chip novo (o número da API sai do app do celular), produto WhatsApp no app "Flow Arts Nexus", e trocar o texto antigo de whatsapp-agent.js ("uso próprio ou revenda") pelos prompts de Vendas/Qualificação do PDF (com "sou a assistente virtual" e passagem para humano).
- Quando fechar o 1º cliente: criar perfil de marca dele (client-brand.js) para ganhar gancho na imagem, legendas com dicas, brinde no direct e Revisor.

## 2026-10-12 — WhatsApp: próximos passos
1. Rodrigo dá OK → merge da branch `feat/whatsapp-atendente` na main (deploy automático).
2. Rodrigo digita na Cloudflare: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN (teste), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET (app Flow Arts WhatsApp).
3. Meta: webhook /api/whatsapp/webhook com o verify token; assinar `messages`.
4. Teste: Rodrigo manda "oi" do celular → aparece no Master › WhatsApp → ligar o robô → nova mensagem → conferir resposta real. Registrar evidência.
5. Token permanente (usuário do sistema) e chip pré-pago como número de produção.
6. Decidir se a IA oferece "Instagram que responde sozinho" (R$ 197).

## 2026-10-12 tarde — WhatsApp: onde paramos
1. Rodrigo: concluir verificação da empresa na Meta (Central de Segurança › Verificação da empresa › Continuar) com telefone igual ao do cartão CNPJ (PDF do cartão via Ctrl+P › Salvar como PDF).
2. Depois de aprovada: Publicar o app Flow Arts WhatsApp; mandar "oi" do celular para o número de teste; conferir resposta do robô e a conversa no Master.
3. Token permanente (usuário do sistema) antes de vencer o token de teste de 24 h; chip pré-pago como número de produção.
4. Com OK: trecho de WhatsApp/IA na Política de Privacidade; correção do painel vazio na aba WhatsApp.

## 2026-10-14 — WhatsApp: robô recebe mas não consegue responder
1. Na Meta, Etapa 2 › "Enviar mensagem" do +55 21 99855-9965 para o celular do Rodrigo e ler o erro da tela.
2. Conferir o número `to` usado pelo Nexus (wa_id do webhook) e testar envio manual pela aba WhatsApp do Master.
3. Se for o modo desenvolvimento: aguardar a verificação da empresa (em processamento) e publicar o app.
4. Conferir a demo do Café Brisa (legendas sem frases de filme após o Hook Lab).
