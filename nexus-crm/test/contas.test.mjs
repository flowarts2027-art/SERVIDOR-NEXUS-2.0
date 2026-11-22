// Testes do CRM com várias contas (22/11/2026). Rodar: node --test nexus-crm/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.js';

const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
function d1(sqlite) {
  const stmt = (sql, args = []) => {
    const st = sqlite.prepare(sql);
    return {
      bind: (...a) => stmt(sql, a),
      first: async () => st.get(...args) ?? null,
      all: async () => ({ results: st.all(...args) }),
      run: async () => { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
    };
  };
  return { prepare: stmt, batch: async list => { const out = []; for (const s of list) out.push(await s.run()); return out; } };
}
function bancoAntigoComDados() {
  const db = new DatabaseSync(':memory:');
  db.exec(read('./schema-antigo.sql'));
  db.exec(`UPDATE settings SET company_name='Flow Arts', pix_key='x@y.com', receiver_name='RODRIGO', receiver_city='MAGE' WHERE id=1;
    UPDATE followup_cfg SET enabled=1, days=3 WHERE id=1;
    INSERT INTO leads(phone,name,stage) VALUES('5521999990001','Ana','conversa'),('5521999990002','Bruno','novo');
    INSERT INTO messages(lead_id,direction,body,wa_id) VALUES(1,'in','oi','W1'),(1,'out','olá','W2'),(2,'in','bom dia','W3');
    INSERT INTO tasks(lead_id,title,due_at) VALUES(1,'Ligar','2026-12-01T10:00:00Z');
    INSERT INTO clients(name,whatsapp,monthly_amount,due_day) VALUES('Cliente A','21999990001',9700,10);`);
  return db;
}
function app(db) {
  const env = { DB: d1(db), ADMIN_PASSWORD: 'senha-master-teste', ASSETS: { fetch: async () => new Response('ok') } };
  const jar = {};
  const call = async (who, path, method = 'GET', body) => {
    const headers = { 'Content-Type': 'application/json', Origin: 'https://crm.test' };
    if (jar[who]) headers.Cookie = jar[who];
    const r = await worker.fetch(new Request('https://crm.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  return { env, call };
}

test('migração mantém os dados do Rodrigo na conta master e a mesma chave da ponte', async () => {
  const db = bancoAntigoComDados();
  const chaveAntiga = db.prepare('SELECT bridge_key FROM wa_status WHERE id=1').get().bridge_key;
  db.exec(read('../migrate-contas.sql'));
  db.exec(read('../schema.sql'));
  db.exec(read('../schema.sql')); // o deploy roda de novo: não pode duplicar nem apagar nada
  const m = db.prepare('SELECT * FROM accounts WHERE id=1').get();
  assert.equal(m.is_master, 1); assert.equal(m.bridge_key, chaveAntiga);
  assert.equal(m.company_name, 'Flow Arts'); assert.equal(m.fu_enabled, 1); assert.equal(m.fu_days, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM leads WHERE account_id=1').get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM messages').get().n, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tasks WHERE account_id=1 AND lead_id=1').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM clients WHERE account_id=1').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM templates WHERE account_id=1').get().n, 3);
});

test('banco novo cria a conta master sozinho', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(read('../schema.sql'));
  const m = db.prepare('SELECT * FROM accounts').all();
  assert.equal(m.length, 1); assert.equal(m[0].is_master, 1); assert.match(m[0].bridge_key, /^[a-f0-9]{40}$/);
});

test('master cria conta; cada conta só vê os próprios dados; ponte separada', async () => {
  const db = bancoAntigoComDados();
  db.exec(read('../migrate-contas.sql')); db.exec(read('../schema.sql'));
  const { call } = app(db);
  assert.equal((await call('m', '/api/login', 'POST', { password: 'errada' })).status, 401);
  assert.equal((await call('m', '/api/login', 'POST', { password: 'senha-master-teste' })).status, 200);
  const me = await call('m', '/api/me');
  assert.equal(me.data.is_master, true);
  // cria a conta do amigo
  assert.equal((await call('m', '/api/accounts', 'POST', { username: 'Amigo', password: '123' })).status, 400);
  const nova = await call('m', '/api/accounts', 'POST', { username: 'amigo', password: 'senha123', company_name: 'Loja do Amigo' });
  assert.equal(nova.status, 201);
  assert.equal((await call('m', '/api/accounts', 'POST', { username: 'amigo', password: 'senha123' })).status, 409);
  const lista = await call('m', '/api/accounts');
  assert.deepEqual(lista.data.accounts.map(a => a.username).sort(), ['amigo', 'master']);
  // amigo entra e não vê nada do master
  assert.equal((await call('a', '/api/login', 'POST', { username: 'amigo', password: 'errada' })).status, 401);
  assert.equal((await call('a', '/api/login', 'POST', { username: 'amigo', password: 'senha123' })).status, 200);
  assert.equal((await call('a', '/api/me')).data.is_master, false);
  assert.equal((await call('a', '/api/accounts')).status, 403);
  assert.equal((await call('a', '/api/leads')).data.leads.length, 0);
  assert.equal((await call('a', '/api/clients')).data.clients.length, 0);
  assert.equal((await call('a', '/api/templates')).data.templates.length, 3);
  assert.equal((await call('a', '/api/leads/1/messages')).status, 404);
  assert.equal((await call('a', '/api/clients/1/history')).status, 404);
  assert.equal((await call('a', '/api/leads/1', 'DELETE')).status, 404);
  // o mesmo telefone pode existir nas duas contas
  assert.equal((await call('a', '/api/leads', 'POST', { name: 'Ana do amigo', phone: '21999990001' })).status, 201);
  assert.equal((await call('m', '/api/leads')).data.leads.length, 2);
  assert.equal((await call('a', '/api/leads')).data.leads.length, 1);
  // chaves da ponte diferentes
  const kM = (await call('m', '/api/whatsapp')).data.bridge_key, kA = (await call('a', '/api/whatsapp')).data.bridge_key;
  assert.notEqual(kM, kA);
  const bridge = (key, path, method = 'GET', body) => worker.fetch(new Request('https://crm.test' + path, { method, headers: { 'x-bridge-key': key, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }), app(db).env);
  await bridge(kA, '/api/bridge/status', 'POST', { state: 'online' });
  assert.equal((await call('a', '/api/whatsapp')).data.state, 'online');
  assert.equal((await call('m', '/api/whatsapp')).data.state, 'offline');
  // mensagem que chega na ponte do amigo fica só na conta dele
  await bridge(kA, '/api/bridge/inbound', 'POST', { messages: [{ phone: '5521988887777', body: 'quero saber o preço', wa_id: 'W1', name: 'Carla' }] });
  assert.equal((await call('a', '/api/leads')).data.leads.length, 2);
  assert.equal((await call('m', '/api/leads')).data.leads.length, 2);
  // mensagem do amigo para o master sai na fila só da ponte do amigo
  const leadA = (await call('a', '/api/leads')).data.leads.find(l => l.phone === '5521988887777');
  assert.equal((await call('a', `/api/leads/${leadA.id}/messages`, 'POST', { text: 'Oi Carla!' })).status, 200);
  assert.equal((await (await bridge(kM, '/api/bridge/outbox')).json()).messages.length, 0);
  assert.equal((await (await bridge(kA, '/api/bridge/outbox')).json()).messages.length, 1);
  assert.equal((await bridge('0'.repeat(40), '/api/bridge/outbox')).status, 401);
  // desativar a conta derruba o login e a ponte
  const id = nova.data.id;
  assert.equal((await call('m', `/api/accounts/${id}`, 'PUT', { active: false })).status, 200);
  assert.equal((await call('a', '/api/leads')).status, 401);
  assert.equal((await bridge(kA, '/api/bridge/outbox')).status, 401);
  // master não pode ser desativada pela tela
  assert.equal((await call('m', '/api/accounts/1', 'PUT', { active: false })).status, 403);
  // apagar a conta apaga só os dados dela
  assert.equal((await call('m', `/api/accounts/${id}`, 'DELETE')).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM leads WHERE account_id=?').get(id).n, 0);
  assert.equal((await call('m', '/api/leads')).data.leads.length, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM messages').get().n, 3);
});

test('página de pagamento usa o Pix da conta dona do cliente', async () => {
  const db = bancoAntigoComDados();
  db.exec(read('../migrate-contas.sql')); db.exec(read('../schema.sql'));
  const { call, env } = app(db);
  await call('m', '/api/login', 'POST', { password: 'senha-master-teste' });
  const r = await call('m', '/api/clients/1/charge', 'POST');
  assert.equal(r.status, 200);
  const page = await worker.fetch(new Request(r.data.payment_url), env);
  assert.match(await page.text(), /Flow Arts/);
});
