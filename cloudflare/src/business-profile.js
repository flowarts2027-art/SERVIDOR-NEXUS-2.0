// Aba "Meu negócio" do painel do cliente.
// O cliente conta o que vende, para quem e onde. Fica em config.agentProfile,
// que os agentes já usam (clientBrand: nome, ramo, público, oferta, WhatsApp)
// e que aparece no Master em "Perfis enviados pelos clientes".

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// [campo, tamanho máximo, obrigatório]
export const BUSINESS_FIELDS = [
  ["brandName", 80, true],
  ["niche", 80, true],
  ["offer", 400, true],
  ["services", 600, false],
  ["audience", 300, false],
  ["region", 120, false],
  ["differentials", 400, false],
  ["whatsapp", 20, false],
  ["orderCode", 20, false]
];

export function normalizeOrderCode(value = "") {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

export function businessProfileView(client = {}) {
  const profile = client?.config?.agentProfile && typeof client.config.agentProfile === "object" ? client.config.agentProfile : {};
  const view = {};
  for (const [key] of BUSINESS_FIELDS) view[key] = String(profile[key] || "");
  if (!view.brandName && !/^primeiro teste$/i.test(String(client?.name || ""))) view.brandName = String(client?.name || "");
  if (!view.niche && client?.niche && client.niche !== "Outro") view.niche = String(client.niche);
  return { profile: view, submittedAt: profile.submittedAt || null };
}

export function normalizeBusinessProfile(body = {}) {
  const next = {};
  for (const [key, max] of BUSINESS_FIELDS) next[key] = clean(body[key], max);
  next.whatsapp = next.whatsapp.replace(/\D/g, "").slice(0, 13);
  // Código de pedido: a palavra que o freguês diz no WhatsApp (ex.: PAO10). Só letras e números.
  next.orderCode = normalizeOrderCode(next.orderCode);
  if (next.whatsapp && (next.whatsapp.length < 10)) throw new Error("whatsapp_invalid");
  for (const [key, , required] of BUSINESS_FIELDS) if (required && !next[key]) throw new Error("required_" + key);
  return next;
}

export async function saveBusinessProfile(env, client, body = {}) {
  const fields = normalizeBusinessProfile(body);
  const config = client?.config && typeof client.config === "object" ? client.config : {};
  const current = config.agentProfile && typeof config.agentProfile === "object" ? config.agentProfile : {};
  // Perfil mudou: volta a aparecer como "novo" para o Rodrigo revisar no Master.
  const agentProfile = { ...current, ...fields, submittedAt: new Date().toISOString(), status: "submitted" };
  const nextConfig = { ...config, agentProfile };
  await env.DB.prepare("UPDATE clients SET config_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
    .bind(JSON.stringify(nextConfig), client.id).run();
  return businessProfileView({ ...client, config: nextConfig });
}

const MESSAGES = {
  required_brandName: "Escreva o nome da sua empresa.",
  required_niche: "Escreva o ramo do seu negócio. Ex.: padaria e confeitaria.",
  required_offer: "Conte em 1 ou 2 frases o que você vende.",
  whatsapp_invalid: "Confira o WhatsApp: escreva com DDD. Ex.: 11 99999-1111."
};

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

// Rotas do portal. Quem chama já conferiu o login do cliente.
export async function handleBusinessProfilePortal(request, env, url, client) {
  if (url.pathname !== "/api/portal/business") return null;
  try {
    if (request.method === "GET") return send({ ok: true, ...businessProfileView(client) });
    if (request.method === "POST") {
      if (String(client?.id || "") === "demo-cafe") return send({ ok: false, error: "demo", message: "Na demonstração, nada é salvo." }, 400);
      const body = await request.json().catch(() => ({}));
      return send({ ok: true, message: "Pronto! Seu perfil foi salvo.", ...(await saveBusinessProfile(env, client, body)) });
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu para salvar. Tente de novo." }, 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}
