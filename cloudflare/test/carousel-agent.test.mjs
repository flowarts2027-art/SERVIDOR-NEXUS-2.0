import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  validateCarouselPlan, planMarketingCarousel, charCount, photoBrief, renderCards,
  CAROUSEL_AGENT_VERSION, MARKETING_AGENT_INSTRUCTIONS
} from "../src/carousel-agent.js";
import { buildVisualPrompt } from "../src/media-generation.js";
import { buildAgentCarousel, handleCarouselRenderCallback, usesMarketingAgent } from "../src/format-builder.js";

const FICHA = "Brazilian salon owner, about 38, curly dark hair in a low bun, white T-shirt, light blue apron; bright white salon, light wood mirror, light blue chairs, warm light from the left.";

function goodPlan() {
  return {
    ficha_continuidade: FICHA,
    cartoes: [
      { numero: 1, papel: "gancho", titulo_linha1: "Você cuida do salão.", titulo_linha2: "E quem cuida dos seus posts?", rodape: "Arraste para o lado", cena: "The owner brushes a client's long hair at the styling station, focused on the service." },
      { numero: 2, papel: "dor", titulo_linha1: "O atendimento terminou.", titulo_linha2: "E os posts ficaram pra depois.", rodape: "A rotina pesa por aí?", cena: "The owner sits tired at the empty station, chin on hand, looking at her phone lying on the counter." },
      { numero: 3, papel: "solucao", titulo_linha1: "Flow Arts cria os posts.", titulo_linha2: "Com a cara do seu salão.", rodape: "Conteúdo para o seu negócio", cena: "The owner holds a small tablet showing three photos of her own salon, relieved smile." },
      { numero: 4, papel: "como_funciona", titulo_linha1: "Você aprova os posts.", titulo_linha2: "A Flow publica para você.", rodape: "Nada sai sem o seu OK", cena: "Over-the-shoulder view: the owner taps a hairstyle photo on her phone screen, calm nod." },
      { numero: 5, papel: "chamada", titulo_linha1: "Quer isso no seu salão?", titulo_linha2: "Fale com a Flow Arts.", rodape: "Vamos conversar sobre seu salão", cena: "The owner looks at the camera with a warm smile, pointing down with her right index finger." }
    ]
  };
}

test("conferência do plano aprova um plano bom e conta acentos como 1 letra", () => {
  const r = validateCarouselPlan(goodPlan());
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.equal(charCount("Você cuida do salão."), 20);
  assert.equal(r.plan.cartoes.length, 5);
});

test("conferência do plano reprova título longo, número, promessa e 'Comente QUERO' repetido", () => {
  const p = goodPlan();
  p.cartoes[0].titulo_linha1 = "Deixe toda a comunicação do seu negócio com a gente";
  p.cartoes[1].titulo_linha2 = "Dobre suas vendas em 30 dias";
  p.cartoes[2].titulo_linha2 = "Clientes garantidos";
  p.cartoes[4].titulo_linha2 = "Comente QUERO";
  const r = validateCarouselPlan(p);
  assert.equal(r.ok, false);
  const all = r.errors.join(" | ");
  assert.match(all, /cartão 1: linha 1 com \d+ caracteres/);
  assert.match(all, /cartão 2: não use números/);
  assert.match(all, /cartão 2: não prometa dobrar/);
  assert.match(all, /cartão 3: não prometa garantia/);
  assert.match(all, /cartão 5: não repita "Comente QUERO"/);
});

test("conferência do plano exige 5 cartões na ordem dos papéis", () => {
  const p = goodPlan();
  p.cartoes = p.cartoes.slice(0, 4);
  assert.match(validateCarouselPlan(p).errors.join(" "), /exatamente 5 cartões/);
  const q = goodPlan();
  q.cartoes[1].papel = "solucao";
  assert.match(validateCarouselPlan(q).errors.join(" "), /cartão 2: papel deve ser dor/);
});

test("agente pede correção uma vez quando a IA erra e recebe nicho, tema e legenda", async () => {
  const calls = [];
  const bad = goodPlan(); bad.cartoes[0].titulo_linha1 = "Uma linha muito longa demais para caber aqui";
  const request = async (env, clientId, body) => {
    calls.push(body);
    return { output_text: JSON.stringify(calls.length === 1 ? bad : goodPlan()) };
  };
  const plan = await planMarketingCarousel({}, { id: "primeiro-teste" },
    { nicheId: "salao", creativeFeatures: { theme: "Instagram parado" } },
    { request, caption: "Legenda sobre o salão" });
  assert.equal(calls.length, 2);
  assert.equal(plan.version, CAROUSEL_AGENT_VERSION);
  assert.match(calls[0].input, /Nicho \(público comprador\): salão de beleza/);
  assert.match(calls[0].input, /Tema do post: Instagram parado/);
  assert.match(calls[0].input, /Legenda do post .*Legenda sobre o salão/);
  assert.match(calls[1].input, /Corrija: cartão 1: linha 1/);
  assert.equal(calls[0].text.format.strict, true);
  assert.match(MARKETING_AGENT_INSTRUCTIONS, /NÃO repete "Comente QUERO"/);
});

