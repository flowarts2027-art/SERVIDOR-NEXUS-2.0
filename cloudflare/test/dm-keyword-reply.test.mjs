import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dmTextsFromWebhook, processWebhookDmKeywords } from "../src/dm-keyword-reply.js";
import { defaultKeywords, defaultDm } from "../src/client-autoreply.js";

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, DB };
}

const maskara = { id: "maskara-assessoria", name: "Maskara Assessoria", niche: "Despachante de documentação de armas de fogo (CAC)", config: { agentProfile: { whatsapp: "5521999990000", brandName: "Maskara Assessoria" } } };
const body = (text, extra = {}) => ({ object: "instagram", entry: [{ id: "IG1", time: 1761230000, messaging: [{ sender: { id: "PESSOA" }, recipient: { id: "IG1" }, timestamp: 1761230000000, message: { mid: "m1", text, ...extra } }] }] });

function saveConfig(db, keywords, enabled = true) {
  db.prepare("INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES('comment-autoreply','config','maskara-assessoria',?,CURRENT_TIMESTAMP)")
    .run(JSON.stringify({ enabled, keywords, dm: "Oi! Fale com a Maskara: {whatsapp}" }));
}

test("lê a mensagem do direct e ignora eco, botões e 'já segui'", () => {
  assert.deepEqual(dmTextsFromWebhook(body("DOCUMENTOS")).map(x => [x.igUserId, x.igsid, x.text]), [["IG1", "PESSOA", "DOCUMENTOS"]]);
  assert.equal(dmTextsFromWebhook(body("DOCUMENTOS", { is_echo: true })).length, 0);
  assert.equal(dmTextsFromWebhook(body("Já segui", { quick_reply: { payload: "GIFT_FOLLOWED" } })).length, 0);
  assert.equal(dmTextsFromWebhook(body("já segui")).length, 0);
});

test("palavra no direct responde uma vez, com botão do WhatsApp", async () => {
  const { db, DB } = fakeD1();
  saveConfig(db, ["documentos"]);
  const sent = [];
  const request = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{"message_id":"x"}', { status: 200 }); };
  const findClient = async () => ({ client: maskara, conn: { accessToken: "T", igUserId: "IG1" } });
  const env = { DB };
  const now = new Date("2026-10-23T14:00:00Z");
  const first = await processWebhookDmKeywords(env, dmTextsFromWebhook(body("Oi, DOCUMENTOS por favor")), { request, now, findClient });
  assert.equal(first[0].replied, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.recipient.id, "PESSOA");
  assert.equal(sent[0].body.message.attachment.payload.buttons[0].type, "web_url");
  // Mesma pessoa de novo no mesmo dia: não repete.
  const again = await processWebhookDmKeywords(env, dmTextsFromWebhook(body("documentos")), { request, now: new Date("2026-10-23T15:00:00Z"), findClient });
  assert.equal(again[0].skipped, "already_replied");
  assert.equal(sent.length, 1);
});

test("sem a palavra, ou com a resposta desligada, não manda nada", async () => {
  const { db, DB } = fakeD1();
  saveConfig(db, ["documentos"], false);
  let calls = 0;
  const request = async () => { calls += 1; return new Response("{}", { status: 200 }); };
  const findClient = async () => ({ client: maskara, conn: { accessToken: "T", igUserId: "IG1" } });
  const off = await processWebhookDmKeywords({ DB }, dmTextsFromWebhook(body("DOCUMENTOS")), { request, findClient });
  assert.equal(off[0].skipped, "autoreply_off");
  db.prepare("DELETE FROM nexus_state").run();
  saveConfig(db, ["documentos"]);
  const none = await processWebhookDmKeywords({ DB }, dmTextsFromWebhook(body("bom dia")), { request, findClient });
  assert.equal(none[0].skipped, "no_keyword");
  assert.equal(calls, 0);
});

test("Flow Arts continua com o funil próprio", async () => {
  const { DB } = fakeD1();
  const flow = { id: "primeiro-teste", name: "Flow Arts", niche: "marketing", config: {} };
  const out = await processWebhookDmKeywords({ DB }, dmTextsFromWebhook(body("quero")), { request: async () => { throw new Error("não devia enviar"); }, findClient: async () => ({ client: flow, conn: { accessToken: "T", igUserId: "IG1" } }) });
  assert.ok(["own_funnel", "autoreply_off"].includes(out[0].skipped));
});

test("palavras e direct padrão por ramo", () => {
  assert.ok(defaultKeywords(maskara).includes("quero"));
  assert.ok(!defaultKeywords(maskara).includes("documentos"));
  assert.ok(defaultKeywords({ niche: "loja de ração" }).includes("tabela"));
  assert.ok(!defaultKeywords({ niche: "cafeteria" }).includes("documentos"));
  assert.ok(!defaultDm(maskara).includes("tabela"));
  assert.ok(defaultDm({ name: "Quatree", niche: "ração e pet" }).includes("tabela"));
});
