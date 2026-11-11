// Direct e comentários pelo painel do cliente (Rodrigo, 11/11/2026).
// A Meta recusou instagram_business_manage_messages e instagram_business_manage_comments porque o
// vídeo não mostrava o envio feito pelo próprio app. Este módulo dá ao cliente, no painel:
// - lista das conversas do Direct e envio MANUAL de uma mensagem para uma conversa que já existe;
// - lista dos comentários dos posts recentes, com Comentar, Responder, Ocultar/Mostrar e Apagar.
// Tudo acontece só quando o cliente clica. Nada é automático e nada sai em massa.
// A API do Instagram não permite EDITAR comentário (só criar, ocultar e apagar).

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { sendInstagramMessage } from "./ig-send.js";

const GRAPH = "https://graph.instagram.com/";
export const MAX_TEXT = 900;
export const MAX_COMMENT = 300;
const MEDIA_LIMIT = 6;
const COMMENT_LIMIT = 25;
const CONVERSATION_LIMIT = 15;

const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const cleanText = (value, max) => String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);
export const validId = value => /^[0-9A-Za-z_\-:.]{1,120}$/.test(String(value || ""));

const MESSAGES = {
  instagram_not_connected: "Conecte o Instagram nesta aba primeiro. / Connect Instagram first.",
  invalid_id: "Item inválido. Atualize a lista. / Invalid item. Refresh the list.",
  empty_text: "Escreva a mensagem. / Write the message.",
  invalid_action: "Ação inválida. / Invalid action.",
  outside_window: "O Instagram só deixa responder até 24 horas depois da última mensagem da pessoa. / Instagram only allows replies within 24 hours of the person's last message.",
  instagram_error: "O Instagram recusou. Tente de novo. / Instagram refused. Try again."
};

function fail(code, detail = "") {
  const error = new Error(code);
  error.code = code;
  error.detail = String(detail || "").slice(0, 200);
  return error;
}

