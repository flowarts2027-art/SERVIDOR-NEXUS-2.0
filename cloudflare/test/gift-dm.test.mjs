import test from "node:test";
import assert from "node:assert/strict";
import { followedReply, askMessage, downloadMessage, markGiftAsked, readGiftDmState, runGiftInboxForClient, FOLLOWED_PATTERN } from "../src/gift-dm.js";

function memoryEnv() {
  const rows = new Map();
  const prepare = sql => ({
    bind: (...args) => ({
      run: async () => {
        if (/INSERT INTO nexus_state/.test(sql)) {
          if (/VALUES\(\?1, 'state'/.test(sql)) rows.set(args[0] + "|state|" + args[1], args[2]);
          else rows.set(args[0] + "|" + args[1], args[3]);
        }
        return {};
      },
      first: async () => {
        if (/item_key='state' AND client_id=\?2/.test(sql)) { const v = rows.get(args[0] + "|state|" + args[1]); return v ? { value_json: v } : null; }
        if (/item_key=\?2/.test(sql)) { const v = rows.get(args[0] + "|" + args[1]); return v ? { value_json: v } : null; }
        return null;
      },
      all: async () => ({ results: [] })
    })
  });
  return { rows, NEXUS_SECRET_KEY: "k", DB: { prepare } };
}

const NOW = new Date("2026-10-12T02:10:00Z");
const client = { id: "primeiro-teste", instagram: "@flowarts2026" };
const conn = { accessToken: "t", igUserId: "100", username: "flowarts2026" };

test("botão rápido Já segui e botão Baixar conteúdo", () => {
  const ask = askMessage();
  assert.equal(ask.text, "Me siga para receber o conteúdo 🎁");
  assert.equal(ask.quick_replies[0].title, "Já segui");
  const dl = downloadMessage("https://x.test/b/abc");
  assert.equal(dl.attachment.payload.buttons[0].title, "Baixar conteúdo");
  assert.equal(dl.attachment.payload.buttons[0].url, "https://x.test/b/abc");
});

test("entende Já segui / segui / seguindo, e ignora mensagens velhas ou nossas", () => {
  for (const t of ["Já segui", "ja segui", "segui", "Seguindo", "to seguindo"]) assert.ok(FOLLOWED_PATTERN.test(t), t);
  assert.ok(!FOLLOWED_PATTERN.test("quero"));
  const msgs = [
    { id: "a", created_time: "2026-10-12T02:05:00+0000", from: { id: "100" }, message: "Já segui" },
    { id: "b", created_time: "2026-10-12T01:00:00+0000", from: { id: "9" }, message: "segui" },
    { id: "c", created_time: "2026-10-12T02:06:00+0000", from: { id: "9" }, message: "Já segui" }
  ];
  assert.equal(followedReply(msgs, "100", "2026-10-12T02:00:00Z").id, "c");
  assert.equal(followedReply(msgs, "100", "2026-10-12T02:07:00Z"), null);
});

function fakeInstagram({ follows }) {
  const sent = [];
  const request = async (url, opts = {}) => {
    if (/me\/conversations/.test(url)) {
      return new Response(JSON.stringify({ data: [{ messages: { data: [
        { id: "m2", created_time: "2026-10-12T02:09:00+0000", from: { id: "9", username: "ana" }, message: "Já segui" },
        { id: "m1", created_time: "2026-10-12T02:01:00+0000", from: { id: "100", username: "flowarts2026" }, message: "Me siga para receber o conteúdo 🎁" }
      ] } }] }));
    }
    if (/is_user_follow_business/.test(url)) return new Response(JSON.stringify({ username: "ana", is_user_follow_business: follows }));
    if (/\/messages$/.test(url)) { sent.push(JSON.parse(opts.body)); return new Response("{}"); }
    return new Response("{}", { status: 404 });
  };
  return { request, sent };
}

test("não segue: responde 'precisa me seguir primeiro' com Já segui de novo", async () => {
  const env = memoryEnv();
  await markGiftAsked(env, client.id, { igsid: "9", username: "ana", commentId: "c1" }, new Date("2026-10-12T02:00:00Z"));
  const ig = fakeInstagram({ follows: false });
  const out = await runGiftInboxForClient(env, client, { request: ig.request, now: NOW, conn });
  assert.equal(out.sent, 1);
  assert.equal(ig.sent[0].recipient.id, "9");
  assert.match(ig.sent[0].message.text, /^Você precisa me seguir primeiro/);
  assert.equal(ig.sent[0].message.quick_replies[0].title, "Já segui");
  // A mesma mensagem não é respondida duas vezes.
  const again = await runGiftInboxForClient(env, client, { request: ig.request, now: NOW, conn });
  assert.equal(again.sent, 0);
});

test("segue: manda o botão Baixar conteúdo com o link do brinde", async () => {
  const env = memoryEnv();
  await markGiftAsked(env, client.id, { igsid: "9", username: "ana", commentId: "c1" }, new Date("2026-10-12T02:00:00Z"));
  const ig = fakeInstagram({ follows: true });
  const out = await runGiftInboxForClient(env, client, { request: ig.request, now: NOW, conn });
  assert.equal(out.sent, 1);
  const button = ig.sent[0].message.attachment.payload.buttons[0];
  assert.equal(button.title, "Baixar conteúdo");
  assert.match(button.url, /\/b\/[A-Za-z0-9]{9}$/);
  const state = await readGiftDmState(env, client.id);
  assert.equal(state.pending["9"].stage, "done");
});

test("sem ninguém esperando, não chama o Instagram", async () => {
  const env = memoryEnv();
  let calls = 0;
  const out = await runGiftInboxForClient(env, client, { request: async () => { calls += 1; return new Response("{}"); }, now: NOW, conn });
  assert.equal(out.skipped, "nothing_pending");
  assert.equal(calls, 0);
});

import { followedFromWebhook, processWebhookFollowed } from "../src/gift-dm.js";

test("aviso da Meta: pega o toque em Já segui e ignora eco e outras mensagens", () => {
  const body = { object: "instagram", entry: [{ id: "100", time: 1760235000, messaging: [
    { sender: { id: "9" }, recipient: { id: "100" }, timestamp: 1760235000123, message: { mid: "a", text: "Já segui", quick_reply: { payload: "GIFT_FOLLOWED" } } },
    { sender: { id: "100" }, recipient: { id: "9" }, timestamp: 1760235000200, message: { mid: "b", text: "Já segui", is_echo: true } },
    { sender: { id: "9" }, recipient: { id: "100" }, timestamp: 1760235000300, message: { mid: "c", text: "oi" } }
  ] }] };
  const items = followedFromWebhook(body);
  assert.equal(items.length, 1);
  assert.equal(items[0].igsid, "9");
  assert.equal(items[0].igUserId, "100");
});

test("aviso da Meta: responde na hora e não repete o mesmo toque", async () => {
  const env = memoryEnv();
  await markGiftAsked(env, client.id, { igsid: "9", username: "ana", commentId: "c1" }, new Date("2026-10-12T02:00:00Z"));
  const ig = fakeInstagram({ follows: false });
  const items = [{ igUserId: "100", igsid: "9", text: "Já segui", payload: "GIFT_FOLLOWED", at: "2026-10-12T02:09:00.000Z" }];
  const findClient = async id => id === "100" ? { client, conn } : null;
  const r = await processWebhookFollowed(env, items, { request: ig.request, now: NOW, findClient });
  assert.equal(r[0].stage, "not_following");
  assert.match(ig.sent[0].message.text, /^Você precisa me seguir primeiro/);
  const r2 = await processWebhookFollowed(env, items, { request: ig.request, now: NOW, findClient });
  assert.equal(r2[0].skipped, "already_handled");
  // A leitura de 1 minuto também não repete a mesma mensagem.
  const again = await runGiftInboxForClient(env, client, { request: ig.request, now: NOW, conn });
  assert.equal(again.sent, 0);
});
