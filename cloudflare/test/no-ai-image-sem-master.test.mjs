// 15/11/2026 (Rodrigo, urgente): o painel da Adimax recebeu um carrossel de 4 cartões gerados por IA.
// Regra: nenhum caminho do Nexus gera imagem ou carrossel por IA para cliente sem
// "Gerar imagem por IA sozinho" ligado no Master. Este teste falha se algum caminho pedir imagem à IA.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { generateFreeMedia, generateOriginalMedia } from "../src/media-generation.js";
import { runFormatBuilder } from "../src/format-builder.js";
import { replacePost, canCreateArt, WATCHER_DEPS } from "../src/post-watcher.js";
import { runGeminiCampaign } from "../src/gemini-campaign.js";
import { usesGeneratedImage, GENERATION_BLOCKED } from "../src/no-generation.js";
import { normalizeAgentCoreConfig } from "../src/agent-core.js";

const OFF = { id: "loja-sem-ia", name: "Loja", status: "online", config: {} };
const OFF_SAVED = { id: "loja-sem-ia", name: "Loja", status: "online", config: { agentCore: { enabled: true, aiImages: false } } };
const ADIMAX_ON = { id: "adimax-eduardo-soares", name: "Eduardo", status: "online", config: { agentCore: { aiImages: true } } };
const ON = { id: "loja-com-ia", name: "Loja", status: "online", config: { agentCore: { aiImages: true } } };
const BLOCKED_CLIENTS = [OFF, OFF_SAVED, ADIMAX_ON];

function database() {
  const db = new DatabaseSync(":memory:");
  for (const name of fs.readdirSync(new URL("../migrations/", import.meta.url)).sort()) {
    db.exec(fs.readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  }
  const DB = { prepare(sql) {
    const wrap = args => {
      const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
      return {
        first: async () => db.prepare(sql).get(parameters) || null,
        all: async () => ({ results: db.prepare(sql).all(parameters) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } })
      };
    };
    return { ...wrap([]), bind: (...args) => wrap(args) };
  } };
  return { db, DB };
}

// Qualquer pedido de imagem à IA cai aqui e é contado.
function spyEnv(extra = {}) {
  const calls = [];
  const env = {
    PUBLIC_BASE_URL: "https://nexus.test",
    NEXUS_IMAGE_GENERATION: "on",
    MEDIA: { put: async () => {}, get: async () => null },
    AI: { run: async (...args) => { calls.push(["AI.run", args[0]]); throw new Error("AI_CHAMADA_PROIBIDA"); } },
    ...extra
  };
  const spy = name => async () => { calls.push([name]); throw new Error("IA_CHAMADA_PROIBIDA"); };
  return { env, calls, spy };
}

test("padrão do Master: geração por IA desligada", () => {
  assert.equal(normalizeAgentCoreConfig({ id: "x", config: {} }).aiImages, false);
  assert.equal(normalizeAgentCoreConfig({ id: "x", config: { agentCore: { aiImages: true } } }).aiImages, true);
  for (const client of BLOCKED_CLIENTS) assert.equal(usesGeneratedImage(client), false, client.id);
  assert.equal(usesGeneratedImage(ON), true);
  // Robôs pausados no Master também desligam a geração.
  assert.equal(usesGeneratedImage({ ...ON, config: { agentCore: { aiImages: true, enabled: false } } }), false);
});

test("geradores (Creator, carrossel, capa de Reel, emergência): não pedem imagem à IA", async () => {
  for (const client of BLOCKED_CLIENTS) {
    const { env, calls, spy } = spyEnv();
    const options = { freeImage: spy("freeImage"), request: spy("openai") };
    await assert.rejects(generateFreeMedia(env, client, "p1", "", options), new RegExp(GENERATION_BLOCKED));
    await assert.rejects(generateOriginalMedia(env, client, "p2", "", options), new RegExp(GENERATION_BLOCKED));
    await assert.rejects(generateOriginalMedia({ ...env, NEXUS_IMAGE_GENERATION: "" }, client, "p3", "", options), new RegExp(GENERATION_BLOCKED));
    assert.deepEqual(calls, [], client.id);
  }
});

