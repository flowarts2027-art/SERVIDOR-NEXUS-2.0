// Texto por código nas artes que chegam SEM texto (pedido do Rodrigo, 29/10/2026).
// As letras já vêm prontas numa camada transparente feita no deploy (scripts/social/molduras_upload.py).
// Regra de 05/11/2026: a foto ocupa a tela toda. Nada de fundo desfocado, margem ou faixa de cor, e nada é
// cortado. O Nexus só escreve logo, título, vantagens e botão por cima, e só em foto 4:5 ou 9:16.
// Daniela Martins não recebe nada escrito.
import { artShape } from "./art-format.js";

const FEED = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
// Post com moldura de painel: a foto entra com 86% do tamanho, no canto de cima à esquerda (Rodrigo, 26/11/2026).
export const FEED_PHOTO_SCALE = 0.86;
const NO_TEXT_CLIENTS = Object.freeze(new Set(["daniela-martins"]));
let cachedMeta = null;

export async function loadFrames(env) {
  if (cachedMeta) return cachedMeta;
  if (!env?.ASSETS?.fetch) return null;
  try {
    const res = await env.ASSETS.fetch(new Request("https://assets.local/molduras/molduras.json"));
    if (!res.ok) return null;
    const meta = await res.json();
    if (!meta?.clientes) return null;
    cachedMeta = meta;
    return meta;
  } catch {
    return null;
  }
}

export function resetFramesCache() { cachedMeta = null; }

export function hasFrames(meta, clientId) {
  if (NO_TEXT_CLIENTS.has(String(clientId || ""))) return false;
  const c = meta?.clientes?.[String(clientId || "")];
  return Boolean(c?.feed?.length && c?.story?.length);
}

// Escolhe a moldura: gira pelos textos do cliente para não repetir o mesmo título.
export function pickFrame(meta, clientId, story, seed = 0) {
  const c = meta.clientes[String(clientId)];
  const list = story ? c.story : c.feed;
  const frame = list[Math.abs(Math.trunc(Number(seed) || 0)) % list.length];
  return { ...frame, numero: c.numero?.[story ? "story" : "feed"] || null };
}

async function assetBytes(env, path) {
  const res = await env.ASSETS.fetch(new Request("https://assets.local/molduras/" + path));
  if (!res.ok) throw new Error("frame_asset_missing");
  return new Uint8Array(await res.arrayBuffer());
}

const stream = bytes => new Blob([bytes]).stream();

// bytes: imagem original (JPG, PNG ou WEBP). Devolve um JPG 1080x1350 (feed) ou 1080x1920 (story).
export async function composeFramed(env, bytes, frame, { story = false, numero = null, logoKey = "" } = {}) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const size = story ? STORY : FEED;
  const info = await env.IMAGES.info(stream(bytes));
  if (artShape(info?.width, info?.height) !== (story ? "story" : "portrait")) throw new Error("art_not_framable");
  const clientDir = frame.arquivo.split("/")[0];
  let canvas = env.IMAGES.input(stream(bytes)).transform({ width: size.width, height: size.height, fit: "cover" });
  canvas = canvas.draw(env.IMAGES.input(stream(await assetBytes(env, frame.arquivo))), { left: 0, top: 0 });
  // Logo salva no Master entra aqui, na hora. Sem ela, vale a identidade feita no deploy.
  const logo = logoKey ? await env.MEDIA.get(logoKey).catch(() => null) : null;
  canvas = logo
    ? canvas.draw(env.IMAGES.input(logo.body).transform({ height: story ? 112 : 104, fit: "scale-down" }), { left: 64, top: story ? 270 : 48 })
    : canvas.draw(env.IMAGES.input(stream(await assetBytes(env, `${clientDir}/marca-${story ? "story" : "feed"}.png`))), { left: 0, top: 0 });
  if (numero && frame.numero) {
    canvas = canvas.draw(env.IMAGES.input(stream(await assetBytes(env, `${clientDir}/num-${numero}.png`))), { left: frame.numero.left, top: frame.numero.top });
  }
  const response = await (await canvas.output({ format: "image/jpeg", quality: 90 })).response();
  if (!response.ok) throw new Error("images_compose_http_" + response.status);
  const out = new Uint8Array(await response.arrayBuffer());
  if (!out.byteLength || out.byteLength > 8 * 1024 * 1024) throw new Error("images_compose_invalid");
  return out;
}

