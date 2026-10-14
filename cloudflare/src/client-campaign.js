// Aba "Campanha" do painel do cliente (pedido do Rodrigo em 14/10).
// O cliente escolhe: artes prontas (ele envia) ou criadas por IA, quantos dias
// (7, 15 ou 30) e quantos posts por dia (1 ou 2).
// Imagem por IA gasta na conta da Flow Arts: só aparece depois que o Rodrigo
// libera no Master, com limite por mês (padrão 30, muda no Master).

export const CAMPAIGN_DAYS = [7, 15, 30];
export const CAMPAIGN_POSTS_PER_DAY = [1, 2];
export const AI_IMAGES_MONTHLY_LIMIT = 30;
export const AI_IMAGES_MAX_LIMIT = 600;

const localDay = (value = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
}).format(value instanceof Date ? value : new Date(value));
const thisMonth = () => localDay().slice(0, 7);

function addDays(day, n) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/* ---------- Escolhas do cliente ---------- */

export function campaignSettings(client = {}) {
  const raw = client?.config?.campaignSettings && typeof client.config.campaignSettings === "object" ? client.config.campaignSettings : null;
  if (!raw) return null;
  const days = CAMPAIGN_DAYS.includes(Number(raw.days)) ? Number(raw.days) : 30;
  const postsPerDay = CAMPAIGN_POSTS_PER_DAY.includes(Number(raw.postsPerDay)) ? Number(raw.postsPerDay) : 1;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate || "")) ? String(raw.startDate) : localDay();
  return {
    artSource: raw.artSource === "ai" ? "ai" : "own",
    days, postsPerDay, startDate,
    endDate: addDays(startDate, days - 1),
    updatedAt: raw.updatedAt || null
  };
}

// Sem campanha salva: o Nexus segue como antes. Com campanha: só cria posts dentro dos dias dela.
export function campaignActiveOn(client, day) {
  const settings = campaignSettings(client);
  if (!settings) return true;
  const value = String(day || "").slice(0, 10);
  return value >= settings.startDate && value <= settings.endDate;
}

export function campaignPostsPerDay(client) {
  return campaignSettings(client)?.postsPerDay || 0;
}

export async function saveCampaignSettings(env, client, body = {}) {
  const days = Number(body.days);
  const postsPerDay = Number(body.postsPerDay);
  if (!CAMPAIGN_DAYS.includes(days)) throw new Error("days_invalid");
  if (!CAMPAIGN_POSTS_PER_DAY.includes(postsPerDay)) throw new Error("posts_invalid");
  const artSource = body.artSource === "ai" ? "ai" : "own";
  if (artSource === "ai" && !(await aiImagesAccess(env, client.id)).enabled) throw new Error("ai_not_enabled");
  const config = client?.config && typeof client.config === "object" ? client.config : {};
  const previous = campaignSettings(client);
  // Começa hoje. Se só mudou a arte ou os posts por dia, mantém o começo.
  const startDate = previous && previous.days === days && body.restart !== true ? previous.startDate : localDay();
  const nextConfig = { ...config, campaignSettings: { artSource, days, postsPerDay, startDate, updatedAt: new Date().toISOString() } };
  await env.DB.prepare("UPDATE clients SET config_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
    .bind(JSON.stringify(nextConfig), client.id).run();
  return campaignSettings({ ...client, config: nextConfig });
}

/* ---------- Imagem por IA: liberação e limite (por cliente) ---------- */

async function readState(env, clientId, key, fallback) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='client-campaign' AND item_key=?1 AND client_id=?2 LIMIT 1"
  ).bind(key, String(clientId || "")).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : fallback; } catch { return fallback; }
}

