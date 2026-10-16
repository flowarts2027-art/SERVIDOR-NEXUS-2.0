// Biblioteca de estilos visuais da Flow Arts.
// Cada estilo descreve UMA direção de arte completa (composição, luz, cores e onde
// o título fica), para os posts não saírem todos com a mesma cara.
// Regras que valem para todos: título só na metade de cima, nada nos 20% de baixo,
// tela de celular nunca virada para quem vê, paleta azul-marinho / azul elétrico / prata.

export const FLOWARTS_STYLES = Object.freeze([
  Object.freeze({
    id: "dica-editorial",
    name: "Dica editorial",
    keywords: /dica|como|passo|ideia|aprenda|segredo|guia/i,
    direction: "Editorial layout. Deep navy gradient background. The headline sits top-left, left-aligned, very large and bold. Below it, a single clean hero subject (a smartphone seen from behind the owner's shoulder showing a real-looking Instagram feed, or a tidy desk detail) fills the lower two thirds with a soft electric-blue rim light. Generous navy negative space, magazine-cover feeling."
  }),
  Object.freeze({
    id: "produto-heroi",
    name: "Produto herói",
    keywords: /foto|produto|imagem|vitrine|cardápio|cardapio|estúdio|estudio/i,
    direction: "Product-hero photography. One real small-business product (a candle, a pastry, a skincare jar, a handmade item) on a clean pedestal, macro-sharp, dramatic studio light with a thin electric-blue rim light and a silver reflection. Seamless deep navy backdrop. The headline is centered in the upper third, large and bold."
  }),
  Object.freeze({
    id: "fachada-dourada",
    name: "Fachada na luz dourada",
    keywords: /loja|negócio|negocio|cliente|bairro|local|comércio|comercio|vender|venda/i,
    direction: "A charming small storefront of a Brazilian neighborhood shop at golden hour, welcoming, with a few real-looking products visible through the window. Warm light against a cool navy-blue sky. The headline sits on the open sky area at the top, large, white, bold, centered."
  }),
  Object.freeze({
    id: "dono-em-acao",
    name: "Dono em ação",
    keywords: /tempo|rotina|automa|24h|sozinho|agente|ia\b|inteligência|inteligencia/i,
    direction: "Over-the-shoulder candid shot of a small-business owner (generic person, not facing the camera) working with a phone or laptop in their own shop, natural light, shallow depth of field, screens showing a real-looking Instagram feed or analytics. Cool navy shadows with warm skin tones. The headline sits at the top over the darker area, left-aligned, bold."
  }),
  Object.freeze({
    id: "mesa-vista-de-cima",
    name: "Mesa vista de cima",
    keywords: /plano|calend|organiz|semana|bio|perfil|identidade|marca/i,
    direction: "Top-down flat-lay of a tidy marketing desk: phone with a real-looking Instagram grid, open notebook with simple sketches, a coffee cup, a plant, a silver pen, on a matte deep-navy surface with soft window light. Keep the upper third of the frame an uncluttered surface so the large bold headline can sit there."
  }),
  Object.freeze({
    id: "tipografico-minimal",
    name: "Tipográfico minimalista",
    keywords: /erro|pare|cuidado|verdade|mito|n[aã]o\b|nunca|por que|porque/i,
    direction: "Typographic poster. Flat deep-navy to electric-blue gradient background with a subtle film grain and one small, elegant 3D object (a glowing speech bubble, a heart icon, a phone) glowing softly in the lower half. The headline is the hero: huge, extra bold, centered in the upper half, white with one key word in electric blue. Almost no other elements."
  }),
  Object.freeze({
    id: "pergunta-holofote",
    name: "Pergunta no holofote",
    keywords: /\?|você|voce|será|sera|e se\b|quanto|quando/i,
    direction: "Dramatic single spotlight cone on a dark navy stage. A lone, realistic object tied to the topic (a ring light, a phone on a tripod, an open sign) stands in the spotlight with silver highlights and a faint electric-blue haze. The headline, written as a bold question, sits large in the upper half, white."
  }),
  Object.freeze({
    id: "antes-e-depois-luz",
    name: "Contraste de luz",
    keywords: /antes|depois|transforma|resultado|mudan|melhor|profission/i,
    direction: "One single continuous photo of a small-business product or counter where the lighting and styling transition smoothly from dull and dim on one side to bright, polished and premium on the other (no split screen, no divider line, no collage). Navy and silver tones. The headline sits in the upper third, large and bold."
  })
]);

function hash(text) {
  let h = 2166136261;
  for (const ch of String(text || "")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Escolhe um estilo: prefere os que combinam com o tema do post, evita os usados
// nos últimos posts, e desempata de forma estável pela semente do post.
export function pickFlowArtsStyle({ headline = "", brief = "", seed = "", avoid = [] } = {}) {
  const avoidSet = new Set((Array.isArray(avoid) ? avoid : []).map(String));
  const text = String(headline) + " " + String(brief).slice(0, 400);
  const fresh = FLOWARTS_STYLES.filter(style => !avoidSet.has(style.id));
  const pool = fresh.length ? fresh : FLOWARTS_STYLES;
  const matching = pool.filter(style => style.keywords.test(text));
  const candidates = matching.length ? matching : pool;
  return candidates[hash(seed) % candidates.length];
}

export function styleById(id) {
  return FLOWARTS_STYLES.find(style => style.id === id) || null;
}
