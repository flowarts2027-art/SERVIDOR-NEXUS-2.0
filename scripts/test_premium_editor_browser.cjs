"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../public");
const types = {".html":"text/html", ".css":"text/css", ".js":"application/javascript", ".png":"image/png"};
const server = http.createServer((req,res)=>{
 const u = new URL(req.url,"http://127.0.0.1");
 const file = path.resolve(root, "." + decodeURIComponent(u.pathname));
 if(!(file===root || file.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,bytes)=>{
   if(err){res.writeHead(404);res.end();return;}
   res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream"});
   res.end(bytes);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   // The unauthenticated boot() request may hide #dashboard asynchronously,
   // especially on mobile where cold startup is slower. Finish boot before
   // switching this static UI smoke fixture into the video workspace.
   await page.route("**/api/portal/session",route=>route.fulfill({
     status:401, contentType:"application/json",body:'{"error":"not_authenticated"}'
   }));
   await page.goto("http://127.0.0.1:"+server.address().port+"/portal.html",{waitUntil:"networkidle"});
   await page.evaluate(()=>{
     for(const id of ["dashboard","tab-videos"]){const e=document.getElementById(id);if(e)e.hidden=false;}
     const login=document.getElementById("login");if(login)login.hidden=true;
     if(typeof showTab==="function") showTab("videos");
   });
   const disabled=page.locator("#video-mode-edit");
   assert.equal(await disabled.count(),1,"Only one editable placeholder");
   assert.equal(await disabled.isDisabled(),true,"Editable mode must be natively disabled");
   assert.match(await disabled.innerText(),/Vídeo editável\s+Em construção/);
   assert.equal(await page.locator("#video-mode-auto").isEnabled(),true,"Automatic mode stays active");
   assert.equal(await page.locator("#video-editor-panel").isVisible(),false,"Editor is hidden");
   await page.evaluate(()=>setVideoCreationMode("edit"));
   assert.equal(await page.locator("#video-editor-panel").isVisible(),false,"Programmatic mode selection must not reopen editor");
   assert.match(await page.locator("#video-mode-auto").getAttribute("class"),/active/);
   assert.equal(await page.locator("#trailer-query").isEnabled(),true,"Trailer search is unaffected");
   assert.equal(await page.locator("#trailer-search-btn").isEnabled(),true,"Automatic search button remains enabled");
   assert.equal(await page.locator('[data-tab="upload"]').isEnabled(),true,"Upload from PC remains enabled");
   assert.equal(await page.locator("#video-whatsapp-number").isEnabled(),true,"WhatsApp remains available");
   // Real browser behavior: the search box remains editable, catalog appears,
   // and a later search can be initiated without waiting for YouTube polling.
   await page.route("**/api/portal/videos/search", async route => {
     await new Promise(resolve => setTimeout(resolve, 320));
     await route.fulfill({ status: 202, contentType: "application/json",
       body: JSON.stringify({ ok:true, searchId:"smoke-1",
         catalog:[{id:"tvmaze:1",title:"Lanternas",year:"2026",mediaType:"SÉRIE",posterUrl:""}] }) });
   });
   await page.route("**/api/portal/videos/search/smoke-1", async route => {
     await route.fulfill({ status: 200, contentType: "application/json",
       body: JSON.stringify({status:"search_results",results:[{
         id:"abc123ABC12",title:"Lanternas trailer oficial dublado",
         channel:"Distribuidora verificada",url:"https://www.youtube.com/watch?v=abc123ABC12",
         duration:150,verticalCandidate:false
       }]}) });
   });
   await page.locator("#trailer-query").fill("Lanternas");
   await page.locator("#trailer-search-btn").click();
   assert.equal(await page.locator("#trailer-query").isEnabled(),true,
     "Search text box must remain editable during pending requests");
   const status = page.locator("#trailer-search-message");
   assert.match(await status.innerText(),/Buscando trailers, aguarde/);
   assert.equal(await status.getAttribute("aria-busy"), "true", "Loading state must be announced");
   assert.notEqual(await page.evaluate(()=>getComputedStyle(document.getElementById("trailer-search-message"),"::before").content), "none",
     "Searching status must have a CSS spinner");
   await page.waitForFunction(()=>document.querySelector("#trailer-search-btn")?.disabled === false);
   assert.equal(await status.getAttribute("aria-busy"),"true","Button re-enabled while search is still loading");
   assert.match(await page.locator("#catalog-list").innerText(),/Lanternas/);
   await page.waitForFunction(()=>document.querySelector("#youtube-results")?.textContent.includes("Lanternas trailer"));
   assert.match(await page.locator("#youtube-results").innerText(),/Lanternas trailer oficial dublado/);
   assert.equal(await status.getAttribute("aria-busy"),"false","Spinner must stop after results render");
   assert.equal(await status.evaluate(el=>el.classList.contains("is-loading")),false);
   assert.match(await status.innerText(),/Resultados encontrados abaixo/);
   const image=path.join(process.cwd(),"nexus-premium-"+viewport.width+".png");
   await page.screenshot({path:image,fullPage:true,animations:"disabled"});
   console.log("PASS disabled editable placeholder; automatic workspace preserved at "+viewport.width+"px");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
