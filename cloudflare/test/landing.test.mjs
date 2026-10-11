import test from "node:test";
import assert from "node:assert/strict";
import { validateLandingLead, handleLandingLead } from "../src/landing.js";

const ok = { nome: "Ana", whatsapp: "(21) 98888-7777", negocio: "Café da Ana", segmento: "Café, padaria ou restaurante", consentimento: true };

test("valida e normaliza o pedido de exemplo", () => {
  const out = validateLandingLead(ok);
  assert.equal(out.lead.whatsapp, "5521988887777");
  assert.equal(out.lead.segment, "Café, padaria ou restaurante");
  assert.equal(validateLandingLead({ ...ok, whatsapp: "123" }).error, "whatsapp");
  assert.equal(validateLandingLead({ ...ok, consentimento: false }).error, "consentimento");
  assert.equal(validateLandingLead({ ...ok, website: "spam.com" }).error, "spam");
  assert.equal(validateLandingLead({ ...ok, segmento: "<script>" }).lead.segment, "Outro");
  assert.equal(validateLandingLead({ ...ok, nome: "<b>Ana</b>" }).lead.name, "b Ana /b");
});

function fakeEnv() {
  const calls = [];
  const stmt = sql => ({
    bind: (...args) => { calls.push({ sql, args }); return { first: async () => null, run: async () => ({}), all: async () => ({ results: [] }) }; },
    run: async () => ({}), first: async () => null, all: async () => ({ results: [] })
  });
  return { calls, DB: { prepare: stmt, batch: async () => [] } };
}

test("pedido vira contato quente da Flow Arts com próxima ação", async () => {
  const env = fakeEnv();
  const req = new Request("https://x.test/api/public/lead", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" }, body: JSON.stringify(ok) });
  const res = await handleLandingLead(req, env, new Date("2026-10-11T12:00:00Z"));
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.match(data.whatsapp, /wa\.me\/5521964816185/);
  const insert = env.calls.find(c => /INSERT INTO leads/.test(c.sql));
  assert.ok(insert);
  assert.equal(insert.args[0], "primeiro-teste:landing:5521988887777");
  assert.equal(insert.args[1], "primeiro-teste");
  assert.equal(insert.args[4], "hot");
  const payload = JSON.parse(insert.args[14]);
  assert.equal(payload.contact.name, "Ana");
  assert.equal(payload.nextAction.due, "2026-10-12T12:00:00.000Z");
});

test("robô (campo escondido) não grava nada", async () => {
  const env = fakeEnv();
  const req = new Request("https://x.test/api/public/lead", { method: "POST", body: JSON.stringify({ ...ok, website: "x" }) });
  const res = await handleLandingLead(req, env);
  assert.equal((await res.json()).ok, true);
  assert.ok(!env.calls.some(c => /INSERT INTO leads/.test(c.sql)));
});
