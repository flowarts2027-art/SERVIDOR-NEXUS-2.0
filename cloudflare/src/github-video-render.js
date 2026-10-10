import { catalogMetadata, portugueseTrailerScore, catalogIdentityConfidence, youtubeUrl } from './video-catalog.js';
import { officialMovieFromTrailer } from './official-movie-poster.js';
import { confirmedVideoSource, videoErrorMessages } from './video-source.js';
import { readVerifiedPoster, rememberVerifiedPoster } from './video-poster-library.js';
import { readRelatedTitles, rememberRelatedTitles } from './video-related-library.js';
import { enrichVerifiedFilmPresentation } from './video-metadata-enrichment.js';
function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function normalizeRenderComposition(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const trimStart = Math.max(0, Number(source.trimStart || 0) || 0);
  const trimEnd = Math.max(0, Number(source.trimEnd || 0) || 0);
  return {
    trimStart,
    trimEnd: trimEnd > trimStart ? trimEnd : 0,
    customText: String(source.customText || "").trim().slice(0, 280),
    cta: String(source.cta || "").trim().slice(0, 120),
    framePreset: ["nexus","minimal","cinema"].includes(String(source.framePreset || "")) ? String(source.framePreset) : "nexus",
    logoPosition: ["top-left","top-center","top-right","center-left","center","center-right","bottom-left","bottom-center","bottom-right"].includes(String(source.logoPosition || "")) ? String(source.logoPosition) : "top-left",
    logoScale: Math.max(60, Math.min(180, Number(source.logoScale || 100) || 100)),
    logoEffect: ["none","blink","slide","spin"].includes(String(source.logoEffect || "")) ? String(source.logoEffect) : "none",
    showPoster: true,
    showOverview: source.showOverview !== false,
    showCast: source.showCast !== false,
    overlays: Array.isArray(source.overlays) ? source.overlays.slice(0, 16).filter(
      layer => layer && ["text", "emoji"].includes(layer.type) && typeof layer.text === "string" &&
      layer.text.trim().length > 0 && Number(layer.end) > Number(layer.start)
    ).map(layer => ({
      id: String(layer.id || "").slice(0, 96),
      type: layer.type,
      text: layer.text.slice(0, layer.type === "emoji" ? 24 : 280),
      x: Math.max(0, Math.min(100, Number(layer.x) || 0)),
      y: Math.max(0, Math.min(100, Number(layer.y) || 0)),
      scale: Math.max(0.2, Math.min(3, Number(layer.scale) || 1)),
      rotation: Math.max(-180, Math.min(180, Number(layer.rotation) || 0)),
      opacity: Math.max(0, Math.min(1, Number(layer.opacity) || 1)),
      fontSize: Math.max(8, Math.min(90, Number(layer.fontSize) || 26)),
      color: /^#[0-9a-f]{6}$/i.test(layer.color || "") ? layer.color : "#ffffff",
      bold: layer.bold === true, italic: layer.italic === true, underline: layer.underline === true,
      effect: ["none","blink","fade","pulse","bounce","slide","spin","float","zoom","glow"].includes(layer.effect) ? layer.effect : "none",
      start: Math.max(0, Math.min(86400, Number(layer.start) || 0)),
      end: Math.max(0, Math.min(86400, Number(layer.end) || 0))
    })) : []
  };
}

async function loadJob(env, jobId, clientId) {
  return env.DB.prepare(
    "SELECT id,client_id,source_object_key,status,settings_json,result_json FROM video_jobs WHERE id=?1 AND client_id=?2 LIMIT 1"
  ).bind(String(jobId), String(clientId)).first();
}

function validRenderToken(row, token) {
  if (!row || !token) return false;
  const settings = parseJson(row.settings_json, {});
  return Boolean(settings.githubRenderToken && String(settings.githubRenderToken) === String(token));
}

function clipKeyPrefix(clientId) {
  return "videos/" + String(clientId).replace(/[^a-zA-Z0-9_-]+/g, "-") + "/clips/";
}


function sourceKeyPrefix(clientId) {
  return "videos/" + String(clientId).replace(/[^a-zA-Z0-9_-]+/g, "-") + "/sources/";
}

async function failAutoRender(env, row, clientId, jobId, settings, code) {
  const result = parseJson(row?.result_json, {});
  const nextSettings = { ...(settings || {}) };
  delete nextSettings.githubRenderToken;
  nextSettings.githubRenderState = "failed";
  nextSettings.githubRenderUpdatedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
  ).bind(
    String(jobId),
    String(clientId),
    JSON.stringify(nextSettings),
    JSON.stringify({
      ...result,
      progress: 0,
      message: videoErrorMessages[code] || "A geração automática não iniciou. Tente novamente ou escolha outro vídeo.",
      error: String(code || "video_auto_render_failed").slice(0, 500)
    })
  ).run();
}

function validIngestToken(row, token) {
  if (!row || !token) return false;
  const settings = parseJson(row.settings_json, {});
  return Boolean(settings.ingestCallbackToken && String(settings.ingestCallbackToken) === String(token));
}

