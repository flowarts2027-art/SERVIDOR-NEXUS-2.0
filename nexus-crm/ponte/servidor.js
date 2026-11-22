/* Servidor da ponte do WhatsApp (22/11/2026).
   Roda 24h num servidor (Oracle grátis) e liga a ponte de TODAS as contas ativas do CRM.
   O cliente só lê o QR Code na aba WhatsApp do CRM: não instala nada.
   Cada conta roda num processo separado (index.js) com a própria pasta de sessão. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CRM = (process.env.CRM_URL || 'https://nexus-crm.diamantehinode2015.workers.dev').replace(/\/$/, '');
const SERVER_KEY = (process.env.SERVER_KEY || '').trim();
const DADOS = process.env.DADOS || path.join(__dirname, 'contas');
const log = (...a) => console.log(new Date().toISOString(), '-', ...a);
if (!/^[a-f0-9]{64}$/.test(SERVER_KEY)) { console.error('Falta a SERVER_KEY (chave do servidor, aba Contas do CRM).'); process.exit(1); }
fs.mkdirSync(DADOS, { recursive: true });

const running = new Map(); // id da conta -> { proc, key }

function start(acc) {
  const dir = path.join(DADOS, 'conta-' + acc.id);
  const proc = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    env: { ...process.env, BRIDGE_KEY: acc.bridge_key, PONTE_DIR: dir, CRM_URL: CRM },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const tag = `[conta ${acc.id}]`;
  const out = d => String(d).split('\n').filter(Boolean).forEach(l => console.log(tag, l));
  proc.stdout.on('data', out); proc.stderr.on('data', out);
  proc.on('exit', code => {
    log(tag, 'parou (código ' + code + ')');
    if (running.get(acc.id)?.proc === proc) running.delete(acc.id);
  });
  running.set(acc.id, { proc, key: acc.bridge_key });
  log(tag, 'ligada');
}

async function sync() {
  try {
    const r = await fetch(CRM + '/api/ponte-servidor/contas', { headers: { 'x-server-key': SERVER_KEY } });
    if (!r.ok) throw new Error('CRM respondeu ' + r.status);
    const { accounts } = await r.json();
    const ids = new Set(accounts.map(a => a.id));
    for (const [id, it] of running) if (!ids.has(id)) { log(`[conta ${id}] desativada: desligando`); it.proc.kill(); running.delete(id); }
    for (const a of accounts) {
      const it = running.get(a.id);
      if (it && it.key !== a.bridge_key) { it.proc.kill(); running.delete(a.id); }
      if (!running.has(a.id)) start(a);
    }
  } catch (e) { log('Não consegui falar com o CRM:', e.message); }
}

sync();
setInterval(sync, 30000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const it of running.values()) it.proc.kill(); process.exit(0); });
