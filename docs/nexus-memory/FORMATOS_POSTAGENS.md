# Grade de formatos — Flow Arts e Quatree Dog

**Decisão direta de Rodrigo, 22/10/2026, após a grade anterior:** cada perfil recebe **3 stories exclusivos por dia, às 09h, 12h e 19h (Brasília)**, a partir de 23/10. Esta decisão substitui os stories das 10h30/16h da Flow Arts e das 18h da Quatree.

## Regra prioritária: nenhuma imagem repetida
- **Nunca reutilizar uma mesma imagem entre feed, carrossel, story ou Reel**, inclusive mudando só o corte, proporção, texto ou fundo.
- Cada cartão do carrossel tem uma cena própria. Cada story tem uma cena própria. O Reel usa cenas próprias que não foram usadas em outro post.
- Produto e identidade podem permanecer; a fotografia, cena e composição precisam ser inéditas. Comparar visualmente e por hashes antes do envio.
- Não repetir a arte do gato da Quatree: manter a arte do feed somente no feed; carrossel e stories usam outras cenas.
- **Desativar o espelhamento automático de feed/carrossel em stories** (`NEXUS_AUTO_STORY="false"`). Stories passam a ser conteúdos explícitos, exclusivos, enviados ao painel para aprovação.
- A capa de um Reel é a prévia técnica do próprio vídeo, não uma nova postagem; não usar essa imagem em outro conteúdo.
- Nada é publicado nem aprovado pelo assistente. O usuário aprova no painel.

- Variar a cena no dia e na semana: não usar a mesma comida em mais de 2 artes por dia (pão, bolo, pizza, lanche, salgado, café, fachada, balcão, mãos do dono, cardápio, celular).
- Quatree: **toda peça mostra a embalagem Quatree** (diretriz de venda, 23/10: `QUATREE_DIRETRIZ_VENDAS.md`). A embalagem pode aparecer em todas as artes; a imagem/cena não pode repetir. Carrossel nunca reaproveita imagens do feed.
- Antes de salvar, compare com as artes dos últimos 7 dias do mesmo perfil.
- **O GitHub recusa imagem idêntica** (`agendar-pasta.sh`, desde 23/10): se o Actions mostrar "imagem repetida", crie uma arte nova para aquela pasta.

## 1. Flow Arts (@flowarts2026) — 6 conteúdos por dia
> **Desde 30/10/2026:** ver `AUDITORIA_INSTAGRAM_FLOWARTS_2026-10-29.md`. Mesma grade, mas o público é vendedor/representante, e só o Reel das 12h é do ChatGPT; o resto sai pela campanha automática.

| Horário | Formato | Pasta | Função |
| --- | --- | --- | --- |
| 09:00 | Carrossel, 5–7 cartões 4:5 | `agendamentos/AAAA-MM-DD/0900/` | Conteúdo útil para salvar |
| 09:00 | Story exclusivo 9:16 | `.../0900-story/story.jpg` | Abrir o tema do dia |
| 12:00 | Reel, 9:16, 8–15s | `.../1200/` | Descoberta; cenas inéditas |
| 12:00 | Story exclusivo 9:16 | `.../1200-story/story.jpg` | Oferta e conversa |
| 19:00 | Feed de uma imagem, 4:5 | `.../1900/` | Pergunta/conversa |
| 19:00 | Story exclusivo 9:16 | `.../1900-story/story.jpg` | Aprovação, rotina ou convite |

Público de comida local; sem preço, sem azul/neon/robôs; CTA **QUERO**, oferta **3 posts grátis**. Uma das peças do feed mantém “App de agendar post não cria post”.
- O Nexus não repete mais o post como story: o story automático está desligado no código (só liga com `NEXUS_AUTO_STORY="true"`).

## 2. Quatree Dog (@ericsson_quatree)
**Antes de criar, leia `QUATREE_DIRETRIZ_VENDAS.md`: o objetivo é VENDER. Toda peça (feed, cartão, story, Reel) mostra produto Quatree.**
Base: materiais corretos do cliente e cenas novas; seguir `CAMPANHA_QUATREE_30D.md`.
| Horário | Dias | Formato |
| --- | --- | --- |
| 09:00 | Todos | Feed: carrossel seg/qua/sex; imagem nos outros dias |
| 09:00 | Todos | Story exclusivo, `agendamentos/clientes/quatree-dog/AAAA-MM-DD/0900-story/story.jpg` |
| 12:00 | Ter/qui/sáb | Reel com cenas próprias |
| 12:00 | Todos | Story exclusivo, `.../1200-story/story.jpg` |
| 19:00 | Todos | Story exclusivo, `.../1900-story/story.jpg` |

Toda legenda Quatree termina, antes das hashtags, com **Comente TABELA que eu te mando a tabela de revenda no direct 📩**. Story usa “Comente TABELA no post de hoje” ou “Responda TABELA”, sem legenda. A programação excepcional de 23/10 mantém os três feeds e carrossel 15h solicitados, com imagens diferentes nos sete conteúdos.

**Envio simultâneo feed + story:** usar a pasta `HHMM-story` para o story e `HHMM` para feed/Reel/carrossel. A ingestão deve diferenciar os formatos ao evitar duplicatas. Só declarar suporte após o envio ser validado.

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
