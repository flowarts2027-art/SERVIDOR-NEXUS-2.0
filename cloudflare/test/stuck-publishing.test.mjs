import test from "node:test";
import assert from "node:assert/strict";
import { recoverStuckPublishing } from "../src/executor.js";

function fakeEnv(rows) {
  const saved = [];
  return { saved, env: { DB: { prepare(sql) { return { bind(...args) { return {
    all: async () => ({ results: /status = 'publishing'/.test(sql) ? rows : [] }),
    run: async () => { if (/UPDATE post_ledger/.test(sql)) saved.push(args); return {}; }
  }; } }; } } } };
}

test("post preso em publicando e achado no Instagram vira publicado, sem publicar de novo", async () => {
  const { env, saved } = fakeEnv([{ id: "p1", status: "publishing", caption: "Legenda X", payload_json: "{}" }]);
  const out = await recoverStuckPublishing(env, "c", new Date(), async () => ({ mediaId: "m1", permalink: "https://instagram.com/p/x" }));
  assert.deepEqual(out, { recovered: 1, failed: 0 });
  assert.equal(saved[0][1], "published");
  assert.equal(saved[0][2], "m1");
});

test("post preso e não achado volta como falha para nova tentativa", async () => {
  const { env, saved } = fakeEnv([{ id: "p2", status: "publishing", caption: "Y", payload_json: JSON.stringify({ publishingStartedAt: new Date(Date.now() - 20 * 60000).toISOString() }) }]);
  const out = await recoverStuckPublishing(env, "c", new Date(), async () => null);
  assert.deepEqual(out, { recovered: 0, failed: 1 });
  assert.equal(saved[0][1], "failed");
  assert.equal(JSON.parse(saved[0][4]).retryCount, 1);
});

test("post recente e ainda não visto no Instagram fica esperando", async () => {
  const { env, saved } = fakeEnv([{ id: "p3", status: "publishing", caption: "Z", payload_json: JSON.stringify({ publishingStartedAt: new Date().toISOString() }) }]);
  const out = await recoverStuckPublishing(env, "c", new Date(), async () => null);
  assert.deepEqual(out, { recovered: 0, failed: 0 });
  assert.equal(saved.length, 0);
});
