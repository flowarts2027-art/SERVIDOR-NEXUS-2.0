import { SHOWCASE_CLIENT } from "./showcase-store.js";
import { DurableObject } from "cloudflare:workers";
import { openAIKeyStatus } from "./openai-routing.js";
import { openAIResponses, tokenUsageToday } from "./openai.js";
import { getState, putState, deleteState } from "./storage.js";
import { handlePortalApi } from "./portal.js";
import { handleGitHubVideoRenderCallback } from "./github-video-render.js";
import { handleMaster, masterLoginPage } from "./master.js";
import { runSchedulerTick, recordSchedulerFailure } from "./scheduler.js";
import { runCronIteration } from "./cron-runtime.js";
import { warmYoutubePosterLibrary } from "./youtube-poster-demand.js";
import { refreshSchedulerIfStale } from "./watchdog.js";
import { processDueJobs } from "./executor.js";
import { handleWhatsAppWebhook, handleWhatsAppProtected, whatsappConfigStatus } from "./whatsapp-agent.js";
import { instagramCredentialStatus } from "./instagram-credentials.js";
import { instagramMasterConfigStatus, handleInstagramOAuthCallback, handleInstagramComplianceRequest } from "./instagram.js";
import { masterCredentialsValid, createMasterSession, authenticatePortalUser, createPortalSession, masterSessionCookie, portalSessionCookie, loginRateLimitStatus, recordLoginFailure, clearLoginFailures, resolvePortalSession, resolveMasterSession } from "./auth.js";
import { autonomyOverallHealthy } from "./health-policy.js";
import { buildAutonomyHealthSummary } from "./autonomy-health-summary.js";
import { emergencyPublisherStatus, isD1Emergency, runEmergencyPublisher } from "./emergency-publisher.js";
import { emergencyPublisherDiagnostic } from "./emergency-publisher-diagnostic.js";
import { handleSocialFormatRenderCallback, handleCarouselRenderCallback } from "./format-builder.js";
import { runCommentAutoReplies, handleInstagramWebhook } from "./comment-autoreply.js";
import { handleGiftRequest } from "./gift.js";
import { runGiftInbox } from "./gift-dm.js";
import { fixGiftCtaInOpenPosts } from "./gift-cta-fix.js";
import { ensureDemoClient } from "./demo-client.js";
import { handleSiteHit, siteStats } from "./site-analytics.js";
import { handleProspectsRoute } from "./prospects.js";
import { handleCrmRoute } from "./crm.js";
import { canonicalSiteRedirect } from "./site-host.js";
import { handleCrmSendRoute } from "./crm-send.js";
import { handleDailyRoute, runDailyProspects } from "./daily-prospects.js";
import { handleViralRadarRoute, handleFacebookCallback, runViralRadar } from "./viral-radar.js";
import { handlePushRoute } from "./push.js";
import { handleCaptadorMaster } from "./captador.js";
import { handleAdsMaster } from "./ads.js";
import { runAllClientDaily } from "./captador-daily.js";
import { handleClientCampaignMaster } from "./client-campaign.js";
import { handleManualReelMaster } from "./manual-reel.js";
import { handleManualCarouselMaster } from "./manual-carousel.js";
import { handleMasterUpload } from "./master-upload.js";
import { handlePublicSignup } from "./signup.js";
import { handleAnimatedReelMaster, handleAnimatedReelCallback } from "./animated-reel.js";
import { runAutoReels, handleAutoReelMaster } from "./auto-reel.js";
import { handleShowcasePage, handleShowcaseMaster, handleShowcaseExtras } from "./showcase.js";
import { listClients } from "./clients.js";

