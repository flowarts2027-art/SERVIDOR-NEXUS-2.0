import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { handleBusinessProfilePortal } from "../src/business-profile.js";
import { clientBrand } from "../src/client-brand.js";

const call = async (env, client, body) => {
  const request = new Request("https://painel.flowarts.com.br/api/portal/business", body === undefined
    ? { method: "GET" } : { method: "POST", body: JSON.stringify(body) });
  const response = await handleBusinessProfilePortal(request, env, new URL(request.url), client);
  return { status: response.status, data: await response.json() };
};

test("Meu negócio: o cliente salva o perfil e os agentes passam a usar", async () => {
  const saved = [];
  const env = { DB: { prepare: sql => ({ bind: (...args) => ({ run: async () => { saved.push({ sql, args }); return {}; } }) }) } };
  const client = { id: "quatree-dog", name: "Quatree Dog", niche: "Outro", config: { agentProfile: { agentName: "NEXUS", status: "configured" }, other: 1 } };

  const view = await call(env, client);
  assert.equal(view.data.profile.brandName, "Quatree Dog");
  assert.equal(view.data.profile.niche, "");

  const missing = await call(env, client, { brandName: "Quatree Dog" });
  assert.equal(missing.status, 400);
  assert.match(missing.data.message, /ramo/);

  const ok = await call(env, client, {
    brandName: "Quatree Dog Minas", niche: "Distribuidora de ração", offer: "Revendo ração Quatree para pet shops.",
    audience: "Pet shops e agropecuárias", region: "Minas Gerais", whatsapp: "(34) 99999-1111", services: "<b>Supreme</b>"
  });
  assert.equal(ok.status, 200);
  const config = JSON.parse(saved[0].args[0]);
  assert.equal(saved[0].args[1], "quatree-dog");
  assert.equal(config.other, 1, "o resto da configuração não se perde");
  assert.equal(config.agentProfile.agentName, "NEXUS");
  assert.equal(config.agentProfile.status, "submitted", "volta a aparecer como novo no Master");
  assert.ok(config.agentProfile.submittedAt);
  assert.equal(config.agentProfile.whatsapp, "34999991111");
  assert.doesNotMatch(config.agentProfile.services, /</);

  const brand = clientBrand({ ...client, config });
  assert.equal(brand.brandName, "Quatree Dog Minas");
  assert.equal(brand.niche, "Distribuidora de ração");
  assert.equal(brand.audience, "Pet shops e agropecuárias");

  const badPhone = await call(env, client, { brandName: "A", niche: "B", offer: "C", whatsapp: "123" });
  assert.match(badPhone.data.message, /DDD/);
});

test("aba Meu negócio existe no painel, depois do login", () => {
  const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
  assert.match(read("portal.html"), /data-tab="negocio"/);
  assert.match(read("portal.html"), /id="tab-negocio"/);
  assert.match(read("portal.html"), /negocio\.js/);
  assert.match(read("client-lite.js"), /"negocio"/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.ok(portal.indexOf("handleBusinessProfilePortal(request") > portal.indexOf('if (!session || !client) return json({ error: "unauthorized" }, 401);'));
});
