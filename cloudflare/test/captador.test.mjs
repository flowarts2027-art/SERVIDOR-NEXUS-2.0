import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  handleCaptadorPortal, handleCaptadorMaster, captadorLead, captadorMessage, captadorQuery,
  setCaptadorAccess, CAPTADOR_DAILY_LIMIT
} from "../src/captador.js";

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
  return { db, env: { DB } };
}

const call = async (env, client, path, body) => {
  const request = new Request("https://painel.flowarts.com.br" + path, body === undefined
    ? { method: "GET" } : { method: "POST", body: JSON.stringify(body) });
  const response = await handleCaptadorPortal(request, env, new URL(request.url), client);
  return { status: response.status, data: await response.json() };
};

const ana = { id: "cliente-ana", name: "Doces da Ana" };
const beto = { id: "cliente-beto", name: "Beto Bebidas" };

test("sem liberação o cliente vê o preço e não consegue buscar", async () => {
  const { env } = fakeEnv();
  const view = await call(env, ana, "/api/portal/captador");
  assert.equal(view.data.enabled, false);
  assert.match(view.data.price, /97/);
  const plan = await call(env, ana, "/api/portal/captador/plan", { niche: "cafeteria", lat: -8.05, lon: -34.88, city: "Recife PE" });
  assert.equal(plan.status, 403);
});

test("busca do cliente: planeja, importa, separa por cliente e respeita o limite", async () => {
  const { db, env } = fakeEnv();
  await setCaptadorAccess(env, ana.id, true);
  await setCaptadorAccess(env, beto.id, true);
  await call(env, ana, "/api/portal/captador/config", { myName: "Ana", business: "Doces da Ana", offer: "Faço bolos para cafeterias, com entrega no dia." });

  const bad = await call(env, ana, "/api/portal/captador/plan", { niche: "cafeteria", lat: 40.7, lon: -74, city: "Nova York" });
  assert.equal(bad.data.error, "city_invalid");

  const plan = await call(env, ana, "/api/portal/captador/plan", { niche: "cafeteria", lat: -8.05, lon: -34.88, city: "Recife PE" });
  assert.equal(plan.status, 200);
  assert.match(plan.data.query, /"amenity"="cafe"/);
  const imported = await call(env, ana, "/api/portal/captador/import", { elements: [
    { type: "node", id: 1, tags: { name: "Café Boa Vista", phone: "+55 81 98888-1111", opening_hours: "Mo-Sa 08:00-18:00", website: "https://cafeboavista.com.br" } },
    { type: "node", id: 2, tags: { name: "Rede Café", phone: "+55 81 98888-2222", brand: "Rede" } },
    { type: "node", id: 3, tags: { name: "Sem Fone" } }
  ] });
  assert.equal(imported.data.added, 1);

  const view = await call(env, ana, "/api/portal/captador");
  assert.equal(view.data.items.length, 1);
  assert.equal(view.data.items[0].has_site, true);
  assert.match(view.data.items[0].message, /Aqui é Ana, da Doces da Ana/);
  assert.match(view.data.items[0].message, /Faço bolos para cafeterias/);
  assert.match(view.data.items[0].message, /não receber mensagens/);
  assert.match(view.data.items[0].whatsapp, /^https:\/\/wa\.me\/5581988881111\?text=/);

  const other = await call(env, beto, "/api/portal/captador");
  assert.equal(other.data.items.length, 0, "um cliente não vê os contatos do outro");
  const steal = await call(env, beto, "/api/portal/captador/" + encodeURIComponent("osm:node/1") + "/status", { status: "nao-quer" });
  assert.equal(steal.data.error, "lead_not_found");

  const again = await call(env, ana, "/api/portal/captador/import", { elements: [] });
  assert.equal(again.data.error, "search_expired", "importar exige uma busca planejada");

  db.prepare("UPDATE nexus_state SET value_json=? WHERE namespace='captador' AND item_key='usage' AND client_id=?")
    .run(JSON.stringify({ day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()), count: CAPTADOR_DAILY_LIMIT }), ana.id);
  const limit = await call(env, ana, "/api/portal/captador/plan", { niche: "cafeteria", lat: -8.05, lon: -34.88, city: "Recife PE" });
  assert.equal(limit.data.error, "daily_limit");
});

test("filtro só sem site, mensagem sem dados vazios e consulta do mapa", () => {
  const withSite = { type: "node", id: 5, tags: { name: "X", phone: "(11) 97777-6666", website: "x.com.br" } };
  assert.ok(captadorLead(withSite, "padaria", "São Paulo SP", false));
  assert.equal(captadorLead(withSite, "padaria", "São Paulo SP", true), null);
  const text = captadorMessage({ myName: "", business: "", offer: "" }, { name: "Padaria Sol", city: "Santos SP" });
  assert.doesNotMatch(text, /undefined|, da \./);
  assert.match(captadorQuery("salao", -8, -34), /"shop"="beauty"/);
});

test("Master liga o Captador por cliente; portal e telas existem", async () => {
  const { env } = fakeEnv();
  const listClients = async () => [ana, beto];
  const post = new Request("https://x/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: ana.id, enabled: true }) });
  await handleCaptadorMaster(post, env, new URL(post.url), listClients);
  const get = new Request("https://x/api/master/captador/access");
  const data = await (await handleCaptadorMaster(get, env, new URL(get.url), listClients)).json();
  assert.deepEqual(data.clients.map(c => [c.id, c.enabled]), [[ana.id, true], [beto.id, false]]);

  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  assert.match(read("portal.html"), /captador\.js/);
  assert.match(read("captador.js"), /OpenStreetMap/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.ok(portal.indexOf("handleCaptadorPortal(request") > portal.indexOf("if (!session || !client) return json({ error: \"unauthorized\" }, 401);"),
    "captador só depois do login do cliente");
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/master\/captador\/access[\s\S]{0,200}resolveMasterSession/);
});

test("Captador à venda com o mesmo preço no site, nas páginas de nicho e no robô", async () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  for (const page of ["site.html", "marketing-para-cafeteria.html", "marketing-para-salao-de-beleza.html", "marketing-para-lanchonete.html"]) {
    assert.match(read(page), /Captador de clientes[\s\S]{0,60}R\$ 97/, page);
  }
  const { knowledgePrompt } = await import("../src/whatsapp-knowledge.js");
  assert.match(knowledgePrompt("primeiro-teste"), /Captador de clientes: R\$ 97 por mês/);
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

test("Captador tem ração, casa de ração, agropecuária e pet shop", async () => {
  const { CAPTADOR_NICHES } = await import("../src/captador.js");
  for (const key of ["racao", "casa_racao", "agropecuaria", "pet"]) assert.ok(CAPTADOR_NICHES[key], key);
  assert.match(captadorQuery("racao", -19.9, -43.9), /"agrarian"~"feed"/);
  assert.match(captadorQuery("racao", -19.9, -43.9), /nwr\["shop"\]\["name"~"ração/);
  assert.match(captadorQuery("casa_racao", -19.9, -43.9), /casa d\[aeo\]s\? ra",i/);
  assert.match(captadorQuery("agropecuaria", -19.9, -43.9), /"shop"="agrarian"\]\["name"\]/);
  assert.doesNotMatch(captadorQuery("agropecuaria", -19.9, -43.9), /="null"/);
});
