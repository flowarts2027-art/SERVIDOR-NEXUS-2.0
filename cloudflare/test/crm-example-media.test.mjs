import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { exampleMedia, mediaMessage } from "../src/crm.js";

test("exemplo do nicho vira mídia: carrossel (até 10) ou vídeo; sem exemplo, nada", () => {
  assert.deepEqual(exampleMedia({ kind: "carousel", images: ["https://a/1.jpg", "https://a/2.jpg"] }), { kind: "carousel", files: ["https://a/1.jpg", "https://a/2.jpg"] });
  assert.deepEqual(exampleMedia({ kind: "video", videoUrl: "https://a/v.mp4" }), { kind: "video", files: ["https://a/v.mp4"] });
  assert.equal(exampleMedia({}), null);
  assert.equal(exampleMedia(null), null);
});

test("com mídia, a mensagem vai sem o link do exemplo", () => {
  const msg = "Oi!\n\nEu cuido do Instagram de pet shops. Veja um vídeo que fizemos para pet shops: https://flowarts.com.br/exemplo/pet\n\nPosso fazer um assim?";
  const out = mediaMessage(msg, "video");
  assert.ok(!out.includes("http"));
  assert.match(out, /Vou te mandar aqui embaixo um vídeo que fizemos para pet shops\./);
  const follow = mediaMessage("Oi! Passando aqui.\n\nVeja um carrossel que fizemos para cafeterias: https://flowarts.com.br/exemplo/cafeteria", "carousel");
  assert.ok(!follow.includes("http"));
});

test("CRM do Master baixa o exemplo para anexar manualmente no Instagram", () => {
  const ui = fs.readFileSync(new URL("../../public/crm.js", import.meta.url), "utf8");
  assert.match(ui, /data-share-example/);
  assert.match(ui, /downloadFiles\(files\)/);
});

test("casa de ração virou loja de ração: chave antiga cai no mesmo nicho e no mesmo exemplo", async () => {
  const { showcaseEntry, canonicalNiche } = await import("../src/showcase-store.js");
  const { CAPTADOR_NICHES } = await import("../src/captador.js");
  const map = { racao: { kind: "carousel", images: ["https://a/1.jpg", "https://a/2.jpg"] } };
  assert.equal(canonicalNiche("casa_racao"), "racao");
  assert.equal(showcaseEntry(map, "casa_racao"), map.racao);
  assert.equal(CAPTADOR_NICHES.racao.label, "Loja de ração");
  assert.ok(CAPTADOR_NICHES.agropecuaria, "agropecuária continua separada");
});
