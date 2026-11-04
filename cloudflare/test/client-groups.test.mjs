import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { CLIENT_GROUPS, clientGroup, portalClientView } from "../src/clients.js";
import { ensureGroupClients, groupFromTarget, groupOptions, vendorCaption } from "../src/client-groups.js";
import { masterUpload } from "../src/master-upload.js";
import { enviarArte, listarClientesEGrupos } from "../src/mcp-server.js";

const group = { id: "quatree-dog", ...CLIENT_GROUPS["quatree-dog"] };
const NOW = new Date("2026-10-18T13:00:00Z");

function fakeEnv({ failPut } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES('quatree-dog','Quatree Dog','Ração','@ericsson_quatree','online','{}')").run();
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const puts = [];
  const MEDIA = { async put(key, body) {
    if (failPut && key.includes(failPut)) throw new Error("r2_unavailable");
    puts.push({ key, size: body?.byteLength ?? body?.size ?? 0 });
  } };
  return { db, puts, env: { DB, PUBLIC_BASE_URL: "https://x", MEDIA } };
}
const jpg = () => new File([new Uint8Array([255, 216, 255, 217])], "a.jpg", { type: "image/jpeg" });
function campaign(caption = "Linha Supreme para a sua loja. O Ericsson entrega.\n\n#racao") {
  const form = new FormData();
  form.set("clientId", "grupo:quatree-dog"); form.set("type", "post"); form.set("when", "date");
  form.set("date", "2026-10-20"); form.set("time", "12:00"); form.set("caption", caption);
  form.append("images", jpg());
  return form;
}
const rows = db => db.prepare("SELECT client_id, caption, approval_status, scheduled_for FROM post_ledger ORDER BY client_id").all();

test("cada vendedor tem o seu painel no grupo, com o mesmo tema", () => {
  assert.deepEqual(clientGroup("quatree-dog"), { id: "quatree-dog", name: "Quatree Dog", theme: "quatree-dog", vendor: "Ericsson" });
  assert.equal(clientGroup("quatree-dog-eduardo").vendor, "Eduardo");
  assert.equal(clientGroup("quatree-dog-eduardo").theme, "quatree-dog");
  assert.equal(clientGroup("daniela-martins"), null);
  assert.equal(portalClientView({ id: "quatree-dog-eduardo", name: "x", config: {} }).group.vendor, "Eduardo");
  assert.equal(portalClientView({ id: "daniela-martins", name: "Daniela", config: {} }).group, null);
});

test("destino de grupo só vale para grupo que existe", () => {
  assert.equal(groupFromTarget("grupo:quatree-dog").name, "Quatree Dog");
  assert.equal(groupFromTarget("grupo:nao-existe"), null);
  assert.equal(groupFromTarget("quatree-dog"), null);
  assert.deepEqual(groupOptions(), [{ id: "grupo:quatree-dog", name: "Grupo: Quatree Dog (Ericsson e Eduardo)" }]);
});

