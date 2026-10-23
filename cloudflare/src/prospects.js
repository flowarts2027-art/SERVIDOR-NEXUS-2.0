// Caçador de clientes da Flow Arts.
import { addFromProspect, addProspectLater, crmKnows } from "./crm.js";
import { parseOsmHours, googleHours, withHours } from "./business-hours.js";
// Busca empresas no OpenStreetMap (grátis, sem chave) ou, se houver chave,
// no Google Maps (API oficial do Google Places). Guarda só
// as que não têm site próprio, dá uma nota de 0 a 10 e prepara a primeira
// mensagem. Quem envia é o Rodrigo, pelo próprio WhatsApp (link wa.me).
// Nada é enviado sozinho daqui.

import { encryptSecret, decryptSecret } from "./secrets.js";
import { readShowcase, showcaseLine } from "./showcase-store.js";

export const DAILY_SEARCH_LIMIT = 30; // Google: ~900/mês, dentro da cota grátis. OSM: uso educado do servidor público.
const OVERPASS = "https://overpass-api.de/api/interpreter";
export const OVERPASS_ENDPOINTS = [OVERPASS, "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSM_UA = "FlowArtsNexus/1.0 (+https://flowarts.com.br; contato@flowarts.com.br)";

// Terceira reserva (17/10): Nominatim, o buscador do mesmo mapa. Usa as "frases" em inglês
// ("pet shop in Rio de Janeiro"), que ele entende melhor. Traz menos telefones que o Overpass.
// Regra de uso do Nominatim: no máximo 1 pedido por segundo e identificação no User-Agent.
export const OSM_PHRASES = {
  "amenity=cafe": "cafe", "shop=hairdresser": "hairdresser", "shop=beauty": "beauty shop", "amenity=fast_food": "fast food",
  "amenity=restaurant": "restaurant", "shop=bakery": "bakery", "amenity=bar": "bar", "amenity=pub": "pub",
  "leisure=fitness_centre": "gym", "shop=pet": "pet shop", "shop=agrarian": "agricultural shop", "amenity=veterinary": "veterinary",
  "amenity=dentist": "dentist", "amenity=clinic": "clinic", "amenity=doctors": "doctors", "amenity=pharmacy": "pharmacy",
  "shop=supermarket": "supermarket", "shop=convenience": "convenience store", "shop=clothes": "clothes shop",
  "shop=car_repair": "car repair", "tourism=hotel": "hotel", "tourism=guest_house": "guest house",
  "office=estate_agent": "estate agent", "office=accountant": "accountant", "shop=hardware": "hardware store", "shop=doityourself": "DIY store"
};

// Devolve pontos no mesmo formato do Overpass ({type,id,tags}), para reaproveitar os filtros.
export async function searchNominatim(tags, cityName, fetcher = fetch, wait = ms => new Promise(r => setTimeout(r, ms))) {
  const wanted = new Set(tags.map(([k, v]) => k + "=" + v));
  const out = new Map();
  const phrases = tags.slice(0, 2).map(([k, v]) => OSM_PHRASES[k + "=" + v]).filter(Boolean);
  for (let i = 0; i < phrases.length; i++) {
    if (i) await wait(1100);
    const url = NOMINATIM + "?format=jsonv2&extratags=1&addressdetails=1&limit=50&countrycodes=br&q=" + encodeURIComponent(phrases[i] + " in " + cityName);
    const response = await fetcher(url, { headers: { "user-agent": OSM_UA, referer: "https://flowarts.com.br/" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("nominatim_" + response.status);
    const list = await response.json().catch(() => []);
    for (const item of Array.isArray(list) ? list : []) {
      if (!wanted.has(String(item?.category) + "=" + String(item?.type))) continue;
      const type = String(item.osm_type || ""), id = Number(item.osm_id);
      if (!["node", "way", "relation"].includes(type) || !Number.isFinite(id)) continue;
      const a = item.address || {};
      out.set(type + "/" + id, { type, id, tags: {
        ...(item.extratags || {}), name: String(item.name || ""),
        "addr:street": a.road || "", "addr:housenumber": a.house_number || "", "addr:suburb": a.suburb || a.neighbourhood || ""
      } });
    }
  }
  return [...out.values()];
}
const SITE = "https://flowarts.com.br";

export const NICHES = {
  // Mesmas chaves do Captador (pedido de 17/10): assim o exemplo do nicho vai junto na mensagem.
  cafeteria: { query: "cafeteria", plural: "cafeterias", page: "/marketing-para-cafeteria", osm: [["amenity", "cafe"]] },
  salao: { query: "salão de beleza", plural: "salões de beleza", page: "/marketing-para-salao-de-beleza", osm: [["shop", "hairdresser"], ["shop", "beauty"]] },
  lanchonete: { query: "lanchonete", plural: "lanchonetes", page: "/marketing-para-lanchonete", osm: [["amenity", "fast_food"]] },
  restaurante: { query: "restaurante", plural: "restaurantes", page: "/marketing-para-restaurante", osm: [["amenity", "restaurant"]] },
  padaria: { query: "padaria", plural: "padarias", page: "/marketing-para-padaria", osm: [["shop", "bakery"]] },
  bar: { query: "bar", plural: "bares", page: "/", osm: [["amenity", "bar"], ["amenity", "pub"]] },
  academia: { query: "academia", plural: "academias", page: "/marketing-para-academia", osm: [["leisure", "fitness_centre"]] },
  pet: { query: "pet shop", plural: "pet shops", page: "/marketing-para-pet-shop", osm: [["shop", "pet"]] },
  racao: { query: "loja de ração", plural: "lojas de ração", page: "/", osm: [["shop", "pet"], ["shop", "agrarian"]] },
  agropecuaria: { query: "agropecuária", plural: "agropecuárias", page: "/", osm: [["shop", "agrarian"], ["shop", "farm"]] },
  veterinario: { query: "clínica veterinária", plural: "clínicas veterinárias", page: "/", osm: [["amenity", "veterinary"]] },
  dentista: { query: "dentista", plural: "consultórios de dentista", page: "/", osm: [["amenity", "dentist"]] },
  clinica: { query: "clínica médica", plural: "clínicas e consultórios", page: "/", osm: [["amenity", "clinic"], ["amenity", "doctors"]] },
  farmacia: { query: "farmácia", plural: "farmácias", page: "/", osm: [["amenity", "pharmacy"]] },
  mercado: { query: "mercado", plural: "mercados", page: "/", osm: [["shop", "supermarket"], ["shop", "convenience"]] },
  roupas: { query: "loja de roupas", plural: "lojas de roupas", page: "/marketing-para-loja-de-roupas", osm: [["shop", "clothes"]] },
  oficina: { query: "oficina mecânica", plural: "oficinas mecânicas", page: "/marketing-para-oficina-mecanica", osm: [["shop", "car_repair"]] },
  hotel: { query: "pousada", plural: "hotéis e pousadas", page: "/", osm: [["tourism", "guest_house"], ["tourism", "hotel"]] },
  imobiliaria: { query: "imobiliária", plural: "imobiliárias", page: "/", osm: [["office", "estate_agent"]] },
  contabilidade: { query: "escritório de contabilidade", plural: "escritórios de contabilidade", page: "/", osm: [["office", "accountant"]] },
  material: { query: "loja de material de construção", plural: "lojas de material de construção", page: "/", osm: [["shop", "hardware"], ["shop", "doityourself"]] }
};

// Cidades grandes do Brasil, em rodízio (centro aproximado para a busca no OpenStreetMap).
const CITY_POINTS = [
  ["São Paulo SP", -23.55, -46.63], ["Rio de Janeiro RJ", -22.91, -43.2], ["Belo Horizonte MG", -19.92, -43.94],
  ["Brasília DF", -15.79, -47.88], ["Salvador BA", -12.97, -38.5], ["Fortaleza CE", -3.73, -38.53],
  ["Curitiba PR", -25.43, -49.27], ["Recife PE", -8.05, -34.88], ["Porto Alegre RS", -30.03, -51.23],
  ["Goiânia GO", -16.68, -49.25], ["Belém PA", -1.46, -48.49], ["Manaus AM", -3.12, -60.02],
  ["Campinas SP", -22.91, -47.06], ["São Luís MA", -2.53, -44.3], ["Maceió AL", -9.66, -35.73],
  ["Natal RN", -5.79, -35.21], ["João Pessoa PB", -7.12, -34.86], ["Teresina PI", -5.09, -42.8],
  ["Campo Grande MS", -20.47, -54.62], ["Cuiabá MT", -15.6, -56.1], ["Florianópolis SC", -27.6, -48.55],
  ["Vitória ES", -20.32, -40.34], ["Aracaju SE", -10.91, -37.07], ["Ribeirão Preto SP", -21.18, -47.81],
  ["Sorocaba SP", -23.5, -47.46], ["Uberlândia MG", -18.92, -48.28], ["Juiz de Fora MG", -21.76, -43.35],
  ["Londrina PR", -23.31, -51.16], ["Joinville SC", -26.3, -48.85], ["Niterói RJ", -22.88, -43.1],
  ["Santos SP", -23.96, -46.33], ["São José dos Campos SP", -23.18, -45.89], ["Feira de Santana BA", -12.27, -38.97],
  ["Caxias do Sul RS", -29.17, -51.18], ["Maringá PR", -23.42, -51.94], ["Campina Grande PB", -7.23, -35.88],
  ["Montes Claros MG", -16.73, -43.86], ["Anápolis GO", -16.33, -48.95], ["Porto Velho RO", -8.76, -63.9],
  ["Macapá AP", 0.03, -51.07], ["Boa Vista RR", 2.82, -60.67], ["Palmas TO", -10.18, -48.33],
  ["Rio Branco AC", -9.97, -67.81]
];
export const CITIES = CITY_POINTS.map(([name]) => name);

export const STATUSES = ["novo", "enviado", "respondeu", "reuniao", "nao-quer"];

// Endereços que não são site próprio: a empresa continua "sem site".
const NOT_A_SITE = /(^|\.)(instagram\.com|facebook\.com|fb\.com|wa\.me|whatsapp\.com|linktr\.ee|linkr\.bio|ifood\.com\.br|anota\.ai|goomer\.app|beacons\.ai|bio\.link|linkin\.bio|tiktok\.com|google\.com|business\.site|g\.page)$/i;

export async function ensureProspectSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      niche TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      mobile INTEGER NOT NULL DEFAULT 0,
      website TEXT,
      instagram TEXT,
      rating REAL,
      reviews INTEGER NOT NULL DEFAULT 0,
      photos INTEGER NOT NULL DEFAULT 0,
      maps_url TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'novo',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
  // Só o código do lugar de quem o Rodrigo marcou "não serve" (permitido pelo Google).
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS prospect_skips (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
  ).run();
}

async function readState(env, key, fallback) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='prospects' AND item_key=?1 AND client_id='' LIMIT 1"
  ).bind(key).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : fallback; } catch { return fallback; }
}

async function writeState(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at)
     VALUES('prospects',?1,'',?2,CURRENT_TIMESTAMP)
     ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
  ).bind(key, JSON.stringify(value)).run();
}

