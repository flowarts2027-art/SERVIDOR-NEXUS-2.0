import test from "node:test";
import assert from "node:assert/strict";
import { wantsReply, dmText, runCommentAutoReplyForClient } from "../src/comment-autoreply.js";
import { encryptSecret } from "../src/secrets.js";

const flow = { id: "primeiro-teste", name: "PRIMEIRO TESTE", instagram: "@flowarts2026", config: {} };

test("reconhece pedidos de interesse", () => {
  for (const text of ["quero", "Eu quero!", "EXEMPLO", "qual o preço?", "como funciona?"]) assert.ok(wantsReply(text), text);
  for (const text of ["lindo post", "parabéns", "querido"]) assert.ok(!wantsReply(text), text);
});

test("DM leva para o WhatsApp da Flow Arts", () => {
  assert.match(dmText(flow), /https:\/\/wa\.me\/5521964816185\?text=/);
});

test("responde uma vez por comentário: DM + resposta pública, ignora o próprio perfil", async () => {
  const secretEnv = { NEXUS_SECRET_KEY: "k" };
  const token = await encryptSecret(secretEnv, "tok");
  let stored = null;
  const env = { ...secretEnv, DB: { prepare(sql) { return { bind(...args) { return {
    first: async () => /FROM connections/.test(sql) ? { provider: "instagram", payload_json: JSON.stringify({ accessToken: token, igUserId: "99", username: "flowarts2026" }) }
      : /FROM nexus_state/.test(sql) && stored ? { value_json: stored } : null,
    run: async () => { if (/nexus_state/.test(sql)) stored = args[2]; return {}; }
  }; } }; } } };
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push([options.method || "GET", url]);
    if (url.includes("/media?")) return Response.json({ data: [{ id: "m1" }] });
    if (url.includes("/comments?")) return Response.json({ data: [
      { id: "c1", text: "quero", username: "cliente1", timestamp: new Date().toISOString() },
      { id: "c2", text: "quero", username: "flowarts2026", timestamp: new Date().toISOString() },
      { id: "c3", text: "lindo", username: "cliente2", timestamp: new Date().toISOString() }
    ] });
    return Response.json({ id: "ok" });
  };
  const first = await runCommentAutoReplyForClient(env, flow, { request });
  assert.equal(first.replied, 1);
  assert.ok(calls.some(([m, u]) => m === "POST" && u.endsWith("/99/messages")));
  assert.ok(calls.some(([m, u]) => m === "POST" && u.endsWith("/c1/replies")));
  const second = await runCommentAutoReplyForClient(env, flow, { request });
  assert.equal(second.replied, 0);
});
