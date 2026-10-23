// Resposta automática de comentários para QUALQUER cliente (pedido do Rodrigo, 22/10/2026, Quatree Dog).
// O cliente escolhe no painel: palavras que disparam, mensagem do direct (com o WhatsApp dele)
// e a resposta curta no comentário. A Flow Arts continua com o funil próprio (comment-autoreply.js).
// Responde UMA vez por comentário, só a quem comentou uma das palavras. Sem disparo em massa.

import { clientBrand, whatsappLink, brandProfileVersion } from "./client-brand.js";

const NAMESPACE = "comment-autoreply";
export const MAX_KEYWORDS = 20;

// Palavras padrão por ramo. Ração e pet: quem pergunta preço, tabela ou revenda.
const RACAO_WORDS = ["quero", "preço", "preco", "valor", "tabela", "revenda", "revender", "revendedor", "info", "informação", "como comprar", "onde comprar", "entrega", "interesse"];
const GENERAL_WORDS = ["quero", "preço", "preco", "valor", "info", "informação", "como funciona", "interesse"];

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f<>]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max);

export function defaultKeywords(client = {}) {
  const text = [client?.niche, client?.config?.agentProfile?.niche, client?.config?.agentProfile?.offer].filter(Boolean).join(" ");
  return /ra[cç][aã]o|pet/i.test(text) ? [...RACAO_WORDS] : [...GENERAL_WORDS];
}

export function defaultDm(client = {}) {
  const brand = clientBrand(client).brandName || "nossa empresa";
  return `Oi! 👋 Que bom que você se interessou pela ${brand}.\nMe chama no WhatsApp que eu te passo a tabela e as condições: {whatsapp}`;
}

export function parseKeywords(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  const out = [];
  for (const item of list) {
    const word = clean(item, 40).toLowerCase();
    if (word.length >= 2 && !out.includes(word)) out.push(word);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

// "preço" casa com "preço?", "Qual o preço" etc.; palavra inteira, sem diferenciar maiúsculas e acentos.
const fold = text => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function matchesKeyword(text, keywords = []) {
  const value = " " + fold(text).replace(/[^a-z0-9]+/g, " ") + " ";
  return keywords.some(word => {
    const w = fold(word).replace(/[^a-z0-9]+/g, " ").trim();
    return w && value.includes(" " + w + " ");
  });
}

async function readConfigRaw(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='config' AND client_id=?2 LIMIT 1"
  ).bind(NAMESPACE, String(clientId)).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : null; } catch { return null; }
}

export async function clientAutoReplyConfig(env, client) {
  const saved = await readConfigRaw(env, client.id);
  return {
    enabled: saved?.enabled === true,
    keywords: Array.isArray(saved?.keywords) && saved.keywords.length ? parseKeywords(saved.keywords) : defaultKeywords(client),
    dm: clean(saved?.dm, 900) || defaultDm(client),
    publicReply: clean(saved?.publicReply, 150) || "Te chamei no direct! 📩"
  };
}

export async function saveClientAutoReplyConfig(env, client, body = {}) {
  const current = await clientAutoReplyConfig(env, client);
  const next = {
    enabled: "enabled" in body ? body.enabled === true : current.enabled,
    keywords: "keywords" in body ? parseKeywords(body.keywords) : current.keywords,
    dm: "dm" in body ? clean(body.dm, 900) : current.dm,
    publicReply: "publicReply" in body ? clean(body.publicReply, 150) : current.publicReply
  };
  if (next.enabled && !next.keywords.length) throw new Error("autoreply_keywords");
  if (next.enabled && !next.dm) throw new Error("autoreply_dm");
  if (next.enabled && next.dm.includes("{whatsapp}") && !clientBrand(client).whatsapp) throw new Error("autoreply_whatsapp");
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES(?1,'config',?2,?3,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(client.id), JSON.stringify(next)).run();
  return { ...next, preview: buildDm(client, next) };
}

// Texto final do direct: {whatsapp} vira o link do WhatsApp do cliente (aba "Meu negócio").
export function buildDm(client, config) {
  const link = whatsappLink(client, "Olá! Comentei no Instagram e quero a tabela e as condições.");
  return String(config.dm || "").replace(/\{whatsapp\}/g, link || "").trim();
}

const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const MESSAGES = {
  autoreply_keywords: "Escreva pelo menos uma palavra.",
  autoreply_dm: "Escreva a mensagem do direct.",
  autoreply_whatsapp: "Cadastre o seu WhatsApp na aba \"Meu negócio\" antes de ligar (a mensagem usa {whatsapp})."
};

// Portal: GET/POST /api/portal/autoreply. Quem chama já conferiu o login do cliente.
export async function handleClientAutoReplyPortal(request, env, url, client) {
  if (url.pathname !== "/api/portal/autoreply") return null;
  try {
    // A Flow Arts tem o funil próprio (guia grátis); o bloco não aparece para ela.
    if (brandProfileVersion(client.id)) return send({ ok: true, hidden: true });
    if (request.method === "GET") {
      const config = await clientAutoReplyConfig(env, client);
      return send({ ok: true, config, preview: buildDm(client, config), hasWhatsapp: Boolean(clientBrand(client).whatsapp) });
    }
    if (request.method === "POST") {
      const config = await saveClientAutoReplyConfig(env, client, await request.json().catch(() => ({})));
      return send({ ok: true, config, preview: config.preview, hasWhatsapp: Boolean(clientBrand(client).whatsapp) });
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu certo. Tente de novo." }, 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}
