# 2026-11-11 — Meta App Review: auditoria do código e passagem para o ChatGPT

**Origem → destino:** Claude (chat com o Rodrigo) → ChatGPT Work.
**Pedido do Rodrigo (11/11):** resolver o App Review por completo; o que o Claude não conseguir fazer sozinho (incluindo vídeo), o ChatGPT termina.
**Base:** `main` em 380043b. Leitura de código; nada executado em produção, nada enviado à Meta.

## Matriz por permissão (conferida no código em 11/11)

| Permissão | O que o Nexus faz de verdade | Onde no código | Dá para filmar hoje? |
|---|---|---|---|
| `instagram_business_basic` | Login do cliente pelo Instagram (OAuth) e leitura do perfil/ID da conta para o painel | `cloudflare/src/instagram.js` | Sim, com o login feito pelo Rodrigo |
| `instagram_business_content_publish` | Publica post aprovado pelo cliente (agendador e botão "Publicar agora") | `publisher.js`, `publish-now.js`, `executor.js` | Sim, com OK do Rodrigo para 1 post real numa conta combinada |
| `instagram_business_manage_messages` | Só automático: comentário com palavra-chave → Direct; Direct com palavra-chave → resposta; brinde por Direct | `comment-autoreply.js`, `dm-keyword-reply.js`, `gift-dm.js`, `ig-send.js` | **Não do jeito que a Meta pediu.** Não existe botão no painel para mandar uma mensagem manual |
| `instagram_business_manage_comments` | Só responde comentário automaticamente (reply público) | `comment-autoreply.js` | **Não.** Não existe tela para comentar, ocultar ou apagar comentário |
| `instagram_business_manage_insights` | Já aprovada | `insights.js` | Não precisa |

**Observação técnica:** a API do Instagram permite responder, ocultar e apagar comentário, mas **não permite editar** comentário. Na justificativa de Comments, explicar isso e mostrar: responder pelo Nexus → ocultar/apagar pelo Nexus → conferir no app do Instagram. Confirmar na documentação atual da Meta antes de escrever.

## O que falta, em ordem
1. **Código (Claude):** criar no painel do cliente (a) uma caixa "Enviar mensagem" no Direct para uma conversa existente e (b) uma lista de comentários de um post com Responder / Ocultar / Apagar. Testes, PR, merge e deploy só com OK do Rodrigo.
2. **Textos (ChatGPT):** reescrever no rascunho `submission_id=1659678365807857` uma justificativa própria por permissão, em inglês, sem duplicação, seguindo a matriz acima. Decidir com o Rodrigo se `instagram_manage_comments` e `public_profile` saem do pedido (o código usa só os escopos `instagram_business_*`).
3. **Vídeo (Rodrigo + ChatGPT):** gravar com a tela do Rodrigo, interface em inglês, um trecho por permissão, seguindo as notas literais do revisor (arquivo de 10/11). Login, publicação, mensagem e comentário reais são feitos pelo próprio Rodrigo. Nenhum assistente tenta login em loop.
4. **Envio:** mostrar formulário + vídeo ao Rodrigo; só envia com o OK dele.

**Bloqueio atual:** os itens 3 e 4 dependem do item 1 para Messages e Comments. Basic e Content Publish já podem ser preparados.
