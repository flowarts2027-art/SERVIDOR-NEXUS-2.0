import test from "node:test";
import assert from "node:assert/strict";
import { catalogFor, ownedPlans, planGroup, pixFor } from "../src/upgrades.js";
import { crc16 } from "../src/plans.js";

test("upgrade: catálogo mostra os planos novos e marca o que o cliente tem (02/11)", () => {
  const client = { config: { plan: { id: "postador", name: "Postador Automático" }, addons: [{ id: "resposta" }] } };
  const list = catalogFor(client);
  assert.deepEqual(list.map(p => p.id), ["postador", "resposta", "trafego", "site", "logo"]);
  assert.equal(list.find(p => p.id === "postador").current, true);
  assert.equal(list.find(p => p.id === "postador").highlight, true);
  assert.equal(list.find(p => p.id === "resposta").owned, true);
  assert.equal(list.some(p => p.id === "captador"), false);
});

test("upgrade: grupos e Pix com valor", () => {
  assert.equal(planGroup("postador"), "base");
  assert.equal(planGroup("resposta"), "adicional");
  assert.equal(planGroup("trafego"), "adicional");
  assert.equal(planGroup("logo"), "unico");
  const pix = pixFor("resposta");
  assert.match(pix, /540539\.90/);
  assert.equal(pix.slice(-4), crc16(pix.slice(0, -4)));
});
