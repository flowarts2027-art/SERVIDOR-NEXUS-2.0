// Texto por código nas artes sem texto da Biblioteca (pedido do Rodrigo, 28/10/2026).
import test from "node:test";
import assert from "node:assert/strict";
import { textTable, artText, parseTheme, handleArtText, themePrompt } from "../src/art-text.js";

test("GILTEC tem os textos de todos os equipamentos; outros clientes não escrevem nada", async () => {
  const t = textTable("giltec");
  for (const key of ["compactador", "betoneira", "martelete", "gerador", "cortadora", "alisadora", "guincho", "escoras", "iluminacao", "obra"]) assert.ok(t[key], key);
  assert.equal(textTable("quatree-dog"), null);
  assert.deepEqual(await handleArtText({}, { id: "quatree-dog" }, {}), { ok: true, text: null });
  assert.match(themePrompt(t), /escoras/);
});

test("assunto vindo da IA: acha a palavra da lista, senão fica obra", () => {
  const t = textTable("giltec");
  assert.equal(parseTheme("Alisadora.", t), "alisadora");
  assert.equal(parseTheme("ILUMINAÇÃO", t), "iluminacao");
  assert.equal(parseTheme("um caminhão", t), "obra");
});

test("texto: 3 linhas em maiúsculas, 3 vantagens, botão do feed e do story", async () => {
  const t = textTable("giltec");
  const feed = artText(t, "escoras", 1);
  assert.equal(feed.titulo.length, 3);
  assert.ok(feed.titulo.every(l => l === l.toUpperCase()));
  assert.equal(feed.vantagens.length, 3);
  assert.equal(feed.botao, "COMENTE QUERO");
  assert.equal(artText(t, "nada", 0, true).botao, "MANDE QUERO NO DIRECT");
  // Sem IA: textos gerais de obra, com a logo verdadeira.
  const r = await handleArtText({}, { id: "giltec" }, { image: "data:image/jpeg;base64,AAAA", seed: 2 });
  assert.equal(r.text.theme, "obra");
  assert.equal(r.logo, "/brand/giltec-logo.png");
  // Com IA: usa o assunto que ela disse.
  const env = { AI: { run: async () => ({ response: "guincho" }) } };
  assert.equal((await handleArtText(env, { id: "giltec" }, { image: "data:image/jpeg;base64,AAAA" })).text.theme, "guincho");
});
