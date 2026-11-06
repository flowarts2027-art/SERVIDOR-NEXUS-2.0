import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { requestAdjustment } from "../src/client-revision.js";
import { finishComposedArt, runPostWatcher } from "../src/post-watcher.js";

const NOW = new Date("2026-11-06T12:00:00Z");
const AT = "2026-11-07T12:20:00.000Z";
const OLD = "https://x.test/media/antiga.jpg";

function jpeg(width, height) {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255]);
  return b;
}

function setup() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../migrations/", import.meta.url)).sort()) db.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const stored = new Map();
  const env = { DB, PUBLIC_BASE_URL: "https://x.test", GITHUB_ACTIONS_TOKEN: "t", MEDIA: { put: async (key, body) => { stored.set(key, body); }, get: async () => null } };
  return { db, env, stored };
}

function addClient(db, id, config = {}) {
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES(?,?,'Ração','@x','online',?)").run(id, id, JSON.stringify(config));
  return { id, name: id, niche: "Ração", status: "online", config };
}

function addPost(db, client, { id = "p", format = "post", approval = "pending", status = "ready", payload = {} } = {}) {
  db.prepare(`INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at)
    VALUES(?,?,?,'09:20',?,?,'','Legenda do cliente','','',0,?,'2026-11-06 10:00:00','2026-11-06 10:00:00')`)
    .run(id, client, AT, status, approval, JSON.stringify({ imageUrl: OLD, publicImageUrl: OLD, creativeFeatures: { requestedFormat: format }, ...payload }));
}

const read = (db, id = "p") => {
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(id);
  return { ...row, payload: JSON.parse(row.payload_json) };
};
const tickets = db => db.prepare("SELECT client_id, subject, payload_json FROM support_tickets").all();
const jobs = db => db.prepare("SELECT COUNT(*) AS n FROM scheduled_jobs").get().n;

function deps(extra = {}) {
  const calls = { image: 0, prompts: [] };
  return { calls, overrides: {
    loadFrames: async () => ({ clientes: { loja: { feed: [{ arquivo: "a.png" }], story: [{ arquivo: "b.png" }] } } }),
    image: async (env, prompt, ratio) => { calls.image += 1; calls.prompts.push(prompt); return { bytes: ratio === "9:16" ? jpeg(1008, 1792) : jpeg(1024, 1280) }; },
    hasText: async () => false,
    zonesBlocked: async () => false,
    compose: async () => jpeg(1080, 1350),
    brand: async () => null,
    library: async () => "https://x.test/media/biblioteca.jpg",
    campaignArt: async () => ({ url: "https://x.test/media/campanha.jpg" }),
    caption: async () => "Legenda pronta",
    send: async () => {},
    title: async () => "Título",
    fetch: async () => new Response("{}"),
    ...extra
  } };
}

test("ajuste: imagem nova, mesmo horário e volta para o cliente aprovar", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const { calls, overrides } = deps();
  const out = await requestAdjustment(env, client, "p", "mais ração", NOW, overrides);
  assert.equal(out.mode, "generated");
  assert.equal(calls.image, 1);
  assert.match(calls.prompts[0], /Client requested this change, follow it: mais ração\./);

  const post = read(db);
  assert.equal(post.scheduled_for, AT);
  assert.equal(post.status, "ready");
  assert.equal(post.approval_status, "pending", "nunca volta aprovado");
  assert.equal(post.error, "");
  assert.equal(post.caption, "Legenda do cliente");
  assert.notEqual(post.payload.imageUrl, OLD);
  assert.equal(post.payload.clientRevision.request, "mais ração");
  assert.equal(post.payload.visualReview.reason, "Refeita a pedido do cliente");
  assert.equal(post.payload.autoReplaced, undefined);
  assert.ok(post.payload.revisionRequestedAt, "o silêncio do cliente não aprova esta arte");
  assert.equal(tickets(db).length, 0);
  assert.equal(jobs(db), 0, "o ciclo antigo não é chamado");
});

test("ajuste de post já aprovado também volta para aprovação", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja", { approval: "approved", status: "scheduled" });
  await requestAdjustment(env, client, "p", "outro cachorro", NOW, deps().overrides);
  assert.deepEqual([read(db).status, read(db).approval_status], ["ready", "pending"]);
});

