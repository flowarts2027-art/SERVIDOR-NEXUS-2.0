import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

test("painel do cliente no celular: 5 botões + Mais, e vira app na tela inicial", () => {
  const html = read("portal.html");
  assert.match(html, /id="more-btn"/);
  assert.match(html, /id="more-sheet"/);
  for (const tab of ["numeros", "contatos", "negocio", "conta"]) assert.match(html, new RegExp(`data-tab="${tab}" class="more-tab"`));
  assert.match(html, /rel="manifest" href="\/portal\.webmanifest"/);
  const manifest = JSON.parse(read("portal.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/portal");
  const css = read("client-lite.css");
  assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.login input\[name\] \{ width: 100%;/);
});

test("Master no celular: 4 telas + Mais, tabelas em cartões, vira app", () => {
  const html = read("index.html");
  assert.match(html, /id="master-more-btn"/);
  assert.match(html, /rel="manifest" href="\/master\.webmanifest"/);
  assert.equal(JSON.parse(read("master.webmanifest")).start_url, "/api/master/console");
  assert.match(read("styles.css"), /\.table-wrap thead\{display:none\}/);
  assert.match(read("app.js"), /function toggleMasterMore/);
  for (const icon of ["brand/app-cliente-192.png", "brand/app-cliente-512.png", "assets/app-master-192.png", "assets/app-master-512.png"]) {
    assert.ok(fs.statSync(new URL("../../public/" + icon, import.meta.url)).size > 1000, icon);
  }
});

test("Master em preto e branco: sem verde no estilo; vermelho de erro mantido", () => {
  const css = read("styles.css");
  assert.doesNotMatch(css, /#22c55e|#24e27a|#7bf3a5|#31e676/i);
  assert.match(css, /--green:#fff/);
  assert.match(css, /--silver:linear-gradient/);
  assert.match(css, /--danger:#ff5d67/);
});
