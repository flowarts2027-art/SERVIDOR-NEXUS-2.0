// Radar Comercial Flow Arts (01/11/2026, pedido do Rodrigo): três jeitos permitidos de achar clientes
// no Instagram, sem robô e sem ler a lista de seguidores de ninguém.
//  1) "Colar o @": o Rodrigo viu alguém comentando no post de um concorrente, cola o @ e o Nexus guarda
//     a oportunidade com o link do post como prova (ele mesmo leu o comentário público).
//  2) "Vigia": todo dia o Nexus olha, pela Business Discovery oficial da Meta, os posts dos perfis que ele
//     cadastrou e marca os que tiveram muitos comentários. A Meta entrega a QUANTIDADE, nunca quem comentou.
//  3) "Isca": quem comenta palavra de interesse nos posts da PRÓPRIA Flow Arts entra no Radar sozinho.
// Nada aqui envia mensagem, segue alguém ou publica. Contato só depois da aprovação manual no painel.
import { getState, putState } from "./storage.js";
import { decryptSecret } from "./secrets.js";
import { inspectInstagramBusiness } from "./instagram-business-discovery.js";

export const FLOW_ARTS_CLIENT = "primeiro-teste";
export const WATCH_NS = "radar-competitor-watch";
const MAX_COMPETITORS = 15;
const MEDIA_PER_PROFILE = 15;
const MAX_AGE_DAYS = 45;
const HOT_PER_PROFILE = 3;
const MIN_HOT_COMMENTS = 15;

const clean = (v, n = 500) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export const goodHandle = v => {
  const s = clean(v, 120).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0].replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : "";
};
const graphVersion = env => /^v\d+\.\d+$/.test(String(env.META_GRAPH_VERSION || "")) ? env.META_GRAPH_VERSION : "v25.0";
const instagramPostUrl = v => {
  try {
    const u = new URL(String(v || ""));
    if (u.protocol !== "https:" || !/^(www\.)?instagram\.com$/i.test(u.hostname)) return "";
    if (!/^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return "";
    return "https://www.instagram.com" + u.pathname.replace(/\/?$/, "/");
  } catch { return ""; }
};

// Palavra do comentário → categoria do Radar. Sem palavra clara, fica "leads" (interesse geral).
export function categoryFromText(text = "") {
  const t = String(text).toLowerCase();
  if (/\bsite\b|landing|p[aá]gina|loja virtual|dom[ií]nio/.test(t)) return "site";
  if (/automa|instagram|post(ar|agem)?\b|reels?\b|direct|chatbot|\bbot\b|\bia\b|intelig[eê]ncia|whats/.test(t)) return "instagram";
  if (/fornecedor|comprador|representante|b2b|prospec/.test(t)) return "prospeccao";
  return "leads";
}

// Escolhe os posts que "bombaram" em comentários. Puro, para testar sem a Meta.
export function hotPosts(media = [], now = new Date()) {
  const recent = (Array.isArray(media) ? media : []).filter(m => {
    const at = Date.parse(String(m?.timestamp || ""));
    return Number.isFinite(at) && now.getTime() - at <= MAX_AGE_DAYS * 864e5 && instagramPostUrl(m?.permalink);
  });
  const counts = recent.map(m => Number(m.comments_count || 0)).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const bar = Math.max(MIN_HOT_COMMENTS, median * 2);
  return recent
    .filter(m => Number(m.comments_count || 0) >= bar)
    .sort((a, b) => Number(b.comments_count || 0) - Number(a.comments_count || 0))
    .slice(0, HOT_PER_PROFILE)
    .map(m => ({
      url: instagramPostUrl(m.permalink),
      caption: clean(m.caption, 220),
      comments: Number(m.comments_count || 0),
      likes: Number.isFinite(Number(m.like_count)) ? Number(m.like_count) : null,
      at: String(m.timestamp || ""),
      type: clean(m.media_type, 20),
      median
    }));
}

async function metaAccess(env) {
  const saved = (await getState(env, "integration", "facebook-radar").catch(() => null))?.value || {};
  if (!saved.token || !/^\d+$/.test(String(saved.igUserId || ""))) return { error: "facebook_radar_not_connected" };
  if (saved.expiresAt && Date.parse(saved.expiresAt) < Date.now()) return { error: "facebook_radar_token_expired" };
  const token = await decryptSecret(env, saved.token).catch(() => "");
  return token ? { token, igUserId: String(saved.igUserId) } : { error: "facebook_radar_token_unavailable" };
}

export async function fetchProfileMedia(access, env, handle, fetcher = fetch) {
  const url = new URL("https://graph.facebook.com/" + graphVersion(env) + "/" + access.igUserId);
  url.searchParams.set("fields", "business_discovery.username(" + handle + "){username,name,followers_count,media.limit(" + MEDIA_PER_PROFILE + "){caption,comments_count,like_count,timestamp,permalink,media_type}}");
  let response;
  try {
    response = await fetcher(url.toString(), { headers: { authorization: "Bearer " + access.token, accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10000) });
  } catch { return { ok: false, error: "meta_request_failed" }; }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) return { ok: false, error: "meta_business_discovery_unavailable" };
  const d = body.business_discovery;
  if (!d || goodHandle(d.username) !== handle) return { ok: false, error: "profile_not_accessible" };
  return { ok: true, name: clean(d.name, 120), followers: Number(d.followers_count || 0), media: Array.isArray(d.media?.data) ? d.media.data : [] };
}

