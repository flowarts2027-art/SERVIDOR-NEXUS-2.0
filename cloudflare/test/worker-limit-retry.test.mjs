import test from "node:test";
import assert from "node:assert/strict";
import { isWorkerLimitError, isPublisherOnlyMinute } from "../src/executor.js";

test("erro de limite do Worker é reconhecido", () => {
  assert.equal(isWorkerLimitError("Too many subrequests by single Worker invocation. To configure..."), true);
  assert.equal(isWorkerLimitError("instagram_container_missing"), false);
  assert.equal(isWorkerLimitError(""), false);
});

test("minutos 7, 22, 37 e 52 são só de publicar", () => {
  for (const m of [7, 22, 37, 52]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), true);
  for (const m of [0, 5, 15, 30, 45, 8]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), false);
});
