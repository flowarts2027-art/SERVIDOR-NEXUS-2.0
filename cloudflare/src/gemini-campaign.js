// Campanha diária com o Gemini (pedido do Rodrigo, 28/10/2026).
// O ChatGPT (modo Work) e os chats têm limite por dia; aqui o próprio Nexus gera as imagens
// pela API do Google (Nano Banana), põe a logo oficial do cliente por cima e manda ao painel
// ESPERANDO APROVAÇÃO do cliente. Nada é publicado sem aprovação.
//
// Liga por cliente: variável GEMINI_DAILY_CLIENTS (ex.: "giltec"). Chave: segredo GEMINI_API_KEY.
// Limite de gasto: GEMINI_MONTHLY_LIMIT_USD (padrão 20). Custo por imagem: GEMINI_IMAGE_COST_USD.

import { freeChat, providerOrder } from "./free-llm.js";
import { CLIENT_LOGOS } from "./client-logos.js";
import { brasiliaToIso } from "./manual-reel.js";

const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DAY_MS = 86400000;

// Regras de formato de TODAS as artes (FORMATOS_POSTAGENS.md, REGRA_POSTS_DIARIOS.md, CAMPANHA_GILTEC.md,
// DOTS_QUALITY_PROTOCOL): foto realista, sem texto, sem borda, cada peça inédita, espaço para a logo.
const COMMON_RULES = [
  "STYLE: realistic professional photograph (not illustration, not 3D render, not cartoon), natural light and true colors, real place in Brazil.",
  "NO TEXT: absolutely no text, letters, numbers, captions, signs with writing, logos, brand names, stickers or watermarks anywhere in the image, including on clothes, machines, trucks and walls.",
  "FRAME: the photo fills the entire frame edge to edge; no borders, no frames, no plain colored bands on the sides, top or bottom, no collage, no split screen, one single photo.",
  "LOGO SPACE: keep the top-right corner visually calm and uncluttered (sky or plain wall), because the company logo is placed there afterwards.",
  "SUBJECT: one clear subject, sharp focus, well lit, centered in the middle of the frame; nothing important in the bottom 20% of the image.",
  "PEOPLE: faces are not needed (seen from behind, from the side, over the shoulder or at a distance); anatomically correct hands and bodies.",
  "OBJECTS: equipment and tools are realistic, complete and used the right way; no invented machines, no brand marks, no phones with screens facing the viewer.",
  "QUALITY: no deformed objects, no duplicated limbs, no warped perspective, no blur, no heavy filters, no neon, no blue color cast."
].join(" ");

// Obra (GILTEC): EPI em todo trabalhador.
const CONSTRUCTION_RULES = "SAFETY: every worker wears hard hat, high-visibility vest, gloves and safety boots.";

// Ângulos de câmera: cada peça do dia sai com um enquadramento diferente (nada de foto repetida).
const ANGLES = [
  "wide establishing shot at eye level",
  "low angle shot from near the ground",
  "three-quarter view at medium distance",
  "over-the-shoulder view from behind the worker",
  "elevated view from a slab or scaffold looking down",
  "close medium shot showing the equipment in use"
];

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


