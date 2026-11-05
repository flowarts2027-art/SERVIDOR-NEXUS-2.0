import { brandClientId, listClients } from "./clients.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { artShape, keepArt, mediaSize, readImageSize, windowError, mediaFitsFormat } from "./art-format.js";
import { loadFrames, hasFrames, pickFrame, composeFramed, imageHasText, imageZonesBlocked, TEXT_CHECK_VERSION } from "./art-frame.js";
import { cloudflareImage } from "./gemini-campaign.js";
import { buildVisualPrompt } from "./media-generation.js";
import { VISUAL_REVIEW_POLICY } from "./visual-review.js";
import { takeLibraryArt } from "./art-library.js";
import { nextCampaignArt } from "./client-campaign.js";
import { nextCaption } from "./master-upload.js";
import { sendAndRecord } from "./whatsapp-agent.js";
import { isClientPaused } from "./client-pause.js";

// Vigia "cliente nunca fica sem post" (Rodrigo, 05/11/2026). Regra em docs/nexus-memory/REGRA_CLIENTE_NUNCA_SEM_POST.md.
// Confere as próximas 6 horas. Post com erro é consertado na mesma linha, então fica no mesmo horário.
// Um post por rodada: gerar imagem gasta os pedidos da execução.
const WATCH_AHEAD_MS = 6 * 3600000;
const WATCH_BEHIND_MS = 30 * 60000; // o erro pode ter aparecido em cima da hora
const MAX_TRIES = 2;
// Daniela: pedido do Rodrigo. Quatree: toda peça mostra a embalagem oficial, e a IA não sabe desenhar produto real.
const NO_GENERATION_CLIENTS = Object.freeze(new Set(["daniela-martins", "quatree-dog", "quatree-dog-eduardo"]));
const ERROR_RE = /^media_generation_required$|^format_build_failed$|retry_limit_reached$|^format_mismatch$/;
const SAFE_ZONES = " Composition: keep the top third and the bottom third of the frame free of people and animals, with calm background only. "
  + "Main subject in the center. Do not show any branded product, packaging or label. Do not write any text, letters or logos.";

function parse(text) {
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export function isWatcherMinute(at = new Date()) {
  return new Date(at).getUTCMinutes() % 5 === 4;
}

function formatOf(payload) {
  return String(payload?.creativeFeatures?.requestedFormat || "post").toLowerCase();
}

// Motivo para substituir, ou "". Vídeo não tem imagem própria, então "sem imagem" não vale para ele.
export function replacementReason(row = {}, payload = {}) {
  const error = String(row.error || "");
  if (ERROR_RE.test(error)) return error;
  const media = payload.imageUrl || payload.publicImageUrl || payload.formatBuild?.imageUrl || payload.formatBuild?.videoUrl;
  return media ? "" : "imagem_ausente";
}

// Story continua story. Carrossel e Reels que não montaram viram post de uma imagem.
export function targetFormat(payload) {
  return formatOf(payload) === "story" ? "story" : "post";
}

async function remount(env, client, payload, target) {
  const url = String(payload.imageUrl || payload.publicImageUrl || "");
  if (!url) return null;
  // Rascunho de agente é imagem de IA: para quem não recebe imagem gerada, não vale como original.
  if (NO_GENERATION_CLIENTS.has(client.id) && String(payload.source || "").startsWith("agent-core")) return null;
  const size = await mediaSize(env, url);
  if (!size || windowError(target === "story" ? "story" : "feed", size)) return null;
  return { url, source: "imagem-original" };
}

async function generate(env, client, row, target, deps) {
  if (NO_GENERATION_CLIENTS.has(client.id)) return null;
  const frames = await deps.loadFrames(env).catch(() => null);
  const frameClientId = brandClientId(client);
  if (!frames || !hasFrames(frames, frameClientId)) return null;
  const story = target === "story";
  const prompt = buildVisualPrompt(client, "", row.id, { contentFormat: story ? "story" : "image", cleanImage: true }) + SAFE_ZONES;
  const image = await deps.image(env, prompt, story ? "9:16" : "4:5");
  const size = readImageSize(image.bytes);
  if (artShape(size?.width, size?.height) !== (story ? "story" : "portrait")) throw new Error("generated_wrong_size");
  // A IA não escreve, e o texto do Nexus não pode passar por cima de pessoa ou animal.
  if (await deps.hasText(env, image.bytes)) throw new Error("generated_has_text");
  if (await deps.zonesBlocked(env, image.bytes)) throw new Error("generated_subject_in_text_zone");
  const seed = Number(String(row.id).replace(/\D/g, "").slice(0, 6)) || 0;
  const out = await deps.compose(env, image.bytes, pickFrame(frames, frameClientId, story, seed), { story });
  const key = "posts/" + client.id + "/" + row.id + "/substituta-" + crypto.randomUUID() + ".jpg";
  await env.MEDIA.put(key, out, {
    httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: client.id, postId: String(row.id), kind: "auto-replacement" }
  });
  return { url: String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") + "/media/" + key, source: "cloudflare-workers-ai" };
}

async function approvedArt(env, client, row, target, deps) {
  const library = await deps.library(env, client, row.id, target === "story").catch(() => null);
  if (library) return { url: library, source: "biblioteca-do-cliente" };
  const art = await deps.campaignArt(env, client, row.id).catch(() => null);
  if (!art?.url) return null;
  const size = await mediaSize(env, art.url);
  return size && !windowError(target === "story" ? "story" : "feed", size) ? { url: art.url, source: "arte-do-cliente" } : null;
}

async function notifyClient(env, client, row, payload, send) {
  // Pronto e desligado até a Meta liberar. Aviso único: quem não aprovar, publica do mesmo jeito.
  if (String(env.NEXUS_AUTO_REPLACE_WHATSAPP || "").toLowerCase() !== "true" || payload.autoReplaced?.noticeAt) return false;
  const to = String(client.config?.contact?.whatsapp || client.config?.agentProfile?.whatsapp || "").replace(/\D/g, "");
  if (!to) return false;
  await send(env, String(env.WHATSAPP_CLIENT_ID || "primeiro-teste"), to, "Nexus: uma postagem sua teve problema e foi substituída automaticamente. Confira no painel.");
  return true;
}

async function saveReplacement(env, client, row, payload, found, target, reason, now, deps) {
  const story = target === "story";
  const caption = story ? "" : String(row.caption || "").trim() || await deps.caption(env, client, "post");
  const next = {
    ...payload,
    imageUrl: found.url,
    publicImageUrl: found.url,
    creativeFeatures: { ...(payload.creativeFeatures || {}), requestedFormat: target },
    formatBuild: { status: "approved", kind: target, imageUrl: found.url, artChecked: true, artCheckVersion: TEXT_CHECK_VERSION, builtAt: now.toISOString() },
    qualityGates: { ...(payload.qualityGates || {}), copyChief: "approved", designer: "approved", formatBuilder: "approved" },
    visualReview: { version: VISUAL_REVIEW_POLICY.version, media: found.url, status: "approved", qualityScore: 100, reviewer: "nexus", reason: "Substituída automaticamente" },
    manual: true,
    retryCount: 0,
    autoReplaced: { at: now.toISOString(), reason, source: found.source }
  };
  delete next.autoReplaceFailed;
  if (await notifyClient(env, client, row, next, deps.send).catch(() => false)) next.autoReplaced.noticeAt = now.toISOString();
  const saved = await env.DB.prepare(
    `UPDATE post_ledger SET status='scheduled',approval_status='approved',error='',caption=?2,payload_json=?3,updated_at=CURRENT_TIMESTAMP
     WHERE id=?1 AND status IN ('ready','scheduled','failed')`
  ).bind(row.id, caption, JSON.stringify(next)).run();
  return Number(saved?.meta?.changes || 0) > 0;
}

async function saveFailure(env, row, payload, reason, tries, now) {
  const next = { ...payload, autoReplaceTries: tries, autoReplaceFailed: { at: now.toISOString(), reason: String(reason).slice(0, 160) } };
  await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id, JSON.stringify(next)).run();
}

