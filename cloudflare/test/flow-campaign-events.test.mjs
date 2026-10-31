import test from "node:test";
import assert from "node:assert/strict";
import { handleCommercialRadar } from "../src/commercial-radar.js";

function dbFixture() {
  const queries=[];
  const DB={prepare(sql) {
    queries.push(sql);
    return {run:async()=>({meta:{changes:0}}),all:async()=>({results:[]}),first:async()=>({total:0}),bind(){return this;}};
  }};
  return {DB,queries};
}
function request(method) {
  return new Request("https://nexus.test/api/master/commercial-radar/campaign-events",{method,headers:method==="POST"?{"Content-Type":"application/json"}:{},...(method==="POST"?{body:JSON.stringify({campaign:"campaign-01",event_type:"ad_click",source:"meta_ads",event_id:"event.12345678"})}:{})});
}
test("dashboard does not invent campaign events", async()=>{
  const env=dbFixture();
  const response=await handleCommercialRadar(request("GET"),env,new URL("https://nexus.test/api/master/commercial-radar/campaign-events"));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.eventCount,0);
  assert.equal(data.tracking,"awaiting_integration");
  assert.equal(data.metrics.ad_click,0);
});
test("unverified campaign events cannot be inserted from logged-in portal",async()=>{
  const env=dbFixture();
  const response=await handleCommercialRadar(request("POST"),env,new URL("https://nexus.test/api/master/commercial-radar/campaign-events"));
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,"integration_not_enabled");
  assert.equal(env.queries.some(x=>x.includes("INSERT INTO flow_campaign_events")),false);
});
