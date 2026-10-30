# Auditoria do Instagram da Flow Arts (@flowarts2026) — 29/10/2026

Pedido do Rodrigo (29/10, 17h29): auditoria completa do que funciona e campanha de **30/10 em diante** já ajustada. Feita pelo Claude com dados do conector MCP do Nexus (métricas e agenda), do perfil aberto no navegador e desta memória.

**Esta regra vale a partir de 30/10 e tem prioridade sobre `REGRA_POSTS_DIARIOS.md`, `FORMATOS_POSTAGENS.md` (parte da Flow Arts) e `PLANO_CRESCIMENTO.md` onde houver conflito.** Quatree, GILTEC e Maskara não mudam.

## 1. Números (lidos em 29/10, 17h28, pelo Nexus)
| Item | Valor |
| --- | --- |
| Seguidores | **15** (eram 2 em 11/10) |
| Seguindo | 53 |
| Posts no perfil | 34 |
| Últimos 12 posts, somados | alcance **10**, visualizações 19, curtidas 1, comentários 0, salvos 0, compartilhamentos 0, **seguidores vindos de post 0** |
| Posts com alcance zero | **8 de 12** |
| Formatos dos últimos 12 | 10 imagens, 2 carrosséis, **0 Reels** |
| Agenda 29–30/10 | 28 itens: **6 aprovados, 22 recusados** |

## 2. O que funciona
- **Os seguidores crescem** (2 → 15 em 18 dias), mas **nenhum veio de post** (seguidores ganhos por post = 0). Vieram de contato direto e de seguir outros perfis.
- **O sistema de artes funciona:** texto por código, fonte forte, título em cima, botão embaixo. Cabe e fica legível (conferido em 29/10 com fotos de teste).
- Os 2 posts com mais alcance (3 pessoas cada) foram os de 25/10. Com números tão baixos, **não dá para dizer qual tema é melhor**. O problema é distribuição, não tema.

## 3. O que não funciona (em ordem de impacto)
1. **Zero Reels.** Com 15 seguidores, foto e carrossel só aparecem para quem já segue. O Reel é o formato que chega em quem não segue. A grade de 22/10 pedia Reel às 12h, mas não saiu nenhum.
2. **"Comente QUERO" não entrega nada ainda.** Quem comenta não recebe o direct (relato da GILTEC, 28/10). A correção está no **PR #454, aberto, sem merge**. Até o merge, todo QUERO é uma chance perdida.
3. **Público misturado.** Desde 23/10 o Rodrigo decidiu focar em **vendedores que precisam de clientes** (Captador como produto principal; Instagram como cartão de visita). Mas a campanha automática e as regras antigas ainda falavam com dono de comida, imobiliária, loja de material, cafeteria. Quem chega no perfil não entende para quem é.
4. **Fontes demais para o mesmo horário.** Em 29/10 chegaram 22 peças para 29/10 (campanha automática + ChatGPT + Enviar artes + Biblioteca) e 16 foram recusadas. Isso gasta o tempo do Rodrigo e confunde a grade.
5. **Perfil:** bio genérica ("marketing que vende, com IA"), link sem `?de=instagram`, **nenhum destaque**. Na arte de 29/10 aparecem número e empresas de exemplo ("147 empresas", nomes de lojas) sem aviso de que são ilustrativos — a regra proíbe número inventado.

## 4. Campanha a partir de 30/10 (o que muda)
**Público único:** vendedores externos e representantes comerciais (e quem vende para empresas). Oferta: o **Captador** (empresas do ramo e da cidade, só com WhatsApp, mensagem pronta). Segundo tema: o perfil como cartão de visita do vendedor.

**Quem faz o quê (uma fonte por horário):**
| Horário | Peça | Quem faz |
| --- | --- | --- |
| 09h | Carrossel de 5 cartões | **Campanha automática** (`nexus-campanha-diaria.yml`, 04h17) |
| 09h, 12h, 19h | 3 stories | **Campanha automática** |
| **12h** | **Reel 9:16, 8–15 s, sem rosto** | **ChatGPT** (único trabalho diário dele na Flow Arts) |
| 19h | Post com pergunta | **Campanha automática** |

- A campanha automática **não faz mais post às 12h** na Flow Arts: o horário fica livre para o Reel.
- Rodízio de 3 temas (já no `scripts/social/campanha/conteudo.json`): "Vendedor, pare de caçar cliente na mão" · "Representante comercial: carteira nova" · "Seu Instagram é o seu cartão de visita".
- **Não** subir arte da Flow Arts pela Biblioteca nem por Enviar artes enquanto este plano valer (evita peça dobrada).
- A regra antiga "1 post por dia com *App de agendar post não cria post*" **fica suspensa** na Flow Arts: era para dono de comida. Volta só se o Rodrigo pedir.
- CTA de tudo: **"Comente QUERO que eu te chamo no direct e mostro como funciona."** Não prometer teste grátis, lista grátis, quantidade de empresas nem prazo.

## 5. O Reel das 12h (ChatGPT)
- Pasta: `agendamentos/AAAA-MM-DD/1200/` na branch `agendamentos`, com `video.mp4`, `capa.jpg` e `legenda.txt`. Chegar até 10h.
- 9:16, 1080×1920, H.264, 30 fps, 8 a 15 s, com faixa de áudio (pode ser silenciosa). Receita com ffmpeg em `FORMATOS_POSTAGENS.md` §3.
- **Sem rosto do Rodrigo.** Ideias: tela de painel mostrando lista de empresas (dados de exemplo **com aviso "exemplo ilustrativo" na tela**), mãos no celular, carro na rua, mapa com pinos, antes/depois "procurando no Google" × "lista pronta".
- Estrutura: 1º segundo = gancho escrito grande ("Vendedor, para de procurar cliente no Google"); meio = 2–3 cenas; fim = "Comente QUERO".
- Cenas **inéditas**: não reaproveitar foto do carrossel, do post ou dos stories do mesmo dia.
- Legenda: 1ª linha com a palavra de busca (ex.: "Vendas externas: …"), 3 frases curtas, CTA QUERO, 3 a 5 hashtags do público (#VendasExternas #RepresentanteComercial #Prospeccao #Vendedor #FlowArts).
- Proibido: preço, número inventado, cliente ou depoimento inventado, promessa de vendas ou de seguidores.
- Se não conseguir fazer o vídeo até 10h, **deixe o horário vazio** e avise o Rodrigo. Não troque por foto.

## 6. Pendências que dependem do Rodrigo
1. Merge do **PR #454** (QUERO → direct). Sem ele o CTA não funciona.
2. Merge do PR desta auditoria **antes das 04h17 de 30/10**, para a campanha automática de amanhã já sair no público novo.
3. No Instagram (5 minutos): trocar a bio para falar com vendedor; link `flowarts.com.br/?de=instagram`; criar 2 destaques ("Captador", "Como funciona").

## 7. Como medir (o Claude confere pelo Nexus em 06/11)
- Alcance somado da semana e alcance dos Reels × posts.
- Seguidores ganhos por post (hoje 0).
- Comentários QUERO e directs enviados (depois do PR #454).
- Meta da 1ª semana (meta, não previsão): **um Reel por dia saindo** e **o primeiro seguidor vindo de post**.
