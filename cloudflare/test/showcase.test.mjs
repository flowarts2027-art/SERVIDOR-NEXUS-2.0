import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id));`);
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json,created_at) VALUES('reel-pet','primeiro-teste','published','approved','Pet',?,'2026-10-17 12:00:00')")
    .run(JSON.stringify({ title: "Pet shop", formatBuild: { videoUrl: "https://n/media/pet.mp4", imageUrl: "https://n/media/pet.jpg" } }));
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json,created_at) VALUES('reel-gravando','primeiro-teste','reel_rendering','pending','x',?,'2026-10-17 12:00:00')")
    .run(JSON.stringify({ formatBuild: { videoUrl: "https://n/media/x.mp4" } }));
  return { db, env: { DB } };
}

const master = (env, method, body) => import("../src/showcase.js").then(m => m.handleShowcaseMaster(
  new Request("https://n/api/master/showcase", { method, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new URL("https://n/api/master/showcase")));

test("Master escolhe o Reel da vitrine; a página pública mostra o vídeo com capa para o WhatsApp", async () => {
  const { env } = setup();
  const list = await (await master(env, "GET")).json();
  assert.deepEqual(list.reels.map(r => r.id), ["reel-pet"], "Reel ainda gravando não aparece");
  const saved = await (await master(env, "POST", { niche: "pet", postId: "reel-pet" })).json();
  assert.equal(saved.url, "https://flowarts.com.br/exemplo/pet");
  const { handleShowcasePage } = await import("../src/showcase.js");
  const page = await handleShowcasePage(new Request("https://flowarts.com.br/exemplo/pet"), env, new URL("https://flowarts.com.br/exemplo/pet"));
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<video src="https:\/\/n\/media\/pet\.mp4"/);
  assert.match(html, /og:image" content="https:\/\/n\/media\/pet\.jpg"/);
  assert.match(html, /wa\.me\/5521964816185/);
  const none = await handleShowcasePage(new Request("https://flowarts.com.br/exemplo/padaria"), env, new URL("https://flowarts.com.br/exemplo/padaria"));
  assert.equal(none.status, 404);
  assert.equal((await (await master(env, "POST", { niche: "pet", postId: "nao-existe" })).json()).ok, false);
  await master(env, "POST", { niche: "pet", postId: "" });
  assert.deepEqual((await (await master(env, "GET")).json()).map, {});
});

test("mensagem do Captador ganha o link só para a Flow Arts e só no nicho com vitrine", async () => {
  const { captadorMessage } = await import("../src/captador.js");
  const map = { pet: { videoUrl: "https://n/media/pet.mp4" } };
  const config = { myName: "Rodrigo", business: "Flow Arts", offer: "" };
  assert.match(captadorMessage(config, { name: "Pet Lu", city: "Rio", niche: "pet" }, map), /Veja um vídeo que fizemos para pet shop: https:\/\/flowarts\.com\.br\/exemplo\/pet/);
  assert.doesNotMatch(captadorMessage(config, { name: "Padaria Sol", city: "Rio", niche: "padaria" }, map), /exemplo/);
  assert.doesNotMatch(captadorMessage(config, { name: "Pet Lu", city: "Rio", niche: "pet" }, null), /exemplo/);
  const src = fs.readFileSync(new URL("../src/captador.js", import.meta.url), "utf8");
  assert.match(src, /client\.id === SHOWCASE_CLIENT \? await readShowcase\(env\) : null/);
});

test("mensagem do caçador do Master: link da vitrine e 'no mapa' para contato do mapa grátis", async () => {
  const { firstMessage } = await import("../src/prospects.js");
  const lead = { id: "osm:node/1", name: "Café Lu", city: "Recife PE", niche: "cafeteria", phone: "81988887777" };
  const text = firstMessage(lead, { cafeteria: { videoUrl: "https://n/media/c.mp4" } });
  assert.match(text, /Encontrei a Café Lu no mapa/);
  assert.match(text, /Veja um vídeo que fizemos para cafeterias: https:\/\/flowarts\.com\.br\/exemplo\/cafeteria/);
  assert.doesNotMatch(firstMessage(lead), /exemplo\/cafeteria/);
});

test("rotas e caixa do Master ligadas", () => {
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /handleShowcasePage/);
  assert.match(index, /\/api\/master\/showcase[\s\S]{0,200}resolveMasterSession/);
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="showcase-form"/);
});
