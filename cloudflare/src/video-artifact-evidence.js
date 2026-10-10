/**
 * Independent evidence gate for video jobs marked ready in D1.
 * A database status or an agent's message is NOT proof that an MP4 still exists.
 * Read-only: never mutates video jobs or publishes content.
 */
const MAX_CHECKS = 12;

function clipPrefix(clientId) {
  return "videos/" + String(clientId || "").replace(/[^a-zA-Z0-9_-]+/g, "-") + "/clips/";
}

export async function verifyReadyVideoArtifacts(env, clientId, records = []) {
  const rows = (Array.isArray(records) ? records : []).slice(0, MAX_CHECKS);
  const expectedPrefix = clipPrefix(clientId);
  const evidence = {
    status: "not_applicable",
    scope: "recent_ready_video_jobs",
    checked: rows.length,
    confirmed: 0,
    failed: 0,
    issues: []
  };
  if (!rows.length) return evidence;

  for (const row of rows) {
    const jobId = String(row?.job_id || "").slice(0, 90);
    const clipId = String(row?.clip_id || "").slice(0, 90);
    const key = String(row?.output_object_key || "");
    let reason = "";

    if (!clipId || !key) reason = "ready_job_without_clip";
    else if (!key.startsWith(expectedPrefix) || !key.endsWith(".mp4") || key.includes("..") || key.includes("\\")) {
      reason = "invalid_clip_object_key";
    } else if (typeof env?.MEDIA?.head !== "function") {
      reason = "r2_evidence_unavailable";
    } else {
      try {
        const object = await env.MEDIA.head(key);
        if (object && Number.isFinite(Number(object.size)) && Number(object.size) > 0) {
          evidence.confirmed++;
        } else {
          reason = "rendered_mp4_missing_in_r2";
        }
      } catch {
        reason = "r2_evidence_check_failed";
      }
    }

    if (reason) {
      evidence.failed++;
      evidence.issues.push({ jobId, clipId, reason });
    }
  }

  evidence.status = evidence.failed ? "unverified" : "verified";
  return evidence;
}
