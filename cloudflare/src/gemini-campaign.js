// Campanha diária com o Gemini (pedido do Rodrigo, 28/10/2026).
// O ChatGPT (modo Work) e os chats têm limite por dia; aqui o próprio Nexus gera as imagens
// pela API do Google (Nano Banana), põe a logo oficial do cliente por cima e manda ao painel
// ESPERANDO APROVAÇÃO do cliente. Nada é publicado sem aprovação.
//
// Liga por cliente: variável GEMINI_DAILY_CLIENTS (ex.: "giltec"). Chave: segredo GEMINI_API_KEY.
// Limite de gasto: GEMINI_MONTHLY_LIMIT_USD (padrão 20). Custo por imagem: GEMINI_IMAGE_COST_USD.

import { CLIENT_LOGOS } from "./client-logos.js";
import { brasiliaToIso } from "./manual-reel.js";

const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DAY_MS = 86400000;

const COMMON_RULES = [
  "Photorealistic photograph, natural light, real place in Brazil.",
  "Absolutely no text, letters, numbers, signs with writing, logos, brand names or watermarks anywhere in the image.",
  "Full-bleed image filling the whole frame, no borders, no plain colored background bands.",
  "Keep the top-right corner visually calm (sky or plain wall) because a logo is placed there later.",
  "Workers wear hard hat, high-visibility vest, gloves and boots; faces do not need to be visible.",
  "No equipment brand marks, no invented machines."
].join(" ");

// GILTEC Locações (CAMPANHA_GILTEC.md): só os 4 equipamentos confirmados; um diferente por peça.
const GILTEC = Object.freeze({
  equipment: Object.freeze([
    { id: "compactador", en: "a vibratory plate compactor compacting a gravel base" },
    { id: "betoneira", en: "an electric concrete mixer (betoneira) mixing concrete, a worker adding sand with a shovel" },
    { id: "martelete", en: "a worker using an electric demolition hammer (jackhammer) breaking an old floor or concrete slab" },
    { id: "gerador", en: "a portable power generator on a frame running and powering work lights or tools" }
  ]),
  // Ciclo de 4 dias (cartão 1, cartão 2, post 12h, post 19h): o mesmo horário nunca repete o
  // equipamento do dia anterior e a betoneira alterna entre carrossel e post (nunca post 2 dias seguidos).
  cycle: Object.freeze([
    Object.freeze(["compactador", "betoneira", "martelete", "gerador"]),
    Object.freeze(["martelete", "gerador", "betoneira", "compactador"]),
    Object.freeze(["betoneira", "compactador", "gerador", "martelete"]),
    Object.freeze(["gerador", "martelete", "compactador", "betoneira"])
  ]),
  scenes: Object.freeze([
    "a single-family house under construction in a Brazilian neighborhood, brick walls rising",
    "a multi-storey building under construction with concrete pillars and scaffolding",
    "an apartment or shop interior being renovated, exposed plaster and dust lit by window light",
    "highway road works in the state of Rio de Janeiro with orange cones on the shoulder and green mountains",
    "earthworks and site preparation with exposed soil and gravel",
    "a construction site in the mountain region of Rio de Janeiro with green hills behind"
  ]),
  light: Object.freeze(["early morning sun with blue sky", "bright midday light", "warm late-afternoon golden light", "sunset sky with orange tones"]),
  storyScenes: Object.freeze([
    "workers laying bricks on a house under construction, seen from behind, green hills in the background",
    "an empty shop interior being renovated with drywall partitions and a ladder, worker measuring a wall",
    "highway road works with fresh asphalt and orange cones, workers in orange vests seen from a distance, misty mountains",
    "a multi-storey concrete structure with scaffolding seen from the ground at golden hour",
    "earthworks site with leveled soil and survey stakes, worker checking the ground",
    "a delivery truck unloading construction materials at a residential site, no writing on the truck"
  ]),
  captionBrief: "GILTEC Locações aluga equipamentos para construção civil no estado do Rio de Janeiro. "
    + "A vendedora é a Rose, que atende pelo WhatsApp. Cada legenda: 3 parágrafos curtos sobre o equipamento do post, "
    + "convite para falar com a Rose pelo WhatsApp e pedir orçamento, e a frase 'Comente QUERO neste post para iniciar o atendimento automático da GILTEC.' "
    + "Termine com 5 a 7 hashtags do RJ (#GILTEC #ConstrucaoCivilRJ #ObrasRJ ...). Sem preço, sem número de telefone, sem prazo prometido, sem inventar outros equipamentos."
});

