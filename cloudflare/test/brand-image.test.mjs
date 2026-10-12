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
