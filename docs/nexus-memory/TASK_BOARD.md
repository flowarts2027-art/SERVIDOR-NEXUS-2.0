# Quadro compartilhado de tarefas — Flow Arts / Nexus

**Regra:** só marcar `concluído` com evidência. `PR aberto` não significa `no ar`. Este quadro é um índice de transferência, não substitui `NEXT_ACTIONS.md`, `PROJECT_STATE.md` nem o rastreamento de PRs.

| ID | Objetivo | Responsável preferido | Estado em 19/10/2026 | Próximo passo |
| --- | --- | --- | --- | --- |
| BRIDGE-001 | Protocolo de memória entre ChatGPT e Claude | ChatGPT | **Integrado à `main` no PR #316**; leitura por Claude ainda não verificada | Conferir leitura/atualização dos handoffs quando Claude Code retomar o projeto. |
| FLOW-CAPTA-001 | Aperfeiçoar o Captador **já existente no portal de cada cliente**, por nicho, com qualificação e follow-up seletivo; simplificar o Caçador duplicado no Master sem perder administração | **Claude Code** implementa; ChatGPT define marketing | Requisitos registrados no `HANDOFF_CHATGPT.md`; implementação ainda não realizada | Auditar `captador.js`, `public/captador.js`, `daily-prospects.js` e CRM; qualificar empresas, contato inicial manual no Instagram quando aplicável, zerar listagem visual após busca sem resultados, arquivar fracos/sem interesse e acompanhar só leads pertinentes. Preservar dados, permissões e isolamento dos assinantes; propor PR com testes. |
| FLOW-MIDIA-001 | Conectar solicitação de conteúdo do marketing (ChatGPT/Work), implementação técnica (Claude) e fila de mídia no Nexus, preservando aprovação humana | Claude Code implementa e testa; ChatGPT cria/revisa briefings e artes | **Requisitos registrados, nenhuma automação integrada validada** | Auditar upload, R2, agendamento, aprovação e permissões já existentes; definir tickets sem dados privados, estados da fila, aviso de falhas e fluxo manual do vídeo Flow; propor PR pequeno, validar custos/APIs e testar ingestão sem publicar. |
| FLOW-ARTES-001 | Produzir artes 4:5 por nicho, quatro fotos em 2×2, para exemplos comerciais | ChatGPT / Work; Claude integra o resultado ao painel quando autorizado | Pedido em andamento em conversa, sem conclusão documentada aqui | Retomar briefing e referências visuais aprovadas; não afirmar que as 21 artes estão prontas. |

## Convenções de estado
`planejado` → `em andamento` → `PR aguardando revisão` → `implantado e verificado`. Use `bloqueado` se depender de autorização, credencial ou integração. Para trabalho só de documentação, `integrado` após merge e leitura confirmada, sem alegar alteração operacional.

## Critérios de aceite da ponte
- Ambas as ferramentas, **quando tiverem acesso ao GitHub**, sabem onde ler o resumo mais recente da outra.
- Cada uma registra o que foi executado, com evidência, deixando próximo passo e pendências claros.
- Não se afirma que há sincronização automática do histórico de chat, da tela, de prompts invisíveis ou de tarefas em execução.
- Não há secrets nem dados pessoais inseridos nos novos arquivos; a documentação continua separada do deploy e dos envios reais.