export const GEMINI_CAMPAIGNS = Object.freeze({ giltec: GILTEC });

export function geminiDailyClients(env) {
  return String(env?.GEMINI_DAILY_CLIENTS || "").split(/[\s,]+/).map(s => s.trim()).filter(id => id && GEMINI_CAMPAIGNS[id]);
}

function dayIndex(date) {
  return Math.floor(Date.parse(date + "T12:00:00Z") / DAY_MS);
}

// Pacote do dia: carrossel 09h (2 cartões), post 12h, post 19h e 3 stories.
// Os 4 equipamentos seguem o ciclo do cliente: cada peça do dia tem um diferente e o mesmo horário
// nunca repete o equipamento do dia anterior (ciclo de 4 dias). Betoneira aparece 1 vez por dia.
export function dailyPlan(clientId, date) {
  const cfg = GEMINI_CAMPAIGNS[clientId];
  if (!cfg) return [];
  const d = dayIndex(date);
  const byId = Object.fromEntries(cfg.equipment.map(e => [e.id, e]));
  const order = cfg.cycle[((d % cfg.cycle.length) + cfg.cycle.length) % cfg.cycle.length];
  const eq = i => byId[order[i]];
  const scene = i => cfg.scenes[(d * 3 + i) % cfg.scenes.length];
  const light = i => cfg.light[(d + i) % cfg.light.length];
  const story = i => cfg.storyScenes[(d * 3 + i) % cfg.storyScenes.length];
  const feed = (i, e) => ({ equipment: e.id, aspect: "4:5", prompt: `${e.en}, at ${scene(i)}, ${light(i)}. The equipment is the clear main subject, sharp and well framed. ${COMMON_RULES}` });
  return [
    { key: "0900", type: "carousel", time: "09:00", cards: [feed(0, eq(0)), feed(1, eq(1))] },
    { key: "1200", type: "post", time: "12:00", cards: [feed(2, eq(2))] },
    { key: "1900", type: "post", time: "19:00", cards: [feed(3, eq(3))] },
    ...["09:00", "12:00", "19:00"].map((time, i) => ({
      key: time.replace(":", "") + "-story", type: "story", time,
      cards: [{ equipment: "", aspect: "9:16", prompt: `Vertical photo: ${story(i)}, ${light(i + 1)}. No single machine as the main subject. ${COMMON_RULES}` }]
    }))
  ];
}

export function imageCostUsd(env) {
  const n = Number(env?.GEMINI_IMAGE_COST_USD);
  return Number.isFinite(n) && n > 0 ? n : 0.039;
}

export function monthlyLimitUsd(env) {
  const n = Number(env?.GEMINI_MONTHLY_LIMIT_USD);
  return Number.isFinite(n) && n >= 0 ? n : 20;
}

