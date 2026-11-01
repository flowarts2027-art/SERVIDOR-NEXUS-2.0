import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHmac } from "node:crypto";
import { handleWhatsAppWebhook, handleWhatsAppProtected } from "../src/whatsapp-agent.js";
import { knowledgePrompt } from "../src/whatsapp-knowledge.js";
import { mergeMemory, typingDelayMs, aliceEnabled } from "../src/whatsapp-alice.js";

const CLIENT = "primeiro-teste";
const SECRET = "fixture-app-secret";
const PHONE = "5521999990000";

function fixture({ answers = [], geminiFails = false } = {}) {
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
  const sent = [];
  const typing = [];
  const gemini = [];
  const downloads = [];
  const sleeps = [];
  let counter = 0;
  let answerIndex = 0;
  const fakeFetch = async (url, options = {}) => {
    const target = String(url);
    if (target.startsWith("https://generativelanguage.googleapis.com/")) {
      gemini.push(JSON.parse(options.body));
      if (geminiFails) return Response.json({ error: { status: "RESOURCE_EXHAUSTED" } }, { status: 429 });
      const answer = answers[Math.min(answerIndex, answers.length - 1)];
      answerIndex += 1;
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] });
    }
    if (target === "https://graph.facebook.com/v25.0/media-audio-1") {
      downloads.push(target);
      return Response.json({ url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/audio1", mime_type: "audio/ogg; codecs=opus", file_size: 4 });
    }
    if (target === "https://lookaside.fbsbx.com/whatsapp_business/attachments/audio1") {
      assert.equal(options.headers.authorization, "Bearer fixture-token");
      downloads.push(target);
      return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-type": "audio/ogg" } });
    }
    if (target.startsWith("https://graph.facebook.com/")) {
      const body = JSON.parse(options.body);
      if (body.status === "read") { typing.push(body); return Response.json({ success: true }); }
      sent.push(body);
      counter += 1;
      return Response.json({ messages: [{ id: "wamid.out" + counter }] });
    }
    throw new Error("external_network_disabled_in_fixture:" + target);
  };
  const env = {
    DB, WHATSAPP_APP_SECRET: SECRET, WHATSAPP_ACCESS_TOKEN: "fixture-token", WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_GRAPH_VERSION: "v25.0", WHATSAPP_CLIENT_ID: CLIENT, WHATSAPP_VERIFY_TOKEN: "verify",
    WHATSAPP_SEND_LIMIT_PER_HOUR: "90", GEMINI_API_KEY: "fixture-gemini",
    __whatsappFetch: fakeFetch, __sleep: async ms => { sleeps.push(ms); }
  };
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch;
  let inbound = 0;
  async function receive(message) {
    inbound += 1;
    const full = { from: PHONE, id: "wamid.in" + inbound, timestamp: String(1760000000 + inbound), ...message };
    const body = JSON.stringify({ entry: [{ changes: [{ field: "messages", value: {
      contacts: [{ wa_id: PHONE, profile: { name: "Carlos" } }], messages: [full]
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
  const contact = () => db.prepare("SELECT * FROM whatsapp_contacts WHERE wa_id=?1").get({ "?1": PHONE });
  const close = () => { globalThis.fetch = nativeFetch; db.close(); };
  return { db, env, sent, typing, gemini, downloads, sleeps, receive, call, contact, close };
}

const hello = {
  classification: "lead", priority: 70, needsHuman: false,
  messages: ["Oi, Carlos! Aqui é o David, assistente virtual da Flow Arts 😊", "Me conta: o que você vende e em qual cidade atende?"],
  reason: "primeiro contato", understood: "", memory: { nome: "Carlos" }
};

test("Alice persona and site facts are in the knowledge prompt", () => {
  const prompt = knowledgePrompt(CLIENT);
  assert.match(prompt, /David/);
  assert.match(prompt, /Captador \(de clientes\): R\$ 97 por mês/);
  assert.match(prompt, /Completo \+ Tráfego: R\$ 897/);
  assert.match(prompt, /AINDA NÃO LANÇADO/);
  assert.match(prompt, /Nunca confirmar pagamento/);
  assert.match(prompt, /ÁUDIO/);
});

test("Alice only runs with the Gemini key and can be switched back to OpenAI", () => {
  assert.equal(aliceEnabled({ GEMINI_API_KEY: "x" }), true);
  assert.equal(aliceEnabled({}), false);
  assert.equal(aliceEnabled({ GEMINI_API_KEY: "x", WHATSAPP_AI: "openai" }), false);
});

test("text: typing indicator, human pause and short messages in order", async () => {
  const f = fixture({ answers: [hello] });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive({ type: "text", text: { body: "Oi, quanto custa?" } });
    assert.equal(f.gemini.length, 1);
    assert.match(f.gemini[0].systemInstruction.parts[0].text, /David/);
    assert.match(f.gemini[0].systemInstruction.parts[0].text, /primeira resposta/);
    assert.equal(f.gemini[0].generationConfig.responseMimeType, "application/json");
    assert.deepEqual(f.sent.map(m => m.text.body), hello.messages);
    assert.equal(f.typing.length, 2, "digitando antes de cada mensagem");
    assert.equal(f.typing[0].message_id, "wamid.in1");
    assert.deepEqual(f.typing[0].typing_indicator, { type: "text" });
    assert.equal(f.sleeps.length, 2);
    assert.ok(f.sleeps.every(ms => ms >= 1000 && ms <= 4500));
    assert.equal(f.db.prepare("SELECT status FROM whatsapp_drafts").get().status, "auto_sent");
  } finally { f.close(); }
});

test("memory: what the person said is kept and sent on the next reply", async () => {
  const second = { ...hello, messages: ["Show! Para aluguel de equipamentos o Captador encaixa bem."], memory: { negocio: "aluguel de equipamentos", cidade: "Nova Friburgo", vendePara: "empresas" } };
  const f = fixture({ answers: [hello, second] });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive({ type: "text", text: { body: "Oi" } });
    await f.receive({ type: "text", text: { body: "Alugo equipamentos em Nova Friburgo" } });
    const memory = JSON.parse(f.contact().memory_json);
    assert.equal(memory.nome, "Carlos");
    assert.equal(memory.cidade, "Nova Friburgo");
    const context = f.gemini[1].contents[0].parts[0].text;
    assert.match(context, /nome: Carlos/);
    assert.match(context, /ALICE: Oi, Carlos!/);
    assert.match(f.gemini[1].systemInstruction.parts[0].text, /já se apresentou/);
  } finally { f.close(); }
});

test("audio: downloads the file, sends it to Gemini and saves what was heard", async () => {
  const heard = { ...hello, messages: ["Entendi! Você vende energia solar em Petrópolis, certo?"], understood: "Oi, eu vendo energia solar em Petrópolis", memory: { negocio: "energia solar", cidade: "Petrópolis" } };
  const f = fixture({ answers: [heard] });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive({ type: "audio", audio: { id: "media-audio-1", mime_type: "audio/ogg; codecs=opus", voice: true } });
    assert.equal(f.downloads.length, 2);
    const parts = f.gemini[0].contents[0].parts;
    assert.equal(parts[1].inline_data.mime_type, "audio/ogg");
    assert.equal(parts[1].inline_data.data, Buffer.from([1, 2, 3, 4]).toString("base64"));
    assert.match(parts[0].text, /ÁUDIO/);
    assert.equal(f.sent.length, 1);
    assert.match(f.sent[0].text.body, /energia solar/);
    const stored = f.db.prepare("SELECT text FROM whatsapp_messages WHERE direction='inbound'").get();
    assert.equal(stored.text, "[áudio] Oi, eu vendo energia solar em Petrópolis");
  } finally { f.close(); }
});

test("handoff from Alice pauses the bot", async () => {
  const pix = { classification: "cliente", priority: 90, needsHuman: true, messages: ["Recebi, obrigada! Vou chamar o Rodrigo pra conferir, ele já te responde por aqui 👍"], reason: "comprovante", understood: "comprovante de Pix", memory: {} };
  const f = fixture({ answers: [pix] });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive({ type: "text", text: { body: "Paguei, segue o comprovante" } });
    assert.equal(f.sent.length, 1);
    assert.equal(f.contact().bot_paused, 1);
    assert.equal(f.contact().needs_human, 1);
  } finally { f.close(); }
});

test("Gemini down on an audio: safe text request, no crash", async () => {
  const f = fixture({ geminiFails: true });
  try {
    await f.call("/api/whatsapp/settings", "POST", { autoReply: true });
    await f.receive({ type: "audio", audio: { id: "media-audio-1" } });
    assert.equal(f.sent.length, 1);
    assert.match(f.sent[0].text.body, /só consigo ler mensagens de texto/);
  } finally { f.close(); }
});

test("auto-reply OFF: Alice only drafts, nothing is sent", async () => {
  const f = fixture({ answers: [hello] });
  try {
    await f.receive({ type: "text", text: { body: "Oi" } });
    assert.equal(f.sent.length, 0);
    assert.equal(f.typing.length, 0);
    const draft = f.db.prepare("SELECT status,reply_text FROM whatsapp_drafts").get();
    assert.equal(draft.status, "pending");
    assert.match(draft.reply_text, /David/);
  } finally { f.close(); }
});

test("memory merge keeps old facts and delays stay short", () => {
  assert.deepEqual(mergeMemory({ nome: "Ana", cidade: "Rio" }, { cidade: "", negocio: "salão", inventado: "x" }), { nome: "Ana", negocio: "salão", cidade: "Rio" });
  assert.equal(typingDelayMs("oi", { WHATSAPP_HUMAN_DELAY: "off" }), 0);
  assert.equal(typingDelayMs("x".repeat(5000), {}), 4500);
});

// Reserva grátis da Alice (Groq e outros) quando o Gemini falha.
import { aliceReply as aliceReplyReserva, buildAliceRequest as buildReserva } from "../src/whatsapp-alice.js";

const pedidoReserva = (extra = {}) => buildReserva({
  knowledge: "Flow Arts faz automação de Instagram.", memory: {}, history: "",
  inboundText: "Oi, quanto custa?", mediaType: "", media: null, displayName: "Ana", alreadyIntroduced: false, ...extra
});

test("Alice usa a reserva grátis quando o Gemini dá limite", async () => {
  let pedidoGratis;
  const env = { GEMINI_API_KEY: "g", GROQ_API_KEY: "q" };
  const fetcher = async () => new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
  const answer = await aliceReplyReserva(env, pedidoReserva(), fetcher, {
    freeChat: async (_env, req, opts) => {
      pedidoGratis = { req, opts };
      return { provider: "groq", text: '{"classification":"lead","priority":70,"needsHuman":false,"messages":["Oi, Ana! Sou o David."],"reason":"r","understood":"","memory":{"nome":"Ana"}}' };
    }
  });
  assert.equal(answer.engine, "groq");
  assert.deepEqual(answer.messages, ["Oi, Ana! Sou o David."]);
  assert.ok(!pedidoGratis.opts.order.includes("gemini"));
  assert.match(pedidoGratis.req.user, /quanto custa/);
});

test("reserva da Alice pede para escrever quando chega áudio", async () => {
  let system = "";
  const env = { GEMINI_API_KEY: "g" };
  const fetcher = async () => new Response("{}", { status: 503 });
  const req = pedidoReserva({ mediaType: "audio", media: { mimeType: "audio/ogg", data: "AAAA" }, inboundText: "" });
  await aliceReplyReserva(env, req, fetcher, {
    freeChat: async (_env, r) => { system = r.system; return { provider: "groq", text: '{"messages":["Pode escrever, por favor?"]}' }; }
  });
  assert.match(system, /NÃO consegue ouvir/);
});

test("se a reserva também falhar, devolve o erro do Gemini", async () => {
  const env = { GEMINI_API_KEY: "g" };
  const fetcher = async () => new Response("{}", { status: 500 });
  await assert.rejects(
    aliceReplyReserva(env, pedidoReserva(), fetcher, { freeChat: async () => { throw new Error("free_llm_all_failed"); } }),
    /gemini_http_500/
  );
});
