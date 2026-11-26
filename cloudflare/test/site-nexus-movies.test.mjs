// Página do Nexus Movies no site da Flow Arts (Rodrigo, 26/11/2026).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

test("/nexus-movies: indexável, com H1, JSON-LD válido e botão do teste grátis", () => {
  const html = read("nexus-movies.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/flowarts\.com\.br\/nexus-movies">/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(ld["@graph"].some(n => n["@type"] === "SoftwareApplication" && n.name === "Nexus Movies"));
  assert.match(html, /href="https:\/\/nexusmovies\.pages\.dev\/"/);
  assert.doesNotMatch(html.slice(html.indexOf("<main>"), html.indexOf("<footer>")), /Postador|R\$ 97/);
});

test("Nexus Movies no sitemap, no wrangler e no rodapé de todas as páginas", () => {
  assert.match(read("sitemap.xml"), /<loc>https:\/\/flowarts\.com\.br\/nexus-movies<\/loc>/);
  assert.match(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"), /"\/nexus-movies\*"/);
  for (const f of ["site.html", "postagem-automatica-instagram.html", "resposta-automatica-instagram.html", "criacao-de-site.html", "nexus-movies.html"]) {
    const html = read(f);
    assert.ok(html.slice(html.indexOf("<footer")).includes('href="/nexus-movies"'), f);
  }
});
