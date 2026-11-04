import test from "node:test";
import assert from "node:assert/strict";
import { approveSilentPosts, hadReviewWindow, reviewDeadline } from "../src/auto-approve.js";

// Banco SQLite de verdade, no formato do D1 (prepare().bind().all()/run()).
function d1(db) {
  return {
    prepare: sql => ({
      bind: (...args) => ({
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
        first: async () => db.prepare(sql).get(...args) ?? null
      })
    })
  };
}

async function setup(t) {
  let sqlite;
  try { sqlite = await import("node:sqlite"); } catch { t.skip("node:sqlite indisponível"); return null; }
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, status TEXT, approval_status TEXT, payload_json TEXT, created_at TEXT, updated_at TEXT)");
  const add = (id, { scheduled = "2026-11-04T12:00:00.000Z", created = "2026-11-04 08:00:00", status = "ready", approval = "pending", payload = { createdBy: "master" } } = {}) =>
    db.prepare("INSERT INTO post_ledger VALUES(?,?,?,?,?,?,?,?)").run(id, "giltec", scheduled, status, approval, JSON.stringify(payload), created, created);
  const get = id => db.prepare("SELECT approval_status, payload_json FROM post_ledger WHERE id=?").get(id);
  return { env: { DB: d1(db) }, add, get };
}

// Horário do post: 12:00 UTC (09h de Brasília). Janela fecha 11:00 UTC.
const AFTER_DEADLINE = new Date("2026-11-04T11:05:00.000Z");
const BEFORE_DEADLINE = new Date("2026-11-04T10:30:00.000Z");

test("janela: prazo é 1 hora antes do horário", () => {
  assert.equal(reviewDeadline("2026-11-04T12:00:00.000Z"), "2026-11-04T11:00:00.000Z");
  assert.equal(hadReviewWindow("2026-11-04 10:59:00", "2026-11-04T12:00:00.000Z"), true);
  assert.equal(hadReviewWindow("2026-11-04 11:30:00", "2026-11-04T12:00:00.000Z"), false);
});

test("(a)/(b) mandado pelo Rodrigo + cliente calado = aprovado ao fechar a janela", async t => {
  const s = await setup(t); if (!s) return;
  s.add("p1");
  s.add("p2", { payload: { createdBy: "mcp" } });
  const out = await approveSilentPosts(s.env, { now: AFTER_DEADLINE });
  assert.deepEqual(out.approved.sort(), ["p1", "p2"]);
  assert.equal(s.get("p1").approval_status, "approved");
  assert.equal(JSON.parse(s.get("p1").payload_json).autoApproval.status, "aprovado_por_silencio");
});

test("antes do prazo não aprova (cliente ainda pode pedir reajuste)", async t => {
  const s = await setup(t); if (!s) return;
  s.add("p1");
  const out = await approveSilentPosts(s.env, { now: BEFORE_DEADLINE });
  assert.equal(out.approved.length, 0);
  assert.equal(s.get("p1").approval_status, "pending");
});

test("(c) reajuste pedido = bloqueado", async t => {
  const s = await setup(t); if (!s) return;
  s.add("p1", { approval: "correction_requested" });
  s.add("p2", { payload: { createdBy: "master", revisionRequestedAt: "2026-11-04T09:00:00Z" } }); // refeito, voltou para pendente
  const out = await approveSilentPosts(s.env, { now: AFTER_DEADLINE });
  assert.equal(out.approved.length, 0);
  assert.equal(s.get("p1").approval_status, "correction_requested");
  assert.equal(s.get("p2").approval_status, "pending");
});

test("(g) post dos agentes de IA, cancelado, excluído ou já publicado não é aprovado", async t => {
  const s = await setup(t); if (!s) return;
  s.add("ia", { payload: { createdBy: "agent" } });
  s.add("semdono", { payload: {} });
  s.add("cancel", { status: "cancelled" });
  s.add("pub", { status: "published" });
  s.add("rej", { approval: "rejected" });
  s.add("oculto", { payload: { createdBy: "master", hiddenFromPanel: true } });
  const out = await approveSilentPosts(s.env, { now: AFTER_DEADLINE });
  assert.equal(out.approved.length, 0);
});

test("chegou com menos de 1 hora: fica esperando e é marcado sem_janela (uma vez só)", async t => {
  const s = await setup(t); if (!s) return;
  s.add("tarde", { created: "2026-11-04 11:30:00" });
  const now = new Date("2026-11-04T11:40:00.000Z");
  const out = await approveSilentPosts(s.env, { now });
  assert.deepEqual(out.noWindow, ["tarde"]);
  assert.equal(s.get("tarde").approval_status, "pending");
  assert.equal(JSON.parse(s.get("tarde").payload_json).autoApproval.status, "sem_janela");
  const again = await approveSilentPosts(s.env, { now });
  assert.equal(again.checked, 0);
});

test("post muito atrasado (mais de 6 horas) não é aprovado", async t => {
  const s = await setup(t); if (!s) return;
  s.add("velho", { scheduled: "2026-11-04T02:00:00.000Z", created: "2026-11-03 20:00:00" });
  const out = await approveSilentPosts(s.env, { now: AFTER_DEADLINE });
  assert.equal(out.approved.length, 0);
});
