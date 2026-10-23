// Auto-responder de comentários do Instagram (funil "QUERO" / "EXEMPLO").
// A cada execução do cron: lê comentários recentes dos últimos posts, e para cada
// comentário com palavra de interesse responde UMA vez:
//   1) DM privada (private reply) com o link do WhatsApp da marca;
//   2) resposta pública curta no comentário.
// Limites: poucos posts e poucas respostas por execução (orçamento de chamadas do Worker).

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { clientBrand, brandProfileVersion, whatsappLink } from "./client-brand.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { masterInstagramCredentials } from "./instagram.js";
import { giftStatus, giftButtonMessage, giftLink, checkFollows } from "./gift.js";
import { materialForComment } from "./gift-materials.js";
import { clientAutoReplyConfig, buildDmMessage, matchesKeyword } from "./client-autoreply.js";
import { dmTextsFromWebhook, processWebhookDmKeywords } from "./dm-keyword-reply.js";
import { ASK_TEXT, READY_TEXT, DOWNLOAD_TITLE, askMessage, markGiftAsked, markGiftDone, readGiftDmState, followedFromWebhook, processWebhookFollowed } from "./gift-dm.js";

const NAMESPACE = "comment-autoreply";
const MAX_MEDIA = 4;
const MAX_REPLIES_PER_RUN = 3;
const MAX_ATTEMPTS = 2;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // a Meta só aceita resposta privada até 7 dias

export const INTEREST_PATTERN = /\b(eu\s+)?quero\b|\bexemplo\b|\binforma[çc][aã]o\b|\binfo\b|\bpre[çc]o\b|\bvalor(es)?\b|\bquanto\s+custa\b|\bcomo\s+funciona\b/i;

export function wantsReply(text = "") {
  // QUERO e as palavras antigas, mais SITE e REELS (cada uma com o seu conteúdo).
  return materialForComment(text) !== null;
}

export function dmText(client) {
  const brand = clientBrand(client);
  const link = whatsappLink(client, "Olá! Comentei no Instagram da " + brand.brandName + " e quero receber o exemplo grátis.");
  return [
    "Oi! 👋 Que bom que você se interessou.",
    "A " + brand.brandName + " cria marketing e automação de Instagram com IA para pequenos negócios.",
    "Chama a gente no WhatsApp e receba um exemplo grátis para o seu negócio:",
    link
  ].join("\n");
}

// Mensagem do direct para UM comentário:
// - se o Instagram já deixa ver que a pessoa segue: manda direto o botão "Baixar conteúdo";
// - senão: "Me siga para receber o conteúdo" + botão "Já segui" (o resto é no direct, gift-dm.js).
// Sem banco/chave, volta para o texto simples do WhatsApp.
export function messageBuilder(env, client, handle = "", { token = "", request = fetch } = {}) {
  return async (comment = {}, now = new Date()) => {
    const igsid = String(comment.fromId || comment.from?.id || "");
    if (!igsid || !env?.DB || !String(env?.NEXUS_SECRET_KEY || "").trim()) return dmText(client);
    const username = comment.username || comment.from?.username || "";
    const topic = materialForComment(comment.text) || "guia";
    try {
      await markGiftAsked(env, client.id, { igsid, username, commentId: comment.id, topic }, now);
      if (token) {
        const check = await checkFollows({ request, token, igsid }).catch(() => ({ follows: null }));
        if (check.follows === true) {
          const url = await giftLink(env, { clientId: client.id, igsid, commentId: comment.id, username: check.username || username, topic }, now);
          await markGiftDone(env, client.id, igsid, now).catch(() => null);
          return { text: READY_TEXT, buttonTitle: DOWNLOAD_TITLE, url };
        }
      }
      return { kind: "ask", text: ASK_TEXT };
    } catch {
      return dmText(client);
    }
  };
}

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

async function readState(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1"
  ).bind(NAMESPACE, String(clientId)).first().catch(() => null);
  const value = row ? parseJson(row.value_json, {}) : {};
  return { handled: value.handled && typeof value.handled === "object" ? value.handled : {}, ...value };
}

async function writeState(env, clientId, state) {
  const entries = Object.entries(state.handled || {}).sort((a, b) => String(b[1]?.at || "").localeCompare(String(a[1]?.at || ""))).slice(0, 400);
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'state', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify({ ...state, handled: Object.fromEntries(entries) })).run();
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

