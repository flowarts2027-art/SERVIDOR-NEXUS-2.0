import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSnapshot } from "../src/insights.js";

test("relatório FORJA ordena posts por seguidores ganhos", () => {
  const summary = summarizeSnapshot({
    source: "instagram-api",
    followersCount: 10,
    items: [
      { id: "a", caption: "A", insights: { reach: 50, follows: 1, profile_visits: 4 } },
      { id: "b", caption: "B", insights: { reach: 90, follows: 3, profile_visits: 2 } },
      { id: "c", caption: "C", insights: { reach: 10 } },
      { id: "d", caption: "D", insights: { reach: 20, follows: 0, profile_visits: 5 } }
    ]
  }, {}, new Date("2026-10-11T12:00:00Z"));
  assert.deepEqual(summary.followerPosts, ["b", "a", "d"]);
  assert.equal(summary.totals.follows, 4);
  assert.equal(summary.totals.profileVisits, 11);
  assert.equal(summary.posts.find(p => p.id === "c").follows, 0);
});

test("sem dados de seguidores, a lista fica vazia", () => {
  const summary = summarizeSnapshot({ items: [{ id: "x", insights: { reach: 3 } }] });
  assert.deepEqual(summary.followerPosts, []);
  assert.equal(summary.totals.follows, 0);
});
