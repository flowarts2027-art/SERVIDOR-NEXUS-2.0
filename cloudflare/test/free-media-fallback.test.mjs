import test from "node:test";
import assert from "node:assert/strict";
import { generateOriginalMedia } from "../src/media-generation.js";

test("OpenAI pausada: imagem sai grátis pela Cloudflare em vez de travar", async () => {
  const saved = [];
  const env = {
    AI: {}, PUBLIC_BASE_URL: "https://nexus.test",
    MEDIA: { put: async (key) => { saved.push(key); } }
  };
  const out = await generateOriginalMedia(env, { id: "quatree-dog", name: "Quatree Dog" }, "p1", "ração para cães", {
    contentFormat: "image", cleanImage: true,
    freeImage: async () => ({ bytes: new Uint8Array([1, 2, 3]), model: "teste" }),
    request: () => { throw new Error("não pode chamar OpenAI"); }
  });
  assert.equal(out.costUsd, 0);
  assert.match(out.url, /^https:\/\/nexus\.test\/media\/posts\/quatree-dog\/p1\/free-/);
  assert.equal(saved.length, 1);
});
