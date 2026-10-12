// Brinde dentro do direct (igual ao fluxo "me siga primeiro"):
// 1) Comentou QUERO → direct "Me siga para receber o conteúdo 🎁" com o botão rápido "Já segui".
// 2) A pessoa toca em "Já segui" (ou escreve "segui").
//    - Não segue: "Você precisa me seguir primeiro" + botão "Já segui" de novo.
//    - Segue: mensagem com o botão "Baixar conteúdo", que abre a página do WhatsApp + brinde (/b/CODIGO).
// Sem acesso avançado da Meta o aviso na hora (webhook) não chega, então o NEXUS olha o direct a cada minuto.

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { giftLink, checkFollows } from "./gift.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";

export const ASK_TEXT = "Me siga para receber o conteúdo 🎁";
export const FOLLOWED_TITLE = "Já segui";
export const NOT_FOLLOWING_TEXT = "Você precisa me seguir primeiro 🙂";
export const READY_TEXT = "Pronto! Toque para baixar o seu conteúdo 🎁";
export const DOWNLOAD_TITLE = "Baixar conteúdo";
export const FOLLOWED_PATTERN = /\b(j[aá]\s*)?segui(ndo)?\b|\bto\s+seguindo\b|\bestou\s+seguindo\b/i;

const NAMESPACE = "gift-dm";
const PENDING_DAYS = 7;
const MAX_PENDING = 300;
const MAX_CONVERSATIONS = 10;
const MAX_ACTIONS_PER_RUN = 5;

export function askMessage(text = ASK_TEXT) {
  return { text, quick_replies: [{ content_type: "text", title: FOLLOWED_TITLE, payload: "GIFT_FOLLOWED" }] };
}

export function downloadMessage(url) {
  return { attachment: { type: "template", payload: { template_type: "button", text: READY_TEXT, buttons: [{ type: "web_url", url, title: DOWNLOAD_TITLE }] } } };
}

function parseJson(raw, fallback) {
  try { const v = JSON.parse(String(raw || "")); return v && typeof v === "object" ? v : fallback; } catch { return fallback; }
}

export async function readGiftDmState(env, clientId) {
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1")
    .bind(NAMESPACE, String(clientId)).first().catch(() => null);
  const value = parseJson(row?.value_json, {});
  return { ...value, pending: value.pending && typeof value.pending === "object" ? value.pending : {} };
}

async function writeGiftDmState(env, clientId, state, now = new Date()) {
  const limit = now.getTime() - PENDING_DAYS * 86400000;
  const kept = Object.entries(state.pending || {})
    .filter(([, v]) => Date.parse(String(v?.askedAt || "")) >= limit)
    .sort((a, b) => String(b[1]?.askedAt || "").localeCompare(String(a[1]?.askedAt || "")))
    .slice(0, MAX_PENDING);
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'state', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify({ ...state, pending: Object.fromEntries(kept) })).run();
}

// Anota que pedimos para esta pessoa seguir (chamado quando o direct do comentário sai).
export async function markGiftAsked(env, clientId, { igsid, username = "", commentId = "" }, now = new Date()) {
  if (!igsid || !env?.DB) return;
  const state = await readGiftDmState(env, clientId);
  const previous = state.pending[igsid] || {};
  state.pending[igsid] = { stage: "asked", username: String(username || previous.username || ""), commentId: String(commentId || ""), askedAt: now.toISOString(), handledUntil: now.toISOString() };
  await writeGiftDmState(env, clientId, state, now);
}

