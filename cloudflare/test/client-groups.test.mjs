import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { CLIENT_GROUPS, brandClientId, clientGroup, isFixedGroupMember, portalClientView } from "../src/clients.js";
import { ensureGroupClients, groupChoice, groupFromTarget, groupMembers, groupOptions, vendorCaption } from "../src/client-groups.js";
import { masterUpload } from "../src/master-upload.js";
import { enviarArte, listarClientesEGrupos } from "../src/mcp-server.js";
import { handleMaster } from "../src/master.js";
import { resetFramesCache } from "../src/art-frame.js";
import { handleArtText } from "../src/art-text.js";
import { captadorMessage, captadorPreset, defaultConfig } from "../src/captador.js";
import { RJ_STATE_CITIES } from "../src/captador-regions.js";

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

test("destino de grupo só vale para grupo que existe", async () => {
  assert.equal(groupFromTarget("grupo:quatree-dog").name, "Quatree Dog");
  assert.equal(groupFromTarget("grupo:nao-existe"), null);
  assert.equal(groupFromTarget("quatree-dog"), null);
  assert.deepEqual(await groupOptions(fakeEnv().env), [
    { id: "grupo:quatree-dog", name: "Grupo: Quatree Dog (Ericsson e Eduardo)" },
    { id: "grupo:giltec", name: "Grupo: GILTEC (Rose)" }
  ]);
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
  assert.deepEqual((await listarClientesEGrupos(env, deps)).grupos, await groupOptions(env));
});

test("painel usa o tema do grupo e mostra o campo Vendedor", () => {
  const js = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  assert.ok(js.includes("state.client?.group?.theme || state.client?.id"));
  assert.ok(js.includes('state.client.group.vendorLabel || "Vendedor"'));
});

// ---------- Grupo GILTEC (05/11/2026) ----------
const addClient = (db, id, name, instagram, config = {}, status = "setup") =>
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES(?,?,?,?,?,?)")
    .run(id, name, "Locação de equipamentos para construção civil", instagram, status, JSON.stringify(config));
const sheila = { id: "giltec-locacoes", name: "Giltec Locações", config: { group: { id: "giltec", vendor: "Sheila" } } };
function giltecEnv(options) {
  const out = fakeEnv(options);
  addClient(out.db, "giltec", "Giltec", "@rose.giltec3", {}, "online");
  addClient(out.db, sheila.id, sheila.name, "sheilavendas3", sheila.config);
  return out;
}
function giltecCampaign(caption = "Compactador para a sua obra. Fale com a Rose.\n\nSiga @rose.giltec3\n\n#GILTEC #ObrasRJ") {
  const form = campaign(caption);
  form.set("clientId", "grupo:giltec");
  return form;
}

test("a Rose é fixa no grupo e a Sheila entra pelo campo Grupo", () => {
  assert.deepEqual(clientGroup("giltec"), { id: "giltec", name: "GILTEC", theme: "giltec", vendor: "Rose", vendorLabel: "Vendedora" });
  assert.deepEqual(clientGroup(sheila), { id: "giltec", name: "GILTEC", theme: "giltec", vendor: "Sheila", vendorLabel: "Vendedora" });
  assert.equal(portalClientView(sheila).group.vendor, "Sheila");
  assert.equal(clientGroup("giltec-locacoes"), null, "só o id não basta");
  assert.equal(clientGroup({ id: "x", config: { group: { id: "constructor", vendor: "Ana" } } }), null);
  assert.equal(isFixedGroupMember("giltec"), true);
  assert.equal(isFixedGroupMember("giltec-locacoes"), false);
});

test("o código não cria painel para a Sheila", async () => {
  const { db, env } = fakeEnv();
  addClient(db, "giltec", "Giltec", "@rose.giltec3", {}, "online");
  await ensureGroupClients(env);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM clients WHERE id LIKE 'giltec%'").get().n, 1);
});

