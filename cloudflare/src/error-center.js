// Diagnóstico administrativo, somente leitura.
const response=(body,status=200,type="application/json; charset=utf-8")=>new Response(type.startsWith("application")?JSON.stringify(body):body,{status,headers:{"content-type":type,"cache-control":"no-store"}});
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function handleErrorCenter(request,env,url){
 if(request.method!=="GET")return response({error:"method_not_allowed"},405);
 if(!env.DB)return response({error:"database_unavailable"},503);
 const cutoff=new Date(Date.now()-600000).toISOString();
 let posts=[],jobs=[],error=null;
 try{
  const p=await env.DB.prepare("SELECT id,client_id,scheduled_for,status,error FROM post_ledger WHERE status='failed' OR (status IN ('scheduled','ready') AND approval_status='approved' AND scheduled_for < ?1) ORDER BY scheduled_for DESC LIMIT 80").bind(cutoff).all();
  posts=p.results||[];
  const j=await env.DB.prepare("SELECT id,client_id,kind,due_at,status FROM scheduled_jobs WHERE status='failed' OR (status IN ('scheduled','running') AND due_at < ?1) ORDER BY due_at DESC LIMIT 50").bind(cutoff).all();
  jobs=j.results||[];
 }catch(e){console.error("error-center",e);error="Falha ao consultar D1";}
 const data={checked_at:new Date().toISOString(),posts,jobs,error,automatic_repair_enabled:false};
 if(url.pathname.endsWith("/data"))return response(data,error?503:200);
 const rows=[...posts.map(p=>({type:"Publicação",client:p.client_id,time:p.scheduled_for,status:p.status,detail:p.error||"Atrasada"})),...jobs.map(j=>({type:"Agendador",client:j.client_id,time:j.due_at,status:j.status,detail:j.kind}))];
 const tr=rows.map(r=>"<tr>"+[r.type,r.client,r.time,r.status,r.detail].map(v=>"<td>"+escapeHtml(v)+"</td>").join("")+"</tr>").join("");
 const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central de Erros · Nexus</title><style>body{font:16px system-ui;background:#101827;color:#f8fafc;padding:20px;max-width:980px;margin:auto}a{color:#93c5fd}section{background:#1e293b;border-radius:12px;padding:18px;margin:16px 0}table{border-collapse:collapse;width:100%}td,th{padding:9px;border-bottom:1px solid #475569;text-align:left}button{padding:12px;border:0;border-radius:8px}strong{color:#fca5a5}</style><h1>Central de Erros · Nexus</h1><a href="/master">Voltar</a><section><strong>${rows.length} ocorrência(s)</strong><p>Verificação: ${escapeHtml(data.checked_at)}. Atraso acima de 10 minutos.</p><button onclick="location.reload()">Atualizar</button></section><section><div style="overflow-x:auto"><table><thead><tr><th>Tipo</th><th>Cliente</th><th>Horário</th><th>Status</th><th>Detalhe</th></tr></thead><tbody>${tr||'<tr><td colspan="5">Nenhuma ocorrência</td></tr>'}</tbody></table></div></section><section><h2>Corrigir agora</h2><p>Correção automática pendente de validação contra publicações duplicadas.</p><button disabled>Corrigir agora (em preparação)</button></section></html>`;
 return response(html,error?503:200,"text/html; charset=utf-8");
}