async function graph(request, token, path, options = {}) {
  const response = await request("https://graph.instagram.com/" + path, {
    ...options,
    headers: { authorization: "Bearer " + token, accept: "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(8000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.error?.message || "instagram_" + response.status).slice(0, 200));
    error.status = response.status;
    throw error;
  }
  return payload;
}

function sendTo(request, token, igUserId, igsid, message) {
  return graph(request, token, encodeURIComponent(igUserId) + "/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id: igsid }, message })
  });
}

// Última mensagem da pessoa (não nossa) mais nova que handledUntil e que diz "já segui".
export function followedReply(messages = [], igUserId = "", handledUntil = "") {
  const since = Date.parse(String(handledUntil || "")) || 0;
  const theirs = (Array.isArray(messages) ? messages : [])
    .filter(m => String(m?.from?.id || "") && String(m.from.id) !== String(igUserId))
    .filter(m => (Date.parse(String(m.created_time || "")) || 0) > since)
    .sort((a, b) => String(b.created_time || "").localeCompare(String(a.created_time || "")));
  const hit = theirs.find(m => FOLLOWED_PATTERN.test(String(m.message || "")));
  return hit || null;
}

// Responde a UMA pessoa que disse "Já segui": confere no Instagram e manda a resposta certa.
export async function respondToFollowed(env, client, { request = fetch, token, igUserId, handle, now = new Date() }, igsid, pending) {
  const out = { sent: 0, errors: [] };
  try {
    const check = await checkFollows({ request, token, igsid });
    if (check.follows === true) {
      const link = await giftLink(env, { clientId: client.id, igsid, commentId: pending.commentId, username: check.username || pending.username }, now);
      await sendTo(request, token, igUserId, igsid, downloadMessage(link)).catch(async error => {
        out.errors.push("button:" + error.message);
        await sendTo(request, token, igUserId, igsid, { text: READY_TEXT + " " + link });
      });
      pending.stage = "done";
      pending.doneAt = now.toISOString();
    } else if (check.follows === false) {
      await sendTo(request, token, igUserId, igsid, askMessage(NOT_FOLLOWING_TEXT + " Siga " + handle + " e toque em \"" + FOLLOWED_TITLE + "\"."));
      pending.stage = "not_following";
    } else {
      out.errors.push("follow_check:" + String(check.error || "unknown"));
      await sendTo(request, token, igUserId, igsid, askMessage("Não consegui conferir agora. Toque em \"" + FOLLOWED_TITLE + "\" de novo em 1 minuto."));
      pending.stage = "retry";
    }
    out.sent += 1;
  } catch (error) {
    out.errors.push("send:" + error.message);
  }
  return out;
}

// Mensagens que chegam pelo aviso da Meta (webhook "messages"): [{ igUserId, igsid, text, payload, at }]
export function followedFromWebhook(body = {}) {
  const out = [];
  for (const entry of Array.isArray(body.entry) ? body.entry : []) {
    for (const item of Array.isArray(entry.messaging) ? entry.messaging : []) {
      if (item?.message?.is_echo) continue;
      const text = String(item?.message?.text || item?.postback?.title || "");
      const payload = String(item?.message?.quick_reply?.payload || item?.postback?.payload || "");
      if (payload !== "GIFT_FOLLOWED" && !FOLLOWED_PATTERN.test(text)) continue;
      const ts = Number(item.timestamp || entry.time || 0);
      out.push({
        igUserId: String(entry.id || item?.recipient?.id || ""),
        igsid: String(item?.sender?.id || ""),
        text, payload,
        at: ts ? new Date(ts > 1e12 ? ts : ts * 1000).toISOString() : ""
      });
    }
  }
  return out.filter(x => x.igsid && x.igUserId);
}

// Responde na hora quem tocou em "Já segui" (usa a mesma regra da leitura a cada minuto).
export async function processWebhookFollowed(env, items, { request = fetch, now = new Date(), findClient } = {}) {
  const results = [];
  for (const item of items) {
    const found = findClient ? await findClient(item.igUserId) : null;
    if (!found) { results.push({ igsid: item.igsid, skipped: "unknown_account" }); continue; }
    const { client, conn } = found;
    const state = await readGiftDmState(env, client.id);
    const pending = state.pending[item.igsid];
    if (!pending || pending.stage === "done") { results.push({ igsid: item.igsid, skipped: pending ? "done" : "not_pending" }); continue; }
    const at = item.at || now.toISOString();
    if ((Date.parse(at) || 0) <= (Date.parse(String(pending.handledUntil || "")) || 0)) { results.push({ igsid: item.igsid, skipped: "already_handled" }); continue; }
    pending.handledUntil = at;
    const handle = "@" + String(conn?.username || client.instagram || "").replace(/^@/, "");
    const res = await respondToFollowed(env, client, { request, token: String(conn.accessToken || ""), igUserId: String(conn.igUserId || ""), handle, now }, item.igsid, pending);
    state.lastWebhook = { at: now.toISOString(), igsid: item.igsid, stage: pending.stage, errors: res.errors.slice(0, 3) };
    await writeGiftDmState(env, client.id, state, now).catch(() => null);
    results.push({ igsid: item.igsid, stage: pending.stage, sent: res.sent });
  }
  return results;
}

export async function runGiftInboxForClient(env, client, { request = fetch, now = new Date(), conn: given = null } = {}) {
  const out = { checked: 0, sent: 0, errors: [] };
  const state = await readGiftDmState(env, client.id);
  if (!Object.keys(state.pending).length) return { ...out, skipped: "nothing_pending" };
  const conn = given || await resolveInstagramCredentials(env, client.id);
  const token = String(conn?.accessToken || "");
  const igUserId = String(conn?.igUserId || "").trim();
  if (!token || !igUserId) return { ...out, skipped: "instagram_not_connected" };
  const handle = "@" + String(conn?.username || client.instagram || "").replace(/^@/, "");

  let conversations = [];
  try {
    const data = await graph(request, token, "me/conversations?platform=instagram&fields=updated_time,messages.limit(5){id,created_time,from,message}&limit=" + MAX_CONVERSATIONS);
    conversations = Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    out.errors.push("conversations:" + error.message);
  }

  let actions = 0;
  for (const conversation of conversations) {
    if (actions >= MAX_ACTIONS_PER_RUN) break;
    const messages = Array.isArray(conversation?.messages?.data) ? conversation.messages.data : [];
    const igsid = String(messages.map(m => m?.from?.id).find(id => id && String(id) !== igUserId) || "");
    const pending = igsid ? state.pending[igsid] : null;
    if (!pending || pending.stage === "done") continue;
    const reply = followedReply(messages, igUserId, pending.handledUntil);
    if (!reply) continue;
    out.checked += 1;
    actions += 1;
    pending.handledUntil = String(reply.created_time || now.toISOString());
    const res = await respondToFollowed(env, client, { request, token, igUserId, handle, now }, igsid, pending);
    out.sent += res.sent;
    out.errors.push(...res.errors);
  }
  state.lastRun = { at: now.toISOString(), conversations: conversations.length, checked: out.checked, sent: out.sent, errors: out.errors.slice(0, 5) };
  await writeGiftDmState(env, client.id, state, now).catch(() => null);
  return out;
}

export async function runGiftInbox(env, now = new Date(), options = {}) {
  const rows = await env.DB.prepare("SELECT id, name, instagram, status FROM clients WHERE status = 'online'").all().catch(() => ({ results: [] }));
  const results = {};
  for (const row of rows?.results || []) {
    if (BLOCKED_PUBLISH_CLIENTS.has(String(row.id)) || !brandProfileVersion(row.id)) continue;
    results[row.id] = await runGiftInboxForClient(env, row, { ...options, now }).catch(async error => {
      const message = String(error?.message || error).slice(0, 200);
      // Guarda o erro para aparecer no status (antes ele sumia).
      const state = await readGiftDmState(env, row.id).catch(() => null);
      if (state) await writeGiftDmState(env, row.id, { ...state, lastRun: { at: now.toISOString(), error: message } }, now).catch(() => null);
      return { error: message };
    });
  }
  return results;
}
