// Biblioteca de artes de cada cliente (pedido do Rodrigo, 28/10/2026).
// O cliente, o Rodrigo ou o Manus sobem várias imagens prontas de uma vez. O Nexus sozinho:
//  1. descarta as repetidas (mesmo arquivo já na biblioteca);
//  2. decide o formato pela proporção: vertical (9:16) vira STORY; o resto vira POST ou CARROSSEL
//     (2 a 5 imagens enviadas juntas viram o carrossel das 09h);
//  3. escreve a legenda olhando a imagem (IA grátis do Cloudflare), com o QUERO no fim;
//  4. coloca nos próximos horários livres (09h, 12h e 19h; stories nos mesmos horários),
//     ESPERANDO APROVAÇÃO. Nada é publicado sozinho;
//  5. tira da fila do painel os posts repetidos (mesma imagem) que ainda não saíram.

import { clientBrand } from "./client-brand.js";
import { masterUpload } from "./master-upload.js";
import { deletePostFromPanel } from "./posts.js";

const NAMESPACE = "art-library";
const MAX_ITEMS = 300;
const MAX_FILES_PER_UPLOAD = 30;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const SLOT_TIMES = Object.freeze(["09:00", "12:00", "19:00"]);
const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

// ---------- tamanho da imagem (sem decodificar) ----------
export function imageSize(bytes) {
  const b = bytes;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) { // PNG
    const v = new DataView(b.buffer, b.byteOffset);
    return { width: v.getUint32(16), height: v.getUint32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) { // JPEG: procura o SOF
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...b.slice(12, 16));
    if (kind === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (kind === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    if (kind === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return { width: 0, height: 0 };
}

// Vertical (altura ≥ 1,5× a largura) = story; o resto = feed.
export function formatFor(size) {
  if (!size.width || !size.height) return "feed";
  return size.height / size.width >= 1.5 ? "story" : "feed";
}

async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(x => x.toString(16).padStart(2, "0")).join("");
}

// ---------- estado ----------
async function readItems(env, clientId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='items' AND client_id=?2 LIMIT 1"
  ).bind(NAMESPACE, String(clientId)).first().catch(() => null);
  try { const v = JSON.parse(String(row?.value_json || "{}")); return Array.isArray(v.items) ? v.items : []; } catch { return []; }
}

async function writeItems(env, clientId, items) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'items', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify({ items: items.slice(-MAX_ITEMS) })).run();
}

export function libraryView(items) {
  const order = { livre: 0, programado: 1, erro: 2 };
  return items.map(it => ({
    id: it.id, url: "/media/" + it.key, format: it.format, width: it.width, height: it.height,
    status: it.status, when: it.when || null, postType: it.postType || null, error: it.error || "", name: it.name || ""
  })).sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

// ---------- 1. subir para a biblioteca (descarta repetidas) ----------
export async function addToLibrary(env, client, form, now = new Date()) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const files = form.getAll("images").filter(f => f && typeof f.arrayBuffer === "function");
  if (!files.length) throw new Error("library_empty");
  if (files.length > MAX_FILES_PER_UPLOAD) throw new Error("library_count");
  const items = await readItems(env, client.id);
  const known = new Set(items.map(i => i.hash));
  const batch = now.getTime().toString(36);
  const added = [], duplicates = [], invalid = [];
  let order = 0;
  for (const file of files) {
    const ext = TYPES[String(file.type || "").toLowerCase()];
    if (!ext || !file.size || file.size > MAX_BYTES) { invalid.push(String(file.name || "").slice(0, 60)); continue; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hash = await sha256(bytes);
    if (known.has(hash)) { duplicates.push(String(file.name || "").slice(0, 60)); continue; }
    known.add(hash);
    const size = imageSize(bytes);
    const id = hash.slice(0, 16);
    const key = `library/${client.id}/artes/${id}.${ext}`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { clientId: String(client.id), kind: "art-library" } });
    const item = { id, hash, key, mime: file.type, width: size.width, height: size.height, format: formatFor(size), batch, order: order++, name: String(file.name || "").slice(0, 80), at: now.toISOString(), status: "livre" };
    items.push(item);
    added.push(item);
  }
  await writeItems(env, client.id, items);
  return { added: added.length, duplicates, invalid, items: libraryView(items) };
}

export async function removeFromLibrary(env, client, id) {
  const items = await readItems(env, client.id);
  const item = items.find(i => i.id === String(id));
  if (!item) throw new Error("library_not_found");
  if (item.status === "livre") await env.MEDIA.delete(item.key).catch(() => null);
  await writeItems(env, client.id, items.filter(i => i.id !== item.id));
  return { ok: true, items: libraryView(items.filter(i => i.id !== item.id)) };
}

