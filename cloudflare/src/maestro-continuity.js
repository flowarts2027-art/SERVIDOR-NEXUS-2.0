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
// Each image has its own format. The old 3x2 carousel contract remains supported.
const MEDIA_SIZES=Object.freeze({post:[1080,1350],carousel:[1080,1350],story:[1080,1920]});
function campaignSlotPlan(slotsPerDay,slidesPerSlot,slotPlan) {
  if (slotPlan==null) {
    return Array.from({length:slotsPerDay},()=>({format:slidesPerSlot===1?"post":"carousel",slides:slidesPerSlot}));
  }
  if(!Array.isArray(slotPlan)||!slotPlan.length||slotPlan.length>30)throw new Error("invalid_slot_plan");
  return slotPlan.map(entry=>{
    if(!entry||!Object.hasOwn(MEDIA_SIZES,entry.format)||!Number.isInteger(entry.slides)||entry.slides<1||entry.slides>5)
      throw new Error("invalid_slot_plan");
    if(entry.format==="carousel" ? entry.slides<2 : entry.slides!==1)throw new Error("invalid_slot_plan");
    return {format:entry.format,slides:entry.slides};
  });
}
export function createMaestroCampaign({campaignId,clientId,days=7,slotsPerDay=3,slidesPerSlot=2,slotPlan=null}) {
  if(!campaignId||!clientId||![days,slotsPerDay,slidesPerSlot].every(n=>Number.isInteger(n)&&n>0&&n<=100))
    throw new Error("invalid_campaign");
  const plan=campaignSlotPlan(slotsPerDay,slidesPerSlot,slotPlan);
  const tasks=[];
  for(let day=1;day<=days;day++)for(let slot=1;slot<=plan.length;slot++){
    const {format,slides}=plan[slot-1], [expectedWidth,expectedHeight]=MEDIA_SIZES[format];
    for(let slide=1;slide<=slides;slide++)
      tasks.push({id:[campaignId,day,slot,slide].join("/"),day,slot,slide,format,expectedWidth,expectedHeight,
        status:MAESTRO_STATES.PENDING,attempts:0,leaseUntil:null,sha256:null,perceptualHash:null,
        reviewed:false,qaEvidence:null,rejectionReason:null});
  }
  return {campaignId,clientId,tasks,slotPlan:plan,version:1};
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
  task.qaEvidence = null;
  task.perceptualHash = null;
  task.rejectionReason = null;
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
// 64-bit perceptual hash; only used when the executor supplies a real image-derived hash.
function perceptualDistance(a,b) {
  if(!/^[0-9a-f]{16}$/i.test(String(a||""))||!/^[0-9a-f]{16}$/i.test(String(b||"")))return Infinity;
  let v=BigInt("0x"+a)^BigInt("0x"+b),bits=0;
  while(v){bits++;v &= v-1n;}
  return bits;
}
export function completeMaestroImage(campaign,{id,sha256,width,height,perceptualHash=null,qaApproved=false,referenceVerified=false,qaEvidence=null}) {
  const cloned=structuredClone(campaign),task=cloned.tasks.find(t=>t.id===id);
  if(!task||task.status!==MAESTRO_STATES.RUNNING)throw new Error("task_not_claimed");
  const [expectedWidth,expectedHeight]=MEDIA_SIZES[task.format]||[1080,1350];
  let error=null;
  if(!/^[0-9a-f]{64}$/i.test(String(sha256||"")))error="invalid_asset_sha256";
  else if(!referenceVerified)error="reference_not_verified";
  else if(width!==expectedWidth||height!==expectedHeight)error="invalid_dimensions";
  else if(perceptualHash!=null&&!/^[0-9a-f]{16}$/i.test(String(perceptualHash)))error="invalid_perceptual_hash";
  else if(cloned.tasks.some(t=>t.id!==id&&t.sha256===sha256))error="duplicate_asset";
  else if(perceptualHash && cloned.tasks.some(t=>t.id!==id&&t.perceptualHash&&perceptualDistance(t.perceptualHash,perceptualHash)<=4))
    error="visually_similar_asset";
  if(error){
    task.status=MAESTRO_STATES.REJECTED;task.leaseUntil=null;task.reviewed=false;
    task.rejectionReason=error;task.qaEvidence=null;cloned.version++;
    return {campaign:cloned,accepted:false,reason:error};
  }
  task.sha256=sha256;task.perceptualHash=perceptualHash;
  task.leaseUntil=null;task.rejectionReason=null;
  // Booleans alone are NOT proof of independent review. Require a traceable Clara
  // receipt tied to this specific final asset and the checked official reference.
  const receipt=qaEvidence && qaEvidence.reviewer==="clara"&&qaEvidence.assetSha256===sha256
    &&/^[0-9a-f]{64}$/i.test(String(qaEvidence.referenceSha256||""))
    &&Number.isFinite(Date.parse(qaEvidence.reviewedAt));
  task.reviewed=Boolean(qaApproved&&receipt);
  task.qaEvidence=task.reviewed ? {reviewer:"clara",assetSha256:sha256,
    referenceSha256:qaEvidence.referenceSha256,reviewedAt:qaEvidence.reviewedAt} : null;
  task.status=task.reviewed?MAESTRO_STATES.APPROVED:MAESTRO_STATES.REVIEW;
  cloned.version++;
  return {campaign:cloned,accepted:task.reviewed,reason:task.reviewed?"approved":"awaiting_independent_review"};
}
export function maestroProgress(campaign) {
  const counts={};
  for (const t of campaign.tasks) counts[t.status]=(counts[t.status]||0)+1;
  return {total:campaign.tasks.length,completed:campaign.tasks.filter(t=>TERMINAL.has(t.status)).length,counts};
}
