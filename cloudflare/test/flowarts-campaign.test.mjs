import test from "node:test";
import assert from "node:assert/strict";
import { FLOW_ARTS_CAMPAIGN_DAYS, flowArtsCampaignForDay, flowArtsCampaignStrategy } from "../src/flowarts-campaign.js";

test("campanha da Flow Arts tem 60 peças em 30 dias, com formatos válidos", () => {
  assert.equal(FLOW_ARTS_CAMPAIGN_DAYS.length, 60);
  for (const row of FLOW_ARTS_CAMPAIGN_DAYS) assert.ok(["reel", "carousel", "post"].includes(row[0]), row.join("|"));
  const strategy = flowArtsCampaignStrategy();
  assert.equal(strategy.dailySlots, 2);
  assert.equal(strategy.fixedMonthlyFormats.total, 60);
});

test("campanha não fala de streaming nem promete números", () => {
  const text = JSON.stringify(FLOW_ARTS_CAMPAIGN_DAYS);
  assert.doesNotMatch(text, /streaming|filme|série|futebol|R\$/i);
});

test("cada dia entrega 2 peças com CTA e gancho", () => {
  for (let day = 1; day <= 30; day++) {
    const items = flowArtsCampaignForDay(new Date(Date.UTC(2026, 9, day, 15)));
    assert.equal(items.length, 2);
    for (const item of items) { assert.ok(item.hook); assert.ok(item.cta); assert.ok(item.visualBrief); }
  }
});

test("sem render de Reels, o Reel vira post de imagem", () => {
  const items = flowArtsCampaignForDay(new Date(Date.UTC(2026, 9, 1, 15)), { reelsEnabled: false });
  assert.equal(items[0].plannedFormat, "reel");
  assert.equal(items[0].format, "post");
});

test("conversão usa o CTA EXEMPLO", () => {
  const conv = FLOW_ARTS_CAMPAIGN_DAYS.findIndex(row => row[3] === "conversão");
  const items = flowArtsCampaignForDay(new Date(Date.UTC(2026, 9, Math.floor(conv / 2) + 1, 15)));
  assert.ok(items.some(item => /EXEMPLO/.test(item.cta)));
});