export async function replacePost(env, client, row, payload, reason, now, deps) {
  const target = targetFormat(payload);
  let found = await remount(env, client, payload, target), failure = "";
  if (!found) {
    try { found = await generate(env, client, row, target, deps); }
    catch (error) { failure = String(error?.message || error); }
  }
  if (!found) found = await approvedArt(env, client, row, target, deps);
  if (found && await saveReplacement(env, client, row, payload, found, target, reason, now, deps)) return { id: row.id, replaced: true, source: found.source };
  const tries = Number(payload.autoReplaceTries || 0) + 1;
  await saveFailure(env, row, payload, failure || "sem_arte_disponivel", tries, now);
  return { id: row.id, replaced: false, reason: failure || "sem_arte_disponivel" };
}

const DEFAULT_DEPS = {
  loadFrames, image: cloudflareImage, hasText: imageHasText, zonesBlocked: imageZonesBlocked, compose: composeFramed,
  library: takeLibraryArt, campaignArt: nextCampaignArt, caption: nextCaption, send: sendAndRecord
};

export async function runPostWatcher(env, now = new Date(), overrides = {}) {
  const deps = { ...DEFAULT_DEPS, ...overrides };
  const clients = (await listClients(env)).filter(client => client.status === "online" && !BLOCKED_PUBLISH_CLIENTS.has(client.id) && !isClientPaused(env, client.id));
  if (!clients.length) return { checked: 0 };
  const marks = clients.map((_, index) => "?" + (index + 3)).join(",");
  const rows = await env.DB.prepare(
    `SELECT id,client_id,scheduled_for,status,approval_status,error,caption,payload_json FROM post_ledger
     WHERE client_id IN (${marks}) AND status IN ('ready','scheduled','failed')
       AND scheduled_for>?1 AND scheduled_for<=?2
       AND COALESCE(approval_status,'') NOT IN ('rejected','correction_requested')
     ORDER BY scheduled_for ASC LIMIT 30`
  ).bind(new Date(now.getTime() - WATCH_BEHIND_MS).toISOString(), new Date(now.getTime() + WATCH_AHEAD_MS).toISOString(), ...clients.map(client => client.id)).all();

  for (const row of rows?.results || []) {
    const payload = parse(row.payload_json);
    if (Number(payload.autoReplaceTries || 0) >= MAX_TRIES) continue;
    let reason = replacementReason(row, payload);
    if (!reason && !await mediaFitsFormat(env, payload, formatOf(payload))) reason = "format_mismatch";
    if (!reason) continue;
    return replacePost(env, clients.find(client => client.id === row.client_id), row, payload, reason, now, deps);
  }
  return { checked: rows?.results?.length || 0 };
}
