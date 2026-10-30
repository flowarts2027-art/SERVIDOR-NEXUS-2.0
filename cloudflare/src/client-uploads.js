// Painel do cliente: enviar conteúdo PRONTO (feed, carrossel, reels ou stories) — pedido do Rodrigo em 16/10.
// Quem envia é o próprio cliente: o post já nasce aprovado, no dia e hora que ele escolheu.
// Nada de IA aqui (sem custo na OpenAI). Dá para trocar o dia ou cancelar antes de publicar.

import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";
import { brasiliaToIso } from "./manual-reel.js";
import { toInstagramJpeg } from "./manual-carousel.js";
import { VISUAL_REVIEW_POLICY } from "./visual-review.js";
import { loadFrames, hasFrames, pickFrame, composeFramed, imageHasText } from "./art-frame.js";

export const UPLOAD_TYPES = Object.freeze(["feed", "carousel", "reel", "story"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_BYTES = 95 * 1024 * 1024;

function isMp4(bytes) {
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

function files(form, name) {
  return form.getAll(name).filter(file => file && typeof file.arrayBuffer === "function");
}

function checkImage(file) {
  if (!IMAGE_TYPES.has(String(file.type || "").toLowerCase())) throw new Error("image_type");
  if (!file.size || file.size > IMAGE_MAX_BYTES) throw new Error("image_size");
}

async function checkVideo(file) {
  if (!VIDEO_TYPES.has(String(file.type || "").toLowerCase())) throw new Error("video_type");
  if (!file.size || file.size > VIDEO_MAX_BYTES) throw new Error("video_size");
  if (!isMp4(new Uint8Array(await file.slice(0, 16).arrayBuffer()))) throw new Error("video_type");
}

// options (Master, 18/10): approval "pending" = o cliente aprova no painel; allowClientDate = sem data, o cliente escolhe.
export async function createClientUpload(env, client, form, now = new Date(), options = {}) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!origin) throw new Error("public_base_url_missing");
  const clientId = String(client?.id || "");
  if (!clientId || BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_invalid");

  const type = String(form.get("type") || "").trim();
  if (!UPLOAD_TYPES.includes(type)) throw new Error("type_invalid");
  const caption = type === "story" ? "" : String(form.get("caption") || "").trim().slice(0, 2200);
  if (type !== "story" && !caption) throw new Error("caption_required");
  const clientPicksDate = options.allowClientDate === true && String(form.get("when") || "") === "client";
  const time = clientPicksDate ? "" : String(form.get("time") || "");
  const scheduledFor = clientPicksDate ? null : brasiliaToIso(form.get("date"), time);
  if (!clientPicksDate && !scheduledFor) throw new Error("schedule_invalid");
  if (!clientPicksDate && new Date(scheduledFor).getTime() < now.getTime() + 10 * 60 * 1000) throw new Error("schedule_too_soon");

  const id = "upload-" + type + "-" + crypto.randomUUID();
  const base = "posts/" + clientId + "/" + id + "/";
  const meta = { clientId, postId: id, kind: "client-upload-" + type };
  // REGRA FIXA (Rodrigo, 29/10/2026): imagem que chega SEM texto ganha logo, título, vantagens e botão
  // escritos pelo Nexus (moldura do cliente, PADRAO_ARTES.md). Imagem que já tem texto não recebe nada
  // por cima: só entra inteira no formato, sem cortar (toInstagramJpeg). "jaTemTexto=1" pula a checagem.
  const frames = options.skipFrame === true || String(form.get("jaTemTexto") || "") === "1"
    ? null : await loadFrames(env).catch(() => null);
  const canFrame = Boolean(frames && hasFrames(frames, clientId));
  const textReport = [];
  let frameSeed = Math.floor(now.getTime() / 3600000);
  const putImage = async (file, name, size, numero = null) => {
    const key = base + name;
    let body = null;
    if (canFrame) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (await imageHasText(env, bytes)) {
        textReport.push("ja-tinha-texto");
      } else {
        const story = size.height > 1500;
        const frame = pickFrame(frames, clientId, story, frameSeed++);
        try {
          body = await composeFramed(env, bytes, frame, { story, numero });
          textReport.push("texto-do-nexus");
        } catch (error) {
          console.error("upload_frame_failed", { clientId, error: String(error?.message || error) });
          textReport.push("sem-texto-erro");
        }
      }
    }
    await env.MEDIA.put(key, body || await toInstagramJpeg(env, file, size), {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta
    });
    return origin + "/media/" + key;
  };
  const putVideo = async file => {
    const key = base + "video.mp4";
    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta
    });
    return origin + "/media/" + key;
  };

  const toVerticalCover = async cover => {
    const key = base + "capa.jpg";
    await env.MEDIA.put(key, await toInstagramJpeg(env, cover, { width: 1080, height: 1920 }), {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta
    });
    return origin + "/media/" + key;
  };

  const FEED = { width: 1080, height: 1350 };
  const VERTICAL = { width: 1080, height: 1920 };
  let imageUrl = "";
  let formatBuild = {};
  if (type === "feed") {
    const [image] = files(form, "images");
    if (!image) throw new Error("image_required");
    checkImage(image);
    imageUrl = await putImage(image, "imagem.jpg", FEED);
    formatBuild = { status: "approved", kind: "post", imageUrl };
  } else if (type === "carousel") {
    const images = files(form, "images");
    if (images.length < 2 || images.length > 10) throw new Error("images_count");
    images.forEach(checkImage);
    const urls = [];
    for (let i = 0; i < images.length; i++) urls.push(await putImage(images[i], "cartao-" + (i + 1) + ".jpg", FEED, i < 5 ? i + 1 : null));
    imageUrl = urls[0];
    formatBuild = { status: "approved", kind: "carousel", carouselUrls: urls, cardCount: urls.length };
  } else {
    const [video] = files(form, "video");
    const [image] = files(form, "images");
    const [cover] = files(form, "cover");
    if (type === "reel" && !video) throw new Error("video_required");
    if (type === "story" && !video && !image) throw new Error("story_media_required");
    if (video) {
      await checkVideo(video);
      if (!cover) throw new Error("cover_required");
      checkImage(cover);
      const videoUrl = await putVideo(video);
      imageUrl = await toVerticalCover(cover);
      formatBuild = { status: "approved", kind: type, videoUrl, imageUrl };
    } else {
      checkImage(image);
      imageUrl = await putImage(image, "story.jpg", VERTICAL);
      formatBuild = { status: "approved", kind: "story", imageUrl };
    }
  }

  const requestedFormat = type === "feed" ? "post" : type;
  const title = (caption.split("\n").map(line => line.trim()).find(Boolean) || ({ story: "Story", reel: "Reel", feed: "Post", carousel: "Carrossel" })[type]).slice(0, 160);
  const payload = {
    clientName: client.name || clientId,
    instagram: client.instagram || "",
    imageUrl,
    title,
    creativeFeatures: { requestedFormat, hook: title },
    formatBuild: { ...formatBuild, source: "client-upload", builtAt: new Date().toISOString(), ...(textReport.length ? { artText: textReport } : {}) },
    qualityGates: { copyChief: "approved", designer: "approved", formatBuilder: "approved" },
    visualReview: { version: VISUAL_REVIEW_POLICY.version, media: imageUrl, status: "approved", qualityScore: 100, reviewer: options.reviewer || "client", reason: options.reason || "Conteúdo enviado pronto pelo cliente" },
    intelligence: { format: requestedFormat, plannedFormat: requestedFormat, mediaSource: options.mediaSource || "client-upload" },
    dateChoice: "client",
    source: options.source || "portal:client-upload",
    manual: true,
    retryCount: 0,
    brandProfileVersion: brandProfileVersion(clientId),
    createdBy: options.createdBy || "client"
  };
  const approval = options.approval === "pending" ? "pending" : "approved";
  await env.DB.prepare(
    "INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,?3,?4,'ready',?7,'',?5,'','',0,?6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
  ).bind(id, clientId, scheduledFor, time, caption, JSON.stringify(payload), approval).run();
  return { ok: true, id, type, scheduledFor, approval, artText: textReport };
}

