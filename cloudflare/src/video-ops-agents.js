import { agentCoreState, patchAgentCoreState, recordAgentExecution } from "./agent-core.js";
import { verifyReadyVideoArtifacts } from "./video-artifact-evidence.js";

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch { return fallback; }
}

async function recentVideoJobs(env, clientId, limit = 80) {
  const rows = await env.DB.prepare(
    `SELECT id,client_id,source_object_key,status,settings_json,result_json,created_at,updated_at
     FROM video_jobs WHERE client_id=?1
     ORDER BY COALESCE(updated_at,created_at) DESC LIMIT ?2`
  ).bind(String(clientId), Math.max(1, Math.min(200, Number(limit || 80)))).all();
  return (rows?.results || []).map(row => ({
    ...row,
    settings: parseJson(row.settings_json, {}),
    result: parseJson(row.result_json, {})
  }));
}

// Match each D1 'ready' claim to an independently probed MP4 in R2.
async function recentReadyClips(env, clientId) {
  const rows = await env.DB.prepare(
    `SELECT j.id AS job_id, c.id AS clip_id, c.output_object_key
     FROM video_jobs j
     LEFT JOIN video_clips c
       ON c.job_id=j.id AND c.client_id=j.client_id AND c.status='ready'
     WHERE j.client_id=?1 AND j.status='ready'
     ORDER BY j.updated_at DESC LIMIT 12`
  ).bind(String(clientId)).all();
  return rows?.results || [];
}

function ageMinutes(row) {
  const stamp = Date.parse(String(row.updated_at || row.created_at || ""));
  return Number.isFinite(stamp) ? Math.max(0, Math.floor((Date.now() - stamp) / 60000)) : 0;
}

export async function runMediaIngestAgent(env, client, options = {}) {
  const startedAt = new Date().toISOString();
  const rows = await recentVideoJobs(env, client.id, 100);
  const youtube = rows.filter(row => ["youtube","catalog-preview"].includes(String(row.settings?.sourceProvider || "")));
  const importing = youtube.filter(row => row.status === "importing");
  const confirmed = [];
  const missing = [];

  for (const row of youtube.slice(0, 40)) {
    if (!row.source_object_key || !["awaiting_configuration","cutting","ready"].includes(String(row.status || ""))) continue;
    try {
      const object = await env.MEDIA?.head(String(row.source_object_key));
      if (object && Number(object.size) > 0) confirmed.push({ id: row.id, bytes: Number(object.size) });
      else missing.push({ id: row.id, reason: "source_not_found_in_r2" });
    } catch {
      missing.push({ id: row.id, reason: "r2_head_failed" });
    }
  }

  const output = {
    supervisedBy: "odin",
    scope: "youtube->source->r2->video_source",
    observed: youtube.length,
    importing: importing.length,
    confirmedSources: confirmed.length,
    missingSources: missing.length,
    oldestImportMinutes: importing.reduce((max,row)=>Math.max(max,ageMinutes(row)),0),
    missing: missing.slice(0,12),
    skills: ["youtube-ingest","source-validation","r2-handoff","video-source-readiness"]
  };

  await recordAgentExecution(env, client, "MEDIA/INGEST", {
    function: "video-media-ingest-supervision",
    trigger: options.trigger || "scheduler",
    startedAt,
    status: missing.length ? "warning" : "success",
    model: "nexus-media-ingest-v1",
    quantity: youtube.length,
    message: missing.length
      ? missing.length + " fonte(s) de vídeo precisam de recuperação antes do render."
      : confirmed.length + " fonte(s) confirmada(s) no R2; ingestão sob supervisão."
  });
  await patchAgentCoreState(env, client.id, { mediaIngest: output });
  return output;
}

export async function runQaRecoveryAgent(env, client, options = {}) {
  const startedAt = new Date().toISOString();
  const rows = await recentVideoJobs(env, client.id, 120);
  const recovered = [];
  const warnings = [];

  for (const row of rows) {
    const age = ageMinutes(row);
    const settings = row.settings || {};
    const result = row.result || {};

    if (row.status === "importing" && age >= 20) {
      delete settings.ingestCallbackToken;
      await env.DB.prepare(
        "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='importing'"
      ).bind(
        String(row.id), String(client.id), JSON.stringify(settings),
        JSON.stringify({ ...result, progress: 0, message: "A importação travou e foi liberada pelo QA/RECOVERY para nova tentativa.", error: "youtube_ingest_timeout" })
      ).run();
      recovered.push({ id: row.id, from: "importing", action: "released_as_failed", ageMinutes: age });
      continue;
    }

    if (row.status === "cutting" && age >= 45) {
      delete settings.githubRenderToken;
      settings.githubRenderState = "failed";
      await env.DB.prepare(
        "UPDATE video_jobs SET status='failed',settings_json=?3,result_json=?4,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND client_id=?2 AND status='cutting'"
      ).bind(
        String(row.id), String(client.id), JSON.stringify(settings),
        JSON.stringify({ ...result, progress: 0, message: "O render travou e foi liberado pelo QA/RECOVERY para gerar novamente.", error: "video_render_timeout" })
      ).run();
      recovered.push({ id: row.id, from: "cutting", action: "released_as_failed", ageMinutes: age });
      continue;
    }

    if (row.status === "failed") warnings.push({ id: row.id, error: String(result.error || "").slice(0,160), ageMinutes: age });
  }

  let artifactEvidence;
  try {
    const readyClips = await recentReadyClips(env, client.id);
    artifactEvidence = await verifyReadyVideoArtifacts(env, client.id, readyClips);
  } catch {
    artifactEvidence = {
      status: "unavailable", scope: "recent_ready_video_jobs",
      checked: 0, confirmed: 0, failed: 0,
      issues: [{ reason: "d1_evidence_query_failed" }]
    };
  }
  const unverifiedArtifacts = ["unverified", "unavailable"].includes(artifactEvidence.status);

  const output = {
    supervisedBy: "odin",
    scope: "video-job-health+stale-job-recovery",
    artifactEvidence,
    inspected: rows.length,
    recovered: recovered.length,
    failuresObserved: warnings.length,
    recoveries: recovered.slice(0,20),
    warnings: warnings.slice(0,20),
    skills: ["job-watchdog","timeout-recovery","render-health","ingest-health","retry-readiness"]
  };

  await recordAgentExecution(env, client, "QA/RECOVERY", {
    function: "video-pipeline-watchdog",
    trigger: options.trigger || "scheduler",
    startedAt,
    status: recovered.length || warnings.length || unverifiedArtifacts ? "warning" : "success",
    model: "nexus-qa-recovery-v1",
    quantity: rows.length,
    message: unverifiedArtifacts
      ? "QA: arquivos MP4 marcados como prontos ainda não foram confirmados no R2. Verificar evidências."
      : recovered.length
        ? recovered.length + " job(s) travado(s) liberado(s) automaticamente."
        : warnings.length
          ? warnings.length + " falha(s) de vídeo monitorada(s), sem job travado agora."
          : "Pipeline de vídeo sem jobs travados.",
    metadata: {
      artifactEvidence: {
        status: artifactEvidence.status,
        checked: artifactEvidence.checked,
        confirmed: artifactEvidence.confirmed,
        failed: artifactEvidence.failed
      }
    }
  });
  await patchAgentCoreState(env, client.id, { qaRecovery: output });
  return output;
}
