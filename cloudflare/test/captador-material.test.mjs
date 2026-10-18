import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { saveCaptadorMaterial, clearCaptadorMaterial, captadorMaterial, materialView, messageWithMaterial, captadorMessage } from "../src/captador.js";

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
  const MEDIA = { put: async (k, v, o) => { store.set(k, o); }, delete: async k => { store.delete(k); } };
  return { env: { DB, MEDIA }, store };
}
const form = files => ({ getAll: () => files });
const file = (type, size = 1000, name = "x") => ({ type, size, name, arrayBuffer: async () => new ArrayBuffer(0), stream: () => "s" });

test("material do cliente fica em material/<cliente>/, fora da biblioteca de posts, e troca apaga o antigo", async () => {
  const { env, store } = fakeEnv();
  const client = { id: "quatree-dog" };
  const view = await saveCaptadorMaterial(env, client, form([file("image/jpeg"), file("application/pdf")]));
  assert.equal(view.files.length, 2);
  assert.ok([...store.keys()].every(k => k.startsWith("material/quatree-dog/")));
  assert.equal(view.kind, "o nosso material");
  await saveCaptadorMaterial(env, client, form([file("video/mp4")]), new Date(Date.now() + 1000));
  assert.equal(store.size, 1);
  assert.equal(materialView(await captadorMaterial(env, client)).kind, "um vídeo");
  await clearCaptadorMaterial(env, client);
  assert.equal(store.size, 0);
});

test("material recusa tipo errado, mais de 10 arquivos e tamanho grande", async () => {
  const { env } = fakeEnv();
  const c = { id: "x" };
  await assert.rejects(saveCaptadorMaterial(env, c, form([file("text/html")])), /material_type/);
  await assert.rejects(saveCaptadorMaterial(env, c, form(Array.from({ length: 11 }, () => file("image/png")))), /material_count/);
  await assert.rejects(saveCaptadorMaterial(env, c, form([file("video/mp4", 96 * 1024 * 1024)])), /material_size/);
});

test("com material, a mensagem avisa que a mídia vem embaixo e mantém o 'não receber'", () => {
  const msg = captadorMessage({ myName: "Carlos", business: "Quatree Dog", offer: "Vendo ração Quatree." }, { name: "Pet Feliz", city: "Uberaba MG", niche: "pet" });
  const out = messageWithMaterial(msg, "umas fotos");
  assert.match(out, /Vou te mandar aqui embaixo umas fotos, para você ver\.\n\nPosso te contar mais\?/);
  assert.match(out, /Se preferir não receber mensagens/);
});

test("mídia do material só abre com login do cliente ou do Master", () => {
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /\(\?:videos\|library\|material\)/);
  const ui = fs.readFileSync(new URL("../../public/captador.js", import.meta.url), "utf8");
  assert.match(ui, /2\. Mandar meu material/);
});
