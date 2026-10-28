// Postar na Página do Facebook junto com o Instagram (28/10/2026, pedido do Rodrigo).
// "Todo dia, postagem que for pro Instagram, quero que vá pro Facebook também."
//
// Como funciona:
// - O Instagram é publicado pelo login do Instagram (graph.instagram.com). Esse login NÃO posta no Facebook.
// - Por isso a Página é conectada pelo login do Facebook (o mesmo retorno /api/oauth/facebook/callback
//   do Radar e do Tráfego), pedindo pages_manage_posts. Guardamos a chave da PÁGINA, criptografada.
// - Quando um post/carrossel/Reel sai no Instagram, ele entra numa fila. O cron de 1 minuto publica
//   um item por vez na Página. Assim o Facebook nunca atrasa nem derruba o Instagram.
// - Stories não vão para o Facebook.

import { sha256Hex } from "./auth.js";
import { encryptSecret, decryptSecret } from "./secrets.js";
import { getState, putState, deleteState } from "./storage.js";
import { resolveInstagramCredentials } from "./instagram-credentials.js";

export const FB_PAGE_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management"];
export const FB_PAGE_NS = "facebook-page";
export const FB_QUEUE_NS = "facebook-crosspost";
export const FB_MAX_TRIES = 3;
const BLOCKED = new Set(["globalplay-streaming", "global-play-streaming", "ragnar-one", "demo-cafe"]);

const graph = env => "https://graph.facebook.com/" + String(env?.META_GRAPH_VERSION || "v25.0").replace(/^\/+/, "");

