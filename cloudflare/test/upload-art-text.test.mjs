import test from "node:test";
import assert from "node:assert/strict";
import { parseHasText, imageHasText } from "../src/art-frame.js";

test("checagem de texto: só NAO libera o Nexus a escrever por cima", () => {
  assert.equal(parseHasText("NAO"), false);
  assert.equal(parseHasText("Não."), false);
  assert.equal(parseHasText("no"), false);
  assert.equal(parseHasText("SIM"), true);
  assert.equal(parseHasText(""), true);
  assert.equal(parseHasText("talvez"), true);
});

test("checagem de texto: sem IA, conta como já tem texto (nunca escreve por cima)", async () => {
  assert.equal(await imageHasText({}, new Uint8Array([1, 2, 3])), true);
});