// Responde UM comentário (DM privada + resposta pública), uma vez por comentário.
// Usado pela leitura a cada 15 min e pelo webhook da Meta (aviso na hora).
// matches/publicText (22/10): resposta automática de outros clientes, com as palavras e a frase escolhidas no painel.
export async function replyToComment({ request = fetch, token, igUserId, ownUsername = "", state, message, now = new Date(), matches = null, publicText = "Te chamei no direct! 📩" }, comment = {}) {
  const res = { checked: false, replied: false, errors: [], skipped: "" };
  const id = String(comment.id || "");
  const username = String(comment.username || comment.from?.username || "").replace(/^@/, "").toLowerCase();
  const fromId = String(comment.fromId || comment.from?.id || "");
  const createdMs = Date.parse(String(comment.timestamp || ""));
  // A Meta nem sempre manda o nome de quem comentou; basta o id do comentário e de quem comentou.
  if (!id || (!username && !fromId)) { res.skipped = "incomplete"; return res; }
  if ((username && username === String(ownUsername || "").toLowerCase()) || (fromId && fromId === String(igUserId || ""))) { res.skipped = "own_comment"; return res; }
  if (!(typeof matches === "function" ? matches(comment.text) : wantsReply(comment.text))) { res.skipped = "no_interest_word"; return res; }
  if (Number.isFinite(createdMs) && now.getTime() - createdMs > WINDOW_MS) { res.skipped = "too_old"; return res; }
  const previous = state.handled[id] || {};
  if (previous.status === "sent" || Number(previous.attempts || 0) >= MAX_ATTEMPTS) { res.skipped = "already_handled"; return res; }
  res.checked = true;
  try {
    const built = typeof message === "function" ? await message(comment, now) : message;
    const send = body => graph(request, token, encodeURIComponent(igUserId) + "/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: { comment_id: id }, message: body })
    });
    if (built && built.kind === "ask") {
      // Frase + botão rápido "Já segui". Se o Instagram recusar, pede para responder SEGUI.
      await send(askMessage(built.text)).catch(async error => {
        res.errors.push("quick_reply:" + error.message);
        await send({ text: built.text + " Depois responda SEGUI aqui." });
      });
    } else if (built && typeof built === "object") {
      // Frase + botão. Se o Instagram recusar o botão, manda a frase com o link.
      await send(giftButtonMessage(built)).catch(async error => {
        res.errors.push("button:" + error.message);
        await send({ text: built.text + " " + built.url });
      });
    } else {
      await send({ text: String(built || "") });
    }
    await graph(request, token, encodeURIComponent(id) + "/replies", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ message: publicText || "Te chamei no direct! 📩" })
    }).catch(error => res.errors.push("public_reply:" + error.message));
    state.handled[id] = { status: "sent", username: username || fromId, at: now.toISOString(), attempts: Number(previous.attempts || 0) + 1 };
    res.replied = true;
  } catch (error) {
    state.handled[id] = { status: "error", username: username || fromId, at: now.toISOString(), attempts: Number(previous.attempts || 0) + 1, error: error.message };
    res.errors.push("dm:" + error.message);
  }
  return res;
}

// Pede à Meta para avisar o NEXUS (webhook) sobre comentários e mensagens desta conta.
// Refeito no máximo uma vez por dia; o resultado fica em state.webhook.
async function tokenTag(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token || "")));
  return [...new Uint8Array(digest)].slice(0, 6).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function ensureWebhookSubscription(request, token, state, now) {
  const last = Date.parse(String(state.webhook?.at || ""));
  const tag = await tokenTag(token);
  // Refaz quando a conexão (token) muda, por exemplo ao trocar de app, ou a cada 24 h.
  if (Number.isFinite(last) && now.getTime() - last < 24 * 3600000 && state.webhook?.ok && state.webhook?.tag === tag) return state.webhook;
  try {
    const data = await graph(request, token, "me/subscribed_apps?subscribed_fields=comments,messages", { method: "POST" });
    state.webhook = { ok: data?.success !== false, at: now.toISOString(), error: "", tag };
  } catch (error) {
    state.webhook = { ok: false, at: now.toISOString(), error: String(error.message || error).slice(0, 160), tag };
  }
  return state.webhook;
}

