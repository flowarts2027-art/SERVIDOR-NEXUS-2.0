import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE clients(id TEXT PRIMARY KEY, name TEXT, niche TEXT, instagram TEXT, status TEXT, config_json TEXT, created_at TEXT, updated_at TEXT);`);
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, DB };
}

test("carrossel pronto: entra no painel sem data, com as imagens na ordem e tudo aprovado menos a data", async () => {
  const { createManualCarousel } = await import("../src/manual-carousel.js");
  const { db, DB } = setup();
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES('primeiro-teste','Flow Arts','marketing','flowarts2026','online','{}')").run();
  const stored = [];
  const env = { DB, PUBLIC_BASE_URL: "https://n", MEDIA: { put: async (key) => stored.push(key) } };
  const form = new FormData();
  form.set("clientId", "primeiro-teste");
  form.set("caption", "O forno não para.\nComente QUERO");
  for (let i = 1; i <= 5; i++) form.append("images", new File([new Uint8Array([255, 216, 255, i])], i + ".jpg", { type: "image/jpeg" }));
  const out = await createManualCarousel(env, form);
  assert.equal(out.cards, 5);
  assert.deepEqual(stored.map(k => k.split("/").pop()), ["cartao-1.jpg", "cartao-2.jpg", "cartao-3.jpg", "cartao-4.jpg", "cartao-5.jpg"]);
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.scheduled_for, null);
  assert.equal(row.approval_status, "pending");
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.dateChoice, "client");
  assert.equal(payload.formatBuild.carouselUrls.length, 5);
  assert.equal(payload.imageUrl, payload.formatBuild.carouselUrls[0]);
});

test("sem data não aprova; com data aprova; data no passado é recusada", async () => {
  const { decidePost } = await import("../src/posts.js");
  const { schedulePost } = await import("../src/manual-carousel.js");
  const { db, DB } = setup();
  const payload = { dateChoice: "client", imageUrl: "https://n/1.jpg", creativeFeatures: { requestedFormat: "carousel" }, qualityGates: { copyChief: "approved", designer: "approved", formatBuilder: "approved" } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json) VALUES('m1','primeiro-teste','ready','pending','x',?)").run(JSON.stringify(payload));
  const client = { id: "primeiro-teste" };
  await assert.rejects(decidePost({ DB }, client, "m1", "approved"), /schedule_required/);
  await assert.rejects(schedulePost({ DB }, client, "m1", "2020-01-01", "19:00"), /schedule_too_soon/);
  const now = new Date("2026-10-16T23:00:00Z");
  const ok = await schedulePost({ DB }, client, "m1", "2026-10-20", "19:00", now);
  assert.equal(ok.scheduledFor, "2026-10-20T22:00:00.000Z");
  await decidePost({ DB }, client, "m1", "approved");
  assert.equal(db.prepare("SELECT approval_status FROM post_ledger WHERE id='m1'").get().approval_status, "approved");
  db.prepare("UPDATE post_ledger SET status='published' WHERE id='m1'").run();
  await assert.rejects(schedulePost({ DB }, client, "m1", "2026-10-21", "19:00", now), /not_schedulable/);
});

test("Salvar dia em post aprovado que perdeu o horário: volta para agendado e aprovado", async () => {
  const { schedulePost } = await import("../src/manual-carousel.js");
  const { db, DB } = setup();
  const insert = db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,error,scheduled_for,caption,payload_json) VALUES(?,?,?,?,?,?,?,?)");
  insert.run("perdeu", "primeiro-teste", "expired", "approved", "approved_post_missed", "2026-11-08T12:13:00.000Z", "x", '{"retryCount":2}');
  insert.run("rascunho", "primeiro-teste", "expired", "pending", "stale_ready_expired", "2026-11-08T12:13:00.000Z", "x", "{}");
  const client = { id: "primeiro-teste" };
  const now = new Date("2026-11-11T20:00:00Z");
  await assert.rejects(schedulePost({ DB }, client, "perdeu", "2026-11-11", "16:00", now), /schedule_too_soon/);
  const ok = await schedulePost({ DB }, client, "perdeu", "2026-11-13", "10:00", now);
  assert.equal(ok.status, "scheduled");
  const row = db.prepare("SELECT status,approval_status,error,scheduled_for,scheduled_hour,payload_json FROM post_ledger WHERE id='perdeu'").get();
  assert.equal(row.status, "scheduled");
  assert.equal(row.approval_status, "approved");
  assert.equal(row.error, "");
  assert.equal(row.scheduled_for, "2026-11-13T13:00:00.000Z");
  assert.equal(row.scheduled_hour, "10:00");
  assert.equal(JSON.parse(row.payload_json).retryCount, 0);
  // Rascunho vencido sem aprovação continua travado.
  await assert.rejects(schedulePost({ DB }, client, "rascunho", "2026-11-13", "10:00", now), /not_schedulable/);
  const lite = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(lite, /if \(missedPost\(post\)\) return "agendados";/);
});

test("publicador do agente nunca publica post sem data quando a data é do cliente; rotas ligadas", () => {
  const runtime = fs.readFileSync(new URL("../src/agent-runtime.js", import.meta.url), "utf8");
  assert.match(runtime, /scheduled_for IS NOT NULL OR COALESCE[\s\S]{0,140}dateChoice'\),''\)<>'client'/);
  const executor = fs.readFileSync(new URL("../src/executor.js", import.meta.url), "utf8");
  assert.match(executor, /AND scheduled_for IS NOT NULL\s+AND scheduled_for <= \?2/);
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /\/api\/master\/manual-carousel"[\s\S]*?resolveMasterSession[\s\S]*?handleManualCarouselMaster/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /\/schedule\$\//);
  const lite = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(lite, /Escolha o dia primeiro/);
  assert.match(lite, /data-schedule-form/);
});
