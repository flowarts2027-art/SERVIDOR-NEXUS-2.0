// Reel automático (pedido do Rodrigo em 17/10: "todo o processo automatizado, manual em aberto").
// A cada X dias o relógio do servidor: escolhe um tipo de negócio, o agente de marketing do carrossel
// escreve as 5 cenas (o código confere as regras), a legenda segue a legenda modelo e o GitHub grava.
// O Reel nasce com dia sugerido e "esperando aprovação": o cliente só aprova (ou troca o dia). Nada sai sozinho.
// Fase 1: sem foto (custo: só o texto da IA, menos de 1 centavo de dólar por Reel).
// Desligado por padrão. Liga em Master › Postagens › Reel automático. Desligar tudo: NEXUS_ANIMATED_REEL=false.

import { listClients, getClient } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";
import { planMarketingCarousel } from "./carousel-agent.js";
import { FLOWARTS_NICHES, pickNiche, nicheById } from "./flowarts-niches.js";
import { animatedReelEnabled, startAnimatedReel, validateReelScenes } from "./animated-reel.js";
import { brasiliaToIso } from "./manual-reel.js";

export const AUTO_REEL_SOURCE = "auto:animated-reel";
const STATE_NAMESPACE = "auto-reel";
// Depois de uma tentativa (certa ou errada), espera este tempo antes de tentar de novo: não gasta à toa.
const RETRY_WAIT_MS = 6 * 60 * 60 * 1000;
const DEFAULTS = Object.freeze({ enabled: false, everyDays: 7, hour: "18:00", daysAhead: 2 });

const parseJson = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };

export function normalizeAutoReelConfig(value = {}) {
  const everyDays = Math.round(Number(value.everyDays));
  const daysAhead = Math.round(Number(value.daysAhead));
  return {
    enabled: value.enabled === true,
    everyDays: Number.isFinite(everyDays) ? Math.max(1, Math.min(30, everyDays)) : DEFAULTS.everyDays,
    hour: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.hour || "")) ? String(value.hour) : DEFAULTS.hour,
    daysAhead: Number.isFinite(daysAhead) ? Math.max(1, Math.min(14, daysAhead)) : DEFAULTS.daysAhead
  };
}

async function readState(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1"
  ).bind(STATE_NAMESPACE, String(clientId)).first();
  const value = parseJson(row?.value_json, {}) || {};
  return { ...value, config: normalizeAutoReelConfig(value.config || {}) };
}

async function writeState(env, clientId, state) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'state', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(STATE_NAMESPACE, String(clientId), JSON.stringify(state)).run();
}

export function autoReelClientAllowed(client) {
  const id = String(client?.id || "");
  return Boolean(id) && !BLOCKED_PUBLISH_CLIENTS.has(id) && Boolean(brandProfileVersion(id));
}

// "da barbearia", "do salão de beleza"...
const MASCULINE = new Set(["salao", "pet-shop", "restaurante"]);
export function autoReelCaption(niche) {
  const negocio = niche ? (MASCULINE.has(niche.id) ? "do " : "da ") + niche.pt : "do seu negócio";
  return [
    "Você cuida " + negocio + ". A Flow cuida do seu Instagram.",
    "Na correria do dia, postar sempre fica para depois. A Flow Arts cuida disso pra você:",
    "✅ Conteúdo com a cara do seu negócio",
    "✅ Você aprova tudo antes, pelo painel",
    "✅ A Flow programa e publica no dia certo",
    "💬 Comente QUERO que eu te mostro como funciona.",
    "📲 Ou chama no WhatsApp: link na bio."
  ].join("\n");
}

// Dia sugerido: daqui a N dias, na hora escolhida (horário de Brasília).
export function suggestedSchedule(at, config) {
  const day = new Date(at.getTime() - 3 * 60 * 60 * 1000 + config.daysAhead * 24 * 60 * 60 * 1000);
  const date = day.toISOString().slice(0, 10);
  return { iso: brasiliaToIso(date, config.hour), hour: config.hour };
}

