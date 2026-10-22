import { BUNDLED_NICHES, BUNDLED_VERSION, bundledExample } from "./bundled-example-catalog.js";

// Vitrine comercial por nicho, somente da Flow Arts. O catálogo não depende dos consumidores.

export const SHOWCASE_CLIENT = "primeiro-teste";
export const SHOWCASE_ORIGIN = "https://flowarts.com.br";

export function showcaseUrl(niche) {
  return SHOWCASE_ORIGIN + "/exemplo/" + encodeURIComponent(String(niche));
}

export async function readShowcaseState(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT value_json FROM nexus_state WHERE namespace='showcase' AND item_key='map' AND client_id=?1 LIMIT 1"
    ).bind(SHOWCASE_CLIENT).first();
    const value = JSON.parse(String(row?.value_json || "{}"));
    const map = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const version = map.__bundledVersion || "";
    delete map.__bundledVersion;
    return { map, version };
  } catch {
    return { map: {}, version: "", readFailed: true };
  }
}

// A leitura serve a mesma migração ao Master, CRM e páginas públicas, sem esperar cron.
export async function readShowcase(env) {
  const { map, version, readFailed } = await readShowcaseState(env);
  if (readFailed) return {};
  if (version !== BUNDLED_VERSION) {
    for (const niche of BUNDLED_NICHES) map[niche] = bundledExample(niche);
  }
  return map;
}

export async function writeShowcase(env, map) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('showcase', 'map', ?1, ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(SHOWCASE_CLIENT, JSON.stringify({ ...map, __bundledVersion: BUNDLED_VERSION })).run();
}

// 18/10 (Rodrigo): "casa de ração" e "loja de ração" são a mesma coisa → fica só "racao".
// Chave antiga que ainda esteja guardada (CRM, Captador) vira "racao".
export const NICHE_MERGE = { casa_racao: "racao" };
export const canonicalNiche = niche => NICHE_MERGE[String(niche || "")] || String(niche || "");
export function showcaseEntry(map, niche) {
  return map?.[canonicalNiche(niche)] || map?.[niche];
}

// Linha que entra na mensagem quando o nicho tem vitrine. Vazia quando não tem.
export function showcaseLine(map, niche, label) {
  const entry = showcaseEntry(map, niche);
  const carousel = entry?.kind === "carousel" && Array.isArray(entry?.images) && entry.images.length > 0;
  const image = entry?.kind === "image" && /^https:\/\//i.test(String(entry.imageUrl || ""));
  if (!image && !carousel && !entry?.videoUrl) return "";
  const what = image ? "uma arte" : carousel ? "um carrossel" : "um vídeo";
  return `Veja ${what} que fizemos para ${String(label || "o seu tipo de negócio").toLowerCase()}: ${showcaseUrl(niche)}`;
}
