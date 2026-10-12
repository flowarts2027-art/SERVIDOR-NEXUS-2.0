import test from "node:test";
import assert from "node:assert/strict";
import { giftDmText, giftButtonMessage, giftLink, readGiftCode, signGift, readGift, validateGiftLead, checkFollows, handleGiftLead, handleGiftRequest } from "../src/gift.js";
import { messageBuilder } from "../src/comment-autoreply.js";

function memoryEnv() {
  const rows = new Map();
  const calls = [];
  const prepare = sql => ({
    bind: (...args) => ({
      run: async () => {
        calls.push({ sql, args });
        if (/INSERT INTO nexus_state/.test(sql)) rows.set(args[0] + "|" + args[1], args[3] ?? args[2]);
        return {};
      },
      first: async () => {
        if (/FROM nexus_state WHERE namespace=\?1 AND item_key=\?2/.test(sql)) {
          const v = rows.get(args[0] + "|" + args[1]);
          return v ? { value_json: v } : null;
        }
        return null;
      },
      all: async () => ({ results: [] })
    }),
    run: async () => ({}), first: async () => null, all: async () => ({ results: [] })
  });
  return { calls, rows, NEXUS_SECRET_KEY: "teste-chave", DB: { prepare, batch: async () => [] } };
}

const NOW = new Date("2026-10-12T01:00:00Z");

test("direct do brinde é uma frase só com botão Baixar conteúdo", () => {
  const dm = giftDmText({ instagram: "@flowarts2026" }, "https://x.test/b/AbCdEfGh2", "flowarts2026");
  assert.equal(dm.text, "Me siga para receber o conteúdo 🎁");
  const msg = giftButtonMessage(dm);
  assert.equal(msg.attachment.payload.template_type, "button");
  assert.equal(msg.attachment.payload.text, "Me siga para receber o conteúdo 🎁");
  assert.deepEqual(msg.attachment.payload.buttons, [{ type: "web_url", url: "https://x.test/b/AbCdEfGh2", title: "Baixar conteúdo" }]);
  assert.ok(!msg.attachment.payload.text.includes("http"));
});

test("link curto guarda quem comentou e vence em 30 dias", async () => {
  const env = memoryEnv();
  const link = await giftLink(env, { clientId: "primeiro-teste", igsid: "123456", commentId: "c1", username: "ana" }, NOW);
  const code = link.split("/b/")[1];
  assert.match(code, /^[A-Za-z0-9]{9}$/);
  assert.ok(link.length < 70);
  const gift = await readGiftCode(env, code, NOW);
  assert.equal(gift.c, "primeiro-teste");
  assert.equal(gift.u, "123456");
  assert.equal(await readGiftCode(env, code, new Date("2026-11-20T00:00:00Z")), null);
  assert.equal(await readGiftCode(env, "../x", NOW), null);
});

test("chave assinada não aceita alteração nem vencimento", async () => {
  const env = memoryEnv();
  const key = await signGift(env, { c: "primeiro-teste", u: "1", f: 1, e: Math.floor(NOW.getTime() / 1000) + 60 });
  assert.equal((await readGift(env, key, NOW)).u, "1");
  assert.equal(await readGift(env, key.slice(0, -1) + (key.endsWith("A") ? "B" : "A"), NOW), null);
  assert.equal(await readGift(env, key, new Date(NOW.getTime() + 120000)), null);
  assert.equal(await readGift({ ...env, NEXUS_SECRET_KEY: "outra" }, key, NOW), null);
});

test("formulário do brinde valida nome, e-mail e WhatsApp", () => {
  const ok = { nome: "Ana", email: "ana@cafe.com.br", whatsapp: "(21) 98888-7777" };
  assert.equal(validateGiftLead(ok).lead.whatsapp, "5521988887777");
  assert.equal(validateGiftLead(ok).lead.email, "ana@cafe.com.br");
  assert.equal(validateGiftLead({ ...ok, email: "ana@" }).error, "email");
  assert.equal(validateGiftLead({ ...ok, whatsapp: "55 21 98888-7777" }).lead.whatsapp, "5521988887777");
  assert.equal(validateGiftLead({ ...ok, whatsapp: "123" }).error, "whatsapp");
  assert.equal(validateGiftLead({ ...ok, nome: "" }).error, "nome");
  assert.equal(validateGiftLead({ ...ok, website: "x" }).error, "spam");
});

test("confere se a pessoa segue o perfil", async () => {
  const yes = await checkFollows({ token: "t", igsid: "9", request: async () => new Response(JSON.stringify({ username: "ana", is_user_follow_business: true })) });
  assert.deepEqual(yes, { follows: true, username: "ana" });
  const no = await checkFollows({ token: "t", igsid: "9", request: async () => new Response(JSON.stringify({ is_user_follow_business: false })) });
  assert.equal(no.follows, false);
  const err = await checkFollows({ token: "t", igsid: "9", request: async () => new Response(JSON.stringify({ error: { message: "consent" } }), { status: 400 }) });
  assert.equal(err.follows, null);
});

