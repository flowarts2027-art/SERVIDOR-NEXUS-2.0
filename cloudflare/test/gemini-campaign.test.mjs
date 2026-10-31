// Campanha diária com o Gemini (pedido do Rodrigo, 28/10/2026): GILTEC primeiro.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { dailyPlan, geminiImage, geminiDailyClients, runGeminiCampaign, runGeminiDaily, monthSpend, cloudflareImage, imageProvider, cloudflareCaptions } from "../src/gemini-campaign.js";
import { CLIENT_LOGOS } from "../src/client-logos.js";

function fakeEnv(extra = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  return { DB, GEMINI_API_KEY: "teste", GEMINI_DAILY_CLIENTS: "giltec", ...extra };
}

const PNG = Buffer.from("iVBORw0KGgo=", "base64").toString("base64");
function fakeGemini(log = []) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    log.push({ url, body, key: init.headers["x-goog-api-key"] });
    if (body.generationConfig?.responseModalities) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: PNG } }] } }] }));
    }
    const text = JSON.stringify({ "0900": "Carrossel. Fale com a Rose. Comente QUERO.", "1200": "Post. Comente QUERO.", "1900": "Post sem a palavra" });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  };
}
const compose = async (env, bytes) => new Uint8Array([1, 2, 3]);

test("plano do dia: 3 posts (1 carrossel de 2) + 3 stories, um equipamento diferente por peça", () => {
  for (let i = 0; i < 12; i++) {
    const date = new Date(Date.UTC(2026, 9, 28 + i)).toISOString().slice(0, 10);
    const plan = dailyPlan("giltec", date);
    assert.deepEqual(plan.map(p => p.type), ["carousel", "post", "post", "story", "story", "story"]);
    const eq = plan.flatMap(p => p.cards.map(c => c.equipment)).filter(Boolean);
    assert.equal(eq.length, 4);
    assert.equal(new Set(eq).size, 4, "nenhum equipamento repetido no dia");
    for (const p of plan) for (const c of p.cards) {
      assert.match(c.prompt, /no text, letters/);
      assert.equal(c.aspect, p.type === "story" ? "9:16" : "4:5");
    }
  }
});

test("mesmo horário não repete equipamento no dia seguinte e betoneira não é post 2 dias seguidos", () => {
  let prev = null;
  for (let i = 0; i < 20; i++) {
    const date = new Date(Date.UTC(2026, 9, 28 + i)).toISOString().slice(0, 10);
    const slots = dailyPlan("giltec", date).slice(0, 3).flatMap(p => p.cards.map(c => c.equipment));
    const betoneiraPost = slots.indexOf("betoneira") >= 2;
    if (prev) {
      slots.forEach((e, k) => assert.notEqual(e, prev.slots[k], date + " slot " + k));
      assert.ok(!(betoneiraPost && prev.betoneiraPost), date);
    }
    prev = { slots, betoneiraPost };
  }
});

test("só clientes configurados ligam", () => {
  assert.deepEqual(geminiDailyClients({ GEMINI_DAILY_CLIENTS: "giltec, outro" }), ["giltec"]);
  assert.deepEqual(geminiDailyClients({}), []);
  assert.ok(CLIENT_LOGOS.giltec.png.length > 1000);
});

test("pedido ao Google: modelo de imagem, proporção e chave no cabeçalho (nunca na URL)", async () => {
  const log = [];
  const out = await geminiImage({ GEMINI_API_KEY: "k" }, "cena", "4:5", fakeGemini(log));
  assert.ok(out.bytes.byteLength > 0);
  assert.match(log[0].url, /gemini-2\.5-flash-image:generateContent$/);
  assert.equal(log[0].key, "k");
  assert.ok(!log[0].url.includes("k="));
  assert.equal(log[0].body.generationConfig.imageConfig.aspectRatio, "4:5");
  await assert.rejects(geminiImage({}, "x", "4:5", fakeGemini()), /gemini_key_missing/);
});

