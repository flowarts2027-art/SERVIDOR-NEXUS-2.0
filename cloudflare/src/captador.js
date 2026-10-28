// Captador de clientes: ferramenta vendida aos clientes da Flow Arts (R$ 97/mês).
// Mesma busca do Caçador do Master: Google Maps (API oficial do Google Places,
// com a chave da Flow Arts). O cliente escolhe o tipo de negócio e escreve a cidade.
// Regra do Google: a lista aparece na hora e NÃO é guardada. Fica guardado só
// quem o cliente chamar no WhatsApp (nome, telefone, cidade) e o código do lugar
// de quem ele marcar "não serve". Tudo separado por cliente.
// Nada é enviado pelo servidor: o cliente manda pelo próprio WhatsApp.

import { phoneInfo, siteInfo, mapsSearchLink, STATUSES, placesKey, searchPlaces, OVERPASS_ENDPOINTS, searchNominatim } from "./prospects.js";
import { SHOWCASE_CLIENT, readShowcase, showcaseLine, canonicalNiche } from "./showcase-store.js";
import { parseOsmHours, googleHours, withHours, hoursStatus, readWeek } from "./business-hours.js";
import { clientDailySettings, saveClientDailySettings, runClientDaily, publicDaily, suggestedNiches } from "./captador-daily.js";
import { clientRegion, RJ_STATE_CITIES } from "./captador-regions.js";

// "depois" (18/10): empresa fechada na hora da busca; o cliente pediu para lembrar quando abrir.
// "hoje" (22/10): separada pela busca diária automática, esperando o cliente mandar.
const CAP_STATUSES = [...STATUSES, "depois", "hoje"];

// Limite de buscas por cliente, por mês. Começa em 100; o Rodrigo muda no Master.
export const CAPTADOR_MONTHLY_LIMIT = 100;
export const CAPTADOR_MAX_LIMIT = 3000;
export const CAPTADOR_PRICE = "R$ 97 por mês";

// `query` é o texto da busca no Google ("<query> em <cidade>").
export const CAPTADOR_NICHES = {
  restaurante: { label: "Restaurante", query: "restaurante" },
  cafeteria: { label: "Cafeteria", query: "cafeteria" },
  lanchonete: { label: "Lanchonete", query: "lanchonete" },
  padaria: { label: "Padaria", query: "padaria" },
  bar: { label: "Bar", query: "bar" },
  salao: { label: "Salão de beleza e barbearia", query: "salão de beleza" },
  academia: { label: "Academia", query: "academia" },
  pet: { label: "Pet shop", query: "pet shop" },
  // Lojas de ração e agro (pedido de 14/10: cliente que revende Quatree em MG).
  racao: { label: "Loja de ração", query: "loja de ração" },
  agropecuaria: { label: "Agropecuária", query: "agropecuária" },
  veterinario: { label: "Veterinário", query: "clínica veterinária" },
  dentista: { label: "Dentista", query: "dentista" },
  clinica: { label: "Clínica e consultório", query: "clínica médica" },
  farmacia: { label: "Farmácia", query: "farmácia" },
  mercado: { label: "Mercado", query: "mercado" },
  roupas: { label: "Loja de roupas", query: "loja de roupas" },
  oficina: { label: "Oficina mecânica", query: "oficina mecânica" },
  hotel: { label: "Hotel e pousada", query: "pousada" },
  imobiliaria: { label: "Imobiliária", query: "imobiliária" },
  contabilidade: { label: "Contabilidade", query: "escritório de contabilidade" },
  material: { label: "Material de construção", query: "loja de material de construção" }
};

// Construção civil (pedido do Rodrigo, 27/10/2026: GILTEC, locação de equipamentos para obra).
// Só no Captador dos clientes: fica fora dos 21 nichos da vitrine e do Caçador do Master.
export const CAPTADOR_EXTRA_NICHES = {
  construtora: { label: "Construtora", query: "construtora" },
  engenharia: { label: "Engenharia civil", query: "empresa de engenharia civil" },
  terraplenagem: { label: "Terraplenagem", query: "terraplenagem" },
  pavimentacao: { label: "Pavimentação e obras em rodovias", query: "pavimentação asfáltica" },
  reforma: { label: "Reformas e empreiteiras", query: "empresa de reformas" },
  // 28/10 (Rodrigo): outras locadoras de equipamentos também são clientes da GILTEC (sublocação/parceria).
  locadora: { label: "Locadoras de equipamentos", query: "locação de equipamentos para construção" },
  // 28/10 (Rodrigo: "capricha, esse cliente é muito importante"): mais quem usa equipamento de obra.
  incorporadora: { label: "Incorporadoras", query: "incorporadora construtora" },
  empreiteira: { label: "Empreiteiras de obras", query: "empreiteira de obras" },
  saneamento: { label: "Saneamento e drenagem", query: "obras de saneamento e drenagem" },
  andaimes: { label: "Andaimes e máquinas (locadoras)", query: "aluguel de andaimes e máquinas para obra" }
};

