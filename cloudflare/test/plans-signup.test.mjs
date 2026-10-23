import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createSignupRequest, approveSignupRequest, listSignupRequests, handlePublicSignup } from "../src/signup.js";
import { crc16, pixPayload, publicPlans, findPlan, firstPayment, founderOpen } from "../src/plans.js";
import { portalClientView, getClient } from "../src/clients.js";

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


const BASE = { name: "Padaria Sol", niche: "padaria", instagram: "@padariasol", whatsapp: "22 99999-8888", theme: "blue-white", username: "padariasol", password: "senhaforte1", passwordConfirm: "senhaforte1" };

test("Pix copia e cola: CRC igual ao exemplo do Banco Central e valor certo", () => {
  assert.equal(crc16("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304"), "1D3D");
  const code = pixPayload({ amount: 19700, txid: "FLOWessencial" });
  assert.match(code, /0014br\.gov\.bcb\.pix011465299616000150/);
  assert.match(code, /5406197\.00/);
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test("planos: nomes curtos, primeiro pagamento e fundador só até 30/11 e 3 vagas", () => {
  assert.deepEqual(publicPlans().map(p => p.name), ["Essencial", "Completo", "Captador", "Site", "Responde", "Reels 5", "Posts 10", "Logo"]);
  assert.equal(firstPayment(findPlan("completo")), 99400);
  assert.equal(firstPayment(findPlan("essencial"), true), 14700);
  assert.equal(founderOpen(new Date("2026-11-30T20:00:00Z"), 2), true);
  assert.equal(founderOpen(new Date("2026-12-01T12:00:00Z"), 0), false);
  assert.equal(founderOpen(new Date("2026-11-01T12:00:00Z"), 3), false);
});

test("cadastro com plano: o servidor calcula o valor; ao aprovar, o painel mostra o plano", async () => {
  const { env } = fakeEnv();
  const bad = await createSignupRequest(env, { ...BASE, planId: "nao-existe" });
  assert.equal(bad.error, "plan_invalid");
  const made = await createSignupRequest(env, { ...BASE, planId: "completo", paidClaimed: true, amount: 1 });
  assert.equal(made.ok, true);
  assert.equal(made.amount, 99400);
  const [row] = await listSignupRequests(env);
  assert.equal(row.planName, "Completo");
  assert.equal(row.amountLabel, "R$ 994");
  assert.equal(row.paidClaimed, true);
  const approved = await approveSignupRequest(env, row.id);
  assert.equal(approved.ok, true);
  const view = portalClientView(await getClient(env, approved.clientId));
  assert.equal(view.plan.name, "Completo");
  assert.deepEqual(view.plan.quotas, { feed: 30, reels: 30, stories: 60 });
});

test("rota pública de planos e conferência antes do Pix (não cria pedido)", async () => {
  const { env } = fakeEnv();
  const plans = await (await handlePublicSignup(new Request("https://x/api/signup/plans"), env, new URL("https://x/api/signup/plans"))).json();
  assert.equal(plans.plans.length, 8);
  assert.match(plans.pixKey, /CNPJ/);
  const req = new Request("https://x/api/signup", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "9.9.9.9" }, body: JSON.stringify({ ...BASE, planId: "essencial", checkOnly: true }) });
  const res = await handlePublicSignup(req, env, new URL("https://x/api/signup"));
  assert.equal(res.status, 200);
  assert.equal((await listSignupRequests(env)).length, 0);
});