export async function savePlacesKey(env, apiKey) {
  const key = String(apiKey || "").trim();
  if (!/^[A-Za-z0-9_\-]{30,60}$/.test(key)) throw new Error("google_key_invalid");
  await writeState(env, "google-key", { key: await encryptSecret(env, key), savedAt: new Date().toISOString() });
  return { ok: true, configured: true };
}

export async function placesKey(env) {
  const stored = await readState(env, "google-key", null);
  if (stored?.key) return decryptSecret(env, stored.key).catch(() => "");
  return String(env.GOOGLE_PLACES_API_KEY || "").trim();
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export function phoneInfo(national) {
  let digits = String(national || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10 && digits.length !== 11) return { phone: "", mobile: false };
  return { phone: digits, mobile: digits.length === 11 && digits[2] === "9" };
}

export function siteInfo(websiteUri) {
  if (!websiteUri) return { hasOwnSite: false, instagram: "" };
  let url;
  try { url = new URL(websiteUri); } catch { return { hasOwnSite: false, instagram: "" }; }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "instagram.com") {
    const handle = url.pathname.split("/").filter(Boolean)[0] || "";
    return { hasOwnSite: false, instagram: /^[a-z0-9._]{1,30}$/i.test(handle) ? handle : "" };
  }
  return { hasOwnSite: !NOT_A_SITE.test(host), instagram: "" };
}

