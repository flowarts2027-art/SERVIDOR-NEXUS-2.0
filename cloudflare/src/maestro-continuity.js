// Nexus Maestro/Nilo — deterministic campaign ledger. No image generation or auto-publishing.
// Persist the returned snapshot in the application's transactional store.
export const MAESTRO_STATES = Object.freeze({
  PENDING: "pending", RUNNING: "generating", REVIEW: "reviewing",
  APPROVED: "approved_asset", QUEUED: "queued_panel",
  HUMAN: "awaiting_human_approval", BLOCKED: "blocked",
  RETRY: "retryable_error", REJECTED: "rejected_qa",
  WAITING: "waiting_for_executor", LIMITED: "usage_limit_reached"
});
const TERMINAL = new Set([MAESTRO_STATES.APPROVED, MAESTRO_STATES.QUEUED, MAESTRO_STATES.HUMAN]);
export function createMaestroCampaign({ campaignId, clientId, days = 7, slotsPerDay = 3, slidesPerSlot = 2 }) {
  if (!campaignId || !clientId || ![days,slotsPerDay,slidesPerSlot].every(n => Number.isInteger(n) && n > 0 && n <= 100)) throw new Error("invalid_campaign");
  const tasks = [];
  for (let day=1;day<=days;day++) for(let slot=1;slot<=slotsPerDay;slot++) for(let slide=1;slide<=slidesPerSlot;slide++)
    tasks.push({id:`${campaignId}/${day}/${slot}/${slide}`,day,slot,slide,status:MAESTRO_STATES.PENDING,attempts:0,leaseUntil:null,sha256:null,reviewed:false});
  return {campaignId,clientId,tasks,version:1};
}
export function claimMaestroBatch(campaign, {now = Date.now(),size=6,leaseMs=180000,executorAvailable=false} = {}) {
  if (!executorAvailable) return {campaign,claimed:[],reason:"waiting_for_executor"};
  if (!Number.isFinite(now) || !Number.isInteger(size) || size<1 || size>50 || leaseMs<1000) throw new Error("invalid_claim");
  const cloned = structuredClone(campaign);
  const claimed=[];
  for (const t of cloned.tasks) {
    if (claimed.length >= size) break;
    const expired = t.status===MAESTRO_STATES.RUNNING && Number(t.leaseUntil)<=now;
    if (t.status!==MAESTRO_STATES.PENDING && t.status!==MAESTRO_STATES.RETRY && !expired) continue;
    t.status=MAESTRO_STATES.RUNNING; t.leaseUntil=now+leaseMs; t.attempts+=1; claimed.push(t.id);
  }
  cloned.version+=1;
  return {campaign:cloned,claimed,reason:claimed.length?"claimed":"nothing_pending"};
}
export function retryMaestroRejected(campaign, id, maxAttempts = 3) {
  const cloned = structuredClone(campaign);
  const task = cloned.tasks.find(t => t.id === id);
  if (!task || task.status !== MAESTRO_STATES.REJECTED) throw new Error("task_not_rejected");
  task.status = task.attempts >= maxAttempts ? MAESTRO_STATES.BLOCKED : MAESTRO_STATES.RETRY;
  task.sha256 = null;
  task.reviewed = false;
  cloned.version++;
  return cloned;
}
export function recoverExpiredMaestroTasks(campaign, now = Date.now(), maxAttempts = 3) {
  const cloned = structuredClone(campaign);
  for (const task of cloned.tasks) {
    if (task.status !== MAESTRO_STATES.RUNNING || !Number.isFinite(Number(task.leaseUntil)) || Number(task.leaseUntil)>now) continue;
    task.status = task.attempts >= maxAttempts ? MAESTRO_STATES.BLOCKED : MAESTRO_STATES.RETRY;
    task.leaseUntil = null;
  }
  cloned.version++;
  return cloned;
}
export function completeMaestroImage(campaign,{id,sha256,width,height,qaApproved=false,referenceVerified=false}) {
  const cloned=structuredClone(campaign),task=cloned.tasks.find(t=>t.id===id);
  if(!task || task.status!==MAESTRO_STATES.RUNNING) throw new Error("task_not_claimed");
  if(!sha256 || !referenceVerified || width!==1080 || height!==1350 || cloned.tasks.some(t=>t.id!==id && t.sha256===sha256)) {
    task.status=MAESTRO_STATES.REJECTED;task.leaseUntil=null;task.reviewed=false;cloned.version++;
    return {campaign:cloned,accepted:false};
  }
  task.sha256=sha256;task.leaseUntil=null;task.reviewed=Boolean(qaApproved);
  task.status=qaApproved?MAESTRO_STATES.APPROVED:MAESTRO_STATES.REVIEW;
  cloned.version++;
  return {campaign:cloned,accepted:qaApproved};
}
export function maestroProgress(campaign) {
  const counts={};
  for (const t of campaign.tasks) counts[t.status]=(counts[t.status]||0)+1;
  return {total:campaign.tasks.length,completed:campaign.tasks.filter(t=>TERMINAL.has(t.status)).length,counts};
}