async function graph(request, token, path, { method = "GET", params = null } = {}) {
  const url = new URL(GRAPH + path);
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, String(value));
  let response;
  try {
    response = await request(url.toString(), {
      method,
      headers: { authorization: "Bearer " + token, accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
  } catch (cause) {
    throw fail("instagram_error", cause?.message || cause);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw fail("instagram_error", payload?.error?.message || "instagram_" + response.status);
  return payload;
}

async function connection(env, client, resolve) {
  const conn = await resolve(env, client.id).catch(() => null);
  const token = String(conn?.accessToken || "");
  const igUserId = String(conn?.igUserId || "").trim();
  if (!token || !igUserId) throw fail("instagram_not_connected");
  return { token, igUserId, username: String(conn?.username || client.instagram || "").replace(/^@/, "") };
}

// Conversas do Direct: quem é a outra pessoa e a última mensagem.
export async function listConversations({ request, token, igUserId }) {
  const data = await graph(request, token, "me/conversations", {
    params: { platform: "instagram", fields: "id,updated_time,participants,messages.limit(1){message,from,created_time}", limit: CONVERSATION_LIMIT }
  });
  const out = [];
  for (const item of Array.isArray(data?.data) ? data.data : []) {
    const people = Array.isArray(item?.participants?.data) ? item.participants.data : [];
    const other = people.find(p => String(p?.id || "") !== igUserId) || null;
    if (!other?.id) continue;
    const last = Array.isArray(item?.messages?.data) ? item.messages.data[0] : null;
    out.push({
      id: String(item.id || ""),
      recipientId: String(other.id),
      username: String(other.username || ""),
      updated: String(item.updated_time || ""),
      lastText: cleanText(last?.message, 140),
      lastFromMe: String(last?.from?.id || "") === igUserId
    });
  }
  return out;
}

// Comentários dos posts mais recentes (com as respostas de cada um).
export async function listComments({ request, token, igUserId }) {
  const media = await graph(request, token, encodeURIComponent(igUserId) + "/media", {
    params: { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count", limit: MEDIA_LIMIT }
  });
  const posts = [];
  for (const item of Array.isArray(media?.data) ? media.data : []) {
    let comments = [];
    try {
      const data = await graph(request, token, encodeURIComponent(String(item.id)) + "/comments", {
        params: { fields: "id,text,username,timestamp,hidden,replies{id,text,username,timestamp,hidden}", limit: COMMENT_LIMIT }
      });
      comments = (Array.isArray(data?.data) ? data.data : []).map(c => ({
        id: String(c.id || ""),
        text: cleanText(c.text, 400),
        username: String(c.username || ""),
        timestamp: String(c.timestamp || ""),
        hidden: c.hidden === true,
        replies: (Array.isArray(c?.replies?.data) ? c.replies.data : []).map(r => ({
          id: String(r.id || ""), text: cleanText(r.text, 400), username: String(r.username || ""), timestamp: String(r.timestamp || ""), hidden: r.hidden === true
        }))
      }));
    } catch { comments = []; }
    posts.push({
      id: String(item.id || ""),
      caption: cleanText(item.caption, 120),
      image: String(item.thumbnail_url || item.media_url || ""),
      permalink: String(item.permalink || ""),
      timestamp: String(item.timestamp || ""),
      comments
    });
  }
  return posts;
}

export async function sendDirect({ request, token, igUserId, recipientId, text }) {
  if (!validId(recipientId)) throw fail("invalid_id");
  const message = cleanText(text, MAX_TEXT);
  if (!message) throw fail("empty_text");
  try {
    return await sendInstagramMessage({ request, token, igUserId, recipient: { id: String(recipientId) }, message: { text: message } });
  } catch (error) {
    const text = String(error?.message || "");
    if (/window|24|outside/i.test(text)) throw fail("outside_window", text);
    throw fail("instagram_error", text);
  }
}

// action: comment (no post) | reply (no comentário) | hide | unhide | delete
export async function commentAction({ request, token, action, mediaId = "", commentId = "", text = "" }) {
  const message = cleanText(text, MAX_COMMENT);
  if (action === "comment") {
    if (!validId(mediaId)) throw fail("invalid_id");
    if (!message) throw fail("empty_text");
    return graph(request, token, encodeURIComponent(mediaId) + "/comments", { method: "POST", params: { message } });
  }
  if (!validId(commentId)) throw fail("invalid_id");
  if (action === "reply") {
    if (!message) throw fail("empty_text");
    return graph(request, token, encodeURIComponent(commentId) + "/replies", { method: "POST", params: { message } });
  }
  if (action === "hide" || action === "unhide") {
    return graph(request, token, encodeURIComponent(commentId), { method: "POST", params: { hide: action === "hide" ? "true" : "false" } });
  }
  if (action === "delete") return graph(request, token, encodeURIComponent(commentId), { method: "DELETE" });
  throw fail("invalid_action");
}

export async function handleInstagramInboxPortal(request, env, url, client, { fetchImpl = fetch, resolve = resolveInstagramCredentials } = {}) {
  const path = url.pathname;
  if (!path.startsWith("/api/portal/ig/")) return null;
  try {
    const conn = await connection(env, client, resolve);
    const base = { request: fetchImpl, token: conn.token, igUserId: conn.igUserId };
    if (path === "/api/portal/ig/conversations" && request.method === "GET") {
      return send({ ok: true, account: conn.username, conversations: await listConversations(base) });
    }
    if (path === "/api/portal/ig/send" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const out = await sendDirect({ ...base, recipientId: body.recipientId, text: body.text });
      return send({ ok: true, messageId: String(out?.message_id || "") });
    }
    if (path === "/api/portal/ig/comments" && request.method === "GET") {
      return send({ ok: true, account: conn.username, posts: await listComments(base) });
    }
    if (path === "/api/portal/ig/comment" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const out = await commentAction({ ...base, action: String(body.action || ""), mediaId: body.mediaId, commentId: body.commentId, text: body.text });
      return send({ ok: true, id: String(out?.id || "") });
    }
  } catch (error) {
    const code = MESSAGES[error?.code] ? error.code : "instagram_error";
    return send({ ok: false, error: code, message: MESSAGES[code], detail: error?.detail || "" }, code === "instagram_not_connected" ? 409 : 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}
