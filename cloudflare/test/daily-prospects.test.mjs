import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { runDailyProspects, nicheOrder, saveDailySettings, dailySettings } from "../src/daily-prospects.js";
import { listContacts, markContacted, createContact, updateContact } from "../src/crm.js";
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

test("19/10: separa 10 por dia, só nos nichos com exemplo (repete nicho se precisar), em 'Para chamar'; não envia nada", async () => {
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO nexus_state VALUES('showcase','map','primeiro-teste',?,'x')").run(JSON.stringify({
    cafeteria: { kind: "carousel", images: ["https://x/1.jpg", "https://x/2.jpg"] }, pet: { kind: "video", videoUrl: "https://x/v.mp4" }, restaurante: { kind: "video", videoUrl: "https://x/r.mp4" }
  }));
  const calls = [];
  const map = fakeFetcher(calls);
  const first = await runDailyProspects(env, NINE_BRT, map);
  assert.equal(first.picked, 3);
  const withExample = ["bar", "cafeteria", "clinica", "dentista", "farmacia", "hotel", "imobiliaria", "mercado", "oficina", "pet", "restaurante"]; // bar e dentista vêm junto com o site (19/10)
  assert.equal(new Set(first.added.map(a => a.niche)).size, 3, "um de cada nicho com exemplo");
  assert.ok(first.added.every(a => withExample.includes(a.niche)));
  let out = first, t = NINE_BRT.getTime();
  for (let i = 0; i < 10 && out.skipped !== "done"; i++) { t += 900e3; out = await runDailyProspects(env, new Date(t), map); }
  assert.equal(out.skipped, "done");
  assert.equal(out.picked, 10);
  const list = await listContacts(env, {}, new Date(t));
  assert.equal(list.due.length, 10);
  for (const c of list.due) {
    assert.equal(c.stage, "chamar");
    assert.ok(withExample.includes(c.niche), "só nicho com exemplo");
    assert.ok(c.example?.files?.length, "toda mensagem leva imagem ou vídeo");
    assert.doesNotMatch(c.name, /Fixo/, "só celular");
  }
  assert.equal(calls.length, 0, "nada enviado");
});

