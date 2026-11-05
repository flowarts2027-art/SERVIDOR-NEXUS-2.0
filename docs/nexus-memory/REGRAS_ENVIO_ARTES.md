# Regras de envio de artes

Pedido do Rodrigo em 05/11/2026. Vale para todos os clientes e para ChatGPT, conector MCP, agentes e painéis.
**ChatGPT: leia antes de enviar.**

## Tamanhos

| Formato | Aceita | Tamanho |
|---|---|---|
| `story` | imagem ou vídeo | 9:16 (1080x1920) |
| `post` | 1 imagem | 4:5 (1080x1350) ou 1:1 (1080x1080) |
| `carrossel` | 2 a 5 imagens pelo conector, até 10 pelo painel | 4:5 ou 1:1, todas iguais |
| `reels` | vídeo | 9:16 (1080x1920) |

## Regras
- O campo `formato` é obrigatório no `nexus_enviar_arte`.
- O formato precisa bater com o tamanho. Se não bater, o Nexus recusa e nada é enviado.
- Imagem no tamanho certo não é alterada.
- O Nexus nunca corta, encolhe ou põe margem sozinho.
- A arte precisa ocupar a tela toda. Não mande faixa lisa em cima e embaixo para completar o tamanho.
- Crie a arte já no tamanho do formato. Uma arte 4:5 não vira story.

## Carrossel
- Todas as páginas juntas, numa chamada só, na ordem. Elas ficam no mesmo id.
- Nunca mande uma página por vez.
- Todas as páginas têm o mesmo tamanho.

## Texto por cima
- Foto sem texto: nada de moldura, margem ou faixa de cor. A foto ocupa a tela toda.
- O Nexus pode escrever título, logo e botão por cima, sem cortar nada, em foto 4:5 ou 9:16.
- Foto 1:1 fica como veio.
- Exceção: Daniela Martins não recebe nada escrito.

## Exemplos certos
- `formato=story` com imagem 1080x1920 que ocupa a tela toda.
- `formato=post` com imagem 1080x1350 ou 1080x1080.
- `formato=carrossel` com 4 imagens 1080x1350, na ordem, na mesma chamada.
- `formato=reels` com vídeo MP4 em pé, 1080x1920.

## Exemplos errados
- Imagem 1080x1920 com `formato=post`: recusada. Use `story`.
- Imagem 1080x1350 com `formato=story`: recusada. Use `post`.
- Imagem 1024x1536: recusada. Não serve para nenhum formato.
- Carrossel com uma página 1080x1350 e outra 1080x1080: recusado.
- Arte 4:5 colada no meio de um fundo azul 1080x1920: o tamanho passa, mas fica pequena e com margens. Não faça.
- Vídeo deitado: recusado.

## Por que existe
- Quatree Dog, 29/10: uma arte 4:5 foi enviada como story. O código antigo cortou os lados e o texto saiu pela metade.
- GILTEC, novembro: stories chegaram com faixas azuis lisas em cima e embaixo, já na arte enviada.
