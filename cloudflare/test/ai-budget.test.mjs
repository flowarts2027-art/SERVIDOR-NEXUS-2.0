import test from "node:test";
import assert from "node:assert/strict";
import { imageNeurons, imageNeuronCap, reserveImageNeurons, imageNeuronsLeft, isQuotaError, QUOTA_ERROR, FREE_DAILY_NEURONS } from "../src/ai-budget.js";
import { cloudflareImage } from "../src/gemini-campaign.js";

function quotaDb() {
  const rows = new Map();
  return { rows, prepare(sql) { let args = []; return {
    bind(...a) { args = a; return this; },
    async first() { return rows.has(args[0]) ? { value_json: rows.get(args[0]) } : null; },
    async run() { rows.set(args[0], args[1]); return {}; }
  }; } };
}

test("cota grátis: conta os neurônios de cada modelo pela tabela oficial", () => {
  assert.equal(imageNeurons("@cf/black-forest-labs/flux-2-klein-4b", 1024, 1280), Math.ceil(6 * 26.05));
  assert.equal(imageNeurons("@cf/black-forest-labs/flux-2-klein-4b", 1008, 1792), Math.ceil(8 * 26.05));
  assert.equal(imageNeurons("@cf/black-forest-labs/flux-1-schnell", 1024, 1024, 8), Math.ceil(4 * 4.8 + 8 * 9.6));
  assert.ok(imageNeurons("@cf/black-forest-labs/flux-2-klein-9b", 1024, 1024) >= 1363);
  assert.equal(imageNeurons("modelo-novo", 1, 1), 1500, "desconhecido conta como caro");
});

test("cota grátis: imagens nunca passam de 70% dos 10.000 do dia, nem mudando a variável", () => {
  assert.equal(imageNeuronCap({}), 5500);
  assert.equal(imageNeuronCap({ NEXUS_AI_IMAGE_NEURONS: "99999" }), Math.floor(FREE_DAILY_NEURONS * 0.7));
  assert.equal(imageNeuronCap({ NEXUS_AI_IMAGE_NEURONS: "3000" }), 3000);
});

test("cota grátis: reserva até o limite e depois recusa; no dia seguinte (UTC) volta", async () => {
  const env = { DB: quotaDb(), NEXUS_AI_IMAGE_NEURONS: "500" };
  const day1 = new Date("2026-11-27T20:00:00Z");
  await reserveImageNeurons(env, 300, day1);
  assert.equal(await imageNeuronsLeft(env, day1), 200);
  await assert.rejects(reserveImageNeurons(env, 300, day1), new RegExp(QUOTA_ERROR));
  const day2 = new Date("2026-11-28T00:01:00Z");
  await reserveImageNeurons(env, 300, day2);
  assert.equal(await imageNeuronsLeft(env, day2), 200);
});

test("cota grátis: sem banco não gera (melhor sem imagem do que pagar)", async () => {
  await assert.rejects(reserveImageNeurons({}, 10), new RegExp(QUOTA_ERROR));
});

test("cota grátis: cota cheia, a Cloudflare nem é chamada", async () => {
  let calls = 0;
  const env = { DB: quotaDb(), NEXUS_AI_IMAGE_NEURONS: "100", AI: { run: async () => { calls++; return { image: "iVBORw0KGgo=" }; } } };
  await assert.rejects(cloudflareImage(env, "cena", "4:5"), new RegExp(QUOTA_ERROR));
  assert.equal(calls, 0);
});

test("cota grátis: se a Cloudflare disser que a cota acabou (4006), não tenta o modelo reserva", async () => {
  const models = [];
  const env = { DB: quotaDb(), AI: { run: async (m) => { models.push(m); throw new Error("AiError: 4006: you have used up your daily free allocation of 10,000 neurons"); } } };
  await assert.rejects(cloudflareImage(env, "cena", "4:5"), new RegExp(QUOTA_ERROR));
  assert.equal(models.length, 1);
  assert.ok(isQuotaError(new Error("4006: daily free allocation")));
  assert.ok(!isQuotaError(new Error("timeout_90s")));
});
