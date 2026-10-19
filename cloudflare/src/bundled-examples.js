// 19/10 (Rodrigo): "não vou salvar, você que vai subir". Exemplos montados no chat vão junto
// com o site (public/exemplos-nicho/<nicho>/cartao-N.jpg) e entram sozinhos na vitrine.
// Só preenche nicho SEM exemplo: o que ele subir pelo Master nunca é trocado.
import { readShowcase, writeShowcase } from "./showcase-store.js";

export const BUNDLED_ORIGIN = "https://flowarts.com.br";
export const BUNDLED_EXAMPLES = { bar: 5, dentista: 5, clinica: 5, farmacia: 5 };

const hasExample = e => Boolean(e?.videoUrl || (e?.kind === "carousel" && Array.isArray(e?.images) && e.images.length));

export async function seedBundledExamples(env, now = new Date()) {
  const map = await readShowcase(env);
  const added = [];
  for (const [niche, count] of Object.entries(BUNDLED_EXAMPLES)) {
    if (hasExample(map[niche])) continue;
    const images = Array.from({ length: count }, (_, i) => `${BUNDLED_ORIGIN}/exemplos-nicho/${niche}/cartao-${i + 1}.jpg`);
    map[niche] = { kind: "carousel", images, imageUrl: images[0], videoUrl: "", savedAt: now.toISOString(), source: "bundled" };
    added.push(niche);
  }
  if (added.length) await writeShowcase(env, map);
  return { ok: true, added };
}
