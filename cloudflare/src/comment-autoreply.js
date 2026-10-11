// Auto-responder de comentários do Instagram (funil "QUERO" / "EXEMPLO").
// A cada execução do cron: lê comentários recentes dos últimos posts, e para cada
// comentário com palavra de interesse responde UMA vez:
//   1) DM privada (private reply) com o link do WhatsApp da marca;
//   2) resposta pública curta no comentário.
// Limites: poucos posts e poucas respostas por execução (orçamento de chamadas do Worker).

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { clientBrand, brandProfileVersion, whatsappLink } from "./client-brand.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";

const NAMESPACE = "comment-autoreply";
const MAX_MEDIA = 4;
const MAX_REPLIES_PER_RUN = 3;
const MAX_ATTEMPTS = 2;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // a Meta só aceita resposta privada até 7 dias

export const INTEREST_PATTERN = /\b(eu\s+)?quero\b|\bexemplo\b|\binforma[çc][aã]o\b|\binfo\b|\bpre[çc]o\b|\bvalor(es)?\b|\bquanto\s+custa\b|\bcomo\s+funciona\b/i;

export function wantsReply(text = "") {
  return INTEREST_PATTERN.test(String(text || ""));
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

export async function runCommentAutoReplyForClient(env, client, { request = fetch, now = new Date() } = {}) {
  const out = { checked: 0, replied: 0, errors: [], seen: [] };
  const conn = await resolveInstagramCredentials(env, client.id);
  const token = String(conn?.accessToken || "");
  const igUserId = String(conn?.igUserId || "").trim();
  if (!token || !igUserId) return { ...out, skipped: "instagram_not_connected" };
  const ownUsername = String(conn?.username || client.instagram || "").replace(/^@/, "").toLowerCase();

  const state = await readState(env, client.id);
  let media = { data: [] };
  try {
    media = await graph(request, token, encodeURIComponent(igUserId) + "/media?fields=id,timestamp&limit=" + MAX_MEDIA);
  } catch (error) {
    out.errors.push("media:" + error.message);
  }
  const message = dmText(client);

  for (const item of Array.isArray(media?.data) ? media.data : []) {
    if (out.replied >= MAX_REPLIES_PER_RUN) break;
    let comments = [];
    try {
      const data = await graph(request, token, encodeURIComponent(String(item.id)) + "/comments?fields=id,text,username,timestamp&limit=50");
      comments = Array.isArray(data?.data) ? data.data : [];
      out.seen.push({ media: String(item.id), count: comments.length, sample: comments.slice(0, 3).map(c => [String(c.username || "?").slice(0, 30), String(c.text || "").slice(0, 30)]) });
    } catch (error) {
      out.errors.push("comments:" + error.message);
      continue;
    }
    for (const comment of comments) {
      if (out.replied >= MAX_REPLIES_PER_RUN) break;
      const id = String(comment.id || "");
      const username = String(comment.username || "").replace(/^@/, "").toLowerCase();
      const createdMs = Date.parse(String(comment.timestamp || ""));
      if (!id || !username || username === ownUsername) continue;
      if (!wantsReply(comment.text)) continue;
      if (Number.isFinite(createdMs) && now.getTime() - createdMs > WINDOW_MS) continue;
      const previous = state.handled[id] || {};
      if (previous.status === "sent" || Number(previous.attempts || 0) >= MAX_ATTEMPTS) continue;
      out.checked += 1;
      try {
        await graph(request, token, encodeURIComponent(igUserId) + "/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recipient: { comment_id: id }, message: { text: message } })
        });
        await graph(request, token, encodeURIComponent(id) + "/replies", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ message: "Te chamei no direct! 📩" })
        }).catch(error => out.errors.push("public_reply:" + error.message));
        state.handled[id] = { status: "sent", username, at: now.toISOString(), attempts: Number(previous.attempts || 0) + 1 };
        out.replied += 1;
      } catch (error) {
        state.handled[id] = { status: "error", username, at: now.toISOString(), attempts: Number(previous.attempts || 0) + 1, error: error.message };
        out.errors.push("dm:" + error.message);
      }
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
    if (BLOCKED_PUBLISH_CLIENTS.has(String(row.id)) || !brandProfileVersion(row.id)) continue;
    const client = { ...row, config: parseJson(row.config_json, {}) };
    if (!clientBrand(client).whatsapp) continue;
    results[row.id] = await runCommentAutoReplyForClient(env, client, { ...options, now }).catch(error => ({ error: String(error?.message || error).slice(0, 200) }));
  }
  return results;
}

export async function commentAutoReplyStatus(env, clientId) {
  const state = await readState(env, clientId);
  const handled = Object.entries(state.handled || {}).slice(0, 20).map(([id, value]) => ({ id, ...value }));
  return { lastRun: state.lastRun || null, recent: handled };
}
