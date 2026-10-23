import test from "node:test";
import assert from "node:assert/strict";
import { withOrderCode, orderCodeLine, readyCaption } from "../src/caption-templates.js";
import { normalizeBusinessProfile } from "../src/business-profile.js";

const client = { id: "padaria-x", name: "Padaria X", niche: "Padaria", config: { agentProfile: { brandName: "Padaria X", niche: "Padaria", orderCode: "PAO10", whatsapp: "21999998888" } } };

test("código de pedido: entra antes das hashtags, com o WhatsApp", () => {
  const out = withOrderCode(client, "Pão quentinho.\n\nVem buscar!\n\n#padaria #pao");
  assert.equal(out, "Pão quentinho.\n\nVem buscar!\n\n📲 Para pedir, chame no WhatsApp (21) 99999-8888 e diga: PAO10\n\n#padaria #pao");
});

test("código de pedido: não repete e não mexe sem código", () => {
  const once = withOrderCode(client, "Oi\n\n#a");
  assert.equal(withOrderCode(client, once), once);
  assert.equal(withOrderCode({ id: "y" }, "Oi\n\n#a"), "Oi\n\n#a");
  assert.equal(orderCodeLine({ id: "y" }), "");
  assert.match(readyCaption(client, "post", 3), /diga: PAO10/);
});

test("código de pedido: o painel limpa o texto", () => {
  const p = normalizeBusinessProfile({ brandName: "A", niche: "B", offer: "C", orderCode: " pão 10! " });
  assert.equal(p.orderCode, "PAO10");
});
