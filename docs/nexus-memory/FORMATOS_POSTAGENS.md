# Grade de formatos — Flow Arts e Quatree Dog (decisão do Rodrigo, 22/10/2026)

**Pedido do Rodrigo (22/10, 22h59):** postar carrossel, stories, feed e Reels nos dois perfis, com mais postagens por dia quando for preciso.
**Vale a partir de 23/10/2026**, até o Rodrigo mudar. Nada é publicado sem aprovação no painel.
Quem cria: o ChatGPT (plano do Rodrigo). Como envia: pasta `agendamentos/` (ver `agendamentos/README.md`). Qualquer horário `HHMM` funciona.

## 1. Flow Arts (@flowarts2026) — 5 por dia
| Horário | Formato | Pasta | Função |
| --- | --- | --- | --- |
| 09:00 | **Carrossel** (5 a 7 cartões, 4:5) | `agendamentos/AAAA-MM-DD/0900/` → `01.jpg…` + `legenda.txt` | Ser salvo (passo a passo, checklist) |
| 10:30 | **Story** (9:16) | `.../1030/` → `story.jpg` | Bastidor ou tema do dia + "responda no direct" |
| 12:00 | **Reel** (9:16, 8 a 15 s) | `.../1200/` → `video.mp4` + `capa.jpg` + `legenda.txt` | Ser descoberto (antes e depois, prova) |
| 16:00 | **Story** (9:16) | `.../1600/` → `story.jpg` | Chamada: "3 posts grátis: comente QUERO no post de hoje" |
| 19:00 | **Feed de 1 imagem** (4:5) | `.../1900/` → `imagem.jpg` + `legenda.txt` | Conversa (pergunta) |

- **Além disso, o Nexus publica sozinho** a 1ª imagem do carrossel das 09h e o post das 19h também como story. Não precisa fazer esses.
- A regra "1 post por dia com *App de agendar post não cria post*" continua: vale para um dos 3 do feed (09h, 12h ou 19h).
- Tudo do `REGRA_POSTS_DIARIOS.md` continua valendo (público de comida, sem preço, sem azul, título na metade de cima, QUERO no fim).

## 2. Quatree Dog (@ericsson_quatree) — 2 a 3 por dia
Pasta: `agendamentos/clientes/quatree-dog/AAAA-MM-DD/HHMM/`. Base: banners e fotos do cliente (`CAMPANHA_QUATREE_30D.md`).
| Horário | Dias | Formato | Função |
| --- | --- | --- | --- |
| 09:00 | todos | **Feed**: seg, qua e sex **carrossel**; ter, qui, sáb e dom **1 imagem** (segue o calendário da campanha) | Produto, ajuda ao lojista, confiança, revenda |
| 12:00 | ter, qui e sáb | **Reel** (9:16, 8 a 15 s) feito com os banners do cliente | Ser descoberto por lojistas da região |
| 18:00 | todos | **Story** (9:16) | Bastidor, produto chegando, "peça a tabela no direct" |

- Toda legenda do feed e do Reel termina com a palavra **TABELA** (aciona a resposta automática com o botão do WhatsApp). Story não tem legenda.
- Dias de Reel do calendário da campanha (dias 4 e 11) passam a ser às 12h.

## 3. Como fazer cada formato
**Carrossel e feed:** 4:5, 1080×1350, JPG. Igual ao `REGRA_POSTS_DIARIOS.md`.

**Story (`story.jpg`):** 9:16, 1080×1920.
- Texto no meio da tela: nada nos 14% de cima nem nos 20% de baixo (ficam atrás dos botões do Instagram).
- **Sem enquete, caixinha ou link clicável:** o envio automático não permite figurinhas. Peça "responda no direct" ou "comente QUERO (ou TABELA) no post de hoje".

**Reel (`video.mp4` + `capa.jpg`):** 9:16, 1080×1920, MP4 (H.264), 30 quadros por segundo, de 8 a 15 segundos, até 95 MB.
- 3 a 5 cenas de 2 a 3 segundos, com zoom lento em cada imagem. Título na metade de cima; nada nos 20% de baixo nem na faixa da direita (botões do Instagram).
- Inclua uma faixa de áudio silenciosa (alguns envios recusam vídeo sem áudio). Música não dá para pôr pelo envio automático.
- `capa.jpg` = a 1ª cena, 1080×1920.
- Exemplo com ffmpeg (4 imagens `c1.jpg`…`c4.jpg` em 1080×1920, 3 s cada):
  ```
  ffmpeg -loop 1 -t 3 -i c1.jpg -loop 1 -t 3 -i c2.jpg -loop 1 -t 3 -i c3.jpg -loop 1 -t 3 -i c4.jpg \
    -f lavfi -t 12 -i anullsrc=r=44100:cl=stereo \
    -filter_complex "[0:v]zoompan=z='min(zoom+0.0008,1.08)':d=90:s=1080x1920:fps=30[v0];[1:v]zoompan=z='min(zoom+0.0008,1.08)':d=90:s=1080x1920:fps=30[v1];[2:v]zoompan=z='min(zoom+0.0008,1.08)':d=90:s=1080x1920:fps=30[v2];[3:v]zoompan=z='min(zoom+0.0008,1.08)':d=90:s=1080x1920:fps=30[v3];[v0][v1][v2][v3]concat=n=4:v=1:a=0,format=yuv420p[v]" \
    -map "[v]" -map 4:a -c:v libx264 -c:a aac -shortest -movflags +faststart video.mp4
  ```
- Legenda do Reel: começa com "Dá o play…" ou com o gancho, igual às outras regras.

## 4. Conferir antes de salvar
- [ ] Horário certo na pasta e pelo menos 10 minutos antes da hora.
- [ ] Formato e tamanho certos (4:5 no feed; 9:16 no Reel e no story).
- [ ] Nada importante nos 20% de baixo.
- [ ] Legenda com QUERO (Flow Arts) ou TABELA (Quatree); story sem legenda.
- [ ] Sem preço, sem número ou depoimento inventado.
