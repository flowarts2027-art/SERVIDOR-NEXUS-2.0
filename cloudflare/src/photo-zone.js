// Foto sempre à esquerda (pedido do Rodrigo, 27/11/2026).
// No teste de 27/11 a IA pôs a pessoa à direita e o painel da moldura cobriu a moça.
// Medidas tiradas das molduras de TODOS os clientes (scripts/social/moldura_clientes.py e moldura_daniela.py;
// todos usam o mesmo molde):
// - POST 4:5 (1080x1350): a foto entra com FEED_PHOTO_SCALE (86%) no canto de cima à esquerda. O painel começa
//   em 43% da largura da arte no ponto mais largo (47-48% no meio). Na foto, isso é 43/86 = 50% da largura.
//   A faixa da logo começa em 88,5% da altura da arte, abaixo da foto (que vai até 86%): não cobre a foto.
// - STORY 9:16 (1080x1920): a foto cobre a tela inteira e o painel começa em 40,4% da altura.
// Com folga de segurança (e os ~3% que a grade do perfil corta de cada lado), a pessoa fica:
// - POST: nos 45% da esquerda da foto, de cima a baixo;
// - STORY: nos 37% de cima da foto.
import { FEED_PHOTO_SCALE } from "./art-frame.js";

export const PANEL_FEED_START = 0.43;   // da largura da arte
export const PANEL_STORY_START = 0.404; // da altura da arte
export const SAFE_FEED_MAX_X = 0.45;    // da largura da FOTO
export const SAFE_STORY_MAX_Y = 0.37;   // da altura da FOTO

// Onde o painel começa na foto do post (50%).
export function feedPanelStartInPhoto() {
  return PANEL_FEED_START / FEED_PHOTO_SCALE;
}

// Vai na FRENTE do pedido à IA (o pedido é cortado em 2.000 letras; a regra nunca pode ficar de fora).
export function safeZonePrompt(aspect) {
  if (aspect === "9:16") {
    return "COMPOSITION (most important rule, overrides any other position instruction): vertical 9:16 photo. "
      + `The person and the main subject must be entirely inside the TOP ${Math.round(SAFE_STORY_MAX_Y * 100)}% of the image `
      + "(head, face, hands and product all in the upper part). The lower part of the image is only calm background "
      + "(floor, wall, table surface or soft blur) because a text panel covers it. The photo still fills the whole frame. ";
  }
  return "COMPOSITION (most important rule, overrides any other position instruction): vertical 4:5 photo. "
    + `The person and the main subject must be entirely inside the LEFT ${Math.round(SAFE_FEED_MAX_X * 100)}% of the image, `
    + "from top to bottom (face, hands and product all on the left side, the person facing right toward the center). "
    + "The right half of the image is only calm background (wall, window, soft blur) because a text panel covers it. "
    + "The photo still fills the whole frame edge to edge. ";
}

export const SIDE_PROMPT = "Olhe a pessoa (ou o objeto) principal desta foto. Ela está mais no lado ESQUERDO, "
  + "no CENTRO ou no lado DIREITO da imagem? Responda só uma palavra: ESQUERDA, CENTRO ou DIREITA.";

export function parseSide(answer) {
  const t = String(answer || "").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/^DIREIT/.test(t) || /^RIGHT/.test(t)) return "right";
  if (/^ESQUERD/.test(t) || /^LEFT/.test(t)) return "left";
  if (/^CENT/.test(t)) return "center";
  return null;
}

// Conferência depois de gerar: pessoa à direita no POST → espelha a foto (de graça, sem gerar outra).
// Story não espelha (de cima para baixo não se resolve espelhando). Na dúvida, deixa como veio.
export async function keepSubjectLeft(env, bytes, aspect, ask) {
  if (aspect === "9:16" || !env?.IMAGES || typeof ask !== "function") return { bytes, flipped: false, side: null };
  let side = null;
  try { side = parseSide(await ask(env, bytes, SIDE_PROMPT)); } catch { side = null; }
  if (side !== "right") return { bytes, flipped: false, side };
  try {
    const res = await (await env.IMAGES.input(new Blob([bytes]).stream()).transform({ flip: "h" })
      .output({ format: "image/jpeg", quality: 92 })).response();
    if (!res.ok) return { bytes, flipped: false, side };
    const out = new Uint8Array(await res.arrayBuffer());
    if (!out.byteLength) return { bytes, flipped: false, side };
    return { bytes: out, flipped: true, side, mime: "image/jpeg" };
  } catch {
    return { bytes, flipped: false, side };
  }
}