export const CLIENT_UPLOAD_MESSAGES = {
  type_invalid: "Escolha o tipo: feed, carrossel, reels ou stories.",
  caption_required: "Escreva a legenda.",
  schedule_invalid: "Escolha o dia e a hora.",
  schedule_too_soon: "Escolha um horário pelo menos 10 minutos à frente.",
  image_required: "Escolha a imagem.",
  images_count: "Escolha de 2 a 10 imagens para o carrossel.",
  image_type: "As imagens precisam ser JPG, PNG ou WEBP.",
  image_size: "Cada imagem pode ter no máximo 8 MB.",
  image_convert_unavailable: "Envie a imagem em JPG.",
  image_convert_failed: "Não consegui preparar a imagem. Tente em JPG.",
  video_required: "Escolha o vídeo do Reels.",
  story_media_required: "Escolha uma imagem ou um vídeo para o Stories.",
  video_type: "O vídeo precisa ser MP4 (ou MOV).",
  video_size: "O vídeo passa de 95 MB. Exporte em 720p ou 1080p.",
  cover_required: "Não consegui tirar a capa do vídeo. Tente outro navegador.",
  client_invalid: "Esta conta não pode publicar.",
  r2_unavailable: "O armazenamento está fora do ar. Tente mais tarde.",
  public_base_url_missing: "Falta configurar o endereço público do servidor."
};
