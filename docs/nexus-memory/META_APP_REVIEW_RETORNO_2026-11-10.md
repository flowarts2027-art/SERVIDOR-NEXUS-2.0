# 2026-11-10 — Revisão de permissões da Meta: correção de demonstração e retomada do Claude/Work

**Origem → destino:** conversa do proprietário com ChatGPT → Claude Code e ChatGPT Work, por memória compartilhada do Nexus.
**Estado:** orientação registrada; **nenhum formulário reenviado**, nenhum vídeo produzido nesta sessão, nenhuma permissão adicional confirmada. **Não confundir hipóteses da conversa com o parecer oficial da Meta.**
**Prioridade:** alta. Ler antes de retomar Meta Developers/App Review.

## Pedido do proprietário
Corrigir a solicitação da Meta para o aplicativo **Flow Arts Nexus** (App ID **1632247778550916**) e as permissões ainda pendentes do Instagram. O proprietário relata que já forneceu **vídeo gravado seguindo orientações anteriores**, **usuário de teste** e **acesso a um painel de cliente para análise**. Não exigir tudo de novo sem conferir o material enviado, sua acessibilidade e a resposta concreta do revisor.

O Work ficou repetindo tentativas de login no painel Nexus, **sem pedir que o proprietário assumisse a autenticação**, até esgotar o limite diário. Na próxima retomada, **não repetir tentativas de login em loop**. Se precisar de login, solicitar imediatamente a transferência de controle ao proprietário; após uma falha explicada, parar e informar o bloqueio. Não pedir senha, token ou sessão no chat.

## Pendências alegadas — conferir no Meta Developers antes de fazer afirmações
O proprietário informa que **somente uma permissão foi aprovada**, com as demais recusadas/pendentes. As cinco permissões existentes no código são:
- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `instagram_business_manage_insights`

**Não há nesta nota evidência primária suficiente para confirmar qual foi aprovada** nem os textos exatos de cada recusa. Uma resposta anterior atribuiu aprovação a Insights e recusa às outras quatro, mas esse mapeamento **precisa ser confrontado com o painel e o feedback oficial**, pois não foi confirmado nesta sessão. Não copiar esses diagnósticos como fatos.

### Hipóteses levantadas na conversa (NÃO são transcrição do parecer da Meta)
- **Basic:** a justificativa anterior possivelmente descrevia comentários em vez do acesso básico à conta.
- **Content Publish:** a demonstração possivelmente não deixava rastreável a passagem de conteúdo aprovado → publicação real.
- **Manage Messages:** possivelmente não demonstrava o fluxo ponta a ponta de mensagens/Direct.
- **Manage Comments:** possivelmente não explicava o uso exato da permissão no Nexus.
- **Insights:** verificar status real e, se pendente, explicar métricas efetivamente consultadas.
- Possibilidade de justificativas duplicadas/incoerentes. **Nada disso foi verificado contra os motivos oficiais neste registro.**

**Ação obrigatória:** abrir no Meta Developers a resposta de cada permissão; registrar **nome, status, motivo literal de rejeição, testes exigidos, documentos/vídeos enviados e detalhes de acesso solicitados**. Separar rejeição por documentação, vídeo, teste inacessível, uso não demonstrado ou funcionalidade inexistente. Não atribuir culpa ao revisor por não ter usado a conta de teste sem verificar se o login, permissões e passos eram claros e funcionavam.

