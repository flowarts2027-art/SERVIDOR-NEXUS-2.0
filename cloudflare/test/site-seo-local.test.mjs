import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const slugs = ["postagem-automatica-instagram", "resposta-automatica-instagram", "criacao-de-site-nova-friburgo"];
const ldOf = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test("home cita Nova Friburgo, Região Serrana e Brasil na descrição, no topo e no rodapé", () => {
  const home = read("site.html");
  assert.match(home, /<meta name="description" content="[^"]*Nova Friburgo, a Região Serrana do Rio e todo o Brasil online/);
  const body = home.slice(home.indexOf("<body>"));
  assert.ok(body.indexOf("Nova Friburgo") < body.indexOf('id="como-funciona"'), "frase perto do topo");
  const footer = home.slice(home.indexOf("<footer>"), home.indexOf("</footer>"));
  assert.match(footer, /Nova Friburgo, a Região Serrana do Rio de Janeiro e todo o Brasil/);
  for (const s of slugs) assert.ok(footer.includes('href="/' + s + '"'), s + " fora do rodapé");
});

test("JSON-LD da home: ProfessionalService com área, Instagram e preços; FAQPage igual às perguntas visíveis", () => {
  const home = read("site.html");
  const graph = ldOf(home)["@graph"];
  const svc = graph.find(n => n["@type"] === "ProfessionalService");
  assert.deepEqual(svc.areaServed.map(a => a.name), ["Nova Friburgo", "Região Serrana do Rio de Janeiro", "Brasil"]);
  assert.ok(svc.sameAs.includes("https://www.instagram.com/flowarts2026/"));
  assert.deepEqual(svc.makesOffer.map(o => o.price), ["97", "39.99", "297", "497", "67"]);
  const faq = graph.find(n => n["@type"] === "FAQPage").mainEntity;
  const visible = [...home.matchAll(/<details[^>]*><summary>([^<]*)<\/summary><p>([^<]*)<\/p><\/details>/g)].map(m => [m[1], m[2]]);
  assert.equal(faq.length, visible.length);
  for (const [q, a] of visible) {
    const hit = faq.find(f => f.name === q);
    assert.ok(hit, "pergunta fora do JSON-LD: " + q);
    assert.equal(hit.acceptedAnswer.text, a);
  }
});

test("três páginas novas: indexáveis, com título, descrição, H1, 550+ palavras, WhatsApp e volta aos pacotes", () => {
  for (const s of slugs) {
    const html = read(s + ".html");
    assert.match(html, new RegExp('<link rel="canonical" href="https://flowarts.com.br/' + s + '">'));
    assert.match(html, /<meta name="robots" content="index,follow/);
    assert.match(html, /<title>[^<]{20,}Flow Arts Marketing<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{80,}"/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /Nova Friburgo/);
    const msg = s === "criacao-de-site-nova-friburgo" ? "Ol%C3%A1!%20Quero%20um%20site%20para%20o%20meu%20neg%C3%B3cio." : "Ol%C3%A1!%20Quero%20meu%20Instagram%20no%20autom%C3%A1tico.";
    assert.ok(html.includes("https://wa.me/5521964816185?text=" + msg));
    assert.ok(html.includes('href="/#pacotes"'));
    assert.doesNotMatch(html, /Reels|depoimento|global ?play|ragnar/i);
    const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>")).replace(/<[^>]+>/g, " ");
    const words = main.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 550 && words <= 1000, s + " tem " + words + " palavras");
    ldOf(html);
  }
});

test("preços das páginas novas iguais aos da home", () => {
  assert.match(read("postagem-automatica-instagram.html"), /R\$ 97 <small>por mês/);
  assert.match(read("resposta-automatica-instagram.html"), /R\$ 39,99 <small>por mês/);
  const site = read("criacao-de-site-nova-friburgo.html");
  assert.match(site, /R\$ 497/);
  assert.match(site, /R\$ 297 por ano \(ou R\$ 29 por mês\), já com a renovação do domínio/);
});

test("sitemap lista as três páginas com data de hoje e o Worker serve as rotas; nicho segue fora", () => {
  const sitemap = read("sitemap.xml");
  for (const s of slugs) assert.match(sitemap, new RegExp("<loc>https://flowarts.com.br/" + s + "</loc><lastmod>2026-11-13</lastmod>"));
  assert.ok(!/marketing-para-/.test(sitemap));
  const cfg = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  for (const s of slugs) assert.ok(cfg.includes(JSON.stringify("/" + s + "*")), s + " fora do run_worker_first");
});