test("agente desiste depois de 2 respostas reprovadas (não gasta imagem com plano ruim)", async () => {
  const bad = goodPlan(); bad.cartoes[2].titulo_linha1 = "Lucro garantido 100%";
  const request = async () => ({ output_text: JSON.stringify(bad) });
  await assert.rejects(planMarketingCarousel({}, { id: "primeiro-teste" }, {}, { request }), /carousel_plan_invalid/);
});

test("foto do carrossel do agente: sem título escrito, sem estilo sorteado, telas só com fotos", () => {
  const plan = validateCarouselPlan(goodPlan()).plan;
  const prompt = buildVisualPrompt({ id: "primeiro-teste", name: "Flow Arts" }, photoBrief(plan, 1), "seed", {
    contentFormat: "carousel", photoOnly: true, nicheId: "salao", title: "Isto não pode virar texto"
  });
  assert.doesNotMatch(prompt, /Write exactly this headline/);
  assert.doesNotMatch(prompt, /Art direction \(/);
  assert.doesNotMatch(prompt, /real-looking Instagram feed/);
  assert.match(prompt, /PHOTO ONLY: absolutely no text/);
  assert.match(prompt, /show only real photos of this business/);
  assert.match(prompt, /Continuity sheet/);
  assert.match(prompt, /O atendimento terminou\. E os posts ficaram pra depois\./);
  // Sem photoOnly, o comportamento antigo continua.
  const old = buildVisualPrompt({ id: "primeiro-teste", name: "Flow Arts" }, "x", "seed", { contentFormat: "post", title: "Seu perfil está parado?" });
  assert.match(old, /Write exactly this headline/);
});

function sqliteDB() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, status TEXT, approval_status TEXT, caption TEXT, error TEXT, payload_json TEXT, updated_at TEXT)");
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, DB };
}

test("Format Builder com o agente: plano → 5 fotos revisadas (refaz a reprovada) → manda para o GitHub", async () => {
  const { db, DB } = sqliteDB();
  const payload = { nicheId: "salao", creativeFeatures: { requestedFormat: "carousel", theme: "Instagram parado" }, qualityGates: { copyChief: "approved", designer: "approved" } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,approval_status,caption,payload_json) VALUES('p1','primeiro-teste','ready','pending','Legenda',?)").run(JSON.stringify(payload));
  let reviews = 0;
  const request = async (env, clientId, body) => {
    if (body.nexusPurpose === "carousel-plan") return { output_text: JSON.stringify(goodPlan()) };
    reviews++;
    const reject = reviews === 2; // a 1ª foto do cartão 2 tem texto escrito
    return { output_text: JSON.stringify({ semTexto: !reject, combinaComTitulo: true, combinaComNicho: true, anatomiaOk: true, pessoaInteira: true, qualityScore: 82, motivo: reject ? "tem letras na tela" : "ok" }) };
  };
  const generated = [];
  const generate = async (env, client, id, brief, options) => {
    assert.equal(options.photoOnly, true);
    generated.push(id);
    return { url: "https://servidor-nexus.diamantehinode2015.workers.dev/media/posts/primeiro-teste/p1/" + generated.length + ".jpg", costUsd: 0.06 };
  };
  let dispatched = null;
  const fetchMock = async (url, init) => { dispatched = { url, body: JSON.parse(init.body) }; return new Response(null, { status: 204 }); };
  const env = { DB, GITHUB_ACTIONS_TOKEN: "t", PUBLIC_BASE_URL: "https://servidor-nexus.diamantehinode2015.workers.dev" };
  const row = { id: "p1", caption: "Legenda" };
  const build = await buildAgentCarousel(env, { id: "primeiro-teste", name: "Flow Arts" }, row, payload, { request, generate, fetch: fetchMock });

  assert.equal(build.status, "rendering");
  assert.equal(build.carouselTemplateVersion, CAROUSEL_AGENT_VERSION);
  assert.equal(generated.length, 6, "5 fotos + 1 refeita");
  assert.equal(build.agent.photos[1].attempts, 2);
  assert.ok(build.agent.photos.every(p => p.status === "approved"));
  assert.equal(dispatched.body.event_type, "carousel-card-render");
  const cards = JSON.parse(dispatched.body.client_payload.cards);
  assert.equal(cards.length, 5);
  assert.deepEqual(Object.keys(cards[0]), ["n", "l1", "l2", "rodape", "photo"]);
  assert.equal(cards[0].l1, "Você cuida do salão.");
  assert.equal(cards[1].photo.endsWith("/3.jpg"), true, "cartão 2 usa a foto refeita");
  assert.equal(dispatched.body.client_payload.callback_url, "https://servidor-nexus.diamantehinode2015.workers.dev/api/internal/carousel-render/upload");
  // O progresso fica salvo (não paga as fotos de novo se a rodada cair).
  const saved = JSON.parse(db.prepare("SELECT payload_json FROM post_ledger WHERE id='p1'").get().payload_json);
  assert.equal(saved.formatBuild.agent.photos.length, 5);
});

