import test from "node:test";
import assert from "node:assert/strict";
import { FLOWARTS_STYLES, pickFlowArtsStyle } from "../src/flowarts-styles.js";
import { buildVisualPrompt, styleForPost } from "../src/media-generation.js";
import { visualApproval } from "../src/visual-review.js";

const flow = { id: "primeiro-teste", name: "Flow Arts", config: {} };

test("biblioteca tem estilos únicos e todos respeitam as zonas seguras", () => {
  assert.ok(FLOWARTS_STYLES.length >= 8);
  assert.equal(new Set(FLOWARTS_STYLES.map(s => s.id)).size, FLOWARTS_STYLES.length);
  for (const s of FLOWARTS_STYLES) assert.match(s.direction, /headline/i);
});

test("estilo combina com o tema e evita os recentes", () => {
  const erro = pickFlowArtsStyle({ headline: "Cuidado com esse erro", seed: "a" });
  assert.equal(erro.id, "tipografico-minimal");
  const outro = pickFlowArtsStyle({ headline: "Cuidado com esse erro", seed: "a", avoid: ["tipografico-minimal"] });
  assert.notEqual(outro.id, "tipografico-minimal");
  const todos = pickFlowArtsStyle({ seed: "x", avoid: FLOWARTS_STYLES.map(s => s.id) });
  assert.ok(todos.id);
});

test("é estável para a mesma semente e varia entre sementes", () => {
  const a = pickFlowArtsStyle({ seed: "post-1" }).id;
  assert.equal(a, pickFlowArtsStyle({ seed: "post-1" }).id);
  const ids = new Set(Array.from({ length: 40 }, (_, i) => pickFlowArtsStyle({ seed: "p" + i }).id));
  assert.ok(ids.size >= 4);
});

test("prompt da Flow Arts leva a direção de arte; outros clientes não", () => {
  const prompt = buildVisualPrompt(flow, "Loja de bairro", "seed-1", { title: "Seu perfil afasta clientes?", contentFormat: "image" });
  assert.match(prompt, /Art direction \(/);
  assert.match(prompt, /Seu perfil afasta clientes\?/);
  assert.equal(styleForPost({ id: "ragnar-one" }, "x", "s", {}), null);
});

test("fiscal visual agora vale para a Flow Arts", () => {
  assert.equal(visualApproval("primeiro-teste", { imageUrl: "https://x/y.jpg" }), false);
  assert.equal(visualApproval("primeiro-teste", { imageUrl: "https://x/y.jpg", visualReview: { version: "visual-review-v3", media: "https://x/y.jpg", status: "approved", qualityScore: 80 } }), true);
  assert.equal(visualApproval("outro-cliente", { imageUrl: "https://x/y.jpg" }), true);
});

import { brandHeadline } from "../src/media-generation.js";
import { publishInstagramStory } from "../src/publisher.js";

test("título longo é cortado numa pausa natural, sem reticências", () => {
  const h = brandHeadline(flow, "O post que vende começa pelo problema, não pelo produto que você quer mostrar ao cliente");
  assert.equal(h, "O post que vende começa pelo problema");
  assert.ok(!h.includes("…"));
  assert.equal(brandHeadline(flow, "Seu perfil afasta clientes?"), "Seu perfil afasta clientes?");
});

test("story automático usa media_type STORIES e publica", async () => {
  const calls = [];
  const request = async (token, path, method, form) => {
    calls.push({ path, method, form });
    if (path.endsWith("/media")) return { id: "c1" };
    if (path.startsWith("c1?")) return { status_code: "FINISHED" };
    if (path.endsWith("/media_publish")) return { id: "s1" };
    return {};
  };
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({ provider: "meta", payload_json: "{}" }) }) }) }, INSTAGRAM_ACCESS_TOKEN_X: "" };
  await assert.rejects(() => publishInstagramStory(env, "demo-cafe", "https://x/y.jpg", request), /instagram_client_disabled/);
});

test("hook longo vira frase completa, nunca cortada no meio", () => {
  const flow = { id: "primeiro-teste" };
  const h = brandHeadline(flow, "Se alguém abrir seu perfil por 3 segundos, vai entender o que você vende? Faça este teste agora.");
  assert.equal(h, "Faça este teste agora.");
  assert.equal(brandHeadline(flow, "Seu perfil explica o negócio? Faça este teste agora com um amigo que não conhece sua loja."), "Seu perfil explica o negócio?");
});
