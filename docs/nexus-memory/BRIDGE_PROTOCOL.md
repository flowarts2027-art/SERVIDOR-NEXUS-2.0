# Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts)

**Objetivo:** usar este repositório como memória de **projeto**, para que ChatGPT (inclusive Work) e Claude Code possam retomar tarefas a partir do mesmo estado verificável. **Não é integração direta de chats nem sincronização em tempo real.** Cada ferramenta precisa ter acesso ao repositório, reler os arquivos e registrar sua parte ao terminar.

## Início de cada sessão

1. Atualize a cópia do repositório e identifique branch e commit. Consulte `AGENTS.md` e, no Claude, `CLAUDE.md`.
2. Leia os **sete arquivos obrigatórios** referidos em `AGENTS.md`, mais este protocolo, `TASK_BOARD.md`, `HANDOFF_CHATGPT.md` e `HANDOFF_CLAUDE.md`.
3. Confirme se já há código, PR ou tarefa equivalente **antes** de implementar de novo. Diferencie pedido, hipótese, teste local, PR e funcionalidade comprovada em produção.
4. Escolha **uma tarefa específica** do quadro. Se depender de publicação, custo, envio a terceiros ou acesso adicional, obtenha a autorização pertinente.

## DOIS JEITOS DE ENVIAR AS IMAGENS — Rodrigo, 27/10/2026 (vale para TODOS os clientes)

### Jeito 1 — ChatGPT no modo Work/agente sobe tudo sozinho (preferido)
Comprovado em 27/10: Quatree Dog e GILTEC subiram assim (execuções 40597414392 e 40594908362). O conector simples de texto **não** sobe imagem; o modo Work sobe.
1. Criar as artes e salvar no repositório, branch `main` ou `agendamentos`, numa pasta por post:
   - Flow Arts: `agendamentos/AAAA-MM-DD/HHMM/`
   - Outro cliente: `agendamentos/clientes/<id-do-cliente>/AAAA-MM-DD/HHMM/` (ids: `quatree-dog`, `giltec`, `maskara-assessoria`)
   - Story: `.../HHMM-story/story.png`
2. Dentro da pasta: `imagem.png` (post), `01.png 02.png ...` (carrossel), `video.mp4 + capa.png` (Reel) e `legenda.txt` (menos no story).
3. **Sempre com a DATA na pasta.** Pasta sem data (ex.: `clientes/giltec/0900/`) dá erro e não vai ao painel.
4. **Cliente que não é a Flow Arts NUNCA vai na raiz `agendamentos/AAAA-MM-DD/`**: a raiz é o painel da Flow Arts.
5. O GitHub manda sozinho ao painel do cliente, **esperando aprovação**. Conferir em Actions → "NEXUS Agendar conteúdo pronto" se apareceu "enviado ao painel". Se corrigir só a legenda, o dia inteiro daquele cliente é conferido de novo (o que já subiu não duplica).

### Jeito 2 — sem Work: página Enviar artes
1. O ChatGPT mostra as artes na conversa e grava **só as legendas** (`.../HHMM/legenda.txt`). Pasta só com legenda não dá erro.
2. O Rodrigo salva as imagens no celular e abre **Enviar artes** (`/artes.html`, botão no topo de "Subir conteúdo do cliente" no Master), escolhe cliente, dia e as imagens. A legenda aparece sozinha. Tudo entra **esperando aprovação**.

**GILTEC:** antes de criar, ler `CAMPANHA_GILTEC.md` (um equipamento diferente por peça; betoneira no máximo 1 por dia; cada cartão do carrossel inteiro, nunca cortado de imagem larga).

Nos dois jeitos: **não** subir imagem em Base64, **não** criar `.media-staging/`, **não** mexer em workflows.

## Permissão do ChatGPT (Rodrigo, 27/10/2026)
A conta nova do ChatGPT do Rodrigo pode ler este repositório e **escrever** em `docs/nexus-memory/` (memória e `HANDOFF_CHATGPT.md`) e em `agendamentos/` (legendas). Código, workflows e a `main` de `cloudflare/` e `public/` continuam só por PR com o OK do Rodrigo. O acesso técnico é dado pelo próprio Rodrigo, conectando o GitHub na conta do ChatGPT.

## Regra fixa do ChatGPT: 3 posts por dia
Todo dia, o ChatGPT cria os posts das 09h, 12h e 19h da Flow Arts e os salva em `agendamentos/` (branch `agendamentos`). Eles sobem ao painel esperando a aprovação do Rodrigo. Passo a passo e padrão da arte: `REGRA_POSTS_DIARIOS.md`.

