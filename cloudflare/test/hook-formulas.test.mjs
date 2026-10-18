import test from "node:test";
import assert from "node:assert/strict";
import { HOOK_FORMULAS, pickHookFormulas, hookFormulasText, hookProblems } from "../src/hook-formulas.js";
import { reviewCopy } from "../src/brand-guard.js";
import { campaignCopyPrompt } from "../src/campaign-copy.js";
import { MARKETING_AGENT_INSTRUCTIONS } from "../src/carousel-agent.js";

test("fórmulas de gancho: 15, sem as que dependem de número inventado", () => {
  assert.equal(HOOK_FORMULAS.length, 15);
  assert.equal(new Set(HOOK_FORMULAS.map(f => f.id)).size, 15);
  for (const f of HOOK_FORMULAS) assert.ok(f.modelo && f.exemplo && f.armadilha, f.id);
  assert.ok(!HOOK_FORMULAS.some(f => /estat[íi]stic|recibo|custo/i.test(f.nome)));
});

test("escolha de fórmulas varia pelo tema e não repete dentro da mesma escolha", () => {
  const a = pickHookFormulas("tema A", 4).map(f => f.id);
  const b = pickHookFormulas("outro tema bem diferente", 4).map(f => f.id);
  assert.equal(new Set(a).size, 4);
  assert.notDeepEqual(a, b);
  assert.deepEqual(pickHookFormulas("tema A", 4).map(f => f.id), a);
  assert.match(hookFormulasText("x"), /Regras do gancho/);
});

test("revisor do gancho aponta os erros clássicos", () => {
  assert.deepEqual(hookProblems("Se seu salão lota no sábado e fica vazio na terça, leia isto."), []);
  assert.ok(hookProblems("Oi gente, tudo bem? Hoje vou falar de Instagram").includes("começa com cumprimento"));
  assert.ok(hookProblems("Pare de rolar e leia isto").includes("pede para parar de rolar"));
  assert.ok(hookProblems("Neste post vou te mostrar 3 dicas").some(p => /enrola/.test(p)));
  assert.ok(hookProblems("Dica boa #marketing").includes("hashtag no gancho"));
  assert.ok(hookProblems("Dica de hoje 🔥 para você").includes("emoji no gancho"));
  assert.ok(hookProblems(Array(20).fill("palavra").join(" "))[0].startsWith("gancho longo"));
  assert.deepEqual(hookProblems("Bora treinar?"), []);
  assert.deepEqual(hookProblems(""), []);
});

test("Revisor do painel mostra gancho fraco na Flow Arts", () => {
  const warnings = reviewCopy({ id: "primeiro-teste" }, "Olá pessoal! Hoje vou mostrar como postar\n\nTexto.");
  assert.ok(warnings.some(w => w.code === "gancho"));
  assert.ok(!reviewCopy({ id: "primeiro-teste" }, "Você não precisa dançar no Reels para vender.\n\nTexto.").some(w => w.code === "gancho"));
});

test("agentes recebem as fórmulas de gancho", () => {
  assert.match(campaignCopyPrompt({ id: "primeiro-teste" }, { theme: "Legenda", angle: "dor" }), /Regras do gancho/);
  assert.match(MARKETING_AGENT_INSTRUCTIONS, /Cartão 1 \(gancho\)/);
  assert.match(MARKETING_AGENT_INSTRUCTIONS, /Cartão 2 \(dor\) tem que fazer sentido sozinho/);
});