test("roda o pacote: 6 envios esperando aprovação, legenda do GitHub ou do Gemini, gasto contado", async () => {
  const env = fakeEnv();
  const forms = [];
  const upload = async (e, form) => { forms.push(form); return { ok: true }; };
  const github = async () => ({ "0900": "", "1200": "Legenda do ChatGPT. Comente QUERO.", "1900": "" });
  const now = new Date("2026-10-28T09:00:00Z"); // 6h em Brasília
  const r = await runGeminiCampaign(env, "giltec", "2026-10-28", { fetcher: fakeGemini(), upload, githubCaptions: github, compose, now });
  assert.deepEqual(r.failed, []);
  assert.equal(r.sent.length, 6);
  const types = forms.map(f => f.get("type") + "@" + f.get("time"));
  assert.deepEqual(types, ["carousel@09:00", "post@12:00", "post@19:00", "story@09:00", "story@12:00", "story@19:00"]);
  assert.equal(forms[0].getAll("images").length, 2);
  forms.forEach(f => { assert.equal(f.get("approval"), "cliente"); assert.equal(f.get("noDuplicate"), "1"); });
  assert.match(forms[0].get("caption"), /QUERO/);
  assert.equal(forms[1].get("caption"), "Legenda do ChatGPT. Comente QUERO.");
  assert.equal(forms[2].get("caption"), "", "sem QUERO: fica vazia e o Nexus usa a legenda pronta");
  assert.equal(forms[3].get("caption"), null);
  assert.ok(Math.abs(await monthSpend(env, "2026-10") - 7 * 0.039) < 1e-9);
  // Segunda rodada no mesmo dia não gera nada de novo.
  const again = await runGeminiCampaign(env, "giltec", "2026-10-28", { fetcher: fakeGemini(), upload, githubCaptions: github, compose, now });
  assert.equal(again.sent.length, 0);
  assert.equal(forms.length, 6);
});

test("limite mensal para tudo e não passa do valor; horário passado é pulado; post já existente não duplica", async () => {
  const env = fakeEnv({ GEMINI_MONTHLY_LIMIT_USD: "0.1" });
  const forms = [];
  const r = await runGeminiCampaign(env, "giltec", "2026-10-28", {
    fetcher: fakeGemini(), compose, githubCaptions: async () => ({}),
    upload: async (e, f) => { forms.push(f); }, now: new Date("2026-10-28T09:00:00Z")
  });
  assert.ok(r.failed.some(x => x.includes("limite_mensal")));
  assert.ok(await monthSpend(env, "2026-10") <= 0.1);

  const env2 = fakeEnv();
  const late = await runGeminiCampaign(env2, "giltec", "2026-10-28", {
    fetcher: fakeGemini(), compose, githubCaptions: async () => ({}),
    upload: async (e, f) => { if (f.get("type") === "story") throw new Error("slot_taken"); },
    now: new Date("2026-10-28T14:00:00Z") // 11h: 09h já passou
  });
  assert.ok(late.skipped.includes("0900:horario_passou"));
  assert.ok(late.skipped.some(x => x.endsWith(":ja_tinha_post")));
  assert.deepEqual(late.failed, []);
});

test("cron: só entre 6h e 8h de Brasília, desligado sem chave ou sem cliente", async () => {
  assert.equal((await runGeminiDaily({ GEMINI_DAILY_CLIENTS: "giltec" }, new Date("2026-10-28T09:30:00Z"))).reason, "desligado");
  assert.equal((await runGeminiDaily(fakeEnv(), new Date("2026-10-28T13:00:00Z"))).reason, "fora_do_horario");
  const env = fakeEnv();
  let n = 0;
  const deps = { fetcher: fakeGemini(), compose, githubCaptions: async () => ({}), upload: async () => { n++; } };
  const r = await runGeminiDaily(env, new Date("2026-10-28T09:15:00Z"), deps);
  assert.equal(r.ran, true);
  assert.equal(n, 6);
  await runGeminiDaily(env, new Date("2026-10-28T09:30:00Z"), deps);
  assert.equal(n, 6, "não repete o dia");
});

