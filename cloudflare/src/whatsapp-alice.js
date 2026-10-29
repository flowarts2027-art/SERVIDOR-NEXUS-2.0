// Alice: a atendente do WhatsApp com o Gemini (pedido do Rodrigo, 28/10/2026).
// - Ouve áudio e entende imagem (o Gemini recebe o arquivo direto, sem outra ferramenta).
// - Parece gente: mostra "digitando…", espera um pouco antes de cada mensagem e manda
//   2 ou 3 mensagens curtas em vez de um textão.
// - Lembra do cliente (nome, o que vende, cidade...) entre as conversas.
// Usa a mesma chave GEMINI_API_KEY das imagens (plano grátis do Google: tem limite de uso).
// Desligar e voltar para o ChatGPT: variável WHATSAPP_AI=openai na Cloudflare.

const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const MEMORY_KEYS = ["nome", "negocio", "cidade", "vendePara", "interesse", "observacao"];
const CLASSIFICATIONS = new Set(["urgente", "lead", "cliente", "fornecedor", "pessoal", "ruido"]);

export const MEDIA_TYPES = new Set(["audio", "image"]);

export function aliceEnabled(env) {
  if (String(env?.WHATSAPP_AI || "").trim().toLowerCase() === "openai") return false;
  return Boolean(String(env?.GEMINI_API_KEY || "").trim());
}

function graphBase(env) {
  const version = String(env?.WHATSAPP_GRAPH_VERSION || "").trim();
  return version ? `https://graph.facebook.com/${encodeURIComponent(version)}/` : "";
}

function bytesToBase64(bytes) {
  let out = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(out);
}

// Baixa o áudio ou a imagem que o cliente mandou (a Meta exige o token nos dois pedidos).
export async function downloadMedia(env, mediaId, fetcher = fetch) {
  const base = graphBase(env);
  const token = String(env?.WHATSAPP_ACCESS_TOKEN || "").trim();
  if (!base || !token || !mediaId) return null;
  const auth = { authorization: `Bearer ${token}` };
  const metaRes = await fetcher(base + encodeURIComponent(String(mediaId)), { headers: auth, signal: AbortSignal.timeout(15000) });
  const meta = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || !meta?.url) return null;
  if (Number(meta.file_size || 0) > MAX_MEDIA_BYTES) return null;
  const fileRes = await fetcher(String(meta.url), { headers: auth, signal: AbortSignal.timeout(20000) });
  if (!fileRes.ok) return null;
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) return null;
  const mimeType = String(meta.mime_type || fileRes.headers.get("content-type") || "").split(";")[0].trim() || "application/octet-stream";
  return { mimeType, data: bytesToBase64(bytes) };
}

export function parseMemory(value) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Junta o que a Alice já sabia com o que aprendeu agora (campo vazio não apaga o antigo).
export function mergeMemory(previous = {}, learned = {}) {
  const out = {};
  for (const key of MEMORY_KEYS) {
    const fresh = String(learned?.[key] ?? "").trim().slice(0, 160);
    const old = String(previous?.[key] ?? "").trim().slice(0, 160);
    if (fresh || old) out[key] = fresh || old;
  }
  return out;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    classification: { type: "STRING", enum: [...CLASSIFICATIONS] },
    priority: { type: "INTEGER" },
    needsHuman: { type: "BOOLEAN" },
    messages: { type: "ARRAY", items: { type: "STRING" } },
    reason: { type: "STRING" },
    understood: { type: "STRING" },
    memory: {
      type: "OBJECT",
      properties: Object.fromEntries(MEMORY_KEYS.map(key => [key, { type: "STRING" }]))
    }
  },
  required: ["classification", "priority", "needsHuman", "messages", "reason"]
};

function mediaLabel(type) {
  return type === "audio" ? "um ÁUDIO (ouça o arquivo anexo)" : "uma IMAGEM (veja o arquivo anexo)";
}

