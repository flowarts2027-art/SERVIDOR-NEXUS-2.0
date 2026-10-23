import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSnapshot, clientInsights } from "../src/insights.js";

const snapshot = {
  source: "instagram-api", username: "flowarts2026", followersCount: 2, mediaCount: 2,
  items: [
    { id: "1", mediaType: "VIDEO", likeCount: 3, commentsCount: 1, insights: { reach: 40, views: 90, saved: 2, shares: 1 } },
    { id: "2", mediaType: "IMAGE", likeCount: 1, commentsCount: 0, insights: { reach: 10 } }
  ]
};

test("resume números da conta e de cada post", () => {
  const out = summarizeSnapshot(snapshot, {}, new Date("2026-10-11T10:00:00Z"));
  assert.equal(out.followers, 2);
  assert.equal(out.totals.reach, 50);
  assert.equal(out.totals.likes, 4);
  assert.equal(out.posts[0].views, 90);
  assert.deepEqual(out.followersHistory, [{ day: "2026-10-11", followers: 2 }]);
});

function fakeEnv(store = {}) {
  return { DB: { prepare(sql) { return { bind(...args) { return {
    first: async () => (store.row ? { value_json: store.row } : null),
    run: async () => { store.row = args[2]; return {}; }
  }; } }; } } };
}

test("usa o cache por 30 minutos e não chama a Meta de novo", async () => {
  const store = {}; let calls = 0;
  const fetchSnapshot = async () => { calls++; return snapshot; };
  const env = fakeEnv(store);
  await clientInsights(env, { id: "c" }, { fetchSnapshot, now: new Date("2026-10-11T10:00:00Z") });
  const second = await clientInsights(env, { id: "c" }, { fetchSnapshot, now: new Date("2026-10-11T10:10:00Z") });
  assert.equal(calls, 1);
  assert.equal(second.cached, true);
});

test("Instagram desconectado vira erro claro", async () => {
  const out = await clientInsights(fakeEnv(), { id: "c" }, { fetchSnapshot: async () => ({ source: "local", error: "instagram_not_connected" }) });
  assert.equal(out.ok, false);
  assert.equal(out.error, "instagram_not_connected");
});

test("trocou de Instagram: descarta números e histórico da conta antiga na hora", async () => {
  const store = {}; let calls = 0;
  const env = fakeEnv(store);
  const old = { ...snapshot, username: "contapessoal", followersCount: 1433 };
  await clientInsights(env, { id: "c", instagram: "@contapessoal" }, { fetchSnapshot: async () => old, now: new Date("2026-10-11T10:00:00Z") });
  const fresh = { ...snapshot, username: "contanova", followersCount: 395 };
  const out = await clientInsights(env, { id: "c", instagram: "@contanova" }, { fetchSnapshot: async () => { calls++; return fresh; }, now: new Date("2026-10-11T10:05:00Z") });
  assert.equal(calls, 1, "não usa o cache da conta antiga");
  assert.equal(out.followers, 395);
  assert.equal(out.username, "contanova");
  assert.deepEqual(out.followersHistory, [{ day: "2026-10-11", followers: 395 }]);
});
