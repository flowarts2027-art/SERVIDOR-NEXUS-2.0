import test from "node:test";
import assert from "node:assert/strict";
import { freeChat, freeLlmStatus, providerOrder } from "../src/free-llm.js";

function okFetch(text, calls) {
  return async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization });
    return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
  };
}

test("pula provedor sem chave e usa o primeiro que tem chave", async () => {
  const calls = [];
  const env = { OPENROUTER_API_KEY: "k-or" };
  const out = await freeChat(env, { user: "oi" }, { fetcher: okFetch("olá", calls) });
  assert.equal(out.provider, "openrouter");
  assert.equal(out.text, "olá");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /openrouter\.ai/);
  assert.equal(calls[0].body.model, "openrouter/free");
});

test("quando um provedor bate o limite, passa para o próximo", async () => {
  const calls = [];
  const env = { GROQ_API_KEY: "k1", MISTRAL_API_KEY: "k2" };
  const fetcher = async (url, init) => {
    calls.push(url);
    if (url.includes("groq")) return new Response("{}", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "resposta" } }] }), { status: 200 });
  };
  const out = await freeChat(env, { system: "s", user: "u" }, { fetcher });
  assert.equal(out.provider, "mistral");
  assert.deepEqual(out.tried, ["groq:groq_http_429"]);
  assert.equal(calls.length, 2);
});

test("Cloudflare Workers AI é o último recurso, sem chave", async () => {
  const env = { AI: { run: async () => ({ response: "do cloudflare" }) } };
  const out = await freeChat(env, { user: "u" }, { fetcher: async () => { throw new Error("não deveria chamar"); } });
  assert.equal(out.provider, "cloudflare");
  assert.equal(out.text, "do cloudflare");
});

test("todos falharam: erro com a lista do que foi tentado", async () => {
  const env = { GROQ_API_KEY: "k", AI: { run: async () => { throw new Error("cf_down"); } } };
  await assert.rejects(
    freeChat(env, { user: "u" }, { fetcher: async () => new Response("x", { status: 500 }) }),
    error => error.message === "free_llm_all_failed" && error.tried.length === 2
  );
});

test("ordem e modelo podem ser trocados por variável", async () => {
  const calls = [];
  const env = { GROQ_API_KEY: "a", NVIDIA_API_KEY: "b", FREE_LLM_ORDER: "nvidia,groq", FREE_LLM_NVIDIA_MODEL: "google/gemma-4-31b-it" };
  assert.deepEqual(providerOrder(env), ["nvidia", "groq"]);
  const out = await freeChat(env, { user: "u" }, { fetcher: okFetch("ok", calls) });
  assert.equal(out.provider, "nvidia");
  assert.equal(calls[0].body.model, "google/gemma-4-31b-it");
});

test("status mostra o que está pronto e nunca a chave", () => {
  const status = freeLlmStatus({ GROQ_API_KEY: "segredo-123" });
  assert.equal(status.find(s => s.provider === "groq").ready, true);
  assert.equal(status.find(s => s.provider === "mistral").ready, false);
  assert.ok(!JSON.stringify(status).includes("segredo-123"));
});
