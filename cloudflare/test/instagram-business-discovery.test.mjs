import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { encryptSecret } from "../src/secrets.js";
import { classifyProfileWebsite,inspectInstagramBusiness } from "../src/instagram-business-discovery.js";
import { qualifyRadarLead,websiteOpportunity } from "../src/commercial-radar.js";

function envWithConnection() {
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nexus_state(namespace TEXT,item_key TEXT,client_id TEXT,value_json TEXT,updated_at TEXT,PRIMARY KEY(namespace,item_key,client_id))");
  const DB={prepare(sql){const make=args=>{const params=Object.fromEntries(args.map((v,i)=>["?"+(i+1),v??null]));return {
    first:async()=>db.prepare(sql).get(params)||null,
    all:async()=>({results:db.prepare(sql).all(params)}),
    run:async()=>({meta:{changes:Number(db.prepare(sql).run(params).changes)}})
  };};return {...make([]),bind:(...args)=>make(args)};}};
  return {db,env:{DB,NEXUS_SECRET_KEY:"fake-test-key",META_GRAPH_VERSION:"v25.0"}};
}

test("bio sem website é pista, não prova que a empresa não tem site",()=>{
  const check=classifyProfileWebsite("","Atendimento pelo direct");
  assert.equal(check.signal,"website_not_declared");
  assert.equal(check.verifiedBadSite,false);
  assert.equal(classifyProfileWebsite("https://empresa.com.br","").signal,"website_declared");
  assert.equal(classifyProfileWebsite("","Visite www.empresa.com.br").signal,"bio_link_indicated");
  assert.equal(websiteOpportunity("Site está lento, quero melhorar","https://empresa.com.br").signal,"reported_issue");
  assert.ok(qualifyRadarLead("site","Meu site está lento e preciso de outro").score>=80);
  assert.equal(qualifyRadarLead("site","Campo site não informado no perfil").intentConfirmed,false);
});
test("inspeção do perfil exige Facebook Radar conectado",async()=>{
  const {env}=envWithConnection();
  assert.equal((await inspectInstagramBusiness(env,"@empresa")).error,"facebook_radar_not_connected");
  assert.equal((await inspectInstagramBusiness(env,"https://not-an-handle.example")).error,"invalid_instagram_handle");
});
test("Business Discovery usa somente Graph oficial, token no cabeçalho e não inventa falha do site",async()=>{
  const {db,env}=envWithConnection();
  const token=await encryptSecret(env,"fake-facebook-token");
  db.prepare("INSERT INTO nexus_state VALUES('integration','facebook-radar','',?,CURRENT_TIMESTAMP)")
    .run(JSON.stringify({token,igUserId:"1234567890",igUsername:"flowarts2026"}));
  let seen=null;
  const fetcher=async(url,options)=>{
    seen={url,options};
    return Response.json({business_discovery:{
      username:"empresa.teste",name:"Empresa Teste",biography:"Fale com a gente pelo direct",
      website:"",followers_count:203,media_count:40
    }});
  };
  const out=await inspectInstagramBusiness(env,"@empresa.teste",fetcher);
  assert.equal(out.ok,true);
  assert.equal(out.website,"");
  assert.equal(out.assessment.signal,"website_not_declared");
  assert.match(seen.url,/^https:\/\/graph\.facebook\.com\/v25\.0\/1234567890\?/);
  assert.match(decodeURIComponent(new URL(seen.url).searchParams.get("fields")),/business_discovery\.username\(empresa\.teste\)/);
  assert.ok(!seen.url.includes("fake-facebook-token"));
  assert.equal(seen.options.headers.authorization,"Bearer fake-facebook-token");
  assert.equal(out.source,"meta_business_discovery");
});
test("conta pessoal ou não acessível é recusada sem salvar lead",async()=>{
  const {db,env}=envWithConnection();
  const token=await encryptSecret(env,"fake");
  db.prepare("INSERT INTO nexus_state VALUES('integration','facebook-radar','',?,CURRENT_TIMESTAMP)")
    .run(JSON.stringify({token,igUserId:"1234567890"}));
  const out=await inspectInstagramBusiness(env,"empresa.teste",async()=>Response.json({business_discovery:null}));
  assert.equal(out.error,"profile_not_accessible");
});
