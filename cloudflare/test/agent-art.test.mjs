import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { agentSlot, createAgentArt } from "../src/agent-art.js";
import { buildMissingPostsBoard, dayGap, postProblem } from "../src/missing-posts.js";
import { finishComposedArt } from "../src/post-watcher.js";

const NOW = new Date("2026-11-06T12:00:00.000Z"); // 9h em Brasília
const DAY = "2026-11-07";
const publicFile = name => readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

function jpeg(width, height) {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255]);
  return b;
}

function fakeEnv(clients = ["primeiro-teste"]) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  for (const id of clients) db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES(?,?,'Moda','@x','online','{}')").run(id, id);
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const stored = new Map();
  const MEDIA = { async put(key, body) { stored.set(key, body); } };
  return { db, stored, env: { DB, MEDIA, PUBLIC_BASE_URL: "https://x.test" } };
}

function deps(extra = {}) {
  const calls = { image: 0, library: 0 };
  const frames = { clientes: { "primeiro-teste": { feed: [{ arquivo: "a/f.png" }], story: [{ arquivo: "a/s.png" }] }, "maskara-assessoria": { feed: [{ arquivo: "a/f.png" }], story: [{ arquivo: "a/s.png" }] } } };
  return { calls, overrides: {
    loadFrames: async () => frames,
    image: async (env, prompt, aspect) => { calls.image += 1; calls.prompt = prompt; return { bytes: aspect === "9:16" ? jpeg(1008, 1792) : jpeg(1024, 1280) }; },
    hasText: async () => false,
    zonesBlocked: async () => false,
    compose: async (env, bytes, frame, { story }) => story ? jpeg(1080, 1920) : jpeg(1080, 1350),
    brand: async () => null,
    caption: async () => "Legenda pronta",
    send: async () => {},
    ...extra
  } };
}

const rows = db => db.prepare("SELECT * FROM post_ledger ORDER BY scheduled_for").all().map(row => ({ ...row, payload: JSON.parse(row.payload_json) }));

test("quadro: problema de hoje com horário vencido sai, e o que ainda vem fica", () => {
  const client = { id: "a", name: "A" };
  const board = buildMissingPostsBoard([client], [
    { client_id: "a", scheduled_for: "2026-11-06T11:00:00.000Z", format: "post", status: "ready", error: "media_generation_required" },
    { client_id: "a", scheduled_for: "2026-11-06T20:00:00.000Z", format: "post", status: "ready", error: "media_generation_required" }
  ], NOW);
  const problems = board.items.filter(item => item.kind === "problem");
  assert.equal(problems.length, 1);
  assert.match(problems[0].text, /Hoje 17:00/);
});

test("quadro: depois das 21h mostra só amanhã e depois de amanhã", () => {
  const late = new Date("2026-11-07T00:00:00.000Z"); // 21h do dia 06
  const client = { id: "a", name: "A" };
  const before = buildMissingPostsBoard([client], [], new Date("2026-11-06T23:59:00.000Z"));
  assert.ok(before.items.some(item => item.day === "Hoje"), "às 20h59 hoje ainda aparece");
  const board = buildMissingPostsBoard([client], [
    { client_id: "a", scheduled_for: "2026-11-07T00:50:00.000Z", format: "post", status: "ready", error: "media_generation_required" }
  ], late);
  assert.deepEqual([...new Set(board.items.map(item => item.day))], ["Amanhã", "Depois de amanhã"].filter(day => board.items.some(item => item.day === day)));
  assert.ok(!board.items.some(item => item.day === "Hoje"));
  assert.equal(board.items.filter(item => item.kind === "missing").length, 2);
});

test("quadro: post de amanhã sem substituta continua urgente depois das 21h, com o dia certo no link", () => {
  const late = new Date("2026-11-07T00:30:00.000Z");
  const board = buildMissingPostsBoard([{ id: "a", name: "A" }], [
    { client_id: "a", scheduled_for: "2026-11-07T14:00:00.000Z", format: "post", status: "ready", replace_failed: "x" }
  ], late);
  const line = board.items.find(item => item.kind === "problem");
  assert.equal(line.dayIndex, 0);
  assert.equal(line.date, "2026-11-07");
});

