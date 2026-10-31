import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleCommercialRadar } from "../src/commercial-radar.js";

function fakeEnv(extra = {}) {
  const sqlite = new DatabaseSync(":memory:");
  return {
    DB: { prepare(sql) {
      function exec(args) {
        const stmt = sqlite.prepare(sql);
        const params = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
        return {
          first: async () => stmt.get(params) || null,
          all: async () => ({ results:stmt.all(params) }),
          run: async () => ({ meta:{ changes:Number(stmt.run(params).changes) } })
        };
      }
      return { ...exec([]), bind:(...args) => exec(args) };
    } },
    ...extra
  };
}
const url = path => new URL("https://painel.flowarts.com.br/api/master/commercial-radar" + path);
async function call(env, path, method = "GET", body = null, origin = "https://painel.flowarts.com.br") {
  const request = new Request(url(path), { method, headers: { origin, ...(body ? { "content-type":"application/json" } : {}) }, body:body ? JSON.stringify(body) : undefined });
  return handleCommercialRadar(request, env, url(path));
}

test("Radar mostra fonte desativada sem declarar que os leads não existem", async () => {
  const env = fakeEnv();
  const res = await call(env, "/status");
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.leadCount, 0);
  assert.equal(data.feedConfigured, false);
  assert.match(data.note, /fonte autorizada/i);
  const discovery = await (await call(env, "/discover", "POST", {})).json();
  assert.equal(discovery.skipped, "authorized_feed_not_configured");
});
test("Radar somente aceita feed HTTPS do host autorizado", async () => {
  const env = fakeEnv({ RADAR_FEED_URL:"https://fonte.example/feed.json", RADAR_FEED_HOST:"outra.example" });
  const data = await (await call(env, "/status")).json();
  assert.equal(data.feedConfigured, false);
});
test("Radar mantém lead separado, exige aprovação antes do link WhatsApp", async () => {
  const env = fakeEnv();
  const record = {
    instagram:"empresa.teste", business:"Empresa Teste", category:"site",
    evidence:"Preciso de um site melhor, o atual está lento",
    evidence_url:"https://example.com/review/123",
    whatsapp:"5522999998888", contact_source:"https://example.com/contact"
  };
  const created = await call(env, "/leads", "POST", record);
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  let list = await (await call(env, "/leads")).json();
  assert.equal(list.leads.length, 1);
  assert.equal(list.leads[0].whatsapp_link, null);
  const rejected = await call(env, "/leads/" + id, "PATCH", { status:"contatado" });
  assert.equal(rejected.status, 409);
  assert.equal((await call(env, "/leads/" + id, "PATCH", { status:"aprovado" })).status, 200);
  list = await (await call(env, "/leads")).json();
  assert.equal(list.leads[0].whatsapp_link, "https://wa.me/5522999998888");
});
test("Radar rejeita POST de outra origem", async () => {
  const env = fakeEnv();
  const res = await call(env, "/discover", "POST", {}, "https://evil.example");
  assert.equal(res.status, 403);
});
test("Integração no portal exige sessão do cliente Flow Arts", () => {
  const src = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(src, /portal\.clientId !== SHOWCASE_CLIENT/);
  assert.match(src, /crm\|prospects\|showcase\|push\|commercial-radar/);
  assert.match(src, /rest\.startsWith\("commercial-radar"\)/);
});
