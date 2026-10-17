import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createClientUpload } from "../src/client-uploads.js";
import { instagramPublishTarget } from "../src/publisher.js";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT)");
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  const stored = [];
  return { db, env: { DB, PUBLIC_BASE_URL: "https://n", MEDIA: { put: async key => stored.push(key) } }, stored };
}
const jpg = name => new File([new Uint8Array([255, 216, 255, 1])], name, { type: "image/jpeg" });
const mp4 = () => new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0])], "v.mp4", { type: "video/mp4" });
const now = new Date("2026-10-16T23:00:00Z");
const client = { id: "primeiro-teste", name: "Flow Arts" };

function form(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ date: "2026-10-20", time: "19:00", ...fields })) {
    if (Array.isArray(v)) v.forEach(x => f.append(k, x)); else f.set(k, v);
  }
  return f;
}

test("cliente envia carrossel: na ordem enviada, já aprovado e agendado; formato carrossel", async () => {
  const { db, env, stored } = setup();
  const out = await createClientUpload(env, client, form({ type: "carousel", caption: "Legenda", images: [jpg("1.jpg"), jpg("2.jpg"), jpg("3.jpg")] }), now);
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.approval_status, "approved");
  assert.equal(row.scheduled_for, "2026-10-20T22:00:00.000Z");
  const p = JSON.parse(row.payload_json);
  assert.equal(p.manual, true);
  assert.deepEqual(stored.map(k => k.split("/").pop()), ["cartao-1.jpg", "cartao-2.jpg", "cartao-3.jpg"]);
  assert.deepEqual(instagramPublishTarget(p), { ok: true, kind: "carousel", carouselUrls: p.formatBuild.carouselUrls });
});

test("cliente envia feed, reels e stories (imagem e vídeo)", async () => {
  const { env } = setup();
  const feed = await createClientUpload(env, client, form({ type: "feed", caption: "Oi", images: [jpg("a.jpg")] }), now);
  assert.equal(feed.type, "feed");
  const reel = await createClientUpload(env, client, form({ type: "reel", caption: "Reel", video: [mp4()], cover: [jpg("capa.jpg")] }), now);
  const row = await env.DB.prepare("SELECT payload_json FROM post_ledger WHERE id=?1").bind(reel.id).first();
  assert.equal(instagramPublishTarget(JSON.parse(row.payload_json)).kind, "reel");
  const storyImg = await createClientUpload(env, client, form({ type: "story", images: [jpg("s.jpg")] }), now);
  const s1 = JSON.parse((await env.DB.prepare("SELECT payload_json FROM post_ledger WHERE id=?1").bind(storyImg.id).first()).payload_json);
  assert.equal(instagramPublishTarget(s1).kind, "story");
  assert.ok(instagramPublishTarget(s1).imageUrl);
  const storyVid = await createClientUpload(env, client, form({ type: "story", video: [mp4()], cover: [jpg("c.jpg")] }), now);
  const s2 = JSON.parse((await env.DB.prepare("SELECT payload_json FROM post_ledger WHERE id=?1").bind(storyVid.id).first()).payload_json);
  assert.ok(instagramPublishTarget(s2).videoUrl);
});

test("envio do cliente recusa o que está errado", async () => {
  const { env } = setup();
  await assert.rejects(createClientUpload(env, client, form({ type: "carousel", caption: "x", images: [jpg("1.jpg")] }), now), /images_count/);
  await assert.rejects(createClientUpload(env, client, form({ type: "feed", images: [jpg("1.jpg")] }), now), /caption_required/);
  await assert.rejects(createClientUpload(env, client, form({ type: "reel", caption: "x" }), now), /video_required/);
  await assert.rejects(createClientUpload(env, client, form({ type: "feed", caption: "x", images: [jpg("1.jpg")], date: "2026-10-16", time: "19:00" }), now), /schedule_too_soon/);
  await assert.rejects(createClientUpload(env, { id: "globalplay-streaming" }, form({ type: "feed", caption: "x", images: [jpg("1.jpg")] }), now), /client_invalid/);
});

test("agentes não mexem na legenda de conteúdo pronto; painel tem o envio", () => {
  const ext = fs.readFileSync(new URL("../src/extended-agents.js", import.meta.url), "utf8");
  assert.equal((ext.match(/x\.payload\?\.manual!==true/g) || []).length, 4, "Hook Lab, Story, Viral e Copy Chief");
  const gift = fs.readFileSync(new URL("../src/gift-cta-fix.js", import.meta.url), "utf8");
  assert.match(gift, /'\$\.manual'\),0\) <> 1/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /"\/api\/portal\/uploads"/);
  const html = fs.readFileSync(new URL("../../public/portal.html", import.meta.url), "utf8");
  assert.match(html, /Enviar conteúdo pronto/);
  assert.match(html, /value="story"/);
  assert.match(html, /enviar\.js/);
});