// 28/10 (Rodrigo): a GILTEC não vende para loja de material de construção. Nos tipos de construção,
// loja de material, ferragem, depósito e home center ficam de fora da busca.
const CONSTRUCTION_NICHES = new Set(["construtora", "engenharia", "terraplenagem", "pavimentacao", "reforma", "locadora", "incorporadora", "empreiteira", "saneamento", "andaimes"]);
// "Casa do Construtor" é rede de LOCAÇÃO de equipamentos (cliente/parceira da GILTEC), não loja: fica.
const MATERIAL_STORE_NAME = /materia(l|is)|\bmat\.? ?(de )?constr|ferrag|ferro e a[cç]o|home ?center|dep[oó]sito|madeireira|tintas|casa d[aoe]s? constru(?!tor)|constru[cç][aã]o e acabamento|acabamentos|revestimentos|\bloja\b|cer[aâ]mica|telhas|hidr[aá]ulica e el[eé]trica|el[eé]trica e hidr[aá]ulica|\bareal\b/i;
const MATERIAL_STORE_TYPES = /hardware|home_improvement|home_goods|building_materials|paint|furniture|doityourself/i;
export function isMaterialStore(nicheKey, name = "", kind = "") {
  if (!CONSTRUCTION_NICHES.has(String(nicheKey))) return false;
  return MATERIAL_STORE_NAME.test(String(name)) || MATERIAL_STORE_TYPES.test(String(kind));
}
// Todos os tipos que o Captador do cliente aceita (vitrine + extras).
export const CAPTADOR_ALL_NICHES = { ...CAPTADOR_NICHES, ...CAPTADOR_EXTRA_NICHES };

// Mesmos tipos no mapa grátis (OpenStreetMap), usado quando o Google não responde (17/10).
export const CAPTADOR_OSM_TAGS = {
  restaurante: [["amenity", "restaurant"]], cafeteria: [["amenity", "cafe"]], lanchonete: [["amenity", "fast_food"]],
  padaria: [["shop", "bakery"]], bar: [["amenity", "bar"], ["amenity", "pub"]], salao: [["shop", "hairdresser"], ["shop", "beauty"]],
  academia: [["leisure", "fitness_centre"]], pet: [["shop", "pet"]], racao: [["shop", "pet"], ["shop", "agrarian"]],
  agropecuaria: [["shop", "agrarian"]], veterinario: [["amenity", "veterinary"]],
  dentista: [["amenity", "dentist"]], clinica: [["amenity", "clinic"], ["amenity", "doctors"]], farmacia: [["amenity", "pharmacy"]],
  mercado: [["shop", "supermarket"], ["shop", "convenience"]], roupas: [["shop", "clothes"]], oficina: [["shop", "car_repair"]],
  hotel: [["tourism", "hotel"], ["tourism", "guest_house"]], imobiliaria: [["office", "estate_agent"]],
  contabilidade: [["office", "accountant"]], material: [["shop", "hardware"], ["shop", "doityourself"]],
  // "name~" = procura no nome da empresa (27/10): no mapa grátis muita construtora só tem o nome.
  construtora: [["office", "construction_company"], ["name~", "construtora|constru[cç][oõ]es|incorporadora"]],
  engenharia: [["office", "engineer"], ["name~", "engenharia"]],
  terraplenagem: [["name~", "terraplen|escava[cç]|movimenta[cç][aã]o de terra"]],
  pavimentacao: [["name~", "paviment|asfalt|rodovi|saneamento"]],
  reforma: [["craft", "builder"], ["craft", "tiler"], ["craft", "plasterer"], ["name~", "reforma|empreiteira|empreiteiro"]],
  locadora: [["shop", "tool_hire"], ["name~", "locadora|loca[cç][aã]o de (equipamento|m[aá]quina)|loca[cç][oõ]es|aluguel de (equipamento|m[aá]quina)|andaime"]],
  incorporadora: [["office", "property_developer"], ["name~", "incorporadora|empreendimentos imobili"]],
  empreiteira: [["name~", "empreiteira|empreiteiro|empreitada"]],
  saneamento: [["name~", "saneamento|drenagem|esgoto|hidrossanit"]],
  andaimes: [["shop", "tool_hire"], ["name~", "andaime|aluguel de m[aá]quina|loca[cç][aã]o de m[aá]quina"]]
};
const OSM_ID = /^osm:(node|way|relation)\/\d+$/;

const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);
const clean = (value, max) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const GOOGLE_ID = /^[A-Za-z0-9_-]{10,300}$/;
const validLeadId = id => GOOGLE_ID.test(id) || OSM_ID.test(id);

// Tipos de negócio que o cliente pode buscar (23/10): quem vende ração vê só pet shop,
// loja de ração, agropecuária e veterinário. Os outros clientes veem todos.
export function clientNiches(client = {}) {
  const only = suggestedNiches(client);
  const keys = only.length ? only : Object.keys(CAPTADOR_NICHES);
  return keys.filter(key => CAPTADOR_ALL_NICHES[key]);
}

export async function ensureCaptadorSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS captador_leads (
      client_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      niche TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      mobile INTEGER NOT NULL DEFAULT 0,
      has_site INTEGER NOT NULL DEFAULT 0,
      instagram TEXT,
      maps_url TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'novo',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_id, id)
    )`).run();
  try { await env.DB.prepare("ALTER TABLE captador_leads ADD COLUMN remind_at TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
  try { await env.DB.prepare("ALTER TABLE captador_leads ADD COLUMN hours_json TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
  // Só o código do lugar de quem o cliente marcou "não serve" (permitido pelo Google).
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS captador_skips (
      client_id TEXT NOT NULL,
      id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_id, id)
    )`).run();
}

async function readState(env, clientId, key, fallback) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='captador' AND item_key=?1 AND client_id=?2 LIMIT 1"
  ).bind(key, clientId).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : fallback; } catch { return fallback; }
}

