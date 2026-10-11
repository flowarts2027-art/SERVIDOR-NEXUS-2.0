// Página de captura da Flow Arts (/exemplo): a pessoa pede o exemplo grátis e
// vira contato "quente" no CRM do painel, com a próxima ação marcada.
import { upsertLead } from "./leads.js";
import { whatsappLink } from "./client-brand.js";
import { loginRateLimitStatus, recordLoginFailure } from "./auth.js";

export const LANDING_CLIENT_ID = "primeiro-teste";
export const LANDING_SEGMENTS = Object.freeze([
  "Café, padaria ou restaurante",
  "Salão, barbearia ou estética",
  "Loja ou comércio",
  "Prestador de serviço",
  "Saúde ou clínica",
  "Outro"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function validateLandingLead(body = {}) {
  if (clean(body.website, 200)) return { error: "spam" }; // campo escondido: só robô preenche
  const name = clean(body.nome, 80);
  const business = clean(body.negocio, 100);
  let digits = String(body.whatsapp ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  const segment = LANDING_SEGMENTS.includes(String(body.segmento)) ? String(body.segmento) : "Outro";
  if (name.length < 2) return { error: "nome", message: "Escreva o seu nome." };
  if (digits.length < 10 || digits.length > 11) return { error: "whatsapp", message: "Confira o WhatsApp, com DDD. Exemplo: 21 98888-7777." };
  if (business.length < 2) return { error: "negocio", message: "Escreva o nome do seu negócio." };
  if (body.consentimento !== true) return { error: "consentimento", message: "Marque a caixa para a gente poder te chamar no WhatsApp." };
  return { lead: { name, business, segment, whatsapp: "55" + digits } };
}

export async function handleLandingLead(request, env, now = new Date()) {
  const rate = await loginRateLimitStatus(env, request, "landing-lead").catch(() => ({ allowed: true }));
  if (!rate.allowed) return json({ ok: false, error: "rate_limited", message: "Muitos envios seguidos. Tente de novo em alguns minutos." }, 429);
  await recordLoginFailure(env, request, "landing-lead").catch(() => null); // conta cada envio no limite
  const body = await request.json().catch(() => ({}));
  const checked = validateLandingLead(body);
  if (checked.error === "spam") return json({ ok: true }); // não avisa o robô
  if (checked.error) return json({ ok: false, error: checked.error, message: checked.message }, 400);
  const { lead } = checked;
  const due = new Date(now.getTime() + 24 * 3600000).toISOString();
  await upsertLead(env, { id: LANDING_CLIENT_ID, name: "Flow Arts", instagram: "@flowarts2026" }, {
    id: LANDING_CLIENT_ID + ":landing:" + lead.whatsapp,
    temperature: "hot",
    score: 80,
    stage: "new",
    intent: "Pediu exemplo grátis pela página",
    needsHuman: true,
    lastMessage: lead.business + " · " + lead.segment,
    lastContactAt: now.toISOString(),
    source: "landing",
    sourceUrl: "/exemplo",
    contact: lead,
    nextAction: { text: "Chamar no WhatsApp e mandar o exemplo grátis", due }
  });
  const link = whatsappLink({ id: LANDING_CLIENT_ID, config: {} }, "Olá! Sou " + lead.name + ", do " + lead.business + ". Acabei de pedir o exemplo grátis no site da Flow Arts.");
  return json({ ok: true, whatsapp: link });
}
