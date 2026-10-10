import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

// Evaluate the production coordinator with isolated dependency substitutes.
// A real OpenAI/Meta request is never allowed in these tests.
let source=await fs.readFile(new URL("../src/emergency-publisher.js",import.meta.url),"utf8");
source=source.replace(/^import .*;$/gm,"");
source=`const globalPlayCarouselPlan=()=>Array.from({length:4},(_,i)=>({overlay:'CARD '+i,scene:'scene '+i}));
const GLOBAL_PLAY_REFERENCE_VERSION='test-reference';
const openAIKeyForClient=()=> 'test-key';
const globalPlayCampaignForDay=()=>[]; const ragnarCampaignForDay=()=>[];
const generateOriginalMedia=(...args)=>globalThis.__emergencyQA.generate(...args);
const reviewImage=(...args)=>globalThis.__emergencyQA.review(...args);
const publishInstagramImage=(...args)=>globalThis.__emergencyQA.publish(...args);
const publishInstagramCarousel=(...args)=>globalThis.__emergencyQA.publish(...args);
`+source;
const {runEmergencyPublisher}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const now=new Date('2026-10-09T16:00:00Z');
function fixture({brandingApplied=true,reviewStatus='approved'}={}){
  const objects=new Map();const calls={generated:0,reviewed:0,published:0};
  globalThis.__emergencyQA={async generate(){calls.generated++;return {url:'https://media.example/new.jpg',brandingApplied};},async review(){calls.reviewed++;return {status:reviewStatus};},async publish(){calls.published++;return {mediaId:'ig-test-1',permalink:'https://instagram.example/test'};}};
  const env={MEDIA:{async get(key){return objects.has(key)?{async text(){return objects.get(key);}}:null;},async put(key,value){objects.set(key,value);}}};
  return {env,calls,objects};
}
const options={format:'carousel',forceTest:true,testId:'controlled-test-001'};
test('controlled carousel publishes four separately generated reviewed cards once',async()=>{
  const {env,calls}=fixture();const result=await runEmergencyPublisher(env,now,'globalplay-streaming',options);
  assert.equal(result.published,1);assert.equal(result.posts[0].mediaId,'ig-test-1');
  assert.deepEqual(calls,{generated:4,reviewed:4,published:1});
  const retry=await runEmergencyPublisher(env,now,'globalplay-streaming',options);
  assert.equal(retry.reused,true);assert.equal(calls.published,1);assert.equal(calls.generated,4);
});
test('unsupported Reel and untargeted controlled attempts never generate or publish',async()=>{
  const {env,calls}=fixture();
  assert.deepEqual((await runEmergencyPublisher(env,now,'globalplay-streaming',{...options,format:'reel'})).errors,['unsupported_emergency_format']);
  assert.deepEqual((await runEmergencyPublisher(env,now,'',options)).errors,['controlled_test_id_required']);
  assert.deepEqual((await runEmergencyPublisher(env,now,'unknown-client',options)).errors,['unknown_client']);
  assert.deepEqual(calls,{generated:0,reviewed:0,published:0});
});
test('missing Global Play branding blocks before review and remains nonrepeatable',async()=>{
  const {env,calls}=fixture({brandingApplied:false});
  const result=await runEmergencyPublisher(env,now,'globalplay-streaming',options);
  assert.match(result.errors[0],/brand_overlay_required/);assert.equal(result.published,0);
  assert.deepEqual(calls,{generated:1,reviewed:0,published:0});
  assert.deepEqual((await runEmergencyPublisher(env,now,'globalplay-streaming',options)).errors,['controlled_test_already_attempted']);
  assert.equal(calls.generated,1);
});
test('unavailable or rejected visual review never reaches Meta',async()=>{
  for(const reviewStatus of ['unavailable','rejected']){
    const {env,calls}=fixture({reviewStatus});
    const result=await runEmergencyPublisher(env,now,'globalplay-streaming',options);
    assert.equal(result.published,0);assert.match(result.errors[0],new RegExp('emergency_visual_review_'+reviewStatus));
    assert.deepEqual(calls,{generated:1,reviewed:1,published:0});
  }
});
