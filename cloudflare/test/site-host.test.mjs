import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalSiteRedirect } from "../src/site-host.js";

const go = (href, method) => canonicalSiteRedirect(new URL(href), method);

test("http e www levam para https://flowarts.com.br, com caminho e busca", () => {
  assert.equal(go("http://flowarts.com.br/"), "https://flowarts.com.br/");
  assert.equal(go("https://www.flowarts.com.br/marketing-para-cafeteria?x=1"), "https://flowarts.com.br/marketing-para-cafeteria?x=1");
  assert.equal(go("http://WWW.flowarts.com.br/exemplo"), "https://flowarts.com.br/exemplo");
});

test("endereço principal, painel e envios não são redirecionados", () => {
  assert.equal(go("https://flowarts.com.br/"), null);
  assert.equal(go("http://painel.flowarts.com.br/login"), null);
  assert.equal(go("https://servidor-nexus.diamantehinode2015.workers.dev/"), null);
  assert.equal(go("http://www.flowarts.com.br/api/site/hit", "POST"), null);
});

test("o Worker aplica o redirecionamento antes de qualquer rota", () => {
  const src = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(src, /async fetch\(request, env, ctx\) \{\s*const url = new URL\(request\.url\);\s*const siteRedirect = canonicalSiteRedirect\(url, request\.method\);/);
});

test("sitemap tem data e não lista o /demo; páginas usam a imagem de compartilhamento 1200x630", () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  const sitemap = read("sitemap.xml");
  assert.ok(!sitemap.includes("/demo<"));
  assert.equal((sitemap.match(/<url>/g) || []).length, (sitemap.match(/<lastmod>/g) || []).length);
  assert.match(read("site.html"), /og:image" content="https:\/\/flowarts\.com\.br\/brand\/flowarts-share\.jpg"/);
  assert.ok(fs.existsSync(new URL("../../public/brand/flowarts-share.jpg", import.meta.url)));
});
