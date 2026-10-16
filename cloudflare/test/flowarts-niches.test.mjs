import test from "node:test";
import assert from "node:assert/strict";
import { FLOWARTS_NICHES, pickNiche, nicheById } from "../src/flowarts-niches.js";
import { buildVisualPrompt } from "../src/media-generation.js";

test("sorteia tipos diferentes e evita os recentes", () => {
  const seen = new Set();
  const avoid = [];
  for (let i = 0; i < FLOWARTS_NICHES.length; i++) {
    const n = pickNiche({ seed: "post-" + i, avoid });
    assert.ok(!avoid.includes(n.id));
    avoid.push(n.id); seen.add(n.id);
  }
  assert.equal(seen.size, FLOWARTS_NICHES.length);
});

test("o prompt da imagem da Flow Arts usa o negócio sorteado", () => {
  const client = { id: "primeiro-teste", name: "Flow Arts" };
  const prompt = buildVisualPrompt(client, "a small bakery owner handing a bag", "seed", { nicheId: "barbearia" });
  assert.match(prompt, /Business setting for this post \(mandatory\): a neighborhood barbershop/);
  assert.ok(nicheById("barbearia"));
});
