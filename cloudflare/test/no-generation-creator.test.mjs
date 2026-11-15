// 13/11/2026 (Rodrigo): o agente criou carrossel com imagem de IA para a Daniela e o Adimax.
// A regra "não recebe imagem gerada" valia só no Vigia. Agora o Creator segue a mesma lista.
// 15/11/2026: além da lista, a geração só vale com "Gerar imagem por IA sozinho" ligado no Master.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usesGeneratedImage, receivesGeneratedImage } from "../src/no-generation.js";

const runtime = readFileSync(new URL("../src/agent-runtime.js", import.meta.url), "utf8");
const watcher = readFileSync(new URL("../src/post-watcher.js", import.meta.url), "utf8");
const ON = { agentCore: { aiImages: true } };

test("Daniela, Quatree, Adimax e GILTEC não usam imagem gerada, nem com a opção ligada", () => {
  for (const id of ["daniela-martins", "quatree-dog", "adimax-eduardo-soares", "giltec", "giltec-locacoes"]) {
    assert.equal(usesGeneratedImage({ id, config: ON }), false, id);
    assert.equal(receivesGeneratedImage(id), false, id);
  }
  for (const id of ["primeiro-teste", "maskara-assessoria", "nexus-ai"]) {
    assert.equal(usesGeneratedImage({ id, config: ON }), true, id);
    assert.equal(usesGeneratedImage({ id }), false, id + " sem a opção do Master");
  }
});

test("o Creator não usa a IA grátis para quem não recebe imagem gerada", () => {
  const gate = runtime.indexOf('error:"generated_image_not_allowed"');
  const fallback = runtime.indexOf('source:"free-ai-fallback"');
  assert.ok(gate > 0 && fallback > gate, "a trava vem antes da IA grátis");
  assert.match(runtime.slice(gate - 200, gate), /if\(!usesGeneratedImage\(client\)\)/);
});

test("o Creator nem roda sem a opção do Master", () => {
  assert.match(runtime, /config\.modules\.creator&&!usesGeneratedImage\(client\)\)\{\s*\/\/[^\n]*\n\s*result\.agents\.creator=\{skipped:true,reason:"generated_image_not_allowed"\}/);
});

test("Vigia e Creator usam a mesma lista", () => {
  assert.match(watcher, /from "\.\/no-generation\.js"/);
  assert.doesNotMatch(watcher, /const NO_GENERATION_CLIENTS/);
});
