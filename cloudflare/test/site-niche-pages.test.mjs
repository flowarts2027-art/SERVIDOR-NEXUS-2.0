import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const pages = ["marketing-para-cafeteria", "marketing-para-salao-de-beleza", "marketing-para-lanchonete", ...["barbearia", "pet-shop", "restaurante", "academia", "loja-de-roupas", "padaria", "confeitaria", "oficina-mecanica", "floricultura"].map(n => "marketing-para-" + n)];

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
  assert.match(home, /Instagram no Automático · Básico[\s\S]{0,80}R\$ 197 <small>por mês, sem entrada/);
  assert.match(home, /R\$ 147 por mês nos 3 primeiros meses/);
  assert.doesNotMatch(home, /aviso de 30 dias/);
  assert.match(home, /Instagram no Automático · com Vídeo[\s\S]{0,80}R\$ 697[\s\S]{0,40}R\$ 297 de entrada/);
  assert.match(home, /1º ano incluso: domínio \.com\.br/);
  assert.match(home, /R\$ 297 por ano \(ou R\$ 29 por mês\), já com a renovação do domínio/);
  assert.doesNotMatch(home, /Domínio \.com\.br por sua conta/);
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  const prompt = knowledgePrompt("primeiro-teste");
  assert.match(prompt, /Básico[\s\S]{0,400}R\$ 197 por mês, sem taxa de entrada/);
  assert.doesNotMatch(prompt, /aviso de 30 dias/);
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

test("site: Reel de exemplo no lugar do antes/depois e perfil de exemplo com logo de cafeteria", () => {
  const home = fs.readFileSync(new URL("../../public/site.html", import.meta.url), "utf8");
  assert.doesNotMatch(home, /class="phone phone-small is-before"|class="grid grid-empty"/);
  assert.match(home, /<video id="reel-demo" src="\/video\/reel-cafeteria\.mp4" poster="\/video\/reel-cafeteria\.jpg" muted loop playsinline controls preload="none"/);
  assert.match(home, /Demonstração para cafeteria, criada com IA/);
  assert.match(home, /src="\/brand\/cafe-brisa\.svg"[\s\S]{0,120}cafe\.brisa/);
  assert.ok(fs.statSync(new URL("../../public/video/reel-cafeteria.mp4", import.meta.url)).size < 3_000_000);
});

test("páginas de nicho novas têm texto próprio (sem páginas duplicadas) e não prometem resultado", () => {
  const seen = new Set();
  for (const slug of pages) {
    const html = read(slug + ".html");
    const h1 = html.match(/<h1>([^<]+)<\/h1>/)[1];
    assert.ok(!seen.has(h1), "h1 repetido: " + slug);
    seen.add(h1);
    assert.doesNotMatch(html, /garant|resultado garantido|seguidores em \d+ dias/i);
  }
  assert.equal(seen.size, pages.length);
});