export async function runCommentAutoReplyForClient(env, client, { request = fetch, now = new Date(), custom = null } = {}) {
  const out = { checked: 0, replied: 0, errors: [], seen: [] };
  const conn = await resolveInstagramCredentials(env, client.id);
  const token = String(conn?.accessToken || "");
  const igUserId = String(conn?.igUserId || "").trim();
  if (!token || !igUserId) return { ...out, skipped: "instagram_not_connected" };
  const ownUsername = String(conn?.username || client.instagram || "").replace(/^@/, "").toLowerCase();

  const state = await readState(env, client.id);
  await ensureWebhookSubscription(request, token, state, now);
  let media = { data: [] };
  try {
    media = await graph(request, token, encodeURIComponent(igUserId) + "/media?fields=id,timestamp,comments_count&limit=" + MAX_MEDIA);
  } catch (error) {
    out.errors.push("media:" + error.message);
  }
  // Cliente com resposta própria (painel): texto simples com o WhatsApp dele, palavras dele.
  const message = custom ? buildDmMessage(client, custom) : messageBuilder(env, client, ownUsername, { token, request });
  const extra = custom ? { matches: text => matchesKeyword(text, custom.keywords), publicText: custom.publicReply } : {};

  for (const item of Array.isArray(media?.data) ? media.data : []) {
    if (out.replied >= MAX_REPLIES_PER_RUN) break;
    let comments = [];
    try {
      const data = await graph(request, token, encodeURIComponent(String(item.id)) + "/comments?fields=id,text,username,timestamp,from&limit=50");
      comments = Array.isArray(data?.data) ? data.data : [];
      out.seen.push({ media: String(item.id), count: comments.length, igCount: Number(item.comments_count ?? -1), sample: comments.slice(0, 3).map(c => [String(c.username || c.from?.username || "?").slice(0, 30), String(c.text || "").slice(0, 30)]) });
    } catch (error) {
      out.errors.push("comments:" + error.message);
      continue;
    }
    for (const comment of comments) {
      if (out.replied >= MAX_REPLIES_PER_RUN) break;
      const result = await replyToComment({ request, token, igUserId, ownUsername, state, message, now, ...extra }, comment);
      if (result.checked) out.checked += 1;
      if (result.replied) out.replied += 1;
      out.errors.push(...result.errors);
    }
  }
  state.lastRun = { at: now.toISOString(), checked: out.checked, replied: out.replied, errors: out.errors.slice(0, 5), seen: out.seen.slice(0, MAX_MEDIA), mediaCount: Array.isArray(media?.data) ? media.data.length : 0 };
  await writeState(env, client.id, state).catch(() => null);
  return out;
}

// Roda para clientes ativos com perfil de marca e WhatsApp (hoje: Flow Arts).
export async function runCommentAutoReplies(env, now = new Date(), options = {}) {
  const rows = await env.DB.prepare("SELECT id, name, niche, instagram, status, config_json FROM clients WHERE status = 'online'").all().catch(() => ({ results: [] }));
  const results = {};
  for (const row of rows?.results || []) {
    if (BLOCKED_PUBLISH_CLIENTS.has(String(row.id))) continue;
    const client = { ...row, config: parseJson(row.config_json, {}) };
    let custom = null;
    if (!brandProfileVersion(row.id) || !clientBrand(client).whatsapp) {
      // 22/10: outros clientes só respondem se ligaram a resposta automática no painel.
      custom = await clientAutoReplyConfig(env, client).catch(() => null);
      if (!custom?.enabled) continue;
    }
    results[row.id] = await runCommentAutoReplyForClient(env, client, { ...options, now, custom }).catch(error => ({ error: String(error?.message || error).slice(0, 200) }));
  }
  return results;
}

