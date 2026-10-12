import test from "node:test";
import assert from "node:assert/strict";
import { buildVisualPrompt, brandHeadline } from "../src/media-generation.js";

test("imagem da Flow Arts traz o gancho escrito em português e formato 4:5", () => {
  const client = { id: "primeiro-teste", config: {} };
  const prompt = buildVisualPrompt(client, "Scene: café owner", "seed", { title: "Seu Instagram parado está custando clientes", contentFormat: "image" });
  assert.match(prompt, /Write exactly this headline in Brazilian Portuguese/);
  assert.match(prompt, /"Seu Instagram parado está custando clientes"/);
  assert.match(prompt, /4:5/);
  assert.doesNotMatch(prompt, /No text, no words/);
});

test("instrução interna em inglês nunca vira texto da imagem", () => {
  assert.equal(brandHeadline({ id: "primeiro-teste" }, "Portrait 4:5 single image with one clear idea"), "");
  assert.equal(brandHeadline({ id: "globalplay-streaming" }, "Qualquer coisa"), "");
});

import { campaignCopyPrompt } from "../src/campaign-copy.js";
import { flowArtsCampaignForDay } from "../src/flowarts-campaign.js";
test("legenda da campanha segue o método de alcance para perfil novo", () => {
  const p = campaignCopyPrompt({ id: "primeiro-teste", config: {} }, { theme: "X", angle: "Y", hook: "Z" });
  assert.match(p, /Método de alcance para perfil novo/);
  assert.match(p, /NUNCA viu o perfil/);
});
test("dias 13 a 17 trazem a sequência de alcance com cena própria", () => {
  const day13 = flowArtsCampaignForDay(new Date("2026-10-13T12:00:00-03:00"));
  assert.equal(day13[0].theme, "Seu Instagram tem 3 segundos para convencer um estranho");
  assert.match(day13[0].visualBrief, /thumb scrolling fast/);
  assert.doesNotMatch(day13[0].visualBrief, /No text/);
});