// Flow Arts (@flowarts2026, id primeiro-teste), pedido do Rodrigo em 28/10: tema da própria agência,
// sem os equipamentos da GILTEC. Público: donos de pequenos negócios e vendedores que precisam de clientes.
// Regras da marca (REGRA_POSTS_DIARIOS.md): foto realista de pequeno negócio, sem azul, sem robô/neon,
// celular nunca com a tela virada para quem vê, sem preço. Logo: símbolo pequeno embaixo, no centro.
const FLOW_RULES = "BRAND LOOK: warm natural colors of a real small business (wood, plants, daylight); no blue tint, no robots, no holograms, no neon, no futuristic or sci-fi elements. If a phone or laptop appears, the screen faces the person using it, never the viewer (use an over-the-shoulder view). Keep the bottom-center area calm because a small brand symbol goes there.";
const FLOW_DAYS = Object.freeze([
  Object.freeze({
    topic: "Captador de clientes: como achar empresas novas para vender todo dia",
    carousel: Object.freeze([
      "a small business owner at a wooden desk in the morning writing a short list of potential customers in an open notebook, coffee cup beside",
      "a street of local shops and offices in a Brazilian town in the morning, seen at eye level, potential customers to visit",
      "a salesperson chatting in front of a shop counter with a business owner, friendly handshake, seen from the side",
      "over-the-shoulder view of a person typing a short message on a laptop at a small office, screen facing the person",
      "a hand ticking items on a printed contact list next to a phone lying face down on the table"
    ]),
    post1200: "a business owner closing a deal with a customer at the counter of a small shop, handshake, warm afternoon light",
    post1900: "a small business owner sitting at the counter after closing time, thinking, notebook and pen in hand, dusk light through the window",
    stories: Object.freeze([
      "a shop owner opening the front door of a small business early in the morning",
      "hands packing an order into a kraft paper box on a wooden counter",
      "a small team of two people talking around a table in a simple office at the end of the day"
    ])
  }),
  Object.freeze({
    topic: "App de agendar post não cria post. A Flow Arts cria, e você só aprova.",
    carousel: Object.freeze([
      "a tired small business owner late at night in an empty shop holding a phone, screen facing the owner",
      "a messy table with a phone, product samples and a ring light, owner trying to photograph a product",
      "a beautiful professional photo session of a product on a wooden table with natural window light",
      "over-the-shoulder view of an owner smiling while approving something on a phone, screen facing the owner",
      "an owner serving a customer at the counter instead of using the phone, relaxed and focused"
    ]),
    post1200: "over-the-shoulder view of a shop owner relaxed with a coffee, glancing at a phone, screen facing the owner, busy shop behind",
    post1900: "a small business owner leaning on the counter at dusk, looking at the empty street, thoughtful",
    stories: Object.freeze([
      "a bakery or shop counter in the morning with fresh products being arranged",
      "a person writing post ideas on sticky notes on a wall in a small office",
      "a shop owner turning the sign light off at night, warm interior light"
    ])
  }),
  Object.freeze({
    topic: "Instagram como cartão de visita: o cliente olha o perfil antes de chamar",
    carousel: Object.freeze([
      "over-the-shoulder view of a customer scrolling a business profile on a phone in a café, screen facing the customer",
      "a well organized shop window with products in natural light",
      "a business owner photographing a product with a phone in good daylight, phone screen facing the owner",
      "a customer entering a small shop and being greeted at the door",
      "a happy owner holding a delivery bag at the counter ready for a customer"
    ]),
    post1200: "a small shop with a customer at the counter and the owner smiling, lively midday light",
    post1900: "a quiet small office at dusk with a notebook open and a cup of coffee, ready to plan tomorrow",
    stories: Object.freeze([
      "morning light over a street of small shops in a Brazilian neighborhood",
      "close view of hands writing a to-do list in a notebook",
      "a closed shop at night with warm lights inside"
    ])
  })
]);

function flowPlan(cfg, d) {
  const day = FLOW_DAYS[((d % FLOW_DAYS.length) + FLOW_DAYS.length) % FLOW_DAYS.length];
  const angle = i => ANGLES[(d * 2 + i) % ANGLES.length];
  const feed = (scene, i) => ({ equipment: "", topic: day.topic, aspect: "4:5", prompt: `FORMAT: vertical 4:5 Instagram feed photo (1080x1350). SCENE: ${scene}, ${angle(i)}. ${FLOW_RULES} ${COMMON_RULES}` });
  const story = (scene, i) => ({ equipment: "", topic: day.topic, aspect: "9:16", prompt: `FORMAT: vertical 9:16 Instagram story photo (1080x1920). Keep the top 14% and the bottom 20% free of important details; main subject in the middle band. SCENE: ${scene}, ${angle(i + 3)}. ${FLOW_RULES} ${COMMON_RULES}` });
  return [
    { key: "0900", type: "carousel", time: "09:00", cards: day.carousel.map((scene, i) => feed(scene, i)) },
    { key: "1200", type: "post", time: "12:00", cards: [feed(day.post1200, 5)] },
    { key: "1900", type: "post", time: "19:00", cards: [feed(day.post1900, 6)] },
    ...["09:00", "12:00", "19:00"].map((time, i) => ({ key: time.replace(":", "") + "-story", type: "story", time, cards: [story(day.stories[i], i)] }))
  ];
}

