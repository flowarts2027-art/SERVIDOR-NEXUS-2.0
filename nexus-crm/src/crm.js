/* Nexus CRM — leads do WhatsApp, conversas e ponte do QR Code (21/11/2026). */
const STAGES = ['novo', 'conversa', 'agendado', 'pagamento', 'pago', 'perdido'];
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (message, status = 400) => json({ error: message }, status);
const clean = (v, n = 255) => String(v ?? '').trim().slice(0, n);
const digits = v => String(v ?? '').replace(/\D/g, '');
const nowIso = () => new Date().toISOString();
const ONLINE_MS = 90_000;

/* Telefone sempre com 55 na frente (Brasil) */
export function fullPhone(v) {
  const d = digits(v);
  if (d.length >= 12 && d.startsWith('55')) return d;
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d;
}

async function status(env) {
  return env.DB.prepare('SELECT * FROM wa_status WHERE id=1').first();
}

/* Estado real: se a ponte não dá sinal há 90 s, está desligada */
export async function waState(env) {
  const s = await status(env);
  if (!s) return { state: 'offline', qr: '', seen_at: null, bridge_key: '' };
  const fresh = s.seen_at && Date.now() - Date.parse(s.seen_at) < ONLINE_MS;
  return { state: fresh ? s.state : 'offline', qr: fresh && s.state === 'qr' ? s.qr : '', seen_at: s.seen_at, bridge_key: s.bridge_key };
}

async function leadById(env, id) {
  return env.DB.prepare('SELECT * FROM leads WHERE id=?').bind(id).first();
}

/* Acha ou cria o lead pelo telefone */
async function leadByPhone(env, phone, jid = '', name = '') {
  await env.DB.prepare('INSERT OR IGNORE INTO leads(phone,jid,name) VALUES(?,?,?)').bind(phone, jid, clean(name, 150)).run();
  if (jid) await env.DB.prepare("UPDATE leads SET jid=? WHERE phone=? AND (jid='' OR jid LIKE '%@lid')").bind(jid, phone).run();
  if (name) await env.DB.prepare("UPDATE leads SET name=? WHERE phone=? AND name=''").bind(clean(name, 150), phone).run();
  return env.DB.prepare('SELECT * FROM leads WHERE phone=?').bind(phone).first();
}

/* Coloca uma mensagem na fila; a ponte do PC envia */
export async function queueMessage(env, phone, text) {
  const lead = await leadByPhone(env, fullPhone(phone));
  const body = clean(text, 4000);
  await env.DB.prepare("INSERT INTO messages(lead_id,direction,body,status,created_at) VALUES(?,'out',?,'pending',?)").bind(lead.id, body, nowIso()).run();
  await env.DB.prepare('UPDATE leads SET last_message=?,last_at=? WHERE id=?').bind(body.slice(0, 300), nowIso(), lead.id).run();
  return lead;
}

async function input(req) {
  try { return await req.json(); } catch { throw Error('JSON inválido.'); }
}

