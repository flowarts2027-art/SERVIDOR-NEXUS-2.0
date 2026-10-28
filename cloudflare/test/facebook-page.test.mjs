import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  pickPage, startFacebookPageConnect, finishFacebookPageConnect, queueFacebookCrosspost,
  runFacebookCrosspostQueue, facebookPageStatus, setFacebookCrosspost, FB_PAGE_SCOPES, FB_QUEUE_NS
} from "../src/facebook-page.js";
import { handleFacebookCallback } from "../src/viral-radar.js";
import { getState, putState } from "../src/storage.js";
import { encryptSecret } from "../src/secrets.js";
import { sha256Hex } from "../src/auth.js";

function setup(extra = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE nexus_state(namespace TEXT NOT NULL, item_key TEXT NOT NULL, client_id TEXT NOT NULL DEFAULT '', value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id));`);
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, env: { DB, NEXUS_SECRET_KEY: "teste-chave", META_APP_ID: "123", META_APP_SECRET: "abc", PUBLIC_BASE_URL: "https://n.workers.dev", ...extra } };
}

async function connect(env, clientId = "primeiro-teste", more = {}) {
  await putState(env, "facebook-page", "connection", clientId, {
    pageId: "999", pageName: "Flow Arts", pageToken: await encryptSecret(env, "page-token"), enabled: true, ...more
  });
}

function recorder(responses) {
  const calls = [];
  const fetcher = async (url, opts = {}) => {
    const body = opts.body ? Object.fromEntries(new URLSearchParams(String(opts.body))) : {};
    calls.push({ url: String(url), method: opts.method || "GET", body });
    const next = responses.shift() || { id: "x" };
    return { ok: !next.error, status: next.error ? 400 : 200, json: async () => next };
  };
  return { calls, fetcher };
}

test("pede a permissão de publicar na Página", async () => {
  const { env } = setup();
  assert.ok(FB_PAGE_SCOPES.includes("pages_manage_posts"));
  const { url } = await startFacebookPageConnect(env, new Request("https://n.workers.dev/api/master/facebook-page/connect"), "primeiro-teste");
  const u = new URL(url);
  assert.match(u.searchParams.get("scope"), /pages_manage_posts/);
  assert.equal(u.searchParams.get("redirect_uri"), "https://n.workers.dev/api/oauth/facebook/callback");
  await assert.rejects(startFacebookPageConnect(env, new Request("https://n.workers.dev/x"), "ragnar-one"), /client_disabled/);
});

test("escolhe a Página do mesmo Instagram", () => {
  const pages = [
    { id: "1", access_token: "a", instagram_business_account: { id: "ig1", username: "outra" } },
    { id: "2", access_token: "b", instagram_business_account: { id: "ig2", username: "flowarts2026" } }
  ];
  assert.equal(pickPage(pages, "@FlowArts2026").id, "2");
  assert.equal(pickPage(pages, "", "ig1").id, "1");
  assert.equal(pickPage(pages, "ninguem"), null);
  assert.equal(pickPage([pages[0]], "ninguem").id, "1");
});

test("retorno do login guarda a chave da Página criptografada", async () => {
  const { env } = setup();
  const state = "estado-teste";
  await putState(env, "oauth-facebook", await sha256Hex(state), "", { kind: "fbpage", clientId: "primeiro-teste", expiresAt: new Date(Date.now() + 60000).toISOString(), returnOrigin: "https://n.workers.dev" });
  const { fetcher } = recorder([
    { access_token: "curto" },
    { access_token: "longo", expires_in: 5000000 },
    { data: [{ id: "999", name: "Flow Arts", access_token: "chave-da-pagina", tasks: ["CREATE_CONTENT"], instagram_business_account: { id: "ig", username: "flowarts2026" } }] }
  ]);
  const url = new URL("https://n.workers.dev/api/oauth/facebook/callback?code=c&state=" + state);
  const res = await handleFacebookCallback(env, new Request(url), url, fetcher);
  assert.equal(res.status, 200);
  const saved = (await getState(env, "facebook-page", "connection", "primeiro-teste")).value;
  assert.equal(saved.pageId, "999");
  assert.ok(!JSON.stringify(saved).includes("chave-da-pagina"));
  const status = await facebookPageStatus(env, "primeiro-teste");
  assert.equal(status.connected, true);
  assert.equal(status.enabled, true);
});

test("sem permissão de publicar, não conecta", async () => {
  const { env } = setup();
  const { fetcher } = recorder([{ data: [{ id: "9", name: "P", access_token: "t", tasks: ["ANALYZE"] }] }]);
  const done = await finishFacebookPageConnect(env, { clientId: "primeiro-teste" }, "u", fetcher);
  assert.equal(done.ok, false);
});

test("só entra na fila com a Página conectada e ligada, e nunca story", async () => {
  const { env } = setup();
  assert.equal((await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "oi", "m1")).queued, false);
  await connect(env);
  assert.equal((await queueFacebookCrosspost(env, "primeiro-teste", { kind: "story", imageUrl: "https://a/1.png" }, "", "s1")).queued, false);
  assert.equal((await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "oi", "m1")).queued, true);
  assert.equal((await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "oi", "m1")).queued, false, "não duplica");
  await setFacebookCrosspost(env, "primeiro-teste", false);
  assert.equal((await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/2.png" }, "oi", "m2")).queued, false);
  const off = setup({ NEXUS_FACEBOOK: "off" });
  await connect(off.env);
  assert.equal((await queueFacebookCrosspost(off.env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "oi", "m1")).queued, false);
});

test("cron publica foto, carrossel e Reel na Página", async () => {
  const { env, db } = setup();
  await connect(env);
  await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "Legenda", "m1");
  let r = recorder([{ id: "ph", post_id: "999_1" }]);
  let out = await runFacebookCrosspostQueue(env, r.fetcher);
  assert.equal(out.facebookPostId, "999_1");
  assert.match(r.calls[0].url, /\/999\/photos$/);
  assert.equal(r.calls[0].body.url, "https://a/1.png");
  assert.equal(r.calls[0].body.caption, "Legenda");
  assert.equal(r.calls[0].body.access_token, "page-token");

  await queueFacebookCrosspost(env, "primeiro-teste", { kind: "carousel", carouselUrls: ["https://a/1.png", "https://a/2.png"] }, "Carrossel", "m2");
  r = recorder([{ id: "f1" }, { id: "f2" }, { id: "999_2" }]);
  out = await runFacebookCrosspostQueue(env, r.fetcher);
  assert.equal(out.facebookPostId, "999_2");
  assert.equal(r.calls[0].body.published, "false");
  assert.match(r.calls[2].url, /\/999\/feed$/);
  assert.equal(r.calls[2].body["attached_media[1]"], JSON.stringify({ media_fbid: "f2" }));

  await queueFacebookCrosspost(env, "primeiro-teste", { kind: "reel", videoUrl: "https://a/v.mp4" }, "Reel", "m3");
  r = recorder([{ id: "vid" }]);
  out = await runFacebookCrosspostQueue(env, r.fetcher);
  assert.match(r.calls[0].url, /\/999\/videos$/);
  assert.equal(r.calls[0].body.file_url, "https://a/v.mp4");

  assert.equal(db.prepare("SELECT COUNT(*) n FROM nexus_state WHERE namespace = ?").get(FB_QUEUE_NS).n, 0);
  assert.equal((await runFacebookCrosspostQueue(env, r.fetcher)).skipped, "empty");
});

test("erro da Meta tenta 3 vezes e depois desiste, guardando o erro", async () => {
  const { env, db } = setup();
  await connect(env);
  await queueFacebookCrosspost(env, "primeiro-teste", { kind: "post", imageUrl: "https://a/1.png" }, "x", "m1");
  for (let i = 1; i <= 3; i++) {
    const r = recorder([{ error: { message: "sem permissão", code: 200 } }]);
    const out = await runFacebookCrosspostQueue(env, r.fetcher);
    assert.equal(out.ok, false);
    assert.equal(out.tries, i);
  }
  assert.equal(db.prepare("SELECT COUNT(*) n FROM nexus_state WHERE namespace = ?").get(FB_QUEUE_NS).n, 0);
  assert.match((await facebookPageStatus(env, "primeiro-teste")).lastError, /sem permissão/);
});
