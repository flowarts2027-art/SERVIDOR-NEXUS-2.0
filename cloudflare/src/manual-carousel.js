// Carrossel pronto enviado pelo Rodrigo no Master (pedido de 16/10).
// O post nasce "esperando aprovação" e SEM data: o cliente escolhe o dia e a hora no painel.
// Só dá para aprovar depois de escolher a data; sem data, nada publica (dateChoice: "client").

import { getClient } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { brandProfileVersion } from "./client-brand.js";
import { brasiliaToIso } from "./manual-reel.js";
import { VISUAL_REVIEW_POLICY } from "./visual-review.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

// O Instagram só aceita JPEG no carrossel: converte e deixa em 1080x1350 (4:5).
async function toInstagramJpeg(env, file) {
  const type = String(file.type || "").toLowerCase();
  if (!env.IMAGES) {
    if (type !== "image/jpeg") throw new Error("image_convert_unavailable");
    return file.stream();
  }
  const out = await env.IMAGES.input(file.stream()).transform({ width: 1080, height: 1350, fit: "cover" }).output({ format: "image/jpeg", quality: 92 });
  const response = await out.response();
  if (!response.ok) throw new Error("image_convert_failed");
  return new Uint8Array(await response.arrayBuffer());
}

export async function createManualCarousel(env, form) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!origin) throw new Error("public_base_url_missing");

  const clientId = String(form.get("clientId") || "").trim();
  if (!clientId || BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_invalid");
  const client = await getClient(env, clientId);
  if (!client) throw new Error("client_invalid");

  const caption = String(form.get("caption") || "").trim().slice(0, 2200);
  if (!caption) throw new Error("caption_required");

  const images = form.getAll("images").filter(file => file && typeof file.arrayBuffer === "function");
  if (images.length < 2 || images.length > 10) throw new Error("images_count");
  for (const file of images) {
    if (!IMAGE_TYPES.has(String(file.type || "").toLowerCase())) throw new Error("image_type");
    if (!file.size || file.size > IMAGE_MAX_BYTES) throw new Error("image_size");
  }

  const id = "manual-carousel-" + crypto.randomUUID();
  const base = "posts/" + clientId + "/" + id + "/";
  const meta = { clientId, postId: id, kind: "manual-carousel" };
  const urls = [];
  for (let index = 0; index < images.length; index++) {
    const key = base + "cartao-" + (index + 1) + ".jpg";
    await env.MEDIA.put(key, await toInstagramJpeg(env, images[index]), {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { ...meta, card: String(index + 1) }
    });
    urls.push(origin + "/media/" + key);
  }

  const hook = caption.split("\n").map(line => line.trim()).find(Boolean) || "Carrossel";
  const payload = {
    clientName: client.name || client.id,
    instagram: client.instagram || "",
    imageUrl: urls[0],
    title: hook.slice(0, 160),
    creativeFeatures: { requestedFormat: "carousel", hook: hook.slice(0, 160) },
    formatBuild: { status: "approved", kind: "carousel", carouselUrls: urls, cardCount: urls.length, source: "manual", builtAt: new Date().toISOString() },
    qualityGates: { copyChief: "approved", designer: "approved", formatBuilder: "approved" },
    // Arte feita e conferida pelo Rodrigo (passa no fiscal visual sem gastar revisão).
    visualReview: { version: VISUAL_REVIEW_POLICY.version, media: urls[0], status: "approved", qualityScore: 100, reviewer: "rodrigo", reason: "Carrossel feito e conferido pelo Rodrigo" },
    intelligence: { format: "carousel", plannedFormat: "carousel", mediaSource: "manual" },
    dateChoice: "client",
    source: "master:manual-carousel",
    manual: true,
    retryCount: 0,
    brandProfileVersion: brandProfileVersion(clientId),
    createdBy: "master"
  };
  await env.DB.prepare(
    "INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,NULL,'','ready','pending','',?3,'','',0,?4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
  ).bind(id, clientId, caption, JSON.stringify(payload)).run();
  return { ok: true, id, clientId, clientName: client.name || clientId, cards: urls.length, carouselUrls: urls };
}

// Painel do cliente: escolher (ou trocar) o dia e a hora de um post ainda não publicado.
export async function schedulePost(env, client, postId, date, time, now = new Date()) {
  const scheduledFor = brasiliaToIso(date, time);
  if (!scheduledFor) throw new Error("schedule_invalid");
  if (new Date(scheduledFor).getTime() < now.getTime() + 10 * 60 * 1000) throw new Error("schedule_too_soon");
  const row = await env.DB.prepare("SELECT id,status FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1").bind(String(postId), String(client.id)).first();
  if (!row) throw new Error("not_found");
  if (!["ready", "scheduled", "failed"].includes(String(row.status))) throw new Error("not_schedulable");
  await env.DB.prepare("UPDATE post_ledger SET scheduled_for=?3,scheduled_hour=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2")
    .bind(String(postId), String(client.id), scheduledFor, String(time)).run();
  return { ok: true, id: String(postId), scheduledFor };
}

export const MANUAL_CAROUSEL_MESSAGES = {
  client_invalid: "Escolha um cliente da lista.",
  caption_required: "Escreva a legenda do carrossel.",
  images_count: "Escolha de 2 a 10 imagens.",
  image_type: "As imagens precisam ser JPG, PNG ou WEBP.",
  image_size: "Cada imagem pode ter no máximo 8 MB.",
  image_convert_unavailable: "Envie as imagens em JPG.",
  image_convert_failed: "Não consegui preparar uma das imagens. Tente em JPG.",
  r2_unavailable: "O armazenamento de mídia está fora do ar.",
  public_base_url_missing: "Falta configurar o endereço público do servidor.",
  schedule_invalid: "Escolha o dia e a hora.",
  schedule_too_soon: "Escolha um horário pelo menos 10 minutos à frente.",
  not_schedulable: "Este post não pode mais mudar de data.",
  schedule_required: "Escolha o dia e a hora antes de aprovar."
};

// Master: POST /api/master/manual-carousel. Quem chama já conferiu o login do Master.
export async function handleManualCarouselMaster(request, env, url) {
  if (url.pathname !== "/api/master/manual-carousel" || request.method !== "POST") return null;
  try {
    const form = await request.formData().catch(() => null);
    if (!form) throw new Error("images_count");
    return send(await createManualCarousel(env, form));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MANUAL_CAROUSEL_MESSAGES[code] || "Não deu para enviar. Tente de novo." }, 400);
  }
}