async function lastAutoReelAt(env, clientId) {
  const row = await env.DB.prepare(
    `SELECT created_at FROM post_ledger WHERE client_id=?1
       AND json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.source')=?2
       AND COALESCE(status,'') <> 'reel_render_failed'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(String(clientId), AUTO_REEL_SOURCE).first();
  const value = row?.created_at ? Date.parse(String(row.created_at).replace(" ", "T") + (String(row.created_at).includes("Z") ? "" : "Z")) : NaN;
  return Number.isFinite(value) ? value : 0;
}

// Cria 1 Reel automático para o cliente, se estiver na hora. force: botão "Criar um agora" do Master.
export async function runAutoReelForClient(env, client, { at = new Date(), force = false, plan = planMarketingCarousel, fetchImpl = fetch } = {}) {
  if (!animatedReelEnabled(env)) return { skipped: true, reason: "animated_reel_disabled" };
  if (!autoReelClientAllowed(client)) return { skipped: true, reason: "client_not_allowed" };
  const state = await readState(env, client.id);
  const config = state.config;
  if (!force && !config.enabled) return { skipped: true, reason: "disabled" };
  const now = at.getTime();
  if (!force) {
    const lastTry = Date.parse(String(state.lastAttemptAt || ""));
    if (Number.isFinite(lastTry) && now - lastTry < RETRY_WAIT_MS) return { skipped: true, reason: "waiting_retry" };
    const last = await lastAutoReelAt(env, client.id);
    if (last && now - last < config.everyDays * 24 * 60 * 60 * 1000) return { skipped: true, reason: "not_due" };
  }

  // Marca a tentativa antes de gastar: duas rodadas do relógio ao mesmo tempo não fazem dois Reels.
  const recent = Array.isArray(state.recentNiches) ? state.recentNiches.slice(-4) : [];
  const niche = pickNiche({ seed: client.id + "|" + at.toISOString().slice(0, 10), avoid: recent }) || FLOWARTS_NICHES[0];
  await writeState(env, client.id, { ...state, config, lastAttemptAt: at.toISOString() });

  try {
    const theme = "Instagram no automático para " + niche.pt;
    const caption = autoReelCaption(nicheById(niche.id) || niche);
    const result = await plan(env, client, { nicheId: niche.id, creativeFeatures: { theme } }, { caption });
    const scenes = (result?.cartoes || []).map(card => ({ l1: String(card.titulo_linha1 || ""), l2: String(card.titulo_linha2 || ""), photo: "" }));
    const errors = validateReelScenes(scenes);
    if (errors.length) throw new Error("auto_reel_scenes_invalid:" + errors.slice(0, 2).join(" ").slice(0, 120));
    const schedule = suggestedSchedule(at, config);
    const created = await startAnimatedReel(env, client, {
      id: "animated-reel-auto-" + crypto.randomUUID(),
      scenes, caption, scheduledFor: schedule.iso, scheduledHour: schedule.hour,
      source: AUTO_REEL_SOURCE, extra: { nicheId: niche.id, autoReel: { theme } }
    }, fetchImpl);
    await writeState(env, client.id, {
      ...state, config, lastAttemptAt: at.toISOString(), lastRunAt: at.toISOString(),
      lastPostId: created.id, lastError: "", recentNiches: [...recent, niche.id].slice(-5)
    });
    return { ok: true, id: created.id, niche: niche.id, scheduledFor: schedule.iso };
  } catch (error) {
    const code = String(error?.message || error).slice(0, 160);
    await writeState(env, client.id, { ...state, config, lastAttemptAt: at.toISOString(), lastError: code });
    return { ok: false, error: code };
  }
}

// Relógio do servidor (a cada 15 min): passa pelos clientes liberados.
export async function runAutoReels(env, at = new Date()) {
  if (!animatedReelEnabled(env)) return [];
  const clients = (await listClients(env)).filter(autoReelClientAllowed);
  const results = [];
  for (const client of clients) results.push({ clientId: client.id, ...(await runAutoReelForClient(env, client, { at })) });
  return results;
}

// Master: GET/POST /api/master/animated-reel/auto (ver e salvar a configuração; "runNow" cria um agora).
export async function handleAutoReelMaster(request, env, url) {
  if (url.pathname !== "/api/master/animated-reel/auto") return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  const clientId = String(url.searchParams.get("clientId") || "primeiro-teste");
  const client = await getClient(env, clientId);
  if (!client || !autoReelClientAllowed(client)) return send({ ok: false, error: "client_not_allowed", message: "Este cliente não usa o Reel automático." }, 400);
  if (request.method === "GET") {
    const state = await readState(env, clientId);
    return send({ ok: true, clientId, config: state.config, lastRunAt: state.lastRunAt || "", lastPostId: state.lastPostId || "", lastError: state.lastError || "" });
  }
  if (request.method !== "POST") return send({ error: "method_not_allowed" }, 405);
  const body = await request.json().catch(() => ({}));
  const state = await readState(env, clientId);
  const config = normalizeAutoReelConfig({ ...state.config, ...(body?.config || {}) });
  await writeState(env, clientId, { ...state, config });
  if (body?.runNow === true) {
    const result = await runAutoReelForClient(env, client, { force: true });
    if (!result.ok) return send({ ok: false, config, error: result.error, message: "Não deu para criar agora: " + (result.error || result.reason) }, 400);
    return send({ ok: true, config, created: result });
  }
  return send({ ok: true, config });
}
