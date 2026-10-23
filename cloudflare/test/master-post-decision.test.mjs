import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");

test("Master tem rota protegida para aprovar ou recusar post", () => {
  assert.match(master, /\/api\/master\/posts\/decision/);
  assert.match(master, /decidePost\(env, client, postId, decision\)/);
  assert.ok(master.indexOf("/api/master/posts/decision") > master.indexOf("requireMaster(request, env)"));
});

test("painel mostra botões Aprovar e Recusar com confirmação", () => {
  assert.match(app, /data-post-decision="approved"/);
  assert.match(app, /data-post-decision="rejected"/);
  assert.match(app, /window\.confirm\(question\)/);
});

test("menu do Master: Início, Postagens e WhatsApp na frente; o resto em Mais (CRM saiu do Master em 22/10)", () => {
  const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
  const nav = html.slice(html.indexOf("<nav>"), html.indexOf("</nav>"));
  const views = [...nav.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(views, ["dashboard", "posts", "whatsapp", "clients", "odin", "agents", "site", "settings"]);
});

test("clientes arquivados não aparecem na lista do painel", () => {
  const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
  assert.match(master, /String\(client\.status \|\| ""\) !== "archived"/);
});

test("Master: botão Excluir em todos os posts e rota de exclusão protegida", () => {
  const app = fs.readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");
  const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
  assert.match(app, /data-post-delete/);
  assert.match(app, /\/api\/master\/posts\/delete/);
  assert.match(master, /"\/api\/master\/posts\/delete"[\s\S]{0,900}deletePostFromPanel/);
});
