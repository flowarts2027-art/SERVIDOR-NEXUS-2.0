import { listClients } from "./clients.js";
import { clientScreenName } from "./client-display.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { sendAndRecord } from "./whatsapp-agent.js";

// Quadro "Postagens faltando" do Master (pedido do Rodrigo, 05/11/2026).
// Para cada cliente online, confere hoje, amanhã e depois contra o plano de 2 posts + 2 stories por dia.
// Nada fica guardado: o quadro é calculado a cada leitura, então quem completa sai sozinho.
export const DAILY_PLAN = Object.freeze({ posts: 2, stories: 2 });
const DAYS_AHEAD = 3;
const DAY_MS = 86400000;
const TZ_OFFSET_MS = -3 * 3600000; // Brasília (sem horário de verão)
const APPROVAL_WAIT_MS = 12 * 3600000;
const DAY_LABELS = Object.freeze(["Hoje", "Amanhã", "Depois de amanhã"]);
const DAY_LEVELS = Object.freeze(["today", "tomorrow", "later"]);
const FORMAT_LABELS = Object.freeze({ story: "story", carousel: "carrossel", reel: "Reel" });
const MAX_PUBLISH_ATTEMPTS = 3;

// Aviso por WhatsApp: pronto e desligado até a Meta liberar. Liga com NEXUS_MISSING_POSTS_WHATSAPP="true".
const ALERT_TO = "5521964816185";
const ALERT_FIRST_HOUR = 8;

function localDayNumber(ms) {
  return Math.floor((ms + TZ_OFFSET_MS) / DAY_MS);
}

function hhmm(ms) {
  const local = new Date(ms + TZ_OFFSET_MS);
  return String(local.getUTCHours()).padStart(2, "0") + ":" + String(local.getUTCMinutes()).padStart(2, "0");
}

// created_at vem do SQLite sem fuso ("2026-11-05 12:00:00"), e é UTC.
function utcMs(value) {
  const text = String(value || "").trim();
  return Date.parse(/^\d{4}-\d{2}-\d{2} /.test(text) ? text.replace(" ", "T") + "Z" : text);
}

// Motivo de a postagem não sair, ou "" se ela está no caminho certo.
export function postProblem(post = {}, now = new Date()) {
  const error = String(post.error || "");
  const approval = String(post.approval_status || "");
  if (String(post.status || "") === "published") return "";
  if (post.replace_failed) return "não consegui substituir";
  if (approval === "correction_requested") return "correção pedida";
  if (/^media_generation/.test(error)) return "sem imagem";
  if (error === "format_mismatch") return "arte no formato errado";
  if (/^format_build_(failed|retry_limit_reached)/.test(error)) return "erro de montagem";
  if (/retry_limit_reached$/.test(error)) return "falhou 3 vezes";
  if (String(post.status || "") === "failed" && Number(post.retry_count || 0) >= MAX_PUBLISH_ATTEMPTS) return "falhou 3 vezes";
  if (approval === "pending" && now.getTime() - utcMs(post.created_at) > APPROVAL_WAIT_MS) return "esperando aprovação há mais de 12 horas";
  return "";
}

export function missingText(label, posts, stories) {
  const parts = [];
  if (posts) parts.push(posts + (posts === 1 ? " post" : " posts"));
  if (stories) parts.push(stories + (stories === 1 ? " story" : " stories"));
  return label + ": " + (posts + stories === 1 ? "falta " : "faltam ") + parts.join(" e ");
}

