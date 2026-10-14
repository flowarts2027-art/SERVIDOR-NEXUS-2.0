// Captador de clientes: ferramenta vendida aos clientes da Flow Arts (R$ 97/mês).
// O cliente escolhe o tipo de negócio e a cidade no portal. O navegador dele
// consulta o OpenStreetMap (grátis) e manda o resultado para cá. Aqui a gente
// filtra, guarda só para aquele cliente e monta a mensagem com o texto dele.
// Nada é enviado pelo servidor: o cliente manda pelo próprio WhatsApp.

import { phoneInfo, siteInfo, mapsSearchLink, STATUSES, OVERPASS_ENDPOINTS } from "./prospects.js";

export const CAPTADOR_DAILY_LIMIT = 10;
export const CAPTADOR_PRICE = "R$ 97 por mês";

// Overpass compara o nome por bytes: acentos vão escritos em maiúscula e minúscula.
const RACAO_NAMES = "ração|rações|racao|racoes|RAÇÃO|RAÇÕES|Ração|Rações";

export const CAPTADOR_NICHES = {
  restaurante: { label: "Restaurante", tags: [["amenity", "restaurant"]] },
  cafeteria: { label: "Cafeteria", tags: [["amenity", "cafe"]] },
  lanchonete: { label: "Lanchonete", tags: [["amenity", "fast_food"]] },
  padaria: { label: "Padaria", tags: [["shop", "bakery"]] },
  bar: { label: "Bar", tags: [["amenity", "bar"], ["amenity", "pub"]] },
  salao: { label: "Salão de beleza e barbearia", tags: [["shop", "hairdresser"], ["shop", "beauty"]] },
  academia: { label: "Academia", tags: [["leisure", "fitness_centre"]] },
  pet: { label: "Pet shop", tags: [["shop", "pet"]] },
  // Lojas de ração e agro (pedido de 14/10: cliente que revende Quatree em MG).
  // Terceiro item = filtro extra do Overpass; valor null = qualquer valor da chave.
  racao: { label: "Ração (loja de ração)", tags: [
    ["shop", "agrarian", '["agrarian"~"feed"]'],
    ["shop", "pet_food"],
    ["shop", null, `["name"~"${RACAO_NAMES}",i]`]
  ] },
  casa_racao: { label: "Casa de ração", tags: [
    ["shop", null, '["name"~"casa d[aeo]s? ra",i]']
  ] },
  agropecuaria: { label: "Agropecuária", tags: [
    ["shop", "agrarian"],
    ["shop", null, '["name"~"agropecu|agrovet|agro ",i]']
  ] },
  veterinario: { label: "Veterinário", tags: [["amenity", "veterinary"]] },
  dentista: { label: "Dentista", tags: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  clinica: { label: "Clínica e consultório", tags: [["amenity", "clinic"], ["amenity", "doctors"]] },
  farmacia: { label: "Farmácia", tags: [["amenity", "pharmacy"]] },
  mercado: { label: "Mercado", tags: [["shop", "supermarket"], ["shop", "convenience"]] },
  roupas: { label: "Loja de roupas", tags: [["shop", "clothes"]] },
  oficina: { label: "Oficina mecânica", tags: [["shop", "car_repair"]] },
  hotel: { label: "Hotel e pousada", tags: [["tourism", "hotel"], ["tourism", "guest_house"]] },
  imobiliaria: { label: "Imobiliária", tags: [["office", "estate_agent"]] },
  contabilidade: { label: "Contabilidade", tags: [["office", "accountant"]] },
  material: { label: "Material de construção", tags: [["shop", "hardware"], ["shop", "doityourself"]] }
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const clean = (value, max) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

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

export async function captadorEnabled(env, clientId) {
  return (await readState(env, String(clientId || ""), "access", { enabled: false })).enabled === true;
}

export async function setCaptadorAccess(env, clientId, enabled) {
  const id = String(clientId || "").trim();
  if (!id) throw new Error("client_id_required");
  await writeState(env, id, "access", { enabled: Boolean(enabled), updatedAt: new Date().toISOString() });
  return { ok: true, clientId: id, enabled: Boolean(enabled) };
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

export function captadorScore({ mobile, hours, address, instagram, hasSite }) {
  let score = 3;
  if (mobile) score += 2;
  if (hours) score += 2;
  if (address) score += 1;
  if (instagram) score += 1;
  if (!hasSite) score += 1;
  return Math.min(10, score);
}

export function captadorLead(element, nicheKey, city, onlyNoSite = false) {
  const tags = element?.tags || {};
  const name = clean(tags.name, 120);
  if (!name || !["node", "way", "relation"].includes(element?.type) || !Number.isFinite(Number(element?.id))) return null;
  if (tags.disused || tags["disused:amenity"] || tags["disused:shop"]) return null;
  if (tags.brand || tags["brand:wikidata"]) return null;
  const rawPhone = String(tags["contact:whatsapp"] || tags["contact:mobile"] || tags.mobile || tags.phone || tags["contact:phone"] || "").split(/[;,]/)[0];
  const { phone, mobile } = phoneInfo(rawPhone);
  if (!phone) return null;
  const website = String(tags.website || tags["contact:website"] || tags.url || "").trim();
  const site = siteInfo(website && !/^https?:/i.test(website) ? "https://" + website : website);
  if (onlyNoSite && site.hasOwnSite) return null;
  const igTag = String(tags["contact:instagram"] || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
  const instagram = site.instagram || (/^[a-z0-9._]{1,30}$/i.test(igTag) ? igTag : "");
  const address = clean([tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"]].filter(Boolean).join(", "), 200);
  const lead = {
    id: `osm:${element.type}/${Number(element.id)}`, name, niche: nicheKey, city, address, phone, mobile,
    has_site: site.hasOwnSite, instagram, maps_url: mapsSearchLink(name, city)
  };
  lead.score = captadorScore({ mobile, hours: Boolean(tags.opening_hours), address, instagram, hasSite: site.hasOwnSite });
  return lead;
}

export function captadorQuery(nicheKey, lat, lon, radius = 10000) {
  const parts = CAPTADOR_NICHES[nicheKey].tags.map(([k, v, extra = ""]) =>
    `nwr["${k}"${v === null ? "" : `="${v}"`}]${extra}["name"](around:${radius},${lat},${lon});`);
  return `[out:json][timeout:25];(${parts.join("")});out tags center 800;`;
}

// Território brasileiro, com folga.
const inBrazil = (lat, lon) => lat >= -34.5 && lat <= 6 && lon >= -74.5 && lon <= -28.5;

export async function planCaptadorSearch(env, client, body = {}) {
  await ensureCaptadorSchema(env);
  if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
  const niche = String(body.niche || "");
  if (!CAPTADOR_NICHES[niche]) throw new Error("niche_invalid");
  const lat = Number(body.lat), lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBrazil(lat, lon)) throw new Error("city_invalid");
  const city = clean(body.city, 60);
  if (!city) throw new Error("city_invalid");
  const usage = await readState(env, client.id, "usage", { day: "", count: 0 });
  const used = usage.day === today() ? Number(usage.count || 0) : 0;
  if (used >= CAPTADOR_DAILY_LIMIT) throw new Error("daily_limit");
  await writeState(env, client.id, "usage", { day: today(), count: used + 1 });
  await writeState(env, client.id, "job", { niche, city, at: Date.now() });
  return {
    ok: true, query: captadorQuery(niche, lat.toFixed(4), lon.toFixed(4)), endpoints: OVERPASS_ENDPOINTS,
    usedToday: used + 1, dailyLimit: CAPTADOR_DAILY_LIMIT
  };
}

export async function importCaptadorResults(env, client, body = {}) {
  await ensureCaptadorSchema(env);
  if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
  const job = await readState(env, client.id, "job", null);
  if (!job || !CAPTADOR_NICHES[job.niche] || Date.now() - Number(job.at || 0) > 15 * 60 * 1000) throw new Error("search_expired");
  const config = await captadorConfig(env, client);
  const list = Array.isArray(body.elements) ? body.elements.slice(0, 1000) : [];
  let added = 0;
  for (const element of list) {
    const lead = captadorLead({ type: element?.type, id: element?.id, tags: element && typeof element.tags === "object" ? element.tags : {} },
      job.niche, job.city, config.onlyNoSite);
    if (!lead) continue;
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO captador_leads(client_id,id,name,niche,city,address,phone,mobile,has_site,instagram,maps_url,score)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`
    ).bind(client.id, lead.id, lead.name, lead.niche, lead.city, lead.address, lead.phone, lead.mobile ? 1 : 0,
      lead.has_site ? 1 : 0, lead.instagram, lead.maps_url, lead.score).run();
    if (Number(result?.meta?.changes || 0) > 0) added++;
  }
  await writeState(env, client.id, "job", null);
  return { ok: true, found: list.length, added };
}

export async function captadorView(env, client, status = "novo") {
  const enabled = await captadorEnabled(env, client.id);
  if (!enabled) return { ok: true, enabled: false, price: CAPTADOR_PRICE };
  await ensureCaptadorSchema(env);
  const filter = STATUSES.includes(status) ? status : "novo";
  const config = await captadorConfig(env, client);
  const rows = (await env.DB.prepare(
    "SELECT * FROM captador_leads WHERE client_id=?1 AND status=?2 ORDER BY score DESC, updated_at DESC LIMIT 100"
  ).bind(client.id, filter).all())?.results || [];
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const row of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM captador_leads WHERE client_id=?1 GROUP BY status").bind(client.id).all())?.results || []) {
    counts[row.status] = Number(row.n || 0);
  }
  const usage = await readState(env, client.id, "usage", { day: "", count: 0 });
  return {
    ok: true, enabled: true, config, counts,
    usedToday: usage.day === today() ? Number(usage.count || 0) : 0, dailyLimit: CAPTADOR_DAILY_LIMIT,
    niches: Object.entries(CAPTADOR_NICHES).map(([key, n]) => ({ key, label: n.label })),
    items: rows.map(row => {
      const message = captadorMessage(config, row);
      return { ...row, mobile: Boolean(row.mobile), has_site: Boolean(row.has_site), message,
        whatsapp: `https://wa.me/55${row.phone}?text=${encodeURIComponent(message)}` };
    })
  };
}

export async function setCaptadorStatus(env, client, id, status) {
  if (!STATUSES.includes(status)) throw new Error("status_invalid");
  await ensureCaptadorSchema(env);
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
  daily_limit: "Você chegou no limite de buscas de hoje. Amanhã libera de novo.",
  city_invalid: "Não encontrei essa cidade. Escreva o nome da cidade e o estado, por exemplo: Recife PE.",
  niche_invalid: "Escolha um tipo de negócio da lista.",
  search_expired: "A busca demorou demais. Tente de novo.",
  status_invalid: "Não deu para mudar a etapa.",
  lead_not_found: "Esse contato não foi encontrado."
};

// Rotas do portal. Quem chama já conferiu o login do cliente.
export async function handleCaptadorPortal(request, env, url, client) {
  if (!url.pathname.startsWith("/api/portal/captador")) return null;
  try {
    if (url.pathname === "/api/portal/captador" && request.method === "GET") {
      return send(await captadorView(env, client, url.searchParams.get("status") || "novo"));
    }
    const raw = request.method === "POST" ? await request.text() : "";
    if (raw.length > 3_000_000) return send({ ok: false, error: "too_large", message: "Resultado grande demais." }, 413);
    let body = {};
    try { body = JSON.parse(raw || "{}"); } catch {}
    if (url.pathname === "/api/portal/captador/config" && request.method === "POST") {
      if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
      return send({ ok: true, config: await saveCaptadorConfig(env, client, body) });
    }
    if (url.pathname === "/api/portal/captador/plan" && request.method === "POST") {
      return send(await planCaptadorSearch(env, client, body));
    }
    if (url.pathname === "/api/portal/captador/import" && request.method === "POST") {
      return send(await importCaptadorResults(env, client, body));
    }
    const match = url.pathname.match(/^\/api\/portal\/captador\/([^/]+)\/status$/);
    if (match && request.method === "POST") {
      if (!(await captadorEnabled(env, client.id))) throw new Error("captador_disabled");
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
        rows.push({ id, name: String(client.name || id), enabled: await captadorEnabled(env, id) });
      }
      return send({ ok: true, price: CAPTADOR_PRICE, clients: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return send(await setCaptadorAccess(env, body.clientId, body.enabled === true));
    }
  } catch (error) {
    return send({ ok: false, error: String(error?.message || error).slice(0, 80) }, 400);
  }
  return null;
}
