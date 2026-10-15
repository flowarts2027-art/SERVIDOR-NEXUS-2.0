import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = name => fs.readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");

test("painel do cliente no celular: 5 botões + Mais, e vira app na tela inicial", () => {
  const html = read("portal.html");
  assert.match(html, /id="more-btn"/);
  assert.match(html, /id="more-sheet"/);
  for (const tab of ["numeros", "contatos", "negocio", "conta"]) assert.match(html, new RegExp(`data-tab="${tab}" class="more-tab"`));
  assert.match(html, /rel="manifest" href="\/portal\.webmanifest"/);
  const manifest = JSON.parse(read("portal.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/portal");
  const css = read("client-lite.css");
  assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.login input\[name\] \{ width: 100%;/);
});

test("Master no celular: 4 telas + Mais, tabelas em cartões, vira app", () => {
  const html = read("index.html");
  assert.match(html, /id="master-more-btn"/);
  assert.match(html, /rel="manifest" href="\/master\.webmanifest"/);
  assert.equal(JSON.parse(read("master.webmanifest")).start_url, "/api/master/console");
  assert.match(read("styles.css"), /\.table-wrap thead\{display:none\}/);
  assert.match(read("app.js"), /function toggleMasterMore/);
  for (const icon of ["brand/app-cliente-192.png", "brand/app-cliente-512.png", "assets/app-master-192.png", "assets/app-master-512.png"]) {
    assert.ok(fs.statSync(new URL("../../public/" + icon, import.meta.url)).size > 1000, icon);
  }
});

test("Master em preto e branco: sem verde no estilo; vermelho de erro mantido", () => {
  const css = read("styles.css");
  assert.doesNotMatch(css, /#22c55e|#24e27a|#7bf3a5|#31e676/i);
  assert.match(css, /--green:#fff/);
  assert.match(css, /--silver:linear-gradient/);
  assert.match(css, /--danger:#ff5d67/);
});

test("Notificações: filtros funcionam, chamado 'open' vira novo e Resolver salva sem janela do navegador", async () => {
  const app = read("app.js");
  assert.match(app, /\$\$\("\[data-support-filter\]"\)\.forEach/);
  assert.doesNotMatch(app, /alert\("Não foi possível atualizar o chamado\."\)/);
  const { updateSupportTicketStatus } = await import("../src/master.js");
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE support_tickets(id TEXT PRIMARY KEY, client_id TEXT, status TEXT, subject TEXT, payload_json TEXT, created_at TEXT, updated_at TEXT); INSERT INTO support_tickets(id,client_id,status) VALUES('t1','c1','open');");
  const DB = { prepare: sql => ({ bind: (...a) => ({ run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }) }) }) };
  assert.deepEqual(await updateSupportTicketStatus({ DB }, "t1", "resolved"), { ok: true, id: "t1", status: "resolved" });
  assert.equal(db.prepare("SELECT status FROM support_tickets").get().status, "resolved");
  await assert.rejects(updateSupportTicketStatus({ DB }, "t1", "apagado"), /status_invalid/);
  await assert.rejects(updateSupportTicketStatus({ DB }, "nao", "read"), /ticket_not_found/);
  const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
  assert.ok(master.indexOf("supportTicketMatch") > master.indexOf('if (!await requireMaster(request, env)) return json({ error: "unauthorized" }, 401);'), "só com login do Master");
});

test("Café Brisa (demo) não fica com Instagram: bloqueia conectar e remove a conexão a cada ciclo", async () => {
  const src = fs.readFileSync(new URL("../src/instagram.js", import.meta.url), "utf8");
  assert.equal((src.match(/assertInstagramAllowed\(client\.id\);/g) || []).length, 3);
  const { ensureDemoClient } = await import("../src/demo-client.js");
  const ran = [];
  const env = { DB: { prepare: sql => ({ bind: (...a) => ({ run: async () => { ran.push([sql, a]); return {}; }, first: async () => null }) }) } };
  await ensureDemoClient(env).catch(() => {});
  assert.ok(ran.some(([sql, a]) => /DELETE FROM connections WHERE client_id = \?1/.test(sql) && a[0] === "demo-cafe"));
  const { connectInstagramWithToken } = await import("../src/instagram.js");
  const env2 = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({ id: "demo-cafe", name: "Café Brisa", config_json: "{}" }) }) }) } };
  await assert.rejects(connectInstagramWithToken(env2, "demo-cafe", "token"), /instagram_blocked_client/);
});
