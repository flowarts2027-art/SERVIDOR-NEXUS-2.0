import test from "node:test";
import assert from "node:assert/strict";
import { demoPostView, handlePortalApi } from "../src/portal.js";
import { BLOCKED_PUBLISH_CLIENTS } from "../src/publisher.js";
import { clientBrand, IMAGE_GENERATION_CLIENTS, DEMO_CLIENT_ID } from "../src/client-brand.js";

test("café de demonstração nunca publica e pode gerar imagens", () => {
  assert.equal(DEMO_CLIENT_ID, "demo-cafe");
  assert.ok(BLOCKED_PUBLISH_CLIENTS.has("demo-cafe"));
  assert.ok(IMAGE_GENERATION_CLIENTS.has("demo-cafe"));
  assert.equal(clientBrand({ id: "demo-cafe" }).brandName, "Café Brisa");
});

test("post da demonstração expõe só campos seguros", () => {
  const view = demoPostView({
    id: "p1", status: "draft", approvalStatus: "pending", caption: "Oi",
    imageUrl: "https://x.test/a.png", error: "segredo", payload: { prompt: "interno" },
    formatBuild: { kind: "carousel", carouselUrls: ["https://x.test/1.png", "javascript:alert(1)"], token: "x" },
    creativeFeatures: { requestedFormat: "carousel", secret: 1 }
  });
  assert.deepEqual(Object.keys(view).sort(), ["approvalStatus", "caption", "creativeFeatures", "formatBuild", "id", "imageUrl", "publishedAt", "scheduledFor", "status", "updatedAt"]);
  assert.deepEqual(view.formatBuild.carouselUrls, ["https://x.test/1.png"]);
  assert.equal(view.formatBuild.token, undefined);
  assert.equal(view.creativeFeatures.secret, undefined);
});

test("rota pública da demonstração lê só o cliente demo-cafe", async () => {
  let boundId = null;
  const env = { DB: { prepare: () => ({ bind: id => { boundId = id; return { all: async () => ({ results: [
    { id: "a", client_id: "demo-cafe", status: "draft", approval_status: "pending", caption: "Café", payload_json: JSON.stringify({ imageUrl: "https://x.test/a.png" }) },
    { id: "b", client_id: "demo-cafe", status: "draft", approval_status: "rejected", caption: "Ruim", payload_json: "{}" }
  ] }) }; } }) } };
  const url = new URL("https://nexus.test/api/demo/panel");
  const res = await handlePortalApi(new Request(url), env, url, { waitUntil() {} });
  const data = await res.json();
  assert.equal(boundId, "demo-cafe");
  assert.equal(data.demo, true);
  assert.equal(data.posts.length, 1);
  assert.equal(data.posts[0].imageUrl, "https://x.test/a.png");
  assert.match(data.whatsapp, /wa\.me\/5521964816185/);
});

test("/demo redireciona para o painel em modo demonstração", async () => {
  const url = new URL("https://nexus.test/demo");
  const res = await handlePortalApi(new Request(url), {}, url, {});
  assert.equal(res.status, 303);
  assert.match(res.headers.get("location"), /portal\.html\?demo=1/);
});
