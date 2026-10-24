import test from "node:test";
import assert from "node:assert/strict";
import { catalogFor, ownedPlans, planGroup, pixFor } from "../src/upgrades.js";
import { crc16 } from "../src/plans.js";

test("upgrade: catálogo mostra todos os planos e marca o que o cliente tem", () => {
  const client = { config: { plan: { id: "completo", name: "Completo" } } };
  const list = catalogFor(client);
  assert.ok(list.length >= 10);
  assert.equal(list.find(p => p.id === "completo").current, true);
  assert.equal(list.find(p => p.id === "captador").owned, true); // brinde do Completo
  const combo = list.find(p => p.id === "completo-trafego");
  assert.equal(combo.highlight, true);
  assert.match(combo.upgradeNote, /R\$ 200 a mais/);
  assert.equal(catalogFor(client, "pessoas").some(p => p.id === "captador"), false);
});

test("upgrade: grupos e Pix com valor", () => {
  assert.equal(planGroup("completo-trafego"), "base");
  assert.equal(planGroup("trafego"), "adicional");
  assert.equal(planGroup("logo"), "unico");
  assert.ok(ownedPlans({ config: { plan: { id: "completo-trafego" } } }).has("trafego"));
  const pix = pixFor("completo-trafego");
  assert.match(pix, /5406897\.00/);
  assert.equal(pix.slice(-4), crc16(pix.slice(0, -4)));
});
