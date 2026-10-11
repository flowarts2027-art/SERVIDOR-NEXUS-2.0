import test from "node:test";
import assert from "node:assert/strict";
import { clientBrand } from "../src/client-brand.js";
import { buildVisualPrompt } from "../src/media-generation.js";

const flowArts = { id: "primeiro-teste", name: "PRIMEIRO TESTE", niche: "Outro", config: {} };

test("Flow Arts recebe perfil de marketing mesmo com nome de teste no painel", () => {
  const brand = clientBrand(flowArts);
  assert.equal(brand.brandName, "Flow Arts");
  assert.equal(brand.niche, "Marketing digital");
  assert.match(brand.hashtags, /#MarketingDigital/);
  assert.doesNotMatch(brand.hashtags, /Streaming/);
});

test("prompt de imagem da Flow Arts fala de marketing, não de streaming", () => {
  const prompt = buildVisualPrompt(flowArts, "", "seed");
  assert.match(prompt, /Brand context: Flow Arts, Marketing digital\./);
  assert.match(prompt, /entrepreneurs/);
  assert.doesNotMatch(prompt, /streaming|home-entertainment/i);
});

test("nome e nicho salvos no painel têm prioridade", () => {
  const brand = clientBrand({ ...flowArts, config: { agentProfile: { brandName: "Outra Marca", niche: "Moda" } } });
  assert.equal(brand.brandName, "Outra Marca");
  assert.equal(brand.niche, "Moda");
});

test("Flow Arts tem temas de marketing para os três horários", () => {
  const brand = clientBrand(flowArts);
  for (const key of ["contentFocus", "morningTheme", "afternoonTheme", "eveningTheme", "tone"]) {
    assert.ok(brand[key], key);
  }
  assert.match(brand.contentFocus, /marketing/i);
});

import { IMAGE_GENERATION_CLIENTS, usefulThemeTerms } from "../src/client-brand.js";

test("Flow Arts pode gerar imagens próprias", () => {
  assert.ok(IMAGE_GENERATION_CLIENTS.has("primeiro-teste"));
});

test("palavras de comentário não viram tema de post", () => {
  assert.deepEqual(usefulThemeTerms(["quero", "comente", "conteudo", "anúncios", "Instagram", "eu"]), ["anúncios", "Instagram"]);
});

import { isOutdatedBrandDraft, brandProfileVersion } from "../src/client-brand.js";

test("rascunho antigo e não aprovado da Flow Arts é refeito", () => {
  assert.equal(isOutdatedBrandDraft("primeiro-teste", { status: "ready", approval_status: "pending" }, {}), true);
});

test("post aprovado, publicado ou já na versão atual é mantido", () => {
  const v = brandProfileVersion("primeiro-teste");
  assert.equal(isOutdatedBrandDraft("primeiro-teste", { status: "ready", approval_status: "approved" }, {}), false);
  assert.equal(isOutdatedBrandDraft("primeiro-teste", { status: "published", approval_status: "pending" }, {}), false);
  assert.equal(isOutdatedBrandDraft("primeiro-teste", { status: "ready", approval_status: "pending" }, { brandProfileVersion: v }), false);
});

test("clientes sem perfil de marca não são afetados", () => {
  assert.equal(isOutdatedBrandDraft("outro-cliente", { status: "ready", approval_status: "pending" }, {}), false);
});
