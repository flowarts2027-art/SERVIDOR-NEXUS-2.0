# Pedir ajuste no painel do cliente (Rodrigo, 06/11/2026)

O cliente toca em "Pedir ajuste" no post e escreve o que quer mudar. Código em `cloudflare/src/client-revision.js`.

## Post e story de quem usa imagem gerada
1. O Nexus cria outra imagem no gerador grátis do vigia, seguindo o pedido e a ficha do cliente.
2. A arte troca no mesmo horário.
3. A arte volta para o cliente aprovar. Nunca publica sozinha, nem por silêncio do cliente.
4. A arte antiga só sai quando a nova fica pronta.
5. Biblioteca e artes da campanha não entram, porque não seguem o pedido.

## Aviso no Master
O pedido vira chamado "Refazer arte" e linha "correção pedida" no quadro. A arte atual fica guardada, e nada é gerado. Vale para:
- Daniela Martins, Quatree Dog, Adimax e GILTEC.
- Cliente sem camada de texto ou em pausa.
- Reels, porque o gerador não faz vídeo.
- Geração que falhou.
- Quarto ajuste do mesmo post. O limite é de 3 por post, para poupar o gerador grátis.

## Carrossel
De quem usa imagem gerada, segue o fluxo antigo, que refaz os cartões com o pedido. De quem não recebe imagem gerada, vira aviso.

## Enquanto refaz
- O post mostra "Ajuste pedido · sendo refeito" e o botão Aprovar fica travado.
- O vigia não mexe nesse post.

## Limites
- A arte refeita no Master entra como post novo, pelo Enviar artes. O post antigo precisa ser excluído à mão.
- Se a montagem no GitHub não voltar, não abre chamado. O post aparece como "correção pedida" no quadro.
