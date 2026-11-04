// Agente "Aprovação por silêncio" (pedido do Rodrigo, 03/11/2026).
//
// Regra: post que o Rodrigo mandou ao painel do cliente (Master, conector MCP, Biblioteca, campanha)
// sai no horário marcado, mesmo se o cliente não clicar em nada.
// O cliente tem até 1 hora antes do horário para pedir reajuste. Fechou a janela sem pedido:
// o Nexus marca o post como aprovado e o Publisher faz o resto (com as tentativas e a trava contra duplicar que já existem).
//
// Nunca aprova sozinho:
// - post que o cliente pediu reajuste (correction_requested) ou que já teve reajuste (precisa de nova aprovação de verdade);
// - post cancelado, excluído ou reprovado;
// - post criado pelos agentes de IA sem passar pelo Rodrigo;
// - post que chegou ao painel com menos de 1 hora de antecedência (o cliente não teve a janela).
//   Esse fica esperando aprovação e ganha a marca autoApproval.status = "sem_janela".

export const REVIEW_WINDOW_MINUTES = 60;
// Post que passou do horário há mais que isto não é aprovado (o Publisher já não publica atrasado).
const LATE_LIMIT_HOURS = 6;
const ROWS_PER_RUN = 20;

const P = "CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END";

export const SILENT_APPROVAL_SQL = `SELECT id, client_id, scheduled_for, created_at, payload_json FROM post_ledger
  WHERE COALESCE(approval_status,'') = 'pending'
  AND COALESCE(status,'') IN ('ready','scheduled')
  AND scheduled_for IS NOT NULL
  AND julianday(scheduled_for) <= julianday(?1) + (${REVIEW_WINDOW_MINUTES} / 1440.0)
  AND julianday(scheduled_for) >= julianday(?1) - (${LATE_LIMIT_HOURS} / 24.0)
  AND COALESCE(json_extract(${P},'$.createdBy'),'') IN ('master','mcp')
  AND COALESCE(json_extract(${P},'$.revisionRequestedAt'),'') = ''
  AND COALESCE(json_extract(${P},'$.revisionRequest'),'') = ''
  AND COALESCE(json_extract(${P},'$.hiddenFromPanel'),0) = 0
  AND json_extract(${P},'$.autoApproval.status') IS NULL
  ORDER BY scheduled_for ASC LIMIT ?2`;

function parse(text) {
  try { const v = JSON.parse(String(text || "{}")); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

// created_at vem do SQLite ("2026-11-03 21:00:00", em UTC); scheduled_for vem em ISO.
function toMs(value) {
  const s = String(value || "").trim();
  if (!s) return NaN;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(" ", "T") + "Z" : s;
  return Date.parse(iso);
}

export function reviewDeadline(scheduledFor) {
  const ms = toMs(scheduledFor);
  return Number.isFinite(ms) ? new Date(ms - REVIEW_WINDOW_MINUTES * 60000).toISOString() : "";
}

// true = o cliente teve a janela inteira (o post chegou pelo menos 1 hora antes do horário).
export function hadReviewWindow(createdAt, scheduledFor) {
  const c = toMs(createdAt), s = toMs(scheduledFor);
  if (!Number.isFinite(c) || !Number.isFinite(s)) return false;
  return s - c >= REVIEW_WINDOW_MINUTES * 60000;
}

export async function approveSilentPosts(env, { now = new Date(), limit = ROWS_PER_RUN } = {}) {
  const at = now.toISOString();
  const result = await env.DB.prepare(SILENT_APPROVAL_SQL).bind(at, limit).all();
  const rows = result?.results || [];
  const out = { checked: rows.length, approved: [], noWindow: [] };
  for (const row of rows) {
    const payload = parse(row.payload_json);
    const deadline = reviewDeadline(row.scheduled_for);
    if (!hadReviewWindow(row.created_at, row.scheduled_for)) {
      payload.autoApproval = { status: "sem_janela", at, reviewDeadline: deadline, reason: "chegou ao painel com menos de 1 hora de antecedência" };
      await env.DB.prepare(
        "UPDATE post_ledger SET payload_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND approval_status='pending'"
      ).bind(JSON.stringify(payload), String(row.id)).run();
      out.noWindow.push(row.id);
      continue;
    }
    payload.autoApproval = { status: "aprovado_por_silencio", at, reviewDeadline: deadline, by: "regra-1-hora" };
    // A condição approval_status='pending' no WHERE evita passar por cima de um reajuste pedido no mesmo instante.
    const upd = await env.DB.prepare(
      "UPDATE post_ledger SET approval_status='approved', payload_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND approval_status='pending' AND COALESCE(status,'') IN ('ready','scheduled')"
    ).bind(JSON.stringify(payload), String(row.id)).run();
    if (Number(upd?.meta?.changes ?? 1) > 0) out.approved.push(row.id);
  }
  return out;
}
