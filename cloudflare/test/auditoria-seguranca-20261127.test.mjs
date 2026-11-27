// Auditoria de segurança de 27/11/2026 (skill auditoria-producao).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { frameGuard } from "../src/frame-guard.js";

const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const master = fs.readFileSync(new URL("../src/master.js", import.meta.url), "utf8");

test("nenhuma página abre dentro de outro site", async () => {
  const out = frameGuard(new Response("<p>oi</p>", { status: 200, headers: { "content-type": "text/html" } }));
  assert.equal(out.headers.get("x-frame-options"), "DENY");
  assert.match(out.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(await out.text(), "<p>oi</p>");
  // Funciona também com resposta de cabeçalho travado (redirecionamento).
  const r = frameGuard(Response.redirect("https://exemplo.test/login", 302));
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), "https://exemplo.test/login");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  // Mantém uma política que já existia.
  const c = frameGuard(new Response("", { headers: { "content-security-policy": "default-src 'self'" } }));
  assert.match(c.headers.get("content-security-policy"), /^default-src 'self'; frame-ancestors 'none'$/);
});

test("login: a trava contra adivinhar senha vem antes de conferir a senha", () => {
  const login = index.slice(index.indexOf('url.pathname === "/api/auth/login"'));
  assert.ok(login.indexOf("loginRateLimitStatus") < login.indexOf("masterCredentialsValid"), "/api/auth/login");
  for (const rota of ['"/master-login"', '"/api/master/desktop-login"', '"/api/master/access" && request.method === "POST"']) {
    const trecho = master.slice(master.indexOf(rota));
    assert.ok(trecho.indexOf("loginRateLimitStatus") < trecho.indexOf("masterCredentialsValid"), rota);
  }
});

test("páginas de status dos clientes só abrem com login", () => {
  for (const rota of ['"/api/instagram-publishing-health"', '"/api/emergency-publisher-status"']) {
    const trecho = index.slice(index.indexOf(rota), index.indexOf(rota) + 400);
    assert.match(trecho, /internalOrMaster\(request, env\)/, rota);
  }
});
