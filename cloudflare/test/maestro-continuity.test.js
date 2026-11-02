import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaestroCampaign,claimMaestroBatch,completeMaestroImage,reviewMaestroImage,maestroProgress} from '../src/maestro-continuity.js';

const hash = n => n.toString(16).padStart(64,'0');
const receipt = assetSha256 => ({reviewer:'clara',assetSha256,referenceSha256:'f'.repeat(64),reviewedAt:'2026-11-02T10:00:00Z'});

test('Quatree: 42 separate slides resume after six and require Clara review',()=>{
 let c=createMaestroCampaign({campaignId:'quatree-7d',clientId:'quatree-dog'});
 assert.equal(c.tasks.length,42);
 let b=claimMaestroBatch(c,{executorAvailable:true,now:1000,size:6}); c=b.campaign;
 assert.equal(b.claimed.length,6);
 for(let i=0;i<6;i++){
   const sha256=hash(i+1);
   const result=completeMaestroImage(c,{id:b.claimed[i],sha256,width:1080,height:1350,
     qaApproved:true,referenceVerified:true,qaEvidence:receipt(sha256)});
   assert.equal(result.accepted,true);
   c=result.campaign;
 }
 b=claimMaestroBatch(c,{executorAvailable:true,now:2000,size:6});
 assert.equal(b.claimed.length,6);
 assert.equal(b.claimed[0],'quatree-7d/2/1/1');
 assert.equal(maestroProgress(b.campaign).completed,6);
});

test('invalid size, missing reference, exact duplicate and visually repeated rejected',()=>{
 let c=createMaestroCampaign({campaignId:'c',clientId:'quatree-dog',days:1,slotsPerDay:3,slidesPerSlot:1});
 c=claimMaestroBatch(c,{executorAvailable:true,now:1000,size:3}).campaign;
 let x=completeMaestroImage(c,{id:c.tasks[0].id,sha256:hash(1),width:1000,height:1350,
   qaApproved:true,referenceVerified:true,qaEvidence:receipt(hash(1))});
 assert.equal(x.accepted,false);
 assert.equal(x.reason,'invalid_dimensions');
 x=completeMaestroImage(c,{id:c.tasks[1].id,sha256:hash(1),width:1080,height:1350,referenceVerified:false});
 assert.equal(x.reason,'reference_not_verified');
 x=completeMaestroImage(c,{id:c.tasks[1].id,sha256:hash(1),width:1080,height:1350,
   perceptualHash:'0000000000000000',qaApproved:true,referenceVerified:true,qaEvidence:receipt(hash(1))});
 assert.equal(x.accepted,true); c=x.campaign;
 x=completeMaestroImage(c,{id:c.tasks[2].id,sha256:hash(1),width:1080,height:1350,referenceVerified:true});
 assert.equal(x.reason,'duplicate_asset');
});

test('GILTEC: three post and three story tasks per day validate distinct aspect ratios',()=>{
 const plan=[
 {format:'post',slides:1},{format:'post',slides:1},{format:'post',slides:1},
 {format:'story',slides:1},{format:'story',slides:1},{format:'story',slides:1}];
 let c=createMaestroCampaign({campaignId:'giltec-week',clientId:'giltec',days:7,slotPlan:plan});
 assert.equal(c.tasks.length,42);
 assert.equal(c.tasks[3].expectedHeight,1920);
 assert.equal(c.tasks[0].expectedHeight,1350);
 c=claimMaestroBatch(c,{executorAvailable:true,now:1000,size:6}).campaign;
 let x=completeMaestroImage(c,{id:c.tasks[3].id,sha256:hash(2),width:1080,height:1350,referenceVerified:true});
 assert.equal(x.accepted,false);
 assert.equal(x.reason,'invalid_dimensions');
 x=completeMaestroImage(c,{id:c.tasks[4].id,sha256:hash(3),width:1080,height:1920,referenceVerified:true});
 assert.equal(x.accepted,false);
 assert.equal(x.reason,'awaiting_independent_review');
 assert.equal(x.campaign.tasks[4].status,'reviewing');
 let y=reviewMaestroImage(x.campaign,{id:c.tasks[4].id,qaApproved:true,qaEvidence:receipt(hash(3))});
 assert.equal(y.accepted,true);
 assert.equal(y.campaign.tasks[4].status,'approved_asset');
 assert.throws(()=>createMaestroCampaign({campaignId:'bad',clientId:'g',slotPlan:[{format:'story',slides:2}]}),/invalid_slot_plan/);
});

test('receipt must identify Clara, the exact final asset, and an official reference',()=>{
 let c=createMaestroCampaign({campaignId:'review',clientId:'giltec',days:1,slotsPerDay:1,slidesPerSlot:1});
 c=claimMaestroBatch(c,{executorAvailable:true,now:1000}).campaign;
 let x=completeMaestroImage(c,{id:c.tasks[0].id,sha256:hash(1),width:1080,height:1350,
   referenceVerified:true,qaApproved:true});
 assert.equal(x.accepted,false);
 assert.equal(x.campaign.tasks[0].status,'reviewing');
 assert.throws(()=>reviewMaestroImage(x.campaign,{id:c.tasks[0].id,qaApproved:true,
   qaEvidence:{...receipt(hash(1)),reviewer:'maya'}}),/invalid_qa_receipt/);
 let y=reviewMaestroImage(x.campaign,{id:c.tasks[0].id,qaApproved:false,reason:'Logo divergente'});
 assert.equal(y.campaign.tasks[0].rejectionReason,'Logo divergente');
});

test('near duplicates rejected when perceptual hashes were supplied',()=>{
 let c=createMaestroCampaign({campaignId:'similar',clientId:'giltec',days:1,slotsPerDay:2,slidesPerSlot:1});
 c=claimMaestroBatch(c,{executorAvailable:true,now:1000}).campaign;
 let first=completeMaestroImage(c,{id:c.tasks[0].id,sha256:hash(1),width:1080,height:1350,
   perceptualHash:'aaaaaaaaaaaaaaaa',qaApproved:true,referenceVerified:true,qaEvidence:receipt(hash(1))});
 let second=completeMaestroImage(first.campaign,{id:c.tasks[1].id,sha256:hash(2),width:1080,height:1350,
   perceptualHash:'aaaaaaaaaaaaaaab',qaApproved:true,referenceVerified:true,qaEvidence:receipt(hash(2))});
 assert.equal(second.accepted,false);
 assert.equal(second.reason,'visually_similar_asset');
});

test('executor unavailable never claims',()=>{
 const c=createMaestroCampaign({campaignId:'c',clientId:'x',days:1,slotsPerDay:1,slidesPerSlot:1});
 assert.equal(claimMaestroBatch(c).claimed.length,0);
});
