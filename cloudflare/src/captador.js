// Captador de clientes: ferramenta vendida aos clientes da Flow Arts (R$ 97/mês).
// Mesma busca do Caçador do Master: Google Maps (API oficial do Google Places,
// com a chave da Flow Arts). O cliente escolhe o tipo de negócio e escreve a cidade.
// Regra do Google: a lista aparece na hora e NÃO é guardada. Fica guardado só
// quem o cliente chamar no WhatsApp (nome, telefone, cidade) e o código do lugar
// de quem ele marcar "não serve". Tudo separado por cliente.
// Nada é enviado pelo servidor: o cliente manda pelo próprio WhatsApp.

import { phoneInfo, siteInfo, mapsSearchLink, STATUSES, placesKey, searchPlaces, OVERPASS_ENDPOINTS, searchNominatim } from "./prospects.js";

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
  racao: { label: "Ração (loja de ração)", query: "loja de ração" },
  casa_racao: { label: "Casa de ração", query: "casa de ração" },
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

// Mesmos tipos no mapa grátis (OpenStreetMap), usado quando o Google não responde (17/10).
export const CAPTADOR_OSM_TAGS = {
  restaurante: [["amenity", "restaurant"]], cafeteria: [["amenity", "cafe"]], lanchonete: [["amenity", "fast_food"]],
  padaria: [["shop", "bakery"]], bar: [["amenity", "bar"], ["amenity", "pub"]], salao: [["shop", "hairdresser"], ["shop", "beauty"]],
  academia: [["leisure", "fitness_centre"]], pet: [["shop", "pet"]], racao: [["shop", "pet"], ["shop", "agrarian"]],
  casa_racao: [["shop", "pet"], ["shop", "agrarian"]], agropecuaria: [["shop", "agrarian"]], veterinario: [["amenity", "veterinary"]],
  dentista: [["amenity", "dentist"]], clinica: [["amenity", "clinic"], ["amenity", "doctors"]], farmacia: [["amenity", "pharmacy"]],
  mercado: [["shop", "supermarket"], ["shop", "convenience"]], roupas: [["shop", "clothes"]], oficina: [["shop", "car_repair"]],
  hotel: [["tourism", "hotel"], ["tourism", "guest_house"]], imobiliaria: [["office", "estate_agent"]],
  contabilidade: [["office", "accountant"]], material: [["shop", "hardware"], ["shop", "doityourself"]]
};
const OSM_ID = /^osm:(node|way|relation)\/\d+$/;

const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);
const clean = (value, max) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const GOOGLE_ID = /^[A-Za-z0-9_-]{10,300}$/;
const validLeadId = id => GOOGLE_ID.test(id) || OSM_ID.test(id);

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

async function readAccess(env, clientId) {
  const access = await readState(env, String(clientId || ""), "access", { enabled: false });
  const limit = Math.round(Number(access.monthlyLimit));
  return { enabled: access.enabled === true, monthlyLimit: Number.isFinite(limit) && limit >= 0 ? limit : CAPTADOR_MONTHLY_LIMIT };
}

export async function captadorEnabled(env, clientId) {
  return (await readAccess(env, clientId)).enabled;
}

// Buscas já feitas pelo cliente neste mês.
export async function captadorUsage(env, clientId) {
  const usage = await readState(env, String(clientId || ""), "usage", { month: "", count: 0 });
  return usage.month === thisMonth() ? Number(usage.count || 0) : 0;
}

// Liga/desliga e, se vier, muda o limite do mês daquele cliente.
export async function setCaptadorAccess(env, clientId, enabled, monthlyLimit) {
  const id = String(clientId || "").trim();
  if (!id) throw new Error("client_id_required");
  const current = await readAccess(env, id);
  let limit = current.monthlyLimit;
  if (monthlyLimit !== undefined && monthlyLimit !== null && monthlyLimit !== "") {
    limit = Math.round(Number(monthlyLimit));
    if (!Number.isFinite(limit) || limit < 0 || limit > CAPTADOR_MAX_LIMIT) throw new Error("limit_invalid");
  }
  const on = enabled === undefined ? current.enabled : Boolean(enabled);
  await writeState(env, id, "access", { enabled: on, monthlyLimit: limit, updatedAt: new Date().toISOString() });
  return { ok: true, clientId: id, enabled: on, monthlyLimit: limit };
}

