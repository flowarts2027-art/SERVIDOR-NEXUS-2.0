import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const pages = ["marketing-para-cafeteria", "marketing-para-salao-de-beleza", "marketing-para-lanchonete", ...["barbearia", "pet-shop", "restaurante", "academia", "loja-de-roupas", "padaria", "confeitaria", "oficina-mecanica", "floricultura"].map(n => "marketing-para-" + n)];

test("páginas de nicho continuam abrindo (link do Captador), mas fora do Google e do sitemap (02/11)", () => {
  const sitemap = read("sitemap.xml");
  const site = read("site.html");
  for (const slug of pages) {
    const html = read(slug + ".html");
    assert.match(html, new RegExp('<link rel="canonical" href="https://flowarts.com.br/' + slug + '">'));
    assert.match(html, /<title>[^<]*Flow Arts Marketing<\/title>/);
    assert.match(html, /"@type": "FAQPage"/);
    assert.match(html, /<meta name="robots" content="noindex,follow">/, slug + " sem noindex");
    assert.ok(!sitemap.includes("https://flowarts.com.br/" + slug + "<"), slug + " ainda no sitemap");
  }
});

test("páginas de nicho usam os mesmos preços da página principal e não citam clientes antigos", () => {
  const site = read("site.html");
  for (const slug of pages) {
    const html = read(slug + ".html");
    assert.match(html, /R\$ 97 por mês/);
    assert.match(site, /R\$ 97 <small>por mês/);
    assert.doesNotMatch(html, /Captador de clientes<\/h3>|5 Reels com IA/);
    assert.doesNotMatch(html, /R\$ 697/);
    assert.doesNotMatch(html, /global ?play|ragnar/i);
  }
});

test("site mostra os 2 planos e o site com 1º ano e renovação com domínio; robô e contrato iguais", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  const home = read("site.html");
  assert.match(home, /Postador Automático<\/h3>[\s\S]{0,60}R\$ 97 <small>por mês/);
  assert.match(home, /Resposta Automática<\/h3>[\s\S]{0,60}R\$ 39,90 <small>por mês/);
  assert.match(home, /Tráfego Pago<\/h3>[\s\S]{0,60}R\$ 297 <small>por mês/);
  assert.doesNotMatch(home, /plano=(essencial|completo|captador|reels5|posts10|responde)/);
  assert.match(home, /1º ano incluso: domínio \.com\.br/);
  assert.match(home, /R\$ 297 por ano \(ou R\$ 29 por mês\), já com a renovação do domínio/);
  assert.doesNotMatch(home, /Domínio \.com\.br por sua conta/);
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  const prompt = knowledgePrompt("primeiro-teste");
  assert.match(prompt, /Postador Automático[\s\S]{0,200}R\$ 97 por mês/);
  assert.doesNotMatch(prompt, /aviso de 30 dias/);
  assert.match(prompt, /já com a renovação do domínio/);
  assert.match(read("contrato-site.html"), /renovação do domínio, a CONTRATANTE paga R\$ 29,00 por mês ou R\$ 297,00 por ano/);
});

test("site (02/11): topo do Postador, sem Captador, e movimento que para com 'reduzir movimento'", () => {
  const home = fs.readFileSync(new URL("../../public/site.html", import.meta.url), "utf8");
  assert.match(home, /Seu Instagram postando sozinho, <em>todo dia\.<\/em>/);
  assert.match(home, /Agenda do seu Instagram/);
  assert.doesNotMatch(home, /id="oportunidades"|Classificados de empresas|Novos clientes todo dia/);
  assert.doesNotMatch(home.replace(/\/\*[^*]*\*\//g, ""), /Captador/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /class="bg-video" aria-hidden="true"><video id="bg-video" autoplay muted loop playsinline/, "vídeo de fundo como marca d'água");
  assert.equal((home.match(/<video/g) || []).length, 1, "só o vídeo de fundo do início");
  const size = fs.statSync(new URL("../../public/video/fundo-vendedor.mp4", import.meta.url)).size;
  assert.ok(size > 10000 && size < 2_000_000, "vídeo leve: " + size);
  assert.doesNotMatch(home, /reel-cafeteria|fundo-cafe|cafe-brisa\.svg/);
});

test("rodapé do site para vendedores não liga mais as páginas antigas de nicho (02/11)", () => {
  const home = read("site.html");
  assert.doesNotMatch(home, /Outros segmentos que atendemos|class="segs"/);
  for (const slug of pages) assert.ok(!home.includes('href="/' + slug + '"'), slug + " ainda no rodapé");
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

test("home: título e descrição falam do Postador (02/11)", () => {
  const home = read("site.html");
  const title = home.match(/<title>([^<]*)<\/title>/)[1];
  assert.match(title, /Instagram no automático/);
  assert.match(title, /Flow Arts Marketing/);
  assert.ok(title.length <= 75, "título longo: " + title.length);
  const desc = home.match(/<meta name="description" content="([^"]*)">/)[1];
  assert.match(desc, /R\$ 97 por mês/);
  assert.ok(desc.length <= 160, "descrição longa: " + desc.length);
  assert.match(home, /"name": "Flow Arts Marketing"/);
});
