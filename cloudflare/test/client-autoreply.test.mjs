import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { matchesKeyword, parseKeywords, defaultKeywords, clientAutoReplyConfig, saveClientAutoReplyConfig, buildDm } from "../src/client-autoreply.js";
import { replyToComment } from "../src/comment-autoreply.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { DB };
}

const client = { id: "loja-racao", name: "Loja Ração", niche: "Vendas de Ração Pet", config: { agentProfile: { brandName: "Loja Ração", whatsapp: "34999990000" } } };

test("palavras: casa com acento e maiúscula, só palavra inteira", () => {
  const words = ["preço", "tabela", "como comprar"];
  assert.equal(matchesKeyword("Qual o PRECO?", words), true);
  assert.equal(matchesKeyword("me manda a tabela", words), true);
  assert.equal(matchesKeyword("Como comprar aí?", words), true);
  assert.equal(matchesKeyword("tabelas bonitas", words), false);
  assert.equal(matchesKeyword("lindo cachorro", words), false);
  assert.deepEqual(parseKeywords("Quero, preço; quero\nTabela"), ["quero", "preço", "tabela"]);
  assert.ok(defaultKeywords(client).includes("revenda"));
});

test("config começa desligada; ligar exige WhatsApp quando a mensagem usa {whatsapp}", async () => {
  const env = fakeEnv();
  const first = await clientAutoReplyConfig(env, client);
  assert.equal(first.enabled, false);
  assert.match(first.dm, /\{whatsapp\}/);
  const noPhone = { ...client, id: "sem-zap", config: { agentProfile: { brandName: "Sem Zap" } } };
  await assert.rejects(saveClientAutoReplyConfig(env, noPhone, { enabled: true }), /autoreply_whatsapp/);
  const saved = await saveClientAutoReplyConfig(env, client, { enabled: true, keywords: "preço, tabela" });
  assert.equal(saved.enabled, true);
  assert.deepEqual(saved.keywords, ["preço", "tabela"]);
  assert.match(buildDm(client, saved), /https:\/\/wa\.me\/5534999990000/);
});

test("responde uma vez com as palavras do cliente e a frase pública dele", async () => {
  const calls = [];
  const request = async (url, options = {}) => { calls.push({ url: String(url), body: String(options.body || "") }); return { ok: true, json: async () => ({ id: "x" }) }; };
  const state = { handled: {} };
  const base = { request, token: "t", igUserId: "999", ownUsername: "loja", state, message: "Oi! Tabela: link", now: new Date("2026-10-22T12:00:00Z"),
    matches: text => matchesKeyword(text, ["preço"]), publicText: "Te mandei no direct 🐶" };
  const skip = await replyToComment(base, { id: "c1", from: { id: "1", username: "ana" }, text: "que lindo", timestamp: "2026-10-22T11:00:00Z" });
  assert.equal(skip.skipped, "no_interest_word");
  const ok = await replyToComment(base, { id: "c2", from: { id: "2", username: "bia" }, text: "qual o preço?", timestamp: "2026-10-22T11:00:00Z" });
  assert.equal(ok.replied, true);
  assert.match(calls[0].body, /Oi! Tabela: link/);
  assert.match(decodeURIComponent(calls[1].body.replace(/\+/g, " ")), /Te mandei no direct/);
  const again = await replyToComment(base, { id: "c2", from: { id: "2", username: "bia" }, text: "qual o preço?", timestamp: "2026-10-22T11:00:00Z" });
  assert.equal(again.skipped, "already_handled");
});

test("painel do cliente tem o bloco e a Flow Arts não vê", () => {
  const html = fs.readFileSync(new URL("../../public/portal.html", import.meta.url), "utf8");
  assert.match(html, /id="autoreply-box"/);
  assert.match(html, /autoreply\.js/);
  const src = fs.readFileSync(new URL("../src/client-autoreply.js", import.meta.url), "utf8");
  assert.match(src, /brandProfileVersion\(client\.id\)\) return send\(\{ ok: true, hidden: true \}\)/);
});
