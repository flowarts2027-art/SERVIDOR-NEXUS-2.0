import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  handleClientCampaignPortal, handleClientCampaignMaster, campaignSettings, campaignActiveOn, campaignPostsPerDay,
  reserveAiImage, refundAiImage, aiImagesAccess, clientWantsAiImage, nextCampaignArt, AI_IMAGES_MONTHLY_LIMIT
} from "../src/client-campaign.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id));
    CREATE TABLE clients(id TEXT PRIMARY KEY, config_json TEXT, updated_at TEXT);`);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const store = new Map();
  const MEDIA = {
    async list({ prefix }) {
      return { objects: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, o]) => ({ key, size: o.body.length, uploaded: o.uploaded, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata })) };
    },
    async get(key) { const o = store.get(key); return o ? { body: o.body, httpMetadata: o.httpMetadata } : null; },
    async put(key, body, opts) { store.set(key, { body, uploaded: new Date().toISOString(), ...opts }); }
  };
  return { db, store, env: { DB, MEDIA, PUBLIC_BASE_URL: "https://nexus.example" } };
}

const quatree = { id: "quatree-dog", name: "Quatree Dog", config: { agentProfile: { brandName: "Quatree" } } };
const call = async (env, client, body) => {
  const request = new Request("https://painel/api/portal/campaign", body === undefined ? { method: "GET" } : { method: "POST", body: JSON.stringify(body) });
  const response = await handleClientCampaignPortal(request, env, new URL(request.url), client);
  return { status: response.status, data: await response.json() };
};
const savedConfig = db => JSON.parse(db.prepare("SELECT config_json FROM clients WHERE id='quatree-dog'").get().config_json);

test("cliente escolhe dias e posts por dia; sem liberação não escolhe IA", async () => {
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO clients(id,config_json) VALUES('quatree-dog','{}')").run();
  assert.equal((await call(env, quatree, { artSource: "own", days: 10, postsPerDay: 1 })).data.error, "days_invalid");
  assert.equal((await call(env, quatree, { artSource: "own", days: 7, postsPerDay: 3 })).data.error, "posts_invalid");
  const ai = await call(env, quatree, { artSource: "ai", days: 15, postsPerDay: 2 });
  assert.equal(ai.data.error, "ai_not_enabled");
  assert.match(ai.data.message, /Flow Arts/);

  const ok = await call(env, quatree, { artSource: "own", days: 15, postsPerDay: 2 });
  assert.equal(ok.status, 200);
  const config = savedConfig(db);
  assert.equal(config.agentProfile.brandName, "Quatree", "não apaga o perfil");
  const client = { ...quatree, config };
  const s = campaignSettings(client);
  assert.equal(s.days, 15); assert.equal(s.postsPerDay, 2); assert.equal(s.artSource, "own");
  assert.equal(campaignPostsPerDay(client), 2);
  assert.equal(campaignActiveOn(client, s.startDate), true);
  assert.equal(campaignActiveOn(client, s.endDate), true);
  const after = new Date(s.endDate + "T12:00:00Z"); after.setUTCDate(after.getUTCDate() + 1);
  assert.equal(campaignActiveOn(client, after.toISOString().slice(0, 10)), false, "depois do último dia não posta");
  assert.equal(campaignActiveOn({ id: "x", config: {} }, "2030-01-01"), true, "sem campanha, segue como antes");
});

test("imagem por IA: Master libera, limite do mês e falha não conta", async () => {
  const { db, env } = fakeEnv();
  db.prepare("INSERT INTO clients(id,config_json) VALUES('quatree-dog','{}')").run();
  assert.equal(await reserveAiImage(env, quatree.id), false, "sem liberação não gera");
  const listClients = async () => [{ ...quatree, config: {} }];
  const post = body => handleClientCampaignMaster(new Request("https://m/api/master/ai-images/access", { method: "POST", body: JSON.stringify(body) }), env, new URL("https://m/api/master/ai-images/access"), listClients);
  assert.deepEqual(await (await post({ clientId: quatree.id, enabled: true })).json(), { ok: true, clientId: quatree.id, enabled: true, monthlyLimit: AI_IMAGES_MONTHLY_LIMIT });
  assert.equal(AI_IMAGES_MONTHLY_LIMIT, 30);

  const ok = await call(env, quatree, { artSource: "ai", days: 7, postsPerDay: 1 });
  assert.equal(ok.status, 200);
  const client = { ...quatree, config: savedConfig(db) };
  assert.equal(await clientWantsAiImage(env, client), true);

  await post({ clientId: quatree.id, monthlyLimit: 2 });
  assert.equal(await reserveAiImage(env, quatree.id), true);
  assert.equal(await reserveAiImage(env, quatree.id), true);
  assert.equal(await reserveAiImage(env, quatree.id), false, "acabou o limite");
  await refundAiImage(env, quatree.id);
  assert.equal((await aiImagesAccess(env, quatree.id)).usedMonth, 1);
  assert.equal((await post({ clientId: quatree.id, monthlyLimit: -1 })).status, 400);

  const list = await (await handleClientCampaignMaster(new Request("https://m/api/master/ai-images/access"), env, new URL("https://m/api/master/ai-images/access"), listClients)).json();
  assert.deepEqual(list.clients.map(c => [c.id, c.enabled, c.monthlyLimit, c.usedMonth]), [[quatree.id, true, 2, 1]]);
});

test("artes prontas: posta a mais antiga primeiro, uma vez só, e ignora referências e vídeos", async () => {
  const { env, store } = fakeEnv();
  const put = (key, purpose, type, uploaded) => store.set("library/quatree-dog/" + key, { body: new Uint8Array([1, 2, 3]), uploaded, httpMetadata: { contentType: type }, customMetadata: { purpose, originalName: key } });
  put("b.jpg", "publish", "image/jpeg", "2026-10-14T10:00:00Z");
  put("a.png", "publish", "image/png", "2026-10-13T10:00:00Z");
  put("ref.jpg", "reference", "image/jpeg", "2026-10-01T10:00:00Z");
  put("v.mp4", "publish", "video/mp4", "2026-10-01T10:00:00Z");
  const first = await nextCampaignArt(env, quatree, "post-1");
  assert.equal(first.sourceLibraryKey, "library/quatree-dog/a.png");
  assert.match(first.url, /^https:\/\/nexus\.example\/media\/posts\/quatree-dog\/post-1\/client-art-.+\.png$/);
  const second = await nextCampaignArt(env, quatree, "post-2");
  assert.equal(second.sourceLibraryKey, "library/quatree-dog/b.jpg");
  assert.equal(await nextCampaignArt(env, quatree, "post-3"), null, "acabaram as artes");
  const view = await call(env, quatree);
  assert.equal(view.data.art.length, 2);
  assert.equal(view.data.artLeft, 0);
});

test("aba Campanha no painel, Master com liberação da IA e agente usa a campanha", () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  assert.match(read("portal.html"), /data-tab="campanha"/);
  assert.match(read("portal.html"), /campanha\.js/);
  assert.match(read("client-lite.js"), /"campanha"/);
  assert.match(read("index.html"), /ai-images-access-list/);
  const src = name => fs.readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
  const portal = src("portal.js");
  assert.ok(portal.indexOf("handleClientCampaignPortal(request") > portal.indexOf('if (!session || !client) return json({ error: "unauthorized" }, 401);'));
  assert.match(src("index.js"), /\/api\/master\/ai-images\/access[\s\S]{0,200}resolveMasterSession/);
  const runtime = src("agent-runtime.js");
  assert.match(runtime, /if\(!campaignActiveOn\(client,day\)\)continue;/);
  assert.match(runtime, /campaignPostsPerDay\(client\)/);
  assert.match(runtime, /refundAiImage/);
});
