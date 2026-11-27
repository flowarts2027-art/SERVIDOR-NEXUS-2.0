import test from "node:test";
import assert from "node:assert/strict";
import { safeZonePrompt, parseSide, keepSubjectLeft, feedPanelStartInPhoto, SAFE_FEED_MAX_X, SAFE_STORY_MAX_Y, PANEL_STORY_START } from "../src/photo-zone.js";
import { cloudflareImage } from "../src/gemini-campaign.js";

test("foto à esquerda: a área livre fica antes do painel medido nas molduras", () => {
  assert.equal(Math.round(feedPanelStartInPhoto() * 100), 50, "post: painel começa na metade da foto");
  assert.ok(SAFE_FEED_MAX_X < feedPanelStartInPhoto(), "post: folga antes do painel");
  assert.ok(SAFE_STORY_MAX_Y < PANEL_STORY_START, "story: folga antes do painel");
});

test("foto à esquerda: o pedido à IA traz a medida certa de cada formato", () => {
  assert.match(safeZonePrompt("4:5"), /LEFT 45%/);
  assert.match(safeZonePrompt("9:16"), /TOP 37%/);
});

test("foto à esquerda: entende a resposta da IA", () => {
  assert.equal(parseSide("DIREITA"), "right");
  assert.equal(parseSide("esquerda."), "left");
  assert.equal(parseSide("Centro"), "center");
  assert.equal(parseSide(""), null);
});

function fakeImages(log) {
  return { input() { const steps = []; const node = {
    transform(o) { steps.push(o); return node; },
    async output() { log.push(steps); return { response: async () => new Response(new Uint8Array([9, 9, 9])) }; }
  }; return node; } };
}

test("foto à esquerda: pessoa à direita no post é espelhada; à esquerda fica como veio", async () => {
  const log = [];
  const env = { IMAGES: fakeImages(log) };
  const right = await keepSubjectLeft(env, new Uint8Array([1]), "4:5", async () => "DIREITA");
  assert.equal(right.flipped, true);
  assert.deepEqual(log.at(-1), [{ flip: "h" }]);
  const left = await keepSubjectLeft(env, new Uint8Array([1]), "4:5", async () => "ESQUERDA");
  assert.equal(left.flipped, false);
  const unknown = await keepSubjectLeft(env, new Uint8Array([1]), "4:5", async () => null);
  assert.equal(unknown.flipped, false, "na dúvida não mexe");
  const story = await keepSubjectLeft(env, new Uint8Array([1]), "9:16", async () => "DIREITA");
  assert.equal(story.flipped, false, "story não espelha");
});

function quotaDb() {
  const rows = new Map();
  return { prepare() { let args = []; return {
    bind(...a) { args = a; return this; },
    async first() { return rows.has(args[0]) ? { value_json: rows.get(args[0]) } : null; },
    async run() { rows.set(args[0], args[1]); return {}; }
  }; } };
}

test("foto à esquerda: o gerador grátis põe a regra na frente do pedido", async () => {
  const prompts = [];
  const env = { DB: quotaDb(), AI: { run: async (model, input) => {
    if (input?.multipart) {
      const form = await new Response(input.multipart.body, { headers: { "content-type": input.multipart.contentType } }).formData();
      prompts.push(form.get("prompt"));
      return { image: "iVBORw0KGgo=" };
    }
    return { response: "ESQUERDA" };
  } } };
  await cloudflareImage(env, "SCENE: bakery", "4:5");
  assert.match(prompts[0], /^COMPOSITION/);
  assert.match(prompts[0], /SCENE: bakery$/);
});