test("depois de seguir, o WhatsApp vira contato quente e libera o guia", async () => {
  const env = memoryEnv();
  const key = await signGift(env, { c: "primeiro-teste", u: "777", n: "ana", f: 1, e: Math.floor(NOW.getTime() / 1000) + 3600 });
  const req = new Request("https://x.test/api/public/brinde/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, nome: "Ana", email: "ana@cafe.com.br", whatsapp: "21988887777" }) });
  const res = await handleGiftLead(req, env, { now: NOW });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.match(data.url, /^\/brinde\/guia\?k=/);
  const insert = env.calls.find(c => /INSERT INTO leads/.test(c.sql));
  assert.ok(insert);
  assert.equal(insert.args[0], "primeiro-teste:brinde:777");
  assert.equal(insert.args[4], "hot");
  const payload = JSON.parse(insert.args[14]);
  assert.equal(payload.contact.whatsapp, "5521988887777");
  assert.equal(payload.contact.email, "ana@cafe.com.br");
  // Sem ter tocado em "Já segui" (chave sem f:1) não libera.
  const bad = await signGift(env, { c: "primeiro-teste", u: "777", e: Math.floor(NOW.getTime() / 1000) + 3600 });
  const res2 = await handleGiftLead(new Request("https://x.test/a", { method: "POST", body: JSON.stringify({ key: bad, nome: "Ana", email: "ana@cafe.com.br", whatsapp: "21988887777" }) }), env, { now: NOW });
  assert.equal(res2.status, 400);
});

test("guia só abre com chave válida", async () => {
  const env = memoryEnv();
  const res = await handleGiftRequest(new Request("https://x.test/brinde/guia?k=x"), env, new URL("https://x.test/brinde/guia?k=x"), { now: NOW });
  assert.equal(res.status, 403);
  const k = await signGift(env, { c: "primeiro-teste", u: "1", g: 1, e: Math.floor(NOW.getTime() / 1000) + 60 });
  const url = new URL("https://x.test/brinde/guia?k=" + k);
  const ok = await handleGiftRequest(new Request(url), env, url, { now: NOW });
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /10 ideias de post/);
  assert.equal(await handleGiftRequest(new Request("https://x.test/outra"), env, new URL("https://x.test/outra")), null);
});

test("resposta do comentário usa o brinde; sem chave volta ao texto antigo", async () => {
  const env = memoryEnv();
  const client = { id: "primeiro-teste", instagram: "@flowarts2026", config: {} };
  const dm = await messageBuilder(env, client, "flowarts2026")({ id: "c9", fromId: "55", username: "ana" }, NOW);
  assert.deepEqual(dm, { kind: "ask", text: "Me siga para receber o conteúdo 🎁" });
  assert.ok([...env.rows.keys()].some(k => k.startsWith("gift-dm|")) || env.calls.some(c => /INSERT INTO nexus_state/.test(c.sql) && c.args[0] === "gift-dm"));
  const old = await messageBuilder({ ...env, NEXUS_SECRET_KEY: "" }, client, "flowarts2026")({ id: "c9", fromId: "55" }, NOW);
  assert.match(old, /wa\.me/);
});

test("envia o botão; se o Instagram recusar, manda a frase com o link", async () => {
  const { replyToComment } = await import("../src/comment-autoreply.js");
  const dm = { text: "Me siga para receber o conteúdo 🎁", buttonTitle: "Baixar conteúdo", url: "https://x.test/b/AbCdEfGh2" };
  const sent = [];
  const ok = async (url, opts) => { sent.push({ url, body: opts?.body }); return new Response("{}"); };
  const state = { handled: {} };
  const r = await replyToComment({ request: ok, token: "t", igUserId: "1", state, message: async () => dm, now: NOW }, { id: "c1", fromId: "9", text: "quero", timestamp: NOW.toISOString() });
  assert.equal(r.replied, true);
  assert.equal(JSON.parse(sent[0].body).message.attachment.payload.buttons[0].title, "Baixar conteúdo");
  const sent2 = [];
  let first = true;
  const fails = async (url, opts) => { sent2.push(opts?.body); if (first && /messages/.test(url)) { first = false; return new Response(JSON.stringify({ error: { message: "no template" } }), { status: 400 }); } return new Response("{}"); };
  const r2 = await replyToComment({ request: fails, token: "t", igUserId: "1", state: { handled: {} }, message: async () => dm, now: NOW }, { id: "c2", fromId: "9", text: "quero", timestamp: NOW.toISOString() });
  assert.equal(r2.replied, true);
  assert.equal(JSON.parse(sent2[1]).message.text, "Me siga para receber o conteúdo 🎁 https://x.test/b/AbCdEfGh2");
});
