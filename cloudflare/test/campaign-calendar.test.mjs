import test from "node:test";
import assert from "node:assert/strict";
import { campaignCalendar } from "../src/flowarts-campaign.js";

test("calendário da campanha traz 2 itens por dia no mês pedido", () => {
  const cal = campaignCalendar("primeiro-teste", "2026-10");
  assert.equal(cal.campaign, true);
  assert.equal(cal.month, "2026-10");
  assert.equal(cal.days.length, 31);
  assert.equal(cal.days[0].date, "2026-10-01");
  for (const day of cal.days) {
    assert.equal(day.items.length, 2);
    assert.deepEqual(day.items.map(item => item.time), ["12:00", "19:00"]);
    for (const item of day.items) {
      assert.ok(["reel", "carousel", "post"].includes(item.format));
      assert.ok(item.theme.length > 5);
    }
  }
  assert.equal(cal.days[0].items[0].theme, "Uma agência de marketing que trabalha 24h por você");
});

test("calendário respeita meses curtos e ignora mês inválido", () => {
  assert.equal(campaignCalendar("primeiro-teste", "2027-02").days.length, 28);
  const now = new Date("2026-10-11T15:00:00Z");
  assert.equal(campaignCalendar("primeiro-teste", "2026-13", now).month, "2026-10");
  assert.equal(campaignCalendar("primeiro-teste", "x<script>", now).month, "2026-10");
});

test("cliente sem campanha recebe calendário vazio", () => {
  const cal = campaignCalendar("ragnar-one", "2026-10");
  assert.equal(cal.campaign, false);
  assert.deepEqual(cal.days, []);
});

test("cenas das imagens variam e a Marina não aparece em todas", async () => {
  const { flowArtsCampaignForDay } = await import("../src/flowarts-campaign.js");
  const briefs = [];
  for (let day = 1; day <= 4; day += 1) {
    for (const item of flowArtsCampaignForDay(new Date(Date.UTC(2026, 9, day, 15)))) briefs.push(item.visualBrief);
  }
  const scenes = new Set(briefs.map(b => b.split("Scene: ")[1].split(". Theme:")[0]));
  assert.equal(scenes.size, 8);
  assert.ok(briefs.filter(b => /Marina/.test(b)).length <= 2);
});

test("dia 12 tem tema diferente do dia 11", async () => {
  const { flowArtsCampaignForDay } = await import("../src/flowarts-campaign.js");
  const d11 = flowArtsCampaignForDay(new Date("2026-10-11T15:00:00Z")).map(i => i.theme);
  const d12 = flowArtsCampaignForDay(new Date("2026-10-12T15:00:00Z")).map(i => i.theme);
  assert.ok(!d12.some(theme => d11.includes(theme)));
});
