// Reel animado por modelo (pedido do Rodrigo em 17/10, inspirado nos vídeos feitos em código).
// O Rodrigo escreve 5 cenas no Master (gancho, dor, solução, como funciona, chamada), com foto opcional.
// O GitHub Actions desenha a animação (scripts/reel) e devolve capa + MP4. Sem IA, sem custo de OpenAI.
// Enquanto grava, o post fica 'reel_rendering' (escondido do cliente). Com o vídeo, vira 'ready'
// sem data: o cliente escolhe o dia e aprova no painel. Sem data e sem aprovação, nada publica.
// Desligar: variável NEXUS_ANIMATED_REEL=false.

import { getClient } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";
import { toInstagramJpeg } from "./manual-carousel.js";
import { charCount, forbiddenReasons, TITLE_LINE1_MAX, TITLE_LINE2_MAX } from "./carousel-agent.js";

export const ANIMATED_REEL_TEMPLATE = "flow-5-cenas";
export const ANIMATED_REEL_SCENES = 5;
export const ANIMATED_REEL_UPLOAD_PATH = "/api/internal/animated-reel/upload";
export const ANIMATED_REEL_FAIL_PATH = "/api/internal/animated-reel/fail";
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_BYTES = 95 * 1024 * 1024;
const COVER_MAX_BYTES = 5 * 1024 * 1024;

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = value => String(value || "").normalize("NFC").replace(/\s+/g, " ").trim();
const parseJson = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };

export function animatedReelEnabled(env) {
  return String(env?.NEXUS_ANIMATED_REEL ?? "true").trim().toLowerCase() !== "false";
}

// Confere os textos das 5 cenas com as mesmas regras do carrossel. Devolve a lista de erros.
export function validateReelScenes(scenes) {
  const errors = [];
  if (!Array.isArray(scenes) || scenes.length !== ANIMATED_REEL_SCENES) return ["Preencha as 5 cenas."];
  scenes.forEach((scene, index) => {
    const n = index + 1;
    if (!scene.l1 || !scene.l2) errors.push(`Cena ${n}: escreva as duas linhas.`);
    if (charCount(scene.l1) > TITLE_LINE1_MAX) errors.push(`Cena ${n}: linha 1 tem ${charCount(scene.l1)} letras (máximo ${TITLE_LINE1_MAX}).`);
    if (charCount(scene.l2) > TITLE_LINE2_MAX) errors.push(`Cena ${n}: linha 2 tem ${charCount(scene.l2)} letras (máximo ${TITLE_LINE2_MAX}).`);
    for (const why of forbiddenReasons(scene.l1 + " " + scene.l2)) errors.push(`Cena ${n}: ${why}.`);
    if (n === ANIMATED_REEL_SCENES && /comente\s+quero/i.test(scene.l1 + " " + scene.l2)) {
      errors.push("Cena 5: não escreva \"Comente QUERO\" (o botão já diz isso).");
    }
  });
  return errors;
}