async function writeState(env, clientId, key, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES('captador',?1,?2,?3,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(key, clientId, JSON.stringify(value)).run();
}

// Para quem o cliente vende (24/10, pedido do Rodrigo): "empresas" ou "pessoas" (pessoa física).
// Quem vende para pessoa física (ex.: despachante de CAC) recebe só o Instagram:
// a aba "Buscar" some do painel dele, porque a busca só traz empresas.
export const AUDIENCES = Object.freeze(["empresas", "pessoas"]);
const PESSOA_FISICA_HINT = /despachante|\bcacs?\b|atirador|\barmas?\b|pessoa f[ií]sica|consumidor final/i;

export function defaultAudience(client = {}) {
  const text = [client?.niche, client?.config?.agentProfile?.niche, client?.config?.agentProfile?.offer].filter(Boolean).join(" ");
  return PESSOA_FISICA_HINT.test(text) ? "pessoas" : "empresas";
}

// Brinde (24/10, pedido do Rodrigo): o plano Completo já vem com o Captador ligado
// para quem vende para empresas. O Master ainda pode desligar (giftOff).
export function planGivesCaptador(client = {}) {
  const plan = client?.config?.plan || client?.plan;
  if (!plan || typeof plan !== "object") return false;
  if (Array.isArray(plan.gifts) && plan.gifts.includes("captador")) return true;
  return ["completo", "completo-trafego"].includes(String(plan.id || "").toLowerCase());
}

async function readAccess(env, clientId, client = null) {
  const preset = CAPTADOR_PRESETS[String(clientId || "")]?.access || {};
  const access = await readState(env, String(clientId || ""), "access", { enabled: false, ...preset });
  const limit = Math.round(Number(access.monthlyLimit));
  const audience = AUDIENCES.includes(access.audience) ? access.audience : defaultAudience(client || {});
  const gift = Boolean(client && planGivesCaptador(client) && audience === "empresas" && access.giftOff !== true);
  return { enabled: access.enabled === true || gift, gift, monthlyLimit: Number.isFinite(limit) && limit >= 0 ? limit : CAPTADOR_MONTHLY_LIMIT, audience };
}

export async function captadorAudience(env, client) {
  return (await readAccess(env, client?.id, client)).audience;
}

export async function captadorEnabled(env, clientId, client = null) {
  return (await readAccess(env, clientId, client)).enabled;
}

// Buscas já feitas pelo cliente neste mês.
export async function captadorUsage(env, clientId) {
  const usage = await readState(env, String(clientId || ""), "usage", { month: "", count: 0 });
  return usage.month === thisMonth() ? Number(usage.count || 0) : 0;
}

// Liga/desliga e, se vier, muda o limite do mês daquele cliente.
export async function setCaptadorAccess(env, clientId, enabled, monthlyLimit, audience) {
  const id = String(clientId || "").trim();
  if (!id) throw new Error("client_id_required");
  const current = await readAccess(env, id);
  if (audience !== undefined && audience !== null && audience !== "" && !AUDIENCES.includes(audience)) throw new Error("audience_invalid");
  const who = AUDIENCES.includes(audience) ? audience : current.audience;
  let limit = current.monthlyLimit;
  if (monthlyLimit !== undefined && monthlyLimit !== null && monthlyLimit !== "") {
    limit = Math.round(Number(monthlyLimit));
    if (!Number.isFinite(limit) || limit < 0 || limit > CAPTADOR_MAX_LIMIT) throw new Error("limit_invalid");
  }
  const on = enabled === undefined ? current.enabled : Boolean(enabled);
  const saved = await readState(env, id, "access", {});
  const giftOff = enabled === undefined ? saved.giftOff === true : enabled === false;
  await writeState(env, id, "access", { enabled: on, monthlyLimit: limit, audience: who, giftOff, updatedAt: new Date().toISOString() });
  return { ok: true, clientId: id, enabled: on, monthlyLimit: limit, audience: who };
}

// Configuração pronta de um cliente (pedido do Rodrigo). Vale só enquanto o cliente não salvar outra no painel.
// GILTEC (27/10/2026): locação de equipamentos para construção; a vendedora é a Rose.
export const CAPTADOR_PRESETS = Object.freeze({
  giltec: Object.freeze({
    access: { enabled: true, monthlyLimit: 1500 }, // mapa grátis, sem custo; 92 cidades × 6 tipos
    config: {
      myName: "Rose",
      business: "GILTEC Locações",
      offer: "A GILTEC aluga equipamentos para construção civil: compactadores, marteletes, geradores, betoneiras, cortadoras de piso, alisadoras de concreto, guinchos, escoras e torres de iluminação, das marcas Buffalo, Toyama, CSM e outras. Se vocês tiverem alguma obra em andamento, posso mandar a lista de equipamentos e os valores da locação."
    },
    daily: { enabled: true, onlyWhatsapp: true, cities: RJ_STATE_CITIES } // estado do RJ inteiro (27/10)
  })
});
export const captadorPreset = client => CAPTADOR_PRESETS[String(client?.id || "")] || null;

export function defaultConfig(client = {}) {
  return { myName: "", business: clean(client.name, 80), offer: "", onlyNoSite: false, ...(captadorPreset(client)?.config || {}) };
}

export async function captadorConfig(env, client) {
  return { ...defaultConfig(client), ...(await readState(env, client.id, "config", {})) };
}

export async function saveCaptadorConfig(env, client, body = {}) {
  const next = {
    myName: clean(body.myName, 60),
    business: clean(body.business, 80),
    offer: clean(body.offer, 400),
    onlyNoSite: body.onlyNoSite === true
  };
  await writeState(env, client.id, "config", next);
  return next;
}

// "Meu material" (pedido de 18/10): fotos, vídeo ou tabela de preço do PRÓPRIO cliente,
// para mandar junto com a primeira mensagem. Não é gerado por IA e nunca vira post
// (fica em material/<cliente>/, fora da biblioteca de posts). Só o próprio cliente e o Master abrem.
export const MATERIAL_MAX_FILES = 10;
export const MATERIAL_MAX_BYTES = 95 * 1024 * 1024;
const MATERIAL_TYPES = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "application/pdf": "pdf"
};

