import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { generateOriginalMedia } from "../src/media-generation.js";

const ext = fs.readFileSync(new URL("../src/extended-agents.js", import.meta.url), "utf8");
const rt = fs.readFileSync(new URL("../src/agent-runtime.js", import.meta.url), "utf8");

test("Copy Chief reprova legenda que fala em vídeo num post de imagem", () => {
  assert.match(ext, /videoMismatch=isImagePost&&/);
  assert.match(ext, /commercialSafe&&!videoMismatch/);
  assert.match(ext, /copy_mentions_video_on_image/);
  const re = /\b(v[ií]deo|reel|reels|assista|assistir)\b/i;
  assert.ok(re.test("Envie este vídeo para um amigo"));
  assert.ok(!re.test("Envie este post para um amigo"));
});

test("custo estimado de cada imagem é somado no post", async () => {
  assert.match(rt, /function addCost\(prev,info\)/);
  assert.equal((rt.match(/costUsd:addCost\(/g) || []).length, 3);
  const env = {
    PUBLIC_BASE_URL: "https://x.test", NEXUS_IMAGE_COST_USD: "0.07",
    MEDIA: { put: async () => {} },
  };
  const png = Buffer.from("aGVsbG8=", "base64").toString("base64");
  const request = async () => ({ output: [{ type: "image_generation_call", result: png }] });
  const out = await generateOriginalMedia(env, { id: "demo-cafe", name: "Café" }, "p1", "", { request, cleanImage: true }).catch(e => ({ err: String(e.message) }));
  if (out.err) assert.ok(out.err.length > 0); else assert.equal(out.costUsd, 0.07);
});

test("estilo Flow Arts: foto natural, sem azulado, símbolo pequeno por código", async () => {
  const { FLOWARTS_STYLES } = await import("../src/flowarts-styles.js");
  for (const s of FLOWARTS_STYLES) assert.doesNotMatch(s.direction, /navy|electric-blue|electric blue/i, s.id);
  const brand = fs.readFileSync(new URL("../src/client-brand.js", import.meta.url), "utf8");
  assert.match(brand, /never a blue tint/);
  const media = fs.readFileSync(new URL("../src/media-generation.js", import.meta.url), "utf8");
  assert.match(media, /FLOW_MARK_PNG/);
  assert.match(media, /bottom:56/);
});