test("Flow Arts: tema da agência, sem equipamento da GILTEC, carrossel de 5 e símbolo embaixo", () => {
  for (let i = 0; i < 6; i++) {
    const date = new Date(Date.UTC(2026, 9, 29 + i)).toISOString().slice(0, 10);
    const plan = dailyPlan("primeiro-teste", date);
    assert.deepEqual(plan.map(p => p.type), ["carousel", "post", "post", "story", "story", "story"]);
    assert.equal(plan[0].cards.length, 5);
    const all = plan.flatMap(p => p.cards);
    assert.equal(new Set(all.map(c => c.prompt)).size, all.length, "nenhuma cena repetida");
    for (const c of all) {
      assert.doesNotMatch(c.prompt, /compactor|concrete mixer|jackhammer|generator|hard hat/i);
      assert.match(c.prompt, /no blue tint/);
      assert.ok(c.topic);
    }
  }
  assert.equal(CLIENT_LOGOS["primeiro-teste"].position, "bottom-center");
});

function fakeAI(log = [], { kleinFails = false } = {}) {
  return { async run(model, input) {
    log.push({ model, input });
    if (model.includes("flux-2-klein")) { if (kleinFails) throw new Error("boom"); return { image: PNG }; }
    if (model.includes("flux-1-schnell")) return { image: PNG };
    return { response: JSON.stringify({ "0900": "Carrossel. Comente QUERO.", "1200": "Post. Comente QUERO.", "1900": "Pergunta? Comente QUERO." }) };
  } };
}

test("Cloudflare grátis: é o padrão quando existe AI, tamanho certo, troca para o schnell se falhar", async () => {
  assert.equal(imageProvider({ AI: {} }), "cloudflare");
  assert.equal(imageProvider({ AI: {}, NEXUS_FREE_IMAGE_PROVIDER: "gemini" }), "gemini");
  assert.equal(imageProvider({}), "gemini");
  const log = [];
  const out = await cloudflareImage({ AI: fakeAI(log) }, "cena", "9:16");
  assert.equal(out.model, "flux-2-klein-4b");
  assert.ok(log[0].input.multipart.contentType.startsWith("multipart/form-data"));
  const sent = await new Response(log[0].input.multipart.body, { headers: { "content-type": log[0].input.multipart.contentType } }).formData();
  assert.equal(sent.get("width"), "768"); assert.equal(sent.get("height"), "1344");
  const log2 = [];
  const fb = await cloudflareImage({ AI: fakeAI(log2, { kleinFails: true }) }, "cena", "4:5");
  assert.equal(fb.model, "flux-1-schnell");
});

test("Cloudflare grátis: roda sem chave do Google, sem custo e com legendas grátis", async () => {
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI(), GEMINI_MONTHLY_LIMIT_USD: "0" });
  const forms = [];
  const r = await runGeminiDaily(env, new Date("2026-10-29T09:10:00Z"), { compose, githubCaptions: async () => ({}), upload: async (e, f) => { forms.push(f); } });
  assert.equal(r.ran, true);
  assert.equal(forms.length, 6);
  assert.match(forms[0].get("caption"), /QUERO/);
  assert.equal(await monthSpend(env, "2026-10"), 0);
  const caps = await cloudflareCaptions({ AI: fakeAI() }, "primeiro-teste", dailyPlan("primeiro-teste", "2026-10-29"));
  assert.match(caps["1200"], /QUERO/);
});

test("fila do Master: pedido guardado, cron de 1 minuto gera e grava o resultado", async () => {
  const { queueCampaign, runQueuedCampaigns, campaignStatus } = await import("../src/gemini-campaign.js");
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI() });
  await queueCampaign(env, "primeiro-teste", "2026-10-29");
  assert.equal((await campaignStatus(env, "primeiro-teste", "2026-10-29")).manual.startedAt, "");
  let n = 0;
  const r = await runQueuedCampaigns(env, new Date("2026-10-28T11:00:00Z"), { compose, githubCaptions: async () => ({}), upload: async () => { n++; }, now: new Date("2026-10-28T09:00:00Z") });
  assert.equal(r.ran, true);
  assert.equal(n, 6);
  const st = await campaignStatus(env, "primeiro-teste", "2026-10-29");
  assert.equal(st.manual.result.sent.length, 6);
  assert.ok(st.manual.finishedAt);
  assert.equal((await runQueuedCampaigns(env)).ran, false, "fila vazia");
});
