import test from "node:test";
import assert from "node:assert/strict";
import { publishInstagramImage, publishInstagramVideo, publishInstagramCarousel } from "../src/publisher.js";

// Provider contract integration: real Instagram transport code with a controlled
// Graph API responder. No external account or live publish is contacted.
function fixture() {
  const calls=[];
  let imageChildren=0;
  const env={
    INSTAGRAM_ACCESS_TOKEN_GLOBALPLAY:"fixture-token",
    INSTAGRAM_ACCOUNT_ID_GLOBALPLAY:"123456",
    DB:{prepare(){return {bind(){return {first:async()=>null};}};}}
  };
  async function fetchGraph(input,options={}) {
    const url=new URL(String(input));
    assert.equal(url.origin,"https://graph.instagram.com");
    assert.equal(options.headers?.authorization,"Bearer fixture-token");
    const body=options.body?new URLSearchParams(options.body):new URLSearchParams();
    const path=url.pathname;
    calls.push({path,method:options.method||"GET",body:Object.fromEntries(body.entries())});
    if(path==="/123456/media"&&options.method==="POST"){
      if(body.get("is_carousel_item")==="true")return Response.json({id:"child_"+(++imageChildren)});
      if(body.get("media_type")==="CAROUSEL")return Response.json({id:"container_carousel"});
      if(body.get("media_type")==="REELS")return Response.json({id:"container_reel"});
      if(body.get("image_url"))return Response.json({id:"container_image"});
      return Response.json({error:{message:"invalid_media"}},{status:400});
    }
    if(path==="/123456/media_publish"&&options.method==="POST"){
      const id=String(body.get("creation_id")||"");
      return Response.json({id:"published_"+id});
    }
    if(path.startsWith("/container_"))return Response.json({status_code:"FINISHED"});
    if(path.startsWith("/published_"))return Response.json({permalink:"https://www.instagram.com/p/mockpost/"});
    throw new Error("unexpected_graph_api_route:"+path);
  }
  return {env,calls,fetchGraph};
}

test("image: create container → finish → publish → permalink",async()=>{
  const fixtureState=fixture(),previous=globalThis.fetch;
  globalThis.fetch=fixtureState.fetchGraph;
  try {
    const output=await publishInstagramImage(fixtureState.env,"globalplay-streaming","https://media.example.test/original.jpg","Teste controlado");
    assert.equal(output.mediaId,"published_container_image");
    assert.equal(output.containerId,"container_image");
    assert.equal(output.permalink,"https://www.instagram.com/p/mockpost/");
    assert.deepEqual(fixtureState.calls.map(x=>x.method),["POST","GET","POST","GET"]);
    assert.equal(fixtureState.calls[0].body.image_url,"https://media.example.test/original.jpg");
  }finally{globalThis.fetch=previous;}
});

test("Reel: correct Graph media_type and final video source",async()=>{
  const f=fixture(),original=globalThis.fetch;
  globalThis.fetch=f.fetchGraph;
  try {
    const result=await publishInstagramVideo(f.env,"globalplay-streaming","https://media.example.test/approved-reel.mp4","Legenda");
    assert.equal(result.mediaId,"published_container_reel");
    assert.equal(f.calls[0].body.media_type,"REELS");
    assert.equal(f.calls[0].body.video_url,"https://media.example.test/approved-reel.mp4");
    assert.equal(f.calls.filter(x=>x.path==="/123456/media_publish").length,1);
  }finally{globalThis.fetch=original;}
});

test("carousel: both children → assembly → processing → single publish",async()=>{
  const f=fixture(),original=globalThis.fetch;
  globalThis.fetch=f.fetchGraph;
  try {
    const result=await publishInstagramCarousel(f.env,"globalplay-streaming",[
      "https://media.example.test/frame1.jpg","https://media.example.test/frame2.jpg"
    ],"Legenda");
    assert.equal(result.mediaId,"published_container_carousel");
    assert.deepEqual(result.childIds,["child_1","child_2"]);
    assert.equal(f.calls.filter(x=>x.path==="/123456/media"&&x.body.is_carousel_item==="true").length,2);
    assert.equal(f.calls.find(x=>x.body.media_type==="CAROUSEL").body.children,"child_1,child_2");
    assert.equal(f.calls.filter(x=>x.path==="/123456/media_publish").length,1);
  }finally{globalThis.fetch=original;}
});

test("no Meta connection never sends any provider request",async()=>{
  const f=fixture();
  delete f.env.INSTAGRAM_ACCESS_TOKEN_GLOBALPLAY;
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error("unexpected_external_request");};
  try {await assert.rejects(
    publishInstagramImage(f.env,"globalplay-streaming","https://media.example.test/image.jpg","Legenda"),
    /instagram_not_connected/
  );}finally{globalThis.fetch=original;}
});