test("19/10: quem estava com 3 por dia vira 10; depois vale o que ele escolher no painel", async () => {
  const { db, env } = fakeEnv();
  db.exec("CREATE TABLE IF NOT EXISTS crm_settings (id TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  db.prepare("INSERT INTO crm_settings(id,value_json) VALUES('daily',?)").run(JSON.stringify({ enabled: true, target: 3 }));
  assert.equal((await dailySettings(env)).target, 10);
  await saveDailySettings(env, { target: 5 });
  assert.equal((await dailySettings(env)).target, 5);
});

test("19/10: limpa uma vez quem já recebeu mensagem e não respondeu; não chama a mesma empresa de novo", async () => {
  const { env } = fakeEnv();
  const old = new Date("2026-10-15T15:00:00Z");
  const sent = (await createContact(env, { name: "Já mandei", phone: "22981110001", stage: "contato", source: "cacador-auto", sourceId: "osm:node/1" }, old)).contact;
  await createContact(env, { name: "Ficou parado", phone: "22981110002", stage: "chamar", source: "cacador-auto", sourceId: "osm:node/2" }, old);
  const talk = (await createContact(env, { name: "Respondeu", phone: "22981110003", stage: "conversando" }, old)).contact;
  await runDailyProspects(env, new Date("2026-10-19T10:00:00Z"), fakeFetcher([]));
  const list = await listContacts(env, {}, NINE_BRT);
  assert.deepEqual(list.contacts.map(c => c.name), ["Respondeu"]);
  assert.ok(sent.id && talk.id);
  // Segunda vez não limpa de novo (quem entrou depois fica).
  await updateContact(env, talk.id, { stage: "contato" }, NINE_BRT);
  await runDailyProspects(env, new Date("2026-10-19T10:15:00Z"), fakeFetcher([]));
  assert.equal((await listContacts(env, {}, NINE_BRT)).contacts.length, 1);
});

test("no dia seguinte vai para os próximos nichos e não repete empresa; 'já falei' passa para 'mandei mensagem'", async () => {
  const { env } = fakeEnv();
  const map = fakeFetcher([]);
  const day1 = await runDailyProspects(env, NINE_BRT, map);
  const day2 = await runDailyProspects(env, new Date(NINE_BRT.getTime() + 86400e3), map);
  const n1 = day1.added.map(a => a.niche), n2 = day2.added.map(a => a.niche);
  // 19/10: só nichos com exemplo (bar e dentista vêm junto com o site), então o nicho pode repetir; a empresa não.
  assert.ok([...n1, ...n2].every(n => ["bar", "clinica", "dentista", "farmacia", "mercado", "oficina", "hotel", "imobiliaria"].includes(n)));
  const list = await listContacts(env, {}, new Date(NINE_BRT.getTime() + 86400e3));
  assert.equal(new Set(list.contacts.map(c => c.phone)).size, 6);
  const after = await markContacted(env, list.due[0].id, { followDays: 7 }, NINE_BRT);
  assert.equal(after.contact.stage, "contato");
  assert.equal(after.contact.followCount, 0);
});

test("ordem dos nichos: com exemplo primeiro, em rodízio", () => {
  // 19/10: com algum exemplo, fica só nos nichos com exemplo (toda mensagem leva imagem).
  assert.deepEqual(nicheOrder({ pet: { videoUrl: "x" } }, 0), ["pet"]);
  assert.equal(nicheOrder({}, 0).length, 21); // sem nenhum exemplo: todos (18/10: casa de ração virou loja de ração)
});

test("aviso no celular: chave criada uma vez, toque vai assinado (VAPID) e sem conteúdo", async () => {
  const { env } = fakeEnv();
  const k1 = await pushPublicKey(env), k2 = await pushPublicKey(env);
  assert.equal(k1, k2);
  assert.equal(Buffer.from(k1.replace(/-/g, "+").replace(/_/g, "/"), "base64").length, 65);
  await saveSubscription(env, { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "x", auth: "y" } });
  await assert.rejects(saveSubscription(env, { endpoint: "https://malicioso.com/x" }), /subscription_invalid/);
  await saveDailySettings(env, { target: 3 });
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

test("19/10: exemplos do bar e do dentista entram sozinhos, sem trocar o que ele subiu pelo Master", async () => {
  const { seedBundledExamples } = await import("../src/bundled-examples.js");
  const { readShowcase } = await import("../src/showcase-store.js");
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO nexus_state VALUES('showcase','map','primeiro-teste',?,'x')").run(JSON.stringify({ bar: { kind: "video", videoUrl: "https://x/meu-bar.mp4" } }));
  const out = await seedBundledExamples(env);
  assert.deepEqual(out.added, ["dentista", "clinica", "farmacia", "mercado", "oficina", "hotel", "imobiliaria"]);
  const map = await readShowcase(env);
  assert.equal(map.bar.videoUrl, "https://x/meu-bar.mp4");
  assert.equal(map.dentista.kind, "video", "19/10 14h36: vídeo, não fotos");
  assert.equal(map.dentista.videoUrl, "https://flowarts.com.br/exemplos-nicho/dentista/video.mp4");
  assert.equal(map.dentista.imageUrl, "https://flowarts.com.br/exemplos-nicho/dentista/capa.jpg");
  assert.deepEqual((await seedBundledExamples(env)).added, [], "segunda vez não mexe");
});

test("19/10 14h36: o carrossel que nós colocamos vira vídeo; o que ele subiu fica", async () => {
  const { seedBundledExamples } = await import("../src/bundled-examples.js");
  const { readShowcase } = await import("../src/showcase-store.js");
  const { exampleMedia } = await import("../src/crm.js");
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO nexus_state VALUES('showcase','map','primeiro-teste',?,'x')").run(JSON.stringify({
    bar: { kind: "carousel", images: ["https://flowarts.com.br/exemplos-nicho/bar/cartao-1.jpg"], source: "bundled" },
    mercado: { kind: "carousel", images: ["https://x/meu-mercado.jpg"] }
  }));
  const out = await seedBundledExamples(env);
  assert.ok(out.added.includes("bar"));
  assert.ok(!out.added.includes("mercado"));
  const map = await readShowcase(env);
  assert.deepEqual(exampleMedia(map.bar), { kind: "video", files: ["https://flowarts.com.br/exemplos-nicho/bar/video.mp4"] });
  assert.equal(map.mercado.images[0], "https://x/meu-mercado.jpg");
  assert.deepEqual((await seedBundledExamples(env)).added, [], "segunda vez não mexe");
});
