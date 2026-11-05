# Regra fixa: clientes nunca publicam no mesmo minuto

Pedido do Rodrigo em 05/11/2026. Motivo: às 09:00 de 05/11 saíram 8 publicações juntas, e isso estoura o limite do Worker do Cloudflare.

## A regra
- Cada cliente é dono de um minuto dentro da hora. Vale para qualquer hora, não só 09, 12 e 19.
- O story sai 5 minutos depois do minuto do post do cliente.
- O horário só anda para frente, até 59 minutos. Exceção: se passar das 22h, volta uma hora.
- Post publicado ou com falha não muda. "Publicar agora" no painel também não muda.

| Cliente | Post | Story |
|---|---|---|
| `primeiro-teste` (Flow Arts) | :00 | :05 |
| `giltec` (Rose) | :10 | :15 |
| `nexus-ai` | :20 | :25 |
| `daniela-martins` | :30 | :35 |
| `maskara-assessoria` | :40 | :45 |
| `quatree-dog` | :50 | :55 |

Esses 6 clientes ocupam todos os degraus de 10 minutos, com post e story.
Clientes novos recebem sozinhos o próximo minuto livre entre eles: :02/:07, :12/:17 e assim por diante, depois :03, :04 e :01. Cabem 30 clientes.
A ordem é a de cadastro. O minuto fica guardado em `nexus_state` (`post-slots`) e nunca muda.

## Trava do publicador
- A publicação roda nos minutos terminados em 2 e 7. Por isso o post das 09:10 sai por volta de 09:12.
- No máximo 2 publicações por execução, uma de cada vez, de clientes diferentes.
- A segunda espera virar o minuto.
- Carrossel conta como 1, mas não divide a execução com outra publicação.
- A rodada de 15 minutos não publica.

## Falhas
- Toda falha gasta 1 de 3 tentativas, inclusive limite do Cloudflare ou da Meta.
- Falha por limite volta para a fila e encerra a execução. Depois da 3ª, o post fica como `failed`, sem ser apagado.
- Antes de repetir, o publicador procura a legenda no Instagram para não duplicar. Story não tem legenda, então essa conferência não vale para ele.

## Para quem mexe no código
- Código: `cloudflare/src/client-slots.js`, `publish-budget.js` e `publisher-round.js`.
- Todo caminho (Biblioteca, painel, conector MCP, agentes) grava o horário pedido. O alinhador acerta antes de cada rodada.
- Não criar outra regra de espaçamento. Os gatilhos de 20 minutos do PR #585 foram retirados porque desfaziam esta regra.
