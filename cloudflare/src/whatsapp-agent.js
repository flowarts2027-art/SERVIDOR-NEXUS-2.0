import { openAIResponses } from "./openai.js";
import { knowledgePrompt, whatsappKnowledge } from "./whatsapp-knowledge.js";
import { addFromWhatsApp } from "./crm.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function textResponse(text, status = 200) {
  return new Response(String(text ?? ""), {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 20);
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback = {}) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function configStatus(env) {
  const required = {
    verifyToken: Boolean(String(env.WHATSAPP_VERIFY_TOKEN || "")),
    accessToken: Boolean(String(env.WHATSAPP_ACCESS_TOKEN || "")),
    phoneNumberId: Boolean(String(env.WHATSAPP_PHONE_NUMBER_ID || "")),
    appSecret: Boolean(String(env.WHATSAPP_APP_SECRET || "")),
    graphVersion: Boolean(String(env.WHATSAPP_GRAPH_VERSION || "")),
    clientId: Boolean(String(env.WHATSAPP_CLIENT_ID || ""))
  };
  return {
    configured: Object.values(required).every(Boolean),
    required,
    clientId: String(env.WHATSAPP_CLIENT_ID || ""),
    sendLimitPerHour: Math.max(1, Math.min(100, Number(env.WHATSAPP_SEND_LIMIT_PER_HOUR || 30)))
  };
}

