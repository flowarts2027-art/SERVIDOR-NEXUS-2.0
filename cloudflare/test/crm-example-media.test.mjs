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

test("CRM do Master tem o passo 2 que manda o exemplo pelo compartilhar do celular", () => {
  const ui = fs.readFileSync(new URL("../../public/crm.js", import.meta.url), "utf8");
  assert.match(ui, /data-share-example/);
  assert.match(ui, /navigator\.share\(\{ files \}\)/);
});

test("casa de ração usa o exemplo da loja de ração quando não tem o próprio", async () => {
  const { showcaseEntry, showcaseLine } = await import("../src/showcase-store.js");
  const map = { racao: { kind: "carousel", images: ["https://a/1.jpg", "https://a/2.jpg"] } };
  assert.equal(showcaseEntry(map, "casa_racao"), map.racao);
  assert.match(showcaseLine(map, "casa_racao", "casas de ração"), /carrossel/);
  assert.equal(showcaseEntry(map, "bar"), undefined);
});
