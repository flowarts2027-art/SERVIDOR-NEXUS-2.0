import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHmac } from "node:crypto";
import { handleWhatsAppWebhook, handleWhatsAppProtected } from "../src/whatsapp-agent.js";
import { knowledgePrompt } from "../src/whatsapp-knowledge.js";

const source = fs.readFileSync(new URL("../src/whatsapp-agent.js", import.meta.url), "utf8");
const CLIENT = "primeiro-teste";
const SECRET = "fixture-app-secret";

test("WhatsApp agent keeps human confirmation and hourly send guard", () => {
  assert.match(source, /human_confirmation_required/);
  assert.match(source, /WHATSAPP_SEND_LIMIT_PER_HOUR/);
  assert.match(source, /whatsapp_send_log/);
});

test("WhatsApp webhook verifies Meta signature before processing", () => {
  assert.match(source, /x-hub-signature-256/);
  assert.match(source, /WHATSAPP_APP_SECRET/);
  assert.match(source, /invalid_webhook_signature/);
});

test("Flow Arts knowledge has the approved prices and no legacy streaming text", () => {
  const prompt = knowledgePrompt(CLIENT);
  assert.match(prompt, /R\$ 297 de entrada \+ R\$ 697 por mês/);
  assert.match(prompt, /3 primeiros clientes/);
  assert.match(prompt, /Global Play/); // aparece só como proibição
  assert.match(prompt, /Nunca citar a Global Play/);
  assert.doesNotMatch(source, /uso próprio ou para revenda/);
  assert.match(knowledgePrompt("cliente-sem-cadastro"), /needsHuman=true/);
});

function fixture({ aiReply, aiFails = false, limit = 30 } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of fs.readdirSync(new URL("../migrations/", import.meta.url)).sort()) {
    db.exec(fs.readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  }
  db.prepare("INSERT OR IGNORE INTO clients(id,name,status,config_json) VALUES(?1,'Flow Arts','online','{}')").run({ "?1": CLIENT });
  const DB = { prepare(sql) {
    const wrap = args => {
      const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
      return {
        first: async () => db.prepare(sql).get(parameters) || null,
        all: async () => ({ results: db.prepare(sql).all(parameters) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } })
      };
    };
    return { ...wrap([]), bind: (...args) => wrap(args) };
  } };
  const env = {
    DB, WHATSAPP_APP_SECRET: SECRET, WHATSAPP_ACCESS_TOKEN: "fixture-token", WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_GRAPH_VERSION: "v25.0", WHATSAPP_CLIENT_ID: CLIENT, WHATSAPP_VERIFY_TOKEN: "verify",
    WHATSAPP_SEND_LIMIT_PER_HOUR: String(limit), OPENAI_API_KEY_SHARED: "fixture-openai"
  };
  const sent = [];
  const aiPrompts = [];
  let counter = 0;
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.startsWith("https://api.openai.com/")) {
      aiPrompts.push(JSON.parse(options.body).input);
      if (aiFails) return new Response("{}", { status: 500 });
      const reply = aiReply || { classification: "lead", priority: 70, needsHuman: false, reply: "Oi! Sou a assistente virtual da Flow Arts. Qual é o seu negócio?", reason: "lead" };
      return Response.json({ output_text: JSON.stringify(reply), usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 } });
    }
    if (target.startsWith("https://graph.facebook.com/")) {
      sent.push(JSON.parse(options.body));
      counter += 1;
      return Response.json({ messages: [{ id: "wamid.out" + counter }] });
    }
    throw new Error("external_network_disabled_in_fixture:" + target);
  };
  let inbound = 0;
  async function receive(text, from = "5521999990000", type = "text") {
    inbound += 1;
    const message = { from, id: "wamid.in" + inbound, timestamp: String(1760000000 + inbound), type };
    if (type === "text") message.text = { body: text };
    const body = JSON.stringify({ entry: [{ changes: [{ field: "messages", value: {
      contacts: [{ wa_id: from, profile: { name: "Maria" } }], messages: [message]
    } }] }] });
    const signature = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
    const url = new URL("https://nexus.test/api/whatsapp/webhook");
    const request = new Request(url, { method: "POST", body, headers: { "x-hub-signature-256": signature } });
    const response = await handleWhatsAppWebhook(request, env, url, null);
    assert.equal(response.status, 200);
  }
  async function call(path, method = "GET", body) {
    const url = new URL("https://nexus.test" + path);
    const request = new Request(url, { method, body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } });
    const response = await handleWhatsAppProtected(request, env, url);
    return { status: response.status, body: await response.json() };
  }
  const contact = (wa = "5521999990000") => db.prepare("SELECT * FROM whatsapp_contacts WHERE wa_id=?1").get({ "?1": wa });
  const close = () => { globalThis.fetch = nativeFetch; db.close(); };
  return { db, env, sent, aiPrompts, receive, call, contact, close };
}

