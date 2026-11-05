import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isClientPaused } from "../src/client-pause.js";
import { runPostWatcher } from "../src/post-watcher.js";
import { enqueueDuePublishers } from "../src/scheduler.js";
import { buildMissingPostsBoard, missingPostsBoard } from "../src/missing-posts.js";

const PAUSED = { NEXUS_PAUSED_CLIENTS: "giltec, giltec-locacoes" };
const ONLINE = id => ({ id, name: id, niche: "", instagram: "@x", status: "online", config_json: "{}", created_at: "", updated_at: "" });

function env(rows, extra = {}) {
  const queries = [];
  return {
    queries,
    env: {
      ...PAUSED,
      ...extra,
      DB: { prepare: sql => ({
        bind() { return this; },
        async all() { queries.push(sql); return { results: rows }; },
        async first() { return null; },
        async run() { queries.push(sql); return { meta: { changes: 1 } }; }
      }) }
    }
  };
}

test("reconhece os clientes pausados e aceita espaços", () => {
  assert.equal(isClientPaused(PAUSED, "giltec"), true);
  assert.equal(isClientPaused(PAUSED, "giltec-locacoes"), true);
  assert.equal(isClientPaused(PAUSED, "primeiro-teste"), false);
  assert.equal(isClientPaused({}, "giltec"), false);
});

test("GILTEC vem pausada no wrangler e fora da campanha diária", async () => {
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"NEXUS_PAUSED_CLIENTS": "giltec,giltec-locacoes"/);
  const workflow = await readFile(new URL("../../.github/workflows/nexus-campanha-diaria.yml", import.meta.url), "utf8");
  assert.doesNotMatch(workflow, /default: "[^"]*giltec/);
  assert.doesNotMatch(workflow, /'[^']*giltec[^']*'/);
});

test("vigia não olha cliente pausado", async () => {
  const { env: e } = env([ONLINE("giltec"), ONLINE("giltec-locacoes")]);
  assert.deepEqual(await runPostWatcher(e, new Date("2026-11-06T12:00:00.000Z"), {}), { checked: 0 });
});

test("rodada de publicação não enfileira cliente pausado", async () => {
  const { env: e, queries } = env([{ ...ONLINE("giltec"), first_due: "2026-11-06T12:00:00.000Z" }]);
  assert.equal(await enqueueDuePublishers(e, new Date("2026-11-06T12:10:00.000Z")), 0);
  assert.equal(queries.filter(sql => /INSERT OR IGNORE INTO scheduled_jobs/.test(sql)).length, 0);
});

test("quadro: cliente pausado não aparece como faltando", async () => {
  const { env: e } = env([ONLINE("giltec")]);
  assert.deepEqual(await missingPostsBoard(e, new Date("2026-11-06T12:00:00.000Z")), { clients: 0, items: [] });
});

test("os dois publicadores param antes de qualquer coisa para cliente pausado", async () => {
  const executor = await readFile(new URL("../src/executor.js", import.meta.url), "utf8");
  assert.match(executor, /async function runPublisherSweep[^\n]*\r?\n\s*if \(isClientPaused\(env, clientId\)\)/);
  const agent = await readFile(new URL("../src/agent-runtime.js", import.meta.url), "utf8");
  assert.match(agent, /if\(isClientPaused\(env,client\.id\)\)/);
});

test("correção pedida perto do horário vira alerta vermelho e não conta como pronto", () => {
  const client = { id: "a", name: "A", status: "online", config: {} };
  const now = new Date("2026-11-05T20:00:00.000Z");
  const post = at => ({ client_id: "a", scheduled_for: at, format: "post", status: "ready", approval_status: "correction_requested", error: "" });
  const near = buildMissingPostsBoard([client], [post("2026-11-06T01:00:00.000Z")], now);
  assert.equal(near.items.find(item => item.text.includes("correção pedida")).level, "today");
  const far = buildMissingPostsBoard([client], [post("2026-11-07T12:00:00.000Z")], now);
  assert.equal(far.items.find(item => item.text.includes("correção pedida")).level, "later");
});