test("story continua story, na medida certa", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja", { format: "story" });
  const out = await requestAdjustment(env, client, "p", "mais claro", NOW, deps({ compose: async () => jpeg(1080, 1920) }).overrides);
  assert.equal(out.mode, "generated");
  assert.equal(read(db).payload.creativeFeatures.requestedFormat, "story");
  assert.equal(read(db).caption, "");
});

test("marca salva: a arte é montada no GitHub e também volta para aprovação", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const brand = async () => ({ buttonWord: "QUERO", logoUrl: "https://x.test/l.png", colors: { accent: "#000000", onAccent: "#ffffff" } });
  const { overrides } = deps({ brand });
  const out = await requestAdjustment(env, client, "p", "mais ração", NOW, overrides);
  assert.equal(out.mode, "composing");
  const waiting = read(db);
  assert.equal(waiting.approval_status, "correction_requested");
  assert.equal(waiting.payload.imageUrl, OLD, "a arte antiga fica até a nova chegar");

  await assert.rejects(requestAdjustment(env, client, "p", "de novo", NOW, overrides), /revision_in_progress/);

  const done = await finishComposedArt(env, "p", waiting.payload.autoReplacePending.token, jpeg(1080, 1350), NOW, overrides);
  assert.equal(done.ok, true);
  const post = read(db);
  assert.deepEqual([post.status, post.approval_status], ["ready", "pending"]);
  assert.notEqual(post.payload.imageUrl, OLD);
  assert.equal(post.payload.autoReplacePending, undefined);
});

test("não pega arte da Biblioteca nem da campanha: elas não seguem o pedido", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const out = await requestAdjustment(env, client, "p", "mais ração", NOW, deps({ hasText: async () => true }).overrides);
  assert.equal(out.mode, "master");
  assert.equal(read(db).payload.imageUrl, OLD);
});

test("geração falhou: aviso no Master, a arte fica, e o vigia não mexe", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const { overrides } = deps({ image: async () => { throw new Error("ai_down"); } });
  const out = await requestAdjustment(env, client, "p", "mais ração", NOW, overrides);
  assert.equal(out.mode, "master");
  const post = read(db);
  assert.equal(post.approval_status, "correction_requested");
  assert.equal(post.payload.imageUrl, OLD);
  assert.equal(post.payload.autoReplaceFailed, undefined);
  assert.equal(tickets(db).length, 1);
  const watched = await runPostWatcher(env, new Date("2026-11-07T10:00:00Z"), overrides);
  assert.ok(!watched.replaced);
});

for (const [id, config] of [
  ["daniela-martins", {}],
  ["quatree-dog", {}],
  ["adimax-eduardo-soares", {}],
  ["giltec", {}],
  ["giltec-neto", { group: { id: "giltec", vendor: "Neto" } }]
]) {
  test("sem imagem gerada: " + id + " vira aviso no Master, sem gerar e sem apagar a arte", async () => {
    const { db, env } = setup();
    const client = addClient(db, id, config);
    addPost(db, id);
    const { calls, overrides } = deps({ brand: async () => ({ buttonWord: "QUERO", colors: {} }) });
    const out = await requestAdjustment(env, client, "p", "outro cachorro", NOW, overrides);
    assert.equal(out.mode, "master");
    assert.match(out.message, /equipe vai refazer/);
    assert.equal(calls.image, 0);
    assert.equal(jobs(db), 0, "o ciclo antigo geraria imagem");
    const post = read(db);
    assert.equal(post.approval_status, "correction_requested");
    assert.equal(post.error, "", "media_generation_required faria o ciclo antigo gerar");
    assert.equal(post.payload.imageUrl, OLD);
    const [ticket] = tickets(db);
    assert.equal(ticket.client_id, id);
    assert.match(ticket.subject, /Refazer arte/);
    assert.equal(JSON.parse(ticket.payload_json).message, "outro cachorro");
  });
}