// Roda uma vez por dia (ou na hora, pelo botão). Guarda o resultado; não grava leads.
export async function runCompetitorWatch(env, now = new Date(), fetcher = fetch, { force = false } = {}) {
  if (!env.DB) return { ok: false, error: "missing_database" };
  const previous = (await getState(env, WATCH_NS, "latest", FLOW_ARTS_CLIENT).catch(() => null))?.value || null;
  const today = now.toISOString().slice(0, 10);
  if (!force && previous?.day === today) return { ok: true, skipped: "already_ran_today" };
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_competitors (instagram TEXT PRIMARY KEY,category TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const rows = (await env.DB.prepare("SELECT instagram FROM flow_radar_competitors ORDER BY created_at ASC LIMIT ?").bind(MAX_COMPETITORS).all()).results || [];
  const out = { ok: true, day: today, at: now.toISOString(), profiles: [], posts: [], errors: [] };
  if (!rows.length) { out.note = "no_competitors"; await putState(env, WATCH_NS, "latest", FLOW_ARTS_CLIENT, out); return out; }
  const access = await metaAccess(env);
  if (access.error) { out.ok = false; out.error = access.error; await putState(env, WATCH_NS, "latest", FLOW_ARTS_CLIENT, out); return out; }
  for (const row of rows) {
    const handle = goodHandle(row.instagram);
    if (!handle) continue;
    const res = await fetchProfileMedia(access, env, handle, fetcher);
    if (!res.ok) { out.profiles.push({ instagram: handle, ok: false, error: res.error }); continue; }
    const hot = hotPosts(res.media, now);
    out.profiles.push({ instagram: handle, ok: true, name: res.name, followers: res.followers, checkedPosts: res.media.length, hot: hot.length });
    for (const p of hot) out.posts.push({ competitor: handle, ...p });
  }
  out.posts.sort((a, b) => b.comments - a.comments);
  await putState(env, WATCH_NS, "latest", FLOW_ARTS_CLIENT, out);
  return out;
}

export async function competitorWatchResult(env) {
  return (await getState(env, WATCH_NS, "latest", FLOW_ARTS_CLIENT).catch(() => null))?.value || null;
}

async function insertLead(env, lead) {
  const result = await env.DB.prepare("INSERT OR IGNORE INTO flow_radar_leads(id,instagram,business,category,evidence,evidence_url,competitor,website,whatsapp,contact_source,source_type,score,reason,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
    crypto.randomUUID(), lead.instagram, lead.business || "", lead.category, lead.evidence, lead.evidenceUrl,
    lead.competitor || "", "", "", "", lead.sourceType, lead.score, lead.reason, lead.notes || ""
  ).run();
  return Boolean(result?.meta?.changes);
}

// Forma 1: o Rodrigo colou o @ de quem comentou no post de um concorrente.
export async function saveCommenterLead(env, body = {}, { qualify, fetcher = fetch } = {}) {
  const instagram = goodHandle(body.instagram);
  const postUrl = instagramPostUrl(body.post_url);
  const competitor = goodHandle(body.competitor);
  const comment = clean(body.comment, 400);
  if (!instagram) return { ok: false, status: 400, error: "invalid_instagram_handle" };
  if (!postUrl) return { ok: false, status: 400, error: "invalid_post_url" };
  if (competitor && instagram === competitor) return { ok: false, status: 400, error: "same_as_competitor" };
  const category = categoryFromText(comment);
  // Consulta opcional: se for perfil profissional, a Meta devolve o nome. Falhar aqui não impede salvar.
  let business = "";
  const profile = await inspectInstagramBusiness(env, instagram, fetcher).catch(() => null);
  if (profile?.ok) business = profile.name;
  const evidence = "Comentou no post de @" + (competitor || "concorrente") + (comment ? ": \"" + comment + "\"" : " (comentário lido pelo Rodrigo).");
  const q = qualify(category, evidence, business);
  const saved = await insertLead(env, {
    instagram, business, category, evidence, evidenceUrl: postUrl, competitor, sourceType: "manual_public",
    score: q.score, reason: q.reason,
    notes: "Comentário público lido pelo próprio Rodrigo no post do concorrente. Revisar antes de contatar." + (profile?.ok ? "" : " Perfil pessoal ou não disponível na API.")
  });
  return { ok: true, status: saved ? 201 : 200, saved, duplicate: !saved, category, qualification: q, profileChecked: Boolean(profile?.ok) };
}

// Forma 3: comentário com palavra de interesse num post da própria Flow Arts.
export async function recordOwnCommentLead(env, client, comment = {}, { qualify, ownUsername = "", permalink = "" } = {}) {
  if (!env?.DB || String(client?.id || "") !== FLOW_ARTS_CLIENT) return false;
  const instagram = goodHandle(comment.username || comment.from?.username);
  if (!instagram || instagram === goodHandle(ownUsername)) return false;
  const text = clean(comment.text, 400);
  const category = categoryFromText(text);
  const own = goodHandle(ownUsername) || "flowarts2026";
  const evidenceUrl = instagramPostUrl(permalink) || "https://www.instagram.com/" + own + "/";
  const evidence = "Comentou num post da Flow Arts: \"" + text + "\"";
  const q = qualify(category, evidence, "");
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_leads (id TEXT PRIMARY KEY,instagram TEXT NOT NULL,business TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,evidence TEXT NOT NULL,evidence_url TEXT NOT NULL,competitor TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',contact_source TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL DEFAULT 'manual_public',score INTEGER NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'novo',approved_at TEXT,contacted_at TEXT,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(instagram,category,evidence_url))").run();
  return insertLead(env, {
    instagram, category, evidence, evidenceUrl, sourceType: "authorized_import",
    score: q.score, reason: q.reason,
    notes: "Comentário no Instagram da própria Flow Arts (API oficial). A resposta automática do brinde não é contato comercial; aprovar antes de abordar."
  }).catch(() => false);
}
