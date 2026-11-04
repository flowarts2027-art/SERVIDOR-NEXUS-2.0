import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { PLANS, priceLine } from "../src/plans.js";

// Comparativo de planos no painel do cliente (03/11/2026).
const js = readFileSync(new URL("../../public/planos.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../public/client-lite.css", import.meta.url), "utf8");

function renderCompare(plans) {
  const start = js.indexOf("  const FLOW_WHATS");
  const end = js.indexOf("  function render() {");
  const box = { data: { plans } };
  const esc = 'const esc = value => String(value ?? "").replace(/[&<>"\']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" }[ch]));';
  vm.runInNewContext(esc + "\n" + js.slice(start, end) + "\nthis.out = compareHtml();", box);
  return box.out;
}

const plans = PLANS.map(p => ({ id: p.id, name: p.name, priceLine: priceLine(p), current: p.id === "postador" }));

test("tabela mostra os 3 planos com os preços do catálogo e cores diferentes", () => {
  const html = renderCompare(plans);
  for (const id of ["resposta", "postador", "combo"]) {
    const p = plans.find(x => x.id === id);
    assert.ok(html.includes(p.priceLine), p.priceLine);
  }
  assert.match(html, /R\$ 119,99/);
  assert.match(html, /R\$ 39,99/);
  assert.match(html, /R\$ 97 por mês/);
  assert.match(html, /Economize R\$ 17,00\/mês/);
  assert.match(html, /c-resp[\s\S]*c-post[\s\S]*c-combo/);
  assert.match(css, /thead \.c-resp \{ background/);
  assert.match(css, /thead \.c-combo \{ background/);
});

test("botão Solicitar abre o WhatsApp comercial com o plano escrito; plano atual mostra selo", () => {
  const html = renderCompare(plans);
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, "&"));
  assert.equal(links.length, 2); // Postador é o plano atual
  for (const link of links) assert.ok(link.startsWith("https://wa.me/5521964816185?text="));
  assert.match(decodeURIComponent(links[1].split("text=")[1]), /plano Postador \+ Resposta Automática \(R\$ 119,99/);
  assert.match(html, /Seu plano/);
});

test("comparativo entra no topo da área de planos", () => {
  assert.match(js, /\$\{pending\}\s*\$\{compareHtml\(\)\}/);
});
