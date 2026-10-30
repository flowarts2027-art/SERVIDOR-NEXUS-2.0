import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { handleMcpRequest, handleMcpMessage, MCP_TOOLS, mcpEnabled, enviarArte, MCP_DAILY_UPLOAD_LIMIT } from "../src/mcp-server.js";

const TOKEN = "chave-de-teste-bem-comprida-123456";

function setup(extra = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, status TEXT, approval_status TEXT, caption TEXT, payload_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
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

test("ferramentas: 3 de leitura e 1 de envio, nenhuma destrutiva", () => {
  assert.deepEqual(MCP_TOOLS.map(t => t.name), ["nexus_listar_clientes", "nexus_ver_agenda", "nexus_ver_metricas", "nexus_enviar_arte"]);
  for (const t of MCP_TOOLS) assert.equal(t.annotations.destructiveHint, false);
  for (const t of MCP_TOOLS.slice(0, 3)) assert.equal(t.annotations.readOnlyHint, true);
  const envio = MCP_TOOLS[3];
  assert.equal(envio.annotations.readOnlyHint, false);
  assert.deepEqual(envio._meta["openai/fileParams"], ["imagem", "imagem2", "imagem3", "imagem4", "imagem5", "video"]);
  assert.match("2026-10-30", new RegExp(envio.inputSchema.properties.dia.pattern));
});

test("listar clientes", async () => {
  const { env, deps } = setup();
  const r = await handleMcpMessage(env, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "nexus_listar_clientes", arguments: {} } }, deps);
  assert.equal(r.result.isError, false);
  assert.equal(r.result.structuredContent.clientes[0].id, "primeiro-teste");
});

test("agenda mostra só o cliente pedido, no período, em hora de Brasília", async () => {
  const { env, deps, db } = setup();
  const ins = db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,caption,payload_json) VALUES(?,?,?,?,?,?,?)");
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

// ---------- envio de arte ----------
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13]);

function sendSetup(extra = {}, bodies = {}) {
  const base = setup(extra);
  const calls = { downloads: [], uploads: [] };
  base.deps.download = async url => {
    calls.downloads.push(url);
    const body = bodies[url] ?? JPG;
    if (body === 404) return new Response("x", { status: 404 });
    return new Response(body, { status: 200 });
  };
  base.deps.upload = async (env, form, now, overrides) => {
    calls.uploads.push({ form, overrides });
    if (bodies.__uploadError) throw new Error(bodies.__uploadError);
    return { ok: true, id: "upload-x", type: form.get("type"), approval: "pending" };
  };
  return { ...base, calls };
}
const NOW = new Date("2026-10-29T20:00:00Z");
const arq = n => ({ download_url: "https://files.oaiusercontent.com/f" + n, file_id: "file_" + n });

test("enviar post: baixa a imagem do ChatGPT e manda ao painel ESPERANDO APROVAÇÃO", async () => {
  const { env, deps, calls } = sendSetup();
  const out = await enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", legenda: "Oi", imagem: arq(1) }, NOW);
  assert.equal(out.ok, true);
  assert.match(out.situacao, /esperando aprovação/);
  assert.deepEqual(calls.downloads, ["https://files.oaiusercontent.com/f1"]);
  const { form, overrides } = calls.uploads[0];
  assert.equal(form.get("approval"), "cliente");
  assert.equal(form.get("noDuplicate"), "1");
  assert.equal(form.get("type"), "post");
  assert.equal(form.get("caption"), "Oi");
  assert.equal(form.getAll("images").length, 1);
  assert.equal(form.getAll("images")[0].type, "image/jpeg");
  assert.equal(overrides.source, "mcp:upload");
  assert.equal(overrides.approval, undefined);
});

test("carrossel junta imagem, imagem2... na ordem; story sem legenda", async () => {
  const { env, deps, calls } = sendSetup({}, { "https://files.oaiusercontent.com/f2": PNG });
  await enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "carrossel", dia: "2026-10-30", hora: "09:00", imagem: arq(1), imagem2: arq(2), imagem3: arq(3) }, NOW);
  const form = calls.uploads[0].form;
  assert.equal(form.get("type"), "carousel");
  assert.deepEqual(form.getAll("images").map(f => f.type), ["image/jpeg", "image/png", "image/jpeg"]);
  await enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "story", dia: "2026-10-30", hora: "12:00", legenda: "ignorada", imagens_urls: ["https://exemplo.com/s.jpg"] }, NOW);
  assert.equal(calls.uploads[1].form.get("caption"), null);
});

test("carrossel com 1 imagem e post com 2 imagens são recusados", async () => {
  const { env, deps, calls } = sendSetup();
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "carrossel", dia: "2026-10-30", hora: "09:00", imagem: arq(1) }, NOW), /2 a 5/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagem: arq(1), imagem2: arq(2) }, NOW), /1 imagem/);
  assert.equal(calls.uploads.length, 0);
});

