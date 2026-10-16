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
