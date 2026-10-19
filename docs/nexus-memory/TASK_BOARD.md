# Quadro compartilhado de tarefas — Flow Arts / Nexus

**Regra:** só marcar `concluído` com evidência. `PR aberto` não significa `no ar`. Este quadro é um índice de transferência, não substitui `NEXT_ACTIONS.md`, `PROJECT_STATE.md` nem o rastreamento de PRs.

| ID | Objetivo | Responsável preferido | Estado em 19/10/2026 | Próximo passo |
| --- | --- | --- | --- | --- |
| BRIDGE-001 | Protocolo de memória entre ChatGPT e Claude | ChatGPT | Documentação em branch; aguardando revisão/integração | Validar PR e juntar à `main` somente com autorização. Depois verificar que ambos leram as instruções na sessão seguinte. |
| FLOW-CAPTA-001 | Qualificar oportunidades locais, registrar no CRM e preparar contato manual pelo Instagram | Claude Code / Work; ChatGPT revisa marketing | Planejado; partes do Caçador/CRM já existem em código e PRs | Auditar `daily-prospects.js`, `crm.js`, PRs e limitações; conciliar 10/dia registrado no changelog com 20/dia discutido; desenhar o menor incremento. |
| FLOW-ARTES-001 | Produzir artes 4:5 por nicho, quatro fotos em 2×2, para exemplos comerciais | ChatGPT / Work; Claude integra o resultado ao painel quando autorizado | Pedido em andamento em conversa, sem conclusão documentada aqui | Retomar briefing e referências visuais aprovadas; não afirmar que as 21 artes estão prontas. |

## Convenções de estado
`planejado` → `em andamento` → `PR aguardando revisão` → `implantado e verificado`. Use `bloqueado` se depender de autorização, credencial ou integração. Para trabalho só de documentação, `integrado` após merge e leitura confirmada, sem alegar alteração operacional.

## Critérios de aceite da ponte
- Ambas as ferramentas, **quando tiverem acesso ao GitHub**, sabem onde ler o resumo mais recente da outra.
- Cada uma registra o que foi executado, com evidência, deixando próximo passo e pendências claros.
- Não se afirma que há sincronização automática do histórico de chat, da tela, de prompts invisíveis ou de tarefas em execução.
- Não há secrets nem dados pessoais inseridos nos novos arquivos; a documentação continua separada do deploy e dos envios reais.