test("cliente sem camada de texto também vira aviso", async () => {
  const { db, env } = setup();
  const client = addClient(db, "sem-marca");
  addPost(db, "sem-marca");
  const { calls, overrides } = deps({ loadFrames: async () => ({ clientes: {} }) });
  assert.equal((await requestAdjustment(env, client, "p", "x", NOW, overrides)).mode, "master");
  assert.equal(calls.image, 0);
});

test("cliente em pausa não gera", async () => {
  const { db, env } = setup();
  env.NEXUS_PAUSED_CLIENTS = "loja";
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const { calls, overrides } = deps();
  assert.equal((await requestAdjustment(env, client, "p", "x", NOW, overrides)).mode, "master");
  assert.equal(calls.image, 0);
});

test("Reels não tem como gerar: vira aviso", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja", { format: "reel" });
  const { calls, overrides } = deps();
  assert.equal((await requestAdjustment(env, client, "p", "x", NOW, overrides)).mode, "master");
  assert.equal(calls.image, 0);
});

test("carrossel de quem usa imagem gerada segue no fluxo que refaz os cartões", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja", { format: "carousel" });
  const { calls, overrides } = deps();
  await requestAdjustment(env, client, "p", "troque a capa", NOW, overrides);
  assert.equal(calls.image, 0);
  assert.equal(jobs(db), 1);
  assert.equal(read(db).payload.revisionRequest, "troque a capa");
});

test("carrossel de quem não recebe imagem gerada vira aviso", async () => {
  const { db, env } = setup();
  const client = addClient(db, "quatree-dog");
  addPost(db, "quatree-dog", { format: "carousel" });
  assert.equal((await requestAdjustment(env, client, "p", "x", NOW, deps().overrides)).mode, "master");
  assert.equal(jobs(db), 0);
  assert.equal(read(db).payload.imageUrl, OLD);
});

test("depois de 3 ajustes no mesmo post, o 4º vira aviso", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addPost(db, "loja");
  const { calls, overrides } = deps();
  for (let i = 0; i < 3; i++) assert.equal((await requestAdjustment(env, client, "p", "ajuste " + i, NOW, overrides)).mode, "generated");
  assert.equal((await requestAdjustment(env, client, "p", "ajuste 4", NOW, overrides)).mode, "master");
  assert.equal(calls.image, 3);
});

test("pedido vazio, post de outro cliente e post publicado são recusados", async () => {
  const { db, env } = setup();
  const client = addClient(db, "loja");
  addClient(db, "outra");
  addPost(db, "outra", { id: "alheio" });
  addPost(db, "loja", { id: "feito", status: "published" });
  const { calls, overrides } = deps();
  await assert.rejects(requestAdjustment(env, client, "feito", "  ", NOW, overrides), /revision_instructions_required/);
  await assert.rejects(requestAdjustment(env, client, "alheio", "x", NOW, overrides), /post_not_found/);
  await assert.rejects(requestAdjustment(env, client, "feito", "x", NOW, overrides), /already_published/);
  assert.equal(calls.image, 0);
});

test("vigia continua publicando sozinho o que ele substitui", async () => {
  const { db, env } = setup();
  addClient(db, "loja");
  db.prepare(`INSERT INTO post_ledger(id,client_id,scheduled_for,status,approval_status,error,caption,payload_json) VALUES('v','loja',?, 'ready','pending','media_generation_required','L','{}')`).run("2026-11-06T13:00:00.000Z");
  const { overrides } = deps({ library: async () => null, campaignArt: async () => null });
  assert.equal((await runPostWatcher(env, NOW, overrides)).replaced, true);
  assert.deepEqual([read(db, "v").status, read(db, "v").approval_status], ["scheduled", "approved"]);
});

test("tela do cliente: campo grande, exemplos pedidos e aviso de que volta para aprovar", () => {
  const lite = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../public/client-lite.css", import.meta.url), "utf8");
  assert.match(lite, /O que você quer mudar\?/);
  assert.match(lite, /mais ração, outro cachorro, sem texto em cima do cão/);
  assert.match(lite, /A arte nova volta aqui para você aprovar/);
  assert.match(lite, /toast\(out\?\.message/);
  assert.match(lite, /reviewed && !dateMissing && !fixing/, "Aprovar fica travado enquanto refaz");
  assert.match(css, /\.revision textarea \{ min-height: 150px/);
});
