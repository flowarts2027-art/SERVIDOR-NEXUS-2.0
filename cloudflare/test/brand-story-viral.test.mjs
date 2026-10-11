import test from "node:test";
import assert from "node:assert/strict";
import { runExtendedAgents } from "../src/extended-agents.js";

function fakeEnv(row) {
  const updates = [];
  const client = { id: "primeiro-teste", name: "PRIMEIRO TESTE", niche: "Outro", status: "online", config_json: "{}" };
  const env = { DB: { prepare(sql) { return { bind(...args) { return {
    all: async () => ({ results: /FROM post_ledger/.test(sql) ? [row] : [] }),
    first: async () => (/FROM clients/.test(sql) ? client : null),
    run: async () => { if (/UPDATE post_ledger/.test(sql)) updates.push(args); return {}; }
  }; } }; } } };
  return { env, updates };
}

const row = {
  id: "p1", status: "ready", approval_status: "pending",
  caption: "Identidade visual que passa confiança",
  payload_json: JSON.stringify({
    title: "Identidade visual que passa confiança",
    creativeFeatures: { storytelling: true, hook: "Identidade visual que passa confiança", scene: "cores, fontes e consistência",
      campaignGoal: "compartilhamento", cta: "Envie para um empreendedor que precisa ver isso.", hashtags: "#FlowArts #MarketingDigital" }
  })
};

test("STORY da Flow Arts escreve legenda de marketing, sem frases de streaming", async () => {
  const { env, updates } = fakeEnv(row);
  await runExtendedAgents(env, "primeiro-teste", { agent: "story" }).catch(() => null);
  const caption = updates.map(args => args[1]).find(value => typeof value === "string" && value.includes("Flow Arts")) || "";
  assert.ok(caption, "legenda reescrita");
  assert.doesNotMatch(caption, /assistir|diversão/i);
  assert.match(caption, /#FlowArts/);
  assert.equal((caption.match(/Identidade visual que passa confiança/g) || []).length, 1);
});
