// Janelas por formato (Rodrigo, 05/11/2026). Regra em docs/nexus-memory/REGRAS_ENVIO_ARTES.md.
// Cada janela aceita só o seu tamanho. Imagem certa não é alterada. Imagem errada é recusada:
// o Nexus nunca corta, encolhe ou põe margem sozinho.
const SHAPES = Object.freeze({ story: 9 / 16, portrait: 4 / 5, square: 1 });
const WINDOWS = Object.freeze({ feed: ["portrait", "square"], carousel: ["portrait", "square"], story: ["story"], reel: ["story"] });
const SHAPE_TOLERANCE = 0.005; // só arredondamento: 1080x1351 passa, 1100x1350 não
const HEAD_BYTES = 65536;

export const WINDOW_MOVES = Object.freeze({ window_story: "story", window_feed: "feed" });
export const ART_MESSAGES = Object.freeze({
  window_story: "ESTA ARTE É DE STORY (9:16). Ela caiu na janela errada.",
  window_feed: "ESTA ARTE É DE POST (4:5 ou 1:1). Ela caiu na janela errada.",
  size_invalid: "TAMANHO NÃO ACEITO. Story e Reels: 1080x1920. Post e carrossel: 1080x1350 ou 1080x1080.",
  carousel_mixed: "TODAS AS PÁGINAS DO CARROSSEL PRECISAM TER O MESMO TAMANHO.",
  video_window: "O VÍDEO PRECISA SER EM PÉ, 9:16 (1080x1920)."
});

export function artShape(width, height) {
  const w = Number(width) || 0, h = Number(height) || 0;
  if (!w || !h) return "";
  return Object.keys(SHAPES).find(name => Math.abs(w / h - SHAPES[name]) / SHAPES[name] <= SHAPE_TOLERANCE) || "";
}

// Devolve o código do erro, ou "" se a arte serve para a janela. Tamanho desconhecido não é recusado aqui.
export function windowError(type, size) {
  if (!size?.width || !size?.height) return "";
  const shape = artShape(size.width, size.height);
  if (!shape) return "size_invalid";
  if (WINDOWS[type]?.includes(shape)) return "";
  return shape === "story" ? "window_story" : "window_feed";
}

// Lê largura e altura do cabeçalho do arquivo. Sem custo: não usa a Cloudflare nem a Meta.
export function readImageSize(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      }
      i += 2 + view.getUint16(i + 2);
    }
    return null;
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...b.slice(12, 16));
    if (kind === "VP8X") return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
    if (kind === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (kind === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

async function fileSize(env, file) {
  const fromHead = readImageSize(new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer()));
  if (fromHead?.width) return fromHead;
  return env?.IMAGES ? env.IMAGES.info(file.stream()).catch(() => null) : null;
}

// Confere as imagens da janela. Carrossel: todas as páginas iguais.
export async function assertArtFits(env, type, images = []) {
  const sizes = [];
  for (const image of images) {
    const size = await fileSize(env, image);
    const error = windowError(type, size);
    if (error) throw new Error(type === "carousel" && error !== "size_invalid" ? "size_invalid" : error);
    sizes.push(size);
  }
  const known = sizes.filter(size => size?.width);
  if (type === "carousel" && new Set(known.map(size => artShape(size.width, size.height))).size > 1) throw new Error("carousel_mixed");
  return sizes;
}

function boxesOf(view, start, end) {
  const out = [];
  for (let i = start; i + 8 <= end;) {
    const size = view.getUint32(i);
    if (size < 8 || i + size > end) break;
    out.push({ type: String.fromCharCode(view.getUint8(i + 4), view.getUint8(i + 5), view.getUint8(i + 6), view.getUint8(i + 7)), start: i + 8, end: i + size });
    i += size;
  }
  return out;
}

// Tamanho do vídeo pela caixa "tkhd" do MP4, lendo só a parte "moov". Vídeo girado troca largura e altura.
export async function readVideoSize(file) {
  let offset = 0, moov = null;
  while (offset + 16 <= file.size && !moov) {
    const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
    const type = String.fromCharCode(head.getUint8(4), head.getUint8(5), head.getUint8(6), head.getUint8(7));
    let size = head.getUint32(0);
    if (size === 1) size = Number(head.getBigUint64(8));
    if (size === 0) size = file.size - offset;
    if (size < 8) return null;
    if (type === "moov") moov = new Uint8Array(await file.slice(offset + 8, offset + size).arrayBuffer());
    offset += size;
  }
  if (!moov) return null;
  const view = new DataView(moov.buffer);
  for (const trak of boxesOf(view, 0, moov.length).filter(box => box.type === "trak")) {
    const tkhd = boxesOf(view, trak.start, trak.end).find(box => box.type === "tkhd");
    if (!tkhd) continue;
    const width = view.getUint32(tkhd.end - 8) >>> 16, height = view.getUint32(tkhd.end - 4) >>> 16;
    if (!width || !height) continue;
    const matrix = tkhd.end - 44; // a=0 na matriz: vídeo girado 90 graus
    return view.getInt32(matrix) === 0 ? { width: height, height: width } : { width, height };
  }
  return null;
}

export async function assertVideoFits(file) {
  const size = await readVideoSize(file).catch(() => null);
  if (size?.width && artShape(size.width, size.height) !== "story") throw new Error("video_window");
}

// Imagem certa vai como veio. PNG e WEBP só mudam de tipo (o Instagram pede JPG), no mesmo tamanho.
export async function keepArt(env, file) {
  if (String(file.type || "").toLowerCase() === "image/jpeg") return new Uint8Array(await file.arrayBuffer());
  if (!env.IMAGES) throw new Error("image_convert_unavailable");
  const response = await (await env.IMAGES.input(file.stream()).output({ format: "image/jpeg", quality: 92 })).response();
  if (!response.ok) throw new Error("image_convert_failed");
  return new Uint8Array(await response.arrayBuffer());
}

function mediaKey(url) {
  const marker = "/media/";
  const at = String(url || "").indexOf(marker);
  return at < 0 ? "" : decodeURIComponent(String(url).slice(at + marker.length).split(/[?#]/)[0]);
}

// Última trava antes de publicar, para todos os caminhos: agentes, Biblioteca, conector e painel.
// Só barra quando tem certeza. Vídeo e imagem fora do nosso armazenamento passam.
export async function mediaFitsFormat(env, payload = {}, format = "post") {
  const build = payload.formatBuild || {};
  if (build.videoUrl || !env?.MEDIA?.get) return true;
  const type = format === "story" ? "story" : format === "carousel" ? "carousel" : "feed";
  const urls = type === "carousel" && Array.isArray(build.carouselUrls) ? build.carouselUrls : [build.imageUrl || payload.imageUrl || payload.publicImageUrl];
  for (const url of urls) {
    const key = mediaKey(url);
    if (!key) continue;
    const object = await env.MEDIA.get(key, { range: { offset: 0, length: HEAD_BYTES } }).catch(() => null);
    if (!object?.arrayBuffer) continue;
    const size = readImageSize(new Uint8Array(await object.arrayBuffer()));
    if (windowError(type, size)) return false;
  }
  return true;
}
