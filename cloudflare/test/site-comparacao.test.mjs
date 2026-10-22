import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const site = fs.readFileSync(new URL("../../public/site.html", import.meta.url), "utf8");

test("site compara app de agendamento, social media e Flow Arts, sem citar marcas nem preços de terceiros", () => {
  const section = site.slice(site.indexOf('id="comparar"'), site.indexOf('id="pacotes"'));
  assert.ok(section.length > 200, "seção de comparação antes dos pacotes");
  assert.match(section, /App de agendar post não cria post\./);
  assert.match(section, /href="\/exemplo"/);
  assert.doesNotMatch(section, /mLabs|Postgrain|Metricool|Buffer|Hootsuite|R\$/i);
});

test("pergunta 'É igual a um app de agendar post?' no FAQ e nos dados do Google", () => {
  assert.match(site, /<summary>É igual a um app de agendar post\?<\/summary>/);
  assert.match(site, /"name": "É igual a um app de agendar post\?"/);
});

test("atendente do WhatsApp sabe a diferença e não fala mal nem cita preço de concorrente", async () => {
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  const prompt = knowledgePrompt("primeiro-teste");
  assert.match(prompt, /esses apps só agendam e mostram números/);
  assert.match(prompt, /Nunca falar mal de concorrente nem citar preço de concorrente/);
});
