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
- O que já passou sai do quadro: problema de hoje com horário vencido e, depois das 21h, o dia de hoje inteiro.
- "Enviar artes" abre sempre no dia da linha. Em linha de falta, preenche só o que falta (veja abaixo).
- Código: `cloudflare/src/missing-posts.js`.

## Botão "Criar com agente (grátis)"
- Aparece nas linhas de falta. Cria até 2 artes por clique, e o resto continua como falta. Faltando post e story, cria 1 de cada.
- Uma arte por chamada, porque gerar imagem gasta os pedidos da execução.
- Mesmo gerador do vigia (Workers AI), com a ficha do cliente. A IA não escreve. O Nexus coloca título, logo e botão.
- Tamanho final: story 1080x1920, post 1080x1350, com a imagem na tela toda.
- Horário: 9h e 19h no minuto do cliente. Ocupado ou vencido, vai para a próxima hora livre até as 21h.
- Publica sozinho, com o selo "Criada pelo agente". Exceção à regra de aprovação, pedida pelo Rodrigo.
- Não usa Biblioteca nem arte de campanha. Se a geração falhar, nada fica gravado e a tela avisa.
- Não aparece para Daniela Martins, grupo Quatree Dog, Adimax e grupo GILTEC.
- Só aparece para quem tem camada de texto: palavra do botão salva ou moldura do deploy. A Nexus AI não tem.
- Código: `cloudflare/src/agent-art.js`.

## "Enviar artes" em linha de falta (Rodrigo, 06/11/2026)
- O cartão leva dia, posts e stories que faltam. A página trava cliente e dia e só mostra essas vagas.
- Imagem a mais fica em "Não enviar". "Enviar outras artes" volta para a página comum.
- O servidor escolhe o horário: 9h e 19h primeiro, depois a próxima hora livre até as 21h, sempre no minuto do cliente.
- Sem vaga no dia, recusa. Nunca muda de dia nem de formato. Arte do tamanho errado é recusada, sem botão de trocar janela.
- Se o que faltava já estiver na agenda, recusa, para não duplicar.
- Story de hoje já entra aprovado. Post de hoje e qualquer envio de outro dia esperam aprovação.
- Ao gravar, a página avisa o Master, e o quadro relê na hora. Voltar ao Master também relê.
- Código: `fillMissing` em `cloudflare/src/master-upload.js` e `public/artes.js`.

## Aviso por WhatsApp
- Pronto e DESLIGADO. Liga com `NEXUS_MISSING_POSTS_WHATSAPP="true"` no `wrangler.jsonc`.
- Uma única mensagem por dia, a partir das 8h, para o número comercial da Flow Arts.
- Só ligar depois de a Meta liberar. Fora da janela de 24 horas a Meta exige modelo aprovado, e hoje a mensagem sai como texto comum.

## Acesso do cliente (Rodrigo, 06/11/2026)
- Senha vazia no Novo cliente: o Nexus gera 12 letras e números, sem letras parecidas.
- "Copiar acesso" copia a mensagem de `cloudflare/src/client-access.js`. Depois aparece "Acesso copiado" em letras grandes.
- A senha salva não pode ser lida, porque só o hash fica guardado.
- No botão Acesso: senha digitada é a que vale. Campo vazio cria senha nova.
- Se o cliente já tem login, o Nexus pede confirmação, porque a senha antiga para de funcionar.
- A janela Acesso mostra o usuário real do cliente, e não mais um usuário adivinhado pelo id.