export async function ensureWhatsAppSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      wa_id TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL DEFAULT 'cliente',
      priority INTEGER NOT NULL DEFAULT 0,
      needs_human INTEGER NOT NULL DEFAULT 0,
      unread_count INTEGER NOT NULL DEFAULT 0,
      last_message_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, wa_id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      wa_id TEXT NOT NULL,
      provider_message_id TEXT,
      direction TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider_message_id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_drafts (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      wa_id TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'cliente',
      priority INTEGER NOT NULL DEFAULT 0,
      needs_human INTEGER NOT NULL DEFAULT 0,
      reply_text TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_send_log (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      wa_id TEXT NOT NULL,
      message_id TEXT,
      text_preview TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_settings (
      client_id TEXT PRIMARY KEY,
      auto_reply INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Coluna nova em base antiga: pausa o robô numa conversa (pessoa assumiu).
  try {
    await env.DB.prepare("ALTER TABLE whatsapp_contacts ADD COLUMN bot_paused INTEGER NOT NULL DEFAULT 0").run();
  } catch {
    // coluna já existe
  }

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wa_contacts_updated ON whatsapp_contacts(client_id, updated_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON whatsapp_messages(client_id, wa_id, created_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wa_drafts_status ON whatsapp_drafts(client_id, status, created_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wa_send_log_created ON whatsapp_send_log(client_id, created_at DESC)").run();
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function equalHex(a, b) {
  const left = String(a || "").toLowerCase();
  const right = String(b || "").toLowerCase();
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

async function validWebhookSignature(rawBody, signature, appSecret) {
  const provided = String(signature || "").replace(/^sha256=/i, "");
  if (!provided || !appSecret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(appSecret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return equalHex(bytesToHex(signed), provided);
}

function messageText(message) {
  if (message?.type === "text") return String(message?.text?.body || "");
  if (message?.type === "button") return String(message?.button?.text || "");
  if (message?.type === "interactive") {
    return String(
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title ||
      ""
    );
  }
  return "";
}

function localTriage(text, clientId = "") {
  const value = String(text || "").toLowerCase();
  const urgent = /urgente|agora|parou|fora do ar|não funciona|nao funciona|problema|erro/.test(value);
  const lead = /preço|preco|valor|plano|quanto|quero|como funciona|exemplo|orçamento|orcamento/.test(value);
  const business = whatsappKnowledge(clientId)?.businessName || "da empresa";
  return {
    classification: urgent ? "urgente" : lead ? "lead" : "cliente",
    priority: urgent ? 90 : lead ? 70 : 45,
    // Sem IA não há resposta segura: sempre chama uma pessoa.
    needsHuman: true,
    fallback: true,
    reply: `Oi! Sou a assistente virtual ${business === "da empresa" ? business : "da " + business}. Recebi sua mensagem e uma pessoa da equipe vai te responder em breve.`,
    reason: urgent ? "palavra-chave de urgência detectada" : lead ? "sinal de intenção comercial" : "triagem inicial sem IA"
  };
}

const NON_TEXT_REPLY = "Por aqui eu só consigo ler mensagens de texto. Pode escrever o que você precisa? Se preferir, já aviso a equipe para te responder.";

function responseText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

function parseDraft(text, fallback) {
  const raw = String(text || "").trim().replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/i, "");
  const parsed = safeJson(raw, null);
  if (!parsed || typeof parsed !== "object") return fallback;
  const allowed = new Set(["urgente", "lead", "cliente", "fornecedor", "pessoal", "ruido"]);
  return {
    classification: allowed.has(String(parsed.classification)) ? String(parsed.classification) : fallback.classification,
    priority: Math.max(0, Math.min(100, Number(parsed.priority ?? fallback.priority))),
    needsHuman: parsed.needsHuman === true,
    reply: String(parsed.reply || fallback.reply).slice(0, 1000),
    reason: String(parsed.reason || fallback.reason).slice(0, 300),
    fallback: false
  };
}

async function buildDraft(env, clientId, waId, displayName, inboundText) {
  const fallback = localTriage(inboundText, clientId);
  const historyResult = await env.DB.prepare(
    `SELECT direction,text,created_at FROM whatsapp_messages
     WHERE client_id=?1 AND wa_id=?2 ORDER BY created_at DESC LIMIT 20`
  ).bind(clientId, waId).all();

  const rows = [...(historyResult?.results || [])].reverse();
  const alreadyIntroduced = rows.some(row => row.direction === "outbound");
  const history = rows
    .map(row => `${row.direction === "outbound" ? "EMPRESA" : "CLIENTE"}: ${String(row.text || "").slice(0, 500)}`)
    .join("\n");

  try {
    const data = await openAIResponses(env, clientId, {
      nexusPurpose: "whatsapp-reply",
      input: [
        "Você é a assistente virtual de atendimento no WhatsApp desta empresa. Escreva em português do Brasil.",
        alreadyIntroduced
          ? "Você já se apresentou nesta conversa; não se apresente de novo."
          : "Esta é a primeira resposta: comece dizendo que é a assistente virtual da empresa.",
        "Seja simpática, direta e curta: no máximo 5 linhas e no máximo uma pergunta por mensagem.",
        "Use SOMENTE as informações abaixo. Nunca invente preço, prazo, desconto, resultado ou cliente.",
        "Objetivo: entender o negócio da pessoa, explicar o serviço certo e oferecer o exemplo grátis.",
        "Quando for passar para a pessoa responsável, avise na resposta que vai chamar essa pessoa.",
        "Classifique em exatamente uma categoria: urgente, lead, cliente, fornecedor, pessoal ou ruido.",
        'Responda SOMENTE JSON válido no formato {"classification":"lead","priority":70,"needsHuman":false,"reply":"...","reason":"..."}.',
        "",
        knowledgePrompt(clientId),
        "",
        `Contato: ${displayName || waId}`,
        "Histórico:",
        history || "(sem histórico anterior)",
        "Nova mensagem do cliente:",
        inboundText
      ].join("\n"),
      max_output_tokens: 400
    });
    return parseDraft(responseText(data), fallback);
  } catch {
    return fallback;
  }
}

async function storeInbound(env, clientId, value) {
  const contacts = new Map(
    (Array.isArray(value?.contacts) ? value.contacts : [])
      .map(contact => [String(contact?.wa_id || ""), String(contact?.profile?.name || "")])
  );

  const messages = Array.isArray(value?.messages) ? value.messages : [];
  for (const message of messages) {
    const waId = cleanPhone(message?.from);
    if (!waId) continue;
    const providerId = String(message?.id || "");
    const text = messageText(message);
    // Hora em que o Nexus recebeu (mesmo relógio das respostas enviadas):
    // mantém a conversa na ordem certa. A hora da Meta fica no payload_json.
    const createdAt = nowIso();
    const displayName = contacts.get(waId) || "";

    const rowId = providerId || `wa-in-${clientId}-${waId}-${Date.now()}`;
    const inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO whatsapp_messages(
        id,client_id,wa_id,provider_message_id,direction,message_type,text,status,payload_json,created_at
      ) VALUES(?1,?2,?3,?4,'inbound',?5,?6,'received',?7,?8)`
    ).bind(
      rowId, clientId, waId, providerId || null,
      String(message?.type || "unknown"),
      text.slice(0, 4000),
      JSON.stringify(message),
      createdAt
    ).run();

    if (!Number(inserted?.meta?.changes || 0)) continue;

    await env.DB.prepare(
      `INSERT INTO whatsapp_contacts(
        id,client_id,wa_id,display_name,unread_count,last_message_at,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,1,?5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(client_id,wa_id) DO UPDATE SET
        display_name=CASE WHEN excluded.display_name<>'' THEN excluded.display_name ELSE whatsapp_contacts.display_name END,
        unread_count=whatsapp_contacts.unread_count+1,
        last_message_at=excluded.last_message_at,
        updated_at=CURRENT_TIMESTAMP`
    ).bind(`wa-contact-${clientId}-${waId}`, clientId, waId, displayName, createdAt).run();

    // Quem escreve para o número da Flow entra no CRM (ou passa para "conversando").
    await addFromWhatsApp(env, { phone: waId, name: displayName }).catch(() => null);

    const draft = text
      ? await buildDraft(env, clientId, waId, displayName, text)
      : { classification: "cliente", priority: 60, needsHuman: false, fallback: false,
          reply: NON_TEXT_REPLY, reason: `mensagem do tipo ${String(message?.type || "desconhecido")}` };
    const draftId = `wa-draft-${providerId || Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO whatsapp_drafts(
        id,message_id,client_id,wa_id,classification,priority,needs_human,reply_text,reason,status,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    ).bind(
      draftId,
      rowId, clientId, waId, draft.classification,
      draft.priority, draft.needsHuman ? 1 : 0,
      draft.reply, draft.reason
    ).run();

    await env.DB.prepare(
      `UPDATE whatsapp_contacts SET classification=?3,priority=?4,needs_human=CASE WHEN ?5=1 THEN 1 ELSE needs_human END,updated_at=CURRENT_TIMESTAMP
       WHERE client_id=?1 AND wa_id=?2`
    ).bind(clientId, waId, draft.classification, draft.priority, draft.needsHuman ? 1 : 0).run();

    await autoReply(env, clientId, waId, draft, draftId);
  }
}

// Resposta automática: só com o robô ligado no painel, conversa não pausada
// e dentro do limite por hora. Ao passar para humano, o robô pausa a conversa.
async function autoReply(env, clientId, waId, draft, draftId) {
  if (!(await autoReplyEnabled(env, clientId))) return { sent: false, reason: "auto_reply_off" };
  const contact = await env.DB.prepare(
    "SELECT bot_paused FROM whatsapp_contacts WHERE client_id=?1 AND wa_id=?2"
  ).bind(clientId, waId).first();
  if (Number(contact?.bot_paused || 0)) return { sent: false, reason: "bot_paused" };
  try {
    await sendAndRecord(env, clientId, waId, draft.reply, { draftId, auto: true });
  } catch (error) {
    await env.DB.prepare(
      "UPDATE whatsapp_drafts SET status='auto_failed',reason=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(draftId, clientId, String(error?.message || error).slice(0, 300)).run();
    return { sent: false, reason: String(error?.message || error) };
  }
  if (draft.needsHuman) {
    await env.DB.prepare(
      "UPDATE whatsapp_contacts SET bot_paused=1,needs_human=1,updated_at=CURRENT_TIMESTAMP WHERE client_id=?1 AND wa_id=?2"
    ).bind(clientId, waId).run();
  }
  return { sent: true };
}

async function autoReplyEnabled(env, clientId) {
  const row = await env.DB.prepare("SELECT auto_reply FROM whatsapp_settings WHERE client_id=?1").bind(clientId).first();
  return Number(row?.auto_reply || 0) === 1;
}

async function setAutoReply(env, clientId, enabled) {
  await env.DB.prepare(
    `INSERT INTO whatsapp_settings(client_id,auto_reply,updated_at) VALUES(?1,?2,CURRENT_TIMESTAMP)
     ON CONFLICT(client_id) DO UPDATE SET auto_reply=excluded.auto_reply,updated_at=CURRENT_TIMESTAMP`
  ).bind(clientId, enabled ? 1 : 0).run();
}

export async function handleWhatsAppWebhook(request, env, url, ctx) {
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode") || "";
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (mode === "subscribe" && token && token === String(env.WHATSAPP_VERIFY_TOKEN || "")) {
      return textResponse(challenge, 200);
    }
    return json({ error: "whatsapp_webhook_verification_failed" }, 403);
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const appSecret = String(env.WHATSAPP_APP_SECRET || "");
  if (!appSecret) return json({ error: "whatsapp_app_secret_not_configured" }, 503);

  const rawBody = await request.text();
  const valid = await validWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret
  );
  if (!valid) return json({ error: "invalid_webhook_signature" }, 401);

  const body = safeJson(rawBody, {});
  const clientId = String(env.WHATSAPP_CLIENT_ID || "").trim();
  if (!clientId) return json({ error: "whatsapp_client_id_not_configured" }, 503);

  await ensureWhatsAppSchema(env);
  const work = (async () => {
    for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        if (change?.field !== "messages") continue;
        await storeInbound(env, clientId, change?.value || {});
      }
    }
  })();

  if (ctx?.waitUntil) ctx.waitUntil(work);
  else await work;

  return json({ ok: true });
}

// Mensagem modelo aprovada pela Meta (obrigatória fora da janela de 24 h).
function templatePayload(template) {
  const params = (Array.isArray(template?.params) ? template.params : []).map(text => ({ type: "text", text: String(text || "").slice(0, 60) || "-" }));
  return {
    name: String(template?.name || ""),
    language: { code: String(template?.lang || "pt_BR") },
    ...(params.length ? { components: [{ type: "body", parameters: params }] } : {})
  };
}

async function sendText(env, to, text, template = null) {
  const version = String(env.WHATSAPP_GRAPH_VERSION || "").trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const token = String(env.WHATSAPP_ACCESS_TOKEN || "").trim();
  if (!version || !phoneNumberId || !token) throw new Error("whatsapp_send_not_configured");
  const fetcher = env.__whatsappFetch || fetch;

  const response = await fetcher(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(template ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: templatePayload(template)
      } : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text }
      }),
      signal: AbortSignal.timeout(15000)
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Guarda a recusa completa da Meta (tipo, códigos, mensagem e detalhes),
    // sem token nem texto do cliente, para o painel mostrar o motivo real.
    const meta = data?.error || {};
    const parts = [
      meta.type, meta.code && `code=${meta.code}`, meta.error_subcode && `sub=${meta.error_subcode}`,
      meta.message, meta.error_user_title, meta.error_user_msg, meta.error_data?.details
    ].filter(Boolean).map(x => String(x).replace(/\s+/g, " ").trim());
    const detail = [...new Set(parts)].join(" | ").slice(0, 280);
    const error = new Error(`whatsapp_http_${response.status}${detail ? ": " + detail : ""}`);
    error.status = response.status;
    error.metaCode = meta.code || null;
    throw error;
  }
  return data;
}

// Envia (manual ou automático) respeitando o limite por hora e registra tudo no D1.
export async function sendAndRecord(env, clientId, to, text, { draftId = "", auto = false, template = null, source = "" } = {}) {
  const limit = configStatus(env).sendLimitPerHour;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM whatsapp_send_log WHERE client_id=?1 AND created_at>=datetime('now','-1 hour')"
  ).bind(clientId).first();
  if (Number(row?.total || 0) >= limit) {
    const error = new Error("whatsapp_hourly_send_limit_reached");
    error.status = 429;
    error.limit = limit;
    throw error;
  }

  const result = await sendText(env, to, text, template);
  const providerId = String(result?.messages?.[0]?.id || "");
  const id = providerId || `wa-out-${clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO whatsapp_messages(
      id,client_id,wa_id,provider_message_id,direction,message_type,text,status,payload_json,created_at
    ) VALUES(?1,?2,?3,?4,'outbound',?9,?5,?6,?7,?8)`
  ).bind(id, clientId, to, providerId || null, text, auto ? "sent_auto" : source === "crm" ? "sent_crm" : "sent", JSON.stringify(result), nowIso(), template ? "template" : "text").run();
  // Quem recebeu do CRM aparece na aba WhatsApp, para a resposta cair na conversa certa.
  if (source === "crm") {
    await env.DB.prepare(
      `INSERT INTO whatsapp_contacts(id,client_id,wa_id,display_name,unread_count,last_message_at,created_at,updated_at)
       VALUES(?1,?2,?3,'',0,?4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT(client_id,wa_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`
    ).bind(`wa-contact-${clientId}-${to}`, clientId, to, nowIso()).run();
  }

  await env.DB.prepare(
    `INSERT INTO whatsapp_send_log(id,client_id,wa_id,message_id,text_preview,created_at)
     VALUES(?1,?2,?3,?4,?5,CURRENT_TIMESTAMP)`
  ).bind(`wa-log-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, clientId, to, providerId, text.slice(0, 120)).run();

  if (draftId) {
    await env.DB.prepare(
      "UPDATE whatsapp_drafts SET status=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(String(draftId), clientId, auto ? "auto_sent" : "sent").run();
  }
  return { providerMessageId: providerId || null };
}

// Última mensagem que a pessoa mandou para o número da Flow (qualquer variante do número).
export async function lastInboundAt(env, clientId, phones = []) {
  const list = [...new Set(phones.map(cleanPhone).filter(Boolean))].slice(0, 4);
  if (!list.length) return null;
  await ensureWhatsAppSchema(env);
  const marks = list.map((_, i) => "?" + (i + 2)).join(",");
  const row = await env.DB.prepare(
    `SELECT wa_id, MAX(created_at) AS at FROM whatsapp_messages WHERE client_id=?1 AND direction='inbound' AND wa_id IN (${marks}) GROUP BY wa_id ORDER BY at DESC LIMIT 1`
  ).bind(clientId, ...list).first();
  return row?.at ? { waId: row.wa_id, at: row.at } : null;
}

export async function handleWhatsAppProtected(request, env, url) {
  if (!url.pathname.startsWith("/api/whatsapp/") || url.pathname === "/api/whatsapp/webhook") {
    return null;
  }

  await ensureWhatsAppSchema(env);
  const clientId = String(env.WHATSAPP_CLIENT_ID || "").trim();

  // Diagnóstico do número na Meta (só leitura): mostra se ele está ativo na
  // Cloud API, o nome aprovado e o limite. Não expõe token.
  if (url.pathname === "/api/whatsapp/number-check" && request.method === "GET") {
    const version = String(env.WHATSAPP_GRAPH_VERSION || "").trim();
    const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
    const token = String(env.WHATSAPP_ACCESS_TOKEN || "").trim();
    if (!version || !phoneNumberId || !token) return json({ ok: false, error: "whatsapp_send_not_configured" }, 503);
    const fields = "display_phone_number,verified_name,code_verification_status,status,platform_type,name_status,quality_rating,account_mode,messaging_limit_tier,throughput";
    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}?fields=${fields}`,
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
    ).catch(error => ({ ok: false, status: 0, json: async () => ({ error: { message: String(error?.message || error) } }) }));
    const data = await response.json().catch(() => ({}));
    return json({
      ok: Boolean(response.ok),
      httpStatus: response.status,
      phoneNumberIdEnd: phoneNumberId.slice(-4),
      graphVersion: version,
      number: response.ok ? data : null,
      error: response.ok ? null : { code: data?.error?.code || null, subcode: data?.error?.error_subcode || null, message: String(data?.error?.message || "").slice(0, 200) }
    }, response.ok ? 200 : 502);
  }

  if (url.pathname === "/api/whatsapp/status" && request.method === "GET") {
    const counts = clientId
      ? await env.DB.prepare(
          `SELECT
            (SELECT COUNT(*) FROM whatsapp_contacts WHERE client_id=?1) AS contacts,
            (SELECT COUNT(*) FROM whatsapp_drafts WHERE client_id=?1 AND status='pending') AS pending_drafts,
            (SELECT COUNT(*) FROM whatsapp_messages WHERE client_id=?1) AS messages`
        ).bind(clientId).first()
      : {};
    const autoReplyOn = clientId ? await autoReplyEnabled(env, clientId) : false;
    return json({ ok: true, ...configStatus(env), autoReply: autoReplyOn, counts: {
      contacts: Number(counts?.contacts || 0),
      pendingDrafts: Number(counts?.pending_drafts || 0),
      messages: Number(counts?.messages || 0)
    }});
  }

  if (!clientId) return json({ error: "whatsapp_client_id_not_configured" }, 503);

  if (url.pathname === "/api/whatsapp/inbox" && request.method === "GET") {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 30)));
    const rows = await env.DB.prepare(
      `SELECT c.wa_id,c.display_name,c.classification,c.priority,c.needs_human,c.bot_paused,c.unread_count,
              c.last_message_at,c.updated_at,
              (SELECT m.text FROM whatsapp_messages m WHERE m.client_id=c.client_id AND m.wa_id=c.wa_id
               ORDER BY m.created_at DESC LIMIT 1) AS last_text,
              (SELECT m.direction FROM whatsapp_messages m WHERE m.client_id=c.client_id AND m.wa_id=c.wa_id
               ORDER BY m.created_at DESC LIMIT 1) AS last_direction
       FROM whatsapp_contacts c WHERE c.client_id=?1
       ORDER BY c.needs_human DESC, COALESCE(c.updated_at,c.last_message_at) DESC LIMIT ?2`
    ).bind(clientId, limit).all();
    return json({ ok: true, items: rows?.results || [] });
  }

  if (url.pathname === "/api/whatsapp/messages" && request.method === "GET") {
    const waId = cleanPhone(url.searchParams.get("phone"));
    if (!waId) return json({ error: "phone_required" }, 400);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 50)));
    const rows = await env.DB.prepare(
      `SELECT id,direction,message_type,text,status,created_at
       FROM whatsapp_messages WHERE client_id=?1 AND wa_id=?2
       ORDER BY created_at DESC LIMIT ?3`
    ).bind(clientId, waId, limit).all();
    return json({ ok: true, phone: waId, items: [...(rows?.results || [])].reverse() });
  }

  if (url.pathname === "/api/whatsapp/drafts" && request.method === "GET") {
    const status = String(url.searchParams.get("status") || "pending");
    const rows = await env.DB.prepare(
      `SELECT id,message_id,wa_id,classification,priority,needs_human,reply_text,reason,status,created_at
       FROM whatsapp_drafts WHERE client_id=?1 AND status=?2
       ORDER BY priority DESC, created_at DESC LIMIT 100`
    ).bind(clientId, status).all();
    return json({ ok: true, items: rows?.results || [] });
  }

  if (url.pathname === "/api/whatsapp/send" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (body?.confirmed !== true) {
      return json({ error: "human_confirmation_required" }, 409);
    }

    const to = cleanPhone(body?.to);
    const text = String(body?.text || "").trim();
    if (to.length < 10 || to.length > 15) return json({ error: "invalid_phone" }, 400);
    if (!text) return json({ error: "text_required" }, 400);
    if (text.length > 4096) return json({ error: "text_too_long" }, 400);

    try {
      const result = await sendAndRecord(env, clientId, to, text, { draftId: body?.draftId, auto: false });
      // Uma pessoa respondeu: o robô sai dessa conversa até ser religado.
      await env.DB.prepare(
        "UPDATE whatsapp_contacts SET bot_paused=1,unread_count=0,updated_at=CURRENT_TIMESTAMP WHERE client_id=?1 AND wa_id=?2"
      ).bind(clientId, to).run();
      return json({ ok: true, to, providerMessageId: result.providerMessageId });
    } catch (error) {
      return json({ error: String(error?.message || error), limit: error?.limit }, Number(error?.status || 502));
    }
  }

  if (url.pathname === "/api/whatsapp/settings" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.autoReply !== "boolean") return json({ error: "auto_reply_boolean_required" }, 400);
    await setAutoReply(env, clientId, body.autoReply);
    return json({ ok: true, autoReply: body.autoReply });
  }

  if (url.pathname === "/api/whatsapp/contact" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const waId = cleanPhone(body?.phone);
    if (!waId) return json({ error: "phone_required" }, 400);
    const fields = [];
    const values = [clientId, waId];
    if (typeof body?.botPaused === "boolean") {
      values.push(body.botPaused ? 1 : 0);
      fields.push(`bot_paused=?${values.length}`);
      if (!body.botPaused) fields.push("needs_human=0");
    }
    if (body?.read === true) fields.push("unread_count=0");
    if (!fields.length) return json({ error: "nothing_to_update" }, 400);
    const result = await env.DB.prepare(
      `UPDATE whatsapp_contacts SET ${fields.join(",")},updated_at=CURRENT_TIMESTAMP WHERE client_id=?1 AND wa_id=?2`
    ).bind(...values).run();
    if (!Number(result?.meta?.changes || 0)) return json({ error: "contact_not_found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

export function whatsappConfigStatus(env) {
  return configStatus(env);
}
