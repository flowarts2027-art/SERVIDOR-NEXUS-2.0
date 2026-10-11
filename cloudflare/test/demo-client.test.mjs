import test from "node:test";
import assert from "node:assert/strict";
import { ensureDemoClient, DEMO_MAX_POSTS, demoClientRecord } from "../src/demo-client.js";

function fakeDb({ client = null, total = 0 } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          return {
            first: async () => /FROM clients/.test(sql) ? client : /COUNT/.test(sql) ? { total } : null,
            run: async () => ({ success: true })
          };
        }
      };
    }
  };
}

test("cria o café de demonstração se não existir", async () => {
  const DB = fakeDb();
  const out = await ensureDemoClient({ DB });
  assert.equal(out.created, true);
  assert.ok(DB.calls.some(c => /INSERT INTO clients/.test(c.sql) && c.args[0] === "demo-cafe" && c.args[4] === "online"));
  assert.equal(demoClientRecord().config.demo, true);
});

test("pausa ao chegar no limite de posts", async () => {
  const DB = fakeDb({ client: { id: "demo-cafe", name: "x", status: "online", config_json: "{}" }, total: DEMO_MAX_POSTS });
  const out = await ensureDemoClient({ DB });
  assert.equal(out.paused, true);
  assert.ok(DB.calls.some(c => /SET status = 'paused'/.test(c.sql)));
});

test("não mexe em cliente demo já pausado", async () => {
  const DB = fakeDb({ client: { id: "demo-cafe", name: "x", status: "paused", config_json: "{}" } });
  const out = await ensureDemoClient({ DB });
  assert.deepEqual(out, { created: false, paused: false });
  assert.ok(!DB.calls.some(c => /UPDATE|INSERT/.test(c.sql)));
});