function validLocalUploadTicket(row, token) {
  if (!row || !token) return false;
  const settings = parseJson(row.settings_json, {});
  const expiresAt = Date.parse(String(settings.localUploadExpiresAt || ""));
  return Boolean(
    settings.localUploadTicket &&
    String(settings.localUploadTicket) === String(token) &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

export async function retryFailedYoutubeIngestWithLocalHelper(env, clientId, jobId) {
  const row = await loadJob(env, jobId, clientId);
  if (!row) throw new Error("video_not_found");
  if (row.status !== "failed" || row.source_object_key) throw new Error("video_local_retry_unavailable");
  const settings = parseJson(row.settings_json, {});
  if (settings.sourceProvider !== "youtube") throw new Error("video_local_retry_unavailable");
  const sourceUrl = youtubeUrl(settings.selectedYoutubeUrl || settings.sourceUrl);
  if (!sourceUrl) throw new Error("video_local_retry_unavailable");

  // Recover the original job, preserving its poster, cast, synopsis and branding.
  // One-time ticket belongs only to this client and cannot reuse an old upload.
  const next = {
    ...settings,
    sourceUrl,
    ingestTransport: "local-helper",
    localRetryAfterYoutubeBlock: true,
    localUploadTicket: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    localUploadExpiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
  };
  for (const field of [
    "ingestCallbackToken", "localUploadConsumedAt", "localHelperStage",
    "localHelperUpdatedAt", "localHelperFailure", "serverFallbackFailure"
  ]) delete next[field];
  const result = parseJson(row.result_json, {});
  const updated = await env.DB.prepare(
    "UPDATE video_jobs SET status='importing',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
    "WHERE id=?1 AND client_id=?2 AND status='failed' AND settings_json=?5 " +
    "AND (source_object_key IS NULL OR source_object_key='')"
  ).bind(
    String(jobId), String(clientId), JSON.stringify(next),
    JSON.stringify({ ...result, progress: 5, error: "", message: "Aguardando o Auxiliar NEXUS baixar o trailer no PC." }),
    row.settings_json
  ).run();
  if (!updated?.meta?.changes) throw new Error("video_local_retry_conflict");
  return {
    sourceUrl,
    jobId: String(jobId),
    clientId: String(clientId),
    uploadTicket: next.localUploadTicket,
    callbackBase: String(env.PUBLIC_BASE_URL || "https://servidor-nexus.diamantehinode2015.workers.dev").trim().replace(/[/]+$/, "")
  };
}

export const LOCAL_FALLBACK_NOTICE = "Auxiliar local indisponível. Continuando pelo servidor.";

export async function recoverLocalIngestViaServer(env, clientId, jobId, localReason) {
  const reason = String(localReason || "local_helper_unavailable").trim().slice(0, 300) || "local_helper_unavailable";
  const row = await loadJob(env, jobId, clientId);
  if (!row) return { recovered: false, ignored: true, reason: "video_not_found" };
  if (row.status !== "importing") return { recovered: false, ignored: true, reason: "status_" + row.status, status: row.status };

  const settings = parseJson(row.settings_json, {});
  if (settings.ingestTransport !== "local-helper") {
    return { recovered: false, ignored: true, reason: "transport_" + (settings.ingestTransport || "unknown"), status: row.status };
  }
  if (settings.localUploadConsumedAt) {
    const next = { ...settings, localHelperFailure: reason, localHelperFailedAt: new Date().toISOString() };
    delete next.localUploadTicket;
    delete next.localUploadExpiresAt;
    const failure = reason.startsWith("local_upload_stalled") ? "local_upload_stalled" : "local_upload_interrupted";
    const original = parseJson(row.result_json, {});
    const update = await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
      "WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5"
    ).bind(String(jobId), String(clientId), JSON.stringify(next),
      JSON.stringify({ ...original, progress: 0, message: videoErrorMessages[failure], error: failure }),
      row.settings_json).run();
    return update?.meta?.changes
      ? { recovered: false, failed: true, reason: failure }
      : { recovered: false, ignored: true, reason: "upload_state_changed" };
  }

  const previousResult = parseJson(row.result_json, {});

  // A known YouTube authentication failure must not start the same blocked
  // GitHub downloader again when a retry on the PC fails its handoff.
  if (settings.localRetryAfterYoutubeBlock === true) {
    const next = { ...settings, localHelperFailure: reason, localHelperFailedAt: new Date().toISOString() };
    delete next.localUploadTicket;
    delete next.localUploadExpiresAt;
    const updated = await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
      "WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5"
    ).bind(
      String(jobId), String(clientId), JSON.stringify(next),
      JSON.stringify({ ...previousResult, progress: 0, error: "local_helper_retry_failed", message: videoErrorMessages.local_helper_retry_failed }),
      row.settings_json
    ).run();
    return updated?.meta?.changes
      ? { recovered: false, failed: true, requiresLocalHelper: true, reason: "local_helper_retry_failed" }
      : { recovered: false, ignored: true, reason: "retry_state_changed" };
  }

  if (settings.sourceProvider === "youtube") {
    const next = { ...settings, localHelperFailure: reason, localHelperFailedAt: new Date().toISOString() };
    delete next.localUploadTicket;
    delete next.localUploadExpiresAt;
    const updated = await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
      "WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5"
    ).bind(
      String(jobId), String(clientId), JSON.stringify(next),
      JSON.stringify({ ...previousResult, progress: 0, error: "local_helper_required", message: videoErrorMessages.local_helper_required }),
      row.settings_json
    ).run();
    return updated?.meta?.changes
      ? { recovered: false, failed: true, requiresLocalHelper: true, reason: "local_helper_required" }
      : { recovered: false, ignored: true, reason: "youtube_local_state_changed" };
  }

  // Direct catalog sources can still use the GitHub/dedicated downloader as a
  // fallback. Raw YouTube local-helper jobs stop above to avoid anti-bot loops.

  const next = { ...settings };
  delete next.localUploadTicket;
  delete next.localUploadExpiresAt;
  next.ingestTransport = "server-fallback";
  next.localHelperFailure = reason;
  next.localHelperFailedAt = new Date().toISOString();

  const claim = await env.DB.prepare(
    "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5"
  ).bind(
    String(jobId),
    String(clientId),
    JSON.stringify(next),
    JSON.stringify({ ...previousResult, progress: Math.max(5, Number(previousResult.progress || 0)), error: "", message: LOCAL_FALLBACK_NOTICE }),
    row.settings_json
  ).run();
  if (!claim?.meta?.changes) return { recovered: false, ignored: true, reason: "already_recovered", status: row.status };

  try {
    const started = await startYouTubeVideoIngest(env, clientId, jobId);
    return { recovered: true, jobId, transport: started?.transport || "server-fallback" };
  } catch (error) {
    const serverReason = String(error?.message || error || "server_fallback_failed").slice(0, 300);
    const latest = (await loadJob(env, jobId, clientId)) || row;
    const failedSettings = { ...parseJson(latest.settings_json, next), serverFallbackFailure: serverReason, serverFallbackFailedAt: new Date().toISOString() };
    delete failedSettings.ingestCallbackToken;
    await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status IN ('importing','failed')"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(failedSettings),
      JSON.stringify({
        ...previousResult,
        progress: 0,
        message: "Falharam o auxiliar local e a recuperação pelo servidor.",
        error: ("local=" + reason + "; server=" + serverReason).slice(0, 500)
      })
    ).run();
    return { recovered: false, failed: true, reason: serverReason };
  }
}

function timestampMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return NaN;
  return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw.replace(" ", "T") + "Z");
}

// R2 ingestion is a whole-file HTTP stream: only confirmed bytes sent by
// the Windows helper are shown, never fabricated FFmpeg render progress.
export function localUploadReceptionProgress(sent, total, previous = 12) {
  const bytes = Number(sent), max = Number(total);
  const last = Number(previous);
  if (!Number.isSafeInteger(bytes) || !Number.isSafeInteger(max) ||
      bytes < 0 || max < 1 || max > 95 * 1024 * 1024 || bytes > max) {
    return Math.max(12, Math.min(19, Number.isFinite(last) ? last : 12));
  }
  return Math.min(19, Math.max(12, Number.isFinite(last) ? last : 12,
    12 + Math.floor(7 * bytes / max)));
}

export const LOCAL_HELPER_NO_RESPONSE_MS = 90 * 1000;
export const LOCAL_HELPER_STALLED_MS = 10 * 60 * 1000;

export function localHelperStaleReason(settings, updatedAt, now = Date.now()) {
  if (!settings || settings.ingestTransport !== "local-helper") return "";
  if (settings.localUploadConsumedAt) {
    // A confirmed R2 upload has a Worker claim. A lost TCP connection must
    // not leave the job 'importing' forever: rely on authenticated byte heartbeats.
    const activity = timestampMs(settings.localHelperUpdatedAt) ||
      timestampMs(settings.localUploadConsumedAt);
    return Number.isFinite(activity) && now - activity > 8 * 60 * 1000
      ? "local_upload_stalled" : "";
  }
  if (settings.localHelperStage) {
    const last = timestampMs(settings.localHelperUpdatedAt);
    if (Number.isFinite(last) && now - last > LOCAL_HELPER_STALLED_MS) return "local_helper_stalled_after_" + String(settings.localHelperStage).toLowerCase().replace(/[^a-z0-9]+/g, "_");
    return "";
  }
  const since = timestampMs(updatedAt);
  return Number.isFinite(since) && now - since > LOCAL_HELPER_NO_RESPONSE_MS ? "local_helper_no_response" : "";
}

