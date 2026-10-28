import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const pages = ["marketing-para-cafeteria", "marketing-para-salao-de-beleza", "marketing-para-lanchonete", ...["barbearia", "pet-shop", "restaurante", "academia", "loja-de-roupas", "padaria", "confeitaria", "oficina-mecanica", "floricultura"].map(n => "marketing-para-" + n)];

test("páginas de nicho existem e estão no sitemap (saíram do rodapé com o site para vendedores, 23/10)", () => {
  const sitemap = read("sitemap.xml");
  const site = read("site.html");
  for (const slug of pages) {
    const html = read(slug + ".html");
    assert.match(html, new RegExp('<link rel="canonical" href="https://flowarts.com.br/' + slug + '">'));
    assert.match(html, /<title>[^<]*Flow Arts Marketing<\/title>/);
    assert.match(html, /"@type": "FAQPage"/);
    assert.ok(sitemap.includes("https://flowarts.com.br/" + slug + "<"), slug + " fora do sitemap");
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
  assert.match(home, /Essencial <small>· Instagram no Automático<\/small>[\s\S]{0,80}R\$ 197 <small>por mês, sem entrada/);
  assert.match(home, /R\$ 147 por mês nos 3 primeiros meses/);
  assert.doesNotMatch(home, /aviso de 30 dias/);
  assert.match(home, /Completo <small>[\s\S]{0,80}R\$ 697 <small>por mês, sem entrada/);
  assert.doesNotMatch(home, /R\$ 297 de entrada|Entrada de R\$ 297/);
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

test("site novo (28/10): tema clean, globo 3D e movimento que para com 'reduzir movimento'", () => {
  const home = fs.readFileSync(new URL("../../public/site.html", import.meta.url), "utf8");
  assert.match(home, /Novos clientes todo dia no seu <em>WhatsApp\.<\/em>/);
  assert.match(home, /id="globe"/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /class="bg-video" aria-hidden="true"><video id="bg-video" autoplay muted loop playsinline/, "vídeo de fundo como marca d'água");
  assert.equal((home.match(/<video/g) || []).length, 1, "só o vídeo de fundo do início");
  const size = fs.statSync(new URL("../../public/video/fundo-vendedor.mp4", import.meta.url)).size;
  assert.ok(size > 10000 && size < 2_000_000, "vídeo leve: " + size);
  assert.doesNotMatch(home, /reel-cafeteria|fundo-cafe|cafe-brisa\.svg/);
});

test("páginas antigas ficam ligadas numa aba discreta do rodapé (para o Google e o cliente acharem o site)", () => {
  const home = read("site.html");
  const segs = home.slice(home.indexOf('class="segs"'));
  assert.match(segs, /<summary>Outros segmentos que atendemos<\/summary>/);
  for (const slug of [...pages, "exemplo"]) assert.ok(segs.includes('href="/' + slug + '"'), slug + " fora da aba");
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
