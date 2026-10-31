// Radar Comercial Flow Arts: somente fontes autorizadas, sem scraping ou mensagens automáticas.
const clean=(x,n=500)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const categories=["site","instagram","leads","prospeccao"];
const stages=["novo","revisao","aprovado","contatado","negociacao","ganho","descartado","nao_contatar"];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const urlOk=x=>{try{const u=new URL(x);return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname.includes(".")&&!/^(localhost|127\.|10\.|192\.168\.)/i.test(u.hostname)?u.toString().slice(0,500):"";}catch{return "";}};
const handle=x=>{const s=clean(x,50).replace(/^@/,"").toLowerCase();return /^[a-z0-9._]{1,30}$/.test(s)?s:"";};
const number=x=>{let n=String(x??"").replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;return /^55\d{10,11}$/.test(n)?n:"";};
export function qualifyRadarLead(category,evidence,business=""){
 const t=(evidence+" "+business).toLowerCase();
 const relevant=({site:/site|página|landing|loja virtual|wordpress|lento|hospedagem/,instagram:/instagram|direct|automa|robô|bot|manychat/,leads:/lead|clientes|vendas|captar|prospec|contatos/,prospeccao:/empresa|representante|fornecedor|comprador|alug|loca|b2b/}[category]||/$^/).test(t);
 const intent=/quero|preciso|procuro|preço|valor|contratar|não funciona|insatisfeit|alternativa/.test(t);
 return {score:Math.min(95,20+(relevant?35:0)+(intent?30:0)+(business?10:0)),reason:relevant&&intent?"Tema e intenção explícita":relevant?"Tema compatível":"Revisão humana necessária"};
}
async function ensure(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_leads (id TEXT PRIMARY KEY,instagram TEXT NOT NULL,business TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,evidence TEXT NOT NULL,evidence_url TEXT NOT NULL,competitor TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',contact_source TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL DEFAULT 'manual_public',score INTEGER NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'novo',approved_at TEXT,contacted_at TEXT,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(instagram,category,evidence_url))").run();
}
export async function handleCommercialRadar(request,env,u){
 const prefix="/api/master/commercial-radar";if(!u.pathname.startsWith(prefix))return null;
 if(request.method!=="GET"&&request.headers.get("origin")&&request.headers.get("origin")!==u.origin)return json({error:"invalid_origin"},403);
 await ensure(env);
 const path=u.pathname.slice(prefix.length);
 if(path==="/leads"&&request.method==="GET"){
  const rows=await env.DB.prepare("SELECT * FROM flow_radar_leads ORDER BY score DESC,created_at DESC LIMIT 300").all();
  return json({ok:true,categories,stages,leads:(rows.results||[]).map(x=>({...x,whatsapp_link:x.whatsapp&&["aprovado","contatado","negociacao"].includes(x.status)?"https://wa.me/"+x.whatsapp:null}))});
 }
 if(path==="/leads"&&request.method==="POST"){
  const b=await request.json().catch(()=>({})),ig=handle(b.instagram),category=clean(b.category,25),evidence=clean(b.evidence,900),source=urlOk(b.evidence_url),website=b.website?urlOk(b.website):"",contact=b.contact_source?urlOk(b.contact_source):"",whatsapp=number(b.whatsapp);
  if(!ig||!categories.includes(category)||!evidence||!source)return json({error:"invalid_evidence_or_handle"},400);
  if(b.website&&!website||b.whatsapp&&!whatsapp||whatsapp&&!contact||b.contact_source&&!contact)return json({error:"invalid_public_business_contact"},400);
  if(b.source_type&&!["manual_public","authorized_import"].includes(b.source_type))return json({error:"unauthorized_source"},400);
  const business=clean(b.business,120),q=qualifyRadarLead(category,evidence,business),id=crypto.randomUUID();
  try{
   await env.DB.prepare("INSERT INTO flow_radar_leads(id,instagram,business,category,evidence,evidence_url,competitor,website,whatsapp,contact_source,source_type,score,reason,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,ig,business,category,evidence,source,handle(b.competitor),website,whatsapp,contact,b.source_type||"manual_public",q.score,q.reason,clean(b.notes,800)).run();
  }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return json({error:"duplicate"},409);throw e;}
  return json({ok:true,id,qualification:q},201);
 }
 if(path.startsWith("/leads/")&&request.method==="PATCH"){
  const id=path.slice(7),b=await request.json().catch(()=>({})),stage=clean(b.status,30);
  if(!/^[a-f0-9-]{36}$/.test(id)||!stages.includes(stage))return json({error:"invalid_stage"},400);
  const row=await env.DB.prepare("SELECT id,status FROM flow_radar_leads WHERE id=?").bind(id).first();
  if(!row)return json({error:"not_found"},404);
  if(stage==="contatado"&&row.status!=="aprovado")return json({error:"approve_first"},409);
  await env.DB.prepare("UPDATE flow_radar_leads SET status=?,approved_at=CASE WHEN ?='aprovado' THEN CURRENT_TIMESTAMP ELSE approved_at END,contacted_at=CASE WHEN ?='contatado' THEN CURRENT_TIMESTAMP ELSE contacted_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(stage,stage,stage,id).run();
  return json({ok:true,status:stage});
 }
 return json({error:"not_found"},404);
}
