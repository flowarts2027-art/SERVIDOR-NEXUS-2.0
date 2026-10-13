import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const pages = ["marketing-para-cafeteria", "marketing-para-salao-de-beleza", "marketing-para-lanchonete"];

test("páginas de nicho existem, estão no sitemap e no rodapé do site", () => {
  const sitemap = read("sitemap.xml");
  const site = read("site.html");
  for (const slug of pages) {
    const html = read(slug + ".html");
    assert.match(html, new RegExp('<link rel="canonical" href="https://flowarts.com.br/' + slug + '">'));
    assert.match(html, /<title>[^<]*Flow Arts Marketing<\/title>/);
    assert.match(html, /"@type": "FAQPage"/);
    assert.ok(sitemap.includes("https://flowarts.com.br/" + slug + "<"), slug + " fora do sitemap");
    assert.ok(site.includes('href="/' + slug + '"'), slug + " fora do rodapé");
  }
});

test("páginas de nicho usam os mesmos preços da página principal e não citam clientes antigos", () => {
  const site = read("site.html");
  for (const slug of pages) {
    const html = read(slug + ".html");
    assert.match(html, /R\$ 197, pagamento único/);
    assert.match(site, /R\$ 197 <small>pagamento único<\/small>/);
    assert.doesNotMatch(html, /R\$ 697/);
    assert.doesNotMatch(html, /global ?play|ragnar/i);
  }
});
