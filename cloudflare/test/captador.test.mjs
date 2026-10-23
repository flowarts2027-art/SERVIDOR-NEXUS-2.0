import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  handleCaptadorPortal, handleCaptadorMaster, captadorLead, captadorMessage, CAPTADOR_NICHES,
  setCaptadorAccess, captadorEnabled, CAPTADOR_MONTHLY_LIMIT
} from "../src/captador.js";

function fakeEnv(withKey = true) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT,
    PRIMARY KEY(namespace,item_key,client_id))`);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB, GOOGLE_PLACES_API_KEY: withKey ? "chave-de-teste-1234567890123456789" : "" } };
}

const PLACES = [
  { id: "ChIJagro000001", displayName: { text: "Agropecuária Boi Gordo" }, nationalPhoneNumber: "(34) 99888-1111",
    formattedAddress: "Rua A, 10, Uberlândia - MG", rating: 4.7, userRatingCount: 150, googleMapsUri: "https://maps.google.com/?cid=1",
    websiteUri: "https://instagram.com/boigordoagro", businessStatus: "OPERATIONAL" },
  { id: "ChIJagro000002", displayName: { text: "Rações Silva" }, nationalPhoneNumber: "(34) 3222-1111",
    websiteUri: "https://racoessilva.com.br", businessStatus: "OPERATIONAL" },
  { id: "ChIJagro000003", displayName: { text: "Fechada" }, nationalPhoneNumber: "(34) 99999-0000", businessStatus: "CLOSED_PERMANENTLY" },
  { id: "ChIJagro000004", displayName: { text: "Sem Fone" } }
];
let lastQuery = "";
const google = async (url, init) => {
  lastQuery = JSON.parse(init.body).textQuery;
  return new Response(JSON.stringify({ places: PLACES }), { status: 200 });
};

const call = async (env, client, path, body) => {
  const request = new Request("https://painel.flowarts.com.br" + path, body === undefined
    ? { method: "GET" } : { method: "POST", body: JSON.stringify(body) });
  const response = await handleCaptadorPortal(request, env, new URL(request.url), client, google);
  return { status: response.status, data: await response.json() };
};

const ana = { id: "cliente-ana", name: "Quatree Dog" };
const beto = { id: "cliente-beto", name: "Beto Bebidas" };

test("sem liberação o cliente vê o preço e não consegue buscar", async () => {
  const { env } = fakeEnv();
  const view = await call(env, ana, "/api/portal/captador");
  assert.equal(view.data.enabled, false);
  assert.match(view.data.price, /97/);
  const search = await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "Uberlândia MG" });
  assert.equal(search.status, 403);
});

test("busca do cliente no Google: lista na hora, guarda só quem ele chamou, separado por cliente", async () => {
  const { db, env } = fakeEnv();
  await setCaptadorAccess(env, ana.id, true);
  await setCaptadorAccess(env, beto.id, true);
  await call(env, ana, "/api/portal/captador/config", { myName: "Ana", business: "Quatree Dog", offer: "Revendo ração Quatree com entrega em toda Minas." });

  const bad = await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "" });
  assert.equal(bad.data.error, "city_invalid");

  const result = await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "Uberlândia MG" });
  assert.equal(result.status, 200);
  assert.equal(lastQuery, "agropecuária em Uberlândia MG");
  assert.deepEqual(result.data.items.map(i => i.name), ["Agropecuária Boi Gordo", "Rações Silva"]);
  const [first] = result.data.items;
  assert.equal(first.instagram, "boigordoagro");
  assert.match(first.message, /Aqui é Ana, da Quatree Dog/);
  assert.match(first.message, /Revendo ração Quatree/);
  assert.match(first.message, /não receber mensagens/);
  assert.match(first.whatsapp, /^https:\/\/wa\.me\/5534998881111\?text=/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM captador_leads").get().n, 0, "a busca não é guardada");

  await call(env, ana, "/api/portal/captador/contacted", first);
  await call(env, ana, "/api/portal/captador/skip", { id: "ChIJagro000002" });
  const view = await call(env, ana, "/api/portal/captador?status=enviado");
  assert.equal(view.data.items.length, 1);
  assert.equal(view.data.counts["nao-quer"], 1);
  const stored = db.prepare("SELECT * FROM captador_leads").get();
  assert.equal(stored.address, "", "endereço do Google não fica guardado");

  const again = await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "Uberlândia MG" });
  assert.equal(again.data.items.length, 0, "quem já foi chamado ou recusado não volta");

  const other = await call(env, beto, "/api/portal/captador?status=enviado");
  assert.equal(other.data.items.length, 0, "um cliente não vê os contatos do outro");
  const steal = await call(env, beto, "/api/portal/captador/ChIJagro000001/status", { status: "nao-quer" });
  assert.equal(steal.data.error, "lead_not_found");

  await call(env, ana, "/api/portal/captador/ChIJagro000001/status", { status: "novo" });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM captador_leads").get().n, 0, "não cheguei a mandar apaga o contato");

  const used = await call(env, ana, "/api/portal/captador?status=enviado");
  assert.equal(used.data.monthlyLimit, CAPTADOR_MONTHLY_LIMIT);
  assert.equal(used.data.usedMonth, 2);
  assert.equal(CAPTADOR_MONTHLY_LIMIT, 100);

  // Limite do mês por cliente: Rodrigo baixa para 2 e a próxima busca é recusada.
  await setCaptadorAccess(env, ana.id, undefined, 2);
  const limit = await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "Uberlândia MG" });
  assert.equal(limit.data.error, "monthly_limit");
  assert.match(limit.data.message, /deste mês/);
  const bob = await call(env, beto, "/api/portal/captador/search", { niche: "pet", city: "Belo Horizonte MG" });
  assert.equal(bob.status, 200, "o limite de um cliente não trava o outro");
  await setCaptadorAccess(env, ana.id, undefined, 50);
  assert.equal((await call(env, ana, "/api/portal/captador/search", { niche: "agropecuaria", city: "Uberlândia MG" })).status, 200, "aumentar libera de novo");
  assert.equal(await captadorEnabled(env, ana.id), true, "mudar o limite não desliga");
});

const OSM_ELEMENTS = { elements: [
  { type: "node", id: 11, tags: { name: "Pet Amigo", shop: "pet", phone: "+55 31 98888-1111" } },
  { type: "node", id: 12, tags: { name: "Sem Telefone", shop: "pet" } },
  { type: "node", id: 13, tags: { name: "Petz", shop: "pet", phone: "+55 31 3333-4444", brand: "Petz" } }
] };
const searchReq = body => new Request("https://painel.flowarts.com.br/api/portal/captador/search", { method: "POST", body: JSON.stringify(body) });

test("sem chave do Google a busca usa o mapa grátis", async () => {
  const { env } = fakeEnv(false);
  await setCaptadorAccess(env, ana.id, true);
  let body = "";
  const osm = async (url, init) => { body = decodeURIComponent(String(init.body)); return new Response(JSON.stringify(OSM_ELEMENTS), { status: 200 }); };
  const response = await handleCaptadorPortal(searchReq({ niche: "pet", city: "Belo Horizonte MG" }), env, new URL("https://painel.flowarts.com.br/api/portal/captador/search"), ana, osm);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.source, "osm");
  // 23/10: sem telefone também entra (com "Ver no Maps"), depois dos que têm telefone.
  assert.deepEqual(data.items.map(i => i.name), ["Pet Amigo", "Sem Telefone"]);
  assert.equal(data.items[1].whatsapp, "");
  assert.match(data.items[0].id, /^osm:node\/11$/);
  assert.match(body, /"name"="Belo Horizonte"/);
  assert.match(body, /"shop"="pet"/);
  // Quem ele chamou no WhatsApp (contato do mapa grátis) fica salvo.
  const saved = await call(env, ana, "/api/portal/captador/contacted", data.items[0]);
  assert.equal(saved.data.ok, true);
});

test("Google recusa: usa o mapa grátis; os dois falham: avisa e não conta no limite", async () => {
  const { env } = fakeEnv();
  await setCaptadorAccess(env, ana.id, true);
  const url = new URL("https://painel.flowarts.com.br/api/portal/captador/search");
  const googleNo = async u => String(u).includes("googleapis")
    ? new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403 })
    : new Response(JSON.stringify(OSM_ELEMENTS), { status: 200 });
  const ok = await (await handleCaptadorPortal(searchReq({ niche: "pet", city: "Belo Horizonte MG" }), env, url, ana, googleNo)).json();
  assert.equal(ok.source, "osm");
  assert.equal(ok.googleError, "google_PERMISSION_DENIED");
  assert.equal(ok.items.filter(i => i.phone).length, 1);
  const allNo = async () => new Response("", { status: 504 });
  const fail = await (await handleCaptadorPortal(searchReq({ niche: "pet", city: "Belo Horizonte MG" }), env, url, ana, allNo)).json();
  assert.equal(fail.error, "search_failed");
  const view = await call(env, ana, "/api/portal/captador?status=enviado");
  assert.equal(view.data.usedMonth, 1, "só a busca que deu certo conta");
});

test("cidade para o mapa grátis: tira o estado", async () => {
  const { cityName } = await import("../src/captador.js");
  assert.equal(cityName("Nova Friburgo, RJ"), "Nova Friburgo");
  assert.equal(cityName("Curitiba PR"), "Curitiba");
  assert.equal(cityName("Rio de Janeiro"), "Rio de Janeiro");
  assert.equal(cityName("Niterói - RJ"), "Niterói");
});

test("filtro só sem site e mensagem sem dados vazios", () => {
  assert.ok(captadorLead(PLACES[1], "racao", "Uberlândia MG", false));
  assert.equal(captadorLead(PLACES[1], "racao", "Uberlândia MG", true), null);
  const text = captadorMessage({ myName: "", business: "", offer: "" }, { name: "Padaria Sol", city: "Santos SP" });
  assert.doesNotMatch(text, /undefined|, da \./);
});

test("Master liga o Captador por cliente; portal e telas existem", async () => {
  const { env } = fakeEnv();
  const listClients = async () => [ana, beto];
  const post = new Request("https://x/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: ana.id, enabled: true }) });
  await handleCaptadorMaster(post, env, new URL(post.url), listClients);
  const get = new Request("https://x/api/master/captador/access");
  const data = await (await handleCaptadorMaster(get, env, new URL(get.url), listClients)).json();
  assert.deepEqual(data.clients.map(c => [c.id, c.enabled]), [[ana.id, true], [beto.id, false]]);
  assert.deepEqual(data.clients.map(c => c.monthlyLimit), [100, 100]);
  const change = new Request("https://x/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: beto.id, monthlyLimit: 300 }) });
  assert.deepEqual(await (await handleCaptadorMaster(change, env, new URL(change.url), listClients)).json(),
    { ok: true, clientId: beto.id, enabled: false, monthlyLimit: 300 });
  const bad = new Request("https://x/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: beto.id, monthlyLimit: -5 }) });
  assert.equal((await handleCaptadorMaster(bad, env, new URL(bad.url), listClients)).status, 400);

  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  assert.match(read("portal.html"), /captador\.js/);
  assert.match(read("captador.js"), /Google Maps/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.ok(portal.indexOf("handleCaptadorPortal(request") > portal.indexOf("if (!session || !client) return json({ error: \"unauthorized\" }, 401);"),
    "captador só depois do login do cliente");
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/master\/captador\/access[\s\S]{0,200}resolveMasterSession/);
});

test("Captador à venda com o mesmo preço no site, nas páginas de nicho e no robô", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  for (const page of ["site.html", "marketing-para-cafeteria.html", "marketing-para-salao-de-beleza.html", "marketing-para-lanchonete.html"]) {
    assert.match(read(page), /Captador[\s\S]{0,40}de clientes[\s\S]{0,60}R\$ 97/, page);
  }
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  assert.match(knowledgePrompt("primeiro-teste"), /Captador \(de clientes\): R\$ 97 por mês/);
});

test("robô manda planos e o contrato só sai pelo Rodrigo", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  const contract = read("contrato-site.html");
  assert.match(contract, /noindex/);
  assert.match(contract, /R\$ 497,00/);
  assert.match(contract, /R\$ 29,00 por mês ou R\$ 297,00 por ano/);
  assert.match(read("robots.txt"), /Disallow: \/contrato-site/);
  assert.match(read("whatsapp-inbox.js"), /data-wa-quick|QUICK/);
  assert.match(read("index.html"), /data-wa-quick="contrato"/);
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  const prompt = knowledgePrompt("primeiro-teste");
  assert.match(prompt, /flowarts\.com\.br\/#pacotes/);
  assert.match(prompt, /Quem envia o contrato e o Pix é sempre o Rodrigo/);
});

test("Captador tem ração, casa de ração, agropecuária e pet shop", () => {
  assert.equal(CAPTADOR_NICHES.racao.query, "loja de ração");
  assert.equal(CAPTADOR_NICHES.casa_racao, undefined); // 18/10: virou "racao"
  assert.equal(CAPTADOR_NICHES.agropecuaria.query, "agropecuária");
  assert.equal(CAPTADOR_NICHES.pet.query, "pet shop");
});

test("mapa grátis fora do ar: usa o Nominatim (terceira reserva)", async () => {
  const { env } = fakeEnv(false);
  await setCaptadorAccess(env, ana.id, true);
  const urls = [];
  const fetcher = async u => {
    urls.push(String(u));
    if (String(u).includes("nominatim")) return new Response(JSON.stringify([
      { osm_type: "node", osm_id: 21, category: "shop", type: "pet", name: "Pet Lu", extratags: { phone: "+55 21 98888-7777" }, address: { road: "Rua A" } },
      { osm_type: "node", osm_id: 22, category: "building", type: "commercial", name: "Pet Shop", extratags: { phone: "+55 21 98888-6666" } },
      { osm_type: "node", osm_id: 23, category: "shop", type: "pet", name: "Sem Tel", extratags: {} }
    ]), { status: 200 });
    return new Response("", { status: 504 });
  };
  const req = new Request("https://painel.flowarts.com.br/api/portal/captador/search", { method: "POST", body: JSON.stringify({ niche: "pet", city: "Rio de Janeiro RJ" }) });
  const data = await (await handleCaptadorPortal(req, env, new URL(req.url), ana, fetcher)).json();
  assert.equal(data.ok, true);
  assert.deepEqual(data.items.map(i => i.name), ["Pet Lu", "Sem Tel"]);
  const nom = urls.find(u => u.includes("nominatim"));
  assert.match(decodeURIComponent(nom), /q=pet shop in Rio de Janeiro/);
  assert.ok(urls.filter(u => u.includes("interpreter")).length >= 3, "tentou os servidores do Overpass antes");
});

test("Quatree (ração): só tipos de pet e agro, cidades de Uberlândia e região com bairros", async () => {
  const { clientNiches } = await import("../src/captador.js");
  const { clientRegion, UBERLANDIA_REGION } = await import("../src/captador-regions.js");
  const quatree = { id: "quatree-dog", niche: "Ração pet", config: {} };
  assert.deepEqual(clientNiches(quatree), ["pet", "racao", "agropecuaria", "veterinario"]);
  assert.ok(clientNiches({ id: "x", niche: "Agência" }).includes("restaurante"));
  assert.equal(clientRegion(quatree)?.id, "uberlandia");
  assert.ok(UBERLANDIA_REGION.cities.length >= 30 && UBERLANDIA_REGION.cities.includes("Uberlândia MG"));
  assert.ok(UBERLANDIA_REGION.bairros.includes("Santa Mônica"));
  assert.equal(clientRegion({ id: "y", niche: "Café", config: {} }), null);
});
