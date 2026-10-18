import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { enqueue } from "./scheduler.js";

// Painel do cliente: "Publicar agora" para um post APROVADO que ainda não saiu.
// Não chama a Meta aqui: só põe o post no horário de agora e pede uma rodada do
// Publisher, que continua com todos os fiscais (janela 8h–22h, 90 min entre posts).

function parse(text) {
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export function postIsStuck(post = {}, now = new Date()) {
  const status = String(post.status || "");
  const error = String(post.error || "");
  if (String(post.approvalStatus || post.approval_status || "") !== "approved") return false;
  if (status === "expired") return error === "approved_post_missed";
  if (!["ready", "scheduled", "failed"].includes(status)) return false;
  const at = Date.parse(String(post.scheduledFor || post.scheduled_for || ""));
  if (!Number.isFinite(at)) return false;
  // 20 min de folga: o agendador roda de 15 em 15 minutos.
  return now.getTime() - at > 20 * 60 * 1000 || status === "failed";
}

export async function publishPostNow(env, client, postId, now = new Date(), queue = enqueue) {
  const clientId = String(client?.id || "");
  if (BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_archived");
  const row = await env.DB.prepare(
    "SELECT id,status,error,approval_status,payload_json FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1"
  ).bind(String(postId), clientId).first();
  if (!row) throw new Error("not_found");
  const status = String(row.status || "");
  if (status === "published") throw new Error("already_published");
  if (status === "publishing") throw new Error("publishing_in_progress");
  if (String(row.approval_status || "") !== "approved") throw new Error("not_approved");
  const allowed = ["ready", "scheduled", "failed"].includes(status)
    || (status === "expired" && String(row.error || "") === "approved_post_missed");
  if (!allowed) throw new Error("not_schedulable");

  const payload = parse(row.payload_json);
  payload.retryCount = 0;
  payload.publishNowByClient = { at: now.toISOString(), fromStatus: status, fromError: String(row.error || "") };
  const local = new Date(now.getTime() - 3 * 3600000);
  const hour = String(local.getUTCHours()).padStart(2, "0") + ":" + String(local.getUTCMinutes()).padStart(2, "0");
  await env.DB.prepare(
    `UPDATE post_ledger SET status='scheduled',error='',scheduled_for=?3,scheduled_hour=?4,payload_json=?5,updated_at=CURRENT_TIMESTAMP
     WHERE id=?1 AND client_id=?2`
  ).bind(String(postId), clientId, now.toISOString(), hour, JSON.stringify(payload)).run();
  const queued = await queue(env, clientId, "publisher-sweep", now, { trigger: "client-publish-now", postId: String(postId) }).catch(() => false);
  return { ok: true, id: String(postId), scheduledFor: now.toISOString(), queued: Boolean(queued) };
}

export const PUBLISH_NOW_MESSAGES = {
  not_found: "Não achei esta postagem.",
  already_published: "Esta postagem já foi publicada.",
  publishing_in_progress: "A postagem já está sendo publicada.",
  not_approved: "Aprove a postagem antes de publicar.",
  not_schedulable: "Esta postagem não pode ser publicada agora.",
  client_archived: "Esta conta está arquivada."
};
