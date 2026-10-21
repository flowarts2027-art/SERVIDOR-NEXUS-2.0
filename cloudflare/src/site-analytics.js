// Contador de visitas do site flowarts.com.br.
// Guarda só números por dia, página e origem (Google, Instagram...).
// Nada pessoal: sem IP, sem cookie, sem identificador do visitante.

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|monitor|curl|wget|python|node-fetch|axios/i;

export async function ensureSiteSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_visits_daily (
      day TEXT NOT NULL,
      path TEXT NOT NULL,
      source TEXT NOT NULL,
      visits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, path, source)
    )`).run();
  // Cliques que viram contato (ex.: botão do WhatsApp). Também só números.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_events_daily (
      day TEXT NOT NULL,
      path TEXT NOT NULL,
      event TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, path, event)
    )`).run();
}

const SITE_EVENTS = new Set(["whatsapp"]);
// Origens marcadas no link (PLANO_CRESCIMENTO, 21/10): bio, Stories, WhatsApp, Facebook, Google e e-mail.
const TAGGED_SOURCES = new Set(["instagram", "stories", "whatsapp", "facebook", "google", "email"]);

export function saoPauloDay(date = new Date()) {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function cleanPath(value) {
  const path = String(value || "/").split(/[?#]/)[0].toLowerCase();
  if (!/^\/[a-z0-9\-/.]{0,80}$/.test(path)) return "";
  if (/^\/(api|media|master|portal|login|b|brinde|downloads)(\/|$)/.test(path)) return "";
  return path.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
}

export function visitSource(referrer, ownHost = "flowarts.com.br") {
  let host = "";
  try { host = new URL(String(referrer || "")).hostname.toLowerCase(); } catch { return "direto"; }
  if (!host) return "direto";
  const own = ownHost.replace(/^www\./, "");
  if (host === own || host.endsWith("." + own)) return "interno";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)instagram\.com$/.test(host) || host === "l.instagram.com") return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com)$/.test(host)) return "outros buscadores";
  return "outros sites";
}

// POST /api/site/hit  { p: caminho, r: referrer }
export async function handleSiteHit(request, env) {
  const ua = String(request.headers.get("user-agent") || "");
  if (!ua || BOT_UA.test(ua)) return new Response(null, { status: 204 });
  const raw = await request.text().catch(() => "");
  if (raw.length > 2000) return new Response(null, { status: 204 });
  let body = {};
  try { body = JSON.parse(raw || "{}"); } catch {}
  const path = cleanPath(body.p);
  if (!path) return new Response(null, { status: 204 });
  await ensureSiteSchema(env);
  if (body.e !== undefined) {
    const event = String(body.e);
    if (!SITE_EVENTS.has(event)) return new Response(null, { status: 204 });
    await env.DB.prepare(
      `INSERT INTO site_events_daily(day,path,event,count) VALUES(?1,?2,?3,1)
       ON CONFLICT(day,path,event) DO UPDATE SET count=count+1`
    ).bind(saoPauloDay(), path, event).run();
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  // ?de=instagram|stories|whatsapp… no link vale mais que o referrer (o app do Instagram costuma esconder a origem).
  const source = TAGGED_SOURCES.has(String(body.d || "")) ? String(body.d) : visitSource(body.r);
  // Navegação dentro do próprio site conta como página vista com origem "interno".
  await env.DB.prepare(
    `INSERT INTO site_visits_daily(day,path,source,visits) VALUES(?1,?2,?3,1)
     ON CONFLICT(day,path,source) DO UPDATE SET visits=visits+1`
  ).bind(saoPauloDay(), path, source).run();
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

// Resumo para o painel Master.
export async function siteStats(env, days = 30, now = new Date()) {
  await ensureSiteSchema(env);
  const n = Math.max(1, Math.min(90, Number(days) || 30));
  const since = saoPauloDay(new Date(now.getTime() - (n - 1) * 86400000));
  const today = saoPauloDay(now);
  const week = saoPauloDay(new Date(now.getTime() - 6 * 86400000));
  const rows = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all())?.results || [];
  const byDay = await rows(
    `SELECT day, SUM(visits) AS visits FROM site_visits_daily WHERE day>=?1 GROUP BY day ORDER BY day`, since);
  const pages = await rows(
    `SELECT path, SUM(visits) AS visits FROM site_visits_daily WHERE day>=?1 GROUP BY path ORDER BY visits DESC LIMIT 10`, since);
  const sources = await rows(
    `SELECT source, SUM(visits) AS visits FROM site_visits_daily WHERE day>=?1 AND source<>'interno' GROUP BY source ORDER BY visits DESC`, since);
  const sum = list => list.reduce((total, row) => total + Number(row.visits || 0), 0);
  // Resultado: quem chegou de fora, quem clicou no WhatsApp e quem pediu o exemplo grátis.
  const before = saoPauloDay(new Date(now.getTime() - (2 * n - 1) * 86400000));
  const one = async (sql, ...args) => Number((await env.DB.prepare(sql).bind(...args).first())?.n || 0);
  const entries = await one(`SELECT SUM(visits) AS n FROM site_visits_daily WHERE day>=?1 AND source<>'interno'`, since);
  const entriesBefore = await one(`SELECT SUM(visits) AS n FROM site_visits_daily WHERE day>=?1 AND day<?2 AND source<>'interno'`, before, since);
  const clicks = await rows(
    `SELECT path, SUM(count) AS n FROM site_events_daily WHERE day>=?1 AND event='whatsapp' GROUP BY path ORDER BY n DESC`, since);
  const whatsapp = clicks.reduce((total, row) => total + Number(row.n || 0), 0);
  const whatsappWeek = await one(`SELECT SUM(count) AS n FROM site_events_daily WHERE day>=?1 AND event='whatsapp'`, week);
  // Pedidos do formulário "exemplo grátis" (/exemplo), guardados como lead.
  const leadSince = since + "T03:00:00.000Z";
  // created_at pode vir como "AAAA-MM-DD HH:MM:SS" (padrão do D1) ou ISO; o replace deixa os dois comparáveis.
  const leads = await one(`SELECT COUNT(*) AS n FROM leads WHERE source='landing' AND replace(created_at,' ','T')>=?1`, leadSince).catch(() => 0);
  return {
    ok: true,
    days: n,
    totals: {
      today: sum(byDay.filter(row => row.day === today)),
      week: sum(byDay.filter(row => row.day >= week)),
      period: sum(byDay)
    },
    results: {
      entries,
      entriesBefore,
      whatsapp,
      whatsappWeek,
      leads,
      rate: entries ? Math.round((whatsapp + leads) / entries * 1000) / 10 : 0,
      whatsappPages: clicks.map(row => ({ path: row.path, clicks: Number(row.n || 0) }))
    },
    byDay: byDay.map(row => ({ day: row.day, visits: Number(row.visits || 0) })),
    pages: pages.map(row => ({ path: row.path, visits: Number(row.visits || 0) })),
    sources: sources.map(row => ({ source: row.source, visits: Number(row.visits || 0) }))
  };
}