export async function captadorMaterial(env, client) {
  const value = await readState(env, client.id, "material", {});
  const files = Array.isArray(value?.files) ? value.files.filter(f => f && typeof f.key === "string") : [];
  return { files, savedAt: value?.savedAt || null };
}

export function materialView(material) {
  const files = (material?.files || []).map(f => ({ url: "/media/" + f.key.split("/").map(encodeURIComponent).join("/"), type: f.type, name: f.name, size: f.size }));
  return { files, savedAt: material?.savedAt || null, kind: materialKind(files) };
}

function materialKind(files) {
  if (!files.length) return "";
  const videos = files.filter(f => String(f.type).startsWith("video/")).length;
  const pdfs = files.filter(f => f.type === "application/pdf").length;
  if (videos && videos === files.length) return files.length === 1 ? "um vídeo" : "uns vídeos";
  if (pdfs && pdfs === files.length) return "a nossa tabela";
  if (!videos && !pdfs) return files.length === 1 ? "uma foto" : "umas fotos";
  return "o nosso material";
}

export async function saveCaptadorMaterial(env, client, form, now = new Date()) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const files = (form?.getAll?.("files") || []).filter(f => f && typeof f.arrayBuffer === "function" && f.size);
  if (!files.length) throw new Error("material_empty");
  if (files.length > MATERIAL_MAX_FILES) throw new Error("material_count");
  let total = 0;
  for (const file of files) {
    if (!MATERIAL_TYPES[String(file.type || "").toLowerCase()]) throw new Error("material_type");
    total += Number(file.size || 0);
  }
  if (total > MATERIAL_MAX_BYTES) throw new Error("material_size");
  const base = `material/${client.id}/${now.getTime()}/`;
  const saved = [];
  for (let i = 0; i < files.length; i++) {
    const type = String(files[i].type).toLowerCase();
    const key = `${base}${String(i + 1).padStart(2, "0")}.${MATERIAL_TYPES[type]}`;
    await env.MEDIA.put(key, files[i].stream(), { httpMetadata: { contentType: type }, customMetadata: { kind: "captador-material", clientId: String(client.id) } });
    saved.push({ key, type, name: clean(files[i].name, 80), size: Number(files[i].size || 0) });
  }
  const old = await captadorMaterial(env, client);
  await writeState(env, client.id, "material", { files: saved, savedAt: now.toISOString() });
  for (const f of old.files) await env.MEDIA.delete(f.key).catch(() => {});
  return materialView({ files: saved, savedAt: now.toISOString() });
}

export async function clearCaptadorMaterial(env, client) {
  const old = await captadorMaterial(env, client);
  await writeState(env, client.id, "material", { files: [], savedAt: null });
  for (const f of old.files) await env.MEDIA?.delete(f.key).catch(() => {});
  return materialView({ files: [] });
}

// Com material: o texto avisa que a mídia vem logo embaixo.
export function messageWithMaterial(message, kind) {
  if (!kind) return "";
  const text = String(message || "");
  const line = `Vou te mandar aqui embaixo ${kind}, para você ver.`;
  const ask = "Posso te contar mais?";
  return text.includes(ask) ? text.replace(ask, line + "\n\n" + ask) : text + "\n\n" + line;
}

// A mensagem é do cliente. A frase de "não quero receber" é obrigatória.
export function captadorMessage(config, lead, showcase = null) {
  const name = config.myName || "a equipe";
  const lines = [`Oi, tudo bem? Aqui é ${name}${config.business ? ", da " + config.business : ""}.`];
  lines.push(`Encontrei a ${lead.name} aqui em ${lead.city}.`);
  if (config.offer) lines.push(config.offer);
  // Vitrine do nicho (só Flow Arts): vídeo de exemplo para o tipo de negócio buscado.
  const example = showcase ? showcaseLine(showcase, lead.niche, CAPTADOR_NICHES[lead.niche]?.label) : "";
  if (example) lines.push(example);
  lines.push("Posso te contar mais?");
  lines.push("Se preferir não receber mensagens, é só me avisar.");
  return lines.join("\n\n");
}

const withMessage = (config, lead, showcase = null, materialKindText = "") => {
  const message = captadorMessage(config, lead, showcase);
  const out = { ...lead, mobile: Boolean(lead.mobile), has_site: Boolean(lead.has_site), message,
    whatsapp: lead.phone ? `https://wa.me/55${lead.phone}?text=${encodeURIComponent(message)}` : "" };
  // Direct do Instagram (22/10): abre a conversa; o texto vai copiado, porque o Instagram não aceita texto no link.
  if (/^[a-z0-9._]{1,30}$/i.test(String(lead.instagram || ""))) out.direct = `https://ig.me/m/${lead.instagram}`;
  if (materialKindText) {
    out.messageWithMedia = messageWithMaterial(message, materialKindText);
    out.whatsappWithMedia = lead.phone ? `https://wa.me/55${lead.phone}?text=${encodeURIComponent(out.messageWithMedia)}` : "";
  }
  return out;
};

// Nota de 0 a 10: empresa ativa e bem avaliada, fácil de chamar no WhatsApp.
export function captadorScore({ reviews = 0, rating = 0, mobile = false, hasSite = false }) {
  let score = 3;
  if (reviews >= 100) score += 2; else if (reviews >= 20) score += 1;
  if (rating >= 4.5) score += 2; else if (rating >= 4.0) score += 1;
  if (mobile) score += 2;
  if (!hasSite) score += 1;
  return Math.max(0, Math.min(10, score));
}

