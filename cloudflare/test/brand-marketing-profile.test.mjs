import test from "node:test";
import assert from "node:assert/strict";
import { clientBrand } from "../src/client-brand.js";

test("perfil de marketing da Flow Arts traz regras, dores e objeções", () => {
  const brand = clientBrand({ id: "primeiro-teste", name: "PRIMEIRO TESTE" });
  assert.match(brand.avoidRules, /preços/);
  assert.match(brand.avoidRules, /Global Play/);
  assert.equal(brand.painPoints.length, 4);
  assert.equal(brand.objections.length, 3);
});

test("cliente sem perfil recebe listas vazias", () => {
  const brand = clientBrand({ id: "outro" });
  assert.equal(brand.avoidRules, "");
  assert.deepEqual(brand.painPoints, []);
  assert.deepEqual(brand.objections, []);
});
