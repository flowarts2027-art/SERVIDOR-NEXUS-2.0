// Tráfego pago (24/10/2026, pedido do Rodrigo): o cliente impulsiona pelo painel um post que já saiu.
// Decisões do Rodrigo:
// - a verba é paga no CARTÃO DO CLIENTE, direto na Meta (o dinheiro do anúncio não passa pela Flow Arts);
// - a Flow Arts cobra só a gestão: plano "Tráfego", R$ 397 por mês (plans.js).
// Para anúncio, a Meta exige o LOGIN DO FACEBOOK (Página + conta de anúncios), não o login do Instagram.
// Usamos o mesmo endereço de retorno do Radar (/api/oauth/facebook/callback), que já está cadastrado no app.
// Fica DESLIGADO até a Meta aprovar a permissão ads_management: ligar = NEXUS_ADS=on na Cloudflare (OK do Rodrigo).
// Enquanto desligado, o painel mostra tudo pronto com "aguardando liberação da Meta" e guarda quem quer usar.

import { sha256Hex } from "./auth.js";
import { encryptSecret, decryptSecret } from "./secrets.js";
import { getState, putState } from "./storage.js";

export const ADS_SCOPES = ["ads_management", "ads_read", "business_management", "pages_show_list", "pages_read_engagement", "instagram_basic"];
export const ADS_NS = "ads";
export const ADS_MIN_DAILY = 10;   // reais por dia
export const ADS_MAX_DAILY = 500;
export const ADS_MAX_DAYS = 30;
export const ADS_RADIUS = [5, 10, 20, 40, 80];
export const ADS_PLAN_ID = "trafego";

const graph = env => "https://graph.facebook.com/" + String(env?.META_GRAPH_VERSION || "v25.0").replace(/^\/+/, "");
const clean = (value, max) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function adsLive(env = {}) {
  return String(env.NEXUS_ADS || "").trim().toLowerCase() === "on"
    && Boolean(String(env.META_APP_ID || "").trim() && String(env.META_APP_SECRET || "").trim());
}

export function planGivesAds(client = {}) {
  const plan = client?.config?.plan || client?.plan;
  if (!plan || typeof plan !== "object") return false;
  if (Array.isArray(plan.gifts) && plan.gifts.includes("ads")) return true;
  return ["trafego", "completo-trafego"].includes(String(plan.id || "").toLowerCase());
}

async function readAccess(env, client) {
  const saved = (await getState(env, ADS_NS, "access", client.id))?.value || {};
  const byPlan = planGivesAds(client);
  return { enabled: saved.enabled === true || (byPlan && saved.enabled !== false), byPlan };
}

export async function setAdsAccess(env, clientId, enabled) {
  const id = String(clientId || "").trim();
  if (!id) throw new Error("client_id_required");
  await putState(env, ADS_NS, "access", id, { enabled: Boolean(enabled), updatedAt: new Date().toISOString() });
  return { ok: true, clientId: id, enabled: Boolean(enabled) };
}

async function readConnection(env, clientId) {
  return (await getState(env, ADS_NS, "connection", clientId))?.value || null;
}

function publicConnection(conn) {
  if (!conn) return null;
  return {
    adAccountName: conn.adAccountName || "", adAccountId: conn.adAccountId || "", currency: conn.currency || "BRL",
    pageName: conn.pageName || "", igUsername: conn.igUsername || "", connectedAt: conn.connectedAt || null,
    needsPayment: conn.needsPayment === true
  };
}

export async function ensureAdsSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ads_boosts (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      media_id TEXT,
      daily_cents INTEGER NOT NULL,
      days INTEGER NOT NULL,
      city TEXT NOT NULL,
      radius_km INTEGER NOT NULL,
      status TEXT NOT NULL,
      campaign_id TEXT, adset_id TEXT, ad_id TEXT,
      error TEXT,
      results_json TEXT,
      start_at TEXT, end_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
}

// ---------- regras do pedido (testáveis sem Meta) ----------

