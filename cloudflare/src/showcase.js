// Vitrine por nicho (17/10): página pública /exemplo/<nicho> com o Reel de exemplo da Flow Arts,
// e a escolha no Master de qual Reel é a vitrine de cada nicho. SÓ para a Flow Arts.

import { CAPTADOR_NICHES } from "./captador.js";
import { whatsappLink } from "./client-brand.js";
import { SHOWCASE_CLIENT, readShowcase, writeShowcase, showcaseUrl } from "./showcase-store.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const https = value => /^https:\/\//i.test(String(value || "")) ? String(value) : "";
const parseJson = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const sendJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function showcasePage(niche, entry, whatsapp) {
  const label = CAPTADOR_NICHES[niche]?.label || "pequenos negócios";
  const title = `Exemplo de Reel para ${label.toLowerCase()} · Flow Arts`;
  const description = "Vídeo feito pela Flow Arts. Conteúdo com a cara do negócio, e você aprova tudo antes de publicar.";
  const video = https(entry?.videoUrl);
  const poster = https(entry?.imageUrl);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="video.other">
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
</style>
</head>
<body>
<main>
  <div class="marca">FLOW ARTS</div>
  <h1>Um Reel que a Flow Arts fez para ${esc(label.toLowerCase())}</h1>
  ${video ? `<video src="${esc(video)}" ${poster ? `poster="${esc(poster)}"` : ""} controls autoplay muted loop playsinline></video>` : `<p>O exemplo deste tipo de negócio ainda está sendo preparado.</p>`}
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
  const entry = (await readShowcase(env))[niche];
  const label = CAPTADOR_NICHES[niche]?.label || "meu negócio";
  const whatsapp = whatsappLink({ id: SHOWCASE_CLIENT, config: {} }, `Olá! Vi o exemplo de Reel para ${label.toLowerCase()} e quero um para o meu negócio.`);
  return new Response(showcasePage(niche, entry, whatsapp), {
    status: CAPTADOR_NICHES[niche] && entry?.videoUrl ? 200 : 404,
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
    return sendJson({
      ok: true, map: await readShowcase(env), reels: await showcaseCandidates(env),
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
    map[niche] = { postId, videoUrl: reel.videoUrl, imageUrl: reel.imageUrl, title: reel.title, savedAt: new Date().toISOString() };
  }
  await writeShowcase(env, map);
  return sendJson({ ok: true, map, url: showcaseUrl(niche) });
}
