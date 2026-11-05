import { findRecentMediaByCaption } from "./publisher.js";

// Trava do publicador (Rodrigo, 05/11/2026): no máximo 2 publicações por execução, uma de cada vez.
// Carrossel conta como 1, mas gasta sozinho boa parte dos 50 pedidos da execução: nunca divide a rodada com outro.
export const MAX_PUBLISHES_PER_RUN = 2;
export const MAX_PUBLISH_ATTEMPTS = 3;
const META_LIMIT_CODES = new Set([4, 17, 32, 429, 613]);
const RETRY_LOOKBACK_MS = 5 * 60 * 1000;

export function createPublishBudget({ wait = null, now = Date.now } = {}) {
  return { remaining: MAX_PUBLISHES_PER_RUN, used: 0, clients: new Set(), lastAt: 0, wait, now };
}

// Um cliente só publica uma vez por execução: assim o story nunca sai junto com o post dele.
export function canPublish(budget, clientId, format = "post") {
  if (budget.remaining <= 0 || budget.clients.has(clientId)) return false;
  return !(format === "carousel" && budget.used > 0);
}

export function spendPublish(budget, clientId, format = "post") {
  budget.used += 1;
  budget.remaining = format === "carousel" ? 0 : budget.remaining - 1;
  budget.clients.add(clientId);
  budget.lastAt = budget.now();
}

// A segunda publicação da execução espera virar o minuto: dois clientes nunca saem no mesmo minuto.
export async function waitForNextMinute(budget) {
  if (!budget.used || !budget.wait) return;
  const current = budget.now();
  if (Math.floor(current / 60000) !== Math.floor(budget.lastAt / 60000)) return;
  await budget.wait(60000 - (current % 60000) + 1000);
}

export function isPlatformLimitError(error) {
  if (META_LIMIT_CODES.has(Number(error?.code))) return true;
  return /too many subrequests|too many calls|rate limit|request limit|limit reached/i.test(String(error?.message || error || ""));
}

// Toda falha gasta 1 das 3 tentativas. Falha por limite volta para a fila; passou de 3, fica como falha, sem apagar o post.
export function publishFailure(payload = {}, error, now = new Date()) {
  const retryCount = Math.max(0, Number(payload.retryCount || 0)) + 1;
  const limit = isPlatformLimitError(error);
  return {
    limit,
    status: limit && retryCount < MAX_PUBLISH_ATTEMPTS ? "scheduled" : "failed",
    payload: { ...payload, retryCount, lastPublishAttemptAt: now.toISOString() }
  };
}

// Antes de tentar de novo: a tentativa anterior pode ter saído no Instagram mesmo com erro aqui.
// Story não tem legenda, então não dá para conferir por este caminho.
export async function findPriorPublication(env, clientId, caption, payload = {}, find = findRecentMediaByCaption) {
  const lastAttempt = Date.parse(String(payload.lastPublishAttemptAt || ""));
  if (!Number.isFinite(lastAttempt) || !String(caption || "").trim()) return null;
  const found = await find(env, clientId, caption).catch(() => null);
  const foundAt = Date.parse(String(found?.timestamp || ""));
  return found?.mediaId && Number.isFinite(foundAt) && foundAt >= lastAttempt - RETRY_LOOKBACK_MS ? found : null;
}