// Publicado ou no caminho conta para o plano. Com problema não conta, porque não vai sair.
export function buildMissingPostsBoard(clients = [], posts = [], now = new Date()) {
  const today = localDayNumber(now.getTime());
  const items = [];
  for (const client of clients) {
    const counts = Array.from({ length: DAYS_AHEAD }, () => ({ posts: 0, stories: 0 }));
    const line = (dayIndex, kind, text) => items.push({
      clientId: client.id, clientName: clientScreenName(client), dayIndex,
      day: DAY_LABELS[dayIndex], level: DAY_LEVELS[dayIndex], kind, text
    });
    const problems = [];
    for (const post of posts) {
      if (post.client_id !== client.id) continue;
      const at = Date.parse(String(post.scheduled_for || ""));
      const dayIndex = localDayNumber(at) - today;
      if (!Number.isFinite(at) || dayIndex < 0 || dayIndex >= DAYS_AHEAD) continue;
      const format = String(post.format || "post").toLowerCase();
      const problem = postProblem(post, now);
      // Sem substituta é urgente: fica vermelho e em primeiro, mesmo sendo de amanhã.
      if (problem) problems.push({ dayIndex: post.replace_failed ? 0 : dayIndex, at, text: DAY_LABELS[dayIndex] + " " + hhmm(at) + ": " + (FORMAT_LABELS[format] || "post") + " — " + problem });
      else counts[dayIndex][format === "story" ? "stories" : "posts"] += 1;
    }
    counts.forEach((count, dayIndex) => {
      const lackingPosts = Math.max(0, DAILY_PLAN.posts - count.posts);
      const lackingStories = Math.max(0, DAILY_PLAN.stories - count.stories);
      if (lackingPosts || lackingStories) line(dayIndex, "missing", missingText(DAY_LABELS[dayIndex], lackingPosts, lackingStories));
    });
    problems.sort((a, b) => a.at - b.at).forEach(problem => line(problem.dayIndex, "problem", problem.text));
  }
  items.sort((a, b) => a.dayIndex - b.dayIndex
    || a.clientName.localeCompare(b.clientName, "pt-BR")
    || (a.kind === b.kind ? 0 : a.kind === "missing" ? -1 : 1));
  return { clients: new Set(items.map(item => item.clientId)).size, items };
}

export async function missingPostsBoard(env, now = new Date()) {
  const clients = (await listClients(env)).filter(client => client.status === "online" && !BLOCKED_PUBLISH_CLIENTS.has(client.id));
  if (!clients.length) return { clients: 0, items: [] };
  const today = localDayNumber(now.getTime());
  const start = new Date(today * DAY_MS - TZ_OFFSET_MS).toISOString();
  const end = new Date((today + DAYS_AHEAD) * DAY_MS - TZ_OFFSET_MS).toISOString();
  const marks = clients.map((_, index) => "?" + (index + 3)).join(",");
  const payload = "CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END";
  const rows = await env.DB.prepare(
    `SELECT client_id,scheduled_for,status,approval_status,error,created_at,
            json_extract(${payload},'$.creativeFeatures.requestedFormat') AS format,
            json_extract(${payload},'$.retryCount') AS retry_count,
            json_extract(${payload},'$.autoReplaceFailed.at') AS replace_failed
     FROM post_ledger
     WHERE client_id IN (${marks}) AND scheduled_for>=?1 AND scheduled_for<?2
       AND status IN ('ready','scheduled','publishing','published','failed')
       AND COALESCE(approval_status,'')<>'rejected'`
  ).bind(start, end, ...clients.map(client => client.id)).all();
  return buildMissingPostsBoard(clients, rows?.results || [], now);
}

export function missingPostsMessage(board) {
  const today = board.items.filter(item => item.dayIndex === 0);
  const lines = (today.length ? today : board.items).slice(0, 8).map(item => "• " + item.clientName + " — " + item.text);
  return "Nexus: " + board.clients + (board.clients === 1 ? " cliente com postagem faltando." : " clientes com postagem faltando.") + "\n" + lines.join("\n");
}

// Uma mensagem por dia, no máximo. A marca é gravada antes do envio: se o envio falhar, não repete.
export async function sendMissingPostsAlert(env, now = new Date(), { send = sendAndRecord, loadBoard = missingPostsBoard } = {}) {
  if (String(env.NEXUS_MISSING_POSTS_WHATSAPP || "").toLowerCase() !== "true") return { sent: false, reason: "disabled" };
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  if (local.getUTCHours() < ALERT_FIRST_HOUR) return { sent: false, reason: "too_early" };
  const board = await loadBoard(env, now);
  if (!board.clients) return { sent: false, reason: "nothing_missing" };
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES('missing-posts-alert',?1,'','{}',CURRENT_TIMESTAMP)`
  ).bind(local.toISOString().slice(0, 10)).run();
  if (!claim?.meta?.changes) return { sent: false, reason: "already_sent_today" };
  await send(env, String(env.WHATSAPP_CLIENT_ID || "primeiro-teste"), ALERT_TO, missingPostsMessage(board));
  return { sent: true };
}