## Fechamento: passagem de bastão

- **ChatGPT** registra suas decisões e resultados em `HANDOFF_CHATGPT.md`; **Claude** faz o mesmo em `HANDOFF_CLAUDE.md`. Não sobrescreva o histórico do outro agente.
- Adicione uma entrada recente no topo usando: **data/hora BRT; origem/destino; objetivo; decisão; ações confirmadas com link/commit; testes e evidência; pendências; próximo passo exato; bloqueios e necessidade de aprovação**.
- Atualize `TASK_BOARD.md` somente com estados comprovados. Se houve alteração relevante no projeto, atualize também os arquivos centrais da memória (`PROJECT_STATE.md`, `DECISIONS.md`, `NEXT_ACTIONS.md`, `CHANGELOG.md`, `TEST_RESULTS.md` conforme aplicável).
- Um assistente deve ler a entrada mais recente do outro **antes de continuar**. Não interprete intenção, proposta ou PR aberto como deploy.
- Evite conflitos: trabalhe em branch/PR próprio, preserve atualizações concorrentes e, em caso de divergência, compare o histórico do Git antes de editar.

## Formato recomendado de cada registro

```md
## AAAA-MM-DD HH:MM BRT — assunto
- Origem → destino: ChatGPT → Claude (ou vice-versa)
- Pedido e objetivo: ...
- Decisões confirmadas: ...
- Executado e evidências: ... (commit/PR/teste; ou "nenhum código alterado")
- Estado: planejado | em execução | PR aguardando revisão | implantado e verificado
- Próximo passo para quem assumir: ...
- Bloqueios / autorização necessária: ...
```

## Limites, privacidade e custos

- **Repositório público:** NÃO copie transcrições integrais de chat/voz, prompts internos, dados pessoais, telefones de leads, listas de clientes, arquivos confidenciais, tokens, senhas ou chaves. Registre apenas um resumo profissional necessário, sem segredos. Para dados sensíveis, use armazenamento privado apropriado e referência não sensível.
- **Imagens liberadas (decisão do Rodrigo, 23/10/2026):** o ChatGPT e o Claude podem enviar imagens para a memória e para o repositório (artes, referências, fotos de produto e fotos dos clientes para os posts). Continua proibido subir imagem que mostre documento, CPF/CNPJ, telefone, senha, token ou print de conversa privada. Esta autorização substitui a proibição genérica de imagens privadas somente nesse escopo; não altera o envio de referências à OpenAI nem religa a geração paga pela API.
- **Envio ao painel autorizado (Rodrigo, 24/10/2026):** o ChatGPT pode enviar todo dia as imagens, vídeos e legendas de todos os clientes ativos para o painel, salvando na branch `agendamentos` (pastas `agendamentos/clientes/<cliente>/AAAA-MM-DD/HHMM/`). Tudo chega como "esperando aprovação": o ChatGPT não aprova nem publica. Não é preciso pedir nova autorização a cada envio.
- Uma ferramenta **não enxerga automaticamente** a conversa, os prompts ocultos ou a execução interna da outra. Só é compartilhado aquilo que ela gravou aqui ou que tenha sido explicitamente fornecido para registro seguro.
- A ponte via documentos do GitHub não precisa de uma API paga adicional; chamadas voluntárias a modelos, pesquisa paga e infraestrutura podem ter custos próprios. **Não** conecte APIs, crie credenciais nem contrate serviços sem autorização.
- Nenhum agente deve iniciar abordagens automáticas em massa a contatos frios, publicar posts, implantar código, gastar dinheiro ou efetuar ações externas por presumir autorização deste protocolo.
- Com `main` configurada para fazer deploy: preparar branch e abrir PR é diferente de incorporar o PR; seguir a política de aprovação descrita em `CLAUDE.md`.

## Repartição de trabalho preferida

- **ChatGPT:** estratégia, redação, direção visual, qualidade da experiência e revisão do briefing.
- **Claude Code:** implementação funcional, integrações, testes e diagnóstico de runtime.
- A divisão é preferência operacional, não capacidade exclusiva. Registre qualquer transferência em um handoff com tarefa e resultado verificáveis.

## Melhorias opcionais futuras (não implementadas aqui)

1. Criar um resumo automático **de alterações do GitHub** (commits/PRs) para o painel; não captura conversas privadas.
2. Validar via CI a presença dos campos de handoff em PRs que toquem o sistema.
3. Se houver autorização explícita e justificativa de custo, integrar serviços por APIs/webhooks — projeto separado, com orçamento e revisão de segurança.
