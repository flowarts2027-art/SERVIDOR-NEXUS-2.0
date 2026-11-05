import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import {
  cleanButtonWord, cleanColors, contrast, effectiveBrand, readableColor, saveBrand, textOn, updateBrandFile
} from "../src/client-identity.js";
import { cleanTitle, writeArtTitle } from "../src/art-title.js";
import { finishComposedArt, runPostWatcher } from "../src/post-watcher.js";
import { clientGroup } from "../src/clients.js";

const NOW = new Date("2026-11-06T12:00:00.000Z");
const COLORS = { primary: "#102030", accent: "#ffc20e", text: "#ffee00" };

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
  return { db, stored, env: {
    PUBLIC_BASE_URL: "https://x.test",
    DB: { prepare },
    MEDIA: { put: async (key, body) => { stored.set(key, body); }, get: async () => null }
  } };
}
const addClient = (db, id, config = {}) => db.prepare("INSERT INTO clients VALUES(?,?,'Moda','@x','online',?,'','')").run(id, id, JSON.stringify(config));
function brandForm(target, extra = {}) {
  const form = new FormData();
  form.set("target", target);
  for (const [key, value] of Object.entries({ ...COLORS, buttonWord: "quero", ...extra })) form.set(key, value);
  return form;
}
const ok = async () => new Response("{}", { status: 200 });

test("cor clara demais escurece até dar para ler", () => {
  assert.ok(contrast(readableColor("#ffee00"), "#ffffff") >= 4.5);
  assert.equal(readableColor("#000000"), "#000000");
});

test("botão escolhe preto ou branco, o que ler melhor", () => {
  assert.equal(textOn("#102030"), "#ffffff");
  assert.equal(textOn("#ffc20e"), "#000000");
});

test("cores ruins são recusadas, e a cor do texto vira legível", () => {
  assert.throws(() => cleanColors({ primary: "azul", accent: "#000000", text: "#000000" }), /brand_color/);
  assert.ok(contrast(cleanColors(COLORS).text, "#ffffff") >= 4.5);
});

test("palavra do botão: uma palavra só, em maiúsculas", () => {
  assert.equal(cleanButtonWord(" quero "), "QUERO");
  assert.equal(cleanButtonWord(""), "");
  assert.throws(() => cleanButtonWord("duas palavras"), /brand_word/);
});

test("salvar marca do cliente: logo, cores, palavra e resposta automática, sem mudar o resto", async () => {
  const { db, env, stored } = setup();
  env.GITHUB_ACTIONS_TOKEN = "t";
  addClient(db, "adimax", { theme: "green-black" });
  const form = brandForm("adimax");
  form.set("logo", new File([new Uint8Array([1])], "logo.png", { type: "image/png" }));
  const out = await saveBrand(env, form, NOW, ok);
  assert.equal(out.ficha, "atualizada");
  const config = JSON.parse(db.prepare("SELECT config_json AS c FROM clients").get().c);
  assert.equal(config.theme, "green-black");
  assert.equal(config.brand.buttonWord, "QUERO");
  assert.match(config.brand.logoUrl, /\/media\/branding\/adimax\/logo-/);
  assert.equal(stored.size, 1);
  const auto = JSON.parse(db.prepare("SELECT value_json AS v FROM nexus_state WHERE item_key='config'").get().v);
  assert.ok(auto.keywords.map(word => word.toUpperCase()).includes("QUERO"));
});

test("salvar de novo sem logo mantém a logo anterior", async () => {
  const { db, env } = setup();
  addClient(db, "a", { brand: { logoKey: "k", logoUrl: "u", colors: COLORS, buttonWord: "TABELA" } });
  const out = await saveBrand(env, brandForm("a", { buttonWord: "" }), NOW, ok);
  assert.equal(out.brand.logoUrl, "u");
  assert.equal(out.brand.buttonWord, "TABELA");
});

test("logo em formato errado é recusada", async () => {
  const { db, env } = setup();
  addClient(db, "a");
  const form = brandForm("a");
  form.set("logo", new File([new Uint8Array([1])], "logo.svg", { type: "image/svg+xml" }));
  await assert.rejects(saveBrand(env, form, NOW, ok), /brand_logo_type/);
});

test("painel do grupo usa a marca do grupo, a não ser que tenha marca própria", async () => {
  const { db, env } = setup();
  addClient(db, "giltec");
  addClient(db, "giltec-locacoes");
  await saveBrand(env, brandForm("grupo:giltec"), NOW, ok);
  const sheila = { id: "giltec-locacoes", config: { group: { id: "giltec", vendor: "Sheila" } } };
  assert.equal((await effectiveBrand(env, sheila)).buttonWord, "QUERO");
  const own = { id: "giltec-locacoes", config: { group: { id: "giltec", vendor: "Sheila" }, brand: { colors: COLORS, buttonWord: "OBRA" } } };
  assert.equal((await effectiveBrand(env, own)).buttonWord, "OBRA");
  assert.equal(await effectiveBrand(env, { id: "solto", config: {} }), null);
});

test("Sheila entra no grupo pelo campo Grupo, e a pausa continua", async () => {
  assert.equal(clientGroup({ id: "giltec-locacoes", config: { group: { id: "giltec", vendor: "Sheila" } } }).id, "giltec");
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"NEXUS_PAUSED_CLIENTS": "giltec,giltec-locacoes"/);
});