/* Rotas da ponte (PC do Rodrigo). Autenticação pela chave da ponte. */
export async function bridgeApi(req, env, url) {
  const s = await status(env);
  const key = req.headers.get('x-bridge-key') || '';
  if (!s || !key || key.length !== s.bridge_key.length || key !== s.bridge_key) return fail('Chave da ponte inválida.', 401);
  const p = url.pathname, m = req.method;

  if (p === '/api/bridge/status' && m === 'POST') {
    const x = await input(req);
    const state = ['qr', 'connecting', 'online'].includes(x.state) ? x.state : 'connecting';
    await env.DB.prepare('UPDATE wa_status SET state=?,qr=?,seen_at=? WHERE id=1').bind(state, clean(x.qr, 2000), nowIso()).run();
    return json({ ok: true });
  }

  if (p === '/api/bridge/inbound' && m === 'POST') {
    const x = await input(req);
    let saved = 0;
    for (const msg of (Array.isArray(x.messages) ? x.messages : []).slice(0, 60)) {
      const phone = digits(msg.phone);
      const body = clean(msg.body, 4000);
      if (!phone || !body || !msg.wa_id) continue;
      const fromMe = Boolean(msg.from_me);
      const old = Boolean(msg.history);
      const lead = await leadByPhone(env, phone, clean(msg.jid, 120), fromMe ? '' : msg.name);
      const when = msg.ts ? new Date(Number(msg.ts) * 1000).toISOString() : nowIso();
      const r = await env.DB.prepare('INSERT OR IGNORE INTO messages(lead_id,direction,body,status,wa_id,created_at) VALUES(?,?,?,?,?,?)')
        .bind(lead.id, fromMe ? 'out' : 'in', body, fromMe ? 'sent' : 'received', clean(msg.wa_id, 120), when).run();
      if (!r.meta.changes) continue;
      saved++;
      await env.DB.prepare(`UPDATE leads SET
        last_message=CASE WHEN last_at IS NULL OR ?>=last_at THEN ? ELSE last_message END,
        last_at=CASE WHEN last_at IS NULL OR ?>=last_at THEN ? ELSE last_at END,
        unread=unread+?,
        stage=CASE WHEN stage='novo' AND ?=1 THEN 'conversa' ELSE stage END WHERE id=?`)
        .bind(when, body.slice(0, 300), when, when, fromMe || old ? 0 : 1, fromMe ? 1 : 0, lead.id).run();
    }
    return json({ ok: true, saved });
  }

  if (p === '/api/bridge/outbox' && m === 'GET') {
    // Mensagem presa em "sending" por mais de 2 min volta para a fila
    await env.DB.prepare("UPDATE messages SET status='pending' WHERE status='sending' AND direction='out' AND created_at < ?")
      .bind(new Date(Date.now() - 120_000).toISOString()).run();
    const rows = await env.DB.prepare(`SELECT m.id, m.body, l.phone, l.jid FROM messages m JOIN leads l ON l.id=m.lead_id
      WHERE m.direction='out' AND m.status='pending' ORDER BY m.id LIMIT 10`).all();
    for (const r of rows.results) await env.DB.prepare("UPDATE messages SET status='sending' WHERE id=?").bind(r.id).run();
    return json({ messages: rows.results });
  }

  // Contatos que ainda não têm foto/nome/número real
  if (p === '/api/bridge/pending-info' && m === 'GET') {
    const old = new Date(Date.now() - 3 * 86400_000).toISOString();
    const r = await env.DB.prepare(`SELECT id, phone, jid, name FROM leads WHERE phone NOT LIKE 'manual-%'
      AND (info_at IS NULL OR info_at < ? OR (jid LIKE '%@lid' AND info_at < ?)) ORDER BY COALESCE(last_at, created_at) DESC LIMIT 40`)
      .bind(old, new Date(Date.now() - 3600_000).toISOString()).all();
    return json({ leads: r.results });
  }

  // A ponte devolve nome, foto e número real (troca o número escondido "@lid" pelo telefone)
  if (p === '/api/bridge/info' && m === 'POST') {
    const x = await input(req);
    let updated = 0;
    for (const it of (Array.isArray(x.items) ? x.items : []).slice(0, 60)) {
      const lead = await leadById(env, Number(it.id));
      if (!lead) continue;
      let target = lead;
      const pn = digits(it.phone);
      if (pn && /^\d{12,13}$/.test(pn) && pn !== lead.phone) {
        const other = await env.DB.prepare('SELECT * FROM leads WHERE phone=?').bind(pn).first();
        if (other) {
          // Junta as conversas no lead do telefone real
          await env.DB.prepare('UPDATE messages SET lead_id=? WHERE lead_id=?').bind(other.id, lead.id).run();
          await env.DB.prepare(`UPDATE leads SET unread=unread+?, last_message=CASE WHEN ?>COALESCE(last_at,'') THEN ? ELSE last_message END,
            last_at=MAX(COALESCE(last_at,''),?), notes=CASE WHEN notes='' THEN ? ELSE notes END WHERE id=?`)
            .bind(lead.unread || 0, lead.last_at || '', lead.last_message, lead.last_at || '', lead.notes || '', other.id).run();
          await env.DB.prepare('DELETE FROM leads WHERE id=?').bind(lead.id).run();
          target = other;
        } else {
          await env.DB.prepare('UPDATE leads SET phone=? WHERE id=?').bind(pn, lead.id).run();
        }
        await env.DB.prepare('UPDATE leads SET jid=? WHERE id=?').bind(pn + '@s.whatsapp.net', target.id).run();
      }
      const name = clean(it.name, 150);
      if (name) await env.DB.prepare("UPDATE leads SET name=? WHERE id=? AND name=''").bind(name, target.id).run();
      const avatar = /^https:\/\//.test(String(it.avatar || '')) ? String(it.avatar).slice(0, 1000) : '';
      await env.DB.prepare('UPDATE leads SET avatar=?, info_at=? WHERE id=?').bind(avatar, nowIso(), target.id).run();
      updated++;
    }
    return json({ ok: true, updated });
  }

  const done = p.match(/^\/api\/bridge\/outbox\/(\d+)$/);
  if (done && m === 'POST') {
    const x = await input(req);
    await env.DB.prepare('UPDATE messages SET status=?, wa_id=COALESCE(?, wa_id) WHERE id=?')
      .bind(x.ok ? 'sent' : 'failed', x.wa_id ? clean(x.wa_id, 120) : null, Number(done[1])).run();
    return json({ ok: true });
  }
  return fail('Rota não encontrada.', 404);
}

