import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { runCronIteration } from "../src/cron-runtime.js";
import { schedulerErrorCode } from "../src/scheduler.js";

test("executor continua mesmo quando o planejamento do scheduler falha", async () => {
  const calls = [];
  const result = await runCronIteration({
    at: new Date("2026-09-30T11:00:00Z"),
    runScheduler: async () => {
      calls.push("scheduler");
      throw new Error("D1_ERROR: query failed");
    },
    recordFailure: async (_at, error) => {
      calls.push("failure");
      return schedulerErrorCode(error);
    },
    processJobs: async () => {
      calls.push("jobs");
      return { processed: 1 };
    }
  });

  assert.deepEqual(calls, ["scheduler", "failure", "jobs"]);
  assert.equal(result.schedulerErrorCode, "d1_query_error");
  assert.equal(result.jobs.processed, 1);
});

test("scheduler error codes are sanitized into stable categories", () => {
  assert.equal(schedulerErrorCode(new Error("no such column: foo")), "d1_schema_error");
  assert.equal(schedulerErrorCode(new Error("request timed out")), "scheduler_timeout");
  assert.equal(schedulerErrorCode(new Error("Too many subrequests")), "scheduler_resource_limit");
  assert.equal(schedulerErrorCode(new Error("unexpected failure with secret-looking text")), "scheduler_tick_error");
});

test("wrangler keeps production cron on a D1-safe fifteen-minute cadence", async () => {
  const [wrangler, schedule] = await Promise.all([
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../cron.schedule", import.meta.url), "utf8")
  ]);
  // O agendador pesado (D1) continua a cada 15 min; o cron de 1 min é leve (só direct do brinde).
  assert.match(wrangler, /"triggers"\s*:\s*\{[\s\S]*"crons"\s*:\s*\["\*\/15 \* \* \* \*"(, "\* \* \* \* \*")?]/);
  assert.equal(schedule.trim(), "*/15 * * * *");
  const index = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const minuteBranch = index.match(/if \(String\(event\.cron \|\| ""\) === MINUTE_CRON\) \{[\s\S]*?return;\n    \}/)?.[0] || "";
  assert.ok(minuteBranch, "cron de 1 minuto precisa sair antes do agendador");
  assert.doesNotMatch(minuteBranch, /runCronIteration|runSchedulerTick|processDueJobs/);
});


test("publisher-sweep executes the real Instagram publishing routine", async () => {
  const executor = await readFile(new URL("../src/executor.js", import.meta.url), "utf8");
  const publisherBranch = executor.match(/if \(job\.kind === "publisher-sweep"\) \{[\s\S]*?\} else if \(job\.kind === "lead-hunter"\)/)?.[0] || "";
  assert.match(publisherBranch, /runAgentCoreCycle\(env, job\.client_id/);
  assert.match(publisherBranch, /runPublisherSweep\(env, job\.client_id, now\)/);
  assert.match(publisherBranch, /publisher_sweep_failed/);
});
