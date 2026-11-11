import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canPublishInSweep, isStoryPost } from "../src/executor.js";

test("story não trava o post do feed do mesmo horário", () => {
  const done = { feed: 0, story: 1 };
  assert.equal(canPublishInSweep({ story: false, gateOk: true, done }), true);
});

test("story sai mesmo quando o feed ainda espera os 90 min", () => {
  assert.equal(canPublishInSweep({ story: true, gateOk: false, done: { feed: 0, story: 0 } }), true);
  assert.equal(canPublishInSweep({ story: false, gateOk: false, done: { feed: 0, story: 0 } }), false);
});

test("no máximo 1 feed e 1 story por rodada", () => {
  assert.equal(canPublishInSweep({ story: false, gateOk: true, done: { feed: 1, story: 0 } }), false);
  assert.equal(canPublishInSweep({ story: true, gateOk: true, done: { feed: 0, story: 1 } }), false);
});

test("isStoryPost reconhece o formato story", () => {
  assert.equal(isStoryPost({ creativeFeatures: { requestedFormat: "Story" } }), true);
  assert.equal(isStoryPost({ creativeFeatures: { requestedFormat: "post" } }), false);
});

test("contagem dos 90 min ignora stories publicados", async () => {
  const src = await readFile(new URL("../src/executor.js", import.meta.url), "utf8");
  assert.match(src, /requestedFormat'\),''\)\)<>'story'/);
});

test("Publicar agora: feed do cliente não espera os 90 min e passa na frente dos atrasados", async () => {
  const { isPublishNowPost } = await import("../src/executor.js");
  const at = "2026-11-11T19:28:22.616Z";
  assert.equal(isPublishNowPost({ scheduled_for: at }, { publishNowByClient: { at } }), true);
  // Reagendado depois do clique: volta a respeitar os 90 min.
  assert.equal(isPublishNowPost({ scheduled_for: "2026-11-12T12:00:00.000Z" }, { publishNowByClient: { at } }), false);
  assert.equal(isPublishNowPost({ scheduled_for: at }, {}), false);
  const src = await readFile(new URL("../src/executor.js", import.meta.url), "utf8");
  assert.match(src, /ORDER BY CASE WHEN json_extract\([^\n]*'\$\.publishNowByClient\.at'\) = scheduled_for THEN 0 ELSE 1 END/);
  assert.match(src, /gate\.ok \|\| \(!story && isPublishNowPost\(row, payload\)\)/);
  const runtime = await readFile(new URL("../src/agent-runtime.js", import.meta.url), "utf8");
  assert.match(runtime, /ORDER BY CASE WHEN json_extract\([^\n]*'\$\.publishNowByClient\.at'\)=scheduled_for THEN 0 ELSE 1 END/);
});
