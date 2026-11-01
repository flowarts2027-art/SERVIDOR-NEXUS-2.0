// Radar Comercial Flow Arts: somente fontes autorizadas, sem scraping ou mensagens automáticas.
import { inspectInstagramBusiness } from "./instagram-business-discovery.js";
import { getState } from "./storage.js";
import { goodHandle, runCompetitorWatch, competitorWatchResult, saveCommenterLead } from "./radar-competitor-watch.js";
const clean=(x,n=500)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const categories=["site","instagram","leads","prospeccao"];
const stages=["novo","revisao","aprovado","contatado","negociacao","ganho","descartado","nao_contatar","nutricao","convite_seguir","seguidor_confirmado"];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const urlOk=x=>{try{const u=new URL(x);return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname.includes(".")&&!/^(localhost|127\.|10\.|192\.168\.)/i.test(u.hostname)?u.toString().slice(0,500):"";}catch{return "";}};
const handle=x=>{const s=clean(x,50).replace(/^@/,"").toLowerCase();return /^[a-z0-9._]{1,30}$/.test(s)?s:"";};
const number=x=>{let n=String(x??"").replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;return /^55\d{10,11}$/.test(n)?n:"";};
export function qualifyRadarLead(category,evidence,business=""){
 const t=(String(evidence||"")+" "+String(business||"")).toLowerCase();
 const relevant=({site:/site|página|landing|loja virtual|wordpress|lento|hospedagem|dom[ií]nio|link na bio/,instagram:/instagram|direct|automa|robô|bot|manychat|postagem|reels/,leads:/lead|clientes|vendas|captar|prospec|contatos/,prospeccao:/empresa|representante|fornecedor|comprador|alug|loca|b2b/}[category]||/$^/).test(t);
 const intent=/quero|preciso|procuro|preço|valor|contratar|não funciona|nao funciona|insatisfeit|alternativa|deu problema|parou de funcionar|n[aã]o responde|site (?:lento|ruim|travando|fora do ar)|site n[aã]o abre|site desatualizado/.test(t);
 const profileOnly=category==="site"&&/site n[aã]o informado no (?:campo|perfil)|campo site n[aã]o informado|n[aã]o h[aá] site informado/i.test(t);
 const score=Math.min(95,20+(relevant?35:0)+(intent?30:0)+(business?10:0));
 const reason=profileOnly&&!intent?"Site não informado no perfil; necessidade não confirmada"
  :relevant&&intent?"Problema ou intenção comercial relatada"
  :relevant?"Tema compatível; interesse não confirmado":"Revisão humana necessária";
 return {score,reason,intentConfirmed:Boolean(relevant&&intent),profileOnly};
}
export function websiteOpportunity(evidence, website=""){
 const text=String(evidence||"").toLowerCase();
 if(/site (?:est[aá] )?(?:lento|ruim|travando|fora do ar)|site n[aã]o abre|site desatualizado|problema (?:com|no) (?:o )?site/.test(text))
  return {signal:"reported_issue",label:"Problema no site relatado; ainda não auditado"};
 if(/site n[aã]o informado|sem link de site|perfil sem (?:link|site)|sem site no perfil/.test(text))
  return {signal:"no_profile_website",label:"Site não informado no perfil; ausência não confirmada"};
 if(website) return {signal:"site_present",label:"Site informado; qualidade não avaliada"};
 return {signal:"not_evaluated",label:"Site não avaliado"};
}

