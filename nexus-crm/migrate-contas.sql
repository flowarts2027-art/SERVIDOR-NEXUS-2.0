-- Migração única (22/11/2026): CRM de uma conta só -> várias contas.
-- Roda só quando a tabela leads ainda não tem account_id (o deploy confere antes).
-- Tudo o que já existe vira da conta 1 (master). A chave da ponte do Rodrigo continua a mesma.

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL DEFAULT '',
  is_master INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  bridge_key TEXT NOT NULL UNIQUE,
  wa_state TEXT NOT NULL DEFAULT 'offline',
  wa_qr TEXT NOT NULL DEFAULT '',
  wa_seen_at TEXT,
  company_name TEXT NOT NULL DEFAULT '',
  pix_key TEXT NOT NULL DEFAULT '',
  receiver_name TEXT NOT NULL DEFAULT '',
  receiver_city TEXT NOT NULL DEFAULT '',
  fu_enabled INTEGER NOT NULL DEFAULT 0,
  fu_tag TEXT NOT NULL DEFAULT 'quente',
  fu_days INTEGER NOT NULL DEFAULT 2,
  fu_max INTEGER NOT NULL DEFAULT 3,
  fu_message TEXT NOT NULL DEFAULT 'Olá {nome}, tudo bem? Passando para saber se ficou alguma dúvida. Posso te ajudar?',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO accounts (id, username, is_master, active, bridge_key, wa_state, wa_qr, wa_seen_at,
  company_name, pix_key, receiver_name, receiver_city, fu_enabled, fu_tag, fu_days, fu_max, fu_message)
SELECT 1, 'master', 1, 1, w.bridge_key, w.state, w.qr, w.seen_at,
  s.company_name, s.pix_key, s.receiver_name, s.receiver_city, f.enabled, f.tag, f.days, f.max_attempts, f.message
FROM wa_status w, settings s, followup_cfg f WHERE w.id = 1 AND s.id = 1 AND f.id = 1;

ALTER TABLE clients ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE templates ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;

-- leads, messages e tasks: refeitas (telefone único por conta; id da mensagem único por contato).
-- Ordem pensada para nada ser apagado em cascata: cópias sem chave estrangeira primeiro.
CREATE TABLE leads_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL DEFAULT 1,
  phone TEXT NOT NULL,
  jid TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'novo',
  notes TEXT NOT NULL DEFAULT '',
  value INTEGER NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '',
  info_at TEXT,
  tags TEXT NOT NULL DEFAULT '',
  last_in_at TEXT,
  followup_count INTEGER NOT NULL DEFAULT 0,
  followup_last TEXT,
  last_message TEXT NOT NULL DEFAULT '',
  last_at TEXT,
  unread INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, phone)
);
INSERT INTO leads_new (id, account_id, phone, jid, name, stage, notes, value, avatar, info_at, tags, last_in_at,
  followup_count, followup_last, last_message, last_at, unread, created_at)
SELECT id, 1, phone, jid, name, stage, notes, value, avatar, info_at, tags, last_in_at,
  followup_count, followup_last, last_message, last_at, unread, created_at FROM leads;

CREATE TABLE messages_bak AS SELECT * FROM messages;
CREATE TABLE tasks_bak AS SELECT * FROM tasks;
DROP TABLE messages;
DROP TABLE tasks;
DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  wa_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, wa_id)
);
INSERT INTO messages (id, lead_id, direction, body, status, wa_id, created_at)
SELECT id, lead_id, direction, body, status, wa_id, created_at FROM messages_bak
WHERE lead_id IN (SELECT id FROM leads);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL DEFAULT 1,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO tasks (id, account_id, lead_id, title, due_at, done, done_at, created_at)
SELECT id, 1, CASE WHEN lead_id IN (SELECT id FROM leads) THEN lead_id ELSE NULL END, title, due_at, done, done_at, created_at FROM tasks_bak;

DROP TABLE messages_bak;
DROP TABLE tasks_bak;
