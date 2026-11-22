/* Nexus CRM — leads do WhatsApp, conversas e ponte do QR Code (21/11/2026).
   Desde 22/11/2026 tudo é separado por conta (account_id). A conta vem do login
   (painel) ou da chave da ponte (PC de cada cliente). */
const STAGES = ['novo', 'conversa', 'agendado', 'pagamento', 'pago', 'perdido'];
export const TAGS = ['novo', 'quente', 'qualificado', 'urgente', 'frio'];
const cleanTags = v => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map(t => String(t).trim()).filter(t => TAGS.includes(t)))].join(',');
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

/* Estado real: se a ponte não dá sinal há 90 s, está desligada */
export async function waState(env, acc) {
  const s = await env.DB.prepare('SELECT wa_state,wa_qr,wa_seen_at,bridge_key FROM accounts WHERE id=?').bind(acc).first();
  if (!s) return { state: 'offline', qr: '', seen_at: null, bridge_key: '' };
  const fresh = s.wa_seen_at && Date.now() - Date.parse(s.wa_seen_at) < ONLINE_MS;
  return { state: fresh ? s.wa_state : 'offline', qr: fresh && s.wa_state === 'qr' ? s.wa_qr : '', seen_at: s.wa_seen_at, bridge_key: s.bridge_key };
}

async function leadById(env, acc, id) {
  return env.DB.prepare('SELECT * FROM leads WHERE id=? AND account_id=?').bind(id, acc).first();
}

/* Acha ou cria o lead pelo telefone */
async function leadByPhone(env, acc, phone, jid = '', name = '') {
  await env.DB.prepare('INSERT OR IGNORE INTO leads(account_id,phone,jid,name) VALUES(?,?,?,?)').bind(acc, phone, jid, clean(name, 150)).run();
  if (jid) await env.DB.prepare("UPDATE leads SET jid=? WHERE account_id=? AND phone=? AND (jid='' OR jid LIKE '%@lid')").bind(jid, acc, phone).run();
  if (name) await env.DB.prepare("UPDATE leads SET name=? WHERE account_id=? AND phone=? AND name=''").bind(clean(name, 150), acc, phone).run();
  return env.DB.prepare('SELECT * FROM leads WHERE account_id=? AND phone=?').bind(acc, phone).first();
}

/* Mensagens prontas de exemplo para uma conta nova */
export async function seedTemplates(env, acc) {
  const base = [
    ['Boas-vindas', 'Olá {nome}! Obrigado pelo contato. Como posso te ajudar?'],
    ['Preço', 'Oi {nome}! Vou te passar os valores agora. Você prefere plano mensal ou trimestral?'],
    ['Retorno', 'Oi {nome}, tudo bem? Passando para saber se você conseguiu ver a proposta.'],
  ];
  await env.DB.batch(base.map(([t, b]) => env.DB.prepare('INSERT INTO templates(account_id,title,body) VALUES(?,?,?)').bind(acc, t, b)));
}

