// Perfil de marca para clientes que não têm regras próprias no código.
// Usado para gerar imagens e textos com o assunto certo de cada cliente.
// O nome e o nicho salvos no painel (agentProfile) sempre têm prioridade.

export const CLIENT_BRAND_DEFAULTS = Object.freeze({
  // @flowarts2026 — cadastrado no painel como "PRIMEIRO TESTE".
  "primeiro-teste": Object.freeze({
    brandName: "Flow Arts",
    niche: "Marketing digital",
    audience: "Pequenos empresários e empreendedores brasileiros",
    hashtags: "#FlowArts #MarketingDigital #Empreendedorismo #RedesSociais #Dicas",
    followerCta: "Siga a Flow Arts para mais dicas de marketing.",
    visualDirection: "Photorealistic premium scenes of modern Brazilian entrepreneurs and small business owners: bright creative workspaces, planning social media content, laptops and smartphones with abstract unreadable charts, sticky notes and brainstorming walls, confident natural people. Clean, contemporary, optimistic lighting."
  })
});

function text(value) {
  return String(value || "").trim();
}

export function clientBrand(client = {}) {
  const id = text(client?.id);
  const defaults = CLIENT_BRAND_DEFAULTS[id] || {};
  const profile = client?.config?.agentProfile && typeof client.config.agentProfile === "object"
    ? client.config.agentProfile : {};
  const pick = (...values) => values.map(text).find(Boolean) || "";
  const savedNiche = text(profile.niche) || (text(client?.niche) === "Outro" ? "" : text(client?.niche));
  const savedName = text(profile.brandName) || (/^primeiro teste$/i.test(text(client?.name)) ? "" : text(client?.name));
  return {
    brandName: pick(savedName, defaults.brandName, "NEXUS"),
    niche: pick(savedNiche, defaults.niche),
    audience: pick(profile.audience, defaults.audience),
    hashtags: pick(defaults.hashtags),
    followerCta: pick(defaults.followerCta),
    visualDirection: pick(defaults.visualDirection)
  };
}
