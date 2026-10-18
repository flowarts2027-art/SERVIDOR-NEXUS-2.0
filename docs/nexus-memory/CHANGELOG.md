# Histórico de alterações feitas pelo Work

## 2026-10-18 ~12h20 BRT — Conectar Instagram: "Parâmetro inválido" (Global Play e outra conta)
- Rodrigo (pelo celular, app Master em painel.flowarts.com.br): conectar Instagram deu "Parâmetro inválido" com duas contas, inclusive a da Global Play. Duas contas com o mesmo erro = problema do app, não da conta.
- Causa provável: o redirect_uri era montado com o domínio de quem abriu (painel.flowarts.com.br), mas no app Meta só está cadastrado o endereço workers.dev.
- Correção: instagram.js usa sempre INSTAGRAM_REDIRECT_BASE ou PUBLIC_BASE_URL (workers.dev) no redirect_uri; depois de autorizar, volta para o domínio onde o painel foi aberto. Teste novo; 498 testes ok.
- Publicado com OK do Rodrigo (12h14): main 9bf2276; NEXUS CI e Deploy NEXUS Cloudflare success. Overnight Regression falhou no passo end-to-end, igual aos 3 commits anteriores (não causado por esta mudança).
- Falta: Rodrigo testar a conexão do Instagram de novo pelo app (Flow Arts ou cliente novo; Global Play é arquivada/travada).

## 2026-10-18 ~11h20 BRT — Master: "Subir conteúdo do cliente" com legenda pronta por nicho
- Pedido do Rodrigo (11h07–11h12): ele gera as imagens no ChatGPT e sobe para o cliente; escolher tipo (post, carrossel, Reels, Stories), legenda pronta pelo nicho (sem precisar escrever), dia e hora; cada postagem com texto diferente.
- Master › Postagens › "Subir conteúdo do cliente" (aberto no topo): cliente (todos os ativos), tipo, arquivos. Post/Reels/Stories com vários arquivos = um post por arquivo, em horários seguidos ("Horários do dia", continua no dia seguinte). "O cliente escolhe o dia" ou "Eu marco". "Já aprovado por mim" opcional (padrão: o cliente aprova).
- `src/caption-templates.js`: legendas por código para os 21 nichos (gancho, texto, chamada, frase extra, hashtags, nome do cliente, oferta do perfil). Reels: "Dá o play…"; carrossel: "Arrasta…". Stories sem legenda. Sem IA, custo zero.
- `src/master-upload.js`: GET /api/master/caption e POST /api/master/upload (reaproveita createClientUpload, agora com approval e "cliente escolhe o dia"). Rodízio por cliente e formato em nexus_state 'caption-rotation' (432 variações no Reels, 144 no post) e pula legenda já usada nos últimos 80 posts do cliente.
- 497 testes. Publicado com o OK do Rodrigo nesta conversa.

## 2026-10-18 ~10h50 BRT — "Casa de ração" juntou com "Loja de ração"; Agropecuária continua separada
- Rodrigo: casa de ração e loja de ração são a mesma coisa; deixar um nome só. Viu o carrossel da agropecuária (ferramentas, mudas, produtor rural) e manteve separada.
- Fica a chave `racao`, nome "Loja de ração". `casa_racao` saiu de NICHES, CAPTADOR_NICHES, CRM, listas do Master/CRM e exemplos-nicho.json. Chave antiga guardada vira `racao` (`canonicalNiche` em showcase-store.js), inclusive o exemplo por nicho. 21 nichos.
- Exemplos prontos: salão, cafeteria, academia, lanchonete, roupas, padaria, ração, agropecuária. Falta o bar (o ChatGPT pulou).
- Ramo wip/nicho-racao-agro (juntava os três) descartado.

## 2026-10-18 ~11h BRT — Empresa aberta/fechada + "Lembrar quando abrir" (Master e cliente)
- Pedido do Rodrigo (10h27): pizzaria apareceu fechada; mandar agora não serve e amanhã ela vira "atrasada". Mostrar se está fechada e deixar marcar para o horário de funcionamento.
- `src/business-hours.js`: lê horário do mapa (OSM opening_hours) e do Google (regularOpeningHours, agora no FIELD_MASK); diz "Aberta agora" ou "Fechada · abre hoje/amanhã/<dia> às HH:MM". Sem horário: horário comercial (seg–sáb 9h–18h), marcado como "Horário não informado".
- Caçador do Master: selo aberta/fechada; fechada → "Lembrar quando abrir" (POST /api/master/prospects/later) → CRM "Para chamar" com dia e hora da abertura (sai da lista do Caçador).
- CRM: colunas follow_time e hours_json (criadas sozinhas). Com hora marcada, o contato só aparece em "Falar hoje" depois dessa hora; "atrasado" só no dia seguinte. Card mostra "Falar hoje às 18:00" e o selo; botão "Lembrar quando abrir". Data mudada à mão ou "Já falei" limpam a hora.
- Caçador diário: empresa com horário no mapa e fechada já entra marcada para quando abrir; sem horário, continua para hoje.
- Captador do cliente: selo; fechada → "Lembrar quando abrir" → aba nova "Mandar depois" (status depois, remind_at). Quando abre: "Já pode mandar" + "1. Abrir conversa" / "2. Mandar meu material".
- 491 testes (11 novos). Nada é enviado sozinho.

## 2026-10-18 ~10h35 BRT — Caçador do Master: campo de cidade
- Rodrigo pediu conferir se Master e cliente têm cidade + nicho na busca. Cliente (Captador) já tinha os dois. Master só tinha o tipo; a cidade era rodízio de uma lista fixa.
- Novo: Master › Caçador › "Cidade e estado" (ex.: Niterói RJ). Vazio = rodízio antigo. Com cidade: Google (se a chave responder) ou mapa grátis com a mesma busca do Captador (`searchCaptadorOSM`, agora exportada); um tipo por rodada, rodízio de tipos guardado à parte (city-cursor). Contato salvo aceita cidade escrita (`cleanCity`).
- Exemplos por nicho: prontos salão, cafeteria, academia, lanchonete e loja de roupas. História dos cartões (Rodrigo): 1 lugar vazio, 2 dono no celular, 3 mostrando, 4 clientes, 5 atendendo; títulos dos cartões 1 e 2 trocados em exemplos-nicho.json.
- 481 testes. Publicado com o OK geral da sessão.

## 2026-10-18 ~10h15 BRT — Captador do cliente: "Meu material" (fotos, vídeo, PDF do próprio cliente)
- Pedido do Rodrigo (09h46): cliente de ração (Quatree Dog) quer mandar o material DELE (preço, fotos, vídeos), não feito por IA, junto com a mensagem quando busca empresas.
- Painel do cliente › Buscar: bloco "Meu material" (até 10 arquivos: JPG/PNG/WEBP, MP4/MOV, PDF; total até 95 MB). Guardado em R2 `material/<cliente>/<data>/` (fora de library/, então nunca vira post); trocar apaga o antigo; "Tirar o material".
- /media/material/<cliente>/… só abre com login do próprio cliente ou do Master (mesma regra de videos/ e library/).
- Lista do Captador: com material e celular que compartilha arquivo → "1. Abrir conversa" (texto ganha "Vou te mandar aqui embaixo umas fotos/um vídeo/a nossa tabela…") e "2. Mandar meu material" (compartilhar do celular → WhatsApp → conversa no topo). Também "Mandar meu material" em quem já recebeu mensagem.
- Rotas: POST /api/portal/captador/material (formulário) e /material/clear. 478 testes (4 novos). Publicado com o OK geral do Rodrigo nesta sessão (09h42).
- Pendente: Captador do Quatree Dog ligado no Master e o cliente subir o material.

## 2026-10-18 ~10h BRT — Publicado: CRM com mídia + app sem barra; exemplos por nicho engatilhados
- OK do Rodrigo (09h42: "já pode publicar"): main a65fd60 com feat/crm-exemplo-midia e app-android (assetlinks.json no ar; pasta android/ na main).
- Exemplos por nicho: hoje só restaurante e pet (vídeo). Rodrigo vai gerar as fotos no ChatGPT (prompt com 20 nichos, 5 fotos sem texto cada) e reenviar aqui.
- `scripts/social/exemplos-nicho.json`: títulos dos 20 nichos (gancho, dor, solução, como funciona, chamada), conferidos (tamanho e palavras proibidas). `scripts/social/montar_exemplo.py <nicho> <saida> f1..f5` monta os 5 cartões com render_carousel.py. Testado com fotos de teste.

## 2026-10-18 ~09h50 BRT — CRM manda o exemplo como mídia (ramo feat/crm-exemplo-midia; falta OK)
- Rodrigo: "a pessoa não lê link, quer ver resultado"; quer a primeira mensagem já com carrossel/Reel/vídeo.
- wa.me não anexa arquivo. Solução: quando o nicho tem exemplo, o card do CRM mostra "1. Abrir conversa" (texto sem o link: "Vou te mandar aqui embaixo um carrossel/vídeo…") e "2. Mandar o carrossel/vídeo" (baixa os arquivos do exemplo e abre o compartilhar do celular; no WhatsApp a conversa do passo 1 fica no topo). 1º toque prepara, 2º toque compartilha (o celular exige toque recente).
- Celular/PC sem compartilhar arquivo: continua o botão antigo com o link.
- API do CRM: campos example {kind, files} e messageWithMedia (`src/crm.js`). 474 testes.
- Decisão do Rodrigo (09h36): não precisa da página "instale o app"; APK fica só para ele.

