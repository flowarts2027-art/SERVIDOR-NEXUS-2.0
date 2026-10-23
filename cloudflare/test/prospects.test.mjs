import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  phoneInfo, siteInfo, prospectScore, placeToProspect, firstMessage, whatsappLink,
  runProspectSearch, listProspects, setProspectStatus, savePlacesKey, DAILY_SEARCH_LIMIT,
  osmToProspect, overpassQuery, planBrowserSearch, importBrowserResults, saveContacted, skipProspect,
  whatsappFromUrl, pickMobile
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
  id: "ChIJ_place_0001", displayName: { text: "Café da Praça" }, formattedAddress: "Rua A, 10, Recife - PE",
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

test("só WhatsApp (23/10): fixo fica de fora; link wa.me ou celular entram", () => {
  assert.equal(placeToProspect(place({ nationalPhoneNumber: "(81) 3333-4444" }), "cafeteria", "Recife PE"), null);
  assert.equal(placeToProspect(place({ nationalPhoneNumber: "(81) 3333-4444", internationalPhoneNumber: "+55 81 3333-4444" }), "cafeteria", "Recife PE"), null);
  const viaLink = placeToProspect(place({ nationalPhoneNumber: "(81) 3333-4444", websiteUri: "https://wa.me/5581977776666" }), "cafeteria", "Recife PE");
  assert.equal(viaLink.phone, "81977776666", "número do link do WhatsApp vence o fixo");
  assert.equal(viaLink.mobile, true);
  const apiLink = placeToProspect(place({ nationalPhoneNumber: "", websiteUri: "https://api.whatsapp.com/send?phone=558133335555" }), "cafeteria", "Recife PE");
  assert.equal(apiLink.phone, "8133335555", "fixo com WhatsApp Business (link) entra");
  assert.equal(whatsappFromUrl("https://site.com.br"), "");
  assert.equal(pickMobile("(81) 3333-4444", "(81) 98888-1111"), "81988881111");
  assert.equal(pickMobile("(81) 3333-4444; (81) 97777-2222"), "81977772222");
  assert.equal(pickMobile("(81) 3333-4444"), "");
  const osmMobileTag = osmToProspect({ type: "node", id: 10, tags: { name: "Y", phone: "(81) 3333-4444", mobile: "(81) 96666-1111" } }, "cafeteria", "Recife PE");
  assert.equal(osmMobileTag.phone, "81966661111", "no mapa, acha o celular mesmo com fixo em 'phone'");
  const osmWaFixo = osmToProspect({ type: "node", id: 11, tags: { name: "Z", "contact:whatsapp": "(81) 3222-1111" } }, "cafeteria", "Recife PE");
  assert.equal(osmWaFixo.phone, "8132221111", "marcado como WhatsApp no mapa vale");
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

test("Google: a busca mostra na hora e não guarda; só quem foi chamado fica guardado", async () => {
  const { db, env } = fakeEnv();
  let calls = 0;
  const fetcher = async (url, init) => {
    calls++;
    assert.equal(url, "https://places.googleapis.com/v1/places:searchText");
    assert.match(init.headers["X-Goog-FieldMask"], /websiteUri/);
    return new Response(JSON.stringify({ places: [place(), place({ id: "ChIJ_place_0002", websiteUri: "https://site.com.br" })] }), { status: 200 });
  };
  const first = await runProspectSearch(env, { calls: 2 }, fetcher);
  assert.equal(first.ok, true);
  assert.equal(calls, 2);
  assert.equal(first.items.length, 2, "o mesmo lugar em duas buscas aparece nas duas");
  assert.equal(first.items[0].id, "ChIJ_place_0001");
  assert.match(first.items[0].whatsapp, /wa\.me/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM prospects").get().n, 0, "nada dos lugares fica guardado");

  await saveContacted(env, first.items[0]);
  const row = db.prepare("SELECT * FROM prospects").get();
  assert.equal(row.status, "enviado");
  assert.equal(row.phone, "81988887777");
  assert.equal((await runProspectSearch(env, { calls: 1 }, fetcher)).items.length, 0, "quem já foi chamado não volta");
  assert.equal((await listProspects(env, { status: "enviado" })).items.length, 1);

  await setProspectStatus(env, "ChIJ_place_0001", "novo");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM prospects").get().n, 0, "não cheguei a mandar: apaga");
  await skipProspect(env, "ChIJ_place_0001");
  assert.equal((await runProspectSearch(env, { calls: 1 }, fetcher)).items.length, 0, "não serve não volta");
  assert.equal((await listProspects(env)).counts["nao-quer"], 1);
  await assert.rejects(saveContacted(env, { id: "x", name: "A", phone: "1", niche: "cafeteria", city: "Recife PE" }), /prospect_invalid/);

  db.prepare("UPDATE nexus_state SET value_json=? WHERE namespace='prospects' AND item_key='usage'")
    .run(JSON.stringify({ day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()), count: DAILY_SEARCH_LIMIT }));
  const blocked = await runProspectSearch(env, { calls: 3 }, fetcher);
  assert.equal(blocked.error, "daily_limit");
});

test("chave do Google salva com criptografia e o painel sabe se falta", async () => {
  const { db, env } = fakeEnv();
  delete env.GOOGLE_PLACES_API_KEY;
  assert.equal((await listProspects(env)).googleKey, false);
  assert.equal((await listProspects(env)).configured, true, "o mapa grátis está sempre disponível");
  await savePlacesKey(env, "AIzaSyD_chave_do_rodrigo_000000000000");
  const stored = db.prepare("SELECT value_json FROM nexus_state WHERE item_key='google-key'").get().value_json;
  assert.doesNotMatch(stored, /chave_do_rodrigo/);
  assert.equal((await listProspects(env)).googleKey, true);
  await assert.rejects(savePlacesKey(env, "curta"), /google_key_invalid/);
  await assert.rejects(setProspectStatus(env, "ChIJ_place_0001", "apagar"), /status_invalid/);
});

test("caçador fica no painel da Flow Arts (22/10); rota exige login do Master ou da Flow Arts", () => {
  const html = fs.readFileSync(new URL("../../public/portal.html", import.meta.url), "utf8");
  assert.match(html, /id="prospect-panel"/);
  const lite = fs.readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.match(lite, /prospects-ui\.js/);
  assert.match(lite, /NEXUS_API = "\/api\/portal\/flow"/);
  const master = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(master, /id="prospect-panel"|id="crm-list"/);
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/master\/prospects[\s\S]{0,200}resolveMasterSession/);
  assert.match(worker, /\/api\/portal\/flow\/[\s\S]{0,200}portal\.clientId !== SHOWCASE_CLIENT\) return json\(\{ error: "unauthorized" \}, 401\)/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /flowCrm: client\.id === SHOWCASE_CLIENT/);
});