// Nota de 0 a 10: muita gente gosta da empresa, mas ela aparece pouco na internet.
// No Google contam avaliações e nota. No OpenStreetMap (sem avaliações) contam
// sinais de empresa ativa: horário cadastrado, endereço e rede social.
export function prospectScore({ reviews = 0, rating = 0, photos = 0, mobile = false, instagram = "", hours = false, address = "", source = "google" }) {
  let score = 3; // já passou no filtro "sem site próprio"
  if (source === "osm") {
    if (mobile) score += 2;
    if (hours) score += 2;
    if (address) score += 1;
    if (instagram) score += 1;
    return Math.max(0, Math.min(10, score));
  }
  if (reviews >= 300) score += 3; else if (reviews >= 100) score += 2; else if (reviews >= 30) score += 1;
  if (rating >= 4.5) score += 2; else if (rating >= 4.0) score += 1;
  if (photos < 5) score += 1;
  if (mobile) score += 1;
  return Math.max(0, Math.min(10, score));
}

export function mapsSearchLink(name, city) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${name} ${city}`);
}

// Um ponto do OpenStreetMap vira um contato (ou null se não servir).
export function osmToProspect(element, nicheKey, city) {
  const tags = element?.tags || {};
  const name = String(tags.name || "").trim().slice(0, 120);
  if (!name || !element?.type || !element?.id) return null;
  if (tags.disused || tags["disused:amenity"] || tags["disused:shop"]) return null;
  // Redes e franquias (Starbucks, McDonald's...) não são o nosso cliente.
  if (tags.brand || tags["brand:wikidata"] || tags.operator && tags["operator:wikidata"]) return null;
  const rawPhone = String(tags["contact:whatsapp"] || tags["contact:mobile"] || tags.mobile || tags.phone || tags["contact:phone"] || "").split(/[;,]/)[0];
  const { phone, mobile } = phoneInfo(rawPhone);
  if (!phone) return null;
  const website = String(tags.website || tags["contact:website"] || tags.url || "").trim();
  const site = siteInfo(website && !/^https?:/i.test(website) ? "https://" + website : website);
  if (site.hasOwnSite) return null;
  const igTag = String(tags["contact:instagram"] || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
  const instagram = site.instagram || (/^[a-z0-9._]{1,30}$/i.test(igTag) ? igTag : "");
  const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"]].filter(Boolean).join(", ").slice(0, 200);
  const item = {
    id: `osm:${element.type}/${element.id}`,
    name, niche: nicheKey, city, address, phone, mobile,
    website: website.slice(0, 200), instagram,
    rating: 0, reviews: 0, photos: 0,
    maps_url: mapsSearchLink(name, city)
  };
  item.score = prospectScore({ ...item, hours: Boolean(tags.opening_hours), source: "osm" });
  item.hours = parseOsmHours(tags.opening_hours);
  return item;
}

export function overpassQuery(nicheKey, cityIndex, radius = 12000) {
  const [, lat, lon] = CITY_POINTS[cityIndex % CITY_POINTS.length];
  const parts = NICHES[nicheKey].osm.map(([k, v]) => `nwr["${k}"="${v}"]["name"](around:${radius},${lat},${lon});`);
  return `[out:json][timeout:25];(${parts.join("")});out tags center 800;`;
}

// Mapa grátis: tenta os servidores do Overpass; se todos estiverem fora, usa o Nominatim.
export async function searchOSM(nicheKey, cityIndex, fetcher) {
  let error = "osm_busy";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": OSM_UA },
        body: "data=" + encodeURIComponent(overpassQuery(nicheKey, cityIndex)),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) { error = response.status === 429 || response.status >= 500 ? "osm_busy" : "osm_" + response.status; continue; }
      const data = await response.json().catch(() => ({}));
      return Array.isArray(data.elements) ? data.elements : [];
    } catch { error = "osm_busy"; }
  }
  try {
    return await searchNominatim(NICHES[nicheKey].osm, CITIES[cityIndex].replace(/\s+[A-Z]{2}$/, ""), fetcher);
  } catch {
    throw new Error(error);
  }
}

export function placeToProspect(place, nicheKey, city) {
  if (!place?.id) return null;
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return null;
  const site = siteInfo(place.websiteUri);
  if (site.hasOwnSite) return null;
  const { phone, mobile } = phoneInfo(place.nationalPhoneNumber || place.internationalPhoneNumber);
  if (!phone) return null;
  const item = {
    id: String(place.id),
    name: String(place.displayName?.text || "").slice(0, 120),
    niche: nicheKey,
    city,
    address: String(place.formattedAddress || "").slice(0, 200),
    phone,
    mobile,
    website: String(place.websiteUri || "").slice(0, 200),
    instagram: site.instagram,
    rating: Number(place.rating || 0),
    reviews: Number(place.userRatingCount || 0),
    photos: Array.isArray(place.photos) ? place.photos.length : 0,
    maps_url: String(place.googleMapsUri || "").slice(0, 300)
  };
  if (!item.name) return null;
  item.score = prospectScore(item);
  item.hours = googleHours(place.regularOpeningHours);
  return item;
}

const FOOD_NICHES = new Set(["cafeteria", "restaurante", "lanchonete", "padaria", "bar"]);

export function firstMessage(p, showcase = null) {
  const niche = NICHES[p.niche] || NICHES.cafeteria;
  const cityName = String(p.city || "").replace(/\s[A-Z]{2}$/, "");
  const lines = ["Oi, tudo bem? Aqui é o Rodrigo, da Flow Arts."];
  if (Number(p.reviews) >= 20 && Number(p.rating) >= 4) {
    lines.push(`Vi a ${p.name} no Google: ${p.reviews} avaliações e nota ${String(Number(p.rating).toFixed(1)).replace(".", ",")}. Os clientes gostam de vocês!`);
  } else {
    lines.push(`Encontrei a ${p.name} ${String(p.id || "").startsWith("osm:") ? "no mapa" : "no Google"}, aqui em ${cityName}.`);
  }
  // Exemplo do nicho (pedido de 17/10): a pessoa quer VER o resultado, então ele vem primeiro e o texto fica curto.
  const example = showcase ? showcaseLine(showcase, p.niche, niche.plural) : "";
  // Comida (oferta de 22/10): 3 posts grátis com as fotos do próprio negócio, antes de falar de preço.
  const freeOffer = FOOD_NICHES.has(p.niche) ? `Faço 3 posts com as fotos da ${p.name}, grátis, antes de qualquer conversa de preço. Quer ver?` : "";
  if (example) {
    lines.push(`Eu cuido do Instagram de ${niche.plural}. ${example}`);
    lines.push(freeOffer || `Posso fazer um assim para a ${p.name}?`);
  } else {
    const page = niche.page && niche.page !== "/" ? niche.page : "";
    lines.push(p.instagram
      ? "Notei que o Instagram é o principal canal de vocês na internet, e não encontrei um site."
      : "Procurei vocês na internet e não encontrei um site.");
    lines.push(p.instagram
      ? `Eu faço site e cuido do Instagram de ${niche.plural}. Assim, quem procura no Google acha vocês e chega direto no seu WhatsApp. Veja um exemplo: ${SITE}${page}`
      : `Eu faço site para ${niche.plural}: uma página com fotos, serviços, mapa e botão para o seu WhatsApp, feita para aparecer no Google. Veja um exemplo: ${SITE}${page}`);
    lines.push(freeOffer || `Posso te mostrar como ficaria para a ${p.name}?`);
  }
  lines.push("Se preferir não receber mensagens, é só me avisar.");
  return lines.join("\n\n");
}

export function whatsappLink(p, showcase = null) {
  return `https://wa.me/55${p.phone}?text=${encodeURIComponent(firstMessage(p, showcase))}`;
}

