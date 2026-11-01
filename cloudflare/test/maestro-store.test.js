import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startMaestroCampaign, loadMaestroCampaign, saveMaestroCampaign, claimPersistedMaestroBatch } from '../src/maestro-store.js';
import { createMaestroCampaign, claimMaestroBatch } from '../src/maestro-continuity.js';

// Real SQLite with a D1-compatible interface: exercises SQL and atomic version checks.
function fixture() {
 const sql = new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE nexus_state (
 namespace TEXT NOT NULL, item_key TEXT NOT NULL,
 client_id TEXT NOT NULL DEFAULT '', value_json TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(namespace,item_key,client_id))`);
 const DB = { prepare(query) { return { bind(...params) { 
  const stmt = sql.prepare(query);
  return {
   first: async () => stmt.get(...params) ?? null,
   run: async () => ({meta:{changes:Number(stmt.run(...params).changes)}})
  };
 } }; } };
 return {DB,sql};
}
test('D1 Maestro: 42 tasks survive reload and do not reset on repeated create',async()=>{
 const env=fixture();
 let c=await startMaestroCampaign(env,{campaignId:'seven-days',clientId:'quatree-dog'});
 assert.equal(c.tasks.length,42);
 const b=claimMaestroBatch(c,{executorAvailable:true,size:6,now:1000});
 await saveMaestroCampaign(env,b.campaign,c.version);
 c=await loadMaestroCampaign(env,'quatree-dog','seven-days');
 assert.equal(c.tasks.filter(t=>t.status==='generating').length,6);
 const again=await startMaestroCampaign(env,{campaignId:'seven-days',clientId:'quatree-dog'});
 assert.equal(again.version,c.version);
 assert.equal(again.tasks.filter(t=>t.status==='generating').length,6);
});
test('D1 Maestro: optimistic locking rejects stale snapshots',async()=>{
 const env=fixture();
 const c=await startMaestroCampaign(env,{campaignId:'lock',clientId:'flow-arts',days:1,slotsPerDay:1,slidesPerSlot:1});
 const next=claimMaestroBatch(c,{executorAvailable:true,now:1000}).campaign;
 await saveMaestroCampaign(env,next,c.version);
 await assert.rejects(saveMaestroCampaign(env,next,c.version),/maestro_version_conflict/);
});
test('D1 Maestro: client namespace isolation and no executor means no claims',async()=>{
 const env=fixture();
 await startMaestroCampaign(env,{campaignId:'same',clientId:'client-a',days:1,slotsPerDay:1,slidesPerSlot:2});
 await startMaestroCampaign(env,{campaignId:'same',clientId:'client-b',days:1,slotsPerDay:1,slidesPerSlot:3});
 const response=await claimPersistedMaestroBatch(env,{clientId:'client-a',campaignId:'same',executorAvailable:false});
 assert.deepEqual(response.claimed,[]);
 assert.equal((await loadMaestroCampaign(env,'client-a','same')).tasks.length,2);
 assert.equal((await loadMaestroCampaign(env,'client-b','same')).tasks.length,3);
 await assert.rejects(loadMaestroCampaign(env,'../../etc','same'),/invalid_identifier/);
});
