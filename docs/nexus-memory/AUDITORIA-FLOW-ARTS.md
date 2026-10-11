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
