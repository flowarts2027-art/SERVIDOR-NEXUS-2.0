# Auditoria do Instagram @flowarts2026 — 2026-10-21 (Claude, perfil público sem login, só leitura)

## Números (perfil público, 21/10 ~07h40 BRT)
- 9 seguidores, segue 28. Eram 3 em 16/10: +6 em 5 dias, sem saber se são clientes reais.
- 12 posts de 13/10 a 20/10 (6 fotos e 6 vídeos/Reels). **Soma: 1 curtida e 2 comentários** (os 2 são teste do QUERO, em 15/10). 11 dos 12 posts têm 0 curtida.
- Visualizações, alcance, % de não seguidores, envios e salvamentos **não foram lidos**: ficam nos Insights e exigem o login do Rodrigo.

## Por que não cresce (diagnóstico)
1. **Distribuição quase zero.** Com 9 seguidores, o Instagram mostra cada post para pouquíssima gente. Nenhum post teve curtida nem dos próprios seguidores, então eles provavelmente não são o público certo.
2. **Todo post é anúncio.** Desde 16/10 quase tudo repete "Você cuida do [negócio]. A Flow cuida do seu Instagram." Quem não conhece a marca não tem motivo para curtir, salvar ou enviar um anúncio.
3. **Público muda a cada post.** Pizzaria, pet shop, estética automotiva, confeitaria e bar em 5 dias, com hashtags de cada nicho (#EsteticaAutomotiva). O Instagram não entende para quem mostrar a conta, e quem chega por um nicho não vê o próximo post como sendo para ele.
4. **Visual contra a regra da marca.** Robôs, neon e tom azul forte (proibidos em `client-brand.js` desde 16/10) e títulos com fontes e posições diferentes. A grade parece genérica de IA, o que tira confiança de quem vende marketing.
5. **Nada de prova.** Nenhum post mostra o produto funcionando (painel aprovando, QUERO → direct → guia, antes/depois real).
6. **Pouco do que o algoritmo premia:** carrossel útil para salvar, Reel de vídeo real com gancho no 1º segundo e conteúdo que dá vontade de mandar para alguém.

# Auditoria do Instagram @flowarts2026 — 2026-10-16 (feita direto no Chrome do Rodrigo, só leitura)

## Números (Insights, 30 dias)
- 9 posts, 3 seguidores, segue 12. 66 visualizações, 14 visualizadores; 68% das visualizações são de seguidores (as contas de teste), 32% de não seguidores. Reels 60% das visualizações, posts 40%.
- 33 interações, vindas de 3 contas. Quase tudo é teste do próprio Rodrigo.
- Mais vistos: Reel de 13/10 "Em 3 segundos…" (14), foto da persona no escritório de 11/10 (10), persona com logo de 28/09 (10). Mais interações: persona no escritório (13), dupla no escritório com o Pão de Açúcar ao fundo (8), persona com logo (6). Os cartões com título de 15/10 tiveram 2.
- Amostra minúscula: a conta não tem público real ainda, então isto indica tendência, não regra.

## O que já melhorou desde 15/10
- Nome "Flow Arts - Marketing Digital", avatar com o logo, bio com a oferta e link flowarts.com.br.

## Problemas vistos no perfil
1. Grade sem identidade: mistura de fotos da persona, cartões com título em fontes e posições diferentes e imagens de padaria. Quem entra não entende em 3 segundos o que é a Flow Arts.
2. Títulos cortados na grade: "O post que vende começa pelo problema, não pelo…" e "Todo mundo reclama disso…" aparecem cortados no topo do cartão na grade.
3. Pouca prova: nada mostra resultado, cliente, antes/depois ou o produto funcionando.
4. Sem Stories, sem destaques, sem pin.
5. O problema principal continua sendo distribuição, não a imagem: 3 seguidores quase não recebem alcance.

## Plano (por ordem de impacto)
1. Ação manual diária de 30 min: comentar de verdade em 10 perfis de pequenos negócios do Rio; responder tudo; mandar o Reel por direct para contatos.
2. Parceria: oferecer um exemplo grátis a 5 negócios locais em troca de post em colaboração (aparece para os seguidores deles).
3. Stories 3x/dia com enquete/caixa de pergunta (o Nexus pode sugerir, o Rodrigo posta).
4. Reels de prova (tela do QUERO→direct→guia, painel aprovando, antes/depois do Café Brisa).
5. Grade consistente: estilos novos (flowarts-styles.js) com título dentro da área segura; fixar (pin) os 3 melhores.
6. Anúncio de WhatsApp R$ 10–20/dia por 7 dias (só com OK do Rodrigo).

---

# Auditoria do Instagram @flowarts2026 — 2026-10-15 (prints do Rodrigo às 21h07–21h08)

## Números reais (Insights, 30 dias)
- 9 posts, 3 seguidores, segue 12. 59 visualizações no total e 14 contas alcançadas. 64% das visualizações são de seguidores, ou seja, das contas de teste do Rodrigo.
- Por post: de 1 a 14 visualizações. Curtidas entre 0 e 1. Os comentários (8, 12, 2) são testes do QUERO.
- Stories: 0. Ao vivo: 0. Seguidores ganhos: nenhum.

## Diagnóstico (sem rodeio)
1. **O Nexus posta, mas postar não traz público.** Uma conta com 3 seguidores quase não é mostrada pelo Instagram. O problema não é a automação, é a distribuição: ninguém está levando gente para o perfil.
2. **Perfil passa pouca confiança para quem vende marketing:** nome "Marina" (persona de IA), selo "Perfil gerado por IA", link da bio ainda servidor-nexus.diamantehinode2015.workers.dev (deveria ser flowarts.com.br), sem destaques.
3. **Conteúdo genérico e voltado para si.** São dicas soltas ("Hashtags locais", "Tráfego pago") e imagens de IA de padaria e escritório. Nada mostra o produto funcionando: o direct automático, o painel aprovando, o antes e depois de um cliente.
4. **Erros técnicos que derrubaram a qualidade:** Reels de foto com zoom e frases cortadas ("azem um estranho para de rolar…"). Corrigido em 9ab49a4 (15/10 21h03); conferir nos próximos posts.
5. Zero Stories. O Stories é onde quem já segue vê a marca todo dia.

## Ordens para os agentes (CEO, Marketing, Vendas; o Revisor confere)
1. **CEO:** prioridade nº 1 da semana = trazer as primeiras 100 pessoas reais ao perfil, não produzir mais posts. Medida: seguidores reais por dia.
2. **Marketing:** trocar metade dos posts de dica por **prova**: (a) o QUERO → direct → guia funcionando (gravação de tela); (b) o painel aprovando um post; (c) o Café Brisa antes e depois; (d) os 3 brindes (QUERO, SITE, REELS). Ganchos curtos que caibam inteiros na arte.
3. **Marketing:** Stories todo dia, 3 por dia, e repostar cada post novo no Stories. Criar os destaques "Como funciona", "Exemplos" e "Preços".
4. **Vendas:** 20 minutos por dia comentando de verdade em perfis de negócios locais (cafés, salões, pet shops) e convidando para o brinde. Mandar o perfil para os contatos do WhatsApp do Rodrigo.
5. **Tráfego pago:** rodar o anúncio de WhatsApp já pronto (R$ 10–20 por dia, 7 dias) assim que o Rodrigo liberar. Sem isso, o crescimento será muito lento.
6. **Perfil (o Rodrigo faz, 5 minutos):** link da bio = flowarts.com.br. Decidir nome e foto: logo da Flow Arts ou foto real, no lugar da persona de IA.

## Estudo do algoritmo (15/10, fontes: posteverywhere.ai, socialync.io, blckalpaca.at, publer.com)
- Reels é onde quem NÃO segue descobre a conta. O que mais pesa é o tempo assistido (primeiros 3 s) e depois os envios por direct ("sends per reach"), que valem de 3 a 5 vezes mais que curtidas para alcançar quem não segue. Duração ideal de 15 a 60 s, em 1080x1920.
- No feed, o que conta é o relacionamento (quem já segue). Carrossel tem mais recomendação e mais salvamentos que foto única.
- Originalidade: conteúdo repetido ou de agregador perde alcance. De 3 a 5 hashtags (servem para categorizar, não para crescer). Palavras-chave na legenda ajudam a busca.
- Stories: relacionamento; de 5 a 7 por dia é o teto útil.
- Trial Reels (mostrar só para quem não segue) exige mais de 1.000 seguidores. Ainda não serve para nós.
- Rodrigo (21h14): vai trocar o perfil para Flow Arts, tirar a Marina e o rótulo de IA do perfil. Observação: imagens realistas de IA podem continuar recebendo o "Info de IA" automático do Instagram nos posts. Isso é normal.

## Mudanças no Nexus propostas (ainda não feitas; precisam de OK)
- **Reels de animação de verdade, automáticos** (texto em movimento + telas do produto, 8–15 s, gancho no 1º segundo, feitos com Chromium/FFmpeg no GitHub Actions), 3–4 por semana. Substituem o Reel de foto com zoom (proibido).
- Carrosséis feitos para salvar e enviar (checklists, "mande para quem tem um negócio").
- Legenda com palavras-chave de busca (marketing para pequenos negócios, automação de Instagram, Rio).
- 1 post por dia de mais qualidade, em vez de 2.
- Stories automáticos (repostar o post do dia).
- Campanha da Flow Arts com 50% de posts de prova e demonstração em vez de dicas.
- Limite de tamanho do gancho na arte, para a frase nunca ser cortada.
- Sugestão diária de Stories no painel (o Rodrigo posta com um toque).

---

# Auditoria do Instagram @flowarts2026 — 2026-10-10

Feita olhando o perfil no navegador (somente leitura). Sem métricas internas: a conta é nova.

## O que existe
- Nome exibido: **Marina** · categoria **Agência de marketing** · "Perfil gerado por IA".
- Bio: sites, fotos e vídeos com IA para o seu negócio · Rio de Janeiro e região · marca criada e operada com IA · "Peça seu exemplo grátis".
- 2 posts (1 Reel + 1 foto), 2 seguidores, segue 1. Sem destaques.
- Visual: persona Marina (mulher de cabelo cacheado escuro, blazer azul-marinho), logo FLOW ARTS prateado/azul, fundos de escritório e azul elétrico.

## Diagnóstico
1. Conta em fase zero: métricas de alcance/engajamento ainda não servem para decidir nada. Radar/Analista não têm dados úteis.
2. Oferta clara na bio (sites, fotos e vídeos com IA para pequenos negócios do Rio) — os posts devem repetir essa oferta.
3. CTA da bio é "Peça seu exemplo grátis"; o CTA padrão do Nexus ("QUERO") não combinava.
4. A transparência sobre IA é um ponto forte; manter nos textos.
5. Prioridade de crescimento: Reels de descoberta, hashtags locais, frequência constante, destaques com exemplos.

## O que foi repassado aos agentes (cloudflare/src/client-brand.js, profileVersion 2026-10-11c)
- Nicho "Agência de marketing e automação com IA" (profileVersion 2026-10-11d, após nova bio do proprietário); público pequenos negócios do Rio de Janeiro; oferta marketing + automação de Instagram 24h + sites/fotos/vídeos com IA.
- CTA: Comente "EXEMPLO" e receba um exemplo grátis.
- Hashtags com #RioDeJaneiro e #InteligenciaArtificial.
- 12 temas e 8 ganchos próprios; direção visual com a paleta azul-marinho/azul elétrico/prata e a persona do perfil.

## Sugestões para o proprietário (fora do código)
- Criar destaques: "Exemplos", "Como funciona", "Preços".
- Colocar link (WhatsApp ou site) na bio.
- Publicar Reels próprios com exemplos reais de trabalho.

## Campanha de 30 dias (2026-10-10, `cloudflare/src/flowarts-campaign.js`)
- 60 peças, 2 por dia (12:00 e 19:00): 26 Reels, 20 carrosséis, 14 posts.
- Semana 1 apresentação · semana 2 educação · semana 3 prova (exemplos marcados como ilustrativos) · semana 4 conversão (CTA EXEMPLO) · dias 29–30 resumo.
- Estrategista usa `flowArtsCampaignForDay` para `primeiro-teste`; Creator recebe formato, tema, gancho, ângulo, objetivo e CTA.
- Carrossel com plano próprio (PASSO 1, PASSO 2, SALVE/COMENTE EXEMPLO), sem textos de streaming.
- Reels: render via GitHub Actions do repositório novo (`flowarts2027-art/SERVIDOR-NEXUS-2.0`). Sem `GITHUB_ACTIONS_TOKEN` no Worker, o Reel vira post de imagem automaticamente.

## O que falta para alimentar os agentes (depende do proprietário)
1. Token do GitHub (`GITHUB_ACTIONS_TOKEN`) como secret do Worker na Cloudflare, para liberar os Reels animados.
2. Link do WhatsApp na bio.
3. Exemplos reais de trabalho (fotos, vídeos, prints) para substituir os exemplos ilustrativos.
4. Definir pacotes e preços (a campanha não inventa valores).
5. Orçamento de OpenAI: cerca de 140 imagens/mês (60 peças + 3 cartões extras por carrossel). Limite diário atual de tokens pode atrasar peças.
6. Vídeos próprios (como o de automação enviado em 2026-10-10) postados manualmente pelo proprietário, 1–2 por semana.
