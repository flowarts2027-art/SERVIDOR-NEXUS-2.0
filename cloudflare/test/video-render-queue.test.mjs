import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { videoRenderQueueExpired, videoErrorMessages } from "../src/video-source.js";

const NOW = Date.parse("2026-10-08T11:00:00.000Z");
test("GitHub-dispatched jobs wait for a runner instead of claiming work completed", () => {
  const age = minutes => new Date(NOW - minutes * 60000).toISOString();
  assert.equal(videoRenderQueueExpired({githubRenderState:"dispatched",githubRenderUpdatedAt:age(7)},NOW),false);
  assert.equal(videoRenderQueueExpired({githubRenderState:"dispatched",githubRenderUpdatedAt:age(13)},NOW),true);
  assert.equal(videoRenderQueueExpired({githubRenderState:"rendering",githubRenderUpdatedAt:age(31)},NOW),false);
  assert.equal(videoRenderQueueExpired({githubRenderState:"preparing",githubRenderUpdatedAt:age(18)},NOW),false);
  assert.equal(videoRenderQueueExpired({githubRenderState:"dispatched",githubRenderUpdatedAt:"invalid"},NOW),false);
  assert.match(videoErrorMessages.video_render_queue_timeout,/GitHub.*iniciou|não iniciou.*GitHub/i);
});

test("Old workflow reruns do not block a fresh dispatch of the same job", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/video-template-render.yml", import.meta.url),"utf8");
  assert.match(workflow,/group:\s*nexus-video-render-attempt-\$\{\{ github\.run_id \}\}/);
  assert.doesNotMatch(workflow,/group:\s*nexus-video-render-\$\{\{ github\.event\.client_payload\.job_id \}\}/);
  assert.match(workflow,/"progress":39/);
  assert.match(workflow,/"progress":41/);
  assert.match(workflow,/"progress":43/);
  const render = readFileSync(new URL("../src/github-video-render.js", import.meta.url),"utf8");
  assert.match(render,/progress: 28, message: "Comando aceito/);
  assert.doesNotMatch(render,/progress: 38, message: "Montando as cenas/);
});