// MOLDURA DA DANIELA (Rodrigo, 20/11/2026): exceção por cliente à regra de 18/11 logo abaixo.
// Toda foto SEM texto que sobe no painel dela ganha a moldura dela: foto cobrindo a tela, painel verde-oliva
// com textos revisados (scripts/social/campanha/textos_daniela.json, feitos no deploy) e a logo do Master na
// faixa de baixo. A IA grátis só responde SIM/NAO ("já tem texto?" e "é sobrancelha?"); quem escreve é o Nexus.
export const PANEL_CLIENTS = Object.freeze(new Set(["daniela-martins"]));
export const EYEBROW_PROMPT = "Esta foto mostra principalmente SOBRANCELHA, olhos ou rosto em close (design de sobrancelhas)? "
  + "Pernas, axilas, braços, corpo, sala ou materiais de depilação NÃO contam. Responda só SIM ou NAO.";

// TODOS os clientes (Rodrigo, 20/11/2026): quem tem moldura de painel no molduras.json ganha a moldura
// (scripts/social/moldura_clientes.py, textos em campanha/textos_clientes.json). A foto sobe pura.
export function hasPanel(meta, clientId) {
  const c = meta?.clientes?.[String(clientId || "")];
  return c?.estilo === "painel" && Boolean(c?.feed?.length && c?.story?.length);
}

// Só a Daniela separa depilação de sobrancelha; os outros clientes usam um tema só ("geral").
export async function panelThemeFor(env, clientId, bytes) {
  if (String(clientId || "") !== "daniela-martins") return "geral";
  return (await isEyebrowPhoto(env, bytes)) ? "sobrancelha" : "depilacao";
}

// Escolhe o texto: só textos do tema certo; gira pelo contador para não repetir em seguida.
export function pickPanel(meta, clientId, story, theme, counter = 0) {
  const c = meta.clientes[String(clientId)];
  const all = story ? c.story : c.feed;
  const list = all.filter(f => f.tema === theme);
  const pool = list.length ? list : all;
  return { ...pool[Math.abs(Math.trunc(Number(counter) || 0)) % pool.length], logo: c.logo?.[story ? "story" : "feed"] || null };
}

export async function isEyebrowPhoto(env, bytes) {
  // Na dúvida (sem IA, erro ou demora), fica depilação, que é o serviço principal dela.
  return (await visionAsk(env, bytes, EYEBROW_PROMPT)) === true;
}

// Contador simples no R2 para girar os textos (feed e story separados).
export async function nextPanelCounter(env, clientId, story) {
  const key = "molduras-estado/" + String(clientId) + ".json";
  let state = { feed: 0, story: 0 };
  try {
    const obj = await env.MEDIA.get(key);
    if (obj) state = { ...state, ...(await obj.json()) };
  } catch { /* começa do zero */ }
  const field = story ? "story" : "feed";
  const n = Number(state[field]) || 0;
  state[field] = n + 1;
  await env.MEDIA.put(key, JSON.stringify(state), { httpMetadata: { contentType: "application/json" } }).catch(() => {});
  return n;
}

// Foto (qualquer formato) cobre a tela 1080x1350 ou 1080x1920; moldura por cima; logo no meio da faixa de baixo.
export async function composePanel(env, bytes, frame, { story = false, logoKey = "" } = {}) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const size = story ? STORY : FEED;
  let canvas;
  if (story) {
    canvas = env.IMAGES.input(stream(bytes)).transform({ width: size.width, height: size.height, fit: "cover" });
  } else {
    // REGRA (Rodrigo, 26/11/2026): o painel do post não pode cobrir o assunto da foto. O painel começa em 43% da
    // largura e a faixa da logo nos 13% de baixo; a foto entra menor (FEED_PHOTO_SCALE), encostada no canto de
    // cima à esquerda, e o resto do fundo é a mesma foto desfocada (fica quase todo embaixo do painel).
    const w = Math.round(size.width * FEED_PHOTO_SCALE), h = Math.round(size.height * FEED_PHOTO_SCALE);
    canvas = env.IMAGES.input(stream(bytes)).transform({ width: size.width, height: size.height, fit: "cover", blur: 60 });
    canvas = canvas.draw(env.IMAGES.input(stream(bytes)).transform({ width: w, height: h, fit: "cover" }), { left: 0, top: 0 });
  }
  canvas = canvas.draw(env.IMAGES.input(stream(await assetBytes(env, frame.arquivo))), { left: 0, top: 0 });
  let logoBytes = null;
  const obj = logoKey ? await env.MEDIA.get(logoKey).catch(() => null) : null;
  if (obj) logoBytes = new Uint8Array(await new Response(obj.body).arrayBuffer());
  else {
    const res = await env.ASSETS.fetch(new Request("https://assets.local/brand/" + String(frame.arquivo).split("/")[0] + "-logo.png")).catch(() => null);
    if (res?.ok) logoBytes = new Uint8Array(await res.arrayBuffer());
  }
  if (logoBytes && frame.logo) {
    const li = await env.IMAGES.info(stream(logoBytes));
    let h = Number(frame.logo.altura) || 110;
    let w = Math.round(h * (Number(li?.width) || 1) / (Number(li?.height) || 1));
    const maxW = Math.round(size.width * 0.5);
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    canvas = canvas.draw(env.IMAGES.input(stream(logoBytes)).transform({ width: w, height: h, fit: "scale-down" }),
      { left: Math.round((size.width - w) / 2), top: Math.round(Number(frame.logo.centro_y) - h / 2) });
  }
  const response = await (await canvas.output({ format: "image/jpeg", quality: 92 })).response();
  if (!response.ok) throw new Error("images_compose_http_" + response.status);
  const out = new Uint8Array(await response.arrayBuffer());
  if (!out.byteLength || out.byteLength > 8 * 1024 * 1024) throw new Error("images_compose_invalid");
  return out;
}

