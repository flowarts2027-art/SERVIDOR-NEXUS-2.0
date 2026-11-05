# Regra fixa: cliente nunca fica sem post

Pedido do Rodrigo em 05/11/2026. Vale para todos os clientes online.

## Vigia
- Roda nos minutos terminados em 4 e 9, sozinho na execução.
- Confere as próximas 6 horas, e os últimos 30 minutos para pegar erro em cima da hora.
- Conserta um post por rodada, no máximo 2 tentativas por post.
- Age em: `media_generation_required`, `format_build_failed`, `*_retry_limit_reached`, `format_mismatch` e imagem ausente.
- Não mexe em post rejeitado nem com correção pedida.

## Ordem de conserto
1. Usa a imagem original, se ela servir para o formato. Carrossel e Reels que não montaram viram post de uma imagem.
2. Gera imagem nova no Cloudflare Workers AI, sem API paga.
3. Usa arte do próprio cliente ainda não postada: Biblioteca, depois artes da campanha.
4. Sem saída: alerta vermelho no quadro "Postagens faltando".

## Imagem gerada
- A IA não escreve texto e não mostra produto ou embalagem de marca.
- O Nexus confere com a IA grátis se há texto e se há pessoa ou animal nas áreas do texto. Se houver, descarta.
- Título, botão e logo vêm da camada de texto do cliente, por cima da foto inteira.
- Quem não tem camada de texto não recebe imagem gerada. Hoje isso vale para a Nexus AI.

## Quem não recebe imagem gerada
- Daniela Martins: pedido do Rodrigo.
- Quatree Dog: toda peça precisa mostrar a embalagem oficial, e a IA inventaria o produto.

## Publicação
- A substituta fica no mesmo post, então mantém o horário e o minuto do cliente.
- Sai aprovada, sem esperar ninguém. Aparece no painel como "Substituída automaticamente".
- Legenda: a que o post já tinha ou a pronta do nicho.

## WhatsApp (pronto e desligado)
Liga com `NEXUS_AUTO_REPLACE_WHATSAPP="true"`. Manda um aviso único ao cliente. Se ele não responder, publica do mesmo jeito.
