import { handleCaptadorPortal } from "./captador.js";
import { schedulePost, MANUAL_CAROUSEL_MESSAGES } from "./manual-carousel.js";
import { createClientUpload, CLIENT_UPLOAD_MESSAGES } from "./client-uploads.js";
import { handleBusinessProfilePortal } from "./business-profile.js";
import { handleClientCampaignPortal } from "./client-campaign.js";
import { resolveInstagramCredentials } from "./instagram-credentials.js";
import {
  authenticatePortalUser,
  createPortalSession,
  resolvePortalSession,
  deletePortalSession,
  portalSessionCookie,
  clearPortalSessionCookie,
  loginRateLimitStatus,
  recordLoginFailure,
  clearLoginFailures
} from "./auth.js";
import { getClient, portalClientView } from "./clients.js";
import { tokenUsageToday, openAIResponses } from "./openai.js";
import { startInstagramOAuth, handleInstagramOAuthCallback } from "./instagram.js";
import { AGENT_CORE_MODULES, normalizeAgentCoreConfig, agentCoreState, agentExecutions, saveAgentCoreConfig } from "./agent-core.js";
import { leadsForClient, leadHunterSummary } from "./leads.js";
import { leadHunterView, saveLeadHunterConfig, runLeadHunter, discardLead } from "./lead-hunter.js";
import { decidePost, requestPostRevision, cancelPost, saveOwnPostContent, publishPostNow, useLibraryImageForPost } from "./posts.js";
import { addDirective, createCampaign, masterWorkspace } from "./master-workspace.js";
import { startGitHubVideoRender, startYouTubeVideoIngest, recoverLocalIngestViaServer, retryFailedYoutubeIngestWithLocalHelper, localHelperStaleReason, ingestTimeoutDetail } from "./github-video-render.js";
import { confirmedVideoSource, isMp4Header, videoErrorMessages, videoRenderQueueExpired } from "./video-source.js";
import { youtubeUrl, searchCatalog, catalogMetadata, catalogPreviewUrl, dispatchVideoSearch, catalogIdentityConfidence, catalogUploadTitle, catalogSearchAliases, distinctRelatedTitles } from "./video-catalog.js";
import { readVerifiedPoster, rememberVerifiedPoster } from "./video-poster-library.js";
import { enqueue } from "./scheduler.js";
import { processDueJobs } from "./executor.js";
import { indexCatalogResults, verifyPosterLocation } from "./video-demand-catalog.js";
import { officialMovieFromTrailer, verifyOfficialMoviePoster } from "./official-movie-poster.js";
import { enrichVerifiedFilmPresentation } from "./video-metadata-enrichment.js";
import { clientInsights } from "./insights.js";
import { commentAutoReplyStatus } from "./comment-autoreply.js";
import { instagramSnapshot } from "./agent-runtime.js";
import { whatsappLink, clientBrand, brandProfileVersion, DEMO_CLIENT_ID } from "./client-brand.js";
import { campaignCalendar } from "./flowarts-campaign.js";
import { handleLandingLead } from "./landing.js";
import { reviewCopy } from "./brand-guard.js";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      location,
      "cache-control": "no-store",
      ...headers
    }
  });
}

async function sessionClient(request, env) {
  const session = await resolvePortalSession(env, request);
  if (!session?.clientId) return { session: null, client: null };
  const client = await getClient(env, session.clientId);
  return { session, client };
}

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function catalogTitleCandidateFromYoutube(value) {
  return String(value || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*(?:dublad|legendad|trailer|teaser|oficial)[^)]*\)/gi, " ")
    .replace(/\b(?:trailer|teaser|oficial|dublado|dublada|legendado|legendada|portugu[eê]s|brasil|pt[- ]?br|4k|hd|full hd)\b/gi, " ")
    .replace(/\s*[|•·–—-]\s*(?:warner|universal|disney|netflix|prime video|hbo|max|paramount|sony|20th century).*$/i, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:|•·–—-]+|[\s:|•·–—-]+$/g, "")
    .trim()
    .slice(0, 180);
}

function normalizeVideoComposition(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const trimStart = Math.max(0, Number(source.trimStart || 0) || 0);
  const trimEnd = Math.max(0, Number(source.trimEnd || 0) || 0);
  return {
    trimStart,
    trimEnd: trimEnd > trimStart ? trimEnd : 0,
    customText: String(source.customText || "").trim().slice(0, 280),
    textColor: /^#[0-9a-f]{6}$/i.test(String(source.textColor || "")) ? String(source.textColor) : "#ffffff",
    textWeight: ["normal","bold","heavy"].includes(source.textWeight) ? source.textWeight : "bold",
    textFont: ["sans","serif","cinema","mono","hand","rounded"].includes(source.textFont) ? source.textFont : "sans",
    textItalic: source.textItalic === true,
    textUnderline: source.textUnderline === true,
    textPosition: ["top","center","bottom"].includes(source.textPosition) ? source.textPosition : "bottom",
    textOffset: Math.max(-35, Math.min(35, Number(source.textOffset || 0) || 0)),
    cta: String(source.cta || "").trim().slice(0, 120),
    framePreset: ["nexus","minimal","cinema"].includes(String(source.framePreset || "")) ? String(source.framePreset) : "nexus",
    logoPosition: ["top-left","top-center","top-right","center-left","center","center-right","bottom-left","bottom-center","bottom-right"].includes(String(source.logoPosition || "")) ? String(source.logoPosition) : "top-left",
    logoScale: Math.max(60, Math.min(180, Number(source.logoScale || 100) || 100)),
    logoOffsetX: Math.max(-40, Math.min(40, Number(source.logoOffsetX || 0) || 0)),
    logoOffsetY: Math.max(-40, Math.min(40, Number(source.logoOffsetY || 0) || 0)),
    logoEffect: ["none","blink","slide","spin","fade","float","pulse","bounce","zoom","glow"].includes(String(source.logoEffect || "")) ? String(source.logoEffect) : "none",
    showPoster: true,
    showOverview: source.showOverview !== false,
    showCast: source.showCast !== false,
    overlays: Array.isArray(source.overlays) ? source.overlays.slice(0, 16).flatMap((layer) => {
      if (!layer || !["text", "emoji"].includes(layer.type)) return [];
      const clamp = (val, lo, hi, fallback) => { const n = Number(val); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback; };
      const start = clamp(layer.start, 0, 86400, 0);
      const end = clamp(layer.end, start, 86400, start);
      const text = String(layer.text || "").slice(0, layer.type === "emoji" ? 24 : 280);
      if (!text.trim() || end <= start) return [];
      return [{
        id: String(layer.id || "").slice(0, 96), type: layer.type, text,
        x: clamp(layer.x, 0, 100, 50), y: clamp(layer.y, 0, 100, 50),
        scale: clamp(layer.scale, 0.2, 3, 1), rotation: clamp(layer.rotation, -180, 180, 0),
        opacity: clamp(layer.opacity, 0, 1, 1), fontSize: clamp(layer.fontSize, 8, 90, 26),
        color: /^#[0-9a-f]{6}$/i.test(String(layer.color || "")) ? layer.color : "#ffffff",
        bold: layer.bold === true, italic: layer.italic === true, underline: layer.underline === true,
        effect: ["none","blink","fade","pulse","bounce","slide","spin","float","zoom","glow"].includes(layer.effect) ? layer.effect : "none",
        start, end
      }];
    }) : []
  };
}

function normalizeBrazilWhatsapp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  return /^\d{10,11}$/.test(digits) ? digits : "";
}