test("pacote de site aparece no site, nas páginas de nicho e no robô com o mesmo preço", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  for (const page of ["site.html", "marketing-para-cafeteria.html", "marketing-para-salao-de-beleza.html", "marketing-para-lanchonete.html"]) {
    assert.match(read(page), /Site[\s\S]{0,40}do seu negócio[\s\S]{0,120}R\$ 497/, page);
  }
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  assert.match(knowledgePrompt("primeiro-teste"), /Site \(site do seu negócio\): R\$ 497/);
});

test("sem chave do Google, busca grátis no OpenStreetMap", async () => {
  const { db, env } = fakeEnv();
  delete env.GOOGLE_PLACES_API_KEY;
  const elements = [
    { type: "node", id: 1, tags: { name: "Salão Nilson", shop: "hairdresser", phone: "+55 81 98888-1111", opening_hours: "Mo-Sa 09:00-19:00", "addr:street": "Rua B" } },
    { type: "node", id: 2, tags: { name: "Com Site", shop: "hairdresser", phone: "+55 81 98888-2222", website: "https://comsite.com.br" } },
    { type: "node", id: 3, tags: { name: "Sem Telefone", shop: "hairdresser" } },
    { type: "node", id: 4, tags: { name: "Starbucks", amenity: "cafe", phone: "+55 11 3333-4444", brand: "Starbucks" } },
    { type: "way", id: 5, tags: { name: "Beleza Pura", shop: "beauty", "contact:whatsapp": "81 99999-0000", "contact:instagram": "https://instagram.com/belezapura" } }
  ];
  let url = "";
  const result = await runProspectSearch(env, { calls: 1, niche: "salao" }, async (u, init) => {
    url = u;
    assert.match(decodeURIComponent(init.body), /"shop"="hairdresser"/);
    return new Response(JSON.stringify({ elements }), { status: 200 });
  });
  assert.equal(url, "https://overpass-api.de/api/interpreter");
  assert.equal(result.provider, "osm");
  assert.equal(result.added, 2);
  const rows = db.prepare("SELECT * FROM prospects ORDER BY score DESC").all();
  assert.deepEqual(rows.map(r => r.name), ["Salão Nilson", "Beleza Pura"]);
  assert.equal(rows[1].instagram, "belezapura");
  assert.match(rows[0].maps_url, /google\.com\/maps\/search/);
  assert.match((await listProspects(env)).items[0].message, /Veja uma arte que fizemos para salões de beleza/);
  const busy = await runProspectSearch(env, { calls: 1 }, async () => new Response("", { status: 504 }));
  assert.equal(busy.error, "osm_busy");
});

