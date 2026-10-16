import test from "node:test";
import assert from "node:assert/strict";
import { refreshInstagramTokenIfNeeded } from "../src/instagram-credentials.js";
import { encryptSecret } from "../src/secrets.js";

const env0 = { SECRET_ENCRYPTION_KEY: "x".repeat(32), NEXUS_SECRET_KEY: "x".repeat(32), ENCRYPTION_KEY: "x".repeat(32) };

function fakeEnv(payload) {
  const state = { payload: JSON.stringify(payload), updated: null };
  return { state, env: { ...env0, DB: { prepare(sql) { return { bind: (...a) => ({
    first: async () => ({ provider: "meta", payload_json: state.payload }),
    run: async () => { state.updated = a[2]; return { meta: { changes: 1 } }; } }) }; } } } };
}

test("não renova quando falta mais de 10 dias", async () => {
  const now = new Date("2026-10-16T12:00:00Z");
  const { env, state } = fakeEnv({ accessToken: "x", expiresAt: "2026-12-01T00:00:00Z" });
  const r = await refreshInstagramTokenIfNeeded(env, "c", now, async () => { throw new Error("não deveria chamar"); });
  assert.equal(r.refreshed, false);
  assert.equal(r.reason, "not_due");
  assert.equal(state.updated, null);
});

test("não renova token já vencido", async () => {
  const now = new Date("2026-10-16T12:00:00Z");
  const { env } = fakeEnv({ accessToken: "x", expiresAt: "2026-10-01T00:00:00Z" });
  const r = await refreshInstagramTokenIfNeeded(env, "c", now, async () => { throw new Error("x"); });
  assert.equal(r.reason, "already_expired");
});