function normalizeCatalogText(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uploadCatalogQuery(filename) {
  return String(filename || "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[_.+\-]+/g, " ")
    .replace(/\b(?:trailer|teaser|official|oficial|dublado|dubbed|legendado|legendada|portugu[eê]s|pt\s*br|full\s*hd|uhd|4k|2160p|1080p|720p|480p|webrip|web\s*dl|bluray|x264|x265|h264|h265|aac|mp4|mkv|mov|download)\b/gi, " ")
    .replace(/\bs\d{1,2}(?:e\d{1,2})?\b/gi, " ")
    .replace(/\b(?:temporada|season|epis[oó]dio|episode)\s*\d+\b/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

function catalogCandidateScore(query, title) {
  const q = normalizeCatalogText(query);
  const t = normalizeCatalogText(title);
  if (!q || !t) return 0;
  if (q === t) return 1000;
  let score = 0;
  if (t.includes(q) || q.includes(t)) score += 320;
  const qTokens = new Set(q.split(" ").filter(Boolean));
  const tTokens = new Set(t.split(" ").filter(Boolean));
  let common = 0;
  qTokens.forEach(token => { if (tTokens.has(token)) common++; });
  score += Math.round((common / Math.max(1, qTokens.size)) * 240);
  if (qTokens.size && common === qTokens.size) score += 120;
  return score;
}

async function inferCatalogMetadataFromUpload(filename, preferredType = "") {
  const query = uploadCatalogQuery(filename);
  if (!query || /^(?:video|videoplayback|clip|arquivo|download|movie|filme|serie)$/i.test(query)) return null;
  const first = preferredType === "series" ? "series" : preferredType === "movie" ? "movie" : "";
  const types = first ? [first, first === "series" ? "movie" : "series"] : ["series", "movie"];
  const batches = await Promise.allSettled(types.map(type => searchCatalog(query, type)));
  const candidates = [];
  batches.forEach((batch, index) => {
    if (batch.status !== "fulfilled") return;
    for (const item of batch.value || []) {
      candidates.push({ type: types[index], item, score: catalogCandidateScore(query, item.title) });
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 120) return null;
  return catalogMetadata(best.item.title, best.type, best.item.id);
}


function likelyEnglishCatalogText(value) {
  const words = normalizeCatalogText(value).split(" ").filter(Boolean);
  if (words.length < 5) return false;
  const english = new Set(["the","and","of","to","in","a","is","that","for","with","his","her","from","as","on","an","by","who","when","while","after","before","into","their","this","has","have"]);
  let hits = 0;
  for (const word of words) if (english.has(word)) hits++;
  return hits >= 4;
}

function localizeGenreText(value) {
  const map = {
    action: "Ação", adventure: "Aventura", animation: "Animação", comedy: "Comédia",
    crime: "Crime", documentary: "Documentário", drama: "Drama", family: "Família",
    fantasy: "Fantasia", history: "História", horror: "Terror", music: "Música",
    mystery: "Mistério", romance: "Romance", "science fiction": "Ficção científica",
    "sci-fi": "Ficção científica", thriller: "Suspense", war: "Guerra", western: "Faroeste"
  };
  return String(value || "").split(/\s*[•,/]\s*/).filter(Boolean)
    .map(item => map[normalizeCatalogText(item)] || item).join(" • ");
}

function openAIResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

async function localizeVideoMetadata(env, clientId, metadata) {
  const localized = { ...(metadata || {}) };
  localized.genres = localizeGenreText(localized.genres);
  const overview = String(localized.overview || "").trim();
  if (!overview || !likelyEnglishCatalogText(overview)) return localized;
  try {
    const response = await openAIResponses(env, clientId, {
      nexusPurpose: "video-metadata-localization",
      model: "gpt-5.6-luna",
      max_output_tokens: 320,
      input: "Traduza para português do Brasil a sinopse abaixo. Preserve nomes próprios, não invente fatos, escreva em linguagem natural e devolva somente a tradução, sem aspas ou comentários.\n\n" + overview
    });
    const translated = openAIResponseText(response).replace(/^["“]|["”]$/g, "").trim();
    if (translated && translated.length >= 30 && !likelyEnglishCatalogText(translated)) {
      localized.overview = translated.slice(0, 1800);
      return localized;
    }
  } catch {}
  const genre = localized.genres ? " de " + localized.genres.toLowerCase() : "";
  localized.overview = (String(localized.title || "Este título") + " apresenta uma história" + genre + ". Confira o trailer e conheça os principais momentos desta produção.").slice(0, 1800);
  return localized;
}

async function connectionSummary(env, clientId) {
  const connection = await resolveInstagramCredentials(env, clientId);
  const out = {};

  if (connection?.connected) {
    out.instagram = {
      connected: true,
      direct: true,
      source: connection.source || "nexus",
      label: connection.label || connection.username || "Instagram conectado",
      username: connection.username || "",
      accountType: connection.accountType || "",
      scopes: Array.isArray(connection.scopes) ? connection.scopes : [],
      expiresAt: connection.expiresAt || null,
      expired: Boolean(connection.expired),
      connectedAt: connection.connectedAt || null
    };
  } else {
    out.instagram = {
      connected: false,
      direct: true,
      source: connection?.source || "none",
      label: "Instagram",
      username: "",
      accountType: "",
      scopes: [],
      expiresAt: connection?.expiresAt || null,
      expired: Boolean(connection?.expired),
      connectedAt: connection?.connectedAt || null
    };
  }

  out.ai = {
    connected: true,
    direct: false,
    source: "managed",
    label: clientId === String(env.RAGNAR_CLIENT_ID || "ragnar-one")
      ? "IA exclusiva do cliente"
      : "IA gerenciada pelo NEXUS",
    connectedAt: null
  };

  return out;
}

async function listSupport(env, clientId) {
  const result = await env.DB.prepare(
    `SELECT id, client_id, status, subject, payload_json, created_at, updated_at
     FROM support_tickets WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 100`
  ).bind(String(clientId)).all();
  return (result?.results || []).map(row => {
    const payload = parseJson(row.payload_json, {});
    return {
      id: row.id,
      clientId: row.client_id,
      category: payload.category || "",
      subject: row.subject || "",
      message: payload.message || "",
      status: row.status || "open",
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || row.created_at || null
    };
  });
}

async function listClientMedia(env, clientId, origin = "") {
  if (!env.MEDIA) return [];
  const prefix = "library/" + String(clientId) + "/";
  const result = await env.MEDIA.list({
    prefix,
    limit: 100,
    include: ["httpMetadata", "customMetadata"]
  });
  const base = String(origin || "").replace(/\/+$/, "");
  return (result?.objects || []).map(object => ({
    key: object.key,
    name: object.customMetadata?.originalName || object.key.split("/").pop() || "arquivo",
    purpose: object.customMetadata?.purpose || "reference",
    note: object.customMetadata?.note || "",
    contentType: object.httpMetadata?.contentType || "",
    size: Number(object.size || 0),
    uploadedAt: object.uploaded || null,
    url: base ? base + "/media/" + object.key : "/media/" + object.key
  })).sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));
}


async function listVideoJobs(env, clientId) {
  const result = await env.DB.prepare(
    `SELECT id, client_id, source_object_key, status, settings_json, result_json, created_at, updated_at
     FROM video_jobs WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 100`
  ).bind(String(clientId)).all();
  const jobs = [];
  for (const row of result?.results || []) {
    let settings = parseJson(row.settings_json, {});
    if (settings.searchOnly) continue;
    let resultJson = parseJson(row.result_json, {});
    const staleLocalReason = row.status === "importing" ? localHelperStaleReason(settings, row.updated_at) : "";
    if (staleLocalReason) {
      const recovery = await recoverLocalIngestViaServer(env, clientId, row.id, staleLocalReason).catch(() => null);
      if (recovery && !recovery.ignored) {
        const fresh = await env.DB.prepare("SELECT status,settings_json,result_json,updated_at FROM video_jobs WHERE id=?1 AND client_id=?2").bind(String(row.id), String(clientId)).first();
        if (fresh) {
          row.status = fresh.status;
          row.settings_json = fresh.settings_json;
          row.result_json = fresh.result_json;
          row.updated_at = fresh.updated_at;
          settings = parseJson(row.settings_json, {});
          resultJson = parseJson(row.result_json, {});
        }
      }
    }
    let clips = [];
    try {
      const clipRows = await env.DB.prepare(
        `SELECT id, output_object_key, status, approval_status, publish_status, settings_json, result_json, created_at, updated_at
         FROM video_clips WHERE job_id = ?1 AND client_id = ?2 ORDER BY created_at DESC`
      ).bind(String(row.id), String(clientId)).all();
      clips = (clipRows?.results || []).map(clip => ({
        id: clip.id,
        outputObjectKey: clip.output_object_key || "",
        status: clip.status || "pending",
        approvalStatus: clip.approval_status || "pending",
        publishStatus: clip.publish_status || "draft",
        ...parseJson(clip.settings_json, {}),
        ...parseJson(clip.result_json, {}),
        createdAt: clip.created_at || null,
        updatedAt: clip.updated_at || null
      }));
    } catch (error) { throw error; }
    let sourceReady = false;
    let sourceError = "";
    if (row.source_object_key) {
      try { await confirmedVideoSource(env, clientId, row.source_object_key); sourceReady = true; }
      catch (error) {
        sourceError = String(error?.message || "video_source_invalid");
        if (!videoErrorMessages[sourceError]) throw error;
      }
    }
    const startedAt = settings.ingestStartedAt || row.updated_at;
    const startedMs = new Date(String(startedAt || "").replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(String(startedAt)) ? "" : "Z")).getTime();
    if (row.status === "importing" && Number.isFinite(startedMs) && Date.now() - startedMs > 30 * 60 * 1000) {
      const expiredToken = settings.ingestCallbackToken;
      delete settings.ingestCallbackToken;
      const timeoutResult = { ...resultJson, progress: 0, error: ("youtube_ingest_timeout" + ingestTimeoutDetail(settings)).slice(0, 500), message: videoErrorMessages.youtube_ingest_timeout };
      const update = await env.DB.prepare("UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5")
        .bind(row.id, clientId, JSON.stringify(settings), JSON.stringify(timeoutResult), row.settings_json).run();
      if (update?.meta?.changes) { row.status = "failed"; Object.assign(resultJson, timeoutResult); }
      else if (expiredToken) settings.ingestCallbackToken = expiredToken;
    }
    const renderStartedAt = settings.githubRenderUpdatedAt || row.updated_at;
    const renderStartedMs = new Date(String(renderStartedAt || "").replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(String(renderStartedAt)) ? "" : "Z")).getTime();
    const stuckInGithubQueue = row.status === "cutting" && videoRenderQueueExpired(settings);
    if (row.status === "cutting" && (stuckInGithubQueue || (Number.isFinite(renderStartedMs) && Date.now() - renderStartedMs > 30 * 60 * 1000))) {
      delete settings.githubRenderToken;
      settings.githubRenderState = "failed";
      const queueError = stuckInGithubQueue ? "video_render_queue_timeout" : "video_render_timeout";
      const timeoutResult = { ...resultJson, progress: 0, error: queueError, message: videoErrorMessages[queueError] };
      const update = await env.DB.prepare("UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='cutting'")
        .bind(row.id, clientId, JSON.stringify(settings), JSON.stringify(timeoutResult)).run();
      if (update?.meta?.changes) { row.status = "failed"; Object.assign(resultJson, timeoutResult); }
    }
    const activeRenderStates = new Set(["dispatching", "dispatched", "rendering", "uploading"]);
    const effectiveStatus = row.status === "awaiting_configuration" && activeRenderStates.has(String(settings.githubRenderState || ""))
      ? "cutting"
      : row.status;

    // Existing pre-fix jobs were marked 38% immediately after dispatch.
    // Translate them to truthful "waiting for GitHub" state until a progress
    // callback confirms that the worker actually started.
    const awaitingRunner = effectiveStatus === "cutting"
      && String(settings.githubRenderState || "") === "dispatched"
      && Number(resultJson.progress || 0) <= 38;
    jobs.push({
      id: row.id,
      clientId: row.client_id,
      sourceObjectKey: row.source_object_key || "",
      sourceReady,
      sourceError,
      status: effectiveStatus || "pending",
      renderState: String(settings.githubRenderState || ""),
      filename: settings.filename || settings.displayName || "Vídeo",
      contentTitle: settings.contentTitle || "",
      overview: settings.overview || "",
      releaseYear: settings.releaseYear || "",
      mediaType: settings.mediaType || "",
      posterUrl: settings.posterUrl || "",
      logoEnabled: settings.logoEnabled === true,
      logoObjectKey: settings.logoObjectKey || "",
      editStyle: settings.editStyle || "cinematic-card-v1",
      endText: settings.endText || "",
      endContact: settings.endContact || "",
      renderProfile: settings.renderProfile === "quality" ? "quality" : "fast",
      creationMode: settings.creationMode === "edit" ? "edit" : "auto",
      composition: normalizeVideoComposition(settings.composition || {}),
      selectedYoutubeUrl: settings.selectedYoutubeUrl || "",
      downloadOnly: settings.downloadOnly === true,
      sourceDownloadUrl: sourceReady ? "/api/portal/videos/" + encodeURIComponent(row.id) + "/source" : "",
      renderStartedAt: settings.githubRenderStartedAt || null,
      progress: awaitingRunner ? Math.min(28, Number(resultJson.progress || 0)) : Number(resultJson.progress || 0),
      message: awaitingRunner ? "Aguardando o GitHub iniciar o renderizador. O MP4 original está salvo." : (resultJson.message || ""),
      error: resultJson.error || "",
      clips,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    });
  }
  return jobs;
}

function mediaExtension(contentType, originalName = "") {
  const byType = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };
  if (byType[contentType]) return byType[contentType];
  const match = String(originalName || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match ? match[1] : "bin";
}

async function listPosts(env, clientId) {
  const result = await env.DB.prepare(
    `SELECT id, client_id, scheduled_for, scheduled_hour, status, approval_status,
            media_id, caption, image_object_key, error, cost_usd, payload_json,
            created_at, updated_at
     FROM post_ledger WHERE client_id = ?1 AND COALESCE(status,'') <> 'carousel_test'
     ORDER BY updated_at DESC LIMIT 100`
  ).bind(String(clientId)).all();
  return (result?.results || []).map(row => ({
    ...parseJson(row.payload_json, {}),
    id: row.id,
    clientId: row.client_id,
    scheduledFor: row.scheduled_for || null,
    scheduledHour: row.scheduled_hour || "",
    status: row.status || "scheduled",
    approvalStatus: row.approval_status || "pending",
    mediaId: row.media_id || "",
    caption: row.caption || "",
    imageObjectKey: row.image_object_key || "",
    error: row.error || "",
    costUsd: Number(row.cost_usd || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    // Revisor automático: avisos sobre a legenda (não bloqueia nada).
    reviewWarnings: [
      ...reviewCopy({ id: row.client_id }, row.caption || ""),
      ...(parseJson(row.payload_json, {})?.visualReview?.warning === "text_margin"
        ? [{ label: "Arte", trecho: "confira se o texto da imagem está longe das bordas" }]
        : [])
    ]
  }));
}

// Painel de demonstração público (negócio fictício). Só leitura, só campos seguros.
export function demoPostView(post = {}) {
  const https = value => /^https:\/\//i.test(String(value || "")) ? String(value) : "";
  const build = post.formatBuild && typeof post.formatBuild === "object" ? post.formatBuild : {};
  return {
    id: String(post.id || ""),
    status: String(post.status || ""),
    approvalStatus: String(post.approvalStatus || ""),
    scheduledFor: post.scheduledFor || null,
    publishedAt: post.publishedAt || null,
    updatedAt: post.updatedAt || null,
    caption: String(post.caption || "").slice(0, 2200),
    imageUrl: https(post.imageUrl || post.publicImageUrl),
    formatBuild: {
      kind: String(build.kind || ""),
      imageUrl: https(build.imageUrl),
      carouselUrls: (Array.isArray(build.carouselUrls) ? build.carouselUrls : []).map(https).filter(Boolean).slice(0, 10)
    },
    creativeFeatures: { requestedFormat: String(post.creativeFeatures?.requestedFormat || "") }
  };
}

async function demoPanel(env, ctx, url) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(url.origin + "/api/demo/panel");
  const hit = cache ? await cache.match(key).catch(() => null) : null;
  if (hit) return hit;
  const posts = (await listPosts(env, DEMO_CLIENT_ID).catch(() => []))
    .filter(post => !["expired", "cancelled"].includes(String(post.status)) && String(post.approvalStatus) !== "rejected")
    .slice(0, 40)
    .map(demoPostView);
  const owner = { id: "primeiro-teste", name: "Flow Arts", config: {} };
  const response = json({
    ok: true,
    demo: true,
    client: { displayName: clientBrand({ id: DEMO_CLIENT_ID }).brandName },
    posts,
    whatsapp: whatsappLink(owner, "Olá! Vi a demonstração do painel da Flow Arts e quero isso para o meu negócio.")
  }, 200, { "cache-control": "public, max-age=300" });
  if (cache) ctx?.waitUntil?.(cache.put(key, response.clone()).catch(() => null));
  return response;
}

export async function handlePortalApi(request, env, url, ctx) {
  if (url.pathname === "/api/demo/panel" && request.method === "GET") {
    return demoPanel(env, ctx, url);
  }
  if (url.pathname === "/api/public/lead" && request.method === "POST") {
    return handleLandingLead(request, env);
  }

  if ((url.pathname === "/demo" || url.pathname === "/demo/") && request.method === "GET") {
    return redirect("/portal.html?demo=1");
  }

  const instagramCallback = await handleInstagramOAuthCallback(env, request, url);
  if (instagramCallback) return instagramCallback;

  if (url.pathname === "/portal-login" && request.method === "POST") {
    const rate = await loginRateLimitStatus(env, request, "login");
    if (!rate.allowed) {
      return redirect("/portal.html?error=rate-limit&retry=" + encodeURIComponent(String(rate.retryAfter)), {
        "retry-after": String(rate.retryAfter)
      });
    }

    const form = await request.formData().catch(() => null);
    const username = String(form?.get("username") || "").trim();
    const password = String(form?.get("password") || "");
    const clientId = await authenticatePortalUser(env, username, password);
    if (!clientId) {
      await recordLoginFailure(env, request, "login");
      return redirect("/portal.html?error=1");
    }
    const client = await getClient(env, clientId);
    if (!client) {
      await recordLoginFailure(env, request, "login");
      return redirect("/portal.html?error=1");
    }
    await clearLoginFailures(env, request, "login");
    const session = await createPortalSession(env, clientId, {
      persistent: true,
      remembered: String(form?.get("remember") || "") === "1",
      source: "cloudflare"
    });
    return redirect("/portal.html?auth=1", {
      "set-cookie": portalSessionCookie(session.token)
    });
  }

  if (url.pathname === "/api/portal/login" && request.method === "POST") {
    const rate = await loginRateLimitStatus(env, request, "login");
    if (!rate.allowed) {
      return json(
        { error: "too_many_login_attempts", retryAfter: rate.retryAfter },
        429,
        { "retry-after": String(rate.retryAfter) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const clientId = await authenticatePortalUser(env, body.username, body.password);
    if (!clientId) {
      await recordLoginFailure(env, request, "login");
      return json({ error: "unauthorized" }, 401);
    }
    const client = await getClient(env, clientId);
    if (!client) {
      await recordLoginFailure(env, request, "login");
      return json({ error: "client_not_found" }, 404);
    }
    await clearLoginFailures(env, request, "login");
    const session = await createPortalSession(env, clientId, {
      persistent: true,
      source: "cloudflare"
    });
    return json(
      { token: session.token, client: { ...portalClientView(client), displayName: brandProfileVersion(client.id) ? clientBrand(client).brandName : String(client.name || "") } },
      200,
      { "set-cookie": portalSessionCookie(session.token) }
    );
  }

  if (url.pathname === "/api/portal/diagnostic" && request.method === "GET") {
    let d1Ready = false;
    let clients = 0;
    let portalUsers = 0;
    try {
      const [health, clientCount, userCount] = await Promise.all([
        env.DB.prepare("SELECT 1 AS ok").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM clients").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM portal_users").first()
      ]);
      d1Ready = Number(health?.ok || 0) === 1;
      clients = Number(clientCount?.count || 0);
      portalUsers = Number(userCount?.count || 0);
    } catch {}
    let fallbackClientExists = false;
    const fallbackClientId = String(env.CLIENT_PORTAL_CLIENT_ID || "").trim();
    if (fallbackClientId) {
      try {
        fallbackClientExists = Boolean(
          await env.DB.prepare("SELECT id FROM clients WHERE id = ?1 LIMIT 1").bind(fallbackClientId).first()
        );
      } catch {}
    }
    return json({
      ok: d1Ready,
      runtime: "cloudflare-workers",
      service: "Servidor Nexus",
      clients,
      portalUsers,
      portalClientIdConfigured: Boolean(env.CLIENT_PORTAL_CLIENT_ID),
      portalUsernameConfigured: Boolean(env.CLIENT_PORTAL_USERNAME),
      portalPasswordConfigured: Boolean(env.CLIENT_PORTAL_PASSWORD),
      fallbackPortalCredentialsConfigured: Boolean(
        env.CLIENT_PORTAL_CLIENT_ID && env.CLIENT_PORTAL_USERNAME && env.CLIENT_PORTAL_PASSWORD
      ),
      fallbackClientExists,
      nexusSecretConfigured: Boolean(env.NEXUS_SECRET_KEY)
    }, d1Ready ? 200 : 503);
  }

  if (!url.pathname.startsWith("/api/portal/")) return null;

  if (url.pathname === "/api/portal/logout" && request.method === "POST") {
    await deletePortalSession(env, request).catch(() => {});
    return json({ ok: true }, 200, { "set-cookie": clearPortalSessionCookie() });
  }

  const { session, client } = await sessionClient(request, env);
  if (!session || !client) return json({ error: "unauthorized" }, 401);

  const captadorResponse = await handleCaptadorPortal(request, env, url, client);
  if (captadorResponse) return captadorResponse;
  const businessResponse = await handleBusinessProfilePortal(request, env, url, client);
  if (businessResponse) return businessResponse;
  const campaignResponse = await handleClientCampaignPortal(request, env, url, client);
  if (campaignResponse) return campaignResponse;

  if (url.pathname === "/api/portal/session" && request.method === "GET") {
    return json(
      { ...portalClientView(client), displayName: brandProfileVersion(client.id) ? clientBrand(client).brandName : String(client.name || "") },
      200,
      { "set-cookie": portalSessionCookie(session.token) }
    );
  }

  if (url.pathname === "/api/portal/profile" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 120);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const instagram = String(body.instagram || "").trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/\/$/, "")
      .slice(0, 120);

    if (!name) return json({ error: "name_required", message: "Informe o nome do responsável ou da empresa." }, 400);
    if (!instagram) return json({ error: "instagram_required", message: "Informe o @ do Instagram." }, 400);

    const config = client.config && typeof client.config === "object" ? client.config : {};
    const nextConfig = {
      ...config,
      contact: {
        ...(config.contact && typeof config.contact === "object" ? config.contact : {}),
        name,
        phone
      }
    };

    await env.DB.prepare(
      "UPDATE clients SET name = ?1, instagram = ?2, config_json = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4"
    ).bind(name, instagram, JSON.stringify(nextConfig), client.id).run();

    const updated = await getClient(env, client.id);
    return json({ ok: true, message: "Dados da conta atualizados.", client: portalClientView(updated) });
  }

  if (url.pathname === "/api/portal/branding/logo" && request.method === "POST") {
    if (!env.MEDIA) return json({ error: "r2_unavailable", message: "O armazenamento de mídia do NEXUS não está disponível." }, 503);
    const form = await request.formData().catch(() => null);
    const file = form?.get("logo");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "logo_required", message: "Selecione uma imagem para a logo." }, 400);
    }

    const contentType = String(file.type || "").toLowerCase();
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(contentType)) {
      return json({ error: "unsupported_logo_type", message: "Use PNG, JPG ou WEBP." }, 415);
    }

    const maxBytes = 5 * 1024 * 1024;
    const bytes = await file.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > maxBytes) {
      return json({ error: "logo_too_large", message: "A logo deve ter no máximo 5 MB." }, 413);
    }

    const extension = mediaExtension(contentType, file.name || "logo");
    const key = "branding/" + String(client.id) + "/logo-" + Date.now() + "." + extension;
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { clientId: String(client.id), kind: "client-logo" }
    });

    const config = client.config && typeof client.config === "object" ? client.config : {};
    const previousKey = String(config.branding?.logoKey || "");
    const nextConfig = {
      ...config,
      branding: {
        ...(config.branding && typeof config.branding === "object" ? config.branding : {}),
        logoKey: key,
        logoUpdatedAt: new Date().toISOString()
      }
    };

    await env.DB.prepare(
      "UPDATE clients SET config_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
    ).bind(JSON.stringify(nextConfig), client.id).run();

    if (previousKey && previousKey !== key && previousKey.startsWith("branding/" + String(client.id) + "/")) {
      await env.MEDIA.delete(previousKey).catch(() => {});
    }

    return json({
      ok: true,
      message: "Logo atualizada.",
      logoKey: key,
      logoUrl: url.origin + "/media/" + key
    }, 201);
  }

  if (url.pathname === "/api/portal/live-status" && request.method === "GET") {
    return json({
      ok: true,
      clientId: client.id,
      runtime: "cloudflare-workers",
      service: "Servidor Nexus",
      database: "d1",
      media: env.MEDIA ? "r2" : "unavailable",
      migrationMode: false
    });
  }

  if (url.pathname === "/api/portal/token-usage" && request.method === "GET") {
    const usage = await tokenUsageToday(env, client.id);
    return json({ ok: true, ...usage, usage });
  }

  if (url.pathname === "/api/portal/provider-usage" && request.method === "GET") {
    const usage = await tokenUsageToday(env, client.id);
    return json({
      ok: true,
      openai: {
        ...usage,
        connected: usage.connected,
        costAvailable: true,
        cost31dUsd: usage.estimatedCostUsd,
        costIsEstimate: true
      },
      cloudflare: {
        runtime: "workers-ai",
        connected: Boolean(env.AI),
        strategy: String(env.NEXUS_AI_PROVIDER || "workers-first")
      }
    });
  }

  if (url.pathname === "/api/portal/connections" && request.method === "GET") {
    return json({ ok: true, connections: await connectionSummary(env, client.id) });
  }

  if (url.pathname === "/api/portal/instagram/start" && request.method === "GET") {
    try {
      return json({ ok: true, ...(await startInstagramOAuth(env, request, client.id, "/portal.html?tab=instagram")) });
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (code === "instagram_nexus_not_configured") {
        return json({
          error: code,
          message: "O administrador ainda precisa ativar a conexão central do Instagram."
        }, 503);
      }
      return json({ error: code || "instagram_oauth_start_failed" }, 400);
    }
  }


  if (url.pathname === "/api/portal/support") {
    if (request.method === "GET") {
      return json({ ok: true, tickets: await listSupport(env, client.id) });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = crypto.randomUUID();
      const subject = String(body.subject || "Suporte").trim().slice(0, 180);
      const payload = {
        category: String(body.category || "general").slice(0, 80),
        message: String(body.message || "").slice(0, 5000)
      };
      await env.DB.prepare(
        `INSERT INTO support_tickets(id, client_id, status, subject, payload_json, created_at, updated_at)
         VALUES(?1, ?2, 'open', ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(id, client.id, subject, JSON.stringify(payload)).run();
      return json({ ok: true, ticket: (await listSupport(env, client.id))[0] }, 201);
    }
  }


  if (url.pathname === "/api/portal/videos" && request.method === "GET") {
    return json({ ok: true, jobs: await listVideoJobs(env, client.id) });
  }

  if (url.pathname === "/api/portal/videos/failed" && request.method === "DELETE") {
    const failedRows = await env.DB.prepare(
      "SELECT id, source_object_key FROM video_jobs WHERE client_id=?1 AND status='failed'"
    ).bind(client.id).all();
    const rows = failedRows?.results || [];
    if (!rows.length) return json({ ok: true, deleted: 0 });

    const clipRows = await env.DB.prepare(
      `SELECT vc.output_object_key
       FROM video_clips vc
       JOIN video_jobs vj ON vj.id=vc.job_id AND vj.client_id=vc.client_id
       WHERE vj.client_id=?1 AND vj.status='failed'`
    ).bind(client.id).all();

    const keys = [
      ...rows.map(row => String(row.source_object_key || "")),
      ...(clipRows?.results || []).map(row => String(row.output_object_key || ""))
    ].filter(Boolean);

    await env.DB.prepare(
      `DELETE FROM video_clips
       WHERE client_id=?1
         AND job_id IN (SELECT id FROM video_jobs WHERE client_id=?1 AND status='failed')`
    ).bind(client.id).run();
    const deleted = await env.DB.prepare(
      "DELETE FROM video_jobs WHERE client_id=?1 AND status='failed'"
    ).bind(client.id).run();

    for (const key of keys) {
      if (/^(videos|library)\//.test(key) && !key.includes("..") && !key.includes("\\")) {
        await env.MEDIA?.delete(key).catch(() => {});
      }
    }

    return json({ ok: true, deleted: Number(deleted?.meta?.changes || rows.length) });
  }

  const videoDeleteMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)$/);
  if (videoDeleteMatch && request.method === "DELETE") {
    const jobId = decodeURIComponent(videoDeleteMatch[1]);
    const row = await env.DB.prepare(
      "SELECT id, source_object_key, status FROM video_jobs WHERE id=?1 AND client_id=?2 LIMIT 1"
    ).bind(jobId, client.id).first();
    if (!row) return json({ error: "video_not_found", message: "Vídeo não encontrado." }, 404);

    const deletableStatuses = new Set(["ready", "failed", "awaiting_configuration"]);
    if (!deletableStatuses.has(String(row.status || ""))) {
      return json({
        error: "video_delete_not_allowed",
        message: "Espere a geração terminar antes de excluir este vídeo."
      }, 409);
    }

    const clipRows = await env.DB.prepare(
      "SELECT output_object_key FROM video_clips WHERE job_id=?1 AND client_id=?2"
    ).bind(jobId, client.id).all();
    const keys = [
      String(row.source_object_key || ""),
      ...(clipRows?.results || []).map(clip => String(clip.output_object_key || ""))
    ].filter(Boolean);

    await env.DB.prepare("DELETE FROM video_clips WHERE job_id=?1 AND client_id=?2")
      .bind(jobId, client.id).run();
    await env.DB.prepare("DELETE FROM video_jobs WHERE id=?1 AND client_id=?2")
      .bind(jobId, client.id).run();

    for (const key of keys) {
      if (/^(videos|library)\//.test(key) && !key.includes("..") && !key.includes("\\")) {
        await env.MEDIA?.delete(key).catch(() => {});
      }
    }
    return json({ ok: true, deleted: true });
  }

  if (url.pathname === "/api/portal/videos/search" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || "").trim().slice(0, 120);
    if (!query) return json({ message: "Informe o nome do filme ou série." }, 400);
    try {
      const type = body.type === "series" ? "series" : "movie";
      // Fast path: the old alias resolver performed repeated sequential Wikidata
      // searches (up to 15s each), then searched the catalogue a second time.
      // Reuse this single catalogue result; dispatch the YouTube search promptly.
      const catalog = await searchCatalog(query, type, { timeoutMs: 5000 }).catch(() => []);
      // Cache validated posters without delaying the YouTube result page.
      ctx?.waitUntil?.(indexCatalogResults(env, catalog, { limit: 4 }).catch(() => {}));
      const aliases = [query];
      for (const item of catalog.slice(0, 3)) {
        const title = String(item?.title || "").trim();
        if (title && !aliases.some(value => value.localeCompare(title, undefined, { sensitivity: "base" }) === 0)) {
          aliases.push(title);
        }
      }
      const searchId = await dispatchVideoSearch(env, client.id, query, type, aliases.slice(0, 4));
      // Each genuine YouTube search incrementally fills the shared poster index.
      // Cache metadata URLs by immutable catalogue ID; never guess a different film.
      await Promise.allSettled(catalog.slice(0, 3).map(item =>
        rememberVerifiedPoster(env, { title: item.title, year: item.year, type, catalogId: item.id }, item.posterUrl)
      ));
      return json({ ok: true, searchId, catalog, aliases }, 202);
    } catch { return json({ message: "Não foi possível iniciar a busca no YouTube." }, 503); }
  }
  const searchMatch = url.pathname.match(/^\/api\/portal\/videos\/search\/([^/]+)$/);
  if (searchMatch && request.method === "GET") {
    const row = await env.DB.prepare("SELECT status,result_json FROM video_jobs WHERE id=?1 AND client_id=?2").bind(decodeURIComponent(searchMatch[1]), client.id).first();
    if (!row) return json({ message: "Busca não encontrada." }, 404);
    return json({ status: row.status, results: parseJson(row.result_json).results || [] });
  }
  if (url.pathname === "/api/portal/videos/youtube" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const youtubeSourceUrl = youtubeUrl(body.url);
    const title = String(body.title || "").trim().slice(0, 180);
    const searchTitle = String(body.searchTitle || body.title || "").trim().slice(0, 180);
    const action = body.action === "download" ? "download" : (body.action === "server_generate" ? "server_generate" : "local_generate");
    if (!youtubeSourceUrl || !title) return json({ message: "Informe o título e um link válido do YouTube." }, 400);
    try {
      let metadata;
      const catalogType = body.type === "series" ? "series" : "movie";
      // Persist the explicit card selection before a second catalogue lookup.
      // Store only publisher-hosted, image-validated artwork; never a YouTube frame.
      const selectedCatalogId = String(body.catalogId || "").trim();
      const selectedYear = String(body.year || "").trim();
      const selectedPoster = String(body.posterUrl || "").trim();
      if (/^(?:itunes|tvmaze):[1-9][0-9]{0,15}$/.test(selectedCatalogId)
          && /^(?:19|20)\d{2}$/.test(selectedYear) && selectedPoster) {
        await indexCatalogResults(env, [{
          id: selectedCatalogId, title, year: selectedYear, posterUrl: selectedPoster,
          mediaType: catalogType === "series" ? "SÉRIE" : "FILME"
        }], { limit: 1 }).catch(() => {});
      }
      const publisherMovie = !selectedCatalogId && officialMovieFromTrailer({
        title: searchTitle || title, youtubeTitle: body.youtubeTitle, type: catalogType
      });
      if (publisherMovie) {
        metadata = publisherMovie;
      } else {
      try {
        const candidate = await catalogMetadata(title, catalogType, selectedCatalogId);
        const confidence = catalogIdentityConfidence(title, candidate?.title || "");
        // The user picked an explicit catalogue card. Its provider ID, rather than
        // the free-text YouTube query, identifies the exact movie or series.
        const selectedById = Boolean(body.catalogId && String(candidate?.id) === String(body.catalogId));
        if (confidence < 0.72 && !selectedById) throw new Error("catalog_identity_mismatch");
        metadata = await localizeVideoMetadata(env, client.id, candidate);
        if (!metadata.posterUrl && selectedCatalogId && selectedYear) {
          metadata.posterUrl = await readVerifiedPoster(env, {
            title: metadata.title || title, year: metadata.year || selectedYear,
            type: catalogType, catalogId: metadata.id || selectedCatalogId
          }).catch(() => "");
        }
      } catch (error) {
        if (!["catalog_title_not_found","catalog_unavailable","catalog_identity_mismatch"].includes(error?.message)) throw error;
        const youtubeCatalogTitle = catalogTitleCandidateFromYoutube(body.youtubeTitle);
        const youtubeConfidence = youtubeCatalogTitle ? catalogIdentityConfidence(title, youtubeCatalogTitle) : 0;
        if (youtubeCatalogTitle && youtubeConfidence >= 0.72 && youtubeCatalogTitle.toLowerCase() !== title.toLowerCase()) {
          try {
            const candidate = await catalogMetadata(youtubeCatalogTitle, catalogType, "");
            const confidence = catalogIdentityConfidence(title, candidate?.title || "");
            if (confidence >= 0.72) metadata = await localizeVideoMetadata(env, client.id, candidate);
          } catch {}
        }
        if (!metadata && body.catalogId && body.year) {
          // The selected item was saved at YouTube search time. Reuse only an
          // exact-ID/title/year R2 record when the external catalogue is down.
          const previousPoster = await readVerifiedPoster(env, {
            title, year: String(body.year).trim(), type: catalogType,
            catalogId: String(body.catalogId).trim()
          });
          if (previousPoster) {
            metadata = {
              id: String(body.catalogId).trim(), title, year: String(body.year).trim(),
              overview: String(body.overview || "").trim() || title,
              mediaType: catalogType === "series" ? "SÉRIE" : "FILME",
              posterUrl: previousPoster, cast: [], reviews: [], related: [],
              sources: ["nexus-r2-youtube-poster-index"], previewUrl: ""
            };
          }
        }
        if (!metadata) {
          // A selected catalogue card is an explicit title/year/ID, not an
          // unreliable free-text query. Recover only its verified R2 poster.
          const selectedId = String(body.catalogId || "").trim();
          const selectedYear = String(body.year || "").trim();
          const posterFromLibrary = selectedId && selectedYear
            ? await readVerifiedPoster(env, {
              title, year: selectedYear, type: catalogType, catalogId: selectedId
            }).catch(() => "")
            : "";
          metadata = {
            id: posterFromLibrary ? selectedId : "",
            title,
            overview: String(body.overview || "").trim() || (title + " — trailer oficial selecionado no YouTube."),
            year: posterFromLibrary ? selectedYear : "",
            mediaType: body.type === "series" ? "SÉRIE" : "FILME",
            posterUrl: posterFromLibrary,
            cast: [],
            reviews: [],
            related: [],
            sources: [youtubeSourceUrl],
            previewUrl: ""
          };
        }
      }
      }

      // For an exact recognized YouTube movie, skip slow free-text lookups,
      // verify the publisher's poster and preserve its specific film identity.
      if (publisherMovie) {
        if (!await verifyOfficialMoviePoster(publisherMovie.posterUrl)) {
          return json({ error: "video_official_poster_required",
            message: "Encontrei o filme correto, mas a Sony não entregou o pôster oficial. Nenhum trabalho foi iniciado." }, 409);
        }
        // Ticket creation must be fast. Related artwork, actor photos and
        // ratings are retrieved after the original MP4 reaches the renderer.
        // Otherwise slow third-party catalogues cause a 30s panel timeout.
        metadata = publisherMovie;
      }
      // Fail BEFORE accepting an ingest job. The previous flow created FAILED
      // entries despite not having title/year/poster/related metadata.
      if (action !== "download" && !String(metadata?.posterUrl || "").trim()) {
        return json({ error: "video_official_poster_required",
          message: "O filme ou série não possui pôster confirmado. Escolha o título exato no catálogo. Nenhuma geração foi iniciada." }, 409);
      }

      // A precisely identified publisher trailer overrides a broad search query
      // (for example "HOMEM ARANHA 2026") without loosening identity checks.
      const authoritativeTitle = publisherMovie?.title || title;
      const finalConfidence = catalogIdentityConfidence(authoritativeTitle, metadata?.title || authoritativeTitle);
      const selectedById = Boolean(body.catalogId && String(metadata?.id) === String(body.catalogId));
      if (finalConfidence < 0.72 && !selectedById) {
        metadata = {
          title,
          overview: String(body.overview || "").trim() || (title + " — trailer oficial selecionado no YouTube."),
          year: "",
          mediaType: body.type === "series" ? "SÉRIE" : "FILME",
          posterUrl: "",
          cast: [],
          reviews: [],
          related: [],
          sources: [youtubeSourceUrl],
          previewUrl: ""
        };
      }

      if (metadata.id && metadata.year && metadata.posterUrl) {
        await rememberVerifiedPoster(env, {
          title: metadata.title, year: metadata.year, type: catalogType,
          catalogId: metadata.id
        }, metadata.posterUrl);
      }
      // An exact selection seeds the poster library for future searches too.
      ctx?.waitUntil?.(indexCatalogResults(env, [metadata], { limit: 1 }).catch(() => {}));

      const directSourceUrl = catalogPreviewUrl(metadata.previewUrl);
      const sourceProvider = directSourceUrl ? "catalog-preview" : "youtube";
      const sourceUrl = directSourceUrl || youtubeSourceUrl;
      // Always allow the server to try the selected video.
      // Authentication failures are reported asynchronously by the importer;
      // only an actual callback is evidence of a YouTube restriction.
      // The PC helper is strictly an optional path chosen by the user.

      const id = "video_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const branding = client.config?.branding || {};
      const settings = {
        sourceUrl,
        selectedYoutubeUrl: youtubeSourceUrl,
        selectedYoutubeTitle: String(body.youtubeTitle || "").trim().slice(0, 220),
        requestedSearchTitle: searchTitle,
        catalogId: String(metadata?.id || body.catalogId || "").trim(),
        sourceProvider,
        downloadOnly: action === "download",
        contentTitle: publisherMovie?.title || metadata.title || title,
        catalogId: String(metadata.id || body.catalogId || "").trim().slice(0, 120),
        metadataIdentityTitle: metadata.title || title,
        metadataIdentityConfidence: catalogIdentityConfidence(authoritativeTitle, metadata.title || authoritativeTitle),
        posterSource: metadata.posterUrl ? "catalog" : "none",
        overview: String(body.overview && !likelyEnglishCatalogText(body.overview) ? body.overview : metadata.overview || "").slice(0, 1800),
        releaseYear: metadata.year || "",
        mediaType: metadata.mediaType || (body.type === "series" ? "SÉRIE" : "FILME"),
        posterUrl: metadata.posterUrl || "",
        movieMetadata: metadata,
        editStyle: "cinematic-card-v1",
        clipDuration: null,
        requestedClips: 1,
        logoEnabled: body.logoEnabled !== false && Boolean(branding.logoKey),
        logoObjectKey: body.logoEnabled !== false ? (branding.logoKey || "") : "",
        renderProfile: body.renderProfile === "quality" ? "quality" : "fast",
        creationMode: body.creationMode === "edit" ? "edit" : "auto",
        composition: normalizeVideoComposition(body.composition || {})
      };
      settings.endContact = normalizeBrazilWhatsapp(body.endContact ?? client.config?.videoTemplate?.whatsappNumber ?? "");
      await env.DB.prepare("INSERT INTO video_jobs(id,client_id,source_object_key,status,settings_json,result_json,created_at,updated_at) VALUES(?1,?2,'','importing',?3,?4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(
        id,
        client.id,
        JSON.stringify(settings),
        JSON.stringify({
          progress: 5,
          message: action === "download"
            ? (sourceProvider === "catalog-preview"
              ? "Fonte oficial direta encontrada. Preparando o trailer para download."
              : "Iniciando download protegido do trailer escolhido no YouTube.")
            : (sourceProvider === "catalog-preview"
              ? "Fonte oficial direta encontrada. Preparando o trailer para gerar o vídeo 9:16."
              : "Importando o trailer escolhido do YouTube para gerar o vídeo 9:16."),
          error: ""
        })
      ).run();
      if (action === "local_generate" && sourceProvider !== "catalog-preview") {
        settings.localUploadTicket = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        // Allow the 90 MB upload to finish on a slow link; duplicate PUTs are guarded by localUploadConsumedAt.
        settings.localUploadExpiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
        settings.ingestTransport = "local-helper";
        await env.DB.prepare(
          "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
        ).bind(
          id,
          client.id,
          JSON.stringify(settings),
          JSON.stringify({ progress: 0, message: "Aguardando o computador iniciar o download.", error: "" })
        ).run();
        return json({
          ok: true,
          jobId: id,
          action,
          sourceMode: sourceProvider,
          localUpload: {
            sourceUrl,
            jobId: id,
            clientId: client.id,
            uploadTicket: settings.localUploadTicket,
            callbackBase: String(env.PUBLIC_BASE_URL || "https://servidor-nexus.diamantehinode2015.workers.dev").trim().replace(/\/+$/, "")
          },
          message: "O computador receberá o job, baixará o MP4 e enviará ao NEXUS automaticamente."
        }, 202);
      }
      await startYouTubeVideoIngest(env, client.id, id);
      return json({
        ok: true,
        jobId: id,
        action,
        sourceMode: sourceProvider,
        message: action === "download"
          ? (sourceProvider === "catalog-preview"
            ? "Fonte oficial encontrada. Download iniciado."
            : "Download do YouTube iniciado. Acompanhe o progresso no topo do painel.")
          : (sourceProvider === "catalog-preview"
            ? "Fonte oficial encontrada. A geração 9:16 será iniciada automaticamente."
            : "Importação do YouTube iniciada. A geração 9:16 começa automaticamente após o download.")
      }, 202);
    } catch (error) {
      return json({
        error: error.message,
        message: videoErrorMessages[error.message] || "Não foi possível iniciar o vídeo: " + error.message
      }, 400);
    }
  }

  const localRetryMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)\/local-retry$/);
  if (localRetryMatch && request.method === "POST") {
    const jobId = decodeURIComponent(localRetryMatch[1]);
    try {
      const localUpload = await retryFailedYoutubeIngestWithLocalHelper(env, client.id, jobId);
      return json({
        ok: true, jobId, localUpload,
        message: "Retomando o mesmo vídeo pelo Auxiliar NEXUS, com os dados originais do filme."
      }, 202);
    } catch (error) {
      const code = String(error?.message || error || "video_local_retry_failed");
      const status = code === "video_not_found" ? 404 : 409;
      return json({
        error: code,
        message: code === "video_local_retry_conflict"
          ? "O estado deste vídeo mudou. Atualize a lista e tente novamente."
          : "Não é possível reiniciar este vídeo pelo auxiliar. Atualize o painel ou envie um MP4."
      }, status);
    }
  }

  const localFailMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)\/local-fail$/);
  if (localFailMatch && request.method === "POST") {
    const jobId = decodeURIComponent(localFailMatch[1]);
    const body = await request.json().catch(() => ({}));
    const localReason = String(body.reason || "local_helper_unavailable").trim().slice(0, 300) || "local_helper_unavailable";
    const recovery = await recoverLocalIngestViaServer(env, client.id, jobId, localReason);
    if (recovery.reason === "video_not_found") return json({ error: "video_not_found", message: "Vídeo não encontrado." }, 404);
    if (recovery.recovered) {
      return json({ ok: true, fallbackStarted: true, jobId, message: "Auxiliar local indisponível. O NEXUS continuou pelo servidor." }, 202);
    }
    if (recovery.requiresLocalHelper) {
      return json({
        ok: false,
        fallbackStarted: false,
        requiresLocalHelper: true,
        error: "local_helper_required",
        message: "O YouTube bloqueia o download no servidor. Inicie o Auxiliar NEXUS no PC e tente novamente."
      }, 409);
    }
    if (recovery.failed) {
      return json({ ok: false, fallbackStarted: false, error: "video_ingest_unavailable", message: "Falharam o auxiliar local e a recuperação pelo servidor." }, 503);
    }
    return json({ ok: true, ignored: true, fallbackStarted: recovery.reason === "already_recovered" || recovery.reason === "transport_server-fallback", status: recovery.status || null, reason: recovery.reason });
  }

  const videoSourceDownloadMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)\/source$/);
  if (videoSourceDownloadMatch && request.method === "GET") {
    const jobId = decodeURIComponent(videoSourceDownloadMatch[1]);
    const row = await env.DB.prepare(
      "SELECT source_object_key,settings_json FROM video_jobs WHERE id=?1 AND client_id=?2 LIMIT 1"
    ).bind(jobId, client.id).first();
    if (!row?.source_object_key || !env.MEDIA) return json({ message: "Vídeo original ainda não está disponível." }, 404);
    try {
      await confirmedVideoSource(env, client.id, row.source_object_key);
      const object = await env.MEDIA.get(row.source_object_key);
      if (!object) return json({ message: "Vídeo original não encontrado." }, 404);
      const settings = parseJson(row.settings_json, {});
      const base = String(settings.contentTitle || "trailer").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "trailer";
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("content-type", "video/mp4");
      headers.set("cache-control", "private, no-store");
      headers.set("content-disposition", 'attachment; filename="' + base + '.mp4"');
      if (object.size) headers.set("content-length", String(object.size));
      return new Response(object.body, { status: 200, headers });
    } catch {
      return json({ message: "Vídeo original ainda não está disponível." }, 404);
    }
  }

  const videoProcessMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)\/process$/);
  if (url.pathname === "/api/portal/videos/preferences" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const rawNumber = String(body.whatsappNumber || "").trim().slice(0, 40);
    const number = rawNumber ? normalizeBrazilWhatsapp(rawNumber) : "";
    if (rawNumber && !number) return json({ message: "Informe um WhatsApp brasileiro com DDD." }, 400);
    await env.DB.prepare("UPDATE clients SET config_json=json_set(config_json,'$.videoTemplate.whatsappNumber',?1),updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(number, client.id).run();
    return json({ ok: true, whatsappNumber: number });
  }
  if (videoProcessMatch && request.method === "POST") {
    const jobId = decodeURIComponent(videoProcessMatch[1]);
    const body = await request.json().catch(() => ({}));
    const row = await env.DB.prepare(
      "SELECT id, status, source_object_key, settings_json FROM video_jobs WHERE id=?1 AND client_id=?2 LIMIT 1"
    ).bind(jobId, client.id).first();
    if (!row) return json({ error: "video_not_found", message: "Vídeo não encontrado." }, 404);
    if (row.status === "cutting") {
      const jobs = await listVideoJobs(env, client.id);
      return json({
        ok: true,
        alreadyProcessing: true,
        job: jobs.find(item => item.id === jobId) || { id: jobId, status: "cutting" },
        message: "Este vídeo já está sendo gerado. Acompanhe o progresso no painel."
      }, 202);
    }
    if (row.status === "importing") {
      const jobs = await listVideoJobs(env, client.id);
      return json({
        ok: true,
        alreadyProcessing: true,
        job: jobs.find(item => item.id === jobId) || { id: jobId, status: "importing" },
        message: "O vídeo ainda está sendo importado. A geração começará automaticamente."
      }, 202);
    }
    try {
      await confirmedVideoSource(env, client.id, row.source_object_key);
    } catch (error) { return json({ error: error.message, message: videoErrorMessages[error.message] || "Não foi possível confirmar o vídeo original." }, 409); }

    const current = parseJson(row.settings_json, {});
    const branding = client.config?.branding && typeof client.config.branding === "object" ? client.config.branding : {};
    let automaticMetadata = null;
    if (!body.title && !body.overview && !current.overview) {
      automaticMetadata = await inferCatalogMetadataFromUpload(
        current.filename || current.displayName || current.contentTitle || "",
        /s[eé]rie|series|tv/i.test(String(current.mediaType || "")) ? "series" : ""
      ).catch(() => null);
    }
    const settings = {
      ...current,
      contentTitle: String(body.title || automaticMetadata?.title || current.contentTitle || current.displayName || "Conteúdo").trim().slice(0, 180),
      overview: String(body.overview || automaticMetadata?.overview || current.overview || "").trim().slice(0, 1800),
      releaseYear: String(body.year || automaticMetadata?.year || current.releaseYear || "").trim().slice(0, 12),
      mediaType: String(body.mediaType || automaticMetadata?.mediaType || current.mediaType || "").trim().slice(0, 24),
      posterUrl: String(body.posterUrl || automaticMetadata?.posterUrl || current.posterUrl || "").trim().slice(0, 1200),
      ...(automaticMetadata ? { movieMetadata: automaticMetadata } : {}),
      editStyle: "cinematic-card-v1",
      clipDuration: null,
      requestedClips: 1,
      outputFormat: "reel",
      logoEnabled: body.logoEnabled !== false && Boolean(branding.logoKey),
      logoObjectKey: body.logoEnabled !== false ? String(branding.logoKey || "") : "",
      endText: "",
      endContact: normalizeBrazilWhatsapp(body.endContact ?? client.config?.videoTemplate?.whatsappNumber ?? current.endContact ?? ""),
      renderProfile: body.renderProfile === "quality" ? "quality" : "fast",
      creationMode: body.creationMode === "edit" ? "edit" : (current.creationMode === "edit" ? "edit" : "auto"),
      composition: normalizeVideoComposition(body.composition || current.composition || {})
    };
    const retryPublisher = !settings.posterUrl && officialMovieFromTrailer({
      title: settings.selectedYoutubeTitle || current.selectedYoutubeTitle
        ? (settings.requestedSearchTitle || settings.contentTitle) : settings.contentTitle,
      youtubeTitle: settings.selectedYoutubeTitle || current.selectedYoutubeTitle,
      type: /s[eé]rie|series|tv/i.test(settings.mediaType) ? "series" : "movie"
    });
    if (!retryPublisher && (!settings.movieMetadata?.overview || !settings.posterUrl || (body.title && body.title !== current.contentTitle))) {
      const catalogType = /s[eé]rie|series|tv/i.test(settings.mediaType) ? "series" : "movie";
      try {
        settings.movieMetadata = await catalogMetadata(settings.contentTitle, catalogType, String(settings.movieMetadata?.id || settings.catalogId || "").trim());
        settings.movieMetadata = await localizeVideoMetadata(env, client.id, settings.movieMetadata);
      } catch {
        const youtubeCatalogTitle = catalogTitleCandidateFromYoutube(settings.selectedYoutubeTitle || current.selectedYoutubeTitle || "");
        if (youtubeCatalogTitle) {
          try {
            settings.movieMetadata = await catalogMetadata(youtubeCatalogTitle, catalogType);
            settings.movieMetadata = await localizeVideoMetadata(env, client.id, settings.movieMetadata);
            settings.contentTitle = settings.movieMetadata?.title || settings.contentTitle;
          } catch {}
        }
        if (!settings.movieMetadata?.title) {
          settings.movieMetadata = {
            title: settings.contentTitle,
            overview: settings.overview,
            year: settings.releaseYear,
            mediaType: settings.mediaType,
            posterUrl: settings.posterUrl,
            cast: [],
            reviews: [],
            related: []
          };
        }
      }
    }
    if (!settings.overview || likelyEnglishCatalogText(settings.overview)) settings.overview = String(settings.movieMetadata?.overview || settings.overview || "").slice(0, 1800);
    settings.posterUrl = settings.posterUrl || String(settings.movieMetadata?.posterUrl || "").slice(0, 1200);
    if (!settings.posterUrl) {
      const cachedPoster = await readVerifiedPoster(env, {
        title: String(settings.movieMetadata?.title || settings.contentTitle || ""),
        year: String(settings.movieMetadata?.year || settings.releaseYear || ""),
        type: /s[eé]rie|series|tv/i.test(settings.mediaType) ? "series" : "movie",
        catalogId: String(settings.movieMetadata?.id || settings.catalogId || "")
      });
      if (cachedPoster) { settings.posterUrl = cachedPoster; settings.posterSource = "verified-library"; }
    }
    // Retrying an already downloaded MP4 must recover the official poster
    // without asking the user to download the same YouTube trailer again.
    if (!settings.posterUrl && /filme|movie|s[eé]rie|series|tv/i.test(settings.mediaType)) {
      const publisherMovie = officialMovieFromTrailer({
        title: settings.selectedYoutubeTitle || current.selectedYoutubeTitle
          ? (settings.requestedSearchTitle || settings.contentTitle) : settings.contentTitle,
        youtubeTitle: settings.selectedYoutubeTitle || current.selectedYoutubeTitle,
        type: /s[eé]rie|series|tv/i.test(settings.mediaType) ? "series" : "movie"
      });
      if (publisherMovie && await verifyOfficialMoviePoster(publisherMovie.posterUrl)) {
        settings.movieMetadata = publisherMovie;
        settings.contentTitle = publisherMovie.title;
        settings.overview = publisherMovie.overview;
        settings.releaseYear = publisherMovie.year;
        settings.catalogId = publisherMovie.id;
        settings.posterUrl = publisherMovie.posterUrl;
        settings.posterSource = "publisher-official";
        await rememberVerifiedPoster(env, {
          title: publisherMovie.title, year: publisherMovie.year,
          type: "movie", catalogId: publisherMovie.id
        }, publisherMovie.posterUrl);
      }
      if (!settings.posterUrl) {
        await env.DB.prepare(
          "UPDATE video_jobs SET status='failed',result_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
        ).bind(jobId, client.id, JSON.stringify({
          progress: 0,
          error: "video_official_poster_required",
          message: "Pôster oficial ainda indisponível. O MP4 original foi preservado; selecione o título exato e tente novamente."
        })).run();
        return json({ error: "video_official_poster_required",
          message: "Pôster oficial ainda indisponível. O MP4 original foi preservado; tente novamente depois de selecionar o título exato." }, 409);
      }
    }
    // Preserve the movie identity; the renderer enriches the cast,
    // ratings and related titles after the source MP4 is available.
    settings.movieMetadata = { ...settings.movieMetadata, title: settings.contentTitle, overview: settings.overview };
    await env.DB.prepare(
      "UPDATE video_jobs SET settings_json=?3, updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(jobId, client.id, JSON.stringify(settings)).run();

    try {
      await startGitHubVideoRender(env, client.id, jobId, settings);
      const jobs = await listVideoJobs(env, client.id);
      return json({ ok: true, job: jobs.find(item => item.id === jobId) || null }, 202);
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const message = code === "github_actions_token_missing"
        ? "O renderizador ainda não está autorizado no Worker."
        : videoErrorMessages[code] || "Não foi possível iniciar a geração do vídeo: " + code;
      await env.DB.prepare(
        "UPDATE video_jobs SET status='failed',result_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
      ).bind(jobId, client.id, JSON.stringify({
        progress: 0,
        error: String(code || "video_render_dispatch_failed").slice(0, 500),
        message
      })).run();
      return json({ error: code, message }, 400);
    }
  }

  const clipMediaMatch = url.pathname.match(/^\/api\/portal\/videos\/([^/]+)\/clips\/([^/]+)\/media$/);
  if (clipMediaMatch && request.method === "GET") {
    const jobId = decodeURIComponent(clipMediaMatch[1]);
    const clipId = decodeURIComponent(clipMediaMatch[2]);
    const clip = await env.DB.prepare(
      "SELECT output_object_key FROM video_clips WHERE id=?1 AND job_id=?2 AND client_id=?3 LIMIT 1"
    ).bind(clipId, jobId, client.id).first();
    if (!clip?.output_object_key || !env.MEDIA) return json({ error: "clip_not_found" }, 404);
    const object = await env.MEDIA.get(String(clip.output_object_key));
    if (!object) return json({ error: "clip_not_found" }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, no-store");
    headers.set("content-disposition", 'attachment; filename="nexus-video.mp4"');
    if (object.size) headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }

  if (url.pathname === "/api/portal/media" && request.method === "GET") {
    return json({
      ok: true,
      media: await listClientMedia(env, client.id, url.origin),
      storage: env.MEDIA ? "r2" : "unavailable"
    });
  }

  if (url.pathname === "/api/portal/media" && request.method === "POST") {
    if (!env.MEDIA) return json({ error: "r2_unavailable", message: "O armazenamento de mídia do NEXUS não está disponível." }, 503);
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "file_required", message: "Selecione uma imagem ou vídeo." }, 400);
    }

    const contentType = String(file.type || "").toLowerCase();
    const allowed = new Set(["image/png","image/jpeg","image/webp","video/mp4","video/webm","video/quicktime"]);
    if (!allowed.has(contentType)) {
      return json({ error: "unsupported_media_type", message: "Use PNG, JPG, WEBP, MP4, WEBM ou MOV." }, 415);
    }

    const maxBytes = 90 * 1024 * 1024;
    const size = Number(file.size || 0);
    if (!size || size > maxBytes) {
      return json({ error: "media_too_large", message: "O vídeo deve ter no máximo 90 MB." }, 413);
    }
    if (contentType === "video/mp4" && !isMp4Header(await file.slice(0, 32).arrayBuffer())) {
      return json({ error: "video_source_invalid", message: "O arquivo selecionado não contém um MP4 válido." }, 415);
    }

    const purpose = String(form.get("purpose") || "reference") === "publish" ? "publish" : "reference";
    const note = String(form.get("note") || "").trim().slice(0, 800);
    const originalName = String(file.name || "midia").replace(/[\r\n]/g, " ").slice(0, 180);
    const extension = mediaExtension(contentType, originalName);
    const key = "library/" + String(client.id) + "/" + new Date().toISOString().slice(0, 10) + "/" + crypto.randomUUID() + "." + extension;

    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: {
        contentType,
        cacheControl: "private, no-store"
      },
      customMetadata: {
        clientId: String(client.id),
        originalName,
        purpose,
        note,
        kind: purpose === "reference" ? "creative-reference" : "client-owned-media"
      }
    });
    if (contentType.startsWith("video/")) await confirmedVideoSource(env, client.id, key, size);
    else {
      const stored = await env.MEDIA.head(key);
      if (!stored || Number(stored.size) !== size) throw new Error("media_store_unconfirmed");
    }

    let posterUrl = "";
    const posterFile = form.get("poster");
    if (posterFile && typeof posterFile.arrayBuffer === "function" && Number(posterFile.size || 0) > 0) {
      const posterType = String(posterFile.type || "").toLowerCase();
      const posterAllowed = new Set(["image/png", "image/jpeg", "image/webp"]);
      if (!posterAllowed.has(posterType)) {
        return json({ error: "unsupported_poster_type", message: "A capa deve ser PNG, JPG ou WEBP." }, 415);
      }
      if (Number(posterFile.size || 0) > 5 * 1024 * 1024) {
        return json({ error: "poster_too_large", message: "A capa deve ter no máximo 5 MB." }, 413);
      }
      const posterBytes = await posterFile.arrayBuffer();
      const posterExt = mediaExtension(posterType, posterFile.name || "capa");
      const posterKey = "library/" + String(client.id) + "/" + new Date().toISOString().slice(0, 10) + "/poster-" + crypto.randomUUID() + "." + posterExt;
      await env.MEDIA.put(posterKey, posterBytes, {
        httpMetadata: { contentType: posterType, cacheControl: "private, no-store" },
        customMetadata: { clientId: String(client.id), originalName: String(posterFile.name || "capa"), purpose: "reference", kind: "video-poster" }
      });
      posterUrl = url.origin + "/media/" + posterKey;
    }

    let videoJobId = "";
    let renderStarted = false;
    let renderError = "";
    if (purpose === "publish" && contentType.startsWith("video/")) {
      videoJobId = "video_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const branding = client.config?.branding && typeof client.config.branding === "object" ? client.config.branding : {};
      let requestedTitle = String(form.get("title") || "").trim().slice(0, 180);
      let requestedOverview = String(form.get("overview") || "").trim().slice(0, 1800);
      let requestedYear = String(form.get("year") || "").trim().slice(0, 12);
      let requestedMediaType = String(form.get("mediaType") || "").trim().slice(0, 24);
      let catalogId = String(form.get("catalogId") || "").trim().slice(0, 120);
      const rawCatalogType = String(form.get("catalogType") || "").trim();
      const catalogType = rawCatalogType === "series" ? "series" : rawCatalogType === "movie" ? "movie" : "";
      const metadataMode = String(form.get("metadataMode") || "") === "fallback" ? "fallback" : "auto";
      const displayName = originalName.replace(/\.[a-z0-9]{2,5}$/i, "");
      const sourceTitle = catalogUploadTitle(originalName);
      const sourceTitleGeneric = !sourceTitle || /^(?:video|videoplayback|clip|arquivo|download|movie|filme|serie)$/i.test(sourceTitle);

      // Explicit fallback metadata is accepted only when the local filename is generic
      // or clearly identifies the same title. This prevents cross-job metadata leaks.
      if (metadataMode !== "fallback" || (!sourceTitleGeneric && requestedTitle && catalogIdentityConfidence(sourceTitle, requestedTitle) < 0.72)) {
        requestedTitle = "";
        requestedOverview = "";
        requestedYear = "";
        requestedMediaType = "";
        catalogId = "";
      }

      let metadata = {
        title: requestedTitle,
        overview: requestedOverview,
        year: requestedYear,
        mediaType: requestedMediaType,
        posterUrl: "",
        cast: [],
        reviews: [],
        related: []
      };

      if (requestedTitle) {
        try {
          let catalog = await catalogMetadata(requestedTitle, catalogType || (/s[eé]rie|series|tv/i.test(requestedMediaType) ? "series" : "movie"), catalogId);
          catalog = await localizeVideoMetadata(env, client.id, catalog);
          if (catalogIdentityConfidence(requestedTitle, catalog.title) >= 0.72) {
            metadata = {
              ...catalog,
              title: catalog.title || requestedTitle,
              overview: requestedOverview && !likelyEnglishCatalogText(requestedOverview) ? requestedOverview : (catalog.overview || ""),
              year: catalog.year || requestedYear,
              mediaType: catalog.mediaType || requestedMediaType
            };
          }
        } catch {}
      } else {
        const inferred = await inferCatalogMetadataFromUpload(originalName, catalogType).catch(() => null);
        if (inferred && (!sourceTitle || catalogIdentityConfidence(sourceTitle, inferred.title) >= 0.72)) {
          metadata = inferred;
        }
      }

      // Final identity lock: poster/cast/reviews/related must belong to the current title.
      const identityTitle = requestedTitle || sourceTitle || displayName;
      const metadataConfidence = metadata.title ? catalogIdentityConfidence(identityTitle, metadata.title) : 0;
      if (metadata.title && metadataConfidence < 0.72) {
        metadata = {
          title: identityTitle,
          overview: "",
          year: "",
          mediaType: "",
          posterUrl: "",
          cast: [],
          reviews: [],
          related: []
        };
      }

      const resolvedPosterUrl = posterUrl || String(metadata.posterUrl || "").trim().slice(0, 1200);
      metadata.posterUrl = resolvedPosterUrl;
      metadata.identityConfidence = metadataConfidence;
      metadata.identityTitle = identityTitle;
      const logoEnabled = String(form.get("logoEnabled") || "1") !== "0" && Boolean(branding.logoKey);
      const settings = {
        filename: originalName,
        displayName,
        contentTitle: String(metadata.title || requestedTitle || displayName).trim().slice(0, 180),
        overview: String(metadata.overview || requestedOverview || "").trim().slice(0, 1800),
        releaseYear: String(metadata.year || requestedYear || "").trim().slice(0, 12),
        mediaType: String(metadata.mediaType || requestedMediaType || "").trim().slice(0, 24),
        posterUrl: resolvedPosterUrl,
        posterSource: posterUrl ? "manual" : (resolvedPosterUrl ? "catalog" : "none"),
        metadataIdentityTitle: String(metadata.identityTitle || requestedTitle || sourceTitle || displayName).trim().slice(0, 180),
        metadataIdentityConfidence: Number(metadata.identityConfidence || 0),
        movieMetadata: metadata,
        clipDuration: null,
        requestedClips: 1,
        outputFormat: "reel",
        editStyle: "cinematic-card-v1",
        logoEnabled,
        logoObjectKey: logoEnabled ? String(branding.logoKey || "") : "",
        endContact: normalizeBrazilWhatsapp(form.get("endContact") || client.config?.videoTemplate?.whatsappNumber || ""),
        renderProfile: String(form.get("renderProfile") || "") === "quality" ? "quality" : "fast",
        creationMode: String(form.get("creationMode") || "") === "edit" ? "edit" : "auto",
        composition: normalizeVideoComposition(parseJson(String(form.get("composition") || "{}"), {}))
      };
      await env.DB.prepare(
        `INSERT INTO video_jobs(id, client_id, source_object_key, status, settings_json, result_json, created_at, updated_at)
         VALUES(?1, ?2, ?3, 'awaiting_configuration', ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        videoJobId,
        String(client.id),
        key,
        JSON.stringify(settings),
        JSON.stringify({ progress: 0, message: "Vídeo confirmado. Iniciando o modelo 9:16 com smartphone e sinopse.", error: "" })
      ).run();
      if (settings.creationMode === "auto") {
        try {
          await startGitHubVideoRender(env, client.id, videoJobId, settings);
          renderStarted = true;
        } catch (error) {
        renderError = error instanceof Error ? error.message : String(error);
        await env.DB.prepare(
          "UPDATE video_jobs SET status='failed',result_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
        ).bind(
          videoJobId,
          String(client.id),
          JSON.stringify({
            progress: 0,
            message: videoErrorMessages[renderError] || "A geração automática não iniciou. Selecione o título no catálogo ou tente outro vídeo.",
            error: renderError
          })
        ).run();
        }
      }
    }

    return json({
      ok: true,
      message: videoJobId
        ? (String(form.get("creationMode") || "") === "edit"
          ? "Vídeo enviado ao editor. Ajuste as cenas e clique em Gerar vídeo editável."
          : (renderStarted ? "Vídeo enviado. A geração 9:16 foi iniciada." : "Vídeo enviado, mas a geração não iniciou automaticamente. Use Gerar MP4 para tentar novamente."))
        : (purpose === "reference" ? "Mídia salva como referência de estilo." : "Mídia salva na biblioteca do cliente."),
      videoJobId,
      renderStarted,
      renderError,
      media: (await listClientMedia(env, client.id, url.origin)).find(item => item.key === key) || { key, url: url.origin + "/media/" + key }
    }, 201);
  }

  if (url.pathname === "/api/portal/media/use" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      return json(await useLibraryImageForPost(
        env,
        client,
        String(body.postId || ""),
        String(body.key || ""),
        url.origin
      ));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const status = code === "post_not_found" || code === "library_media_not_found" ? 404
        : code === "already_published" ? 409
        : code === "image_too_large" ? 413
        : code === "r2_unavailable" ? 503
        : 400;
      const messages = {
        library_media_image_required: "Escolha uma imagem da biblioteca. Vídeos permanecem armazenados para uso futuro.",
        already_published: "Esta postagem já foi publicada.",
        image_too_large: "A imagem deve ter no máximo 10 MB para ser aplicada a uma postagem."
      };
      return json({ error: code, message: messages[code] || "Não foi possível aplicar esta mídia à postagem." }, status);
    }
  }

  const mediaDeleteMatch = url.pathname.match(/^\/api\/portal\/media\/(.+)$/);
  if (mediaDeleteMatch && request.method === "DELETE") {
    let key = "";
    try { key = decodeURIComponent(mediaDeleteMatch[1]); } catch {}
    const prefix = "library/" + String(client.id) + "/";
    if (!key.startsWith(prefix) || key.includes("..") || key.includes("\\")) {
      return json({ error: "not_found" }, 404);
    }
    await env.MEDIA?.delete(key);
    return json({ ok: true, deleted: true });
  }

  // Situação do auto-responder de comentários do próprio cliente.
  if (url.pathname === "/api/portal/autoreply-status" && request.method === "GET") {
    return json({ ok: true, ...(await commentAutoReplyStatus(env, client.id)) });
  }

  // Números do Instagram do cliente (conta e por post), com cache de 30 min.
  if (url.pathname === "/api/portal/insights" && request.method === "GET") {
    return json(await clientInsights(env, client, { fetchSnapshot: instagramSnapshot }));
  }

  // Contato do suporte (WhatsApp do dono da agência) para o botão "Falar com a gente".
  if (url.pathname === "/api/portal/contact" && request.method === "GET") {
    const owner = { id: "primeiro-teste", name: "Flow Arts", config: {} };
    return json({ ok: true, whatsapp: whatsappLink(owner, "Olá! Sou cliente (" + String(client.name || client.id) + ") e preciso de ajuda.") });
  }

  if (url.pathname === "/api/portal/posts" && request.method === "GET") {
    return json({ ok: true, posts: await listPosts(env, client.id) });
  }

  if (url.pathname === "/api/portal/calendar" && request.method === "GET") {
    return json({ ok: true, ...campaignCalendar(client.id, url.searchParams.get("month")) });
  }

  const postDecisionMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/decision$/);
  if (postDecisionMatch && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      return json(await decidePost(env, client, decodeURIComponent(postDecisionMatch[1]), body.decision));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      return json({ error: code, message: MANUAL_CAROUSEL_MESSAGES[code] }, code === "not_found" ? 404 : 400);
    }
  }

  // Cliente envia conteúdo pronto (feed, carrossel, reels ou stories), já com dia e hora.
  if (url.pathname === "/api/portal/uploads" && request.method === "POST") {
    try {
      const form = await request.formData().catch(() => null);
      if (!form) throw new Error("type_invalid");
      return json(await createClientUpload(env, client, form), 201);
    } catch (error) {
      const code = String(error?.message || error).slice(0, 60);
      return json({ error: code, message: CLIENT_UPLOAD_MESSAGES[code] || "Não deu para enviar. Tente de novo." }, 400);
    }
  }

  // Cliente escolhe (ou troca) o dia e a hora de um post ainda não publicado.
  const postScheduleMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/schedule$/);
  if (postScheduleMatch && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      return json(await schedulePost(env, client, decodeURIComponent(postScheduleMatch[1]), body.date, body.time));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      return json({ error: code, message: MANUAL_CAROUSEL_MESSAGES[code] || "Não foi possível salvar a data." }, code === "not_found" ? 404 : 400);
    }
  }

  const postRevisionMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/revision$/);
  if (postRevisionMatch && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      return json(await requestPostRevision(env, client, decodeURIComponent(postRevisionMatch[1]), body.instructions));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const messages = {
        revision_instructions_required: "Explique o que precisa ser corrigido.",
        already_published: "Esta postagem já foi publicada.",
        publishing_in_progress: "A postagem já está sendo publicada."
      };
      return json({ error: code, message: messages[code] || "Não foi possível pedir a correção." }, code === "post_not_found" ? 404 : 400);
    }
  }

  const postCancelMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/cancel$/);
  if (postCancelMatch && request.method === "POST") {
    try {
      return json(await cancelPost(env, client, decodeURIComponent(postCancelMatch[1])));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const status = code === "post_not_found" ? 404
        : ["already_published", "publishing_in_progress"].includes(code) ? 409
        : 400;
      const messages = {
        already_published: "A postagem já foi publicada. Abra no Instagram para gerenciá-la.",
        publishing_in_progress: "A postagem já está em processo de publicação."
      };
      return json({ error: code, message: messages[code] || "Não foi possível cancelar esta postagem." }, status);
    }
  }

  const postContentMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/content$/);
  if (postContentMatch && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      return json(await saveOwnPostContent(env, client, decodeURIComponent(postContentMatch[1]), body, url.origin));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const status = code === "post_not_found" ? 404
        : code === "r2_unavailable" ? 503
        : code === "image_too_large" ? 413
        : 400;
      return json({ error: code, message: code === "r2_unavailable" ? "O armazenamento de mídia do NEXUS ainda não está disponível." : code }, status);
    }
  }

  const postManualMatch = url.pathname.match(/^\/api\/portal\/posts\/([^/]+)\/manual$/);
  if (postManualMatch && request.method === "POST") {
    try {
      return json(await publishPostNow(env, client, decodeURIComponent(postManualMatch[1])));
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      return json({
        error: code,
        message: error?.messageForUser || code,
        post: error?.post || null
      }, Number(error?.status || (code === "post_not_found" ? 404 : 400)));
    }
  }


  if (url.pathname === "/api/portal/agent-core" && request.method === "GET") {
    const [state, executions] = await Promise.all([
      agentCoreState(env, client.id),
      agentExecutions(env, client.id, 60)
    ]);
    const pendingRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM post_ledger WHERE client_id = ?1 AND approval_status = 'pending'"
    ).bind(client.id).first();
    const correctionRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM post_ledger WHERE client_id = ?1 AND approval_status = 'correction_requested'"
    ).bind(client.id).first();
    const cycle = await env.DB.prepare("SELECT id,status,last_error,updated_at FROM scheduled_jobs WHERE client_id=?1 AND kind='agent-core-cycle' ORDER BY updated_at DESC LIMIT 1").bind(client.id).first();
    return json({
      ok: true,
      modules: AGENT_CORE_MODULES,
      config: normalizeAgentCoreConfig(client),
      state,
      executions,
      cycle: cycle ? { id: cycle.id, status: cycle.status, error: cycle.last_error || "", updatedAt: cycle.updated_at } : null,
      pendingApproval: Number(pendingRow?.count || 0),
      correctionRequested: Number(correctionRow?.count || 0)
    });
  }

  if (url.pathname === "/api/portal/agent-core/run" && request.method === "POST") {
    const queued = await enqueue(env, client.id, "agent-core-cycle", new Date(), { trigger: "manual", agent: "all" });
    ctx.waitUntil(processDueJobs(env, new Date(), { clientId: client.id, kind: "agent-core-cycle" }).catch(error => console.error("portal_cycle_failed", { clientId: client.id, code: String(error?.message || "cycle_failed").slice(0, 120) })));
    return json({ ok: true, queued, message: queued ? "Ciclo completo agendado. Acompanhe os resultados dos agentes." : "Já existe um ciclo pendente ou em execução para esta conta." }, 202);
  }

  if (url.pathname === "/api/portal/agent-core" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      const config = await saveAgentCoreConfig(env, client.id, body);
      const updated = await getClient(env, client.id);
      return json({ ok: true, config, client: portalClientView(updated) });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }

  if (url.pathname === "/api/portal/workspace" && request.method === "GET") {
    return json(await masterWorkspace(env, client.id));
  }

  if (url.pathname === "/api/portal/directives" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    try {
      const directive = await addDirective(env, client.id, {
        ...body,
        author: "CLIENT",
        appliesTo: Array.isArray(body.appliesTo) && body.appliesTo.length ? body.appliesTo : ["all"]
      });
      return json({ ok: true, directive }, 201);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }

  if (url.pathname === "/api/portal/campaigns" && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    try {
      const campaign = await createCampaign(env, client.id, {
        title: form?.get("title"),
        brief: form?.get("brief"),
        startDate: form?.get("startDate"),
        file: form?.get("creative")
      });
      return json({ ok: true, campaign }, 201);
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const status = code === "creative_too_large" ? 413 : code === "r2_unavailable" ? 503 : 400;
      return json({ error: code }, status);
    }
  }

  if (url.pathname === "/api/portal/lead-hunter" && request.method === "GET") {
    return json(await leadHunterView(env, client));
  }

  if (url.pathname === "/api/portal/lead-hunter/config" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const config = await saveLeadHunterConfig(env, client, body);
    const summary = await leadHunterSummary(env, client.id);
    return json({ ok: true, config, summary });
  }

  if (url.pathname === "/api/portal/lead-hunter/run" && request.method === "POST") {
    try {
      return json(await runLeadHunter(env, client.id, { trigger: "manual" }));
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }

  const discardMatch = url.pathname.match(/^\/api\/portal\/lead-hunter\/leads\/([^/]+)\/discard$/);
  if (discardMatch && request.method === "POST") {
    try {
      const view = await discardLead(env, client.id, decodeURIComponent(discardMatch[1]));
      return json({ ok: true, view });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }
  if (url.pathname === "/api/portal/leads" && request.method === "GET") {
    const [summary, leads] = await Promise.all([
      leadHunterSummary(env, client.id),
      leadsForClient(env, client.id, 200)
    ]);
    return json({ ok: true, summary, leads, source: "cloudflare-d1" });
  }

  if (
    url.pathname === "/api/portal/connect/openai"
    && (request.method === "GET" || request.method === "POST")
  ) {
    return json({
      ok: true,
      managed: true,
      source: client.id === String(env.RAGNAR_CLIENT_ID || "ragnar-one")
        ? "ragnar-exclusive"
        : "shared"
    });
  }

  return json({
    error: "not_migrated_yet",
    runtime: "cloudflare-workers",
    path: url.pathname
  }, 501);
}
