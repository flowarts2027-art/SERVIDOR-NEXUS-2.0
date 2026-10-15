import test from "node:test";
import assert from "node:assert/strict";
import { runFormatBuilder, plannedFormat } from "../src/format-builder.js";

test("pedido de Reel vira post 4:5", () => {
  assert.equal(plannedFormat("reel"), "post");
  assert.equal(plannedFormat("REEL"), "post");
  assert.equal(plannedFormat("carousel"), "carousel");
  assert.equal(plannedFormat(""), "image");
});

test("Reel sem vídeo de verdade não é renderizado com zoom", async () => {
  const gates = { copyChief: "approved", designer: "approved" };
  const rows = [
    { id: "a", payload_json: JSON.stringify({ imageUrl: "https://x/a.png", creativeFeatures: { requestedFormat: "reel" }, mediaGeneration: { contentFormat: "reel" }, qualityGates: gates }) },
    { id: "b", payload_json: JSON.stringify({ imageUrl: "https://x/b.png", creativeFeatures: { requestedFormat: "reel" }, mediaGeneration: { contentFormat: "post" }, qualityGates: gates }) },
    { id: "c", payload_json: JSON.stringify({ imageUrl: "https://x/c.png", creativeFeatures: { requestedFormat: "reel" }, formatBuild: { videoUrl: "https://x/c.mp4", source: "manual-flow" }, qualityGates: gates }) }
  ];
  const saved = {};
  const env = {
    GITHUB_ACTIONS_TOKEN: "tok", PUBLIC_BASE_URL: "https://nexus.test",
    DB: { prepare: sql => ({ bind: (...args) => ({
      all: async () => ({ results: /FROM post_ledger/.test(sql) ? rows : [] }),
      run: async () => { if (/UPDATE post_ledger SET payload_json/.test(sql)) saved[args[0]] = { payload: JSON.parse(args[1]), sql }; return {}; },
      first: async () => null
    }), all: async () => ({ results: [] }), run: async () => ({}), first: async () => null }) }
  };
  const realFetch = globalThis.fetch;
  let dispatched = 0;
  globalThis.fetch = async () => { dispatched++; return new Response("", { status: 204 }); };
  try {
    await runFormatBuilder(env, { id: "primeiro-teste" }, { trigger: "test" });
  } finally { globalThis.fetch = realFetch; }
  assert.equal(dispatched, 0);
  assert.equal(saved.a.payload.imageUrl, "");
  assert.equal(saved.a.payload.creativeFeatures.requestedFormat, "post");
  assert.match(saved.a.sql, /media_generation_required/);
  assert.equal(saved.b.payload.formatBuild.kind, "post");
  assert.equal(saved.b.payload.qualityGates.formatBuilder, "approved");
  assert.equal(saved.c.payload.formatBuild.kind, "reel");
  assert.equal(saved.c.payload.formatBuild.videoUrl, "https://x/c.mp4");
});
