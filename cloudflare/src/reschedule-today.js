import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";

// Master: "Reagendar para hoje" — pega os posts APROVADOS que não saíram
// (vencidos, com falha, presos por legenda parecida ou com horário já passado)
// e distribui nos horários de hoje (Brasília), o primeiro agora.
// Só mexe em post aprovado e não publicado. Não cria post, não chama a Meta.
// Quem publica continua sendo o Publisher, com todos os fiscais.

const TZ_OFFSET_MIN = -180; // Brasília (sem horário de verão)
const SPACING_MIN = 120; // o Publisher exige 90 min entre posts; 120 dá folga
const LAST_SLOT_MIN = 21 * 60 + 45; // janela do Publisher fecha às 22h
const FIRST_SLOT_MIN = 8 * 60;

function localMinutes(date) {
  const local = new Date(date.getTime() + TZ_OFFSET_MIN * 60000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

function hhmm(date) {
  const m = localMinutes(date);
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

// Horários de hoje: o primeiro agora (ou 08:00 se ainda for cedo), depois de 2 em 2 horas.
export function todaySlots(count, now = new Date()) {
  const slots = [];
  const startMin = Math.max(localMinutes(now), FIRST_SLOT_MIN);
  const first = new Date(now.getTime() + (startMin - localMinutes(now)) * 60000);
  first.setUTCSeconds(0, 0);
  for (let i = 0; i < count; i += 1) {
    const at = new Date(first.getTime() + i * SPACING_MIN * 60000);
    if (localMinutes(at) > LAST_SLOT_MIN || localMinutes(at) < startMin) break;
    slots.push(at);
  }
  return slots;
}

function parse(text) {
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

const STUCK_ERRORS = new Set(["approved_post_missed", "duplicate_caption_blocked", "publish_interrupted"]);

export async function rescheduleMissedToday(env, clientId, now = new Date()) {
  if (BLOCKED_PUBLISH_CLIENTS.has(String(clientId))) return { ok: false, error: "client_archived", found: 0, moved: 0, leftForTomorrow: 0, notReady: 0, slots: [] };
  const rows = await env.DB.prepare(
    `SELECT id,status,error,scheduled_for,caption,payload_json,created_at FROM post_ledger
     WHERE client_id=?1
       AND COALESCE(approval_status,'')='approved'
       AND status IN ('expired','failed','ready','scheduled')
     ORDER BY COALESCE(scheduled_for,created_at) ASC LIMIT 60`
  ).bind(String(clientId)).all();
  const nowMs = now.getTime();
  const candidates = (rows?.results || []).filter(row => {
    const status = String(row.status || "");
    const error = String(row.error || "");
    if (status === "expired") return error === "approved_post_missed";
    const due = !row.scheduled_for || Date.parse(row.scheduled_for) <= nowMs;
    return due || STUCK_ERRORS.has(error) || status === "failed";
  });

  const slots = todaySlots(candidates.length, now);
  const moved = [];
  const notReady = [];
  for (let i = 0; i < slots.length; i += 1) {
    const row = candidates[i];
    const payload = parse(row.payload_json);
    const gates = payload.qualityGates || {};
    if (gates.copyChief !== "approved" || gates.designer !== "approved" || !String(payload.imageUrl || "").trim()) {
      notReady.push(row.id);
    }
    payload.retryCount = 0;
    payload.rescheduledByMaster = {
      at: now.toISOString(),
      fromStatus: String(row.status || ""),
      fromError: String(row.error || ""),
      fromScheduledFor: row.scheduled_for || null
    };
    await env.DB.prepare(
      `UPDATE post_ledger SET status='scheduled',error='',scheduled_for=?3,scheduled_hour=?4,payload_json=?5,updated_at=CURRENT_TIMESTAMP
       WHERE id=?1 AND client_id=?2 AND status IN ('expired','failed','ready','scheduled')`
    ).bind(row.id, String(clientId), slots[i].toISOString(), hhmm(slots[i]), JSON.stringify(payload)).run();
    moved.push({ id: row.id, at: slots[i].toISOString(), hour: hhmm(slots[i]) });
  }
  return {
    ok: true,
    found: candidates.length,
    moved: moved.length,
    leftForTomorrow: candidates.length - moved.length,
    notReady: notReady.length,
    slots: moved
  };
}
