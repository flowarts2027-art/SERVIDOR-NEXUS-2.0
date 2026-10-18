import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { runDailyProspects, nicheOrder } from "../src/daily-prospects.js";
import { listContacts, markContacted } from "../src/crm.js";
import { saveSubscription, pushPublicKey } from "../src/push.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id))");
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, env: { DB } };
}

// Mapa falso: cada busca devolve 2 empresas (1 com celular, 1 só fixo), números diferentes por nicho e cidade.
function fakeFetcher(calls) {
  let n = 0;
  return async (url, init) => {
    if (String(url).includes("push") || String(url).includes("googleapis")) { calls.push({ url, init }); return new Response("", { status: 201 }); }
    n += 1;
    const id = 1000 + n;
    return new Response(JSON.stringify({ elements: [
      { type: "node", id, tags: { name: "Negócio " + id, phone: `(22) 9${String(80000000 + id)}` } },
      { type: "node", id: id + 500, tags: { name: "Fixo " + id, phone: "(22) 2522-0000" } }
    ] }), { status: 200 });
  };
}

const NINE_BRT = new Date("2026-10-18T12:30:00Z");

test("antes das 9h não busca", async () => {
  const { env } = fakeEnv();
  const out = await runDailyProspects(env, new Date("2026-10-18T10:00:00Z"), fakeFetcher([]));
  assert.equal(out.skipped, "too_early");
});

test("separa 3 empresas de nichos diferentes, em 'Para chamar', com a mensagem pronta; não envia nada", async () => {
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO nexus_state VALUES('showcase','map','primeiro-teste',?,'x')").run(JSON.stringify({
    cafeteria: { kind: "carousel", images: ["https://x/1.jpg", "https://x/2.jpg"] }, pet: { kind: "video", videoUrl: "https://x/v.mp4" }, restaurante: { kind: "video", videoUrl: "https://x/r.mp4" }
  }));
  const calls = [];
  const out = await runDailyProspects(env, NINE_BRT, fakeFetcher(calls));
  assert.equal(out.picked, 3);
  assert.equal(new Set(out.added.map(a => a.niche)).size, 3, "nichos diferentes");
  assert.deepEqual(out.added.map(a => a.niche).sort(), ["cafeteria", "pet", "restaurante"], "primeiro os que têm exemplo");
  const list = await listContacts(env, {}, NINE_BRT);
  assert.equal(list.due.length, 3);
  for (const c of list.due) {
    assert.equal(c.stage, "chamar");
    assert.match(c.message, /flowarts\.com\.br\/exemplo\//);
    assert.doesNotMatch(c.name, /Fixo/, "só celular");
  }
  // Sem celular cadastrado para aviso: nenhum envio para ninguém.
  assert.equal(calls.length, 0);
  // Rodou de novo no mesmo dia: não separa mais.
  assert.equal((await runDailyProspects(env, new Date(NINE_BRT.getTime() + 900e3), fakeFetcher(calls))).skipped, "done");
});

test("no dia seguinte vai para os próximos nichos e não repete empresa; 'já falei' passa para 'mandei mensagem'", async () => {
  const { env } = fakeEnv();
  const map = fakeFetcher([]);
  const day1 = await runDailyProspects(env, NINE_BRT, map);
  const day2 = await runDailyProspects(env, new Date(NINE_BRT.getTime() + 86400e3), map);
  const n1 = day1.added.map(a => a.niche), n2 = day2.added.map(a => a.niche);
  assert.equal(n2.filter(n => n1.includes(n)).length, 0, "rodízio de nichos");
  const list = await listContacts(env, {}, new Date(NINE_BRT.getTime() + 86400e3));
  assert.equal(new Set(list.contacts.map(c => c.phone)).size, 6);
  const after = await markContacted(env, list.due[0].id, { followDays: 7 }, NINE_BRT);
  assert.equal(after.contact.stage, "contato");
  assert.equal(after.contact.followCount, 0);
});

test("ordem dos nichos: com exemplo primeiro, em rodízio", () => {
  const order = nicheOrder({ pet: { videoUrl: "x" } }, 0);
  assert.equal(order[0], "pet");
  assert.equal(order.length, 21); // 18/10: casa de ração virou loja de ração
});

test("aviso no celular: chave criada uma vez, toque vai assinado (VAPID) e sem conteúdo", async () => {
  const { env } = fakeEnv();
  const k1 = await pushPublicKey(env), k2 = await pushPublicKey(env);
  assert.equal(k1, k2);
  assert.equal(Buffer.from(k1.replace(/-/g, "+").replace(/_/g, "/"), "base64").length, 65);
  await saveSubscription(env, { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "x", auth: "y" } });
  await assert.rejects(saveSubscription(env, { endpoint: "https://malicioso.com/x" }), /subscription_invalid/);
  const calls = [];
  const out = await runDailyProspects(env, NINE_BRT, fakeFetcher(calls));
  assert.equal(out.push.sent, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].init.headers.authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  assert.equal(calls[0].init.body, undefined);
});

test("empresa com horário no mapa e fechada agora: fica para quando abrir, sem virar atrasada", async () => {
  const { hoursStatus, parseOsmHours } = await import("../src/business-hours.js");
  const st = hoursStatus(parseOsmHours("Tu-Su 18:00-23:00"), new Date("2026-10-18T12:30:00Z"));
  assert.equal(st.openNow, false);
  assert.equal(st.nextOpenDay, "2026-10-18");
  assert.equal(st.nextOpenTime, "18:00");
});