/* Coloca uma mensagem na fila; a ponte do PC envia */
export async function queueMessage(env, acc, phone, text) {
  const lead = await leadByPhone(env, acc, fullPhone(phone));
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
  const key = (req.headers.get('x-bridge-key') || '').toLowerCase();
  const a = /^[a-f0-9]{40}$/.test(key) ? await env.DB.prepare('SELECT id FROM accounts WHERE bridge_key=? AND active=1').bind(key).first() : null;
  if (!a) return fail('Chave da ponte inválida.', 401);
  const acc = a.id;
  const p = url.pathname, m = req.method;

  if (p === '/api/bridge/status' && m === 'POST') {
    const x = await input(req);
    const state = ['qr', 'connecting', 'online'].includes(x.state) ? x.state : 'connecting';
    await env.DB.prepare('UPDATE accounts SET wa_state=?,wa_qr=?,wa_seen_at=? WHERE id=?').bind(state, clean(x.qr, 2000), nowIso(), acc).run();
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
      const lead = await leadByPhone(env, acc, phone, clean(msg.jid, 120), fromMe ? '' : msg.name);
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
      if (!fromMe) await env.DB.prepare(`UPDATE leads SET last_in_at=CASE WHEN last_in_at IS NULL OR ?>last_in_at THEN ? ELSE last_in_at END,
        followup_count=CASE WHEN ? THEN followup_count ELSE 0 END WHERE id=?`).bind(when, when, old ? 1 : 0, lead.id).run();
    }
    return json({ ok: true, saved });
  }

  if (p === '/api/bridge/outbox' && m === 'GET') {
    // Mensagem presa em "sending" por mais de 2 min volta para a fila
    await env.DB.prepare(`UPDATE messages SET status='pending' WHERE status='sending' AND direction='out' AND created_at < ?
      AND lead_id IN (SELECT id FROM leads WHERE account_id=?)`).bind(new Date(Date.now() - 120_000).toISOString(), acc).run();
    const rows = await env.DB.prepare(`SELECT m.id, m.body, l.phone, l.jid FROM messages m JOIN leads l ON l.id=m.lead_id
      WHERE l.account_id=? AND m.direction='out' AND m.status='pending' ORDER BY m.id LIMIT 10`).bind(acc).all();
    for (const r of rows.results) await env.DB.prepare("UPDATE messages SET status='sending' WHERE id=?").bind(r.id).run();
    return json({ messages: rows.results });
  }

  // Contatos que ainda não têm foto/nome/número real
  if (p === '/api/bridge/pending-info' && m === 'GET') {
    const old = new Date(Date.now() - 3 * 86400_000).toISOString();
    const r = await env.DB.prepare(`SELECT id, phone, jid, name FROM leads WHERE account_id=? AND phone NOT LIKE 'manual-%'
      AND (info_at IS NULL OR info_at < ? OR (jid LIKE '%@lid' AND info_at < ?)) ORDER BY COALESCE(last_at, created_at) DESC LIMIT 40`)
      .bind(acc, old, new Date(Date.now() - 3600_000).toISOString()).all();
    return json({ leads: r.results });
  }

  // A ponte devolve nome, foto e número real (troca o número escondido "@lid" pelo telefone)
  if (p === '/api/bridge/info' && m === 'POST') {
    const x = await input(req);
    let updated = 0;
    for (const it of (Array.isArray(x.items) ? x.items : []).slice(0, 60)) {
      const lead = await leadById(env, acc, Number(it.id));
      if (!lead) continue;
      let target = lead;
      const pn = digits(it.phone);
      if (pn && /^\d{12,13}$/.test(pn) && pn !== lead.phone) {
        const other = await env.DB.prepare('SELECT * FROM leads WHERE account_id=? AND phone=?').bind(acc, pn).first();
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
    await env.DB.prepare('UPDATE messages SET status=?, wa_id=COALESCE(?, wa_id) WHERE id=? AND lead_id IN (SELECT id FROM leads WHERE account_id=?)')
      .bind(x.ok ? 'sent' : 'failed', x.wa_id ? clean(x.wa_id, 120) : null, Number(done[1]), acc).run();
    return json({ ok: true });
  }
  return fail('Rota não encontrada.', 404);
}

/* Rotas do painel (já com login conferido). Retorna null se não for daqui. */
export async function crmApi(req, env, url, acc, helpers) {
  const p = url.pathname, m = req.method;

  if (p === '/api/whatsapp' && m === 'GET') return json(await waState(env, acc));

  if (p === '/api/followup' && m === 'GET') return json(await followupCfg(env, acc));
  if (p === '/api/followup' && m === 'PUT') {
    const x = await input(req);
    const days = Math.round(Number(x.days)), max = Math.round(Number(x.max_attempts));
    const message = clean(x.message, 1000);
    if (!(days >= 1 && days <= 60)) return fail('Dias: de 1 a 60.');
    if (!(max >= 1 && max <= 10)) return fail('Tentativas: de 1 a 10.');
    if (!message) return fail('Escreva a mensagem do follow-up.');
    const tag = TAGS.includes(x.tag) ? x.tag : 'quente';
    await env.DB.prepare('UPDATE accounts SET fu_enabled=?,fu_tag=?,fu_days=?,fu_max=?,fu_message=? WHERE id=?').bind(x.enabled ? 1 : 0, tag, days, max, message, acc).run();
    return json({ ok: true });
  }
  if (p === '/api/followup/run' && m === 'POST') return json(await followupFor(env, acc, true));

  // ===== Mensagens prontas =====
  if (p === '/api/templates' && m === 'GET') return json({ templates: (await env.DB.prepare('SELECT id,title,body FROM templates WHERE account_id=? ORDER BY title COLLATE NOCASE').bind(acc).all()).results });
  const tp = p.match(/^\/api\/templates(?:\/(\d+))?$/);
  if (tp && (m === 'POST' || m === 'PUT')) {
    const x = await input(req);
    const title = clean(x.title, 80), body = clean(x.body, 2000);
    if (!title || !body) return fail('Preencha o nome e o texto da mensagem.');
    if (m === 'POST') { const r = await env.DB.prepare('INSERT INTO templates(account_id,title,body) VALUES(?,?,?)').bind(acc, title, body).run(); return json({ ok: true, id: r.meta.last_row_id }, 201); }
    if (!tp[1]) return fail('Rota não encontrada.', 404);
    await env.DB.prepare('UPDATE templates SET title=?,body=? WHERE id=? AND account_id=?').bind(title, body, Number(tp[1]), acc).run();
    return json({ ok: true });
  }
  if (tp && tp[1] && m === 'DELETE') { await env.DB.prepare('DELETE FROM templates WHERE id=? AND account_id=?').bind(Number(tp[1]), acc).run(); return json({ ok: true }); }

  // ===== Tarefas =====
  if (p === '/api/tasks' && m === 'GET') {
    const lead = url.searchParams.get('lead_id');
    const r = lead
      ? await env.DB.prepare('SELECT t.*, l.name AS lead_name, l.phone AS lead_phone FROM tasks t LEFT JOIN leads l ON l.id=t.lead_id WHERE t.account_id=? AND t.lead_id=? ORDER BY t.done, t.due_at').bind(acc, Number(lead)).all()
      : await env.DB.prepare(`SELECT t.*, l.name AS lead_name, l.phone AS lead_phone FROM tasks t LEFT JOIN leads l ON l.id=t.lead_id
          WHERE t.account_id=? AND (t.done=0 OR t.done_at > ?) ORDER BY t.done, t.due_at LIMIT 300`).bind(acc, new Date(Date.now() - 7 * 86400_000).toISOString()).all();
    return json({ tasks: r.results });
  }
  const tk = p.match(/^\/api\/tasks(?:\/(\d+))?$/);
  if (tk && m === 'POST' && !tk[1]) {
    const x = await input(req);
    const title = clean(x.title, 200), due = Date.parse(x.due_at);
    if (!title) return fail('Escreva o que precisa ser feito.');
    if (!due) return fail('Escolha a data e a hora.');
    const leadId = x.lead_id ? Number(x.lead_id) : null;
    if (leadId && !(await leadById(env, acc, leadId))) return fail('Contato não encontrado.', 404);
    const r = await env.DB.prepare('INSERT INTO tasks(account_id,lead_id,title,due_at,created_at) VALUES(?,?,?,?,?)').bind(acc, leadId, title, new Date(due).toISOString(), nowIso()).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }
  if (tk && tk[1] && m === 'PUT') {
    const x = await input(req), id = Number(tk[1]);
    const t = await env.DB.prepare('SELECT * FROM tasks WHERE id=? AND account_id=?').bind(id, acc).first();
    if (!t) return fail('Tarefa não encontrada.', 404);
    const done = x.done !== undefined ? (x.done ? 1 : 0) : t.done;
    const title = x.title !== undefined ? clean(x.title, 200) : t.title;
    const due = x.due_at !== undefined ? new Date(Date.parse(x.due_at) || Date.parse(t.due_at)).toISOString() : t.due_at;
    await env.DB.prepare('UPDATE tasks SET done=?,title=?,due_at=?,done_at=? WHERE id=?').bind(done, title || t.title, due, done ? (t.done_at || nowIso()) : null, id).run();
    return json({ ok: true });
  }
  if (tk && tk[1] && m === 'DELETE') { await env.DB.prepare('DELETE FROM tasks WHERE id=? AND account_id=?').bind(Number(tk[1]), acc).run(); return json({ ok: true }); }

  if (p === '/api/leads' && m === 'GET') {
    const r = await env.DB.prepare(`SELECT id,phone,jid,name,stage,notes,value,avatar,tags,last_in_at,followup_count,followup_last,last_message,last_at,unread,created_at,
      (SELECT MIN(due_at) FROM tasks t WHERE t.lead_id=leads.id AND t.done=0) AS next_task FROM leads WHERE account_id=? ORDER BY COALESCE(last_at,created_at) DESC LIMIT 500`).bind(acc).all();
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
    const exists = await env.DB.prepare('SELECT id FROM leads WHERE account_id=? AND phone=?').bind(acc, phone).first();
    if (exists) return fail('Já existe um lead com esse telefone.', 409);
    const r = await env.DB.prepare('INSERT INTO leads(account_id,phone,name,stage,value,last_at,tags) VALUES(?,?,?,?,?,?,?)').bind(acc, phone, name, stage, value, nowIso(), cleanTags(x.tags)).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }

  const lm = p.match(/^\/api\/leads\/(\d+)(\/messages|\/client)?$/);
  if (!lm) return null;
  const lead = await leadById(env, acc, Number(lm[1]));
  if (!lead) return fail('Contato não encontrado.', 404);

  if (!lm[2] && m === 'PUT') {
    const x = await input(req);
    const name = x.name !== undefined ? clean(x.name, 150) : lead.name;
    const notes = x.notes !== undefined ? clean(x.notes, 4000) : lead.notes;
    const stage = x.stage !== undefined ? String(x.stage) : lead.stage;
    const value = x.value !== undefined ? Math.max(0, Math.round(Number(x.value) || 0)) : lead.value;
    const tags = x.tags !== undefined ? cleanTags(x.tags) : lead.tags;
    if (!STAGES.includes(stage)) return fail('Etapa inválida.');
    await env.DB.prepare('UPDATE leads SET name=?,notes=?,stage=?,value=?,tags=? WHERE id=?').bind(name, notes, stage, value, tags, lead.id).run();
    return json({ ok: true });
  }

  if (!lm[2] && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM messages WHERE lead_id=?').bind(lead.id).run();
    await env.DB.prepare('DELETE FROM tasks WHERE lead_id=?').bind(lead.id).run();
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
    const wa = await waState(env, acc);
    if (wa.state !== 'online') return fail('O WhatsApp não está conectado. Ligue a ponte no computador.', 409);
    await env.DB.prepare("INSERT INTO messages(lead_id,direction,body,status,created_at) VALUES(?,'out',?,'pending',?)").bind(lead.id, text, nowIso()).run();
    await env.DB.prepare("UPDATE leads SET last_message=?,last_at=?,stage=CASE WHEN stage='novo' THEN 'conversa' ELSE stage END WHERE id=?")
      .bind(text.slice(0, 300), nowIso(), lead.id).run();
    return json({ ok: true });
  }

  if (lm[2] === '/client' && m === 'POST') {
    const x = await input(req);
    const c = helpers.validClient({ name: lead.name || lead.phone, whatsapp: lead.phone, monthly_amount: x.monthly_amount, due_day: x.due_day, notes: lead.notes });
    const r = await env.DB.prepare('INSERT INTO clients(account_id,name,whatsapp,monthly_amount,due_day,notes) VALUES(?,?,?,?,?,?)').bind(acc, c.name, c.whatsapp, c.amount, c.day, c.notes).run();
    await env.DB.prepare("UPDATE leads SET stage='pagamento' WHERE id=? AND stage NOT IN ('pago')").bind(lead.id).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }
  return fail('Rota não encontrada.', 404);
}

async function followupCfg(env, acc) {
  const a = await env.DB.prepare('SELECT fu_enabled,fu_tag,fu_days,fu_max,fu_message FROM accounts WHERE id=?').bind(acc).first();
  return a ? { enabled: a.fu_enabled, tag: a.fu_tag, days: a.fu_days, max_attempts: a.fu_max, message: a.fu_message } : null;
}

/* Follow-up: manda mensagem para quem tem a etiqueta escolhida e está sem conversa há X dias */
async function followupFor(env, acc, manual = false) {
  const cfg = await followupCfg(env, acc);
  if (!cfg || (!cfg.enabled && !manual)) return { sent: 0, reason: 'desligado' };
  if ((await waState(env, acc)).state !== 'online') return { sent: 0, reason: 'WhatsApp desconectado' };
  const cut = new Date(Date.now() - cfg.days * 86400_000).toISOString();
  const r = await env.DB.prepare(`SELECT * FROM leads WHERE account_id=? AND (','||tags||',') LIKE ? AND followup_count < ?
    AND stage NOT IN ('pago','perdido') AND phone NOT LIKE 'manual-%' AND COALESCE(last_at, created_at) < ?
    AND (followup_last IS NULL OR followup_last < ?) ORDER BY last_at LIMIT 25`)
    .bind(acc, '%,' + cfg.tag + ',%', cfg.max_attempts, cut, cut).all();
  let sent = 0;
  for (const lead of r.results) {
    const first = (lead.name || '').trim().split(/\s+/)[0] || '';
    const text = cfg.message.replace(/\{nome\}/gi, first).replace(/\s+,/g, ',').trim();
    await env.DB.prepare("INSERT INTO messages(lead_id,direction,body,status,created_at) VALUES(?,'out',?,'pending',?)").bind(lead.id, text, nowIso()).run();
    await env.DB.prepare('UPDATE leads SET last_message=?, last_at=?, followup_count=followup_count+1, followup_last=? WHERE id=?')
      .bind(text.slice(0, 300), nowIso(), nowIso(), lead.id).run();
    sent++;
  }
  return { sent };
}

/* Agendador (a cada 30 min): roda o follow-up de cada conta ativa que ligou */
export async function runFollowup(env) {
  const r = await env.DB.prepare('SELECT id FROM accounts WHERE active=1 AND fu_enabled=1').all();
  let sent = 0;
  for (const a of r.results) sent += (await followupFor(env, a.id)).sent || 0;
  return { sent };
}
