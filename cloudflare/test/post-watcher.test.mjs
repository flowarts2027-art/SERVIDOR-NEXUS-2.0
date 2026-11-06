import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { isWatcherMinute, replacementReason, runPostWatcher, targetFormat, receivesGeneratedImage } from "../src/post-watcher.js";
import { takeLibraryArt } from "../src/art-library.js";
import { buildMissingPostsBoard, postProblem } from "../src/missing-posts.js";

const NOW = new Date("2026-11-06T12:00:00.000Z");
const AT = "2026-11-06T14:10:00.000Z";

function jpeg(width, height) {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255]);
  return b;
}

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE clients(id TEXT PRIMARY KEY,name TEXT,niche TEXT,instagram TEXT,status TEXT,config_json TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE post_ledger(id TEXT PRIMARY KEY,client_id TEXT,scheduled_for TEXT,status TEXT,approval_status TEXT,error TEXT,caption TEXT,payload_json TEXT,updated_at TEXT);
    CREATE TABLE nexus_state(namespace TEXT,item_key TEXT,client_id TEXT DEFAULT '',value_json TEXT,updated_at TEXT,PRIMARY KEY(namespace,item_key,client_id));
  `);
  const prepare = sql => {
    const statement = db.prepare(sql.replace(/\?(\d+)/g, "?"));
    const order = [...sql.matchAll(/\?(\d+)/g)].map(match => Number(match[1]) - 1);
    let args = [];
    const values = () => order.map(index => args[index]);
    return {
      bind(...input) { args = input; return this; },
      async first() { return statement.get(...values()) || null; },
      async all() { return { results: statement.all(...values()) }; },
      async run() { return { meta: { changes: Number(statement.run(...values()).changes) } }; }
    };
  };
  const stored = new Map();
  const env = {
    PUBLIC_BASE_URL: "https://x.test",
    DB: { prepare },
    MEDIA: {
      get: async key => stored.has(key) ? { arrayBuffer: async () => stored.get(key).slice().buffer } : null,
      put: async (key, body) => { stored.set(key, new Uint8Array(body)); }
    }
  };
  return { db, env, stored };
}

const addClient = (db, id = "maskara-assessoria") => db.prepare("INSERT INTO clients VALUES(?,?,'','@x','online','{}','','')").run(id, id);
const addPost = (db, { id = "p", client = "maskara-assessoria", at = AT, status = "ready", approval = "pending", error = "", caption = "Legenda", payload = {} } = {}) =>
  db.prepare("INSERT INTO post_ledger VALUES(?,?,?,?,?,?,?,?,'')").run(id, client, at, status, approval, error, caption, JSON.stringify(payload));
const read = (db, id = "p") => {
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(id);
  return { ...row, payload: JSON.parse(row.payload_json) };
};

function deps(extra = {}) {
  const calls = { image: 0 };
  return {
    calls,
    overrides: {
      loadFrames: async () => ({ clientes: { "maskara-assessoria": { feed: [{ arquivo: "maskara-assessoria/feed-1.png" }], story: [{ arquivo: "maskara-assessoria/story-1.png" }] } } }),
      image: async () => { calls.image += 1; return { bytes: jpeg(1024, 1280) }; },
      hasText: async () => false,
      zonesBlocked: async () => false,
      compose: async () => jpeg(1080, 1350),
      library: async () => null,
      campaignArt: async () => null,
      caption: async () => "Legenda do nicho",
      send: async () => {},
      ...extra
    }
  };
}

test("o vigia roda nos minutos terminados em 4 e 9, longe da publicação", () => {
  for (const minute of [4, 9, 14, 59]) assert.equal(isWatcherMinute(new Date(Date.UTC(2026, 10, 6, 12, minute))), true);
  for (const minute of [0, 2, 7, 15]) assert.equal(isWatcherMinute(new Date(Date.UTC(2026, 10, 6, 12, minute))), false);
});

test("reconhece os erros pedidos e imagem ausente", () => {
  for (const error of ["media_generation_required", "format_build_failed", "format_build_retry_limit_reached", "publish_retry_limit_reached", "format_mismatch"]) {
    assert.equal(replacementReason({ error }, { imageUrl: "x" }), error);
  }
  assert.equal(replacementReason({ error: "" }, {}), "imagem_ausente");
  assert.equal(replacementReason({ error: "" }, { imageUrl: "x" }), "");
  assert.equal(replacementReason({ error: "" }, { formatBuild: { videoUrl: "v" } }), "");
});

test("story continua story; carrossel e Reels viram post", () => {
  assert.equal(targetFormat({ creativeFeatures: { requestedFormat: "story" } }), "story");
  assert.equal(targetFormat({ creativeFeatures: { requestedFormat: "carousel" } }), "post");
  assert.equal(targetFormat({ creativeFeatures: { requestedFormat: "reel" } }), "post");
});

test("a) remonta com a imagem original, no mesmo horário, sem gerar nada", async () => {
  const { db, env, stored } = setup();
  addClient(db);
  stored.set("capa.jpg", jpeg(1080, 1350));
  addPost(db, { error: "format_build_failed", payload: { imageUrl: "https://x.test/media/capa.jpg", creativeFeatures: { requestedFormat: "carousel" } } });
  const { calls, overrides } = deps();
  const out = await runPostWatcher(env, NOW, overrides);
  assert.deepEqual(out, { id: "p", replaced: true, source: "imagem-original" });
  assert.equal(calls.image, 0);
  const post = read(db);
  assert.equal(post.scheduled_for, AT);
  assert.equal(post.status, "scheduled");
  assert.equal(post.approval_status, "approved");
  assert.equal(post.error, "");
  assert.equal(post.payload.creativeFeatures.requestedFormat, "post");
  assert.equal(post.payload.autoReplaced.source, "imagem-original");
  assert.equal(post.payload.qualityGates.formatBuilder, "approved");
});

test("b) sem original, gera imagem e usa a legenda do nicho se faltar", async () => {
  const { db, env, stored } = setup();
  addClient(db);
  addPost(db, { error: "media_generation_required", caption: "" });
  const { calls, overrides } = deps();
  const out = await runPostWatcher(env, NOW, overrides);
  assert.equal(out.source, "cloudflare-workers-ai");
  assert.equal(calls.image, 1);
  const post = read(db);
  assert.equal(post.caption, "Legenda do nicho");
  assert.ok([...stored.keys()].some(key => key.includes("/substituta-")));
});

test("imagem gerada com texto, ou com gente na área do texto, é descartada", async () => {
  for (const extra of [{ hasText: async () => true }, { zonesBlocked: async () => true }]) {
    const { db, env } = setup();
    addClient(db);
    addPost(db, { error: "media_generation_required" });
    const out = await runPostWatcher(env, NOW, deps(extra).overrides);
    assert.equal(out.replaced, false);
    assert.equal(read(db).approval_status, "pending");
  }
});

test("gerador falhou: usa arte aprovada do cliente", async () => {
  const { db, env } = setup();
  addClient(db);
  addPost(db, { error: "media_generation_required" });
  const out = await runPostWatcher(env, NOW, deps({
    image: async () => { throw new Error("limite grátis"); },
    library: async () => "https://x.test/media/lib.jpg"
  }).overrides);
  assert.equal(out.source, "biblioteca-do-cliente");
});

test("sem nada: marca a falha para o alerta vermelho e para depois de 2 tentativas", async () => {
  const { db, env } = setup();
  addClient(db);
  addPost(db, { error: "media_generation_required" });
  const { overrides } = deps({ image: async () => { throw new Error("limite grátis"); } });
  assert.equal((await runPostWatcher(env, NOW, overrides)).replaced, false);
  assert.ok(read(db).payload.autoReplaceFailed.at);
  await runPostWatcher(env, NOW, overrides);
  assert.equal(read(db).payload.autoReplaceTries, 2);
  assert.ok((await runPostWatcher(env, NOW, overrides)).checked >= 1);
  assert.equal(read(db).payload.autoReplaceTries, 2);
});

test("Daniela: nunca gera imagem, só arte dela", async () => {
  const { db, env } = setup();
  addClient(db, "daniela-martins");
  addPost(db, { client: "daniela-martins", error: "media_generation_required" });
  const { calls, overrides } = deps({ library: async () => "https://x.test/media/lib.jpg" });
  assert.equal((await runPostWatcher(env, NOW, overrides)).source, "biblioteca-do-cliente");
  assert.equal(calls.image, 0);
});

test("Quatree: não gera imagem nem usa rascunho de agente como original", async () => {
  const { db, env, stored } = setup();
  addClient(db, "quatree-dog");
  stored.set("ia.jpg", jpeg(1080, 1350));
  addPost(db, { client: "quatree-dog", error: "format_build_retry_limit_reached", payload: { source: "agent-core:creator", imageUrl: "https://x.test/media/ia.jpg", creativeFeatures: { requestedFormat: "carousel" } } });
  const { calls, overrides } = deps();
  const out = await runPostWatcher(env, NOW, overrides);
  assert.equal(out.replaced, false);
  assert.equal(calls.image, 0);
  assert.equal(read(db).approval_status, "pending");
});

test("Adimax: mesmo com marca salva, não gera imagem e vai para o alerta vermelho", async () => {
  const { db, env, stored } = setup();
  addClient(db, "adimax-eduardo");
  stored.set("ia.jpg", jpeg(1080, 1350));
  addPost(db, { client: "adimax-eduardo", error: "format_build_retry_limit_reached", payload: { source: "agent-core:creator", imageUrl: "https://x.test/media/ia.jpg" } });
  const { calls, overrides } = deps({ brand: async () => ({ buttonWord: "QUERO", colors: {} }) });
  const out = await runPostWatcher(env, NOW, overrides);
  assert.equal(out.replaced, false);
  assert.equal(calls.image, 0);
  assert.ok(read(db).payload.autoReplaceFailed.at, "marca a falha para o quadro");
});

test("Adimax: arte da Biblioteca continua valendo como substituta", async () => {
  const { db, env } = setup();
  addClient(db, "adimax");
  addPost(db, { client: "adimax", error: "media_generation_required" });
  const { calls, overrides } = deps({ library: async () => "https://x.test/media/lib.jpg" });
  assert.equal((await runPostWatcher(env, NOW, overrides)).source, "biblioteca-do-cliente");
  assert.equal(calls.image, 0);
});

test("a Adimax é achada pelo nome do painel, e os outros clientes não mudam", () => {
  for (const id of ["adimax", "adimax-eduardo", "eduardo-adimax", "racao-adimax-mg"]) assert.equal(receivesGeneratedImage(id), false, id);
  for (const id of ["quatree-dog", "quatree-dog-eduardo", "daniela-martins", "giltec", "giltec-locacoes"]) assert.equal(receivesGeneratedImage(id), false, id);
  for (const id of ["primeiro-teste", "maskara-assessoria", "adimaxx"]) assert.equal(receivesGeneratedImage(id), true, id);
});

test("GILTEC: fora da pausa, não gera imagem nem usa rascunho de agente, e a falha vai para o alerta", async () => {
  for (const id of ["giltec", "giltec-locacoes"]) {
    const { db, env, stored } = setup();
    assert.equal(env.NEXUS_PAUSED_CLIENTS, undefined, "sem pausa");
    addClient(db, id);
    stored.set("ia.jpg", jpeg(1080, 1350));
    addPost(db, { client: id, error: "format_build_failed", payload: { source: "agent-core:creator", imageUrl: "https://x.test/media/ia.jpg" } });
    const { calls, overrides } = deps({
      brand: async () => ({ buttonWord: "ORCAMENTO", colors: {} }),
      loadFrames: async () => ({ clientes: { [id]: { feed: [{ arquivo: "a.png" }], story: [{ arquivo: "b.png" }] } } })
    });
    assert.equal((await runPostWatcher(env, NOW, overrides)).replaced, false);
    assert.equal(calls.image, 0, id);
    assert.ok(read(db).payload.autoReplaceFailed.at, id);
  }
});

test("GILTEC: vendedora nova ligada pelo Master também fica sem imagem gerada", async () => {
  const { db, env } = setup();
  db.prepare("INSERT INTO clients VALUES('giltec-ana','Ana','','@x','online',?,'','')").run(JSON.stringify({ group: { id: "giltec", vendor: "Ana" } }));
  addPost(db, { client: "giltec-ana", error: "media_generation_required" });
  const { calls, overrides } = deps({ brand: async () => ({ buttonWord: "ORCAMENTO", colors: {} }) });
  await runPostWatcher(env, NOW, overrides);
  assert.equal(calls.image, 0);
});

test("GILTEC: arte da Biblioteca continua valendo como substituta", async () => {
  const { db, env } = setup();
  addClient(db, "giltec");
  addPost(db, { client: "giltec", error: "media_generation_required" });
  const { calls, overrides } = deps({ library: async () => "https://x.test/media/lib.jpg" });
  assert.equal((await runPostWatcher(env, NOW, overrides)).source, "biblioteca-do-cliente");
  assert.equal(calls.image, 0);
});

test("cliente sem camada de texto não recebe imagem gerada", async () => {
  const { db, env } = setup();
  addClient(db, "nexus-ai");
  addPost(db, { client: "nexus-ai", error: "media_generation_required" });
  const { calls, overrides } = deps();
  await runPostWatcher(env, NOW, overrides);
  assert.equal(calls.image, 0);
});

test("não mexe em correção pedida, rejeitado, publicado nem fora das 6 horas", async () => {
  const { db, env } = setup();
  addClient(db);
  addPost(db, { id: "c", approval: "correction_requested", error: "format_build_failed" });
  addPost(db, { id: "r", approval: "rejected", error: "format_build_failed" });
  addPost(db, { id: "u", status: "published", error: "format_build_failed" });
  addPost(db, { id: "f", at: "2026-11-06T19:00:00.000Z", error: "format_build_failed" });
  const { calls, overrides } = deps();
  assert.equal((await runPostWatcher(env, NOW, overrides)).checked, 0);
  assert.equal(calls.image, 0);
});

test("post sem erro e com arte certa fica como está", async () => {
  const { db, env, stored } = setup();
  addClient(db);
  stored.set("ok.jpg", jpeg(1080, 1350));
  addPost(db, { payload: { imageUrl: "https://x.test/media/ok.jpg" } });
  assert.deepEqual(await runPostWatcher(env, NOW, deps().overrides), { checked: 1 });
  assert.equal(read(db).approval_status, "pending");
});

test("um post por rodada", async () => {
  const { db, env } = setup();
  addClient(db);
  addPost(db, { id: "a", error: "media_generation_required" });
  addPost(db, { id: "b", error: "media_generation_required" });
  const { calls, overrides } = deps();
  await runPostWatcher(env, NOW, overrides);
  assert.equal(calls.image, 1);
});

test("WhatsApp: desligado não manda; ligado manda um aviso e publica do mesmo jeito", async () => {
  const run = async flag => {
    const { db, env } = setup();
    db.prepare("INSERT INTO clients VALUES('maskara-assessoria','g','','@x','online',?,'','')").run(JSON.stringify({ contact: { whatsapp: "5521900000000" } }));
    addPost(db, { error: "media_generation_required" });
    if (flag) env.NEXUS_AUTO_REPLACE_WHATSAPP = "true";
    const sent = [];
    await runPostWatcher(env, NOW, deps({ send: async (...args) => { sent.push(args[2]); } }).overrides);
    return { sent, post: read(db) };
  };
  assert.deepEqual((await run(false)).sent, []);
  const on = await run(true);
  assert.deepEqual(on.sent, ["5521900000000"]);
  assert.equal(on.post.approval_status, "approved");
  assert.ok(on.post.payload.autoReplaced.noticeAt);
});

test("Biblioteca: pega a arte livre certa e marca como usada", async () => {
  const { db, env, stored } = setup();
  stored.set("a.jpg", jpeg(1080, 1920));
  stored.set("b.jpg", jpeg(1080, 1350));
  db.prepare("INSERT INTO nexus_state VALUES('art-library','items','giltec',?,'')").run(JSON.stringify({ items: [
    { id: "a", key: "a.jpg", mime: "image/jpeg", width: 1080, height: 1920, status: "livre" },
    { id: "b", key: "b.jpg", mime: "image/jpeg", width: 1080, height: 1350, status: "livre" }
  ] }));
  const url = await takeLibraryArt(env, { id: "giltec" }, "p", false);
  assert.match(url, /substituta-b\.jpg$/);
  const items = JSON.parse(db.prepare("SELECT value_json AS v FROM nexus_state").get().v).items;
  assert.equal(items.find(item => item.id === "b").status, "programado");
  assert.equal(items.find(item => item.id === "a").status, "livre");
});

test("quadro: sem substituta vira alerta vermelho, mesmo sendo de amanhã", () => {
  const client = { id: "a", name: "A", status: "online", config: {} };
  const now = new Date("2026-11-05T13:00:00.000Z");
  const board = buildMissingPostsBoard([client], [{ client_id: "a", scheduled_for: "2026-11-06T12:00:00.000Z", format: "post", status: "ready", approval_status: "approved", error: "format_build_failed", replace_failed: "x" }], now);
  const line = board.items.find(item => item.text.includes("não consegui substituir"));
  assert.equal(line.level, "today");
  assert.equal(postProblem({ status: "ready", replace_failed: "x" }), "não consegui substituir");
});