test("quadro: cada linha leva o dia, e o botão aparece só para quem pode, com no máximo 2", () => {
  const clients = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  const posts = [
    { client_id: "a", scheduled_for: "2026-11-07T12:00:00.000Z", format: "post", status: "scheduled" },
    { client_id: "a", scheduled_for: "2026-11-07T12:05:00.000Z", format: "story", status: "scheduled" },
    { client_id: "a", scheduled_for: "2026-11-07T22:00:00.000Z", format: "post", status: "scheduled" }
  ];
  const board = buildMissingPostsBoard(clients, posts, NOW, new Set(["a"]));
  const line = (id, date) => board.items.find(item => item.clientId === id && item.date === date);
  assert.equal(line("a", "2026-11-06").agent, 2, "faltam 4, cria 2");
  assert.equal(line("a", "2026-11-07").agent, 1, "falta 1, cria 1");
  assert.equal(line("b", "2026-11-06").agent, 0);
});

test("horário: 9h e 19h no minuto do cliente, story 5 minutos depois", () => {
  assert.equal(agentSlot(DAY, 40, false, new Set(), NOW), "2026-11-07T12:40:00.000Z");
  assert.equal(agentSlot(DAY, 40, true, new Set(), NOW), "2026-11-07T12:45:00.000Z");
  const taken = new Set([Date.parse("2026-11-07T12:40:00.000Z")]);
  assert.equal(agentSlot(DAY, 40, false, taken, NOW), "2026-11-07T22:40:00.000Z");
});

test("horário: hoje só vale o que ainda vem, e sem hora livre não inventa", () => {
  assert.equal(agentSlot("2026-11-06", 0, false, new Set(), new Date("2026-11-06T18:00:00.000Z")), "2026-11-06T22:00:00.000Z");
  assert.equal(agentSlot("2026-11-06", 0, false, new Set(), new Date("2026-11-06T23:30:00.000Z")), "2026-11-07T00:00:00.000Z");
  assert.equal(agentSlot("2026-11-06", 0, false, new Set(), new Date("2026-11-06T23:50:00.000Z")), "", "falta menos de 30 minutos");
});

test("cria 1 post e 1 story, aprovados, no tamanho certo e com o selo do agente", async () => {
  const { db, env, stored } = fakeEnv();
  const { calls, overrides } = deps();
  const first = await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  const second = await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  assert.deepEqual([first.ok, first.format, first.left], [true, "post", 3]);
  assert.deepEqual([second.ok, second.format, second.left], [true, "story", 2]);
  const [post, story] = rows(db);
  assert.equal(post.scheduled_for, "2026-11-07T12:00:00.000Z");
  assert.equal(story.scheduled_for, "2026-11-07T12:05:00.000Z");
  for (const row of [post, story]) {
    assert.equal(row.status, "scheduled");
    assert.equal(row.approval_status, "approved");
    assert.equal(row.error, "");
    assert.ok(row.payload.createdByAgent.at);
    assert.equal(row.payload.createdByAgent.source, "cloudflare-workers-ai");
    assert.equal(row.payload.autoReplaced, undefined);
    assert.equal(row.payload.visualReview.reason, "Criada pelo agente");
  }
  assert.equal(post.caption, "Legenda pronta");
  assert.equal(story.caption, "");
  assert.equal(calls.image, 2);
  assert.match(calls.prompt, /Do not write any text/);
  const sizes = [...stored.values()].map(bytes => (bytes[9] << 8 | bytes[10]) + "x" + (bytes[7] << 8 | bytes[8]));
  assert.deepEqual(sizes, ["1080x1350", "1080x1920"]);
});

test("o resto continua como falta, e dia completo não cria mais", async () => {
  const { db, env } = fakeEnv();
  const { overrides } = deps();
  for (let i = 0; i < 2; i++) await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  const left = dayGap(db.prepare("SELECT client_id,scheduled_for,status,approval_status,error,json_extract(payload_json,'$.creativeFeatures.requestedFormat') AS format FROM post_ledger").all(), NOW);
  assert.deepEqual(left, { posts: 1, stories: 1 });
  for (let i = 0; i < 2; i++) assert.equal((await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides)).ok, true);
  const full = await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  assert.equal(full.error, "agent_complete");
  assert.equal(rows(db).length, 4);
  assert.equal(new Set(rows(db).map(row => row.scheduled_for)).size, 4, "nenhum horário repetido");
});

