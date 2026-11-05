// Texto por código nas artes que chegam SEM texto (pedido do Rodrigo, 29/10/2026).
// As letras já vêm prontas numa camada transparente feita no deploy (scripts/social/molduras_upload.py).
// Regra de 05/11/2026: a foto ocupa a tela toda. Nada de fundo desfocado, margem ou faixa de cor, e nada é
// cortado. O Nexus só escreve logo, título, vantagens e botão por cima, e só em foto 4:5 ou 9:16.
// Daniela Martins não recebe nada escrito.
import { artShape } from "./art-format.js";

const FEED = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
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
export async function composeFramed(env, bytes, frame, { story = false, numero = null } = {}) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const size = story ? STORY : FEED;
  const info = await env.IMAGES.info(stream(bytes));
  if (artShape(info?.width, info?.height) !== (story ? "story" : "portrait")) throw new Error("art_not_framable");
  const clientDir = frame.arquivo.split("/")[0];
  let canvas = env.IMAGES.input(stream(bytes)).transform({ width: size.width, height: size.height, fit: "cover" });
  canvas = canvas.draw(env.IMAGES.input(stream(await assetBytes(env, frame.arquivo))), { left: 0, top: 0 });
  if (numero && frame.numero) {
    canvas = canvas.draw(env.IMAGES.input(stream(await assetBytes(env, `${clientDir}/num-${numero}.png`))), { left: frame.numero.left, top: frame.numero.top });
  }
  const response = await (await canvas.output({ format: "image/jpeg", quality: 90 })).response();
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

export async function imageHasText(env, bytes) {
  if (!env?.AI || !env?.IMAGES) return true;
  try {
    const small = await (await env.IMAGES.input(stream(bytes)).transform({ width: 512, height: 640, fit: "scale-down" })
      .output({ format: "image/jpeg", quality: 80 })).response();
    if (!small.ok) return true;
    const dataUrl = "data:image/jpeg;base64," + toBase64(new Uint8Array(await small.arrayBuffer()));
    const out = await Promise.race([
      env.AI.run(String(env.NEXUS_VISION_MODEL || TEXT_CHECK_MODEL), {
        messages: [{ role: "user", content: [
          { type: "text", text: TEXT_CHECK_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } }
        ] }],
        max_tokens: 5
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
    ]);
    return parseHasText(out?.response ?? out?.result?.response ?? "");
  } catch (error) {
    console.error("text_check_failed", String(error?.message || error));
    return true;
  }
}