## Fluxo REAL do Nexus — não descrever como criador de artes dentro do painel
1. ChatGPT/agentes criam artes e legendas **fora do painel Nexus**. O Nexus recebe conteúdo pronto; não afirmar que o cliente cria a arte dentro do portal.
2. No caminho GitHub, as artes são colocadas em `agendamentos/AAAA-MM-DD/HHMM/` (Flow Arts) ou `agendamentos/clientes/<id>/AAAA-MM-DD/HHMM/` (outros clientes). O push/merge que introduz arquivos dispara, quando habilitado, o workflow `.github/workflows/nexus-agendar-pasta.yml` que executa `.github/scripts/agendar-pasta.sh`; esse fluxo **envia o material ao painel em estado de aprovação pendente**. Verificar se GitHub Actions e credenciais voltaram a operar após a recuperação da conta.
3. Cliente vê arte/legenda no `public/portal.html`/`public/client-lite.js` e pode aprovar, pedir reajuste ou recusar, conforme estado e regras aplicáveis. Aprovação é registrada no backend (ver `cloudflare/src/posts.js` e `cloudflare/src/portal.js`).
4. **Depois da aprovação**, o conteúdo fica liberado para publicação conforme agendamento e políticas do sistema. O agendador do servidor Cloudflare/D1 enfileira o serviço `publisher-sweep` (`cloudflare/src/scheduler.js`, `cloudflare/src/publisher-round.js`); o executor (`cloudflare/src/executor.js`) chama o publicador (`cloudflare/src/publisher.js`), que utiliza a API da Meta/Instagram com a conexão autorizada do cliente. O GitHub **não é** quem publica no Instagram.
5. Conferir status/log e, **somente se uma publicação real autorizada foi efetuada**, demonstrar o conteúdo no Instagram. Diferenciar upload no painel, aprovação, agendamento, envio à API e publicação confirmada.

O comportamento em produção precisa ser **validado**; o fluxo de código/documentação não comprova que o deploy, os tokens e as automações estejam funcionando em 10/11. Há variações/rotas alternativas (MCP/Enviar artes, botão Publicar agora, agentes internos, autoaprovação sob condições). Mostrar somente o caminho ativo e comprovado da conta usada na revisão. **Não fazer post real sem autorização explícita do proprietário**. Regras de aprovação, bloqueio por reajuste e prevenção de publicação duplicada são essenciais.

Referências técnicas verificadas: `agendamentos/README.md`, `.github/workflows/nexus-agendar-pasta.yml`, `cloudflare/src/posts.js`, `cloudflare/src/scheduler.js`, `cloudflare/src/publisher-round.js`, `cloudflare/src/publish-now.js`, `cloudflare/src/executor.js`, `cloudflare/src/publisher.js`. Revalidar contra a branch e produção atual antes de enviar à Meta.

## Próximo trabalho no Claude/Work — correção, sem repetir erros
1. **Diagnóstico primeiro:** ler `AGENTS.md`, `CLAUDE.md`, `BRIDGE_PROTOCOL.md` e os handoffs, conferir repositório e estado de Cloudflare/Meta. Abrir App Review e copiar os **motivos oficiais** de cada permissão; verificar o que já foi submetido e se as credenciais de teste permitem ao revisor acessar o painel cliente. Não expor senhas no repositório público.
2. **Montar matriz por permissão:** funcionalidade real + permissão exata + justificativa específica + caminho de teste reproduzível + evidência/trecho de vídeo + estado (funciona/não funciona/bloqueada). Corrigir cada resposta para o uso verdadeiro do Nexus, sem texto reciclado de outra permissão.
3. **Vídeo:** mostrar apenas o fluxo relevante (arte e legenda recebidas no painel → revisão/ação do cliente → agendamento/publicação pela API → confirmação na conta de teste, **se permitido e comprovado**). Não filmar criação de artes *dentro* do Nexus; não inserir simulação como se fosse execução real. Se for longo, organizar um roteiro curto por permissão e editar/segmentar **somente se o formato aceito pela Meta permitir**. Não pressupor gravação/exportação MP4 nativa do Work. Verificar exigência atual de formato, duração e instruções de teste da Meta.
4. **Acesso e controle:** ao primeiro bloqueio de login do Work, pedir ao proprietário para assumir o navegador; não tentar em loop e não consumir limite sem progresso. Se não conseguir gravar, preparar roteiro com passos e horários e solicitar gravação local com ferramenta apropriada.
5. **Entrega:** reunir formulários revisados, evidências e os passos de revisor; conferir links e usuário de teste; apresentar ao proprietário **antes de qualquer reenvio**. Fazer uma única submissão coerente após validação. Registrar datas, resultados e itens não confirmados.

## Limites deste registro
Esta é a **orientação solicitada para a memória compartilhada**, não resultado de auditoria do painel Meta. Não foi acessado o feedback original do App Review nem o vídeo anterior nesta sessão. Não houve alteração funcional, merge de código, deploy, publicação ou envio a terceiros. O repositório é público: não adicionar credenciais, usuários/senhas de teste, capturas privadas, tokens ou mensagens de clientes.
