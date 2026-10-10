import test from "node:test";
import assert from "node:assert/strict";
import {emergencyPublisherDiagnostic} from "../src/emergency-publisher-diagnostic.js";
const makeRequest=(query="clientId=globalplay-streaming&testId=abcdefgh",token="trigger")=>new Request("https://nexus.test/api/emergency-publisher-diagnostic?"+query,{headers:{"x-nexus-emergency-token":token}});

test("diagnostic authorization fails before storage or credentials",async()=>{
  const response=await emergencyPublisherDiagnostic(makeRequest(undefined,"wrong"),{EMERGENCY_TRIGGER_TOKEN:"trigger",MEDIA:{get(){throw Error("must not read")}}});
  assert.equal(response.status,401);
});
test("diagnostic rejects unsupported clients and traversal",async()=>{
  for(const query of ["clientId=another&testId=abcdefgh","clientId=globalplay-streaming&testId=../secret"]){
    assert.equal((await emergencyPublisherDiagnostic(makeRequest(query),{EMERGENCY_TRIGGER_TOKEN:"trigger"})).status,400);
  }
});
test("diagnostic reads only selected client and emits allowlisted metadata",async()=>{
  let key;
  const env={EMERGENCY_TRIGGER_TOKEN:"trigger",MEDIA:{get:async value=>{key=value;return {text:async()=>JSON.stringify({status:"started",startedAt:"2026-10-09T15:57:56Z",secret:"private",summary:{accessToken:"private"}})}}}};
  const response=await emergencyPublisherDiagnostic(makeRequest(),env,{
    resolveCredentials:async(_env,id)=>{assert.equal(id,"globalplay-streaming");return {accessToken:"private",igUserId:"123"}},
    fetch:async(url,options)=>{assert.equal(options.method,"GET");assert.match(url,/123\/media\?/);return Response.json({data:[{id:"456",media_type:"CAROUSEL_ALBUM",timestamp:"2026-10-09T16:00:00Z",permalink:"https://www.instagram.com/p/example/",accessToken:"private",caption:"private"}]})}
  });
  const body=await response.json();
  assert.equal(key,"controlled-tests/globalplay-streaming/abcdefgh.json");
  assert.equal(body.recentMedia[0].id,"456");
  assert.doesNotMatch(JSON.stringify(body),/private|accessToken|caption/);
  assert.equal(response.headers.get("cache-control"),"no-store");
});
test("diagnostic provider rejection and secret-bearing exceptions fail closed",async()=>{
  const env={EMERGENCY_TRIGGER_TOKEN:"trigger",MEDIA:{get:async()=>null}};
  for(const fetch of [async()=>new Response("private",{status:401}),async()=>{throw Error("private token") }]){
    const response=await emergencyPublisherDiagnostic(makeRequest(),env,{resolveCredentials:async()=>({accessToken:"private",igUserId:"123"}),fetch});
    assert.equal(response.status,502);
    assert.doesNotMatch(await response.text(),/private/);
  }
});

test("diagnostic rejects incomplete media and exposes history pagination",async()=>{
  const env={EMERGENCY_TRIGGER_TOKEN:"trigger",MEDIA:{get:async()=>null}};
  const resolveCredentials=async()=>({accessToken:"private",igUserId:"123"});
  for(const item of [{id:"456",timestamp:"2026-10-09T16:00:00Z"},{id:"",media_type:"IMAGE",timestamp:"2026-10-09T16:00:00Z"}]){
    const response=await emergencyPublisherDiagnostic(makeRequest(),env,{resolveCredentials,fetch:async()=>Response.json({data:[item]})});
    assert.equal(response.status,502);
  }
  const response=await emergencyPublisherDiagnostic(makeRequest(),env,{resolveCredentials,fetch:async()=>Response.json({data:[{id:"456",media_type:"IMAGE",timestamp:"2026-10-09T16:00:00+0000"}],paging:{next:"private-next-url"}})});
  const body=await response.json();assert.equal(body.hasMore,true);assert.equal(body.recentMedia[0].timestamp,"2026-10-09T16:00:00Z");assert.doesNotMatch(JSON.stringify(body),/private-next/);
});
