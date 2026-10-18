// Vitrine por nicho (17/10): página pública /exemplo/<nicho> com o Reel de exemplo da Flow Arts,
// e a escolha no Master de qual Reel é a vitrine de cada nicho. SÓ para a Flow Arts.

import { CAPTADOR_NICHES } from "./captador.js";
import { whatsappLink } from "./client-brand.js";
import { SHOWCASE_CLIENT, readShowcase, writeShowcase, showcaseUrl, showcaseEntry } from "./showcase-store.js";
import { toInstagramJpeg } from "./manual-carousel.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const https = value => /^https:\/\//i.test(String(value || "")) ? String(value) : "";
const parseJson = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const sendJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function showcasePage(niche, entry, whatsapp) {
  const label = CAPTADOR_NICHES[niche]?.label || "pequenos negócios";
  const images = (Array.isArray(entry?.images) ? entry.images : []).map(https).filter(Boolean).slice(0, 10);
  const isCarousel = entry?.kind === "carousel" && images.length > 0;
  const what = isCarousel ? "carrossel" : "Reel";
  const title = `Exemplo de ${what} para ${label.toLowerCase()} · Flow Arts`;
  const description = "Vídeo feito pela Flow Arts. Conteúdo com a cara do negócio, e você aprova tudo antes de publicar.";
  const video = isCarousel ? "" : https(entry?.videoUrl);
  const poster = https(entry?.imageUrl) || images[0] || "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="${video ? "video.other" : "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(showcaseUrl(niche))}">
${poster ? `<meta property="og:image" content="${esc(poster)}">` : ""}
${video ? `<meta property="og:video" content="${esc(video)}"><meta property="og:video:type" content="video/mp4">` : ""}
<style>
  :root { --azul:#1648eb; --preto:#0c0c10; --fundo:#f4f6fb; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--fundo); color: var(--preto); }
  main { max-width: 460px; margin: 0 auto; padding: 24px 16px 40px; }
  .marca { font-weight: 800; letter-spacing: .14em; font-size: 14px; color: var(--azul); }
  h1 { font-size: 24px; line-height: 1.2; margin: 10px 0 16px; }
  video { width: 100%; aspect-ratio: 9 / 16; border-radius: 20px; background: #000; display: block; box-shadow: 0 16px 40px rgba(12,12,16,.18); }
  p { font-size: 16px; line-height: 1.5; color: #3a3f4f; }
  .botao { display: block; text-align: center; background: var(--azul); color: #fff; text-decoration: none; font-weight: 700; font-size: 18px; padding: 16px; border-radius: 999px; margin-top: 18px; }
  .site { display: block; text-align: center; margin-top: 14px; color: var(--azul); }
  .carrossel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 10px; border-radius: 20px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .carrossel::-webkit-scrollbar { display: none; }
  .carrossel img { flex: 0 0 100%; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; scroll-snap-align: center; border-radius: 20px; box-shadow: 0 16px 40px rgba(12,12,16,.18); }
  .dica { text-align: center; font-size: 14px; color: #6b7080; margin: 10px 0 0; }
</style>
</head>
<body>
<main>
  <div class="marca">FLOW ARTS</div>
  <h1>Um ${what} que a Flow Arts fez para ${esc(label.toLowerCase())}</h1>
  ${isCarousel
    ? `<div class="carrossel">${images.map((src, i) => `<img src="${esc(src)}" alt="Cartão ${i + 1} de ${images.length}" loading="${i ? "lazy" : "eager"}">`).join("")}</div><p class="dica">Arraste para o lado para ver os ${images.length} cartões →</p>`
    : video ? `<video src="${esc(video)}" ${poster ? `poster="${esc(poster)}"` : ""} controls autoplay muted loop playsinline></video>` : `<p>O exemplo deste tipo de negócio ainda está sendo preparado.</p>`}
  <p>Conteúdo com a cara do seu negócio. Você aprova tudo antes, pelo painel, e a Flow Arts publica no dia certo.</p>
  <a class="botao" href="${esc(whatsapp)}">Quero um para o meu negócio</a>
  <a class="site" href="https://flowarts.com.br">Conhecer a Flow Arts</a>
</main>
</body>
</html>`;
}

// Página pública: GET /exemplo/<nicho>.
export async function handleShowcasePage(request, env, url) {
  const match = url.pathname.match(/^\/exemplo\/([a-z_]{2,30})\/?$/);
  if (!match || !["GET", "HEAD"].includes(request.method)) return null;
  const niche = match[1];
  const entry = showcaseEntry(await readShowcase(env), niche);
  const label = CAPTADOR_NICHES[niche]?.label || "meu negócio";
  const whatsapp = whatsappLink({ id: SHOWCASE_CLIENT, config: {} }, `Olá! Vi o exemplo para ${label.toLowerCase()} e quero um para o meu negócio.`);
  return new Response(showcasePage(niche, entry, whatsapp), {
    status: CAPTADOR_NICHES[niche] && hasExample(entry) ? 200 : 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" }
  });
}

async function showcaseCandidates(env) {
  const rows = (await env.DB.prepare(
    `SELECT id,status,caption,payload_json,created_at FROM post_ledger WHERE client_id=?1
       AND COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.formatBuild.videoUrl'),'') LIKE 'https://%'
       AND COALESCE(status,'') NOT IN ('reel_rendering','reel_render_failed')
     ORDER BY created_at DESC LIMIT 40`
  ).bind(SHOWCASE_CLIENT).all())?.results || [];
  return rows.map(row => {
    const payload = parseJson(row.payload_json, {});
    return {
      id: row.id, status: row.status, createdAt: row.created_at,
      title: String(payload.title || String(row.caption || "").split("\n")[0] || "Reel").slice(0, 80),
      videoUrl: https(payload.formatBuild?.videoUrl), imageUrl: https(payload.formatBuild?.imageUrl || payload.imageUrl)
    };
  });
}

// Master: GET/POST /api/master/showcase. Quem chama já conferiu o login do Master.
export async function handleShowcaseMaster(request, env, url) {
  if (url.pathname !== "/api/master/showcase") return null;
  if (request.method === "GET") {
    const map = await readShowcase(env);
    return sendJson({
      ok: true, map, panel: await panelStatus(env, map).catch(() => ({})), reels: await showcaseCandidates(env),
      niches: Object.entries(CAPTADOR_NICHES).map(([key, n]) => ({ key, label: n.label, url: showcaseUrl(key) }))
    });
  }
  if (request.method !== "POST") return sendJson({ error: "method_not_allowed" }, 405);
  const body = await request.json().catch(() => ({}));
  const niche = String(body?.niche || "");
  if (!CAPTADOR_NICHES[niche]) return sendJson({ ok: false, message: "Escolha um tipo de negócio da lista." }, 400);
  const map = await readShowcase(env);
  const postId = String(body?.postId || "");
  if (!postId) {
    delete map[niche];
  } else {
    const reel = (await showcaseCandidates(env)).find(item => item.id === postId);
    if (!reel?.videoUrl) return sendJson({ ok: false, message: "Esse Reel não foi encontrado." }, 400);
    map[niche] = { kind: "video", postId, videoUrl: reel.videoUrl, imageUrl: reel.imageUrl, images: [], title: reel.title, savedAt: new Date().toISOString() };
  }
  await writeShowcase(env, map);
  return sendJson({ ok: true, map, url: showcaseUrl(niche) });
}

export function hasExample(entry) {
  return Boolean(https(entry?.videoUrl) || (entry?.kind === "carousel" && Array.isArray(entry?.images) && entry.images.length));
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 95 * 1024 * 1024;

// Exemplo só para vendas (pedido de 17/10): carrossel ou vídeo por nicho, guardado à parte.
// NÃO cria post: nunca aparece no painel do cliente e nunca vai para o Instagram.
export async function uploadExample(env, form, now = new Date()) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!origin) throw new Error("public_base_url_missing");
  const niche = String(form.get("niche") || "");
  if (!CAPTADOR_NICHES[niche]) throw new Error("niche_invalid");
  const kind = String(form.get("kind") || "");
  const base = `examples/${niche}/${now.getTime()}/`;
  const meta = { kind: "sales-example", niche };
  const cache = { contentType: "", cacheControl: "public, max-age=31536000, immutable" };
  let entry;
  if (kind === "carousel") {
    const images = form.getAll("images").filter(file => file && typeof file.arrayBuffer === "function");
    if (images.length < 2 || images.length > 10) throw new Error("images_count");
    for (const file of images) {
      if (!IMAGE_TYPES.has(String(file.type || "").toLowerCase())) throw new Error("image_type");
      if (!file.size || file.size > IMAGE_MAX) throw new Error("image_size");
    }
    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const key = `${base}cartao-${i + 1}.jpg`;
      await env.MEDIA.put(key, await toInstagramJpeg(env, images[i]), { httpMetadata: { ...cache, contentType: "image/jpeg" }, customMetadata: meta });
      urls.push(origin + "/media/" + key);
    }
    entry = { kind: "carousel", images: urls, imageUrl: urls[0], videoUrl: "", savedAt: now.toISOString() };
  } else if (kind === "video") {
    const video = form.get("video");
    if (!video || typeof video.arrayBuffer !== "function") throw new Error("video_required");
    const type = String(video.type || "").toLowerCase();
    if (!["video/mp4", "video/quicktime"].includes(type)) throw new Error("video_type");
    if (!video.size || video.size > VIDEO_MAX) throw new Error("video_size");
    const head = new Uint8Array(await video.slice(0, 16).arrayBuffer());
    if (String.fromCharCode(...head.slice(4, 8)) !== "ftyp") throw new Error("video_type");
    const videoKey = `${base}video.mp4`;
    await env.MEDIA.put(videoKey, video.stream(), { httpMetadata: { ...cache, contentType: "video/mp4" }, customMetadata: meta });
    let imageUrl = "";
    const cover = form.get("cover");
    if (cover && typeof cover.arrayBuffer === "function" && IMAGE_TYPES.has(String(cover.type || "").toLowerCase()) && cover.size <= IMAGE_MAX) {
      const coverKey = `${base}capa.jpg`;
      await env.MEDIA.put(coverKey, cover.stream(), { httpMetadata: { ...cache, contentType: String(cover.type) }, customMetadata: meta });
      imageUrl = origin + "/media/" + coverKey;
    }
    entry = { kind: "video", videoUrl: origin + "/media/" + videoKey, imageUrl, images: [], savedAt: now.toISOString() };
  } else {
    throw new Error("kind_invalid");
  }
  const map = await readShowcase(env);
  map[niche] = entry;
  await writeShowcase(env, map);
  return { ok: true, niche, entry, url: showcaseUrl(niche) };
}

// O Reel usado como exemplo que ficou no painel da Flow Arts: tira do painel (não publicado, sem apagar o vídeo).
export async function removeFromPanel(env, postId) {
  const id = String(postId || "");
  const result = await env.DB.prepare(
    "UPDATE post_ledger SET status='cancelled',error='used_as_sales_example',updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND COALESCE(status,'') IN ('ready','scheduled','failed') AND COALESCE(media_id,'')=''"
  ).bind(id, SHOWCASE_CLIENT).run();
  if (!Number(result?.meta?.changes || 0)) throw new Error("not_in_panel");
  return { ok: true, postId: id };
}

async function panelStatus(env, map) {
  const ids = Object.values(map).map(e => e?.postId).filter(Boolean);
  if (!ids.length) return {};
  const marks = ids.map((_, i) => "?" + (i + 2)).join(",");
  const rows = (await env.DB.prepare(`SELECT id,status FROM post_ledger WHERE client_id=?1 AND id IN (${marks})`).bind(SHOWCASE_CLIENT, ...ids).all())?.results || [];
  return Object.fromEntries(rows.map(r => [r.id, r.status]));
}

const EXAMPLE_MESSAGES = {
  niche_invalid: "Escolha um tipo de negócio da lista.",
  kind_invalid: "Escolha carrossel ou vídeo.",
  images_count: "Escolha de 2 a 10 imagens.",
  image_type: "As imagens precisam ser JPG, PNG ou WEBP.",
  image_size: "Cada imagem pode ter no máximo 8 MB.",
  image_convert_unavailable: "Envie as imagens em JPG.",
  image_convert_failed: "Não consegui preparar uma das imagens. Tente em JPG.",
  video_required: "Escolha o vídeo.",
  video_type: "O vídeo precisa ser MP4 (ou MOV).",
  video_size: "O vídeo passa de 95 MB. Exporte em 720p ou 1080p.",
  not_in_panel: "Esse post não está mais esperando no painel.",
  r2_unavailable: "O armazenamento de mídia está fora do ar.",
  public_base_url_missing: "Falta configurar o endereço público do servidor."
};

// Master: POST /api/master/showcase/upload e /api/master/showcase/remove-from-panel.
export async function handleShowcaseExtras(request, env, url) {
  if (request.method !== "POST") return null;
  try {
    if (url.pathname === "/api/master/showcase/upload") {
      const form = await request.formData().catch(() => null);
      if (!form) throw new Error("kind_invalid");
      return sendJson(await uploadExample(env, form));
    }
    if (url.pathname === "/api/master/showcase/remove-from-panel") {
      const body = await request.json().catch(() => ({}));
      return sendJson(await removeFromPanel(env, body.postId));
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return sendJson({ ok: false, error: code, message: EXAMPLE_MESSAGES[code] || "Não deu certo. Tente de novo." }, 400);
  }
  return null;
}
