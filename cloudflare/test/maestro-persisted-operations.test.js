import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startMaestroCampaign, claimPersistedMaestroBatch, loadMaestroCampaign, completePersistedMaestroImage, recoverPersistedMaestroCampaign } from '../src/maestro-store.js';
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
 const v=await completePersistedMaestroImage(env,{clientId:'quatree',campaignId:'quatree7',id:batch.claimed[i],sha256:'asset-'+i,width:1080,height:1350,qaApproved:true,referenceVerified:true});
 assert.equal(v.accepted,true);
 }
 const next=await claimPersistedMaestroBatch(env,{clientId:'quatree',campaignId:'quatree7',size:2,executorAvailable:true,now:2000});
 assert.equal(next.claimed[0],'quatree7/2/1/1');
 assert.equal(next.progress.completed,2);
});
test('Maestro duplicate or wrong size blocked and timed-out jobs recovered',async()=>{
 const env=fixture();
 await startMaestroCampaign(env,{campaignId:'recovery',clientId:'quatree',days:1,slotsPerDay:1,slidesPerSlot:2});
 const batch=await claimPersistedMaestroBatch(env,{clientId:'quatree',campaignId:'recovery',size:2,executorAvailable:true,now:1000});
 const bad=await completePersistedMaestroImage(env,{clientId:'quatree',campaignId:'recovery',id:batch.claimed[0],sha256:'wrong',width:1000,height:1350,qaApproved:true,referenceVerified:true});
 assert.equal(bad.accepted,false);
 const recovered=await recoverPersistedMaestroCampaign(env,{clientId:'quatree',campaignId:'recovery',now:181001});
 assert.equal(recovered.campaign.tasks[1].status,'retryable_error');
 assert.equal((await loadMaestroCampaign(env,'quatree','recovery')).tasks[1].status,'retryable_error');
});
