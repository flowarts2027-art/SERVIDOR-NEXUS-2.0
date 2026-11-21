/* Ponte do WhatsApp do Nexus CRM (21/11/2026).
   Fica ligada no PC: mostra o QR Code no CRM, leva as mensagens recebidas
   para o CRM e envia as mensagens que saem do CRM. */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');
const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason,
  fetchLatestBaileysVersion, Browsers
} = require('@whiskeysockets/baileys');

const DIR = __dirname;
const CONFIG = path.join(DIR, 'config.json');
const AUTH = path.join(DIR, 'sessao-whatsapp');
const CRM = (process.env.CRM_URL || 'https://nexus-crm.diamantehinode2015.workers.dev').replace(/\/$/, '');
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), '-', ...a);

let key = '';
let sock = null;
let state = 'connecting';
let qr = '';
const sentByMe = new Set();   // ids que a própria ponte enviou (não repetir no CRM)
let sending = false;

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

async function loadKey() {
  try { key = JSON.parse(fs.readFileSync(CONFIG, 'utf8')).key || ''; } catch {}
  while (!/^[a-f0-9]{40}$/.test(key)) {
    console.log('\nAbra o CRM, vá na aba WhatsApp e clique em "Copiar chave".');
    key = (await ask('Cole aqui a chave da ponte e aperte Enter: ')).toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(key)) console.log('Essa chave não parece certa. Tente de novo.');
  }
  fs.writeFileSync(CONFIG, JSON.stringify({ key }, null, 2));
}

