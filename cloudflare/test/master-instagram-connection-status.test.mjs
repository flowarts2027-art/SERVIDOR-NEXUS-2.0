import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");

test("Master exposes safe per-account Instagram connection status", () => {
  assert.match(master, /\/api\/master\/instagram\/accounts-status/);
  assert.match(master, /"globalplay-streaming",\s*"ragnar-one",\s*\.\.\.\(await listClients\(env\)/);
  assert.match(master, /instagramCredentialStatus\(env, id\)/);
});

test("Master lista a conexão do Instagram de todos os clientes e esconde Autorizar quando válida", () => {
  assert.match(app, /account\.tokenValid&&account\.accountMatches/);
  assert.match(app, /valid\|\|paused\?"":/);
  assert.match(html, /id="instagram-account-rows"/);
  assert.doesNotMatch(html, /Global Play|Ragnar/);
});