const FLOWARTS = Object.freeze({
  plan: flowPlan,
  captionBrief: "Flow Arts é uma agência de marketing e automação com IA para pequenos negócios do Brasil, atendidos online. "
    + "Ela cria os posts do Instagram (o dono só aprova) e tem o Captador, que encontra empresas novas para o cliente vender todo dia. "
    + "Público: donos de pequenos negócios e vendedores que precisam de clientes. Tom próximo, direto e prático. "
    + "Cada legenda: primeira linha forte, 2 ou 3 parágrafos curtos sobre o tema do dia, e no fim a frase 'Comente QUERO e receba 3 posts grátis para o seu negócio.' "
    + "O carrossel das 09h ensina algo para salvar; o post das 12h usa a mensagem 'App de agendar post não cria post. A Flow Arts cria, e você só aprova.'; o post das 19h faz uma pergunta para responder nos comentários. "
    + "Termine com 4 ou 5 hashtags (#FlowArts #MarketingDigital #PequenosNegocios ...). Sem preço, sem nome de concorrente, sem número ou depoimento inventado, sem prometer vendas."
});

export const GEMINI_CAMPAIGNS = Object.freeze({ giltec: Object.freeze({ ...GILTEC, plan: giltecPlan }), "primeiro-teste": FLOWARTS });

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
  return cfg.plan(cfg, dayIndex(date));
}

function giltecPlan(cfg, d) {
  const byId = Object.fromEntries(cfg.equipment.map(e => [e.id, e]));
  const order = cfg.cycle[((d % cfg.cycle.length) + cfg.cycle.length) % cfg.cycle.length];
  const eq = i => byId[order[i]];
  const scene = i => cfg.scenes[(d * 3 + i) % cfg.scenes.length];
  const light = i => cfg.light[(d + i) % cfg.light.length];
  const story = i => cfg.storyScenes[(d * 3 + i) % cfg.storyScenes.length];
  const angle = i => ANGLES[(d * 2 + i) % ANGLES.length];
  // Feed e carrossel: 4:5 (1080x1350), cada cartão gerado separado (nunca cortado de uma imagem larga).
  const feed = (i, e) => ({ equipment: e.id, aspect: "4:5", prompt: `FORMAT: vertical 4:5 Instagram feed photo (1080x1350). SCENE: ${e.en}, at ${scene(i)}, ${light(i)}, ${angle(i)}. The equipment is the clear main subject, complete in the frame, sharp and well framed. ${CONSTRUCTION_RULES} ${COMMON_RULES}`, topic: e.id });
  return [
    { key: "0900", type: "carousel", time: "09:00", cards: [feed(0, eq(0)), feed(1, eq(1))] },
    { key: "1200", type: "post", time: "12:00", cards: [feed(2, eq(2))] },
    { key: "1900", type: "post", time: "19:00", cards: [feed(3, eq(3))] },
    ...["09:00", "12:00", "19:00"].map((time, i) => ({
      key: time.replace(":", "") + "-story", type: "story", time,
      // Story: 9:16 (1080x1920); os 14% de cima e os 20% de baixo ficam atrás dos botões do Instagram.
      cards: [{ equipment: "", aspect: "9:16", prompt: `FORMAT: vertical 9:16 Instagram story photo (1080x1920). Keep the top 14% and the bottom 20% free of important details (Instagram buttons cover them); main subject in the middle band. SCENE: ${story(i)}, ${light(i + 1)}, ${angle(i + 4)}. Different scene from the feed posts; no single machine as the main subject. ${CONSTRUCTION_RULES} ${COMMON_RULES}` }]
    }))
  ];
}

