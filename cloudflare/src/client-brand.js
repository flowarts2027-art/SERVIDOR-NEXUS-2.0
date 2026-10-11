// Perfil de marca para clientes que não têm regras próprias no código.
// Usado para gerar imagens e textos com o assunto certo de cada cliente.
// O nome e o nicho salvos no painel (agentProfile) sempre têm prioridade.

export const CLIENT_BRAND_DEFAULTS = Object.freeze({
  // @flowarts2026 — cadastrado no painel como "PRIMEIRO TESTE".
  "primeiro-teste": Object.freeze({
    // Ao mudar o perfil, aumente a versão: rascunhos não aprovados da versão
    // anterior são refeitos pelo Creator no próximo ciclo.
    profileVersion: "2026-10-11d",
    // Auditoria do Instagram @flowarts2026 em 2026-10-10 (ver docs/nexus-memory/AUDITORIA-FLOW-ARTS.md).
    brandName: "Flow Arts",
    niche: "Agência de marketing e automação com IA",
    audience: "Pequenos negócios e empreendedores do Rio de Janeiro e região",
    offer: "Marketing e automação de Instagram 24h com IA, além de sites, fotos e vídeos para pequenos negócios",
    cta: 'Comente "EXEMPLO" e receba um exemplo grátis para o seu negócio.',
    hashtags: "#FlowArts #MarketingDigital #Automacao #InteligenciaArtificial #RioDeJaneiro",
    followerCta: "Siga a Flow Arts para ver mais exemplos feitos com IA.",
    contentFocus: "Mostrar como o marketing com IA (sites, fotos e vídeos) ajuda pequenos negócios a vender mais nas redes, com exemplos práticos e antes/depois descritos em texto",
    morningTheme: "Erros de imagem e presença digital que afastam clientes de pequenos negócios",
    afternoonTheme: "Dica prática de marketing com IA para aplicar hoje",
    eveningTheme: "Exemplo de transformação de um negócio local com fotos, vídeo ou site feitos com IA",
    tone: "Próximo, direto, prático e confiante; transparente sobre o uso de IA",
    themes: Object.freeze([
      "Fotos profissionais com IA para o seu produto",
      "Por que o seu negócio precisa de um site simples",
      "Vídeo curto com IA para divulgar o seu negócio",
      "Erros de foto que fazem o cliente desistir",
      "Como a IA deixa o marketing mais barato para pequenos negócios",
      "Ideias de Reels para comércio local",
      "Bio do Instagram que traz clientes",
      "Identidade visual que passa confiança",
      "Como transformar seguidores em clientes",
      "Marketing para negócios do Rio de Janeiro",
      "Automação de Instagram: agentes trabalhando 24h por você",
      "O que uma agência com IA faz por você",
      "Peça um exemplo grátis antes de contratar"
    ]),
    hooks: Object.freeze([
      "Seu Instagram pode estar afastando clientes sem você perceber.",
      "Essa foto foi feita com IA. Dá para perceber?",
      "Seu negócio merece fotos melhores, sem gastar com estúdio.",
      "Você posta todo dia e mesmo assim não vende?",
      "Esse detalhe muda a cara do seu perfil.",
      "E se o seu Instagram trabalhasse sozinho 24h?",
      "Marketing simples para quem não tem tempo.",
      "Faça esse teste no seu perfil hoje.",
      "O erro que mais vejo em perfis de negócio."
    ]),
    visualDirection: "Photorealistic premium scenes for small local businesses in Rio de Janeiro (cafés, salons, shops, restaurants, service providers): bright professional product photos, modern storefronts, a laptop or phone showing an abstract unreadable website layout, a friendly professional woman with curly dark hair in a navy blazer presenting results. Palette: deep navy, electric blue and silver accents with clean white light. One clear scene, no text."
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
    offer: pick(profile.offer, defaults.offer),
    cta: pick(profile.cta, defaults.cta),
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
