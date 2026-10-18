import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  validateSignup, createSignupRequest, listSignupRequests, approveSignupRequest,
  rejectSignupRequest, handlePublicSignup, handleMasterSignups, normalizeInstagramHandle, normalizeWhatsapp
} from "../src/signup.js";
import { authenticatePortalUser } from "../src/auth.js";
import { handleMaster } from "../src/master.js";

function fakeEnv() {
  const db = new DatabaseSync(":memory:");
  // As tabelas do login são criadas pelas migrações (o auth.js só cria uma vez por processo).
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  db.exec(`CREATE TABLE IF NOT EXISTS auth_login_attempts (scope TEXT NOT NULL, ip_hash TEXT NOT NULL,
    window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(scope, ip_hash))`);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { db, env: { DB, NEXUS_SECRET_KEY: "segredo-de-teste" } };
}

const GOOD = {
  name: "Pet Shop Amigo", niche: "pet shop", instagram: "@PetAmigo", whatsapp: "(22) 99999-8888",
  theme: "blue-white", username: "PetAmigo", password: "senhaforte1", passwordConfirm: "senhaforte1"
};

function post(path, body, ip = "1.1.1.1") {
  return new Request("https://painel.flowarts.com.br" + path, {
    method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body)
  });
}

test("confere o formulário e normaliza Instagram, WhatsApp e usuário", () => {
  const ok = validateSignup(GOOD);
  assert.equal(ok.ok, true);
  assert.equal(ok.data.username, "petamigo");
  assert.equal(ok.data.instagram, "@petamigo");
  assert.equal(ok.data.whatsapp, "5522999998888");
  assert.equal(normalizeInstagramHandle("https://instagram.com/loja.x/"), "@loja.x");
  assert.equal(normalizeWhatsapp("123"), "");
  assert.equal(validateSignup({ ...GOOD, username: "pet amigo" }).error, "username_invalid");
  assert.equal(validateSignup({ ...GOOD, password: "curta", passwordConfirm: "curta" }).error, "password_too_short");
  assert.equal(validateSignup({ ...GOOD, passwordConfirm: "outra-senha" }).error, "password_mismatch");
  assert.equal(validateSignup({ ...GOOD, theme: "rosa" }).data.theme, "green-black");
});

test("cadastro fica pendente, sem senha em texto, e não entra antes da aprovação", async () => {
  const { db, env } = fakeEnv();
  const created = await createSignupRequest(env, GOOD);
  assert.equal(created.ok, true);
  const row = db.prepare("SELECT * FROM signup_requests").get();
  assert.equal(row.status, "pending");
  assert.ok(!JSON.stringify(row).includes("senhaforte1"));
  assert.equal(await authenticatePortalUser(env, "petamigo", "senhaforte1"), "");
  const pending = await listSignupRequests(env);
  assert.equal(pending.length, 1);
  assert.equal("password_hash" in pending[0], false);
});

test("aprovar cria o cliente e o login com a senha que o cliente escolheu", async () => {
  const { db, env } = fakeEnv();
  const { id } = await createSignupRequest(env, GOOD);
  const result = await approveSignupRequest(env, id);
  assert.equal(result.ok, true);
  assert.equal(result.clientId, "pet-shop-amigo");
  const client = db.prepare("SELECT * FROM clients WHERE id = 'pet-shop-amigo'").get();
  assert.equal(client.status, "setup");
  assert.equal(client.niche, "pet shop");
  const config = JSON.parse(client.config_json);
  assert.equal(config.theme, "blue-white");
  assert.equal(config.primaryColor, "#3d9bff");
  assert.equal(config.contact.whatsapp, "5522999998888");
  assert.equal(config.contact.instagramHandle, "@petamigo");
  assert.equal(await authenticatePortalUser(env, "PETAMIGO", "senhaforte1"), "pet-shop-amigo");
  assert.equal(await authenticatePortalUser(env, "petamigo", "errada123"), "");
  const after = db.prepare("SELECT status, password_hash FROM signup_requests").get();
  assert.equal(after.status, "approved");
  assert.equal(after.password_hash, "");
  assert.equal((await approveSignupRequest(env, id)).error, "signup_already_decided");
});

test("usuário repetido é recusado e nome repetido ganha outro identificador", async () => {
  const { env } = fakeEnv();
  const first = await createSignupRequest(env, GOOD);
  assert.equal((await createSignupRequest(env, GOOD)).error, "username_taken");
  await approveSignupRequest(env, first.id);
  assert.equal((await createSignupRequest(env, GOOD)).error, "username_taken");
  const second = await createSignupRequest(env, { ...GOOD, username: "petamigo2" });
  assert.equal((await approveSignupRequest(env, second.id)).clientId, "pet-shop-amigo-2");
});

test("recusar apaga a senha protegida e tira da lista", async () => {
  const { db, env } = fakeEnv();
  const { id } = await createSignupRequest(env, GOOD);
  assert.equal((await rejectSignupRequest(env, id)).ok, true);
  assert.equal((await listSignupRequests(env)).length, 0);
  assert.equal(db.prepare("SELECT password_hash FROM signup_requests").get().password_hash, "");
  assert.equal((await rejectSignupRequest(env, id)).ok, false);
});

test("rota pública: aceita cadastro, ignora robô e limita tentativas por IP", async () => {
  const { db, env } = fakeEnv();
  const url = r => new URL(r.url);
  let request = post("/api/signup", GOOD);
  let response = await handlePublicSignup(request, env, url(request));
  assert.equal(response.status, 201);

  request = post("/api/signup", { ...GOOD, username: "robo1", website: "http://spam" });
  response = await handlePublicSignup(request, env, url(request));
  assert.equal(response.status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM signup_requests").get().n, 1);

  for (let i = 0; i < 4; i++) {
    request = post("/api/signup", { ...GOOD, username: "x" + i + "aa" }, "2.2.2.2");
    await handlePublicSignup(request, env, url(request));
  }
  request = post("/api/signup", { ...GOOD, username: "ultimo" }, "2.2.2.2");
  await handlePublicSignup(request, env, url(request));
  request = post("/api/signup", { ...GOOD, username: "bloqueado" }, "2.2.2.2");
  response = await handlePublicSignup(request, env, url(request));
  assert.equal(response.status, 429);
});

test("rotas do Master só funcionam com login do Master", async () => {
  const { env } = fakeEnv();
  await createSignupRequest(env, GOOD);
  const request = new Request("https://painel.flowarts.com.br/api/master/signups");
  const response = await handleMaster(request, env, new URL(request.url));
  assert.equal(response.status, 401);
  const direct = await handleMasterSignups(request, env, new URL(request.url));
  assert.equal((await direct.json()).signups.length, 1);
});

test("página /cadastro pede os mesmos dados do Novo cliente do Master", () => {
  const page = readFileSync(new URL("../../public/cadastro.html", import.meta.url), "utf8");
  for (const field of ["name", "niche", "instagram", "whatsapp", "theme", "username", "password", "passwordConfirm"]) {
    assert.match(page, new RegExp('name="' + field + '"'));
  }
  assert.match(page, /fetch\("\/api\/signup"/);
});
