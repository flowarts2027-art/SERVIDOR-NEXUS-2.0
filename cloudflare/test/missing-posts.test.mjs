import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import {
  buildMissingPostsBoard, missingPostsBoard, missingPostsMessage, missingText, postProblem, sendMissingPostsAlert
} from "../src/missing-posts.js";
import { cleanPanelName, handleClientName } from "../src/client-name.js";
import { clientScreenName, portalGreetingName } from "../src/client-display.js";

const NOW = new Date("2026-11-05T13:00:00.000Z"); // 10:00 de Brasília
const at = (day, hour = 12) => `2026-11-${day}T${hour}:00:00.000Z`;
const client = { id: "a", name: "Cliente A", status: "online", config: {} };
const post = (day, format = "post", extra = {}) => ({ client_id: "a", scheduled_for: at(day), format, status: "ready", approval_status: "approved", error: "", ...extra });
const fullDay = day => [post(day), post(day), post(day, "story"), post(day, "story")];

test("cliente completo nos 3 dias não entra no quadro", () => {
  const board = buildMissingPostsBoard([client], [...fullDay("05"), ...fullDay("06"), ...fullDay("07")], NOW);
  assert.deepEqual(board, { clients: 0, items: [] });
});

test("mostra o dia e quanto falta", () => {
  const board = buildMissingPostsBoard([client], [...fullDay("05"), post("06"), ...fullDay("07")], NOW);
  assert.equal(board.clients, 1);
  assert.deepEqual(board.items.map(item => [item.level, item.text]), [["tomorrow", "Amanhã: faltam 1 post e 2 stories"]]);
});

test("texto no singular e no plural", () => {
  assert.equal(missingText("Hoje", 1, 0), "Hoje: falta 1 post");
  assert.equal(missingText("Hoje", 0, 2), "Hoje: faltam 2 stories");
});

test("publicado hoje conta para o plano", () => {
  const today = fullDay("05").map(item => ({ ...item, status: "published" }));
  const board = buildMissingPostsBoard([client], [...today, ...fullDay("06"), ...fullDay("07")], NOW);
  assert.equal(board.clients, 0);
});

test("hoje vem primeiro, depois amanhã, depois o outro dia", () => {
  const board = buildMissingPostsBoard([{ ...client, name: "Zeca" }, { id: "b", name: "Ana", status: "online", config: {} }], [], NOW);
  assert.deepEqual(board.items.map(item => item.level), ["today", "today", "tomorrow", "tomorrow", "later", "later"]);
  assert.equal(board.items[0].clientName, "Ana");
  assert.equal(board.clients, 2);
});

test("o dia vira à meia-noite de Brasília, não à do servidor", () => {
  const night = new Date("2026-11-06T02:00:00.000Z"); // 23:00 de 05/11 em Brasília
  const board = buildMissingPostsBoard([client], [post("06", "post", { scheduled_for: "2026-11-06T13:00:00.000Z" })], night);
  assert.equal(board.items[0].text, "Amanhã: faltam 1 post e 2 stories");
  assert.equal(board.items[0].date, "2026-11-06");
});

test("postagens com problema aparecem e não contam para o plano", () => {
  const cases = [
    [{ error: "media_generation_required" }, "sem imagem"],
    [{ error: "format_build_failed" }, "erro de montagem"],
    [{ error: "format_build_retry_limit_reached" }, "erro de montagem"],
    [{ error: "publish_retry_limit_reached" }, "falhou 3 vezes"],
    [{ approval_status: "correction_requested" }, "correção pedida"],
    [{ status: "failed", retry_count: 3 }, "falhou 3 vezes"],
    [{ approval_status: "pending", created_at: "2026-11-04 12:00:00" }, "esperando aprovação há mais de 12 horas"]
  ];
  for (const [extra, reason] of cases) assert.equal(postProblem(post("05", "post", extra), NOW), reason);
  const board = buildMissingPostsBoard([client], [post("05", "carousel", { approval_status: "correction_requested", scheduled_for: "2026-11-05T20:00:00.000Z" })], NOW);
  assert.ok(board.items.some(item => item.kind === "problem" && item.text === "Hoje 17:00: carrossel — correção pedida"));
  assert.ok(board.items.some(item => item.text === "Hoje: faltam 2 posts e 2 stories"));
});

test("esperando aprovação há pouco tempo não é problema", () => {
  assert.equal(postProblem(post("05", "post", { approval_status: "pending", created_at: "2026-11-05 10:00:00" }), NOW), "");
});

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE clients(id TEXT PRIMARY KEY,name TEXT,niche TEXT,instagram TEXT,status TEXT,config_json TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE post_ledger(id TEXT PRIMARY KEY,client_id TEXT,scheduled_for TEXT,status TEXT,approval_status TEXT,error TEXT,payload_json TEXT,created_at TEXT);
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
  return { db, env: { DB: { prepare } } };
}

const addClient = (db, id, status = "online", name = id) =>
  db.prepare("INSERT INTO clients VALUES(?,?,'','',?,'{}','','')").run(id, name, status);

test("arquivados, setup e demonstração não entram no quadro", async () => {
  const { db, env } = database();
  addClient(db, "giltec");
  addClient(db, "ragnar-one", "archived");
  addClient(db, "jbtv", "setup");
  addClient(db, "demo-cafe");
  const board = await missingPostsBoard(env, NOW);
  assert.deepEqual([...new Set(board.items.map(item => item.clientId))], ["giltec"]);
});

