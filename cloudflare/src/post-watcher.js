import { brandClientId, clientGroup, listClients } from "./clients.js";
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
import { effectiveBrand } from "./client-identity.js";
import { writeArtTitle } from "./art-title.js";

// Vigia "cliente nunca fica sem post" (Rodrigo, 05/11/2026). Regra em docs/nexus-memory/REGRA_CLIENTE_NUNCA_SEM_POST.md.
// Confere as próximas 6 horas. Post com erro é consertado na mesma linha, então fica no mesmo horário.
// Um post por rodada: gerar imagem gasta os pedidos da execução.
const WATCH_AHEAD_MS = 6 * 3600000;
const WATCH_BEHIND_MS = 30 * 60000; // o erro pode ter aparecido em cima da hora
const MAX_TRIES = 2;
export const COMPOSE_WAIT_MS = 20 * 60000;
// Daniela: pedido do Rodrigo. Quatree e Adimax: toda peça mostra a ração ou a embalagem, e a IA não sabe desenhar produto real.
const NO_GENERATION_CLIENTS = Object.freeze(new Set(["daniela-martins", "quatree-dog", "quatree-dog-eduardo"]));
// O painel da Adimax nasce pelo Master, e o id vem do nome escolhido. Por isso vale qualquer id com a palavra adimax.
const NO_GENERATION_RE = /(^|-)adimax(-|$)/;
// Botão "Criar com agente": além da lista acima, vale para todo o grupo. GILTEC e Quatree não usam imagem gerada.
const NO_AGENT_GROUPS = Object.freeze(new Set(["giltec", "quatree-dog"]));
const ERROR_RE = /^media_generation_required$|^format_build_failed$|retry_limit_reached$|^format_mismatch$/;
const SAFE_ZONES = " Composition: keep the top third and the bottom third of the frame free of people and animals, with calm background only. "
  + "Main subject in the center. Do not show any branded product, packaging or label. Do not write any text, letters or logos.";

export function receivesGeneratedImage(clientId) {
  const id = String(clientId || "");
  return !NO_GENERATION_CLIENTS.has(id) && !NO_GENERATION_RE.test(id);
}

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
  if (!receivesGeneratedImage(client.id) && String(payload.source || "").startsWith("agent-core")) return null;
  const size = await mediaSize(env, url);
  if (!size || windowError(target === "story" ? "story" : "feed", size)) return null;
  return { url, source: "imagem-original" };
}

async function generate(env, client, row, target, deps) {
  if (!receivesGeneratedImage(client.id)) return null;
  const frames = await deps.loadFrames(env).catch(() => null);
  const frameClientId = brandClientId(client);
  const brand = await deps.brand(env, client);
  // Cliente com marca salva no Master não depende da lista do deploy: título na hora e arte montada no GitHub.
  const dynamic = Boolean(brand?.buttonWord);
  if (!dynamic && (!frames || !hasFrames(frames, frameClientId))) return null;
  const story = target === "story";
  const prompt = buildVisualPrompt(client, "", row.id, { contentFormat: story ? "story" : "image", cleanImage: true }) + SAFE_ZONES;
  const image = await deps.image(env, prompt, story ? "9:16" : "4:5");
  const size = readImageSize(image.bytes);
  if (artShape(size?.width, size?.height) !== (story ? "story" : "portrait")) throw new Error("generated_wrong_size");
  // A IA não escreve, e o texto do Nexus não pode passar por cima de pessoa ou animal.
  if (await deps.hasText(env, image.bytes)) throw new Error("generated_has_text");
  if (await deps.zonesBlocked(env, image.bytes)) throw new Error("generated_subject_in_text_zone");
  if (dynamic) return requestCompose(env, client, row, image.bytes, brand, story, deps);
  const seed = Number(String(row.id).replace(/\D/g, "").slice(0, 6)) || 0;
  const out = await deps.compose(env, image.bytes, pickFrame(frames, frameClientId, story, seed), { story, logoKey: brand?.logoKey || "" });
  const key = "posts/" + client.id + "/" + row.id + "/substituta-" + crypto.randomUUID() + ".jpg";
  await env.MEDIA.put(key, out, {
    httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: client.id, postId: String(row.id), kind: "auto-replacement" }
  });
  return { url: String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") + "/media/" + key, source: "cloudflare-workers-ai" };
}

