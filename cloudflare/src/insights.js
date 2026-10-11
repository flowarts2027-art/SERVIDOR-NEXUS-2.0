// Números do Instagram para o painel do cliente.
// Busca na Meta no máximo a cada 30 minutos por cliente (limites da API e do
// Worker) e guarda o resultado em nexus_state, separado do estado dos agentes.

const CACHE_MINUTES = 30;
const NAMESPACE = "portal-insights";

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

const num = value => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);

export function summarizeSnapshot(snapshot = {}, previous = {}, now = new Date()) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const posts = items.slice(0, 12).map(item => {
    const insights = item.insights && typeof item.insights === "object" ? item.insights : {};
    return {
      id: String(item.id || ""),
      permalink: String(item.permalink || ""),
      mediaUrl: String(item.mediaUrl || ""),
      mediaType: String(item.mediaType || ""),
      timestamp: item.timestamp || null,
      caption: String(item.caption || "").slice(0, 160),
      likes: num(item.likeCount),
      comments: num(item.commentsCount),
      reach: num(insights.reach),
      views: num(insights.views),
      saved: num(insights.saved),
      shares: num(insights.shares)
    };
  });
  const sum = key => posts.reduce((total, post) => total + post[key], 0);
  const followers = snapshot.followersCount == null ? null : num(snapshot.followersCount);
  const day = now.toISOString().slice(0, 10);
  const history = (Array.isArray(previous.followersHistory) ? previous.followersHistory : [])
    .filter(point => point && point.day !== day);
  if (followers != null) history.push({ day, followers });
  return {
    username: String(snapshot.username || ""),
    followers,
    mediaCount: snapshot.mediaCount == null ? posts.length : num(snapshot.mediaCount),
    totals: {
      reach: sum("reach"),
      views: sum("views"),
      likes: sum("likes"),
      comments: sum("comments"),
      saved: sum("saved"),
      shares: sum("shares")
    },
    posts,
    followersHistory: history.slice(-30),
    updatedAt: now.toISOString()
  };
}

async function readCache(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='cache' AND client_id=?2 LIMIT 1"
  ).bind(NAMESPACE, String(clientId)).first().catch(() => null);
  return row ? parseJson(row.value_json, {}) : {};
}

async function writeCache(env, clientId, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'cache', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET
       value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify(value)).run();
}

export async function clientInsights(env, client, { fetchSnapshot, force = false, now = new Date() } = {}) {
  const cached = await readCache(env, client.id);
  const age = Date.parse(String(cached.updatedAt || ""));
  if (!force && Number.isFinite(age) && now.getTime() - age < CACHE_MINUTES * 60000) {
    return { ok: true, cached: true, ...cached };
  }
  const snapshot = await fetchSnapshot(env, client).catch(error => ({ error: String(error?.message || error) }));
  if (snapshot?.error || !String(snapshot?.source || "").startsWith("instagram-api") || snapshot.source === "instagram-api-error") {
    if (cached.updatedAt) return { ok: true, cached: true, stale: true, ...cached };
    return { ok: false, error: snapshot?.error === "instagram_not_connected" ? "instagram_not_connected" : "instagram_unavailable" };
  }
  const summary = summarizeSnapshot(snapshot, cached, now);
  await writeCache(env, client.id, summary).catch(() => null);
  return { ok: true, cached: false, ...summary };
}
