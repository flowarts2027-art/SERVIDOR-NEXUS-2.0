import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  normalizePhone, brasiliaDay, createContact, updateContact, markContacted, archiveContact,
  listContacts, addFromProspect, handleCrmRoute
} from "../src/crm.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB } };
}

// 17/10/2026 às 14h em Brasília.
const NOW = new Date("2026-10-17T17:00:00Z");

test("número do WhatsApp com DDD vira 55 + número", () => {
  assert.equal(normalizePhone("(22) 96481-6185"), "5522964816185");
  assert.equal(normalizePhone("+55 22 96481-6185"), "5522964816185");
  assert.equal(normalizePhone("2234567890"), "552234567890");
  assert.equal(normalizePhone("123"), "");
});

test("dia de Brasília não vira o dia antes da hora", () => {
  assert.equal(brasiliaDay(new Date("2026-10-18T02:30:00Z")), "2026-10-17");
  assert.equal(brasiliaDay(NOW, 7), "2026-10-24");
});

test("contato novo volta em 7 dias e aparece em 'falar hoje' no dia certo", async () => {
  const { env } = fakeEnv();
  const { contact } = await createContact(env, { name: "João", business: "Pizzaria do João", phone: "22 99999-8888", interest: "pacote" }, NOW);
  assert.equal(contact.nextFollowAt, "2026-10-24");
  assert.equal(contact.stage, "contato");
  assert.equal((await listContacts(env, {}, NOW)).due.length, 0);
  const later = await listContacts(env, {}, new Date("2026-10-24T12:00:00Z"));
  assert.equal(later.due.length, 1);
  assert.equal(later.due[0].name, "João");
});

test("não deixa o mesmo número duas vezes", async () => {
  const { env } = fakeEnv();
  await createContact(env, { name: "Ana", phone: "22988887777" }, NOW);
  await assert.rejects(createContact(env, { name: "Ana 2", phone: "(22) 98888-7777" }, NOW), /phone_exists/);
});

test("'já falei' registra no histórico e marca nova data", async () => {
  const { env } = fakeEnv();
  const { contact } = await createContact(env, { name: "Bia", phone: "22977776666", followDays: 1 }, NOW);
  const after = await markContacted(env, contact.id, { followDays: 7, note: "Pediu para falar semana que vem" }, new Date("2026-10-18T13:00:00Z"));
  assert.equal(after.contact.followCount, 1);
  assert.equal(after.contact.nextFollowAt, "2026-10-25");
  assert.equal(after.contact.history[0].type, "falei");
});

test("mudar etapa, sem retorno marcado e arquivar", async () => {
  const { env } = fakeEnv();
  const { contact } = await createContact(env, { name: "Carlos", phone: "22966665555" }, NOW);
  const up = await updateContact(env, contact.id, { stage: "cliente", followDays: 0 }, NOW);
  assert.equal(up.contact.stage, "cliente");
  assert.equal(up.contact.nextFollowAt, null);
  assert.equal(up.contact.history[0].type, "etapa");
  await assert.rejects(updateContact(env, contact.id, { stage: "qualquer" }, NOW), /stage_invalid/);
  await archiveContact(env, contact.id, NOW);
  assert.equal((await listContacts(env, {}, NOW)).total, 0);
});

test("busca por nome, negócio e número", async () => {
  const { env } = fakeEnv();
  await createContact(env, { name: "Duda", business: "Pet Feliz", phone: "22955554444" }, NOW);
  await createContact(env, { name: "Eva", business: "Salão Bela", phone: "22944443333" }, NOW);
  assert.equal((await listContacts(env, { q: "pet" }, NOW)).contacts.length, 1);
  assert.equal((await listContacts(env, { q: "4443" }, NOW)).contacts[0].name, "Eva");
  assert.equal((await listContacts(env, { stage: "proposta" }, NOW)).contacts.length, 0);
});

test("quem foi chamado pelo Caçador entra uma vez só no CRM", async () => {
  const { env } = fakeEnv();
  const first = await addFromProspect(env, { id: "osm:node/1", name: "Café da Praça", phone: "81988887777", city: "Recife" }, NOW);
  const again = await addFromProspect(env, { id: "osm:node/1", name: "Café da Praça", phone: "81988887777" }, NOW);
  assert.equal(again.existed, true);
  assert.equal(again.id, first.id);
  const list = await listContacts(env, {}, NOW);
  assert.equal(list.total, 1);
  assert.equal(list.contacts[0].source, "cacador");
});