// ---------- 2. horários livres ----------
function brasiliaDay(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function takenSlots(env, clientId, fromIso) {
  const rows = await env.DB.prepare(
    `SELECT scheduled_for, COALESCE(json_extract(payload_json,'$.creativeFeatures.requestedFormat'),'post') AS fmt
     FROM post_ledger WHERE client_id=?1 AND scheduled_for>=?2
     AND COALESCE(approval_status,'')<>'rejected' AND COALESCE(status,'') NOT LIKE 'cancel%'`
  ).bind(String(clientId), fromIso).all().catch(() => ({ results: [] }));
  const feed = new Set(), story = new Set();
  for (const r of rows?.results || []) (String(r.fmt) === "story" ? story : feed).add(new Date(r.scheduled_for).toISOString());
  return { feed, story };
}

export async function freeSlots(env, clientId, now = new Date(), days = 7) {
  const start = brasiliaDay(now);
  const taken = await takenSlots(env, clientId, now.toISOString());
  const feed = [], story = [];
  for (let d = 0; d < days; d++) {
    const day = addDays(start, d);
    for (const time of SLOT_TIMES) {
      const iso = new Date(`${day}T${time}:00-03:00`).toISOString();
      if (Date.parse(iso) < now.getTime() + 15 * 60000) continue;
      if (!taken.feed.has(iso)) feed.push({ day, time, iso });
      if (!taken.story.has(iso)) story.push({ day, time, iso });
    }
  }
  return { feed, story };
}

// ---------- 3. plano: o que vai em cada horário ----------
// Stories: imagens verticais, na ordem em que chegaram. Feed: no horário das 09h, se o lote tiver
// 2 ou mais imagens livres, vira carrossel (até 5); nos outros horários, post de uma imagem.
export function planLibrary(items, slots) {
  const stories = items.filter(i => i.status === "livre" && i.format === "story");
  const feed = items.filter(i => i.status === "livre" && i.format !== "story")
    .sort((a, b) => (a.at || "").localeCompare(b.at || "") || a.order - b.order);
  const plan = [];
  for (const slot of slots.story) {
    const next = stories.shift();
    if (!next) break;
    plan.push({ ...slot, type: "story", items: [next] });
  }
  for (const slot of slots.feed) {
    if (!feed.length) break;
    const head = feed[0];
    const sameBatch = feed.filter(i => i.batch === head.batch);
    if (slot.time === "09:00" && sameBatch.length >= 2) {
      const group = sameBatch.slice(0, 5);
      for (const g of group) feed.splice(feed.indexOf(g), 1);
      plan.push({ ...slot, type: "carousel", items: group });
    } else {
      plan.push({ ...slot, type: "post", items: [feed.shift()] });
    }
  }
  return plan;
}

// ---------- 4. legenda olhando a imagem ----------
function bytesToBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function captionPrompt(client, type) {
  const brand = clientBrand(client);
  return [
    `Você é o redator do Instagram de ${brand.brandName || client.name}.`,
    brand.niche ? `Ramo: ${brand.niche}.` : "",
    brand.offer ? `O que vende: ${brand.offer}.` : "",
    brand.audience ? `Para quem: ${brand.audience}.` : "",
    `Escreva em português do Brasil a legenda de um ${type === "carousel" ? "carrossel" : "post"} sobre o que aparece nesta imagem.`,
    "Primeira linha forte e curta. Depois 2 parágrafos curtos, tom próximo e direto.",
    "No fim, a frase: Comente QUERO que a gente te chama no direct.",
    "Depois 4 ou 5 hashtags do ramo e da região.",
    "Não invente preço, prazo, desconto, número de telefone, depoimento ou promessa. Não use aspas. Responda só com a legenda."
  ].filter(Boolean).join(" ");
}

export async function writeCaption(env, client, bytes, mime, type) {
  if (!env?.AI) return "";
  try {
    const out = await Promise.race([
      env.AI.run(String(env.NEXUS_VISION_MODEL || VISION_MODEL), {
        messages: [{ role: "user", content: [
          { type: "text", text: captionPrompt(client, type) },
          { type: "image_url", image_url: { url: `data:${mime || "image/jpeg"};base64,${bytesToBase64(bytes)}` } }
        ] }],
        max_tokens: 700, temperature: 0.6
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000))
    ]);
    const text = String(out?.response || "").replace(/^["“]|["”]$/g, "").trim().slice(0, 2200);
    return /QUERO/.test(text) ? text : "";
  } catch {
    return "";
  }
}

// ---------- 5. organizar e programar ----------
export async function organizeLibrary(env, client, now = new Date(), options = {}) {
  const items = await readItems(env, client.id);
  const slots = await freeSlots(env, client.id, now, Number(options.days) || 7);
  const plan = planLibrary(items, slots);
  const upload = options.upload || masterUpload;
  const caption = options.caption || writeCaption;
  const result = { scheduled: [], failed: [], leftover: 0, duplicatesRemoved: 0 };
  for (const piece of plan) {
    try {
      const form = new FormData();
      form.set("clientId", client.id);
      form.set("approval", "cliente");
      form.set("type", piece.type);
      form.set("date", piece.day);
      form.set("time", piece.time);
      form.set("noDuplicate", "1");
      let first = null;
      for (const it of piece.items) {
        const obj = await env.MEDIA.get(it.key);
        if (!obj) throw new Error("arquivo_sumiu");
        const bytes = new Uint8Array(await obj.arrayBuffer());
        if (!first) first = { bytes, mime: it.mime };
        form.append("images", new File([bytes], `${it.id}.${TYPES[it.mime] || "jpg"}`, { type: it.mime }));
      }
      // Sem legenda da IA, o Nexus usa a legenda pronta do ramo (masterUpload).
      if (piece.type !== "story") form.set("caption", await caption(env, client, first.bytes, first.mime, piece.type));
      const res = await upload(env, form, now);
      for (const it of piece.items) Object.assign(it, { status: "programado", when: piece.iso, postType: piece.type, postId: res?.id || "", error: "" });
      result.scheduled.push({ when: piece.iso, type: piece.type, count: piece.items.length });
    } catch (error) {
      const code = String(error?.message || error).slice(0, 60);
      if (code !== "slot_taken") for (const it of piece.items) Object.assign(it, { status: "erro", error: code });
      result.failed.push({ when: piece.iso, type: piece.type, error: code });
    }
  }
  result.leftover = items.filter(i => i.status === "livre").length;
  await writeItems(env, client.id, items);
  if (options.removeDuplicates !== false) result.duplicatesRemoved = await removeQueuedDuplicates(env, client, now, options.deletePost);
  return { ...result, items: libraryView(items) };
}

// Posts que ainda não saíram, com a MESMA imagem: fica o primeiro, os outros saem da fila.
// A comparação é pelo arquivo da imagem guardado no Nexus (mesmo conteúdo = repetido).
export async function removeQueuedDuplicates(env, client, now = new Date(), deletePost = deletePostFromPanel) {
  const rows = await env.DB.prepare(
    `SELECT id, scheduled_for, image_object_key, payload_json,
     COALESCE(json_extract(payload_json,'$.creativeFeatures.requestedFormat'),'post') AS fmt FROM post_ledger
     WHERE client_id=?1 AND scheduled_for>=?2
     AND COALESCE(status,'') NOT IN ('published','publishing') AND COALESCE(status,'') NOT LIKE 'cancel%'
     AND COALESCE(approval_status,'')<>'rejected' ORDER BY scheduled_for ASC`
  ).bind(String(client.id), now.toISOString()).all().catch(() => ({ results: [] }));
  const seen = new Set();
  let removed = 0;
  for (const r of rows?.results || []) {
    let key = String(r.image_object_key || "");
    if (!key) {
      let payload = {};
      try { payload = JSON.parse(String(r.payload_json || "{}")); } catch { payload = {}; }
      const url = String(payload.imageUrl || "");
      key = url.includes("/media/") ? decodeURIComponent(url.split("/media/")[1]) : "";
    }
    if (!key) continue;
    const obj = await env.MEDIA.get(key).catch(() => null);
    if (!obj) continue;
    const hash = String(r.fmt) + ":" + await sha256(new Uint8Array(await obj.arrayBuffer()));
    if (!seen.has(hash)) { seen.add(hash); continue; }
    try { await deletePost(env, client, r.id); removed += 1; } catch { /* segue */ }
  }
  return removed;
}

// Cron: quem tem imagem livre na biblioteca ganha os horários livres dos próximos 7 dias.
export async function runLibraryAutoSchedule(env, clients = [], now = new Date()) {
  const out = {};
  for (const client of clients) {
    const items = await readItems(env, client.id).catch(() => []);
    if (!items.some(i => i.status === "livre")) continue;
    out[client.id] = await organizeLibrary(env, client, now).catch(error => ({ error: String(error?.message || error).slice(0, 80) }));
  }
  return out;
}

export const LIBRARY_MESSAGES = {
  library_empty: "Escolha pelo menos uma imagem.",
  library_count: "Envie no máximo 30 imagens por vez.",
  library_not_found: "Imagem não encontrada.",
  r2_unavailable: "Armazenamento indisponível. Tente de novo."
};

// Rotas iguais no painel do cliente e no Master (o Master manda ?clientId=).
export async function handleLibrary(request, env, url, client, base) {
  if (!url.pathname.startsWith(base)) return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  try {
    const path = url.pathname.slice(base.length);
    if ((path === "" || path === "/") && request.method === "GET") return send({ ok: true, items: libraryView(await readItems(env, client.id)) });
    if (path === "/enviar" && request.method === "POST") {
      const form = await request.formData().catch(() => null);
      if (!form) throw new Error("library_empty");
      const added = await addToLibrary(env, client, form);
      // Já organiza na hora: o cliente vê os posts programados no painel.
      const organized = added.added ? await organizeLibrary(env, client) : null;
      return send({ ok: true, ...added, organized, items: organized?.items || added.items });
    }
    if (path === "/organizar" && request.method === "POST") return send({ ok: true, ...(await organizeLibrary(env, client)) });
    if (path === "/remover" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await removeFromLibrary(env, client, body.id));
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: LIBRARY_MESSAGES[code] || "Não deu certo. Tente de novo." }, 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}
