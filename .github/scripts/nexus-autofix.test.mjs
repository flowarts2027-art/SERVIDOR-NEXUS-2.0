import test from "node:test";
import assert from "node:assert/strict";
import {recoverableRun,healthIncidents,eligibleCodePatch,scrubLog,incidentKey} from "./nexus-autofix-policy.mjs";

const now=Date.parse("2026-10-08T03:00:00Z");
const sample={
  id:20,name:"NEXUS CI",head_sha:"abc",head_branch:"main",
  status:"completed",conclusion:"failure",run_attempt:1,
  event:"push",updated_at:"2026-10-08T02:20:00Z"
};
test("only an old failure on the current main is auto retried once",()=>{
  assert.equal(recoverableRun(sample,"abc",now),true);
  for (const change of [
    {head_sha:"obsolete"},{head_branch:"pull/9"},{run_attempt:2},
    {name:"Video Template Render"},{status:"in_progress"},{conclusion:"success"},
    {event:"workflow_dispatch"},{updated_at:"2026-10-08T02:59:00Z"}
  ]) assert.equal(recoverableRun({...sample,...change},"abc",now),false,JSON.stringify(change));
});
test("health watches the active Flow Arts cycle and fails closed on missing production signals",()=>{
  const ok={
    ok:true,automationActive:true,scheduler:{healthy:true},
    clients:[{clientId:"primeiro-teste",cycleHealth:{status:"success",cycleOverdue:false}}]
  };
  const instagram={
    clients:["globalplay-streaming","ragnar-one"].map(clientId=>({clientId,connected:true,tokenValid:true,accountMatches:true}))
  };
  assert.deepEqual(healthIncidents(ok,instagram),[]);
  assert.deepEqual(healthIncidents(ok,{clients:instagram.clients.slice(0,1)}).map(x=>x.type),["instagram_credentials"]);
  assert.ok(healthIncidents({...ok,scheduler:{healthy:false}},instagram).some(x=>x.type==="worker_or_cron_unhealthy"));
  assert.deepEqual(healthIncidents({...ok,clients:[]},instagram).map(x=>[x.type,x.clientId]),[["agent_cycle","primeiro-teste"]]);
  for (const cycleHealth of [{status:"failed",cycleOverdue:false},{status:"success",cycleOverdue:true}]) {
    assert.ok(healthIncidents({...ok,clients:[{clientId:"primeiro-teste",cycleHealth}]},instagram).some(x=>x.type==="agent_cycle"));
  }
});
test("archived clients no longer raise cycle alerts",()=>{
  const data={ok:true,automationActive:true,scheduler:{healthy:true},
    clients:[{clientId:"primeiro-teste",cycleHealth:{status:"success",cycleOverdue:false}}]};
  const instagram={clients:["globalplay-streaming","ragnar-one"].map(clientId=>({clientId,connected:true,tokenValid:true,accountMatches:true}))};
  assert.equal(healthIncidents(data,instagram).filter(x=>x.type==="agent_cycle").length,0);
});
test("patch safety rejects privileged areas, changes to provider access and ambiguity",()=>{
  const path="cloudflare/test/sample.test.mjs";
  assert.equal(eligibleCodePatch(path,"const a=1","const a=2","const a=1").ok,true);
  for(const bad of ["cloudflare/src/publisher.js",".github/workflows/ci.yml","cloudflare/src/instagram.js","../src/agent-core.js","cloudflare/src/auth.js"]){
    assert.equal(eligibleCodePatch(bad,"const a=1","const a=2","const a=1").ok,false,bad);
  }
  assert.equal(eligibleCodePatch(path,"a","fetch('https://bad.invalid')","a").ok,false);
  assert.equal(eligibleCodePatch(path,"a","b","aaa").ok,false);
  assert.equal(eligibleCodePatch(path,"a","a","a").ok,false);
});
test("incident names stable, tokens stripped from diagnostics",()=>{
  assert.equal(incidentKey("workflow","37715332688"),"[NEXUS AutoFix] workflow 37715332688");
  const t=scrubLog("Bearer mySecretPassword\naccess_token=abcdefgh\nGH_TOKEN=foobar\npassword:abcd");
  assert.doesNotMatch(t,/mySecretPassword|abcdefgh|abcd/);
  assert.match(t,/\[REDACTED\]/);
});