// Keep the exact legacy export name until Cloudflare removes its existing Durable Objects.
export class YoutubeDownloader extends DurableObject {
  async fetch() {
    return new Response(JSON.stringify({
      ok: false,
      error: "youtube_container_not_enabled"
    }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}

// Another existing Durable Object namespace uses this capitalization.
export class YouTubeDownloader extends YoutubeDownloader {}

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

function authorized(request, env) {
  const expected = String(env.NEXUS_SECRET_KEY || "");
  const provided = String(request.headers.get("authorization") || "");
  return Boolean(expected && provided === `Bearer ${expected}`);
}

function requireAuth(request, env) {
  return authorized(request, env) ? null : json({ error: "unauthorized" }, 401);
}

async function asset(env, request, pathname) {
  if (!env.ASSETS) return json({ error: "assets_binding_unavailable" }, 503);
  const target = new URL(request.url);
  // ASSETS canonicalizes portal.html to /portal. Fetch the canonical URL
  // directly so the outer /portal response cannot redirect to itself.
  // O mesmo vale para /site.html (o site abre em flowarts.com.br sem pular para /site).
  target.pathname = /^\/(portal|site)\.html$/.test(pathname) ? pathname.slice(0, -5) : pathname;
  target.search = "";
  const response = await env.ASSETS.fetch(new Request(target.toString(), request));
  const headers = new Headers(response.headers);
  if (["/portal.html", "/client-lite.js", "/client-lite.css"].includes(pathname)) {
    headers.set("cache-control", "no-store, no-cache, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function mediaResponse(request, env, url) {
  if (!env.MEDIA) return json({ error: "r2_unavailable" }, 503);

  let key = "";
  try {
    key = decodeURIComponent(url.pathname.slice("/media/".length));
  } catch {
    return json({ error: "invalid_media_path" }, 400);
  }

  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/")) {
    return json({ error: "not_found" }, 404);
  }

  const publicMedia = key.startsWith("branding/") || key.startsWith("posts/");
  const protectedMatch = key.match(/^(?:videos|library|material)\/([^/]+)\//);
  if (!publicMedia && !protectedMatch) return json({ error: "not_found" }, 404);

  if (protectedMatch) {
    const clientId = String(protectedMatch[1] || "");
    const portal = await resolvePortalSession(env, request).catch(() => null);
    const master = portal ? null : await resolveMasterSession(env, request).catch(() => null);
    if ((!portal || portal.clientId !== clientId) && !master) {
      return json({ error: "unauthorized" }, 401);
    }
  }

  const isHead = request.method === "HEAD";
  let object;
  try {
    object = isHead
      ? await env.MEDIA.head(key)
      : await env.MEDIA.get(key, request.headers.get("range") ? { range: request.headers } : undefined);
  } catch {
    return new Response(null, { status: 416, headers: { "accept-ranges": "bytes" } });
  }
  if (!object) return json({ error: "not_found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", publicMedia ? "public, max-age=31536000, immutable" : "private, no-store");

  let status = 200;
  if (!isHead && object.range && Number.isFinite(object.range.offset) && Number.isFinite(object.range.length)) {
    const rangeStart = Number(object.range.offset);
    const rangeLength = Number(object.range.length);
    headers.set("content-range", "bytes " + rangeStart + "-" + (rangeStart + rangeLength - 1) + "/" + object.size);
    headers.set("content-length", String(rangeLength));
    status = 206;
  } else if (Number.isFinite(object.size)) {
    headers.set("content-length", String(object.size));
  }

  return new Response(isHead ? null : object.body, { status, headers });
}

async function health(env) {
  let d1 = false;
  try {
    const row = await env.DB.prepare("SELECT 1 AS ok").first();
    d1 = Number(row?.ok || 0) === 1;
  } catch {
    d1 = false;
  }
  return json({
    ok: d1,
    service: "Servidor Nexus",
    runtime: "cloudflare-workers",
    migrationMode: false,
    database: d1 ? "d1-ready" : "d1-unavailable",
    media: env.MEDIA ? "r2-bound" : "r2-unavailable",
    assets: env.ASSETS ? "bound" : "unavailable",
    openai: {
      shared: openAIKeyStatus(env, "shared-client").configured,
      ragnar: openAIKeyStatus(env, env.RAGNAR_CLIENT_ID || "ragnar-one").configured
    },
    whatsapp: whatsappConfigStatus(env)
  }, d1 ? 200 : 503);
}

async function autonomyHealth(env, detailed = false) {
  if (!detailed) {
    try {
      return json(await buildAutonomyHealthSummary(env), 200);
    } catch (error) {
      return json({
        ok: false,
        runtime: "cloudflare-workers",
        errorCode: /free tier daily row read limit/i.test(String(error?.message || error))
          ? "d1_daily_read_limit"
          : "health_summary_error"
      }, 503);
    }
  }

  const expectedAgents = [
    "RADAR","ESTRATEGISTA","PESQUISADOR","ANALISTA","CREATOR","COPY CHIEF",
    "DESIGNER","FORMAT BUILDER","VIDEO","PUBLISHER","ODIN","SUPORTE","AUDITOR","GROWTH"
  ];
  try {
    const [heartbeatRow, clientsResult, executionsResult, leadRunsResult, leadConfigsResult, leadCountsResult, postsResult, jobsResult, openaiResult, tokenUsageResult, agentStateResult] = await Promise.all([
      env.DB.prepare(
        "SELECT value_json,updated_at FROM nexus_state WHERE namespace='scheduler' AND item_key='heartbeat' AND client_id='' LIMIT 1"
      ).first(),
      env.DB.prepare(
        "SELECT id,name,status FROM clients WHERE status='online' ORDER BY id"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,agent,status,detail_json,created_at FROM agent_executions ORDER BY created_at DESC LIMIT 500"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,status,finished_at,analyzed,new_leads,payload_json FROM lead_hunter_runs ORDER BY COALESCE(finished_at,created_at) DESC LIMIT 100"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,value_json FROM nexus_state WHERE namespace='lead-hunter' AND item_key='config'"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,COUNT(*) AS total FROM leads GROUP BY client_id"
      ).all(),
      env.DB.prepare(
        "SELECT id,client_id,scheduled_for,status,approval_status,media_id,error,payload_json,created_at,updated_at FROM post_ledger WHERE client_id IN ('globalplay-streaming','ragnar-one') ORDER BY created_at DESC LIMIT 60"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,kind,status,attempts,due_at,updated_at,last_error FROM scheduled_jobs WHERE client_id IN ('globalplay-streaming','ragnar-one') ORDER BY created_at DESC LIMIT 60"
      ).all(),
      env.DB.prepare(
        "SELECT client_id,status,detail,updated_at FROM openai_runtime_status WHERE client_id IN ('globalplay-streaming','ragnar-one')"
      ).all().catch(() => ({ results: [] })),
      env.DB.prepare(
        "SELECT client_id,day_key,used_tokens,calls,last_model,updated_at FROM token_usage WHERE client_id IN ('globalplay-streaming','ragnar-one') AND day_key=date('now','-3 hours')"
      ).all().catch(() => ({ results: [] })),
      env.DB.prepare(
        "SELECT client_id,value_json,updated_at FROM nexus_state WHERE namespace='agent-core' AND item_key='state' AND client_id IN ('globalplay-streaming','ragnar-one')"
      ).all().catch(() => ({ results: [] }))
    ]);

    const heartbeat = (() => {
      try { return JSON.parse(String(heartbeatRow?.value_json || "{}")); } catch { return {}; }
    })();
    const now = Date.now();
    const heartbeatMs = Date.parse(String(heartbeatRow?.updated_at || heartbeat?.at || ""));
    const heartbeatAgeSeconds = Number.isFinite(heartbeatMs) ? Math.max(0, Math.round((now - heartbeatMs) / 1000)) : null;

    const latest = new Map();
    for (const row of executionsResult?.results || []) {
      const key = String(row.client_id || "") + "::" + String(row.agent || "").toUpperCase();
      if (!latest.has(key)) latest.set(key, row);
    }
    const lastLeadRun = new Map();
    for (const row of leadRunsResult?.results || []) {
      if (!lastLeadRun.has(row.client_id)) lastLeadRun.set(row.client_id, row);
    }
    const leadConfigs = new Map((leadConfigsResult?.results || []).map(row => {
      try { return [row.client_id, JSON.parse(row.value_json || "{}")] ; }
      catch { return [row.client_id, {}]; }
    }));
    const leadCounts = new Map((leadCountsResult?.results || []).map(row => [row.client_id, Number(row.total || 0)]));
    const tokenUsage = new Map((tokenUsageResult?.results || []).map(row => [row.client_id, row]));
    const agentStates = new Map((agentStateResult?.results || []).map(row => {
      try { return [row.client_id, { value: JSON.parse(row.value_json || "{}"), updatedAt: row.updated_at }]; }
      catch { return [row.client_id, { value: {}, updatedAt: row.updated_at }]; }
    }));

    const instagramHealth = new Map(await Promise.all(
      (clientsResult?.results || []).map(async client => [
        String(client.id),
        await instagramCredentialStatus(env, client.id).catch(() => ({
          connected: false,
          source: "unknown",
          expired: false,
          expiresAt: null,
          fallbackReason: "",
          tokenValid: false,
          accountMatches: false,
          validation: "diagnostic_error"
        }))
      ])
    ));

    const clients = (clientsResult?.results || []).map(client => {
      const agents = expectedAgents.map(agent => {
        const row = latest.get(String(client.id) + "::" + agent);
        let detail = {};
        if (agent === "PUBLISHER") {
          try { detail = JSON.parse(row?.detail_json || "{}"); } catch {}
        }
        const at = row?.created_at || null;
        const ageMinutes = at && Number.isFinite(Date.parse(at))
          ? Math.max(0, Math.round((now - Date.parse(at)) / 60000))
          : null;
        const result = {
          agent,
          status: row?.status || "never",
          lastRunAt: at,
          ageMinutes
        };
        if (agent === "PUBLISHER") {
          const m = detail?.metadata || {};
          result.result = {
            candidates: Number(detail.quantity || 0),
            published: Number(m.published || 0),
            failed: Number(m.failed || 0),
            awaitingApproval: Number(m.awaitingApproval || 0),
            awaitingMedia: Number(m.awaitingMedia || 0),
            duplicateMediaBlocked: Number(m.duplicateMediaBlocked || 0),
            duplicateCaptionBlocked: Number(m.duplicateCaptionBlocked || 0)
          };
        }
        return result;
      });
      const missing = agents.filter(item => item.status === "never").map(item => item.agent);
      const leadSettings = leadConfigs.get(client.id) || {};
      const defaultAuto = ["globalplay-streaming", "ragnar-one"].includes(client.id);
      const autoEnabled = leadSettings.enabled !== false && (leadSettings.autoRun === undefined ? defaultAuto : leadSettings.autoRun === true);
      const leadRun = lastLeadRun.get(client.id);
      let leadPayload={};
      try { leadPayload=JSON.parse(String(leadRun?.payload_json||"{}")); } catch {}
      const leadErrors=Array.isArray(leadPayload.errors)?leadPayload.errors.map(String):[];
      const leadSources=leadPayload.sources&&typeof leadPayload.sources==="object"?leadPayload.sources:{};
      const leadDiagnostic=leadErrors.some(x=>/permission|oauth|token|authoriz|scope|forbidden|access/i.test(x))
        ?"permission_or_auth_error"
        :Number(leadRun?.analyzed||0)===0&&Number(leadSources.metaComments||0)===0&&leadErrors.length===0
          ?"no_comments_found"
          :leadErrors.length?"collection_error":"ok";
      const usage=tokenUsage.get(client.id)||{};
      const dailyLimit=Math.max(1,Number(env.NEXUS_OPENAI_DAILY_TOKEN_LIMIT||30000));
      const usedTokens=Math.max(0,Number(usage.used_tokens||0));
      const provider=(openaiResult?.results||[]).find(row=>row.client_id===client.id);
      const openaiBlocked=usedTokens>=dailyLimit||String(provider?.status||"")==="quota_exhausted";
      const stateEntry=agentStates.get(client.id)||{value:{},updatedAt:null};
      const nextCycleMs=Date.parse(String(stateEntry.value?.nextCycleAt||""));
      const cycleDelayed=Number.isFinite(nextCycleMs)&&now-nextCycleMs>5*60*1000;
      const posts = (postsResult?.results || []).filter(row => row.client_id === client.id).slice(0, 12).map(row => {
        let payload = {};
        try { payload = JSON.parse(row.payload_json || "{}"); } catch {}
        const code = String(row.error || "");
        return {
          id: row.id, scheduledFor: row.scheduled_for, status: row.status,
          approval: row.approval_status, mediaIdPresent: Boolean(row.media_id),
          imagePresent: Boolean(payload.imageUrl || payload.publicImageUrl),
          copyChief: payload.qualityGates?.copyChief || null,
          designer: payload.qualityGates?.designer || null,
          reviewStatus: payload.visualReview?.status || null,
          reviewAttempts: Math.max(0, Number(payload.visualReview?.attempts || 0)),
          diagnosticRetry: payload.visualReview?.diagnosticRetry === true,
          reviewReason: /^[a-z_0-9]+$/.test(String(payload.visualReview?.reason || ""))
            ? String(payload.visualReview.reason).slice(0, 80) : null,
          blockedMediaPresent: Boolean(payload.blockedDesignerMedia),
          blockedMediaIsCorruptLegacy: /\/assets\/ragnar\/nordic-cinema-0[123]\.png(?:[?#]|$)/i.test(String(payload.blockedDesignerMedia||"")),
          blockedReviewStatus: ["approved","rejected","unavailable"].includes(String(payload.blockedDesignerReviewStatus||""))
            ? payload.blockedDesignerReviewStatus : null,
          blockedReviewChecks: payload.blockedDesignerReviewChecks && typeof payload.blockedDesignerReviewChecks === "object"
            ? Object.fromEntries(["singleScene","noCollage","legibleText","brandCorrect","originalGenericVisual","screenContentCoherent"]
              .filter(key => typeof payload.blockedDesignerReviewChecks[key] === "boolean")
              .map(key => [key,payload.blockedDesignerReviewChecks[key]])) : null,
          recoveryAttempted: Boolean(payload.blockedDesignerRecoveryAttemptedAt),
          retries: Number(payload.retryCount || 0),
          publishedAt: payload.publishedAt || null,
          errorCode: /^[a-z_]+$/.test(code) ? code.slice(0, 80) : (code ? "external_api_error" : ""),
          createdAt: row.created_at, updatedAt: row.updated_at
        };
      });
      const jobs = (jobsResult?.results || []).filter(row => row.client_id === client.id).slice(0, 12).map(row => ({
        kind: row.kind, status: row.status, attempts: row.attempts,
        dueAt: row.due_at, updatedAt: row.updated_at,
        errorCode: /^[a-z_]+$/.test(String(row.last_error || "")) ? String(row.last_error).slice(0, 80) : (row.last_error ? "execution_error" : "")
      }));
      return {
        ...(detailed?{clientId:client.id,clientName:client.name}:{}),
        status: client.status,
        agents,
        allAgentsSeen: missing.length === 0,
        missingAgents: missing,
        instagramConnection: (() => {
          const raw=instagramHealth.get(String(client.id)) || {};
          const safe={
            connected:Boolean(raw.connected),
            tokenValid:Boolean(raw.tokenValid),
            accountMatches:Boolean(raw.accountMatches),
            validation:String(raw.validation||"unknown")
          };
          return detailed?{...safe,source:raw.source||"unknown",expired:Boolean(raw.expired),expiresAt:raw.expiresAt||null,fallbackReason:raw.fallbackReason||""}:safe;
        })(),
        cycleHealth:{
          status:String(stateEntry.value?.lastCycleStatus||"unknown"),
          delayed:cycleDelayed,
          stage:String(stateEntry.value?.lastCycleStage||"unknown"),
          errorCode:(()=>{
            const raw=String(stateEntry.value?.lastCycleError||"").trim();
            if(!raw)return "";
            return /^[a-z_0-9:-]+$/i.test(raw)?raw.slice(0,120):"cycle_execution_error";
          })(),
          ...(detailed?{lastCycleAt:stateEntry.value?.lastCycleAt||null,nextCycleAt:stateEntry.value?.nextCycleAt||null}:{})
        },
        publishingDiagnostic: {
          ...(detailed?{posts,jobs}:{}),
          openai: {
            status: openaiBlocked?"blocked":(provider?.status || "unknown"),
            budgetBlocked:openaiBlocked,
            percent:Math.min(100,Math.round((usedTokens/dailyLimit)*100)),
            ...(detailed?{usedTokens,limitTokens:dailyLimit,
              code:/^[a-z_0-9]+$/.test(String(provider?.detail||""))?String(provider.detail).slice(0,80):(provider?.detail?"provider_error":""),
              updatedAt:provider?.updated_at||null
            }:{})
          },
          zeroPublishReason:(()=>{
            const publisher=agents.find(item=>item.agent==="PUBLISHER");
            const r=publisher?.result||{};
            if(Number(r.published||0)>0)return "";
            if(openaiBlocked)return "openai_budget_blocked";
            if(Number(r.awaitingMedia||0)>0)return "awaiting_unique_media";
            if(Number(r.awaitingApproval||0)>0)return "quality_gate_pending";
            if(cycleDelayed)return "cycle_delayed";
            return "no_due_approved_post";
          })()
        },
        leadCapture: {
          autoEnabled,
          diagnostic:leadDiagnostic,
          ...(detailed?{
            lastRunAt:leadRun?.finished_at||null,
            lastRunStatus:leadRun?.status||"never",
            lastAnalyzed:Number(leadRun?.analyzed||0),
            lastNew:Number(leadRun?.new_leads||0),
            totalLeads:leadCounts.get(client.id)||0,
            sources:leadSources,errorCount:leadErrors.length
          }:{})
        }
      };
    });

    const schedulerHealthy = heartbeatAgeSeconds !== null
      && heartbeatAgeSeconds <= 180
      && heartbeat?.failed !== true;
    const instagramCentral = await instagramMasterConfigStatus(env).catch(() => ({
      configured: false,
      appIdConfigured: false,
      appSecretConfigured: false,
      appIdSource: "unknown",
      appSecretSource: "unknown",
      updatedAt: null
    }));

    return json({
      ok: autonomyOverallHealthy({ schedulerHealthy, clients }),
      runtime: "cloudflare-workers",
      automationActive: String(env.CLOUDFLARE_AUTOMATION_ACTIVE || "").toLowerCase() === "true",
      expectedAgents: expectedAgents.length,
      instagramCentral: detailed ? instagramCentral : { configured:Boolean(instagramCentral?.configured) },
      scheduler: {
        healthy: schedulerHealthy,
        lastHeartbeatAt: heartbeatRow?.updated_at || heartbeat?.at || null,
        ageSeconds: heartbeatAgeSeconds,
        errorCode: String(heartbeat?.errorCode || ""),
        summary: heartbeat
      },
      clients
    }, 200);
  } catch (error) {
    return json({
      ok: false,
      runtime: "cloudflare-workers",
      error: String(error instanceof Error ? error.message : error).slice(0, 500)
    }, 503);
  }
}

async function handleState(request, env, url) {
  const denied = requireAuth(request, env);
  if (denied) return denied;

  const namespace = url.searchParams.get("namespace") || "";
  const itemKey = url.searchParams.get("key") || "";
  const clientId = url.searchParams.get("clientId") || "";
  if (!namespace || !itemKey) return json({ error: "namespace_and_key_required" }, 400);

  if (request.method === "GET") {
    const record = await getState(env, namespace, itemKey, clientId);
    return record ? json({ ok: true, record }) : json({ error: "not_found" }, 404);
  }

  if (request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const record = await putState(env, namespace, itemKey, clientId, body?.value ?? body);
    return json({ ok: true, record });
  }

  if (request.method === "DELETE") {
    const deleted = await deleteState(env, namespace, itemKey, clientId);
    return json({ ok: true, deleted });
  }

  return json({ error: "method_not_allowed" }, 405);
}

async function handleOpenAIResponses(request, env) {
  const denied = requireAuth(request, env);
  if (denied) return denied;
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await request.json().catch(() => ({}));
  const clientId = String(body?.clientId || "").trim();
  if (!clientId) return json({ error: "client_id_required" }, 400);

  const exists = await env.DB.prepare("SELECT id FROM clients WHERE id = ?1 LIMIT 1").bind(clientId).first();
  if (!exists) return json({ error: "client_not_found" }, 404);

  try {
    const result = await openAIResponses(env, clientId, body);
    return json(result);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : String(error),
      detail: error?.detail || null
    }, Number(error?.status || 502));
  }
}

const MINUTE_CRON = "* * * * *";

export default {
  async scheduled(event, env, ctx) {
    const at = new Date(event.scheduledTime || Date.now());
    // Cron de 1 minuto: só o direct do brinde ("Já segui") e, a cada 5 min, os comentários QUERO.
    if (String(event.cron || "") === MINUTE_CRON) {
      ctx.waitUntil(runGiftInbox(env, at).catch(error =>
        console.warn("gift_inbox_failed", String(error?.message || error).slice(0, 140))
      ));
      if (at.getUTCMinutes() % 5 === 0 && at.getUTCMinutes() % 15 !== 0) {
        ctx.waitUntil(runCommentAutoReplies(env, at).catch(error =>
          console.warn("comment_autoreply_failed", String(error?.message || error).slice(0, 140))
        ));
      }
      return;
    }
    // Poster discovery runs independently; failures must never block Instagram cron.
    ctx.waitUntil(warmYoutubePosterLibrary(env, at).catch(error =>
      console.warn("youtube_poster_library_refresh_failed", String(error?.message || error).slice(0, 140))
    ));
    // Café Brisa (demonstração): cria uma vez e pausa ao chegar no limite de posts.
    ctx.waitUntil(ensureDemoClient(env).catch(error =>
      console.warn("demo_client_failed", String(error?.message || error).slice(0, 140))
    ));
    // Posts prontos sem "Comente QUERO" ganham a chamada do brinde antes de sair.
    ctx.waitUntil(fixGiftCtaInOpenPosts(env).catch(error =>
      console.warn("gift_cta_fix_failed", String(error?.message || error).slice(0, 140))
    ));
    // Reel automático (desligado por padrão; liga no Master). Só cria rascunho: o cliente aprova.
    ctx.waitUntil(runAutoReels(env, at).catch(error =>
      console.warn("auto_reel_failed", String(error?.message || error).slice(0, 140))
    ));
    // Caçador diário (a partir das 9h): separa empresas para o Rodrigo chamar e avisa o celular. Não envia nada.
    ctx.waitUntil(runDailyProspects(env, at).catch(error =>
      console.warn("daily_prospects_failed", String(error?.message || error).slice(0, 140))
    ));
    // Busca diária do Captador de cada cliente (22/10): separa até 10 empresas por dia. Não envia nada.
    ctx.waitUntil(runAllClientDaily(env, at, listClients).catch(error =>
      console.warn("client_daily_prospects_failed", String(error?.message || error).slice(0, 140))
    ));
    // Radar de virais: 1 vez por semana olha as hashtags dos nichos (só se o Facebook estiver conectado).
    ctx.waitUntil(runViralRadar(env, at).catch(error =>
      console.warn("viral_radar_failed", String(error?.message || error).slice(0, 140))
    ));
    // Auto-responder de comentários (funil QUERO/EXEMPLO → WhatsApp).
    ctx.waitUntil(runCommentAutoReplies(env, at).catch(error =>
      console.warn("comment_autoreply_failed", String(error?.message || error).slice(0, 140))
    ));
    ctx.waitUntil(
      runCronIteration({
        at,
        runScheduler: current => runSchedulerTick(env, current),
        recordFailure: (current, error) => recordSchedulerFailure(env, current, error).catch(() => "scheduler_tick_error"),
        processJobs: current => processDueJobs(env, current)
      }).catch(async error => {
        if (!isD1Emergency(error)) throw error;
        return runEmergencyPublisher(env, at);
      })
    );
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const siteRedirect = canonicalSiteRedirect(url, request.method);
    if (siteRedirect) return Response.redirect(siteRedirect, 301);

    if (url.pathname === "/" && request.method === "GET") {
      // flowarts.com.br (e www) abre o site da Flow Arts; o painel fica em painel.flowarts.com.br.
      if (/^(www\.)?flowarts\.com\.br$/i.test(url.hostname)) return asset(env, request, "/site.html");
      return redirect("/login");
    }

    if (url.pathname === "/api/emergency-publisher-diagnostic" && request.method === "GET") {
      return emergencyPublisherDiagnostic(request, env);
    }

    if (url.pathname === "/api/emergency-publisher-status" && request.method === "GET") {
      return json(await emergencyPublisherStatus(env, new Date()));
    }

    if (url.pathname === "/api/emergency-publish-now" && request.method === "POST") {
      const expected = String(env.EMERGENCY_TRIGGER_TOKEN || "");
      const provided = String(request.headers.get("x-nexus-emergency-token") || "");
      if (!expected || !provided || provided !== expected) {
        return json({ error: "unauthorized" }, 401);
      }
      const targetClientId = String(url.searchParams.get("clientId") || "").trim();
      const format = String(url.searchParams.get("format") || "post").toLowerCase();
      const forceTest = url.searchParams.get("forceTest") === "1";
      const result = await runEmergencyPublisher(env, new Date(), targetClientId, { format, forceTest, testId:url.searchParams.get("testId") || "" });
      return json({ ok: result.errors?.length ? false : true, targetClientId: targetClientId || null, ...result });
    }

    // Keep the Master access page independent from D1 and every downstream
    // integration. This route must remain usable during database quota/outage.
    if (url.pathname === "/api/master/access" && request.method === "GET") {
      return new Response(masterLoginPage(false, "/api/master/access"), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, no-cache, must-revalidate",
          "pragma": "no-cache"
        }
      });
    }

    if (url.pathname.startsWith("/media/") && ["GET","HEAD"].includes(request.method)) {
      return mediaResponse(request, env, url);
    }

    if (url.pathname === "/api/whatsapp/webhook") {
      return handleWhatsAppWebhook(request, env, url, ctx);
    }

    // Contador de visitas do site (público, sem dados pessoais).
    if (url.pathname === "/api/site/hit" && request.method === "POST") {
      return handleSiteHit(request, env).catch(() => new Response(null, { status: 204 }));
    }

    // Radar de virais (ganchos que bombam no nicho de cada cliente). Só com login do Master.
    if (url.pathname.startsWith("/api/master/viral-radar")) {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleViralRadarRoute(request, env, url);
      if (response) return response;
    }

    // Resumo das visitas para o painel Master (login do Master).
    if (url.pathname === "/api/master/site-stats" && request.method === "GET") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      return json(await siteStats(env, url.searchParams.get("days") || 30));
    }

    // Caçador de clientes (empresas sem site no Google Maps). Só com login do Master.
    if (url.pathname === "/api/master/captador/access" || url.pathname === "/api/master/captador/daily") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleCaptadorMaster(request, env, url, listClients);
      if (response) return response;
    }

    // Tráfego pago (24/10): quem pode impulsionar e quem já conectou a conta de anúncios. Só com login do Master.
    if (url.pathname === "/api/master/ads") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleAdsMaster(request, env, url, listClients);
      if (response) return response;
    }

    // Reel feito à mão (Flow) enviado pelo Rodrigo; o cliente aprova no painel. Só com login do Master.
    if (url.pathname === "/api/master/manual-reel") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleManualReelMaster(request, env, url);
      if (response) return response;
    }

    // Subir conteúdo pronto do cliente (post, carrossel, Reels, Stories) com legenda pronta por nicho. Só com login do Master.
    if (url.pathname === "/api/master/upload" || url.pathname === "/api/master/caption") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleMasterUpload(request, env, url);
      if (response) return response;
    }

