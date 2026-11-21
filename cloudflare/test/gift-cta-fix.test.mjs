import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { fixGiftCtaInOpenPosts } from "../src/gift-cta-fix.js";

function env() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE clients(id TEXT, status TEXT);
    CREATE TABLE post_ledger(id TEXT, client_id TEXT, status TEXT, media_id TEXT, approval_status TEXT, payload_json TEXT, caption TEXT, scheduled_for TEXT, updated_at TEXT);
    INSERT INTO clients VALUES('primeiro-teste','online');`);
  const wrap = sql => { const st = db.prepare(sql); const run = args => ({
    all: async () => ({ results: st.all(...args) }), first: async () => st.get(...args) ?? null, run: async () => st.run(...args) });
    return { bind: (...a) => run(a), ...run([]) }; };
  return { db, DB: { prepare: wrap } };
}

test("legenda trocada à mão no painel (client_manual) não ganha o Comente QUERO", async () => {
  const e = env();
  const add = (id, payload) => e.db.prepare("INSERT INTO post_ledger VALUES(?,?,?,?,?,?,?,?,?)").run(id, "primeiro-teste", "ready", "", "approved", JSON.stringify(payload), "Brinde no link da bio 🎁", "2026-11-25T15:00:00Z", "");
  add("manual-painel", { source: "client_manual" });
  add("agente", { source: "agent" });
  await fixGiftCtaInOpenPosts(e);
  const cap = id => e.db.prepare("SELECT caption FROM post_ledger WHERE id=?").get(id).caption;
  assert.equal(cap("manual-painel"), "Brinde no link da bio 🎁");
  assert.match(cap("agente"), /QUERO/);
});
