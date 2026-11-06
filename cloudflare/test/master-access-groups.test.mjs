import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { authenticatePortalUser, generatePortalPassword } from "../src/auth.js";
import { accessMessage } from "../src/client-access.js";
import { createGroup, findGroup, groupChoice, groupOptions } from "../src/client-groups.js";
import { effectiveBrand, handleBrand, saveBrand } from "../src/client-identity.js";
import { brandClientId, clientGroup, getClient } from "../src/clients.js";
import { handleMaster } from "../src/master.js";
import { handleMasterUpload, masterUpload } from "../src/master-upload.js";
import { canCreateArt } from "../src/post-watcher.js";

const NOW = new Date("2026-11-06T12:00:00Z");

function setup() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const env = { DB, PUBLIC_BASE_URL: "https://x", NEXUS_SECRET_KEY: "k".repeat(32), MEDIA: { put: async () => {} } };
  const call = async (method, path, body) => {
    const url = new URL("https://x" + path);
    const response = await handleMaster(new Request(url, { method, headers: { authorization: "Bearer " + env.NEXUS_SECRET_KEY }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, url);
    return { status: response.status, body: await response.json() };
  };
  return { db, env, call };
}

const clients = (db, id) => db.prepare("SELECT COUNT(*) AS n FROM clients WHERE id=?").get(id).n;

async function groupWithBrand(env, name = "Adimax") {
  const group = await createGroup(env, name);
  const form = new FormData();
  form.set("target", group.id);
  for (const [key, value] of Object.entries({ primary: "#F2A900", accent: "#F2A900", text: "#000000", buttonWord: "quero" })) form.set(key, value);
  form.set("logo", new File([new Uint8Array([1])], "logo.png", { type: "image/png" }));
  await saveBrand(env, form, NOW, async () => new Response("{}"));
  return group;
}

test("Novo cliente com senha vazia: gera a senha, e ela entra no painel de verdade", async () => {
  const { env, call } = setup();
  const { status, body } = await call("POST", "/api/clients", { name: "Giltec Neto", password: "" });
  assert.equal(status, 201);
  const { username, initialPassword } = body.portalCredentials;
  assert.equal(username, "giltec.neto");
  assert.match(initialPassword, /^[a-km-np-z2-9]{12}$/);
  assert.equal(await authenticatePortalUser(env, username, initialPassword), "giltec-neto");
});

test("senha gerada muda a cada vez e não usa letra parecida", () => {
  const all = Array.from({ length: 200 }, generatePortalPassword);
  assert.equal(new Set(all).size, 200);
  assert.doesNotMatch(all.join(""), /[lIO01]/);
});

test("senha digitada continua valendo", async () => {
  const { env, call } = setup();
  const { body } = await call("POST", "/api/clients", { name: "Loja", password: "senha-forte-1" });
  assert.equal(body.portalCredentials.initialPassword, "senha-forte-1");
  assert.equal(await authenticatePortalUser(env, "loja", "senha-forte-1"), "loja");
});

test("senha curta ou usuário repetido não deixam cliente sem login", async () => {
  const { db, call } = setup();
  assert.equal((await call("POST", "/api/clients", { name: "Curta", password: "123" })).status, 400);
  assert.equal(clients(db, "curta"), 0);
  await call("POST", "/api/clients", { name: "Primeiro", username: "mesmo.nome" });
  const repeated = await call("POST", "/api/clients", { name: "Segundo", username: "mesmo.nome" });
  assert.equal(repeated.status, 409);
  assert.match(repeated.body.message, /usuário já existe/);
  assert.equal(clients(db, "segundo"), 0);
});

test("mensagem do acesso: o texto pedido, linha por linha", () => {
  assert.equal(accessMessage({ name: "Neto", username: "giltec.neto", password: "abc12345" }), [
    "Olá, Neto! Seu painel do Nexus está pronto.",
    "🔗 Painel: https://painel.flowarts.com.br/",
    "👤 Usuário: giltec.neto",
    "🔑 Senha: abc12345",
    "📲 Antes de conectar o Instagram, aceite o convite de testador:",
    "https://www.instagram.com/accounts/manage_access/",
    'Abra a aba "Convites de testador" e toque em Aceitar.',
    'Depois entre no painel e toque em "Conectar Instagram".'
  ].join("\n"));
});

test("Novo cliente devolve a mensagem já com a senha", async () => {
  const { call } = setup();
  const { body } = await call("POST", "/api/clients", { name: "Loja Alpha" });
  const { message, initialPassword } = body.portalCredentials;
  assert.ok(message.startsWith("Olá, Loja Alpha!"));
  assert.ok(message.includes("🔑 Senha: " + initialPassword));
});

test("Acesso de cliente sem login: cria a senha e copia", async () => {
  const { db, env, call } = setup();
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES('adimax-eduardo-soares','Eduardo','Ração','','setup','{}')").run();
  const path = "/api/master/clients/adimax-eduardo-soares/access";
  assert.deepEqual((await call("GET", path)).body, { ok: true, hasLogin: false, username: "adimax.eduardo.soares" });
  const { status, body } = await call("POST", path, { username: "adimax.eduardo.soares", password: "" });
  assert.equal(status, 200);
  assert.ok(body.message.includes("🔑 Senha: " + body.password));
  assert.equal(await authenticatePortalUser(env, "adimax.eduardo.soares", body.password), "adimax-eduardo-soares");
});

test("Acesso de cliente com login: mostra o usuário real e só troca a senha com confirmação", async () => {
  const { env, call } = setup();
  await call("POST", "/api/clients", { name: "Loja", username: "usuario.proprio", password: "senha-antiga-1" });
  const path = "/api/master/clients/loja/access";
  assert.deepEqual((await call("GET", path)).body, { ok: true, hasLogin: true, username: "usuario.proprio" });

  const refused = await call("POST", path, { username: "usuario.proprio", password: "" });
  assert.equal(refused.status, 409);
  assert.equal(await authenticatePortalUser(env, "usuario.proprio", "senha-antiga-1"), "loja", "sem confirmar, a senha antiga continua");

  const reset = await call("POST", path, { username: "usuario.proprio", password: "", resetPassword: true });
  assert.equal(reset.status, 200);
  assert.equal(await authenticatePortalUser(env, "usuario.proprio", reset.body.password), "loja");
  assert.equal(await authenticatePortalUser(env, "usuario.proprio", "senha-antiga-1"), "");
});

test("Acesso: senha digitada vale, curta é recusada, e usuário de outro cliente não entra", async () => {
  const { env, call } = setup();
  await call("POST", "/api/clients", { name: "Um", username: "cliente.um" });
  await call("POST", "/api/clients", { name: "Dois", username: "cliente.dois" });
  const path = "/api/master/clients/dois/access";
  assert.equal((await call("POST", path, { username: "cliente.dois", password: "123" })).status, 400);
  assert.equal((await call("POST", path, { username: "cliente.um", password: "senha-forte-2" })).status, 409);
  const typed = await call("POST", path, { username: "cliente.dois", password: "senha-forte-2" });
  assert.equal(typed.body.password, "senha-forte-2");
  assert.equal(await authenticatePortalUser(env, "cliente.dois", "senha-forte-2"), "dois");
});

test("Acesso só funciona com o login do Master", async () => {
  const { env, call } = setup();
  await call("POST", "/api/clients", { name: "Loja" });
  const url = new URL("https://x/api/master/clients/loja/access");
  assert.equal((await handleMaster(new Request(url), env, url)).status, 401);
});

test("novo grupo: entra na lista, sem repetir nome, e aceita acento", async () => {
  const { env } = setup();
  assert.deepEqual(await createGroup(env, "  Ração   São João "), { id: "grupo:racao-sao-joao", name: "Ração São João" });
  assert.ok((await groupOptions(env)).some(item => item.id === "grupo:racao-sao-joao" && item.name === "Grupo: Ração São João"));
  await assert.rejects(createGroup(env, "racao sao joao"), /group_exists/);
  await assert.rejects(createGroup(env, "GILTEC"), /group_exists/);
  await assert.rejects(createGroup(env, "x"), /group_name/);
  assert.equal((await findGroup(env, "grupo:nao-existe")), null);
  assert.equal(await findGroup(env, "loja"), null);
});

test("rota de criar grupo responde em português quando o nome já existe", async () => {
  const { env } = setup();
  const post = name => handleMasterUpload(new Request("https://x/api/master/groups", { method: "POST", body: JSON.stringify({ name }) }), env, new URL("https://x/api/master/groups"));
  assert.equal((await post("Adimax")).status, 200);
  const repeated = await post("Adimax");
  assert.equal(repeated.status, 400);
  assert.match((await repeated.json()).message, /Já existe um grupo/);
});

test("grupo novo guarda e devolve a marca pelo lápis", async () => {
  const { env } = setup();
  const group = await groupWithBrand(env);
  const url = new URL("https://x/api/master/brand?target=" + encodeURIComponent(group.id));
  const { brand } = await (await handleBrand(new Request(url), env, url)).json();
  assert.equal(brand.colors.primary, "#F2A900");
  assert.equal(brand.buttonWord, "QUERO");
});

test("cliente novo do grupo herda logo, cores e palavra, sem digitar a marca", async () => {
  const { db, env, call } = setup();
  const group = await groupWithBrand(env, "Ração Forte");
  const { status, body } = await call("POST", "/api/clients", { name: "Eduardo Soares", instagram: "@edu", group: group.id, vendor: "Eduardo" });
  assert.equal(status, 201);
  assert.deepEqual([body.client.group, body.client.vendor], ["racao-forte", "Eduardo"]);

  const client = await getClient(env, "eduardo-soares");
  assert.equal(client.config.brand, undefined, "a marca fica no grupo: mudar lá muda para todos");
  const brand = await effectiveBrand(env, client);
  assert.match(brand.logoUrl, /branding\/grupo-racao-forte\/logo-/);
  assert.equal(brand.colors.onPrimary, "#000000");
  assert.equal(brand.buttonWord, "QUERO");
  const auto = JSON.parse(db.prepare("SELECT value_json AS v FROM nexus_state WHERE client_id='eduardo-soares' OR item_key='config'").get().v);
  assert.ok(auto.keywords.map(word => word.toUpperCase()).includes("QUERO"));
});

test("cliente ligado ao grupo pelo Acesso também herda a palavra", async () => {
  const { db, env, call } = setup();
  const group = await groupWithBrand(env, "Ração Forte");
  await call("POST", "/api/clients", { name: "Solto" });
  assert.equal((await call("PATCH", "/api/clients/solto", { group: group.id, vendor: "Bia" })).status, 200);
  assert.equal(clientGroup(await getClient(env, "solto")).name, "Ração Forte");
  const auto = JSON.parse(db.prepare("SELECT value_json AS v FROM nexus_state WHERE item_key='config'").get().v);
  assert.ok(auto.keywords.map(word => word.toUpperCase()).includes("QUERO"));
});

test("sem nicho escrito, o cliente do grupo usa o nicho de quem já está lá", async () => {
  const { env, call } = setup();
  const group = await createGroup(env, "Ração Forte");
  await call("POST", "/api/clients", { name: "Primeiro", niche: "Ração", group: group.id, vendor: "Ana" });
  await call("POST", "/api/clients", { name: "Segundo", group: group.id, vendor: "Bia" });
  assert.equal((await getClient(env, "segundo")).niche, "Ração");
});

test("grupo criado no Master não quebra quem lê o grupo do cliente", () => {
  const client = { id: "ana", config: { group: { id: "novo", vendor: "Ana", name: "Novo" } } };
  assert.deepEqual(clientGroup(client), { id: "novo", name: "Novo", theme: undefined, vendor: "Ana" });
  assert.equal(brandClientId(client), "ana");
  assert.equal(clientGroup({ id: "ana", config: { group: { id: "sumiu", vendor: "Ana" } } }), null);
  assert.deepEqual(groupChoice({ group: "grupo:novo", vendor: "Ana" }, [{ id: "novo", name: "Novo" }]), { id: "novo", vendor: "Ana", name: "Novo" });
  assert.throws(() => groupChoice({ group: "grupo:novo", vendor: "Ana" }), /group_invalid/);
});

test("grupo da Adimax também fica sem imagem gerada, mesmo com id de cliente sem a palavra", async () => {
  const { env } = setup();
  const deps = { brand: async () => ({ buttonWord: "QUERO" }), loadFrames: async () => null };
  const member = group => ({ id: "eduardo-soares", config: { group: { id: group, vendor: "Eduardo", name: group } } });
  assert.equal(await canCreateArt(env, member("adimax"), deps), false);
  assert.equal(await canCreateArt(env, member("adimax-sul"), deps), false);
  assert.equal(await canCreateArt(env, member("racao-forte"), deps), true);
});

test("envio para grupo vazio avisa, sem erro estranho", async () => {
  const { env } = setup();
  const group = await createGroup(env, "Vazio");
  const form = new FormData();
  form.set("clientId", group.id);
  await assert.rejects(masterUpload(env, form, NOW), /group_empty/);
});

test("tela: botão grande nas duas janelas, aviso grande e Novo grupo", () => {
  const html = readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../public/styles.css", import.meta.url), "utf8");
  const card = html.slice(html.indexOf('id="new-client-access"'), html.indexOf('id="tester-invite"'));
  const dialog = html.slice(html.indexOf('id="portal-access-dialog"'));
  for (const box of [card, dialog]) {
    assert.match(box, /class="primary access-copy"[^>]*>Copiar acesso/);
    assert.match(box, /class="access-copied"[^>]*>Acesso copiado/);
  }
  assert.match(css, /\.access-copied\{[^}]*font-size:28px/);
  assert.match(html, /id="group-new-open"[^>]*>\+ Novo grupo/);
  assert.match(app, /\.dataset\.access = access\.message/);
  assert.doesNotMatch(app, /NEXUS AI\\nAcesso/);
});
