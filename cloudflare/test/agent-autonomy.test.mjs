import test from "node:test";
import assert from "node:assert/strict";
import { AGENT_CORE_MODULES, NEXUS_COORDINATOR_ID, NEXUS_WORKER_MODULES, normalizeAgentCoreConfig } from "../src/agent-core.js";

test("Nexus keeps 19 agents with ODIN as coordinator and 18 workers", () => {
  const ids = AGENT_CORE_MODULES.map(item => item.id);
  assert.equal(ids.length, 19);
  assert.equal(NEXUS_COORDINATOR_ID, "odin");
  assert.equal(AGENT_CORE_MODULES[0].id, "odin");
  assert.equal(AGENT_CORE_MODULES[0].role, "coordinator");
  assert.equal(AGENT_CORE_MODULES[0].reportsTo, null);
  assert.equal(NEXUS_WORKER_MODULES.length, 18);
  for (const worker of NEXUS_WORKER_MODULES) {
    assert.equal(worker.role, "worker");
    assert.equal(worker.reportsTo, "odin");
  }
  assert.deepEqual(ids, [
    "odin",
    "radar",
    "estrategista",
    "pesquisador",
    "analista",
    "creator",
    "hook-lab",
    "story",
    "viral",
    "copy-chief",
    "designer",
    "format-builder",
    "video",
    "publisher",
    "suporte",
    "auditor",
    "growth",
    "media-ingest",
    "qa-recovery"
  ]);
});

test("all autonomous modules default to enabled for Nexus clients", () => {
  const cfg = normalizeAgentCoreConfig({
    id: "globalplay-streaming",
    config: {}
  });
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.autoPublish, true);
  for (const agent of AGENT_CORE_MODULES) {
    assert.equal(cfg.modules[agent.id], true, agent.id + " should default enabled");
  }
});


test("Global Play forces FORMAT BUILDER enabled even with stale persisted false", () => {
  const cfg = normalizeAgentCoreConfig({
    id: "globalplay-streaming",
    config: { agentCore: { modules: { "format-builder": false } } }
  });
  assert.equal(cfg.modules["format-builder"], true);
});

test("other clients keep an explicit FORMAT BUILDER disable", () => {
  const cfg = normalizeAgentCoreConfig({
    id: "other-client",
    config: { agentCore: { modules: { "format-builder": false } } }
  });
  assert.equal(cfg.modules["format-builder"], false);
});
