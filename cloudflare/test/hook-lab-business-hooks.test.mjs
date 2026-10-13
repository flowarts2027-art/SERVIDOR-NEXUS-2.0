import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { runExtendedAgents, STREAMING_HOOKS, BUSINESS_HOOKS } from "../src/extended-agents.js";

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, DB };
}

test("ganchos de pequeno negócio não falam de filme", () => {
  for (const hook of BUSINESS_HOOKS) {
    assert.doesNotMatch(hook, /filme|assistir|assistindo|play|noite|travar/i, hook);
    assert.ok(hook.split(/\s+/).length <= 10, hook);
  }
});

test("Hook Lab troca frase de filme na legenda do Café Brisa e da Flow Arts", async () => {
  const { db, DB } = fakeD1();
  for (const id of ["demo-cafe", "primeiro-teste"]) {
    db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES(?,?,'online','{}')").run(id, id);
    db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,caption,payload_json) VALUES(?,?,?,?,?,?,?)")
      .run(id + "-post", id, "2026-10-14T13:00:00Z", "ready", "pending",
        STREAMING_HOOKS[0] + "\n\nNo Café Brisa, o pão de queijo sai quentinho.",
        JSON.stringify({ creativeFeatures: { hook: STREAMING_HOOKS[0] } }));
    await runExtendedAgents({ DB }, id, { agent: "hook-lab", trigger: "test" });
    const row = db.prepare("SELECT caption, payload_json FROM post_ledger WHERE id=?").get(id + "-post");
    const first = row.caption.split("\n")[0];
    assert.ok(BUSINESS_HOOKS.includes(first), id + ": " + first);
    assert.match(row.caption, /pão de queijo sai quentinho/);
    assert.ok(BUSINESS_HOOKS.includes(JSON.parse(row.payload_json).creativeFeatures.hook));
  }
});
