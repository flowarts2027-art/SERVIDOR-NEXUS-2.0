import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const agentCore=fs.readFileSync(new URL("../src/agent-core.js",import.meta.url),"utf8");
const extended=fs.readFileSync(new URL("../src/extended-agents.js",import.meta.url),"utf8");
const executor=fs.readFileSync(new URL("../src/executor.js",import.meta.url),"utf8");
const publisher=fs.readFileSync(new URL("../src/publisher.js",import.meta.url),"utf8");
const index=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
const formatBuilder=fs.readFileSync(new URL("../src/format-builder.js",import.meta.url),"utf8");

test("FORMAT BUILDER is registered between Designer and Video",()=>{
  assert.match(agentCore,/designer"[\s\S]*?"format-builder"[\s\S]*?"video"/);
  assert.match(extended,/config\.modules\["format-builder"\][\s\S]*?runFormatBuilder/);
});

test("Global Play publisher routes real carousel and Reel formats",()=>{
  assert.match(executor,/publishInstagramPost/);
  assert.match(executor,/quality\.formatBuilder !== "approved"/);
  assert.match(publisher,/instagramPublishTarget/);
  assert.match(publisher,/requestedFormat === "carousel"[\s\S]*?kind:"carousel"/);
  assert.match(publisher,/requestedFormat === "reel"[\s\S]*?kind:"reel"/);
  assert.match(publisher,/media_type: "CAROUSEL"/);
  assert.match(publisher,/media_type: "REELS"/);
});

test("secure social-format callback is wired into Worker",()=>{
  assert.match(index,/handleSocialFormatRenderCallback/);
  assert.match(index,/FORMAT BUILDER/);
});

test("carousel builder adds commercial overlay titles to every card",()=>{
  assert.match(formatBuilder,/streaming-story-v4-commercial-overlay/);
  assert.match(formatBuilder,/overlay:"CHEGA DE TRAVAR"/);
  assert.match(formatBuilder,/overlay:"TUDO NUM LUGAR"/);
  assert.match(formatBuilder,/overlay:"ATIVA DIRETO"/);
  assert.match(formatBuilder,/overlay:"DIGITE QUERO"/);
  assert.match(formatBuilder,/title: card\.overlay/);
  assert.match(formatBuilder,/not generic lifestyle stock photography/);
});

test("card 2 do carrossel nunca escreve a descrição da cena na arte", async () => {
  const { firstTipOverlay } = await import("../src/format-builder.js");
  const t = firstTipOverlay({ scene: "Balcão de uma pequena loja fictícia, com cartaz de atendimento" });
  assert.equal(t, "1. Comece por aqui");
  assert.equal(firstTipOverlay({ angle: "tutorial de bio" }), "1. Tutorial de bio");
  assert.ok(!firstTipOverlay({ angle: "checklist de 5 itens que quem nunca te viu olha primeiro" }).includes("…"));
});
