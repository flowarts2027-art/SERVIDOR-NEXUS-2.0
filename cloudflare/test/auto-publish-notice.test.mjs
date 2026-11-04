import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Aviso vermelho de publicação automática no cartão do post (03/11/2026).
const js = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../public/client-lite.css", import.meta.url), "utf8");
const start = js.indexOf("const REVIEW_WINDOW_MS");
const end = js.indexOf("function autoPublishNoticeHtml");
const box = {};
vm.runInNewContext(js.slice(start, end) + "\nthis.autoPublishNotice = autoPublishNotice;", box);
const notice = box.autoPublishNotice;

const base = { createdBy: "master", status: "ready", approvalStatus: "pending", scheduledFor: "2026-11-04T12:00:00.000Z", createdAt: "2026-11-03 20:00:00" };
const NOW = Date.parse("2026-11-04T09:00:00.000Z");

test("aviso fica no topo do cartão, perto do selo, e é vermelho", () => {
  assert.match(js, /\$\{formatBadgeHtml\(post\)\}\s*\$\{autoPublishNoticeHtml\(post\)\}\s*\$\{tagHtml\(post\)\}/);
  assert.match(css, /\.auto-publish-notice \{[^}]*#c62828/);
  assert.doesNotMatch(js.slice(js.indexOf("function actionsButtonsHtml"), js.indexOf("function tagHtml")), /autoPublish/);
});

test("mostra o prazo 1 hora antes, no horário de Brasília", () => {
  const n = notice(base, NOW);
  assert.equal(n.closed, false);
  assert.match(n.text, /até 04\/11 às 08:00 \(1 hora antes\)/);
  assert.match(n.text, /publicado automaticamente/);
});

test("depois do prazo ou aprovado por silêncio: prazo encerrado", () => {
  assert.equal(notice(base, Date.parse("2026-11-04T11:30:00Z")).closed, true);
  const n = notice({ ...base, approvalStatus: "approved", autoApproval: { status: "aprovado_por_silencio" } }, NOW);
  assert.match(n.text, /Prazo de ajuste encerrado.*09:00/);
});

test("sem aviso: post de IA, ajuste pedido, publicado, aprovado pelo cliente, sem janela", () => {
  assert.equal(notice({ ...base, createdBy: "agent" }, NOW), null);
  assert.equal(notice({ ...base, approvalStatus: "correction_requested" }, NOW), null);
  assert.equal(notice({ ...base, revisionRequestedAt: "x" }, NOW), null);
  assert.equal(notice({ ...base, status: "published" }, NOW), null);
  assert.equal(notice({ ...base, approvalStatus: "approved" }, NOW), null);
  assert.equal(notice({ ...base, createdAt: "2026-11-04 11:30:00" }, NOW), null);
  assert.equal(notice({ ...base, autoApproval: { status: "sem_janela" } }, NOW), null);
});

test("volta da conexão do Instagram: Radar só para a Flow Arts; outros clientes vão para Conta", async () => {
  const { instagramReturnPath } = await import("../src/portal.js");
  assert.equal(instagramReturnPath("primeiro-teste"), "/portal.html?tab=radar");
  assert.equal(instagramReturnPath("giltec"), "/portal.html?tab=instagram");
  assert.match(js, /wantedTab === "radar" && document\.querySelector\('\[data-tab="radar"\]:not\(\[hidden\]\)'\) \? "radar"/);
});
