import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const html = await readFile(new URL("../../public/portal.html",import.meta.url),"utf8");
const js = await readFile(new URL("../../public/client-lite.js",import.meta.url),"utf8");
const css = await readFile(new URL("../../public/client-lite.css",import.meta.url),"utf8");
const radar = await readFile(new URL("../../public/flow-radar.js",import.meta.url),"utf8");

test("global mobile nav has five visible slots, with Flow-only options under Mais",()=>{
  for(const tab of ["inicio","posts","campanha","buscar"]) assert.match(css,new RegExp('\\[data-tab="'+tab+'"\\]'));
  assert.match(css,/grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css,/\.tabbar\s*>\s*#more-btn\s*\{\s*display:\s*flex/);
  assert.match(html,/class="flow-only" hidden/);
  assert.match(css,/\.flow-only\[hidden\]/);
  assert.match(js,/state\.flowCrm\s*\?\s*\["crm",\s*"radar"\]/);
});

test("radar only shows measured campaign events, not mocked leads",()=>{
  for (const id of ["flow-radar-leads","flow-radar-campaign-status","radar-metric-click","radar-metric-whats"]) assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(radar,/api\("\/campaign-events"\)/);
  assert.match(radar,/data\.eventCount\s*\?/);
  assert.match(radar,/row\.status\s*===\s*"aprovado"/);
  assert.doesNotMatch(html,/id="flow-radar-profile-form"/);
  assert.doesNotMatch(html,/id="flow-radar-own-run"/);
});