test("gerador falhou: nada fica gravado, e a Biblioteca não entra no lugar", async () => {
  const { db, env } = fakeEnv();
  const { overrides } = deps({ image: async () => { throw new Error("limite grátis"); } });
  const out = await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  assert.equal(out.ok, false);
  assert.equal(out.error, "agent_failed");
  assert.equal(out.message, "Não consegui criar agora. Tente de novo.");
  assert.equal(rows(db).length, 0);
});

test("imagem com texto escrito pela IA é descartada", async () => {
  const { db, env } = fakeEnv();
  const { overrides } = deps({ hasText: async () => true });
  assert.equal((await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides)).reason, "generated_has_text");
  assert.equal(rows(db).length, 0);
});

test("não cria para Daniela, Quatree, Adimax, GILTEC, cliente pausado nem sem camada de texto", async () => {
  const ids = ["daniela-martins", "quatree-dog", "quatree-dog-eduardo", "adimax", "giltec", "giltec-locacoes", "nexus-ai"];
  const { db, env } = fakeEnv(ids);
  db.prepare("UPDATE clients SET config_json=? WHERE id='giltec-locacoes'").run(JSON.stringify({ group: { id: "giltec", vendor: "Sheila" } }));
  const { calls, overrides } = deps({ brand: async () => ({ buttonWord: "QUERO", colors: {} }), loadFrames: async () => ({ clientes: {} }) });
  for (const id of ids.filter(id => id !== "nexus-ai")) assert.equal((await createAgentArt(env, id, DAY, NOW, overrides)).error, "agent_client", id);
  const { overrides: noBrand } = deps({ loadFrames: async () => ({ clientes: {} }) });
  assert.equal((await createAgentArt(env, "nexus-ai", DAY, NOW, noBrand)).error, "agent_client");
  assert.equal(calls.image, 0);
  assert.equal(rows(db).length, 0);
});

test("dia fora do quadro e cliente fora do ar são recusados", async () => {
  const { db, env } = fakeEnv();
  const { overrides } = deps();
  for (const day of ["2026-11-05", "2026-11-09", "ontem", ""]) assert.equal((await createAgentArt(env, "primeiro-teste", day, NOW, overrides)).error, "agent_date", day);
  db.prepare("UPDATE clients SET status='setup'").run();
  assert.equal((await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides)).error, "agent_client");
});

test("marca salva: monta no GitHub, conta como no caminho e volta com o selo do agente", async () => {
  const { db, env } = fakeEnv();
  env.GITHUB_ACTIONS_TOKEN = "t";
  const sent = [];
  const brand = { buttonWord: "QUERO", logoUrl: "", colors: { accent: "#000000", onAccent: "#ffffff" } };
  const { overrides } = deps({
    brand: async () => brand,
    title: async () => ["a", "b", "c"],
    fetch: async (url, options) => { sent.push(JSON.parse(options.body)); return new Response(null, { status: 200 }); }
  });
  const out = await createAgentArt(env, "primeiro-teste", DAY, NOW, overrides);
  assert.equal(out.pending, true);
  assert.equal(sent[0].client_payload.button, "COMENTE QUERO");
  const [row] = rows(db);
  assert.equal(postProblem({ status: "ready", error: row.error, compose_at: row.payload.autoReplacePending.at }, NOW), "");
  assert.equal(postProblem({ status: "ready", error: row.error, compose_at: row.payload.autoReplacePending.at }, new Date(NOW.getTime() + 21 * 60000)), "sem imagem");
  const done = await finishComposedArt(env, row.id, sent[0].client_payload.callback_token, jpeg(1080, 1350), NOW, overrides);
  assert.equal(done.status, 200);
  const [final] = rows(db);
  assert.equal(final.status, "scheduled");
  assert.equal(final.approval_status, "approved");
  assert.ok(final.payload.createdByAgent.at);
  assert.equal(final.payload.autoReplaced, undefined);
});

// O quadro "Postagens faltando" saiu do Master a pedido do Rodrigo em 11/11/2026.
test("telas: selo no painel do cliente e página em 2 posts + 2 stories", () => {
  assert.doesNotMatch(publicFile("app.js"), /Criar com agente/);
  assert.match(publicFile("client-lite.js"), /Criada pelo agente/);
  assert.match(publicFile("artes.html"), /2 posts \+ 2 stories/);
  assert.doesNotMatch(publicFile("artes.html"), /3 primeiras/);
  assert.match(publicFile("artes.js"), /get\("dia"\)/);
});
