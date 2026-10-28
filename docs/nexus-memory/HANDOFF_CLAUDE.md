# Passagem de trabalho — Claude Code → ChatGPT

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
