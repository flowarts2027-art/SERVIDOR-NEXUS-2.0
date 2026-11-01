import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaestroCampaign,claimMaestroBatch,completeMaestroImage,maestroProgress} from '../src/maestro-continuity.js';
test('42 slides, resume after first six without duplication',()=>{
 let c=createMaestroCampaign({campaignId:'quatree-7d',clientId:'quatree-dog'});
 assert.equal(c.tasks.length,42);
 let b=claimMaestroBatch(c,{executorAvailable:true,now:1000,size:6}); c=b.campaign;
 assert.equal(b.claimed.length,6);
 for(let i=0;i<6;i++) c=completeMaestroImage(c,{id:b.claimed[i],sha256:'sha'+i,width:1080,height:1350,qaApproved:true,referenceVerified:true}).campaign;
 b=claimMaestroBatch(c,{executorAvailable:true,now:2000,size:6});
 assert.equal(b.claimed.length,6);
 assert.equal(b.claimed[0],'quatree-7d/2/1/1');
 assert.equal(maestroProgress(b.campaign).completed,6);
});
test('invalid size, missing reference and duplicate blocked',()=>{
 let c=createMaestroCampaign({campaignId:'c',clientId:'quatree-dog',days:1,slotsPerDay:1,slidesPerSlot:2});
 let b=claimMaestroBatch(c,{executorAvailable:true,now:1000,size:2});c=b.campaign;
 let a=completeMaestroImage(c,{id:b.claimed[0],sha256:'one',width:1080,height:1350,qaApproved:true,referenceVerified:false});
 assert.equal(a.accepted,false);
 let d=completeMaestroImage(c,{id:b.claimed[0],sha256:'one',width:1080,height:1350,qaApproved:true,referenceVerified:true});
 c=d.campaign;
 let e=completeMaestroImage(c,{id:b.claimed[1],sha256:'one',width:1080,height:1350,qaApproved:true,referenceVerified:true});
 assert.equal(e.accepted,false);
});
test('executor unavailable never claims',()=>{
 const c=createMaestroCampaign({campaignId:'c',clientId:'x',days:1,slotsPerDay:1,slidesPerSlot:1});
 assert.equal(claimMaestroBatch(c).claimed.length,0);
});
