import { visualApproval } from "./visual-review.js";
import { publishInstagramPost, findRecentMediaByCaption } from "./publisher.js";
import { runLeadHunter, leadHunterConfig } from "./lead-hunter.js";
import { runAgentCoreCycle } from "./agent-runtime.js";
import { getClient } from "./clients.js";
import { publishingGate, isPublishingWindow } from "./publishing-policy.js";

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function automationEnabled(env) {
  return String(env.CLOUDFLARE_AUTOMATION_ACTIVE || "").toLowerCase() === "true";
}

const MAX_PUBLISH_RETRIES = 3;

const JOB_KIND_PRIORITY = Object.freeze({
  "publisher-sweep": 0,
  "agent-core-cycle": 1,
  "lead-hunter": 2
});

export function compareDueJobs(a = {}, b = {}) {
  const aDue = Date.parse(String(a.due_at || ""));
  const bDue = Date.parse(String(b.due_at || ""));
  const aTime = Number.isFinite(aDue) ? aDue : Number.MAX_SAFE_INTEGER;
  const bTime = Number.isFinite(bDue) ? bDue : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;

  const aPriority = JOB_KIND_PRIORITY[String(a.kind || "")] ?? 99;
  const bPriority = JOB_KIND_PRIORITY[String(b.kind || "")] ?? 99;
  if (aPriority !== bPriority) return aPriority - bPriority;

  return String(a.id || "").localeCompare(String(b.id || ""));
}

export function selectFairDueJobs(jobs = [], maxClients = 4) {
  const sorted = [...jobs].sort(compareDueJobs);
  const selected = [];
  const seenClients = new Set();
  for (const job of sorted) {
    const clientId = String(job?.client_id || "");
    if (!clientId || seenClients.has(clientId)) continue;
    selected.push(job);
    seenClients.add(clientId);
    if (selected.length >= Math.max(1, Number(maxClients || 4))) break;
  }
  return selected;
}

function publishGuard(payload = {}, clientId) {
  const quality = payload?.qualityGates && typeof payload.qualityGates === "object"
    ? payload.qualityGates : {};
  const retryCount = Math.max(0, Number(payload?.retryCount || 0));
  if (quality.copyChief !== "approved" || quality.designer !== "approved" || !visualApproval(clientId, payload)) {
    return { ok: false, error: "quality_gate_pending", retryCount };
  }
  const requestedFormat = String(payload?.creativeFeatures?.requestedFormat || "post").toLowerCase();
  if (["reel","carousel"].includes(requestedFormat)
      && quality.formatBuilder !== "approved") {
    return { ok: false, error: "format_build_pending", retryCount };
  }
  if (retryCount >= MAX_PUBLISH_RETRIES) {
    return { ok: false, error: "publish_retry_limit_reached", retryCount };
  }
  return { ok: true, error: "", retryCount };
}

async function duePosts(env, clientId, nowIso) {
  const result = await env.DB.prepare(
    `SELECT id, client_id, scheduled_for, status, approval_status, caption,
            image_object_key, payload_json
     FROM post_ledger
     WHERE client_id = ?1
       AND approval_status = 'approved'
       AND status IN ('ready', 'scheduled', 'failed')
       AND COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.retryCount'),0) < ${MAX_PUBLISH_RETRIES}
       AND json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.qualityGates.copyChief') = 'approved'
       AND json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.qualityGates.designer') = 'approved'
       AND scheduled_for IS NOT NULL
       AND scheduled_for <= ?2
     ORDER BY scheduled_for ASC
     LIMIT 8`
  ).bind(clientId, nowIso).all();
  return result?.results || [];
}

async function savePostResult(env, row, patch) {
  const current = parseJson(row.payload_json, {});
  const payload = {
    ...current,
    ...(patch.payload && typeof patch.payload === "object" ? patch.payload : {})
  };

  await env.DB.prepare(
    `UPDATE post_ledger
     SET status = ?2,
         media_id = ?3,
         error = ?4,
         payload_json = ?5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`
  ).bind(
    row.id,
    String(patch.status || row.status || "scheduled"),
    String(patch.mediaId || ""),
    String(patch.error || "").slice(0, 900),
    JSON.stringify(payload)
  ).run();
}