test("campo Grupo aceita só grupo da lista e nome de verdade", () => {
  assert.deepEqual(groupChoice({ group: "grupo:giltec", vendor: "  Sheila  " }), { id: "giltec", vendor: "Sheila" });
  assert.equal(groupChoice({ group: "", vendor: "Sheila" }), null);
  assert.throws(() => groupChoice({ group: "grupo:nao-existe", vendor: "Ana" }), /group_invalid/);
  assert.throws(() => groupChoice({ group: "constructor", vendor: "Ana" }), /group_invalid/);
  assert.throws(() => groupChoice({ group: "giltec", vendor: "" }), /group_vendor_invalid/);
  assert.throws(() => groupChoice({ group: "giltec", vendor: "Ana.*" }), /group_vendor_invalid/);
});

test("legenda da GILTEC: vendedora, fechamento diferente e sem o @ da Rose", async () => {
  const { env } = giltecEnv();
  const team = { id: "giltec", ...CLIENT_GROUPS.giltec };
  team.members = await groupMembers(env, team);
  const base = "Compactador para a sua obra. Fale com a Rose.\n\nSiga @rose.giltec3\n\n#GILTEC";
  const a = vendorCaption(base, team, 0);
  const b = vendorCaption(base, team, 1);
  assert.match(a, /vendedora Rose/); assert.match(a, /@rose\.giltec3/); assert.doesNotMatch(a, /Sheila/);
  assert.match(b, /vendedora Sheila/); assert.doesNotMatch(b, /Rose|rose/);
  assert.doesNotMatch(b, /tabela/, "fechamento da ração não vale para locação");
  assert.notEqual(a.replace(/Rose/g, "X"), b.replace(/Sheila/g, "X"));
  assert.match(b, /#GILTEC$/);
});

test("troca nome com acento na legenda", () => {
  const team = { members: [{ clientId: "a", vendor: "Rose" }, { clientId: "b", vendor: "Sônia" }] };
  assert.match(vendorCaption("Fale com a Sônia.", team, 0), /Fale com a Rose\./);
});

test("campanha da GILTEC sobe para as duas, com as mesmas imagens, e não toca na Quatree", async () => {
  const { db, puts, env } = giltecEnv();
  addClient(db, "giltec-antiga", "Antiga", "", { group: { id: "giltec", vendor: "Marta" } }, "archived");
  const out = await masterUpload(env, giltecCampaign(), NOW);
  assert.equal(out.ok, true);
  assert.deepEqual(out.results.map(r => [r.vendor, r.ok]), [["Rose", true], ["Sheila", true]]);
  const posts = rows(db);
  assert.deepEqual(posts.map(p => p.client_id), ["giltec", "giltec-locacoes"]);
  for (const post of posts) assert.equal(post.approval_status, "pending");
  assert.match(posts[1].caption, /Sheila/); assert.doesNotMatch(posts[1].caption, /Rose/);
  assert.equal(puts.length, 2);
  assert.equal(puts[0].size, puts[1].size);
  assert.deepEqual((await groupOptions(env))[1], { id: "grupo:giltec", name: "Grupo: GILTEC (Rose e Sheila)" });
});

test("imagem sem texto da GILTEC pede a moldura com a logo; a Quatree continua sem", async () => {
  const framesAsked = async form => {
    resetFramesCache();
    const { env } = giltecEnv();
    let asked = 0;
    env.ASSETS = { fetch: async () => { asked += 1; return new Response("{}", { status: 404 }); } };
    await masterUpload(env, form, NOW);
    return asked;
  };
  assert.ok(await framesAsked(giltecCampaign()) > 0);
  assert.equal(await framesAsked(campaign()), 0);
});

test("a Sheila herda da marca GILTEC; o Eduardo não muda", async () => {
  const eduardo = { id: "quatree-dog-eduardo", name: "Quatree Dog Eduardo", config: {} };
  assert.equal(brandClientId(sheila), "giltec");
  assert.equal(brandClientId({ id: "giltec", config: {} }), "giltec");
  assert.equal(brandClientId(eduardo), "quatree-dog-eduardo");
  assert.equal(brandClientId({ id: "daniela-martins", config: {} }), "daniela-martins");
  const big = { image: "x".repeat(2_000_001) };
  const art = await handleArtText({}, sheila, big);
  assert.equal(art.logo, "/brand/giltec-logo.png");
  assert.ok(art.text);
  assert.equal((await handleArtText({}, eduardo, big)).text, null);
});

test("Captador: a Sheila busca no RJ e a mensagem sai no nome dela", () => {
  const preset = captadorPreset(sheila);
  assert.equal(preset.config.myName, "Sheila");
  assert.equal(preset.config.business, "GILTEC Locações");
  assert.equal(preset.access.enabled, true);
  assert.equal(preset.daily.cities, RJ_STATE_CITIES);
  assert.equal(captadorPreset({ id: "giltec", config: {} }).config.myName, "Rose");
  assert.equal(captadorPreset({ id: "quatree-dog-eduardo", config: {} }), null);
  assert.equal(captadorPreset({ id: "daniela-martins", config: {} }), null);
  const text = captadorMessage(defaultConfig(sheila), { name: "Obra Alfa", city: "Niterói" });
  assert.match(text, /Aqui é Sheila, da GILTEC Locações/);
  assert.doesNotMatch(text, /Rose/);
});

test("Master tem o campo Grupo no Novo cliente e no Acesso", () => {
  const html = readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  const form = html.slice(html.indexOf('id="client-form"'), html.indexOf('id="new-client-access"'));
  assert.ok(form.includes('name="group"') && form.includes('name="vendor"'));
  const dialog = html.slice(html.indexOf('id="portal-access-dialog"'));
  assert.ok(dialog.includes('id="portal-group"') && dialog.includes('id="portal-group-save"'));
  assert.ok(dialog.includes('type="submit" class="primary">Salvar acesso'), "o botão antigo continua");
});

test("Master liga e desliga o grupo pelo Novo cliente e pelo Acesso", async () => {
  const { db, env } = giltecEnv();
  env.NEXUS_SECRET_KEY = "k".repeat(32);
  const call = (method, path, body) => {
    const url = new URL("https://x" + path);
    return handleMaster(new Request(url, { method, headers: { authorization: "Bearer " + env.NEXUS_SECRET_KEY }, body: JSON.stringify(body) }), env, url);
  };
  const saved = id => JSON.parse(db.prepare("SELECT config_json FROM clients WHERE id=?").get(id).config_json).group;

  const created = await call("POST", "/api/clients", { name: "Nova Vendedora", group: "grupo:giltec", vendor: "Ana", password: "senha-forte-1" });
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.deepEqual([body.client.group, body.client.vendor, body.client.vendorLabel], ["giltec", "Ana", "Vendedora"]);
  assert.equal(body.portalCredentials.initialPassword, "senha-forte-1", "o copiar acesso continua igual");

  const semNome = await call("POST", "/api/clients", { name: "Sem Nome", group: "grupo:giltec" });
  assert.equal(semNome.status, 400);
  assert.match((await semNome.json()).message, /nome da vendedora/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM clients WHERE id='sem-nome'").get().n, 0);

  addClient(db, "painel-solto", "Painel Solto", "");
  const linked = await call("PATCH", "/api/clients/painel-solto", { group: "grupo:giltec", vendor: "Bia" });
  assert.equal(linked.status, 200);
  assert.deepEqual(saved("painel-solto"), { id: "giltec", vendor: "Bia" });
  assert.match((await groupOptions(env))[1].name, /Bia/);

  const removed = await call("PATCH", "/api/clients/painel-solto", { group: "", vendor: "" });
  assert.equal(removed.status, 200);
  assert.equal(saved("painel-solto"), null);
  assert.doesNotMatch((await groupOptions(env))[1].name, /Bia/);

  assert.equal((await call("PATCH", "/api/clients/giltec", { group: "", vendor: "" })).status, 409);
  assert.equal((await call("PATCH", "/api/clients/quatree-dog", { group: "grupo:giltec", vendor: "X" })).status, 409);
  assert.equal(saved("quatree-dog"), undefined);
});
