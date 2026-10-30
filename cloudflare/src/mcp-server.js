// Conector MCP do Nexus (pedido do Rodrigo, 29/10/2026).
// Liga o Claude e o ChatGPT ao Nexus como "conector personalizado".
//
// PASSO 1 (29/10): LEITURA — nexus_listar_clientes, nexus_ver_agenda, nexus_ver_metricas.
// PASSO 2 (29/10): nexus_enviar_arte — manda imagem pronta ao painel do cliente, SEMPRE esperando aprovação.
// PASSO 3 (30/10): story em VÍDEO pelo conector (campo video ou video_url; a imagem vira a capa).
//   Nada aqui publica, aprova, apaga ou manda mensagem. Desligar só o envio: NEXUS_MCP_WRITE=off.
//
// Endereço: https://painel.flowarts.com.br/mcp/<chave>
// A <chave> é o segredo NEXUS_MCP_TOKEN na Cloudflare (o Rodrigo cria; nunca vai para o código).
// Sem o segredo, o conector fica desligado. Desligar na hora: apagar o segredo ou NEXUS_MCP=off.
//
// Protocolo: MCP "Streamable HTTP" em modo JSON (sem SSE), JSON-RPC 2.0, sem sessão.

import { sha256Hex } from "./auth.js";

export const MCP_SERVER_INFO = Object.freeze({ name: "nexus-flowarts", title: "Nexus (Flow Arts)", version: "0.3.1" });
export const MCP_PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18", "2025-03-26"]);
const AGENDA_MAX_DIAS = 31;

const READ_ONLY = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });

// Arquivo vindo do ChatGPT (openai/fileParams) ou de outro cliente MCP: um link temporário para baixar.
const FILE_PARAM = Object.freeze({
  type: "object",
  description: "Imagem (JPG, PNG ou WEBP, até 8 MB).",
  properties: {
    download_url: { type: "string", description: "Link para baixar a imagem." },
    file_id: { type: "string" },
    mime_type: { type: "string" },
    file_name: { type: "string" }
  },
  required: ["download_url"],
  additionalProperties: false
});

