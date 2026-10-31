// Radar preview: opt-in, HTTPS-only discovery feed. No Instagram scraping or outreach.
// Set RADAR_FEED_URL (exact trusted HTTPS JSON endpoint) and optionally RADAR_FEED_TOKEN
// as Worker secrets. Until configured, scheduled runs do nothing.
import { qualifyRadarLead } from "./commercial-radar.js";
const categories=new Set(["site","instagram","leads","prospeccao"]);
const tidy=(v,n=500)=>String(v??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
function httpsUrl(v){
 try {const u=new URL(v);if(u.protocol!=="https:"||u.username||u.password||!u.hostname.includes(".")||/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(u.hostname))return "";return u.href.slice(0,500);}catch{return "";}
}
function igHandle(v){const x=tidy(v,50).replace(/^@/,"").toLowerCase();return /^[a-z0-9._]{1,30}$/.test(x)?x:"";}
function phone(v){let x=String(v??"").replace(/\D/g,"");if(x.length===10||x.length===11)x="55"+x;return /^55\d{10,11}$/.test(x)?x:"";}
export async function runRadarDiscovery(env){
 if(!env.DB)return {ok:false,error:"missing_database"};
 const feed=httpsUrl(env.RADAR_FEED_URL);
 if(!feed)return {ok:true,skipped:"authorized_feed_not_configured"};
 const url=new URL(feed);
 // Feed host is operator-selected, not supplied by an unauthenticated caller.
 if(!env.RADAR_FEED_HOST || url.hostname!==String(env.RADAR_FEED_HOST).toLowerCase())
  return {ok:false,error:"feed_host_not_allowlisted"};
 const headers={accept:"application/json"};
 if(env.RADAR_FEED_TOKEN)headers.authorization="Bearer "+env.RADAR_FEED_TOKEN;
 let response;
 try{response=await fetch(feed,{headers,redirect:"error",signal:AbortSignal.timeout(12000)});}
 catch{return {ok:false,error:"feed_unreachable"};}
 if(!response.ok)return {ok:false,error:"feed_http_"+response.status};
 if(!String(response.headers.get("content-type")||"").toLowerCase().includes("application/json"))
  return {ok:false,error:"feed_not_json"};
 const length=Number(response.headers.get("content-length")||0);
 if(length>250000)return {ok:false,error:"feed_too_large"};
 const body=await response.text();if(body.length>250000)return {ok:false,error:"feed_too_large"};
 let parsed;try{parsed=JSON.parse(body);}catch{return {ok:false,error:"invalid_json"};}
 const entries=Array.isArray(parsed)?parsed:parsed?.leads;
 if(!Array.isArray(entries))return {ok:false,error:"invalid_feed_shape"};
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_leads (id TEXT PRIMARY KEY,instagram TEXT NOT NULL,business TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,evidence TEXT NOT NULL,evidence_url TEXT NOT NULL,competitor TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',contact_source TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL DEFAULT 'manual_public',score INTEGER NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'novo',approved_at TEXT,contacted_at TEXT,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(instagram,category,evidence_url))").run();
 let inserted=0,duplicates=0,rejected=0;
 for(const row of entries.slice(0,100)){
  const instagram=igHandle(row?.instagram),category=tidy(row?.category,25),
   evidence=tidy(row?.evidence,900),evidenceUrl=httpsUrl(row?.evidence_url),
   website=row?.website?httpsUrl(row.website):"",whatsapp=phone(row?.whatsapp),
   contactSource=row?.contact_source?httpsUrl(row.contact_source):"",
   business=tidy(row?.business,120);
  if(!instagram||!categories.has(category)||!evidence||!evidenceUrl||
    (row?.website&&!website)||(row?.whatsapp&&!whatsapp)||(whatsapp&&!contactSource)||
    (row?.contact_source&&!contactSource)){rejected++;continue;}
  const q=qualifyRadarLead(category,evidence,business);
  const result=await env.DB.prepare("INSERT OR IGNORE INTO flow_radar_leads(id,instagram,business,category,evidence,evidence_url,competitor,website,whatsapp,contact_source,source_type,score,reason,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
   crypto.randomUUID(),instagram,business,category,evidence,evidenceUrl,igHandle(row?.competitor),website,whatsapp,contactSource,"authorized_import",q.score,q.reason,"Importado de feed autorizado; revisar antes de contatar."
  ).run();
  if(result.meta?.changes)inserted++;else duplicates++;
 }
 return {ok:true,scanned:Math.min(entries.length,100),inserted,duplicates,rejected};
}