## 2026-10-18 ~09h40 BRT — Reagendar para hoje + 2 correções de postagem (pelo celular; PC do Rodrigo inacessível)
- Pedido do Rodrigo (09h24): colocar hoje todos os posts da Flow Arts que não saíram, o primeiro agora; e tela de abertura do app Master em azul.
- App Master: fundo da tela de abertura e do ícone trocado de preto (#080B0A) para azul (#0F2747), no ramo app-android (commit 95e2e1c). O workflow gera nova Release do APK; instalar por cima.
- Master › Postagens: aviso agora conta todos os aprovados que não saíram (vencidos, falha, legenda parecida, horário passado) e tem o botão "Reagendar para hoje". `src/reschedule-today.js` + POST /api/master/clients/:id/reschedule-today: primeiro horário agora, depois de 2 em 2 h até 21h45 (Brasília); zera retryCount; marca payload.rescheduledByMaster. Não mexe em publicado, recusado, futuro, rascunho vencido nem cliente arquivado. O que não couber fica para o dia seguinte (tocar de novo).
- Correção 1: `agent-runtime.js` — conteúdo manual ou reagendado pelo Master só é barrado por legenda se for praticamente igual (≥ 0,99, antes 0,92).
- Correção 2: `executor.js` recoverStuckPublishing — só marca "publicado" se o post do Instagram com a mesma legenda for de depois do início da publicação.
- 471 testes passando (4 novos em reschedule-today.test.mjs). Sem acesso ao D1 nesta sessão: não vi quantos posts estão presos; quem dispara é o Rodrigo pelo botão.
## 2026-10-17 ~21h BRT — Apps Android (Master e Cliente) — APK gerado; branch app-android (fora da main)
- Pedido do Rodrigo: APK Android do Nexus, do painel Master e do cliente.
- `android/`: projeto Trusted Web Activity (androidbrowserhelper 2.5.0), dois sabores: `br.com.flowarts.nexus.master` ("Nexus Master", abre https://painel.flowarts.com.br/api/master/console) e `br.com.flowarts.nexus.cliente` ("Flow Arts", abre /portal). Ícones dos manifests PWA, tela de abertura com a cor de cada painel, notificações do painel com o nome do app. Precisa do Chrome no celular (sem Chrome, cai para WebView).
- `.github/workflows/android-apps.yml`: gera os 2 APKs e publica numa Release. Chave de assinatura criada sozinha e guardada no R2 em `private/android-signing/` (pasta que o site não serve); assim as próximas versões instalam por cima.
- Prova: run 39080200815 success; Release app-v1.0.1 com nexus-master.apk (536 KB), flowarts-cliente.apk (535 KB) e assetlinks.json (SHA-256 D6:5C:…:9B:7F); prerelease=false (chave ficou no R2).
- Pendente: `public/.well-known/assetlinks.json` está pronto na branch, mas só vale depois de ir para a main (deploy). Sem ele o app mostra uma barrinha com o endereço no topo. Precisa do OK do Rodrigo.

## 2026-10-17 ~16h30 BRT — Caçador diário + aviso no celular (publicado 15h28 com OK do Rodrigo; deploy success 6a9ffce)
- Pedido: busca todo dia e envio para no mínimo 3 contatos, nichos diferentes em rodízio, pelo número da Flow. Expliquei o risco (Meta exige que a pessoa tenha aceitado; contato frio pode derrubar a nota e bloquear o +55 21 99855-9965). Rodrigo escolheu a opção 2: o Nexus separa e avisa; ele envia pelo WhatsApp pessoal. E pediu notificação no celular que abre o painel.
- `daily-prospects.js`: no cron de 15 min, a partir das 9h (Brasília), procura no mapa grátis (OSM; o Google não permite guardar dados) 1 empresa por nicho, nichos diferentes, primeiro os que têm exemplo, em rodízio de nicho e cidade. Só celular, sem site, que ainda não está no CRM (por número ou código do mapa, inclusive arquivados). Entra no CRM na etapa nova "Para chamar", com a primeira mensagem pronta (com o link do exemplo) e retorno hoje. Meta padrão 3/dia (dá para mudar de 1 a 10 e desligar no CRM). Até 12 tentativas/dia, 3 buscas por tentativa. Nada é enviado.
- Aviso no celular: Web Push do próprio painel (`push.js`, `public/master-sw.js`, `public/master-push.js`). Chave VAPID criada pelo servidor e guardada no D1 (tabela push_keys); o aviso vai sem conteúdo e o celular busca o resumo no painel com o login. Um aviso por dia, quando a lista do dia fica pronta. Tocar abre /api/master/console?view=crm. No iPhone só funciona com o painel na Tela de Início.
- CRM: etapa "Para chamar" (Abrir WhatsApp pessoal, Já falei → vira "Mandei mensagem" com retorno em 7 dias, Não serve → arquivado e não volta). Envio pela Flow pula empresa nova (new_contact_personal); "Enviar retornos de hoje" só manda retornos.
- 467 testes passando (5 novos). Testado no navegador sem rede.
- Risco: o mapa grátis às vezes fica fora (Overpass 504 em 14/10 e 17/10); aí a lista do dia pode vir menor.

## 2026-10-17 ~16h BRT — Exemplos por nicho só para vendas (publicado 15h20 com OK do Rodrigo, junto com o CRM pelo número da Flow; deploy success 04649db)
- Rodrigo: pediu exemplo (vídeo ou carrossel) por nicho para mandar ao cliente na prospecção ("ninguém quer ler mensagem, quer ver o resultado"). O que foi feito de manhã não atendia: a vitrine só aceitava Reel que vira post (o Reel ficava no painel da Flow Arts para postar) e o Caçador do Master só tinha cafeteria, salão e lanchonete, enquanto só restaurante e pet tinham exemplo.
- Novo: Master › Caçador › "Exemplos por nicho". Para cada um dos 22 nichos, subir carrossel (2 a 10 imagens, ordem pelo número do arquivo) ou vídeo MP4 (capa tirada do vídeo), ou usar um Reel já gravado. Arquivos em R2 `examples/<nicho>/`. NÃO cria post_ledger: não vai para painel nem Instagram. Botão "Tirar do painel" para o Reel de exemplo que ficou esperando no painel (status cancelled, error used_as_sales_example; nada publicado é mexido).
- Página pública /exemplo/<nicho> agora mostra carrossel (arrastar para o lado) ou vídeo; og:image = primeira imagem/capa, para a foto aparecer no WhatsApp.
- Caçador do Master: 22 nichos (mesmas chaves do Captador, com etiquetas do mapa grátis). Mensagem curta quando o nicho tem exemplo: "Eu cuido do Instagram de <nicho>. Veja um carrossel/vídeo que fizemos para <nicho>: <link>. Posso fazer um assim para a <empresa>?". Sem exemplo, continua a mensagem do site.
- CRM: campo "Tipo de negócio"; contato vindo do Caçador já leva o nicho; o retorno de 7 dias inclui o link do exemplo.
- A vitrine antiga (Postagens › Reel animado) saiu; ficou um aviso apontando para o Caçador.
- 462 testes passando. Testado no navegador sem rede (celular): subir carrossel chama /api/master/showcase/upload; seletor do Caçador com 22 nichos; sem erro de página.

## 2026-10-17 ~15h30 BRT — CRM: escolher o número que envia (publicado 15h20, deploy success 04649db)
- Correção minha: eu tinha dito que o número da Meta era só de teste. Errado: o número na Cloud API é o chip Vivo do Rodrigo, +55 21 99855-9965 (CONNECTED, LIVE, desde 13/10). O +1 555 foi só o teste do começo.
- Pedido do Rodrigo: opção no CRM para escolher por qual número sai a mensagem; mandar para vários clientes pelo número da Flow, sem atender pelo celular.
- CRM › "Enviar por": Seu WhatsApp (abre o celular com a mensagem) ou Número da Flow (envia pela Meta, direto do painel). "Enviar para todos de hoje" (até 25 por vez) e "Enviar pela Flow" por contato, os dois com segundo toque para confirmar. Resultado mostra quem foi e quem ficou de fora e por quê.
- Regra das 24 h: `crm-send.js` olha a última mensagem recebida da pessoa (com e sem o 9). Dentro de 24 h vai texto normal; fora, vai a mensagem modelo aprovada (nome salvo no CRM, {{1}} = primeiro nome); sem modelo, o contato é pulado com aviso. Respeita o limite por hora já existente (WHATSAPP_SEND_LIMIT_PER_HOUR, padrão 30). Depois de enviar, marca "já falei" e a próxima volta em 7 dias.
- `whatsapp-agent.js`: envio de modelo (type template), sendAndRecord exportado com status sent_crm, contato criado na aba WhatsApp para a resposta cair na conversa; quem escreve para o número da Flow entra no CRM (ou passa de "mandei mensagem" para "conversando").
- Texto sugerido para o modelo (Marketing, pt_BR): "Olá, {{1}}! Aqui é o Rodrigo, da Flow Arts. Passando para saber se você ainda tem interesse em deixar o Instagram do seu negócio em dia. Posso te mostrar como funciona?" Ainda NÃO criado na Meta.
- 458 testes passando (5 novos). Testado no navegador sem rede: troca de número e envio para todos chamam /api/master/crm/send com confirmed:true; sem erro de página. Nenhum envio real feito.

## 2026-10-17 ~15h BRT — Master novo (azul) + CRM com retorno de 7 dias (publicado 14h51 com OK do Rodrigo)
- Pedido do Rodrigo: enxugar o Master, letras maiores, sair do preto e branco (azul, branco e cinza) e criar um CRM com follow-up de 7 dias.
- Tema: `public/styles.css` convertido para claro (fundo #eef3f9, cartões brancos, azul #1f66d6, barra lateral #0f2747), letras de 13 a 30 px (antes 8 a 12 px). theme-color e manifesto atualizados.
- Enxugado: menu = Início, Postagens, CRM, WhatsApp; Clientes, Caçador (antigo Contatos/Odin), Agentes, Site e Integrações em "Mais". Início mostra "Para fazer hoje" (CRM) e clientes; números e custos ficam fechados em "Números do sistema". Postagens: histórico primeiro; Reel pronto, carrossel pronto, Reel animado, testar carrossel e custos viraram blocos que abrem e fecham. Agentes: os 13 cartões e a auditoria fechados. Caçador: acessos de clientes e leads do Odin fechados. Nenhum id usado pelo app.js foi removido.
- CRM: `cloudflare/src/crm.js` (tabela crm_contacts criada sozinha; etapas contato/conversando/proposta/cliente/nao-quer; retorno padrão 7 dias no horário de Brasília; "Já falei" marca a próxima volta e grava histórico; arquivar em vez de apagar; número duplicado bloqueado). Rotas /api/master/crm (só login do Master). Tela `public/crm.js`: resumo, "Falar hoje", novo contato, busca, abas por etapa, botão "Abrir WhatsApp" com mensagem pronta (sem promessa nem número inventado). Nada é enviado sozinho: abre o WhatsApp pessoal do Rodrigo.
- Caçador: quem o Rodrigo marca como "chamei no WhatsApp" (celular) entra no CRM com volta em 7 dias.
- Testes: 453 passando (9 novos do CRM; 2 testes de visual antigo atualizados para a decisão nova). Conferido no navegador sem rede (celular e computador): cliques de Detalhes, Já falei e Novo contato chamam as rotas certas, sem erro de página.
- 17/10 14h51: OK do Rodrigo ("ficou muito bom"). Commit 6c488cd na main; Deploy NEXUS Cloudflare 39055580627 success (todos os passos, inclusive "Confirm live portal responds"). Falta o Rodrigo abrir o Master no celular e cadastrar os primeiros contatos.

## 2026-10-17 ~14h30 BRT — Revisão dos posts da Flow Arts (só código; sem dados de produção)
- Rodrigo: posts agendados que não saíram e posts que constam publicados mas não estão no Instagram.
- Achado 1 (forte): `agent-runtime.js` bloqueia legenda ≥ 0,92 parecida com uma já publicada (`duplicate_caption_blocked`). A legenda modelo da Flow Arts só troca o nome do negócio: pizzaria × estética = 0,927. O post fica em Agendados para sempre, sem aviso.
- Achado 2: `recoverStuckPublishing` marca como publicado se achar no Instagram a mesma legenda (primeiros 80 caracteres). Conteúdo reenviado igual pode ser marcado como publicado sem ter saído. Stories somem do Instagram em 24 h, mas ficam "Publicado" no painel.
- Auditoria pela nuvem: ramo `auditoria-posts-flowarts` com workflow só de leitura (SELECT no D1 pela API da Cloudflare, grava resumo sem legendas/links). A chave CLOUDFLARE_API_TOKEN do GitHub NÃO lê o D1 (403, código 7403). Falta o Rodrigo acrescentar "Conta · D1 · Ler" na chave ou criar CLOUDFLARE_D1_READ_TOKEN. Logs do Actions continuam bloqueados para leitura nesta sessão (403 no blob).

## 2026-10-17 ~11h15 BRT — Vitrine por nicho (só Flow Arts)
- Pedido do Rodrigo: incluir um Reel de exemplo do nicho buscado na primeira mensagem (ex.: buscou pet shop → manda o Reel de pet). Só Flow Arts; NÃO ativar para outros clientes.
- `src/showcase-store.js` (ler/gravar em nexus_state 'showcase', cliente primeiro-teste) e `src/showcase.js`: página pública `https://flowarts.com.br/exemplo/<nicho>` (vídeo, capa no og:image/og:video para a prévia do WhatsApp, botão "Quero um para o meu negócio" para o WhatsApp da Flow Arts; 404 se o nicho não tem vitrine). Master: GET/POST /api/master/showcase (lista Reels gravados da Flow Arts; escolher/tirar por nicho).
- Mensagem: Captador (só quando o cliente é primeiro-teste) e caçador do Master ganham "Veja um vídeo que fizemos para <nicho>: <link>" quando o nicho tem vitrine. Caçador do Master agora diz "no mapa" para contato do mapa grátis (antes dizia "no Google").
- Master › Postagens › Reel animado: caixa "VITRINE POR NICHO".
- Nichos usam as chaves do Captador (pet, restaurante, salao, cafeteria…). Ainda não existe Reel de pet shop.
- 444 testes (4 novos).
- Deploy 8509265 success. 17/10 11h08, com OK do Rodrigo: vitrine de Restaurante = Reel da pizzaria com fotos (animated-reel-da3449d4…). Conferido no ar: https://flowarts.com.br/exemplo/restaurante abre com o vídeo (200, og:image). Falta: Reel de pet shop (prompt das 5 fotos entregue ao Rodrigo).
- 17/10 ~11h25: Reel do pet shop com as 5 fotos do ChatGPT (render 39040036947 success, post animated-reel-a46e4041-b106-443f-977a-4d730a4e3f18). Textos: "Banho, tosa e carinho / E o Instagram, quem cuida?", "O balcão não para / Sem tempo para postar", "Seu trabalho é lindo / Merece aparecer todo dia", "Você aprova / A Flow publica no dia certo", "Cuide dos pets / A gente cuida do resto". Vitrine de Pet shop salva; https://flowarts.com.br/exemplo/pet conferida no ar com o vídeo. O Reel também ficou no painel da Flow Arts sem data (pendente).

## 2026-10-17 ~10h45 BRT — Caçador de leads: Google opcional, mapa grátis como reserva
- Rodrigo perguntou se o caçador depende dos R$ 120 do Google. Diagnóstico no código: com a chave do Google salva (14/10), `runProspectSearch` usava só o Google; com a conta de faturamento inativa a busca falhava, e a tela dizia "Falta ativar o Google Maps".
- Com OK do Rodrigo: se o Google recusar, a busca passa sozinha para o OpenStreetMap (Overpass) no resto da rodada (`fallbackFrom: "google"`). Resultados do mapa grátis são guardados (como antes) e agora também aparecem na lista "Novos". `listProspects` devolve `configured: true` sempre e `googleKey`. Tela: botão de busca sempre liberado; mostra a fonte e avisa quando usou o mapa grátis.
- Ainda vale: OSM tem menos empresas e às vezes sem telefone; Overpass deu 504 em 14/10. Pagar o Google continua opcional.
- MailerFind (analisado a pedido): pago (a partir de € 97/mês), pega dados de seguidores do Instagram (contra os termos do Instagram, risco LGPD). Recomendado não usar.
- 438 testes (1 novo).
- 17/10 ~10h50: Rodrigo testou o Captador do PAINEL DO CLIENTE (pet shop, Rio de Janeiro) e deu "O Google Maps não respondeu" — é outro código (`captador.js`), só Google. Mesma reserva aplicada: sem chave ou Google recusando → OpenStreetMap (Overpass por área do município, admin_level 8, nome da cidade sem o estado; tipos em CAPTADOR_OSM_TAGS). Contatos do mapa grátis (id osm:…) podem ser salvos e marcados "não serve". Busca que falha nos dois não conta no limite. `ready` sempre true. Testes do Captador atualizados (439 no total).
- Deploy 45c670d success. Teste real 17/10 ~11h (painel do cliente, pet shop, Rio de Janeiro): `search_failed`. Diagnóstico pelo Chrome do Rodrigo: Overpass público fora do ar (overpass-api.de 504 até em busca leve; maps.mail.ru 504; private.coffee e kumi.systems sem conexão). Código ok; serviço externo instável (igual a 14/10). Opções levadas ao Rodrigo: tentar mais tarde, 3ª reserva (Nominatim, menos telefones) ou Google (R$ 120).
- 17/10 ~11h: Rodrigo escolheu a 3ª reserva. Teste no Chrome: Nominatim "pet shop in Rio de Janeiro" → 50 pet shops, 5 com telefone (em português quase nada). Feito: Overpass tenta 3 servidores (overpass-api.de, maps.mail.ru, private.coffee; 20 s cada) e depois `searchNominatim` (frases em inglês por tipo em OSM_PHRASES, só resultados da categoria certa, 1 pedido/s, User-Agent com contato). Vale para o Captador do cliente e o caçador do Master. 440 testes.
- Deploy 4ee872e success. Teste real pelo painel do cliente (pet shop, Rio de Janeiro): ok, fonte osm (Nominatim), 50 encontrados, 3 contatos úteis (Pet Market, Pet Studio, Bicho Mania; telefone fixo), ~35 s. Busca contou 1 no limite do mês da Flow Arts.

## 2026-10-17 ~10h30 BRT — Reel automático (desligado por padrão)
- Pedido do Rodrigo: "todo o processo automatizado no Nexus, sem enviar pelo painel nem colocar texto; deixar o manual em aberto".
- `cloudflare/src/auto-reel.js`: no cron de 15 min (`runAutoReels`), para clientes com perfil da marca e não travados (hoje só Flow Arts). A cada X dias (padrão 7): escolhe um nicho (sem repetir os últimos), o agente de marketing do carrossel (`planMarketingCarousel`, 1 chamada OpenAI) escreve as 5 cenas, o código confere (`validateReelScenes`), a legenda segue a legenda modelo ("Você cuida da/do [nicho]…"), e `startAnimatedReel` grava no GitHub. O post nasce `reel_rendering` com dia sugerido (padrão: daqui a 2 dias às 18h) e aprovação pendente: o cliente só aprova ou troca o dia.
- Sem foto (fase 1). Custo: só o texto (menos de 1 centavo de dólar por Reel). Fotos por IA ficam para quando a geração for religada (o relógio do servidor ainda mata gerações longas).
- Tentativa marcada antes de gastar; depois de uma tentativa espera 6 h (não repete erro a cada 15 min).
- Master › Postagens › "Criar Reel animado": caixa AUTOMÁTICO (ligar, a cada X dias, hora, dias até a data, Salvar, "Criar um agora"). GET/POST /api/master/animated-reel/auto. O manual continua igual.
- `animated-reel.js` refeito: `startAnimatedReel` serve ao manual e ao automático.
- 437 testes (5 novos). DESLIGADO até o Rodrigo ligar no Master.
- Deploy c2e70a7 success. 17/10 ~10h25: "Criar um agora" com OK do Rodrigo: IA escreveu as 5 cenas (loja: "Você cuida da loja. / E o Instagram fica?" … "Quer ver como funciona? / Fale com a Flow por aqui"), render 39036272357 success, post animated-reel-auto-3fdf5317-3328-4a66-b3ca-34785c901798 pronto com dia sugerido. Automático continua DESLIGADO (só o teste).
- 17/10 10h27: Rodrigo pediu "ligue". Reel automático LIGADO no Master (conferido: enabled true, a cada 7 dias, 18:00, 2 dias à frente). Próximo automático: ~24/10 (7 dias depois do teste das 10h21).
- 17/10 10h31: Rodrigo aprovou um dos Reels no painel (teste de publicação). Decidiu: campanhas da Flow Arts ele sobe MANUAL; Reel automático DESLIGADO só para a Flow Arts (conferido: enabled false) para não gastar créditos. O automático fica pronto para clientes futuros (hoje só libera cliente com perfil de marca em client-brand.js).
- 17/10 10h33: com OK do Rodrigo, cancelados no painel os 2 Reels sem foto (animated-reel-5aae4011… e animated-reel-auto-3fdf5317…). Fica só o Reel com fotos animated-reel-da3449d4…, APROVADO para 17/10 10h45 BRT (13:45 UTC): 1ª publicação real de Reel — conferir.

## 2026-10-17 ~09h40 BRT — Reel animado por modelo (sem IA, sem custo)
- Pedido do Rodrigo: analisar o repositório yihui-dev/awesome-opus5-5-videos (vídeos feitos em código: HTML/Canvas/GSAP) e "subir ajustado" no Nexus.
- Ajuste escolhido: em vez de pedir um código novo à IA para cada vídeo (custo e resultado imprevisível), um MODELO fixo animado que o sistema preenche. Mesma regra do carrossel: texto escrito por código (Inter), sem rosto, 5 cenas (gancho, dor, solução, como funciona, chamada) + botão "Comente QUERO".
- `scripts/reel/template.html` (animação determinística: window.renderAt(t)) + `scripts/reel/render_reel.py` (Playwright/Chromium tira foto de cada quadro, FFmpeg junta): MP4 1080x1920, 30 fps, 16 s, trilha muda, + capa JPG. Gravado aqui com sucesso (pizzaria, ~1,5 min).
- `.github/workflows/reel-template-render.yml` (repository_dispatch `reel-template-render`): baixa só fotos do próprio /media, grava e devolve capa e vídeo em PUT /api/internal/animated-reel/upload (token por post); falha em POST /api/internal/animated-reel/fail.
- `cloudflare/src/animated-reel.js`: Master › Postagens › "Criar Reel animado" (POST /api/master/animated-reel; GET para acompanhar). Confere as linhas (24/30 letras, sem números/promessas, cena 5 sem "Comente QUERO"). Post nasce `reel_rendering` (escondido do cliente, não aprova: formatBuilder pending). Com o vídeo vira `ready` sem data (dateChoice client). Falha: `reel_render_failed`. Desligar: NEXUS_ANIMATED_REEL=false.
- Painel do cliente esconde `reel_rendering` e `reel_render_failed`.
- 432 testes (6 novos). `wrangler --dry-run` não rodou aqui (npm sem rede); o deploy do GitHub roda antes de publicar.
- Publicado com o OK do Rodrigo ("pode subir ajustado"): commit d407395; NEXUS CI success; Deploy NEXUS Cloudflare run 39033174596 success. Rota no ar não conferida desta sessão (proxy sem acesso ao workers.dev). Overnight Regression continua falhando (antigo).
- 17/10 09h55: 1º teste real com OK do Rodrigo (pizzaria, só texto, pelo Master no Chrome dele). Run "NEXUS Animated Reel Render" 39034373256 success; capa e vídeo voltaram ao Worker; post animated-reel-5aae4011-f921-4db1-8e7e-0c37ff72d24d ficou pronto e o vídeo toca no Master. Falta: cliente escolher o dia e aprovar; publicação real do Reel ainda não testada.
- 17/10 ~10h15: Reel com 5 fotos (ChatGPT, mandadas pelo Rodrigo). 1ª tentativa falhou em "Prepare scenes" (run 39035191967; hipótese: Cloudflare recusa o User-Agent Python-urllib). Correção 5f6c0cb (User-Agent NEXUS-GitHub-Renderer/1.0). 2ª tentativa success (run 39035383417), post animated-reel-da3449d4-5612-4f20-b3bc-a5675ad0fd54, vídeo conferido no Master com as fotos. Há 2 Reels da pizzaria no painel (só texto e com fotos).
- Café Brisa: link público sem login https://flowarts.com.br/demo (conferido no Chrome em 17/10).

## 2026-10-16 ~22h BRT — Painel do cliente: enviar feed, carrossel, reels e stories prontos
- Pedido do Rodrigo: pausar a geração de imagens (economizar saldo; religar quando houver cliente) e fazer conteúdo manual. Criador, Designer e Format Builder já estão DESLIGADOS no Master (conferido 16/10 ~18h35).
- Painel › Posts › "Enviar conteúdo pronto" (`public/enviar.js`, POST /api/portal/uploads, `src/client-uploads.js`): feed (1 imagem), carrossel (2 a 10, ordem pelo número do arquivo + setas ← →), reels (vídeo + capa tirada do vídeo) e stories (imagem ou vídeo). Já nasce aprovado e agendado no dia/hora escolhidos (quem envia é o cliente); dá para trocar o dia ou cancelar em "Agendados". Sem IA, sem custo OpenAI.
- Publicador: formato `story` (imagem ou vídeo, media_type STORIES).
- Proteção: Hook Lab, Story, Viral, Copy Chief e a correção do CTA do brinde não mexem em conteúdo com `payload.manual` (Rodrigo ou cliente). Antes o Copy Chief podia reprovar e o Story reescrever a legenda pronta.
- 426 testes. NÃO testado: publicação real de Stories/Reels enviados pelo painel.

## 2026-10-16 ~21h BRT — Carrossel pronto: cliente escolhe o dia no painel
- Pedido do Rodrigo: subir um carrossel pronto (pizzaria, 5 imagens feitas no ChatGPT) para o painel, sem publicar, e ele escolhe o dia.
- Master › Postagens › "Enviar carrossel pronto" (POST /api/master/manual-carousel, `src/manual-carousel.js`): 2 a 10 imagens na ordem + legenda; convertidas para JPEG 1080x1350 (Images binding); post `ready`/`pending` com `scheduled_for` NULL e `dateChoice: "client"`.
- Painel do cliente: formulário "Dia e Hora" + "Salvar dia" (POST /api/portal/posts/:id/schedule, mínimo 10 min à frente). "Aprovar" travado até ter data. Travas no servidor: decidePost recusa (`schedule_required`); runPublisher não pega post sem data com dateChoice=client (o executor já exigia data).
- 422 testes passando.

## 2026-10-16 ~18h45 BRT — Teste do carrossel: 3 de 5 fotos aprovadas; parou no limite diário da OpenAI
- O cron chegou a gerar 3 fotos do cartão 1 (todas boas, sem texto), mas o revisor reprovou por "rosto não está de frente" e depois por "ação diferente da cena". Corrigido (photo-review-v3: rosto de lado é normal; julga a ideia do título, não a cena ao pé da letra) e as fotos já pagas são revisadas de novo sem gerar outra.
- Novo: POST /api/master/carousel-test/:cliente/:id/step faz 1 passo por chamada (plano, 1 foto revisada ou envio ao GitHub); o botão do Master chama até terminar. Não depende do cron. Format Builder DESLIGADO de novo (para não rodar junto com o botão).
- Cartões 1, 2 e 3 aprovados. Cartão 4: revisão parada em `openai_visual_budget_reserved` (limite diário de tokens NEXUS_OPENAI_DAILY_TOKEN_LIMIT=30000; a revisão visual não usa os últimos 25%). Fotos geradas no teste até agora: 3 (cartão 1) + 1 + 2 + 2 = 8.
- PRÓXIMO: decisão do Rodrigo — subir o limite diário ou esperar o limite zerar amanhã; depois clicar de novo no teste (Master › Postagens › Testar carrossel) para terminar os cartões 4 e 5 e a montagem no GitHub.

## 2026-10-16 ~18h BRT — Teste do carrossel: plano ok, fotos paradas pelo relógio do servidor
- Deploy d99757b (botão "Testar carrossel") success. Módulo Format Builder LIGADO em primeiro-teste (PATCH modules; Creator e Designer continuam desligados). Teste criado: carousel-test:d701dce8-312a-43d5-94eb-49736afd52cb (pet shop).
- Plano gerado às 20:37:56 UTC e aprovado na conferência: "Sua rotina não para / E o Instagram fica?", "Você atende os pets / Quem cuida do perfil?", "Conteúdo com sua cara / A Flow Arts cria os posts", "Você aprova primeiro / Depois, a Flow publica", "Dê o primeiro passo / Fale com a Flow Arts".
- Nenhuma foto salva. Causa (logs da Cloudflare): o job manual foi drenado pelo watchdog de GET /api/autonomy-health (ctx.waitUntil, ~30 s), que roda quando o cron */15 está atrasado; a 1ª foto (~1 min) não cabe. O cron */15 dispara irregular (10 eventos em 3 h; 17:30:57 local, ~2,8 s quando não há trabalho). Isso também explica posts "sem imagem".
- Job manual de novo às ~20:58 UTC. Resultado não conferido: o Chrome do Rodrigo desconectou.
- PRÓXIMO: conferir o teste (Master › Postagens › Testar carrossel). Se continuar parado: o watchdog não deve drenar ciclos com geração de imagem (ou a montagem deve fazer 1 foto por rodada e reagendar).

## 2026-10-16 ~17h40 BRT — Publicado o agente + botão "Testar carrossel" no Master
- Rodrigo deu OK ("sim pode fazer"). Commit e6a4645 em main; Deploy NEXUS Cloudflare run 38962098563 success; rota nova conferida no navegador (GET /api/internal/carousel-render/upload → method_not_allowed). "NEXUS Overnight Regression" falha desde antes desta mudança (passo "Client workspace end-to-end regression"), não investigado.
- Não havia carrossel esperando (os 2 posts de 16/10 são imagem). Rodrigo escolheu um botão de teste: Master › Postagens › "Testar carrossel" cria post com status `carousel_test` (Format Builder monta; agendador/publicador só pegam ready/scheduled/failed; painel do cliente esconde). Acompanhamento em GET /api/master/carousel-test/:cliente/:id.

## 2026-10-16 ~17h BRT — Agente de marketing do carrossel (branch feat/agente-marketing-carrossel, SEM push)
- Pedido do Rodrigo: imagens sem sentido e texto errado na arte. Ele trouxe do ChatGPT um agente em 4 etapas (estrategista, redator, diretor de arte, revisor) testado no nicho "salão de beleza"; o carrossel de pet shop dele (5 cartões, título preto/azul, logo no topo, "Comente QUERO") virou o padrão visual.
- `src/carousel-agent.js`: plano de 5 cartões (gancho, dor, solucao, como_funciona, chamada) a partir de nicho + tema + legenda do post. O código confere tudo (5 cartões, ordem, linha 1 ≤ 24 e linha 2 ≤ 30 caracteres, sem números, preço, %, "garantido", "dobre", "lucro", "viral"; cartão 5 não repete "Comente QUERO") e pede correção 1 vez; se falhar de novo, não gera imagem.
- `media-generation.js` opção `photoOnly`: a IA faz só a FOTO (sem título, sem estilo sorteado, sem "F", telas só com fotos). O comportamento antigo continua para posts simples.
- Revisor que olha a foto de verdade (`reviewCarouselPhoto`): sem texto, combina com o título e com o nicho, mãos/rostos ok, pessoa inteira, nota ≥ 65. Reprovou: refaz a foto daquele cartão (máx. 3 por cartão, depois o build falha e para de gastar). Revisão sem resposta/sem saldo: espera a próxima rodada sem pagar outra foto.
- `format-builder.js` `buildAgentCarousel` (só marca com perfil, ex.: Flow Arts; desligar com `NEXUS_CAROUSEL_AGENT=false`): progresso salvo a cada foto; com as 5 aprovadas despacha `carousel-card-render` no GitHub.
- `.github/workflows/carousel-card-render.yml` + `scripts/social/render_carousel.py`: escreve título, logo (símbolo + FLOW ARTS), rodapé com seta, numeração e botão "Comente QUERO" por código com a fonte Inter (OFL, em scripts/social/fonts). Devolve cada cartão em `PUT /api/internal/carousel-render/upload` (token por post); com os 5 o Format Builder fica aprovado e `carouselUrls` tem 5 cartões.
- Testes: 12 novos (416 passando). Renderizador conferido aqui com as 5 fotos do salão vindas do ChatGPT. NÃO testado: chamada real à OpenAI, o workflow no GitHub e o retorno real ao Worker. `wrangler deploy --dry-run` não rodou aqui (npm sem rede nesta sessão).
- Geração de imagens continua PAUSADA no Master (Creator/Designer/Format Builder desligados desde 16/10 17:44 UTC).

## 2026-10-16 09h BRT — Story automático e título sem corte (pedido do Rodrigo: tudo automático)

- Rodrigo não quer ações manuais: o produto dele é automação.
- `publisher.js`: depois de publicar um post (imagem ou 1ª arte do carrossel) em cliente com perfil de marca (Flow Arts), o Nexus publica a mesma arte nos Stories (`publishInstagramStory`, media_type STORIES). Melhor esforço: erro vira `storyError` no resultado e nunca afeta o post. Desligar: variável `NEXUS_AUTO_STORY=false`. NÃO testado contra a API real do Instagram; conferir no primeiro post (permissão instagram_business_content_publish já existe).
- `media-generation.js` `brandHeadline`: título longo agora é cortado numa pausa natural (vírgula, ponto, travessão), sem "…" no meio da frase (era a causa dos títulos cortados "…não pelo…" na grade).
- Não automatizável com segurança: comentar/seguir em perfis de outros e mandar direct frio (a API não permite e o Instagram bane). Alternativas automáticas: Stories, Reels, resposta a comentários/direct, anúncios (precisa de orçamento e OK).
- 394 testes passando.

## 2026-10-16 manhã BRT — Melhoria das imagens da Flow Arts + geração religada (pedido do Rodrigo)

- Pedido: melhorar as imagens sem depender de prints do Pinterest; ao terminar, religar a geração; se ficar ruim, parar de novo.
- `cloudflare/src/flowarts-styles.js`: biblioteca com 8 estilos (dica editorial, produto herói, fachada dourada, dono em ação, mesa vista de cima, tipográfico minimalista, pergunta no holofote, contraste de luz). Escolha por tema do título, sem repetir os 3 últimos (`mediaGeneration.styleId`).
- `media-generation.js`: o prompt leva a direção de arte do estilo; qualidade da imagem sobe para "high" nas marcas com perfil (env `NEXUS_IMAGE_QUALITY` continua mandando; custo maior por imagem, o relatório de custo ainda não mostra imagem).
- Fiscal visual agora vale para a Flow Arts (`REVIEWED_CLIENTS` em visual-review.js; Designer em extended-agents.js). Regra nova: título em português mal escrito ou cortado reprova; `screenContentCoherent` vale true sem tela.
- `GENERATION_PAUSED_CLIENTS` esvaziado: criação religada. `profileVersion` 2026-10-16-estilos: rascunhos não aprovados antigos são refeitos. Posts continuam só saindo após aprovação do Rodrigo no painel.
- NÃO feito: camada de design em modelos HTML renderizados (precisa de render no GitHub Actions). O título continua escrito pela própria IA na imagem. Efeito real das imagens novas em produção ainda não verificado.
- Para parar de novo: pôr "primeiro-teste" em GENERATION_PAUSED_CLIENTS (client-brand.js) e publicar.
- 392 testes passando (5 novos).

## 2026-10-16 manhã BRT — Auditoria do fluxo de publicação e duas correções (pedido do Rodrigo)

- Auditoria só de leitura do código de publicação (executor, scheduler, publisher, credenciais). Nenhuma publicação foi ativada ou testada.
- Correção 1: um post só expira (`expireStalePosts`) quando o horário agendado passou há mais de 24 h (antes contava a data de criação, o que expirava post criado cedo na primeira falha).
- Correção 2: renovação automática do token de login do Instagram (`refreshInstagramTokenIfNeeded`, 1 checagem por dia por cliente; renova quando faltam menos de 10 dias). Antes não havia renovação: a Flow Arts pararia em ~60 dias com "Instagram não conectado". Resultado real em produção ainda não verificado.
- Pendente: o fiscal visual só vale para Global Play/Ragnar (desligados); a Flow Arts não tem fiscal de imagem. Ligar o revisor ao fluxo junto com a melhoria das imagens (criação de posts está pausada). Leitura de produção (posts com falha, data de vencimento do token) ainda não feita.
- 387 testes passando (2 novos).

## 2026-10-15 21h20–21h35 BRT — Pausa na criação de posts da Flow Arts (pedido do Rodrigo)

- Pedido: "Dê uma pausa nas gerações de postagens, amanhã vamos reavaliar e implementar skills para ajudar nas edições."
- `GENERATION_PAUSED_CLIENTS = {primeiro-teste}` em client-brand.js. Com a pausa, o Criador não roda (nem post novo, nem imagem, nem atualização de rascunho) e o format-builder também não (nem carrossel, nem a conversão de Reel).
- Continua funcionando: a publicação de posts já aprovados (post simples), o direct do QUERO, SITE e REELS, os brindes, o painel e o WhatsApp. Reel ou carrossel aprovado e ainda não montado fica parado.
- Para voltar: tirar "primeiro-teste" do conjunto e publicar.
- 385 testes passando.

## 2026-10-15 20h56–21h20 BRT — Reel parado publicado de novo na Flow Arts (publicado 9ab49a4 às 21h03 com OK do Rodrigo; deploy e CI ok; conferir amanhã que o social-format-render não roda mais)

- Rodrigo mandou um print às 20h56: post da Flow Arts saiu como vídeo, com a frase cortada ("Se isso acontec…") e sem sentido.
- Prova: o GitHub Actions "social-format-render" rodou hoje às 18:45 e às 23:16 UTC (15h45 e 20h16 BRT). É o Reel de foto com zoom, que estava proibido desde 14/10.
- Causa: só a campanha fixa trocava Reel por post. A IA (`aiCreative.format`) e posts antigos ainda pediam "reel", e o format-builder mandava renderizar. A imagem saía em 9:16 e o vídeo cortava o texto.
- Correção: `plannedFormat()` em format-builder.js transforma "reel" em "post" ao criar, ao atualizar e ao gerar a mídia do post. No format-builder, um Reel sem vídeo de verdade nunca é renderizado. Se a imagem já era 9:16, é apagada e gerada de novo em 4:5. Se já era 4:5, sai como post. Um Reel com vídeo enviado pelo Master continua Reel.
- 384 testes passando (novo static-reel-block.test.mjs).
- O post que já saiu não pode ser apagado pelo Nexus. Se quiser, o Rodrigo apaga no Instagram. O selo "Perfil gerado por IA" é do próprio Instagram, que detecta imagem feita por IA.

## 2026-10-15 18h47–19h20 BRT — Uma palavra para cada conteúdo (publicado 4baa302 às 18h52 com OK do Rodrigo; deploy e CI ok; falta teste real com um comentário SITE ou REELS)

- Pedido do Rodrigo (passo B): cada Reel com a sua palavra e o seu conteúdo.
- Novo `cloudflare/src/gift-materials.js`. QUERO e as palavras antigas abrem o guia "10 ideias". SITE abre o checklist "O site que traz clientes" (7 passos, com o site por R$ 497 no fim). REELS ou ROTEIRO abre "5 roteiros de Reels" (cena por cena).
- A palavra vai junto pelo caminho todo: comentário → direct → "Já segui" → link /b/ → formulário → guia. O contato no painel mostra qual conteúdo a pessoa pegou.
- Legendas: a chamada segue o assunto do post. Post de site pede SITE, post de vídeo pede REELS, o resto pede QUERO. Na campanha de outubro ficam 58 QUERO, 2 SITE e 2 REELS. Não duplica se já houver uma chamada.
- O PDF existe só para o guia. Os outros dois não têm o botão de PDF.
- 382 testes passando (4 novos em gift-materials.test.mjs). Prévia no celular conferida.


## 2026-10-15 18h40–19h05 BRT — Página do brinde com visual novo (publicado a5e3f48 com OK do Rodrigo; deploy e CI ok)

- Rodrigo mostrou a página do Manual de Donos (Reel → comentário → ManyChat → link) e pediu o mesmo para a Flow Arts sem custo. O funil já existe no Nexus desde 12/10 (QUERO → direct → seguir → formulário → guia). Ele escolheu a opção A: deixar a página com cara de designer.
- `cloudflare/src/gift.js`: cores e fontes do site (azul-noite, prata, Unbounded). O formulário ganhou logo, uma capa 3D do guia e 3 benefícios. O guia ganhou topo fixo com progresso e PDF, sumário clicável, cartões numerados (01–10) com formato e tempo, a legenda num cartão estilo Instagram, um bônus de WhatsApp no meio e outro no fim. A lógica não mudou.
- 378 testes passando. Prévia no celular conferida por Playwright. A fonte Unbounded só não carregou no teste local, que não tem internet.


## 2026-10-15 16h53–17h08 BRT — Análise do awesome-seedance e prompts de Reels (sem mudança no código)

- Rodrigo pediu para analisar o repositório LearnPrompt/awesome-seedance. Conclusão: é uma biblioteca de prompts para o Seedance. Os prompts são grátis, mas gerar vídeo pela API é pago. O grátis do Dreamina é só manual, sem API. Não roda grátis no Nexus.
- Montei o documento "Prompts de Reels para o Flow" (Claude Docs) com 4 prompts: review, comida, antes e depois, ração. Ajustes feitos: no salão a cliente fica sem capa (a IA duplicava a capa) e no café ficou sem nenhuma voz.
- Rodrigo testou os 4 no Flow e decidiu: "não achei nada demais nos vídeos, cancela". Nada será feito com esses vídeos.

## 2026-10-15 16h44–17h05 BRT — Instagram da Flow Arts conectado no Café Brisa por engano (publicado em main 87af94e; deploy Cloudflare ok)

- Publicado com OK do Rodrigo ("pode"). 378 testes passando. Deploy NEXUS Cloudflare: success no 87af94e.
- A conexão do Café Brisa (demo-cafe) é apagada no próximo cron de 15 min. Falta o Rodrigo conferir no Master que a Flow Arts segue conectada.
- Observação: "NEXUS Overnight Regression" já falhava antes (3cd13b7, 507dafe), sem relação com esta mudança. Investigar depois.
- Rodrigo conectou a conta @flowarts2026 no cliente Café Brisa (demo-cafe) pelo Master.
- Riscos conferidos no código: demo-cafe está em BLOCKED_PUBLISH_CLIENTS (nunca publica); webhook de comentários pula clientes travados (clientForInstagramUser); painel público /api/demo/panel não usa a conexão. A conexão da Flow Arts (primeiro-teste) é outra linha da tabela connections e não muda.
- Sem acesso direto ao D1 daqui. Correção: demo-client.js ensureDemoClient (cron 15 min) apaga connections de demo-cafe (meta/instagram); instagram.js recusa conectar Instagram em clientes travados (OAuth start, callback e token manual) com mensagem clara. 378 testes ok.
- Depois de publicar: a conexão some em até 15 min. Conferir no Master que a Flow Arts continua conectada.

## 2026-10-15 09h34–09h45 BRT — Carrossel aprovado antes de ficar completo (publicado 06d1b95 às 09h37 com OK do Rodrigo; deploy e CI ok; carrossel das 19h ganhou as imagens — confirmado pelo Rodrigo às 09h37)
- Rodrigo aprovou o carrossel corrigido (capa nova com agenda aberta, ok) e o painel só mostrava a capa. Causa: o ajuste zera os cartões (de propósito) e eles são refeitos no próximo ciclo dos agentes (~15 min); o botão Aprovar já liberava só com a capa. O agendador só publica carrossel com 2+ cartões (formatBuilder aprovado), então não sai incompleto.
- client-lite: aviso "As outras imagens do carrossel estão sendo criadas" e Aprovar travado enquanto o carrossel tem menos de 2 imagens. 377 testes ok.

## 2026-10-15 09h27–09h45 BRT — Notificações do Master consertadas (publicado 89219f7 às 09h32 com OK do Rodrigo; deploy e CI ok)
- Rodrigo: filtros (Todos/Novos/Lidos/Resolvidos) não funcionam, "4 abertos" com lista vazia, e "Resolver" abre uma pergunta no navegador.
- Causas: (1) app.js usava $() (um elemento) com .forEach no filtro → erro; o filtro mudava mas a tela não, e a lista ficava presa num filtro vazio. (2) Não existia rota PATCH /api/master/support/:id → "Resolver" falhava e mostrava alert de erro (a "pergunta"). (3) Chamados de correção são gravados com status "open", que a tela mostrava como RESOLVIDO; sem nome do cliente.
- Correções: $$ no filtro; rota PATCH (só Master; new/read/resolved); "open" aparece como novo; nome do cliente no chamado; erro aparece no botão, sem janela do navegador. app.js v49. 376 testes ok.

## 2026-10-15 09h13–09h35 BRT — Master em preto e branco (publicado 0e8f487 às 09h20 com OK do Rodrigo; deploy e CI ok)
- Pedido: "muda a cor do painel nexus para preto e branco, dá um upgrade". Entendido como o Master.
- styles.css: todas as cores convertidas para cinza (luminância), exceto vermelho de erro e âmbar de alerta; camada nova no fim: fundo preto, cartões #0b0b0b com borda fina e raio 18, botão principal branco com letra preta, menu ativo com barra branca, foco visível branco, badges neutras. nexus-ai-mark.svg em cinza. Login do Master (master.js) em cinza com botão branco. app.js: cor padrão de cliente #e5e5e5 (as cores da marca do cliente não mudam). theme-color preto. styles v33, app v48. 375 testes ok. Conferido em print (computador e celular).
- Pedido extra: detalhe prateado. Botões principais, selo MASTER e botão do login com degradê prata; títulos pequenos e números com brilho prateado; barra do menu ativo prata. styles v34.

## 2026-10-15 09h07–09h20 BRT — Pedir ajuste depois de aprovado (publicado b24b2a7 às 09h11 com OK do Rodrigo; deploy e CI ok; falta ele pedir o ajuste do carrossel das 19h)
- Rodrigo: carrossel aprovado (hoje 19h, Flow Arts), imagem 2 "1. Comece por aqui" com a pessoa escrevendo na agenda fechada. Pediu botão de correção mesmo depois de aprovado e corrigir esse.
- client-lite (v118): post aprovado e não publicado mostra "Pedir ajuste" (com o mesmo formulário) e "Cancelar". posts.js: ajuste bloqueado em publicado/publicando (antes não tinha trava). portal.js: mensagens.
- format-builder: o pedido de ajuste do cliente entra no briefing de cada imagem do carrossel. media-generation: regra "objetos usados de verdade: escrever em caderno aberto, xícara em pé".
- Não consigo agir no painel dele daqui (sem login); ele mesmo pede o ajuste depois de publicar. 374 testes ok.

## 2026-10-15 08h55–09h15 BRT — Carrossel com setas no painel do cliente (publicado bd595bd às 09h01 com OK do Rodrigo; deploy e CI ok; conferir o próximo carrossel no painel)
- Rodrigo: no carrossel não dá para ver as outras imagens no painel do cliente.
- client-lite (v117/css v114): carrossel com todas as imagens (formatBuild.carouselUrls), setas ‹ › de 44px, contador "1 / 4", passa também com o dedo. Testado no navegador simulado (celular). 372 testes ok.
- Limite: os cartões 2 a 4 do carrossel só são criados DEPOIS da aprovação (format-builder pega só approval_status='approved'). Antes de aprovar, o cliente vê só a capa. Perguntado ao Rodrigo se quer criar todos antes da aprovação (custo extra só quando o cliente recusa).
- Rodrigo escolheu criar todos antes (08h58). format-builder.js: também monta carrossel com approval_status='pending' (não publica: agendador exige aprovado). posts.js requestPostRevision: carrossel com ajuste pedido zera formatBuild (refaz as imagens com a capa nova). 373 testes ok. Custo: cartões de carrossel recusado.

## 2026-10-15 08h48–09h05 BRT — Cancelar post aprovado no painel (publicado 8d2b80f às 08h52 com OK do Rodrigo; deploy e CI ok; falta ele cancelar o post das 12h)
- Rodrigo: post da Flow Arts aprovado para hoje 12h (rótulo Reels, imagem 9:16 "O que parece pequeno faz o cliente voltar.") com a mulher segurando o celular com a tela virada para a câmera; pediu opção de cancelar.
- O servidor já tinha POST /api/portal/posts/:id/cancel (status cancelled, approval rejected; agendador só pega ready/scheduled/failed). Faltava o botão: client-lite (v116/css v113) mostra "Cancelar esta postagem" em post aprovado e ainda não publicado, com confirmação.
- media-generation.js: regra no prompt — celular na mão com a tela virada para a pessoa; para mostrar a tela, visão por cima do ombro.
- 371 testes ok.

## 2026-10-14 23h03–23h10 BRT — "Assumir painel" dava erro (publicado 918d748 às 23h05 com OK do Rodrigo; deploy e CI ok; falta ele testar com login real)
- Rodrigo: no Master, "Assumir painel" dá erro. Causa provável: os links (app.js, 3 lugares) apontavam fixo para servidor-nexus.diamantehinode2015.workers.dev; com o Master aberto em painel.flowarts.com.br (sugerido hoje), o login do Master não vale no endereço antigo. E o assume-open redirecionava para PUBLIC_BASE_URL (outro endereço que o do cookie).
- Correção: links relativos (/api/clients/<id>/assume-open) e redirect/entryPath relativos (/portal?auth=1) em master.js. Funciona no endereço em que o Master estiver. app.js v47. 369 testes ok. Não testado com login real.
- Link do painel do cliente enviado: https://painel.flowarts.com.br/

## 2026-10-14 22h44–23h05 BRT — Vídeo de fundo no site (publicado 0d9142d às 22h54 com OK do Rodrigo; deploy ok; conferido no ar em flowarts.com.br/site.html: seção do Reel, aviso de demonstração e cafe.brisa)
- Rodrigo mandou 2 cenas novas: "dona sorri servindo" (8 s, 720p) ficou boa (tela virada para ela, história clara) — sugerida como Reel da Flow Arts com legenda; "mulher segurando o celular" (4 s) boa, mas é outra mulher (não juntar).
- Pedido: o vídeo de 4 s no fundo da página, misturado ("marca d'água"). Feito: public/video/fundo-cafe.mp4 (540×960, sem som, 186 KB) + capa .jpg; .bg-video fixo atrás de tudo, opacidade 0,18 (0,14 e leve desfoque no computador) e camada escura por cima; para (fica a capa) com "menos movimento" ou economia de dados. site.html + scripts/site (body e css). 367 testes ok. Conferido em print (celular e computador).
- Pedido extra: celular do site com cara de iPhone 2026. Explicado que não copiamos o desenho da Apple; feito celular moderno genérico (borda fina escura, cantos 54px, câmera em pílula, botão lateral) nos 4 celulares do site.
- Rodrigo não gostou do "antes e depois" (celular do antes vazio). Trocado pela seção "Reels com vídeo de verdade": o Reel de 8 s da dona da cafeteria (public/video/reel-cafeteria.mp4, 720p, 1,3 MB, com som) dentro do celular, com aviso "Demonstração para cafeteria, criada com IA", toca sem som quando aparece na tela (respeita menos movimento), controles para ligar o som, botão "Quero com vídeo".
- Logo da Flow Arts dentro do celular "não tinha nada a ver": criado logo original de cafeteria fictícia (public/brand/cafe-brisa.svg, xícara com vapor) e perfil "cafe.brisa" (… · exemplo) nos celulares do topo e da conversa.

## 2026-10-14 22h35–23h00 BRT — Planos Básico e com Vídeo; site com domínio no 1º ano (publicado d269ab7; deploy ok; conferido no ar em flowarts.com.br)
- Aprovado pelo Rodrigo (22h35): Básico R$ 397/mês + R$ 197 de entrada (8 posts + 4 carrosséis, sem vídeo); com Vídeo R$ 697/mês + R$ 297 (4 Reels em vídeo feitos por ele no Flow, 4 carrosséis, 4 posts; fundador mantido); site R$ 497 inclui 1º ano com domínio, hospedagem e ajustes; depois R$ 297/ano ou R$ 29/mês com renovação do domínio.
- site.html (cartões + JSON-LD) e scripts/site/site-visual.body.html; whatsapp-knowledge.js; contrato-site.html (domínio em nome do cliente, 1º ano incluso, Flow Arts renova com a manutenção em dia, aviso 30 dias antes de 1 ano). Doc "Contrato" no Claude Docs NÃO foi atualizado. Páginas de nicho não mudaram (usam os pacotes avulsos). 366 testes ok. Conferido em print (celular e computador).
- Vídeos novos dele: café 1080p ótimo (pode usar); mulher com a tela do celular virada para a câmera fica falso. Novo prompt: câmera por cima do ombro vendo a tela, depois gira para o rosto.

## 2026-10-14 22h11–22h55 BRT — Plano com vídeo: Reel feito no Flow enviado pelo Master (publicado 5bd137d às 22h30 após "tá ótimo" do Rodrigo; deploy e CI ok)
- Rodrigo mandou um "parecer" do ChatGPT (reforma grande do site) e 2 vídeos de cafeteria feitos no Flow (10 s, 9:16; 720×1280 e 360×640). Analisado: bons pontos (honestidade, CTA certo, legenda limpa, preço de uma fonte só); problemas: manda publicar sozinho (contra a regra), grande demais (fazer em 3 blocos), plano promete 4 Reels/mês mas o Nexus não faz Reel, não fala de manutenção/domínio.
- Manutenção: site mostra só R$ 497 + "domínio por sua conta (~R$ 40/ano)"; contrato/robô já têm R$ 29/mês ou R$ 297/ano. Proposta (aguardando OK): R$ 497 inclui 1º ano com domínio; depois R$ 297/ano (ou R$ 29/mês) com renovação do domínio.
- Gemini Pro/Flow: assinatura só vale nos apps (Flow); API do Veo é cobrança separada (~US$ 0,10/s Fast, ~US$ 0,40/s normal). Decisão do Rodrigo: plano básico sem vídeo; plano com vídeo = preço do site, ele faz os vídeos à mão no Flow e envia pelo Master para o cliente aprovar.
- manual-reel.js + POST /api/master/manual-reel (só Master): cliente, vídeo MP4/MOV até 95 MB, capa (tirada do vídeo no navegador; se não der, capa reserva com a legenda), legenda, dia e hora (Brasília, ≥ 10 min à frente). Salva em posts/<cliente>/manual-reel-*/ (público) e cria o post Reel com aprovação "pending"; gates aprovados (Rodrigo conferiu). Clientes travados (Ragnar/Global/demo) recusados. Depois que o cliente aprova, o agendador publica como Reel (publishInstagramVideo).
- Master → Postagens: quadro "Enviar Reel pronto" (manual-reel.js v1, styles v32). Painel do cliente: Reel mostra o vídeo com play (client-lite v115/css v112).
- 365 testes ok. Teste no navegador simulado: formulário envia o vídeo inteiro (3,27 MB) + capa. Não publicado nem testado com Instagram real.
- Pendente do Rodrigo: preço/conteúdo do plano básico (sugerido 8 posts + 4 carrosséis, R$ 397/mês + R$ 197 de entrada); OK da renovação R$ 297/ano com domínio.
- Avaliação dos vídeos dele: café (360×640, baixa; xícara quase não enche; começo parado) e dona no celular (boa história; celular some da mão no fim; tela do celular não aparece; começo lento); som baixo. Entregues 2 prompts em inglês para refazer no Flow (9:16, 8 s, gancho no 1º segundo).

## 2026-10-14 20h36–21h10 BRT — Painéis no celular e "app" na tela inicial (publicado 0466da7 às 20h45 com OK do Rodrigo; deploy e CI ok; manifest não lido daqui — leitura externa bloqueada)
- Rodrigo (print do login vazando para a direita): Master e painel do cliente ruins no telefone; sem conta de desenvolvedor para app.
- Diagnóstico com navegador simulado (360px e letra grande, como acessibilidade do Android): login vazava (inputs cresciam com a letra); menu do cliente tinha 8 abas para 6 colunas (Campanha sumia, Meu negócio/Conta quebravam linha); Master tinha 9 itens com letra de 8px; tabela de Clientes com min-width 760 (arrastar para o lado).
- Cliente: menu de baixo com 5 (Início, Posts, Campanha, Buscar, Mais); "Mais" abre botões grandes (Números, Contatos, Meu negócio, Conta). Login sem vazar. No computador, barra lateral igual. client-lite v114/css v111.
- Master: celular com Visão geral, Clientes, Postagens, WhatsApp e Mais (Agentes, Contatos, Site, Integrações); tabelas viram cartões; botões com 44px. app.js v46, styles v31.
- PWA: portal.webmanifest (start /portal) e master.webmanifest (start /api/master/console), ícones Flow Arts 180/192/512. No Android: menu ⋮ → "Adicionar à tela inicial"/"Instalar app"; no iPhone: Compartilhar → "Adicionar à Tela de Início". Sem service worker (não funciona offline).
- Conferido em prints simulados (celular com letra grande e computador). 362 testes ok.
- Rodrigo disse (20h43): "já coloquei endereço do painel novo como domínio certo". Esclarecido: ele não mudou configuração nenhuma; falava do domínio flowarts.com.br comprado (painel em painel.flowarts.com.br), já usado no texto de acesso desde be3db4f.

## 2026-10-14 20h26–20h35 BRT — Acesso do cliente com o domínio próprio (publicado be3db4f às 20h29 com OK do Rodrigo; deploy e CI ok; leitura externa do app.js veio com versão anterior — provável cache da ferramenta de leitura, não confirmado)
- Rodrigo: o texto de acesso do cliente novo sai com servidor-nexus.diamantehinode2015.workers.dev. Causa: app.js montava com location.origin (o Master é aberto no workers.dev).
- app.js (v45): CLIENT_PANEL_URL = https://painel.flowarts.com.br/ no texto "NEXUS AI / Acesso / Usuário / Senha". 360 testes ok. Não conferido daqui que /login abre no domínio (o acesso a esse site é bloqueado pelo ambiente); os arquivos do painel já respondem nesse domínio.
- Rodrigo colou no chat usuário e senha de um cliente (senha fraca 12345678). Recomendado trocar a senha desse cliente pelo "Definir acesso". Não usei a senha.

## 2026-10-14 19h27–19h35 BRT — Reel com frase cortada publicado às ~19h03 (publicado d39d7c0 às 19h30 com OK do Rodrigo; deploy e CI ok)
- Rodrigo mandou print: Reel da Flow Arts com a frase cortada, publicado há 24 min, depois da correção 4:5.
- Evidência: o render desse Reel rodou às 10h00 BRT (GitHub run 38568226987, 13:00 UTC), com o código antigo. A correção (0e24431) entrou às 18h22. O post estava pronto e aprovado desde cedo; só foi publicado no horário.
- Correção: Flow Arts profileVersion 2026-10-11g → 2026-10-14-45. Rascunhos ainda NÃO aprovados da versão antiga são refeitos no próximo ciclo, já em 4:5. Aprovados não mudam (decisão do Rodrigo): ele precisa conferir/cancelar os aprovados ainda não publicados no painel. 359 testes ok.

## 2026-10-14 19h15–19h35 BRT — Limite de IA acompanha a campanha (publicado 3faf9e0 às 19h19 com OK do Rodrigo; deploy ok; campanha.js v2 conferido no ar)
- Rodrigo: campanha de 30 dias x 2 posts = 60 imagens, mas o limite era 30/mês. Escolha dele: o limite acompanha a campanha.
- client-campaign.js: limite = dias x posts/dia da campanha atual; uso contado por campanha (cada campanha tem id próprio; mudar os dias cria campanha nova). Trava extra de 60 por mês (máximo de uma campanha) contra recomeçar para ganhar imagens. Master só liga/desliga (sem número). Falha devolve.
- Telas: aba Campanha "usou X de Y imagens desta campanha"; Master → Clientes "usou X de Y da campanha"; quadro em Contatos sem o campo de número. Corrigido também o texto fixo antigo "geração paga de imagens desativada" na tela do painel do cliente no Master. 359 testes ok.

## 2026-10-14 19h05–19h15 BRT — Ligar imagem por IA na tela Clientes (publicado a0b4b01 às 19h09 com OK do Rodrigo; deploy ok; app.js v43 conferido no ar)
- Rodrigo não achou onde liberar a IA: olhava Master → Clientes, coluna "IA do cliente", que mostrava um texto fixo antigo ("imagem IA paga desativada", até para a Flow Arts, que gera imagem). O quadro novo estava só em Contatos.
- app.js (v43): a coluna agora tem a caixa "Imagem por IA" por cliente (liga/desliga em /api/master/ai-images/access) e mostra "usou X de Y no mês"; Flow Arts mostra "sempre ligada". styles v30. O quadro em Contatos continua (limite por mês).
- Sobra: app.js linha ~211 (renderClientPortal) ainda tem o texto fixo "geração paga de imagens desativada". Não corrigido; avisar o Rodrigo.

## 2026-10-14 18h58–19h05 BRT — Exemplos do painel falavam de Quatree para todos (publicado ef35585 às 19h01 com OK do Rodrigo; deploy ok; negocio.js v2 conferido no ar sem "Quatree")
- Rodrigo: "a regra de perfil entrou em todos os clientes". Perguntado; era isto: os exemplos cinzas da aba Meu negócio citavam Quatree/ração/Minas para qualquer cliente.
- Trocados por exemplos gerais (padaria) em negocio.js (v2); cidade de exemplo do Captador e mensagens do servidor também (Curitiba PR, 11 99999-1111). Teste novo garante que não há nome de cliente nos exemplos. 358 testes ok.
- Ele também perguntou por que "Criar com IA" não marca: é a trava escolhida por ele (liberar no Master → Contatos → Imagem por IA para clientes). Não é bug.

## 2026-10-14 18h46–19h15 BRT — Aba "Campanha" no painel do cliente (publicado 40cd939 às 18h52 com OK do Rodrigo; deploy e CI ok; campanha.js conferido no ar)
- Pedido do Rodrigo: cliente escolhe enviar arte pronta ou criar por IA, aba para enviar as artes, dias da campanha etc. Escolhas dele: IA só depois que ele libera no Master; 30 imagens IA/mês por cliente (muda no Master); 7, 15 ou 30 dias; 1 ou 2 posts/dia.
- client-campaign.js: config.campaignSettings {artSource own|ai, days, postsPerDay, startDate}; começa no dia em que salva (mudar só arte/posts mantém o começo). Liberação IA e uso por mês em nexus_state namespace client-campaign (ai-access, ai-usage); artes usadas em art-used.
- agent-runtime.js: para clientes fora de IMAGE_GENERATION_CLIENTS: dailySlots = posts/dia da campanha; fora dos dias da campanha não cria post; artSource own → próxima arte enviada (purpose publish, mais antiga primeiro, copiada para posts/); artSource ai → reserva 1 do limite e gera imagem limpa 4:5 (sem texto por cima; falha devolve a reserva). Sem arte/sem saldo: cai no comportamento antigo (fotos do Instagram dele). Flow Arts não muda.
- Portal: aba "Campanha" (public/campanha.js): escolhas, resumo (datas, total de posts, artes na fila/faltando), envio de várias artes (usa /api/portal/media com purpose publish), apagar arte da fila. Master → Contatos: quadro "Imagem por IA para clientes" (liga/desliga, imagens por mês, uso). GET/POST /api/master/ai-images/access.
- 357 testes ok. Não testado no navegador nem com geração real.

## 2026-10-14 18h35–18h50 BRT — Aba "Meu negócio" no painel do cliente (publicado dff599d às 18h43 com OK do Rodrigo; deploy e CI ok; negocio.js conferido no ar)
- Pedido do Rodrigo: aba para o cliente colocar o perfil dele. Achado: o Master tem "Perfis enviados pelos clientes" (agentProfile.submittedAt), mas o painel novo não tinha mais o formulário; /api/portal/profile só salva nome/@/telefone e não tinha tela.
- business-profile.js + GET/POST /api/portal/business (depois do login): nome da empresa, ramo, o que vende (obrigatórios); produtos, público, região, diferenciais, WhatsApp (opcionais). Salva em config.agentProfile (mantém o resto), marca submittedAt e status "submitted" (aparece como NOVO PERFIL no Master). clientBrand já usa nome, ramo, público, oferta e WhatsApp nos posts.
- Portal: aba "Meu negócio" (public/negocio.js, client-lite v112, css v109). Demo não salva. 353 testes ok.
- Observação: clientes fora de IMAGE_GENERATION_CLIENTS (ex.: Quatree Dog) não ganham imagem por IA; os posts usam fotos do próprio Instagram/banco. O perfil melhora o texto, não a imagem.

## 2026-10-14 18h23–18h30 BRT — Post 4:5 publicado; NVIDIA descartada
- Publicado 0e24431 com OK do Rodrigo (18h27): Reel da Flow Arts vira post 4:5; imagens já nascem em 4:5/9:16 (frases sem corte). Deploy Cloudflare e CI ok. Não conferido num post real ainda: olhar o próximo post gerado.
- Rodrigo perguntou da ferramenta NVIDIA: é o auditor de código experimental `cloudflare/src/experimental/nemotron-audit.js`, sem rota, sem cron, sem chave, nunca usado. Não foi testado. Expliquei o plano grátis (trial, ~40 pedidos/min, uso comercial não claro). Decisão dele: descartar e deixar desabilitado (código continua no repositório, desligado).

## 2026-10-14 18h15–18h40 BRT — Reels parecendo foto e frases cortadas no feed (branch fix/reel-movimento-feed-45, não publicada)
- Rodrigo: Reels da Flow Arts parecem foto parada; frases dos posts do feed ficam cortadas (pediu 4:5).
- Causa Reel: social-format-render.yml fazia zoom de só 6% em 10 s (on*0.0002), sem suavização: quase invisível. O render no GitHub funciona (3 runs ok em 12–14/10).
- Correção Reel: scripts/social/render_reel.sh — zoom 10% com subida leve, curva suave, imagem ampliada 2x (sem tremer), entrada e saída em fade. Medido num teste: ~70% mais movimento. Zoom limitado a 10% para não cortar a frase escrita na imagem.
- Causa feed: imagem gerada em 1024x1536 (2:3) e recortada para 4:5 (corta ~8% em cima e embaixo) — o prompt pedia para fugir das bordas, mas a IA nem sempre obedece.
- Correção feed: media-generation.js gera já no formato final (gpt-image-2 aceita tamanho livre): 1024x1280 (4:5) no feed/carrossel e 1008x1792 (9:16) no Reel; depois só amplia para 1080x1350/1080x1920, sem corte. Prompt: frase com 10% de margem nas laterais e nada nos 20% de baixo (botões do Instagram).
- 350 testes ok. Não testado com imagem real da OpenAI nem Reel real: conferir no próximo post depois de publicar. Posts já publicados não mudam.
- Limite honesto: o Reel continua sendo 1 imagem com movimento. Para parecer vídeo de verdade: várias cenas por Reel (mais imagens = mais custo) ou vídeo por IA (custo maior).
- Rodrigo viu a comparação e não notou diferença. Ofereci 3 cenas por Reel ou vídeo por IA. Decisão dele (18h21): "se não der para fazer vídeo, não faça".
- flowarts-campaign.js: FLOWARTS_REAL_VIDEO_REELS=false. Todo Reel da campanha vira post de imagem 4:5 (mesmo tema e gancho); o calendário do painel mostra "Post". 351 testes ok. O novo movimento do Reel fica no código, mas não é usado pela Flow Arts.

## 2026-10-14 18h07–18h12 BRT — Busca do cliente sem resultado: Google ainda não ativo (publicado 2bff639 às 18h10 com OK do Rodrigo; deploy ok)
- Rodrigo testou o Quatree Dog: não apareceu nada; ele mesmo disse que o serviço de busca (Google) ainda não está ativo. Pendência já conhecida: completar R$ 120 de crédito, ativar Places API (New) e salvar a chave no Master.
- fix: busca do cliente que o Google recusa não conta no limite do mês (antes contava). 348 testes ok.

## 2026-10-14 18h01–18h05 BRT — Captador com Google Maps publicado (e454a1a)
- OK do Rodrigo às 18h01. Push na main; "Deploy NEXUS Cloudflare" e "NEXUS CI" com sucesso no e454a1a.
- Conferido ao vivo: painel.flowarts.com.br/captador.js?v=3 já mostra "Fonte: Google Maps" e "Buscas este mês".
- Falta: ligar o Captador do Quatree Dog no Master (Contatos → Captador para clientes) e fazer 1 busca real.

## 2026-10-14 17h59–18h25 BRT — Captador: limite por cliente, por mês (mesma branch, não publicada)
- Pedido do Rodrigo: limite para cada cliente antes de publicar; aumentar depois. Escolha dele: 100 buscas por mês.
- captador.js: limite mensal por cliente guardado junto da liberação (nexus_state captador/access.monthlyLimit, padrão 100, máx. 3000). Contagem por mês (usage.month). Limite de 10/dia removido. Passou do limite: "Você usou todas as buscas deste mês. Para buscar mais, fale com a Flow Arts."
- Master → Contatos → Captador para clientes: em cada cliente, campo "Buscas por mês" + Salvar e "Usou X este mês". Mudar o limite não liga nem desliga.
- Portal: "Buscas este mês: X de Y". Robô do WhatsApp: Captador "busca no Google Maps, 100 buscas por mês" (antes falava mapa grátis e 10/dia). 347 testes ok.

## 2026-10-14 17h52–18h20 BRT — Captador do cliente agora busca no Google Maps (mesma branch, não publicada)
- Pedido do Rodrigo: o cliente (ex.: Quatree Dog) deve ter na aba Buscar a mesma busca do Caçador do Master (Google Maps) e a mesma regra de captação.
- captador.js: busca pelo Google Places com a chave da Flow Arts ("<tipo> em <cidade>", 20 resultados). Lista vai direto para a tela, sem guardar. Guardado só: quem o cliente chama no WhatsApp (POST /api/portal/captador/contacted, status enviado, sem endereço) e o código do lugar de "Não serve" (tabela nova captador_skips). "Não cheguei a mandar" apaga. Quem já foi chamado/recusado não volta. Tudo por cliente. Limite 10 buscas/dia por cliente. Sem chave: aviso "fale com a Flow Arts", sem gastar busca.
- 22 tipos com texto de busca do Google (ração = "loja de ração", casa de ração, agropecuária, pet shop...). Rotas antigas do mapa grátis (plan/import) removidas do portal.
- public/captador.js (v=2): botão "Buscar empresas", "Fonte: Google Maps. Buscas hoje", abas Novos/Mandei mensagem/Responderam/Fechando/Não querem, nota e avaliações do Google.
- prospects.js: placesKey e searchPlaces exportados. 347 testes ok.
- CUSTO: as buscas dos clientes usam a cota do Google da Flow Arts (mesma SKU do Master, ~1.000 grátis/mês; Master já usa até ~900). Cada cliente pode gastar até ~300/mês.

## 2026-10-14 17h46–18h10 BRT — Captador: ração, casa de ração e agropecuária (branch feat/captador-racao-agro, não publicada)
- Pedido do Rodrigo: cliente que revende a marca Quatree em Minas Gerais precisa achar quem compra; adicionar na aba Buscar do portal as áreas ração, casa de ração, petshop e agropecuária, para o cliente escolher o que buscar.
- captador.js: 3 tipos novos (Ração, Casa de ração, Agropecuária). "Pet shop" já existia. Busca por tag do OSM (shop=agrarian, agrarian~feed, shop=pet_food) e também pelo nome da loja ("ração/rações", "casa de/das ra…", "agropecu…/agrovet"), porque muitas lojas no mapa não têm a tag certa. Agora são 22 tipos.
- captadorQuery aceita filtro extra e chave sem valor. Teste novo; 346 testes ok.
- Não testado ao vivo: o Overpass não abre a partir do ambiente do Claude. Conferir numa busca real (ex.: Belo Horizonte) depois do deploy.

## 2026-10-14 09h50–10h15 BRT — Caçador do Master só com Google (branch feat/cacador-google, não publicada)
- robô (feat/robo-planos-contrato, 671629e) publicado 09h49 com OK; contrato no ar em /contrato-site e botões no WhatsApp conferidos.
- Rodrigo: "deixa ele com o maps já, não vou testar o grátis, é muito ruim". Escolheu guardar "só quem você chamou".
- prospects.js: busca do Google devolve a lista na hora (não grava no D1). Gravado só: quem ele chama no WhatsApp (POST /api/master/prospects/contacted → status enviado, com nome/telefone/cidade) e o código do lugar de quem "não serve" (tabela prospect_skips). "Não cheguei a mandar" apaga o contato. Quem já foi chamado ou recusado não volta nas buscas.
- Painel: sem chave mostra a caixa da chave aberta e o botão de busca desligado ("Falta ativar o Google Maps"). Caminho do mapa grátis removido do Master (continua só no Captador dos clientes). 345 testes ok.
- Google: falta completar R$ 120 de crédito para ativar; depois Places API (New) e chave.

## 2026-10-14 09h45–10h00 BRT — ajustes finais do robô (branch feat/robo-planos-contrato, não publicada)
- whatsapp-knowledge.js: robô manda o link https://flowarts.com.br/#pacotes quando perguntam preço; links das páginas de nicho como exemplo de site; contrato e Pix só pelo Rodrigo (quer fechar → needsHuman).
- public/contrato-site.html (noindex, fora do robots): contrato do site para o cliente ler/imprimir, igual ao doc, com o nome do responsável (Rodrigo Alexandre de Carvalho, do Cartão CNPJ) e a cláusula "concordância por escrito no WhatsApp vale como aceite" (nova, também no doc).
- Master → WhatsApp: botões "Planos e preços" e "Enviar contrato do site" preenchem a caixa de resposta; o Rodrigo confere e aperta Enviar (nada sai sozinho).
- Doc do contrato atualizado. 345 testes ok. Contrato ainda sem revisão de advogado/contador.

## 2026-10-14 09h22 BRT — robô do WhatsApp respondeu de verdade
- Prova: mensagem do Rodrigo 'OI, bom dia' (12:21:59 UTC) e resposta automática do Nexus (12:22:04 UTC, status sent_auto). Número +55 21 99855-9965, app Atendente Flow Arts, sem verificação da empresa (limite 250 conversas iniciadas pela empresa/24 h).
- O que destravou: Rodrigo gerou o token na tela da Meta 'Configuração da produção → Enviar mensagem'. Branch fix/whatsapp-versao-graph não publicada.

## 2026-10-14 08h40–09h20 BRT — Captador de clientes para clientes (9945723, publicado 08h50 com OK do Rodrigo)
- Conferido ao vivo: /api/master/captador/access 200 com 5 clientes, todos desligados; portal.html no ar com a aba Buscar e captador.js.
- Pedido do Rodrigo: vender ferramentas (automação do Instagram, site e o captador). Escolhas dele: cliente usa sozinho no portal; R$ 97/mês.
- Ideia anterior dele ("vender listas de leads quentes do Google") respondida: Google proíbe revender os dados; LGPD arriscada; lista não é lead quente. Sugerido vender a ferramenta/prospecção. Ele concordou.
- feat: cloudflare/src/captador.js. Tabela captador_leads (client_id + id), separada por cliente. Liberação por cliente (nexus_state captador/access). Config da mensagem do cliente (nome, empresa, oferta, "só sem site"); frase de "não receber" sempre no fim. 19 tipos de negócio (tags do OSM). Limite 10 buscas/dia por cliente. Busca: navegador do cliente acha a cidade no Nominatim → /api/portal/captador/plan (valida Brasil, guarda a busca por 15 min) → Overpass no navegador → /api/portal/captador/import. Redes/franquias fora.
- Portal: aba nova "Buscar" (public/captador.js); sem liberação mostra a oferta R$ 97/mês e botão para falar com a Flow Arts. Crédito "© colaboradores do OpenStreetMap".
- Master → Contatos: painel "Captador para clientes · Quem pode usar" com liga/desliga por cliente (GET/POST /api/master/captador/access).
- À venda: site (lista de pacotes + JSON-LD), páginas de nicho, robô do WhatsApp, doc "Planos e preços".
- test: captador.test.mjs (5 testes). 344 testes ok. Prints conferidos (portal celular/computador, oferta, Master).
- Conferido ao vivo no navegador: Nominatim OK (Recife). Overpass principal ainda 504 às 09h15 — RISCO: não vender antes de ver o mapa grátis funcionando por alguns dias.

## 2026-10-14 08h29–08h40 BRT — Google depois, contrato do site (branch feat/manutencao-site, não publicada)
- fix/cacador-osm-remark publicado (d8fa73c, deploy ok) com OK do Rodrigo.
- Decisão do Rodrigo: paga os R$ 150 do Google quando fechar o primeiro cliente.
- Manutenção do site depois do 1º ano: R$ 29/mês ou R$ 297/ano (sugestão minha, aprovada pelo Rodrigo: "pode sim").
- Doc novo "Contrato de criação de site Flow Arts" (Claude Docs, https://claude.ai/artifact/GNmuf47161iGKhmxgzXTF7): partes, serviço, R$ 497 (50% na assinatura, 50% na entrega — escolha minha, Rodrigo pode mudar), prazo de 5 dias contado do envio do material, 2 rodadas de ajustes, domínio no nome do cliente, 1º ano incluso, manutenção, aviso de 15 dias, cancelamento, LGPD, foro do Rio. Marcado para revisão de advogado/contador. Falta: nome do responsável da Flow Arts.
- Doc "Planos e preços" atualizado com a manutenção. whatsapp-knowledge.js: manutenção e "tem contrato".

## 2026-10-14 08h22–08h35 BRT — teste real da busca pelo navegador
- fix/cacador-osm-navegador publicado (6d8266d, deploy ok) com OK do Rodrigo.
- Teste no Master (Claude no Chrome do Rodrigo, sessão do Master): 3 buscas terminaram com "0 empresas novas", sem aviso de falha. Logo depois, o Overpass principal deu 504 até para uma consulta mínima, e o private.coffee não respondeu: serviço público fora do ar nesse horário. Hipótese: as 3 buscas voltaram 200 com lista vazia e aviso de erro (remark).
- Branch fix/cacador-osm-remark (não publicada): aviso de erro do Overpass conta como falha; o painel mostra quantos lugares vieram do mapa. 339 testes ok.
- Contador de buscas do dia chegou a 12 de 30 (várias foram tentativas que falharam).
- Próximo passo: publicar com OK; repetir a busca mais tarde, quando o Overpass voltar (testar em https://overpass-api.de/api/status).

## 2026-10-14 08h10–08h25 BRT — caçador OSM pelo navegador (branch fix/cacador-osm-navegador, não publicado)
- feat/cacador-osm publicado (e4b016e, deploy ok) com OK do Rodrigo. Teste real pelo Master: 3 buscas pelo Worker deram "osm_busy" (Overpass recusou/timeout vindo da Cloudflare). 0 contatos guardados.
- No navegador, o Overpass principal funcionou às 08h05 e deu 504 às 08h15–08h20 (status: 4 slots livres, ou seja, servidor sobrecarregado, não bloqueio). Espelhos private.coffee (timeout) e mail.ru (504) também falharam.
- fix: a busca grátis agora sai do navegador do Master: POST /api/master/prospects/plan (reserva buscas e devolve as consultas) → navegador consulta o Overpass com 3 tentativas por servidor → POST /api/master/prospects/import (servidor filtra e guarda). Google continua no servidor quando houver chave. 339 testes ok.
- Risco: o Overpass público fica sobrecarregado em alguns horários; nessas horas a busca falha e é preciso tentar mais tarde.

## 2026-10-14 07h43–08h15 BRT — Google recusado, caçador grátis (branch feat/cacador-osm, não publicado)
- Google Cloud (Rodrigo, guiado): projeto "Flow Arts Nexus" (flow-arts-nexus) criado na conta flowarts2027@gmail.com; conta de faturamento de teste criada com cartão. O Google exige pré-pagamento único de R$ 150 (vira crédito) para ativar. Rodrigo NÃO pagou (cancelou) e pediu opção grátis. Saldo R$ 0,00. Erro meu: antes eu tinha dito que não custaria nada.
- feat: prospects.js usa OpenStreetMap (Overpass API, overpass-api.de, grátis, sem chave) quando não há chave do Google; Google continua opcional. Filtros: nome, telefone, sem site próprio, sem marca/franquia (brand). Nota sem avaliações: celular, horário cadastrado, endereço, Instagram. Link "Ver no Maps" = busca no Google Maps para o Rodrigo conferir. Erro 429/5xx vira "servidor do mapa ocupado".
- Mensagem mais honesta: "Procurei vocês na internet e não encontrei um site."
- Teste real no navegador (08h05): Recife salões 30 no mapa, 4 com telefone, 3 sem site; São Paulo cafés 349, 38 com telefone, 15 sem site. Ou seja: poucos contatos por busca. overpass-api.de deu 504 uma vez e 200 depois.
- Painel: a chave do Google virou opcional (caixa fechada). 338 testes ok.

## 2026-10-14 07h30–07h40 BRT — branch fix/planos-robo (não publicado)
- Rodrigo: prazo de 5 dias; pediu para vender site também e para eu criar o preço.
- Novo pacote "Site do seu negócio": R$ 497, pagamento único. 1 página (fotos, serviços, horário, mapa, botão WhatsApp, feito para o Google). Pronto em até 5 dias. Hospedagem inclusa no 1º ano. Domínio .com.br por conta do cliente (~R$ 40/ano). Referência: landing page de freelancer no Brasil R$ 500–1.000 (metodoviral.com, 2026).
- site.html e site-visual.body.html: card do site depois do plano mensal; JSON-LD com a oferta. Páginas de nicho regeneradas com o pacote.
- whatsapp-knowledge.js: pacotes de R$ 197 e R$ 497; prazos iguais aos já publicados nas páginas de nicho (R$ 197 em até 2 dias; posts e logo em 24h; Reels e mensal em até 5 dias); removido o limite antigo "não vender resposta automática" (auto-responder funciona desde 2026-10-11).
- prospects.js: a primeira mensagem agora oferece site (e site + Instagram quando a empresa usa o Instagram como site).
- Doc "Planos e preços Flow Arts" atualizado (linha do site, resposta "Vocês fazem site?", prazos).
- test: consistência do preço do site no site, nichos e robô. 336 testes ok.
- Em aberto: preço da hospedagem a partir do 2º ano.

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

## 2026-10-16 — Site interativo (public/site.html)
- Pedido do Rodrigo: site "muito estático". Adicionadas animações em JS/CSS puros (sem biblioteca): título palavra a palavra, celular 3D com etiquetas, entrada ao rolar, barra de progresso, conversa com "digitando…" e botão de repetir, tilt nas portas, brilho nos pacotes, botão fixo de WhatsApp no celular.
- Respeita prefers-reduced-motion e saveData (site parado). Preços, links, JSON-LD e beacon intactos.
- Testado em Playwright (desktop e celular), sem erros de console. Publicado com o OK do Rodrigo. Verificar no ar após o deploy.
- Pendente: decidir manter/tirar "Instagram que responde sozinho (R$ 197)"; 9 páginas de nicho aguardam OK na branch feat/paginas-nicho-novas.

## 2026-10-16 — Texto "resposta automática" + vídeo de demonstração
- Pacote renomeado de "Instagram que responde sozinho" para "Instagram com resposta automática" (site, 3 páginas de nicho, metadados, gerador, whatsapp-knowledge). Descrição: resposta no direct quando alguém comenta a palavra combinada (ex.: QUERO). Decisão do Rodrigo: manter o pacote (R$ 197) como autoresponder.
- Novo vídeo public/video/instagram-responde.mp4 (+ .jpg), seção "Comentou? A resposta chega sozinha." no site, marcado "Demonstração ilustrativa".
- Ainda NÃO provado em produção: leitura de comentários + envio de DM. Não prometer prazo/garantia a clientes antes de testar.
- Pendente: 9 páginas de nicho (branch feat/paginas-nicho-novas) precisam da mesma troca de nome antes de publicar.

## 2026-10-16 — 9 páginas de nicho publicadas
- Merge de feat/paginas-nicho-novas (barbearia, academia, confeitaria, floricultura, loja de roupas, oficina, padaria, pet shop, restaurante) com o nome "Instagram com resposta automática". Sitemap e rodapé atualizados. 395 testes ok. Publicado com OK do Rodrigo.
- Próximo: Google Meu Negócio e Search Console (guiar o Rodrigo), lista de negócios para o Captador.

## 2026-10-16 (tarde) — Posts sem imagem no painel
- Rodrigo viu 2 posts "Esperando sua aprovação" com "A imagem está sendo criada" (Post 09:17 e Carrossel 19:00 de hoje). Sem acesso ao Master/D1 nesta sessão, a causa NÃO foi confirmada em produção.
- Hipótese: qualidade "high" (que eu tinha ligado por padrão hoje) estoura o timeout de 90 s da imagem. Ajuste: qualidade padrão volta a "medium" (provada em 11–13/10) e timeout de 150 s. `NEXUS_IMAGE_QUALITY` ainda sobrescreve.
- Observação de conteúdo: o Hook Lab troca a 1ª linha por ganchos genéricos (ex.: "Antes de postar, responda esta pergunta." no post sobre gravar vídeos); o gancho não combina com o corpo. Revisar.
- Próximo: confirmar no Master (erro em payload.mediaGeneration.lastError) se as imagens passaram a ser geradas.

## 2026-10-16 — Legendas fracas da Flow Arts
- Achado: já existe redator de IA (campaign-copy.js, writeCampaignCaption) para posts da campanha, mas o Hook Lab (regras fixas) trocava a 1ª linha por frases genéricas do BUSINESS_HOOKS, sem relação com o texto.
- Correção: Hook Lab não troca o gancho de marcas com perfil próprio (só corrige frase de filme). Redator ganhou 1 nova tentativa, prompt mais específico (cenas reais de pequeno comércio, sem frases genéricas) e `payload.captionSource` ("ai" | "template" | "ai-growth") para diagnóstico.
- Posts já criados continuam com o gancho antigo; o Rodrigo pode usar "Pedir ajuste" ou cancelar. Sem acesso ao Master: não confirmado em produção se o redator de IA falhou (captionSource dirá).

## 2026-10-16 — Variedade de nichos nos posts da Flow Arts
- Pedido do Rodrigo: posts só com padaria/café. Novo `flowarts-niches.js` (14 tipos: barbearia, salão, academia, pet shop, loja de roupas, oficina, restaurante, floricultura, confeitaria, clínica, lanchonete, loja de celular, papelaria, cafeteria). Cada post sorteia um tipo evitando os 5 últimos (`payload.nicheId`).
- O tipo entra no prompt da imagem ("Business setting ... mandatory", café/padaria só se for o sorteado) e no redator da legenda (exemplo principal). Carrossel e Reel herdam o mesmo `nicheId`. 397 testes.
- Posts já criados mantêm o tipo antigo. Verificar nos próximos posts se a variedade aparece.

## 2026-10-16 (tarde) — Posts sem imagem: causa achada (OpenAI sem saldo + aviso travado)
- Rodrigo: posts das 09:17 e 19:00 continuam sem arte ("sendo criada"). Lido no Master (agent-core): aiGrowth.error = openai_quota_exhausted às 15:46 UTC; /api/master/openai: saldo estimado ~US$ 0,47 (baseline 5,53; custo do mês 8,57). Posts com error=media_generation_required.
- Causa 1 (comprovada no código): o aviso "quota_exhausted" em openai_runtime_status só limpava com uma chamada bem-sucedida, mas com o aviso ligado nenhuma chamada saía (openai.js bloqueava antes). Travava para sempre, mesmo após recarga.
- Correção (commit local, SEM push ainda, aguardando OK do Rodrigo): o aviso expira em 15 min e deixa uma chamada de teste passar. Teste novo em openai-budget.test.mjs. 398 testes passando.
- Causa 2 (só o Rodrigo resolve): o saldo da OpenAI está quase zerado. Sem recarga, a imagem continua falhando. Não afirmado como 100% (o saldo é estimativa).
- PRÓXIMO: Rodrigo recarrega crédito em platform.openai.com; depois do deploy, conferir se os 2 posts ganham imagem (ou pedir ajuste de novo).
- 2026-10-16 (tarde, 2ª correção): deploy da 1ª correção (0909b5c) feito e conferido (Deploy success 15:57 UTC). Os 2 posts continuaram sem imagem. Leitura do Master: Creator sem recuperação ("nenhuma recuperação necessária"); post das 12:00 teve só a legenda atualizada às 16:00:55 UTC e nenhuma chamada de imagem. Hipótese (não comprovada, payload não aparece no Master): mediaGeneration.attempts >= 3, e o código do Creator (agent-runtime.js, ramo de post existente) não tenta de novo nem expira nesse caso.
- Correção (branch fix/post-sem-imagem-retoma, SEM push ainda): post não aprovado, sem imagem e com 3 tentativas gastas ganha mais 1 tentativa após 20 min, no máximo 2 vezes (campo mediaGeneration.resets). Reparo de post existente agora também passa o nicheId. 398 testes passando; sem teste novo para este trecho.
- Observação: a rodada */15 do cron não apareceu no Master entre 16:15 e 16:26 UTC (execução manual "creator" enfileirada 16:03 não registrada). Causa não investigada.

## 2026-10-16 (tarde) — Post das 12:00 sem imagem: loop de reprovação + auditoria dos agentes
- Rodrigo: 12:00 continuou sem imagem apesar do saldo e do "Pedir ajuste" duas vezes; reclamou do gasto (US$ 0,42 de US$ 10 em ~1 h; saldo é estimativa).
- Achado (comprovado no Master: /api/master/posts expõe o payload no topo do post): a imagem foi gerada, o Designer (revisor visual) deu nota 40 e mandou trocar (blockedDesignerQualityScore=40, todos os checks booleanos true, mediaGeneration.attempts=2). Vi a imagem reprovada: frase cortada no meio ("Se alguém abrir seu perfil por 3 segundos") em fundo escuro vazio. Ou seja, cada reprovação gera outra imagem e paga de novo, sem limite.
- Correção (branch fix/legenda-completa-trava-reprovacao, SEM push em main ainda): (1) brandHeadline usa frase completa e curta (de preferência pergunta) em vez de cortar no meio; (2) Designer grava motivo/notas da reprovação (blockedDesignerReviewReason/Scores) e conta designerRejections; com 3 reprovações o post expira (designer_rejected_exhausted) e para de gastar. 399 testes passando.
- Auditoria (só leitura): 19 agentes rodaram 4x na janela, todos success (SUPORTE warning, não investigado). Exigem aprovação do Rodrigo (autoPublish=false, approvalRequired=true). Problemas NÃO corrigidos: (a) Reel virou post de imagem desde 14/10, mas a legenda da IA ainda fala "Envie este vídeo" e o Copy Chief aprova; (b) Master mostra custo 0 por agente/imagem, sem custo real por imagem; (c) revisor visual olha só 1 imagem por rodada; (d) rodada do cron com atraso irregular, não investigada.
- PRÓXIMO: OK do Rodrigo para publicar a branch; depois conferir se o post das 12:00 ganha imagem aprovada pelo revisor.
- 2026-10-16 (tarde, 3ª correção, OK do Rodrigo "pode"): deploy da 2e1ae22 conferido (success). Post das 12:00: nova imagem (mesa de floricultura, headline "Faça este teste") reprovada só por margem do texto (notas 75/60/70/60 passam; legibleText=false); reprovação 1 de 3. Mudança: para marca com perfil próprio, se só a margem do texto falha e as notas passam, o revisor aprova com aviso (visualReview.warning=text_margin) e o painel do cliente mostra "Arte: confira se o texto da imagem está longe das bordas". Teste novo; 400 testes passando. Dúvida aberta: o modelo gerou "Faça este teste" sem o "agora" do prompt (texto da imagem diferente do pedido).

## 2026-10-16 (tarde) — Pausa de imagens + auditoria
- Rodrigo pediu pausa nas gerações de imagem até ajustar o problema e uma auditoria completa. Feito: Creator/Designer/Format Builder desligados em primeiro-teste e demo-cafe (17:44 UTC). Auditoria em AUDITORIA-NEXUS-2026-10-16.md.
- Branch fix/painel-so-aprova-revisado (SEM push em main): painel do cliente só libera Aprovar quando copyChief e designer estão "approved". 401 testes passando.
- PRÓXIMO: OK do Rodrigo para publicar a branch; decidir quando religar Creator/Designer/Format Builder.

## 2026-10-16 (tarde) — Publicado: estilo natural, legenda, custo, trava do painel
- Pedido do Rodrigo: imagens muito azuladas/artificiais. Agora foto realista com cores naturais; símbolo "F" pequeno embaixo, colocado por código (src/flow-mark.js). Testado só em fundo claro.
- Copy Chief reprova legenda com "vídeo/reel/assista" em post de imagem (erro copy_mentions_video_on_image).
- Custo ESTIMADO por imagem (NEXUS_IMAGE_COST_USD, padrão 0,06 — valor não confirmado) somado em mediaGeneration.costUsd e mostrado no Master.
- Painel do cliente: Aprovar só depois de copyChief e designer aprovados.
- 404 testes passando. Geração de imagens segue PAUSADA.
- PRÓXIMO: conferir o deploy; com OK do Rodrigo religar só o Designer e gerar 1 imagem de teste.