    // Carrossel pronto enviado pelo Rodrigo; o cliente escolhe o dia e aprova no painel. Só com login do Master.
    if (url.pathname === "/api/master/manual-carousel") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleManualCarouselMaster(request, env, url);
      if (response) return response;
    }

    // Vitrine por nicho (só Flow Arts): qual Reel é o exemplo de cada tipo de negócio. Só com login do Master.
    if (url.pathname === "/api/master/showcase" || url.pathname.startsWith("/api/master/showcase/")) {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = (await handleShowcaseExtras(request, env, url)) || (await handleShowcaseMaster(request, env, url));
      if (response) return response;
    }

    // Reel automático: configuração e "criar um agora". Só com login do Master.
    if (url.pathname === "/api/master/animated-reel/auto") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleAutoReelMaster(request, env, url);
      if (response) return response;
    }

    // Reel animado por modelo (sem IA): o Rodrigo escreve as 5 cenas; o GitHub grava. Só com login do Master.
    if (url.pathname === "/api/master/animated-reel") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleAnimatedReelMaster(request, env, url);
      if (response) return response;
    }

    // Imagem por IA para clientes: liberação e limite por mês. Só com login do Master.
    if (url.pathname === "/api/master/ai-images/access") {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleClientCampaignMaster(request, env, url, listClients);
      if (response) return response;
    }

    // Aviso no celular (notificação do painel). Só com login do Master.
    if (url.pathname.startsWith("/api/master/push/")) {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handlePushRoute(request, env, url);
      if (response) return response;
    }

    // 22/10 (Rodrigo): o CRM, o Caçador e os exemplos por nicho saíram do Master e foram para o
    // painel da Flow Arts, que é um cliente. Só o login do cliente Flow Arts usa estas rotas:
    // /api/portal/flow/<crm|prospects|showcase|push>/… chama a mesma lógica de antes.
    if (url.pathname.startsWith("/api/portal/flow/")) {
      const portal = await resolvePortalSession(env, request).catch(() => null);
      if (!portal || portal.clientId !== SHOWCASE_CLIENT) return json({ error: "unauthorized" }, 401);
      const rest = url.pathname.slice("/api/portal/flow/".length);
      if (!/^(crm|prospects|showcase|push)(\/|$)/.test(rest)) return json({ error: "not_found" }, 404);
      const inner = new URL(url);
      inner.pathname = "/api/master/" + rest;
      const req = new Request(inner, request);
      let response = null;
      if (rest.startsWith("crm")) response = (await handleCrmSendRoute(req, env, inner)) || (await handleDailyRoute(req, env, inner)) || (await handleCrmRoute(req, env, inner));
      else if (rest.startsWith("prospects")) response = await handleProspectsRoute(req, env, inner);
      else if (rest.startsWith("showcase")) response = (await handleShowcaseExtras(req, env, inner)) || (await handleShowcaseMaster(req, env, inner));
      else if (rest.startsWith("push")) response = await handlePushRoute(req, env, inner);
      return response || json({ error: "not_found" }, 404);
    }

    // CRM: contatos do WhatsApp pessoal do Rodrigo e retorno em 7 dias. Só com login do Master.
    if (url.pathname === "/api/master/crm" || url.pathname.startsWith("/api/master/crm/")) {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const sent = await handleCrmSendRoute(request, env, url);
      if (sent) return sent;
      const daily = await handleDailyRoute(request, env, url);
      if (daily) return daily;
      const response = await handleCrmRoute(request, env, url);
      if (response) return response;
    }

    if (url.pathname.startsWith("/api/master/prospects")) {
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleProspectsRoute(request, env, url);
      if (response) return response;
    }

    const facebookOAuthResponse = await handleFacebookCallback(env, request, url);
    if (facebookOAuthResponse) return facebookOAuthResponse;
    const instagramOAuthResponse = await handleInstagramOAuthCallback(env, request, url);
    if (instagramOAuthResponse) return instagramOAuthResponse;

    const giftResponse = await handleGiftRequest(request, env, url);
    if (giftResponse) return giftResponse;

    const instagramWebhookResponse = await handleInstagramWebhook(request, env, url, ctx);
    if (instagramWebhookResponse) return instagramWebhookResponse;
    const instagramComplianceResponse = await handleInstagramComplianceRequest(env, request, url);
    if (instagramComplianceResponse) return instagramComplianceResponse;

    const socialFormatResponse = await handleSocialFormatRenderCallback(request, env, url);
    if (socialFormatResponse) return socialFormatResponse;
    const carouselRenderResponse = await handleCarouselRenderCallback(request, env, url);
    if (carouselRenderResponse) return carouselRenderResponse;
    const animatedReelResponse = await handleAnimatedReelCallback(request, env, url);
    if (animatedReelResponse) return animatedReelResponse;
    // Página pública da vitrine: /exemplo/<nicho> (link que vai na mensagem do caçador).
    const showcasePageResponse = await handleShowcasePage(request, env, url);
    if (showcasePageResponse) return showcasePageResponse;


    if (["GET", "HEAD"].includes(request.method) && ["/login", "/portal", "/portal.html"].includes(url.pathname)) {
      return asset(env, request, "/portal.html");
    }

    if (["GET", "HEAD"].includes(request.method) && ["/client-lite.js", "/client-lite.css"].includes(url.pathname)) {
      return asset(env, request, url.pathname);
    }

    const signupResponse = await handlePublicSignup(request, env, url);
    if (signupResponse) return signupResponse;

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");

      if (!username || !password) {
        return json({ ok: false, error: "username_and_password_required" }, 400);
      }

      // Always allow a valid credential to recover from a previous lockout.
      // Rate limiting is applied only after both Master and client credentials fail.
      if (await masterCredentialsValid(env, username, password)) {
        await clearLoginFailures(env, request, "login").catch(() => {});
        const session = await createMasterSession(env);
        return json({
          ok: true,
          role: "master",
          token: session.token,
          expiresAt: session.expiresAt,
          cookieName: "nexus_master",
          entryPath: "/api/master/console"
        }, 200, { "set-cookie": masterSessionCookie(session.token) });
      }

      const clientId = await authenticatePortalUser(env, username, password);
      if (clientId) {
        await clearLoginFailures(env, request, "login").catch(() => {});
        const session = await createPortalSession(env, clientId, {
          persistent: true,
          source: "unified-desktop"
        });
        return json({
          ok: true,
          role: "client",
          clientId,
          token: session.token,
          expiresAt: session.expiresAt,
          cookieName: "nexus_session",
          entryPath: "/portal.html?auth=1"
        }, 200, { "set-cookie": portalSessionCookie(session.token) });
      }

      const rate = await loginRateLimitStatus(env, request, "login");
      if (!rate.allowed) {
        return json(
          { ok: false, error: "too_many_login_attempts", retryAfter: rate.retryAfter },
          429,
          { "retry-after": String(rate.retryAfter) }
        );
      }

      await recordLoginFailure(env, request, "login");
      return json({ ok: false, error: "invalid_credentials" }, 401);
    }


    let masterResponse;
    try {
      masterResponse = await handleMaster(request, env, url);
    } catch (error) {
      if (url.pathname.startsWith("/api/master/") || url.pathname.startsWith("/master")) {
        const raw = String(error?.message || error || "");
        const d1Limited = /free tier daily row read limit|d1_daily_read_limit/i.test(raw);
        return json({
          ok: false,
          error: d1Limited ? "d1_daily_read_limit" : "master_request_failed",
          message: d1Limited
            ? "O painel Master está online, mas os dados do D1 estão temporariamente indisponíveis."
            : "O NEXUS não conseguiu concluir esta operação do Master."
        }, 503);
      }
      throw error;
    }
    if (masterResponse) return masterResponse;

    let videoRenderCallback;
    try { videoRenderCallback = await handleGitHubVideoRenderCallback(request, env, url); }
    catch (error) {
      if (!url.pathname.startsWith("/api/internal/video-") && !url.pathname.startsWith("/api/local-video-ingest/")) throw error;
      const code = String(error?.message || "video_callback_failed");
      console.error("video_callback_failed", { path: url.pathname, code: code.slice(0, 120) });
      return json({ ok: false, error: code, message: "O armazenamento/processamento do vídeo falhou." }, 502);
    }
    if (videoRenderCallback) return videoRenderCallback;

    let portalResponse;
    try { portalResponse = await handlePortalApi(request, env, url, ctx); }
    catch (error) {
      if (!url.pathname.startsWith("/api/portal/")) throw error;
      const raw = String(error?.message || error);
      const limited = /free tier daily row read limit|d1_daily_read_limit/i.test(raw);
      console.error("portal_request_failed", { path: url.pathname, code: limited ? "d1_daily_read_limit" : "portal_request_failed" });
      return json({ ok: false, error: limited ? "d1_daily_read_limit" : "portal_request_failed", message: limited
        ? "Os dados estão temporariamente indisponíveis pelo limite de leitura do D1. A lista vazia não representa ausência de registros."
        : "Não foi possível concluir a operação. Nenhum sucesso foi confirmado. Tente novamente." }, 503);
    }
    if (portalResponse) return portalResponse;

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return health(env);
    }

    if (url.pathname === "/api/instagram-publishing-health" && request.method === "GET") {
      const managed = ["globalplay-streaming", "ragnar-one"];
      const clients = await Promise.all(managed.map(async clientId => {
        const raw = await instagramCredentialStatus(env, clientId).catch(() => ({
          connected: false, tokenValid: false, accountMatches: false, validation: "diagnostic_error"
        }));
        return {
          clientId,
          connected: Boolean(raw.connected),
          tokenValid: Boolean(raw.tokenValid),
          accountMatches: Boolean(raw.accountMatches),
          validation: String(raw.validation || "unknown")
        };
      }));
      return json({
        ok: clients.length === 2 && clients.every(item => item.connected && item.tokenValid && item.accountMatches),
        clients
      }, 200);
    }

    if (url.pathname === "/api/autonomy-health" && request.method === "GET") {
      const detailed=url.searchParams.get("detail")==="1";
      if(detailed){
        const denied=requireAuth(request,env);
        if(denied)return denied;
      }
      // Health doubles as a bounded watchdog only when the cron heartbeat is stale.
      // Refresh the lightweight scheduler synchronously so the response immediately
      // exposes success/failure; drain one queued job asynchronously afterwards.
      const watchdog = await refreshSchedulerIfStale(env).catch(() => ({ kicked:false, reason:"watchdog_error" }));
      if (watchdog.kicked) {
        ctx.waitUntil(processDueJobs(env, new Date()).catch(() => null));
      }
      return autonomyHealth(env,detailed);
    }

    if (url.pathname === "/api/system/openai-routing" && request.method === "GET") {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      const clientId = url.searchParams.get("clientId") || "";
      return json(openAIKeyStatus(env, clientId));
    }

    if (url.pathname === "/api/system/token-usage" && request.method === "GET") {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      const clientId = url.searchParams.get("clientId") || "";
      if (!clientId) return json({ error: "client_id_required" }, 400);
      return json({ ok: true, usage: await tokenUsageToday(env, clientId) });
    }

    if (url.pathname === "/api/openai/responses") {
      return handleOpenAIResponses(request, env);
    }

    if (url.pathname.startsWith("/api/whatsapp/")) {
      // Aceita a chave interna (Bearer) ou o login do painel Master (cookie),
      // porque a aba WhatsApp do Master chama estas rotas pelo navegador.
      const master = await resolveMasterSession(env, request).catch(() => null);
      if (!master) return json({ error: "unauthorized" }, 401);
      const response = await handleWhatsAppProtected(request, env, url);
      if (response) return response;
    }

    if (url.pathname === "/api/state") {
      return handleState(request, env, url);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "not_migrated_yet",
        service: "Servidor Nexus",
        runtime: "cloudflare-workers",
        path: url.pathname
      }, 501);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);

    return json({
      ok: true,
      service: "Servidor Nexus",
      migrationMode: false,
      message: "Cloudflare runtime is online and operating independently."
    });
  }
};
