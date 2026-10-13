import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expireStalePosts } from "../src/scheduler.js";

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

test("post aprovado vencido ganha erro próprio; rascunho vencido continua igual; post novo não muda", async () => {
  const { db, DB } = fakeD1();
  db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES('primeiro-teste','Flow Arts','online','{}')").run();
  const insert = db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,created_at) VALUES(?,?,?,?,?,?)");
  insert.run("aprovado", "primeiro-teste", "2026-10-11T15:00:00Z", "failed", "approved", "2026-10-11 10:00:00");
  insert.run("rascunho", "primeiro-teste", "2026-10-11T22:00:00Z", "ready", "pending", "2026-10-11 10:00:00");
  insert.run("novo", "primeiro-teste", "2026-10-13T15:00:00Z", "scheduled", "approved", "2026-10-13 10:00:00");
  insert.run("publicado", "primeiro-teste", "2026-10-11T15:00:00Z", "published", "approved", "2026-10-11 10:00:00");

  const result = await expireStalePosts({ DB }, "primeiro-teste", new Date("2026-10-13T12:00:00Z"));
  assert.deepEqual(result, { approvedMissed: 1, drafts: 1 });

  const row = id => db.prepare("SELECT status, error FROM post_ledger WHERE id=?").get(id);
  assert.deepEqual({ ...row("aprovado") }, { status: "expired", error: "approved_post_missed" });
  assert.deepEqual({ ...row("rascunho") }, { status: "expired", error: "stale_ready_expired" });
  assert.equal(row("novo").status, "scheduled");
  assert.equal(row("publicado").status, "published");
});

test("painel Master avisa post aprovado que não saiu e não diz mais 'publica no horário'", () => {
  const app = fs.readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");
  assert.match(app, /approved_post_missed/);
  assert.match(app, /posts-missed-warning/);
  assert.match(app, /Aprovado · NÃO foi publicado/);
  assert.match(app, /expired: \["VENCIDA"/);
});