export function imageCostUsd(env) {
  if (imageProvider(env) === "cloudflare") return 0;
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

// Imagens grátis no próprio Cloudflare (Workers AI, 28/10): o Rodrigo não quer plano pago no Google.
// FLUX.2 klein 4B com tamanho livre; se falhar, FLUX.1 schnell (quadrado, cortado depois para o formato).
const CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const CF_FALLBACK_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_SIZES = { "4:5": [1024, 1280], "9:16": [768, 1344] };

export function imageProvider(env) {
  const pick = String(env?.NEXUS_FREE_IMAGE_PROVIDER || "").trim().toLowerCase();
  if (pick === "gemini") return "gemini";
  return env?.AI ? "cloudflare" : "gemini";
}

const withTimeout = (promise, ms, code) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(code)), ms))]);

export async function cloudflareImage(env, prompt, aspect) {
  if (!env?.AI) throw new Error("workers_ai_unavailable");
  const [width, height] = CF_SIZES[aspect] || CF_SIZES["4:5"];
  const errors = [];
  try {
    const form = new FormData();
    form.append("prompt", String(prompt).slice(0, 2000));
    form.append("width", String(width));
    form.append("height", String(height));
    const packed = new Response(form);
    const out = await withTimeout(env.AI.run(String(env.NEXUS_CF_IMAGE_MODEL || CF_IMAGE_MODEL), {
      multipart: { body: packed.body, contentType: packed.headers.get("content-type") }
    }), 90000, "timeout_90s");
    if (out?.image) return { bytes: b64ToBytes(out.image), mime: "image/png", model: "flux-2-klein-4b" };
    errors.push("klein_sem_imagem");
  } catch (error) {
    errors.push("klein:" + String(error?.message || error).slice(0, 60));
  }
  try {
    const out = await withTimeout(env.AI.run(CF_FALLBACK_MODEL, { prompt: String(prompt).slice(0, 2000), steps: 8 }), 60000, "timeout_60s");
    if (out?.image) return { bytes: b64ToBytes(out.image), mime: "image/jpeg", model: "flux-1-schnell" };
    errors.push("schnell_sem_imagem");
  } catch (error) {
    errors.push("schnell:" + String(error?.message || error).slice(0, 60));
  }
  throw new Error("cf_image_failed:" + errors.join("|").slice(0, 120));
}

// Gera com o provedor ligado: Cloudflare (grátis) por padrão; Gemini só se pedido.
export async function generateImage(env, prompt, aspect, fetcher = fetch) {
  if (imageProvider(env) === "cloudflare") return cloudflareImage(env, prompt, aspect);
  return geminiImage(env, prompt, aspect, fetcher);
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

function captionRequest(clientId, plan) {
  const cfg = GEMINI_CAMPAIGNS[clientId];
  const posts = plan.filter(p => p.type !== "story");
  const list = posts.map(p => `${p.key}: ${p.type === "carousel" ? "carrossel sobre " : "post sobre "}${[...new Set(p.cards.map(c => c.topic || c.equipment).filter(Boolean))].join(" e ")}`).join("\n");
  const text = `${cfg.captionBrief}\nEscreva em português do Brasil uma legenda de Instagram para cada post abaixo. Responda só em JSON, com as chaves ${posts.map(p => '"' + p.key + '"').join(", ")}.\n${list}`;
  return { posts, text };
}

function parseCaptions(posts, raw) {
  let parsed = {};
  const clean = String(raw || "").replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try { parsed = JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }
  }
  const out = {};
  for (const p of posts) {
    const caption = String(parsed?.[p.key] || "").trim().slice(0, 2200);
    // Toda legenda precisa do QUERO (aciona a resposta automática).
    out[p.key] = caption && /QUERO/.test(caption) ? caption : "";
  }
  return out;
}

