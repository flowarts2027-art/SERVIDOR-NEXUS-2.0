import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  phoneInfo, siteInfo, prospectScore, placeToProspect, firstMessage, whatsappLink,
  runProspectSearch, listProspects, setProspectStatus, savePlacesKey, DAILY_SEARCH_LIMIT
} from "../src/prospects.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT,
    PRIMARY KEY(namespace,item_key,client_id))`);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB, NEXUS_SECRET_KEY: "teste-local", GOOGLE_PLACES_API_KEY: "AIzaTESTE_chave_de_teste_1234567890ab" } };
}

const place = (over = {}) => ({
  id: "p1", displayName: { text: "Café da Praça" }, formattedAddress: "Rua A, 10, Recife - PE",
  nationalPhoneNumber: "(81) 98888-7777", rating: 4.7, userRatingCount: 320, photos: [{}, {}],
  googleMapsUri: "https://maps.google.com/?cid=1", businessStatus: "OPERATIONAL", ...over
});

test("telefone, site e nota", () => {
  assert.deepEqual(phoneInfo("(81) 98888-7777"), { phone: "81988887777", mobile: true });
  assert.deepEqual(phoneInfo("(81) 3333-4444"), { phone: "8133334444", mobile: false });
  assert.equal(phoneInfo("123").phone, "");
  assert.equal(siteInfo("https://www.instagram.com/cafedapraca/").instagram, "cafedapraca");
  assert.equal(siteInfo("https://linktr.ee/x").hasOwnSite, false);
  assert.equal(siteInfo("https://cafedapraca.com.br").hasOwnSite, true);
  assert.equal(prospectScore({ reviews: 320, rating: 4.7, photos: 2, mobile: true }), 10);
  assert.ok(prospectScore({ reviews: 3, rating: 3.5, photos: 10, mobile: false }) <= 4);
});

test("empresa com site próprio, fechada ou sem telefone fica de fora", () => {
  assert.equal(placeToProspect(place({ websiteUri: "https://cafe.com.br" }), "cafeteria", "Recife PE"), null);
  assert.equal(placeToProspect(place({ businessStatus: "CLOSED_PERMANENTLY" }), "cafeteria", "Recife PE"), null);
  assert.equal(placeToProspect(place({ nationalPhoneNumber: "" }), "cafeteria", "Recife PE"), null);
  const ok = placeToProspect(place({ websiteUri: "https://instagram.com/cafedapraca" }), "cafeteria", "Recife PE");
  assert.equal(ok.instagram, "cafedapraca");
});

test("mensagem pronta: honesta, com link do nicho e opção de não receber", () => {
  const p = placeToProspect(place(), "cafeteria", "Recife PE");
  const text = firstMessage(p);
  assert.match(text, /Rodrigo, da Flow Arts/);
  assert.match(text, /320 avaliações e nota 4,7/);
  assert.match(text, /flowarts\.com\.br\/marketing-para-cafeteria/);
  assert.match(text, /não receber mensagens/);
  assert.doesNotMatch(text, /R\$/);
  assert.match(whatsappLink(p), /^https:\/\/wa\.me\/5581988887777\?text=/);
});

test("busca guarda só empresas sem site, não repete e respeita o limite do dia", async () => {
  const { db, env } = fakeEnv();
  let calls = 0;
  const fetcher = async (url, init) => {
    calls++;
    assert.equal(url, "https://places.googleapis.com/v1/places:searchText");
    assert.match(init.headers["X-Goog-FieldMask"], /websiteUri/);
    return new Response(JSON.stringify({ places: [place(), place({ id: "p2", websiteUri: "https://site.com.br" })] }), { status: 200 });
  };
  const first = await runProspectSearch(env, { calls: 2 }, fetcher);
  assert.equal(first.ok, true);
  assert.equal(first.added, 1);
  assert.equal(calls, 2);
  const again = await runProspectSearch(env, { calls: 1 }, fetcher);
  assert.equal(again.added, 0);

  await setProspectStatus(env, "p1", "nao-quer");
  const third = await runProspectSearch(env, { calls: 1 }, fetcher);
  assert.equal(third.added, 0, "quem não quer não volta para a lista");
  assert.equal(db.prepare("SELECT status FROM prospects WHERE id='p1'").get().status, "nao-quer");

  db.prepare("UPDATE nexus_state SET value_json=? WHERE namespace='prospects' AND item_key='usage'")
    .run(JSON.stringify({ day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()), count: DAILY_SEARCH_LIMIT }));
  const blocked = await runProspectSearch(env, { calls: 3 }, fetcher);
  assert.equal(blocked.error, "daily_limit");
});

test("lista por etapa e chave salva com criptografia", async () => {
  const { db, env } = fakeEnv();
  await runProspectSearch(env, { calls: 1 }, async () => new Response(JSON.stringify({ places: [place()] })));
  const list = await listProspects(env, { status: "novo" });
  assert.equal(list.items.length, 1);
  assert.equal(list.counts.novo, 1);
  assert.match(list.items[0].whatsapp, /wa\.me/);
  await setProspectStatus(env, "p1", "enviado");
  assert.equal((await listProspects(env, { status: "enviado" })).items.length, 1);
  await assert.rejects(setProspectStatus(env, "p1", "apagar"), /status_invalid/);

  await savePlacesKey(env, "AIzaSyD_chave_do_rodrigo_000000000000");
  const stored = db.prepare("SELECT value_json FROM nexus_state WHERE item_key='google-key'").get().value_json;
  assert.doesNotMatch(stored, /chave_do_rodrigo/);
  await assert.rejects(savePlacesKey(env, "curta"), /google_key_invalid/);
});

test("painel tem o caçador e a rota exige login do Master", () => {
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="prospect-panel"/);
  assert.match(html, /prospects-ui\.js/);
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/master\/prospects[\s\S]{0,200}resolveMasterSession/);
});

test("pacote de site aparece no site, nas páginas de nicho e no robô com o mesmo preço", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  for (const page of ["site.html", "marketing-para-cafeteria.html", "marketing-para-salao-de-beleza.html", "marketing-para-lanchonete.html"]) {
    assert.match(read(page), /Site do seu negócio[\s\S]{0,120}R\$ 497/, page);
  }
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  assert.match(knowledgePrompt("primeiro-teste"), /Site do seu negócio: R\$ 497/);
});
