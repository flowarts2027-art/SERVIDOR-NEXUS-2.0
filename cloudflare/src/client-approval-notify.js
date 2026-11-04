// Aviso no WhatsApp do cliente quando chega arte no painel esperando aprovação (pedido do Rodrigo, 02/11/2026).
//
// Como funciona:
// - Roda no cron de 15 minutos. Olha o post_ledger: posts "esperando aprovação" (approval_status = 'pending')
//   que ainda não foram avisados. Serve para qualquer caminho de envio (conector MCP, Master, campanhas).
// - Manda UMA mensagem por cliente, com a quantidade de artes novas (10 artes = 1 mensagem, não 10).
// - Só avisa de novo o mesmo cliente depois de NOTICE_GAP_HOURS horas, e só entre 08h e 20h de Brasília.
// - Sai pelo número oficial da Flow Arts (API da Meta), com a mensagem modelo aprovada pela Meta.
//
// DESLIGADO POR PADRÃO. Só liga com as duas variáveis:
//   CLIENT_APPROVAL_WHATSAPP = "on"
//   CLIENT_APPROVAL_TEMPLATE = nome do modelo aprovado na Meta (ex.: aviso_arte_painel)
// O modelo tem 2 campos: {{1}} nome do cliente, {{2}} quantidade de artes. O link do painel fica fixo no modelo.

import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { clientScreenName } from "./client-display.js";
import { ensureWhatsAppSchema, sendAndRecord } from "./whatsapp-agent.js";

export const NOTICE_GAP_HOURS = 3;
const MAX_CLIENTS_PER_RUN = 10;
// Flow Arts é do próprio Rodrigo (ele aprova no Master) e o Café Brisa é demonstração.
const SKIP_CLIENTS = new Set(["primeiro-teste", "demo-cafe"]);

function parseConfig(raw) {
  try { return JSON.parse(String(raw || "{}")) || {}; } catch { return {}; }
}

// Número do cliente: contato do cadastro. Sempre com 55 na frente.
export function clientWhatsapp(config = {}) {
  const raw = config?.contact?.whatsapp || config?.contact?.phone || "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
  return ("55" + digits).slice(0, 13);
}

export function approvalNoticeConfig(env = {}) {
  const enabled = String(env.CLIENT_APPROVAL_WHATSAPP || "").trim().toLowerCase() === "on";
  const template = String(env.CLIENT_APPROVAL_TEMPLATE || "").trim();
  return { enabled: enabled && Boolean(template), template, lang: String(env.CLIENT_APPROVAL_TEMPLATE_LANG || "pt_BR").trim() || "pt_BR" };
}

function brasiliaHour(at) {
  return (at.getUTCHours() + 21) % 24; // UTC-3
}

async function ensureSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS client_approval_notices (
      post_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT NOT NULL DEFAULT '',
      notified_at TEXT NOT NULL
    )`
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_client_approval_notices_client ON client_approval_notices(client_id, notified_at DESC)").run();
}

export async function runClientApprovalNotices(env, at = new Date()) {
  const config = approvalNoticeConfig(env);
  if (!config.enabled) return { ok: true, skipped: "disabled" };
  const hour = brasiliaHour(at);
  if (hour < 8 || hour >= 20) return { ok: true, skipped: "fora_do_horario" };
  const senderClient = String(env.WHATSAPP_CLIENT_ID || "primeiro-teste");

  await ensureSchema(env);
  await ensureWhatsAppSchema(env);

  const rows = await env.DB.prepare(
    `SELECT p.id, p.client_id FROM post_ledger p
     LEFT JOIN client_approval_notices n ON n.post_id = p.id
     WHERE p.approval_status = 'pending' AND p.status = 'ready' AND n.post_id IS NULL
       AND (p.scheduled_for IS NULL OR p.scheduled_for >= ?1)
     ORDER BY p.created_at ASC LIMIT 500`
  ).bind(at.toISOString()).all();

  const byClient = new Map();
  for (const row of rows?.results || []) {
    const id = String(row.client_id || "");
    if (!id || SKIP_CLIENTS.has(id) || BLOCKED_PUBLISH_CLIENTS.has(id)) continue;
    if (!byClient.has(id)) byClient.set(id, []);
    byClient.get(id).push(String(row.id));
  }

  const results = [];
  for (const [clientId, postIds] of [...byClient.entries()].slice(0, MAX_CLIENTS_PER_RUN)) {
    const last = await env.DB.prepare(
      "SELECT notified_at FROM client_approval_notices WHERE client_id = ?1 AND status = 'sent' ORDER BY notified_at DESC LIMIT 1"
    ).bind(clientId).first();
    if (last?.notified_at && at.getTime() - new Date(last.notified_at).getTime() < NOTICE_GAP_HOURS * 3600 * 1000) {
      results.push({ clientId, skipped: "aviso_recente" });
      continue;
    }
    const client = await env.DB.prepare("SELECT id, name, status, config_json FROM clients WHERE id = ?1").bind(clientId).first();
    if (!client || String(client.status || "") !== "online") {
      results.push({ clientId, skipped: "cliente_fora" });
      continue;
    }
    const clientConfig = parseConfig(client.config_json);
    if (clientConfig.approvalWhatsapp === false) {
      results.push({ clientId, skipped: "cliente_desligou" });
      continue;
    }
    const to = clientWhatsapp(clientConfig);
    let status = "sent";
    let error = "";
    if (!to) {
      status = "sem_numero";
    } else {
      const count = String(postIds.length);
      const name = String(clientConfig.contact?.name || clientScreenName(client)).trim().split(/\s+/)[0] || "tudo bem";
      const text = `Olá, ${name}! Tem ${count} arte(s) nova(s) esperando a sua aprovação no painel da Flow Arts.`;
      try {
        await sendAndRecord(env, senderClient, to, text, {
          auto: true,
          source: "aviso-aprovacao",
          template: { name: config.template, lang: config.lang, params: [name, count] }
        });
      } catch (err) {
        status = "erro";
        error = String(err?.message || err).slice(0, 200);
      }
    }
    // Erro de envio não marca os posts: tenta de novo no próximo ciclo. "sem_numero" marca para não repetir.
    if (status !== "erro") {
      const stamp = at.toISOString();
      for (const postId of postIds) {
        await env.DB.prepare(
          "INSERT OR IGNORE INTO client_approval_notices(post_id, client_id, status, error, notified_at) VALUES(?1, ?2, ?3, '', ?4)"
        ).bind(postId, clientId, status, stamp).run();
      }
    }
    results.push({ clientId, status, posts: postIds.length, ...(error ? { error } : {}) });
  }
  return { ok: true, results };
}