test("ficha do GitHub: sem token avisa; erro não apaga a marca", async () => {
  assert.equal(await updateBrandFile({}, "a", { colors: COLORS }), "sem_token");
  const env = { GITHUB_ACTIONS_TOKEN: "t" };
  const calls = [];
  const fetcher = async (url, options = {}) => { calls.push([url, options.method]); return new Response("{}", { status: options.method === "PUT" ? 403 : 404 }); };
  assert.equal(await updateBrandFile(env, "a", { colors: COLORS, updatedAt: "x" }, fetcher), "erro_403");
  assert.match(calls[1][0], /docs\/nexus-memory\/clientes\/a\/marca\.json/);
});

test("título: 3 linhas curtas, sem número, sem preço", () => {
  assert.deepEqual(cleanTitle("Ração boa\npara o seu\ncão feliz"), ["Ração boa", "para o seu", "cão feliz"]);
  assert.deepEqual(cleanTitle('1. "Ração boa"\n2. para o seu\n3. cão feliz'), ["Ração boa", "para o seu", "cão feliz"]);
  assert.throws(() => cleanTitle("uma linha só"), /title_invalid/);
  assert.throws(() => cleanTitle("Só R$ 10\ncomprando\nhoje"), /title_invalid/);
  assert.throws(() => cleanTitle("50% off\nnesta\nsemana"), /title_invalid/);
});

test("título lê a ficha do cliente", async () => {
  let prompt = "";
  const env = { AI: { run: async (_, input) => { prompt = input.messages[0].content; return { response: "Moda boa\npara você\ntodo dia" }; } } };
  const title = await writeArtTitle(env, { id: "adimax", name: "Adimax", niche: "Ração", config: { agentProfile: { services: "Ração Adimax Premium" } } });
  assert.equal(title.length, 3);
  assert.match(prompt, /Ração Adimax Premium/);
});

const watcherDeps = extra => ({
  loadFrames: async () => null,
  brand: async () => ({ buttonWord: "QUERO", logoUrl: "https://x.test/media/branding/a/l.png", colors: { accent: "#ffc20e", onAccent: "#000000" } }),
  image: async () => ({ bytes: jpeg(1024, 1280) }),
  hasText: async () => false,
  zonesBlocked: async () => false,
  title: async () => ["a", "b", "c"],
  library: async () => null,
  campaignArt: async () => null,
  caption: async () => "Legenda",
  send: async () => {},
  ...extra
});
const addPost = (db, payload = {}) => db.prepare("INSERT INTO post_ledger VALUES('p','adimax','2026-11-06T14:00:00.000Z','ready','pending','media_generation_required','Legenda',?,'')").run(JSON.stringify(payload));

test("cliente novo com marca recebe imagem do vigia, sem depender da lista do deploy", async () => {
  const { db, env } = setup();
  env.GITHUB_ACTIONS_TOKEN = "t";
  addClient(db, "adimax");
  addPost(db);
  const sent = [];
  const out = await runPostWatcher(env, NOW, watcherDeps({ fetch: async (url, options) => { sent.push(JSON.parse(options.body)); return new Response(null, { status: 204 }); } }));
  assert.deepEqual(out, { id: "p", replaced: false, pending: true });
  assert.equal(sent[0].event_type, "art-compose");
  assert.equal(sent[0].client_payload.button, "COMENTE QUERO");
  assert.deepEqual(sent[0].client_payload.title, ["a", "b", "c"]);

  // Rodada seguinte: espera a montagem voltar, sem pedir de novo.
  await runPostWatcher(env, new Date(NOW.getTime() + 5 * 60000), watcherDeps({ fetch: async () => assert.fail("não pode pedir de novo") }));

  const token = sent[0].client_payload.callback_token;
  assert.equal((await finishComposedArt(env, "p", "errada", jpeg(1080, 1350), NOW, watcherDeps())).status, 403);
  assert.equal((await finishComposedArt(env, "p", token, jpeg(1080, 1920), NOW, watcherDeps())).status, 400);
  assert.equal((await finishComposedArt(env, "p", token, jpeg(1080, 1350), NOW, watcherDeps())).status, 200);
  const row = db.prepare("SELECT * FROM post_ledger").get();
  const payload = JSON.parse(row.payload_json);
  assert.equal(row.status, "scheduled");
  assert.equal(row.approval_status, "approved");
  assert.equal(payload.autoReplaced.source, "cloudflare-workers-ai");
  assert.equal(payload.autoReplacePending, undefined);
  assert.equal((await finishComposedArt(env, "p", token, jpeg(1080, 1350), NOW, watcherDeps())).status, 403);
});

test("sem token do GitHub, cai na arte do cliente", async () => {
  const { db, env } = setup();
  addClient(db, "adimax");
  addPost(db);
  const out = await runPostWatcher(env, NOW, watcherDeps({ library: async () => "https://x.test/media/lib.jpg" }));
  assert.equal(out.source, "biblioteca-do-cliente");
});

test("as rotas de marca exigem login, e a volta da arte usa senha de uso único", async () => {
  const index = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(index.match(/\/api\/master\/brand"[\s\S]*?handleBrand/)?.[0] || "", /resolveMasterSession[\s\S]*unauthorized/);
  assert.match(index, /x-nexus-callback/);
});
