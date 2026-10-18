import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cleanCity } from "../src/prospects.js";

test("cidade escrita no Caçador do Master: aceita 'Cidade UF' e recusa vazio ou só números", () => {
  assert.equal(cleanCity("  Niterói   RJ "), "Niterói RJ");
  assert.equal(cleanCity("12"), "");
  assert.equal(cleanCity(""), "");
});

test("tela do Master tem o campo de cidade e manda junto na busca", () => {
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  const ui = fs.readFileSync(new URL("../../public/prospects-ui.js", import.meta.url), "utf8");
  assert.match(html, /id="prospect-city"/);
  assert.match(ui, /JSON\.stringify\(\{ calls: 3, niche, city \}\)/);
});

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { runProspectSearch } from "../src/prospects.js";

test("busca do Master com cidade escrita usa a cidade e o tipo escolhidos", async () => {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; }, exec: async q => db.exec(q) };
  const bodies = [];
  const fetcher = async (url, opts) => { bodies.push(decodeURIComponent(String(opts?.body || url))); return new Response(JSON.stringify({ elements: [
    { type: "node", id: 1, tags: { name: "Pet Feliz", shop: "pet", phone: "+55 21 99999-1234" } }
  ] }), { status: 200 }); };
  const result = await runProspectSearch({ DB }, { calls: 3, niche: "pet", city: "Niterói RJ" }, fetcher);
  assert.equal(result.searched.length, 1);
  assert.match(result.searched[0], /em Niterói RJ$/);
  assert.ok(bodies.some(b => /Niter/.test(b)));
  const bad = await runProspectSearch({ DB }, { niche: "pet", city: "1" }, fetcher);
  assert.equal(bad.error, "city_invalid");
});
