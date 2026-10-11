import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../public/portal.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../public/client-lite.css", import.meta.url), "utf8");

test("painel do cliente tem os 5 menus combinados e nenhuma ferramenta de vídeo", () => {
  for (const tab of ["inicio", "posts", "numeros", "contatos", "conta"]) assert.match(html, new RegExp(`data-tab="${tab}"`));
  assert.doesNotMatch(html, /trailer|Criar vídeo|Minha logo|Enviar do PC|YouTube/i);
  assert.doesNotMatch(js, /trailer|youtube|\/api\/portal\/videos/i);
});

test("cliente aprova ou pede ajuste usando as rotas protegidas", () => {
  assert.match(js, /\/api\/portal\/posts\/" \+ encodeURIComponent\(id\) \+ "\/decision"/);
  assert.match(js, /\/api\/portal\/posts\/" \+ encodeURIComponent\(id\) \+ "\/revision"/);
  assert.match(js, /\/api\/portal\/insights/);
  assert.match(js, /\/api\/portal\/leads/);
});

test("deploy continua achando a versão do script e o login seguro do Windows", () => {
  assert.match(html, /client-lite\.js\?v=\d+/);
  assert.match(js, /nexusWindowsCredentials/);
});

test("pensado para celular: menu fixo embaixo e lateral no computador", () => {
  assert.match(html, /name="viewport"/);
  assert.match(css, /\.tabbar \{[\s\S]*position: fixed/);
  assert.match(css, /@media \(min-width: 900px\)/);
});

test("textos vindos do servidor são escapados", () => {
  assert.match(js, /function escapeHtml/);
  assert.match(js, /function safeUrl/);
});
