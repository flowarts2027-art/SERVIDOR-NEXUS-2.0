// Busca diária do Captador do CLIENTE (pedido do Rodrigo em 22/10/2026, cliente de ração).
// Igual à busca diária do Master: todo dia, a partir das 9h, o Nexus separa até 10 empresas
// novas dos tipos que o cliente escolheu, nas cidades dele, e deixa na aba "Separadas hoje"
// com a mensagem e o material prontos (WhatsApp ou Direct do Instagram).
// NADA é enviado sozinho: o cliente toca no botão e manda pelo próprio celular.
// Usa só o mapa grátis (OpenStreetMap), porque o Google não permite guardar a lista.

import {
  CAPTADOR_NICHES, captadorEnabled, captadorUsage, ensureCaptadorSchema,
  searchCaptadorOSM, captadorLeadOSM, captadorConfig
} from "./captador.js";
import { hoursStatus } from "./business-hours.js";

export const CLIENT_DAILY_TARGET = 10;
const START_HOUR_BRT = 9;
const MAX_ATTEMPTS_PER_DAY = 12;
const MAX_SEARCHES_PER_RUN = 2;
const MAX_CITIES = 10; // 22/10: Rodrigo pediu todas as cidades perto de Uberlândia

// Ramo do cliente → tipos de negócio que compram dele. Usado só quando ele ainda não escolheu.
const NICHE_HINTS = [
  [/ra[cç][aã]o|pet ?food|distribuidora pet|produtos? pet/i, ["pet", "racao", "agropecuaria", "veterinario"]]
];

const day = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
const clean = (value, max) => String(value || "").replace(/[\u0000-\u001f<>"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function suggestedNiches(client = {}) {
  const text = [client?.niche, client?.config?.agentProfile?.niche, client?.config?.agentProfile?.offer].filter(Boolean).join(" ");
  for (const [rule, niches] of NICHE_HINTS) if (rule.test(text)) return [...niches];
  return [];
}

// "Uberlândia MG; Uberaba MG, Araguari MG" → lista de cidades (no máximo 10).
export function parseCities(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[;\n]|,(?=\s*\p{Lu}\p{Ll})/u);
  const out = [];
  for (const item of list) {
    const city = clean(item, 60);
    if (city.length >= 3 && /\p{L}/u.test(city) && !out.includes(city)) out.push(city);
    if (out.length >= MAX_CITIES) break;
  }
  return out;
}

async function readState(env, clientId, key, fallback) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='captador' AND item_key=?1 AND client_id=?2 LIMIT 1"
  ).bind(key, clientId).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : fallback; } catch { return fallback; }
}

