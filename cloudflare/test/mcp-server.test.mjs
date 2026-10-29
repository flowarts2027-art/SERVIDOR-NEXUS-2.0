import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { handleMcpRequest, handleMcpMessage, MCP_TOOLS, mcpEnabled } from "../src/mcp-server.js";

const TOKEN = "chave-de-teste-bem-comprida-123456";

function setup(extra = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, status TEXT, approval_status TEXT, caption TEXT, payload_json TEXT);`);
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  const clients = [
    { id: "primeiro-teste", name: "Flow Arts", instagram: "@flowarts2026", niche: "marketing", status: "online" },
    { id: "giltec", name: "GILTEC", instagram: "", niche: "locação", status: "online" }
  ];
  const deps = {
    listClients: async () => clients,
    getClient: async (_env, id) => clients.find(c => c.id === id) || null,
    metrics: async (_env, client) => client.id === "giltec" ? { ok: false, error: "instagram_not_connected" } : {
      ok: true, updatedAt: "2026-10-29T12:00:00Z", username: "flowarts2026", followers: 120,
      followersHistory: [{ day: "2026-10-29", followers: 120 }], totals: { reach: 900 }, followerPosts: ["p1"],
      posts: [{ id: "p1", permalink: "https://instagram.com/p/x", mediaType: "IMAGE", timestamp: "2026-10-28", caption: "oi", reach: 500, views: 700, likes: 20, comments: 3, saved: 2, shares: 1, follows: 4, profileVisits: 9 }]
    }
  };
  return { db, deps, env: { DB, NEXUS_MCP_TOKEN: TOKEN, ...extra } };
}

function post(path, body) {
  return new Request("https://painel.flowarts.com.br" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
async function call(env, deps, body, path = "/mcp/" + TOKEN) {
  const req = post(path, body);
  return handleMcpRequest(req, env, new URL(req.url), deps);
}

test("sem a chave na Cloudflare, o conector fica desligado", async () => {
  const { env, deps } = setup({ NEXUS_MCP_TOKEN: "" });
  assert.equal(mcpEnabled(env), false);
  const res = await call(env, deps, { jsonrpc: "2.0", id: 1, method: "ping" });
  assert.equal(res.status, 503);
});

test("NEXUS_MCP=off desliga mesmo com a chave", async () => {
  const { env, deps } = setup({ NEXUS_MCP: "off" });
  assert.equal((await call(env, deps, { jsonrpc: "2.0", id: 1, method: "ping" })).status, 503);
});

test("chave errada ou ausente: 401 e nada responde", async () => {
  const { env, deps } = setup();
  assert.equal((await call(env, deps, { jsonrpc: "2.0", id: 1, method: "ping" }, "/mcp/errada")).status, 401);
  assert.equal((await call(env, deps, { jsonrpc: "2.0", id: 1, method: "ping" }, "/mcp")).status, 401);
});

test("outros caminhos não são do MCP", async () => {
  const { env, deps } = setup();
  const req = post("/mcpx", {});
  assert.equal(await handleMcpRequest(req, env, new URL(req.url), deps), null);
});

test("initialize devolve versão, servidor e ferramentas", async () => {
  const { env, deps } = setup();
  const res = await call(env, deps, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude" } } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.result.protocolVersion, "2025-06-18");
  assert.ok(body.result.capabilities.tools);
  assert.equal(body.result.serverInfo.name, "nexus-flowarts");
});

test("notificação recebe 202 sem corpo", async () => {
  const { env, deps } = setup();
  const res = await call(env, deps, { jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(res.status, 202);
});

test("GET não é aceito (sem SSE)", async () => {
  const { env, deps } = setup();
  const req = new Request("https://painel.flowarts.com.br/mcp/" + TOKEN);
  assert.equal((await handleMcpRequest(req, env, new URL(req.url), deps)).status, 405);
});

test("passo 1: todas as ferramentas são só leitura", () => {
  assert.deepEqual(MCP_TOOLS.map(t => t.name), ["nexus_listar_clientes", "nexus_ver_agenda", "nexus_ver_metricas"]);
  for (const t of MCP_TOOLS) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.destructiveHint, false);
  }
});

test("listar clientes", async () => {
  const { env, deps } = setup();
  const r = await handleMcpMessage(env, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "nexus_listar_clientes", arguments: {} } }, deps);
  assert.equal(r.result.isError, false);
  assert.equal(r.result.structuredContent.clientes[0].id, "primeiro-teste");
});

test("agenda mostra só o cliente pedido, no período, em hora de Brasília", async () => {
  const { env, deps, db } = setup();
  const ins = db.prepare("INSERT INTO post_ledger VALUES(?,?,?,?,?,?,?)");
  ins.run("a", "primeiro-teste", "2026-10-30T12:00:00.000Z", "scheduled", "pending", "Post   das 9h", JSON.stringify({ creativeFeatures: { requestedFormat: "carousel" } }));
  ins.run("b", "primeiro-teste", "2026-12-30T12:00:00.000Z", "scheduled", "pending", "longe", "{}");
  ins.run("c", "giltec", "2026-10-30T12:00:00.000Z", "scheduled", "pending", "outro", "{}");
  const { verAgenda } = await import("../src/mcp-server.js");
  const out = await verAgenda(env, deps, { cliente_id: "primeiro-teste", dias: 7 }, new Date("2026-10-29T15:00:00Z"));
  assert.equal(out.total, 1);
  assert.deepEqual(out.postagens[0], { id: "a", dia: "2026-10-30", hora: "09:00", formato: "carousel", situacao: "scheduled", aprovacao: "pending", legenda: "Post das 9h" });
});

test("cliente que não existe vira erro da ferramenta, não do servidor", async () => {
  const { env, deps } = setup();
  const r = await handleMcpMessage(env, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "nexus_ver_agenda", arguments: { cliente_id: "nao-existe" } } }, deps);
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /não existe/);
});

test("métricas: números da Flow Arts e aviso quando o Instagram não está conectado", async () => {
  const { env, deps } = setup();
  const ok = await handleMcpMessage(env, { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "nexus_ver_metricas", arguments: { cliente_id: "primeiro-teste" } } }, deps);
  assert.equal(ok.result.structuredContent.seguidores, 120);
  assert.equal(ok.result.structuredContent.posts[0].seguidores_ganhos, 4);
  const off = await handleMcpMessage(env, { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nexus_ver_metricas", arguments: { cliente_id: "giltec" } } }, deps);
  assert.equal(off.result.structuredContent.ok, false);
  assert.match(off.result.structuredContent.motivo, /não está conectado/);
});

test("ferramenta desconhecida e método desconhecido", async () => {
  const { env, deps } = setup();
  assert.equal((await handleMcpMessage(env, { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "publicar" } }, deps)).error.code, -32602);
  assert.equal((await handleMcpMessage(env, { jsonrpc: "2.0", id: 7, method: "resources/list" }, deps)).error.code, -32601);
});

test("o Worker encaminha /mcp antes do resto e a Cloudflare não serve arquivo nesse caminho", () => {
  const index = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /handleMcpRequest\(request, env, url\)/);
  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"\/mcp\*"/);
});