// Um lugar do Google vira um contato (ou null se não servir).
export function captadorLead(place, nicheKey, city, onlyNoSite = false) {
  if (!place?.id || !GOOGLE_ID.test(String(place.id))) return null;
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return null;
  const name = clean(place.displayName?.text, 120);
  if (!name) return null;
  if (isMaterialStore(nicheKey, name, [place.primaryType, ...(Array.isArray(place.types) ? place.types : [])].join(" "))) return null;
  const site = siteInfo(place.websiteUri);
  if (onlyNoSite && site.hasOwnSite) return null;
  const { phone, mobile } = phoneInfo(place.nationalPhoneNumber || place.internationalPhoneNumber);
  if (!phone) return null;
  const reviews = Number(place.userRatingCount || 0);
  const rating = Number(place.rating || 0);
  return {
    id: String(place.id), name, niche: nicheKey, city,
    address: clean(place.formattedAddress, 200), phone, mobile,
    has_site: site.hasOwnSite, instagram: site.instagram, rating, reviews,
    maps_url: /^https:\/\//.test(String(place.googleMapsUri || "")) ? String(place.googleMapsUri).slice(0, 300) : mapsSearchLink(name, city),
    score: captadorScore({ reviews, rating, mobile, hasSite: site.hasOwnSite }),
    hours: googleHours(place.regularOpeningHours)
  };
}

async function alreadyKnown(env, clientId, id) {
  if (await env.DB.prepare("SELECT 1 AS x FROM captador_leads WHERE client_id=?1 AND id=?2").bind(clientId, id).first()) return true;
  return Boolean(await env.DB.prepare("SELECT 1 AS x FROM captador_skips WHERE client_id=?1 AND id=?2").bind(clientId, id).first());
}

// "Curitiba PR", "Nova Friburgo, RJ", "Niterói - RJ" → só o nome da cidade, para o mapa grátis.
export function cityName(city) {
  return clean(city, 60).replace(/\s*[,\-/]?\s*\b[A-Za-z]{2}$/u, "").replace(/["\\]/g, "").trim();
}

export function captadorOverpassQuery(niche, city) {
  const name = cityName(city);
  const parts = (CAPTADOR_OSM_TAGS[niche] || []).map(([k, v]) => k === "name~"
    ? `nwr["name"~"${v}",i](area.c);`
    : `nwr["${k}"="${v}"]["name"](area.c);`).join("");
  return `[out:json][timeout:25];area["boundary"="administrative"]["admin_level"="8"]["name"="${name}"]->.c;(${parts});out tags center 400;`;
}

export async function searchCaptadorOSM(niche, city, fetcher) {
  let last = "osm_failed";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "FlowArtsNexus/1.0 (+https://flowarts.com.br)" },
        body: "data=" + encodeURIComponent(captadorOverpassQuery(niche, city)),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) { last = "osm_" + response.status; continue; }
      const data = await response.json().catch(() => ({}));
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) {
      last = String(error?.message || error).slice(0, 60);
    }
  }
  // Terceira reserva: Nominatim (mesmo mapa, menos telefones).
  try {
    return await searchNominatim((CAPTADOR_OSM_TAGS[niche] || []).filter(([k]) => k !== "name~"), cityName(city), fetcher);
  } catch {
    throw new Error(last);
  }
}

