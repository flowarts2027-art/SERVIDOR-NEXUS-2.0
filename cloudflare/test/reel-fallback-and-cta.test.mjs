import test from "node:test";
import assert from "node:assert/strict";
import { runFormatBuilder } from "../src/format-builder.js";

test("Reel aprovado vira post de imagem quando o GitHub recusa (conta suspensa)", async () => {
  const updates = [];
  const row = { id: "r1", status: "ready", approval_status: "approved", scheduled_for: "2026-10-11T12:00:00Z",
    payload_json: JSON.stringify({ imageUrl: "https://nexus.test/media/a.jpg", creativeFeatures: { requestedFormat: "reel" },
      qualityGates: { copyChief: "approved", designer: "approved" } }) };
  const env = {
    GITHUB_ACTIONS_TOKEN: "old-token", PUBLIC_BASE_URL: "https://nexus.test",
    DB: { prepare(sql) { return { bind(...args) { return {
      all: async () => ({ results: /FROM post_ledger/.test(sql) ? [row] : [] }),
      first: async () => null,
      run: async () => { if (/UPDATE post_ledger/.test(sql)) updates.push(args); return {}; }
    }; } }; } }
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"message":"Sorry. Your account was suspended"}', { status: 403 });
  try {
    const out = await runFormatBuilder(env, { id: "cliente-teste" }, {});
    assert.equal(out.built, 1);
    assert.equal(out.failed, 0);
    const saved = JSON.parse(updates.find(args => args[0] === "r1")[1]);
    assert.equal(saved.formatBuild.kind, "post");
    assert.equal(saved.formatBuild.fallbackFrom, "reel");
    assert.equal(saved.qualityGates.formatBuilder, "approved");
  } finally {
    globalThis.fetch = original;
  }
});
