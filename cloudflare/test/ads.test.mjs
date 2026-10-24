import test from "node:test";
import assert from "node:assert/strict";
import { validateBoost, splitCity, boostWindow, adsLive, planGivesAds, adsView, handleAdsPortal } from "../src/ads.js";

function fakeEnv(extra = {}) {
  const state = new Map();
  const DB = { prepare(sql) { return { bind(...a) { return {
    first: async () => { if (/FROM nexus_state/.test(sql)) { const v = state.get(a.join("|")); return v ? { value_json: v, updated_at: "" } : null; } return null; },
    run: async () => { if (/INSERT INTO nexus_state/.test(sql)) state.set([a[0], a[1], a[2]].join("|"), a[3]); return { meta: { changes: 1 } }; },
    all: async () => ({ results: [] }) }; }, run: async () => ({}) }; } };
  return { DB, ...extra };
}

test("impulsionar: regras do pedido", () => {
  const ok = validateBoost({ postId: "p1", daily: "20", days: 7, city: "Curitiba PR", radiusKm: 20, confirm: true });
  assert.equal(ok.dailyCents, 2000); assert.equal(ok.totalCents, 14000);
  assert.throws(() => validateBoost({ postId: "p1", daily: 5, days: 7, city: "Curitiba PR", radiusKm: 20, confirm: true }), /daily_invalid/);
  assert.throws(() => validateBoost({ postId: "p1", daily: 20, days: 40, city: "Curitiba PR", radiusKm: 20, confirm: true }), /days_invalid/);
  assert.throws(() => validateBoost({ postId: "p1", daily: 20, days: 7, city: "Curitiba PR", radiusKm: 20 }), /confirm_required/);
  assert.deepEqual(splitCity("Belo Horizonte MG"), { name: "Belo Horizonte", state: "MG" });
  const w = boostWindow(3, new Date("2026-10-24T12:00:00Z"));
  assert.equal(Date.parse(w.endAt) - Date.parse(w.startAt), 3 * 86400000);
});

test("impulsionar: desligado até a Meta liberar; plano Tráfego dá acesso", async () => {
  assert.equal(adsLive({ NEXUS_ADS: "on" }), false);
  assert.equal(adsLive({ NEXUS_ADS: "on", META_APP_ID: "1", META_APP_SECRET: "x" }), true);
  const client = { id: "c1", config: { plan: { id: "trafego" } } };
  assert.equal(planGivesAds(client), true);
  const view = await adsView(fakeEnv(), client);
  assert.equal(view.access, true); assert.equal(view.live, false);
  const res = await handleAdsPortal(new Request("https://x/api/portal/ads/connect", { method: "POST" }), fakeEnv(), new URL("https://x/api/portal/ads/connect"), client);
  const body = await res.json();
  assert.equal(body.error, "ads_not_live");
  const no = await handleAdsPortal(new Request("https://x/api/portal/ads/connect", { method: "POST" }), fakeEnv(), new URL("https://x/api/portal/ads/connect"), { id: "c2" });
  assert.equal((await no.json()).error, "ads_no_access");
});
