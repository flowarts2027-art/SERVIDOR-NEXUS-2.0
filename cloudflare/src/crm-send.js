// CRM → envio pelo número da Flow Arts na Meta (pedido de 17/10/2026).
// Regra da Meta: dentro de 24 h da última mensagem da pessoa, vai texto normal;
// fora disso, só a mensagem modelo aprovada. Sem modelo, o contato é pulado e o painel avisa.
// Só envia quando o Rodrigo toca em "Enviar" no Master (confirmed: true).

import { getContact, getCrmSettings, markContacted, phoneVariants } from "./crm.js";
import { lastInboundAt, sendAndRecord } from "./whatsapp-agent.js";

const WINDOW_MS = 24 * 60 * 60 * 1000 - 10 * 60 * 1000; // 10 min de folga
export const CRM_BATCH_MAX = 25;

const firstName = name => String(name || "").trim().split(/\s+/)[0] || "";

export async function sendCrmBatch(env, ids = [], { followDays = 7 } = {}, now = new Date()) {
  const clientId = String(env.WHATSAPP_CLIENT_ID || "").trim();
  if (!clientId || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) throw new Error("whatsapp_not_configured");
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, CRM_BATCH_MAX);
  if (!list.length) throw new Error("ids_required");
  const settings = await getCrmSettings(env);
  const results = [];
  let stopped = "";
  for (const id of list) {
    if (stopped) { results.push({ id, ok: false, reason: stopped }); continue; }
    const contact = await getContact(env, id, now);
    if (!contact) { results.push({ id, ok: false, reason: "not_found" }); continue; }
    // Empresa nova (nunca falou com a Flow): vai pelo WhatsApp pessoal, para proteger o número da Flow.
    if (contact.stage === "chamar") { results.push({ id, name: contact.name, ok: false, reason: "new_contact_personal" }); continue; }
    const last = await lastInboundAt(env, clientId, phoneVariants(contact.phone));
    const lastMs = last ? Date.parse(String(last.at)) : NaN;
    const open = Number.isFinite(lastMs) && now.getTime() - lastMs < WINDOW_MS;
    const to = last?.waId || contact.phone;
    let template = null;
    let text = contact.message;
    if (!open) {
      if (!settings.templateName) { results.push({ id, name: contact.name, ok: false, reason: "needs_template" }); continue; }
      template = { name: settings.templateName, lang: settings.templateLang, params: settings.templateUsesName ? [firstName(contact.name) || "tudo bem"] : [] };
      text = `[modelo ${settings.templateName}] ${firstName(contact.name)}`;
    }
    try {
      await sendAndRecord(env, clientId, to, text, { template, source: "crm" });
      await markContacted(env, id, { followDays, note: open ? "Enviado pelo WhatsApp da Flow" : "Modelo enviado pelo WhatsApp da Flow" }, now);
      results.push({ id, name: contact.name, ok: true, kind: open ? "text" : "template" });
    } catch (error) {
      const reason = String(error?.message || error).slice(0, 200);
      if (/hourly_send_limit/.test(reason)) stopped = "hourly_limit";
      results.push({ id, name: contact.name, ok: false, reason: stopped || reason });
    }
  }
  return {
    ok: true,
    sent: results.filter(r => r.ok).length,
    skipped: results.filter(r => !r.ok).length,
    results
  };
}

export async function handleCrmSendRoute(request, env, url) {
  if (url.pathname !== "/api/master/crm/send" || request.method !== "POST") return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
  const body = await request.json().catch(() => ({}));
  if (body?.confirmed !== true) return send({ ok: false, error: "confirmation_required", message: "Confirme o envio no painel." }, 409);
  try {
    return send(await sendCrmBatch(env, body.ids, { followDays: Number(body.followDays ?? 7) }));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    const messages = {
      whatsapp_not_configured: "O WhatsApp da Flow não está ligado no servidor.",
      ids_required: "Escolha pelo menos um contato."
    };
    return send({ ok: false, error: code, message: messages[code] || "Não deu para enviar agora." }, 400);
  }
}
