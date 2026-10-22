// FLOW-ARTES-001 (22/10): uma arte 4:5 em grade 2×2 para cada nicho.
export const BUNDLED_ORIGIN = "https://flowarts.com.br";
export const BUNDLED_VERSION = "artes-2x2-2026-10-22";
export const BUNDLED_NICHES = ["restaurante", "cafeteria", "lanchonete", "padaria", "bar", "salao", "academia", "pet", "racao", "agropecuaria", "veterinario", "dentista", "clinica", "farmacia", "mercado", "roupas", "oficina", "hotel", "imobiliaria", "contabilidade", "material"];
export function bundledExample(niche) {
  return { kind: "image", imageUrl: `${BUNDLED_ORIGIN}/exemplos-nicho/${niche}/arte-2x2.jpg`, images: [], videoUrl: "", source: "bundled", version: BUNDLED_VERSION };
}