async function writeState(env, clientId, key, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES('captador',?1,?2,?3,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(key, clientId, JSON.stringify(value)).run();
}

// Escolhas do cliente. Sem nada salvo: desligada, com os tipos sugeridos pelo ramo e a cidade do perfil.
export async function clientDailySettings(env, client) {
  const saved = await readState(env, client.id, "daily", null);
  const region = client?.config?.agentProfile?.region || "";
  const niches = (Array.isArray(saved?.niches) ? saved.niches : suggestedNiches(client)).filter(k => CAPTADOR_NICHES[k]);
  return {
    enabled: saved?.enabled === true,
    niches,
    cities: parseCities(saved?.cities ?? region),
    target: Math.max(1, Math.min(CLIENT_DAILY_TARGET, Number(saved?.target) || CLIENT_DAILY_TARGET)),
    run: saved?.run && typeof saved.run === "object" ? saved.run : {}
  };
}

export async function saveClientDailySettings(env, client, body = {}) {
  const current = await clientDailySettings(env, client);
  const niches = Array.isArray(body.niches) ? [...new Set(body.niches.map(String))].filter(k => CAPTADOR_NICHES[k]) : current.niches;
  const cities = "cities" in body ? parseCities(body.cities) : current.cities;
  const target = "target" in body ? Math.max(1, Math.min(CLIENT_DAILY_TARGET, Number(body.target) || CLIENT_DAILY_TARGET)) : current.target;
  const enabled = "enabled" in body ? body.enabled === true : current.enabled;
  if (enabled && !niches.length) throw new Error("daily_niches");
  if (enabled && !cities.length) throw new Error("daily_cities");
  const next = { enabled, niches, cities, target, run: current.run };
  await writeState(env, client.id, "daily", next);
  return publicDaily(next);
}

export const publicDaily = s => ({
  enabled: s.enabled, niches: s.niches, cities: s.cities, target: s.target,
  today: s.run?.day === day() ? Number(s.run.picked || 0) : 0
});

async function known(env, clientId, id) {
  if (await env.DB.prepare("SELECT 1 AS x FROM captador_leads WHERE client_id=?1 AND id=?2").bind(clientId, id).first()) return true;
  return Boolean(await env.DB.prepare("SELECT 1 AS x FROM captador_skips WHERE client_id=?1 AND id=?2").bind(clientId, id).first());
}

async function saveToday(env, clientId, lead, now) {
  const st = Array.isArray(lead.hours) ? hoursStatus(lead.hours, now) : { openNow: true };
  const remindAt = st.openNow ? "" : (st.nextOpenAt || "");
  await env.DB.prepare(
    `INSERT INTO captador_leads(client_id,id,name,niche,city,address,phone,mobile,has_site,instagram,maps_url,score,status,remind_at,hours_json)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'hoje',?13,?14)
     ON CONFLICT(client_id,id) DO NOTHING`
  ).bind(clientId, lead.id, lead.name, lead.niche, lead.city, lead.address || "", lead.phone, lead.mobile ? 1 : 0,
    lead.has_site ? 1 : 0, lead.instagram || "", lead.maps_url, lead.score, remindAt,
    Array.isArray(lead.hours) ? JSON.stringify(lead.hours) : "").run();
}

// Uma rodada para um cliente. `force` = botão "Buscar agora" (ignora o horário das 9h).
export async function runClientDaily(env, client, now = new Date(), fetcher = fetch, { force = false } = {}) {
  await ensureCaptadorSchema(env);
  if (!(await captadorEnabled(env, client.id))) return { ok: true, skipped: "captador_disabled" };
  const s = await clientDailySettings(env, client);
  if (!s.enabled && !force) return { ok: true, skipped: "disabled" };
  if (!s.niches.length || !s.cities.length) return { ok: true, skipped: "not_configured" };
  const hourBrt = new Date(now.getTime() - 3 * 3600e3).getUTCHours();
  if (!force && hourBrt < START_HOUR_BRT) return { ok: true, skipped: "too_early" };
  const today = day(now);
  const run = s.run?.day === today ? { ...s.run } : { day: today, picked: 0, attempts: 0, cursor: Number(s.run?.cursor || 0) };
  if (run.picked >= s.target) return { ok: true, skipped: "done", picked: run.picked, target: s.target };
  if (run.attempts >= MAX_ATTEMPTS_PER_DAY && !force) return { ok: true, skipped: "attempts", picked: run.picked };
  // Cada rodada gasta buscas do limite do mês, como a busca feita na mão.
  const access = await readState(env, client.id, "access", {});
  const limit = Number.isFinite(Number(access.monthlyLimit)) ? Number(access.monthlyLimit) : 100;
  const used = await captadorUsage(env, client.id);
  if (used >= limit) return { ok: true, skipped: "monthly_limit", picked: run.picked };
  run.attempts += 1;

  const config = await captadorConfig(env, client);
  const combos = s.niches.flatMap(n => s.cities.map(c => [n, c]));
  const added = [];
  let searches = 0;
  let lastError = "";
  while (searches < MAX_SEARCHES_PER_RUN && run.picked < s.target && used + searches < limit) {
    const [niche, city] = combos[Number(run.cursor || 0) % combos.length];
    run.cursor = Number(run.cursor || 0) + 1;
    searches += 1;
    let elements = [];
    try { elements = await searchCaptadorOSM(niche, city, fetcher); } catch (error) { lastError = String(error?.message || error).slice(0, 60); continue; }
    // Celular primeiro (WhatsApp), depois quem tem Instagram; melhor nota primeiro.
    const leads = elements.map(e => captadorLeadOSM(e, niche, city, config.onlyNoSite)).filter(Boolean)
      .sort((a, b) => (b.mobile - a.mobile) || (Boolean(b.instagram) - Boolean(a.instagram)) || (b.score - a.score));
    // No máximo 4 de uma mesma busca, para variar tipos e cidades no dia.
    let fromThis = 0;
    for (const lead of leads) {
      if (run.picked >= s.target || fromThis >= 4) break;
      if (await known(env, client.id, lead.id)) continue;
      await saveToday(env, client.id, lead, now);
      run.picked += 1; fromThis += 1;
      added.push({ niche, city, name: lead.name });
    }
  }
  if (searches) await writeState(env, client.id, "usage", { month: today.slice(0, 7), count: used + searches });
  await writeState(env, client.id, "daily", { enabled: s.enabled, niches: s.niches, cities: s.cities, target: s.target, run });
  return { ok: true, picked: run.picked, target: s.target, added, searches, error: lastError || undefined };
}

// Cron: todos os clientes com Captador ligado e busca diária ligada. Um erro não para os outros.
export async function runAllClientDaily(env, now = new Date(), listClients, fetcher = fetch) {
  const clients = await listClients(env).catch(() => []);
  const out = [];
  for (const client of clients) {
    if (!client?.id) continue;
    try {
      const r = await runClientDaily(env, client, now, fetcher);
      if (!r.skipped) out.push({ clientId: client.id, picked: r.picked });
    } catch (error) {
      console.warn("client_daily_failed", client.id, String(error?.message || error).slice(0, 80));
    }
  }
  return { ok: true, clients: out };
}
