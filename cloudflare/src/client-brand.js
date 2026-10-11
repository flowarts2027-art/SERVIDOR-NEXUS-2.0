// Perfil de marca para clientes que não têm regras próprias no código.
// Usado para gerar imagens e textos com o assunto certo de cada cliente.
// O nome e o nicho salvos no painel (agentProfile) sempre têm prioridade.

export const CLIENT_BRAND_DEFAULTS = Object.freeze({
  // @flowarts2026 — cadastrado no painel como "PRIMEIRO TESTE".
  "primeiro-teste": Object.freeze({
    // Ao mudar o perfil, aumente a versão: rascunhos não aprovados da versão
    // anterior são refeitos pelo Creator no próximo ciclo.
    profileVersion: "2026-10-11b",
    brandName: "Flow Arts",
    niche: "Marketing digital",
    audience: "Pequenos empresários e empreendedores brasileiros",
    hashtags: "#FlowArts #MarketingDigital #Empreendedorismo #RedesSociais #Dicas",
    followerCta: "Siga a Flow Arts para mais dicas de marketing.",
    contentFocus: "Dicas práticas de marketing digital e Instagram para pequenos negócios: conteúdo, anúncios, posicionamento de marca e vendas pelas redes sociais",
    morningTheme: "Erros comuns de marketing que travam pequenos negócios e como corrigir",
    afternoonTheme: "Passo a passo prático de marketing para salvar e aplicar hoje",
    eveningTheme: "Bastidores e histórias de empreendedores que cresceram com marketing",
    tone: "Direto, prático, motivador e profissional",
    themes: Object.freeze([
      "Como atrair clientes pelo Instagram",
      "Erros que fazem um perfil comercial não vender",
      "Bio do Instagram que converte",
      "Ideias de conteúdo para pequenos negócios",
      "Reels simples que geram alcance",
      "Como usar os Stories para vender",
      "Tráfego pago para iniciantes",
      "Identidade visual que passa confiança",
      "Legendas que geram comentários",
      "Calendário de postagens sem complicação",
      "Como transformar seguidores em clientes",
      "Métricas do Instagram que realmente importam"
    ]),
    hooks: Object.freeze([
      "Seu Instagram pode estar afastando clientes sem você perceber.",
      "Pouca gente faz isso, e é o que mais traz resultado.",
      "Salva isso antes de criar o seu próximo post.",
      "Você posta todo dia e mesmo assim não vende?",
      "Esse detalhe muda a cara do seu perfil.",
      "Marketing simples para quem não tem tempo.",
      "Faça esse teste no seu perfil hoje.",
      "O erro que mais vejo em perfis de negócio."
    ]),
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
    contentFocus: pick(defaults.contentFocus),
    morningTheme: pick(defaults.morningTheme),
    afternoonTheme: pick(defaults.afternoonTheme),
    eveningTheme: pick(defaults.eveningTheme),
    tone: pick(defaults.tone),
    themes: Array.isArray(defaults.themes) ? [...defaults.themes] : [],
    hooks: Array.isArray(defaults.hooks) ? [...defaults.hooks] : [],
    visualDirection: pick(defaults.visualDirection)
  };
}

// Clientes que podem gerar imagens próprias com IA (custo na chave central).
export const IMAGE_GENERATION_CLIENTS = Object.freeze(new Set([
  "globalplay-streaming", "ragnar-one", ...Object.keys(CLIENT_BRAND_DEFAULTS)
]));

// Palavras de CTA/comentário que não servem como tema de post.
const JUNK_THEME_WORDS = new Set([
  "quero", "comente", "comentario", "comentarios", "conteudo", "conteúdo", "link", "bio",
  "eu", "voce", "você", "aqui", "isso", "esse", "essa", "sim", "nao", "não", "obrigado", "top", "amei"
]);

export function usefulThemeTerms(terms = []) {
  return (Array.isArray(terms) ? terms : [])
    .map(term => String(term || "").trim())
    .filter(term => term.length >= 4 && !JUNK_THEME_WORDS.has(term.toLowerCase()));
}

export function brandProfileVersion(clientId) {
  return text(CLIENT_BRAND_DEFAULTS[text(clientId)]?.profileVersion);
}

// Rascunho antigo, nunca aprovado nem publicado, feito antes do perfil atual.
export function isOutdatedBrandDraft(clientId, row = {}, payload = {}) {
  const version = brandProfileVersion(clientId);
  if (!version) return false;
  if (String(row.status || "") !== "ready") return false;
  if (String(row.approval_status || "") === "approved") return false;
  return text(payload?.brandProfileVersion) !== version;
}