// REGRA (Rodrigo, 18/11/2026): o Nexus NUNCA escreve texto em arte que chega ao painel (já houve muito erro
// de escrever por cima). Texto, só no ChatGPT. Em TODA arte que chega, com ou sem texto, o Nexus cola só a logo
// ORIGINAL salva no Master. A arte não é cortada nem encolhida: sai no mesmo tamanho em que chegou.
export const NEXUS_WRITES_TEXT_ON_ARRIVAL = false;
// Onde a logo entra: canto de cima à direita; Daniela Martins, embaixo no meio ("no final das artes").
const LOGO_BOTTOM_CLIENTS = Object.freeze(new Set(["daniela-martins"]));
export const logoPositionFor = clientId => LOGO_BOTTOM_CLIENTS.has(String(clientId || "")) ? "bottom" : "top-right";
// Canto livre (Rodrigo, 18/11/2026): a logo nunca cobre frase. O Nexus tenta os cantos nesta ordem e usa o primeiro
// que a IA grátis disser que está vazio. Nenhum livre: a arte vai sem logo (melhor que cobrir o texto).
const CORNER_ORDER = Object.freeze({
  "top-right": ["top-right", "top-left", "bottom-right", "bottom-left"],
  bottom: ["bottom", "bottom-right", "bottom-left", "top-right", "top-left"]
});
export const LOGO_AREA_PROMPT = "Este é um recorte de uma arte de anúncio. Há alguma letra, palavra, número, ícone, botão "
  + "ou produto importante neste recorte? Céu, chão, parede, fundo liso ou desfocado NÃO contam. Responda só SIM ou NAO.";

export async function stampLogo(env, bytes, logoKey, { story = false, position = "top-right" } = {}) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const info = await env.IMAGES.info(stream(bytes));
  const W = Number(info?.width), H = Number(info?.height);
  if (!W || !H) throw new Error("art_info_missing");
  const obj = logoKey ? await env.MEDIA.get(logoKey) : null;
  if (!obj) throw new Error("logo_missing");
  const logoBytes = new Uint8Array(await new Response(obj.body).arrayBuffer());
  const li = await env.IMAGES.info(stream(logoBytes));
  // Tamanho dobrado a pedido do Rodrigo (18/11/2026). Margem de 5%: a grade do perfil (3:4) corta ~3% de cada lado.
  const sizeFor = bottom => {
    let h = Math.round(W * (bottom ? 0.3 : story ? 0.22 : 0.2));
    let w = Math.round(h * (Number(li?.width) || 1) / (Number(li?.height) || 1));
    const maxW = Math.round(W * (bottom ? 0.6 : 0.45));
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    return { w, h };
  };
  const margin = Math.round(W * 0.05);
  // Story: longe da barra do Instagram em cima (nome e progresso) e da caixa de resposta embaixo.
  const topY = story ? Math.round(H * 0.13) : margin;
  const placeOf = corner => {
    const { w, h } = sizeFor(corner === "bottom");
    const left = corner === "bottom" ? Math.round((W - w) / 2) : corner.endsWith("left") ? margin : W - margin - w;
    const top = corner.startsWith("top") ? topY : H - h - (story ? Math.round(H * 0.12) : margin);
    return { corner, w, h, left, top };
  };
  let place = null;
  for (const corner of CORNER_ORDER[position] || CORNER_ORDER["top-right"]) {
    const p = placeOf(corner);
    if (!(await areaBusy(env, bytes, p, W, H))) { place = p; break; }
  }
  if (!place) throw new Error("no_free_corner");
  const canvas = env.IMAGES.input(stream(bytes))
    .draw(env.IMAGES.input(stream(logoBytes)).transform({ width: place.w, height: place.h, fit: "scale-down" }), { left: place.left, top: place.top });
  const response = await (await canvas.output({ format: "image/jpeg", quality: 92 })).response();
  if (!response.ok) throw new Error("images_compose_http_" + response.status);
  const out = new Uint8Array(await response.arrayBuffer());
  if (!out.byteLength || out.byteLength > 8 * 1024 * 1024) throw new Error("images_compose_invalid");
  return out;
}

