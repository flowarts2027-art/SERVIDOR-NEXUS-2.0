// Compatibilidade com o ciclo diário existente: retira referências aos cartões
// antigos. Nunca adiciona exemplos; uploads atuais do Master são preservados.
import { readStoredShowcase, retireBundledShowcase, writeShowcase } from "./showcase-store.js";

export async function seedBundledExamples(env) {
  const { map, removed } = retireBundledShowcase(await readStoredShowcase(env));
  if (removed.length) await writeShowcase(env, map);
  return { ok: true, added: [], removed };
}
