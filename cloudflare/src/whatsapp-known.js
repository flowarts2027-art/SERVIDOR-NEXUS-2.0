// Quem já é cliente do Rodrigo (pedido dele, 04/11/2026).
//
// 1) Clientes do Nexus: o David procura o número no cadastro de TODOS os clientes do Master
//    (agentProfile.whatsapp, contact.whatsapp ou contact.phone). Lê o cadastro na hora, então
//    cliente novo criado no Master já é reconhecido na próxima mensagem.
// 2) Clientes do streaming (recarga do painel, suporte): não ficam no Master. O Rodrigo marca a
//    conversa como "Cliente do streaming" no Master › WhatsApp (whatsapp_contacts.customer_type).
//
// Cliente conhecido nunca recebe oferta de venda como se fosse pessoa nova.

// Fora da busca: a própria Flow Arts (número do Rodrigo) e a demonstração.
const SKIP_CLIENTS = new Set(["primeiro-teste", "demo-cafe"]);

function parseConfig(raw) {
  if (raw && typeof raw === "object") return raw;
  try { return JSON.parse(String(raw || "{}")) || {}; } catch { return {}; }
}

// Chave do número: DDD + 8 últimos dígitos. Assim "21 98765-4321" e o número que a Meta manda
// sem o nono dígito (552187654321) dão a mesma chave.
export function phoneKey(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return "";
  return digits.slice(0, 2) + digits.slice(-8);
}

export function clientNumbers(config = {}) {
  const cfg = parseConfig(config);
  return [cfg?.agentProfile?.whatsapp, cfg?.contact?.whatsapp, cfg?.contact?.phone]
    .map(phoneKey).filter(Boolean);
}

// Mapa chave do número → cliente do Nexus (lido do cadastro na hora).
export async function nexusClientIndex(env) {
  const index = new Map();
  if (!env?.DB) return index;
  let rows = [];
  try {
    const result = await env.DB.prepare("SELECT id,name,niche,status,config_json FROM clients").all();
    rows = result?.results || [];
  } catch {
    return index;
  }
  for (const row of rows) {
    const id = String(row?.id || "");
    if (!id || SKIP_CLIENTS.has(id)) continue;
    const config = parseConfig(row.config_json);
    const profile = config?.agentProfile || {};
    const client = {
      id,
      name: String(profile.brandName || row.name || id).trim(),
      niche: String(profile.niche || row.niche || "").trim(),
      status: String(row.status || "")
    };
    for (const key of clientNumbers(config)) if (!index.has(key)) index.set(key, client);
  }
  return index;
}

export async function findNexusClient(env, waId) {
  const key = phoneKey(waId);
  if (!key) return null;
  return (await nexusClientIndex(env)).get(key) || null;
}

export const CUSTOMER_TYPES = new Set(["", "streaming"]);

// Texto que entra no pedido do David.
export function knownCustomerPrompt({ nexus = null, customerType = "" } = {}) {
  if (customerType === "streaming") {
    return [
      "QUEM É ESTA PESSOA: cliente do serviço de streaming do Rodrigo (painel, recarga de créditos, suporte).",
      "- Ela JÁ É cliente. Não ofereça serviços da Flow Arts, planos, site nem exemplo grátis.",
      "- Recarga, créditos, pagamento, painel fora do ar, login ou qualquer suporte: diga em 1 frase curta que vai chamar o Rodrigo e marque needsHuman=true.",
      "- Agradecimento ou conversa simples: responda curto e simpático, sem vender nada."
    ].join("\n");
  }
  if (nexus) {
    return [
      `QUEM É ESTA PESSOA: cliente do Nexus (postagem automática), cadastro "${nexus.name}"${nexus.niche ? `, ramo: ${nexus.niche}` : ""}.`,
      "- Ela JÁ É cliente. Não pergunte qual é o negócio dela e não ofereça planos, exemplo grátis ou venda como se fosse pessoa nova.",
      "- Trate pelo nome. Ajude no que for simples (onde aprovar artes no painel, horários dos posts).",
      "- Pedido de arte nova, mudança na campanha, pagamento, reclamação ou dúvida que você não sabe: diga que vai chamar o Rodrigo e marque needsHuman=true."
    ].join("\n");
  }
  return "";
}

// Junta as duas fontes. Nunca derruba o atendimento: se algo falhar, segue como contato comum.
export async function knownCustomer(env, clientId, waId) {
  let customerType = "";
  try {
    const row = await env.DB.prepare(
      "SELECT customer_type FROM whatsapp_contacts WHERE client_id=?1 AND wa_id=?2"
    ).bind(clientId, waId).first();
    customerType = CUSTOMER_TYPES.has(String(row?.customer_type || "")) ? String(row?.customer_type || "") : "";
  } catch {
    customerType = "";
  }
  const nexus = customerType ? null : await findNexusClient(env, waId).catch(() => null);
  return { customerType, nexus, prompt: knownCustomerPrompt({ nexus, customerType }) };
}
