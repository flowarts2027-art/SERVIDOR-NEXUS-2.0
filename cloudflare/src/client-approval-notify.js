// Aviso no WhatsApp do cliente quando chega arte no painel esperando aprovação (pedido do Rodrigo, 02/11/2026).
//
// Como funciona:
// - Roda no cron de 15 minutos. Olha o post_ledger: posts "esperando aprovação" (approval_status = 'pending')
//   que ainda não foram avisados. Serve para qualquer caminho de envio (conector MCP, Master, campanhas).
// - Manda UMA mensagem por lote de artes (10 artes = 1 mensagem, não 10). Sem lembrete: cada arte só é avisada uma vez.
// - Se chegarem artes novas depois, aí sim vai um novo aviso (regra do Rodrigo, 15/11/2026).
// - O lote só é avisado depois de BATCH_SETTLE_MINUTES minutos sem arte nova, para um envio em várias partes não virar várias mensagens.
// - Só entre 08h e 20h de Brasília.
// - Sai pelo número oficial da Flow Arts (API da Meta), com a mensagem modelo aprovada pela Meta.
//
// DESLIGADO POR PADRÃO. Só liga com as duas variáveis:
//   CLIENT_APPROVAL_WHATSAPP = "on"
//   CLIENT_APPROVAL_TEMPLATE = nome do modelo aprovado na Meta (ex.: aviso_arte_painel)
// O modelo tem 2 campos: {{1}} nome do cliente, {{2}} link do painel (CLIENT_APPROVAL_PANEL_URL ou o painel padrão).

import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { clientScreenName } from "./client-display.js";
import { ensureWhatsAppSchema, sendAndRecord } from "./whatsapp-agent.js";

export const BATCH_SETTLE_MINUTES = 10;
export const DEFAULT_PANEL_URL = "https://painel.flowarts.com.br/";
const MAX_CLIENTS_PER_RUN = 10;
// Flow Arts é do próprio Rodrigo (ele aprova no Master) e o Café Brisa é demonstração.
// Maskara Assessoria não recebe aviso nenhum (pedido do Rodrigo, 16/11/2026).
export const SKIP_CLIENTS = new Set(["primeiro-teste", "demo-cafe", "maskara-assessoria"]);

function parseConfig(raw) {
  try { return JSON.parse(String(raw || "{}")) || {}; } catch { return {}; }
}

// Número do cliente: mesmo lugar e mesma ordem que o resto do Nexus usa (whatsapp-known.js).
// 16/11/2026: todos os clientes reais guardam o número em agentProfile.whatsapp; o aviso só olhava
// contact.*, achava "sem número" e o Adimax não recebeu. Sempre com 55 na frente.
export function clientWhatsapp(config = {}) {
  for (const raw of [config?.agentProfile?.whatsapp, config?.contact?.whatsapp, config?.contact?.phone]) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length < 10) continue;
    if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
    return ("55" + digits).slice(0, 13);
  }
  return "";
}

export function approvalNoticeConfig(env = {}) {
  const enabled = String(env.CLIENT_APPROVAL_WHATSAPP || "").trim().toLowerCase() === "on";
  const template = String(env.CLIENT_APPROVAL_TEMPLATE || "").trim();
  const panelUrl = String(env.CLIENT_APPROVAL_PANEL_URL || "").trim() || DEFAULT_PANEL_URL;
  return { enabled: enabled && Boolean(template), template, panelUrl, lang: String(env.CLIENT_APPROVAL_TEMPLATE_LANG || "pt_BR").trim() || "pt_BR" };
}

// A arte só conta se o cliente consegue aprovar na aba "Aprovar" (mesmas regras do painel, public/client-lite.js):
// não está escondida, já passou na revisão automática e já tem imagem. Arte sem dia marcado também conta.
// Arte que ainda não conta fica sem marca e entra no próximo lote quando ficar pronta.
export function approvableInPanel(payload = {}) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.hiddenFromPanel === true) return false;
  const gates = payload.qualityGates;
  if (gates && typeof gates === "object" && !(gates.copyChief === "approved" && gates.designer === "approved")) return false;
  const build = payload.formatBuild || {};
  const image = payload.imageUrl || payload.publicImageUrl || build.imageUrl || (Array.isArray(build.carouselUrls) ? build.carouselUrls[0] : "");
  return Boolean(String(image || "").trim());
}

// created_at do D1 vem como "AAAA-MM-DD HH:MM:SS" (UTC) ou ISO.
function createdMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return NaN;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw.replace(" ", "T") + "Z").getTime();
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
    `SELECT p.id, p.client_id, p.created_at, p.payload_json FROM post_ledger p
     LEFT JOIN client_approval_notices n ON n.post_id = p.id AND n.status <> 'sem_numero'
     WHERE p.approval_status = 'pending' AND p.status = 'ready' AND n.post_id IS NULL
       AND (COALESCE(p.scheduled_for, '') = '' OR p.scheduled_for >= ?1)
     ORDER BY p.created_at ASC LIMIT 500`
  ).bind(at.toISOString()).all();

  const byClient = new Map();
  for (const row of rows?.results || []) {
    const id = String(row.client_id || "");
    if (!id || SKIP_CLIENTS.has(id) || BLOCKED_PUBLISH_CLIENTS.has(id)) continue;
    if (!approvableInPanel(parseConfig(row.payload_json))) continue;
    if (!byClient.has(id)) byClient.set(id, { ids: [], newest: 0 });
    const entry = byClient.get(id);
    entry.ids.push(String(row.id));
    const ms = createdMs(row.created_at);
    if (Number.isFinite(ms) && ms > entry.newest) entry.newest = ms;
  }

  const results = [];
  for (const [clientId, { ids: postIds, newest }] of [...byClient.entries()].slice(0, MAX_CLIENTS_PER_RUN)) {
    // Lote ainda chegando: espera sossegar para mandar um aviso só.
    if (newest && at.getTime() - newest < BATCH_SETTLE_MINUTES * 60 * 1000) {
      results.push({ clientId, skipped: "lote_chegando" });
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
      const name = String(clientConfig.contact?.name || clientScreenName(client)).trim().split(/\s+/)[0] || "tudo bem";
      const text = `Olá ${name}, chegou arte nova no seu painel para aprovar: ${config.panelUrl}`;
      try {
        await sendAndRecord(env, senderClient, to, text, {
          auto: true,
          source: "aviso-aprovacao",
          template: { name: config.template, lang: config.lang, params: [name, config.panelUrl] }
        });
      } catch (err) {
        status = "erro";
        error = String(err?.message || err).slice(0, 200);
      }
    }
    // Só o envio aceito marca as artes. Erro da Meta ou cliente sem número não marcam:
    // tenta de novo no próximo ciclo, e o aviso sai quando o número for cadastrado (16/11/2026).
    // Marca antiga de "sem_numero" é a única que pode ser trocada; lote enviado nunca é reenviado.
    if (status === "sent") {
      const stamp = at.toISOString();
      for (const postId of postIds) {
        await env.DB.prepare(
          `INSERT INTO client_approval_notices(post_id, client_id, status, error, notified_at) VALUES(?1, ?2, 'sent', '', ?3)
           ON CONFLICT(post_id) DO UPDATE SET status='sent', error='', notified_at=excluded.notified_at
           WHERE client_approval_notices.status = 'sem_numero'`
        ).bind(postId, clientId, stamp).run();
      }
    }
    results.push({ clientId, status, posts: postIds.length, ...(error ? { error } : {}) });
  }
  return { ok: true, results };
}
