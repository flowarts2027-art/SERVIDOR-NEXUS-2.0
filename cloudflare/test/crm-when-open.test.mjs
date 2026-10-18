import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { addProspectLater, listContacts, remindWhenOpen } from "../src/crm.js";
import { parseOsmHours } from "../src/business-hours.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { DB };
}

test("pizzaria fechada às 10h30 de domingo: entra em 'Para chamar' para as 18:00, não está atrasada nem 'falar agora'", async () => {
  const env = fakeEnv();
  const now = new Date("2026-10-18T13:30:00Z"); // domingo 10:30 Brasília
  const hours = parseOsmHours("Tu-Su 18:00-23:30");
  const saved = await addProspectLater(env, { id: "osm:node/9", name: "Pizzaria Boa", phone: "(21) 99888-7766", niche: "restaurante", city: "Niterói RJ", hours }, "Oi!", now);
  assert.match(saved.when, /abre hoje às 18:00/);
  let list = await listContacts(env, {}, now);
  const c = list.contacts[0];
  assert.equal(c.stage, "chamar");
  assert.equal(c.followTime, "18:00");
  assert.equal(c.due, false);
  assert.equal(c.late, false);
  assert.equal(c.openNow, false);
  list = await listContacts(env, {}, new Date("2026-10-18T21:05:00Z")); // 18:05
  assert.equal(list.due.length, 1);
  assert.equal(list.contacts[0].openNow, true);
});

test("'Lembrar quando abrir' num contato do CRM marca dia e hora da abertura", async () => {
  const env = fakeEnv();
  const sat = new Date("2026-10-17T23:00:00Z"); // sábado 20:00
  const hours = parseOsmHours("Mo-Fr 08:00-18:00");
  const { id } = await addProspectLater(env, { id: "x1", name: "Oficina", phone: "21999990000", niche: "oficina", city: "Rio RJ", hours }, "Oi", sat);
  const out = await remindWhenOpen(env, id, sat);
  assert.equal(out.contact.nextFollowAt, "2026-10-19");
  assert.equal(out.contact.followTime, "08:00");
});
