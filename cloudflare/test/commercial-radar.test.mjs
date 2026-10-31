import test from "node:test";
import assert from "node:assert/strict";
import { qualifyRadarLead, handleCommercialRadar } from "../src/commercial-radar.js";

test("categorias têm pontuação para sinal de intenção",()=>{
  assert.ok(qualifyRadarLead("site","Preciso contratar um site").score>=80);
  assert.ok(qualifyRadarLead("instagram","Quero automação do direct").score>=80);
  assert.ok(qualifyRadarLead("leads","Procuro leads para vender").score>=80);
  assert.ok(qualifyRadarLead("prospeccao","Preciso encontrar empresas compradoras B2B").score>=80);
});
test("não acessa rotas externas ao radar",async()=>{
 const r=await handleCommercialRadar(new Request("https://example.com/api/master/campanhas"),{},new URL("https://example.com/api/master/campanhas"));
 assert.equal(r,null);
});