test("Format Builder com o agente: revisão sem resposta não gera outra foto", async () => {
  const { db, DB } = sqliteDB();
  const payload = { creativeFeatures: { requestedFormat: "carousel" } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,payload_json) VALUES('p2','primeiro-teste','ready',?)").run(JSON.stringify(payload));
  const request = async (env, clientId, body) => {
    if (body.nexusPurpose === "carousel-plan") return { output_text: JSON.stringify(goodPlan()) };
    throw new Error("openai_visual_budget_reserved");
  };
  let generated = 0;
  const generate = async () => { generated++; return { url: "https://x/media/posts/a.jpg" }; };
  const build = await buildAgentCarousel({ DB, PUBLIC_BASE_URL: "https://x" }, { id: "primeiro-teste" }, { id: "p2" }, payload, { request, generate, fetch: async () => { throw new Error("não deveria despachar"); } });
  assert.equal(build.status, "building");
  assert.equal(build.waiting, "photo_review_unavailable");
  assert.equal(generated, 1);
  // Próxima rodada: revisa a mesma foto, sem pagar outra.
  const again = await buildAgentCarousel({ DB, PUBLIC_BASE_URL: "https://x" }, { id: "primeiro-teste" }, { id: "p2" }, { ...payload, formatBuild: build }, { request, generate, fetch: async () => { throw new Error("x"); } });
  assert.equal(again.waiting, "photo_review_unavailable");
  assert.equal(generated, 1);
});

test("Format Builder com o agente: para depois de 3 fotos reprovadas no mesmo cartão", async () => {
  const { db, DB } = sqliteDB();
  const payload = { creativeFeatures: { requestedFormat: "carousel" } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,payload_json) VALUES('p3','primeiro-teste','ready',?)").run(JSON.stringify(payload));
  const request = async (env, clientId, body) => body.nexusPurpose === "carousel-plan"
    ? { output_text: JSON.stringify(goodPlan()) }
    : { output_text: JSON.stringify({ semTexto: false, combinaComTitulo: true, combinaComNicho: true, anatomiaOk: true, pessoaInteira: true, qualityScore: 80, motivo: "letras na parede" }) };
  let generated = 0;
  const generate = async () => { generated++; return { url: "https://x/media/posts/" + generated + ".jpg" }; };
  await assert.rejects(buildAgentCarousel({ DB, PUBLIC_BASE_URL: "https://x" }, { id: "primeiro-teste" }, { id: "p3" }, payload, { request, generate }), /carousel_photo_rejected_card_1:letras na parede/);
  assert.equal(generated, 3);
});