export function ingestTimeoutDetail(settings = {}) {
  const parts = [];
  if (settings.ingestTransport) parts.push("transport=" + settings.ingestTransport);
  if (settings.localHelperFailure) parts.push("local=" + settings.localHelperFailure);
  return parts.length ? "; " + parts.join("; ") : "";
}

export async function startYouTubeVideoIngest(env, clientId, jobId) {
  const ghToken = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!ghToken) throw new Error("github_actions_token_missing");

  const row = await loadJob(env, jobId, clientId);
  if (!row) throw new Error("video_not_found");
  const settings = parseJson(row.settings_json, {});
  const result = parseJson(row.result_json, {});
  const sourceUrl = String(settings.sourceUrl || "").trim();
  if (!sourceUrl) throw new Error("video_source_missing");

  settings.ingestStartedAt = new Date().toISOString();
  settings.ingestCallbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const fallbackNotice = settings.localHelperFailure ? LOCAL_FALLBACK_NOTICE + " " : "";

  await env.DB.prepare(
    "UPDATE video_jobs SET status='importing',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
  ).bind(
    String(jobId),
    String(clientId),
    JSON.stringify(settings),
    JSON.stringify({
      ...result,
      progress: 10,
      message: fallbackNotice + (settings.sourceProvider === "catalog-preview"
        ? (settings.downloadOnly ? "Baixando a fonte oficial direta para o NEXUS." : "Baixando a fonte oficial direta para aplicar o modelo 9:16.")
        : (settings.downloadOnly ? "Baixando o trailer escolhido do YouTube para o NEXUS." : "Baixando o vídeo do YouTube para aplicar o modelo padrão 9:16.")),
      error: ""
    })
  ).run();

  const dedicatedDownloader = String(env.NEXUS_DOWNLOADER_URL || "").trim().replace(/\/+$/, "");
  const dedicatedSecret = String(env.NEXUS_DOWNLOADER_SECRET || "").trim();
  if (settings.sourceProvider !== "catalog-preview" && dedicatedDownloader && dedicatedSecret) {
    try {
      const callbackBase = String(env.PUBLIC_BASE_URL || "https://servidor-nexus.diamantehinode2015.workers.dev").trim().replace(/\/+$/, "");
      const dedicatedResponse = await fetch(dedicatedDownloader + "/ingest", {
        method: "POST",
        headers: {
          authorization: "Bearer " + dedicatedSecret,
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "NEXUS-Cloudflare-Worker"
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          source_url: sourceUrl,
          job_id: String(jobId),
          client_id: String(clientId),
          callback_token: settings.ingestCallbackToken,
          callback_base: callbackBase,
          title: String(settings.contentTitle || settings.displayName || "video-youtube").slice(0, 180)
        })
      });
      if (dedicatedResponse.status === 202) {
        settings.ingestTransport = "dedicated-downloader";
        await env.DB.prepare(
          "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing'"
        ).bind(
          String(jobId),
          String(clientId),
          JSON.stringify(settings),
          JSON.stringify({
            ...result,
            progress: 10,
            message: settings.downloadOnly
              ? "Importador dedicado recebeu o trailer. Preparando o MP4 para download."
              : "Importador dedicado recebeu o trailer. A geração 9:16 continuará automaticamente.",
            error: ""
          })
        ).run();
        return { ok: true, jobId, transport: "dedicated-downloader" };
      }
      console.warn("dedicated_downloader_rejected", { status: dedicatedResponse.status, jobId: String(jobId) });
    } catch (error) {
      console.warn("dedicated_downloader_unavailable", {
        jobId: String(jobId),
        code: String(error?.name || error?.message || "unknown").slice(0, 120)
      });
    }
  }

  const repo = String(env.GITHUB_INGEST_REPOSITORY || "globalplay27/SERVIDOR-GLOBAL-PLAY");
  const [owner, name] = repo.split("/");
  let response;
  try {
    response = await fetch(`https://api.github.com/repos/${owner}/${name}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ghToken}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "NEXUS-Cloudflare-Worker"
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        event_type: "video-youtube-ingest",
        client_payload: {
          job_id: String(jobId),
          client_id: String(clientId),
          callback_token: settings.ingestCallbackToken,
          source_url: sourceUrl,
          source_kind: settings.sourceProvider === "catalog-preview" ? "catalog-preview" : "youtube",
          title: String(settings.contentTitle || settings.displayName || "video-youtube").slice(0, 180)
        }
      })
    });
  } catch (error) {
    const code = ["TimeoutError", "AbortError"].includes(error?.name)
      ? "youtube_ingest_dispatch_timeout"
      : "youtube_ingest_dispatch_transport_failed";
    delete settings.ingestCallbackToken;
    await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing'"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({ ...result, progress: 0, message: "Falha ao iniciar o download do YouTube.", error: code })
    ).run();
    throw new Error(code);
  }

  if (response.status !== 204) {
    const detail = (await response.text().catch(() => "")).slice(0, 250);
    const code = "youtube_ingest_dispatch_" + response.status;
    delete settings.ingestCallbackToken;
    await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing'"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({ ...result, progress: 0, message: "GitHub recusou o download do YouTube.", error: (code + ":" + detail).slice(0, 500) })
    ).run();
    throw new Error(code);
  }

  return { ok: true, jobId };
}

export async function startGitHubVideoRender(env, clientId, jobId, patch = {}) {
  const ghToken = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!ghToken) throw new Error("github_actions_token_missing");

  const row = await loadJob(env, jobId, clientId);
  if (!row) throw new Error("video_not_found");
  if (!row.source_object_key) throw new Error("video_source_missing");
  if (["importing", "cutting"].includes(row.status)) throw new Error("video_render_in_progress");
  await confirmedVideoSource(env, clientId, row.source_object_key);

  const settings = parseJson(row.settings_json, {});
  const result = parseJson(row.result_json, {});
  const renderProfile = String(patch.renderProfile || settings.renderProfile || "fast") === "quality" ? "quality" : "fast";
  const duration = null; // Always render the complete trailer.
  const composition = normalizeRenderComposition(patch.composition || settings.composition || {});

  // Recover publisher-confirmed identity for older jobs that stored broad
  // YouTube search text or retained the exact film title after import.
  const knownCatalogId = String(settings.catalogId || "");
  const publisherMovie = (!knownCatalogId || knownCatalogId === "sony:spider-man-brand-new-day-2026")
    ? officialMovieFromTrailer({
      title: String(settings.selectedYoutubeTitle
        ? (settings.requestedSearchTitle || settings.contentTitle || "")
        : (settings.contentTitle || settings.requestedSearchTitle || "")),
      youtubeTitle: String(settings.selectedYoutubeTitle || ""),
      type: /s[eé]rie|series|tv/i.test(String(settings.mediaType || "")) ? "series" : "movie"
    })
    : null;
  if (publisherMovie) {
    settings.contentTitle = publisherMovie.title;
    settings.catalogId = publisherMovie.id;
    settings.metadataIdentityTitle = publisherMovie.title;
    settings.metadataIdentityConfidence = 1;
    settings.movieMetadata = publisherMovie;
    settings.releaseYear = publisherMovie.year;
    settings.mediaType = publisherMovie.mediaType;
    settings.overview = publisherMovie.overview;
    if (settings.posterSource !== "manual") {
      settings.posterUrl = publisherMovie.posterUrl;
      settings.posterSource = "publisher-official";
    }
  }

  // Never allow poster/cast from a previous title to leak into the current job.
  const currentTitle = String(settings.contentTitle || "").trim();
  const metadataTitle = String(settings.movieMetadata?.title || "").trim();
  if (currentTitle && metadataTitle && catalogIdentityConfidence(currentTitle, metadataTitle) < 0.72) {
    const manualPoster = String(settings.posterSource || "") === "manual";
    if (!manualPoster) settings.posterUrl = "";
    settings.movieMetadata = {
      title: currentTitle,
      overview: String(settings.overview || "").trim(),
      year: String(settings.releaseYear || "").trim(),
      mediaType: String(settings.mediaType || "").trim(),
      posterUrl: manualPoster ? String(settings.posterUrl || "").trim() : "",
      cast: [],
      reviews: [],
      related: []
    };
    settings.metadataIdentityConfidence = 0;
  }

  // Real poster is selected before this step, but slow optional actor-photo
  // and related-cover lookups must not block /videos/youtube job creation.
  // They are resolved only after the original MP4 has been received in R2.
  if (String(settings.movieMetadata?.id || settings.catalogId || "") === "sony:spider-man-brand-new-day-2026") {
    try {
      settings.movieMetadata = await enrichVerifiedFilmPresentation(settings.movieMetadata || {});
    } catch (error) {
      console.warn("video_presentation_enrichment_unavailable", {
        jobId: String(jobId), code: String(error?.message || error).slice(0, 120)
      });
    }
  }

  const needsPoster = composition.showPoster && !String(settings.posterUrl || settings.movieMetadata?.posterUrl || "").trim();
  const currentCast = Array.isArray(settings.movieMetadata?.cast)
    ? settings.movieMetadata.cast.filter(person => String(person?.name || "").trim())
    : [];
  const needsCast = composition.showCast && !currentCast.length;

  if ((needsPoster || needsCast) && String(settings.contentTitle || "").trim()) {
    try {
      const type = /s[eé]rie|series|tv/i.test(String(settings.mediaType || "")) ? "series" : "movie";
      const catalogId = String(settings.movieMetadata?.id || settings.catalogId || "").trim();
      let refreshed;
      try {
        refreshed = await catalogMetadata(String(settings.contentTitle).trim(), type, catalogId);
      } catch (primaryError) {
        const fallbackTitle = String(settings.selectedYoutubeTitle || "").trim()
          .replace(/\s*[|\-–—:]\s*(?:trailer|teaser).*$/i, "")
          .replace(/\b(?:trailer|teaser|oficial|dublado|legendado|portugu[eê]s|pt[- ]?br)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        const authoritativeTitle = String(settings.contentTitle || settings.requestedSearchTitle || "").trim();
        if (!fallbackTitle
            || fallbackTitle.toLowerCase() === authoritativeTitle.toLowerCase()
            || catalogIdentityConfidence(authoritativeTitle, fallbackTitle) < 0.72) {
          throw primaryError;
        }
        refreshed = await catalogMetadata(fallbackTitle, type, "");
      }
      const refreshedConfidence = catalogIdentityConfidence(String(settings.contentTitle || "").trim(), String(refreshed?.title || "").trim());
      if (refreshedConfidence < 0.72) throw new Error("catalog_identity_mismatch");

      // A successful refresh replaces catalogue metadata instead of merging stale
      // cast/reviews/related from a prior title.
      settings.movieMetadata = {
        ...refreshed,
        cast: Array.isArray(refreshed?.cast) ? refreshed.cast : [],
        related: Array.isArray(refreshed?.related) ? refreshed.related : [],
        reviews: Array.isArray(refreshed?.reviews) ? refreshed.reviews : []
      };
      if (String(settings.posterSource || "") !== "manual") {
        settings.posterUrl = String(refreshed?.posterUrl || "").trim();
        settings.posterSource = settings.posterUrl ? "catalog" : "none";
      }
      settings.metadataIdentityTitle = String(refreshed?.title || settings.contentTitle || "").trim();
      settings.metadataIdentityConfidence = refreshedConfidence;
      if (refreshed?.overview) settings.overview = refreshed.overview;
      if (refreshed?.year) settings.releaseYear = refreshed.year;
      if (refreshed?.mediaType) settings.mediaType = refreshed.mediaType;
    } catch (error) {
      console.error("video_metadata_refresh_failed", {
        jobId: String(jobId),
        clientId: String(clientId),
        title: String(settings.contentTitle || "").slice(0, 120),
        error: String(error?.message || error).slice(0, 180)
      });
    }
  }

  const finalMetadataTitle = String(settings.movieMetadata?.title || "").trim();
  if (String(settings.contentTitle || "").trim() && finalMetadataTitle
      && catalogIdentityConfidence(String(settings.contentTitle).trim(), finalMetadataTitle) < 0.72) {
    if (String(settings.posterSource || "") !== "manual") settings.posterUrl = "";
    settings.movieMetadata = {
      title: String(settings.contentTitle || "").trim(),
      overview: String(settings.overview || "").trim(),
      year: String(settings.releaseYear || "").trim(),
      mediaType: String(settings.mediaType || "").trim(),
      posterUrl: String(settings.posterSource || "") === "manual" ? String(settings.posterUrl || "").trim() : "",
      cast: [],
      reviews: [],
      related: []
    };
  }

    const normalizedMediaType = String(settings.mediaType || settings.movieMetadata?.mediaType || "").trim().toLowerCase();
  const catalogBacked = /filme|movie|s[eé]rie|series|tv/.test(normalizedMediaType)
    || Boolean(String(settings.movieMetadata?.id || settings.catalogId || "").trim());

  if (!String(settings.contentTitle || "").trim()) {
    throw new Error("video_metadata_required");
  }

  if (composition.showOverview && !String(settings.overview || "").trim() && !composition.customText) {
    // Unidentified PC uploads must remain editable; render a title card
    // without inventing a synopsis or borrowing another title's metadata.
    composition.showOverview = false;
  }

  // Restore a verified poster from the shared R2 index before resorting to a
  // text-only card. A title without a verified identity never borrows a poster.
  const posterIdentity = {
    title: String(settings.movieMetadata?.title || settings.contentTitle || "").trim(),
    year: String(settings.movieMetadata?.year || settings.releaseYear || "").trim(),
    type: /s[eé]rie|series|tv/i.test(String(settings.mediaType || "")) ? "series" : "movie",
    catalogId: String(settings.movieMetadata?.id || settings.catalogId || "").trim()
  };
  const verifiedPoster = String(settings.posterUrl || settings.movieMetadata?.posterUrl || "").trim();
  if (!verifiedPoster) {
    const cachedPoster = await readVerifiedPoster(env, posterIdentity);
    if (cachedPoster) {
      settings.posterUrl = cachedPoster;
      settings.posterSource = "verified-library";
      settings.movieMetadata = { ...settings.movieMetadata, posterUrl: cachedPoster };
    } else {
      // No fake official poster. The renderer uses a branded text card instead.
      settings.posterUrl = "";
      settings.posterSource = "title-card";
    }
  } else if (settings.posterSource !== "manual") {
    await rememberVerifiedPoster(env, posterIdentity, verifiedPoster);
  }

  // Reuse per-title recommendations safely. No related card may borrow
  // the principal title's artwork or invent a clip from the current trailer.
  const freshRelated = Array.isArray(settings.movieMetadata?.related) ? settings.movieMetadata.related : [];
  const savedRelated = await readRelatedTitles(env, { ...posterIdentity, posterUrl: settings.posterUrl });
  if (freshRelated.length) {
    const persisted = await rememberRelatedTitles(env, { ...posterIdentity, posterUrl: settings.posterUrl }, freshRelated);
    if (!persisted && savedRelated.length) settings.movieMetadata.related = savedRelated;
  } else if (savedRelated.length) {
    settings.movieMetadata = { ...settings.movieMetadata, related: savedRelated };
  }

  const renderCast = Array.isArray(settings.movieMetadata?.cast)
    ? settings.movieMetadata.cast.filter(person => String(person?.name || "").trim())
    : [];
  if (composition.showCast && !renderCast.length) {
    composition.showCast = false;
  }
  const clips = Math.max(1, Math.min(12, Number(patch.clips || patch.requestedClips || settings.requestedClips || 3)));
  const outputFormat = ["reel","feed","square"].includes(String(patch.outputFormat || settings.outputFormat || "reel"))
    ? String(patch.outputFormat || settings.outputFormat || "reel") : "reel";
  const editStyle = String(patch.editStyle || settings.editStyle || "cinematic-card-v1") === "classic-cuts"
    ? "classic-cuts" : "cinematic-card-v1";

  Object.assign(settings, {
    goal: String(patch.goal || settings.goal || "viral").slice(0, 40),
    clipDuration: duration,
    requestedClips: clips,
    outputFormat,
    autoSubtitles: patch.autoSubtitles !== false,
    endText: String(patch.endText ?? settings.endText ?? "").trim().slice(0, 120),
    endContact: String(patch.endContact ?? settings.endContact ?? "").trim().slice(0, 120),
    editStyle,
    renderProfile,
    creationMode: patch.creationMode === "edit" ? "edit" : (settings.creationMode === "edit" ? "edit" : "auto"),
    composition,
    githubRenderStartedAt: new Date().toISOString(),
    githubRenderToken: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    githubRenderState: "dispatching",
    githubRenderUpdatedAt: new Date().toISOString()
  });

  const claim = await env.DB.prepare(
    "UPDATE video_jobs SET status='cutting',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status NOT IN ('importing','cutting')"
  ).bind(
    String(jobId),
    String(clientId),
    JSON.stringify(settings),
    JSON.stringify({
      ...result,
      clips: [],
      progress: 25,
      message: renderProfile === "quality" ? "Preparando render em 1080p." : "Preparando render rápido em 720p.",
      error: ""
    })
  ).run();
  if (!claim?.meta?.changes) throw new Error("video_render_in_progress");

  const repo = String(env.GITHUB_INGEST_REPOSITORY || "globalplay27/SERVIDOR-GLOBAL-PLAY");
  const [owner, name] = repo.split("/");
  let response;
  try { response = await fetch(`https://api.github.com/repos/${owner}/${name}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ghToken}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "NEXUS-Cloudflare-Worker"
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      event_type: "video-template-render",
      client_payload: {
        job_id: String(jobId),
        client_id: String(clientId),
        callback_token: settings.githubRenderToken,
        render: {
          title: String(settings.contentTitle || settings.displayName || "Conteúdo").slice(0, 180),
          source_title: String(settings.selectedYoutubeTitle || "").slice(0, 220),
          overview: String(settings.overview || "").slice(0, 1800),
          year: String(settings.releaseYear || "").slice(0, 12),
          media_type: String(settings.mediaType || "").slice(0, 24),
          poster_url: String(settings.posterUrl || "").slice(0, 1200),
          metadata: settings.movieMetadata || null,
          logo_enabled: settings.logoEnabled === true && Boolean(settings.logoObjectKey),
          duration,
          profile: renderProfile,
          edit_style: editStyle,
          end_text: String(settings.endText || "").slice(0, 120),
          end_contact: String(settings.endContact || "").slice(0, 120),
          creation_mode: settings.creationMode === "edit" ? "edit" : "auto",
          composition: settings.composition || normalizeRenderComposition({})
        }
      }
    })
  }); } catch (error) {
    const code = ["TimeoutError", "AbortError"].includes(error?.name) ? "github_render_dispatch_timeout" : "github_render_dispatch_transport_failed";
    settings.githubRenderState = "failed";
    delete settings.githubRenderToken;
    await env.DB.prepare("UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='cutting'")
      .bind(jobId, clientId, JSON.stringify(settings), JSON.stringify({ ...result, progress: 0, message: "Falha na conexão com o renderizador. Tente gerar novamente.", error: code })).run();
    throw new Error(code);
  }

  if (response.status !== 204) {
    const detail = (await response.text().catch(() => "")).slice(0, 250);
    console.error("video_render_dispatch_failed", { status: response.status, detail, repo, jobId: String(jobId), clientId: String(clientId) });
    settings.githubRenderState = "failed";
    await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({
        ...result,
        progress: 0,
        message: "Não foi possível iniciar a edição no GitHub.",
        error: ("github_render_dispatch_" + response.status + ":" + detail).slice(0, 500)
      })
    ).run();
    throw new Error("github_render_dispatch_failed");
  }

  settings.githubRenderState = "dispatched";
  settings.githubRenderUpdatedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
  ).bind(
    String(jobId),
    String(clientId),
    JSON.stringify(settings),
    // A 204 from repository_dispatch only means accepted by the GitHub API.
    // It does not mean the runner has started working; never show fake 38%.
    JSON.stringify({ ...result, progress: 28, message: "Comando aceito. Aguardando o GitHub iniciar o renderizador…", error: "" })
  ).run();

  return { ok: true, jobId };
}

