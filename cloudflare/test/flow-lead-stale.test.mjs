import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { upsertLead,leadsForClient,archiveStaleFlowLeads } from "../src/leads.js";

function envDb() {
  const db=new DatabaseSync(":memory:");
  return { DB:{prepare(sql){
    const run=args=>{
      const params=Object.fromEntries(args.map((v,i)=>["?"+(i+1),v??null]));
      return {
        first:async()=>db.prepare(sql).get(params)||null,
        all:async()=>({results:db.prepare(sql).all(params)}),
        run:async()=>({meta:{changes:Number(db.prepare(sql).run(params).changes)}})
      };
    };
    return {...run([]),bind:(...args)=>run(args)};
  }} };
}
test("Flow Arts oculta interações sem resposta há 24 horas, não mexe nos outros clientes e preserva reativação com comentário novo",async()=>{
  const env=envDb(),flow={id:"primeiro-teste",name:"Flow Arts"},other={id:"outro",name:"Outro"};
  // Relativo ao relógio: leadsForClient roda a limpeza com a hora atual.
  const nowMs=Date.now(),old=new Date(nowMs-3*86400000).toISOString(),recent=new Date(nowMs-2*3600000).toISOString();
  await upsertLead(env,flow,{id:"flow-old",instagramUsername:"leadvelho",lastContactAt:old,stage:"new",score:80});
  await upsertLead(env,flow,{id:"flow-active",instagramUsername:"clienteativo",lastContactAt:old,stage:"conversando",score:95});
  await upsertLead(env,flow,{id:"flow-new",instagramUsername:"recente",lastContactAt:recent,stage:"new",score:90});
  await upsertLead(env,other,{id:"other-old",instagramUsername:"outro",lastContactAt:old,stage:"new",score:85});
  const now=new Date(nowMs);
  assert.equal((await archiveStaleFlowLeads(env,flow.id,now)).hidden,1);
  assert.equal((await archiveStaleFlowLeads(env,other.id,now)).hidden,0);
  assert.deepEqual((await leadsForClient(env,flow.id)).map(x=>x.id),["flow-active","flow-new"]);
  assert.equal((await leadsForClient(env,other.id)).length,1);
  assert.equal((await env.DB.prepare("SELECT stage FROM leads WHERE id='flow-old'").first()).stage,"stale_hidden");
  await upsertLead(env,flow,{id:"flow-old",instagramUsername:"leadvelho",lastContactAt:old,stage:"new",score:80});
  assert.equal((await env.DB.prepare("SELECT stage FROM leads WHERE id='flow-old'").first()).stage,"stale_hidden");
  await upsertLead(env,flow,{id:"flow-old",instagramUsername:"leadvelho",lastContactAt:recent,stage:"new",score:80});
  assert.equal((await env.DB.prepare("SELECT stage FROM leads WHERE id='flow-old'").first()).stage,"new");
});

import { qualifyFlowArtsIntent } from "../src/lead-hunter.js";
test("Flow Arts: QUERO isolado não supera pedido específico de site ou automação",()=>{
  const generic=qualifyFlowArtsIntent({message:"QUERO",score:95,temperature:"hot",intent:"QUERO"});
  assert.equal(generic.score,16);
  assert.equal(generic.needsHuman,false);
  const specific=qualifyFlowArtsIntent({message:"Preciso automatizar o direct do meu Instagram",score:40,temperature:"warm",intent:"dúvida"});
  assert.ok(specific.score>=74);
  assert.equal(specific.needsHuman,true);
});
