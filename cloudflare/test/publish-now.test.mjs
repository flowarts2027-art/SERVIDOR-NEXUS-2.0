import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { publishPostNow, postIsStuck } from "../src/publish-now.js";
import { visualApproval } from "../src/visual-review.js";

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

test("Reel animado e Reel pronto da Flow Arts passam no fiscal visual", () => {
  const reviewer = r => ({ status: "approved", reviewer: r, reason: "x" });
  assert.equal(visualApproval("primeiro-teste", { manual: true, imageUrl: "https://x/capa.jpg", visualReview: reviewer("rodrigo") }), true);
  assert.equal(visualApproval("primeiro-teste", { manual: true, imageUrl: "https://x/capa.jpg", visualReview: reviewer("nexus") }), true);
  // Sem capa, ou post da IA sem revisão completa, continua barrado.
  assert.equal(visualApproval("primeiro-teste", { manual: true, imageUrl: "", visualReview: reviewer("rodrigo") }), false);
  assert.equal(visualApproval("primeiro-teste", { imageUrl: "https://x/a.jpg", visualReview: reviewer("rodrigo") }), false);
  assert.equal(visualApproval("primeiro-teste", { manual: true, imageUrl: "https://x/a.jpg", visualReview: { status: "rejected", reviewer: "rodrigo" } }), false);
});

test("Publicar agora: post aprovado vai para agora e pede rodada do Publisher", async () => {
  const { db, DB } = fakeD1();
  db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES('primeiro-teste','Flow Arts','online','{}')").run();
  const insert = db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,error,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)");
  insert.run("pizza", "primeiro-teste", "2026-10-18T12:31:00Z", "ready", "approved", "quality_gate_pending", '{"retryCount":2}', "2026-10-17 10:00:00");
  insert.run("pendente", "primeiro-teste", "2026-10-18T12:31:00Z", "ready", "pending", "", "{}", "2026-10-17 10:00:00");
  insert.run("saiu", "primeiro-teste", "2026-10-18T12:31:00Z", "published", "approved", "", "{}", "2026-10-17 10:00:00");
  insert.run("outro", "ragnar-one", "2026-10-18T12:31:00Z", "ready", "approved", "", "{}", "2026-10-17 10:00:00");

  const now = new Date("2026-10-18T20:10:00Z");
  const queued = [];
  const result = await publishPostNow({ DB }, { id: "primeiro-teste" }, "pizza", now, async (_env, clientId, kind) => { queued.push([clientId, kind]); return true; });
  assert.equal(result.ok, true);
  assert.deepEqual(queued, [["primeiro-teste", "publisher-sweep"]]);
  const row = db.prepare("SELECT status,error,scheduled_for,scheduled_hour,payload_json FROM post_ledger WHERE id='pizza'").get();
  assert.equal(row.status, "scheduled");
  assert.equal(row.error, "");
  assert.equal(row.scheduled_for, now.toISOString());
  assert.equal(row.scheduled_hour, "17:10");
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.retryCount, 0);
  assert.ok(payload.publishNowByClient);

  const fail = q => publishPostNow({ DB }, { id: "primeiro-teste" }, q, now, async () => true);
  await assert.rejects(fail("pendente"), /not_approved/);
  await assert.rejects(fail("saiu"), /already_published/);
  await assert.rejects(fail("outro"), /not_found/);
});

test("Aviso 'não saiu': só para aprovado com horário vencido", () => {
  const now = new Date("2026-10-18T20:00:00Z");
  const base = { status: "ready", approval_status: "approved" };
  assert.equal(postIsStuck({ ...base, scheduled_for: "2026-10-18T12:31:00Z" }, now), true);
  assert.equal(postIsStuck({ ...base, scheduled_for: "2026-10-18T19:50:00Z" }, now), false);
  assert.equal(postIsStuck({ ...base, scheduled_for: "2026-10-18T22:00:00Z" }, now), false);
  assert.equal(postIsStuck({ ...base, approval_status: "pending", scheduled_for: "2026-10-18T12:31:00Z" }, now), false);
  assert.equal(postIsStuck({ status: "published", approval_status: "approved", scheduled_for: "2026-10-18T12:31:00Z" }, now), false);
});

test("painel do cliente tem botão Publicar agora e aviso de post travado", () => {
  const js = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(js, /data-publish-now=/);
  assert.match(js, /\/publish-now"/);
  assert.match(js, /Não saiu no horário/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /\\\/publish-now\$/);
});