export function validateBoost(body = {}) {
  const daily = Math.round(Number(String(body.daily ?? "").replace(",", ".")));
  const days = Math.round(Number(body.days));
  const city = clean(body.city, 60);
  const radius = Math.round(Number(body.radiusKm));
  if (!String(body.postId || "").trim()) throw new Error("post_required");
  if (!Number.isFinite(daily) || daily < ADS_MIN_DAILY || daily > ADS_MAX_DAILY) throw new Error("daily_invalid");
  if (!Number.isFinite(days) || days < 1 || days > ADS_MAX_DAYS) throw new Error("days_invalid");
  if (city.length < 3 || !/\p{L}/u.test(city)) throw new Error("city_invalid");
  if (!ADS_RADIUS.includes(radius)) throw new Error("radius_invalid");
  if (body.confirm !== true) throw new Error("confirm_required");
  return { postId: String(body.postId).trim(), dailyCents: daily * 100, days, city, radiusKm: radius, totalCents: daily * 100 * days };
}

export function boostWindow(days, now = new Date()) {
  const start = new Date(now.getTime() + 10 * 60000);
  const end = new Date(start.getTime() + days * 86400000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

// "Curitiba PR" → { name: "Curitiba", state: "PR" }
export function splitCity(value) {
  const m = String(value || "").trim().match(/^(.*?)[\s,/-]+([A-Za-z]{2})$/);
  return m ? { name: m[1].trim(), state: m[2].toUpperCase() } : { name: String(value || "").trim(), state: "" };
}

// ---------- conexão (login do Facebook) ----------

export async function startAdsConnect(env, request, client) {
  if (!adsLive(env)) throw new Error("ads_not_live");
  const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  await putState(env, "oauth-facebook", await sha256Hex(state), "", {
    kind: "ads", clientId: client.id,
    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    returnOrigin: new URL(request.url).origin
  });
  const base = String(env?.INSTAGRAM_REDIRECT_BASE || env?.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  const origin = /^https:\/\//.test(base) ? base : new URL(request.url).origin;
  const url = new URL("https://www.facebook.com/" + String(env?.META_GRAPH_VERSION || "v25.0") + "/dialog/oauth");
  url.searchParams.set("client_id", String(env.META_APP_ID).trim());
  url.searchParams.set("redirect_uri", new URL("/api/oauth/facebook/callback", origin).toString());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ADS_SCOPES.join(","));
  url.searchParams.set("state", state);
  return { url: url.toString() };
}

async function graphCall(env, fetcher, method, path, params) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) body.set(k, typeof v === "string" ? v : JSON.stringify(v));
  const res = method === "GET"
    ? await fetcher(graph(env) + path + "?" + body)
    : await fetcher(graph(env) + path, { method, headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const err = new Error(String(data?.error?.error_user_msg || data?.error?.message || "graph_error").slice(0, 200));
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

// Chamado pelo retorno do login do Facebook (viral-radar.js) quando o pedido é de anúncios.
export async function finishAdsConnect(env, saved, token, expiresIn, fetcher = fetch) {
  const clientId = String(saved.clientId || "");
  const accounts = (await graphCall(env, fetcher, "GET", "/me/adaccounts", { fields: "account_id,name,currency,account_status,funding_source", access_token: token }))?.data || [];
  const pages = (await graphCall(env, fetcher, "GET", "/me/accounts", { fields: "id,name,instagram_business_account{id,username}", access_token: token }))?.data || [];
  const withIg = pages.filter(p => p.instagram_business_account?.id);
  const page = withIg[0];
  if (!page) return { ok: false, message: "Não achei um Instagram profissional ligado a uma Página do Facebook. Ligue o Instagram à Página e tente de novo." };
  const account = accounts.find(a => Number(a.account_status) === 1) || accounts[0];
  if (!account) return { ok: false, message: "Não achei uma conta de anúncios. Crie uma no Gerenciador de Anúncios da Meta e tente de novo." };
  await putState(env, ADS_NS, "connection", clientId, {
    token: await encryptSecret(env, token),
    adAccountId: String(account.account_id || "").replace(/^act_/, ""),
    adAccountName: account.name || "", currency: account.currency || "BRL",
    needsPayment: !account.funding_source,
    pageId: page.id, pageName: page.name || "",
    igUserId: page.instagram_business_account.id, igUsername: page.instagram_business_account.username || "",
    expiresAt: expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString() : null,
    connectedAt: new Date().toISOString()
  });
  return { ok: true, message: "Conta de anúncios conectada" + (account.name ? " (" + account.name + ")" : "") + ". Pode voltar ao painel." };
}

// ---------- criar o impulsionamento na Meta ----------

const UF_NAMES = { AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins" };

async function findCityKey(env, fetcher, token, city) {
  const { name, state } = splitCity(city);
  const found = (await graphCall(env, fetcher, "GET", "/search", { type: "adgeolocation", location_types: ["city"], country_code: "BR", q: name, limit: "10", access_token: token }))?.data || [];
  const uf = UF_NAMES[state] || "";
  const pick = found.find(c => uf && String(c.region || "").toLowerCase() === uf.toLowerCase()) || found[0];
  if (!pick?.key) throw new Error("city_not_found");
  return pick.key;
}

async function findMediaId(env, fetcher, token, igUserId, post) {
  const permalink = String(post.permalink || post.publishResult?.permalink || "");
  if (permalink) {
    const media = (await graphCall(env, fetcher, "GET", "/" + igUserId + "/media", { fields: "id,permalink", limit: "50", access_token: token }))?.data || [];
    const hit = media.find(m => String(m.permalink || "").replace(/\/$/, "") === permalink.replace(/\/$/, ""));
    if (hit?.id) return hit.id;
  }
  if (post.mediaId) return String(post.mediaId);
  throw new Error("post_not_published");
}

export async function createBoostOnMeta(env, conn, boost, post, fetcher = fetch) {
  const token = await decryptSecret(env, conn.token);
  const act = "/act_" + conn.adAccountId;
  const label = "Flow Arts · " + clean(post.caption || "post", 40);
  const mediaId = await findMediaId(env, fetcher, token, conn.igUserId, post);
  const cityKey = await findCityKey(env, fetcher, token, boost.city);
  const ids = {};
  try {
    ids.campaign = (await graphCall(env, fetcher, "POST", act + "/campaigns", {
      name: label, objective: "OUTCOME_ENGAGEMENT", status: "ACTIVE", special_ad_categories: [],
      is_adset_budget_sharing_enabled: "false", access_token: token
    })).id;
    ids.adset = (await graphCall(env, fetcher, "POST", act + "/adsets", {
      name: label + " · " + boost.city, campaign_id: ids.campaign, status: "ACTIVE",
      daily_budget: String(boost.dailyCents), billing_event: "IMPRESSIONS", optimization_goal: "CONVERSATIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP", destination_type: "WHATSAPP", promoted_object: { page_id: conn.pageId },
      start_time: boost.startAt, end_time: boost.endAt,
      targeting: {
        age_min: 18, geo_locations: { cities: [{ key: cityKey, radius: boost.radiusKm, distance_unit: "kilometer" }] },
        publisher_platforms: ["instagram"], instagram_positions: ["stream", "story", "explore"]
      },
      access_token: token
    })).id;
    const creative = (await graphCall(env, fetcher, "POST", act + "/adcreatives", {
      name: label, object_id: conn.pageId, instagram_user_id: conn.igUserId, source_instagram_media_id: mediaId,
      call_to_action: { type: "WHATSAPP_MESSAGE", value: { app_destination: "WHATSAPP" } }, access_token: token
    })).id;
    ids.ad = (await graphCall(env, fetcher, "POST", act + "/ads", {
      name: label, adset_id: ids.adset, creative: { creative_id: creative }, status: "ACTIVE", access_token: token
    })).id;
    return { mediaId, ...ids };
  } catch (error) {
    // Não deixa campanha pela metade gastando: apaga o que foi criado.
    if (ids.campaign) await graphCall(env, fetcher, "POST", "/" + ids.campaign, { status: "DELETED", access_token: token }).catch(() => {});
    throw error;
  }
}

// ---------- rotas do painel do cliente ----------

const MESSAGES = {
  ads_no_access: "O impulsionamento faz parte do plano Tráfego. Fale com a Flow Arts para ativar.",
  ads_not_live: "O impulsionamento abre assim que a Meta liberar a Flow Arts. Já deixamos tudo pronto.",
  ads_not_connected: "Conecte a sua conta de anúncios primeiro (Conta › Anúncios).",
  post_required: "Escolha um post.",
  post_not_published: "Só dá para impulsionar um post que já saiu no Instagram.",
  daily_invalid: "Escolha um valor por dia entre R$ " + ADS_MIN_DAILY + " e R$ " + ADS_MAX_DAILY + ".",
  days_invalid: "Escolha de 1 a " + ADS_MAX_DAYS + " dias.",
  city_invalid: "Escreva a cidade e o estado, por exemplo: Curitiba PR.",
  city_not_found: "A Meta não achou essa cidade. Confira o nome, por exemplo: Curitiba PR.",
  radius_invalid: "Escolha a distância da lista.",
  confirm_required: "Confirme o valor antes de impulsionar.",
  boost_not_found: "Esse impulsionamento não foi encontrado."
};

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function boostView(row) {
  let results = {};
  try { results = JSON.parse(row.results_json || "{}"); } catch { results = {}; }
  return {
    id: row.id, postId: row.post_id, daily: Number(row.daily_cents || 0) / 100, days: Number(row.days || 0),
    city: row.city, radiusKm: Number(row.radius_km || 0), status: row.status, error: row.error || "",
    startAt: row.start_at, endAt: row.end_at, createdAt: row.created_at, results
  };
}

export async function adsView(env, client) {
  const access = await readAccess(env, client);
  const conn = await readConnection(env, client.id);
  let boosts = [];
  if (access.enabled) {
    await ensureAdsSchema(env);
    boosts = ((await env.DB.prepare("SELECT * FROM ads_boosts WHERE client_id=?1 ORDER BY created_at DESC LIMIT 30").bind(client.id).all())?.results || []).map(boostView);
  }
  return {
    ok: true, access: access.enabled, byPlan: access.byPlan, live: adsLive(env),
    connection: publicConnection(conn), boosts,
    limits: { minDaily: ADS_MIN_DAILY, maxDaily: ADS_MAX_DAILY, maxDays: ADS_MAX_DAYS, radius: ADS_RADIUS },
    price: "R$ 397 por mês (a verba do anúncio é paga no seu cartão, direto na Meta)"
  };
}

async function findPost(env, client, postId) {
  const row = await env.DB.prepare("SELECT id, status, media_id, caption, payload_json FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1")
    .bind(String(postId), client.id).first();
  if (!row) throw new Error("post_required");
  let payload = {};
  try { payload = JSON.parse(row.payload_json || "{}"); } catch { payload = {}; }
  if (String(row.status) !== "published" && !row.media_id) throw new Error("post_not_published");
  return { ...payload, id: row.id, mediaId: row.media_id || "", caption: row.caption || "" };
}

export async function requestBoost(env, client, body, fetcher = fetch, now = new Date()) {
  const access = await readAccess(env, client);
  if (!access.enabled) throw new Error("ads_no_access");
  const boost = validateBoost(body);
  const post = await findPost(env, client, boost.postId);
  if (!adsLive(env)) {
    // Guarda quem quer usar, para a Flow Arts saber que vale a pena correr com a liberação.
    const wish = (await getState(env, ADS_NS, "interest", client.id))?.value || { count: 0 };
    await putState(env, ADS_NS, "interest", client.id, { count: Number(wish.count || 0) + 1, lastAt: now.toISOString(), lastDaily: boost.dailyCents / 100, lastCity: boost.city });
    throw new Error("ads_not_live");
  }
  const conn = await readConnection(env, client.id);
  if (!conn?.token || !conn.adAccountId) throw new Error("ads_not_connected");
  await ensureAdsSchema(env);
  const id = "boost-" + crypto.randomUUID();
  const { startAt, endAt } = boostWindow(boost.days, now);
  await env.DB.prepare(`INSERT INTO ads_boosts(id,client_id,post_id,daily_cents,days,city,radius_km,status,start_at,end_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,'criando',?8,?9)`).bind(id, client.id, post.id, boost.dailyCents, boost.days, boost.city, boost.radiusKm, startAt, endAt).run();
  try {
    const made = await createBoostOnMeta(env, conn, { ...boost, startAt, endAt }, post, fetcher);
    await env.DB.prepare(`UPDATE ads_boosts SET status='em_analise', media_id=?2, campaign_id=?3, adset_id=?4, ad_id=?5, updated_at=CURRENT_TIMESTAMP WHERE id=?1`)
      .bind(id, made.mediaId, made.campaign, made.adset, made.ad).run();
    return { ok: true, id, status: "em_analise" };
  } catch (error) {
    const msg = String(error?.message || error).slice(0, 200);
    await env.DB.prepare("UPDATE ads_boosts SET status='erro', error=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(id, msg).run();
    if (MESSAGES[msg]) throw error;
    const err = new Error("meta_error"); err.detail = msg; throw err;
  }
}

export async function stopBoost(env, client, id, fetcher = fetch) {
  await ensureAdsSchema(env);
  const row = await env.DB.prepare("SELECT * FROM ads_boosts WHERE id=?1 AND client_id=?2").bind(String(id), client.id).first();
  if (!row) throw new Error("boost_not_found");
  const conn = await readConnection(env, client.id);
  if (row.campaign_id && conn?.token && adsLive(env)) {
    const token = await decryptSecret(env, conn.token);
    await graphCall(env, fetcher, "POST", "/" + row.campaign_id, { status: "PAUSED", access_token: token });
  }
  await env.DB.prepare("UPDATE ads_boosts SET status='parado', updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id).run();
  return { ok: true };
}

export async function handleAdsPortal(request, env, url, client) {
  if (!url.pathname.startsWith("/api/portal/ads")) return null;
  try {
    if (url.pathname === "/api/portal/ads" && request.method === "GET") return send(await adsView(env, client));
    if (url.pathname === "/api/portal/ads/connect" && request.method === "POST") {
      if (!(await readAccess(env, client)).enabled) throw new Error("ads_no_access");
      return send({ ok: true, ...(await startAdsConnect(env, request, client)) });
    }
    if (url.pathname === "/api/portal/ads/boost" && request.method === "POST") {
      return send(await requestBoost(env, client, await request.json().catch(() => ({}))));
    }
    const stop = url.pathname.match(/^\/api\/portal\/ads\/([^/]+)\/stop$/);
    if (stop && request.method === "POST") return send(await stopBoost(env, client, decodeURIComponent(stop[1])));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 80);
    const message = code === "meta_error"
      ? "A Meta recusou o anúncio: " + String(error.detail || "").slice(0, 160)
      : MESSAGES[code] || "Não deu certo. Tente de novo.";
    return send({ ok: false, error: code, message }, code === "ads_not_live" ? 409 : 400);
  }
  return null;
}

// ---------- Master ----------

export async function handleAdsMaster(request, env, url, listClients) {
  if (url.pathname !== "/api/master/ads") return null;
  try {
    if (request.method === "GET") {
      const rows = [];
      for (const client of await listClients(env).catch(() => [])) {
        if (!client?.id) continue;
        const access = await readAccess(env, client);
        const conn = await readConnection(env, client.id);
        const wish = (await getState(env, ADS_NS, "interest", client.id))?.value || null;
        rows.push({ id: client.id, name: String(client.name || client.id), enabled: access.enabled, byPlan: access.byPlan, connection: publicConnection(conn), interest: wish });
      }
      return send({ ok: true, live: adsLive(env), clients: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setAdsAccess(env, body.clientId, body.enabled === true));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80) }, 400);
  }
  return null;
}
