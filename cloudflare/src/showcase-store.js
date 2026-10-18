// Vitrine por nicho (pedido do Rodrigo em 17/10): um Reel de exemplo para cada tipo de negócio,
// que entra na primeira mensagem do caçador e do Captador. SÓ para a Flow Arts.
// Este arquivo só lê e grava (sem outros imports), para não criar ciclo entre os módulos.

export const SHOWCASE_CLIENT = "primeiro-teste";
export const SHOWCASE_ORIGIN = "https://flowarts.com.br";

export function showcaseUrl(niche) {
  return SHOWCASE_ORIGIN + "/exemplo/" + encodeURIComponent(String(niche));
}

export async function readShowcase(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT value_json FROM nexus_state WHERE namespace='showcase' AND item_key='map' AND client_id=?1 LIMIT 1"
    ).bind(SHOWCASE_CLIENT).first();
    const value = JSON.parse(String(row?.value_json || "{}"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export async function writeShowcase(env, map) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('showcase', 'map', ?1, ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(SHOWCASE_CLIENT, JSON.stringify(map)).run();
}

// 18/10 (Rodrigo): loja de ração, casa de ração e agropecuária são um nicho só ("racao").
// Chaves antigas que ainda estejam guardadas viram "racao".
export const NICHE_MERGE = { casa_racao: "racao", agropecuaria: "racao" };
export const canonicalNiche = niche => NICHE_MERGE[String(niche || "")] || String(niche || "");
export function showcaseEntry(map, niche) {
  const key = canonicalNiche(niche);
  return map?.[key] || map?.[niche];
}

// Linha que entra na mensagem quando o nicho tem vitrine. Vazia quando não tem.
export function showcaseLine(map, niche, label) {
  const entry = showcaseEntry(map, niche);
  const carousel = entry?.kind === "carousel" && Array.isArray(entry?.images) && entry.images.length > 0;
  if (!carousel && !entry?.videoUrl) return "";
  const what = carousel ? "um carrossel" : "um vídeo";
  return `Veja ${what} que fizemos para ${String(label || "o seu tipo de negócio").toLowerCase()}: ${showcaseUrl(niche)}`;
}