test("a consulta lê a agenda de verdade e ignora rejeitado e expirado", async () => {
  const { db, env } = database();
  addClient(db, "giltec");
  const insert = db.prepare("INSERT INTO post_ledger VALUES(?,'giltec',?,?,?,'',?,'')");
  insert.run("p", at("05"), "ready", "approved", '{"creativeFeatures":{"requestedFormat":"post"}}');
  insert.run("s", at("05"), "published", "approved", '{"creativeFeatures":{"requestedFormat":"story"}}');
  insert.run("r", at("05"), "ready", "rejected", "{}");
  insert.run("e", at("05"), "expired", "approved", "{}");
  const board = await missingPostsBoard(env, NOW);
  assert.equal(board.items[0].text, "Hoje: faltam 1 post e 1 story");
});

test("WhatsApp desligado não manda nada", async () => {
  let sent = 0;
  const out = await sendMissingPostsAlert({}, NOW, { send: async () => { sent += 1; } });
  assert.deepEqual(out, { sent: false, reason: "disabled" });
  assert.equal(sent, 0);
});

test("o aviso vem desligado no wrangler", async () => {
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"NEXUS_MISSING_POSTS_WHATSAPP": "false"/);
});

test("ligado, manda uma única mensagem por dia", async () => {
  const { env } = database();
  env.NEXUS_MISSING_POSTS_WHATSAPP = "true";
  const sent = [];
  const loadBoard = async () => ({ clients: 1, items: [{ dayIndex: 0, clientName: "A", text: "Hoje: falta 1 post" }] });
  const send = async (_, __, to, text) => { sent.push([to, text]); };
  assert.equal((await sendMissingPostsAlert(env, NOW, { send, loadBoard })).sent, true);
  assert.equal((await sendMissingPostsAlert(env, new Date(NOW.getTime() + 3600000), { send, loadBoard })).reason, "already_sent_today");
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "5521964816185");
  assert.equal((await sendMissingPostsAlert(env, new Date(NOW.getTime() + 86400000), { send, loadBoard })).sent, true);
});

test("não manda antes das 8h nem com o quadro vazio", async () => {
  const { env } = database();
  env.NEXUS_MISSING_POSTS_WHATSAPP = "true";
  const send = async () => assert.fail("não deveria enviar");
  const early = new Date("2026-11-05T09:00:00.000Z");
  assert.equal((await sendMissingPostsAlert(env, early, { send })).reason, "too_early");
  assert.equal((await sendMissingPostsAlert(env, NOW, { send, loadBoard: async () => ({ clients: 0, items: [] }) })).reason, "nothing_missing");
});

test("a mensagem do WhatsApp prioriza o que falta hoje", () => {
  const text = missingPostsMessage({ clients: 2, items: [
    { dayIndex: 0, clientName: "A", text: "Hoje: falta 1 post" },
    { dayIndex: 1, clientName: "B", text: "Amanhã: falta 1 post" }
  ] });
  assert.match(text, /2 clientes/);
  assert.match(text, /A — Hoje/);
  assert.doesNotMatch(text, /B — Amanhã/);
});

test("nome do painel: vale em cima do nome salvo, sem mexer nele", () => {
  const renamed = { id: "giltec", name: "Giltec", config: { displayName: "GILTEC Rose" } };
  assert.equal(clientScreenName(renamed), "GILTEC Rose");
  assert.equal(renamed.name, "Giltec");
  assert.equal(portalGreetingName(renamed), "GILTEC Rose");
  assert.equal(clientScreenName({ id: "primeiro-teste", name: "x", config: { displayName: "Novo" } }), "Novo");
  assert.equal(clientScreenName({ id: "primeiro-teste", name: "x", config: {} }), "Flow Arts");
  assert.equal(portalGreetingName({ id: "giltec", name: "Giltec", config: {} }), "GILTEC — Vendedora Rose");
});

test("nome do painel: limpa espaços e recusa nome vazio ou comprido", () => {
  assert.equal(cleanPanelName("  Giltec   Sheila "), "Giltec Sheila");
  assert.equal(cleanPanelName("a"), "");
  assert.equal(cleanPanelName("x".repeat(61)), "");
});

test("salvar o nome muda só o nome que aparece, nunca o id", async () => {
  const { db, env } = database();
  db.prepare("INSERT INTO clients VALUES('giltec-locacoes','Giltec Locações','','','setup','{\"theme\":\"giltec\"}','','')").run();
  const request = body => new Request("https://x/api/master/client-name", { method: "POST", body: JSON.stringify(body) });
  const response = await handleClientName(request({ clientId: "giltec-locacoes", name: "GILTEC Sheila" }), env);
  assert.equal(response.status, 200);
  const row = db.prepare("SELECT id,name,config_json FROM clients").get();
  assert.equal(row.id, "giltec-locacoes");
  assert.equal(row.name, "Giltec Locações");
  assert.deepEqual(JSON.parse(row.config_json), { theme: "giltec", displayName: "GILTEC Sheila" });
  assert.equal((await handleClientName(request({ clientId: "nada", name: "Teste" }), env)).status, 404);
  assert.equal((await handleClientName(request({ clientId: "giltec-locacoes", name: "" }), env)).status, 400);
});

test("a rota do nome e a do quadro exigem login do Master", async () => {
  const index = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const route = index.match(/\/api\/master\/client-name"[\s\S]*?handleClientName/)?.[0] || "";
  assert.match(route, /resolveMasterSession[\s\S]*unauthorized/);
  const board = index.match(/\/api\/master\/missing-posts"[\s\S]*?missingPostsBoard/)?.[0] || "";
  assert.match(board, /resolveMasterSession[\s\S]*unauthorized/);
});