test("ponto do mapa: só nome, telefone e sem site próprio", () => {
  assert.equal(osmToProspect({ type: "node", id: 9, tags: { name: "X", phone: "123" } }, "cafeteria", "Recife PE"), null);
  assert.equal(osmToProspect({ type: "node", id: 9, tags: { name: "X", phone: "(81) 3333-4444", website: "instagram.com/x" } }, "cafeteria", "Recife PE"), null, "só fixo: fora");
  assert.ok(osmToProspect({ type: "node", id: 9, tags: { name: "X", phone: "(81) 98888-4444", website: "instagram.com/x" } }, "cafeteria", "Recife PE"));
  assert.match(overpassQuery("lanchonete", 0), /"amenity"="fast_food"/);
});

test("busca pelo navegador: o servidor planeja, o navegador busca e o servidor guarda", async () => {
  const { db, env } = fakeEnv();
  delete env.GOOGLE_PLACES_API_KEY;
  const plan = await planBrowserSearch(env, { calls: 2 });
  assert.equal(plan.jobs.length, 2);
  assert.equal(plan.usedToday, 2);
  assert.match(plan.jobs[0].query, /out tags center/);
  assert.ok(plan.endpoints[0].startsWith("https://overpass-api.de"));
  const next = await planBrowserSearch(env, { calls: 1 });
  assert.notEqual(next.jobs[0].label, plan.jobs[0].label, "rodízio anda");
  const job = plan.jobs[0];
  const result = await importBrowserResults(env, { niche: job.niche, cityIndex: job.cityIndex, elements: [
    { type: "node", id: 7, tags: { name: "Café do Bairro", phone: "(11) 97777-6666", opening_hours: "Mo-Fr 07:00-18:00" } },
    { type: "node", id: 8, tags: { name: "Rede Grande", phone: "(11) 97777-5555", brand: "Rede" } },
    { type: "bad", id: 9, tags: { name: "X", phone: "(11) 97777-4444" } }
  ] });
  assert.equal(result.added, 1);
  assert.equal(db.prepare("SELECT city FROM prospects").get().city, "São Paulo SP");
  await assert.rejects(importBrowserResults(env, { niche: "x", cityIndex: 0, elements: [] }), /niche_invalid/);
  await assert.rejects(importBrowserResults(env, { niche: "cafeteria", cityIndex: 999, elements: [] }), /city_invalid/);
});

test("Google recusou (sem crédito): a busca passa para o mapa grátis sozinha", async () => {
  const { env } = fakeEnv();
  await savePlacesKey(env, "AIzaSyD_chave_do_rodrigo_000000000000");
  const urls = [];
  const result = await runProspectSearch(env, { calls: 1, niche: "salao" }, async u => {
    urls.push(String(u));
    if (String(u).includes("places.googleapis.com")) return new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED", message: "billing" } }), { status: 403 });
    return new Response(JSON.stringify({ elements: [{ type: "node", id: 7, tags: { name: "Salão Ana", shop: "hairdresser", phone: "+55 81 98888-3333" } }] }), { status: 200 });
  });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "osm");
  assert.equal(result.fallbackFrom, "google");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, "Salão Ana");
  assert.match(result.items[0].whatsapp, /wa\.me/);
  assert.ok(urls.some(u => u.includes("overpass")));
});
