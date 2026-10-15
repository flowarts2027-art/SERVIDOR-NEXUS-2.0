import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createManualReel, brasiliaToIso, handleManualReelMaster } from "../src/manual-reel.js";
import { instagramPublishTarget } from "../src/publisher.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE clients(id TEXT PRIMARY KEY, name TEXT, niche TEXT, instagram TEXT, status TEXT, config_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    INSERT INTO clients(id,name,config_json) VALUES('quatree-dog','Quatree Dog','{}'),('ragnar-one','Ragnar','{}');`);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const stored = new Map();
  const MEDIA = { async put(key, body, opts) { stored.set(key, opts); } };
  return { db, stored, env: { DB, MEDIA, PUBLIC_BASE_URL: "https://nexus.example" } };
}

const mp4 = () => new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0])], "reel.mp4", { type: "video/mp4" });
const jpg = () => new File([new Uint8Array([255, 216, 255, 217])], "capa.jpg", { type: "image/jpeg" });
const form = over => {
  const f = new FormData();
  const base = { clientId: "quatree-dog", caption: "Café passado na hora.\n#cafe", date: "2026-10-20", time: "12:00", video: mp4(), cover: jpg(), ...over };
  for (const [k, v] of Object.entries(base)) if (v !== null) f.set(k, v);
  return f;
};
const now = new Date("2026-10-14T23:00:00Z");

test("Reel enviado pelo Master espera a aprovação do cliente e vira Reel publicável", async () => {
  const { db, stored, env } = fakeEnv();
  const result = await createManualReel(env, form({}), now);
  assert.equal(result.ok, true);
  assert.equal(result.scheduledFor, "2026-10-20T15:00:00.000Z", "12:00 de Brasília");
  const row = db.prepare("SELECT * FROM post_ledger").get();
  assert.equal(row.approval_status, "pending", "o cliente precisa aprovar");
  assert.equal(row.status, "ready");
  assert.equal(row.caption, "Café passado na hora.\n#cafe");
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.creativeFeatures.requestedFormat, "reel");
  assert.match(payload.formatBuild.videoUrl, /^https:\/\/nexus\.example\/media\/posts\/quatree-dog\/manual-reel-.+\/reel\.mp4$/);
  assert.match(payload.imageUrl, /capa\.jpg$/);
  assert.deepEqual(instagramPublishTarget(payload), { ok: true, kind: "reel", videoUrl: payload.formatBuild.videoUrl });
  assert.equal(stored.size, 2);
});

test("Reel manual: validações", async () => {
  const { env } = fakeEnv();
  const err = async over => { try { await createManualReel(env, form(over), now); return "ok"; } catch (e) { return e.message; } };
  assert.equal(await err({ clientId: "ragnar-one" }), "client_invalid", "cliente travado não recebe");
  assert.equal(await err({ clientId: "nao-existe" }), "client_invalid");
  assert.equal(await err({ caption: " " }), "caption_required");
  assert.equal(await err({ date: "2026-10-14", time: "20:05" }), "schedule_too_soon");
  assert.equal(await err({ video: new File([new Uint8Array(16)], "x.mp4", { type: "video/mp4" }) }), "video_type");
  assert.equal(await err({ cover: null }), "cover_required");
  assert.equal(brasiliaToIso("2026-10-20", "9:00"), "");
});

test("rota só no Master; tela do Master e do cliente prontas", async () => {
  const { env } = fakeEnv();
  const response = await handleManualReelMaster(new Request("https://x/api/master/manual-reel", { method: "POST", body: form({ caption: "" }) }), env, new URL("https://x/api/master/manual-reel"));
  assert.equal((await response.json()).error, "caption_required");
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /\/api\/master\/manual-reel[\s\S]{0,200}resolveMasterSession/);
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  assert.match(read("index.html"), /id="manual-reel-form"/);
  assert.match(read("index.html"), /manual-reel\.js/);
  assert.match(read("client-lite.js"), /<video src=/);
});

test("cliente pode cancelar post aprovado antes de sair", async () => {
  const js = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(js, /data-cancel-post=/);
  assert.match(js, /\/cancel", \{ method: "POST" \}/);
  const { cancelPost } = await import("../src/posts.js");
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,caption,payload_json) VALUES('p1','quatree-dog','2026-10-15T15:00:00Z','ready','approved','x','{}')").run();
  const out = await cancelPost(env, { id: "quatree-dog" }, "p1");
  assert.equal(out.ok, true);
  const row = db.prepare("SELECT status, approval_status FROM post_ledger WHERE id='p1'").get();
  assert.deepEqual({ ...row }, { status: "cancelled", approval_status: "rejected" });
});

test("painel do cliente mostra todas as imagens do carrossel com setas", () => {
  const js = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(js, /data-carousel/);
  assert.match(js, /class="car-btn car-next" data-car="1"/);
  assert.match(js, /car-count/);
});

test("pedir ajuste em post aprovado: volta para aprovação; publicado não pode", async () => {
  const js = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(js, /postGroup\(post\) === "agendados"[\s\S]{0,300}data-revise=/);
  const { requestPostRevision } = await import("../src/posts.js");
  const { db, env } = fakeEnv();
  db.exec("CREATE TABLE scheduled_jobs(id TEXT PRIMARY KEY, client_id TEXT, kind TEXT, due_at TEXT, status TEXT, attempts INTEGER, payload_json TEXT, created_at TEXT, updated_at TEXT); CREATE TABLE support_tickets(id TEXT PRIMARY KEY, client_id TEXT, subject TEXT, message TEXT, status TEXT, priority TEXT, source TEXT, created_at TEXT, updated_at TEXT);");
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json) VALUES('a1','quatree-dog','ready','approved','x','{}'),('p1','quatree-dog','published','approved','x','{}')").run();
  await requestPostRevision(env, { id: "quatree-dog", name: "Q" }, "a1", "Agenda aberta").catch(() => {});
  assert.equal(db.prepare("SELECT approval_status FROM post_ledger WHERE id='a1'").get().approval_status, "correction_requested");
  await assert.rejects(requestPostRevision(env, { id: "quatree-dog" }, "p1", "x"), /already_published/);
  const fb = fs.readFileSync(new URL("../src/format-builder.js", import.meta.url), "utf8");
  assert.match(fb, /Client requested this correction, follow it/);
});
