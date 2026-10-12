import test from "node:test";
import assert from "node:assert/strict";
import { validMetaSignature, commentsFromWebhook, handleInstagramWebhook, replyToComment, WEBHOOK_PATH } from "../src/comment-autoreply.js";

async function sign(body, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const sample = {
  object: "instagram",
  entry: [{ id: "17841400000000000", time: 1791763200, changes: [{ field: "comments", value: { id: "c1", text: "QUERO", from: { id: "u1", username: "globalplay_streaming" }, media: { id: "m1" } } }] }]
};

test("assinatura da Meta é conferida", async () => {
  const body = JSON.stringify(sample);
  assert.equal(await validMetaSignature(body, await sign(body, "s3cret"), "s3cret"), true);
  assert.equal(await validMetaSignature(body, await sign(body, "outro"), "s3cret"), false);
  assert.equal(await validMetaSignature(body, "", "s3cret"), false);
});

test("extrai o comentário do aviso da Meta", () => {
  const items = commentsFromWebhook(sample);
  assert.equal(items.length, 1);
  assert.equal(items[0].igUserId, "17841400000000000");
  assert.equal(items[0].comment.id, "c1");
  assert.equal(items[0].comment.username, "globalplay_streaming");
  assert.equal(items[0].comment.text, "QUERO");
  assert.deepEqual(commentsFromWebhook({ entry: [{ changes: [{ field: "messages", value: {} }] }] }), []);
});

test("verificação do webhook devolve o challenge só com o token certo", async () => {
  const ok = new URL("https://x.test" + WEBHOOK_PATH + "?hub.mode=subscribe&hub.verify_token=nexus-flowarts-instagram&hub.challenge=123");
  const res = await handleInstagramWebhook(new Request(ok), {}, ok, {});
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "123");
  const bad = new URL("https://x.test" + WEBHOOK_PATH + "?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123");
  assert.equal((await handleInstagramWebhook(new Request(bad), {}, bad, {})).status, 403);
  const other = new URL("https://x.test/outra");
  assert.equal(await handleInstagramWebhook(new Request(other), {}, other, {}), null);
});

test("aviso sem assinatura válida é recusado", async () => {
  const url = new URL("https://x.test" + WEBHOOK_PATH);
  const env = { INSTAGRAM_APP_SECRET: "s3cret", DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }) }) } };
  const res = await handleInstagramWebhook(new Request(url, { method: "POST", body: JSON.stringify(sample), headers: { "x-hub-signature-256": "sha256=00" } }), env, url, {});
  assert.equal(res.status, 401);
});

test("responde QUERO com DM e resposta pública, uma vez só", async () => {
  const calls = [];
  const request = async (u, o = {}) => { calls.push([String(u), o.method || "GET"]); return new Response("{}", { status: 200 }); };
  const state = { handled: {} };
  const ctx = { request, token: "t", igUserId: "17841400000000000", ownUsername: "flowarts2026", state, message: "Oi", now: new Date("2026-10-11T23:00:00Z") };
  const first = await replyToComment(ctx, { id: "c1", text: "eu QUERO", username: "fulano" });
  assert.equal(first.replied, true);
  assert.ok(calls.some(([u]) => u.endsWith("/17841400000000000/messages")));
  assert.ok(calls.some(([u]) => u.endsWith("/c1/replies")));
  const again = await replyToComment(ctx, { id: "c1", text: "eu QUERO", username: "fulano" });
  assert.equal(again.skipped, "already_handled");
  assert.equal((await replyToComment(ctx, { id: "c2", text: "QUERO", username: "flowarts2026" })).skipped, "own_comment");
  assert.equal((await replyToComment(ctx, { id: "c3", text: "lindo!", username: "x" })).skipped, "no_interest_word");
});

test("comentário sem nome, só com id de quem comentou, também é respondido", async () => {
  const request = async () => new Response("{}", { status: 200 });
  const state = { handled: {} };
  const ctx = { request, token: "t", igUserId: "999", ownUsername: "flowarts2026", state, message: "Oi", now: new Date() };
  const res = await replyToComment(ctx, { id: "c9", text: "Quero", from: { id: "123" } });
  assert.equal(res.replied, true);
  const own = await replyToComment(ctx, { id: "c10", text: "Quero", from: { id: "999" } });
  assert.equal(own.skipped, "own_comment");
});