// Posts presos em "publishing" (o servidor parou no meio): confere no Instagram.
// Achou a mesma legenda → marca como publicado. Não achou depois de 15 min → falha
// (volta para nova tentativa, com limite de tentativas).
export async function recoverStuckPublishing(env, clientId, now = new Date(), find = findRecentMediaByCaption) {
  const result = await env.DB.prepare(
    `SELECT id, client_id, status, caption, payload_json, updated_at FROM post_ledger
     WHERE client_id = ?1 AND status = 'publishing'
     LIMIT 3`
  ).bind(clientId).all();
  const out = { recovered: 0, failed: 0 };
  for (const row of result?.results || []) {
    const payload = parseJson(row.payload_json, {});
    const startedMs = Date.parse(String(payload.publishingStartedAt || ""));
    const oldEnough = Number.isFinite(startedMs) && now.getTime() - startedMs >= 15 * 60 * 1000;
    let found = await find(env, clientId, row.caption).catch(() => null);
    // Mesma legenda de um post antigo não prova que ESTE saiu: o post do Instagram
    // precisa ser de depois do início desta publicação.
    const foundMs = Date.parse(String(found?.timestamp || ""));
    if (found?.mediaId && Number.isFinite(startedMs) && (!Number.isFinite(foundMs) || foundMs < startedMs - 2 * 60 * 1000)) found = null;
    if (!found?.mediaId && !oldEnough) continue;
    if (found?.mediaId) {
      await savePostResult(env, row, {
        status: "published",
        mediaId: found.mediaId,
        payload: { ...payload, permalink: found.permalink, publishedAt: found.timestamp || now.toISOString(), recoveredFromStuckPublishing: true }
      });
      out.recovered += 1;
    } else {
      await savePostResult(env, row, {
        status: "failed",
        error: "publish_interrupted",
        payload: { ...payload, retryCount: Math.max(0, Number(payload.retryCount || 0)) + 1, lastPublishAttemptAt: now.toISOString() }
      });
      out.failed += 1;
    }
  }
  return out;
}

export function isStoryPost(payload = {}) {
  return String(payload?.creativeFeatures?.requestedFormat || "").toLowerCase() === "story";
}

// Em cada rodada: no máximo 1 post do feed (respeitando os 90 min) e 1 story (sem esperar o feed).
export function canPublishInSweep({ story = false, gateOk = true, done = { feed: 0, story: 0 } } = {}) {
  if (story) return Number(done.story || 0) === 0;
  return gateOk && Number(done.feed || 0) === 0;
}

async function runPublisherSweep(env, clientId, now) {
  await recoverStuckPublishing(env, clientId, now).catch(() => null);
  const rows = await duePosts(env, clientId, now.toISOString());
  const summary = { candidates: rows.length, published: 0, failed: 0, skipped: 0 };

  const publishedState = await env.DB.prepare(
    `SELECT COUNT(*) AS published_today,
            MAX(COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.publishedAt'),updated_at)) AS last_published_at
     FROM post_ledger
     WHERE client_id=?1
       AND status='published'
       AND LOWER(COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.creativeFeatures.requestedFormat'),''))<>'story'
       AND date(COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.publishedAt'),updated_at),'-3 hours')=date(?2,'-3 hours')`
  ).bind(clientId, now.toISOString()).first();
  const gate = publishingGate({
    now,
    publishedToday: Number(publishedState?.published_today || 0),
    lastPublishedAt: publishedState?.last_published_at || null
  });
  // 23/10/2026: story não conta nos 90 min entre posts do feed e não espera por eles.
  // Antes, o story das 10h30 saía e travava o post do feed do mesmo horário.
  const hasStory = rows.some(row => isStoryPost(parseJson(row.payload_json, {})));
  if (!gate.ok && !(hasStory && isPublishingWindow(now))) {
    return { ...summary, blockedReason: gate.reason };
  }
  if (!gate.ok) summary.blockedReason = gate.reason;
  const done = { feed: 0, story: 0 };

  for (const row of rows) {
    const payload = parseJson(row.payload_json, {});
    const story = isStoryPost(payload);
    if (!canPublishInSweep({ story, gateOk: gate.ok, done })) continue;
    const guard = publishGuard(payload, clientId);
    if (!guard.ok) {
      await savePostResult(env, row, { status: row.status, error: guard.error, payload });
      summary.skipped += 1;
      continue;
    }
    const imageUrl = String(payload.imageUrl || payload.publicImageUrl || "");
    if (!imageUrl || !row.caption) {
      summary.skipped += 1;
      continue;
    }

    try {
      const claim = await env.DB.prepare(
        "UPDATE post_ledger SET payload_json=json_set(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.publishingStartedAt',strftime('%Y-%m-%dT%H:%M:%SZ','now')), status = 'publishing', error = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND status IN ('ready','scheduled','failed')"
      ).bind(row.id).run();
      if (!claim?.meta?.changes) {
        summary.skipped += 1;
        continue;
      }

      payload.publishingStartedAt = new Date().toISOString();
      const result = await publishInstagramPost(
        env,
        clientId,
        payload,
        String(row.caption || "")
      );

      await savePostResult(env, row, {
        status: "published",
        mediaId: result.mediaId,
        payload: {
          ...payload,
          permalink: result.permalink || "",
          publishedAt: new Date().toISOString(),
          containerId: result.containerId || ""
        }
      });
      summary.published += 1;
      done[story ? "story" : "feed"] += 1;
    } catch (error) {
      const retries = Math.max(0, Number(payload.retryCount || 0)) + 1;
      await savePostResult(env, row, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        payload: {
          ...payload,
          retryCount: retries,
          lastPublishAttemptAt: new Date().toISOString()
        }
      });
      summary.failed += 1;
    }
  }
  return summary;
}

