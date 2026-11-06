import { getClient } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { isClientPaused } from "./client-pause.js";
import { clientSlot, loadClientOffsets } from "./client-slots.js";
import { boardToday, dayGap, loadPosts, localDayStart } from "./missing-posts.js";
import { WATCHER_DEPS, canCreateArt, replacePost } from "./post-watcher.js";

// Botão "Criar com agente (grátis)" do quadro "Postagens faltando" (Rodrigo, 05/11/2026).
// Uma arte por chamada: gerar imagem gasta os pedidos da execução, então a tela chama uma vez para cada arte.
// Usa o gerador do vigia. Sem Biblioteca e sem arte de campanha: o selo "Criada pelo agente" tem de ser verdade.
const SOURCE = "agent-board:criar";
const PLAN_HOURS = Object.freeze([9, 19]);
const FIRST_HOUR = 9;
const LAST_HOUR = 21;
const MIN_LEAD_MS = 30 * 60000; // tempo de montar a arte antes do horário
const DAYS_AHEAD = 3;
const DAY_MS = 86400000;
const CREATE_ERROR = "Não consegui criar agora. Tente de novo.";

export const AGENT_MESSAGES = Object.freeze({
  agent_date: "Escolha um dia do quadro.",
  agent_client: "Este cliente não usa imagem gerada.",
  agent_complete: "Este dia já está completo.",
  agent_no_slot: "Não há mais horário livre neste dia."
});

// Horário do plano, se estiver livre. Senão, a primeira hora livre do dia. Sempre no minuto do cliente.
export function agentSlot(date, offset, story, taken, now = new Date(), lead = MIN_LEAD_MS) {
  const others = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, index) => FIRST_HOUR + index).filter(hour => !PLAN_HOURS.includes(hour));
  for (const hour of [...PLAN_HOURS, ...others]) {
    const slot = clientSlot(`${date}T${String(hour).padStart(2, "0")}:00:00-03:00`, offset, story);
    const at = Date.parse(slot);
    if (at >= now.getTime() + lead && !taken.has(at)) return slot;
  }
  return "";
}

// Faltando os dois, alterna: post, depois story.
function nextFormat(gap) {
  return gap.posts >= gap.stories ? "post" : "story";
}

export function localTime(slot) {
  return new Date(Date.parse(slot) - 3 * 3600000).toISOString().slice(11, 16);
}

async function insertRow(env, client, slot, format, now) {
  const id = "agent-" + crypto.randomUUID();
  const payload = {
    clientName: client.name || client.id,
    instagram: client.instagram || "",
    title: format === "story" ? "Story" : "Post",
    creativeFeatures: { requestedFormat: format },
    intelligence: { format, plannedFormat: format, mediaSource: "cloudflare-workers-ai" },
    dateChoice: "agent",
    source: SOURCE,
    retryCount: 0,
    createdBy: "agent",
    createdByAgent: { at: now.toISOString() }
  };
  await env.DB.prepare(
    `INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at)
     VALUES(?1,?2,?3,?4,'ready','pending','','','','media_generation_required',0,?5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
  ).bind(id, client.id, slot, localTime(slot), JSON.stringify(payload)).run();
  return { row: { id, client_id: client.id, scheduled_for: slot, status: "ready", approval_status: "pending", caption: "" }, payload };
}

export async function createAgentArt(env, clientId, date, now = new Date(), overrides = {}) {
  const deps = { ...WATCHER_DEPS, library: async () => null, campaignArt: async () => null, ...overrides };
  const day = String(date || "");
  const start = localDayStart(day);
  const dayIndex = Math.round((start - localDayStart(boardToday(now))) / DAY_MS);
  if (!Number.isFinite(start) || dayIndex < 0 || dayIndex >= DAYS_AHEAD) return { ok: false, error: "agent_date", message: AGENT_MESSAGES.agent_date };
  const client = await getClient(env, String(clientId || "")).catch(() => null);
  const allowed = client?.status === "online" && !BLOCKED_PUBLISH_CLIENTS.has(client.id) && !isClientPaused(env, client.id) && await canCreateArt(env, client, deps);
  if (!allowed) return { ok: false, error: "agent_client", message: AGENT_MESSAGES.agent_client };

  const posts = await loadPosts(env, [client.id], new Date(start).toISOString(), new Date(start + DAY_MS).toISOString());
  const gap = dayGap(posts, now);
  if (!gap.posts && !gap.stories) return { ok: false, error: "agent_complete", message: AGENT_MESSAGES.agent_complete };
  const format = nextFormat(gap);
  const offsets = await loadClientOffsets(env);
  const taken = new Set(posts.map(post => Date.parse(String(post.scheduled_for || ""))));
  const slot = agentSlot(day, offsets[client.id] ?? 0, format === "story", taken, now);
  if (!slot) return { ok: false, error: "agent_no_slot", message: AGENT_MESSAGES.agent_no_slot };

  const { row, payload } = await insertRow(env, client, slot, format, now);
  const out = await replacePost(env, client, row, payload, "criar_com_agente", now, deps);
  if (out.pending || out.replaced) return { ok: true, format, scheduledFor: slot, pending: Boolean(out.pending), left: gap.posts + gap.stories - 1 };
  // Sem arte, a linha sai: o dia volta a mostrar "falta", e não um erro de postagem que nunca existiu.
  await env.DB.prepare("DELETE FROM post_ledger WHERE id=?1").bind(row.id).run();
  return { ok: false, error: "agent_failed", reason: out.reason, message: CREATE_ERROR };
}
