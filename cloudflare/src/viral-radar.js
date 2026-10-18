// Radar de virais (pedido do Rodrigo em 18/10): toda semana o Nexus olha as hashtags do nicho
// de cada cliente ativo e guarda os ganchos dos posts que mais bombaram. Os agentes usam isso
// como inspiração do FORMATO (nunca copiam a frase). Ninguém digita nada: o nicho vem do cadastro.
// Ideia do "outlier" do ig-viral (instagram-agent-skill, MIT), feita pelo caminho oficial da Meta:
// login pelo Facebook (uma vez, na conta da Flow Arts) + busca de hashtag (máx. 30 hashtags/7 dias).
// A Meta não entrega visualizações nem o @ do dono na busca de hashtag: o ranking usa curtidas e comentários.

import { sha256Hex } from "./auth.js";
import { encryptSecret, decryptSecret } from "./secrets.js";
import { getState, putState } from "./storage.js";
import { captionNiche, nicheHashtags } from "./caption-templates.js";
import { listClients } from "./clients.js";

export const RADAR_NS = "viral-radar";
export const HASHTAGS_PER_WEEK_MAX = 24;      // a Meta deixa 30; sobra margem
const HASHTAGS_PER_NICHE = 2;
const RUN_EVERY_DAYS = 7;
const KEEP_PER_NICHE = 8;
const MAX_AGE_DAYS = 90;
export const FB_SCOPES = ["instagram_basic", "pages_show_list", "pages_read_engagement", "business_management"];

// Flow Arts vende para donos de pequenos negócios: o "nicho" dela é marketing para pequeno negócio.
const MARKETING_TAGS = ["marketingdigital", "empreendedorismo", "pequenosnegocios"];
const BLOCKED = new Set(["globalplay-streaming", "ragnar-one", "demo-cafe"]);

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

// ---------- quais nichos e hashtags olhar ----------

export function radarNicheKey(client = {}) {
  const key = captionNiche(client);
  if (key) return key;
  return String(client.id || "") === "primeiro-teste" ? "marketing" : "";
}

