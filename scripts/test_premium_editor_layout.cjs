"use strict";
const assert=require("node:assert/strict");
const {test}=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const layout=read("public/video-overlay-ui.js");
const css=read("public/video-overlay-ui.css");
const portal=read("public/portal.html");

test("premium studio contains functional left library, center stage, right inspector and bottom timeline",()=>{
 for(const cls of ["nexus-premium-workspace","nexus-premium-library","nexus-premium-stage","nexus-premium-inspector","nexus-premium-timeline"]) {
   assert.ok(layout.includes(cls),cls+" missing from UI");
   assert.ok(css.includes("."+cls),cls+" missing from CSS");
 }
 assert.match(css,/grid-template-areas:"library stage inspector" "timeline timeline timeline"/);
 assert.match(layout,/toolbar\.after\(studio\)/);
 assert.match(layout,/stage\.append\(stageTitle,preview\)/);
 assert.match(layout,/inspector\.append\(settings\)/);
});

test("original selectors and behavior remain present instead of dead visual buttons",()=>{
 for(const id of ["video-editor-panel","video-generate-editable","video-editor-player","video-filmstrip","video-trim-start","video-trim-end","video-editable-file","video-play-toggle"]){
  assert.ok(portal.includes('id="'+id+'"'),"missing original functional control: "+id);
 }
 assert.match(layout,/generate\.textContent="↓ Exportar MP4"/);
 assert.match(layout,/action\.append\(generate\)/);
 assert.match(layout,/controls\.querySelector\("#video-generate-editable"\)/);
 assert.match(layout,/paletteEl\.querySelectorAll\("button"\)/);
 assert.match(layout,/search\.addEventListener\("input",filter\)/);
});

test("mobile layouts, output 9:16 and cache busting are declared",()=>{
 assert.match(css,/aspect-ratio:9\/16!important/);
 assert.match(css,/\.nexus-premium-editor\[hidden\]\{display:none!important\}/);
 assert.match(layout,/library\.append\(upload\)/);
 assert.match(layout,/function renderTimeline\(\)/);
 assert.match(css,/\.nexus-premium-track-segment/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:530px\)/);
 assert.match(portal,/video-overlay-ui.css\?v=4/);
 assert.match(portal,/video-overlay-ui.js\?v=4/);
});
