// 19/10 (Rodrigo): "não vou salvar, você que vai subir". Exemplos montados no chat vão junto
// com o site (public/exemplos-nicho/<nicho>/) e entram sozinhos na vitrine.
// 19/10 14h36: ele quer VÍDEO, não fotos (no computador só baixavam 2 fotos). Cada nicho tem
// video.mp4 feito dos 5 cartões (scripts/social/video_exemplo.py); a capa é o cartão 1.
// Só preenche nicho SEM exemplo, ou troca o carrossel que nós mesmos colocamos (source "bundled").
// O que ele subir pelo Master nunca é trocado.
import { readShowcase, writeShowcase } from "./showcase-store.js";

export const BUNDLED_ORIGIN = "https://flowarts.com.br";
export const BUNDLED_EXAMPLES = ["bar", "dentista", "clinica", "farmacia", "mercado", "oficina", "hotel"];

const hasExample = e => Boolean(e?.videoUrl || (e?.kind === "carousel" && Array.isArray(e?.images) && e.images.length));
const ours = e => e?.source === "bundled";

export function bundledEntry(niche, now = new Date()) {
  const base = `${BUNDLED_ORIGIN}/exemplos-nicho/${niche}/`;
  return { kind: "video", videoUrl: base + "video.mp4", imageUrl: base + "cartao-1.jpg", images: [], savedAt: now.toISOString(), source: "bundled", version: 2 };
}

export async function seedBundledExamples(env, now = new Date()) {
  const map = await readShowcase(env);
  const added = [];
  for (const niche of BUNDLED_EXAMPLES) {
    const current = map[niche];
    if (hasExample(current) && !(ours(current) && current.version !== 2)) continue;
    map[niche] = bundledEntry(niche, now);
    added.push(niche);
  }
  if (added.length) await writeShowcase(env, map);
  return { ok: true, added };
}
