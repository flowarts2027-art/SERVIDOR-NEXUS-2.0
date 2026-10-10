import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime=fs.readFileSync(new URL("../src/agent-runtime.js",import.meta.url),"utf8");

test("Global Play RADAR uses audited fixed slots instead of adaptive three-slot timing",()=>{
  assert.match(runtime,/client\.id==="globalplay-streaming"[\s\S]*?globalPlayCampaignStrategy\(\)\.recommendedPostTimes/);
  assert.match(runtime,/Auditoria Global Play aplicada: 2 publicações por dia às 09:00 e 15:00/);
});

test("Global Play creator persists audit funnel metadata into each creative",()=>{
  assert.match(runtime,/auditCategory:String\(campaignItem\?\.auditCategory\|\|""\)/);
  assert.match(runtime,/conversionBridge:String\(campaignItem\?\.conversionBridge\|\|""\)/);
  assert.match(runtime,/Story structure:/);
});
