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

test("carrossel esperando aprovação é montado antes; ajuste pedido descarta as imagens antigas", async () => {
  const src = fs.readFileSync(new URL("../src/format-builder.js", import.meta.url), "utf8");
  assert.match(src, /approval_status='approved'\s*--[\s\S]*?OR \(approval_status='pending'[\s\S]*?requestedFormat'\)='carousel'\)/);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE scheduled_jobs(id TEXT PRIMARY KEY, client_id TEXT, kind TEXT, due_at TEXT, status TEXT, attempts INTEGER, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE support_tickets(id TEXT PRIMARY KEY, client_id TEXT, subject TEXT, message TEXT, status TEXT, priority TEXT, source TEXT, created_at TEXT, updated_at TEXT);`);
  const payload = { imageUrl: "https://x/capa.jpg", creativeFeatures: { requestedFormat: "carousel" }, formatBuild: { kind: "carousel", carouselUrls: ["https://x/1.jpg", "https://x/2.jpg"] } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json) VALUES('c1','primeiro-teste','ready','pending','x',?)").run(JSON.stringify(payload));
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => { try { return db.prepare(sql).get(p) || null; } catch { return null; } }, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => { try { return { meta: { changes: Number(db.prepare(sql).run(p).changes) } }; } catch { return { meta: { changes: 0 } }; } } };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  const { requestPostRevision } = await import("../src/posts.js");
  await requestPostRevision({ DB }, { id: "primeiro-teste", name: "Flow Arts" }, "c1", "Troque a capa").catch(() => {});
  const saved = JSON.parse(db.prepare("SELECT payload_json FROM post_ledger WHERE id='c1'").get().payload_json);
  assert.deepEqual(saved.formatBuild, {});
});

test("carrossel enviado pronto sai como está, sem gerar imagem por IA (GILTEC 29/10)", async () => {
  const { isUploadedCarousel, uploadedCarouselCards } = await import("../src/format-builder.js");
  const enviado = { source:"master:upload", formatBuild:{ status:"failed", kind:"carousel", source:"client-upload", attempts:3, error:"image_generation_paused",
    carouselUrls:["https://x.workers.dev/a/cartao-1.jpg","https://x.workers.dev/a/cartao-2.jpg"] } };
  assert.equal(isUploadedCarousel(enviado), true);
  assert.equal(uploadedCarouselCards(enviado).length, 2);
  assert.equal(isUploadedCarousel({ source:"agent", formatBuild:{ carouselUrls:["https://a","https://b"] } }), false);
  assert.equal(isUploadedCarousel({ source:"master:upload", formatBuild:{ carouselUrls:["https://a"] } }), false);
  const src = fs.readFileSync(new URL("../src/format-builder.js", import.meta.url), "utf8");
  assert.ok(src.indexOf("isUploadedCarousel(payload)") < src.indexOf("formatAttempts>=3"), "upload é liberado antes do limite de tentativas");
});
