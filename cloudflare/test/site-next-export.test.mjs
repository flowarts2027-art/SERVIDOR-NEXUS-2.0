import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Site novo (14/11/2026): site.html, privacidade.html e termos.html são gerados pelo projeto
// Next "SITE-FLOWARTS-NOVO" (exportação estática) e carregam JS, CSS e fontes de public/_next/.
const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const exists = rel => fs.existsSync(new URL("../../public" + rel, import.meta.url));

test("site novo: todo arquivo /_next que as páginas usam existe em public/_next", () => {
  for (const page of ["site.html", "privacidade.html", "termos.html"]) {
    const html = read(page);
    const refs = [...new Set(html.match(/\/_next\/static\/[A-Za-z0-9._\-/]+\.(?:js|css|woff2)/g) || [])];
    assert.ok(refs.length > 0, page + " sem arquivos do /_next");
    for (const ref of refs) assert.ok(exists(ref), page + " usa " + ref + ", que não está em public/_next");
    for (const css of refs.filter(r => r.endsWith(".css"))) {
      const fonts = read(css.slice(1)).match(/\.\.\/media\/[A-Za-z0-9._\-]+\.woff2/g) || [];
      for (const font of fonts) assert.ok(exists("/_next/static/media/" + font.split("/").pop()), css + " usa a fonte " + font);
    }
  }
});

test("site novo: só a home e as páginas legais vieram do Next; painel Master e demais páginas seguem como antes", () => {
  const master = read("index.html");
  assert.match(master, /data-view="site"/, "public/index.html continua sendo o painel Master");
  assert.doesNotMatch(master, /\/_next\//, "o painel Master não usa arquivos do site novo");
  for (const page of ["portal.html", "cadastro.html", "exemplo.html", "marketing-para-cafeteria.html"]) {
    assert.doesNotMatch(read(page), /\/_next\//, page + " não deveria usar arquivos do site novo");
  }
});

test("site novo: botões de contratar vão para o cadastro; nada de Attio, vídeo ou Captador", () => {
  const home = read("site.html");
  for (const plano of ["postador", "resposta", "site", "logo"]) {
    assert.ok(home.includes('href="/cadastro?plano=' + plano + '"'), "falta /cadastro?plano=" + plano);
  }
  assert.ok(home.includes("https://wa.me/5521964816185?text="), "botões de WhatsApp continuam");
  assert.doesNotMatch(home, /attio/i);
  assert.doesNotMatch(home, /<video|\.mp4|\.webm/i);
  assert.doesNotMatch(home, /De onde vêm os contatos/);
  assert.match(home, /<meta name="facebook-domain-verification" content="4y5qf57yga91suujq5cx6xody4zinn">/);
});

test("privacidade nova mantém as âncoras usadas por links externos", () => {
  const page = read("privacidade.html");
  assert.match(page, /id="exclusao-de-dados"/);
  assert.match(page, /id="empresas-em-mapas"/);
  assert.match(page, /NEXUS IA CENTRAL/);
});
