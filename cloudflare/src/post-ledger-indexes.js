// Índices da post_ledger para as tarefas do cron de 1 minuto (fixArtTextInOpenPosts e approveSilentPosts).
// Sem eles, cada rodada lia a tabela inteira e estourou o limite grátis de leitura do D1 em 16/11/2026.
// Roda uma vez por isolate. Os mesmos índices estão em migrations/0010_post_ledger_minute_cron_indexes.sql.

let ready = false;

export async function ensurePostLedgerIndexes(env) {
  if (ready || !env?.DB) return;
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_post_ledger_scheduled_for ON post_ledger(scheduled_for)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_post_ledger_approval_scheduled ON post_ledger(approval_status, scheduled_for)").run();
  ready = true;
}
