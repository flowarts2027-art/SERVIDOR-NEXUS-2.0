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
  // 15/11/2026: campanha com foto de IA só para cliente com a opção ligada no Master.
  for (const id of ["giltec", "primeiro-teste"]) db.prepare("INSERT OR IGNORE INTO clients(id,name,status,config_json) VALUES(?,?,'online',?)").run(id, id, JSON.stringify({ agentCore: { aiImages: true } }));
  return { DB, GEMINI_API_KEY: "teste", GEMINI_DAILY_CLIENTS: "giltec", ...extra };
}

// 15/11/2026: a GILTEC nunca recebe foto de IA. Estes testes conferem a mecânica da campanha
// com um cliente liberado no Master (deps.client); a trava da GILTEC fica no teste logo abaixo.
const LIBERADO = { id: "cliente-liberado", config: { agentCore: { aiImages: true } } };

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

test("GILTEC sem foto de IA: a campanha nem começa", async () => {
  let n = 0;
  await assert.rejects(runGeminiCampaign(fakeEnv(), "giltec", "2026-10-28", { fetcher: fakeGemini(), compose, githubCaptions: async () => ({}), image: async () => { n++; }, upload: async () => { n++; }, now: new Date("2026-10-28T09:00:00Z") }), /generated_image_not_allowed/);
  assert.equal(n, 0);
});

test("roda o pacote: 6 envios esperando aprovação, legenda do GitHub ou do Gemini, gasto contado", async () => {
  const env = fakeEnv();
  const forms = [];
  const upload = async (e, form) => { forms.push(form); return { ok: true }; };
  const github = async () => ({ "0900": "", "1200": "Legenda do ChatGPT. Comente QUERO.", "1900": "" });
  const now = new Date("2026-10-28T09:00:00Z"); // 6h em Brasília
  const r = await runGeminiCampaign(env, "giltec", "2026-10-28", { client: LIBERADO, fetcher: fakeGemini(), upload, githubCaptions: github, compose, now });
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
  const again = await runGeminiCampaign(env, "giltec", "2026-10-28", { client: LIBERADO, fetcher: fakeGemini(), upload, githubCaptions: github, compose, now });
  assert.equal(again.sent.length, 0);
  assert.equal(forms.length, 6);
});