test("a legenda leva o nome do vendedor e varia entre eles", () => {
  const base = "Linha Supreme. Fale com {vendedor}.\n\n#racao #quatree";
  const a = vendorCaption(base, group, 0);
  const b = vendorCaption(base, group, 1);
  assert.match(a, /Ericsson/); assert.doesNotMatch(a, /Eduardo/);
  assert.match(b, /Eduardo/); assert.doesNotMatch(b, /Ericsson/);
  assert.notEqual(a.replace(/Ericsson/g, "X"), b.replace(/Eduardo/g, "X"));
  assert.match(b, /#racao #quatree$/, "hashtags continuam no fim");
  assert.doesNotMatch(a, /\{vendedor\}/);
});

test("vendedor não herda o telefone nem o @ do outro", () => {
  const base = "Linha Supreme.\nWhatsApp: (34) 99999-0000\nhttps://wa.me/5534999990000\nSiga @ericsson_quatree\nEntrega na sua loja.";
  const a = vendorCaption(base, group, 0);
  const b = vendorCaption(base, group, 1);
  assert.match(a, /99999-0000/); assert.match(a, /@ericsson_quatree/);
  assert.doesNotMatch(b, /99999|wa\.me|ericsson/i);
  assert.match(b, /Entrega na sua loja/);
});

test("o Eduardo nasce em configuração, sem Instagram, e não duplica", async () => {
  const { db, env } = fakeEnv();
  await ensureGroupClients(env);
  await ensureGroupClients(env);
  const row = db.prepare("SELECT name, niche, instagram, status FROM clients WHERE id='quatree-dog-eduardo'").get();
  assert.deepEqual({ ...row }, { name: "Quatree Dog Eduardo", niche: "Ração", instagram: "", status: "setup" });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM portal_users WHERE client_id='quatree-dog-eduardo'").get().n, 0);
});

test("campanha do grupo sobe para todos, com as mesmas imagens e esperando aprovação", async () => {
  const { db, puts, env } = fakeEnv();
  const out = await masterUpload(env, campaign(), NOW);
  assert.equal(out.ok, true);
  assert.deepEqual(out.results.map(r => [r.vendor, r.ok]), [["Ericsson", true], ["Eduardo", true]]);
  const posts = rows(db);
  assert.deepEqual(posts.map(p => p.client_id), ["quatree-dog", "quatree-dog-eduardo"]);
  for (const post of posts) {
    assert.equal(post.approval_status, "pending");
    assert.equal(post.scheduled_for, "2026-10-20T15:00:00.000Z");
  }
  assert.match(posts[0].caption, /Ericsson/); assert.doesNotMatch(posts[0].caption, /Eduardo/);
  assert.match(posts[1].caption, /Eduardo/); assert.doesNotMatch(posts[1].caption, /Ericsson/);
  assert.equal(puts.length, 2);
  assert.equal(puts[0].size, puts[1].size);
});

test("legenda vazia usa a pronta do nicho e ainda leva o vendedor", async () => {
  const { db, env } = fakeEnv();
  await masterUpload(env, campaign(""), NOW);
  const posts = rows(db);
  assert.match(posts[0].caption, /Ericsson/);
  assert.match(posts[1].caption, /Eduardo/);
});

test("story do grupo sobe sem legenda", async () => {
  const { db, env } = fakeEnv();
  const form = campaign();
  form.set("type", "story");
  const out = await masterUpload(env, form, NOW);
  assert.equal(out.ok, true);
  assert.deepEqual(rows(db).map(p => p.caption || ""), ["", ""]);
});

test("falha parcial avisa quem ficou de fora, e reenviar não duplica", async () => {
  const { db, env } = fakeEnv({ failPut: "quatree-dog-eduardo" });
  const out = await masterUpload(env, campaign(), NOW);
  assert.equal(out.ok, false);
  assert.match(out.message, /Subiu para: Ericsson/);
  assert.match(out.message, /Faltou: Eduardo/);
  env.MEDIA = { async put() {} };
  const retry = await masterUpload(env, campaign(), NOW);
  assert.deepEqual(retry.results.map(r => [r.vendor, r.ok]), [["Ericsson", false], ["Eduardo", true]]);
  assert.deepEqual(rows(db).map(p => p.client_id), ["quatree-dog", "quatree-dog-eduardo"]);
});

test("se todos falham, o erro original aparece", async () => {
  const { env } = fakeEnv();
  const form = campaign();
  form.set("date", "2026-10-18"); form.set("time", "10:05");
  await assert.rejects(masterUpload(env, form, NOW), /schedule_too_soon/);
});

test("o conector envia para o grupo e lista os grupos", async () => {
  const { db, env } = fakeEnv();
  env.NEXUS_MCP_TOKEN = "x".repeat(32);
  const deps = {
    upload: masterUpload,
    download: async () => new Response(new Uint8Array([255, 216, 255, 217]), { headers: { "content-type": "image/jpeg" } }),
    getClient: async () => { throw new Error("grupo não busca cliente"); },
    listClients: async () => []
  };
  const out = await enviarArte(env, deps, {
    cliente_id: "grupo:quatree-dog", formato: "post", dia: "2026-10-20", hora: "12:00",
    legenda: "Linha Supreme.", imagens_urls: ["https://x/a.jpg"]
  }, NOW);
  assert.equal(out.ok, true);
  assert.deepEqual(out.vendedores.map(v => v.vendor), ["Ericsson", "Eduardo"]);
  assert.equal(rows(db).length, 2);
  assert.deepEqual((await listarClientesEGrupos(env, deps)).grupos, groupOptions());
});

test("painel usa o tema do grupo e mostra o campo Vendedor", () => {
  const js = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.ok(js.includes("state.client?.group?.theme || state.client?.id"));
  assert.ok(js.includes("<h2>Vendedor</h2>"));
});
