// Quem não recebe imagem gerada pela IA (regra fixa do Rodrigo, docs/nexus-memory/REGRA_CLIENTE_NUNCA_SEM_POST.md).
// Fica num arquivo só para o Vigia (post-watcher.js) e o Creator (agent-runtime.js) seguirem a mesma lista.
// 13/11/2026: a lista valia só no Vigia. O Creator criava post e imagem de IA para a Daniela e o Adimax.
import { clientGroup } from "./clients.js";

// Daniela e GILTEC: pedido do Rodrigo. Quatree e Adimax: toda peça mostra a ração ou a embalagem, e a IA não sabe desenhar produto real.
export const NO_GENERATION_CLIENTS = Object.freeze(new Set(["daniela-martins", "quatree-dog", "quatree-dog-eduardo", "giltec", "giltec-locacoes"]));
// O painel e o grupo da Adimax nascem pelo Master, e o id vem do nome escolhido. Por isso vale qualquer id com a palavra adimax.
export const NO_GENERATION_RE = /(^|-)adimax(-|$)/;
// Vendedor novo entra pelo campo Grupo do Master, com outro id. A regra vale para o grupo inteiro.
export const NO_GENERATION_GROUPS = Object.freeze(new Set(["giltec", "quatree-dog"]));

export function receivesGeneratedImage(clientId) {
  const id = String(clientId || "");
  return !NO_GENERATION_CLIENTS.has(id) && !NO_GENERATION_RE.test(id);
}

export function usesGeneratedImage(client) {
  const group = String(clientGroup(client)?.id || "");
  return receivesGeneratedImage(client?.id) && !NO_GENERATION_GROUPS.has(group) && !NO_GENERATION_RE.test(group);
}
