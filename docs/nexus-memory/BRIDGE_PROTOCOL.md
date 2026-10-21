# Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts)

**Objetivo:** usar este repositório como memória de **projeto**, para que ChatGPT (inclusive Work) e Claude Code possam retomar tarefas a partir do mesmo estado verificável. **Não é integração direta de chats nem sincronização em tempo real.** Cada ferramenta precisa ter acesso ao repositório, reler os arquivos e registrar sua parte ao terminar.

## Início de cada sessão

1. Atualize a cópia do repositório e identifique branch e commit. Consulte `AGENTS.md` e, no Claude, `CLAUDE.md`.
2. Leia os **sete arquivos obrigatórios** referidos em `AGENTS.md`, mais este protocolo, `TASK_BOARD.md`, `HANDOFF_CHATGPT.md` e `HANDOFF_CLAUDE.md`.
3. Confirme se já há código, PR ou tarefa equivalente **antes** de implementar de novo. Diferencie pedido, hipótese, teste local, PR e funcionalidade comprovada em produção.
4. Escolha **uma tarefa específica** do quadro. Se depender de publicação, custo, envio a terceiros ou acesso adicional, obtenha a autorização pertinente.

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

- **Repositório público:** NÃO copie transcrições integrais de chat/voz, prompts internos, dados pessoais, telefones de leads, listas de clientes, imagens privadas, arquivos confidenciais, tokens, senhas ou chaves. Registre apenas um resumo profissional necessário, sem segredos. Para dados sensíveis, use armazenamento privado apropriado e referência não sensível.
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
