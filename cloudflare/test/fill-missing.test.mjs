// "Enviar artes" de um cartão de "Postagens faltando" (pedido do Rodrigo, 06/11/2026).
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { masterUpload } from "../src/master-upload.js";
import { missingPostsBoard } from "../src/missing-posts.js";

const NOW = new Date("2026-11-06T21:20:00.000Z"); // 18h20 em Brasília
const TODAY = "2026-11-06";
const TOMORROW = "2026-11-07";
const publicFile = name => readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

function jpeg(width, height) {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255]);
  return new File([b], "arte.jpg", { type: "image/jpeg" });
}

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  for (const id of ["quatree-dog", "giltec"]) db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES(?,?,'Ração','@x','online','{}')").run(id, id);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB, PUBLIC_BASE_URL: "https://x", MEDIA: { async put() {} } } };
}

function addPost(db, id, at, format, status = "ready") {
  db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,payload_json) VALUES(?,'quatree-dog',?,?,'approved',?)")
    .run(id, at, status, JSON.stringify({ creativeFeatures: { requestedFormat: format } }));
}

// O dia do Quatree Dog em 06/11: carrosséis de sobra e nenhum story.
function carousels(db) {
  addPost(db, "c1", "2026-11-06T12:50:00.000Z", "carousel", "published");
  addPost(db, "c2", "2026-11-06T15:50:00.000Z", "carousel", "published");
  addPost(db, "c3", "2026-11-06T22:50:00.000Z", "carousel");
}

function fillForm(type, date, art = jpeg(1080, 1920), clientId = "quatree-dog") {
  const form = new FormData();
  form.set("clientId", clientId); form.set("type", type); form.set("date", date); form.set("fill", "1"); form.set("jaTemTexto", "1");
  form.set("approval", "cliente"); form.append("images", art);
  return form;
}

const storyRows = db => db.prepare("SELECT scheduled_for,scheduled_hour,approval_status FROM post_ledger WHERE id LIKE 'upload-story-%' ORDER BY scheduled_for").all();
const lines = async (env, now = NOW) => (await missingPostsBoard(env, now)).items.filter(item => item.clientId === "quatree-dog" && item.date === TODAY).map(item => item.text);

test("os 2 stories de hoje entram hoje, no minuto do cliente, aprovados, e o aviso some", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  assert.deepEqual(await lines(env), ["Hoje: faltam 2 stories"]);
  const first = await masterUpload(env, fillForm("story", TODAY), NOW);
  assert.equal(first.approval, "approved");
  assert.deepEqual(await lines(env), ["Hoje: falta 1 story"]);
  await masterUpload(env, fillForm("story", TODAY), NOW);
  assert.deepEqual(storyRows(db).map(row => ({ ...row })), [
    { scheduled_for: "2026-11-06T21:55:00.000Z", scheduled_hour: "18:55", approval_status: "approved" },
    { scheduled_for: "2026-11-06T22:55:00.000Z", scheduled_hour: "19:55", approval_status: "approved" }
  ]);
  assert.deepEqual(await lines(env), []);
});

test("o quadro diz quanto falta de cada formato para o botão levar à página", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  const board = await missingPostsBoard(env, NOW);
  const today = board.items.find(item => item.clientId === "quatree-dog" && item.date === TODAY);
  assert.deepEqual(today.lacking, { posts: 0, stories: 2 });
});

test("horário ocupado é pulado, e cada cliente fica no seu minuto", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  addPost(db, "s1", "2026-11-06T22:55:00.000Z", "story");
  const quatree = await masterUpload(env, fillForm("story", TODAY), NOW);
  assert.equal(quatree.scheduledFor, "2026-11-06T21:55:00.000Z");
  const giltec = await masterUpload(env, fillForm("story", TODAY, jpeg(1080, 1920), "giltec"), NOW);
  assert.equal(giltec.scheduledFor, "2026-11-06T22:15:00.000Z");
});

test("sem vaga hoje recusa: nada vai para amanhã", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  await assert.rejects(masterUpload(env, fillForm("story", TODAY), new Date("2026-11-07T00:50:00.000Z")), /fill_no_slot/);
  assert.equal(storyRows(db).length, 0);
});

test("o que já foi preenchido não duplica", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  addPost(db, "s1", "2026-11-06T22:55:00.000Z", "story");
  addPost(db, "s2", "2026-11-06T23:55:00.000Z", "story");
  await assert.rejects(masterUpload(env, fillForm("story", TODAY), NOW), /fill_complete/);
  await assert.rejects(masterUpload(env, fillForm("post", TODAY, jpeg(1080, 1350)), NOW), /fill_complete/);
  assert.equal(storyRows(db).length, 0);
});

test("arte no tamanho errado é recusada e não vira post", async () => {
  const { db, env } = fakeEnv();
  carousels(db);
  await assert.rejects(masterUpload(env, fillForm("story", TODAY, jpeg(1080, 1350)), NOW), /window_feed/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM post_ledger WHERE id LIKE 'upload-%'").get().n, 0);
});

test("fora do story de hoje, fica no dia e no formato do aviso e espera aprovação", async () => {
  const { db, env } = fakeEnv();
  const story = await masterUpload(env, fillForm("story", TOMORROW), NOW);
  assert.equal(story.approval, "pending");
  assert.equal(story.scheduledFor, "2026-11-07T12:55:00.000Z");
  const form = fillForm("post", TODAY, jpeg(1080, 1350));
  const post = await masterUpload(env, form, NOW);
  assert.equal(post.type, "feed");
  assert.equal(post.approval, "pending");
  assert.equal(post.scheduledFor, "2026-11-06T22:50:00.000Z");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM post_ledger").get().n, 2);
});

test("dia que já passou é recusado", async () => {
  const { env } = fakeEnv();
  await assert.rejects(masterUpload(env, fillForm("story", "2026-11-05"), NOW), /fill_date/);
});

test("telas: cartão leva o que falta, página trava cliente e dia, e o quadro atualiza sozinho", () => {
  const app = publicFile("app.js");
  const artes = publicFile("artes.js");
  assert.match(app, /&posts=\$\{Number\(item\.lacking\.posts\)\}&stories=\$\{Number\(item\.lacking\.stories\)\}/);
  assert.match(app, /BroadcastChannel\("nexus-postagens"\)/);
  assert.match(app, /pageshow/);
  assert.match(artes, /BroadcastChannel\("nexus-postagens"\)\.postMessage/);
  assert.match(artes, /form\.set\("fill", "1"\)/);
  assert.match(artes, /error\.wrongWindow && !FILLING/);
  assert.match(artes, /\$\("#client"\)\.disabled = true/);
  assert.match(artes, /\$\("#date"\)\.disabled = true/);
});
