// Master › Postagens › "Subir conteúdo do cliente" (pedido do Rodrigo, 18/10).
// Ele gera as imagens fora (ChatGPT) e sobe aqui: escolhe o cliente e o tipo (post, carrossel, Reels ou Stories),
// a legenda já vem pronta pelo nicho (sem IA, custo zero) e ele marca dia e hora — ou deixa o cliente escolher.
// Por padrão o cliente ainda aprova no painel dele; dá para marcar "já aprovado por mim".

import { getClient } from "./clients.js";
import { createClientUpload, CLIENT_UPLOAD_MESSAGES } from "./client-uploads.js";
import { readyCaption, captionNiche, captionVariants } from "./caption-templates.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const TYPES = { post: "feed", feed: "feed", carousel: "carousel", reel: "reel", story: "story" };

// Próxima legenda do cliente (pedido de 18/10: "cada postagem com um texto diferente").
// Guarda a vez de cada cliente e formato e pula legenda igual a uma já usada por ele.
export async function nextCaption(env, client, format = "post") {
  const fmt = format === "feed" ? "post" : String(format || "post");
  if (fmt === "story") return "";
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='caption-rotation' AND item_key=?1 AND client_id=?2 LIMIT 1"
  ).bind(fmt, String(client.id)).first().catch(() => null);
  let turn = 0;
  try { turn = Number(JSON.parse(String(row?.value_json || "{}")).turn || 0); } catch { turn = 0; }
  const recent = new Set((((await env.DB.prepare(
    "SELECT caption FROM post_ledger WHERE client_id=?1 AND COALESCE(caption,'')<>'' ORDER BY created_at DESC LIMIT 80"
  ).bind(String(client.id)).all().catch(() => null))?.results) || []).map(r => String(r.caption || "").trim()));
  const total = captionVariants(client, fmt);
  let caption = readyCaption(client, fmt, turn);
  for (let tries = 0; tries < total && recent.has(caption.trim()); tries++) caption = readyCaption(client, fmt, ++turn);
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('caption-rotation', ?1, ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(fmt, String(client.id), JSON.stringify({ turn: turn + 1 })).run().catch(() => null);
  return caption;
}

async function activeClient(env, id) {
  const clientId = String(id || "").trim();
  if (!clientId || BLOCKED_PUBLISH_CLIENTS.has(clientId)) throw new Error("client_invalid");
  const client = await getClient(env, clientId);
  if (!client) throw new Error("client_invalid");
  return client;
}

export async function masterUpload(env, form, now = new Date()) {
  const client = await activeClient(env, form.get("clientId"));
  const type = TYPES[String(form.get("type") || "").trim()];
  if (!type) throw new Error("type_invalid");
  form.set("type", type);
  // Sem legenda escrita: usa a pronta do nicho.
  if (type !== "story" && !String(form.get("caption") || "").trim()) {
    form.set("caption", await nextCaption(env, client, type));
  }
  const approval = String(form.get("approval") || "cliente") === "eu" ? "approved" : "pending";
  return createClientUpload(env, client, form, now, {
    approval, allowClientDate: true,
    source: "master:upload", createdBy: "master", mediaSource: "master-upload",
    reviewer: "rodrigo", reason: "Conteúdo pronto enviado pelo Rodrigo no Master"
  });
}

const MESSAGES = { ...CLIENT_UPLOAD_MESSAGES, client_invalid: "Escolha um cliente da lista.", type_invalid: "Escolha o tipo: post, carrossel, Reels ou Stories." };

// Rotas: GET /api/master/caption e POST /api/master/upload. Quem chama já conferiu o login do Master.
export async function handleMasterUpload(request, env, url) {
  try {
    if (url.pathname === "/api/master/caption" && request.method === "GET") {
      const client = await activeClient(env, url.searchParams.get("clientId"));
      const format = String(url.searchParams.get("format") || "post");
      return send({ ok: true, niche: captionNiche(client), caption: await nextCaption(env, client, format) });
    }
    if (url.pathname === "/api/master/upload" && request.method === "POST") {
      const form = await request.formData().catch(() => null);
      if (!form) throw new Error("type_invalid");
      return send(await masterUpload(env, form));
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu para enviar. Tente de novo." }, 400);
  }
  return null;
}
