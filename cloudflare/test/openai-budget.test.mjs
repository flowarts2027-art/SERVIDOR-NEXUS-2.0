import test from "node:test";
import assert from "node:assert/strict";
import { openAIResponses, davidResponses, DAVID_DEFAULT_MODEL, tokenUsageToday } from "../src/openai.js";

function envAtUsage(usedTokens,runtime={status:"ok",detail:"",updated_at:""}){
  return {
    OPENAI_API_KEY_SHARED:"test-key",
    NEXUS_OPENAI_DAILY_TOKEN_LIMIT:"30000",
    DB:{
      prepare(sql){
        const api={
          async run(){return {meta:{changes:0}};},
          bind(){
            return {
              async first(){
                if(sql.includes("FROM token_usage")) return {
                  input_tokens:Math.max(0,usedTokens-1000),
                  output_tokens:Math.min(1000,usedTokens),
                  used_tokens:usedTokens,
                  calls:4,last_model:"gpt-5.6-luna",updated_at:"2026-09-29 20:00:00"
                };
                if(sql.includes("FROM clients WHERE id")) return {
                  id:"globalplay-streaming",name:"Global Play",niche:"streaming",instagram:"@globalplay_streaming",
                  status:"online",config_json:"{}",created_at:"",updated_at:""
                };
                if(sql.includes("openai_runtime_status")) return runtime;
                return null;
              },
              async run(){return {meta:{changes:0}};}
            };
          },
          async first(){return null;}
        };
        return api;
      }
    }
  };
}

// 15/11/2026 (Rodrigo): a chave da OpenAI é só do David. A função geral recusa sempre,
// então a reserva da revisão visual e o atalho do publicador de emergência deixaram de existir.
test("só o David usa a OpenAI: a função geral recusa sem chamar a OpenAI", async () => {
  const env = envAtUsage(0);
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  try {
    for (const purpose of ["visual-review", "emergency-publisher", "media-generation", "strategy", "caption", "whatsapp-reply"]) {
      await assert.rejects(
        openAIResponses(env, "primeiro-teste", { nexusPurpose: purpose, nexusBypassDailyBudget: true, input: "x" }),
        error => error?.message === "openai_reserved_for_david" && error.status === 403
      );
    }
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("David: modelo barato, chave do Master e sem furar o limite do dia", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), auth: init.headers.authorization, body: JSON.parse(String(init.body)) });
    return Response.json({ output_text: "{}", usage: { total_tokens: 12 } });
  };
  try {
    await davidResponses(envAtUsage(100), "primeiro-teste", { input: "oi", nexusBypassDailyBudget: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].auth, "Bearer test-key");
    assert.equal(calls[0].body.model, DAVID_DEFAULT_MODEL);
    assert.equal(calls[0].body.nexusPurpose, undefined);
    await davidResponses({ ...envAtUsage(100), WHATSAPP_OPENAI_MODEL: "outro-modelo" }, "primeiro-teste", { input: "oi" });
    assert.equal(calls[1].body.model, "outro-modelo");
    await assert.rejects(davidResponses(envAtUsage(30000), "primeiro-teste", { input: "oi", nexusBypassDailyBudget: true }),
      error => error?.message === "openai_daily_budget_reached");
    assert.equal(calls.length, 2);
    await assert.rejects(davidResponses({ ...envAtUsage(100), OPENAI_API_KEY_SHARED: "" }, "primeiro-teste", { input: "oi" }),
      /openai_not_configured|nexus_secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("aviso de sem saldo recente bloqueia, mas expira e deixa testar de novo",async()=>{
  const fmt=ms=>new Date(Date.now()-ms).toISOString().replace("T"," ").slice(0,19);
  const recent=await tokenUsageToday(envAtUsage(100,{status:"quota_exhausted",detail:"insufficient_quota",updated_at:fmt(2*60*1000)}),"globalplay-streaming");
  assert.equal(recent.quotaExhausted,true);
  assert.equal(recent.blocked,true);
  const old=await tokenUsageToday(envAtUsage(100,{status:"quota_exhausted",detail:"insufficient_quota",updated_at:fmt(30*60*1000)}),"globalplay-streaming");
  assert.equal(old.quotaExhausted,false);
  assert.equal(old.blocked,false);
});