export async function handleGitHubVideoRenderCallback(request, env, url) {
  if (!url.pathname.startsWith("/api/internal/video-render/") && !url.pathname.startsWith("/api/internal/video-ingest/") && !url.pathname.startsWith("/api/local-video-ingest/")) return null;

  const jobId = String(request.headers.get("x-nexus-job-id") || "").trim();
  const clientId = String(request.headers.get("x-nexus-client-id") || "").trim();
  const token = String(request.headers.get("x-nexus-callback-token") || "").trim();
  const row = await loadJob(env, jobId, clientId);

  if (url.pathname === "/api/local-video-ingest/status") {
    const ticket = String(request.headers.get("x-nexus-upload-ticket") || "").trim();
    if (request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    if (!row || !validLocalUploadTicket(row, ticket)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const stage = String(body.status || "").trim().toUpperCase();
    const allowed = new Set(["BAIXANDO", "VALIDANDO MP4", "ENVIANDO AO NEXUS", "FALHOU"]);
    if (!allowed.has(stage)) return Response.json({ error: "invalid_status" }, { status: 400 });

    if (stage === "FALHOU") {
      const recovery = await recoverLocalIngestViaServer(env, clientId, jobId, String(body.error || "local_helper_failed"));
      return Response.json({ ok: true, status: stage, fallbackStarted: recovery.recovered === true, ignored: recovery.ignored === true });
    }

    if (row.status !== "importing") {
      return Response.json({ ok: true, ignored: true, reason: "job_already_advanced" });
    }
    const settings = parseJson(row.settings_json, {});
    const result = parseJson(row.result_json, {});
    settings.localHelperStage = stage;
    settings.localHelperUpdatedAt = new Date().toISOString();

    const messages = {
      "BAIXANDO": "Baixando o vídeo no computador.",
      "VALIDANDO MP4": "Validando o MP4 no computador.",
      "ENVIANDO AO NEXUS": "Enviando o MP4 para o NEXUS.",
      "FALHOU": "O download ou envio pelo computador falhou."
    };
    const sent = Number(body.uploadedBytes || 0);
    const total = Number(body.totalBytes || 0);
    const uploading = stage === "ENVIANDO AO NEXUS";
    const confirmed = uploading ? localUploadReceptionProgress(sent, total, result.progress) : Number(result.progress || 0);
    const pct = uploading && total > 0 && sent >= 0 && sent <= total
      ? Math.min(100, Math.floor(100 * sent / total)) : null;
    const nextResult = {
      ...result,
      progress: confirmed,
      message: uploading && pct !== null
        ? "Enviando MP4 do computador: " + pct + "% dos bytes enviados. Aguardando confirmação do R2."
        : messages[stage],
      error: ""
    };
    await env.DB.prepare(
      "UPDATE video_jobs SET status='importing',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
      "WHERE id=?1 AND client_id=?2 AND status='importing'"
    ).bind(String(jobId), String(clientId), JSON.stringify(settings), JSON.stringify(nextResult)).run();
    return Response.json({ ok: true, status: stage });
  }

  if (url.pathname === "/api/local-video-ingest/upload") {
    const ticket = String(request.headers.get("x-nexus-upload-ticket") || "").trim();
    if (request.method !== "PUT") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    if (!row || !validLocalUploadTicket(row, ticket)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    if (!env.MEDIA || !request.body) {
      return new Response(JSON.stringify({ error: "r2_unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const declared = Number(request.headers.get("content-length") || 0);
    if (!declared || declared > 95 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: declared ? "video_too_large" : "video_size_required" }), {
        status: declared ? 413 : 400,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const originalSettingsJson = row.settings_json;
    const settings = parseJson(originalSettingsJson, {});
    const result = parseJson(row.result_json, {});
    if (row.status !== "importing" || settings.localUploadConsumedAt) {
      return Response.json({ error: "upload_ticket_already_used" }, { status: 409 });
    }
    // Preserve the secret *only during* the claimed upload so that its byte
    // heartbeats and error reports remain authenticated. A second PUT is
    // rejected because localUploadConsumedAt is set.
    settings.localUploadConsumedAt = new Date().toISOString();
    const claimedAt = settings.localUploadConsumedAt;
    const claimedSettingsJson = JSON.stringify(settings);
    const claim = await env.DB.prepare(
      "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing' AND settings_json=?5"
    ).bind(
      String(jobId),
      String(clientId),
      claimedSettingsJson,
      JSON.stringify({ ...result, progress: 12, message: "Autorização confirmada. Recebendo MP4 do computador.", error: "" }),
      originalSettingsJson
    ).run();
    if (!claim?.meta?.changes) {
      return new Response(JSON.stringify({ error: "upload_ticket_already_used" }), {
        status: 409,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const key = sourceKeyPrefix(clientId) + crypto.randomUUID() + ".mp4";
    try {
      const object = await env.MEDIA.put(key, request.body, {
        httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" },
        customMetadata: { clientId: String(clientId), jobId: String(jobId), kind: "video-source", source: "local-helper" }
      });
      if (!object) throw new Error("video_store_failed");
      await confirmedVideoSource(env, clientId, key, declared);
    } catch (error) {
      await env.MEDIA.delete?.(key).catch(() => {});
      await env.DB.prepare(
        "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP " +
        "WHERE id=?1 AND client_id=?2 AND status='importing' AND json_extract(settings_json,'$.localUploadConsumedAt')=?5"
      ).bind(
        String(jobId), String(clientId), originalSettingsJson,
        JSON.stringify({ ...result, progress: 0, message: "Envio interrompido. O MP4 continua no PC.", error: "local_upload_interrupted" }),
        claimedAt
      ).run();
      return new Response(JSON.stringify({ error: "local_upload_interrupted" }), {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    // Remove the ticket only once the object is confirmed in R2. This
    // conditional update prevents a stale TCP upload from resurrecting a job
    // already marked failed by the upload watchdog.
    delete settings.localUploadTicket;
    delete settings.localUploadExpiresAt;
    const completed = await env.DB.prepare(
      "UPDATE video_jobs SET source_object_key=?3,status='awaiting_configuration',settings_json=?4,result_json=?5,updated_at=CURRENT_TIMESTAMP " +
      "WHERE id=?1 AND client_id=?2 AND status='importing' AND json_extract(settings_json,'$.localUploadConsumedAt')=?6"
    ).bind(
      String(jobId), String(clientId), key, JSON.stringify(settings),
      JSON.stringify({ ...result, progress: 20, message: "MP4 recebido no R2. Iniciando geração 9:16.", error: "" }), claimedAt
    ).run();
    if (!completed?.meta?.changes) {
      await env.MEDIA.delete?.(key).catch(() => {});
      return Response.json({ error: "local_upload_expired" }, { status: 409 });
    }

    let renderStarted = false;
    const editable = settings.creationMode === "edit";
    if (!editable) {
      try {
        await startGitHubVideoRender(env, clientId, jobId, {
          ...settings,
          creationMode: "auto",
          composition: settings.composition,
          editStyle: "cinematic-card-v1",
          outputFormat: "reel",
          requestedClips: 1,
          clipDuration: null
        });
        renderStarted = true;
      } catch (error) {
        const code = error instanceof Error ? error.message : String(error);
        await env.DB.prepare(
          "UPDATE video_jobs SET status='failed',result_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
        ).bind(
          String(jobId),
          String(clientId),
          JSON.stringify({
            ...result,
            progress: 0,
            message: videoErrorMessages[code] || "O MP4 chegou, mas o render não iniciou.",
            error: String(code || "video_render_dispatch_failed").slice(0, 500)
          })
        ).run();
        console.error("local_helper_auto_render_failed", {
          jobId: String(jobId),
          clientId: String(clientId),
          error: String(code)
        });
      }
    } else {
      await env.DB.prepare(
        "UPDATE video_jobs SET result_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
      ).bind(
        String(jobId),
        String(clientId),
        JSON.stringify({ ...result, progress: 100, message: "MP4 recebido. Ajuste o corte no editor e clique em Gerar vídeo.", error: "" })
      ).run();
    }

    return new Response(JSON.stringify({ ok: true, jobId, objectKey: key, renderStarted, editable }), {
      status: 201,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (url.pathname.startsWith("/api/internal/video-ingest/")) {
    if (!row || !validIngestToken(row, token)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    if (url.pathname === "/api/internal/video-ingest/upload" && request.method === "PUT") {
      if (!env.MEDIA || !request.body) {
        return new Response(JSON.stringify({ error: "r2_unavailable" }), { status: 503, headers: { "content-type": "application/json" } });
      }
      const declared = Number(request.headers.get("content-length") || 0);
      if (!declared || declared > 95 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: declared ? "video_too_large" : "video_size_required" }), {
          status: declared ? 413 : 400,
          headers: { "content-type": "application/json" }
        });
      }

      const settings = parseJson(row.settings_json, {});
      const result = parseJson(row.result_json, {});
      const key = sourceKeyPrefix(clientId) + crypto.randomUUID() + ".mp4";
      const object = await env.MEDIA.put(key, request.body, {
        httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" },
        customMetadata: { clientId: String(clientId), jobId: String(jobId), kind: "video-source", source: settings.sourceProvider === "catalog-preview" ? "catalog-preview" : "youtube" }
      });
      if (!object) return Response.json({ error: "video_store_failed" }, { status: 500 });
      await confirmedVideoSource(env, clientId, key, declared);

      delete settings.ingestCallbackToken;
      const downloadOnly = settings.downloadOnly === true;
      await env.DB.prepare(
        "UPDATE video_jobs SET source_object_key=?3,status='awaiting_configuration',settings_json=?4,result_json=?5,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
      ).bind(
        String(jobId),
        String(clientId),
        key,
        JSON.stringify(settings),
        JSON.stringify({
          ...result,
          progress: downloadOnly ? 100 : 20,
          message: downloadOnly
            ? "Download concluído. Você pode baixar o original ou gerar o vídeo 9:16."
            : "Download concluído. Aplicando automaticamente o modelo padrão 9:16.",
          error: ""
        })
      ).run();

      let renderStarted = false;
      if (!downloadOnly) {
        try {
          await startGitHubVideoRender(env, clientId, jobId, {
            ...settings,
            editStyle: "cinematic-card-v1",
            outputFormat: "reel",
            requestedClips: 1,
            clipDuration: null
          });
          renderStarted = true;
        } catch (error) {
          const code = error instanceof Error ? error.message : String(error);
          await failAutoRender(env, row, clientId, jobId, settings, code);
          console.error("youtube_auto_render_failed", {
            jobId: String(jobId),
            clientId: String(clientId),
            error: String(code)
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, jobId, objectKey: key, renderStarted, downloadOnly }), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/api/internal/video-ingest/fail" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const settings = parseJson(row.settings_json, {});
      const result = parseJson(row.result_json, {});
      delete settings.ingestCallbackToken;
      await env.DB.prepare(
        "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
      ).bind(
        String(jobId),
        String(clientId),
        JSON.stringify(settings),
        JSON.stringify({ ...result, progress: 0, message: videoErrorMessages[body.error] || "A importação do vídeo do YouTube falhou. Use Enviar arquivo.", error: String(body.error || "youtube_ingest_failed").slice(0, 500) })
      ).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
  }

  if (!row || !validRenderToken(row, token)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (url.pathname === "/api/internal/video-render/progress" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const settings = parseJson(row.settings_json, {});
    const result = parseJson(row.result_json, {});
    const current = Number(result.progress || 0);
    const next = Math.max(current, Math.max(36, Math.min(98, Number(body.progress || current))));
    settings.githubRenderState = String(body.stage || "rendering").slice(0, 40);
    settings.githubRenderUpdatedAt = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE video_jobs SET settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='cutting'"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({ ...result, progress: next, message: String(body.message || result.message || "Renderizando vídeo.").slice(0, 180), error: "" })
    ).run();
    return Response.json({ ok: true, progress: next });
  }

  if (url.pathname === "/api/internal/video-render/search-results" && request.method === "POST") {
    const settings = parseJson(row.settings_json);
    if (!settings.searchOnly) return new Response("invalid_search_job", { status: 400 });
    const body = await request.json();
    const results = (Array.isArray(body.results) ? body.results : [])
      .filter(x => /^[a-zA-Z0-9_-]{11}$/.test(String(x.id || "")))
      .map(x => ({
        id: x.id,
        title: String(x.title || "").slice(0, 220),
        channel: String(x.channel || "").slice(0, 120),
        channelId: String(x.channelId || '').slice(0, 30),
        channelVerified: x.channelVerified === true,
        duration: Number(x.duration) || null,
        verticalCandidate: x.verticalCandidate === true,
        formatHint: x.verticalCandidate === true ? "vertical" : "standard",
        url: "https://www.youtube.com/watch?v=" + x.id,
        thumbnail: "https://i.ytimg.com/vi/" + x.id + "/hqdefault.jpg"
      }))
      .filter(x => portugueseTrailerScore(x) >= 0)
      .sort((a, b) => portugueseTrailerScore(b) - portugueseTrailerScore(a))
      .slice(0, 12);
    delete settings.githubRenderToken;
    await env.DB.prepare("UPDATE video_jobs SET status='search_results',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2")
      .bind(jobId, clientId, JSON.stringify(settings), JSON.stringify({ results })).run();
    return Response.json({ ok: true });
  }

  if (url.pathname === "/api/internal/video-render/poster" && request.method === "GET") {
    const settings = parseJson(row.settings_json, {});
    let key = "";
    try {
      const poster = new URL(String(settings.posterUrl || ""), url.origin);
      if (poster.pathname.startsWith("/media/")) key = decodeURIComponent(poster.pathname.slice(7));
    } catch {}
    if (!env.MEDIA || !key.startsWith("library/" + String(clientId) + "/") || key.includes("..") || key.includes("\\")) {
      return new Response(JSON.stringify({ error: "poster_not_found" }), { status: 404, headers: { "content-type": "application/json" } });
    }
    const object = await env.MEDIA.get(key);
    if (!object) return new Response(JSON.stringify({ error: "poster_not_found" }), { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, no-store");
    if (object.size) headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }

  if (url.pathname === "/api/internal/video-render/logo" && request.method === "GET") {
    const settings = parseJson(row.settings_json, {});
    const key = String(settings.logoObjectKey || "");
    const allowed = key.startsWith("branding/" + String(clientId) + "/") && !key.includes("..");
    if (!env.MEDIA || !settings.logoEnabled || !allowed) {
      return new Response(JSON.stringify({ error: "logo_not_found" }), { status: 404, headers: { "content-type": "application/json" } });
    }
    const object = await env.MEDIA.get(key);
    if (!object) return new Response(JSON.stringify({ error: "logo_not_found" }), { status: 404, headers: { "content-type": "application/json" } });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, no-store");
    if (object.size) headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }

  if (url.pathname === "/api/internal/video-render/source" && request.method === "GET") {
    if (!env.MEDIA || !row.source_object_key) {
      return new Response(JSON.stringify({ error: "video_source_missing" }), { status: 404, headers: { "content-type": "application/json" } });
    }
    const object = await env.MEDIA.get(String(row.source_object_key));
    if (!object) return new Response(JSON.stringify({ error: "video_source_missing" }), { status: 404, headers: { "content-type": "application/json" } });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, no-store");
    if (object.size) headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }

  if (url.pathname.startsWith("/api/internal/video-render/upload/") && !env.MEDIA) return new Response("r2_unavailable", { status: 503 });
  if (url.pathname === "/api/internal/video-render/upload/start" && request.method === "POST") {
    const settings = parseJson(row.settings_json);
    const clipId = "clip_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const key = clipKeyPrefix(clientId) + clipId + ".mp4";
    const upload = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" }, customMetadata: { clientId, jobId, kind: "video-clip" } });
    settings.renderUpload = { key, clipId, uploadId: upload.uploadId };
    await env.DB.prepare("UPDATE video_jobs SET settings_json=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2").bind(jobId, clientId, JSON.stringify(settings)).run();
    return Response.json({ ok: true });
  }
  if (url.pathname === "/api/internal/video-render/upload/part" && request.method === "PUT") {
    const upload = parseJson(row.settings_json).renderUpload;
    const number = Number(url.searchParams.get("part"));
    const size = Number(request.headers.get("content-length"));
    if (!upload?.key?.startsWith(clipKeyPrefix(clientId)) || !Number.isInteger(number) || number < 1 || number > 10000 || !size || size > 90 * 1024 * 1024) return new Response("invalid_part", { status: 400 });
    const part = await env.MEDIA.resumeMultipartUpload(upload.key, upload.uploadId).uploadPart(number, request.body);
    return Response.json(part);
  }
  if ((url.pathname === "/api/internal/video-render/upload" && request.method === "PUT") || (url.pathname === "/api/internal/video-render/upload/complete" && request.method === "POST")) {
    if (!env.MEDIA || !request.body) {
      return new Response(JSON.stringify({ error: "r2_unavailable" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    const multipart = url.pathname.endsWith("/complete");
    const declared = Number(request.headers.get("content-length") || 0);
    if (!multipart && (!declared || declared > 95 * 1024 * 1024)) {
      return new Response(JSON.stringify({ error: declared ? "video_too_large" : "video_size_required" }), {
        status: declared ? 413 : 400,
        headers: { "content-type": "application/json" }
      });
    }

    const settings = parseJson(row.settings_json, {});
    const result = parseJson(row.result_json, {});
    const clipId = multipart ? settings.renderUpload?.clipId : "clip_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const key = multipart ? settings.renderUpload?.key : clipKeyPrefix(clientId) + clipId + ".mp4";
    let object;
    if (multipart) {
      const upload = settings.renderUpload;
      const body = await request.json();
      if (!upload?.key?.startsWith(clipKeyPrefix(clientId)) || !Array.isArray(body.parts) || !body.parts.length || body.parts.length > 10000 || !body.parts.every((p, i) => p.partNumber === i + 1 && typeof p.etag === "string" && p.etag.length < 200)) return new Response("invalid_upload", { status: 400 });
      object = await env.MEDIA.resumeMultipartUpload(upload.key, upload.uploadId).complete(body.parts);
      delete settings.renderUpload;
    } else object = await env.MEDIA.put(key, request.body, {
      httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" },
      customMetadata: { clientId: String(clientId), jobId: String(jobId), kind: "video-clip", template: String(settings.editStyle || "cinematic-card-v1") }
    });
    if (!object) throw new Error("render_store_failed");
    const stored = await env.MEDIA.head(key);
    if (!stored || !Number(stored.size) || (object.size && Number(stored.size) !== Number(object.size))) throw new Error("render_store_unconfirmed");

    const clipSettings = {
      rank: 1,
      title: settings.contentTitle || settings.displayName || "Vídeo NEXUS",
      caption: settings.contentTitle || "",
      start: 0,
      end: Number(request.headers.get("x-nexus-duration") || settings.clipDuration || 0),
      endText: settings.endText || "",
      endContact: settings.endContact || "",
      templateStyle: settings.editStyle || "cinematic-card-v1",
      selectedForSchedule: false
    };
    const clipResult = {
      previewUrl: `/api/portal/videos/${encodeURIComponent(jobId)}/clips/${encodeURIComponent(clipId)}/media`,
      reason: settings.editStyle === "cinematic-card-v1"
        ? "Modelo cinematográfico NEXUS com vídeo, pôster e ficha visual."
        : "Vídeo completo gerado pelo NEXUS.",
      subtitlesApplied: false
    };

    await env.DB.prepare(
      `INSERT INTO video_clips(id,job_id,client_id,source_object_key,output_object_key,status,approval_status,publish_status,settings_json,result_json,created_at,updated_at)
       VALUES(?1,?2,?3,?4,?5,'ready','pending','draft',?6,?7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    ).bind(
      clipId,
      String(jobId),
      String(clientId),
      String(row.source_object_key),
      key,
      JSON.stringify(clipSettings),
      JSON.stringify(clipResult)
    ).run();

    settings.githubRenderState = "completed";
    delete settings.githubRenderToken;
    await env.DB.prepare(
      "UPDATE video_jobs SET status='ready',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({ ...result, progress: 100, message: "Vídeo 9:16 pronto para baixar.", error: "" })
    ).run();

    return new Response(JSON.stringify({ ok: true, jobId, clipId, objectKey: key }), {
      status: 201,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (url.pathname === "/api/internal/video-render/fail" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const settings = parseJson(row.settings_json, {});
    const result = parseJson(row.result_json, {});
    if (settings.renderUpload?.key?.startsWith(clipKeyPrefix(clientId))) {
      await env.MEDIA?.resumeMultipartUpload(settings.renderUpload.key, settings.renderUpload.uploadId).abort().catch(() => {});
      delete settings.renderUpload;
    }
    settings.githubRenderState = "failed";
    delete settings.githubRenderToken;
    await env.DB.prepare(
      "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2"
    ).bind(
      String(jobId),
      String(clientId),
      JSON.stringify(settings),
      JSON.stringify({
        ...result,
        progress: 0,
        message: body.error === "trailer_not_portuguese" ? "O áudio deste trailer não foi confirmado em português. Escolha outro trailer oficial dublado." : body.error === "trailer_not_official" ? "Este vídeo não foi confirmado como trailer de um canal oficial. Escolha outro resultado." : "A conversão do vídeo para 9:16 falhou.",
        error: String(body.error || "github_render_failed").slice(0, 500)
      })
    ).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
}
