import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { listClients } from "./clients.js";

// Regra fixa (Rodrigo, 05/11/2026): clientes nunca publicam no mesmo minuto.
// Cada cliente é dono de um minuto dentro da hora, e o story dele sai 5 minutos depois.
// Quem chega depois recebe o próximo minuto livre e fica com ele para sempre.
const FIXED_OFFSETS = Object.freeze({
  "primeiro-teste": 0,
  giltec: 10,
  "nexus-ai": 20,
  "daniela-martins": 30,
  "maskara-assessoria": 40,
  "quatree-dog": 50
});
export const STORY_DELAY_MIN = 5;
// Os 6 degraus de 10 min já têm dono. Os novos usam os minutos entre eles (:02/:07, :12/:17...), 30 clientes no total.
const FREE_OFFSETS = Object.freeze([2, 3, 4, 1].flatMap(unit => [0, 10, 20, 30, 40, 50].map(ten => ten + unit)));
const LAST_MINUTE_OF_DAY = 22 * 60; // a janela do Publisher fecha às 22h
const TZ_OFFSET_MIN = -180; // Brasília (sem horário de verão)
const MAX_MOVES_PER_ROUND = 40;

function parse(text) {
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

function localMinutes(ms) {
  return (((Math.floor(ms / 60000) + TZ_OFFSET_MIN) % 1440) + 1440) % 1440;
}

function hhmm(ms) {
  const m = localMinutes(ms);
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

// Ordem de cadastro: o resultado é o mesmo em qualquer rodada, e quem já tem atraso nunca muda.
export function assignClientOffsets(saved = {}, clients = []) {
  const offsets = { ...saved, ...FIXED_OFFSETS };
  const taken = new Set(Object.values(offsets));
  const waiting = clients
    .filter(client => !BLOCKED_PUBLISH_CLIENTS.has(client.id) && offsets[client.id] === undefined)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || a.id.localeCompare(b.id));
  for (const client of waiting) {
    const free = FREE_OFFSETS.find(offset => !taken.has(offset));
    if (free === undefined) {
      console.warn("client_slots_full", client.id);
      break;
    }
    offsets[client.id] = free;
    taken.add(free);
  }
  return offsets;
}

// Próximo minuto do cliente a partir do horário pedido. Só anda para frente, salvo
// quando isso passaria das 22h: aí volta uma hora para o post não perder o dia.
export function clientSlot(value, offset, story = false) {
  const at = Date.parse(String(value || ""));
  if (!Number.isFinite(at)) return null;
  const wanted = Math.floor(at / 60000) * 60000;
  let slot = Math.floor(wanted / 3600000) * 3600000 + (Number(offset) + (story ? STORY_DELAY_MIN : 0)) * 60000;
  if (slot < wanted) slot += 3600000;
  if (localMinutes(wanted) <= LAST_MINUTE_OF_DAY && localMinutes(slot) > LAST_MINUTE_OF_DAY) slot -= 3600000;
  return new Date(slot).toISOString();
}

export async function loadClientOffsets(env) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='post-slots' AND item_key='offsets' AND client_id='' LIMIT 1"
  ).first();
  const saved = parse(row?.value_json);
  const offsets = assignClientOffsets(saved, await listClients(env));
  if (Object.keys(offsets).length !== Object.keys(saved).length) {
    await env.DB.prepare(
      `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
       VALUES('post-slots','offsets','',?1,CURRENT_TIMESTAMP)
       ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
    ).bind(JSON.stringify(offsets)).run();
  }
  return offsets;
}

// Roda antes de cada rodada de publicação. Biblioteca, painel, conector e agentes gravam o horário
// pedido e ele vira o minuto do cliente aqui, então nenhum post sai fora do lugar, por nenhum caminho.
// "Publicar agora" é pedido de quem está no painel: fica como está. Post publicado ou com falha não muda.
export async function alignScheduledPosts(env, now = new Date()) {
  const offsets = await loadClientOffsets(env);
  const ids = Object.keys(offsets);
  const localDay = Math.floor((now.getTime() + TZ_OFFSET_MIN * 60000) / 86400000) * 86400000;
  const dayStart = new Date(localDay - TZ_OFFSET_MIN * 60000).toISOString();
  const marks = ids.map((_, index) => "?" + (index + 2)).join(",");
  const rows = await env.DB.prepare(
    `SELECT id,client_id,scheduled_for,payload_json FROM post_ledger
     WHERE client_id IN (${marks}) AND status IN ('ready','scheduled') AND scheduled_for>=?1
     ORDER BY scheduled_for ASC LIMIT 400`
  ).bind(dayStart, ...ids).all();

  let moved = 0;
  for (const row of rows?.results || []) {
    if (moved >= MAX_MOVES_PER_ROUND) break;
    const payload = parse(row.payload_json);
    if (payload.publishNowByClient) continue;
    const story = String(payload?.creativeFeatures?.requestedFormat || "").toLowerCase() === "story";
    const slot = clientSlot(row.scheduled_for, offsets[row.client_id], story);
    if (!slot || Date.parse(slot) === Date.parse(row.scheduled_for)) continue;
    const update = await env.DB.prepare(
      `UPDATE post_ledger SET scheduled_for=?2,scheduled_hour=?3,
         payload_json=json_set(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.slotOriginalFor',?5),
         updated_at=CURRENT_TIMESTAMP
       WHERE id=?1 AND scheduled_for=?4 AND status IN ('ready','scheduled')`
    ).bind(row.id, slot, hhmm(Date.parse(slot)), row.scheduled_for, String(payload.slotOriginalFor || row.scheduled_for)).run();
    moved += Number(update?.meta?.changes || 0);
  }
  return { moved };
}
