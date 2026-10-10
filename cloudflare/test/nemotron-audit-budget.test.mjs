import test from "node:test";
import assert from "node:assert/strict";
import {
  auditWithNemotron, nemotronAuditConfig, reserveNemotronAuditSlot
} from "../src/experimental/nemotron-audit.js";

function fakeD1() {
  const calls = new Map();
  return {
    calls,
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() {
          const day = args[0];
          if (sql.startsWith("INSERT OR IGNORE INTO nexus_state")) {
            if (!calls.has(day)) calls.set(day, 0);
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE nexus_state")) {
            assert.match(sql, /json_set/);
            assert.match(sql, /nemotron-audit-budget/);
            const limit = args[1];
            if (calls.get(day) >= limit) return { meta: { changes: 0 } };
            calls.set(day, calls.get(day) + 1);
            return { meta: { changes: 1 } };
          }
          throw Error("unexpected SQL: " + sql);
        }
      };
    }
  };
}

function enabled(limit = 2) {
  return {
    NVIDIA_API_KEY: "nvapi-test-credential",
    NEMOTRON_EXPERIMENT_ENABLED: "true",
    NEMOTRON_EXPERIMENT_BUDGET_APPROVED: "true",
    NEMOTRON_EXPERIMENT_DAILY_CALLS: String(limit),
    DB: fakeD1()
  };
}

test("no explicit flags, key or D1 -> cannot call provider", async () => {
  assert.equal((await auditWithNemotron({}, "const x = 1")).reason, "disabled");
  assert.equal((await auditWithNemotron({ NEMOTRON_EXPERIMENT_ENABLED: "true" }, "code")).reason, "missing_api_key");
  const env = enabled();
  delete env.DB;
  assert.equal(nemotronAuditConfig(env).budgetConfigured, false);
  assert.equal((await auditWithNemotron(env, "code")).reason, "budget_not_configured");
});

test("atomic D1 budget cannot exceed explicit one-call cap", async () => {
  const env = enabled(1);
  const day = new Date("2026-10-08T12:00:00Z");
  const [a, b, c] = await Promise.all([
    reserveNemotronAuditSlot(env, day),
    reserveNemotronAuditSlot(env, day),
    reserveNemotronAuditSlot(env, day)
  ]);
  assert.equal([a,b,c].filter(x => x.ok).length, 1);
  assert.equal(env.DB.calls.get("2026-10-08"), 1);
  assert.equal((await reserveNemotronAuditSlot(env, day)).reason, "daily_budget_reached");
});

test("budget limit must be explicit, positive and at most three", async () => {
  for (const limit of [0, -1, 4, "a lot", 1.5]) {
    const env = enabled(limit);
    assert.equal(nemotronAuditConfig(env).budgetConfigured, false);
    assert.equal((await reserveNemotronAuditSlot(env)).ok, false);
  }
});

test("small sanitized code excerpt makes exactly one mocked NVIDIA request", async () => {
  const env = enabled(1);
  let providerCalls = 0;
  const reply = await auditWithNemotron(env, "const clips = files.filter(Boolean);", {
    fetchImpl: async (url, request) => {
      providerCalls++;
      assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.Authorization, "Bearer nvapi-test-credential");
      const payload = JSON.parse(request.body);
      assert.equal(payload.model, "nvidia/nemotron-3-ultra-550b-a55b");
      assert.equal(payload.stream, false);
      return { status: 200, ok: true, json: async () => ({
        choices: [{ message: { content: "Check missing poster identity." } }],
        usage: { total_tokens: 42 }
      }) };
    }
  });
  assert.equal(reply.ok, true);
  assert.match(reply.report, /poster/);
  assert.equal(providerCalls, 1);
  assert.equal(env.DB.calls.size, 1);
  assert.equal((await auditWithNemotron(env, "another excerpt")).reason, "daily_budget_reached");
});

test("secret-containing excerpts fail before a slot or network request", async () => {
  const env = enabled(1);
  let calls = 0;
  const result = await auditWithNemotron(env, "const key='nvapi-Abcdefghijklmnopqrstuvwxyz';", {
    fetchImpl: async () => { calls++; throw Error("unexpected request"); }
  });
  assert.equal(result.reason, "excerpt_contains_secret");
  assert.equal(calls, 0);
  assert.equal(env.DB.calls.size, 0);
});

test("rate limit is recorded as error and consumes a quota reservation", async () => {
  const env = enabled(1);
  let calls = 0;
  const first = await auditWithNemotron(env, "const x = 42;", {
    fetchImpl: async () => { calls++; return { status: 429, ok: false }; }
  });
  assert.equal(first.reason, "rate_limited");
  assert.equal(calls, 1);
  assert.equal((await auditWithNemotron(env, "const y = 43;")).reason, "daily_budget_reached");
});

test("empty response and transport error do not masquerade as successful review", async () => {
  const empty = await auditWithNemotron(enabled(1), "const a = 1;", {
    fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ choices: [{message:{content:""}}] }) })
  });
  assert.equal(empty.reason, "empty_response");
  const error = await auditWithNemotron(enabled(1), "const b = 1;", {
    fetchImpl: async () => { throw new DOMException("aborted", "AbortError"); }
  });
  assert.equal(error.reason, "timeout");
});
