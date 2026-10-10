import test from "node:test";
import assert from "node:assert/strict";
import { verifyReadyVideoArtifacts } from "../src/video-artifact-evidence.js";
import { runQaRecoveryAgent } from "../src/video-ops-agents.js";

const CLIENT = "globalplay-streaming";
const key = "videos/globalplay-streaming/clips/clip_001.mp4";
const ready = { job_id: "job_001", clip_id: "clip_001", output_object_key: key };

test("ready claim is verified only after successful R2 HEAD with nonzero bytes", async () => {
  const requested = [];
  const result = await verifyReadyVideoArtifacts({
    MEDIA: { async head(objectKey) { requested.push(objectKey); return { size: 1234 }; } }
  }, CLIENT, [ready]);
  assert.deepEqual(requested, [key]);
  assert.equal(result.status, "verified");
  assert.equal(result.confirmed, 1);
  assert.equal(result.failed, 0);
});

test("R2 missing or zero-byte output never counts as a completed video", async () => {
  for (const object of [null, { size: 0 }]) {
    const result = await verifyReadyVideoArtifacts({
      MEDIA: { head: async () => object }
    }, CLIENT, [ready]);
    assert.equal(result.status, "unverified");
    assert.equal(result.confirmed, 0);
    assert.equal(result.issues[0].reason, "rendered_mp4_missing_in_r2");
  }
});

test("missing clip, foreign-client R2 object or missing R2 binding fails closed", async () => {
  let calls = 0;
  const env = { MEDIA: { async head() { calls++; return { size: 777 }; } } };
  const invalid = [
    { job_id: "job_2", clip_id: "", output_object_key: "" },
    { job_id: "job_3", clip_id: "clip_3", output_object_key: "videos/other/ clips/abc.mp4" },
    { job_id: "job_4", clip_id: "clip_4", output_object_key: "videos/other/clips/abc.mp4" },
    { job_id: "job_5", clip_id: "clip_5", output_object_key: "videos/globalplay-streaming/clips/../secret.mp4" }
  ];
  const result = await verifyReadyVideoArtifacts(env, CLIENT, invalid);
  assert.equal(result.failed, 4);
  assert.equal(result.confirmed, 0);
  assert.equal(calls, 0, "must not HEAD arbitrary keys or other clients' objects");
  assert.equal((await verifyReadyVideoArtifacts({}, CLIENT, [ready])).issues[0].reason, "r2_evidence_unavailable");
});

test("transport errors and no jobs are distinguishable from verified success", async () => {
  const unavailable = await verifyReadyVideoArtifacts({
    MEDIA: { async head() { throw Error("network down"); } }
  }, CLIENT, [ready]);
  assert.equal(unavailable.status, "unverified");
  assert.equal(unavailable.issues[0].reason, "r2_evidence_check_failed");
  const none = await verifyReadyVideoArtifacts({ MEDIA: {} }, CLIENT, []);
  assert.equal(none.status, "not_applicable");
  assert.equal(none.checked, 0);
});

test("probes are limited to 12 clips per cycle to bound R2 reads", async () => {
  let probes = 0;
  const rows = Array.from({ length: 30 }, (_, i) => ({ ...ready, clip_id: "clip_" + i }));
  const result = await verifyReadyVideoArtifacts({
    MEDIA: { async head() { probes++; return { size: 50 }; } }
  }, CLIENT, rows);
  assert.equal(probes, 12);
  assert.equal(result.checked, 12);
});

function qaEnv(clips, head) {
  const recorded = [];
  return {
    recorded,
    MEDIA: { head },
    DB: {
      prepare(sql) {
        let params = [];
        return {
          bind(...value) { params = value; return this; },
          async all() {
            if (sql.includes("FROM video_jobs WHERE client_id")) return {
              results: [{
                id: "job_001", client_id: CLIENT, status: "ready",
                settings_json: "{}", result_json: "{}",
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
              }]
            };
            if (sql.includes("LEFT JOIN video_clips")) return { results: clips };
            throw Error("unexpected SELECT: " + sql);
          },
          async first() { return null; },
          async run() {
            if (sql.includes("INSERT INTO agent_executions")) {
              recorded.push({ agent: params[2], status: params[3], detail: JSON.parse(params[4]) });
            }
            return { meta: { changes: 1 } };
          }
        };
      }
    }
  };
}

test("QA agent warns and retains evidence when D1 says ready but R2 MP4 is absent", async () => {
  const env = qaEnv([ready], async () => null);
  const result = await runQaRecoveryAgent(env, { id: CLIENT, name: "Global Play" }, { trigger: "test" });
  assert.equal(result.artifactEvidence.status, "unverified");
  assert.equal(result.artifactEvidence.failed, 1);
  assert.equal(env.recorded[0].agent, "QA/RECOVERY");
  assert.equal(env.recorded[0].status, "warning");
  assert.equal(env.recorded[0].detail.metadata.artifactEvidence.status, "unverified");
});

test("QA agent records independently confirmed MP4 evidence", async () => {
  const env = qaEnv([ready], async () => ({ size: 98765 }));
  const result = await runQaRecoveryAgent(env, { id: CLIENT, name: "Global Play" }, { trigger: "test" });
  assert.equal(result.artifactEvidence.status, "verified");
  assert.equal(env.recorded[0].status, "success");
  assert.equal(env.recorded[0].detail.metadata.artifactEvidence.confirmed, 1);
});
