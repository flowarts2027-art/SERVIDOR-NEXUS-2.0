import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { saveCaptadorLater, captadorView, setCaptadorAccess } from "../src/captador.js";
import { parseOsmHours } from "../src/business-hours.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id))");
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { DB };
}

test("cliente guarda empresa fechada em 'Mandar depois' com lembrete na hora de abrir", async () => {
  const env = fakeEnv();
  const client = { id: "quatree-dog", name: "Quatree Dog" };
  await setCaptadorAccess(env, client.id, true);
  const now = new Date("2026-10-18T13:30:00Z"); // domingo 10:30
  const out = await saveCaptadorLater(env, client, {
    id: "osm:node/77", name: "Pet do Bairro", niche: "pet", city: "Uberaba MG", phone: "(34) 99876-5432",
    hours: parseOsmHours("Mo-Sa 08:00-18:00")
  }, now);
  assert.equal(out.remindAt, "2026-10-19T11:00:00.000Z");
  const view = await captadorView(env, client, "depois");
  assert.equal(view.counts.depois, 1);
  assert.equal(view.items[0].status, "depois");
  assert.equal(view.items[0].remindAt, "2026-10-19T11:00:00.000Z");
});

test("telas mostram aberta/fechada e o botão de lembrar", () => {
  const cap = fs.readFileSync(new URL("../../public/captador.js", import.meta.url), "utf8");
  const pro = fs.readFileSync(new URL("../../public/prospects-ui.js", import.meta.url), "utf8");
  const crm = fs.readFileSync(new URL("../../public/crm.js", import.meta.url), "utf8");
  assert.match(cap, /Lembrar quando abrir/); assert.match(cap, /"depois", "Mandar depois"/);
  assert.match(pro, /data-later/); assert.match(crm, /data-when-open/);
});