test("auto-reply is OFF by default: only a pending draft, nothing sent", async () => {
  const f = fixture();
  try {
    await f.receive("Quanto custa?");
    assert.equal(f.sent.length, 0);
    const draft = f.db.prepare("SELECT status FROM whatsapp_drafts").get();
    assert.equal(draft.status, "pending");
    assert.equal((await f.call("/api/whatsapp/status")).body.autoReply, false);
  } finally { f.close(); }
});

test("auto-reply ON answers with the AI text, records it and the prompt carries prices", async () => {
  const f = fixture();
  try {
    assert.equal((await f.call("/api/whatsapp/settings", "POST", { autoReply: true })).status, 200);
    await f.receive("Oi, quanto custa o Instagram no automático?");
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].to, "5521999990000");
    assert.match(f.sent[0].text.body, /assistente virtual da Flow Arts/);
    assert.match(f.aiPrompts[0], /R\$ 697 por mês/);
    assert.match(f.aiPrompts[0], /primeira resposta/);
    const out = f.db.prepare("SELECT status FROM whatsapp_messages WHERE direction='outbound'").get();
    assert.equal(out.status, "sent_auto");
    assert.equal(f.db.prepare("SELECT status FROM whatsapp_drafts").get().status, "auto_sent");

    await f.receive("Tenho um salão");
    assert.match(f.aiPrompts[1], /já se apresentou/);
    const thread = (await f.call("/api/whatsapp/messages?phone=5521999990000")).body.items.map(m => m.direction);
    assert.deepEqual(thread, ["inbound", "outbound", "inbound", "outbound"]);
  } finally { f.close(); }
});

test("handoff: replies, then pauses the bot for that conversation", async () => {
  const f = fixture({ aiReply: { classification: "lead", priority: 90, needsHuman: true, reply: "Vou chamar o Rodrigo para fechar com você.", reason: "quer pagar" } });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive("Quero fechar, me passa o Pix");
    assert.equal(f.sent.length, 1);
    assert.equal(f.contact().bot_paused, 1);
    assert.equal(f.contact().needs_human, 1);
    await f.receive("Oi? Alguém aí?");
    assert.equal(f.sent.length, 1, "robô pausado não responde");
    const inbox = (await f.call("/api/whatsapp/inbox")).body.items;
    assert.equal(inbox[0].bot_paused, 1);
    assert.equal(inbox[0].last_text, "Oi? Alguém aí?");

    assert.equal((await f.call("/api/whatsapp/contact", "POST", { phone: "5521999990000", botPaused: false })).status, 200);
    assert.equal(f.contact().bot_paused, 0);
    assert.equal(f.contact().needs_human, 0);
  } finally { f.close(); }
});

test("a manual human reply pauses the bot and clears unread", async () => {
  const f = fixture();
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive("Oi");
    assert.equal((await f.call("/api/whatsapp/send", "POST", { to: "5521999990000", text: "Oi, aqui é o Rodrigo" })).status, 409);
    const ok = await f.call("/api/whatsapp/send", "POST", { to: "5521999990000", text: "Oi, aqui é o Rodrigo", confirmed: true });
    assert.equal(ok.status, 200);
    assert.equal(f.contact().bot_paused, 1);
    assert.equal(f.contact().unread_count, 0);
    await f.receive("Legal!");
    assert.equal(f.sent.length, 2, "1 automática + 1 manual; depois disso o robô fica quieto");
  } finally { f.close(); }
});

test("AI failure sends a safe fallback and calls a human", async () => {
  const f = fixture({ aiFails: true });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive("Oi");
    assert.equal(f.sent.length, 1);
    assert.match(f.sent[0].text.body, /assistente virtual da Flow Arts/);
    assert.match(f.sent[0].text.body, /pessoa da equipe/);
    assert.equal(f.contact().bot_paused, 1);
  } finally { f.close(); }
});

test("audio or image gets a text request and the bot stays on", async () => {
  const f = fixture();
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive("", "5521999990000", "audio");
    assert.equal(f.sent.length, 1);
    assert.match(f.sent[0].text.body, /só consigo ler mensagens de texto/);
    assert.equal(f.contact().bot_paused, 0);
    assert.equal(f.aiPrompts.length, 0, "não gasta IA com áudio");
  } finally { f.close(); }
});

test("hourly limit stops automatic replies too", async () => {
  const f = fixture({ limit: 1 });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive("Oi", "5521999990001");
    await f.receive("Oi", "5521999990002");
    assert.equal(f.sent.length, 1);
    const failed = f.db.prepare("SELECT status,reason FROM whatsapp_drafts WHERE wa_id='5521999990002'").get();
    assert.equal(failed.status, "auto_failed");
    assert.match(failed.reason, /hourly_send_limit/);
  } finally { f.close(); }
});
