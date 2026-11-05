import test from "node:test";
import assert from "node:assert/strict";
import { alignScheduledPosts, assignClientOffsets, clientSlot } from "../src/client-slots.js";
import {
  canPublish, createPublishBudget, findPriorPublication, isPlatformLimitError,
  publishFailure, spendPublish, waitForNextMinute
} from "../src/publish-budget.js";

const FIXED = ["primeiro-teste", "giltec", "nexus-ai", "daniela-martins", "maskara-assessoria", "quatree-dog"];
const at = hhmm => new Date("2026-11-06T" + hhmm + ":00.000-03:00").toISOString();

test("atraso fixo: o post das 09:00 sai no minuto de cada cliente", () => {
  const offsets = assignClientOffsets({}, []);
  assert.equal(clientSlot(at("09:00"), offsets["primeiro-teste"]), at("09:00"));
  assert.equal(clientSlot(at("09:00"), offsets.giltec), at("09:10"));
  assert.equal(clientSlot(at("09:00"), offsets["daniela-martins"]), at("09:30"));
  assert.equal(clientSlot(at("19:00"), offsets["quatree-dog"]), at("19:50"));
});

test("story sai 5 minutos depois do post do cliente, mesmo se já vier com 09:05", () => {
  assert.equal(clientSlot(at("09:00"), 30, true), at("09:35"));
  assert.equal(clientSlot(at("09:05"), 30, true), at("09:35"));
  assert.equal(clientSlot(at("09:05"), 0, true), at("09:05"));
});

test("horário fora de 09/12/19 anda para frente, nunca para trás", () => {
  assert.equal(clientSlot(at("10:30"), 0, true), at("11:05"));
  assert.equal(clientSlot(at("11:08"), 30), at("11:30"));
});

test("alinhar duas vezes não muda nada", () => {
  const once = clientSlot(at("12:00"), 40);
  assert.equal(clientSlot(once, 40), once);
});

test("não empurra para depois das 22h", () => {
  assert.equal(clientSlot(at("21:55"), 40), at("21:40"));
  assert.equal(clientSlot(at("21:00"), 50, true), at("21:55"));
});

test("cliente novo recebe minuto livre, e nenhum minuto da hora se repete", () => {
  const clients = ["giltec-locacoes", "quatree-dog-eduardo", "trevo-cosmeticos", "luciana-carvalho", "jbtv"]
    .map((id, index) => ({ id, createdAt: "2026-10-0" + (index + 1) }));
  const offsets = assignClientOffsets({}, clients);
  assert.equal(offsets["giltec-locacoes"], 2);
  const minutes = Object.values(offsets).flatMap(offset => [offset, offset + 5]);
  assert.equal(new Set(minutes).size, minutes.length);
  assert.ok(minutes.every(minute => minute < 60));
});

test("atraso já dado não muda quando entra cliente mais antigo", () => {
  const saved = assignClientOffsets({}, [{ id: "jbtv", createdAt: "2026-10-05" }]);
  const next = assignClientOffsets(saved, [{ id: "antigo", createdAt: "2020-01-01" }, { id: "jbtv", createdAt: "2026-10-05" }]);
  assert.equal(next.jbtv, saved.jbtv);
  assert.notEqual(next.antigo, next.jbtv);
});

test("contas arquivadas e demonstração não ocupam minuto", () => {
  const offsets = assignClientOffsets({}, [{ id: "demo-cafe" }, { id: "ragnar-one" }]);
  assert.deepEqual(Object.keys(offsets).sort(), [...FIXED].sort());
});

function fakeDb(posts) {
  const updates = [];
  const statement = sql => ({
    bind(...args) { this.args = args; return this; },
    async first() { return null; },
    async all() {
      if (/FROM clients/.test(sql)) return { results: [] };
      return { results: posts };
    },
    async run() {
      if (/UPDATE post_ledger/.test(sql)) updates.push(this.args);
      return { meta: { changes: 1 } };
    }
  });
  return { DB: { prepare: statement }, updates };
}

