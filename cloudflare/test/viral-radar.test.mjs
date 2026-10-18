import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  activeRadarNiches, planHashtags, hookFromCaption, rankTopMedia, runViralRadar,
  viralHooksText, handleFacebookCallback, startRadarConnect, radarStatus, HASHTAGS_PER_WEEK_MAX
} from "../src/viral-radar.js";
import { putState } from "../src/storage.js";
import { encryptSecret } from "../src/secrets.js";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE nexus_state(namespace TEXT NOT NULL, item_key TEXT NOT NULL, client_id TEXT NOT NULL DEFAULT '', value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id));
    CREATE TABLE clients(id TEXT PRIMARY KEY, name TEXT, niche TEXT, instagram TEXT, status TEXT, config_json TEXT, created_at TEXT, updated_at TEXT);`);
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, env: { DB, NEXUS_SECRET_KEY: "teste-chave", META_APP_ID: "123", META_APP_SECRET: "abc", PUBLIC_BASE_URL: "https://n.workers.dev" } };
}

const CLIENTS = [
  { id: "primeiro-teste", name: "Flow Arts", niche: "marketing", status: "online" },
  { id: "quatree", name: "Quatree Dog", niche: "Loja de ração", status: "online" },
  { id: "salao-x", name: "Studio Bela", niche: "Salão de beleza", status: "setup" },
  { id: "globalplay-streaming", name: "Global Play", niche: "streaming", status: "archived" },
  { id: "velho", name: "Antigo", niche: "Pet shop", status: "archived" }
];

test("nichos ativos vêm do cadastro, sem arquivados", () => {
  assert.deepEqual(activeRadarNiches(CLIENTS), ["marketing", "racao", "salao"]);
});

test("respeita o limite de hashtags da Meta por semana", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const plan = planHashtags(["marketing", "racao", "salao"], {}, now);
  assert.equal(plan.length, 6);
  const full = Object.fromEntries(Array.from({ length: HASHTAGS_PER_WEEK_MAX }, (_, i) => ["t" + i, "2026-10-18T00:00:00Z"]));
  assert.equal(planHashtags(["salao"], full, now).length, 0);
  // hashtag já usada nesta semana não gasta limite de novo
  assert.equal(planHashtags(["salao"], { ...full, salaodebeleza: "2026-10-18T00:00:00Z" }, now).length, 1);
  // usada há mais de 7 dias volta a contar como nova (e o limite já liberou)
  assert.equal(planHashtags(["salao"], { salaodebeleza: "2026-10-01T00:00:00Z" }, now).length, 2);
});

test("gancho limpo e ranking por curtidas e comentários", () => {
  assert.equal(hookFromCaption("🔥 Ninguém te conta isso sobre ração #pet @fulano\nresto"), "Ninguém te conta isso sobre ração");
  const now = new Date("2026-10-19T12:00:00Z");
  const ranked = rankTopMedia([
    { caption: "Post fraco com poucas curtidas", like_count: 10, comments_count: 0, timestamp: "2026-10-10T00:00:00Z" },
    { caption: "Post forte que bombou demais\n#x", like_count: 500, comments_count: 40, media_type: "VIDEO", timestamp: "2026-10-12T00:00:00Z" },
    { caption: "Post antigo que bombou faz tempo", like_count: 9000, comments_count: 1, timestamp: "2025-01-01T00:00:00Z" },
    { caption: "#só #hashtag", like_count: 999, comments_count: 0 }
  ], now);
  assert.deepEqual(ranked.map(r => r.hook), ["Post forte que bombou demais", "Post fraco com poucas curtidas"]);
  assert.equal(ranked[0].format, "reels");
});

test("sem Facebook conectado não faz nada", async () => {
  const { env } = setup();
  let called = 0;
  const r = await runViralRadar(env, new Date(), async () => { called++; }, { clients: CLIENTS });
  assert.equal(r.skipped, "not_connected");
  assert.equal(called, 0);
});

test("busca semanal guarda os ganchos por nicho e os agentes recebem", async () => {
  const { env } = setup();
  await putState(env, "integration", "facebook-radar", "", { token: await encryptSecret(env, "tok"), igUserId: "999", igUsername: "flowarts2026" });
  const calls = [];
  const fake = async url => {
    const u = new URL(url);
    calls.push(u.pathname);
    if (u.pathname.endsWith("/ig_hashtag_search")) return Response.json({ data: [{ id: "h-" + u.searchParams.get("q") }] });
    if (u.pathname.endsWith("/top_media")) return Response.json({ data: [
      { caption: "Você não precisa postar todo dia " + u.pathname, like_count: 300, comments_count: 20, media_type: "CAROUSEL_ALBUM", timestamp: new Date().toISOString() }
    ] });
    return Response.json({ error: { message: "x" } }, { status: 400 });
  };
  const now = new Date();
  const r = await runViralRadar(env, now, fake, { clients: CLIENTS });
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.summary).sort(), ["marketing", "racao", "salao"]);
  assert.ok(calls.every(p => p.startsWith("/v25.0/")));
  const text = await viralHooksText(env, CLIENTS[1]);
  assert.match(text, /Você não precisa postar todo dia/);
  assert.match(text, /Nunca copie/);
  // a mesma semana não roda de novo sozinha
  assert.equal((await runViralRadar(env, now, fake, { clients: CLIENTS })).skipped, "not_due");
  const status = await radarStatus(env);
  assert.equal(status.connected, true);
  assert.ok(status.lastRunAt);
});

test("token sem permissão para a busca e mostra o motivo", async () => {
  const { env } = setup();
  await putState(env, "integration", "facebook-radar", "", { token: await encryptSecret(env, "tok"), igUserId: "999" });
  let n = 0;
  const fake = async () => { n++; return Response.json({ error: { code: 10, message: "Application does not have permission" } }, { status: 403 }); };
  const r = await runViralRadar(env, new Date(), fake, { clients: CLIENTS });
  assert.equal(r.ok, false);
  assert.equal(n, 1);
  assert.match(r.errors[0].message, /permission/);
});

test("conexão pelo Facebook: link de autorização e retorno guardam a conta da Flow Arts", async () => {
  const { env } = setup();
  const start = await startRadarConnect(env, new Request("https://painel.flowarts.com.br/api/master/viral-radar/connect", { method: "POST" }));
  const auth = new URL(start.url);
  assert.equal(auth.hostname, "www.facebook.com");
  assert.equal(auth.searchParams.get("redirect_uri"), "https://n.workers.dev/api/oauth/facebook/callback");
  const state = auth.searchParams.get("state");
  const fake = async url => {
    const u = new URL(url);
    if (u.pathname.endsWith("/oauth/access_token")) return Response.json({ access_token: u.searchParams.get("fb_exchange_token") ? "long" : "short", expires_in: 5184000 });
    if (u.pathname.endsWith("/me/accounts")) return Response.json({ data: [
      { name: "Outra", instagram_business_account: { id: "1", username: "outra" } },
      { name: "Flow Arts", instagram_business_account: { id: "17841", username: "flowarts2026" } }
    ] });
    return Response.json({});
  };
  const url = new URL("https://n.workers.dev/api/oauth/facebook/callback?code=c&state=" + encodeURIComponent(state));
  const res = await handleFacebookCallback(env, new Request(url), url, fake);
  assert.equal(res.status, 200);
  const status = await radarStatus(env);
  assert.equal(status.igUsername, "flowarts2026");
  // o mesmo state não serve duas vezes
  const again = await handleFacebookCallback(env, new Request(url), url, fake);
  assert.equal(again.status, 400);
});
