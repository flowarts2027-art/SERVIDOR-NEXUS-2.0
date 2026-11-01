// Persistent Maestro ledger using the existing D1 nexus_state table.
// A campaign is namespaced by client, and persisted snapshots provide resume checkpoints.
// Callers must authenticate and authorize the client before invoking these functions.
import {createMaestroCampaign, claimMaestroBatch, maestroProgress} from "./maestro-continuity.js";
const NS="maestro-campaign";
function valid(value){return typeof value==="string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);}
export async function loadMaestroCampaign(env,clientId,campaignId){
 if(!valid(clientId)||!valid(campaignId))throw new Error("invalid_identifier");
 const row=await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace=? AND item_key=? AND client_id=?")
 .bind(NS,campaignId,clientId).first();
 return row?.value_json?JSON.parse(row.value_json):null;
}
export async function startMaestroCampaign(env,{clientId,campaignId,days=7,slotsPerDay=3,slidesPerSlot=2}){
 if(!valid(clientId)||!valid(campaignId))throw new Error("invalid_identifier");
 const snapshot=createMaestroCampaign({campaignId,clientId,days,slotsPerDay,slidesPerSlot});
 await env.DB.prepare("INSERT OR IGNORE INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)")
 .bind(NS,campaignId,clientId,JSON.stringify(snapshot)).run();
 return loadMaestroCampaign(env,clientId,campaignId);
}
export async function saveMaestroCampaign(env,snapshot,expectedVersion){
 if(!valid(snapshot?.clientId)||!valid(snapshot?.campaignId)||!Number.isInteger(expectedVersion))throw new Error("invalid_snapshot");
 const result=await env.DB.prepare("UPDATE nexus_state SET value_json=?,updated_at=CURRENT_TIMESTAMP WHERE namespace=? AND item_key=? AND client_id=? AND json_extract(value_json,'$.version')=?")
 .bind(JSON.stringify(snapshot),NS,snapshot.campaignId,snapshot.clientId,expectedVersion).run();
 if(Number(result?.meta?.changes)!==1)throw new Error("maestro_version_conflict");
 return snapshot;
}
export async function claimPersistedMaestroBatch(env,{clientId,campaignId,size=6,executorAvailable=false,now=Date.now()}){
 const campaign=await loadMaestroCampaign(env,clientId,campaignId);
 if(!campaign)throw new Error("campaign_not_found");
 const batch=claimMaestroBatch(campaign,{size,executorAvailable,now});
 if(batch.claimed.length)await saveMaestroCampaign(env,batch.campaign,campaign.version);
 return {...batch,progress:maestroProgress(batch.campaign)};
}

export async function completePersistedMaestroImage(env,{clientId,campaignId,id,sha256,width,height,qaApproved=false,referenceVerified=false}) {
 const campaign=await loadMaestroCampaign(env,clientId,campaignId);
 if(!campaign)throw new Error("campaign_not_found");
 const {completeMaestroImage}=await import("./maestro-continuity.js");
 const result=completeMaestroImage(campaign,{id,sha256,width,height,qaApproved,referenceVerified});
 await saveMaestroCampaign(env,result.campaign,campaign.version);
 return {...result,progress:maestroProgress(result.campaign)};
}
export async function recoverPersistedMaestroCampaign(env,{clientId,campaignId,now=Date.now()}) {
 const campaign=await loadMaestroCampaign(env,clientId,campaignId);
 if(!campaign)throw new Error("campaign_not_found");
 const {recoverExpiredMaestroTasks}=await import("./maestro-continuity.js");
 const next=recoverExpiredMaestroTasks(campaign,now);
 if(JSON.stringify(next.tasks)!==JSON.stringify(campaign.tasks)) await saveMaestroCampaign(env,next,campaign.version);
 return {campaign:next,progress:maestroProgress(next)};
}