test("limite mensal para tudo e não passa do valor; horário passado é pulado; post já existente não duplica", async () => {
  const env = fakeEnv({ GEMINI_MONTHLY_LIMIT_USD: "0.1" });
  const forms = [];
  const r = await runGeminiCampaign(env, "giltec", "2026-10-28", {
    client: LIBERADO, fetcher: fakeGemini(), compose, githubCaptions: async () => ({}),
    upload: async (e, f) => { forms.push(f); }, now: new Date("2026-10-28T09:00:00Z")
  });
  assert.ok(r.failed.some(x => x.includes("limite_mensal")));
  assert.ok(await monthSpend(env, "2026-10") <= 0.1);

  const env2 = fakeEnv();
  const late = await runGeminiCampaign(env2, "giltec", "2026-10-28", {
    client: LIBERADO, fetcher: fakeGemini(), compose, githubCaptions: async () => ({}),
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
  const deps = { client: LIBERADO, fetcher: fakeGemini(), compose, githubCaptions: async () => ({}), upload: async () => { n++; } };
  const r = await runGeminiDaily(env, new Date("2026-10-28T09:15:00Z"), deps);
  assert.equal(r.ran, true);
  assert.equal(n, 6);
  await runGeminiDaily(env, new Date("2026-10-28T09:30:00Z"), deps);
  assert.equal(n, 6, "não repete o dia");
});

test("plano novo (27/11): 2 posts + 2 stories, cenas seguras, sem equipamento da GILTEC nem texto", () => {
  for (const id of ["primeiro-teste", "nexus-ai", "daniela-martins", "maskara-assessoria", "sabor-do-campo"]) {
    for (let i = 0; i < 6; i++) {
      const date = new Date(Date.UTC(2026, 9, 29 + i)).toISOString().slice(0, 10);
      const plan = dailyPlan(id, date);
      assert.deepEqual(plan.map(p => p.type), ["post", "story", "post", "story"], id);
      const all = plan.flatMap(p => p.cards);
      assert.equal(new Set(all.map(c => c.prompt)).size, all.length, id + ": nenhuma cena repetida no dia");
      for (const c of all) {
        assert.doesNotMatch(c.prompt, /compactor|concrete mixer|jackhammer|hard hat/i);
        assert.match(c.prompt, /No crossed legs/);
        assert.match(c.prompt, /NO TEXT anywhere/);
        assert.ok(c.topic);
      }
    }
  }
  // Daniela: epilação, sem pernas cruzadas; Maskara: arma parada, nunca na mão.
  const dani = dailyPlan("daniela-martins", "2026-11-28").flatMap(p => p.cards).map(c => c.prompt).join(" ");
  assert.match(dani, /waxing|epilation/i);
  const mask = dailyPlan("maskara-assessoria", "2026-11-28").flatMap(p => p.cards).map(c => c.prompt).join(" ");
  assert.match(mask, /nobody holds, aims or points a weapon/);
  // Adimax e Quatree: o cenário nunca pede embalagem (a real é colada depois).
  for (const id of ["quatree-dog", "adimax-eduardo-soares"]) {
    for (const c of dailyPlan(id, "2026-11-28").flatMap(p => p.cards)) {
      assert.match(c.prompt, /\{PET\}/);
      assert.match(c.prompt, /NO product bags/);
    }
  }
});

function fakeAI(log = [], { kleinFails = false } = {}) {
  return { async run(model, input) {
    log.push({ model, input });
    if (model.includes("flux-2-klein")) { if (kleinFails) throw new Error("boom"); return { image: PNG }; }
    if (model.includes("flux-1-schnell")) return { image: PNG };
    if (Array.isArray(input?.messages) && Array.isArray(input.messages[0]?.content)) return { response: "NAO" };
    return { response: JSON.stringify({ "0900": "Post da manhã. Comente QUERO.", "1800": "Post da tarde. Comente QUERO.", "1200": "Post. Comente QUERO.", "1900": "Pergunta? Comente QUERO." }) };
  } };
}

// Banco mínimo só para a cota grátis (ai-budget.js).
function quotaDb() {
  const rows = new Map();
  return { prepare(sql) { let args = []; return {
    bind(...a) { args = a; return this; },
    async first() { return rows.has(args[0]) ? { value_json: rows.get(args[0]) } : null; },
    async run() { rows.set(args[0], args[1]); return {}; }
  }; } };
}

test("Cloudflare grátis: é o padrão quando existe AI, tamanho certo, troca para o schnell se falhar", async () => {
  assert.equal(imageProvider({ AI: {} }), "cloudflare");
  assert.equal(imageProvider({ AI: {}, NEXUS_FREE_IMAGE_PROVIDER: "gemini" }), "gemini");
  assert.equal(imageProvider({}), "gemini");
  const log = [];
  const out = await cloudflareImage({ AI: fakeAI(log), DB: quotaDb() }, "cena", "9:16");
  assert.equal(out.model, "flux-2-klein-4b");
  assert.ok(log[0].input.multipart.contentType.startsWith("multipart/form-data"));
  const sent = await new Response(log[0].input.multipart.body, { headers: { "content-type": log[0].input.multipart.contentType } }).formData();
  assert.equal(sent.get("width"), "1008"); assert.equal(sent.get("height"), "1792");
  const log2 = [];
  const fb = await cloudflareImage({ AI: fakeAI(log2, { kleinFails: true }), DB: quotaDb() }, "cena", "4:5");
  assert.equal(fb.model, "flux-1-schnell");
});

test("Cloudflare grátis: roda sem chave do Google, sem custo e com legendas grátis", async () => {
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI(), GEMINI_MONTHLY_LIMIT_USD: "0" });
  const forms = [];
  const r = await runGeminiDaily(env, new Date("2026-10-29T09:10:00Z"), { client: LIBERADO, compose, githubCaptions: async () => ({}), upload: async (e, f) => { forms.push(f); } });
  assert.equal(r.ran, true);
  assert.equal(forms.length, 6, "GILTEC (plano antigo, só ligado se estiver na lista)");
  assert.match(forms[0].get("caption"), /QUERO/);
  assert.ok(forms.every(f => f.get("fotoLimpa") !== "1"), "GILTEC: arte com logo, sem moldura do painel");
  const env2 = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI(), GEMINI_DAILY_CLIENTS: "daniela-martins" });
  const forms2 = [];
  await runGeminiDaily(env2, new Date("2026-10-29T09:10:00Z"), { client: { id: "daniela-martins", config: {} }, githubCaptions: async () => ({}), upload: async (e, f) => { forms2.push(f); } });
  assert.equal(forms2.length, 4, "Daniela: 2 posts + 2 stories, mesmo sem a opção do Master");
  assert.ok(forms2.every(f => f.get("fotoLimpa") === "1" && f.get("approval") === "cliente"), "foto pura e esperando aprovação");
  assert.equal(await monthSpend(env, "2026-10"), 0);
  const caps = await cloudflareCaptions({ AI: fakeAI() }, "primeiro-teste", dailyPlan("primeiro-teste", "2026-10-29"));
  assert.match(caps["0900"], /QUERO/);
});