const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
  "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount",
  "places.photos", "places.googleMapsUri", "places.businessStatus", "places.regularOpeningHours"
].join(",");

export async function searchPlaces(key, query, fetcher) {
  const response = await fetcher("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({ textQuery: query, languageCode: "pt-BR", regionCode: "BR", pageSize: 20 }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = String(data?.error?.status || data?.error?.message || response.status).slice(0, 120);
    throw new Error("google_" + reason);
  }
  return Array.isArray(data.places) ? data.places : [];
}

// Faz algumas buscas (nicho x cidade, em rodízio) e guarda as empresas novas.
async function saveProspects(env, items) {
  let added = 0;
  for (const item of items) {
    if (!item) continue;
    // INSERT OR IGNORE: quem já está na lista (inclusive "não quer") não volta.
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO prospects(id,name,niche,city,address,phone,mobile,website,instagram,rating,reviews,photos,maps_url,score)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`
    ).bind(item.id, item.name, item.niche, item.city, item.address, item.phone, item.mobile ? 1 : 0, item.website,
      item.instagram, item.rating, item.reviews, item.photos, item.maps_url, item.score).run();
    if (Number(result?.meta?.changes || 0) > 0) added++;
  }
  return added;
}

// Busca grátis feita pelo navegador do Master: o servidor da Cloudflare costuma
// ser recusado pelo servidor público do OpenStreetMap, o navegador não.
// 1) plan: reserva as próximas buscas (rodízio e limite do dia) e devolve as consultas.
export async function planBrowserSearch(env, { calls = 3, niche = "" } = {}) {
  await ensureProspectSchema(env);
  const usage = await readState(env, "usage", { day: "", count: 0 });
  const used = usage.day === today() ? Number(usage.count || 0) : 0;
  const allowed = Math.max(0, Math.min(Number(calls) || 3, 5, DAILY_SEARCH_LIMIT - used));
  if (!allowed) return { ok: false, error: "daily_limit", usedToday: used, dailyLimit: DAILY_SEARCH_LIMIT };
  const nicheKeys = NICHES[niche] ? [niche] : Object.keys(NICHES);
  const cursor = await readState(env, "cursor", { n: 0 });
  let position = Number(cursor.n || 0);
  const jobs = [];
  for (let i = 0; i < allowed; i++) {
    const nicheKey = nicheKeys[position % nicheKeys.length];
    const cityIndex = Math.floor(position / nicheKeys.length) % CITIES.length;
    jobs.push({ niche: nicheKey, cityIndex, label: `${NICHES[nicheKey].query} em ${CITIES[cityIndex]}`, query: overpassQuery(nicheKey, cityIndex) });
    position++;
  }
  await writeState(env, "usage", { day: today(), count: used + jobs.length });
  if (!NICHES[niche]) await writeState(env, "cursor", { n: position });
  return { ok: true, jobs, endpoints: OVERPASS_ENDPOINTS, usedToday: used + jobs.length, dailyLimit: DAILY_SEARCH_LIMIT };
}

// 2) import: recebe os pontos do mapa e guarda só os que servem.
export async function importBrowserResults(env, { niche, cityIndex, elements } = {}) {
  await ensureProspectSchema(env);
  if (!NICHES[niche]) throw new Error("niche_invalid");
  const index = Number(cityIndex);
  if (!Number.isInteger(index) || index < 0 || index >= CITIES.length) throw new Error("city_invalid");
  const list = Array.isArray(elements) ? elements.slice(0, 1000) : [];
  const items = list
    .filter(e => e && typeof e === "object" && ["node", "way", "relation"].includes(e.type) && Number.isFinite(Number(e.id)))
    .map(e => osmToProspect({ type: e.type, id: Number(e.id), tags: typeof e.tags === "object" && e.tags ? e.tags : {} }, niche, CITIES[index]));
  return { ok: true, found: list.length, added: await saveProspects(env, items) };
}

// Cidade escrita pelo Rodrigo (pedido de 18/10): "Cidade UF", como no Captador do cliente.
export function cleanCity(value) {
  const city = String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return city.length >= 3 && /\p{L}/u.test(city) ? city : "";
}

export async function runProspectSearch(env, { calls = 3, niche = "", city: typedCity = "" } = {}, fetcher = fetch) {
  await ensureProspectSchema(env);
  const fixedCity = cleanCity(typedCity);
  if (String(typedCity || "").trim() && !fixedCity) return { ok: false, error: "city_invalid", message: "Escreva a cidade e o estado, por exemplo: Niterói RJ." };
  const showcase = await readShowcase(env); // o caçador do Master é só da Flow Arts
  const key = await placesKey(env);
  // Com chave do Google, tenta o Google. Se o Google recusar (conta sem crédito, chave errada),
  // passa para o mapa grátis (OpenStreetMap) no resto da busca. Pedido do Rodrigo em 17/10.
  let provider = key ? "google" : "osm";
  let googleError = "";
  const usage = await readState(env, "usage", { day: "", count: 0 });
  const used = usage.day === today() ? Number(usage.count || 0) : 0;
  const allowed = Math.max(0, Math.min(Number(calls) || 3, 5, DAILY_SEARCH_LIMIT - used));
  if (!allowed) return { ok: false, error: "daily_limit", usedToday: used, dailyLimit: DAILY_SEARCH_LIMIT, provider };

  const nicheKeys = NICHES[niche] ? [niche] : Object.keys(NICHES);
  const cursorKey = fixedCity ? "city-cursor" : "cursor";
  const cursor = await readState(env, cursorKey, { n: 0 });
  let position = Number(cursor.n || 0);
  const searched = [];
  const live = [];
  let added = 0;
  let found = 0;
  let error = "";
  let done = 0;

  const rounds = fixedCity ? Math.min(allowed, nicheKeys.length) : allowed;
  for (; done < rounds; done++) {
    const nicheKey = nicheKeys[position % nicheKeys.length];
    const cityIndex = fixedCity ? 0 : Math.floor(position / nicheKeys.length) % CITIES.length;
    const city = fixedCity || CITIES[cityIndex];
    position++;
    let items;
    if (provider === "google") {
      try {
        const places = await searchPlaces(key, `${NICHES[nicheKey].query} em ${city}`, fetcher);
        found += places.length;
        // Regra do Google: não guardar os dados dos lugares. A lista vai direto para a tela;
        // só fica guardado quem o Rodrigo chamar (saveContacted) ou marcar "não serve" (só o código).
        for (const item of places.map(place => placeToProspect(place, nicheKey, city))) {
          if (!item || await alreadyKnown(env, item.id)) continue;
          live.push(withHours({ ...item, status: "novo", message: firstMessage(item, showcase), whatsapp: whatsappLink(item, showcase) }, item.hours));
        }
        searched.push(`${NICHES[nicheKey].query} em ${city}`);
        continue;
      } catch (e) {
        googleError = String(e?.message || e).slice(0, 120);
        provider = "osm";
      }
    }
    try {
      const elements = fixedCity
        ? await (await import("./captador.js")).searchCaptadorOSM(nicheKey, fixedCity, fetcher)
        : await searchOSM(nicheKey, cityIndex, fetcher);
      found += elements.length;
      items = elements.map(element => osmToProspect(element, nicheKey, city)).filter(Boolean);
    } catch (e) {
      error = String(e?.message || e);
      done++;
      break;
    }
    const fresh = [];
    for (const item of items) if (!(await alreadyKnown(env, item.id))) fresh.push(item);
    added += await saveProspects(env, fresh);
    // Mostra na tela os novos desta busca (o mapa grátis pode ser guardado; o Google não).
    for (const item of fresh) live.push(withHours({ ...item, status: "novo", message: firstMessage(item, showcase), whatsapp: whatsappLink(item, showcase) }, item.hours));
    searched.push(`${NICHES[nicheKey].query} em ${city}`);
  }

  await writeState(env, "usage", { day: today(), count: used + done });
  if (!NICHES[niche]) await writeState(env, cursorKey, { n: position });
  return { ok: !error || live.length > 0, error: error || undefined, provider, searched, found,
    added: provider === "google" ? live.length : added, items: live,
    ...(googleError ? { fallbackFrom: "google", googleError } : {}),
    usedToday: used + done, dailyLimit: DAILY_SEARCH_LIMIT };
}

async function alreadyKnown(env, id) {
  const a = await env.DB.prepare("SELECT 1 AS x FROM prospects WHERE id=?1").bind(id).first();
  if (a) return true;
  // Guardado para chamar depois (empresa fechada) já está no CRM.
  if (await crmKnows(env, { sourceId: id }).catch(() => false)) return true;
  return Boolean(await env.DB.prepare("SELECT 1 AS x FROM prospect_skips WHERE id=?1").bind(id).first());
}

const GOOGLE_ID = /^[A-Za-z0-9_-]{10,300}$/;

// Quem o Rodrigo chamou no WhatsApp vira contato dele (nome, telefone, cidade).
export async function saveContacted(env, body = {}) {
  await ensureProspectSchema(env);
  const id = String(body.id || "");
  if (!GOOGLE_ID.test(id) && !/^osm:(node|way|relation)\/\d+$/.test(id)) throw new Error("prospect_invalid");
  if (!NICHES[body.niche] || !cleanCity(body.city)) throw new Error("prospect_invalid");
  body = { ...body, city: cleanCity(body.city) };
  const { phone, mobile } = phoneInfo(body.phone);
  const name = String(body.name || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 120);
  if (!phone || !name) throw new Error("prospect_invalid");
  const maps = String(body.maps_url || "");
  const mapsUrl = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps)\//.test(maps) ? maps.slice(0, 300) : mapsSearchLink(name, body.city);
  const instagram = /^[a-z0-9._]{1,30}$/i.test(String(body.instagram || "")) ? String(body.instagram) : "";
  const score = Math.max(0, Math.min(10, Math.round(Number(body.score) || 0)));
  await env.DB.prepare(
    `INSERT INTO prospects(id,name,niche,city,address,phone,mobile,website,instagram,rating,reviews,photos,maps_url,score,status)
     VALUES(?1,?2,?3,?4,'',?5,?6,'',?7,0,0,0,?8,?9,'enviado')
     ON CONFLICT(id) DO UPDATE SET status='enviado',updated_at=CURRENT_TIMESTAMP`
  ).bind(id, name, body.niche, body.city, phone, mobile ? 1 : 0, instagram, mapsUrl, score).run();
  // Também entra no CRM, com volta marcada para 7 dias. Se falhar, o Caçador segue normal.
  const crm = mobile ? await addFromProspect(env, { id, name, phone, city: body.city, niche: body.niche }).catch(() => null) : null;
  return { ok: true, id, crmId: crm?.id || null };
}

export async function skipProspect(env, id) {
  await ensureProspectSchema(env);
  const value = String(id || "");
  if (!GOOGLE_ID.test(value) && !/^osm:(node|way|relation)\/\d+$/.test(value)) throw new Error("prospect_invalid");
  await env.DB.prepare("INSERT OR IGNORE INTO prospect_skips(id) VALUES(?1)").bind(value).run();
  await env.DB.prepare("DELETE FROM prospects WHERE id=?1 AND status='novo'").bind(value).run();
  return { ok: true };
}

export async function listProspects(env, { status = "novo", limit = 50 } = {}) {
  await ensureProspectSchema(env);
  const filter = STATUSES.includes(status) ? status : "novo";
  const n = Math.max(1, Math.min(200, Number(limit) || 50));
  const rows = (await env.DB.prepare(
    `SELECT * FROM prospects WHERE status=?1 ORDER BY score DESC, reviews DESC, updated_at DESC LIMIT ?2`
  ).bind(filter, n).all())?.results || [];
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const row of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM prospects GROUP BY status").all())?.results || []) {
    counts[row.status] = Number(row.n || 0);
  }
  counts["nao-quer"] += Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM prospect_skips").first())?.n || 0);
  const showcase = await readShowcase(env);
  const usage = await readState(env, "usage", { day: "", count: 0 });
  const hasKey = Boolean(await placesKey(env));
  return {
    ok: true,
    // O mapa grátis está sempre disponível; a chave do Google é opcional.
    configured: true,
    googleKey: hasKey,
    provider: hasKey ? "google" : "osm",
    usedToday: usage.day === today() ? Number(usage.count || 0) : 0,
    dailyLimit: DAILY_SEARCH_LIMIT,
    counts,
    items: rows.map(row => withHours({
      ...row,
      mobile: Boolean(row.mobile),
      message: firstMessage(row, showcase),
      whatsapp: whatsappLink(row, showcase)
    }, null))
  };
}

export async function setProspectStatus(env, id, status) {
  if (!STATUSES.includes(status)) throw new Error("status_invalid");
  await ensureProspectSchema(env);
  if (status === "novo") {
    // Volta a ser "não guardado": aparece de novo numa busca futura.
    await env.DB.prepare("DELETE FROM prospects WHERE id=?1").bind(String(id || "")).run();
    return { ok: true, id, status };
  }
  const result = await env.DB.prepare(
    "UPDATE prospects SET status=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1"
  ).bind(String(id || ""), status).run();
  if (!Number(result?.meta?.changes || 0)) throw new Error("prospect_not_found");
  return { ok: true, id, status };
}

// Rotas do Master. Quem chama já conferiu o login do Master.
export async function handleProspectsRoute(request, env, url) {
  const send = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
  try {
    if (url.pathname === "/api/master/prospects" && request.method === "GET") {
      return send(await listProspects(env, { status: url.searchParams.get("status") || "novo", limit: url.searchParams.get("limit") }));
    }
    if (url.pathname === "/api/master/prospects/search" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runProspectSearch(env, { calls: body.calls, niche: body.niche, city: body.city });
      return send(result, result.ok || result.added ? 200 : 400);
    }
    if (url.pathname === "/api/master/prospects/plan" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await planBrowserSearch(env, { calls: body.calls, niche: body.niche });
      return send(result, result.ok ? 200 : 400);
    }
    if (url.pathname === "/api/master/prospects/import" && request.method === "POST") {
      const raw = await request.text();
      if (raw.length > 3_000_000) return send({ ok: false, error: "too_large" }, 413);
      let body = {};
      try { body = JSON.parse(raw); } catch {}
      return send(await importBrowserResults(env, body));
    }
    if (url.pathname === "/api/master/prospects/contacted" && request.method === "POST") {
      return send(await saveContacted(env, await request.json().catch(() => ({}))));
    }
    // Empresa fechada agora: entra no CRM para chamar quando abrir.
    if (url.pathname === "/api/master/prospects/later" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!NICHES[body.niche] || !cleanCity(body.city)) throw new Error("prospect_invalid");
      const showcase = await readShowcase(env);
      const saved = await addProspectLater(env, body, firstMessage(body, showcase));
      // Sai da lista "novos" do Caçador (agora está no CRM, em "Para chamar").
      await env.DB.prepare("DELETE FROM prospects WHERE id=?1 AND status='novo'").bind(String(body.id || "")).run().catch(() => null);
      return send(saved);
    }
    if (url.pathname === "/api/master/prospects/skip" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await skipProspect(env, body.id));
    }
    if (url.pathname === "/api/master/prospects/key" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await savePlacesKey(env, body.apiKey));
    }
    const match = url.pathname.match(/^\/api\/master\/prospects\/([^/]+)\/status$/);
    if (match && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setProspectStatus(env, decodeURIComponent(match[1]), String(body.status || "")));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 160) }, 400);
  }
  return null;
}
