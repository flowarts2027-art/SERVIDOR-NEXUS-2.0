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

## 11/11/2026 (07h40) — Item 1 feito em código pelo Claude (aguardando merge e deploy)

**O que foi criado** (PR `claude/painel-direct-comentarios`):
- `cloudflare/src/instagram-inbox.js` + rotas em `portal.js`:
  - `GET /api/portal/ig/conversations` — conversas do Direct da conta conectada;
  - `POST /api/portal/ig/send` — envio MANUAL de mensagem para uma conversa existente;
  - `GET /api/portal/ig/comments` — comentários dos 6 posts mais recentes, com respostas;
  - `POST /api/portal/ig/comment` — `comment` (comentar no post), `reply`, `hide`, `unhide`, `delete`.
- `public/ig-tools.js` + 2 blocos na aba **Conta** do painel do cliente: "Direct do Instagram / Instagram Direct" e "Comentários / Comments". Rótulos em português e inglês, para o vídeo da Meta.
- Testes novos: `cloudflare/test/instagram-inbox.test.mjs` (9). Suíte completa: 977/977.
- Nada é automático: só age quando o cliente clica. Apagar pede confirmação.

**Atenção:** o deploy da `main` pode rodar sozinho pelo GitHub Actions (o workflow escuta `cloudflare/**` e `public/**`), mas não foi confirmado se as credenciais voltaram depois da suspensão (último deploy visto: 06/11). Depois do merge, conferir se o painel tem os dois blocos; se não tiver, deploy pelo PC com OK do Rodrigo.
**Não testado em produção:** nenhuma chamada real à Meta foi feita.

## Roteiro do vídeo (para o ChatGPT guiar o Rodrigo) — interface em inglês, um trecho por permissão
Conta usada: uma conta de teste/testador combinada com o Rodrigo. O Rodrigo faz login e clica; o assistente só orienta.
1. **instagram_business_basic:** abrir o painel → aba Conta → "Conectar Instagram" → tela de login da Meta → autorizar → voltar ao painel com o @ da conta aparecendo.
2. **instagram_business_content_publish:** no painel, um post com imagem e legenda → aprovar → "Publicar agora" → abrir o app do Instagram e mostrar o MESMO post (mesma imagem e legenda) na conta.
3. **instagram_business_manage_messages:** antes, de outro celular, mandar "Hi" para a conta (abre a janela de 24h). No painel: bloco "Instagram Direct" → escolher a conversa (o @ aparece) → escrever → "Send message" → abrir o app do Instagram da outra pessoa e mostrar a mensagem chegando.
4. **instagram_business_manage_comments:** bloco "Comments" → "Comment" num post → "Reply" num comentário → "Hide" e depois "Delete" → abrir o post no app do Instagram e mostrar o estado final. No texto, explicar que a API do Instagram não permite editar comentário; por isso o ciclo é criar → ocultar → apagar.
5. Insights já aprovada: não regravar.
Legendas no vídeo explicando cada passo, em inglês.

## 11/11/2026 (07h45) — Textos revisados e botões em inglês
- O ChatGPT escreveu as 4 justificativas; o Claude revisou contra o código e o Rodrigo recebeu as versões finais no chat (basic, content_publish, manage_messages, manage_comments). Ajustes principais: basic cita só `id, username, account_type` e diz que todas as outras funções dependem do ID; publish usa "delete" (o painel não tem "recusar") e diz que imagem e legenda saem iguais; messages e comments citam também a resposta automática por palavra-chave, que deve aparecer no vídeo.
- Recomendação: tirar do rascunho `instagram_manage_comments` (login pelo Facebook, não usado) e `public_profile`, se o formulário permitir. Insights já aprovada: sem texto novo.
- Botões do painel do cliente com inglês ao lado (Aprovar / Approve, Publicar agora / Publish now, Pedir ajuste / Request changes, Excluir / Delete, Conectar Instagram / Connect Instagram, Reconectar / Reconnect). `client-lite.js` v=147. Testes 977/977.
- Vídeo: o Rodrigo vai gravar à noite de 11/11, com calma. No vídeo do Direct e dos comentários, mostrar também a resposta automática por palavra-chave.