test("alinhador move só o que está fora do minuto e guarda o horário pedido", async () => {
  const env = fakeDb([
    { id: "a", client_id: "giltec", scheduled_for: at("09:00"), payload_json: "{}" },
    { id: "b", client_id: "giltec", scheduled_for: at("09:10"), payload_json: "{}" },
    { id: "c", client_id: "giltec", scheduled_for: at("09:00"), payload_json: '{"creativeFeatures":{"requestedFormat":"story"}}' },
    { id: "d", client_id: "giltec", scheduled_for: at("09:00"), payload_json: '{"publishNowByClient":{"at":"x"}}' }
  ]);
  const out = await alignScheduledPosts(env, new Date(at("08:00")));
  assert.equal(out.moved, 2);
  assert.deepEqual(env.updates.map(args => [args[0], args[1], args[2], args[4]]), [
    ["a", at("09:10"), "09:10", at("09:00")],
    ["c", at("09:15"), "09:15", at("09:00")]
  ]);
});

test("trava: no máximo 2 por execução, o resto fica para a próxima", () => {
  const budget = createPublishBudget();
  assert.equal(canPublish(budget, "a"), true);
  spendPublish(budget, "a");
  spendPublish(budget, "b");
  assert.equal(canPublish(budget, "c"), false);
});

test("story e post do mesmo cliente não saem na mesma execução", () => {
  const budget = createPublishBudget();
  spendPublish(budget, "a", "post");
  assert.equal(canPublish(budget, "a", "story"), false);
  assert.equal(canPublish(budget, "b", "story"), true);
});

test("carrossel conta 1, mas não divide a execução com outra publicação", () => {
  const first = createPublishBudget();
  spendPublish(first, "a", "carousel");
  assert.equal(first.used, 1);
  assert.equal(canPublish(first, "b", "story"), false);
  const second = createPublishBudget();
  spendPublish(second, "a", "post");
  assert.equal(canPublish(second, "b", "carousel"), false);
});

test("segunda publicação espera virar o minuto", async () => {
  let clock = Date.UTC(2026, 10, 6, 12, 2, 10);
  const waits = [];
  const budget = createPublishBudget({ now: () => clock, wait: async ms => { waits.push(ms); clock += ms; } });
  await waitForNextMinute(budget);
  assert.deepEqual(waits, []);
  spendPublish(budget, "a");
  await waitForNextMinute(budget);
  assert.deepEqual(waits, [51000]);
  assert.notEqual(Math.floor(clock / 60000), Math.floor(budget.lastAt / 60000));
});

test("limite do Cloudflare e da Meta são reconhecidos", () => {
  assert.equal(isPlatformLimitError(new Error("Too many subrequests by single Worker invocation.")), true);
  assert.equal(isPlatformLimitError(Object.assign(new Error("x"), { code: 4 })), true);
  assert.equal(isPlatformLimitError(new Error("Application request limit reached")), true);
  assert.equal(isPlatformLimitError(new Error("instagram_container_missing")), false);
});

test("falha por limite volta para a fila e para na terceira tentativa, sem apagar o post", () => {
  const limit = new Error("Too many subrequests");
  const first = publishFailure({ id: "x" }, limit);
  assert.equal(first.status, "scheduled");
  assert.equal(first.payload.retryCount, 1);
  assert.equal(first.payload.id, "x");
  const second = publishFailure(first.payload, limit);
  assert.equal(second.status, "scheduled");
  const third = publishFailure(second.payload, limit);
  assert.equal(third.status, "failed");
  assert.equal(third.payload.retryCount, 3);
});

test("não duplica: se a tentativa anterior saiu no Instagram, não publica de novo", async () => {
  const payload = { lastPublishAttemptAt: "2026-11-06T12:10:00.000Z" };
  const find = async () => ({ mediaId: "m1", timestamp: "2026-11-06T12:09:00.000Z" });
  assert.equal((await findPriorPublication({}, "a", "legenda", payload, find)).mediaId, "m1");
  const old = async () => ({ mediaId: "m0", timestamp: "2026-11-01T12:09:00.000Z" });
  assert.equal(await findPriorPublication({}, "a", "legenda", payload, old), null);
  assert.equal(await findPriorPublication({}, "a", "legenda", {}, find), null);
});

test("ciclo de agentes da rodada de 15 min não publica", async () => {
  const { publisherSkippedForTrigger } = await import("../src/agent-runtime.js");
  assert.equal(publisherSkippedForTrigger("scheduler"), true);
  assert.equal(publisherSkippedForTrigger("publisher-sweep"), false);
  assert.equal(publisherSkippedForTrigger("manual"), false);
});
