// GILTEC (pedido do Rodrigo, 27/10/2026): locação de equipamentos para construção.
// Busca construtoras, obras em rodovias e reformas; 10 por dia, só com WhatsApp; mensagem da Rose.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { clientDailySettings, runClientDaily, suggestedNiches } from "../src/captador-daily.js";
import { captadorView, captadorEnabled, captadorOverpassQuery, captadorMessage, captadorConfig, clientNiches, CAPTADOR_ALL_NICHES } from "../src/captador.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { DB };
}

const giltec = { id: "giltec", name: "GILTEC", niche: "Outro", config: { agentProfile: { niche: "Locação de equipamentos para construção civil", region: "Nova Friburgo RJ" } } };
const at10 = new Date("2026-10-28T13:00:00Z");
let n = 0;
const firm = phone => ({ type: "node", id: ++n, tags: { name: "Construtora " + n, ...(phone ? { phone } : {}) } });

test("GILTEC: tipos de construção, busca diária ligada, só WhatsApp e Captador ligado", async () => {
  const env = fakeEnv();
  const niches = ["construtora", "reforma", "pavimentacao", "terraplenagem", "engenharia", "locadora", "incorporadora", "empreiteira", "saneamento", "andaimes"];
  assert.deepEqual(suggestedNiches(giltec), niches);
  assert.deepEqual(clientNiches(giltec), niches);
  for (const k of niches) assert.ok(CAPTADOR_ALL_NICHES[k], k);
  assert.equal(await captadorEnabled(env, giltec.id, giltec), true);
  const s = await clientDailySettings(env, giltec);
  assert.equal(s.enabled, true);
  assert.equal(s.onlyWhatsapp, true);
  assert.equal(s.target, 10);
  assert.equal(s.cities.length, 92, "estado do RJ inteiro");
  assert.equal(s.cities[0], "Rio de Janeiro RJ");
  assert.ok(s.cities.includes("Nova Friburgo RJ") && s.cities.includes("Macuco RJ"));
});

test("GILTEC: mapa grátis procura também pelo nome (construtora, asfalto, rodovia)", () => {
  assert.match(captadorOverpassQuery("pavimentacao", "Nova Friburgo RJ"), /\["name"~"paviment\|asfalt\|rodovi\|saneamento",i\]/);
  assert.match(captadorOverpassQuery("construtora", "Nova Friburgo RJ"), /\["office"="construction_company"\]/);
});

test("GILTEC: só entra empresa com celular (WhatsApp)", async () => {
  const env = fakeEnv();
  const list = [firm("+55 22 99876-1001"), firm("+55 22 2522-1000"), firm(""), firm("+55 22 98765-4321")];
  const r = await runClientDaily(env, giltec, at10, async () => ({ ok: true, json: async () => ({ elements: list }) }));
  assert.equal(r.picked, 2, "fixo e sem telefone ficam fora");
  const view = await captadorView(env, giltec, "hoje");
  assert.equal(view.items.length, 2);
  for (const item of view.items) assert.match(item.whatsapp, /^https:\/\/wa\.me\/55\d{11}\?text=/);
});

test("GILTEC: mensagem da Rose, da GILTEC Locações, com o que ela aluga", async () => {
  const env = fakeEnv();
  const config = await captadorConfig(env, giltec);
  const msg = captadorMessage(config, { name: "Construtora Serra", city: "Nova Friburgo RJ", niche: "construtora" });
  assert.match(msg, /Aqui é Rose, da GILTEC Locações\./);
  assert.match(msg, /Encontrei a Construtora Serra aqui em Nova Friburgo RJ\./);
  assert.match(msg, /equipamentos para construção civil/);
  assert.match(msg, /não receber mensagens/);
});

test("outros clientes continuam como antes (sem filtro de WhatsApp por padrão)", async () => {
  const env = fakeEnv();
  const cafe = { id: "cafe-x", name: "Café X", niche: "Cafeteria" };
  const s = await clientDailySettings(env, cafe);
  assert.equal(s.enabled, false);
  assert.equal(s.onlyWhatsapp, false);
  assert.equal(await captadorEnabled(env, cafe.id, cafe), false);
});