export function tagsForNiche(key) {
  if (key === "marketing") return MARKETING_TAGS.slice();
  return nicheHashtags(key).map(t => t.replace(/^#/, "")).filter(Boolean);
}

export function activeRadarNiches(clients = []) {
  const keys = [];
  for (const c of clients) {
    if (BLOCKED.has(String(c.id || "")) || /archived|paused|blocked/i.test(String(c.status || ""))) continue;
    const key = radarNicheKey(c);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

// Hashtags usadas nos últimos 7 dias contam no limite da Meta. Repetir uma já usada não conta de novo.
export function planHashtags(niches = [], used = {}, now = new Date()) {
  const weekAgo = now.getTime() - 7 * 86400000;
  const recent = new Set(Object.entries(used).filter(([, at]) => Date.parse(at) > weekAgo).map(([t]) => t));
  let budget = HASHTAGS_PER_WEEK_MAX - recent.size;
  const plan = [];
  for (const niche of niches) {
    for (const tag of tagsForNiche(niche).slice(0, HASHTAGS_PER_NICHE)) {
      if (recent.has(tag)) { plan.push({ niche, tag }); continue; }
      if (budget <= 0) continue;
      budget -= 1;
      recent.add(tag);
      plan.push({ niche, tag });
    }
  }
  return plan;
}

// ---------- ranking e limpeza dos ganchos ----------

export function hookFromCaption(caption = "") {
  const first = String(caption || "").split("\n").map(l => l.trim()).find(l => /[\p{L}]{3}/u.test(l)) || "";
  return first
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ")
    .replace(/@[\w.]+/g, " ")
    .replace(/\p{Extended_Pictographic}|️/gu, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

// Pontos: curtidas + comentários valem mais (são mais difíceis). Só posts recentes e com gancho legível.
export function rankTopMedia(items = [], now = new Date()) {
  const cutoff = now.getTime() - MAX_AGE_DAYS * 86400000;
  const seen = new Set();
  return items
    .map(m => ({
      hook: hookFromCaption(m.caption),
      likes: Number(m.like_count || 0),
      comments: Number(m.comments_count || 0),
      format: m.media_type === "CAROUSEL_ALBUM" ? "carrossel" : m.media_type === "VIDEO" ? "reels" : "post",
      permalink: String(m.permalink || ""),
      timestamp: String(m.timestamp || "")
    }))
    .filter(m => m.hook.split(" ").length >= 3 && (!m.timestamp || Date.parse(m.timestamp) >= cutoff))
    .map(m => ({ ...m, score: m.likes + 3 * m.comments }))
    .sort((a, b) => b.score - a.score)
    .filter(m => {
      const k = m.hook.toLowerCase().slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// ---------- o que os agentes recebem ----------

export async function viralHooksText(env, client = {}, limit = 5) {
  try {
    const key = radarNicheKey(client);
    if (!key) return "";
    const saved = await getState(env, RADAR_NS, "niche:" + key);
    const items = (saved?.value?.items || []).slice(0, limit);
    if (!items.length) return "";
    return "Ganchos que estão funcionando agora neste nicho no Instagram (" + items.map(i => '"' + i.hook + '" (' + i.format + ")").join("; ") +
      "). Use só como pista do FORMATO e do tipo de assunto. Nunca copie a frase nem cite outro perfil; escreva um gancho original para esta marca.";
  } catch {
    return "";
  }
}

// ---------- conexão pelo Facebook (uma vez, no Master) ----------

async function readConnection(env) {
  return (await getState(env, "integration", "facebook-radar"))?.value || {};
}

export async function radarStatus(env) {
  const conn = await readConnection(env);
  const run = (await getState(env, RADAR_NS, "run"))?.value || {};
  return {
    appConfigured: Boolean(String(env.META_APP_ID || "").trim() && String(env.META_APP_SECRET || "").trim()),
    connected: Boolean(conn.token && conn.igUserId),
    igUsername: conn.igUsername || "",
    tokenExpiresAt: conn.expiresAt || null,
    lastRunAt: run.lastRunAt || null,
    lastResult: run.lastResult || null,
    niches: run.niches || []
  };
}

export async function startRadarConnect(env, request) {
  const appId = String(env.META_APP_ID || "").trim();
  if (!appId || !String(env.META_APP_SECRET || "").trim()) throw new Error("meta_app_not_configured");
  const state = randomToken();
  await putState(env, "oauth-facebook", await sha256Hex(state), "", {
    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    returnOrigin: new URL(request.url).origin
  });
  const url = new URL("https://www.facebook.com/" + String(env?.META_GRAPH_VERSION || "v25.0") + "/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri(request, env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FB_SCOPES.join(","));
  url.searchParams.set("state", state);
  return { url: url.toString() };
}

function page(ok, message, back = "") {
  const safe = String(message).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const link = back ? `<p><a href="${back}/master" style="color:#5dd3ff">Voltar ao Nexus</a></p>` : "";
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NEXUS</title><body style="margin:0;background:#050807;color:#f4f8f5;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><div style="max-width:480px;padding:28px;text-align:center"><h1 style="color:${ok ? "#5dd3ff" : "#ff9898"}">${ok ? "Facebook conectado" : "Não deu certo"}</h1><p style="color:#aab9c2;line-height:1.5">${safe}</p>${link}</div></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function handleFacebookCallback(env, request, url, fetcher = fetch) {
  if (url.pathname !== "/api/oauth/facebook/callback" || request.method !== "GET") return null;
  if (url.searchParams.get("error")) return page(false, "A autorização foi cancelada.");
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  if (!code || !state) return page(false, "Autorização incompleta. Tente de novo pelo Master.");
  const stateKey = await sha256Hex(state);
  const saved = (await getState(env, "oauth-facebook", stateKey))?.value;
  await env.DB.prepare("DELETE FROM nexus_state WHERE namespace='oauth-facebook' AND item_key=?1").bind(stateKey).run().catch(() => {});
  if (!saved || Date.parse(saved.expiresAt) < Date.now()) return page(false, "Esta autorização expirou. Toque em Conectar de novo no Master.");
  const back = String(saved.returnOrigin || "");
  try {
    const appId = String(env.META_APP_ID || "").trim();
    const secret = String(env.META_APP_SECRET || "").trim();
    const q = new URLSearchParams({ client_id: appId, client_secret: secret, redirect_uri: redirectUri(request, env), code });
    const short = await (await fetcher(graph(env) + "/oauth/access_token?" + q)).json();
    if (!short?.access_token) throw new Error("token");
    const lq = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: secret, fb_exchange_token: short.access_token });
    const long = await (await fetcher(graph(env) + "/oauth/access_token?" + lq)).json();
    const token = long?.access_token || short.access_token;
    const pages = await (await fetcher(graph(env) + "/me/accounts?fields=name,instagram_business_account{id,username}&access_token=" + encodeURIComponent(token))).json();
    const list = (pages?.data || []).filter(p => p.instagram_business_account?.id);
    const pick = list.find(p => /flowarts/i.test(p.instagram_business_account.username || "")) || list[0];
    if (!pick) return page(false, "Não achei um Instagram profissional ligado às suas Páginas do Facebook. Confira se marcou a Página da Flow Arts ao autorizar.", back);
    await putState(env, "integration", "facebook-radar", "", {
      token: await encryptSecret(env, token),
      igUserId: pick.instagram_business_account.id,
      igUsername: pick.instagram_business_account.username || "",
      pageName: pick.name || "",
      expiresAt: long?.expires_in ? new Date(Date.now() + Number(long.expires_in) * 1000).toISOString() : null,
      connectedAt: new Date().toISOString()
    });
    return page(true, "Radar de virais ligado na conta @" + (pick.instagram_business_account.username || "") + ". Pode voltar ao Nexus.", back);
  } catch {
    return page(false, "A Meta não aceitou a conexão. Tente de novo em alguns minutos.", back);
  }
}

// ---------- a busca semanal ----------

async function graphGet(env, fetcher, path, params) {
  const res = await fetcher(graph(env) + path + "?" + new URLSearchParams(params));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const err = new Error(String(data?.error?.message || "graph_error").slice(0, 160));
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

export async function runViralRadar(env, now = new Date(), fetcher = fetch, { force = false, clients = null } = {}) {
  const conn = await readConnection(env);
  if (!conn.token || !conn.igUserId) return { ok: false, skipped: "not_connected" };
  const runState = (await getState(env, RADAR_NS, "run"))?.value || {};
  if (!force && runState.lastRunAt && now.getTime() - Date.parse(runState.lastRunAt) < RUN_EVERY_DAYS * 86400000) {
    return { ok: true, skipped: "not_due" };
  }
  // Só uma vez por hora no máximo, mesmo se falhar (não martela a Meta).
  if (!force && runState.lastTryAt && now.getTime() - Date.parse(runState.lastTryAt) < 3600000) return { ok: true, skipped: "recent_try" };
  await putState(env, RADAR_NS, "run", "", { ...runState, lastTryAt: now.toISOString() });

  const token = await decryptSecret(env, conn.token);
  const niches = activeRadarNiches(clients || await listClients(env));
  const usedState = (await getState(env, RADAR_NS, "hashtags"))?.value || {};
  const used = usedState.used || {};
  const ids = usedState.ids || {};
  const plan = planHashtags(niches, used, now);
  const byNiche = {};
  const errors = [];
  for (const { niche, tag } of plan) {
    try {
      if (!ids[tag]) {
        const found = await graphGet(env, fetcher, "/ig_hashtag_search", { user_id: conn.igUserId, q: tag, access_token: token });
        ids[tag] = found?.data?.[0]?.id || "";
      }
      if (!(tag in used) || Date.parse(used[tag]) < now.getTime() - 7 * 86400000) used[tag] = now.toISOString();
      if (!ids[tag]) continue;
      const media = await graphGet(env, fetcher, "/" + ids[tag] + "/top_media", {
        user_id: conn.igUserId, fields: "caption,like_count,comments_count,media_type,permalink,timestamp", limit: "50", access_token: token
      });
      (byNiche[niche] ||= []).push(...(media?.data || []));
    } catch (error) {
      errors.push({ tag, code: error.code || null, message: String(error.message || error).slice(0, 120) });
      if (error.code === 190 || error.code === 10 || error.code === 200) break; // token vencido ou sem permissão: para tudo
    }
  }
  await putState(env, RADAR_NS, "hashtags", "", { used, ids });
  const summary = {};
  for (const [niche, items] of Object.entries(byNiche)) {
    const ranked = rankTopMedia(items, now).slice(0, KEEP_PER_NICHE);
    summary[niche] = ranked.length;
    if (ranked.length) await putState(env, RADAR_NS, "niche:" + niche, "", { items: ranked, updatedAt: now.toISOString() });
  }
  const ok = Object.values(summary).some(n => n > 0);
  const lastResult = { ok, summary, errors: errors.slice(0, 5) };
  await putState(env, RADAR_NS, "run", "", {
    lastTryAt: now.toISOString(),
    lastRunAt: ok ? now.toISOString() : runState.lastRunAt || null,
    lastResult,
    niches
  });
  return { ok, ...lastResult };
}

// ---------- rotas do Master ----------

export async function handleViralRadarRoute(request, env, url) {
  if (!url.pathname.startsWith("/api/master/viral-radar")) return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  try {
    if (url.pathname === "/api/master/viral-radar" && request.method === "GET") {
      const status = await radarStatus(env);
      const niches = {};
      for (const key of status.niches) niches[key] = ((await getState(env, RADAR_NS, "niche:" + key))?.value?.items || []).slice(0, 5);
      return send({ ok: true, ...status, results: niches });
    }
    if (url.pathname === "/api/master/viral-radar/connect" && request.method === "POST") return send({ ok: true, ...(await startRadarConnect(env, request)) });
    if (url.pathname === "/api/master/viral-radar/run" && request.method === "POST") return send(await runViralRadar(env, new Date(), fetch, { force: true }));
  } catch (error) {
    const msg = String(error?.message || error);
    return send({ ok: false, error: msg.slice(0, 80), message: msg === "meta_app_not_configured" ? "Falta colocar META_APP_ID e META_APP_SECRET na Cloudflare." : "Não deu certo agora. Tente de novo em alguns minutos." }, 400);
  }
  return null;
}
