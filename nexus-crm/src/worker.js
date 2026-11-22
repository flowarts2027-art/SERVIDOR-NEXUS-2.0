/* Nexus CRM de Cobrança — Cloudflare Workers + D1. Valores em centavos. */
import { bridgeApi, crmApi, waState, queueMessage, runFollowup, seedTemplates } from './crm.js';
const enc = new TextEncoder();
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const error = (message,status=400) => json({error:message},status);
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits = v => String(v??'').replace(/\D/g,'');
const clean = (v,n=255) => String(v??'').trim().slice(0,n);
const currency = c => (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function today(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function due(month,day){const [y,m]=month.split('-').map(Number);return `${month}-${String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,'0')}`;}
function emv(id,value){const n=enc.encode(value).length;if(n>99)throw Error('Campo Pix muito longo.');return id+String(n).padStart(2,'0')+value;}
function crc16(value){let crc=0xffff;for(const b of enc.encode(value)){crc^=b<<8;for(let i=0;i<8;i++)crc=crc&0x8000?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0');}
function ascii(s,n){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 .-]/g,' ').replace(/\s+/g,' ').trim().toUpperCase().slice(0,n);}
function pix(cfg,cents,txid){if(!cfg.pix_key||!cfg.receiver_name||!cfg.receiver_city)throw Error('Configure os dados Pix.');const account=emv('00','br.gov.bcb.pix')+emv('01',cfg.pix_key);const payload=emv('00','01')+emv('26',account)+emv('52','0000')+emv('53','986')+emv('54',(cents/100).toFixed(2))+emv('58','BR')+emv('59',ascii(cfg.receiver_name,25))+emv('60',ascii(cfg.receiver_city,15))+emv('62',emv('05',txid));const base=payload+'6304';return base+crc16(base);}
async function sign(secret,msg){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(msg)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
/* Contas (22/11/2026): a conta 1 é a master (entra com a senha ADMIN_PASSWORD).
   Cada conta tem os próprios leads, conversas, cobranças e ponte do WhatsApp. */
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
function cookieFor(exp, acc, sig) {
  return `nexus_session=${exp}.${acc}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;
}
async function auth(req, env) {
  const match = (req.headers.get('Cookie') || '').match(/(?:^|;\s*)nexus_session=([^;]+)/);
  if (!match || !env.ADMIN_PASSWORD) return null;
  const [exp, acc, sig] = match[1].split('.');
  if (!exp || !acc || !sig || !/^\d+$/.test(exp) || !/^\d+$/.test(acc) || Number(exp) <= Date.now()) return null;
  if (!equal(sig, await sign(env.ADMIN_PASSWORD, `nexus:${exp}:${acc}`))) return null;
  const a = await env.DB.prepare('SELECT id,username,is_master,active,company_name FROM accounts WHERE id=?').bind(Number(acc)).first();
  return a && a.active ? a : null;
}
function pixKey(v){let k=clean(v,100);if(k.includes('@'))return k.toLowerCase();const d=digits(k);if(k.startsWith('+'))return '+'+d;if(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(k)||/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(k))return d;if(/^\(?\d{2}\)?\s?9\d{4}-?\d{4}$/.test(k)&&!/^\d{11}$/.test(k))return '+55'+d;return k;}
async function settings(env, acc) { return env.DB.prepare('SELECT company_name,pix_key,receiver_name,receiver_city FROM accounts WHERE id=?').bind(acc).first(); }
async function input(req){try{return await req.json();}catch{throw Error('JSON inválido.');}}
function validClient(x){const name=clean(x.name,150),whatsapp=digits(x.whatsapp),amount=Number(x.monthly_amount),day=Number(x.due_day),notes=clean(x.notes,2000);if(!name||!/^\d{10,13}$/.test(whatsapp)||!Number.isSafeInteger(amount)||amount<=0||!Number.isInteger(day)||day<1||day>31)throw Error('Dados do cliente inválidos.');return{name,whatsapp,amount,day,notes};}
async function client(env, acc, id) { return env.DB.prepare('SELECT * FROM clients WHERE id=? AND account_id=?').bind(id, acc).first(); }
async function charge(env, acc, c) {
  const month = today().slice(0, 7);
  let ch = await env.DB.prepare('SELECT * FROM charges WHERE client_id=? AND reference_month=?').bind(c.id, month).first();
  if (ch) return ch;
  const token = crypto.randomUUID().replace(/-/g, '');
  const code = pix(await settings(env, acc), c.monthly_amount, token.slice(0, 25).toUpperCase());
  await env.DB.prepare('INSERT OR IGNORE INTO charges(client_id,reference_month,amount,due_date,public_token,pix_code) VALUES(?,?,?,?,?,?)').bind(c.id, month, c.monthly_amount, due(month, c.due_day), token, code).run();
  return env.DB.prepare('SELECT * FROM charges WHERE client_id=? AND reference_month=?').bind(c.id, month).first();
}
function payPage(ch,cfg){const paid=ch.status==='paid',waiting=ch.status==='awaiting';return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Pagamento — ${esc(cfg.company_name)}</title><style>*{box-sizing:border-box}body{margin:0;background:#07182d;color:#fff;font:19px Arial,sans-serif;padding:25px 12px}main{max-width:540px;margin:auto;background:#102845;border:1px solid #315273;border-radius:20px;padding:25px;text-align:center}h1{font-size:30px}.amount{font-size:42px;color:#7ef7bb;font-weight:bold}button{width:100%;padding:18px;margin:9px 0;font-size:19px;font-weight:bold;border:0;border-radius:12px;cursor:pointer}.copy{background:#20cf84}.report{background:#f8b83d}code{display:block;background:#061423;padding:15px;overflow-wrap:anywhere;font-size:15px;text-align:left}#qr{background:white;padding:16px;width:max-content;max-width:100%;margin:20px auto}small{color:#c6d8e8}</style></head><body><main><h1>${esc(cfg.company_name||'Pagamento')}</h1><h2>${esc(ch.client_name)}</h2><p>Mensalidade — ${esc(ch.reference_month)}</p><p class="amount">${currency(ch.amount)}</p><p>Vencimento: ${ch.due_date.split('-').reverse().join('/')}</p>${paid?'<h2>Pagamento confirmado ✓</h2>':`<div id="qr"></div><p>Escaneie o QR Code ou copie o Pix:</p><code>${esc(ch.pix_code)}</code><button class="copy" onclick="copyPix()">Copiar código Pix</button><button class="report" onclick="reportPaid()" ${waiting?'disabled':''}>${waiting?'Aguardando confirmação':'Já paguei'}</button><p><small>A confirmação do pagamento é feita pela empresa.</small></p>`}</main><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>const pix=${JSON.stringify(ch.pix_code)};if(document.getElementById('qr')&&window.QRCode)new QRCode(document.getElementById('qr'),{text:pix,width:240,height:240,correctLevel:QRCode.CorrectLevel.M});async function copyPix(){try{await navigator.clipboard.writeText(pix);alert('Pix copiado!')}catch{prompt('Copie o Pix:',pix)}}async function reportPaid(){if(!confirm('Você já realizou o pagamento?'))return;const r=await fetch(location.pathname+'/confirmar',{method:'POST'});const x=await r.json();if(!r.ok)return alert(x.error||'Erro');alert('Aviso enviado. Aguarde a confirmação.');location.reload()}</script></body></html>`;}

/* Chave do servidor da ponte (Oracle): tirada da senha master, sem segredo novo */
const serverKey = env => sign(env.ADMIN_PASSWORD, 'nexus:ponte-servidor');

/* Painel master: criar, ativar, trocar senha e apagar contas */
async function accountsApi(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/accounts/server-key' && m === 'GET') return json({ key: await serverKey(env) });
  if (p === '/api/accounts' && m === 'GET') {
    const r = await env.DB.prepare(`SELECT a.id,a.username,a.company_name,a.active,a.is_master,a.created_at,a.wa_state,a.wa_seen_at,
      (SELECT COUNT(*) FROM leads l WHERE l.account_id=a.id) AS leads FROM accounts a ORDER BY a.is_master DESC, a.created_at DESC`).all();
    const fresh = s => s && Date.now() - Date.parse(s) < 90_000;
    return json({ accounts: r.results.map(a => ({ ...a, wa_state: fresh(a.wa_seen_at) ? a.wa_state : 'offline' })) });
  }
  if (p === '/api/accounts' && m === 'POST') {
    const x = await input(req);
    const username = clean(x.username, 30).toLowerCase(), password = String(x.password || ''), company = clean(x.company_name, 100);
    if (!/^[a-z0-9._-]{3,30}$/.test(username) || username === 'master') return error('Usuário: de 3 a 30 letras ou números, sem espaço e sem acento.');
    if (password.length < 6) return error('A senha precisa de pelo menos 6 caracteres.');
    if (await env.DB.prepare('SELECT 1 FROM accounts WHERE username=?').bind(username).first()) return error('Já existe uma conta com esse usuário.', 409);
    const salt = crypto.randomUUID();
    const r = await env.DB.prepare(`INSERT INTO accounts(username,salt,hash,company_name,is_master,active,bridge_key) VALUES(?,?,?,?,0,1,lower(hex(randomblob(20))))`)
      .bind(username, salt, await hashPassword(password, salt), company).run();
    await seedTemplates(env, r.meta.last_row_id);
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }
  const am = p.match(/^\/api\/accounts\/(\d+)$/);
  if (!am) return error('Rota não encontrada.', 404);
  const a = await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(Number(am[1])).first();
  if (!a) return error('Conta não encontrada.', 404);
  if (a.is_master) return error('A conta master não pode ser mudada aqui.', 403);
  if (m === 'PUT') {
    const x = await input(req);
    if (x.active !== undefined) await env.DB.prepare('UPDATE accounts SET active=? WHERE id=?').bind(x.active ? 1 : 0, a.id).run();
    if (x.password !== undefined) {
      const password = String(x.password || '');
      if (password.length < 6) return error('A senha precisa de pelo menos 6 caracteres.');
      const salt = crypto.randomUUID();
      await env.DB.prepare('UPDATE accounts SET salt=?,hash=? WHERE id=?').bind(salt, await hashPassword(password, salt), a.id).run();
    }
    if (x.company_name !== undefined) await env.DB.prepare('UPDATE accounts SET company_name=? WHERE id=?').bind(clean(x.company_name, 100), a.id).run();
    return json({ ok: true });
  }
  if (m === 'DELETE') {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM messages WHERE lead_id IN (SELECT id FROM leads WHERE account_id=?)').bind(a.id),
      env.DB.prepare('DELETE FROM tasks WHERE account_id=?').bind(a.id),
      env.DB.prepare('DELETE FROM leads WHERE account_id=?').bind(a.id),
      env.DB.prepare('DELETE FROM charges WHERE client_id IN (SELECT id FROM clients WHERE account_id=?)').bind(a.id),
      env.DB.prepare('DELETE FROM clients WHERE account_id=?').bind(a.id),
      env.DB.prepare('DELETE FROM templates WHERE account_id=?').bind(a.id),
      env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(a.id),
    ]);
    return json({ ok: true });
  }
  return error('Rota não encontrada.', 404);
}

async function api(req, env, url) {
  const p = url.pathname, m = req.method;
  if (m !== 'GET' && m !== 'HEAD') { const origin = req.headers.get('Origin'); if (origin && origin !== url.origin) return error('Origem não autorizada.', 403); }
  if (p === '/api/login' && m === 'POST') {
    if (!env.ADMIN_PASSWORD) return error('Configure ADMIN_PASSWORD.', 503);
    const x = await input(req);
    const user = clean(x.username, 30).toLowerCase(), pass = String(x.password || '');
    let acc = null;
    if (!user || user === 'master') {
      if (equal(pass, env.ADMIN_PASSWORD)) acc = await env.DB.prepare('SELECT * FROM accounts WHERE is_master=1 ORDER BY id LIMIT 1').first();
    } else {
      const row = await env.DB.prepare('SELECT * FROM accounts WHERE username=? AND is_master=0').bind(user).first();
      if (row && row.salt && equal(await hashPassword(pass, row.salt), row.hash)) acc = row;
    }
    if (!acc) return error('Usuário ou senha incorretos.', 401);
    if (!acc.active) return error('Esta conta está desativada. Fale com o administrador.', 403);
    const exp = String(Date.now() + 7 * 86400000), sig = await sign(env.ADMIN_PASSWORD, `nexus:${exp}:${acc.id}`);
    const r = json({ ok: true });
    r.headers.set('Set-Cookie', cookieFor(exp, acc.id, sig));
    return r;
  }
  if (p === '/api/logout' && m === 'POST') {
    const r = json({ ok: true });
    r.headers.set('Set-Cookie', 'nexus_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return r;
  }
  const me = await auth(req, env);
  if (!me) return error('Faça login.', 401);
  const acc = me.id;
  if (p === '/api/me' && m === 'GET') return json({ authenticated: true, username: me.is_master ? 'master' : me.username, is_master: !!me.is_master, company_name: me.company_name });
  if (p.startsWith('/api/accounts')) return me.is_master ? accountsApi(req, env, url) : error('Só a conta master pode fazer isso.', 403);
  if (p === '/api/settings') {
    if (m === 'GET') return json(await settings(env, acc));
    if (m === 'PUT') {
      const x = await input(req), v = [clean(x.company_name, 100), pixKey(x.pix_key), clean(x.receiver_name, 100), clean(x.receiver_city, 100)];
      if (v.some(x => !x)) return error('Preencha todos os campos.');
      await env.DB.prepare('UPDATE accounts SET company_name=?,pix_key=?,receiver_name=?,receiver_city=? WHERE id=?').bind(...v, acc).run();
      return json({ ok: true });
    }
  }
  if (p === '/api/clients' && m === 'GET') {
    const x = await env.DB.prepare('SELECT c.*,ch.id AS charge_id,ch.status AS charge_status,ch.paid_at FROM clients c LEFT JOIN charges ch ON ch.client_id=c.id AND ch.reference_month=? WHERE c.account_id=? ORDER BY c.name COLLATE NOCASE').bind(today().slice(0, 7), acc).all();
    return json({ clients: x.results, today: today() });
  }
  if (p === '/api/clients' && m === 'POST') {
    const x = validClient(await input(req));
    const r = await env.DB.prepare('INSERT INTO clients(account_id,name,whatsapp,monthly_amount,due_day,notes) VALUES(?,?,?,?,?,?)').bind(acc, x.name, x.whatsapp, x.amount, x.day, x.notes).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  }
  const cm = p.match(/^\/api\/clients\/(\d+)$/);
  if (cm) {
    const id = Number(cm[1]);
    if (!await client(env, acc, id)) return error('Cliente não encontrado.', 404);
    if (m === 'PUT') {
      const x = validClient(await input(req));
      await env.DB.prepare('UPDATE clients SET name=?,whatsapp=?,monthly_amount=?,due_day=?,notes=? WHERE id=? AND account_id=?').bind(x.name, x.whatsapp, x.amount, x.day, x.notes, id, acc).run();
      return json({ ok: true });
    }
    if (m === 'DELETE') { await env.DB.prepare('DELETE FROM clients WHERE id=? AND account_id=?').bind(id, acc).run(); return json({ ok: true }); }
  }
  const chm = p.match(/^\/api\/clients\/(\d+)\/charge$/);
  if (chm && m === 'POST') {
    const c = await client(env, acc, Number(chm[1]));
    if (!c) return error('Cliente não encontrado.', 404);
    const ch = await charge(env, acc, c), link = `${url.origin}/pagar/${ch.public_token}`, phone = c.whatsapp.startsWith('55') ? c.whatsapp : '55' + c.whatsapp;
    const msg = `Olá ${c.name}, sua mensalidade de ${currency(ch.amount)} vence dia ${ch.due_date.slice(8, 10)}. Para pagar pelo Pix, acesse: ${link}`;
    let sent = false;
    if ((await waState(env, acc)).state === 'online') { await queueMessage(env, acc, c.whatsapp, msg); sent = true; }
    return json({ charge: ch, payment_url: link, message: msg, sent, whatsapp_url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` });
  }
  const pm = p.match(/^\/api\/clients\/(\d+)\/paid$/);
  if (pm && m === 'POST') {
    const c = await client(env, acc, Number(pm[1]));
    if (!c) return error('Cliente não encontrado.', 404);
    const ch = await charge(env, acc, c);
    await env.DB.prepare("UPDATE charges SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE id=? AND status!='paid'").bind(ch.id).run();
    return json({ ok: true });
  }
  const hm = p.match(/^\/api\/clients\/(\d+)\/history$/);
  if (hm && m === 'GET') {
    if (!await client(env, acc, Number(hm[1]))) return error('Cliente não encontrado.', 404);
    const x = await env.DB.prepare('SELECT id,reference_month,amount,due_date,status,created_at,reported_at,paid_at FROM charges WHERE client_id=? ORDER BY reference_month DESC').bind(Number(hm[1])).all();
    return json({ history: x.results });
  }
  const crm = await crmApi(req, env, url, acc, { validClient });
  if (crm) return crm;
  return error('Rota não encontrada.', 404);
}

const PAY_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'";
export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(runFollowup(env).catch(e => console.error('followup', e))); },
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    try {
      if (p.startsWith('/api/bridge/')) return await bridgeApi(req, env, url);
      // Servidor da ponte 24h: pega a lista de contas ativas para ligar o WhatsApp de cada uma
      if (p === '/api/ponte-servidor/contas' && req.method === 'GET') {
        if (!env.ADMIN_PASSWORD || !equal(req.headers.get('x-server-key') || '', await serverKey(env))) return error('Chave do servidor inválida.', 401);
        const r = await env.DB.prepare('SELECT id, bridge_key FROM accounts WHERE active=1 ORDER BY id').all();
        return json({ accounts: r.results });
      }
      if (p.startsWith('/api/')) return await api(req, env, url);
      const match = p.match(/^\/pagar\/([a-f0-9]{32})$/);
      if (match && req.method === 'GET') {
        const ch = await env.DB.prepare('SELECT ch.*,c.name AS client_name,c.account_id FROM charges ch JOIN clients c ON c.id=ch.client_id WHERE ch.public_token=?').bind(match[1]).first();
        if (!ch) return new Response('Cobrança não encontrada.', { status: 404 });
        return new Response(payPage(ch, await settings(env, ch.account_id)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': PAY_CSP } });
      }
      const confirm = p.match(/^\/pagar\/([a-f0-9]{32})\/confirmar$/);
      if (confirm && req.method === 'POST') {
        await env.DB.prepare("UPDATE charges SET status='awaiting',reported_at=CURRENT_TIMESTAMP WHERE public_token=? AND status='pending'").bind(confirm[1]).run();
        const ch = await env.DB.prepare('SELECT status FROM charges WHERE public_token=?').bind(confirm[1]).first();
        return ch ? json({ ok: true, status: ch.status }) : error('Cobrança não encontrada.', 404);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return error('Método não permitido.', 405);
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e);
      if (/inválid|Configure os dados Pix|Preencha|muito longo|Digite/.test(e.message)) return error(e.message);
      return error('Não foi possível concluir a operação.', 500);
    }
  }
};
