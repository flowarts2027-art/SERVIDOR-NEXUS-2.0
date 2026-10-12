import test from "node:test";
import assert from "node:assert/strict";
import { reviewCopy } from "../src/brand-guard.js";

const fa = { id: "primeiro-teste" };
const codes = text => reviewCopy(fa, text).map(w => w.code);

test("aponta promessa, preço, marca antiga, pressa falsa e prova inventada", () => {
  assert.deepEqual(codes("Resultado garantido no seu Instagram"), ["promessa"]);
  assert.deepEqual(codes("Ganhe 1000 seguidores em 30 dias"), ["promessa"]);
  assert.deepEqual(codes("Plano por R$ 697 por mês"), ["preco"]);
  assert.deepEqual(codes("Como fazíamos na Global Play"), ["marca_antiga"]);
  assert.deepEqual(codes("Só hoje: exemplo grátis"), ["pressa_falsa"]);
  assert.deepEqual(codes("Mais de 200 clientes já usam"), ["prova_inventada"]);
});

test("legenda normal da Flow Arts não recebe aviso", () => {
  const ok = "Seu Instagram parado está custando clientes.\n\nA Flow Arts prepara os posts e você só aprova.\n\nComente QUERO e receba um exemplo grátis.\n\n#FlowArts #MarketingDigital";
  assert.deepEqual(reviewCopy(fa, ok), []);
});

test("cliente sem perfil de marca não é conferido", () => {
  assert.deepEqual(reviewCopy({ id: "outro-cliente" }, "Resultado garantido R$ 10"), []);
});
