import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startMaestroCampaign, claimPersistedMaestroBatch, loadMaestroCampaign, completePersistedMaestroImage, reviewPersistedMaestroImage, recoverPersistedMaestroCampaign } from '../src/maestro-store.js';
const sha = n => n.toString(16).padStart(64,'0');
const receipt = assetSha256 => ({reviewer:'clara',assetSha256,referenceSha256:'f'.repeat(64),reviewedAt:'2026-11-02T12:00:00Z'});
const fixture=()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE nexus_state (namespace TEXT NOT NULL,item_key TEXT NOT NULL,client_id TEXT NOT NULL,value_json TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(namespace,item_key,client_id))");
 return {DB:{prepare(sql){return {bind(...params){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...params)||null,run:async()=>({meta:{changes:Number(stmt.run(...params).changes)}})};}}}}};
};
test('Maestro preserves asset review and resumes from the next pending slide',async()=>{
 const env=fixture();
 await startMaestroCampaign(env,{campaignId:'quatree7',clientId:'quatree',days:1,slotsPerDay:2,slidesPerSlot:2});
 const batch=await claimPersistedMaestroBatch(env,{clientId:'quatree',campaignId:'quatree7',size:2,executorAvailable:true,now:1000});
 assert.equal(batch.claimed.length,2);
 for(let i=0;i<2;i++){
 const v=await completePersistedMaestroImage(env,{clientId:'quatree',campaignId:'quatree7',id:batch.claimed[i],sha256:sha(i+1),width:1080,height:1350,qaApproved:true,referenceVerified:true,qaEvidence:receipt(sha(i+1))});
 assert.equal(v.accepted,true);
 }
 const next=await claimPersistedMaestroBatch(env,{clientId:'quatree',campaignId:'quatree7',size:2,executorAvailable:true,now:2000});
 assert.equal(next.claimed[0],'quatree7/1/2/1'); // one-day campaign: next slot, not nonexistent day 2
 assert.equal(next.progress.completed,2);
});
test('Maestro duplicate or wrong size blocked and timed-out jobs recovered',async()=>{
 const env=fixture();
 await startMaestroCampaign(env,{campaignId:'recovery',clientId:'quatree',days:1,slotsPerDay:1,slidesPerSlot:2});
 const batch=await claimPersistedMaestroBatch(env,{clientId:'quatree',campaignId:'recovery',size:2,executorAvailable:true,now:1000});
 const bad=await completePersistedMaestroImage(env,{clientId:'quatree',campaignId:'recovery',id:batch.claimed[0],sha256:sha(9),width:1000,height:1350,qaApproved:true,referenceVerified:true,qaEvidence:receipt(sha(9))});
 assert.equal(bad.accepted,false);
 const recovered=await recoverPersistedMaestroCampaign(env,{clientId:'quatree',campaignId:'recovery',now:181001});
 assert.equal(recovered.campaign.tasks[1].status,'retryable_error');
 assert.equal((await loadMaestroCampaign(env,'quatree','recovery')).tasks[1].status,'retryable_error');
});

test('Persisted review can approve a story without another generation',async()=>{
 const env=fixture();
 await startMaestroCampaign(env,{clientId:'giltec',campaignId:'mixed',days:1,
   slotPlan:[{format:'post',slides:1},{format:'story',slides:1}]});
 const batch=await claimPersistedMaestroBatch(env,{clientId:'giltec',campaignId:'mixed',executorAvailable:true,now:1000});
 const done=await completePersistedMaestroImage(env,{clientId:'giltec',campaignId:'mixed',id:batch.claimed[1],
   sha256:sha(77),width:1080,height:1920,referenceVerified:true});
 assert.equal(done.accepted,false);
 const verified=await reviewPersistedMaestroImage(env,{clientId:'giltec',campaignId:'mixed',id:batch.claimed[1],
   qaApproved:true,qaEvidence:receipt(sha(77))});
 assert.equal(verified.accepted,true);
 assert.equal((await loadMaestroCampaign(env,'giltec','mixed')).tasks[1].status,'approved_asset');
});
