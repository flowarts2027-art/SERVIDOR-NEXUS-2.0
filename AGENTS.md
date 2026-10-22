# Nexus 2.0 — instruções para agentes de trabalho

Antes de qualquer alteração, leia integralmente os sete arquivos em `docs/nexus-memory/`:
`PROJECT_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `TEST_RESULTS.md`, `NEXT_ACTIONS.md`, `CHANGELOG.md`.

Confira também o commit atual de `main`, o último deploy do GitHub Actions e o estado dos serviços relevantes. Trate registros de produção como fonte para afirmar resultados; documentação e código não são prova de execução.

Trabalhe em sequência: diagnóstico → hipótese → correção pequena → teste → evidência → próximo passo. Evite publicação real para testes; quando indispensável, faça uma única publicação controlada. Não restaurar Railway, Claire/Ragnar independentes, corte/edição de vídeos, trailer, instalador ou upload de logo.

Antes de terminar, atualize os documentos com o que realmente executou, resultados, problemas e o próximo passo exato. Não inclua credenciais, tokens ou segredos.

## Continuidade entre chat, Work e voz

Diretriz expressa de Rodrigo em 2026-09-27: registrar na memória permanente todas as conversas sobre o Nexus, sejam de chat, Work ou voz. Preservar pedidos, decisões, correções, resultados comprovados, pendências e próximo passo, com data e sem segredos. Registrar mesmo quando não houver mudança no código. Não tratar planos como ações concluídas.

No início de cada sessão com acesso ao projeto, consultar esta memória; antes de encerrar, atualizar os arquivos pertinentes em docs/nexus-memory. Quando a sessão não tiver acesso para ler ou gravar, informar a limitação e não afirmar que houve sincronização. Esta instrução não cria integração automática entre produtos nem acesso a conversas que não estejam disponíveis.

## Ponte de memória entre ChatGPT e Claude Code (2026-10-19)

Além dos sete arquivos obrigatórios, no início de **cada sessão com acesso ao repositório** leia:
- `docs/nexus-memory/BRIDGE_PROTOCOL.md`
- `docs/nexus-memory/TASK_BOARD.md`
- `docs/nexus-memory/HANDOFF_CHATGPT.md`
- `docs/nexus-memory/HANDOFF_CLAUDE.md`

**Regra fixa para o ChatGPT (2026-10-21):** criar 3 posts por dia da Flow Arts (09h, 12h, 19h) e enviar ao painel pela pasta `agendamentos/`, esperando a aprovação do Rodrigo. Siga `docs/nexus-memory/REGRA_POSTS_DIARIOS.md`. Todo dia, 1 dos 3 posts usa a mensagem "App de agendar post não cria post" (`docs/nexus-memory/MARKETING_POSICIONAMENTO.md`).

Antes de começar, leia a **última passagem do outro assistente** e confira branches/PRs para evitar refazer trabalho. Ao terminar, registre no seu arquivo de handoff o que foi **realmente feito**, testes/links/pendências e próximo passo. ChatGPT escreve em `HANDOFF_CHATGPT.md`; Claude escreve em `HANDOFF_CLAUDE.md`; mantenha `TASK_BOARD.md` coerente com evidências. Esta memória fica em repositório **público**: não grave transcrições completas, dados pessoais, contatos de clientes, tokens, senhas ou prompts confidenciais. Acesso às conversas um do outro **não é automático**. Nenhuma mudança em produção ou gasto é autorizado por esta instrução.
