import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { handleSiteHit, siteStats, cleanPath, visitSource } from "../src/site-analytics.js";

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, DB };
}

const hit = (env, body, ua = "Mozilla/5.0 (iPhone) Safari/604.1") =>
  handleSiteHit(new Request("https://flowarts.com.br/api/site/hit", { method: "POST", headers: { "user-agent": ua }, body: JSON.stringify(body) }), env);

test("origem e caminho são limpos e não guardam nada pessoal", () => {
  assert.equal(visitSource("https://www.google.com.br/"), "google");
  assert.equal(visitSource("https://l.instagram.com/?u=x"), "instagram");
  assert.equal(visitSource("https://wa.me/55"), "whatsapp");
  assert.equal(visitSource(""), "direto");
  assert.equal(visitSource("https://flowarts.com.br/exemplo"), "interno");
  assert.equal(cleanPath("/marketing-para-cafeteria.html?utm=1"), "/marketing-para-cafeteria");
  assert.equal(cleanPath("/api/master/posts"), "");
  assert.equal(cleanPath("/<script>"), "");
});

test("conta visitas por dia, página e origem; robôs ficam de fora", async () => {
  const { db, DB } = fakeD1();
  const env = { DB };
  await hit(env, { p: "/", r: "https://www.google.com/" });
  await hit(env, { p: "/", r: "https://www.google.com/" });
  await hit(env, { p: "/marketing-para-cafeteria", r: "https://l.instagram.com/" });
  await hit(env, { p: "/", r: "" }, "Googlebot/2.1");
  const rows = db.prepare("SELECT * FROM site_visits_daily ORDER BY path").all();
  assert.equal(rows.reduce((s, r) => s + r.visits, 0), 3);
  assert.ok(!Object.keys(rows[0]).some(k => /ip|user|agent|cookie/i.test(k)));
  const stats = await siteStats(env, 30);
  assert.equal(stats.totals.today, 3);
  assert.deepEqual(stats.sources.map(s => s.source), ["google", "instagram"]);
  assert.equal(stats.pages[0].path, "/");
});

test("cliques no WhatsApp e pedidos de exemplo entram no resultado; evento desconhecido é ignorado", async () => {
  const { db, DB } = fakeD1();
  const env = { DB };
  await hit(env, { p: "/", r: "https://www.google.com/" });
  await hit(env, { p: "/", r: "" });
  await hit(env, { p: "/", r: "https://flowarts.com.br/" }); // navegação interna não é entrada
  await hit(env, { p: "/", e: "whatsapp" });
  await hit(env, { p: "/marketing-para-cafeteria", e: "whatsapp" });
  await hit(env, { p: "/", e: "qualquer" });
  db.exec("CREATE TABLE leads (id TEXT, source TEXT, created_at TEXT)");
  db.exec("INSERT INTO leads VALUES ('a','landing',strftime('%Y-%m-%d %H:%M:%S','now')), ('b','instagram',strftime('%Y-%m-%d %H:%M:%S','now'))");
  const stats = await siteStats(env, 30);
  assert.equal(stats.totals.period, 3);
  assert.equal(stats.results.entries, 2);
  assert.equal(stats.results.whatsapp, 2);
  assert.equal(stats.results.whatsappWeek, 2);
  assert.equal(stats.results.leads, 1);
  assert.equal(stats.results.rate, 150);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM site_events_daily").get().n, 2);
});

test("sem tabela de leads o resultado não quebra", async () => {
  const { DB } = fakeD1();
  const stats = await siteStats({ DB }, 30);
  assert.equal(stats.results.leads, 0);
  assert.equal(stats.results.rate, 0);
});

test("todas as páginas com contador contam cliques no WhatsApp e respeitam o ?eu=1", () => {
  const dir = new URL("../../public/", import.meta.url);
  const pages = fs.readdirSync(dir).filter(name => name.endsWith(".html") && fs.readFileSync(new URL(name, dir), "utf8").includes("/api/site/hit"));
  assert.ok(pages.length >= 14);
  for (const page of pages) {
    const html = fs.readFileSync(new URL(page, dir), "utf8");
    assert.match(html, /flowarts-nao-contar/, page);
    assert.match(html, /a\[href\*="wa\.me"\][\s\S]{0,80}e:"whatsapp"/, page);
  }
  const panel = fs.readFileSync(new URL("index.html", dir), "utf8");
  assert.match(panel, /id="site-results"/);
});

test("site, páginas de nicho e exemplo enviam o aviso de visita; Master tem a aba Site", () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  for (const page of ["site.html", "exemplo.html", "marketing-para-cafeteria.html", "marketing-para-salao-de-beleza.html", "marketing-para-lanchonete.html"]) {
    assert.match(read(page), /sendBeacon\("\/api\/site\/hit"/, page);
  }
  assert.match(read("index.html"), /data-view="site"/);
  assert.match(read("index.html"), /site-stats\.js/);
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/master\/site-stats[\s\S]{0,200}resolveMasterSession/);
});