async function ensure(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_leads (id TEXT PRIMARY KEY,instagram TEXT NOT NULL,business TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,evidence TEXT NOT NULL,evidence_url TEXT NOT NULL,competitor TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',contact_source TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL DEFAULT 'manual_public',score INTEGER NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'novo',approved_at TEXT,contacted_at TEXT,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(instagram,category,evidence_url))").run();
}
export async function handleCommercialRadar(request,env,u){
 const prefix="/api/master/commercial-radar";if(!u.pathname.startsWith(prefix))return null;
 if(request.method!=="GET"&&request.headers.get("origin")&&request.headers.get("origin")!==u.origin)return json({error:"invalid_origin"},403);
 await ensure(env);
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_radar_competitors (instagram TEXT PRIMARY KEY,category TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 const path=u.pathname.slice(prefix.length);
 // Eventos de campanha recebidos de integrações verificadas. Nunca inferir curtidas ou cliques.
 // Endpoint de escrita protegido pela sessão Flow Arts/Master do roteador.
 if(path==="/campaign-events" && request.method==="GET"){
   await env.DB.prepare("CREATE TABLE IF NOT EXISTS flow_campaign_events (id TEXT PRIMARY KEY,campaign TEXT NOT NULL,event_type TEXT NOT NULL,source TEXT NOT NULL,occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
   const rows=await env.DB.prepare("SELECT event_type,COUNT(*) AS total FROM flow_campaign_events GROUP BY event_type").all();
   const metrics={ad_click:0,ad_like:0,form_started:0,form_submitted:0,whatsapp_opened:0,qualified_lead:0};
   for(const row of rows.results||[])if(Object.hasOwn(metrics,row.event_type))metrics[row.event_type]=Number(row.total||0);
   const count=Object.values(metrics).reduce((a,b)=>a+b,0);
   return json({ok:true,metrics,eventCount:count,tracking:count?"partial":"awaiting_integration",note:count?"Eventos registrados por integrações verificadas; não representam necessariamente pessoas únicas.":"Aguardando integração da campanha. Nenhuma estatística foi inventada.",limitations:"Cliques e curtidas de anúncios dependem de dados oficiais da Meta; início de formulário e WhatsApp exigem eventos instrumentados. Abertura do WhatsApp não prova conversa."});
 }
 // Ingestão deliberadamente bloqueada até termos uma integração oficial assinada.
 // Um usuário logado não pode fabricar cliques/curtidas para inflar estatísticas.
 if(path==="/campaign-events" && request.method==="POST"){
   return json({ok:false,error:"integration_not_enabled",message:"Captura de campanha indisponível até validação de origem e integração oficial."},409);
 }
 // O Radar da Flow Arts pode ser aberto tanto pelo Master quanto pela sessão
 // isolada do próprio cliente Flow Arts; a autorização é feita no roteador.
 if(path==="/status"&&request.method==="GET"){
  let feedConfigured=false;
  try {
   const source=new URL(String(env.RADAR_FEED_URL||""));
   feedConfigured=source.protocol==="https:"&&source.hostname===String(env.RADAR_FEED_HOST||"").toLowerCase();
  }catch{}
  const conn=(await getState(env,"integration","facebook-radar").catch(()=>null))?.value||{};
  const instagramInspectionReady=Boolean(conn.token&&conn.igUserId&&(!conn.expiresAt||Date.parse(conn.expiresAt)>Date.now()));
  const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM flow_radar_leads").first();
  return json({ok:true,leadCount:Number(count?.total||0),feedConfigured,automaticDiscovery:feedConfigured,instagramInspectionReady,source:feedConfigured?"authorized_feed":"not_configured",note:feedConfigured?"Busca horária de oportunidades autorizadas ativa.":"O Radar de intenção ainda não possui fonte autorizada. O Caçador de empresas do CRM pode pesquisar pelo OpenStreetMap."});
 }
 if(path==="/profile-check"&&request.method==="POST"){
  const b=await request.json().catch(()=>({}));
  const profile=await inspectInstagramBusiness(env,b.instagram);
  if(!profile.ok)return json(profile,profile.error==="invalid_instagram_handle"?400:profile.error==="facebook_radar_not_connected"?409:502);
  if(b.save===true){
   if(profile.assessment.signal!=="website_not_declared")return json({...profile,saved:false,notice:"Site informado ou possível link na bio. Revisar antes de registrar oportunidade."});
   const source=profile.profileUrl;
   const evidence=clean("Perfil profissional consultado via Meta Business Discovery. Campo site não informado no perfil. Biografia: "+profile.biography,900);
   const q=qualifyRadarLead("site",evidence,profile.name);
   const id=crypto.randomUUID();
   const insert=await env.DB.prepare("INSERT OR IGNORE INTO flow_radar_leads(id,instagram,business,category,evidence,evidence_url,competitor,website,whatsapp,contact_source,source_type,score,reason,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,profile.username,profile.name,"site",evidence,source,"","","","","authorized_import",q.score,q.reason,"Perfil profissional verificado pela API oficial da Meta; não prova que a empresa não tem site ou deseja contratar.").run();
   return json({...profile,saved:Boolean(insert?.meta?.changes),qualification:q,notice:"Oportunidade para revisão humana; não há interesse de compra confirmado."});
  }
  return json(profile);
 }
 if(path==="/discover"&&request.method==="POST"){
  const {runRadarDiscovery}=await import("./radar-discovery-feed.js");
  const result=await runRadarDiscovery(env);
  return json(result,result.ok?200:503);
 }
 if(path==="/competitors"&&request.method==="GET"){
  const rows=await env.DB.prepare("SELECT * FROM flow_radar_competitors ORDER BY created_at DESC LIMIT 100").all();
  return json({ok:true,competitors:rows.results||[]});
 }
 if(path==="/competitors"&&request.method==="POST"){
  // 01/11: aceita @ ou link do perfil; sem categoria escolhida, vale "instagram" (automação).
  const b=await request.json().catch(()=>({})),ig=goodHandle(b.instagram),category=clean(b.category,25)||"instagram";
  if(!ig||!categories.includes(category))return json({error:"invalid_competitor"},400);
  await env.DB.prepare("INSERT OR IGNORE INTO flow_radar_competitors(instagram,category,notes) VALUES(?,?,?)").bind(ig,category,clean(b.notes,300)).run();
  return json({ok:true,instagram:ig},201);
 }
 if(path.startsWith("/competitors/")&&request.method==="DELETE"){
  const ig=goodHandle(decodeURIComponent(path.slice(13)));
  if(!ig)return json({error:"invalid_competitor"},400);
  await env.DB.prepare("DELETE FROM flow_radar_competitors WHERE instagram=?").bind(ig).run();
  return json({ok:true});
 }
 // Vigia (forma 2): resultado guardado da última olhada nos posts dos concorrentes.
 if(path==="/competitor-posts"&&request.method==="GET"){
  const latest=await competitorWatchResult(env);
  return json({ok:true,latest,note:"A Meta informa só a quantidade de comentários dos concorrentes, nunca quem comentou."});
 }
 if(path==="/competitor-watch"&&request.method==="POST"){
  const out=await runCompetitorWatch(env,new Date(),fetch,{force:true});
  return json(out,out.ok?200:409);
 }
 // Colar o @ (forma 1): o Rodrigo leu o comentário público e guarda a pessoa com o post como prova.
 if(path==="/commenter-lead"&&request.method==="POST"){
  const b=await request.json().catch(()=>({}));
  const out=await saveCommenterLead(env,b,{qualify:qualifyRadarLead});
  const {status,...rest}=out;
  return json(rest,status);
 }
 if(path==="/leads"&&request.method==="GET"){
  const rows=await env.DB.prepare("SELECT * FROM flow_radar_leads ORDER BY score DESC,created_at DESC LIMIT 300").all();
  return json({ok:true,categories,stages,leads:(rows.results||[]).map(x=>({...x,website_opportunity:websiteOpportunity(x.evidence,x.website),whatsapp_link:x.whatsapp&&["aprovado","contatado","negociacao","ganho"].includes(x.status)?"https://wa.me/"+x.whatsapp:null}))});
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
  if(["contatado","negociacao","ganho"].includes(stage)&&!["aprovado","contatado","negociacao","ganho"].includes(row.status))return json({error:"approve_first"},409);
  if(stage==="convite_seguir"&&!["aprovado","contatado","negociacao","convite_seguir"].includes(row.status))return json({error:"approve_first"},409);
  if(stage==="seguidor_confirmado"&&row.status!=="convite_seguir"&&row.status!=="seguidor_confirmado")return json({error:"confirm_invite_first"},409);
  if(row.status==="nao_contatar"&&stage!=="nao_contatar")return json({error:"do_not_contact_locked"},409);
  await env.DB.prepare("UPDATE flow_radar_leads SET status=?,approved_at=CASE WHEN ?='aprovado' THEN CURRENT_TIMESTAMP ELSE approved_at END,contacted_at=CASE WHEN ?='contatado' THEN CURRENT_TIMESTAMP ELSE contacted_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(stage,stage,stage,id).run();
  return json({ok:true,status:stage});
 }
 return json({error:"not_found"},404);
}
