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
  // 17/10: a vitrine saiu do Reel animado e virou "Exemplos por nicho" no Caçador.
  assert.match(html, /id="examples-panel"/);
  assert.match(html, /\/examples\.js/);
});

// ---- Exemplo só para vendas (17/10): carrossel ou vídeo por nicho, sem virar post ----
function fakeMedia() {
  const store = new Map();
  return { store, MEDIA: { put: async (key, value) => { store.set(key, value); } } };
}
const jpeg = name => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], name, { type: "image/jpeg" });

test("carrossel de exemplo: guarda à parte, NÃO cria post e a página mostra os cartões", async () => {
  const { db, env } = setup();
  const { store, MEDIA } = fakeMedia();
  Object.assign(env, { MEDIA, PUBLIC_BASE_URL: "https://flowarts.com.br" });
  const before = db.prepare("SELECT COUNT(*) AS n FROM post_ledger").get().n;
  const form = new FormData();
  form.set("niche", "cafeteria"); form.set("kind", "carousel");
  for (const n of [1, 2, 3, 4, 5]) form.append("images", jpeg(`${n}.jpg`));
  const { handleShowcaseExtras, handleShowcasePage } = await import("../src/showcase.js");
  const res = await handleShowcaseExtras(new Request("https://n/api/master/showcase/upload", { method: "POST", body: form }), env, new URL("https://n/api/master/showcase/upload"));
  const out = await res.json();
  assert.equal(out.ok, true);
  assert.equal(out.entry.images.length, 5);
  assert.equal(store.size, 5);
  assert.ok([...store.keys()].every(k => k.startsWith("examples/cafeteria/")));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM post_ledger").get().n, before, "não pode virar post");
  const page = await handleShowcasePage(new Request("https://flowarts.com.br/exemplo/cafeteria"), env, new URL("https://flowarts.com.br/exemplo/cafeteria"));
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.equal((html.match(/<img src=/g) || []).length, 5);
  assert.match(html, /og:image" content="https:\/\/flowarts\.com\.br\/media\/examples\/cafeteria\//);
  assert.match(html, /carrossel/);
});

test("Caçador: cafeteria com exemplo manda o link do carrossel logo na mensagem", async () => {
  const { firstMessage, NICHES } = await import("../src/prospects.js");
  const { CAPTADOR_NICHES } = await import("../src/captador.js");
  assert.deepEqual(Object.keys(NICHES).sort(), Object.keys(CAPTADOR_NICHES).sort(), "mesmos nichos do Captador");
  const map = { cafeteria: { kind: "carousel", images: ["https://x/1.jpg", "https://x/2.jpg"] } };
  const text = firstMessage({ name: "Café Bom", niche: "cafeteria", city: "Recife PE", id: "osm:node/1" }, map);
  assert.match(text, /Veja um carrossel que fizemos para cafeterias: https:\/\/flowarts\.com\.br\/exemplo\/cafeteria/);
  assert.match(text, /Posso fazer um assim para a Café Bom\?/);
});

test("tirar do painel o Reel usado como exemplo (só se ainda não foi publicado)", async () => {
  const { db, env } = setup();
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,media_id,caption,payload_json,created_at) VALUES('reel-rest','primeiro-teste','ready','pending','','x','{}','2026-10-17')").run();
  const { removeFromPanel } = await import("../src/showcase.js");
  await removeFromPanel(env, "reel-rest");
  assert.equal(db.prepare("SELECT status FROM post_ledger WHERE id='reel-rest'").get().status, "cancelled");
  await assert.rejects(removeFromPanel(env, "reel-pet"), /not_in_panel/, "publicado não mexe");
});