async function updateJob(env, id, status, attempts, lastError = "") {
  await env.DB.prepare(
    `UPDATE scheduled_jobs
     SET status = ?2, attempts = ?3, last_error = ?4, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`
  ).bind(id, status, attempts, String(lastError || "").slice(0, 900)).run();
}

export async function processDueJobs(env, scheduledAt = new Date(), scope = {}) {
  const active = automationEnabled(env);
  const now = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt || Date.now());
  const scoped = Boolean(scope.clientId && scope.kind);
  const filter = scoped ? " AND client_id = ?2 AND kind = ?3" : "";
  const parameters = scoped ? [now.toISOString(), String(scope.clientId), String(scope.kind)] : [now.toISOString()];

  if (!active) {
    const shadowed = await env.DB.prepare(
      "UPDATE scheduled_jobs SET status = 'shadow', updated_at = CURRENT_TIMESTAMP WHERE status = 'scheduled' AND due_at <= ?1" + filter
    ).bind(...parameters).run();
    return {
      active: false,
      mode: "shadow",
      shadowed: Number(shadowed?.meta?.changes || 0),
      message: "Cloudflare automation is staged; due jobs are shadowed and cannot run after cutover."
    };
  }

  const staleQuery = env.DB.prepare(
    `UPDATE scheduled_jobs
     SET status='failed', last_error='stale_running_job_recovered', updated_at=CURRENT_TIMESTAMP
     WHERE status='running' AND updated_at < datetime('now','-10 minutes')${scoped ? " AND client_id = ?1 AND kind = ?2" : ""}`
  );
  await (scoped ? staleQuery.bind(String(scope.clientId), String(scope.kind)) : staleQuery).run();

  const result = await env.DB.prepare(
    `SELECT id, client_id, kind, due_at, status, attempts, payload_json
     FROM scheduled_jobs
     WHERE status = 'scheduled' AND due_at <= ?1${filter}
     ORDER BY due_at ASC
     LIMIT 12`
  ).bind(...parameters).all();

  const summary = { active: true, processed: 0, completed: 0, failed: 0, deferred: 0 };

  // Drain at most one due job per client in each cron iteration.
  // This prevents one busy client from starving the other clients for hours.
  const dueJobs = selectFairDueJobs(result?.results || [], 4);

  for (const job of dueJobs) {
    const attempts = Math.max(0, Number(job.attempts || 0)) + 1;
    const claim = await env.DB.prepare("UPDATE scheduled_jobs SET status='running',attempts=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND status='scheduled'").bind(job.id, attempts).run();
    if (!claim?.meta?.changes) continue;

    try {
      if (job.kind === "publisher-sweep") {
        await runAgentCoreCycle(env, job.client_id, {
          trigger: "publisher-sweep",
          agent: "publisher"
        });
        const publishSummary = await runPublisherSweep(env, job.client_id, now);
        if (publishSummary.failed > 0) {
          throw new Error("publisher_sweep_failed:" + publishSummary.failed);
        }
        await updateJob(env, job.id, "completed", attempts);
        summary.completed += 1;
      } else if (job.kind === "lead-hunter") {
        const client = await getClient(env, job.client_id);
        const hunter = client ? await leadHunterConfig(env, client) : null;
        if (!hunter?.enabled || !hunter?.autoRun) {
          await updateJob(env, job.id, "failed", attempts, "lead_hunter_automatic_disabled");
          summary.deferred += 1;
        } else {
          await runLeadHunter(env, job.client_id, { trigger: "scheduler", automatic: true });
          await updateJob(env, job.id, "completed", attempts);
          summary.completed += 1;
        }
      } else if (job.kind === "agent-core-cycle") {
        const payload = parseJson(job.payload_json, {});
        await runAgentCoreCycle(env, job.client_id, {
          trigger: String(payload.trigger || "scheduler"),
          agent: String(payload.agent || "all")
        });
        await updateJob(env, job.id, "completed", attempts);
        summary.completed += 1;
      } else {
        await updateJob(env, job.id, "failed", attempts, "unsupported_job_kind");
        summary.failed += 1;
      }
    } catch (error) {
      await updateJob(
        env,
        job.id,
        attempts < 3 ? "scheduled" : "failed",
        attempts,
        error instanceof Error ? error.message : String(error)
      );
      summary.failed += 1;
    }
    summary.processed += 1;
  }

  return summary;
}