export async function commentAutoReplyStatus(env, clientId) {
  const state = await readState(env, clientId);
  const handled = Object.entries(state.handled || {}).slice(0, 20).map(([id, value]) => ({ id, ...value }));
  const gift = await giftStatus(env, clientId).catch(() => null);
  const giftDm = await readGiftDmState(env, clientId).then(v => ({ lastRun: v.lastRun || null, lastWebhook: v.lastWebhook || null, pending: Object.entries(v.pending || {}).slice(0, 10).map(([id, p]) => ({ id, stage: p.stage, username: p.username, askedAt: p.askedAt })) })).catch(() => null);
  const webhookLog = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace='ig-webhook-log' AND item_key='state' AND client_id='_' LIMIT 1").first().then(r => parseJson(r?.value_json, {}).items || []).catch(() => []);
  return { webhookLog: webhookLog.slice(0, 5), giftDm, lastRun: state.lastRun || null, webhook: state.webhook || null, lastWebhook: state.lastWebhook || null, recent: handled, gift };
}


// ---------- Webhook da Meta (aviso na hora de cada comentário) ----------

export const WEBHOOK_PATH = "/api/meta/instagram/webhook";

function hexOf(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function validMetaSignature(rawBody, header, secret) {
  const sig = String(header || "").replace(/^sha256=/, "").trim().toLowerCase();
  if (!sig || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hexOf(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function webhookVerifyToken(env) {
  return String(env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "nexus-flowarts-instagram").trim();
}

// Extrai comentários do corpo do webhook: [{ igUserId, comment }]
export function commentsFromWebhook(body = {}) {
  const out = [];
  for (const entry of Array.isArray(body.entry) ? body.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (String(change.field) !== "comments" || !change.value) continue;
      const v = change.value;
      out.push({
        igUserId: String(entry.id || ""),
        comment: {
          id: String(v.id || ""),
          text: String(v.text || ""),
          username: String(v.from?.username || ""),
          fromId: String(v.from?.id || ""),
          mediaId: String(v.media?.id || ""),
          timestamp: entry.time ? new Date(Number(entry.time) * (Number(entry.time) > 1e12 ? 1 : 1000)).toISOString() : ""
        }
      });
    }
  }
  return out;
}

// O aviso da Meta usa o "user_id" da conta profissional, que é diferente do "id"
// guardado no login. Pergunta o user_id ao Instagram uma vez e guarda.
async function webhookAccountId(env, clientId, conn, request = fetch) {
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace='ig-webhook-id' AND item_key='state' AND client_id=?1 LIMIT 1")
    .bind(String(clientId)).first().catch(() => null);
  const cached = parseJson(row?.value_json, {});
  const tag = await tokenTag(conn?.accessToken || "");
  if (cached.userId && cached.tag === tag) return String(cached.userId);
  try {
    const me = await graph(request, String(conn.accessToken || ""), "me?fields=user_id,username");
    const userId = String(me?.user_id || "");
    if (userId) {
      await env.DB.prepare(
        `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
         VALUES('ig-webhook-id', 'state', ?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
      ).bind(String(clientId), JSON.stringify({ userId, tag })).run().catch(() => null);
    }
    return userId;
  } catch {
    return "";
  }
}

export async function clientForInstagramUser(env, igUserId, { request = fetch } = {}) {
  const rows = await env.DB.prepare("SELECT id, name, niche, instagram, status, config_json FROM clients WHERE status = 'online'").all().catch(() => ({ results: [] }));
  const target = String(igUserId || "");
  for (const row of rows?.results || []) {
    if (BLOCKED_PUBLISH_CLIENTS.has(String(row.id))) continue;
    const conn = await resolveInstagramCredentials(env, row.id).catch(() => null);
    if (!conn?.accessToken) continue;
    const found = { client: { ...row, config: parseJson(row.config_json, {}) }, conn };
    if (conn.igUserId && String(conn.igUserId) === target) return found;
    if (target && await webhookAccountId(env, row.id, conn, request) === target) return found;
  }
  return null;
}

// Resumo dos últimos avisos da Meta (sem textos), para conferir no status.
async function logWebhook(env, summary) {
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace='ig-webhook-log' AND item_key='state' AND client_id='_' LIMIT 1").first().catch(() => null);
  const list = Array.isArray(parseJson(row?.value_json, {}).items) ? parseJson(row?.value_json, {}).items : [];
  const items = [summary, ...list].slice(0, 10);
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('ig-webhook-log', 'state', '_', ?1, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(JSON.stringify({ items })).run().catch(() => null);
}

export function webhookSummary(body = {}, now = new Date()) {
  const entries = Array.isArray(body.entry) ? body.entry : [];
  return {
    at: now.toISOString(),
    object: String(body.object || ""),
    entries: entries.slice(0, 3).map(e => ({
      id: String(e.id || ""),
      changes: (Array.isArray(e.changes) ? e.changes : []).map(c => String(c.field || "")).slice(0, 5),
      messaging: (Array.isArray(e.messaging) ? e.messaging : []).map(m => Object.keys(m || {}).filter(k => !["sender", "recipient", "timestamp"].includes(k)).join("+") + (m?.message?.is_echo ? "(echo)" : "") + (m?.message?.quick_reply ? "(quick_reply)" : "")).slice(0, 5)
    }))
  };
}

export async function processWebhookComments(env, items, { request = fetch, now = new Date() } = {}) {
  const results = [];
  for (const { igUserId, comment } of items) {
    const found = await clientForInstagramUser(env, igUserId);
    if (!found) { results.push({ comment: comment.id, skipped: "unknown_account" }); continue; }
    const { client, conn } = found;
    let custom = null;
    if (!brandProfileVersion(client.id) || !clientBrand(client).whatsapp) {
      custom = await clientAutoReplyConfig(env, client).catch(() => null);
      if (!custom?.enabled) { results.push({ comment: comment.id, skipped: "no_brand" }); continue; }
    }
    const state = await readState(env, client.id);
    const own = String(conn.username || client.instagram || "").replace(/^@/, "");
    const res = await replyToComment({
      request, token: String(conn.accessToken || ""), igUserId: String(conn.igUserId || ""),
      ownUsername: own, state, now,
      message: custom ? buildDmMessage(client, custom) : messageBuilder(env, client, own, { token: String(conn.accessToken || ""), request }),
      ...(custom ? { matches: text => matchesKeyword(text, custom.keywords), publicText: custom.publicReply } : {})
    }, comment);
    state.lastWebhook = { at: now.toISOString(), comment: comment.id, replied: res.replied, skipped: res.skipped, errors: res.errors.slice(0, 3) };
    await writeState(env, client.id, state).catch(() => null);
    results.push({ comment: comment.id, replied: res.replied, skipped: res.skipped });
  }
  return results;
}

export async function handleInstagramWebhook(request, env, url, ctx) {
  if (url.pathname !== WEBHOOK_PATH) return null;
  const plain = (text, status = 200) => new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (request.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === webhookVerifyToken(env);
    return ok ? plain(String(url.searchParams.get("hub.challenge") || "")) : plain("forbidden", 403);
  }
  if (request.method !== "POST") return plain("method_not_allowed", 405);
  const raw = await request.text();
  const { appSecret } = await masterInstagramCredentials(env).catch(() => ({ appSecret: "" }));
  if (!(await validMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret))) return plain("invalid_signature", 401);
  const body = parseJson(raw, {});
  const logWork = logWebhook(env, webhookSummary(body)).catch(() => null);
  if (ctx?.waitUntil) ctx.waitUntil(logWork); else await logWork;
  const items = commentsFromWebhook(body);
  if (items.length) {
    const work = processWebhookComments(env, items).catch(error => console.warn("ig_webhook_failed", String(error?.message || error).slice(0, 140)));
    if (ctx?.waitUntil) ctx.waitUntil(work); else await work;
  }
  // "Já segui" no direct: responde na hora.
  const followed = followedFromWebhook(body);
  if (followed.length) {
    const work = processWebhookFollowed(env, followed, { findClient: igUserId => clientForInstagramUser(env, igUserId) })
      .catch(error => console.warn("ig_webhook_followed_failed", String(error?.message || error).slice(0, 140)));
    if (ctx?.waitUntil) ctx.waitUntil(work); else await work;
  }
  // Palavra do cliente no direct (ex.: "QUERO"): responde com a mensagem do painel.
  const dmTexts = dmTextsFromWebhook(body);
  if (dmTexts.length) {
    const work = processWebhookDmKeywords(env, dmTexts, { findClient: igUserId => clientForInstagramUser(env, igUserId) })
      .catch(error => console.warn("ig_webhook_dm_keyword_failed", String(error?.message || error).slice(0, 140)));
    if (ctx?.waitUntil) ctx.waitUntil(work); else await work;
  }
  return plain("ok");
}
