// Resposta automática por PALAVRA NO DIRECT (pedido do Rodrigo, 23/10/2026, Maskara).
// (23/10 12h: a palavra da Maskara agora é "QUERO".) As artes diziam "Responda DOCUMENTOS no direct", mas a resposta automática só
// funcionava em comentário. Agora, quando a pessoa manda no direct uma das palavras
// do cliente (painel: Conta › Respostas automáticas), o Nexus responde com a mesma
// mensagem do direct (texto + botão do WhatsApp).
// Responde no máximo UMA vez por pessoa a cada 24 h. Só responde quem escreveu primeiro.

import { clientBrand, brandProfileVersion } from "./client-brand.js";
import { clientAutoReplyConfig, buildDmMessage, matchesKeyword } from "./client-autoreply.js";
import { giftButtonMessage } from "./gift.js";
import { FOLLOWED_PATTERN } from "./gift-dm.js";

const NAMESPACE = "dm-keyword-reply";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_KEEP = 300;

function parseJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

// Mensagens de texto que chegaram no direct (webhook "messages"): [{ igUserId, igsid, text, at }]
export function dmTextsFromWebhook(body = {}) {
  const out = [];
  for (const entry of Array.isArray(body.entry) ? body.entry : []) {
    for (const item of Array.isArray(entry.messaging) ? entry.messaging : []) {
      if (item?.message?.is_echo) continue;
      if (item?.message?.quick_reply || item?.postback) continue; // botões: outro fluxo
      const text = String(item?.message?.text || "").trim();
      if (!text || FOLLOWED_PATTERN.test(text)) continue; // "já segui" é do fluxo do presente
      const ts = Number(item.timestamp || entry.time || 0);
      out.push({
        igUserId: String(entry.id || item?.recipient?.id || ""),
        igsid: String(item?.sender?.id || ""),
        text: text.slice(0, 500),
        at: ts ? new Date(ts > 1e12 ? ts : ts * 1000).toISOString() : ""
      });
    }
  }
  return out.filter(x => x.igsid && x.igUserId && x.igsid !== x.igUserId);
}

async function readState(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1"
  ).bind(NAMESPACE, String(clientId)).first().catch(() => null);
  const state = parseJson(row?.value_json, {});
  return { handled: state && typeof state.handled === "object" && state.handled ? state.handled : {} };
}

async function writeState(env, clientId, state) {
  const entries = Object.entries(state.handled || {})
    .sort((a, b) => String(b[1]?.at || "").localeCompare(String(a[1]?.at || "")))
    .slice(0, MAX_KEEP);
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES(?1,'state',?2,?3,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify({ handled: Object.fromEntries(entries) })).run();
}

async function sendDm(request, token, igUserId, igsid, message) {
  const response = await request("https://graph.instagram.com/" + encodeURIComponent(igUserId) + "/messages", {
    method: "POST",
    headers: { authorization: "Bearer " + token, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id: igsid }, message }),
    signal: AbortSignal.timeout(8000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error?.message || "instagram_" + response.status).slice(0, 200));
  return payload;
}

export async function processWebhookDmKeywords(env, items, { request = fetch, now = new Date(), findClient } = {}) {
  const results = [];
  for (const item of items) {
    const found = findClient ? await findClient(item.igUserId) : null;
    if (!found) { results.push({ igsid: item.igsid, skipped: "unknown_account" }); continue; }
    const { client, conn } = found;
    // Flow Arts (perfil de marca com WhatsApp) tem funil próprio; o resto usa o painel.
    if (brandProfileVersion(client.id) && clientBrand(client).whatsapp) { results.push({ igsid: item.igsid, skipped: "own_funnel" }); continue; }
    const config = await clientAutoReplyConfig(env, client).catch(() => null);
    if (!config?.enabled) { results.push({ igsid: item.igsid, skipped: "autoreply_off" }); continue; }
    if (!matchesKeyword(item.text, config.keywords)) { results.push({ igsid: item.igsid, skipped: "no_keyword" }); continue; }
    const state = await readState(env, client.id);
    const previous = state.handled[item.igsid];
    const lastMs = Date.parse(String(previous?.at || ""));
    if (previous?.status === "sent" && Number.isFinite(lastMs) && now.getTime() - lastMs < COOLDOWN_MS) {
      results.push({ igsid: item.igsid, skipped: "already_replied" });
      continue;
    }
    const token = String(conn?.accessToken || "");
    const igUserId = String(conn?.igUserId || item.igUserId || "");
    const built = buildDmMessage(client, config);
    try {
      if (built && typeof built === "object") {
        await sendDm(request, token, igUserId, item.igsid, giftButtonMessage(built)).catch(() =>
          sendDm(request, token, igUserId, item.igsid, { text: built.text + " " + built.url }));
      } else {
        await sendDm(request, token, igUserId, item.igsid, { text: String(built || "") });
      }
      state.handled[item.igsid] = { status: "sent", at: now.toISOString() };
      results.push({ igsid: item.igsid, replied: true });
    } catch (error) {
      state.handled[item.igsid] = { status: "error", at: now.toISOString(), error: String(error.message || error).slice(0, 160) };
      results.push({ igsid: item.igsid, error: String(error.message || error).slice(0, 160) });
    }
    await writeState(env, client.id, state).catch(() => null);
  }
  return results;
}