test("retorno do GitHub: guarda cada cartão e aprova com os 5", async () => {
  const { db, DB } = sqliteDB();
  const payload = { formatBuild: { status: "rendering", kind: "carousel", callbackToken: "tok", carouselTemplateVersion: CAROUSEL_AGENT_VERSION } };
  db.prepare("INSERT INTO post_ledger(id,client_id,status,payload_json) VALUES('p4','primeiro-teste','ready',?)").run(JSON.stringify(payload));
  const stored = [];
  const env = { DB, PUBLIC_BASE_URL: "https://n", MEDIA: { put: async (key) => { stored.push(key); } } };
  const put = (n, token = "tok", type = "image/jpeg") => handleCarouselRenderCallback(new Request("https://n/api/internal/carousel-render/upload", {
    method: "PUT", body: new Uint8Array([1, 2, 3]),
    headers: { "content-type": type, "content-length": "3", "x-nexus-post-id": "p4", "x-nexus-client-id": "primeiro-teste", "x-nexus-callback-token": token, "x-nexus-card-index": String(n) }
  }), env, new URL("https://n/api/internal/carousel-render/upload"));
  assert.equal((await put(1, "errado")).status, 401);
  assert.equal((await put(1, "tok", "text/html")).status, 415);
  assert.equal((await put(9)).status, 400);
  for (let n = 1; n <= 4; n++) assert.equal((await put(n)).status, 201);
  let saved = JSON.parse(db.prepare("SELECT payload_json FROM post_ledger WHERE id='p4'").get().payload_json);
  assert.equal(saved.formatBuild.status, "rendering");
  const last = await (await put(5)).json();
  assert.equal(last.complete, true);
  saved = JSON.parse(db.prepare("SELECT payload_json FROM post_ledger WHERE id='p4'").get().payload_json);
  assert.equal(saved.formatBuild.status, "approved");
  assert.equal(saved.formatBuild.carouselUrls.length, 5);
  assert.equal(saved.formatBuild.callbackToken, undefined);
  assert.equal(saved.qualityGates.formatBuilder, "approved");
  assert.match(saved.formatBuild.carouselUrls[0], /^https:\/\/n\/media\/posts\/primeiro-teste\/p4\/carousel-card-1-/);
  assert.equal(stored.length, 5);
});

test("agente vale só para marca com perfil e pode ser desligado", () => {
  assert.equal(usesMarketingAgent({}, { id: "primeiro-teste" }), true);
  assert.equal(usesMarketingAgent({ NEXUS_CAROUSEL_AGENT: "false" }, { id: "primeiro-teste" }), false);
  assert.equal(usesMarketingAgent({}, { id: "cliente-qualquer" }), false);
});

test("worker liga o retorno do carrossel e o workflow só aceita fotos do Nexus", () => {
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /handleCarouselRenderCallback\(request, env, url\)/);
  const wf = fs.readFileSync(new URL("../../.github/workflows/carousel-card-render.yml", import.meta.url), "utf8");
  assert.match(wf, /types: \[carousel-card-render\]/);
  assert.match(wf, /\/api\/internal\/carousel-render\/upload\) ;; \*\) exit 1/);
  assert.match(wf, /media\/posts\/\*\) ;; \*\) echo "foto fora do Nexus"; exit 1/);
  assert.match(wf, /render_carousel\.py/);
  assert.ok(fs.existsSync(new URL("../../scripts/social/fonts/InterDisplay-ExtraBold.otf", import.meta.url)));
  assert.ok(fs.existsSync(new URL("../../public/brand/flowarts-symbol.webp", import.meta.url)));
  assert.deepEqual(renderCards(validateCarouselPlan(goodPlan()).plan, ["a", "b", "c", "d", "e"]).map(c => c.photo), ["a", "b", "c", "d", "e"]);
});

test("botão de teste: cria carrossel que o Format Builder monta, mas ninguém publica nem o cliente vê", async () => {
  const { createCarouselTest, carouselTestStatus } = await import("../src/format-builder.js");
  const { db, DB } = sqliteDB();
  db.exec("ALTER TABLE post_ledger ADD COLUMN created_at TEXT; ALTER TABLE post_ledger ADD COLUMN scheduled_for TEXT;");
  const out = await createCarouselTest({ DB }, { id: "primeiro-teste" }, { nicheId: "pet-shop", theme: "Teste" });
  assert.match(out.id, /^carousel-test:/);
  const row = db.prepare("SELECT status, approval_status, payload_json FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.status, "carousel_test");
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.creativeFeatures.requestedFormat, "carousel");
  assert.equal(payload.qualityGates.designer, "approved");
  const status = await carouselTestStatus({ DB }, "primeiro-teste", out.id);
  assert.equal(status.status, "waiting");
  await assert.rejects(createCarouselTest({ DB }, { id: "cliente-sem-perfil" }, {}), /carousel_agent_not_enabled/);

  const fb = fs.readFileSync(new URL("../src/format-builder.js", import.meta.url), "utf8");
  assert.match(fb, /OR status='carousel_test'\)/);
  const portal = fs.readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  assert.match(portal, /COALESCE\(status,''\) <> 'carousel_test'/);
  for (const file of ["../src/executor.js", "../src/scheduler.js", "../src/posts.js"]) {
    assert.doesNotMatch(fs.readFileSync(new URL(file, import.meta.url), "utf8"), /carousel_test/, file + " não pode publicar teste");
  }
  const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
  assert.match(master, /\/api\/master\/carousel-test/);
});
