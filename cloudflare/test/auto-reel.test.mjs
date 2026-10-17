import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE post_ledger(id TEXT PRIMARY KEY, client_id TEXT, scheduled_for TEXT, scheduled_hour TEXT, status TEXT, approval_status TEXT, media_id TEXT, caption TEXT, image_object_key TEXT, error TEXT, cost_usd REAL, payload_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE clients(id TEXT PRIMARY KEY, name TEXT, niche TEXT, instagram TEXT, status TEXT, config_json TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE nexus_state(namespace TEXT, item_key TEXT, client_id TEXT, value_json TEXT, updated_at TEXT, PRIMARY KEY(namespace,item_key,client_id));`);
  db.prepare("INSERT INTO clients(id,name,niche,instagram,status,config_json) VALUES('primeiro-teste','Flow Arts','marketing','flowarts2026','online','{}')").run();
  const DB = { prepare(sql) { const wrap = args => {
    const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
    return { first: async () => db.prepare(sql).get(p) || null, all: async () => ({ results: db.prepare(sql).all(p) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } }) };
  }; return { ...wrap([]), bind: (...a) => wrap(a) }; } };
  return { db, env: { DB, PUBLIC_BASE_URL: "https://n", GITHUB_ACTIONS_TOKEN: "gh", MEDIA: { put: async () => {} } } };
}

const PLANO = { cartoes: [
  { titulo_linha1: "Você corta o cabelo", titulo_linha2: "E quem cuida dos posts?" },
  { titulo_linha1: "O dia passa voando", titulo_linha2: "E o perfil fica parado" },
  { titulo_linha1: "A Flow cria os posts", titulo_linha2: "Com a cara da barbearia" },
  { titulo_linha1: "Você aprova primeiro", titulo_linha2: "Depois a Flow publica" },
  { titulo_linha1: "Quer ver como fica?", titulo_linha2: "A gente te mostra" }
] };
const CLIENTE = { id: "primeiro-teste", name: "Flow Arts" };

async function ligar(env, config) {
  const { normalizeAutoReelConfig } = await import("../src/auto-reel.js");
  await env.DB.prepare("INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES('auto-reel','state','primeiro-teste',?1,CURRENT_TIMESTAMP)")
    .bind(JSON.stringify({ config: normalizeAutoReelConfig(config) })).run();
}

test("desligado por padrão: não cria nada e não gasta", async () => {
  const { runAutoReelForClient } = await import("../src/auto-reel.js");
  const { env } = setup();
  let chamou = false;
  const out = await runAutoReelForClient(env, CLIENTE, { plan: async () => { chamou = true; return PLANO; } });
  assert.equal(out.reason, "disabled");
  assert.equal(chamou, false);
});

test("ligado: IA escreve as cenas, Reel nasce gravando, com dia sugerido e esperando aprovação", async () => {
  const { runAutoReelForClient, AUTO_REEL_SOURCE } = await import("../src/auto-reel.js");
  const { db, env } = setup();
  await ligar(env, { enabled: true, everyDays: 7, hour: "18:00", daysAhead: 2 });
  let pedido;
  const at = new Date("2026-10-17T13:00:00Z");
  const out = await runAutoReelForClient(env, CLIENTE, {
    at, plan: async () => PLANO,
    fetchImpl: async (_u, init) => { pedido = JSON.parse(init.body); return { status: 204 }; }
  });
  assert.equal(out.ok, true);
  assert.equal(out.scheduledFor, "2026-10-19T21:00:00.000Z");
  const row = db.prepare("SELECT * FROM post_ledger WHERE id=?").get(out.id);
  assert.equal(row.status, "reel_rendering");
  assert.equal(row.approval_status, "pending");
  assert.match(row.caption, /^Você cuida (da|do) .+\. A Flow cuida do seu Instagram\./);
  assert.match(row.caption, /Comente QUERO/);
  const payload = JSON.parse(row.payload_json);
  assert.equal(payload.source, AUTO_REEL_SOURCE);
  assert.equal(payload.dateChoice, undefined);
  assert.equal(payload.manual, true);
  assert.equal(JSON.parse(pedido.client_payload.reel).scenes[0].l1, "Você corta o cabelo");

  // Mesma semana: não cria outro.
  const de_novo = await runAutoReelForClient(env, CLIENTE, { at: new Date(at.getTime() + 7 * 3600e3), plan: async () => PLANO, fetchImpl: async () => ({ status: 204 }) });
  assert.equal(de_novo.reason, "not_due");
});

test("cenas fora das regras ou erro: não grava e espera antes de tentar de novo", async () => {
  const { runAutoReelForClient } = await import("../src/auto-reel.js");
  const { db, env } = setup();
  await ligar(env, { enabled: true });
  const ruim = { cartoes: PLANO.cartoes.map((c, i) => i === 1 ? { ...c, titulo_linha2: "Dobre o lucro em 30 dias" } : c) };
  const at = new Date("2026-10-17T13:00:00Z");
  const out = await runAutoReelForClient(env, CLIENTE, { at, plan: async () => ruim, fetchImpl: async () => ({ status: 204 }) });
  assert.equal(out.ok, false);
  assert.match(out.error, /auto_reel_scenes_invalid/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM post_ledger").get().n, 0);
  const logo = await runAutoReelForClient(env, CLIENTE, { at: new Date(at.getTime() + 15 * 60e3), plan: async () => PLANO, fetchImpl: async () => ({ status: 204 }) });
  assert.equal(logo.reason, "waiting_retry");
});

test("só para clientes com perfil da marca e não travados; legenda com artigo certo", async () => {
  const { autoReelClientAllowed, autoReelCaption } = await import("../src/auto-reel.js");
  assert.equal(autoReelClientAllowed({ id: "primeiro-teste" }), true);
  assert.equal(autoReelClientAllowed({ id: "demo-cafe" }), false);
  assert.equal(autoReelClientAllowed({ id: "quatree-dog" }), false);
  assert.match(autoReelCaption({ id: "salao", pt: "salão de beleza" }), /^Você cuida do salão de beleza\./);
  assert.match(autoReelCaption({ id: "barbearia", pt: "barbearia" }), /^Você cuida da barbearia\./);
});

test("relógio do servidor e Master ligados", () => {
  const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index, /runAutoReels\(env, at\)/);
  assert.match(index, /handleAutoReelMaster/);
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="auto-reel-form"/);
  assert.match(html, /id="auto-reel-now"/);
});
