import { alignScheduledPosts } from "./client-slots.js";
import { processDueJobs } from "./executor.js";
import { createPublishBudget } from "./publish-budget.js";
import { enqueueDuePublishers } from "./scheduler.js";

// Rodada de publicação (minutos terminados em 2 e 7): acerta os horários, põe na fila quem
// venceu e publica com a trava. Sem isso, um post das 09:10 só entrava na fila às 09:15.
export async function runPublisherRound(env, at = new Date()) {
  const aligned = await alignScheduledPosts(env, at).catch(error => ({ error: String(error?.message || error).slice(0, 140) }));
  const queued = await enqueueDuePublishers(env, at);
  const publishBudget = createPublishBudget({ wait: ms => new Promise(resolve => setTimeout(resolve, ms)) });
  const jobs = await processDueJobs(env, at, { maxJobs: 6, onlyKind: "publisher-sweep", publishBudget });
  return { aligned, queued, jobs };
}
