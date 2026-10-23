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
