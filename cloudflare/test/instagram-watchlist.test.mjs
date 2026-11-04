import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { instagramPublishingHealth, watchedInstagramClients } from "../src/instagram-credentials.js";

function fakeEnv(rows, links) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE clients (id TEXT PRIMARY KEY, status TEXT NOT NULL); CREATE TABLE connections (client_id TEXT, provider TEXT, payload_json TEXT);");
  for (const [id, status] of rows) db.prepare("INSERT INTO clients VALUES (?, ?)").run(id, status);
  for (const [id, provider] of links) db.prepare("INSERT INTO connections VALUES (?, ?, '{}')").run(id, provider);
  return { db, env: { DB: { prepare: sql => ({ all: async () => ({ results: db.prepare(sql).all() }) }) } } };
}
const good = async () => ({ connected: true, tokenValid: true, accountMatches: true, validation: "ok" });

test("vigia só cliente ativo com Instagram conectado", async () => {
  const { env } = fakeEnv(
    [["primeiro-teste", "online"], ["quatree-dog", "online"], ["demo-cafe", "online"], ["ragnar-one", "archived"], ["jbtv", "setup"]],
    [["primeiro-teste", "instagram"], ["quatree-dog", "meta"], ["quatree-dog", "instagram"], ["ragnar-one", "instagram"], ["jbtv", "instagram"]]
  );
  assert.deepEqual(await watchedInstagramClients(env), ["primeiro-teste", "quatree-dog"]);
});

test("cliente novo entra sozinho e arquivado sai sozinho", async () => {
  const { db, env } = fakeEnv([["primeiro-teste", "online"]], [["primeiro-teste", "instagram"]]);
  db.exec("INSERT INTO clients VALUES ('cliente-novo', 'online'); INSERT INTO connections VALUES ('cliente-novo', 'instagram', '{}');");
  assert.deepEqual(await watchedInstagramClients(env), ["cliente-novo", "primeiro-teste"]);
  db.exec("UPDATE clients SET status = 'archived' WHERE id = 'primeiro-teste';");
  assert.deepEqual(await watchedInstagramClients(env), ["cliente-novo"]);
});

test("token vencido continua vigiado e derruba o ok", async () => {
  const { env } = fakeEnv([["primeiro-teste", "online"], ["giltec", "online"]], [["primeiro-teste", "instagram"], ["giltec", "instagram"]]);
  const health = await instagramPublishingHealth(env, async (_, id) => id === "giltec"
    ? { connected: false, tokenValid: false, accountMatches: false, validation: "not_connected" }
    : good());
  assert.equal(health.ok, false);
  assert.deepEqual(health.clients.map(c => [c.clientId, c.connected]), [["giltec", false], ["primeiro-teste", true]]);
});

test("lista vazia, banco fora do ar e erro no diagnóstico nunca dão ok", async () => {
  assert.equal((await instagramPublishingHealth(fakeEnv([], []).env, good)).ok, false);
  const down = { DB: { prepare: () => ({ all: async () => { throw new Error("d1_down"); } }) } };
  assert.deepEqual(await instagramPublishingHealth(down, good), { ok: false, error: "watchlist_unavailable", clients: [] });
  const { env } = fakeEnv([["primeiro-teste", "online"]], [["primeiro-teste", "instagram"]]);
  const failed = await instagramPublishingHealth(env, async () => { throw new Error("boom"); });
  assert.equal(failed.ok, false);
  assert.equal(failed.clients[0].validation, "diagnostic_error");
});

test("tudo certo dá ok", async () => {
  const { env } = fakeEnv([["primeiro-teste", "online"]], [["primeiro-teste", "instagram"]]);
  assert.equal((await instagramPublishingHealth(env, good)).ok, true);
});
