import test from "node:test";
import assert from "node:assert/strict";
import {buildVisualPrompt,generateOriginalMedia,overlayCopy} from "../src/media-generation.js";

test("Global Play prompt uses the audited photorealistic visual system and excludes protected assets",()=>{
  const p=buildVisualPrompt({id:"globalplay-streaming"},"família escolhendo o que assistir","a");
  assert.match(p,/audited visual system/i);
  assert.match(p,/premium, photorealistic/i);
  assert.match(p,/No copyrighted characters/i);
  assert.match(p,/Avoid legacy campaign styles/i);
});

test("Ragnar uses the audited contemporary visual system without legacy themed direction",()=>{
  const p=buildVisualPrompt({id:"ragnar-one"},"noite de streaming em casa","b");
  assert.match(p,/audited visual system/i);
  assert.match(p,/premium, photorealistic, contemporary home-entertainment/i);
  assert.match(p,/Avoid legacy themed art direction/i);
  assert.match(p,/copyrighted references/i);
});

test("generated image is stored in R2 and returns public URL",async()=>{
  let stored=null;
  const env={
    PUBLIC_BASE_URL:"https://example.workers.dev",
    MEDIA:{async put(key,bytes,meta){stored={key,bytes,meta};}}
  };
  const request=async()=>({output:[{type:"image_generation_call",result:btoa("PNGDATA")}]});
  const out=await generateOriginalMedia(env,{id:"globalplay-streaming"},"post-1","brief",{request,variationSeed:"x"});
  assert.match(out.url,/\/media\/posts\/globalplay-streaming\/post-1\/generated-/);
  assert.equal(new TextDecoder().decode(stored.bytes),"PNGDATA");
  assert.equal(stored.meta.httpMetadata.contentType,"image/jpeg");
  assert.equal(out.fingerprint.length,64);
});

test("deterministic overlay copy keeps brand and CTA out of the image model",()=>{
  assert.deepEqual(overlayCopy({id:"globalplay-streaming"},"Noite em família"),{
    brand:"GLOBAL PLAY",title:"Noite em família",cta:"DIGITE QUERO"
  });
  assert.equal(overlayCopy({id:"ragnar-one"},"Saga da noite").brand,"RAGNAR ONE");
});

test("Global Play compositing uses raster brand once, Reel panel only for Reel and correct dimensions",async()=>{
  for(const format of ["carousel","reel"]){
    const draws=[],transforms=[];let payload;
    const canvas={transform(value){transforms.push(value);return this;},draw(input,position){draws.push(position);return this;},async output(){return {response:async()=>new Response(new Uint8Array([255,216,255,217]),{headers:{"content-type":"image/jpeg"}})};}};
    const env={PUBLIC_BASE_URL:"https://nexus.example",MEDIA:{async put(){}},IMAGES:{input(){return canvas;}}};
    const result=await generateOriginalMedia(env,{id:"globalplay-streaming"},"test-"+format,"",{contentFormat:format,request:async(e,id,p)=>{payload=p;return {output:[{type:"image_generation_call",result:btoa("raw")}]};}});
    assert.equal(result.brandingApplied,true);
    assert.deepEqual(transforms,[{width:1080,height:format==="reel"?1920:1350,fit:"cover"}]);
    assert.equal(draws.length,format==="reel"?2:1);
    assert.deepEqual(draws[0],{right:48,top:40});
    if(format==="reel")assert.deepEqual(draws[1],{bottom:0,left:0});
    assert.equal(result.promptVersion,"globalplay-chat-reference-v1");
    assert.equal(payload.nexusBypassDailyBudget,false);
  }
});

test("missing or broken Images binding never claims successful branding",async()=>{
  for(const IMAGES of [undefined,{input(){throw new Error("transform_failed");}}]){
    const result=await generateOriginalMedia({PUBLIC_BASE_URL:"https://nexus.example",MEDIA:{async put(){}},IMAGES},{id:"globalplay-streaming"},"failed","",{contentFormat:"reel",request:async()=>({output:[{type:"image_generation_call",result:btoa("raw")}]})});
    assert.equal(result.brandingApplied,false);assert.ok(result.brandingError);
  }
});

test("generation uses approved direction without reading or sending private library images",async()=>{
  let payload;
  const env={PUBLIC_BASE_URL:"https://nexus.example",MEDIA:{async put(){},async list(){throw new Error("private_library_must_not_be_read");},async get(){return {size:4,httpMetadata:{contentType:"image/jpeg"},customMetadata:{clientId:"globalplay-streaming",purpose:"reference"},async arrayBuffer(){return new Uint8Array([255,216,255,217]).buffer;}};}}};
  const result=await generateOriginalMedia(env,{id:"globalplay-streaming"},"with-ref","",{contentFormat:"carousel",request:async(e,id,p)=>{payload=p;return {output:[{type:"image_generation_call",result:btoa("raw")}]};}});
  assert.equal(payload.input[0].content.length,1);
  assert.equal(result.referenceMode,"text-direction");assert.equal(result.referenceCount,0);
  assert.equal(payload.nexusBypassDailyBudget,false);
});

test("imagem já nasce em 4:5 (feed/carrossel) e 9:16 (Reel), sem corte das frases", async () => {
  const { imageSizeFor, buildVisualPrompt } = await import("../src/media-generation.js");
  const ratio = size => { const [w, h] = size.split("x").map(Number); assert.equal(w % 16, 0); assert.equal(h % 16, 0); return h / w; };
  assert.equal(ratio(imageSizeFor("image")), 1.25);
  assert.equal(ratio(imageSizeFor("carousel")), 1.25);
  assert.equal(Math.abs(ratio(imageSizeFor("reel")) - 16 / 9) < 0.001, true);
  const prompt = buildVisualPrompt({ id: "primeiro-teste", name: "Flow Arts" }, "", "x", { title: "Seu Instagram parado está custando clientes", contentFormat: "image" });
  assert.doesNotMatch(prompt, /cropped/);
  assert.match(prompt, /4:5 format/);
});

test("Reel usa o movimento novo (zoom visível e suave, sem cortar a frase)", async () => {
  const fs = await import("node:fs");
  const workflow = fs.readFileSync(new URL("../../.github/workflows/social-format-render.yml", import.meta.url), "utf8");
  assert.match(workflow, /scripts\/social\/render_reel\.sh/);
  assert.doesNotMatch(workflow, /on\*0\.0002/);
  const script = fs.readFileSync(new URL("../../scripts/social/render_reel.sh", import.meta.url), "utf8");
  assert.match(script, /z='1\+0\.10\*/);
  assert.match(script, /scale=2160:3840/);
});

test("imagem: celular na mão com a tela virada para a pessoa", async () => {
  const { buildVisualPrompt } = await import("../src/media-generation.js");
  assert.match(buildVisualPrompt({ id: "primeiro-teste", name: "Flow Arts" }, "", "x", {}), /screen faces the person holding it, never the viewer/);
});
