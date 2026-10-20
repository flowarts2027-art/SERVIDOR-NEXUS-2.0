import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readShowcase, readStoredShowcase, retireBundledShowcase, isRetiredBundledImage } from "../src/showcase-store.js";
import { createContact, listContacts } from "../src/crm.js";
import { seedBundledExamples } from "../src/bundled-examples.js";

const oldImage = (niche, card = 1) => `https://flowarts.com.br/exemplos-nicho/${niche}/cartao-${card}.jpg`;
const oldEntry = niche => ({kind:"carousel", source:"bundled", images:Array.from({length:5},(_,i)=>oldImage(niche,i+1)), imageUrl:oldImage(niche),videoUrl:""});
function fixture(map) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id))");
  db.prepare("INSERT INTO nexus_state VALUES('showcase','map','primeiro-teste',?,'x')").run(JSON.stringify(map));
  const env = {DB:{prepare(sql) {
    const wrap = values => { const args = Object.fromEntries(values.map((v,i)=>['?'+(i+1),v])); return {
      first:async()=>db.prepare(sql).get(args),all:async()=>({results:db.prepare(sql).all(args)}),run:async()=>db.prepare(sql).run(args)
    }; }; return {...wrap([]),bind:(...values)=>wrap(values)};
  }}};
  return {env};
}

test("old persisted cards disappear on read before cleanup; cleanup is persistent and never reseeds", async () => {
  const legacy = Object.fromEntries(["bar","dentista","clinica","farmacia","mercado","oficina","hotel"].map(niche=>[niche,oldEntry(niche)]));
  const manual = {kind:"carousel",images:["https://flowarts.com.br/api/media/modelo-novo.jpg"],savedAt:"2026-10-21"};
  const {env} = fixture({...legacy,pet:manual});
  assert.deepEqual(await readShowcase(env), {pet:manual}, "API consumers immediately hide all retired entries");
  assert.equal(Object.keys(await readStoredShowcase(env)).length, 8, "reads themselves do not mutate storage");
  const cleanup = await seedBundledExamples(env);
  assert.equal(cleanup.removed.length,7);
  assert.deepEqual(cleanup.added,[]);
  assert.deepEqual(await readStoredShowcase(env),{pet:manual});
  assert.deepEqual((await seedBundledExamples(env)).removed,[], "cleanup is idempotent");
  assert.deepEqual(await readShowcase(env),{pet:manual});
});

test("mixed and newer same-niche uploads survive retirement without retaining old poster", () => {
  const fresh = "https://flowarts.com.br/api/media/fresh.jpg";
  const video = "https://flowarts.com.br/api/media/fresh.mp4";
  const map = {
    bar:{...oldEntry("bar"),images:[oldImage("bar"),fresh]},
    hotel:{kind:"carousel",images:[fresh],imageUrl:fresh,source:"manual"},
    oficina:{...oldEntry("oficina"),videoUrl:video},
    dentista:{...oldEntry("dentista"),imageUrl:fresh},
    pet:{kind:"carousel",images:["https://other.example/exemplos-nicho/bar/cartao-1.jpg"]}
  };
  const retired = retireBundledShowcase(map).map;
  assert.deepEqual(retired.bar.images,[fresh]);
  assert.equal(retired.bar.imageUrl,fresh);
  assert.deepEqual(retired.hotel,map.hotel);
  assert.equal(retired.oficina.videoUrl,video);
  assert.equal(retired.oficina.kind,"video");
  assert.deepEqual(retired.dentista.images,[fresh],"a newer poster upload is retained");
  assert.deepEqual(retired.pet,map.pet);
  assert.equal(map.bar.images.length,2,"filter must not mutate input");
});

test("only the retired owned asset set is filtered", () => {
  assert.equal(isRetiredBundledImage(oldImage("bar") + "?v=old"),true);
  assert.equal(isRetiredBundledImage("/exemplos-nicho/hotel/cartao-5.jpg"),true);
  for (const url of ["https://other.example/exemplos-nicho/bar/cartao-1.jpg",oldImage("bar",6),oldImage("pet"),"https://flowarts.com.br/exemplos-nicho/bar/novo.jpg"]) assert.equal(isRetiredBundledImage(url),false,url);
});


test("CRM no longer offers retired card downloads or links while saved legacy entries await cleanup", async () => {
  const {env} = fixture({hotel:oldEntry("hotel")});
  const now = new Date("2026-10-21T12:00:00Z");
  await createContact(env,{name:"Hotel Exemplo",phone:"21988887777",niche:"hotel",stage:"chamar",followDays:1},now);
  const list = await listContacts(env,{},now);
  assert.equal(list.contacts.length,1);
  const contact = list.contacts[0];
  assert.equal(contact.example,undefined);
  assert.doesNotMatch(contact.instagramMessage,/https?:|exemplos-nicho|Veja um carrossel/);
  assert.equal((await readStoredShowcase(env)).hotel.images.length,5,"checks exercise pre-cleanup stored data");
});
