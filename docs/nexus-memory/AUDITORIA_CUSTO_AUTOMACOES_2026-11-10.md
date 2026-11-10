# Auditoria de custo e automações — Nexus 2.0 — 10/11/2026

## Contexto e escopo
- GitHub restaurado após suspensão, motivo definitivo **não confirmado pelo GitHub**.
- Esta análise foi feita a partir dos workflows e código da `main` GitHub e do histórico de GitHub Actions. A Cloudflare real não foi acessada por credenciais neste levantamento.
- Não atribuir suspensão a excesso de automações sem resposta oficial do suporte. Automação excessiva e eventos encadeados elevam o risco de atingir limites de API e custos.

## Evidência de execução do GitHub
- API do GitHub Actions: **322 execuções em 04/11/2026**, 184 em 03/11, 173 em 05/11, 161 em 06/11, somando todos os tipos de eventos.
- API retornou 7.205 execuções históricas do repositório, não necessariamente todas realizadas no período.
- A consulta por data retornou 0 execuções para 09 e 10/11. Isto **não confirma** que os GitHub Actions estão habilitados após restauração: conferir em Settings > Actions > General.
- `NEXUS AutoFix` era acionado por cron 2x/hora, push e conclusão de 3 workflows; `NEXUS Overnight Regression` rodava após cada NEXUS CI e diariamente; `NEXUS Core Autonomy` a cada 15 minutos e por push. Essa composição criava execuções repetidas.
- O script `.github/scripts/nexus-autofix.mjs` pode disparar `rerun-failed-jobs` (até quatro falhas por ciclo); o script `.github/scripts/nexus-core-autonomy.mjs` também pode disparar novas tentativas.

## Agentes e Cloudflare
- `cloudflare/src/agent-core.js` define **19 agentes**, sendo ODIN + 18 workers; em `normalizeAgentCoreConfig` todos os módulos são habilitados por padrão.
- `cloudflare/src/scheduler.js` programa ciclos de agente a cada **30 minutos por cliente**, salvo configuração persistida, e tem gatilhos de atualização e mídia que podem antecipar a execução.
- `cloudflare/wrangler.jsonc` declara crons `* * * * *` e `*/15 * * * *`: 1.440 + 96 = **1.536 eventos Cron/dia**, antes de considerar visitas e webhooks.
- Não remover indiscriminadamente o cron de 1 minuto: ele contém filas, aprovação, respostas, correção de mídia e publicações independentes; mudanças exigem testes e autorização de deploy.
- Workflows GitHub e invocações Cloudflare são métricas distintas; não somar eventos GitHub no limite de requisições do Worker.

## Limites oficiais da Cloudflare — plano Free (consultados 10/11/2026)
- Workers: 100.000 requests/dia, 50 subrequests externas por invocation, 10 ms CPU por requisição.
- Workers AI: 10.000 neurônios gratuitos por dia (o teto consumido depende dos modelos).
- D1: 5.000.000 linhas lidas/dia e 100.000 linhas gravadas/dia.
- Fontes: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/pricing/
- **Plano real, consumo diário de requests, CPU, neurônios e linhas D1 ainda não foram consultados na conta Cloudflare.** Ver Cloudflare Dashboard > Workers & Pages > Metrics, Workers AI > Usage e D1 > Metrics > Row Metrics.

## Redução preparada neste PR
| Workflow | Antes | Novo |
| --- | --- | --- |
| Core Autonomy | a cada 15 min + push de código | 1x/dia às 11:23 UTC + manual |
| AutoFix | 2x/hora + push + workflow_run | 2x/dia às 10:41 e 22:41 UTC + manual |
| Overnight Regression | todo dia + a cada conclusão do CI | 1x/semana domingo 06:17 UTC + manual |
| Graphify | a cada push da main | 1x/semana domingo 11:17 UTC + manual |
| Campanha diária com texto | toda madrugada, incluindo primeiro-teste | só manual, até autorização para retomar agendamento |

Quatro dos workflows tinham **pelo menos 146 disparos programados/dia** no cenário anterior (Core 96, AutoFix 48, Overnight 1, campanha 1); após a mudança, serão em média **cerca de 3,14 disparos programados/dia** (1+2+1/7; Graphify também semanal, incluindo Graphify fica 3,29/dia). Eventos por outros workflows continuam possíveis, mas foram removidas as cascatas automáticas dos componentes acima.
- O botão manual do Core também deixou de acionar a antiga etapa de **publicação emergencial real de Ragnar**; uma verificação manual não deve provocar postagem. Redução de pelo menos **97% dos disparos programados desses workflows**. Não é economia de 97% no consumo total de GitHub ou Cloudflare.

## Próximos passos antes de alterar Cloudflare
1. Confirmar que a conta GitHub tem Actions habilitado e o painel de billing/usage.
2. Confirmar plano e métricas diárias da Cloudflare, em especial Workers AI, D1 e requisições.
3. Em PR separado, reduzir a frequência de ciclos pesados de agentes (ex. piso 2–3 horas) com testes de scheduler, sem afetar fila de publicações e aprovação dos clientes; só fazer deploy com OK expresso.
4. Manter pausadas as publicações de Flow Arts e Nexus AI. A migração/otimização não reativa campanhas.
