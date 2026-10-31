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
test("Flow Arts oculta interações antigas de 2 dias, não mexe nos outros clientes e preserva reativação com comentário novo",async()=>{
  const env=envDb(),flow={id:"primeiro-teste",name:"Flow Arts"},other={id:"outro",name:"Outro"};
  const old="2026-10-25T10:00:00.000Z",recent="2026-10-31T10:00:00.000Z";
  await upsertLead(env,flow,{id:"flow-old",instagramUsername:"leadvelho",lastContactAt:old,stage:"new",score:80});
  await upsertLead(env,flow,{id:"flow-active",instagramUsername:"clienteativo",lastContactAt:old,stage:"conversando",score:95});
  await upsertLead(env,flow,{id:"flow-new",instagramUsername:"recente",lastContactAt:recent,stage:"new",score:90});
  await upsertLead(env,other,{id:"other-old",instagramUsername:"outro",lastContactAt:old,stage:"new",score:85});
  const now=new Date("2026-10-31T12:00:00.000Z");
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
