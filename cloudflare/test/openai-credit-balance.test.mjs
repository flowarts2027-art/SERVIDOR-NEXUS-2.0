import test from "node:test";
import assert from "node:assert/strict";
import { fetchCreditBalance } from "../src/master-openai.js";

test("usa o saldo da OpenAI quando a rota de créditos responde", async () => {
  const value = await fetchCreditBalance(["k"], async () => new Response(JSON.stringify({ total_available: 5.53 }), { status: 200 }));
  assert.equal(value, 5.53);
});

test("tenta a próxima chave e devolve null se todas recusarem", async () => {
  let calls = 0;
  const value = await fetchCreditBalance(["a", "b"], async () => { calls++; return new Response("{}", { status: 403 }); });
  assert.equal(value, null);
  assert.equal(calls, 2);
});