function publicBase(env) {
  return String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

function invalid(code, message) {
  const error = new Error(code);
  error.userMessage = message;
  return error;
}

export async function createAnimatedReel(env, form, fetchImpl = fetch) {
  if (!animatedReelEnabled(env)) throw new Error("animated_reel_disabled");
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const origin = publicBase(env);
  if (!origin) throw new Error("public_base_url_missing");
  const ghToken = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!ghToken) throw new Error("github_actions_token_missing");

  const clientId = String(form.get("clientId") || "").trim();
  if (!clientId || BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_invalid");
  const client = await getClient(env, clientId);
  if (!client) throw new Error("client_invalid");

  const caption = String(form.get("caption") || "").trim().slice(0, 2200);
  if (!caption) throw new Error("caption_required");

  const scenes = [];
  for (let n = 1; n <= ANIMATED_REEL_SCENES; n++) {
    scenes.push({ l1: clean(form.get("l1_" + n)), l2: clean(form.get("l2_" + n)), photoFile: form.get("photo_" + n) });
  }
  const errors = validateReelScenes(scenes);
  if (errors.length) throw invalid("scenes_invalid", errors.join(" "));
  for (const scene of scenes) {
    const file = scene.photoFile;
    if (!file || typeof file.arrayBuffer !== "function" || !file.size) { scene.photoFile = null; continue; }
    if (!PHOTO_TYPES.has(String(file.type || "").toLowerCase())) throw new Error("photo_type");
    if (file.size > PHOTO_MAX_BYTES) throw new Error("photo_size");
  }

  const id = "animated-reel-" + crypto.randomUUID();
  const base = "posts/" + clientId + "/" + id + "/";
  const renderScenes = [];
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index];
    let photo = "";
    if (scene.photoFile) {
      const key = base + "cena-" + (index + 1) + ".jpg";
      await env.MEDIA.put(key, await toInstagramJpeg(env, scene.photoFile, { width: 1080, height: 880 }, { crop: true }), {
        httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { clientId, postId: id, kind: "animated-reel-photo", scene: String(index + 1) }
      });
      photo = origin + "/media/" + key;
    }
    renderScenes.push({ l1: scene.l1, l2: scene.l2, photo });
  }

  return startAnimatedReel(env, client, {
    id, scenes: renderScenes, caption, scheduledFor: null, source: "master:animated-reel"
  }, fetchImpl);
}

