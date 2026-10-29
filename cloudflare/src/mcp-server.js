// Conector MCP do Nexus (pedido do Rodrigo, 29/10/2026).
// Liga o Claude e o ChatGPT ao Nexus como "conector personalizado".
//
// PASSO 1 (este arquivo): só LEITURA. Nada aqui publica, agenda, apaga ou manda mensagem.
//   - nexus_listar_clientes
//   - nexus_ver_agenda
//   - nexus_ver_metricas
//
// Endereço: https://painel.flowarts.com.br/mcp/<chave>
// A <chave> é o segredo NEXUS_MCP_TOKEN na Cloudflare (o Rodrigo cria; nunca vai para o código).
// Sem o segredo, o conector fica desligado. Desligar na hora: apagar o segredo ou NEXUS_MCP=off.
//
// Protocolo: MCP "Streamable HTTP" em modo JSON (sem SSE), JSON-RPC 2.0, sem sessão.

import { sha256Hex } from "./auth.js";

export const MCP_SERVER_INFO = Object.freeze({ name: "nexus-flowarts", title: "Nexus (Flow Arts)", version: "0.1.0" });
export const MCP_PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18", "2025-03-26"]);
const AGENDA_MAX_DIAS = 31;

const READ_ONLY = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });

export const MCP_TOOLS = Object.freeze([
  {
    name: "nexus_listar_clientes",
    title: "Listar clientes do Nexus",
    description: "Lista os clientes cadastrados no Nexus (id, nome, Instagram, nicho e situação). Use o id nas outras ferramentas. A Flow Arts tem o id primeiro-teste.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY
  },
  {
    name: "nexus_ver_agenda",
    title: "Ver agenda de postagens",
    description: "Mostra as postagens programadas de um cliente a partir de hoje (data, hora de Brasília, formato, situação, aprovação e começo da legenda). Só leitura.",
    inputSchema: {
      type: "object",
      properties: {
        cliente_id: { type: "string", description: "Id do cliente (ex.: primeiro-teste para a Flow Arts)." },
        dias: { type: "integer", minimum: 1, maximum: AGENDA_MAX_DIAS, description: "Quantos dias para frente (padrão 7)." }
      },
      required: ["cliente_id"],
      additionalProperties: false
    },
    annotations: READ_ONLY
  },
  {
    name: "nexus_ver_metricas",
    title: "Ver métricas do Instagram",
    description: "Mostra os números do Instagram de um cliente: seguidores, alcance, visualizações, curtidas, comentários, salvamentos, compartilhamentos, seguidores ganhos por post e os posts que mais trouxeram seguidores. Só leitura.",
    inputSchema: {
      type: "object",
      properties: { cliente_id: { type: "string", description: "Id do cliente (ex.: primeiro-teste para a Flow Arts)." } },
      required: ["cliente_id"],
      additionalProperties: false
    },
    annotations: READ_ONLY
  }
]);

// ---------- chave de acesso ----------
export function mcpEnabled(env) {
  return String(env?.NEXUS_MCP || "").toLowerCase() !== "off" && String(env?.NEXUS_MCP_TOKEN || "").length >= 24;
}

export async function mcpTokenValid(env, provided) {
  if (!mcpEnabled(env)) return false;
  const given = String(provided || "");
  if (!given) return false;
  // Compara os resumos (mesmo tamanho), não as chaves, para não vazar tempo.
  const [a, b] = await Promise.all([sha256Hex(given), sha256Hex(String(env.NEXUS_MCP_TOKEN))]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0 && a.length === b.length;
}

// ---------- ferramentas ----------
function brasiliaParts(iso) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return { dia: "", hora: "" };
  const local = new Date(when.getTime() - 3 * 3600000).toISOString();
  return { dia: local.slice(0, 10), hora: local.slice(11, 16) };
}