// Regra fixa (Rodrigo, 29/10/2026): toda imagem que sobe para o painel de qualquer cliente passa aqui.
// A IA grátis do Cloudflare só responde SIM ou NAO: "já tem texto escrito?". Quem escreve é o Nexus.
// Na dúvida (sem IA, erro ou demora), conta como "já tem texto" para nunca escrever por cima de outro texto.
const TEXT_CHECK_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
export const TEXT_CHECK_VERSION = 2;
// v2 (29/10 21h50): a v1 confundia letreiro de prédio e marca de relógio com texto de arte.
export const TEXT_CHECK_PROMPT = "Esta imagem é uma ARTE DE ANÚNCIO já pronta, com um TÍTULO ou FRASE grande escrita por cima da foto "
  + "(texto de design, faixa com frase, botão escrito)? Letreiro de loja ou prédio, marca de produto, números de relógio, "
  + "tela de celular e qualquer texto pequeno que faz parte da cena NÃO contam. Responda só SIM ou NAO.";

export function parseHasText(answer) {
  const t = String(answer || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^N(AO|O)\b/.test(t)) return false;
  return true;
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Pergunta de SIM ou NAO para a IA grátis. Na dúvida (sem IA, erro ou demora), responde SIM.
async function visionYes(env, bytes, question) {
  const answer = await visionAsk(env, bytes, question);
  return answer === null ? true : answer;
}

// Mesma pergunta, mas devolve null quando não deu para perguntar.
async function visionAsk(env, bytes, question) {
  if (!env?.AI || !env?.IMAGES) return null;
  try {
    const small = await (await env.IMAGES.input(stream(bytes)).transform({ width: 512, height: 640, fit: "scale-down" })
      .output({ format: "image/jpeg", quality: 80 })).response();
    if (!small.ok) return null;
    const dataUrl = "data:image/jpeg;base64," + toBase64(new Uint8Array(await small.arrayBuffer()));
    const out = await Promise.race([
      env.AI.run(String(env.NEXUS_VISION_MODEL || TEXT_CHECK_MODEL), {
        messages: [{ role: "user", content: [
          { type: "text", text: question },
          { type: "image_url", image_url: { url: dataUrl } }
        ] }],
        max_tokens: 5
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
    ]);
    return parseHasText(out?.response ?? out?.result?.response ?? "");
  } catch (error) {
    console.error("text_check_failed", String(error?.message || error));
    return null;
  }
}

export function imageHasText(env, bytes) {
  return visionYes(env, bytes, TEXT_CHECK_PROMPT);
}

// Imagem gerada: tem pessoa ou animal onde o Nexus vai escrever? Sim descarta a imagem.
export function imageZonesBlocked(env, bytes) {
  return visionYes(env, bytes, "Há pessoa ou animal no terço de cima ou no terço de baixo desta imagem? Responda só SIM ou NAO.");
}

// Recorta o lugar da logo (com folga) e pergunta à IA se tem texto ali. Na dúvida, conta como ocupado.
async function areaBusy(env, bytes, place, W, H) {
  if (!env?.AI) return false; // sem IA no ambiente (testes locais): usa o canto padrão
  const pad = Math.round(W * 0.02);
  const left = Math.max(0, place.left - pad), top = Math.max(0, place.top - pad);
  const width = Math.min(W - left, place.w + pad * 2), height = Math.min(H - top, place.h + pad * 2);
  try {
    const crop = await (await env.IMAGES.input(stream(bytes)).transform({ trim: { left, top, width, height } })
      .output({ format: "image/jpeg", quality: 85 })).response();
    if (!crop.ok) return true;
    return await visionYes(env, new Uint8Array(await crop.arrayBuffer()), LOGO_AREA_PROMPT);
  } catch {
    return true;
  }
}
