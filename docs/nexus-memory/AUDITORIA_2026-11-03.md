# Auditoria Nexus — 03/11/2026 (Claude, pedido do Rodrigo via repasse do ChatGPT)

Só fatos conferidos nesta sessão. O que não foi conferido está marcado como pendente.

## 1. Logo e identidade
- Master e login do cliente usam `/assets/nexus-mark-green.png`. **O arquivo não fica no repositório**: é gerado no deploy por `scripts/generate_nexus_green.py` a partir de `public/assets/nexus-mark-metal-blue.png`. O deploy de 03/11 às 22h21 (BRT) terminou com sucesso, então a logo verde foi gerada.
- Dentro do painel do cliente continua a logo azul oficial (`nexus-logo-azul-oficial.webp`). Tema próprio da Daniela preservado.
- Atenção: quem rodar o Worker sem o deploy (ex.: `wrangler dev`) verá a imagem quebrada até rodar o script.

## 2. Radar (mudança de 03/11, commit 5f54fc3)
- Ganhou o cartão "Conexão do Instagram" na aba Radar (só Flow Arts).
- **Problema achado e corrigido:** a volta da conexão do Instagram passou a mandar TODOS os clientes para `?tab=radar`. Agora só a Flow Arts volta para o Radar (`instagramReturnPath` em portal.js); os outros voltam para Conta, como antes.
- Captação de leads continua sem promoção: as campanhas da Flow Arts foram reescritas sem Captador/leads.

## 3. Números do Instagram (conector Nexus, 03/11 ~22h40, últimos 12 posts)
| Cliente | Seguidores | Alcance | Visualizações | Curtidas | Coment. |
|---|---|---|---|---|---|
| Flow Arts @flowarts2026 | 21 | 10 | 22 | 0 | 0 |
| GILTEC @rose.giltec3 | 1 | 5 | 13 | 5 | 0 |
| Quatree @ericsson_quatree | 399 | 58 | 136 | 17 | 2 |
| Daniela @daniela_martins1547 | 1348 | 226 | 407 | 23 | 4 |
| Maskara @maskara.silva | 674 | 215 | 406 | 21 | 2 |

O que os números mostram (sem concluir penalização):
- **Alcance 0 com curtidas > 0** acontece em todos os clientes, sempre nos posts mais antigos (até ~02/11 manhã). Posts recentes têm alcance. Parece limite de leitura das métricas por post (Meta / janela do insights), não post escondido. Pendente: conferir em `insights.js` até quantos dias as métricas de cada post são relidas.
- GILTEC tem **1 seguidor**: quase nenhum alcance é esperado. Precisa de seguidores antes de medir horário.
- Flow Arts com 21 seguidores: alcance baixo é esperado. Hoje (03/11) ainda saíram posts falando de "Radar de Leads" e "organização de leads" (legendas de outros agentes); a campanha diária já foi reescrita, mas quem cria fora dela (ChatGPT/Manus) precisa seguir o "Novo foco da Flow Arts" em `SISTEMATICA_IMAGENS_CHATGPT.md`: só automação do Instagram.
- Daniela e Maskara: alcance ~30 a 45 por post com ~0 comentário. Ganho de seguidores zero.

## 4. Pendente (não feito nesta sessão)
- Teste de horários 12h–14h e 18h–21h por cliente, medindo 24 h/72 h.
- Relatório diário automático por cliente (Maestro/DOTs).
- Contas em "setup" sem Instagram: Giltec Locações (sheilavendas3), Jbtv, Luciana Carvalho, Nexus AI, Trevo Cosméticos.