function parseJson(raw) {
  try { const v = JSON.parse(String(raw || "{}")); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

async function defaultDeps() {
  const [{ listClients, getClient }, { clientInsights }, { instagramSnapshot }] = await Promise.all([
    import("./clients.js"), import("./insights.js"), import("./agent-runtime.js")
  ]);
  return { listClients, getClient, metrics: (env, client) => clientInsights(env, client, { fetchSnapshot: instagramSnapshot }) };
}

async function requireClient(env, deps, args) {
  const id = String(args?.cliente_id || "").trim();
  if (!id) throw new ToolInputError("Informe cliente_id. Use nexus_listar_clientes para ver os ids.");
  const client = await deps.getClient(env, id);
  if (!client) throw new ToolInputError(`Cliente "${id}" não existe. Use nexus_listar_clientes para ver os ids.`);
  return client;
}

class ToolInputError extends Error {}

export async function listarClientes(env, deps) {
  const clients = await deps.listClients(env);
  return {
    clientes: clients.map(c => ({ id: c.id, nome: c.name, instagram: c.instagram || null, nicho: c.niche || null, situacao: c.status }))
  };
}

export async function verAgenda(env, deps, args, now = new Date()) {
  const client = await requireClient(env, deps, args);
  const dias = Math.min(AGENDA_MAX_DIAS, Math.max(1, Math.trunc(Number(args?.dias) || 7)));
  const hojeBrasilia = brasiliaParts(now.toISOString()).dia;
  const from = new Date(`${hojeBrasilia}T00:00:00-03:00`);
  const to = new Date(from.getTime() + dias * 86400000);
  const rows = await env.DB.prepare(
    `SELECT id, scheduled_for, status, approval_status, caption, payload_json
     FROM post_ledger WHERE client_id=?1 AND scheduled_for>=?2 AND scheduled_for<?3
     ORDER BY scheduled_for ASC LIMIT 200`
  ).bind(client.id, from.toISOString(), to.toISOString()).all();
  const postagens = (rows?.results || []).map(r => {
    const payload = parseJson(r.payload_json);
    const { dia, hora } = brasiliaParts(r.scheduled_for);
    return {
      id: String(r.id),
      dia, hora,
      formato: String(payload?.creativeFeatures?.requestedFormat || "post"),
      situacao: String(r.status || ""),
      aprovacao: String(r.approval_status || ""),
      legenda: String(r.caption || "").replace(/\s+/g, " ").trim().slice(0, 140)
    };
  });
  return { cliente: { id: client.id, nome: client.name }, de: hojeBrasilia, dias, total: postagens.length, postagens };
}

export async function verMetricas(env, deps, args) {
  const client = await requireClient(env, deps, args);
  const data = await deps.metrics(env, client);
  if (!data?.ok) {
    const motivo = data?.error === "instagram_not_connected" ? "O Instagram deste cliente não está conectado no Nexus." : "O Instagram não respondeu agora. Tente de novo mais tarde.";
    return { cliente: { id: client.id, nome: client.name }, ok: false, motivo };
  }
  return {
    cliente: { id: client.id, nome: client.name },
    ok: true,
    atualizado_em: data.updatedAt || null,
    dados_antigos: Boolean(data.stale),
    instagram: data.username ? "@" + data.username : null,
    seguidores: data.followers,
    historico_seguidores: data.followersHistory || [],
    totais_ultimos_12_posts: data.totals || {},
    posts_que_mais_trouxeram_seguidores: data.followerPosts || [],
    posts: (data.posts || []).map(p => ({
      id: p.id, link: p.permalink, tipo: p.mediaType, data: p.timestamp, legenda: p.caption,
      alcance: p.reach, visualizacoes: p.views, curtidas: p.likes, comentarios: p.comments,
      salvos: p.saved, compartilhamentos: p.shares, seguidores_ganhos: p.follows, visitas_ao_perfil: p.profileVisits
    }))
  };
}

const HANDLERS = { nexus_listar_clientes: listarClientes, nexus_ver_agenda: verAgenda, nexus_ver_metricas: verMetricas };

// ---------- JSON-RPC ----------
function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }

export async function handleMcpMessage(env, message, deps) {
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(message?.id, -32600, "Invalid Request");
  }
  const isNotification = !("id" in message);
  const { id, method, params = {} } = message;

  if (isNotification) return null; // notifications/initialized, cancelled etc.: só aceita.

  if (method === "initialize") {
    const asked = String(params?.protocolVersion || "");
    return rpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: MCP_SERVER_INFO,
      instructions: "Conector do Nexus, o sistema de postagem automática da Flow Arts. Por enquanto só lê: clientes, agenda e métricas do Instagram. Não publica nada. Responda ao Rodrigo em português do Brasil, com frases curtas."
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: MCP_TOOLS });
  if (method === "tools/call") {
    const name = String(params?.name || "");
    const handler = HANDLERS[name];
    if (!handler) return rpcError(id, -32602, `Unknown tool: ${name}`);
    try {
      const output = await handler(env, deps || await defaultDeps(), params?.arguments || {});
      return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output, isError: false });
    } catch (error) {
      const text = error instanceof ToolInputError ? error.message : "O Nexus não conseguiu ler esses dados agora. Nada foi alterado.";
      if (!(error instanceof ToolInputError)) console.error("mcp_tool_failed", { tool: name, code: String(error?.message || error).slice(0, 120) });
      return rpcResult(id, { content: [{ type: "text", text }], isError: true });
    }
  }
  return rpcError(id, -32601, `Method not found: ${method}`);
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id", "access-control-allow-methods": "POST, OPTIONS" };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });
}

// Rota /mcp/<chave>. Devolve null se o caminho não é do MCP.
export async function handleMcpRequest(request, env, url, deps) {
  const match = /^\/mcp\/([^/]+)\/?$/.exec(url.pathname);
  if (!match && url.pathname !== "/mcp" && url.pathname !== "/mcp/") return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!mcpEnabled(env)) return jsonResponse({ error: "mcp_desligado" }, 503);
  if (!match || !(await mcpTokenValid(env, decodeURIComponent(match[1])))) return jsonResponse({ error: "unauthorized" }, 401);
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST, OPTIONS", ...CORS } });

  const body = await request.json().catch(() => undefined);
  if (body === undefined) return jsonResponse(rpcError(null, -32700, "Parse error"), 400);
  const batch = Array.isArray(body) ? body : [body];
  if (!batch.length) return jsonResponse(rpcError(null, -32600, "Invalid Request"), 400);
  const replies = [];
  for (const message of batch) {
    const reply = await handleMcpMessage(env, message, deps);
    if (reply) replies.push(reply);
  }
  if (!replies.length) return new Response(null, { status: 202, headers: CORS });
  return jsonResponse(Array.isArray(body) ? replies : replies[0]);
}
