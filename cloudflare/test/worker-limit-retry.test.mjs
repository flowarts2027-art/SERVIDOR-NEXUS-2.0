import test from "node:test";
import assert from "node:assert/strict";
import { isWorkerLimitError, isPublisherOnlyMinute } from "../src/executor.js";

test("erro de limite do Worker é reconhecido", () => {
  assert.equal(isWorkerLimitError("Too many subrequests by single Worker invocation. To configure..."), true);
  assert.equal(isWorkerLimitError("instagram_container_missing"), false);
  assert.equal(isWorkerLimitError(""), false);
});

test("minutos terminados em 2 e 7 são só de publicar", () => {
  for (const m of [2, 7, 22, 37, 52, 57]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), true);
  for (const m of [0, 5, 15, 30, 45, 8, 1]) assert.equal(isPublisherOnlyMinute(new Date(Date.UTC(2026, 10, 4, 15, m))), false);
});

test("ciclo de agentes da rodada de 15 min não publica", async () => {
  const { publisherSkippedForTrigger } = await import("../src/agent-runtime.js");
  assert.equal(publisherSkippedForTrigger("scheduler"), true);
  assert.equal(publisherSkippedForTrigger("publisher-sweep"), false);
  assert.equal(publisherSkippedForTrigger("manual"), false);
});
