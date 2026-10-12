import test from "node:test";
import assert from "node:assert/strict";
import { polishCaption, limitHashtags, shortenFirstLine } from "../src/caption-polish.js";

test("no máximo 5 hashtags", () => {
  const out = limitHashtags("Texto\n\n#a #b #c #d #e #f #g");
  assert.equal((out.match(/#/g) || []).length, 5);
  assert.ok(out.includes("#e") && !out.includes("#f"));
  assert.equal(limitHashtags("Ligue 21# agora #a"), "Ligue 21# agora #a");
});

test("tira travessão e caracteres invisíveis", () => {
  assert.equal(polishCaption("Seu post​ — pronto em minutos"), "Seu post, pronto em minutos");
  assert.equal(polishCaption("— Começo\nlinha"), "Começo\nlinha");
});

test("primeira linha com até 125 caracteres quebra no fim da frase", () => {
  const first = "Seu Instagram pode trabalhar por você. " + "Enquanto você cuida do negócio, os agentes preparam posts, respondem e mostram números todo dia sem parar.";
  const out = shortenFirstLine(first + "\nCTA");
  const lines = out.split("\n");
  assert.equal(lines[0], "Seu Instagram pode trabalhar por você.");
  assert.equal(lines[1], "");
  assert.ok(lines[0].length <= 125);
  assert.equal(shortenFirstLine("Curta.\nOutra"), "Curta.\nOutra");
});

test("legenda normal fica igual", () => {
  const c = "Pare de postar sem plano.\n\nA Flow Arts organiza o mês.\n\nComente QUERO\n\n#FlowArts #MarketingDigital";
  assert.equal(polishCaption(c), c);
});
