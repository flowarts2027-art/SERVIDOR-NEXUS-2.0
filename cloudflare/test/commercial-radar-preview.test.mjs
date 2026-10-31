import test from "node:test";
import assert from "node:assert/strict";
import preview from "../src/commercial-radar-preview.js";

const base = "https://radar-preview.example";
function env() {
  const requests = [];
  return {
    requests,
    PREVIEW_PASSWORD: "senha-de-teste",
    DB: {},
    ASSETS: { async fetch(request) {
      requests.push(new URL(request.url).pathname);
      return new Response("asset", { status: 200 });
    } },
  };
}
const authorized = (path) => new Request(base + path, {
  headers: { Authorization: "Basic " + btoa("flowarts:senha-de-teste") },
});

test("preview recusa acesso sem configuração ou D1", async () => {
  const e = env(); delete e.DB;
  const r = await preview.fetch(authorized("/commercial-radar"), e);
  assert.equal(r.status, 503);
  assert.equal(e.requests.length, 0);
});

test("preview recusa acesso sem senha sem revelar assets", async () => {
  const e = env();
  const r = await preview.fetch(new Request(base + "/commercial-radar"), e);
  assert.equal(r.status, 401);
  assert.match(r.headers.get("www-authenticate"), /Basic/);
  assert.deepEqual(e.requests, []);
});

test("preview recusa credenciais incorretas", async () => {
  const e = env();
  const r = await preview.fetch(new Request(base + "/commercial-radar", {
    headers: { Authorization: "Basic " + btoa("flowarts:senha-errada") },
  }), e);
  assert.equal(r.status, 401);
  assert.deepEqual(e.requests, []);
});

test("preview serve somente assets autorizados com cache e robôs bloqueados", async () => {
  const e = env();
  const r = await preview.fetch(authorized("/commercial-radar"), e);
  assert.equal(r.status, 200);
  assert.deepEqual(e.requests, ["/commercial-radar.html"]);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});

test("preview impede acesso a campanhas e outras rotas", async () => {
  const e = env();
  const r = await preview.fetch(authorized("/api/master/campanhas"), e);
  assert.equal(r.status, 404);
  assert.deepEqual(e.requests, []);
});
