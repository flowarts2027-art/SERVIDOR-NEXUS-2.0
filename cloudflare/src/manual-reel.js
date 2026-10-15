// Reel feito à mão (ex.: no Google Flow) e enviado pelo Rodrigo no Master.
// Pedido de 14/10: plano com vídeo = Rodrigo faz o vídeo; o cliente aprova no painel.
// O post nasce "esperando aprovação do cliente"; depois de aprovado, o
// agendador publica como Reel no dia e hora escolhidos. Nada sai sem aprovação.

import { getClient } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";

export const MANUAL_REEL_MAX_BYTES = 95 * 1024 * 1024;
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

// Dia e hora no horário de Brasília (UTC-3) → ISO em UTC.
export function brasiliaToIso(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !/^\d{2}:\d{2}$/.test(String(time || ""))) return "";
  const value = new Date(`${date}T${time}:00-03:00`);
  return Number.isFinite(value.getTime()) ? value.toISOString() : "";
}

function isMp4(bytes) {
  // MP4 e MOV têm "ftyp" nos bytes 4 a 8.
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

export async function createManualReel(env, form, now = new Date()) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!origin) throw new Error("public_base_url_missing");

  const clientId = String(form.get("clientId") || "").trim();
  if (!clientId || BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_invalid");
  const client = await getClient(env, clientId);
  if (!client) throw new Error("client_invalid");

  const caption = String(form.get("caption") || "").trim().slice(0, 2200);
  if (!caption) throw new Error("caption_required");

  const scheduledFor = brasiliaToIso(form.get("date"), form.get("time"));
  if (!scheduledFor) throw new Error("schedule_invalid");
  if (new Date(scheduledFor).getTime() < now.getTime() + 10 * 60 * 1000) throw new Error("schedule_too_soon");

  const video = form.get("video");
  if (!video || typeof video.arrayBuffer !== "function") throw new Error("video_required");
  const videoType = String(video.type || "").toLowerCase();
  if (!VIDEO_TYPES.has(videoType)) throw new Error("video_type");
  if (!video.size || video.size > MANUAL_REEL_MAX_BYTES) throw new Error("video_size");
  if (!isMp4(new Uint8Array(await video.slice(0, 16).arrayBuffer()))) throw new Error("video_type");

  const cover = form.get("cover");
  if (!cover || typeof cover.arrayBuffer !== "function") throw new Error("cover_required");
  const coverType = String(cover.type || "").toLowerCase();
  if (!COVER_TYPES.has(coverType) || !cover.size || cover.size > COVER_MAX_BYTES) throw new Error("cover_required");

  const id = "manual-reel-" + crypto.randomUUID();
  const base = "posts/" + clientId + "/" + id + "/";
  const videoKey = base + "reel.mp4";
  const coverKey = base + "capa." + (coverType === "image/png" ? "png" : coverType === "image/webp" ? "webp" : "jpg");
  const meta = { clientId, postId: id, kind: "manual-reel" };
  await env.MEDIA.put(videoKey, video.stream(), { httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta });
  await env.MEDIA.put(coverKey, cover.stream(), { httpMetadata: { contentType: coverType, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta });
  const videoUrl = origin + "/media/" + videoKey;
  const coverUrl = origin + "/media/" + coverKey;

  const hook = caption.split("\n").map(line => line.trim()).find(Boolean) || "Reel";
  const time = String(form.get("time"));
  const payload = {
    clientName: client.name || client.id,
    instagram: client.instagram || "",
    imageUrl: coverUrl,
    title: hook.slice(0, 160),
    creativeFeatures: { requestedFormat: "reel", hook: hook.slice(0, 160) },
    formatBuild: { kind: "reel", videoUrl, imageUrl: coverUrl, source: "manual-flow" },
    qualityGates: { copyChief: "approved", designer: "approved", formatBuilder: "approved" },
    visualReview: { status: "approved", reviewer: "rodrigo", reason: "Reel feito e conferido pelo Rodrigo" },
    intelligence: { format: "reel", plannedFormat: "reel", mediaSource: "manual-flow" },
    source: "master:manual-reel",
    manual: true,
    retryCount: 0,
    brandProfileVersion: brandProfileVersion(clientId),
    createdBy: "master"
  };
  await env.DB.prepare(
    "INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,?3,?4,'ready','pending','',?5,'','',0,?6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
  ).bind(id, clientId, scheduledFor, time, caption, JSON.stringify(payload)).run();
  return { ok: true, id, clientId, clientName: client.name || clientId, scheduledFor, videoUrl, coverUrl };
}

const MESSAGES = {
  client_invalid: "Escolha um cliente da lista.",
  caption_required: "Escreva a legenda do Reel.",
  schedule_invalid: "Escolha o dia e a hora.",
  schedule_too_soon: "Escolha um horário pelo menos 10 minutos à frente.",
  video_required: "Escolha o vídeo.",
  video_type: "O vídeo precisa ser MP4 (ou MOV).",
  video_size: "O vídeo passa de 95 MB. Exporte em 720p ou 1080p.",
  cover_required: "Não consegui tirar a capa do vídeo. Tente outro navegador.",
  r2_unavailable: "O armazenamento de mídia está fora do ar.",
  public_base_url_missing: "Falta configurar o endereço público do servidor."
};

// Master: POST /api/master/manual-reel. Quem chama já conferiu o login do Master.
export async function handleManualReelMaster(request, env, url) {
  if (url.pathname !== "/api/master/manual-reel" || request.method !== "POST") return null;
  try {
    const form = await request.formData().catch(() => null);
    if (!form) throw new Error("video_required");
    return send(await createManualReel(env, form));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu para enviar. Tente de novo." }, 400);
  }
}