// Guarda a foto e pede a montagem. A arte volta por finishComposedArt, e o post fica esperando até lá.
async function requestCompose(env, client, row, bytes, brand, story, deps) {
  const token = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!token) throw new Error("github_token_missing");
  const origin = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const key = "posts/" + client.id + "/" + row.id + "/foto-" + crypto.randomUUID() + ".jpg";
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/jpeg" }, customMetadata: { clientId: client.id, postId: String(row.id), kind: "auto-replacement-photo" } });
  const callbackToken = crypto.randomUUID();
  const repo = String(env.GITHUB_INGEST_REPOSITORY || "flowarts2027-art/SERVIDOR-NEXUS-2.0").trim();
  const response = await deps.fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: { authorization: "Bearer " + token, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "nexus-worker" },
    body: JSON.stringify({ event_type: "art-compose", client_payload: {
      post_id: String(row.id), story, photo: origin + "/media/" + key, logo: brand.logoUrl || "",
      title: await deps.title(env, client), button: (story ? "RESPONDA " : "COMENTE ") + brand.buttonWord,
      accent: brand.colors.accent, onAccent: brand.colors.onAccent,
      callback_url: origin + "/api/internal/art-compose/" + encodeURIComponent(row.id), callback_token: callbackToken
    } })
  });
  if (!response.ok) throw new Error("github_dispatch_" + response.status);
  return { pending: true, token: callbackToken };
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
  const agent = Boolean(payload.createdByAgent);
  const caption = story ? "" : String(row.caption || "").trim() || await deps.caption(env, client, "post");
  const next = {
    ...payload,
    imageUrl: found.url,
    publicImageUrl: found.url,
    creativeFeatures: { ...(payload.creativeFeatures || {}), requestedFormat: target },
    formatBuild: { status: "approved", kind: target, imageUrl: found.url, artChecked: true, artCheckVersion: TEXT_CHECK_VERSION, builtAt: now.toISOString() },
    qualityGates: { ...(payload.qualityGates || {}), copyChief: "approved", designer: "approved", formatBuilder: "approved" },
    visualReview: { version: VISUAL_REVIEW_POLICY.version, media: found.url, status: "approved", qualityScore: 100, reviewer: "nexus", reason: agent ? "Criada pelo agente" : "Substituída automaticamente" },
    manual: true,
    retryCount: 0,
    ...(agent ? { createdByAgent: { ...payload.createdByAgent, source: found.source } } : { autoReplaced: { at: now.toISOString(), reason, source: found.source } })
  };
  delete next.autoReplaceFailed;
  delete next.autoReplacePending;
  if (!agent && await notifyClient(env, client, row, next, deps.send).catch(() => false)) next.autoReplaced.noticeAt = now.toISOString();
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
  if (found?.pending) {
    const next = { ...payload, autoReplacePending: { token: found.token, at: now.toISOString(), reason, target } };
    await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id, JSON.stringify(next)).run();
    return { id: row.id, replaced: false, pending: true };
  }
  if (found && await saveReplacement(env, client, row, payload, found, target, reason, now, deps)) return { id: row.id, replaced: true, source: found.source };
  const tries = Number(payload.autoReplaceTries || 0) + 1;
  await saveFailure(env, row, payload, failure || "sem_arte_disponivel", tries, now);
  return { id: row.id, replaced: false, reason: failure || "sem_arte_disponivel" };
}

export const WATCHER_DEPS = {
  loadFrames, image: cloudflareImage, hasText: imageHasText, zonesBlocked: imageZonesBlocked, compose: composeFramed,
  library: takeLibraryArt, campaignArt: nextCampaignArt, caption: nextCaption, send: sendAndRecord,
  brand: effectiveBrand, title: writeArtTitle, fetch: (...args) => fetch(...args)
};

// Quem pode ter arte criada pelo agente: usa imagem gerada e tem onde escrever título, logo e botão.
export async function canCreateArt(env, client, deps = WATCHER_DEPS) {
  if (!receivesGeneratedImage(client.id) || NO_AGENT_GROUPS.has(clientGroup(client)?.id)) return false;
  const brand = await deps.brand(env, client).catch(() => null);
  if (brand?.buttonWord) return true;
  const frames = await deps.loadFrames(env).catch(() => null);
  return Boolean(frames && hasFrames(frames, brandClientId(client)));
}

// A arte montada no GitHub volta aqui. Só vale com a senha de uso único daquele pedido.
export async function finishComposedArt(env, postId, token, bytes, now = new Date(), overrides = {}) {
  const deps = { ...WATCHER_DEPS, ...overrides };
  const row = await env.DB.prepare("SELECT id,client_id,status,caption,payload_json FROM post_ledger WHERE id=?1 LIMIT 1").bind(String(postId)).first();
  const payload = parse(row?.payload_json);
  const pending = payload.autoReplacePending;
  if (!row || !pending?.token || pending.token !== String(token || "")) return { ok: false, status: 403 };
  const size = readImageSize(bytes);
  if (windowError(pending.target === "story" ? "story" : "feed", size)) return { ok: false, status: 400 };
  const client = (await listClients(env)).find(item => item.id === row.client_id);
  if (!client) return { ok: false, status: 404 };
  const key = "posts/" + client.id + "/" + row.id + "/substituta-" + crypto.randomUUID() + ".jpg";
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: client.id, postId: String(row.id), kind: "auto-replacement" }
  });
  const url = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") + "/media/" + key;
  const saved = await saveReplacement(env, client, row, payload, { url, source: "cloudflare-workers-ai" }, pending.target, pending.reason, now, deps);
  return { ok: saved, status: saved ? 200 : 409 };
}

export async function runPostWatcher(env, now = new Date(), overrides = {}) {
  const deps = { ...WATCHER_DEPS, ...overrides };
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
    // Montagem pedida há pouco: espera voltar. Se passar do prazo, tenta de novo.
    if (now.getTime() - Date.parse(String(payload.autoReplacePending?.at || "")) < COMPOSE_WAIT_MS) continue;
    let reason = replacementReason(row, payload);
    if (!reason && !await mediaFitsFormat(env, payload, formatOf(payload))) reason = "format_mismatch";
    if (!reason) continue;
    return replacePost(env, clients.find(client => client.id === row.client_id), row, payload, reason, now, deps);
  }
  return { checked: rows?.results?.length || 0 };
}