test("Format Builder: carrossel esperando aprovação não ganha cartões da IA", async () => {
  for (const client of BLOCKED_CLIENTS) {
    const { db, DB } = database();
    const { env, calls } = spyEnv({ DB });
    const payload = {
      imageUrl: "https://nexus.test/media/posts/x/upload-feed-1/imagem.jpg",
      creativeFeatures: { requestedFormat: "carousel" },
      qualityGates: { copyChief: "approved", designer: "approved" }
    };
    db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES(?,?,'online',?)").run(client.id, client.name, JSON.stringify(client.config));
    db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES('c1',?,'2026-11-16T20:13:00.000Z','17:00','ready','pending','','x','','',0,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .run(client.id, JSON.stringify(payload));
    const out = await runFormatBuilder(env, client, { trigger: "teste" });
    assert.deepEqual(calls, [], client.id);
    assert.equal(out.built, 0);
    const saved = JSON.parse(db.prepare("SELECT payload_json AS p FROM post_ledger WHERE id='c1'").get().p);
    assert.equal(saved.formatBuild, undefined, "o post fica como estava");
  }
});

test("Vigia (troca de post com erro) e Criar com agente: não pedem imagem à IA", async () => {
  for (const client of BLOCKED_CLIENTS) {
    const { DB } = database();
    const { env, calls, spy } = spyEnv({ DB });
    const deps = {
      ...WATCHER_DEPS,
      image: spy("cloudflareImage"), hasText: async () => false, zonesBlocked: async () => false,
      compose: spy("compose"), brand: async () => ({ buttonWord: "QUERO", colors: {} }),
      loadFrames: async () => null, library: async () => null, campaignArt: async () => null,
      caption: async () => "x", send: async () => {}, title: async () => "x", fetch: spy("github")
    };
    assert.equal(await canCreateArt(env, client, deps), false, client.id);
    const row = { id: "r1", client_id: client.id, scheduled_for: "2026-11-16T20:13:00.000Z", status: "ready", caption: "" };
    const out = await replacePost(env, client, row, { creativeFeatures: { requestedFormat: "post" } }, "imagem_ausente", new Date("2026-11-16T18:00:00Z"), deps);
    assert.equal(out.replaced, false);
    assert.deepEqual(calls, [], client.id);
  }
});

test("Campanha diária: não pede foto à IA", async () => {
  for (const client of BLOCKED_CLIENTS) {
    const { DB } = database();
    const { env, calls, spy } = spyEnv({ DB, GEMINI_API_KEY: "x" });
    await assert.rejects(
      runGeminiCampaign(env, "giltec", "2026-11-16", {
        client: { ...client, id: "giltec-teste-" + client.id }, image: spy("image"), upload: spy("upload"),
        githubCaptions: async () => ({}), compose: spy("compose"), fetcher: spy("fetch"), now: new Date("2026-11-16T09:00:00Z")
      }),
      new RegExp(GENERATION_BLOCKED)
    );
    assert.deepEqual(calls, [], client.id);
  }
});

// Varredura do código: todo arquivo que chama um gerador de imagem precisa passar pela trava.
// Se alguém criar um caminho novo de geração, este teste falha até a trava ser posta e o arquivo revisado.
const GENERATORS = /\b(generateOriginalMedia|generateFreeMedia|cloudflareImage|generateImage)\s*\(|\bdeps\.image\s*\(|\bdeps\.generate\s*\(/;
const REVIEWED = {
  "agent-runtime.js": "Creator: só roda com usesGeneratedImage; geradores travam por dentro",
  "emergency-publisher.js": "usa generateOriginalMedia, que trava por dentro",
  "format-builder.js": "carrossel bloqueado em runFormatBuilder; geradores travam por dentro",
  "gemini-campaign.js": "runGeminiCampaign confere usesGeneratedImage antes das fotos; testOneImage é teste sem cliente e não salva nada",
  "index.js": "/api/master/foto exige clientId com a opção ligada",
  "media-generation.js": "assertGeneratedImageAllowed no começo dos dois geradores",
  "post-watcher.js": "generate() e canCreateArt() conferem usesGeneratedImage"
};

test("varredura: nenhum caminho novo gera imagem sem a trava", () => {
  const dir = new URL("../src/", import.meta.url);
  const found = [];
  for (const name of fs.readdirSync(dir).filter(n => n.endsWith(".js"))) {
    const code = fs.readFileSync(new URL(name, dir), "utf8")
      .split("\n").filter(line => !/^\s*(export\s+)?(async\s+)?function\s/.test(line)).join("\n");
    if (GENERATORS.test(code)) found.push(name);
  }
  const unknown = found.filter(name => !REVIEWED[name]);
  assert.deepEqual(unknown, [], "caminho de geração sem revisão da trava: " + unknown.join(", "));
  // Quem chama a IA direto (sem passar por generateOriginalMedia/generateFreeMedia, que travam por dentro) precisa da trava.
  const RAW = /\b(cloudflareImage|generateImage)\s*\(|\bdeps\.image\s*\(/;
  for (const name of found) {
    if (name === "index.js") continue;
    const code = fs.readFileSync(new URL(name, dir), "utf8")
      .split("\n").filter(line => !/^\s*(export\s+)?(async\s+)?function\s/.test(line)).join("\n");
    if (!RAW.test(code) && name !== "media-generation.js") continue;
    assert.match(code, /from "\.\/no-generation\.js"/, name + " precisa usar a trava de no-generation.js");
  }
  const index = fs.readFileSync(new URL("index.js", dir), "utf8");
  const route = index.slice(index.indexOf('url.pathname === "/api/master/foto"'));
  assert.ok(route.indexOf("usesGeneratedImage(fotoClient)") > 0 && route.indexOf("usesGeneratedImage(fotoClient)") < route.indexOf("cloudflareImage("), "a rota de foto confere a opção antes de gerar");
});
