// 13/11/2026 (Rodrigo): o agente criou carrossel com imagem de IA para a Daniela e o Adimax.
// A regra "não recebe imagem gerada" valia só no Vigia. Agora o Creator segue a mesma lista.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usesGeneratedImage, receivesGeneratedImage } from "../src/no-generation.js";

const runtime = readFileSync(new URL("../src/agent-runtime.js", import.meta.url), "utf8");
const watcher = readFileSync(new URL("../src/post-watcher.js", import.meta.url), "utf8");

test("Daniela, Quatree, Adimax e GILTEC não usam imagem gerada", () => {
  for (const id of ["daniela-martins", "quatree-dog", "adimax-eduardo-soares", "giltec", "giltec-locacoes"]) {
    assert.equal(usesGeneratedImage({ id }), false, id);
    assert.equal(receivesGeneratedImage(id), false, id);
  }
  for (const id of ["primeiro-teste", "maskara-assessoria", "nexus-ai"]) assert.equal(usesGeneratedImage({ id }), true, id);
});

test("o Creator não usa a IA grátis para quem não recebe imagem gerada", () => {
  const gate = runtime.indexOf('error:"generated_image_not_allowed"');
  const fallback = runtime.indexOf('source:"free-ai-fallback"');
  assert.ok(gate > 0 && fallback > gate, "a trava vem antes da IA grátis");
  assert.match(runtime.slice(gate - 200, gate), /if\(!usesGeneratedImage\(client\)\)/);
});

test("o Creator só cria post para esses clientes com campanha de artes próprias", () => {
  assert.match(runtime, /if\(!usesGeneratedImage\(client\)&&campaignSettings\(client\)\?\.artSource!=="own"\)continue;/);
});

test("Vigia e Creator usam a mesma lista", () => {
  assert.match(watcher, /from "\.\/no-generation\.js"/);
  assert.doesNotMatch(watcher, /const NO_GENERATION_CLIENTS/);
});
