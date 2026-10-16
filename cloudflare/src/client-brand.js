// Perfil de marca para clientes que não têm regras próprias no código.
// Usado para gerar imagens e textos com o assunto certo de cada cliente.
// O nome e o nicho salvos no painel (agentProfile) sempre têm prioridade.

export const DEMO_CLIENT_ID = "demo-cafe";

export const CLIENT_BRAND_DEFAULTS = Object.freeze({
  // Negócio FICTÍCIO usado como demonstração da Flow Arts (painel público /demo).
  // Nunca publica no Instagram (BLOCKED_PUBLISH_CLIENTS em publisher.js).
  "demo-cafe": Object.freeze({
    profileVersion: "2026-10-11-demo2",
    brandName: "Café Brisa",
    niche: "Cafeteria de bairro",
    audience: "Moradores e quem trabalha perto, no Rio de Janeiro, que gostam de um café caprichado e um lanche rápido",
    whatsapp: "",
    offer: "Café especial, pão de queijo, bolos caseiros e lanches rápidos, para comer no local ou levar",
    cta: "Salve este post e marque quem vai tomar um café com você.",
    hashtags: "#CafeBrisa #CafeNoRio #CafeEspecial #RioDeJaneiro #CafeDaManha",
    followerCta: "Siga o Café Brisa para ver as novidades da semana.",
    contentFocus: "Mostrar os produtos do café com fotos apetitosas, a rotina do balcão e convites simples para visitar; negócio fictício de demonstração, sem endereço, preço ou promoção reais",
    morningTheme: "Café da manhã: café coado, pão de queijo e o começo do dia",
    afternoonTheme: "Pausa da tarde: bolo caseiro e café gelado",
    eveningTheme: "Bastidores do café e convite para voltar amanhã",
    tone: "Acolhedor, leve e carioca; frases curtas",
    themes: Object.freeze([
      "O café coado da manhã",
      "Pão de queijo saindo do forno",
      "Bolo caseiro do dia",
      "Café gelado para a tarde quente",
      "Bastidores: como preparamos o café",
      "Combinação perfeita: café e pão na chapa",
      "Cantinho para trabalhar com calma",
      "Dica: como escolher o grão do seu café"
    ]),
    hooks: Object.freeze([
      "Esse cheirinho você sente daqui?",
      "O melhor jeito de começar o dia.",
      "Pausa da tarde merece isso.",
      "Você sabia que o café muda com o grão?",
      "Saindo do forno agora."
    ]),
    avoidRules: "Negócio fictício de demonstração: nunca citar endereço, telefone, preço, promoção ou horário real. Nunca citar outras marcas. Nunca inventar avaliações ou depoimentos.",
    painPoints: Object.freeze([]),
    objections: Object.freeze([]),
    visualDirection: "Photorealistic, warm and appetizing scenes of a small neighborhood café in Rio de Janeiro: coffee cups with latte art, fresh cheese bread, homemade cake slices, a wooden counter, soft morning light, plants and tiles. One clear scene, no text, no logos, no people's faces in close-up."
  }),
  // @flowarts2026 — cadastrado no painel como "PRIMEIRO TESTE".
  "primeiro-teste": Object.freeze({
    // Ao mudar o perfil, aumente a versão: rascunhos não aprovados da versão
    // anterior são refeitos pelo Creator no próximo ciclo.
    // 2026-10-14: imagens já nascem em 4:5 e Reel virou post; refaz rascunhos antigos.
    profileVersion: "2026-10-16-estilos",
    // Auditoria do Instagram @flowarts2026 em 2026-10-10 (ver docs/nexus-memory/AUDITORIA-FLOW-ARTS.md).
    brandName: "Flow Arts",
    niche: "Agência de marketing e automação com IA",
    audience: "Pequenos negócios e empreendedores de todo o Brasil, atendidos 100% online",
    whatsapp: "5521964816185",
    offer: "Marketing e automação de Instagram 24h com IA, além de sites, fotos e vídeos para pequenos negócios",
    cta: 'Comente "EXEMPLO" e receba um exemplo grátis para o seu negócio.',
    // Todo post termina com o QUERO do brinde (resposta automática → direct → guia).
    giftCta: 'Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁',
    hashtags: "#FlowArts #MarketingDigital #Automacao #InteligenciaArtificial #PequenosNegocios",
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
      "Marketing online para pequenos negócios de qualquer cidade",
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
    // Perfil de marketing (.agents/product-marketing.md, v1 2026-10-11, respostas do Rodrigo).
    avoidRules: "Nunca citar preços ou valores (pacotes ainda não definidos). Nunca citar a Global Play, outros clientes ou concorrentes pelo nome. Nunca inventar clientes, números, resultados ou depoimentos; exemplos são sempre ilustrativos. Não prometer número de seguidores ou de vendas. Não falar de streaming ou entretenimento.",
    painPoints: Object.freeze([
      "Posta todo dia e mesmo assim não vende",
      "Não tem tempo para criar posts",
      "Fotos amadoras afastam clientes",
      "Estúdio e agência tradicional são caros"
    ]),
    objections: Object.freeze([
      "Imagem de IA parece falsa? Mostre o exemplo grátis antes de contratar e seja transparente sobre o uso de IA.",
      "Vou perder o controle do meu Instagram? Nada é publicado sem a aprovação do cliente no painel.",
      "Deve ser caro. A IA reduz o custo de estúdio e produção; peça o exemplo grátis primeiro."
    ]),
    visualDirection: "Photorealistic premium scenes for small local businesses in Brazilian cities (cafés, salons, shops, restaurants, service providers). Follow the scene given in the brief; vary subjects between posts (products, storefronts, phones, desks, business owners). The persona Marina (curly dark hair, navy blazer) appears only when the brief asks for her. Palette: deep navy, electric blue and silver accents with clean white light. One clear scene, no text."
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
    whatsapp: pick(String(profile.whatsapp || "").replace(/\D/g, ""), defaults.whatsapp),
    cta: pick(profile.cta, defaults.cta),
    giftCta: pick(defaults.giftCta),
    hashtags: pick(defaults.hashtags),
    followerCta: pick(defaults.followerCta),
    contentFocus: pick(defaults.contentFocus),
    morningTheme: pick(defaults.morningTheme),
    afternoonTheme: pick(defaults.afternoonTheme),
    eveningTheme: pick(defaults.eveningTheme),
    tone: pick(defaults.tone),
    themes: Array.isArray(defaults.themes) ? [...defaults.themes] : [],
    hooks: Array.isArray(defaults.hooks) ? [...defaults.hooks] : [],
    visualDirection: pick(defaults.visualDirection),
    avoidRules: pick(defaults.avoidRules),
    painPoints: Array.isArray(defaults.painPoints) ? [...defaults.painPoints] : [],
    objections: Array.isArray(defaults.objections) ? [...defaults.objections] : []
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

// Link do WhatsApp com mensagem pronta (funil "EU QUERO" / "EXEMPLO").
export function whatsappLink(client = {}, message = "") {
  const number = String(clientBrand(client).whatsapp || "").replace(/\D/g, "");
  if (!number) return "";
  const full = number.startsWith("55") ? number : "55" + number;
  const text = message || ("Olá! Vim pelo Instagram da " + clientBrand(client).brandName + " e quero saber mais.");
  return "https://wa.me/" + full + "?text=" + encodeURIComponent(text);
}

// Pausa na criação de posts (pedido do Rodrigo em 15/10 21h20: reavaliar antes de voltar).
// Só para a criação de posts novos e as imagens. Publicação de aprovados, direct do QUERO e brindes continuam.
// Para voltar, tire o cliente daqui.
export const GENERATION_PAUSED_CLIENTS = Object.freeze(new Set([]));
