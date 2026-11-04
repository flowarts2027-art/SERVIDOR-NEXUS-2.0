import test from "node:test";
import assert from "node:assert/strict";
import { clientScreenName, portalGreetingName } from "../src/client-display.js";
import { portalClientView } from "../src/clients.js";
import { clientBrand } from "../src/client-brand.js";

const flow = { id: "primeiro-teste", name: "PRIMEIRO TESTE", niche: "Outro", config: {} };
const quatree = { id: "quatree-dog", name: "Quatree Dog", niche: "Vendas de Raçao Pet", config: {} };
const daniela = { id: "daniela-martins", name: "Daniela Martins", config: {} };

test("a tela mostra Flow Arts, sem mudar o id", () => {
  assert.equal(clientScreenName(flow), "Flow Arts");
  const view = portalClientView(flow);
  assert.equal(view.id, "primeiro-teste");
  assert.equal(view.name, "Flow Arts");
  assert.equal(view.contact.name, "Flow Arts");
});

test("o topo da Quatree mostra o vendedor; o nome salvo e a marca não mudam", () => {
  assert.equal(portalGreetingName(quatree), "Quatree Dog — Vendedor Ericsson");
  assert.equal(clientScreenName(quatree), "Quatree Dog");
  assert.equal(portalClientView(quatree).id, "quatree-dog");
  assert.ok(!String(clientBrand(quatree).brandName).includes("Ericsson"));
});

test("outros clientes continuam com o próprio nome", () => {
  assert.equal(clientScreenName(daniela), "Daniela Martins");
  assert.equal(portalGreetingName(daniela), "");
  assert.equal(portalGreetingName(flow), "");
});