// Vídeo do story (pedido do Rodrigo, 30/10): MP4 até 50 MB.
const VIDEO_PARAM = Object.freeze({
  ...FILE_PARAM,
  description: "Vídeo do story (MP4, vertical 9:16, até 50 MB). Só para formato story. A imagem vira a capa (opcional)."
});

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
  },
  {
    name: "nexus_enviar_arte",
    title: "Enviar arte ao painel do cliente",
    description: "Envia uma arte PRONTA (imagem) ao painel do cliente no Nexus, no dia e hora escolhidos. Chega SEMPRE esperando aprovação: nada é publicado sem o OK do Rodrigo ou do cliente. Formatos: post (1 imagem 4:5), story (1 imagem 9:16, OU um vídeo MP4 no campo video/video_url) ou carrossel (2 a 5 imagens 4:5, na ordem imagem, imagem2, imagem3...). Passe a imagem gerada ou anexada na conversa nos campos imagem, imagem2... Se a legenda ficar vazia, o Nexus escreve uma. Por padrão preserva a arte recebida, sem acrescentar texto ou logo. Só use ja_tem_texto=false quando houver pedido explícito para aplicar a moldura a uma foto sem texto. Antes, veja a agenda (nexus_ver_agenda) para não usar um horário já ocupado.",
    inputSchema: {
      type: "object",
      properties: {
        cliente_id: { type: "string", description: "Id do cliente (ex.: primeiro-teste para a Flow Arts)." },
        formato: { type: "string", enum: ["post", "story", "carrossel"], description: "post, story ou carrossel." },
        dia: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Dia em Brasília, AAAA-MM-DD." },
        hora: { type: "string", pattern: "^\\d{2}:\\d{2}$", description: "Hora em Brasília, HH:MM (ex.: 09:00). Pelo menos 10 minutos à frente." },
        legenda: { type: "string", maxLength: 2200, description: "Legenda do post (vazia = o Nexus escreve). Story não tem legenda." },
        imagem: FILE_PARAM,
        imagem2: FILE_PARAM,
        imagem3: FILE_PARAM,
        imagem4: FILE_PARAM,
        imagem5: FILE_PARAM,
        imagens_urls: { type: "array", maxItems: 5, items: { type: "string", format: "uri" }, description: "Opcional: links https das imagens, na ordem, no lugar dos campos imagem." },
        video: VIDEO_PARAM,
        video_url: { type: "string", format: "uri", description: "Opcional: link https do vídeo MP4 do story, no lugar do campo video." },
        ja_tem_texto: { type: "boolean", description: "Padrão true: preserva a arte sem acrescentar texto ou logo, inclusive quando o campo é omitido. false somente para solicitar explicitamente a moldura numa foto sem texto." }
      },
      required: ["cliente_id", "formato", "dia", "hora"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { "openai/fileParams": ["imagem", "imagem2", "imagem3", "imagem4", "imagem5", "video"] }
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
  const [{ listClients, getClient }, { clientInsights }, { instagramSnapshot }, { masterUpload }, frames] = await Promise.all([
    import("./clients.js"), import("./insights.js"), import("./agent-runtime.js"), import("./master-upload.js"), import("./art-frame.js")
  ]);
  return {
    listClients, getClient,
    metrics: (env, client) => clientInsights(env, client, { fetchSnapshot: instagramSnapshot }),
    upload: masterUpload,
    download: (url, init) => fetch(url, init),
    frames
  };
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

// ---------- envio de arte (passo 2) ----------
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_MIME = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };
const FORMATS = { post: "post", story: "story", carrossel: "carousel" };

export function mcpWriteEnabled(env) {
  return String(env?.NEXUS_MCP_WRITE || "").toLowerCase() !== "off";
}

function sniffImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return "";
}

async function baixarImagem(deps, url, posicao) {
  let parsed;
  try { parsed = new URL(String(url || "")); } catch { throw new ToolInputError(`A imagem ${posicao} não tem um link válido.`); }
  if (parsed.protocol !== "https:") throw new ToolInputError(`A imagem ${posicao} precisa de um link https.`);
  const response = await deps.download(parsed.toString(), { redirect: "follow", signal: AbortSignal.timeout(20000) })
    .catch(() => { throw new ToolInputError(`Não consegui baixar a imagem ${posicao}. Tente gerar ou anexar de novo.`); });
  if (!response.ok) throw new ToolInputError(`Não consegui baixar a imagem ${posicao} (erro ${response.status}). O link pode ter vencido: tente de novo.`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > IMAGE_MAX_BYTES) throw new ToolInputError(`A imagem ${posicao} passa de 8 MB.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) throw new ToolInputError(`A imagem ${posicao} está vazia ou passa de 8 MB.`);
  const mime = sniffImage(bytes);
  if (!mime) throw new ToolInputError(`A imagem ${posicao} não é JPG, PNG nem WEBP.`);
  return new File([bytes], `imagem-${posicao}.${IMAGE_MIME[mime]}`, { type: mime });
}

const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

function isMp4(bytes) {
  return bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

async function baixarVideo(deps, url) {
  let parsed;
  try { parsed = new URL(String(url || "")); } catch { throw new ToolInputError("O vídeo não tem um link válido."); }
  if (parsed.protocol !== "https:") throw new ToolInputError("O vídeo precisa de um link https.");
  const response = await deps.download(parsed.toString(), { redirect: "follow", signal: AbortSignal.timeout(60000) })
    .catch(() => { throw new ToolInputError("Não consegui baixar o vídeo. Tente de novo."); });
  if (!response.ok) throw new ToolInputError(`Não consegui baixar o vídeo (erro ${response.status}). O link pode ter vencido: tente de novo.`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > VIDEO_MAX_BYTES) throw new ToolInputError("O vídeo passa de 50 MB.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > VIDEO_MAX_BYTES) throw new ToolInputError("O vídeo está vazio ou passa de 50 MB.");
  if (!isMp4(bytes)) throw new ToolInputError("O vídeo precisa ser MP4.");
  return new File([bytes], "story.mp4", { type: "video/mp4" });
}

const UPLOAD_ERRORS = {
  schedule_invalid: "Dia ou hora inválidos. Use AAAA-MM-DD e HH:MM (Brasília).",
  schedule_too_soon: "Escolha um horário pelo menos 10 minutos à frente.",
  slot_taken: "Já tem um post nesse horário. Escolha outro horário (veja nexus_ver_agenda).",
  client_invalid: "Esse cliente não pode receber artes (não existe ou está travado).",
  image_type: "A imagem precisa ser JPG, PNG ou WEBP.",
  image_size: "A imagem passa de 8 MB.",
  images_count: "O carrossel precisa de 2 a 5 imagens.",
  caption_required: "Escreva a legenda.",
  video_type: "O vídeo precisa ser MP4.",
  video_size: "O vídeo passa do limite de tamanho.",
  cover_required: "Faltou a capa do vídeo."
};

export async function enviarArte(env, deps, args, now = new Date()) {
  if (!mcpWriteEnabled(env)) throw new ToolInputError("O envio de artes pelo conector está desligado no Nexus.");
  const client = await requireClient(env, deps, args);
  const tipo = FORMATS[String(args?.formato || "")];
  if (!tipo) throw new ToolInputError("Formato precisa ser post, story ou carrossel.");
  const dia = String(args?.dia || "");
  const hora = String(args?.hora || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) throw new ToolInputError(UPLOAD_ERRORS.schedule_invalid);

  const videoLink = String(args?.video?.download_url || args?.video_url || "").trim();
  if (videoLink && tipo !== "story") throw new ToolInputError("Vídeo pelo conector só vale para story.");

  const links = ["imagem", "imagem2", "imagem3", "imagem4", "imagem5"]
    .map(k => args?.[k]?.download_url).filter(Boolean);
  if (!links.length && Array.isArray(args?.imagens_urls)) links.push(...args.imagens_urls.slice(0, 5));
  if (!links.length && !videoLink) throw new ToolInputError("Mande a imagem no campo imagem (ou o link em imagens_urls).");
  if (tipo === "carousel" && (links.length < 2 || links.length > 5)) throw new ToolInputError(UPLOAD_ERRORS.images_count);
  if (tipo !== "carousel" && links.length > 1) throw new ToolInputError("Post e story levam 1 imagem só. Para várias, use carrossel.");

  const video = videoLink ? await baixarVideo(deps, videoLink) : null;
  const arquivos = [];
  for (let i = 0; i < links.length; i++) arquivos.push(await baixarImagem(deps, links[i], i + 1));

  if (video) return enviarStoryVideo(env, deps, client, args, dia, hora, video, arquivos[0] || null, now);

  // Arte pronta é preservada inclusive em conectores antigos que omitem ja_tem_texto.
  let texto = "arte preservada, sem acrescentar texto ou logo";
  if (args?.ja_tem_texto === false) {
    const meta = deps.frames ? await deps.frames.loadFrames(env) : null;
    if (meta && deps.frames.hasFrames(meta, client.id)) {
      const story = tipo === "story";
      const base = Number(dia.replace(/\D/g, "").slice(-4)) + Number(hora.replace(/\D/g, ""));
      for (let i = 0; i < arquivos.length; i++) {
        const frame = deps.frames.pickFrame(meta, client.id, story, base + i);
        let out;
        try {
          out = await deps.frames.composeFramed(env, new Uint8Array(await arquivos[i].arrayBuffer()), frame, { story, numero: tipo === "carousel" ? i + 1 : null });
        } catch (error) {
          console.error("mcp_frame_failed", { client: client.id, error: String(error?.message || error) });
          throw new ToolInputError("Não consegui escrever o texto na imagem " + (i + 1) + ". Nada foi enviado. Tente de novo em instantes.");
        }
        arquivos[i] = new File([out], `arte-${i + 1}.jpg`, { type: "image/jpeg" });
      }
      texto = "o Nexus escreveu logo, título, vantagens e botão por cima";
    } else {
      texto = "este cliente ainda não tem moldura de texto: a imagem foi como veio";
    }
  }

  const form = new FormData();
  form.set("clientId", client.id);
  form.set("type", tipo === "carousel" ? "carousel" : tipo);
  form.set("date", dia);
  form.set("time", hora);
  form.set("approval", "cliente"); // sempre esperando aprovação
  form.set("noDuplicate", "1");
  // O conector já escreveu (ou o usuário disse que já tem texto): o envio não confere de novo.
  if (args?.ja_tem_texto !== false || texto.startsWith("o Nexus escreveu")) form.set("jaTemTexto", "1");
  if (tipo !== "story") form.set("caption", String(args?.legenda || "").slice(0, 2200));
  for (const f of arquivos) form.append("images", f);

  let result;
  try {
    result = await deps.upload(env, form, now, {
      source: "mcp:upload", createdBy: "mcp", mediaSource: "mcp-upload",
      reviewer: "mcp", reason: "Arte enviada pelo conector MCP (Claude/ChatGPT)"
    });
  } catch (error) {
    const code = String(error?.message || "");
    if (UPLOAD_ERRORS[code]) throw new ToolInputError(UPLOAD_ERRORS[code]);
    throw error;
  }
  return {
    ok: true,
    id: result.id,
    cliente: { id: client.id, nome: client.name },
    formato: args.formato,
    dia, hora,
    imagens: arquivos.length,
    texto,
    situacao: "esperando aprovação no painel",
    aviso: "Nada foi publicado. A arte só sai depois de aprovada no painel."
  };
}

// Story em vídeo: vai como está (o Nexus não escreve texto por cima de vídeo).
// Sem imagem de capa, usa uma capa lisa da marca só para a miniatura do painel; o Instagram usa o próprio vídeo.
const CAPA_LISA = (() => {
  // JPEG 8x8 cinza-escuro (válido) — miniatura do painel quando não vem capa.
  const b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAAIAAgBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
})();

async function enviarStoryVideo(env, deps, client, args, dia, hora, video, capa, now) {
  const form = new FormData();
  form.set("clientId", client.id);
  form.set("type", "story");
  form.set("date", dia);
  form.set("time", hora);
  form.set("approval", "cliente"); // sempre esperando aprovação
  form.set("noDuplicate", "1");
  form.set("jaTemTexto", "1");
  form.append("video", video);
  form.append("cover", capa || new File([CAPA_LISA], "capa.jpg", { type: "image/jpeg" }));
  let result;
  try {
    result = await deps.upload(env, form, now, {
      source: "mcp:upload", createdBy: "mcp", mediaSource: "mcp-upload",
      reviewer: "mcp", reason: "Story em vídeo enviado pelo conector MCP (Claude/ChatGPT)"
    });
  } catch (error) {
    const code = String(error?.message || "");
    if (UPLOAD_ERRORS[code]) throw new ToolInputError(UPLOAD_ERRORS[code]);
    throw error;
  }
  return {
    ok: true,
    id: result.id,
    cliente: { id: client.id, nome: client.name },
    formato: "story (vídeo)",
    dia, hora,
    video: true,
    texto: "vídeo enviado como está",
    situacao: "esperando aprovação no painel",
    aviso: "Nada foi publicado. O story só sai depois de aprovado no painel."
  };
}

const HANDLERS = { nexus_listar_clientes: listarClientes, nexus_ver_agenda: verAgenda, nexus_ver_metricas: verMetricas, nexus_enviar_arte: enviarArte };

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
      instructions: "Conector do Nexus, o sistema de postagem automática da Flow Arts. Lê clientes, agenda e métricas do Instagram e envia artes ao painel do cliente (nexus_enviar_arte), sempre esperando aprovação. Preserve as artes recebidas por padrão. Só use ja_tem_texto=false se houver pedido explícito para acrescentar a moldura numa foto sem texto. Nunca publica nem aprova nada. Antes de enviar, confira a agenda para não repetir horário. Responda ao Rodrigo em português do Brasil, com frases curtas."
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