export function buildAliceRequest({ knowledge, memory, history, inboundText, mediaType, media, displayName, alreadyIntroduced }) {
  const rules = [
    knowledge,
    "",
    "COMO RESPONDER:",
    alreadyIntroduced
      ? "- Você já se apresentou nesta conversa; não se apresente de novo."
      : "- Esta é a primeira resposta da conversa: apresente-se como a Alice, assistente virtual da Flow Arts.",
    "- 'messages' tem de 1 a 3 mensagens curtas (cada uma com 1 a 3 linhas), como uma pessoa digitando no WhatsApp. Só 1 pergunta no total.",
    "- Use SOMENTE as informações acima. Nunca invente preço, prazo, desconto, resultado ou cliente.",
    "- 'understood': se chegou ÁUDIO, escreva o que a pessoa falou (transcrição fiel, curta); se chegou IMAGEM, descreva em 1 frase o que ela mostra. Para texto, deixe vazio.",
    "- 'memory': só o que a PESSOA disse ou mostrou nesta conversa (nome, negócio, cidade, se vende para empresas ou pessoa física, interesse, observação). Não invente; deixe vazio o que não sabe.",
    "- classification: urgente, lead, cliente, fornecedor, pessoal ou ruido. priority de 0 a 100.",
    "- needsHuman=true nos casos de passar para o responsável."
  ].join("\n");

  const memoryLines = Object.entries(memory || {}).filter(([, v]) => String(v || "").trim());
  const context = [
    `Contato: ${displayName || "(sem nome)"}`,
    "O que você já sabe desta pessoa:",
    memoryLines.length ? memoryLines.map(([k, v]) => `- ${k}: ${v}`).join("\n") : "(nada ainda)",
    "Histórico (mais antigo primeiro):",
    history || "(sem histórico anterior)",
    "",
    mediaType
      ? `A pessoa acabou de mandar ${mediaLabel(mediaType)}${inboundText ? ` com a legenda: ${inboundText}` : ""}.`
      : `Nova mensagem do cliente: ${inboundText}`
  ].join("\n");

  const parts = [{ text: context }];
  if (media?.data) parts.push({ inline_data: { mime_type: media.mimeType, data: media.data } });

  return {
    systemInstruction: { parts: [{ text: rules }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
}

export function parseAliceAnswer(data) {
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => String(p?.text || "")).join("").trim();
  const raw = text.replace(/^```json\s*/i, "").replace(/```$/i, "");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const messages = (Array.isArray(parsed.messages) ? parsed.messages : [])
    .map(m => String(m || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(m => m.slice(0, 700));
  if (!messages.length) return null;
  return {
    classification: CLASSIFICATIONS.has(String(parsed.classification)) ? String(parsed.classification) : "cliente",
    priority: Math.max(0, Math.min(100, Number(parsed.priority ?? 50) || 0)),
    needsHuman: parsed.needsHuman === true,
    messages,
    reply: messages.join("\n\n"),
    reason: String(parsed.reason || "").slice(0, 300),
    understood: String(parsed.understood || "").trim().slice(0, 1500),
    memory: mergeMemory({}, parsed.memory || {}),
    fallback: false,
    engine: "gemini"
  };
}

export async function aliceReply(env, request, fetcher = fetch) {
  const key = String(env?.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("gemini_key_missing");
  const model = String(env?.WHATSAPP_GEMINI_MODEL || DEFAULT_MODEL).trim();
  const res = await fetcher(API + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error("gemini_http_" + res.status + ":" + String(data?.error?.status || "").slice(0, 40));
  const answer = parseAliceAnswer(data);
  if (!answer) throw new Error("gemini_bad_answer");
  return answer;
}

// "Digitando…" no WhatsApp do cliente (também marca a mensagem como lida). Some sozinho
// quando a resposta chega ou depois de ~25 s. Falhar aqui nunca impede a resposta.
export async function showTyping(env, messageId, fetcher = fetch) {
  const base = graphBase(env);
  const phoneNumberId = String(env?.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const token = String(env?.WHATSAPP_ACCESS_TOKEN || "").trim();
  if (!base || !phoneNumberId || !token || !messageId) return false;
  try {
    const res = await fetcher(base + encodeURIComponent(phoneNumberId) + "/messages", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: String(messageId),
        typing_indicator: { type: "text" }
      }),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Tempo de "digitação" de cada mensagem: parece gente, mas sem deixar o cliente esperando muito.
export function typingDelayMs(text, env) {
  if (String(env?.WHATSAPP_HUMAN_DELAY || "").trim().toLowerCase() === "off") return 0;
  return Math.min(4500, 1000 + String(text || "").length * 30);
}

export function sleep(ms, env) {
  if (!ms) return Promise.resolve();
  if (typeof env?.__sleep === "function") return env.__sleep(ms);
  return new Promise(resolve => setTimeout(resolve, ms));
}
