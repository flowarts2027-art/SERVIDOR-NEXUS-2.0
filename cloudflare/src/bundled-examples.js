// Migração única dos 21 nichos: substitui vídeos/carrosséis antigos por artes 2×2.
// Depois de gravar a versão, uploads e remoções manuais posteriores são preservados.
import { readShowcase, readShowcaseState, writeShowcase } from "./showcase-store.js";
import { BUNDLED_NICHES, BUNDLED_VERSION } from "./bundled-example-catalog.js";
export { BUNDLED_ORIGIN } from "./bundled-example-catalog.js";
export const BUNDLED_EXAMPLES = Object.fromEntries(BUNDLED_NICHES.map(niche => [niche, 1]));
export async function seedBundledExamples(env) {
  const { version, readFailed } = await readShowcaseState(env);
  if (readFailed) throw new Error("showcase_read_failed");
  if (version === BUNDLED_VERSION) return { ok: true, added: [] };
  await writeShowcase(env, await readShowcase(env));
  return { ok: true, added: [...BUNDLED_NICHES] };
}
