import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { clientDailySettings, saveClientDailySettings, runClientDaily, suggestedNiches, parseCities } from "../src/captador-daily.js";
import { setCaptadorAccess, captadorView, captadorUsage } from "../src/captador.js";

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

const client = { id: "cliente-racao", name: "Loja Teste", niche: "Outro", config: { agentProfile: { niche: "Distribuidora de ração", region: "Uberaba MG" } } };
let n = 0;
const shop = (extra = {}) => ({ type: "node", id: ++n, tags: { name: "Pet " + n, phone: "+55 34 99876-" + String(1000 + n), ...extra } });
const fetcherWith = list => async () => ({ ok: true, json: async () => ({ elements: list }) });
const at10 = new Date("2026-10-23T13:00:00Z"); // 10h em Brasília

test("ramo de ração sugere pet shop, ração, agropecuária e veterinário; cidade vem do perfil", async () => {
  assert.deepEqual(suggestedNiches(client), ["pet", "racao", "agropecuaria", "veterinario"]);
  assert.deepEqual(suggestedNiches({ niche: "Cafeteria" }), []);
  assert.deepEqual(parseCities("Uberaba MG; Araxá MG\nUberaba MG"), ["Uberaba MG", "Araxá MG"]);
  const env = fakeEnv();
  const s = await clientDailySettings(env, client);
  assert.equal(s.enabled, false);
  assert.deepEqual(s.cities, ["Uberaba MG"]);
  assert.equal(s.target, 10);
});

test("busca diária separa empresas em 'hoje', sem repetir, e só com o Captador ligado", async () => {
  const env = fakeEnv();
  assert.equal((await runClientDaily(env, client, at10, fetcherWith([]))).skipped, "captador_disabled");
  await setCaptadorAccess(env, client.id, true, 100);
  assert.equal((await runClientDaily(env, client, at10, fetcherWith([]))).skipped, "disabled");
  await saveClientDailySettings(env, client, { enabled: true });
  const list = [shop(), shop(), shop({ "contact:instagram": "petdois" }), shop({ brand: "Rede" })];
  const r = await runClientDaily(env, client, at10, fetcherWith(list));
  assert.equal(r.picked, 3); // a de rede (brand) fica fora
  assert.equal(await captadorUsage(env, client.id, at10), 2); // até 2 buscas por rodada, cada uma conta no mês
  const again = await runClientDaily(env, client, new Date(at10.getTime() + 600e3), fetcherWith(list));
  assert.equal(again.picked, 3, "mesma empresa não entra duas vezes");
  const view = await captadorView(env, client, "hoje");
  assert.equal(view.items.length, 3);
  assert.equal(view.counts.hoje, 3);
  assert.equal(view.daily.enabled, true);
  const ig = view.items.find(i => i.instagram === "petdois");
  assert.equal(ig.direct, "https://ig.me/m/petdois");
  assert.match(ig.whatsapp, /^https:\/\/wa\.me\/55/);
});

test("respeita a meta do dia, o horário das 9h e o limite do mês", async () => {
  const env = fakeEnv();
  await setCaptadorAccess(env, client.id, true, 1);
  await saveClientDailySettings(env, client, { enabled: true, target: 2, cities: "Uberaba MG" });
  assert.equal((await runClientDaily(env, client, new Date("2026-10-23T10:00:00Z"), fetcherWith([shop()]))).skipped, "too_early");
  const r = await runClientDaily(env, client, at10, fetcherWith([shop(), shop(), shop()]));
  assert.equal(r.picked, 2);
  assert.equal((await runClientDaily(env, client, at10, fetcherWith([shop()]))).skipped, "done");
  const other = { ...client, id: "outro" };
  await setCaptadorAccess(env, other.id, true, 0);
  await saveClientDailySettings(env, other, { enabled: true });
  assert.equal((await runClientDaily(env, other, at10, fetcherWith([shop()]))).skipped, "monthly_limit");
});

test("ligar sem tipo ou sem cidade dá aviso; nada é enviado pelo servidor", async () => {
  const env = fakeEnv();
  await assert.rejects(saveClientDailySettings(env, { id: "x" }, { enabled: true }), /daily_niches/);
  await assert.rejects(saveClientDailySettings(env, { id: "x" }, { enabled: true, niches: ["pet"] }), /daily_cities/);
  const src = fs.readFileSync(new URL("../src/captador-daily.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /graph\.facebook|messages|sendText|wa\.me/);
  const ui = fs.readFileSync(new URL("../../public/captador.js", import.meta.url), "utf8");
  assert.match(ui, /Separadas hoje/);
  assert.match(ui, /Copiar e abrir Direct/);
});