// 28/10 (Rodrigo): GILTEC não vende para loja de material; locadoras de equipamentos entram.
test("GILTEC: loja de material fica de fora e a lista antiga salva é trocada uma vez", async () => {
  const { isMaterialStore, captadorLeadOSM } = await import("../src/captador.js");
  assert.equal(isMaterialStore("construtora", "Casa das Construções Materiais"), true);
  assert.equal(isMaterialStore("reforma", "Depósito São Jorge"), true);
  assert.equal(isMaterialStore("construtora", "Construtora Serra Verde"), false);
  assert.equal(isMaterialStore("locadora", "Loja X", "hardware"), true);
  assert.equal(isMaterialStore("pet", "Ferragens"), false, "só vale para os tipos de construção");
  assert.equal(captadorLeadOSM({ type: "node", id: 1, tags: { name: "Ferragens Rio", phone: "21 99999-0000" } }, "construtora", "Niterói"), null);
  assert.ok(captadorLeadOSM({ type: "node", id: 2, tags: { name: "Locadora Obra Fácil", phone: "21 99999-0001" } }, "locadora", "Niterói"));
  assert.match(captadorOverpassQuery("locadora", "Niterói"), /tool_hire/);
  assert.ok(clientNiches(giltec).includes("locadora"));
  assert.ok(!clientNiches(giltec).includes("material"));

  const env = fakeEnv();
  const { clientDailySettings, saveClientDailySettings } = await import("../src/captador-daily.js");
  // Lista salva em 27/10 (sem versão, com "material"): vira a lista nova.
  await env.DB.prepare("INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES('captador','daily','giltec',?1,CURRENT_TIMESTAMP)")
    .bind(JSON.stringify({ enabled: true, niches: ["construtora", "material"], cities: ["Niterói"] })).run();
  const old = await clientDailySettings(env, giltec);
  assert.deepEqual(old.niches, ["construtora", "reforma", "pavimentacao", "terraplenagem", "engenharia", "locadora", "incorporadora", "empreiteira", "saneamento", "andaimes"]);
  assert.equal(old.enabled, true);
  await saveClientDailySettings(env, giltec, { enabled: true, niches: ["construtora", "reforma"], cities: "Niterói" });
  const saved = await clientDailySettings(env, giltec);
  assert.deepEqual(saved.niches, ["construtora", "reforma"], "depois de salvo na versão nova, respeita a escolha");
});

test("GILTEC: Casa do Construtor (locadora) fica; lojas de material saem", async () => {
  const { isMaterialStore } = await import("../src/captador.js");
  assert.equal(isMaterialStore("locadora", "Casa do Construtor Niterói"), false);
  assert.equal(isMaterialStore("construtora", "Casa da Construção Friburgo"), true);
  assert.equal(isMaterialStore("reforma", "Mat. de Construção Silva"), true);
  assert.equal(isMaterialStore("construtora", "Telhas e Cerâmica Rio"), true);
  assert.equal(isMaterialStore("pavimentacao", "Pavimentação Serrana"), false);
  assert.equal(isMaterialStore("andaimes", "Loja X", "building_materials_store"), true);
});

test("CRM de busca: sem mensagem há 2 dias sai (e não volta); loja de material sai; enviado fica", async () => {
  const { cleanupLeads, ensureCaptadorSchema } = await import("../src/captador.js");
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id))");
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  const env = { DB };
  await ensureCaptadorSchema(env);
  const add = (id, name, niche, status, created) => db.exec(`INSERT INTO captador_leads(client_id,id,name,niche,city,phone,maps_url,status,created_at) VALUES('giltec','${id}','${name}','${niche}','Rio','1','x','${status}','${created}')`);
  add("velho", "Construtora A", "construtora", "hoje", "2026-10-25 12:00:00");
  add("novo", "Construtora B", "construtora", "hoje", "2026-10-28 10:00:00");
  add("loja", "Casa da Construção", "construtora", "hoje", "2026-10-28 10:00:00");
  add("enviado", "Construtora C", "construtora", "enviado", "2026-10-20 10:00:00");
  add("depois", "Construtora D", "construtora", "depois", "2026-10-20 10:00:00");
  const r = await cleanupLeads(env, { id: "giltec" }, new Date("2026-10-28T15:00:00Z"));
  assert.equal(r.removed, 2);
  assert.deepEqual(db.prepare("SELECT id FROM captador_leads ORDER BY id").all().map(x => x.id), ["depois", "enviado", "novo"]);
  assert.deepEqual(db.prepare("SELECT id FROM captador_skips ORDER BY id").all().map(x => x.id), ["loja", "velho"]);
});