/* Rotas do painel (já com login conferido). Retorna null se não for daqui. */
export async function crmApi(req, env, url, helpers) {
  const p = url.pathname, m = req.method;

  if (p === '/api/whatsapp' && m === 'GET') return json(await waState(env));

  if (p === '/api/leads' && m === 'GET') {
    const r = await env.DB.prepare('SELECT id,phone,jid,name,stage,notes,value,avatar,last_message,last_at,unread,created_at FROM leads ORDER BY COALESCE(last_at,created_at) DESC LIMIT 500').all();
    return json({ leads: r.results });
  }

  // Novo lead feito à mão (botão "+ Novo lead" e "Adição rápida")
  if (p === '/api/leads' && m === 'POST') {
    const x = await input(req);
    const name = clean(x.name, 150);
    let phone = fullPhone(x.phone);
    const stage = STAGES.includes(x.stage) ? x.stage : 'novo';
    const value = Math.max(0, Math.round(Number(x.value) || 0));
    if (!name && !phone) return fail('Informe o nome ou o telefone.');
    if (phone && !/^\d{12,13}$/.test(phone)) return fail('Telefone inválido. Use DDD + número.');
    if (!phone) phone = 'manual-' + crypto.randomUUID().slice(0, 8);
    const exists = await env.DB.prepare('SELECT id FROM leads WHERE phone=?').bind(phone).first();
    if (exists) return fail('Já existe um lead com esse telefone.', 409);
    const r = await env.DB.prepare('INSERT INTO leads(phone,name,stage,value,last_at) VALUES(?,?,?,?,?)').bind(phone, name, stage, value, nowIso()).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }

  const lm = p.match(/^\/api\/leads\/(\d+)(\/messages|\/client)?$/);
  if (!lm) return null;
  const lead = await leadById(env, Number(lm[1]));
  if (!lead) return fail('Contato não encontrado.', 404);

  if (!lm[2] && m === 'PUT') {
    const x = await input(req);
    const name = x.name !== undefined ? clean(x.name, 150) : lead.name;
    const notes = x.notes !== undefined ? clean(x.notes, 4000) : lead.notes;
    const stage = x.stage !== undefined ? String(x.stage) : lead.stage;
    const value = x.value !== undefined ? Math.max(0, Math.round(Number(x.value) || 0)) : lead.value;
    if (!STAGES.includes(stage)) return fail('Etapa inválida.');
    await env.DB.prepare('UPDATE leads SET name=?,notes=?,stage=?,value=? WHERE id=?').bind(name, notes, stage, value, lead.id).run();
    return json({ ok: true });
  }

  if (!lm[2] && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM messages WHERE lead_id=?').bind(lead.id).run();
    await env.DB.prepare('DELETE FROM leads WHERE id=?').bind(lead.id).run();
    return json({ ok: true });
  }

  if (lm[2] === '/messages' && m === 'GET') {
    const r = await env.DB.prepare('SELECT id,direction,body,status,created_at FROM messages WHERE lead_id=? ORDER BY created_at, id LIMIT 300').bind(lead.id).all();
    if (lead.unread) await env.DB.prepare('UPDATE leads SET unread=0 WHERE id=?').bind(lead.id).run();
    return json({ messages: r.results });
  }

  if (lm[2] === '/messages' && m === 'POST') {
    const x = await input(req);
    const text = clean(x.text, 4000);
    if (!text) return fail('Digite uma mensagem.');
    const wa = await waState(env);
    if (wa.state !== 'online') return fail('O WhatsApp não está conectado. Ligue a ponte no computador.', 409);
    await env.DB.prepare("INSERT INTO messages(lead_id,direction,body,status,created_at) VALUES(?,'out',?,'pending',?)").bind(lead.id, text, nowIso()).run();
    await env.DB.prepare("UPDATE leads SET last_message=?,last_at=?,stage=CASE WHEN stage='novo' THEN 'conversa' ELSE stage END WHERE id=?")
      .bind(text.slice(0, 300), nowIso(), lead.id).run();
    return json({ ok: true });
  }

  if (lm[2] === '/client' && m === 'POST') {
    const x = await input(req);
    const c = helpers.validClient({ name: lead.name || lead.phone, whatsapp: lead.phone, monthly_amount: x.monthly_amount, due_day: x.due_day, notes: lead.notes });
    const r = await env.DB.prepare('INSERT INTO clients(name,whatsapp,monthly_amount,due_day,notes) VALUES(?,?,?,?,?)').bind(c.name, c.whatsapp, c.amount, c.day, c.notes).run();
    await env.DB.prepare("UPDATE leads SET stage='pagamento' WHERE id=? AND stage NOT IN ('pago')").bind(lead.id).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }
  return fail('Rota não encontrada.', 404);
}
