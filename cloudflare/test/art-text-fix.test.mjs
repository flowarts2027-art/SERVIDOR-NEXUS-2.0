import test from "node:test";
import assert from "node:assert/strict";
import { fixArtTextInOpenPosts } from "../src/art-text-fix.js";
import { resetFramesCache } from "../src/art-frame.js";

function fakeDb(row, updates) {
  return { prepare: sql => ({ bind: (...args) => ({
    all: async () => ({ results: /SELECT/.test(sql) && row.payload_json ? [row] : [] }),
    run: async () => { updates.push(JSON.parse(args[0])); row.payload_json = args[0]; return {}; }
  }) }) };
}

test("agente texto nas artes: sem molduras, só marca como conferido e não mexe na imagem", async () => {
  resetFramesCache();
  const updates = [];
  const row = { id: "upload-feed-1", client_id: "cliente-x", payload_json: JSON.stringify({ imageUrl: "https://x/media/posts/cliente-x/a/imagem.jpg", formatBuild: { kind: "post", imageUrl: "https://x/media/posts/cliente-x/a/imagem.jpg" } }) };
  const env = { MEDIA: { get: async () => null }, IMAGES: {}, ASSETS: { fetch: async () => new Response("{}", { status: 404 }) }, DB: fakeDb(row, updates) };
  const result = await fixArtTextInOpenPosts(env);
  assert.deepEqual(result.steps, ["pronto"]);
  assert.equal(updates.at(-1).formatBuild.artChecked, true);
  assert.equal(updates.at(-1).formatBuild.artCheckVersion, 2);
  assert.equal(updates.at(-1).imageUrl, "https://x/media/posts/cliente-x/a/imagem.jpg");
});

test("agente texto nas artes: um passo por rodada (conferir, depois escrever) e salva o progresso", async () => {
  resetFramesCache();
  const updates = [];
  const puts = [];
  const url = "https://x/media/posts/cli/p1/imagem.jpg";
  const row = { id: "upload-feed-2", client_id: "cli", payload_json: JSON.stringify({ imageUrl: url, formatBuild: { kind: "post", imageUrl: url } }) };
  const meta = { clientes: { cli: { feed: [{ arquivo: "cli/feed-1.png", topo: 300, base: 1000 }], story: [{ arquivo: "cli/story-1.png", topo: 400, base: 1400 }], numero: {} } } };
  const img = { transform() { return img; }, draw() { return img; }, async output() { return { response: async () => new Response(new Uint8Array([9, 9, 9])) }; } };
  const env = {
    DB: fakeDb(row, updates),
    MEDIA: { get: async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }), put: async key => { puts.push(key); } },
    ASSETS: { fetch: async req => String(req.url).endsWith("molduras.json") ? Response.json(meta) : new Response(new Uint8Array([7])) },
    IMAGES: { info: async () => ({ width: 1080, height: 1350 }), input: () => img },
    AI: { run: async () => ({ response: "NAO" }) }
  };
  assert.deepEqual((await fixArtTextInOpenPosts(env)).steps, ["conferido"]);
  assert.deepEqual(updates.at(-1).formatBuild.artSteps, ["precisa"]);
  assert.equal(puts.length, 0);
  assert.deepEqual((await fixArtTextInOpenPosts(env)).steps, ["escrito"]);
  assert.equal(puts.length, 1);
  const last = updates.at(-1);
  assert.equal(last.formatBuild.artChecked, true);
  assert.deepEqual(last.formatBuild.artText, ["texto-do-nexus"]);
  assert.match(last.imageUrl, /imagem-texto-.*\.jpg$/);
});

test("agente texto nas artes: a busca pega post novo e pula os já feitos (SQLite de verdade)", async t => {
  let sqlite;
  try { sqlite = await import("node:sqlite"); } catch { t.skip("node:sqlite indisponível"); return; }
  const { OPEN_POSTS_SQL } = await import("../src/art-text-fix.js");
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("CREATE TABLE post_ledger(id, client_id, scheduled_for, status, approval_status, payload_json)");
  const add = (id, fb) => db.prepare("INSERT INTO post_ledger VALUES(?,?,?,?,?,?)").run(id, "c", "2026-10-30T12:00:00Z", "ready", "pending", JSON.stringify({ formatBuild: fb }));
  add("novo", { kind: "post" });
  add("ja-com-texto", { kind: "post", artChecked: true });
  add("feito", { kind: "post", artChecked: true, artCheckVersion: 2, artText: ["texto-do-nexus"] });
  add("video", { kind: "reel", videoUrl: "x" });
  const rows = db.prepare(OPEN_POSTS_SQL).all("2026-10-29T00:00:00Z", 10);
  assert.deepEqual(rows.map(r => r.id), ["novo"]);
});
