import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { readyCaption, captionNiche } from "../src/caption-templates.js";
import { masterUpload, legendaPath, githubCaptions } from "../src/master-upload.js";

test("legenda pronta pelo nicho e formato, sem IA, e muda a cada vez", () => {
  const quatree = { id: "quatree-dog", name: "Quatree Dog", niche: "Ração" };
  assert.equal(captionNiche(quatree), "racao");
  const reel = readyCaption(quatree, "reel", 1);
  assert.match(reel, /#racao/);
  assert.match(reel, /play|vídeo/i);
  assert.match(readyCaption(quatree, "carousel", 1), /Arrasta|Desliza|ração/i);
  assert.notEqual(readyCaption(quatree, "post", 1), readyCaption(quatree, "post", 2));
  assert.equal(readyCaption(quatree, "story", 1), "");
  assert.ok(!/R\$|\d+%/.test(reel), "sem preço nem porcentagem");
  assert.equal(captionNiche({ id: "x", name: "Agropecuária Boa Safra" }), "agropecuaria");
  assert.ok(readyCaption({ id: "x", name: "Loja Qualquer" }, "post", 3).length > 40, "sem nicho: legenda genérica");
});

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  db.prepare("INSERT INTO clients(id,name,niche,status,config_json) VALUES('quatree-dog','Quatree Dog','Ração','online','{}')").run();
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB, PUBLIC_BASE_URL: "https://x", MEDIA: { async put() {} } } };
}
const jpg = () => new File([new Uint8Array([255, 216, 255, 217])], "a.jpg", { type: "image/jpeg" });

test("Master sobe post do cliente com legenda pronta; cliente aprova (padrão) ou já aprovado", async () => {
  const { db, env } = fakeEnv();
  const form = new FormData();
  form.set("clientId", "quatree-dog"); form.set("type", "post"); form.set("when", "date");
  form.set("date", "2026-10-20"); form.set("time", "12:00"); form.append("images", jpg());
  const out = await masterUpload(env, form, new Date("2026-10-18T13:00:00Z"));
  assert.equal(out.approval, "pending");
  const row = db.prepare("SELECT caption, approval_status, scheduled_for FROM post_ledger WHERE id=?").get(out.id);
  assert.match(row.caption, /#racao/);
  assert.equal(row.scheduled_for, "2026-10-20T15:00:00.000Z");

  const f2 = new FormData();
  f2.set("clientId", "quatree-dog"); f2.set("type", "carousel"); f2.set("when", "client"); f2.set("approval", "eu");
  f2.append("images", jpg()); f2.append("images", jpg()); f2.set("caption", "Minha legenda");
  const out2 = await masterUpload(env, f2, new Date("2026-10-18T13:00:00Z"));
  const r2 = db.prepare("SELECT caption, approval_status, scheduled_for FROM post_ledger WHERE id=?").get(out2.id);
  assert.equal(r2.approval_status, "approved");
  assert.equal(r2.scheduled_for, null);
  assert.equal(r2.caption, "Minha legenda");
});

test("tela do Master tem tipo, legenda pronta e dia/hora", () => {
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="master-upload-form"/);
  assert.match(html, /value="story">Stories/);
  assert.match(html, /O cliente escolhe o dia/);
});

test("cada postagem do cliente pega um texto diferente (contador por cliente + pula repetida)", async () => {
  const { nextCaption } = await import("../src/master-upload.js");
  const { db, env } = fakeEnv();
  const client = { id: "quatree-dog", name: "Quatree Dog", niche: "Ração" };
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(await nextCaption(env, client, "reel"));
  assert.equal(seen.size, 20);
  // Legenda já usada num post não volta.
  const next = await nextCaption(env, client, "post");
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json,created_at) VALUES('p1','quatree-dog','published','approved',?,'{}','2026-10-18 10:00:00')").run(next);
  db.prepare("UPDATE nexus_state SET value_json='{\"turn\":0}' WHERE namespace='caption-rotation' AND item_key='post'").run();
  assert.notEqual(await nextCaption(env, client, "post"), next);
});

// Página "Enviar artes" (27/10): legendas do ChatGPT lidas do GitHub.

test("legendaPath: Flow Arts na raiz, outro cliente em clientes/<id>", () => {
  assert.equal(legendaPath("primeiro-teste", "2026-10-28", "0900"), "agendamentos/2026-10-28/0900/legenda.txt");
  assert.equal(legendaPath("quatree-dog", "2026-10-28", "1900"), "agendamentos/clientes/quatree-dog/2026-10-28/1900/legenda.txt");
  assert.equal(legendaPath("../x", "2026-10-28", "0900"), "");
  assert.equal(legendaPath("quatree-dog", "28/10/2026", "0900"), "");
});

test("githubCaptions: usa a branch agendamentos e cai para a main", async () => {
  const calls = [];
  const fake = async url => {
    calls.push(url);
    if (url.includes("/agendamentos/agendamentos/2026-10-28/0900/")) return new Response("Legenda 9h");
    if (url.includes("/main/agendamentos/2026-10-28/1200/")) return new Response("Legenda 12h");
    return new Response("", { status: 404 });
  };
  const out = await githubCaptions("primeiro-teste", "2026-10-28", fake);
  assert.deepEqual(out, { "0900": "Legenda 9h", "1200": "Legenda 12h", "1900": "" });
  assert.ok(calls.every(u => u.startsWith("https://raw.githubusercontent.com/flowarts2027-art/SERVIDOR-NEXUS-2.0/")));
});
