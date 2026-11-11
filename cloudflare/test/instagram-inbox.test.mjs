import test from "node:test";
import assert from "node:assert/strict";
import { handleInstagramInboxPortal, commentAction, sendDirect, listConversations, validId } from "../src/instagram-inbox.js";

const client = { id: "cliente-x", instagram: "@loja" };
const resolve = async () => ({ accessToken: "tok", igUserId: "111", username: "loja" });

function fakeGraph(routes) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : null });
    for (const [match, reply] of routes) if (String(url).includes(match)) return Response.json(typeof reply === "function" ? reply(url, opts) : reply);
    return Response.json({ error: { message: "not mocked" } }, { status: 400 });
  };
  return { calls, fetchImpl };
}

const call = (path, { method = "GET", body, fetchImpl, resolveFn = resolve } = {}) => {
  const url = new URL("https://nexus.test" + path);
  const request = new Request(url, method === "GET" ? { method } : { method, body: JSON.stringify(body || {}), headers: { "content-type": "application/json" } });
  return handleInstagramInboxPortal(request, {}, url, client, { fetchImpl, resolve: resolveFn });
};

test("rotas de fora do /api/portal/ig/ não são tratadas aqui", async () => {
  assert.equal(await call("/api/portal/autoreply"), null);
});

test("sem Instagram conectado: avisa e não chama a Meta", async () => {
  const { calls, fetchImpl } = fakeGraph([]);
  const res = await call("/api/portal/ig/conversations", { fetchImpl, resolveFn: async () => null });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "instagram_not_connected");
  assert.equal(calls.length, 0);
});

test("lista conversas mostrando a outra pessoa, não a própria conta", async () => {
  const { fetchImpl } = fakeGraph([["me/conversations", { data: [{ id: "c1", updated_time: "2026-11-11T10:00:00+0000", participants: { data: [{ id: "111", username: "loja" }, { id: "999", username: "maria" }] }, messages: { data: [{ message: "Oi", from: { id: "999" } }] } }] }]]);
  const out = await listConversations({ request: fetchImpl, token: "t", igUserId: "111" });
  assert.deepEqual(out.map(c => [c.recipientId, c.username, c.lastText, c.lastFromMe]), [["999", "maria", "Oi", false]]);
});

test("envio manual do Direct sai para a pessoa escolhida", async () => {
  const { calls, fetchImpl } = fakeGraph([["me/messages", { message_id: "m1" }]]);
  const res = await call("/api/portal/ig/send", { method: "POST", body: { recipientId: "999", text: " Olá! " }, fetchImpl });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).messageId, "m1");
  assert.deepEqual(calls[0].body, { recipient: { id: "999" }, message: { text: "Olá!" } });
});

test("Direct vazio ou id estranho é recusado sem chamar a Meta", async () => {
  const { calls, fetchImpl } = fakeGraph([]);
  await assert.rejects(sendDirect({ request: fetchImpl, token: "t", igUserId: "111", recipientId: "999", text: "  " }), /empty_text/);
  await assert.rejects(sendDirect({ request: fetchImpl, token: "t", igUserId: "111", recipientId: "../me", text: "oi" }), /invalid_id/);
  assert.equal(calls.length, 0);
  assert.equal(validId("17890000000000000"), true);
});

test("fora da janela de 24h: mensagem clara", async () => {
  const { fetchImpl } = fakeGraph([]);
  const failing = async () => Response.json({ error: { message: "This message is sent outside of allowed window." } }, { status: 400 });
  const res = await call("/api/portal/ig/send", { method: "POST", body: { recipientId: "999", text: "oi" }, fetchImpl: failing });
  assert.equal((await res.json()).error, "outside_window");
  assert.ok(fetchImpl);
});

test("comentar, responder, ocultar e apagar usam a chamada certa da Meta", async () => {
  const { calls, fetchImpl } = fakeGraph([["graph.instagram.com", { id: "novo", success: true }]]);
  await commentAction({ request: fetchImpl, token: "t", action: "comment", mediaId: "m1", text: "Bem-vindo" });
  await commentAction({ request: fetchImpl, token: "t", action: "reply", commentId: "c1", text: "Obrigado" });
  await commentAction({ request: fetchImpl, token: "t", action: "hide", commentId: "c1" });
  await commentAction({ request: fetchImpl, token: "t", action: "unhide", commentId: "c1" });
  await commentAction({ request: fetchImpl, token: "t", action: "delete", commentId: "c1" });
  const seen = calls.map(c => { const u = new URL(c.url); return [c.method, u.pathname, u.searchParams.get("message") || u.searchParams.get("hide") || ""]; });
  assert.deepEqual(seen, [
    ["POST", "/m1/comments", "Bem-vindo"],
    ["POST", "/c1/replies", "Obrigado"],
    ["POST", "/c1", "true"],
    ["POST", "/c1", "false"],
    ["DELETE", "/c1", ""]
  ]);
});

test("ação desconhecida ou edição de comentário é recusada", async () => {
  const { calls, fetchImpl } = fakeGraph([]);
  await assert.rejects(commentAction({ request: fetchImpl, token: "t", action: "edit", commentId: "c1", text: "x" }), /invalid_action/);
  const res = await call("/api/portal/ig/comment", { method: "POST", body: { action: "reply", commentId: "c1", text: "" }, fetchImpl });
  assert.equal((await res.json()).error, "empty_text");
  assert.equal(calls.length, 0);
});

test("lista comentários com respostas e marca ocultos", async () => {
  const { fetchImpl } = fakeGraph([
    ["/111/media", { data: [{ id: "m1", caption: "Post", permalink: "https://instagram.com/p/x" }] }],
    ["/m1/comments", { data: [{ id: "c1", text: "Quero", username: "maria", hidden: true, replies: { data: [{ id: "r1", text: "Te chamei", username: "loja" }] } }] }]
  ]);
  const res = await call("/api/portal/ig/comments", { fetchImpl });
  const body = await res.json();
  assert.equal(body.posts[0].comments[0].hidden, true);
  assert.equal(body.posts[0].comments[0].replies[0].id, "r1");
});