export function defaultConfig(client = {}) {
  return { myName: "", business: clean(client.name, 80), offer: "", onlyNoSite: false };
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

// A mensagem é do cliente. A frase de "não quero receber" é obrigatória.
export function captadorMessage(config, lead) {
  const name = config.myName || "a equipe";
  const lines = [`Oi, tudo bem? Aqui é ${name}${config.business ? ", da " + config.business : ""}.`];
  lines.push(`Encontrei a ${lead.name} aqui em ${lead.city}.`);
  if (config.offer) lines.push(config.offer);
  lines.push("Posso te contar mais?");
  lines.push("Se preferir não receber mensagens, é só me avisar.");
  return lines.join("\n\n");
}

const withMessage = (config, lead) => {
  const message = captadorMessage(config, lead);
  return { ...lead, mobile: Boolean(lead.mobile), has_site: Boolean(lead.has_site), message,
    whatsapp: `https://wa.me/55${lead.phone}?text=${encodeURIComponent(message)}` };
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
    score: captadorScore({ reviews, rating, mobile, hasSite: site.hasOwnSite })
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
  const parts = (CAPTADOR_OSM_TAGS[niche] || []).map(([k, v]) => `nwr["${k}"="${v}"]["name"](area.c);`).join("");
  return `[out:json][timeout:25];area["boundary"="administrative"]["admin_level"="8"]["name"="${name}"]->.c;(${parts});out tags center 400;`;
}

async function searchCaptadorOSM(niche, city, fetcher) {
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
    return await searchNominatim(CAPTADOR_OSM_TAGS[niche] || [], cityName(city), fetcher);
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
  const { phone, mobile } = phoneInfo(String(tags["contact:whatsapp"] || tags["contact:mobile"] || tags.mobile || tags.phone || tags["contact:phone"] || "").split(/[;,]/)[0]);
  if (!phone) return null;
  const website = String(tags.website || tags["contact:website"] || tags.url || "").trim();
  const site = siteInfo(website && !/^https?:/i.test(website) ? "https://" + website : website);
  if (onlyNoSite && site.hasOwnSite) return null;
  const igTag = String(tags["contact:instagram"] || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
  const address = clean([tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"]].filter(Boolean).join(", "), 200);
  return {
    id, name, niche: nicheKey, city, address, phone, mobile,
    has_site: site.hasOwnSite, instagram: site.instagram || (/^[a-z0-9._]{1,30}$/i.test(igTag) ? igTag : ""),
    rating: 0, reviews: 0, maps_url: mapsSearchLink(name, city),
    score: captadorScore({ reviews: 0, rating: 0, mobile, hasSite: site.hasOwnSite })
  };
}

// Busca no Google Maps; se o Google não responder (ou não houver chave), usa o mapa grátis.
// A lista vai direto para a tela do cliente, sem guardar.
export async function runCaptadorSearch(env, client, body = {}, fetcher = fetch) {
  await ensureCaptadorSchema(env);
  if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
  const niche = String(body.niche || "");
  if (!CAPTADOR_NICHES[niche]) throw new Error("niche_invalid");
  const city = clean(body.city, 60);
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
  if (key) {
    try {
      const places = await searchPlaces(key, `${CAPTADOR_NICHES[niche].query} em ${city}`, fetcher);
      found = places.length;
      leads = places.map(place => captadorLead(place, niche, city, config.onlyNoSite));
    } catch { leads = null; }
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
  const items = [];
  const seen = new Set();
  for (const lead of leads) {
    if (!lead || seen.has(lead.id) || await alreadyKnown(env, client.id, lead.id)) continue;
    seen.add(lead.id);
    items.push(withMessage(config, { ...lead, status: "novo" }));
  }
  items.sort((a, b) => b.score - a.score);
  return { ok: true, found, items, source, usedMonth: used + 1, monthlyLimit };
}

// Quem o cliente chamou no WhatsApp vira contato dele (nome, telefone, cidade).
export async function saveCaptadorContacted(env, client, body = {}) {
  await ensureCaptadorSchema(env);
  const id = String(body.id || "");
  if (!validLeadId(id) || !CAPTADOR_NICHES[body.niche]) throw new Error("lead_invalid");
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

export async function skipCaptadorLead(env, client, id) {
  await ensureCaptadorSchema(env);
  const value = String(id || "");
  if (!validLeadId(value)) throw new Error("lead_invalid");
  await env.DB.prepare("INSERT OR IGNORE INTO captador_skips(client_id,id) VALUES(?1,?2)").bind(client.id, value).run();
  return { ok: true };
}

export async function captadorView(env, client, status = "enviado") {
  const enabled = await captadorEnabled(env, client.id);
  if (!enabled) return { ok: true, enabled: false, price: CAPTADOR_PRICE };
  await ensureCaptadorSchema(env);
  const filter = STATUSES.includes(status) && status !== "novo" ? status : "enviado";
  const config = await captadorConfig(env, client);
  const rows = (await env.DB.prepare(
    "SELECT * FROM captador_leads WHERE client_id=?1 AND status=?2 ORDER BY updated_at DESC LIMIT 100"
  ).bind(client.id, filter).all())?.results || [];
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const row of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM captador_leads WHERE client_id=?1 GROUP BY status").bind(client.id).all())?.results || []) {
    counts[row.status] = Number(row.n || 0);
  }
  counts["nao-quer"] += Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM captador_skips WHERE client_id=?1").bind(client.id).first())?.n || 0);
  counts.novo = 0; // a lista de novos fica só na tela
  return {
    ok: true, enabled: true, ready: true, config, counts,
    usedMonth: await captadorUsage(env, client.id), monthlyLimit: (await readAccess(env, client.id)).monthlyLimit,
    niches: Object.entries(CAPTADOR_NICHES).map(([key, n]) => ({ key, label: n.label })),
    items: rows.map(row => withMessage(config, row))
  };
}

export async function setCaptadorStatus(env, client, id, status) {
  if (!STATUSES.includes(status)) throw new Error("status_invalid");
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
  lead_not_found: "Esse contato não foi encontrado."
};

// Rotas do portal. Quem chama já conferiu o login do cliente.
export async function handleCaptadorPortal(request, env, url, client, fetcher = fetch) {
  if (!url.pathname.startsWith("/api/portal/captador")) return null;
  try {
    if (url.pathname === "/api/portal/captador" && request.method === "GET") {
      return send(await captadorView(env, client, url.searchParams.get("status") || "enviado"));
    }
    if (request.method !== "POST") return send({ ok: false, error: "not_found" }, 404);
    const body = await request.json().catch(() => ({}));
    if (url.pathname === "/api/portal/captador/search") {
      return send(await runCaptadorSearch(env, client, body, fetcher));
    }
    if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
    if (url.pathname === "/api/portal/captador/config") {
      return send({ ok: true, config: await saveCaptadorConfig(env, client, body) });
    }
    if (url.pathname === "/api/portal/captador/contacted") {
      return send(await saveCaptadorContacted(env, client, body));
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
  if (url.pathname !== "/api/master/captador/access") return null;
  try {
    if (request.method === "GET") {
      const clients = await listClients(env).catch(() => []);
      const rows = [];
      for (const client of clients) {
        const id = String(client?.id || "");
        if (!id) continue;
        const access = await readAccess(env, id);
        rows.push({ id, name: String(client.name || id), enabled: access.enabled, monthlyLimit: access.monthlyLimit, usedMonth: await captadorUsage(env, id) });
      }
      return send({ ok: true, price: CAPTADOR_PRICE, defaultLimit: CAPTADOR_MONTHLY_LIMIT, clients: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setCaptadorAccess(env, body.clientId, typeof body.enabled === "boolean" ? body.enabled : undefined, body.monthlyLimit));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80) }, 400);
  }
  return null;
}
