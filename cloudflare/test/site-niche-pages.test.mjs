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

test("site mostra os 2 planos e o site com 1º ano e renovação com domínio; robô e contrato iguais", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  const home = read("site.html");
  assert.match(home, /Instagram no Automático · Básico[\s\S]{0,80}R\$ 397[\s\S]{0,40}R\$ 197 de entrada/);
  assert.match(home, /Instagram no Automático · com Vídeo[\s\S]{0,80}R\$ 697[\s\S]{0,40}R\$ 297 de entrada/);
  assert.match(home, /1º ano incluso: domínio \.com\.br/);
  assert.match(home, /R\$ 297 por ano \(ou R\$ 29 por mês\), já com a renovação do domínio/);
  assert.doesNotMatch(home, /Domínio \.com\.br por sua conta/);
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  const prompt = knowledgePrompt("primeiro-teste");
  assert.match(prompt, /Básico[\s\S]{0,120}R\$ 197 de entrada \+ R\$ 397 por mês/);
  assert.match(prompt, /já com a renovação do domínio/);
  assert.match(read("contrato-site.html"), /renovação do domínio, a CONTRATANTE paga R\$ 29,00 por mês ou R\$ 297,00 por ano/);
});

test("site tem vídeo de fundo leve, sem som, e para com menos movimento", () => {
  const home = fs.readFileSync(new URL("../../public/site.html", import.meta.url), "utf8");
  assert.match(home, /class="bg-video" aria-hidden="true"><video id="bg-video" autoplay muted loop playsinline/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  const size = fs.statSync(new URL("../../public/video/fundo-cafe.mp4", import.meta.url)).size;
  assert.ok(size > 10000 && size < 1_000_000, "vídeo leve: " + size);
});
