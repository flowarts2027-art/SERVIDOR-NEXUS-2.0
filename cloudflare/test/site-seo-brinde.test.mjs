// SEO do brinde (Rodrigo, 26/11/2026): "legendas para instagram" é a busca mais forte do assunto no
// Google Trends; a página /brinde fica aberta ao Google, no sitemap, com a palavra no título e no H1.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

test("robots.txt não bloqueia /brinde, mas continua bloqueando os downloads", () => {
  const robots = read("robots.txt");
  assert.doesNotMatch(robots, /Disallow: \/brinde\s/);
  assert.match(robots, /Disallow: \/downloads\//);
});

test("/brinde está no sitemap", () => {
  assert.match(read("sitemap.xml"), /<loc>https:\/\/flowarts\.com\.br\/brinde<\/loc>/);
});

test("/brinde tem a palavra-chave no título e no H1, e dados estruturados válidos", () => {
  const html = read("brinde.html");
  assert.match(html, /<title>Legendas para Instagram[^<]*<\/title>/);
  assert.match(html, /<h1>Legendas para <em>Instagram<\/em>/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(ld);
  assert.equal(JSON.parse(ld[1])["@id"], "https://flowarts.com.br/brinde");
});
