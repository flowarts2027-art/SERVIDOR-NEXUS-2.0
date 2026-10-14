// Caçador de clientes da Flow Arts.
// Busca empresas no Google Maps (API oficial do Google Places), guarda só
// as que não têm site próprio, dá uma nota de 0 a 10 e prepara a primeira
// mensagem. Quem envia é o Rodrigo, pelo próprio WhatsApp (link wa.me).
// Nada é enviado sozinho daqui.

import { encryptSecret, decryptSecret } from "./secrets.js";

export const DAILY_SEARCH_LIMIT = 30; // ~900 buscas/mês, dentro da cota grátis (1.000/mês) do Google.
const SITE = "https://flowarts.com.br";

export const NICHES = {
  cafeteria: { query: "cafeteria", plural: "cafeterias", page: "/marketing-para-cafeteria" },
  salao: { query: "salão de beleza", plural: "salões de beleza", page: "/marketing-para-salao-de-beleza" },
  lanchonete: { query: "lanchonete", plural: "lanchonetes", page: "/marketing-para-lanchonete" }
};

// Cidades grandes do Brasil, em rodízio.
export const CITIES = [
  "São Paulo SP", "Rio de Janeiro RJ", "Belo Horizonte MG", "Brasília DF", "Salvador BA", "Fortaleza CE",
  "Curitiba PR", "Recife PE", "Porto Alegre RS", "Goiânia GO", "Belém PA", "Manaus AM", "Campinas SP",
  "São Luís MA", "Maceió AL", "Natal RN", "João Pessoa PB", "Teresina PI", "Campo Grande MS", "Cuiabá MT",
  "Florianópolis SC", "Vitória ES", "Aracaju SE", "Ribeirão Preto SP", "Sorocaba SP", "Uberlândia MG",
  "Juiz de Fora MG", "Londrina PR", "Joinville SC", "Niterói RJ", "Santos SP", "São José dos Campos SP",
  "Feira de Santana BA", "Caxias do Sul RS", "Maringá PR", "Campina Grande PB", "Montes Claros MG",
  "Anápolis GO", "Porto Velho RO", "Macapá AP", "Boa Vista RR", "Palmas TO", "Rio Branco AC"
];

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

async function placesKey(env) {
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
export function prospectScore({ reviews = 0, rating = 0, photos = 0, mobile = false }) {
  let score = 3; // já passou no filtro "sem site próprio"
  if (reviews >= 300) score += 3; else if (reviews >= 100) score += 2; else if (reviews >= 30) score += 1;
  if (rating >= 4.5) score += 2; else if (rating >= 4.0) score += 1;
  if (photos < 5) score += 1;
  if (mobile) score += 1;
  return Math.max(0, Math.min(10, score));
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
  return item;
}

export function firstMessage(p) {
  const niche = NICHES[p.niche] || NICHES.cafeteria;
  const cityName = String(p.city || "").replace(/\s[A-Z]{2}$/, "");
  const lines = ["Oi, tudo bem? Aqui é o Rodrigo, da Flow Arts."];
  if (Number(p.reviews) >= 20 && Number(p.rating) >= 4) {
    lines.push(`Vi a ${p.name} no Google: ${p.reviews} avaliações e nota ${String(Number(p.rating).toFixed(1)).replace(".", ",")}. Os clientes gostam de vocês!`);
  } else {
    lines.push(`Encontrei a ${p.name} no Google, aqui em ${cityName}.`);
  }
  lines.push(p.instagram
    ? "Notei que o Instagram é o principal canal de vocês na internet."
    : "Notei que vocês ainda não têm um site.");
  lines.push(p.instagram
    ? `Eu faço site e cuido do Instagram de ${niche.plural}. Assim, quem procura no Google acha vocês e chega direto no seu WhatsApp. Veja um exemplo: ${SITE}${niche.page}`
    : `Eu faço site para ${niche.plural}: uma página com fotos, serviços, mapa e botão para o seu WhatsApp, feita para aparecer no Google. Veja um exemplo: ${SITE}${niche.page}`);
  lines.push(`Posso te mostrar como ficaria para a ${p.name}?`);
  lines.push("Se preferir não receber mensagens, é só me avisar.");
  return lines.join("\n\n");
}

export function whatsappLink(p) {
  return `https://wa.me/55${p.phone}?text=${encodeURIComponent(firstMessage(p))}`;
}

const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
  "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount",
  "places.photos", "places.googleMapsUri", "places.businessStatus"
].join(",");

async function searchPlaces(key, query, fetcher) {
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
export async function runProspectSearch(env, { calls = 3, niche = "" } = {}, fetcher = fetch) {
  await ensureProspectSchema(env);
  const key = await placesKey(env);
  if (!key) return { ok: false, error: "google_key_missing" };
  const usage = await readState(env, "usage", { day: "", count: 0 });
  const used = usage.day === today() ? Number(usage.count || 0) : 0;
  const allowed = Math.max(0, Math.min(Number(calls) || 3, 5, DAILY_SEARCH_LIMIT - used));
  if (!allowed) return { ok: false, error: "daily_limit", usedToday: used, dailyLimit: DAILY_SEARCH_LIMIT };

  const nicheKeys = NICHES[niche] ? [niche] : Object.keys(NICHES);
  const cursor = await readState(env, "cursor", { n: 0 });
  let position = Number(cursor.n || 0);
  const searched = [];
  let added = 0;
  let found = 0;
  let error = "";
  let done = 0;

  for (; done < allowed; done++) {
    const nicheKey = nicheKeys[position % nicheKeys.length];
    const city = CITIES[Math.floor(position / nicheKeys.length) % CITIES.length];
    position++;
    let places;
    try {
      places = await searchPlaces(key, `${NICHES[nicheKey].query} em ${city}`, fetcher);
    } catch (e) {
      error = String(e?.message || e);
      done++;
      break;
    }
    found += places.length;
    for (const place of places) {
      const item = placeToProspect(place, nicheKey, city);
      if (!item) continue;
      // INSERT OR IGNORE: quem já está na lista (inclusive "não quer") não volta.
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO prospects(id,name,niche,city,address,phone,mobile,website,instagram,rating,reviews,photos,maps_url,score)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`
      ).bind(item.id, item.name, item.niche, item.city, item.address, item.phone, item.mobile ? 1 : 0, item.website,
        item.instagram, item.rating, item.reviews, item.photos, item.maps_url, item.score).run();
      if (Number(result?.meta?.changes || 0) > 0) added++;
    }
    searched.push(`${NICHES[nicheKey].query} em ${city}`);
  }

  await writeState(env, "usage", { day: today(), count: used + done });
  if (!NICHES[niche]) await writeState(env, "cursor", { n: position });
  return { ok: !error, error: error || undefined, searched, found, added, usedToday: used + done, dailyLimit: DAILY_SEARCH_LIMIT };
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
  const usage = await readState(env, "usage", { day: "", count: 0 });
  return {
    ok: true,
    configured: Boolean(await placesKey(env)),
    usedToday: usage.day === today() ? Number(usage.count || 0) : 0,
    dailyLimit: DAILY_SEARCH_LIMIT,
    counts,
    items: rows.map(row => ({
      ...row,
      mobile: Boolean(row.mobile),
      message: firstMessage(row),
      whatsapp: whatsappLink(row)
    }))
  };
}

export async function setProspectStatus(env, id, status) {
  if (!STATUSES.includes(status)) throw new Error("status_invalid");
  await ensureProspectSchema(env);
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
      const result = await runProspectSearch(env, { calls: body.calls, niche: body.niche });
      return send(result, result.ok || result.added ? 200 : 400);
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