function redirectUri(request, env) {
  const base = String(env?.INSTAGRAM_REDIRECT_BASE || env?.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  const origin = /^https:\/\//.test(base) ? base : new URL(request.url).origin;
  return new URL("/api/oauth/facebook/callback", origin).toString();
}

function randomToken(size = 24) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function cleanId(value) {
  return String(value || "").trim().replace(/[^a-z0-9_-]/gi, "").slice(0, 80);
}

// Desligar tudo de uma vez na Cloudflare: NEXUS_FACEBOOK=off.
export function facebookCrosspostOn(env = {}) {
  return String(env.NEXUS_FACEBOOK || "").trim().toLowerCase() !== "off";
}

async function readConnection(env, clientId) {
  return (await getState(env, FB_PAGE_NS, "connection", clientId))?.value || null;
}

export async function facebookPageStatus(env, clientId) {
  const conn = await readConnection(env, clientId);
  return {
    clientId,
    appConfigured: Boolean(String(env.META_APP_ID || "").trim() && String(env.META_APP_SECRET || "").trim()),
    connected: Boolean(conn?.pageToken && conn?.pageId),
    enabled: conn ? conn.enabled !== false : false,
    pageName: conn?.pageName || "",
    connectedAt: conn?.connectedAt || null,
    lastPostAt: conn?.lastPostAt || null,
    lastError: conn?.lastError || ""
  };
}

export async function startFacebookPageConnect(env, request, clientId) {
  const id = cleanId(clientId);
  if (!id) throw new Error("client_id_required");
  if (BLOCKED.has(id)) throw new Error("client_disabled");
  const appId = String(env.META_APP_ID || "").trim();
  if (!appId || !String(env.META_APP_SECRET || "").trim()) throw new Error("meta_app_not_configured");
  const state = randomToken();
  await putState(env, "oauth-facebook", await sha256Hex(state), "", {
    kind: "fbpage",
    clientId: id,
    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    returnOrigin: new URL(request.url).origin
  });
  const url = new URL("https://www.facebook.com/" + String(env?.META_GRAPH_VERSION || "v25.0") + "/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri(request, env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FB_PAGE_SCOPES.join(","));
  url.searchParams.set("state", state);
  return { url: url.toString() };
}

// Escolhe a Página ligada ao mesmo Instagram que o cliente usa no Nexus.
export function pickPage(pages = [], igUsername = "", igUserId = "") {
  const list = (Array.isArray(pages) ? pages : []).filter(p => p?.id && p?.access_token);
  const user = String(igUsername || "").replace(/^@/, "").toLowerCase();
  const byId = igUserId && list.find(p => String(p.instagram_business_account?.id || "") === String(igUserId));
  if (byId) return byId;
  const byName = user && list.find(p => String(p.instagram_business_account?.username || "").toLowerCase() === user);
  if (byName) return byName;
  return list.length === 1 ? list[0] : null;
}

// Chamado pelo retorno do login do Facebook (viral-radar.js) quando saved.kind === "fbpage".
export async function finishFacebookPageConnect(env, saved, userToken, fetcher = fetch) {
  const clientId = cleanId(saved?.clientId);
  if (!clientId) return { ok: false, message: "Faltou dizer qual cliente. Tente de novo pelo Master." };
  const res = await fetcher(graph(env) + "/me/accounts?fields=name,access_token,tasks,instagram_business_account{id,username}&limit=50&access_token=" + encodeURIComponent(userToken));
  const data = await res.json().catch(() => ({}));
  let ig = {};
  try { ig = await resolveInstagramCredentials(env, clientId); } catch { ig = {}; }
  const pick = pickPage(data?.data, ig?.username, ig?.igUserId);
  if (!pick) {
    return { ok: false, message: "Não achei a Página do Facebook ligada a este Instagram. Ao autorizar, marque a Página certa e deixe a opção de publicar ligada." };
  }
  const tasks = Array.isArray(pick.tasks) ? pick.tasks : [];
  if (tasks.length && !tasks.includes("CREATE_CONTENT")) {
    return { ok: false, message: "Sua conta não tem permissão para publicar na Página " + (pick.name || "") + "." };
  }
  const before = await readConnection(env, clientId);
  await putState(env, FB_PAGE_NS, "connection", clientId, {
    pageId: String(pick.id),
    pageName: String(pick.name || ""),
    pageToken: await encryptSecret(env, String(pick.access_token)),
    enabled: before ? before.enabled !== false : true,
    connectedAt: new Date().toISOString(),
    lastPostAt: before?.lastPostAt || null,
    lastError: ""
  });
  return { ok: true, message: "Página " + (pick.name || "") + " conectada. Os próximos posts do Instagram vão também para o Facebook." };
}

export async function setFacebookCrosspost(env, clientId, enabled) {
  const id = cleanId(clientId);
  const conn = await readConnection(env, id);
  if (!conn) throw new Error("facebook_not_connected");
  await putState(env, FB_PAGE_NS, "connection", id, { ...conn, enabled: Boolean(enabled) });
  return facebookPageStatus(env, id);
}

// ---------- fila: o Instagram só anota, o cron publica ----------

// Chamado depois que o Instagram publicou. Nunca lança erro.
export async function queueFacebookCrosspost(env, clientId, target = {}, caption = "", instagramMediaId = "") {
  try {
    if (!facebookCrosspostOn(env) || !env?.DB) return { queued: false, reason: "off" };
    const id = cleanId(clientId);
    if (!id || BLOCKED.has(id)) return { queued: false, reason: "blocked" };
    if (!["post", "carousel", "reel"].includes(target?.kind)) return { queued: false, reason: "kind" };
    const conn = await readConnection(env, id);
    if (!conn?.pageToken || conn.enabled === false) return { queued: false, reason: "not_connected" };
    const key = cleanId(instagramMediaId) || ("t" + Date.now().toString(36) + randomToken(4));
    if (await getState(env, FB_QUEUE_NS, key, id)) return { queued: false, reason: "duplicate" };
    await putState(env, FB_QUEUE_NS, key, id, {
      kind: target.kind,
      imageUrl: target.imageUrl || "",
      carouselUrls: Array.isArray(target.carouselUrls) ? target.carouselUrls.slice(0, 10) : [],
      videoUrl: target.videoUrl || "",
      caption: String(caption || "").slice(0, 5000),
      instagramMediaId: String(instagramMediaId || ""),
      tries: 0,
      createdAt: new Date().toISOString()
    });
    return { queued: true };
  } catch (error) {
    return { queued: false, reason: String(error?.message || error).slice(0, 80) };
  }
}

async function graphPost(env, fetcher, path, form) {
  const res = await fetcher(graph(env) + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const error = new Error(String(data?.error?.message || "facebook_api_failed").slice(0, 160));
    error.code = data?.error?.code || res.status;
    throw error;
  }
  return data;
}

export async function publishToFacebookPage(env, pageId, pageToken, item = {}, fetcher = fetch) {
  const message = String(item.caption || "");
  if (item.kind === "reel") {
    const video = await graphPost(env, fetcher, "/" + pageId + "/videos", { file_url: item.videoUrl, description: message, access_token: pageToken });
    return { facebookPostId: String(video?.id || "") };
  }
  if (item.kind === "carousel") {
    const urls = (item.carouselUrls || []).filter(u => /^https:\/\//i.test(u)).slice(0, 10);
    if (urls.length < 2) throw new Error("carousel_assets_missing");
    const form = { message, access_token: pageToken };
    for (let i = 0; i < urls.length; i++) {
      const photo = await graphPost(env, fetcher, "/" + pageId + "/photos", { url: urls[i], published: "false", access_token: pageToken });
      form["attached_media[" + i + "]"] = JSON.stringify({ media_fbid: String(photo?.id || "") });
    }
    const post = await graphPost(env, fetcher, "/" + pageId + "/feed", form);
    return { facebookPostId: String(post?.id || "") };
  }
  if (!/^https:\/\//i.test(String(item.imageUrl || ""))) throw new Error("image_url_missing");
  const photo = await graphPost(env, fetcher, "/" + pageId + "/photos", { url: item.imageUrl, caption: message, access_token: pageToken });
  return { facebookPostId: String(photo?.post_id || photo?.id || "") };
}

// Cron de 1 minuto: publica UM item por vez (cabe no limite de chamadas do Worker grátis).
export async function runFacebookCrosspostQueue(env, fetcher = fetch) {
  if (!facebookCrosspostOn(env) || !env?.DB) return { ok: true, skipped: "off" };
  const row = await env.DB.prepare(
    "SELECT item_key, client_id, value_json FROM nexus_state WHERE namespace = ?1 ORDER BY updated_at ASC LIMIT 1"
  ).bind(FB_QUEUE_NS).first().catch(() => null);
  if (!row) return { ok: true, skipped: "empty" };
  let item = {};
  try { item = JSON.parse(String(row.value_json || "{}")) || {}; } catch { item = {}; }
  const clientId = String(row.client_id || "");
  const conn = await readConnection(env, clientId);
  if (!conn?.pageToken || conn.enabled === false || BLOCKED.has(clientId)) {
    await deleteState(env, FB_QUEUE_NS, row.item_key, clientId);
    return { ok: true, skipped: "not_connected" };
  }
  try {
    const token = await decryptSecret(env, conn.pageToken);
    const done = await publishToFacebookPage(env, conn.pageId, token, item, fetcher);
    await deleteState(env, FB_QUEUE_NS, row.item_key, clientId);
    await putState(env, FB_PAGE_NS, "connection", clientId, { ...conn, lastPostAt: new Date().toISOString(), lastError: "" });
    return { ok: true, clientId, ...done };
  } catch (error) {
    const message = String(error?.message || error).slice(0, 160);
    const tries = Number(item.tries || 0) + 1;
    if (tries >= FB_MAX_TRIES) await deleteState(env, FB_QUEUE_NS, row.item_key, clientId);
    else await putState(env, FB_QUEUE_NS, row.item_key, clientId, { ...item, tries, lastError: message });
    await putState(env, FB_PAGE_NS, "connection", clientId, { ...conn, lastError: message });
    return { ok: false, clientId, error: message, tries };
  }
}

// ---------- rotas do Master ----------

export async function handleFacebookPageRoute(request, env, url) {
  if (!url.pathname.startsWith("/api/master/facebook-page")) return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  try {
    if (url.pathname === "/api/master/facebook-page" && request.method === "GET") {
      return send({ ok: true, ...(await facebookPageStatus(env, cleanId(url.searchParams.get("clientId")) || "primeiro-teste")) });
    }
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const clientId = cleanId(body.clientId) || "primeiro-teste";
    if (url.pathname === "/api/master/facebook-page/connect" && request.method === "POST") {
      return send({ ok: true, ...(await startFacebookPageConnect(env, request, clientId)) });
    }
    if (url.pathname === "/api/master/facebook-page/toggle" && request.method === "POST") {
      return send({ ok: true, ...(await setFacebookCrosspost(env, clientId, body.enabled !== false)) });
    }
  } catch (error) {
    const msg = String(error?.message || error);
    const messages = {
      meta_app_not_configured: "Falta colocar META_APP_ID e META_APP_SECRET na Cloudflare.",
      facebook_not_connected: "Conecte a Página do Facebook primeiro.",
      client_disabled: "Este cliente está travado para publicar."
    };
    return send({ ok: false, error: msg.slice(0, 80), message: messages[msg] || "Não deu certo agora. Tente de novo em alguns minutos." }, 400);
  }
  return null;
}
