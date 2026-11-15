// Quem recebe imagem gerada pela IA (regra fixa do Rodrigo, docs/nexus-memory/REGRA_CLIENTE_NUNCA_SEM_POST.md).
// Um arquivo só: Creator, Format Builder, Vigia, Criar com agente, campanhas, emergência e a rota de foto seguem a mesma regra.
// 13/11/2026: a lista valia só no Vigia. O Creator criava post e imagem de IA para a Daniela e o Adimax.
// 15/11/2026: o Format Builder ainda gerava os cartões do carrossel por IA para o Adimax. Agora a geração
// só acontece com a opção "Gerar imagem por IA sozinho" LIGADA no Master (agentCore.aiImages === true).
// Sem a opção salva, fica desligado.
import { clientGroup } from "./clients.js";

// Daniela e GILTEC: pedido do Rodrigo. Quatree e Adimax: toda peça mostra a ração ou a embalagem, e a IA não sabe desenhar produto real.
// Para estes, nem a opção do Master libera.
export const NO_GENERATION_CLIENTS = Object.freeze(new Set(["daniela-martins", "quatree-dog", "quatree-dog-eduardo", "giltec", "giltec-locacoes"]));
// O painel e o grupo da Adimax nascem pelo Master, e o id vem do nome escolhido. Por isso vale qualquer id com a palavra adimax.
export const NO_GENERATION_RE = /(^|-)adimax(-|$)/;
// Vendedor novo entra pelo campo Grupo do Master, com outro id. A regra vale para o grupo inteiro.
export const NO_GENERATION_GROUPS = Object.freeze(new Set(["giltec", "quatree-dog"]));

export const GENERATION_BLOCKED = "generated_image_not_allowed";

export function receivesGeneratedImage(clientId) {
  const id = String(clientId || "");
  return !NO_GENERATION_CLIENTS.has(id) && !NO_GENERATION_RE.test(id);
}

// Opção do Master. Só vale ligada de propósito: padrão é desligado.
export function aiImagesOn(client) {
  const agentCore = client?.config?.agentCore;
  return Boolean(agentCore && typeof agentCore === "object" && agentCore.aiImages === true && agentCore.enabled !== false);
}

export function usesGeneratedImage(client) {
  const group = String(clientGroup(client)?.id || "");
  return aiImagesOn(client)
    && receivesGeneratedImage(client?.id)
    && !NO_GENERATION_GROUPS.has(group)
    && !NO_GENERATION_RE.test(group);
}

// Trava final: todo gerador de imagem chama antes de pedir a imagem à IA.
export function assertGeneratedImageAllowed(client) {
  if (!usesGeneratedImage(client)) {
    const error = new Error(GENERATION_BLOCKED);
    error.code = GENERATION_BLOCKED;
    throw error;
  }
}