export async function geminiCaptions(env, clientId, plan, fetcher = fetch) {
  const { posts, text } = captionRequest(clientId, plan);
  const data = await callGemini(env, String(env?.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL), {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
  }, fetcher);
  return parseCaptions(posts, (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join(""));
}

// Legendas grátis no Cloudflare quando o Gemini não responde (plano grátis do Google pode recusar).
export async function cloudflareCaptions(env, clientId, plan) {
  if (!env?.AI) throw new Error("workers_ai_unavailable");
  const { posts, text } = captionRequest(clientId, plan);
  const out = await withTimeout(env.AI.run(String(env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"), {
    messages: [{ role: "system", content: "Você é redator de Instagram. Responda apenas com JSON válido." }, { role: "user", content: text }],
    max_tokens: 1800, temperature: 0.7
  }), 60000, "timeout_60s");
  const raw = typeof out?.response === "string" ? out.response : JSON.stringify(out?.response || {});
  return parseCaptions(posts, raw);
}

// Legendas pela fila de IAs grátis (Groq, OpenRouter, Mistral, NVIDIA e, por último, Cloudflare).
// O Gemini fica de fora aqui porque já foi tentado antes.
export async function freeCaptions(env, clientId, plan, fetcher = fetch) {
  const { posts, text } = captionRequest(clientId, plan);
  const out = await freeChat(env, {
    system: "Você é redator de Instagram. Responda apenas com JSON válido.",
    user: text, maxTokens: 1800, temperature: 0.7, timeoutMs: 60000
  }, { fetcher, order: providerOrder(env).filter(name => name !== "gemini") });
  return parseCaptions(posts, out.text);
}

// Ajusta para 1080x1350 (feed) ou 1080x1920 (story) e põe a logo original no canto superior direito
// (no story, abaixo dos 14% de cima, que ficam atrás da barra do Instagram).
export async function composeWithLogo(env, bytes, clientId, aspect) {
  if (!env?.IMAGES) throw new Error("images_binding_unavailable");
  const logo = CLIENT_LOGOS[clientId];
  let canvas = env.IMAGES.input(new Blob([bytes]).stream()).transform({ width: 1080, height: aspect === "9:16" ? 1920 : 1350, fit: "cover" });
  if (logo) {
    const place = logo.position === "bottom-center"
      ? { left: Math.round((1080 - logo.width) / 2), bottom: aspect === "9:16" ? 400 : 56 }
      : { right: 40, top: aspect === "9:16" ? 290 : 40 };
    canvas = canvas.draw(env.IMAGES.input(new Blob([b64ToBytes(logo.png)]).stream()), place);
  }
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
      const fromGemini = String(env?.GEMINI_API_KEY || "").trim() ? await geminiCaptions(env, clientId, plan, fetcher).catch(() => ({})) : {};
      for (const [k, v] of Object.entries(fromGemini)) if (!String(captions[k] || "").trim()) captions[k] = v;
      if (plan.some(p => p.type !== "story" && !String(captions[p.key] || "").trim())) {
        const fromCf = await (deps.cfCaptions || ((e, c, p) => freeCaptions(e, c, p, fetcher)))(env, clientId, plan).catch(() => ({}));
        for (const [k, v] of Object.entries(fromCf)) if (!String(captions[k] || "").trim()) captions[k] = v;
      }
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
        if (cost > 0 && spent + cost > limit) throw new Error("limite_mensal");
        const card = piece.cards[i];
        const img = deps.image ? await deps.image(env, card.prompt, card.aspect) : await generateImage(env, card.prompt, card.aspect, fetcher);
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
        // Preserve the original creative descriptors for later performance analysis.
        // Flow Arts only; metadata recording never blocks a successful upload.
        if (clientId === "primeiro-teste") {
          const creative = { clientId, date, pieceKey: piece.key, type: piece.type, time: piece.time,
            cards: piece.cards.map((card, index) => ({ index: index + 1, prompt: String(card.prompt || "").slice(0, 2000), aspect: card.aspect,
              file: `${clientId}-${date}-${piece.key}-${index + 1}.jpg` })), createdAt: now.toISOString() };
          await writeState(env, "flowarts-creative", date, piece.key, creative).catch(error =>
            console.warn("flowarts_creative_metadata_failed", String(error?.message || error).slice(0, 120)));
        }
      } catch (error) {
        if (String(error?.message || error) !== "slot_taken") throw error;
        result.skipped.push(piece.key + ":ja_tinha_post");
      }
      done.add(piece.key);
      await writeState(env, "gemini-daily", stateKey, clientId, { done: [...done], updatedAt: now.toISOString() });
    } catch (error) {
      const code = String(error?.message || error).slice(0, 80);
      result.failed.push(piece.key + ":" + code);
      if (code === "limite_mensal" || code === "gemini_key_missing" || code.startsWith("gemini_http_429") || code.startsWith("cf_image_failed:") && code.includes("4006")) break;
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
  const ready = imageProvider(env) === "cloudflare" || String(env?.GEMINI_API_KEY || "").trim();
  if (!clients.length || !ready) return { ran: false, reason: "desligado" };
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

// Rota manual do Master: roda em segundo plano e grava o andamento para o GET mostrar.
export async function runCampaignInBackground(env, clientId, date, deps = {}) {
  const startedAt = new Date().toISOString();
  const cur = await readState(env, "gemini-daily", date, clientId);
  await writeState(env, "gemini-daily", date, clientId, { ...cur, manual: { startedAt, finishedAt: "", result: null, error: "" } });
  try {
    const result = await runGeminiCampaign(env, clientId, date, deps);
    const after = await readState(env, "gemini-daily", date, clientId);
    await writeState(env, "gemini-daily", date, clientId, { ...after, manual: { startedAt, finishedAt: new Date().toISOString(), result, error: "" } });
    return result;
  } catch (error) {
    const after = await readState(env, "gemini-daily", date, clientId);
    await writeState(env, "gemini-daily", date, clientId, { ...after, manual: { startedAt, finishedAt: new Date().toISOString(), result: null, error: String(error?.message || error).slice(0, 160) } });
    throw error;
  }
}

export async function campaignStatus(env, clientId, date) {
  const state = await readState(env, "gemini-daily", date, clientId);
  return { provider: imageProvider(env), done: state.done || [], last: state.last || null, manual: state.manual || null, updatedAt: state.updatedAt || null };
}

// Teste rápido: 1 imagem, sem enviar ao painel. Mostra o modelo, o tempo e o erro, se houver.
export async function testOneImage(env, aspect = "4:5") {
  const t0 = Date.now();
  try {
    const img = await generateImage(env, "FORMAT: vertical photo. SCENE: a small bakery counter in the morning with fresh bread, natural light. " + COMMON_RULES, aspect === "9:16" ? "9:16" : "4:5");
    return { ok: true, provider: imageProvider(env), model: img.model || "", bytes: img.bytes.byteLength, ms: Date.now() - t0 };
  } catch (error) {
    return { ok: false, provider: imageProvider(env), error: String(error?.message || error).slice(0, 200), ms: Date.now() - t0 };
  }
}

// Fila do Master: o pedido fica guardado e o cron de 1 minuto executa (um por vez).
export async function queueCampaign(env, clientId, date) {
  const q = await readState(env, "gemini-queue", "pending", "*");
  const items = (Array.isArray(q.items) ? q.items : []).filter(i => !(i.clientId === clientId && i.date === date));
  items.push({ clientId, date, queuedAt: new Date().toISOString() });
  await writeState(env, "gemini-queue", "pending", "*", { items: items.slice(-10), running: q.running || "" });
  const cur = await readState(env, "gemini-daily", date, clientId);
  await writeState(env, "gemini-daily", date, clientId, { ...cur, manual: { queuedAt: new Date().toISOString(), startedAt: "", finishedAt: "", result: null, error: "" } });
}

export async function runQueuedCampaigns(env, now = new Date(), deps = {}) {
  const q = await readState(env, "gemini-queue", "pending", "*");
  const items = Array.isArray(q.items) ? q.items : [];
  if (!items.length) return { ran: false };
  const runningAt = Date.parse(q.running || "");
  if (Number.isFinite(runningAt) && now.getTime() - runningAt < 14 * 60000) return { ran: false, reason: "ocupado" };
  const [job, ...rest] = items;
  await writeState(env, "gemini-queue", "pending", "*", { items: rest, running: now.toISOString() });
  try {
    return { ran: true, result: await runCampaignInBackground(env, job.clientId, job.date, deps) };
  } finally {
    const after = await readState(env, "gemini-queue", "pending", "*");
    await writeState(env, "gemini-queue", "pending", "*", { items: after.items || [], running: "" });
  }
}
