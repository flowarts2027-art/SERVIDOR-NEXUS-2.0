-- Índices para as tarefas do cron de 1 minuto (texto nas artes e aprovação por silêncio).
CREATE INDEX IF NOT EXISTS idx_post_ledger_scheduled_for ON post_ledger(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_post_ledger_approval_scheduled ON post_ledger(approval_status, scheduled_for);