test("rota devolve mensagem clara no erro", async () => {
  const { env } = fakeEnv();
  const request = new Request("https://x/api/master/crm", { method: "POST", body: JSON.stringify({ name: "Fê", phone: "1" }) });
  const response = await handleCrmRoute(request, env, new URL(request.url));
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /DDD/);
});

// ---- Envio pelo número da Flow (Meta) ----
import { phoneVariants, addFromWhatsApp, saveCrmSettings, getContact } from "../src/crm.js";
import { sendCrmBatch, handleCrmSendRoute } from "../src/crm-send.js";
import { ensureWhatsAppSchema } from "../src/whatsapp-agent.js";

function metaEnv() {
  const { db, env } = fakeEnv();
  const calls = [];
  Object.assign(env, {
    WHATSAPP_CLIENT_ID: "primeiro-teste", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_ACCESS_TOKEN: "x", WHATSAPP_GRAPH_VERSION: "v26.0",
    __whatsappFetch: async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ messages: [{ id: "wamid." + calls.length }] }), { status: 200 }); }
  });
  return { db, env, calls };
}

async function inbound(env, db, waId, at) {
  await ensureWhatsAppSchema(env);
  db.prepare("INSERT INTO whatsapp_messages(id,client_id,wa_id,direction,text,created_at) VALUES(?,?,?,?,?,?)")
    .run("in-" + waId + at, "primeiro-teste", waId, "inbound", "oi", at);
}

test("celular com e sem o 9", () => {
  assert.deepEqual(phoneVariants("5522999998888").sort(), ["552299998888", "5522999998888"].sort());
  assert.ok(phoneVariants("552299998888").includes("5522999998888"));
});

test("dentro de 24 h vai texto normal; fora sem modelo, não envia e avisa", async () => {
  const { db, env, calls } = metaEnv();
  const a = (await createContact(env, { name: "João", phone: "22999998888" }, NOW)).contact;
  const b = (await createContact(env, { name: "Bia", phone: "22988887777" }, NOW)).contact;
  await inbound(env, db, "552299998888", new Date(NOW.getTime() - 3600e3).toISOString()); // João falou há 1 h (sem o 9)
  const out = await sendCrmBatch(env, [a.id, b.id], {}, NOW);
  assert.equal(out.sent, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "text");
  assert.equal(calls[0].to, "552299998888");
  assert.match(calls[0].text.body, /Oi, João!/);
  assert.equal(out.results.find(r => r.id === b.id).reason, "needs_template");
  assert.equal((await getContact(env, a.id, NOW)).followCount, 1);
  assert.equal((await getContact(env, b.id, NOW)).followCount, 0);
});

test("fora de 24 h com modelo: envia o modelo com o primeiro nome", async () => {
  const { env, calls } = metaEnv();
  await saveCrmSettings(env, { templateName: "retorno_flow", templateUsesName: true });
  const c = (await createContact(env, { name: "Carla Souza", phone: "22977776666" }, NOW)).contact;
  const out = await sendCrmBatch(env, [c.id], {}, NOW);
  assert.equal(out.sent, 1);
  assert.equal(calls[0].type, "template");
  assert.equal(calls[0].template.name, "retorno_flow");
  assert.equal(calls[0].template.components[0].parameters[0].text, "Carla");
  await assert.rejects(saveCrmSettings(env, { templateName: "Retorno Flow!" }), /template_name_invalid/);
});

test("envio em massa só com confirmação", async () => {
  const { env, calls } = metaEnv();
  const req = new Request("https://x/api/master/crm/send", { method: "POST", body: JSON.stringify({ ids: ["a"] }) });
  const res = await handleCrmSendRoute(req, env, new URL(req.url));
  assert.equal(res.status, 409);
  assert.equal(calls.length, 0);
});

test("quem responde no WhatsApp da Flow entra no CRM ou passa para 'conversando'", async () => {
  const { env } = fakeEnv();
  const c = (await createContact(env, { name: "Duda", phone: "22966665555" }, NOW)).contact;
  await addFromWhatsApp(env, { phone: "552266665555", name: "Duda" }, NOW);
  assert.equal((await getContact(env, c.id, NOW)).stage, "conversando");
  const n = await addFromWhatsApp(env, { phone: "5522911112222", name: "Novo" }, NOW);
  const novo = await getContact(env, n.id, NOW);
  assert.equal(novo.source, "whatsapp-flow");
  assert.equal(novo.nextFollowAt, "2026-10-24");
});
