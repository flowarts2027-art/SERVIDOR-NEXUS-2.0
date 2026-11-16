import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const slugs = ["postagem-automatica-instagram", "resposta-automatica-instagram", "criacao-de-site"];
const ldOf = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test("home diz que atende todo o Brasil na descrição, no topo e no rodapé (16/11/2026)", () => {
  const home = read("site.html");
  assert.match(home, /<meta name="description" content="[^"]*Atendemos todo o Brasil, online/);
  const body = home.slice(home.indexOf("<body>"));
  assert.ok(body.indexOf("Atendemos todo o Brasil") > -1 && body.indexOf("Atendemos todo o Brasil") < body.indexOf('id="como-funciona"'), "frase perto do topo");
  const footer = home.slice(home.indexOf("<footer>"), home.indexOf("</footer>"));
  assert.match(footer, /Atendemos todo o Brasil, online/);
  for (const s of slugs) assert.ok(footer.includes('href="/' + s + '"'), s + " fora do rodapé");
});

test("JSON-LD da home: ProfessionalService com área, Instagram e preços; FAQPage igual às perguntas visíveis", () => {
  const home = read("site.html");
  const graph = ldOf(home)["@graph"];
  const svc = graph.find(n => n["@type"] === "ProfessionalService");
  assert.deepEqual(svc.areaServed.map(a => a.name), ["Brasil"]);
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
    assert.match(html, /<title>[^<]{20,}Flow Arts(?: Marketing)?<\/title>/);
    // 16/11/2026: título até 60 e descrição até 160 caracteres, para o Google não cortar.
    assert.ok(html.match(/<title>([^<]*)<\/title>/)[1].length <= 60);
    assert.ok(html.match(/<meta name="description" content="([^"]*)"/)[1].length <= 160);
    assert.match(html, /<meta property="og:image:alt" content="[^"]+">/);
    assert.match(html, /"@type":\s*"Service"/);
    assert.doesNotMatch(html, /<img [^>]*alt=""/);
    assert.match(html, /<meta name="description" content="[^"]{80,}"/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /todo o Brasil/);
    const msg = s === "criacao-de-site" ? "Ol%C3%A1!%20Quero%20um%20site%20para%20o%20meu%20neg%C3%B3cio." : "Ol%C3%A1!%20Quero%20meu%20Instagram%20no%20autom%C3%A1tico.";
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
  const site = read("criacao-de-site.html");
  assert.match(site, /R\$ 497/);
  assert.match(site, /R\$ 297 por ano \(ou R\$ 29 por mês\), já com a renovação do domínio/);
});

test("sitemap lista as três páginas com a data da última mudança e o Worker serve as rotas; nicho segue fora", () => {
  const sitemap = read("sitemap.xml");
  for (const s of slugs) assert.match(sitemap, new RegExp("<loc>https://flowarts.com.br/" + s + "</loc><lastmod>2026-11-16</lastmod>"));
  assert.ok(!/marketing-para-/.test(sitemap));
  const cfg = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  for (const s of slugs) assert.ok(cfg.includes(JSON.stringify("/" + s + "*")), s + " fora do run_worker_first");
});

test("/exemplo (público antigo de comida) fica fora do Google e do sitemap (16/11/2026)", () => {
  assert.match(read("exemplo.html"), /<meta name="robots" content="noindex,follow">/);
  assert.doesNotMatch(read("sitemap.xml"), /flowarts\.com\.br\/exemplo</);
});

test("site sem Nova Friburgo: atende o Brasil todo; endereço antigo leva para /criacao-de-site (16/11/2026)", async () => {
  for (const f of ["site.html", "postagem-automatica-instagram.html", "resposta-automatica-instagram.html", "criacao-de-site.html", "sitemap.xml"]) {
    assert.doesNotMatch(read(f), /Friburgo|Serrana/i, f);
  }
  const { canonicalSiteRedirect } = await import("../src/site-host.js");
  assert.equal(canonicalSiteRedirect(new URL("https://flowarts.com.br/criacao-de-site-nova-friburgo")), "https://flowarts.com.br/criacao-de-site");
  assert.equal(canonicalSiteRedirect(new URL("https://www.flowarts.com.br/criacao-de-site-nova-friburgo")), "https://flowarts.com.br/criacao-de-site");
  assert.equal(canonicalSiteRedirect(new URL("https://flowarts.com.br/criacao-de-site")), null);
});