// Um ponto do mapa grátis vira um contato (ou null se não servir).
export function captadorLeadOSM(element, nicheKey, city, onlyNoSite = false) {
  const tags = element?.tags || {};
  const id = "osm:" + element?.type + "/" + element?.id;
  if (!OSM_ID.test(id)) return null;
  const name = clean(tags.name, 120);
  if (!name || tags.disused || tags.brand || tags["brand:wikidata"]) return null;
  if (isMaterialStore(nicheKey, name, tags.shop || "")) return null;
  const { phone, mobile } = phoneInfo(String(tags["contact:whatsapp"] || tags["contact:mobile"] || tags.mobile || tags.phone || tags["contact:phone"] || "").split(/[;,]/)[0]);
  // 23/10: o mapa grátis quase nunca tem telefone. Sem telefone, a empresa entra assim mesmo,
  // com o botão "Ver no Maps" para o cliente pegar o número (antes era descartada).
  const website = String(tags.website || tags["contact:website"] || tags.url || "").trim();
  const site = siteInfo(website && !/^https?:/i.test(website) ? "https://" + website : website);
  if (onlyNoSite && site.hasOwnSite) return null;
  const igTag = String(tags["contact:instagram"] || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
  const address = clean([tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"]].filter(Boolean).join(", "), 200);
  return {
    id, name, niche: nicheKey, city, address, phone, mobile,
    has_site: site.hasOwnSite, instagram: site.instagram || (/^[a-z0-9._]{1,30}$/i.test(igTag) ? igTag : ""),
    rating: 0, reviews: 0, maps_url: mapsSearchLink(name, city),
    score: Math.max(0, captadorScore({ reviews: 0, rating: 0, mobile, hasSite: site.hasOwnSite }) - (phone ? 0 : 3)),
    hours: parseOsmHours(tags.opening_hours)
  };
}

// Busca no Google Maps; se o Google não responder (ou não houver chave), usa o mapa grátis.
// A lista vai direto para a tela do cliente, sem guardar.
export async function runCaptadorSearch(env, client, body = {}, fetcher = fetch) {
  await ensureCaptadorSchema(env);
  if (!(await captadorEnabled(env, client.id, client))) throw new Error("captador_disabled");
  const niche = canonicalNiche(body.niche);
  if (!CAPTADOR_ALL_NICHES[niche] || !clientNiches(client).includes(niche)) throw new Error("niche_invalid");
  const city = clean(body.city, 60);
  const area = clean(body.area, 60); // bairro (opcional), só na busca do Google
  if (city.length < 3 || !/\p{L}/u.test(city)) throw new Error("city_invalid");
  const key = await placesKey(env);
  const { monthlyLimit } = await readAccess(env, client.id);
  const used = await captadorUsage(env, client.id);
  if (used >= monthlyLimit) throw new Error("monthly_limit");
  await writeState(env, client.id, "usage", { month: thisMonth(), count: used + 1 });
  const config = await captadorConfig(env, client);
  let leads = null;
  let found = 0;
  let source = "google";
  let googleError = key ? "" : "sem_chave";
  if (key) {
    try {
      const places = await searchPlaces(key, `${CAPTADOR_ALL_NICHES[niche].query} em ${area ? area + ", " : ""}${city}`, fetcher);
      found = places.length;
      leads = places.map(place => captadorLead(place, niche, city, config.onlyNoSite));
    } catch (error) {
      // 23/10: o erro do Google aparecia escondido; agora volta na resposta e no log.
      googleError = String(error?.message || error).slice(0, 120);
      console.warn("captador_google_failed", client.id, googleError);
      leads = null;
    }
  }
  if (!leads) {
    source = "osm";
    try {
      const elements = await searchCaptadorOSM(niche, city, fetcher);
      found = elements.length;
      leads = elements.map(element => captadorLeadOSM(element, niche, city, config.onlyNoSite));
    } catch {
      // Busca que falhou não conta no limite do mês.
      await writeState(env, client.id, "usage", { month: thisMonth(), count: used });
      throw new Error("search_failed");
    }
  }
  const showcase = client.id === SHOWCASE_CLIENT ? await readShowcase(env) : null;
  const material = materialView(await captadorMaterial(env, client));
  const items = [];
  const seen = new Set();
  for (const lead of leads) {
    if (!lead || seen.has(lead.id) || await alreadyKnown(env, client.id, lead.id)) continue;
    seen.add(lead.id);
    items.push(withHours(withMessage(config, { ...lead, status: "novo" }, showcase, material.kind), lead.hours));
  }
  items.sort((a, b) => b.score - a.score);
  items.sort((a, b) => Boolean(b.phone) - Boolean(a.phone));
  return { ok: true, found, items, source, googleError: googleError || undefined, area: area || undefined, usedMonth: used + 1, monthlyLimit };
}

// Quem o cliente chamou no WhatsApp vira contato dele (nome, telefone, cidade).
export async function saveCaptadorContacted(env, client, body = {}) {
  await ensureCaptadorSchema(env);
  const id = String(body.id || "");
  if (!validLeadId(id) || !CAPTADOR_ALL_NICHES[body.niche]) throw new Error("lead_invalid");
  const city = clean(body.city, 60);
  const name = clean(body.name, 120);
  const { phone, mobile } = phoneInfo(body.phone);
  if (!phone || !name || !city) throw new Error("lead_invalid");
  const maps = String(body.maps_url || "");
  const mapsUrl = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps)\//.test(maps) ? maps.slice(0, 300) : mapsSearchLink(name, city);
  const instagram = /^[a-z0-9._]{1,30}$/i.test(String(body.instagram || "")) ? String(body.instagram) : "";
  const score = Math.max(0, Math.min(10, Math.round(Number(body.score) || 0)));
  await env.DB.prepare(
    `INSERT INTO captador_leads(client_id,id,name,niche,city,address,phone,mobile,has_site,instagram,maps_url,score,status)
     VALUES(?1,?2,?3,?4,?5,'',?6,?7,?8,?9,?10,?11,'enviado')
     ON CONFLICT(client_id,id) DO UPDATE SET status='enviado',updated_at=CURRENT_TIMESTAMP`
  ).bind(client.id, id, name, body.niche, city, phone, mobile ? 1 : 0, body.has_site === true ? 1 : 0, instagram, mapsUrl, score).run();
  return { ok: true, id };
}

// Empresa fechada agora: guarda para lembrar quando abrir (aba "Mandar depois").
export async function saveCaptadorLater(env, client, body = {}, now = new Date()) {
  await ensureCaptadorSchema(env);
  const id = String(body.id || "");
  if (!validLeadId(id) || !CAPTADOR_ALL_NICHES[body.niche]) throw new Error("lead_invalid");
  const city = clean(body.city, 60);
  const name = clean(body.name, 120);
  const { phone, mobile } = phoneInfo(body.phone);
  if (!phone || !name || !city) throw new Error("lead_invalid");
  const week = readWeek(body.hours);
  const st = hoursStatus(week, now);
  const remindAt = st.openNow ? now.toISOString() : st.nextOpenAt || new Date(now.getTime() + 3600e3).toISOString();
  const maps = String(body.maps_url || "");
  const mapsUrl = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps)\//.test(maps) ? maps.slice(0, 300) : mapsSearchLink(name, city);
  const instagram = /^[a-z0-9._]{1,30}$/i.test(String(body.instagram || "")) ? String(body.instagram) : "";
  const score = Math.max(0, Math.min(10, Math.round(Number(body.score) || 0)));
  await env.DB.prepare(
    `INSERT INTO captador_leads(client_id,id,name,niche,city,address,phone,mobile,has_site,instagram,maps_url,score,status,remind_at,hours_json)
     VALUES(?1,?2,?3,?4,?5,'',?6,?7,?8,?9,?10,?11,'depois',?12,?13)
     ON CONFLICT(client_id,id) DO UPDATE SET status='depois',remind_at=?12,hours_json=?13,updated_at=CURRENT_TIMESTAMP`
  ).bind(client.id, id, name, body.niche, city, phone, mobile ? 1 : 0, body.has_site === true ? 1 : 0, instagram, mapsUrl, score, remindAt, week ? JSON.stringify(week) : "").run();
  return { ok: true, id, remindAt, when: st.label };
}

export async function skipCaptadorLead(env, client, id) {
  await ensureCaptadorSchema(env);
  const value = String(id || "");
  if (!validLeadId(value)) throw new Error("lead_invalid");
  await env.DB.prepare("INSERT OR IGNORE INTO captador_skips(client_id,id) VALUES(?1,?2)").bind(client.id, value).run();
  return { ok: true };
}

export async function captadorView(env, client, status = "enviado") {
  const access = await readAccess(env, client.id, client);
  const enabled = access.enabled;
  if (!enabled && access.audience === "pessoas") return { ok: true, enabled: false, hidden: true, audience: "pessoas" };
  if (!enabled) return { ok: true, enabled: false, price: CAPTADOR_PRICE, audience: access.audience };
  await ensureCaptadorSchema(env);
  await cleanupLeads(env, client).catch(() => null);
  const filter = CAP_STATUSES.includes(status) && status !== "novo" ? status : "enviado";
  const config = await captadorConfig(env, client);
  const rows = (await env.DB.prepare(
    "SELECT * FROM captador_leads WHERE client_id=?1 AND status=?2 ORDER BY updated_at DESC LIMIT 100"
  ).bind(client.id, filter).all())?.results || [];
  const counts = Object.fromEntries(CAP_STATUSES.map(s => [s, 0]));
  for (const row of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM captador_leads WHERE client_id=?1 GROUP BY status").bind(client.id).all())?.results || []) {
    counts[row.status] = Number(row.n || 0);
  }
  counts["nao-quer"] += Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM captador_skips WHERE client_id=?1").bind(client.id).first())?.n || 0);
  counts.novo = 0; // a lista de novos fica só na tela
  const showcase = client.id === SHOWCASE_CLIENT ? await readShowcase(env) : null;
  const material = materialView(await captadorMaterial(env, client));
  const daily = publicDaily(await clientDailySettings(env, client));
  return {
    ok: true, enabled: true, ready: true, config, counts, material, daily,
    usedMonth: await captadorUsage(env, client.id), monthlyLimit: (await readAccess(env, client.id)).monthlyLimit,
    niches: clientNiches(client).map(key => ({ key, label: CAPTADOR_ALL_NICHES[key].label })),
    region: clientRegion(client, daily),
    items: rows.map(row => {
      const item = withHours(withMessage(config, row, showcase, material.kind), readWeek(row.hours_json));
      return row.remind_at ? { ...item, remindAt: row.remind_at, remindDue: Date.parse(row.remind_at) <= Date.now() } : item;
    }).sort((a, b) => filter === "depois" ? String(a.remindAt || "").localeCompare(String(b.remindAt || "")) : filter === "hoje" ? Number(b.score || 0) - Number(a.score || 0) : 0)
  };
}

export async function setCaptadorStatus(env, client, id, status) {
  if (!CAP_STATUSES.includes(status)) throw new Error("status_invalid");
  await ensureCaptadorSchema(env);
  if (status === "novo") {
    // "Não cheguei a mandar": apaga o contato; ele pode aparecer de novo numa busca.
    await env.DB.prepare("DELETE FROM captador_leads WHERE client_id=?1 AND id=?2").bind(client.id, String(id || "")).run();
    return { ok: true };
  }
  const result = await env.DB.prepare(
    "UPDATE captador_leads SET status=?3, updated_at=CURRENT_TIMESTAMP WHERE client_id=?1 AND id=?2"
  ).bind(client.id, String(id || ""), status).run();
  if (!Number(result?.meta?.changes || 0)) throw new Error("lead_not_found");
  return { ok: true };
}

// Limpeza do CRM de busca (Rodrigo, 28/10/2026), para todos os clientes:
// 1. contato encontrado e SEM mensagem enviada há 2 dias sai da lista (e não volta nas próximas buscas);
// 2. nos tipos de construção, loja de material de construção que entrou antes do filtro sai também.
// Quem já recebeu mensagem, quem está em "depois" (lembrete) e quem fechou ficam.
export const STALE_LEAD_DAYS = 2;
export async function cleanupLeads(env, client, now = new Date()) {
  await ensureCaptadorSchema(env);
  const id = String(client?.id || "");
  if (!id) return { removed: 0 };
  const cutoff = new Date(now.getTime() - STALE_LEAD_DAYS * 86400e3).toISOString().replace("T", " ").slice(0, 19);
  const rows = (await env.DB.prepare(
    "SELECT id, name, niche, status, created_at FROM captador_leads WHERE client_id=?1 AND status IN ('hoje','novo')"
  ).bind(id).all().catch(() => null))?.results || [];
  const out = rows.filter(r => String(r.created_at || "") < cutoff || isMaterialStore(r.niche, r.name));
  for (const r of out) {
    await env.DB.prepare("DELETE FROM captador_leads WHERE client_id=?1 AND id=?2").bind(id, r.id).run();
    await env.DB.prepare("INSERT OR IGNORE INTO captador_skips(client_id,id) VALUES(?1,?2)").bind(id, r.id).run().catch(() => null);
  }
  return { removed: out.length };
}

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const MESSAGES = {
  captador_disabled: "O Captador de clientes não está ativo na sua conta.",
  monthly_limit: "Você usou todas as buscas deste mês. Para buscar mais, fale com a Flow Arts.",
  city_invalid: "Escreva a cidade e o estado, por exemplo: Curitiba PR.",
  niche_invalid: "Escolha um tipo de negócio da lista.",
  google_unavailable: "A busca no Google Maps está fora do ar agora. Fale com a Flow Arts.",
  google_failed: "O Google Maps não respondeu agora. Tente de novo daqui a pouco.",
  search_failed: "A busca não respondeu agora. Confira a cidade (ex.: Niterói RJ) e tente de novo daqui a pouco.",
  lead_invalid: "Não deu para salvar esse contato.",
  status_invalid: "Não deu para mudar a etapa.",
  lead_not_found: "Esse contato não foi encontrado.",
  material_empty: "Escolha pelo menos um arquivo.",
  material_count: "Escolha no máximo 10 arquivos.",
  material_type: "Use fotos (JPG, PNG), vídeo (MP4) ou PDF.",
  material_size: "Os arquivos juntos passam de 95 MB. Escolha menos ou um vídeo menor.",
  r2_unavailable: "O armazenamento está fora do ar agora. Tente daqui a pouco.",
  daily_niches: "Escolha pelo menos um tipo de negócio para a busca diária.",
  daily_cities: "Escreva pelo menos uma cidade para a busca diária, por exemplo: Uberaba MG."
};

// Rotas do portal. Quem chama já conferiu o login do cliente.
export async function handleCaptadorPortal(request, env, url, client, fetcher = fetch) {
  if (!url.pathname.startsWith("/api/portal/captador")) return null;
  try {
    if (url.pathname === "/api/portal/captador" && request.method === "GET") {
      return send(await captadorView(env, client, url.searchParams.get("status") || "enviado"));
    }
    if (request.method !== "POST") return send({ ok: false, error: "not_found" }, 404);
    if (url.pathname === "/api/portal/captador/material") {
      if (!(await captadorEnabled(env, client.id, client))) throw new Error("captador_disabled");
      const form = await request.formData().catch(() => null);
      return send({ ok: true, material: await saveCaptadorMaterial(env, client, form) });
    }
    if (url.pathname === "/api/portal/captador/material/clear") {
      if (!(await captadorEnabled(env, client.id, client))) throw new Error("captador_disabled");
      return send({ ok: true, material: await clearCaptadorMaterial(env, client) });
    }
    const body = await request.json().catch(() => ({}));
    if (url.pathname === "/api/portal/captador/search") {
      return send(await runCaptadorSearch(env, client, body, fetcher));
    }
    if (!(await captadorEnabled(env, client.id, client))) throw new Error("captador_disabled");
    if (url.pathname === "/api/portal/captador/daily") {
      return send({ ok: true, daily: await saveClientDailySettings(env, client, body) });
    }
    if (url.pathname === "/api/portal/captador/daily/run") {
      return send(await runClientDaily(env, client, new Date(), fetcher, { force: true }));
    }
    if (url.pathname === "/api/portal/captador/config") {
      return send({ ok: true, config: await saveCaptadorConfig(env, client, body) });
    }
    if (url.pathname === "/api/portal/captador/contacted") {
      return send(await saveCaptadorContacted(env, client, body));
    }
    if (url.pathname === "/api/portal/captador/later") {
      return send(await saveCaptadorLater(env, client, body));
    }
    if (url.pathname === "/api/portal/captador/skip") {
      return send(await skipCaptadorLead(env, client, body.id));
    }
    const match = url.pathname.match(/^\/api\/portal\/captador\/([^/]+)\/status$/);
    if (match) {
      return send(await setCaptadorStatus(env, client, decodeURIComponent(match[1]), String(body.status || "")));
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 80);
    return send({ ok: false, error: code, message: MESSAGES[code] || "Não deu certo. Tente de novo." }, code === "captador_disabled" ? 403 : 400);
  }
  return send({ ok: false, error: "not_found" }, 404);
}

// Master: liga ou desliga o Captador para cada cliente (quem pagou os R$ 97).
export async function handleCaptadorMaster(request, env, url, listClients) {
  // Busca diária de um cliente, ajustada pelo Master (22/10): GET ?clientId= / POST {clientId, enabled, niches, cities, target}.
  if (url.pathname === "/api/master/captador/daily") {
    try {
      const clients = await listClients(env).catch(() => []);
      const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
      const id = String(request.method === "POST" ? body.clientId : url.searchParams.get("clientId") || "");
      const client = clients.find(c => String(c?.id) === id);
      if (!client) throw new Error("client_not_found");
      if (request.method === "GET") return send({ ok: true, clientId: id, daily: publicDaily(await clientDailySettings(env, client)) });
      if (request.method === "POST") {
        const daily = await saveClientDailySettings(env, client, body);
        const run = body.runNow === true ? await runClientDaily(env, client, new Date(), fetch, { force: true }) : null;
        return send({ ok: true, clientId: id, daily, run });
      }
    } catch (error) {
      const code = String(error?.message || error).slice(0, 80);
      return send({ ok: false, error: code, message: MESSAGES[code] || code }, 400);
    }
    return null;
  }
  if (url.pathname !== "/api/master/captador/access") return null;
  try {
    if (request.method === "GET") {
      const clients = await listClients(env).catch(() => []);
      const rows = [];
      for (const client of clients) {
        const id = String(client?.id || "");
        if (!id) continue;
        const access = await readAccess(env, id, client);
        rows.push({ id, name: String(client.name || id), enabled: access.enabled, gift: access.gift, monthlyLimit: access.monthlyLimit, audience: access.audience, usedMonth: await captadorUsage(env, id) });
      }
      return send({ ok: true, price: CAPTADOR_PRICE, defaultLimit: CAPTADOR_MONTHLY_LIMIT, clients: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setCaptadorAccess(env, body.clientId, typeof body.enabled === "boolean" ? body.enabled : undefined, body.monthlyLimit, body.audience));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80) }, 400);
  }
  return null;
}
