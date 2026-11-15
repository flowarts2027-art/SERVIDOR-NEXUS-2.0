// 15/11/2026 (Rodrigo): o David (WhatsApp) usa a chave da OpenAI do painel Master,
// com modelo de texto barato. Nenhum outro robô usa essa chave. Imagens não mudam.
// O aviso de arte para aprovar segue só com o modelo da Meta, sem IA.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { davidReply, buildAliceRequest } from "../src/whatsapp-alice.js";

const SRC = new URL("../src/", import.meta.url);
const read = name => fs.readFileSync(new URL(name, SRC), "utf8");
const files = fs.readdirSync(SRC).filter(name => name.endsWith(".js"));

const KNOWN = "CLIENTE DO NEXUS: este número é do cliente Adimax (painel adimax-eduardo-soares).";
const request = (extra = {}) => buildAliceRequest({
  knowledge: "Você é o David, atendente da Flow Arts.", knownCustomer: KNOWN, memory: {},
  history: "", inboundText: "Oi, minha arte chegou?", displayName: "Eduardo", alreadyIntroduced: false, ...extra
});
const ANSWER = JSON.stringify({ classification: "cliente", priority: 60, needsHuman: false, messages: ["Oi, Eduardo!", "Já vejo para você."], reason: "cliente" });

test("só o David chama a OpenAI", () => {
  const users = files.filter(name => /\bdavidResponses\b/.test(read(name)));
  assert.deepEqual(users.sort(), ["openai.js", "whatsapp-agent.js", "whatsapp-alice.js"]);
  const direct = files.filter(name => /api\.openai\.com\/v1\/(responses|chat|completions|images|audio)/.test(read(name)));
  assert.deepEqual(direct, ["openai.js"], "ninguém chama a OpenAI por fora");
  assert.match(read("openai.js"), /export async function openAIResponses\(\) \{\s*const error = new Error\("openai_reserved_for_david"\)/);
});

test("David: texto vai pela OpenAI e reconhece o cliente do Master", async () => {
  const calls = [];
  const answer = await davidReply({}, "primeiro-teste", request(), fetch, {
    davidResponses: async (env, clientId, input) => { calls.push({ clientId, input }); return { output_text: ANSWER }; },
    freeChat: async () => { throw new Error("reserva não deveria ser usada"); }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].clientId, "primeiro-teste");
  const system = calls[0].input.input[0].content;
  assert.match(system, /David/);
  assert.ok(system.includes(KNOWN), "o cliente do Master entra no pedido");
  assert.equal(answer.engine, "openai");
  assert.deepEqual(answer.messages, ["Oi, Eduardo!", "Já vejo para você."]);
});

test("David: áudio e imagem não vão para a OpenAI; falha da OpenAI cai na reserva", async () => {
  let openai = 0;
  const deps = {
    davidResponses: async () => { openai++; throw new Error("openai_quota_exhausted"); },
    freeChat: async () => ({ text: ANSWER, provider: "groq" })
  };
  const media = await davidReply({}, "primeiro-teste", request({ mediaType: "audio", media: { mimeType: "audio/ogg", data: "AAA=" } }), fetch, deps);
  assert.equal(openai, 0, "áudio segue pelo Gemini/reserva");
  assert.equal(media.engine, "groq");
  const text = await davidReply({}, "primeiro-teste", request(), fetch, deps);
  assert.equal(openai, 1);
  assert.equal(text.engine, "groq");
});

test("aviso de arte para aprovar: só o modelo da Meta, sem IA, e desligado por padrão", async () => {
  const code = read("client-approval-notify.js");
  assert.doesNotMatch(code, /openai|gemini|free-llm|whatsapp-alice|davidResponses|AI\.run/i);
  assert.match(code, /template: \{ name: config\.template/);
  const { approvalNoticeConfig } = await import("../src/client-approval-notify.js");
  assert.equal(approvalNoticeConfig({}).enabled, false);
  assert.equal(approvalNoticeConfig({ CLIENT_APPROVAL_TEMPLATE: "aviso_arte_painel" }).enabled, false);
});

test("imagens não mudaram: geração não usa o David nem a chave dele", () => {
  for (const name of ["media-generation.js", "gemini-campaign.js", "post-watcher.js", "format-builder.js"]) {
    assert.doesNotMatch(read(name), /davidResponses|davidOpenAIKey/, name);
  }
});