// Grava o post e pede a gravação ao GitHub. Usado pelo botão do Master e pelo Reel automático.
// scheduledFor null = o cliente escolhe o dia no painel; com data = o cliente só aprova (pode trocar o dia).
export async function startAnimatedReel(env, client, { id, scenes, caption, scheduledFor = null, scheduledHour = "", source, extra = {} }, fetchImpl = fetch) {
  const clientId = String(client.id);
  const ghToken = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!ghToken) throw new Error("github_actions_token_missing");
  const callbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hook = scenes[0].l1 + " " + scenes[0].l2;
  const payload = {
    clientName: client.name || client.id,
    instagram: client.instagram || "",
    imageUrl: "",
    title: hook.slice(0, 160),
    creativeFeatures: { requestedFormat: "reel", hook: hook.slice(0, 160) },
    formatBuild: {
      status: "rendering", kind: "reel", source: "animated-template", template: ANIMATED_REEL_TEMPLATE,
      scenes, callbackToken, dispatchedAt: new Date().toISOString()
    },
    qualityGates: { copyChief: "approved", designer: "approved", formatBuilder: "pending" },
    visualReview: { status: "approved", reviewer: source.startsWith("auto:") ? "nexus" : "rodrigo", reason: "Textos conferidos pelo código; animação por modelo" },
    intelligence: { format: "reel", plannedFormat: "reel", mediaSource: "animated-template" },
    ...(scheduledFor ? {} : { dateChoice: "client" }),
    source,
    // manual: os agentes de legenda (Hook Lab, Story, Copy Chief, correção do CTA) não reescrevem este post.
    manual: true,
    retryCount: 0,
    brandProfileVersion: brandProfileVersion(clientId),
    createdBy: source.startsWith("auto:") ? "nexus" : "master",
    ...extra
  };
  await env.DB.prepare(
    "INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,?3,?4,'reel_rendering','pending','',?5,'','format_build_pending',0,?6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
  ).bind(id, clientId, scheduledFor, scheduledHour, caption, JSON.stringify(payload)).run();

  const repo = String(env.GITHUB_INGEST_REPOSITORY || "flowarts2027-art/SERVIDOR-NEXUS-2.0").trim();
  const [owner, name] = repo.split("/");
  let response;
  try {
    response = await fetchImpl(`https://api.github.com/repos/${owner}/${name}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ghToken}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "NEXUS-Animated-Reel"
      },
      body: JSON.stringify({
        event_type: "reel-template-render",
        client_payload: {
          post_id: id,
          client_id: clientId,
          callback_token: callbackToken,
          reel: JSON.stringify({ template: ANIMATED_REEL_TEMPLATE, scenes, cta: "Comente QUERO", sub: "Ou chama no WhatsApp: link na bio" })
        }
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    response = { status: 0 };
  }
  if (response.status !== 204) {
    await env.DB.prepare("DELETE FROM post_ledger WHERE id=?1 AND client_id=?2").bind(id, clientId).run();
    throw new Error("github_dispatch_failed");
  }
  return { ok: true, id, clientId, clientName: client.name || clientId, status: "reel_rendering", scheduledFor };
}

// Situação do Reel para o Master acompanhar.
export async function animatedReelStatus(env, clientId, id) {
  const row = await env.DB.prepare("SELECT id,status,error,payload_json FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1")
    .bind(String(id), String(clientId)).first();
  if (!row) return null;
  const build = parseJson(row.payload_json, {})?.formatBuild || {};
  return {
    id: row.id,
    status: row.status,
    error: row.status === "reel_render_failed" ? String(row.error || "") : "",
    videoUrl: String(build.videoUrl || ""),
    imageUrl: String(build.imageUrl || "")
  };
}

async function loadForCallback(request, env) {
  const postId = String(request.headers.get("x-nexus-post-id") || "").trim();
  const clientId = String(request.headers.get("x-nexus-client-id") || "").trim();
  const token = String(request.headers.get("x-nexus-callback-token") || "").trim();
  if (!postId || !clientId || !token) return { error: send({ error: "unauthorized" }, 401) };
  const row = await env.DB.prepare("SELECT status,payload_json FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1").bind(postId, clientId).first();
  if (!row) return { error: send({ error: "post_not_found" }, 404) };
  const payload = parseJson(row.payload_json, {});
  const build = payload?.formatBuild && typeof payload.formatBuild === "object" ? payload.formatBuild : {};
  if (build.source !== "animated-template" || !build.callbackToken || String(build.callbackToken) !== token) {
    return { error: send({ error: "unauthorized" }, 401) };
  }
  if (row.status !== "reel_rendering") return { error: send({ error: "not_rendering" }, 409) };
  return { postId, clientId, payload, build };
}

// GitHub Actions devolve a capa (x-nexus-part: cover) e depois o vídeo (x-nexus-part: video).
export async function handleAnimatedReelCallback(request, env, url) {
  if (url.pathname === ANIMATED_REEL_FAIL_PATH) {
    if (request.method !== "POST") return send({ error: "method_not_allowed" }, 405);
    const ctx = await loadForCallback(request, env);
    if (ctx.error) return ctx.error;
    const body = await request.json().catch(() => ({}));
    const code = String(body?.error || "reel_render_failed").replace(/[^a-z0-9_]/gi, "").slice(0, 60) || "reel_render_failed";
    delete ctx.build.callbackToken;
    ctx.payload.formatBuild = { ...ctx.build, status: "failed", failedAt: new Date().toISOString(), error: code };
    await env.DB.prepare("UPDATE post_ledger SET status='reel_render_failed',error=?3,payload_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2")
      .bind(ctx.postId, ctx.clientId, code, JSON.stringify(ctx.payload)).run();
    return send({ ok: true }, 200);
  }
  if (url.pathname !== ANIMATED_REEL_UPLOAD_PATH) return null;
  if (request.method !== "PUT") return send({ error: "method_not_allowed" }, 405);
  const ctx = await loadForCallback(request, env);
  if (ctx.error) return ctx.error;
  const part = String(request.headers.get("x-nexus-part") || "").trim();
  const type = String(request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const size = Number(request.headers.get("content-length") || 0);
  if (!env.MEDIA || !request.body) return send({ error: "r2_unavailable" }, 503);

  let key;
  if (part === "cover") {
    if (type !== "image/jpeg") return send({ error: "invalid_content_type" }, 415);
    if (!size || size > COVER_MAX_BYTES) return send({ error: "invalid_size" }, 400);
    key = "posts/" + ctx.clientId + "/" + ctx.postId + "/capa-" + crypto.randomUUID() + ".jpg";
  } else if (part === "video") {
    if (type !== "video/mp4") return send({ error: "invalid_content_type" }, 415);
    if (!size || size > VIDEO_MAX_BYTES) return send({ error: "invalid_size" }, 400);
    key = "posts/" + ctx.clientId + "/" + ctx.postId + "/reel-" + crypto.randomUUID() + ".mp4";
  } else {
    return send({ error: "invalid_part" }, 400);
  }
  await env.MEDIA.put(key, request.body, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: ctx.clientId, postId: ctx.postId, kind: "animated-reel-" + part }
  });
  const mediaUrl = publicBase(env) + "/media/" + key;
  const payload = ctx.payload;

  if (part === "cover") {
    payload.formatBuild = { ...ctx.build, imageUrl: mediaUrl };
    payload.imageUrl = mediaUrl;
    await env.DB.prepare("UPDATE post_ledger SET payload_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2")
      .bind(ctx.postId, ctx.clientId, JSON.stringify(payload)).run();
    return send({ ok: true, part, url: mediaUrl }, 201);
  }

  const next = { ...ctx.build, status: "approved", videoUrl: mediaUrl, objectKey: key, builtAt: new Date().toISOString() };
  delete next.callbackToken;
  payload.formatBuild = next;
  if (!payload.imageUrl && next.imageUrl) payload.imageUrl = next.imageUrl;
  payload.qualityGates = { ...(payload.qualityGates || {}), formatBuilder: "approved", formatBuilderAt: new Date().toISOString() };
  await env.DB.prepare("UPDATE post_ledger SET status='ready',error='',payload_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2")
    .bind(ctx.postId, ctx.clientId, JSON.stringify(payload)).run();
  return send({ ok: true, part, url: mediaUrl, complete: true }, 201);
}

const MESSAGES = {
  animated_reel_disabled: "O Reel animado está desligado (NEXUS_ANIMATED_REEL=false).",
  client_invalid: "Escolha um cliente da lista.",
  caption_required: "Escreva a legenda do Reel.",
  photo_type: "As fotos precisam ser JPG, PNG ou WEBP.",
  photo_size: "Cada foto pode ter no máximo 8 MB.",
  image_convert_unavailable: "Envie as fotos em JPG.",
  image_convert_failed: "Não consegui preparar uma das fotos. Tente em JPG.",
  r2_unavailable: "O armazenamento de mídia está fora do ar.",
  public_base_url_missing: "Falta configurar o endereço público do servidor.",
  github_actions_token_missing: "Falta a chave do GitHub no servidor.",
  github_dispatch_failed: "O GitHub não aceitou o pedido. Tente de novo em alguns minutos."
};

// Master: POST /api/master/animated-reel (criar) e GET /api/master/animated-reel?clientId=&id= (acompanhar).
// Quem chama já conferiu o login do Master.
export async function handleAnimatedReelMaster(request, env, url) {
  if (url.pathname !== "/api/master/animated-reel") return null;
  if (request.method === "GET") {
    const status = await animatedReelStatus(env, url.searchParams.get("clientId") || "", url.searchParams.get("id") || "");
    return status ? send({ ok: true, ...status }) : send({ ok: false, error: "not_found" }, 404);
  }
  if (request.method !== "POST") return send({ error: "method_not_allowed" }, 405);
  try {
    const form = await request.formData().catch(() => null);
    if (!form) throw new Error("client_invalid");
    return send(await createAnimatedReel(env, form));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: error?.userMessage || MESSAGES[code] || "Não deu para criar o Reel. Tente de novo." }, 400);
  }
}
