PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT '',
  pix_key TEXT NOT NULL DEFAULT '',
  receiver_name TEXT NOT NULL DEFAULT '',
  receiver_city TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
-- Contas (22/11/2026): a conta 1 é a master. Cada conta tem dados, ponte e follow-up próprios.
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
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  monthly_amount INTEGER NOT NULL CHECK (monthly_amount > 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  reference_month TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  due_date TEXT NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  pix_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting','paid')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reported_at TEXT,
  paid_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(client_id, reference_month)
);
CREATE INDEX IF NOT EXISTS idx_clients_due ON clients(due_day);
CREATE INDEX IF NOT EXISTS idx_charges_client ON charges(client_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_month ON charges(reference_month);

-- CRM de WhatsApp (21/11/2026): leads, mensagens e estado da ponte do QR Code.
CREATE TABLE IF NOT EXISTS leads (
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
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  wa_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, wa_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_pending ON messages(status, direction);
CREATE INDEX IF NOT EXISTS idx_leads_last ON leads(last_at);
CREATE INDEX IF NOT EXISTS idx_leads_account ON leads(account_id, last_at);
CREATE INDEX IF NOT EXISTS idx_clients_account ON clients(account_id);
CREATE TABLE IF NOT EXISTS wa_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bridge_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'offline',
  qr TEXT NOT NULL DEFAULT '',
  seen_at TEXT
);
INSERT OR IGNORE INTO wa_status (id, bridge_key) VALUES (1, lower(hex(randomblob(20))));
-- Conta master (banco novo). Em banco antigo, a migrate-contas.sql já criou com os dados de antes.
INSERT OR IGNORE INTO accounts (id, username, is_master, active, bridge_key)
  SELECT 1, 'master', 1, 1, bridge_key FROM wa_status WHERE id = 1;

-- Follow-up automático (21/11/2026)
CREATE TABLE IF NOT EXISTS followup_cfg (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  tag TEXT NOT NULL DEFAULT 'quente',
  days INTEGER NOT NULL DEFAULT 2,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  message TEXT NOT NULL DEFAULT 'Olá {nome}, tudo bem? Passando para saber se ficou alguma dúvida. Posso te ajudar?'
);
INSERT OR IGNORE INTO followup_cfg (id) VALUES (1);

-- Mensagens prontas e tarefas (21/11/2026)
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL DEFAULT 1,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_open ON tasks(done, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account ON tasks(account_id, done, due_at);
CREATE INDEX IF NOT EXISTS idx_templates_account ON templates(account_id);
INSERT INTO templates(title, body) SELECT 'Boas-vindas', 'Olá {nome}! Obrigado pelo contato. Como posso te ajudar?' WHERE NOT EXISTS (SELECT 1 FROM templates WHERE account_id = 1);
INSERT INTO templates(title, body) SELECT 'Preço', 'Oi {nome}! Vou te passar os valores agora. Você prefere plano mensal ou trimestral?' WHERE (SELECT COUNT(*) FROM templates WHERE account_id = 1) = 1;
INSERT INTO templates(title, body) SELECT 'Retorno', 'Oi {nome}, tudo bem? Passando para saber se você conseguiu ver a proposta.' WHERE (SELECT COUNT(*) FROM templates WHERE account_id = 1) = 2;