async function writeState(env, clientId, key, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES('client-campaign',?1,?2,?3,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(key, String(clientId || ""), JSON.stringify(value)).run();
}

export async function aiImagesAccess(env, clientId) {
  const access = await readState(env, clientId, "ai-access", { enabled: false });
  const limit = Math.round(Number(access.monthlyLimit));
  const usage = await readState(env, clientId, "ai-usage", { month: "", count: 0 });
  return {
    enabled: access.enabled === true,
    monthlyLimit: Number.isFinite(limit) && limit >= 0 ? limit : AI_IMAGES_MONTHLY_LIMIT,
    usedMonth: usage.month === thisMonth() ? Number(usage.count || 0) : 0
  };
}

export async function setAiImagesAccess(env, clientId, enabled, monthlyLimit) {
  const id = String(clientId || "").trim();
  if (!id) throw new Error("client_id_required");
  const current = await aiImagesAccess(env, id);
  let limit = current.monthlyLimit;
  if (monthlyLimit !== undefined && monthlyLimit !== null && monthlyLimit !== "") {
    limit = Math.round(Number(monthlyLimit));
    if (!Number.isFinite(limit) || limit < 0 || limit > AI_IMAGES_MAX_LIMIT) throw new Error("limit_invalid");
  }
  const on = enabled === undefined ? current.enabled : Boolean(enabled);
  await writeState(env, id, "ai-access", { enabled: on, monthlyLimit: limit, updatedAt: new Date().toISOString() });
  return { ok: true, clientId: id, enabled: on, monthlyLimit: limit };
}

// Reserva 1 imagem do mês antes de gerar. Devolve false se não pode.
export async function reserveAiImage(env, clientId) {
  const access = await aiImagesAccess(env, clientId);
  if (!access.enabled || access.usedMonth >= access.monthlyLimit) return false;
  await writeState(env, clientId, "ai-usage", { month: thisMonth(), count: access.usedMonth + 1 });
  return true;
}

// Geração falhou: a imagem não conta.
export async function refundAiImage(env, clientId) {
  const access = await aiImagesAccess(env, clientId);
  await writeState(env, clientId, "ai-usage", { month: thisMonth(), count: Math.max(0, access.usedMonth - 1) });
}

// O cliente pode usar IA agora? (escolheu IA, está liberado e tem saldo)
export async function clientWantsAiImage(env, client) {
  const settings = campaignSettings(client);
  if (settings?.artSource !== "ai") return false;
  const access = await aiImagesAccess(env, client.id);
  return access.enabled && access.usedMonth < access.monthlyLimit;
}

/* ---------- Artes prontas do cliente ---------- */

const ART_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function listCampaignArt(env, clientId) {
  if (!env.MEDIA) return [];
  const prefix = "library/" + String(clientId) + "/";
  const objects = [];
  let cursor;
  for (let page = 0; page < 5; page++) {
    const result = await env.MEDIA.list({ prefix, limit: 200, cursor, include: ["httpMetadata", "customMetadata"] });
    objects.push(...(result?.objects || []));
    if (!result?.truncated) break;
    cursor = result.cursor;
  }
  const used = new Set((await readState(env, clientId, "art-used", { keys: [] })).keys || []);
  return objects
    .filter(o => o.customMetadata?.purpose === "publish" && ART_TYPES.includes(String(o.httpMetadata?.contentType || "").toLowerCase()))
    .map(o => ({ key: o.key, name: o.customMetadata?.originalName || "arte", uploadedAt: o.uploaded || null, size: Number(o.size || 0), used: used.has(o.key) }))
    .sort((a, b) => String(a.uploadedAt || "").localeCompare(String(b.uploadedAt || "")));
}

// Próxima arte ainda não usada (a mais antiga primeiro). Copia para posts/ (endereço público).
export async function nextCampaignArt(env, client, postId) {
  if (!env.MEDIA) return null;
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!origin) return null;
  const art = (await listCampaignArt(env, client.id)).find(item => !item.used && item.size > 0 && item.size <= 10 * 1024 * 1024);
  if (!art) return null;
  const object = await env.MEDIA.get(art.key);
  if (!object) return null;
  const contentType = String(object.httpMetadata?.contentType || "").toLowerCase();
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = "posts/" + String(client.id) + "/" + String(postId) + "/client-art-" + crypto.randomUUID() + "." + extension;
  await env.MEDIA.put(key, object.body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: String(client.id), postId: String(postId), kind: "client-campaign-art", sourceLibraryKey: art.key }
  });
  const state = await readState(env, client.id, "art-used", { keys: [] });
  await writeState(env, client.id, "art-used", { keys: [...new Set([...(state.keys || []), art.key])].slice(-1000) });
  return { url: origin + "/media/" + key, key, sourceLibraryKey: art.key };
}

/* ---------- Rotas ---------- */

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const MESSAGES = {
  days_invalid: "Escolha 7, 15 ou 30 dias.",
  posts_invalid: "Escolha 1 ou 2 posts por dia.",
  ai_not_enabled: "A criação por IA ainda não está liberada na sua conta. Fale com a Flow Arts."
};

async function campaignView(env, client) {
  const art = await listCampaignArt(env, client.id);
  return {
    ok: true,
    settings: campaignSettings(client),
    ai: await aiImagesAccess(env, client.id),
    art: art.map(item => ({ ...item, url: "/media/" + item.key })),
    artLeft: art.filter(item => !item.used).length
  };
}

// Portal. Quem chama já conferiu o login do cliente.
export async function handleClientCampaignPortal(request, env, url, client) {
  if (url.pathname !== "/api/portal/campaign") return null;
  try {
    if (request.method === "GET") return send(await campaignView(env, client));
    if (request.method === "POST") {
      if (String(client?.id || "") === "demo-cafe") return send({ ok: false, error: "demo", message: "Na demonstração, nada é salvo." }, 400);
      const body = await request.json().catch(() => ({}));
      const settings = await saveCampaignSettings(env, client, body);
      return send({ ...(await campaignView(env, { ...client, config: { ...(client.config || {}), campaignSettings: settings } })), message: "Campanha salva." });
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu para salvar. Tente de novo." }, 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}

// Master: libera a imagem por IA e muda o limite de cada cliente.
export async function handleClientCampaignMaster(request, env, url, listClients) {
  if (url.pathname !== "/api/master/ai-images/access") return null;
  try {
    if (request.method === "GET") {
      const clients = await listClients(env).catch(() => []);
      const rows = [];
      for (const client of clients) {
        const id = String(client?.id || "");
        if (!id) continue;
        const settings = campaignSettings(client);
        rows.push({ id, name: String(client.name || id), ...(await aiImagesAccess(env, id)), artSource: settings?.artSource || "" });
      }
      return send({ ok: true, defaultLimit: AI_IMAGES_MONTHLY_LIMIT, clients: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setAiImagesAccess(env, body.clientId, typeof body.enabled === "boolean" ? body.enabled : undefined, body.monthlyLimit));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80) }, 400);
  }
  return null;
}
