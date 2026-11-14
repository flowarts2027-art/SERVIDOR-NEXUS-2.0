// 13/11/2026 (Rodrigo): legendas saíram com rótulo interno ("daniela.", "nexus.",
// "Conteúdo útil para salvar."). Sem campanha, IA ou oferta da marca, a legenda vem do nicho.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nicheFallbackCaption } from "../src/caption-templates.js";

const runtime = readFileSync(new URL("../src/agent-runtime.js", import.meta.url), "utf8");

test("legenda de reserva usa frase do nicho e mantém a chamada QUERO", () => {
  const client = { id: "cliente-teste", name: "Loja Teste", niche: "Vendas de Ração Pet" };
  const out = nicheFallbackCaption(client, 3, { cta: 'Comente "QUERO" para saber mais.', tags: "" });
  const parts = out.caption.split("\n\n");
  assert.equal(parts[0], out.hook);
  assert.equal(parts[1], out.body);
  assert.match(out.body, /ração|pet|loja/i);
  assert.equal(parts[2], 'Comente "QUERO" para saber mais.');
  assert.match(parts[3], /^#/);
});

test("legenda de reserva nunca é só o nome do cliente nem rótulo de tema", () => {
  const client = { id: "x", name: "daniela", niche: "Depilaçao e Cuidado da Mulher" };
  for (let turn = 0; turn < 12; turn++) {
    const out = nicheFallbackCaption(client, turn, { cta: "Comente QUERO", tags: "#Dicas" });
    assert.ok(out.body.split(/\s+/).length >= 4, "corpo com frase de verdade");
    assert.doesNotMatch(out.caption, /^daniela\.?$/im);
    assert.doesNotMatch(out.caption, /Conteúdo útil para salvar|Descoberta e curiosidade|Comunidade e opinião/);
    assert.match(out.caption, /Comente QUERO/);
    assert.match(out.caption, /#Dicas$/);
  }
});

test("legenda de reserva varia de uma vez para a outra", () => {
  const client = { id: "x", name: "Loja", niche: "Gráfica" };
  const seen = new Set();
  for (let turn = 0; turn < 9; turn++) seen.add(nicheFallbackCaption(client, turn, {}).caption);
  assert.ok(seen.size >= 6);
});

test("o agente não manda mais tema nem briefing visual para a legenda", () => {
  assert.match(runtime, /nicheFallbackCaption\(client,fallbackTurn,\{cta,tags\}\)/);
  assert.doesNotMatch(runtime, /String\(aiCreative\?\.visualBrief\|\|theme\)/);
});