function b64ToBytes(value) {
  const raw = atob(String(value || ""));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function callGemini(env, model, body, fetcher) {
  const key = String(env?.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("gemini_key_missing");
  const res = await fetcher(API + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error("gemini_http_" + res.status + ":" + String(data?.error?.status || data?.error?.message || "").slice(0, 60));
  return data;
}

export async function geminiImage(env, prompt, aspect, fetcher = fetch) {
  const data = await callGemini(env, String(env?.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL), {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } }
  }, fetcher);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const part = parts.find(p => (p.inlineData || p.inline_data)?.data);
  const inline = part && (part.inlineData || part.inline_data);
  if (!inline) throw new Error("gemini_no_image:" + String(data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "").slice(0, 40));
  const bytes = b64ToBytes(inline.data);
  if (!bytes.byteLength || bytes.byteLength > 12 * 1024 * 1024) throw new Error("gemini_image_invalid");
  return { bytes, mime: String(inline.mimeType || inline.mime_type || "image/png") };
}

export async function geminiCaptions(env, clientId, plan, fetcher = fetch) {
  const cfg = GEMINI_CAMPAIGNS[clientId];
  const posts = plan.filter(p => p.type !== "story");
  const list = posts.map(p => `${p.key}: ${p.type === "carousel" ? "carrossel com " : "post com "}${p.cards.map(c => c.equipment).join(" e ")}`).join("\n");
  const data = await callGemini(env, String(env?.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL), {
    contents: [{ role: "user", parts: [{ text: `${cfg.captionBrief}\nEscreva em português do Brasil uma legenda de Instagram para cada post abaixo. Responda só em JSON, com as chaves ${posts.map(p => '"' + p.key + '"').join(", ")}.\n${list}` }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
  }, fetcher);
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { parsed = {}; }
  const out = {};
  for (const p of posts) {
    const caption = String(parsed?.[p.key] || "").trim().slice(0, 2200);
    // Toda legenda precisa do QUERO (aciona a resposta automática).
    out[p.key] = caption && /QUERO/.test(caption) ? caption : "";
  }
  return out;
}

// Ajusta para 1080x1350 (feed) ou 1080x1920 (story) e põe a logo original no canto superior direito.
export async function composeWithLogo(env, bytes, clientId, aspect) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const logo = CLIENT_LOGOS[clientId];
  let canvas = env.IMAGES.input(new Blob([bytes]).stream()).transform({ width: 1080, height: aspect === "9:16" ? 1920 : 1350, fit: "cover" });
  if (logo) canvas = canvas.draw(env.IMAGES.input(new Blob([b64ToBytes(logo.png)]).stream()), { right: 40, top: aspect === "9:16" ? 140 : 40 });
  const response = await (await canvas.output({ format: "image/jpeg", quality: 90 })).response();
  if (!response.ok) throw new Error("images_compose_http_" + response.status);
  const out = new Uint8Array(await response.arrayBuffer());
  if (!out.byteLength || out.byteLength > 8 * 1024 * 1024) throw new Error("images_compose_invalid");
  return out;
}

// Estado no D1 (nexus_state): gasto do mês e andamento do dia por cliente.
async function readState(env, namespace, key, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key=?2 AND client_id=?3 LIMIT 1"
  ).bind(namespace, key, clientId).first().catch(() => null);
  try { return JSON.parse(String(row?.value_json || "{}")) || {}; } catch { return {}; }
}

async function writeState(env, namespace, key, clientId, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(namespace, key, clientId, JSON.stringify(value)).run();
}

export async function monthSpend(env, month) {
  return Number((await readState(env, "gemini-spend", month, "*")).usd || 0);
}

async function addSpend(env, month, usd) {
  const cur = await readState(env, "gemini-spend", month, "*");
  await writeState(env, "gemini-spend", month, "*", { usd: Number(cur.usd || 0) + usd, images: Number(cur.images || 0) + 1 });
}

// Gera e envia o pacote do dia. Cada peça pronta fica registrada: se cair no meio, a próxima
// rodada continua de onde parou e não manda nada duplicado (o upload também usa noDuplicate).
export async function runGeminiCampaign(env, clientId, date, deps = {}) {
  const fetcher = deps.fetcher || fetch;
  const upload = deps.upload || (async (e, form) => (await import("./master-upload.js")).masterUpload(e, form));
  const github = deps.githubCaptions || (async (id, d) => (await import("./master-upload.js")).githubCaptions(id, d));
  const compose = deps.compose || composeWithLogo;
  const now = deps.now || new Date();
  if (!GEMINI_CAMPAIGNS[clientId]) throw new Error("gemini_client_not_configured");
  const plan = dailyPlan(clientId, date);
  const stateKey = date;
  const state = await readState(env, "gemini-daily", stateKey, clientId);
  const done = new Set(Array.isArray(state.done) ? state.done : []);
  const result = { clientId, date, sent: [], skipped: [], failed: [] };
  const month = date.slice(0, 7);
  const limit = monthlyLimitUsd(env), cost = imageCostUsd(env);

  let captions = {};
  if (plan.some(p => p.type !== "story" && !done.has(p.key))) {
    captions = await github(clientId, date).catch(() => ({}));
    if (plan.some(p => p.type !== "story" && !String(captions[p.key] || "").trim())) {
      const fromGemini = await geminiCaptions(env, clientId, plan, fetcher).catch(() => ({}));
      for (const [k, v] of Object.entries(fromGemini)) if (!String(captions[k] || "").trim()) captions[k] = v;
    }
  }

  for (const piece of plan) {
    if (done.has(piece.key)) { result.skipped.push(piece.key); continue; }
    const when = Date.parse(brasiliaToIso(date, piece.time) || "");
    // O post precisa chegar pelo menos 10 minutos antes do horário.
    if (!Number.isFinite(when) || when - now.getTime() < 10 * 60000) { result.skipped.push(piece.key + ":horario_passou"); continue; }
    try {
      const files = [];
      for (let i = 0; i < piece.cards.length; i++) {
        const spent = await monthSpend(env, month);
        if (spent + cost > limit) throw new Error("limite_mensal");
        const card = piece.cards[i];
        const img = await geminiImage(env, card.prompt, card.aspect, fetcher);
        await addSpend(env, month, cost);
        const jpg = await compose(env, img.bytes, clientId, card.aspect);
        files.push(new File([jpg], `${clientId}-${date}-${piece.key}-${i + 1}.jpg`, { type: "image/jpeg" }));
      }
      const form = new FormData();
      form.set("clientId", clientId);
      form.set("approval", "cliente");
      form.set("type", piece.type);
      form.set("date", date);
      form.set("time", piece.time);
      form.set("noDuplicate", "1");
      if (piece.type !== "story") form.set("caption", String(captions[piece.key] || ""));
      for (const f of files) form.append("images", f, f.name);
      try {
        await upload(env, form);
        result.sent.push(piece.key);
      } catch (error) {
        if (String(error?.message || error) !== "slot_taken") throw error;
        result.skipped.push(piece.key + ":ja_tinha_post");
      }
      done.add(piece.key);
      await writeState(env, "gemini-daily", stateKey, clientId, { done: [...done], updatedAt: now.toISOString() });
    } catch (error) {
      const code = String(error?.message || error).slice(0, 80);
      result.failed.push(piece.key + ":" + code);
      if (code === "limite_mensal" || code === "gemini_key_missing") break;
    }
  }
  return result;
}

function brasiliaParts(at) {
  const local = new Date(at.getTime() - 3 * 3600000);
  return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
}

// Cron de 15 min: entre 6h e 8h (Brasília), roda uma vez o pacote de cada cliente ligado.
// Só repete se faltou alguma peça (erro do Google, por exemplo).
export async function runGeminiDaily(env, at = new Date(), deps = {}) {
  const clients = geminiDailyClients(env);
  if (!clients.length || !String(env?.GEMINI_API_KEY || "").trim()) return { ran: false, reason: "desligado" };
  const { date, hour } = brasiliaParts(at);
  if (hour < 6 || hour >= 8) return { ran: false, reason: "fora_do_horario" };
  const results = [];
  for (const clientId of clients) {
    const state = await readState(env, "gemini-daily", date, clientId);
    if ((state.done || []).length >= dailyPlan(clientId, date).length) continue;
    // Trava simples: não roda duas vezes ao mesmo tempo (a rodada anterior pode durar alguns minutos).
    const lockAt = Date.parse(state.runningAt || "");
    if (Number.isFinite(lockAt) && at.getTime() - lockAt < 12 * 60000) continue;
    await writeState(env, "gemini-daily", date, clientId, { ...state, runningAt: at.toISOString() });
    const r = await runGeminiCampaign(env, clientId, date, { ...deps, now: at });
    const after = await readState(env, "gemini-daily", date, clientId);
    await writeState(env, "gemini-daily", date, clientId, { ...after, runningAt: "", last: r });
    results.push(r);
  }
  return { ran: true, results };
}
