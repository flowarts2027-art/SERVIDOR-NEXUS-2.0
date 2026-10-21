# Passagem de trabalho — Claude Code → ChatGPT

Este arquivo é preenchido pelo **Claude Code** ao fim de cada sessão relevante para o Nexus / Flow Arts. Não é preenchimento automático nem acesso aos prompts privados do Claude. Consulte `BRIDGE_PROTOCOL.md` e `TASK_BOARD.md`.

## 2026-10-21 BRT — Auditoria da memória e correção do estado do CRM
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido e objetivo:** Rodrigo pediu uma auditoria do Nexus (memória do ChatGPT + mudanças recentes no Git) e depois a correção da memória sobre o PR #330, numa branch própria.
- **Decisões confirmadas:** só documentação; nenhum código, deploy ou mensagem. `HANDOFF_CHATGPT.md` não foi editado (é histórico do ChatGPT); a correção ficou aqui, no `PROJECT_STATE.md` e no `TASK_BOARD.md`.
- **Executado e evidências:**
  - Lidos `BRIDGE_PROTOCOL`, `TASK_BOARD`, `HANDOFF_CHATGPT`, `HANDOFF_CLAUDE`, `PROJECT_STATE`, `KNOWN_ISSUES` e `AUDITORIA-NEXUS-2026-10-16`.
  - Git: `main` local = `origin/main` = f31375f (merge do PR #330, 20/10 10:47 BRT). O PR #328 também está na `main`. Diff de código desde 19/10: 9 arquivos (+414/−60), CRM e testes.
  - Corrigido: `TASK_BOARD` (linha CRM-INSTAGRAM-001 estava fora da tabela e dizia "sem deploy"; BRIDGE-001 atualizado) e `PROJECT_STATE` (nota de correção no topo). Branch `docs/memoria-merge-pr330`.
  - Testes não reexecutados: Node não está instalado na máquina desta sessão; `gh` também não, então o workflow de deploy não foi consultado.
- **Problemas encontrados para acompanhar:**
  - `PROJECT_STATE.md` (entradas de 12/10) cita telefone, CNPJ e um vazamento de senha pessoal. O repositório é público; avaliar com o Rodrigo se esses trechos devem ser resumidos.
  - "Prioridade zero" (Getify/MySQL) segue sem confirmação do Rodrigo.
  - CI vermelho no passo de overlay de vídeo desde 11/10 (ver `KNOWN_ISSUES`).
- **Estado:** PR aguardando revisão (somente documentação).
- **Próximo passo para quem assumir:** conferir no GitHub Actions o deploy de f31375f e testar no Master um contato real do CRM, sem enviar mensagem. Ao registrar novas entregas, marcar o estado depois do merge.
- **Bloqueios / autorização necessária:** merge desta branch e qualquer teste em produção dependem do OK do Rodrigo.

## Instruções deste arquivo
- **Ao assumir:** leia a entrada mais recente em `HANDOFF_CHATGPT.md`, os sete arquivos de memória citados em `AGENTS.md` e o quadro `TASK_BOARD.md`.
- **Ao terminar:** acrescente no topo uma entrada com data/hora de Brasília, tarefa, decisões, arquivos/commits/PRs efetivamente alterados, testes reais e falhas, status de deploy, pendências e próximo passo para o ChatGPT.
- **Segurança:** não colar segredos, prompts confidenciais, conversas completas nem dados identificáveis de clientes neste repositório público.
