import test from "node:test";
import assert from "node:assert/strict";
import { runRadarDiscovery } from "../src/radar-discovery-feed.js";

test("no DB binding fails closed", async()=>{
 assert.deepEqual(await runRadarDiscovery({}),{ok:false,error:"missing_database"});
});
test("without feed URL no external lookup is attempted",async()=>{
 assert.deepEqual(await runRadarDiscovery({DB:{}}),{ok:true,skipped:"authorized_feed_not_configured"});
});
test("feed host must be explicitly allowlisted",async()=>{
 assert.deepEqual(await runRadarDiscovery({DB:{},RADAR_FEED_URL:"https://example.org/feed.json"}),{ok:false,error:"feed_host_not_allowlisted"});
});
test("plaintext URL is not accepted",async()=>{
 assert.deepEqual(await runRadarDiscovery({DB:{},RADAR_FEED_URL:"http://example.org/feed.json",RADAR_FEED_HOST:"example.org"}),{ok:true,skipped:"authorized_feed_not_configured"});
});
