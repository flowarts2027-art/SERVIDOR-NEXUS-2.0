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
