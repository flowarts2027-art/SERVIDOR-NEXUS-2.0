// Biblioteca de artes (pedido do Rodrigo, 28/10/2026).
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { imageSize, formatFor, planLibrary, addToLibrary, organizeLibrary, removeQueuedDuplicates, freeSlots, libraryView } from "../src/art-library.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const store = new Map();
  const MEDIA = {
    async put(key, value) { store.set(key, value instanceof Uint8Array ? value : new Uint8Array(await new Response(value).arrayBuffer())); },
    async get(key) { const v = store.get(key); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null; },
    async delete(key) { store.delete(key); }
  };
  db.exec("INSERT OR IGNORE INTO clients(id, name, status) VALUES('cli','Cliente','online')");
  return { DB, MEDIA, db, store };
}

function png(width, height, seed = 0) {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  b[39] = seed;
  return b;
}
function jpeg(width, height) {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 0, 0]);
}
const client = { id: "cli", name: "Cliente", config: {} };

test("tamanho e formato: vertical vira story, o resto feed", () => {
  assert.deepEqual(imageSize(png(1080, 1920)), { width: 1080, height: 1920 });
  assert.deepEqual(imageSize(jpeg(1080, 1350)), { width: 1080, height: 1350 });
  assert.equal(formatFor({ width: 1080, height: 1920 }), "story");
  assert.equal(formatFor({ width: 1080, height: 1350 }), "feed");
  assert.equal(formatFor({ width: 1080, height: 1080 }), "feed");
});

test("plano: carrossel às 09h com o lote, posts nos outros horários, stories nos horários de story", () => {
  const items = [
    ...[0, 1, 2].map(i => ({ id: "a" + i, status: "livre", format: "feed", batch: "A", order: i, at: "1" })),
    { id: "b0", status: "livre", format: "feed", batch: "B", order: 0, at: "2" },
    { id: "s0", status: "livre", format: "story", batch: "A", order: 3, at: "1" }
  ];
  const slots = { feed: [{ day: "d", time: "09:00", iso: "1" }, { day: "d", time: "12:00", iso: "2" }], story: [{ day: "d", time: "09:00", iso: "1" }] };
  const plan = planLibrary(items, slots);
  assert.deepEqual(plan.map(p => p.type + ":" + p.items.map(i => i.id).join(",")), ["story:s0", "carousel:a0,a1,a2", "post:b0"]);
});

test("subir: repetida é descartada; organizar programa tudo esperando aprovação e marca na biblioteca", async () => {
  const env = fakeEnv();
  const form = new FormData();
  form.append("images", new File([png(1080, 1350, 1)], "a.png", { type: "image/png" }));
  form.append("images", new File([png(1080, 1350, 2)], "b.png", { type: "image/png" }));
  form.append("images", new File([png(1080, 1920, 3)], "s.png", { type: "image/png" }));
  form.append("images", new File([png(1080, 1350, 1)], "a-de-novo.png", { type: "image/png" }));
  const now = new Date("2026-10-28T12:30:00Z"); // 09h30 em Brasília
  const up = await addToLibrary(env, client, form, now);
  assert.equal(up.added, 3);
  assert.deepEqual(up.duplicates, ["a-de-novo.png"]);
  const again = new FormData();
  again.append("images", new File([png(1080, 1350, 2)], "b.png", { type: "image/png" }));
  assert.equal((await addToLibrary(env, client, again, now)).added, 0);

  const forms = [];
  const res = await organizeLibrary(env, client, now, {
    upload: async (e, f) => { forms.push(f); return { id: "p" + forms.length }; },
    caption: async () => "Legenda. Comente QUERO.", removeDuplicates: false
  });
  assert.equal(res.failed.length, 0);
  // 09h já passou: o lote de 2 vira post às 12h e 19h; o story vai às 12h.
  assert.deepEqual(forms.map(f => f.get("type") + "@" + f.get("date") + " " + f.get("time")).sort(),
    ["post@2026-10-28 12:00", "post@2026-10-28 19:00", "story@2026-10-28 12:00"]);
  forms.forEach(f => { assert.equal(f.get("approval"), "cliente"); assert.equal(f.get("noDuplicate"), "1"); });
  assert.equal(forms.find(f => f.get("type") === "story").get("caption"), null);
  assert.ok(libraryView(res.items).every(i => i.status === "programado"));
});

test("horários livres pulam os ocupados e os que já passaram", async () => {
  const env = fakeEnv();
  env.db.exec(`INSERT INTO post_ledger(id, client_id, scheduled_for, status, approval_status, payload_json) VALUES('x','cli','2026-10-28T15:00:00.000Z','ready','pending','{}')`);
  const s = await freeSlots(env, "cli", new Date("2026-10-28T12:30:00Z"), 1);
  assert.deepEqual(s.feed.map(x => x.time), ["19:00"]);
  assert.deepEqual(s.story.map(x => x.time), ["12:00", "19:00"]);
});

test("fila: posts repetidos (mesma imagem) que ainda não saíram são tirados, fica o primeiro", async () => {
  const env = fakeEnv();
  await env.MEDIA.put("posts/cli/1/imagem.jpg", new Uint8Array([1, 2, 3]));
  await env.MEDIA.put("posts/cli/2/imagem.jpg", new Uint8Array([1, 2, 3]));
  await env.MEDIA.put("posts/cli/3/imagem.jpg", new Uint8Array([9, 9]));
  for (const [id, when] of [["1", "2026-10-29T12:00:00.000Z"], ["2", "2026-10-30T12:00:00.000Z"], ["3", "2026-10-31T12:00:00.000Z"]]) {
    env.db.exec(`INSERT INTO post_ledger(id, client_id, scheduled_for, status, approval_status, payload_json) VALUES('${id}','cli','${when}','ready','pending','{"imageUrl":"https://x/media/posts/cli/${id}/imagem.jpg"}')`);
  }
  const removed = [];
  const n = await removeQueuedDuplicates(env, client, new Date("2026-10-28T12:00:00Z"), async (e, c, id) => removed.push(id));
  assert.equal(n, 1);
  assert.deepEqual(removed, ["2"]);
});
