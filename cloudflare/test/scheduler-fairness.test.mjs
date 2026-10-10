import test from "node:test";
import assert from "node:assert/strict";
import { compareDueJobs, selectFairDueJobs } from "../src/executor.js";
import { queueTimestamp } from "../src/scheduler.js";

test("ciclo antigo vence publisher mais novo e não fica faminto", () => {
  const jobs = [
    { id:"publisher-new", kind:"publisher-sweep", due_at:"2026-09-30T01:10:00Z" },
    { id:"cycle-old", kind:"agent-core-cycle", due_at:"2026-09-30T01:00:00Z" }
  ].sort(compareDueJobs);
  assert.equal(jobs[0].id, "cycle-old");
});

test("publisher só ganha como desempate quando due_at é igual", () => {
  const due = "2026-09-30T01:00:00Z";
  const jobs = [
    { id:"cycle", kind:"agent-core-cycle", due_at:due },
    { id:"publisher", kind:"publisher-sweep", due_at:due },
    { id:"hunter", kind:"lead-hunter", due_at:due }
  ].sort(compareDueJobs);
  assert.deepEqual(jobs.map(job=>job.id), ["publisher","cycle","hunter"]);
});

test("enqueue recusado não renova artificialmente o relógio", () => {
  const previous = "2026-09-30T00:30:00.000Z";
  const now = new Date("2026-09-30T01:00:00.000Z");
  assert.equal(queueTimestamp(previous, now, false), previous);
  assert.equal(queueTimestamp(previous, now, true), now.toISOString());
});


test("executor drains one due job per client so a busy client cannot starve another", () => {
  const due = "2026-10-04T10:00:00Z";
  const selected = selectFairDueJobs([
    { id:"g1", client_id:"globalplay-streaming", kind:"publisher-sweep", due_at:due },
    { id:"g2", client_id:"globalplay-streaming", kind:"agent-core-cycle", due_at:due },
    { id:"r1", client_id:"ragnar-one", kind:"agent-core-cycle", due_at:due },
    { id:"r2", client_id:"ragnar-one", kind:"publisher-sweep", due_at:due }
  ], 4);
  assert.equal(selected.length, 2);
  assert.deepEqual(new Set(selected.map(job=>job.client_id)), new Set(["globalplay-streaming","ragnar-one"]));
});
