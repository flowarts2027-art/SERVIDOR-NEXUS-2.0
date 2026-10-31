// Central de Erros administrativa. Somente leitura; não reenvia publicações.
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const htmlEscape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function handleErrorCenter(request,env,url){
 if(request.method!=="GET")return json({error:"method_not_allowed"},405);
 if(!env.DB)return json({error:"database_unavailable"},503);
 const cutoff=new Date(Date.now()-600000).toISOString();
 let posts=[],jobs=[],error=null;
 try{
  const p=await env.DB.prepare("SELECT id,client_id,scheduled_for,status,error FROM post_ledger WHERE status='failed' OR (status IN ('scheduled','ready','publishing') AND approval_status='approved' AND scheduled_for < ?1) ORDER BY scheduled_for DESC LIMIT 80").bind(cutoff).all();
  posts=p.results||[];
  const j=await env.DB.prepare("SELECT id,client_id,kind,due_at,status,last_error,attempts FROM scheduled_jobs WHERE status='failed' OR (status IN ('scheduled','running') AND due_at < ?1) ORDER BY due_at DESC LIMIT 50").bind(cutoff).all();
  jobs=j.results||[];
 }catch(e){console.error("error-center-query-failed",String(e?.message||e).slice(0,180));error="Não foi possível consultar o banco D1";}
 const data={checked_at:new Date().toISOString(),posts,jobs,error,automatic_repair_enabled:false};
 if(url.pathname.endsWith("/data"))return json(data,error?503:200);
 const rows=[...posts.map(p=>({type:"Publicação",client:p.client_id,time:p.scheduled_for,status:p.status,detail:p.error||"Atrasada"})),...jobs.map(j=>({type:"Agendador",client:j.client_id,time:j.due_at,status:j.status,detail:j.last_error||j.kind}))];
 const tr=rows.map(r=>"<tr>"+[r.type,r.client,r.time,r.status,r.detail].map(v=>"<td>"+htmlEscape(v)+"</td>").join("")+"</tr>").join("");
 const alert=error?"Erro de consulta ao banco":rows.length?rows.length+" ocorrência(s) exigem atenção":"Nenhum erro detectado";
 const page=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60"><title>Central de Erros | Nexus</title><style>body{font:16px system-ui;background:#101827;color:#f8fafc;padding:20px;max-width:980px;margin:auto}a{color:#93c5fd}section{background:#1e293b;border-radius:12px;padding:18px;margin:16px 0}table{border-collapse:collapse;width:100%}td,th{padding:9px;border-bottom:1px solid #475569;text-align:left}button{padding:12px;border:0;border-radius:8px}.alert{color:#fca5a5;font-weight:700}.alert.active{animation:blink 1.2s infinite}@keyframes blink{50%{opacity:.3}}.ok{color:#86efac}</style></head><body><h1>Central de Erros · Nexus</h1><a href="/master">Voltar ao Master</a><section><div role="status" aria-live="polite" class="${error||rows.length?"alert active":"ok"}">${htmlEscape(alert)}</div><p>Última verificação: ${htmlEscape(data.checked_at)}. Atraso considerado: 10 minutos.</p><button onclick="location.reload()">Atualizar diagnóstico</button></section><section style="overflow-x:auto"><table><thead><tr><th>Tipo</th><th>Cliente</th><th>Horário</th><th>Status</th><th>Detalhe</th></tr></thead><tbody>${tr||'<tr><td colspan="5">Nenhuma ocorrência</td></tr>'}</tbody></table></section><section><h2>Corrigir agora</h2><p>A correção automática será habilitada somente após a validação contra posts duplicados e os testes do publicador.</p><button disabled aria-disabled="true">Corrigir agora (indisponível)</button></section></body></html>`;
 return new Response(page,{status:error?503:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