test("só https, só imagem de verdade, link vencido avisa", async () => {
  const { env, deps, calls } = sendSetup({}, { "https://x.com/txt": new TextEncoder().encode("não é imagem"), "https://x.com/old": 404 });
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagens_urls: ["http://x.com/a.jpg"] }, NOW), /https/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagens_urls: ["https://x.com/txt"] }, NOW), /JPG, PNG nem WEBP/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagens_urls: ["https://x.com/old"] }, NOW), /vencido/);
  assert.equal(calls.uploads.length, 0);
});

test("sem imagem, dia errado ou formato errado: nada é enviado", async () => {
  const { env, deps, calls } = sendSetup();
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00" }, NOW), /campo imagem/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "30/10", hora: "09:00", imagem: arq(1) }, NOW), /AAAA-MM-DD/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "reel", dia: "2026-10-30", hora: "09:00", imagem: arq(1) }, NOW), /post, story ou carrossel/);
  assert.equal(calls.downloads.length + calls.uploads.length, 0);
});

test("horário ocupado vira mensagem clara", async () => {
  const { env, deps } = sendSetup({}, { __uploadError: "slot_taken" });
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagem: arq(1) }, NOW), /Já tem um post nesse horário/);
});

test("NEXUS_MCP_WRITE=off desliga só o envio", async () => {
  const { env, deps, calls } = sendSetup({ NEXUS_MCP_WRITE: "off" });
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagem: arq(1) }, NOW), /desligado/);
  assert.equal(calls.uploads.length, 0);
  const r = await handleMcpMessage(env, { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "nexus_listar_clientes", arguments: {} } }, deps);
  assert.equal(r.result.isError, false);
});

test("limite de envios em 24 horas", async () => {
  const { env, deps, db, calls } = sendSetup();
  const ins = db.prepare("INSERT INTO post_ledger(id,client_id,payload_json) VALUES(?,?,?)");
  for (let i = 0; i < MCP_DAILY_UPLOAD_LIMIT; i++) ins.run("m" + i, "primeiro-teste", JSON.stringify({ source: "mcp:upload" }));
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagem: arq(1) }, NOW), /Limite/);
  assert.equal(calls.downloads.length, 0);
});

test("pelo protocolo: erro de entrada volta como isError, sem derrubar o servidor", async () => {
  const { env, deps } = sendSetup();
  const r = await handleMcpMessage(env, { jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "nexus_enviar_arte", arguments: { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "09:00", imagem: arq(1) } } }, deps);
  assert.equal(r.result.isError, false);
  assert.equal(r.result.structuredContent.situacao, "esperando aprovação no painel");
});

// ---------- story em vídeo (30/10) ----------
const MP4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0]);

test("story em vídeo: baixa o MP4, usa a imagem como capa e chega ESPERANDO APROVAÇÃO", async () => {
  const { env, deps, calls } = sendSetup({}, { "https://exemplo.com/v.mp4": MP4 });
  const out = await enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "story", dia: "2026-10-30", hora: "21:00", video_url: "https://exemplo.com/v.mp4", imagem: arq(1) }, NOW);
  assert.equal(out.video, true);
  assert.match(out.aviso, /Nada foi publicado/);
  const form = calls.uploads[0].form;
  assert.equal(form.get("type"), "story");
  assert.equal(form.get("approval"), "cliente");
  assert.equal(form.get("video").type, "video/mp4");
  assert.equal(form.get("cover").type, "image/jpeg");
  assert.equal(form.getAll("images").length, 0);
  assert.equal(form.get("caption"), null);
});

test("story em vídeo sem capa usa capa lisa; vídeo em post é recusado; arquivo que não é MP4 é recusado", async () => {
  const { env, deps, calls } = sendSetup({}, { "https://exemplo.com/v.mp4": MP4, "https://exemplo.com/x.mp4": JPG });
  await enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "story", dia: "2026-10-30", hora: "21:00", video: { download_url: "https://exemplo.com/v.mp4" } }, NOW);
  assert.equal(calls.uploads[0].form.get("cover").type, "image/jpeg");
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "post", dia: "2026-10-30", hora: "21:00", video_url: "https://exemplo.com/v.mp4" }, NOW), /só vale para story/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "story", dia: "2026-10-30", hora: "21:00", video_url: "https://exemplo.com/x.mp4" }, NOW), /MP4/);
  await assert.rejects(enviarArte(env, deps, { cliente_id: "primeiro-teste", formato: "story", dia: "2026-10-30", hora: "21:00", video_url: "http://exemplo.com/v.mp4" }, NOW), /https/);
});
