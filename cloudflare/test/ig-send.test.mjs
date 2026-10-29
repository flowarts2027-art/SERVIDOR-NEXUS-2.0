import test from "node:test";
import assert from "node:assert/strict";
import { sendInstagramMessage, messagePaths } from "../src/ig-send.js";

test("direct sai primeiro por me/messages (jeito do ChatbotX)", async () => {
  const calls = [];
  const request = async (url, opts) => { calls.push([url, JSON.parse(opts.body)]); return Response.json({ message_id: "m1" }); };
  const out = await sendInstagramMessage({ request, token: "t", igUserId: "123", recipient: { comment_id: "c1" }, message: { text: "Oi" } });
  assert.equal(out.message_id, "m1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://graph.instagram.com/me/messages");
  assert.deepEqual(calls[0][1], { recipient: { comment_id: "c1" }, message: { text: "Oi" } });
});

test("se a Meta recusar me/messages, tenta o caminho antigo pelo id da conta", async () => {
  const urls = [];
  const request = async url => { urls.push(url); return url.endsWith("/me/messages") ? Response.json({ error: { message: "Unsupported post request" } }, { status: 400 }) : Response.json({ message_id: "m2" }); };
  const out = await sendInstagramMessage({ request, token: "t", igUserId: "123", recipient: { id: "9" }, message: { text: "Oi" } });
  assert.equal(out.message_id, "m2");
  assert.deepEqual(urls, ["https://graph.instagram.com/me/messages", "https://graph.instagram.com/123/messages"]);
});

test("falha de rede não repete (evita direct duplicado)", async () => {
  let count = 0;
  const request = async () => { count += 1; throw new Error("timeout"); };
  await assert.rejects(sendInstagramMessage({ request, token: "t", igUserId: "123", recipient: { id: "9" }, message: { text: "Oi" } }), /timeout/);
  assert.equal(count, 1);
});

test("os dois caminhos recusados: devolve o erro da Meta", async () => {
  const request = async () => Response.json({ error: { message: "Outside of allowed window" } }, { status: 400 });
  await assert.rejects(sendInstagramMessage({ request, token: "t", igUserId: "123", recipient: { id: "9" }, message: { text: "Oi" } }), /Outside of allowed window/);
  assert.deepEqual(messagePaths(""), ["me/messages"]);
  assert.deepEqual(messagePaths("me"), ["me/messages"]);
});
