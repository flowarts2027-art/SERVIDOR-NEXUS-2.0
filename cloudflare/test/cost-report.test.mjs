import test from "node:test";
import assert from "node:assert/strict";
import { splitCostByPosts } from "../src/master-openai.js";

test("divide o custo real pelos posts com imagem", () => {
  const out = splitCostByPosts(2.4, [{ clientId: "primeiro-teste", posts: 10 }, { clientId: "demo-cafe", posts: 2 }]);
  assert.equal(out.totalPosts, 12);
  assert.equal(out.costPerPostUsd, 0.2);
  assert.equal(out.monthlyPerClientUsd, 2.4);
  assert.equal(out.clients[0].estimatedUsd, 2);
  assert.equal(out.clients[1].estimatedUsd, 0.4);
});

test("sem custo real, não inventa valores", () => {
  const out = splitCostByPosts(null, [{ clientId: "a", posts: 3 }]);
  assert.equal(out.totalCostUsd, null);
  assert.equal(out.costPerPostUsd, null);
  assert.equal(out.clients[0].estimatedUsd, null);
});
