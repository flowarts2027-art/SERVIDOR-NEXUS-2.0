# Regras do Master: nome do painel e postagens faltando

Pedido do Rodrigo em 05/11/2026.

## Regra 1: nome do painel
- O lápis ao lado do nome, em Clientes, troca só o nome que aparece.
- O id do cliente nunca muda. Agenda, postagens, minuto de publicação e Instagram dependem dele.
- O nome novo fica em `config.displayName`. `clients.name` não muda, porque alimenta marca e legendas.
- O nome novo vale no Master, no painel do cliente, nos grupos e no conector MCP.
- Código: `cloudflare/src/client-name.js` e `client-display.js`.

## Regra 2: quadro "Postagens faltando"
- Entra só cliente online. Arquivados, setup e o demo não entram.
- Confere hoje, amanhã e depois, contra o plano de 2 posts + 2 stories por dia.
- Publicado ou no caminho conta. Postagem com problema não conta, porque não vai sair.
- Problemas mostrados: sem imagem, erro de montagem, falhou 3 vezes, correção pedida e esperando aprovação há mais de 12 horas.
- Ordem: hoje em vermelho piscando, amanhã em laranja, depois em amarelo.
- O sino no topo mostra quantos clientes estão no quadro.
- O quadro é calculado a cada leitura e atualiza de minuto em minuto. Quem completa sai sozinho.
- Código: `cloudflare/src/missing-posts.js`.

## Aviso por WhatsApp
- Pronto e DESLIGADO. Liga com `NEXUS_MISSING_POSTS_WHATSAPP="true"` no `wrangler.jsonc`.
- Uma única mensagem por dia, a partir das 8h, para o número comercial da Flow Arts.
- Só ligar depois de a Meta liberar. Fora da janela de 24 horas a Meta exige modelo aprovado, e hoje a mensagem sai como texto comum.
