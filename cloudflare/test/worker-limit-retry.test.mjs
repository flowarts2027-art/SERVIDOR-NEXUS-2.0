import test from "node:test";
import assert from "node:assert/strict";
import { isPublisherOnlyMinute } from "../src/executor.js";

test("minutos terminados em 2 e 7 são só de publicar", () => {
  for (const m of [2, 7, 22, 37, 52, 57]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), true);
  for (const m of [0, 5, 15, 30, 45, 8, 1]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), false);
});
