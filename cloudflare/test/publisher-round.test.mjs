import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { alignScheduledPosts } from "../src/client-slots.js";
import { enqueueDuePublishers } from "../src/scheduler.js";

// D1 falso em cima de SQLite de verdade: as consultas rodam como no servidor.
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE clients(id TEXT PRIMARY KEY,name TEXT,niche TEXT,instagram TEXT,status TEXT,config_json TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE post_ledger(id TEXT PRIMARY KEY,client_id TEXT,scheduled_for TEXT,scheduled_hour TEXT,status TEXT,approval_status TEXT,payload_json TEXT,updated_at TEXT);
    CREATE TABLE nexus_state(namespace TEXT,item_key TEXT,client_id TEXT DEFAULT '',value_json TEXT,updated_at TEXT,PRIMARY KEY(namespace,item_key,client_id));
    CREATE TABLE scheduled_jobs(id TEXT PRIMARY KEY,client_id TEXT,kind TEXT,due_at TEXT,status TEXT,attempts INTEGER,payload_json TEXT,created_at TEXT,updated_at TEXT);
  `);
  const prepare = sql => {
    const statement = db.prepare(sql.replace(/\?(\d+)/g, "?"));
    const order = [...sql.matchAll(/\?(\d+)/g)].map(match => Number(match[1]) - 1);
    let args = [];
    const values = () => order.map(index => args[index]);
    return {
      bind(...input) { args = input; return this; },
      async first() { return statement.get(...values()) || null; },
      async all() { return { results: statement.all(...values()) }; },
      async run() { return { meta: { changes: Number(statement.run(...values()).changes) } }; }
    };
  };
  return { db, env: { DB: { prepare } } };
}

const CLIENTS = ["primeiro-teste", "giltec", "nexus-ai", "daniela-martins", "maskara-assessoria", "quatree-dog"];
const NINE = "2026-11-06T12:00:00.000Z"; // 09:00 de Brasília
const addPost = (db, id, client, format, at = NINE, status = "ready") => db.prepare(
  "INSERT INTO post_ledger VALUES(?,?,?,?,?,'approved',?,'')"
).run(id, client, at, "09:00", status, JSON.stringify({ creativeFeatures: { requestedFormat: format } }));

function nineOClock(db) {
  for (const id of CLIENTS) {
    db.prepare("INSERT INTO clients VALUES(?,?,'','@x','online','{}','','')").run(id, id);
    addPost(db, id + ":post", id, "post");
    addPost(db, id + ":story", id, "story");
  }
}

test("as 12 publicações das 09:00 ficam cada uma em um minuto próprio", async () => {
  const { db, env } = database();
  nineOClock(db);
  assert.equal((await alignScheduledPosts(env, new Date("2026-11-06T10:00:00.000Z"))).moved, 11);
  const rows = db.prepare("SELECT id,scheduled_for,scheduled_hour FROM post_ledger ORDER BY scheduled_for").all();
  assert.deepEqual(rows.map(row => row.scheduled_hour), [
    "09:00", "09:05", "09:10", "09:15", "09:20", "09:25", "09:30", "09:35", "09:40", "09:45", "09:50", "09:55"
  ]);
  assert.equal((await alignScheduledPosts(env, new Date("2026-11-06T10:05:00.000Z"))).moved, 0);
});

test("publicado, com falha e de ontem não mudam", async () => {
  const { db, env } = database();
  nineOClock(db);
  addPost(db, "pub", "giltec", "post", NINE, "published");
  addPost(db, "falha", "giltec", "post", NINE, "failed");
  addPost(db, "ontem", "giltec", "post", "2026-11-05T12:00:00.000Z");
  await alignScheduledPosts(env, new Date("2026-11-06T10:00:00.000Z"));
  const kept = db.prepare("SELECT scheduled_for FROM post_ledger WHERE id IN ('pub','falha','ontem')").all();
  assert.deepEqual(kept.map(row => row.scheduled_for).sort(), ["2026-11-05T12:00:00.000Z", NINE, NINE]);
});

test("cliente novo ganha minuto livre, que fica guardado", async () => {
  const { db, env } = database();
  db.prepare("INSERT INTO clients VALUES('jbtv','Jbtv','','','setup','{}','2026-11-01','')").run();
  addPost(db, "novo", "jbtv", "post");
  await alignScheduledPosts(env, new Date("2026-11-06T10:00:00.000Z"));
  assert.equal(db.prepare("SELECT scheduled_hour AS h FROM post_ledger WHERE id='novo'").get().h, "09:02");
  assert.equal(JSON.parse(db.prepare("SELECT value_json AS v FROM nexus_state").get().v).jbtv, 2);
});

test("a rodada põe na fila só quem venceu, sem esperar a rodada de 15 min", async () => {
  const { db, env } = database();
  nineOClock(db);
  await alignScheduledPosts(env, new Date("2026-11-06T10:00:00.000Z"));
  assert.equal(await enqueueDuePublishers(env, new Date("2026-11-06T12:12:00.000Z")), 2);
  const queued = db.prepare("SELECT client_id FROM scheduled_jobs ORDER BY client_id").all().map(row => row.client_id);
  assert.deepEqual(queued, ["giltec", "primeiro-teste"]);
  assert.equal(await enqueueDuePublishers(env, new Date("2026-11-06T12:12:00.000Z")), 0);
});

test("post sem tentativas sobrando não volta para a fila", async () => {
  const { db, env } = database();
  db.prepare("INSERT INTO clients VALUES('giltec','g','','@x','online','{}','','')").run();
  db.prepare("INSERT INTO post_ledger VALUES('x','giltec',?,'09:10','failed','approved','{\"retryCount\":3}','')").run("2026-11-06T12:10:00.000Z");
  assert.equal(await enqueueDuePublishers(env, new Date("2026-11-06T12:12:00.000Z")), 0);
});
