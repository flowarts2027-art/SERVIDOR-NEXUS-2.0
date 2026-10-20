// Vitrine por nicho (pedido do Rodrigo em 17/10): um Reel de exemplo para cada tipo de negócio,
// que entra na primeira mensagem do caçador e do Captador. SÓ para a Flow Arts.
// Este arquivo só lê e grava (sem outros imports), para não criar ciclo entre os módulos.

export const SHOWCASE_CLIENT = "primeiro-teste";
export const SHOWCASE_ORIGIN = "https://flowarts.com.br";

export function showcaseUrl(niche) {
  return SHOWCASE_ORIGIN + "/exemplo/" + encodeURIComponent(String(niche));
}

export async function readStoredShowcase(env) {
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

// Os 35 cartões antigos foram retirados por pedido do proprietário. Apenas URLs
// desse conjunto são removidas; uploads novos e mídias de outros domínios ficam intactos.
export function isRetiredBundledImage(value) {
  try {
    const url = new URL(String(value || ""), SHOWCASE_ORIGIN);
    return ["flowarts.com.br", "www.flowarts.com.br"].includes(url.hostname)
      && /^\/exemplos-nicho\/(bar|dentista|clinica|farmacia|mercado|oficina|hotel)\/cartao-[1-5]\.jpg$/.test(url.pathname);
  } catch { return false; }
}

export function retireBundledShowcase(value) {
  const map = { ...value };
  const removed = [];
  for (const [niche, entry] of Object.entries(map)) {
    if (!entry || typeof entry !== "object") continue;
    const images = Array.isArray(entry.images) ? entry.images.filter(image => !isRetiredBundledImage(image)) : null;
    const oldPoster = isRetiredBundledImage(entry.imageUrl);
    if (!oldPoster && (!images || images.length === entry.images.length)) continue;
    removed.push(niche);
    if (!images?.length && !entry.videoUrl && (oldPoster || !entry.imageUrl)) { delete map[niche]; continue; }
    map[niche] = { ...entry, ...(images ? { images: images.length || !entry.imageUrl || oldPoster || entry.videoUrl ? images : [entry.imageUrl] } : {}),
      ...(oldPoster ? { imageUrl: images?.[0] || "" } : {}),
      ...(!images?.length && entry.videoUrl ? { kind: "video" } : {}) };
  }
  return { map, removed };
}

// Toda leitura deixa de oferecer os cartões antigos, mesmo antes da limpeza do cron.
export async function readShowcase(env) {
  return retireBundledShowcase(await readStoredShowcase(env)).map;
}

export async function writeShowcase(env, map) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('showcase', 'map', ?1, ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(SHOWCASE_CLIENT, JSON.stringify(map)).run();
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
  if (!carousel && !entry?.videoUrl) return "";
  const what = carousel ? "um carrossel" : "um vídeo";
  return `Veja ${what} que fizemos para ${String(label || "o seu tipo de negócio").toLowerCase()}: ${showcaseUrl(niche)}`;
}
