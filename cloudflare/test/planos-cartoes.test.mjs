import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../../public/" + file, import.meta.url), "utf8");

test("planos: cartões só no celular, tabela no computador", () => {
  const css = read("client-lite.css");
  assert.match(css, /\.cmp-cards \{ display: none; \}/);
  const mobile = css.slice(css.lastIndexOf("@media (max-width: 899px)"));
  assert.match(mobile, /\.cmp-wrap \{ display: none; \}/);
  assert.match(mobile, /\.cmp-cards \{ display: grid;/);
});

test("planos: tabela e cartões usam as mesmas peças de texto e botão", () => {
  const js = read("planos.js");
  assert.equal(js.match(/Solicitar este plano<\/a>/g).length, 1, "um só botão, usado nos dois");
  assert.equal(js.match(/Economize R\$ 17,00\/mês<\/span>/g).length, 1);
  assert.ok(js.includes("<table class=\"cmp-table\">"));
  assert.ok(js.includes("<div class=\"cmp-cards\">${cards}</div>"));
  assert.equal(js.match(/askHtml\(c\)/g).length, 2);
});
