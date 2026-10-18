import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { rescheduleMissedToday, todaySlots } from "../src/reschedule-today.js";
import { recoverStuckPublishing } from "../src/executor.js";

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

const ready = JSON.stringify({ imageUrl: "https://x/a.jpg", qualityGates: { copyChief: "approved", designer: "approved" }, retryCount: 3 });

test("horários de hoje: o primeiro agora, de 2 em 2 horas, até 21h45 (Brasília)", () => {
  const now = new Date("2026-10-18T12:30:00Z"); // 09:30 em Brasília
  const slots = todaySlots(10, now);
  assert.equal(slots.length, 7); // 09:30 11:30 13:30 15:30 17:30 19:30 21:30
  assert.equal(slots[0].toISOString(), "2026-10-18T12:30:00.000Z");
  assert.equal(slots[6].toISOString(), "2026-10-19T00:30:00.000Z");
  assert.equal(todaySlots(3, new Date("2026-10-19T01:00:00Z")).length, 0); // 22h: nada hoje
});

test("reagenda só aprovados que não saíram; não mexe em publicado, recusado, futuro ou rascunho vencido", async () => {
  const { db, DB } = fakeD1();
  db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES('primeiro-teste','Flow Arts','online','{}')").run();
  const insert = db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,error,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)");
  insert.run("vencido", "primeiro-teste", "2026-10-15T15:00:00Z", "expired", "approved", "approved_post_missed", ready, "2026-10-15 10:00:00");
  insert.run("legenda", "primeiro-teste", "2026-10-17T15:00:00Z", "scheduled", "approved", "duplicate_caption_blocked", ready, "2026-10-16 10:00:00");
  insert.run("falha", "primeiro-teste", "2026-10-17T18:00:00Z", "failed", "approved", "publish_interrupted", ready, "2026-10-16 11:00:00");
  insert.run("futuro", "primeiro-teste", "2026-10-20T15:00:00Z", "scheduled", "approved", "", ready, "2026-10-17 10:00:00");
  insert.run("publicado", "primeiro-teste", "2026-10-15T15:00:00Z", "published", "approved", "", ready, "2026-10-15 10:00:00");
  insert.run("recusado", "primeiro-teste", "2026-10-15T15:00:00Z", "expired", "rejected", "approved_post_missed", ready, "2026-10-15 10:00:00");
  insert.run("rascunho", "primeiro-teste", "2026-10-15T15:00:00Z", "expired", "approved", "stale_ready_expired", ready, "2026-10-15 10:00:00");

  const result = await rescheduleMissedToday({ DB }, "primeiro-teste", new Date("2026-10-18T12:30:00Z"));
  assert.equal(result.moved, 3);
  assert.deepEqual(result.slots.map(s => s.hour), ["09:30", "11:30", "13:30"]);
  const row = id => db.prepare("SELECT status,error,scheduled_for,payload_json FROM post_ledger WHERE id=?").get(id);
  assert.equal(row("vencido").status, "scheduled");
  assert.equal(row("vencido").error, "");
  assert.equal(row("vencido").scheduled_for, "2026-10-18T12:30:00.000Z");
  assert.equal(JSON.parse(row("vencido").payload_json).retryCount, 0);
  assert.ok(JSON.parse(row("legenda").payload_json).rescheduledByMaster);
  assert.equal(row("futuro").scheduled_for, "2026-10-20T15:00:00Z");
  assert.equal(row("publicado").status, "published");
  assert.equal(row("recusado").status, "expired");
  assert.equal(row("rascunho").status, "expired");
});

test("cliente arquivado não é reagendado", async () => {
  const { DB } = fakeD1();
  const result = await rescheduleMissedToday({ DB }, "ragnar-one");
  assert.equal(result.ok, false);
});

test("post antigo com a mesma legenda não marca como publicado um post novo preso", async () => {
  const { db, DB } = fakeD1();
  db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES('primeiro-teste','Flow Arts','online','{}')").run();
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json,created_at) VALUES(?,?,?,?,?,?,?)")
    .run("preso", "primeiro-teste", "publishing", "approved", "Legenda igual", JSON.stringify({ publishingStartedAt: "2026-10-18T12:00:00Z" }), "2026-10-18 09:00:00");
  const oldMatch = async () => ({ mediaId: "999", permalink: "p", timestamp: "2026-10-10T12:00:00+0000" });
  await recoverStuckPublishing({ DB }, "primeiro-teste", new Date("2026-10-18T12:20:00Z"), oldMatch);
  const row = db.prepare("SELECT status,error FROM post_ledger WHERE id='preso'").get();
  assert.equal(row.status, "failed");
  assert.equal(row.error, "publish_interrupted");
});