test("21h às 23h (Brasília): faz as artes do dia seguinte, com a cota que acabou de zerar", async () => {
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI(), GEMINI_MONTHLY_LIMIT_USD: "0" });
  const forms = [];
  const r = await runGeminiDaily(env, new Date("2026-10-29T00:30:00Z"), { client: LIBERADO, compose, githubCaptions: async () => ({}), upload: async (e, f) => { forms.push(f); } });
  assert.equal(r.ran, true);
  assert.ok(forms.length > 0);
  assert.ok(forms.every(f => f.get("date") === "2026-10-29"), "28/10 21h30 de Brasília gera para 29/10");
  const fora = await runGeminiDaily(env, new Date("2026-10-28T18:00:00Z"), { client: LIBERADO, compose, upload: async () => {} });
  assert.equal(fora.reason, "fora_do_horario");
});

test("fila do Master: pedido guardado, cron de 1 minuto gera e grava o resultado", async () => {
  const { queueCampaign, runQueuedCampaigns, campaignStatus } = await import("../src/gemini-campaign.js");
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI() });
  await queueCampaign(env, "primeiro-teste", "2026-10-29");
  assert.equal((await campaignStatus(env, "primeiro-teste", "2026-10-29")).manual.startedAt, "");
  let n = 0;
  const r = await runQueuedCampaigns(env, new Date("2026-10-28T11:00:00Z"), { compose, githubCaptions: async () => ({}), upload: async () => { n++; }, now: new Date("2026-10-28T09:00:00Z") });
  assert.equal(r.ran, true);
  assert.equal(n, 4, "plano novo: 2 posts + 2 stories");
  const st = await campaignStatus(env, "primeiro-teste", "2026-10-29");
  assert.equal(st.manual.result.sent.length, 4);
  assert.ok(st.manual.finishedAt);
  assert.equal((await runQueuedCampaigns(env)).ran, false, "fila vazia");
});

test("embalagem real: produto escolhido antes da legenda, bicho certo na cena e foto do catálogo colada", async () => {
  const catalog = { quatree: [
    { arquivo: "catalogo/quatree/a.webp", nome: "Quatree Select Gatos Castrados", especie: "gato", largura: 400, altura: 600 },
    { arquivo: "catalogo/quatree/b.webp", nome: "Quatree Life Adultos", especie: "cao", largura: 400, altura: 600 }
  ] };
  const env = fakeEnv({ GEMINI_API_KEY: "", AI: fakeAI(), GEMINI_DAILY_CLIENTS: "quatree-dog" });
  const prompts = [], composed = [], forms = [];
  const r = await runGeminiCampaign(env, "quatree-dog", "2026-11-28", {
    client: { id: "quatree-dog", config: {} }, catalog, githubCaptions: async () => ({}),
    image: async (e, prompt) => { prompts.push(prompt); return { bytes: new Uint8Array([1]), mime: "image/png" }; },
    composeProduct: async (e, bytes, produto) => { composed.push(produto.nome); return new Uint8Array([2]); },
    upload: async (e, f) => { forms.push(f); }, now: new Date("2026-11-27T22:00:00Z")
  });
  assert.equal(r.sent.length, 4);
  assert.equal(composed.length, 4, "toda peça leva a embalagem real");
  assert.ok(prompts.every(p => !p.includes("{PET}") && /\b(dog|cat)\b/.test(p)));
  assert.ok(forms.every(f => f.get("fotoLimpa") === "1" && f.get("approval") === "cliente"));
});

test("embalagem real: Qualidy nunca entra e a embalagem cabe entre o título e o botão", async () => {
  const { pickProduct, productPlace } = await import("../src/packshot.js");
  const catalog = { adimax: [{ arquivo: "x", nome: "QUALIDY Cães Adultos" }, { arquivo: "y", nome: "MAGNUS Todo Dia" }] };
  for (let d = 0; d < 10; d++) for (let i = 0; i < 4; i++) assert.equal(pickProduct(catalog, "adimax", d, i).nome, "MAGNUS Todo Dia");
  const post = productPlace(false, { largura: 470, altura: 700 });
  assert.ok(post.top >= 420 && post.top + post.h <= 1120 && post.left + post.w <= 1080);
  const pequena = productPlace(false, { largura: 215, altura: 320 });
  assert.equal(pequena.h, 560, "post: no máximo 560 de altura");
  const story = productPlace(true, { largura: 470, altura: 700 });
  assert.ok(story.top + story.h <= 1250 && story.left > 540, "story: no canto de baixo à direita, acima do texto");
});
