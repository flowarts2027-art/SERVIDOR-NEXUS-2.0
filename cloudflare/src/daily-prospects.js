// Busca diária do Caçador (pedido de 17/10/2026, opção 2 do Rodrigo):
// todo dia, a partir das 9h, o Nexus acha empresas de nichos diferentes (em rodízio),
// coloca no CRM em "Para chamar" com a mensagem e o exemplo prontos, e avisa o celular.
// NADA é enviado sozinho: o Rodrigo toca em "Enviar" no painel.
// Usa só o mapa grátis (OpenStreetMap): o Google não permite guardar os dados dos lugares.

import { NICHES, CITIES, searchOSM, osmToProspect, firstMessage } from "./prospects.js";
import { hoursStatus } from "./business-hours.js";
import { readShowcase } from "./showcase-store.js";
import { seedBundledExamples } from "./bundled-examples.js";
import { brasiliaDay, createContact, crmKnows, ensureCrmSchema } from "./crm.js";
import { sendPushToAll } from "./push.js";

// 19/10 (Rodrigo): 10 empresas por dia (antes 3).
export const DAILY_TARGET = 10;
const START_HOUR_BRT = 9;
const MAX_ATTEMPTS_PER_DAY = 16;
const MAX_SEARCHES_PER_RUN = 3;