async function crm(p, method = 'GET', body) {
  const r = await fetch(CRM + p, {
    method,
    headers: { 'content-type': 'application/json', 'x-bridge-key': key },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401) {
    console.log('\nA chave da ponte foi recusada pelo CRM. Apagando e pedindo de novo...');
    try { fs.unlinkSync(CONFIG); } catch {}
    process.exit(1);
  }
  if (!r.ok) throw new Error('CRM respondeu ' + r.status);
  return r.json();
}

async function report() {
  try { await crm('/api/bridge/status', 'POST', { state, qr }); }
  catch (e) { log('Sem conexão com o CRM:', e.message); }
}

/* Telefone do contato. Contas novas do WhatsApp usam "@lid"; aí usamos o número real quando vier. */
function contact(k) {
  let jid = k.remoteJid || '';
  if (jid.endsWith('@lid')) jid = k.remoteJidAlt || k.senderPn || jid;
  const phone = jid.split('@')[0].split(':')[0];
  return { jid, phone };
}

function textOf(m) {
  const x = m.message || {};
  const inner = x.ephemeralMessage?.message || x.viewOnceMessage?.message || x;
  if (inner.conversation) return inner.conversation;
  if (inner.extendedTextMessage?.text) return inner.extendedTextMessage.text;
  if (inner.imageMessage) return '📷 Foto' + (inner.imageMessage.caption ? ': ' + inner.imageMessage.caption : '');
  if (inner.videoMessage) return '🎬 Vídeo' + (inner.videoMessage.caption ? ': ' + inner.videoMessage.caption : '');
  if (inner.audioMessage) return '🎤 Áudio';
  if (inner.documentMessage) return '📄 Documento: ' + (inner.documentMessage.fileName || '');
  if (inner.stickerMessage) return '🙂 Figurinha';
  if (inner.locationMessage) return '📍 Localização';
  if (inner.contactMessage) return '👤 Contato: ' + (inner.contactMessage.displayName || '');
  if (inner.buttonsResponseMessage?.selectedDisplayText) return inner.buttonsResponseMessage.selectedDisplayText;
  if (inner.listResponseMessage?.title) return inner.listResponseMessage.title;
  return '';
}

function pack(m, history) {
  const jid = m.key?.remoteJid || '';
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@newsletter') || jid.endsWith('@broadcast')) return null;
  if (m.key.fromMe && sentByMe.has(m.key.id)) return null;
  const body = textOf(m);
  if (!body) return null;
  const c = contact(m.key);
  return {
    wa_id: m.key.id, phone: c.phone, jid: c.jid, name: m.key.fromMe ? '' : (m.pushName || ''),
    body, from_me: !!m.key.fromMe, history: !!history,
    ts: Number(m.messageTimestamp?.low ?? m.messageTimestamp) || Math.floor(Date.now() / 1000)
  };
}

async function sendBatches(list, label) {
  for (let i = 0; i < list.length; i += 50) {
    try { await crm('/api/bridge/inbound', 'POST', { messages: list.slice(i, i + 50) }); }
    catch (e) { log('Erro ao levar mensagens ao CRM:', e.message); }
  }
  if (list.length) log(list.length, label);
}

/* Conversas antigas (últimos 30 dias), que o WhatsApp manda logo depois de conectar */
async function onHistory({ messages }) {
  const limit = Date.now() / 1000 - 30 * 86400;
  const out = (messages || []).map(m => pack(m, true)).filter(x => x && x.ts >= limit);
  await sendBatches(out, 'mensagem(ns) antiga(s) levada(s) ao CRM');
}

async function onMessages({ messages, type }) {
  if (type === 'append') return onHistory({ messages });
  if (type !== 'notify') return;
  const out = [];
  for (const m of messages) {
    const x = pack(m, false);
    if (x) out.push(x);
  }
  await sendBatches(out, 'mensagem(ns) nova(s) levada(s) ao CRM');
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/* Envia o que está na fila do CRM, com intervalo para não parecer robô */
async function sendQueue() {
  if (sending || state !== 'online' || !sock) return;
  sending = true;
  try {
    const { messages } = await crm('/api/bridge/outbox');
    for (const m of messages) {
      try {
        let to = m.jid && (m.jid.endsWith('@s.whatsapp.net') || m.jid.endsWith('@lid')) ? m.jid : '';
        if (!to) {
          const [r] = await sock.onWhatsApp(m.phone);
          if (!r?.exists) throw new Error('número sem WhatsApp');
          to = r.jid;
        }
        const res = await sock.sendMessage(to, { text: m.body });
        if (res?.key?.id) sentByMe.add(res.key.id);
        await crm('/api/bridge/outbox/' + m.id, 'POST', { ok: true, wa_id: res?.key?.id });
        log('Mensagem enviada para', m.phone);
      } catch (e) {
        log('Falhou para', m.phone, '-', e.message);
        await crm('/api/bridge/outbox/' + m.id, 'POST', { ok: false });
      }
      await wait(2000 + Math.random() * 3000);
    }
  } catch (e) {
    log('Erro na fila:', e.message);
  } finally { sending = false; }
}

async function connect() {
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}
  sock = makeWASocket({
    version, auth,
    logger: pino({ level: 'silent' }),
    browser: Browsers.windows('Nexus CRM'),
    markOnlineOnConnect: false,   // o celular continua recebendo notificação
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => true
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', onMessages);
  sock.ev.on('messaging-history.set', onHistory);
  sock.ev.on('connection.update', async u => {
    if (u.qr) {
      state = 'qr'; qr = u.qr;
      log('QR Code novo. Abra o CRM > WhatsApp e escaneie com o celular.');
      await report();
    }
    if (u.connection === 'open') {
      state = 'online'; qr = '';
      log('WhatsApp CONECTADO ✔  Pode minimizar esta janela, mas não feche.');
      await report();
    }
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      state = 'connecting'; qr = '';
      await report();
      if (code === DisconnectReason.loggedOut) {
        log('O WhatsApp foi desconectado pelo celular. Gerando um QR Code novo...');
        fs.rmSync(AUTH, { recursive: true, force: true });
      } else {
        log('Conexão caiu (código ' + code + '). Reconectando...');
      }
      setTimeout(connect, 3000);
    }
  });
}

(async () => {
  console.log('==============================================');
  console.log('   NEXUS CRM - Ponte do WhatsApp');
  console.log('   Deixe esta janela aberta enquanto usa o CRM');
  console.log('==============================================');
  await loadKey();
  await report();
  await connect();
  setInterval(report, 20000);     // sinal de vida para o CRM
  setInterval(sendQueue, 3000);   // envia o que sair do CRM
})().catch(e => { console.error('Erro:', e); process.exit(1); });
