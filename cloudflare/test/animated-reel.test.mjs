import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE clients(id TEXT PRIMARY KEY, name TEXT, niche TEXT, instagram TEXT, status TEXT, config_json TEXT, created_at TEXT, updated_at TEXT);`);
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES('primeiro-teste','Flow Arts','marketing','flowarts2026','online','{}')").run();
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  const stored = [];
  const env = { DB, PUBLIC_BASE_URL: "https://n", GITHUB_ACTIONS_TOKEN: "gh", MEDIA: { put: async key => stored.push(key) } };
  return { db, env, stored };
}

const CENAS = [
  ["O forno não para", "E o Instagram fica parado?"],
  ["Mão na massa", "Sem tempo para postar"],
  ["Sua pizza merece", "aparecer todo dia"],
  ["Você aprova", "A Flow publica no dia certo"],
  ["Capriche na pizza", "A gente cuida do resto"]
];

function formulario(cenas = CENAS, foto = false) {
  const form = new FormData();
  form.set("clientId", "primeiro-teste");
  form.set("caption", "Você cuida da pizzaria. A Flow cuida do seu Instagram.\n💬 Comente QUERO");
  cenas.forEach(([l1, l2], i) => { form.set("l1_" + (i + 1), l1); form.set("l2_" + (i + 1), l2); });
  if (foto) form.set("photo_1", new File([new Uint8Array([255, 216, 255, 1])], "f.jpg", { type: "image/jpeg" }));
  return form;
}

function chamada(path, method, headers, body) {
  return new Request("https://n" + path, { method, headers, body, duplex: "half" });
}

test("valida as cenas com as regras do carrossel", async () => {
  const { validateReelScenes } = await import("../src/animated-reel.js");
  assert.deepEqual(validateReelScenes(CENAS.map(([l1, l2]) => ({ l1, l2 }))), []);
  const ruins = CENAS.map(([l1, l2]) => ({ l1, l2 }));
  ruins[0].l1 = "Uma linha bem comprida demais aqui";
  ruins[1].l2 = "Dobre o lucro em 30 dias";
  ruins[4].l2 = "Comente QUERO";
  const erros = validateReelScenes(ruins).join(" ");
  assert.match(erros, /Cena 1: linha 1/);
  assert.match(erros, /Cena 2: não use números/);
  assert.match(erros, /Cena 2: não prometa lucro/);
  assert.match(erros, /Cena 5: não escreva "Comente QUERO"/);
  assert.equal(validateReelScenes([]).length, 1);
});

test("criar: post escondido gravando, sem data, e pedido ao GitHub com as 5 cenas", async () => {
  const { createAnimatedReel } = await import("../src/animated-reel.js");
  const { db, env, stored } = setup();
  let enviado;
  const fetchImpl = async (url, init) => { enviado = { url, body: JSON.parse(init.body) }; return { status: 204 }; };
  const out = await createAnimatedReel(env, formulario(CENAS, true), fetchImpl);
  assert.equal(out.status, "reel_rendering");
  assert.match(enviado.url, /flowarts2027-art\/SERVIDOR-NEXUS-2\.0\/dispatches$/);
  assert.equal(enviado.body.event_type, "reel-template-render");
  const reel = JSON.parse(enviado.body.client_payload.reel);
  assert.equal(reel.scenes.length, 5);
  assert.equal(reel.scenes[0].photo, "https://n/media/" + stored[0]);
  assert.equal(reel.scenes[1].photo, "");
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.status, "reel_rendering");
  assert.equal(row.scheduled_for, null);
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.dateChoice, "client");
  assert.equal(payload.manual, true);
  assert.equal(payload.qualityGates.formatBuilder, "pending");
  assert.equal(payload.formatBuild.callbackToken, enviado.body.client_payload.callback_token);
});

test("criar: GitHub recusou → apaga o post e avisa", async () => {
  const { createAnimatedReel } = await import("../src/animated-reel.js");
  const { db, env } = setup();
  await assert.rejects(createAnimatedReel(env, formulario(), async () => ({ status: 401 })), /github_dispatch_failed/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM post_ledger").get().n, 0);
  await assert.rejects(createAnimatedReel({ ...env, NEXUS_ANIMATED_REEL: "false" }, formulario(), async () => ({ status: 204 })), /animated_reel_disabled/);
});

test("retorno do GitHub: senha errada recusa; capa e vídeo deixam o Reel pronto para o cliente", async () => {
  const { createAnimatedReel, handleAnimatedReelCallback } = await import("../src/animated-reel.js");
  const { decidePost } = await import("../src/posts.js");
  const { db, env } = setup();
  let token;
  const out = await createAnimatedReel(env, formulario(), async (_u, init) => { token = JSON.parse(init.body).client_payload.callback_token; return { status: 204 }; });
  const h = (part, type, extra = {}) => ({ "x-nexus-post-id": out.id, "x-nexus-client-id": "primeiro-teste", "x-nexus-callback-token": token, "x-nexus-part": part, "content-type": type, "content-length": "4", ...extra });
  const up = (headers) => handleAnimatedReelCallback(chamada("/api/internal/animated-reel/upload", "PUT", headers, new Uint8Array([1, 2, 3, 4])), env, new URL("https://n/api/internal/animated-reel/upload"));

  assert.equal((await up(h("video", "video/mp4", { "x-nexus-callback-token": "errada" }))).status, 401);
  // Enquanto grava, o cliente não consegue aprovar.
  await assert.rejects(decidePost({ DB: env.DB }, { id: "primeiro-teste" }, out.id, "approved"));

  assert.equal((await up(h("cover", "image/jpeg"))).status, 201);
  assert.equal(db.prepare("SELECT status FROM post_ledger WHERE id=?").get(out.id).status, "reel_rendering");
  assert.equal((await up(h("video", "video/mp4"))).status, 201);

  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.status, "ready");
  assert.equal(row.error, "");
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.qualityGates.formatBuilder, "approved");
  assert.match(payload.formatBuild.videoUrl, /^https:\/\/n\/media\/posts\/primeiro-teste\/.+\.mp4$/);
  assert.match(payload.imageUrl, /capa-.+\.jpg$/);
  assert.equal(payload.formatBuild.callbackToken, undefined);
  // Token usado não serve de novo.
  assert.equal((await up(h("video", "video/mp4"))).status, 401);
});

test("retorno de falha marca o Reel como falhou", async () => {
  const { createAnimatedReel, handleAnimatedReelCallback, animatedReelStatus } = await import("../src/animated-reel.js");
  const { env } = setup();
  let token;
  const out = await createAnimatedReel(env, formulario(), async (_u, init) => { token = JSON.parse(init.body).client_payload.callback_token; return { status: 204 }; });
  const res = await handleAnimatedReelCallback(chamada("/api/internal/animated-reel/fail", "POST",
    { "x-nexus-post-id": out.id, "x-nexus-client-id": "primeiro-teste", "x-nexus-callback-token": token, "content-type": "application/json" },
    JSON.stringify({ error: "reel_render_failed" })), env, new URL("https://n/api/internal/animated-reel/fail"));
  assert.equal(res.status, 200);
  const status = await animatedReelStatus(env, "primeiro-teste", out.id);
  assert.equal(status.status, "reel_render_failed");
  assert.equal(status.error, "reel_render_failed");
});

test("painel do cliente esconde Reel gravando ou com falha; rotas, workflow e botão ligados", () => {
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /NOT IN \('carousel_test','reel_rendering','reel_render_failed'\)/);
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /handleAnimatedReelMaster/);
  assert.match(index, /handleAnimatedReelCallback/);
  const wf = fs.readFileSync(new URL("../../.github/workflows/reel-template-render.yml", import.meta.url), "utf8");
  assert.match(wf, /types: \[reel-template-render\]/);
  assert.match(wf, /scripts\/reel\/render_reel\.py/);
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="animated-reel-form"/);
  assert.match(html, /\/animated-reel\.js/);
});
