import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const scheduler = fs.readFileSync(new URL("../src/scheduler.js", import.meta.url), "utf8");
const health = fs.readFileSync(new URL("../src/autonomy-health-summary.js", import.meta.url), "utf8");
const agents = fs.readFileSync(new URL("../src/extended-agents.js", import.meta.url), "utf8");
const ci = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");

test("issue #100 ignores the legacy Global Play duplicate when canonical client exists", () => {
  assert.match(scheduler, /c\.id = 'global-play-streaming'/);
  assert.match(scheduler, /canonical\.id = 'globalplay-streaming'/);
  assert.match(health, /c\.id='global-play-streaming'/);
  assert.match(health, /canonical\.id='globalplay-streaming'/);
});

test("audited Global Play target is two posts while Ragnar remains three", () => {
  assert.match(scheduler, /dailyTarget = client\.id === "globalplay-streaming" \? 2 : 3/);
  assert.doesNotMatch(scheduler, /publishedCount < 3/);
});

test("Hook Story Viral chain applies storytelling to protected Instagram accounts", () => {
  assert.match(agents, /protectedStoryClient=\["globalplay-streaming","ragnar-one"\]/);
});

test("production CI waits for the two managed Instagram accounts", () => {
  assert.match(ci, /clientId=="globalplay-streaming"/);
  assert.match(ci, /clientId=="ragnar-one"/);
  assert.match(ci, /length == 2/);
});
