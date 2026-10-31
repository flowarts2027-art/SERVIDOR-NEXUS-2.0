// Preview isolado do Radar: não importa o Worker principal nem executa campanhas.
// Exige PREVIEW_PASSWORD e banco D1 exclusivo (NUNCA use o D1 de produção).
import { handleCommercialRadar } from "./commercial-radar.js";
import { runRadarDiscovery } from "./radar-discovery-feed.js";

const unauthorized=()=>new Response("Acesso restrito ao teste Flow Arts.",{status:401,headers:{"WWW-Authenticate":'Basic realm="Radar Preview"',"Cache-Control":"no-store"}});
export default {
 async scheduled(event,env,ctx){
  if(!env.RADAR_FEED_URL)return;
  ctx.waitUntil(runRadarDiscovery(env).then(result=>console.log("radar_discovery",JSON.stringify(result))).catch(error=>console.error("radar_discovery_failed",String(error))));
 },
 async fetch(request,env){
  if(!env.PREVIEW_PASSWORD || !env.DB || !env.ASSETS)return new Response("Preview não configurado.",{status:503});
  const auth=request.headers.get("authorization")||"";
  const expected="Basic "+btoa("flowarts:"+env.PREVIEW_PASSWORD);
  if(auth!==expected)return unauthorized();
  const u=new URL(request.url);
  if(u.pathname.startsWith("/api/master/commercial-radar/"))
    return handleCommercialRadar(request,env,u);
  if(u.pathname==="/" || u.pathname==="/commercial-radar")
    u.pathname="/commercial-radar.html";
  if(!["/commercial-radar.html","/commercial-radar.js"].includes(u.pathname))
    return new Response("Not found",{status:404});
  const assetRequest=new Request(u.toString(),request);
  const response=await env.ASSETS.fetch(assetRequest);
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","no-store");
  headers.set("X-Robots-Tag","noindex, nofollow");
  headers.set("X-Content-Type-Options","nosniff");
  return new Response(response.body,{status:response.status,headers});
 }
};