async function readState(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_settings (id TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const row = await env.DB.prepare("SELECT value_json FROM crm_settings WHERE id='daily'").first();
  let state;
  try { state = { enabled: true, target: DAILY_TARGET, nicheCursor: 0, cityCursor: {}, ...JSON.parse(row?.value_json || "{}") }; } catch { state = { enabled: true, target: DAILY_TARGET, nicheCursor: 0, cityCursor: {} }; }
  // 19/10: quem estava com 3 por dia passa para 10 uma vez (depois vale o que ele escolher no painel).
  if (!state.target10) Object.assign(state, { target: DAILY_TARGET, target10: true });
  return state;
}

// 19/10 (Rodrigo): "limpar o histórico" de quem já recebeu mensagem e não respondeu.
// Arquiva (não apaga): some do CRM, mas o Nexus lembra do número e não chama a mesma empresa de novo.
// Fica: quem está conversando, com proposta, cliente ou "não quer".
export async function clearNoReply(env, now = new Date()) {
  const today = brasiliaDay(now);
  await ensureCrmSchema(env);
  const result = await env.DB.prepare(
    "UPDATE crm_contacts SET archived=1,updated_at=?1 WHERE archived=0 AND (stage='contato' OR (stage='chamar' AND substr(created_at,1,10)<?2))"
  ).bind(now.toISOString(), today).run();
  return { ok: true, archived: Number(result?.meta?.changes || 0) };
}

async function writeState(env, state) {
  await env.DB.prepare(
    "INSERT INTO crm_settings(id,value_json,updated_at) VALUES('daily',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP"
  ).bind(JSON.stringify(state)).run();
}

// Ordem dos nichos: primeiro os que têm exemplo (o cliente vê o resultado), depois os outros; sempre em rodízio.
// 19/10 (Rodrigo): toda mensagem tem que levar pelo menos uma imagem. Por isso, se algum nicho
// já tem exemplo, a busca fica SÓ nos nichos com exemplo. Os outros entram sozinhos quando
// ele subir o exemplo (as imagens que estão sendo feitas no ChatGPT).
export function nicheOrder(showcase, cursor) {
  const keys = Object.keys(NICHES);
  const has = k => Boolean(showcase?.[k]?.videoUrl || (showcase?.[k]?.kind === "carousel" && showcase[k].images?.length));
  const withExample = keys.filter(has);
  const pool = withExample.length ? withExample : keys;
  const start = Number(cursor || 0) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

export async function runDailyProspects(env, now = new Date(), fetcher = fetch, { force = false } = {}) {
  const state = await readState(env);
  const today = brasiliaDay(now);
  // Limpeza pedida em 19/10: roda uma vez só, no primeiro ciclo depois do deploy.
  if (!state.cleaned1019) {
    state.cleaned1019 = 1 + (await clearNoReply(env, now)).archived;
    await writeState(env, state);
  }
  // Exemplos que vieram junto com o site (bar, dentista…) entram na vitrine, se o nicho ainda não tiver.
  await seedBundledExamples(env, now).catch(() => null);

  const hourBrt = new Date(now.getTime() - 3 * 3600 * 1000).getUTCHours();
  if (!state.enabled && !force) return { ok: true, skipped: "disabled" };
  if (!force && hourBrt < START_HOUR_BRT) return { ok: true, skipped: "too_early" };
  if (state.day !== today) Object.assign(state, { day: today, picked: 0, niches: [], attempts: 0, notified: false });
  const target = Math.max(1, Math.min(10, Number(state.target || DAILY_TARGET)));
  if (state.picked >= target) return { ok: true, skipped: "done", picked: state.picked };
  if (state.attempts >= MAX_ATTEMPTS_PER_DAY && !force) return { ok: true, skipped: "attempts" };
  state.attempts += 1;

  const showcase = await readShowcase(env);
  // Primeiro nichos que ainda não saíram hoje; se os nichos com exemplo forem menos que a meta, repete nicho.
  const all = nicheOrder(showcase, state.nicheCursor);
  let order = [...all.filter(k => !state.niches.includes(k)), ...all.filter(k => state.niches.includes(k))];
  while (order.length && order.length < MAX_SEARCHES_PER_RUN) order.push(...all);
  const added = [];
  let searches = 0;
  let lastError = "";
  for (const niche of order) {
    if (state.picked >= target || searches >= MAX_SEARCHES_PER_RUN) break;
    const cityIndex = Number(state.cityCursor?.[niche] || 0) % CITIES.length;
    state.cityCursor = { ...(state.cityCursor || {}), [niche]: cityIndex + 1 };
    searches += 1;
    let elements = [];
    try {
      elements = await searchOSM(niche, cityIndex, fetcher);
    } catch (error) {
      lastError = String(error?.message || error).slice(0, 80);
      continue;
    }
    // Só celular (WhatsApp), sem site próprio, que ainda não está no CRM. Melhor nota primeiro.
    const candidates = elements.map(e => osmToProspect(e, niche, CITIES[cityIndex])).filter(p => p && p.mobile).sort((a, b) => b.score - a.score);
    for (const p of candidates) {
      if (await crmKnows(env, { phone: p.phone, sourceId: p.id })) continue;
      const draft = firstMessage(p, showcase);
      // Fechada agora: o lembrete fica para quando ela abrir (pedido de 18/10).
      // Sem horário no mapa: fica para hoje mesmo (não dá para saber se está fechada).
      const st = Array.isArray(p.hours) ? hoursStatus(p.hours, now) : { openNow: true };
      await createContact(env, {
        name: p.name, business: p.name, phone: p.phone, niche, stage: "chamar", interest: "",
        notes: `Achado pelo Nexus no mapa · ${CITIES[cityIndex]}${p.instagram ? " · Instagram @" + p.instagram : ""}`,
        source: "cacador-auto", sourceId: p.id, draft, hours: p.hours,
        followAt: st.openNow ? today : st.nextOpenDay || today, followTime: st.openNow ? "" : st.nextOpenTime || ""
      }, now);
      state.picked += 1;
      state.niches.push(niche);
      added.push({ niche, name: p.name, city: CITIES[cityIndex] });
      break;
    }
  }
  state.nicheCursor = Number(state.nicheCursor || 0) + Math.max(1, added.length);
  let push = null;
  // Avisa uma vez por dia, quando a lista do dia fica completa (ou no fim das tentativas, se achou alguém).
  if (!state.notified && state.picked > 0 && (state.picked >= target || state.attempts >= MAX_ATTEMPTS_PER_DAY) && !force) {
    push = await sendPushToAll(env, now, fetcher).catch(() => null);
    state.notified = true;
  }
  await writeState(env, state);
  return { ok: true, picked: state.picked, target, added, push, error: lastError || undefined };
}

export async function dailySettings(env) {
  const s = await readState(env);
  return { enabled: s.enabled !== false, target: Number(s.target || DAILY_TARGET), today: s.day === brasiliaDay() ? Number(s.picked || 0) : 0 };
}

export async function saveDailySettings(env, body = {}) {
  const s = await readState(env);
  if ("enabled" in body) s.enabled = Boolean(body.enabled);
  if ("target" in body) s.target = Math.max(1, Math.min(10, Number(body.target) || DAILY_TARGET));
  await writeState(env, s);
  return { ok: true, ...(await dailySettings(env)) };
}

// Master: GET/POST /api/master/crm/daily e POST /api/master/crm/daily/run (buscar agora).
export async function handleDailyRoute(request, env, url) {
  if (!url.pathname.startsWith("/api/master/crm/daily")) return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  try {
    if (url.pathname === "/api/master/crm/daily" && request.method === "GET") return send({ ok: true, ...(await dailySettings(env)) });
    if (url.pathname === "/api/master/crm/daily" && request.method === "POST") return send(await saveDailySettings(env, await request.json().catch(() => ({}))));
    if (url.pathname === "/api/master/crm/daily/run" && request.method === "POST") return send(await runDailyProspects(env, new Date(), fetch, { force: true }));
    if (url.pathname === "/api/master/crm/daily/clean" && request.method === "POST") return send(await clearNoReply(env));
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80), message: "Não deu para buscar agora. Tente de novo em alguns minutos." }, 400);
  }
  return null;
}
