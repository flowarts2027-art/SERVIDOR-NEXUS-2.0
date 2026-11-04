import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../../public/" + file, import.meta.url), "utf8");
const asset = "/assets/nexus-logo-azul-oficial.webp";

// 03/11/2026: Master e login do cliente usam o N verde (gerado no deploy por scripts/generate_nexus_green.py);
// dentro do painel do cliente continua a logo azul oficial.
test("Marca oficial do NEXUS aparece no Master e no Portal", () => {
  const master = read("index.html");
  const portal = read("portal.html");
  assert.ok(master.includes("/assets/nexus-mark-green.png"));
  assert.ok(portal.includes("/assets/nexus-mark-green.png"));
  assert.ok(portal.includes(asset));
  assert.ok(portal.includes("nexus-top-logo"));
  assert.ok(portal.includes("nexus-login-logo"));
  assert.ok(!master.includes("/assets/nexus-mark-blue.svg"));
  assert.ok(!portal.includes("/assets/nexus-mark-blue.svg"));
});

test("Arquivo WebP válido e marca personalizada preservada", () => {
  const logo = readFileSync(new URL("../../public" + asset, import.meta.url));
  assert.equal(logo.toString("ascii", 0, 4), "RIFF");
  assert.equal(logo.toString("ascii", 8, 12), "WEBP");
  assert.ok(read("client-lite.js").includes("/brand/daniela-martins-logo.png"));
  assert.ok(read("client-lite.css").includes('html[data-client-theme="daniela-martins"] .nexus-top-logo'));
});

test("Tema da Quatree Dog usa a logo oficial e as cores dela, preso ao cliente", () => {
  const css = read("client-lite.css");
  const js = read("client-lite.js");
  const block = js.slice(js.indexOf('"quatree-dog": {'), js.indexOf("let defaultBrandHtml"));
  assert.ok(block.includes('logo: "/brand/quatree-logo.png"'));
  assert.ok(block.includes('themeColor: "#88401C"'));
  const png = readFileSync(new URL("../../public/brand/quatree-logo.png", import.meta.url));
  assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a", "a logo precisa ser PNG de verdade");
  const start = css.indexOf("/* ===== Tema da cliente Quatree Dog");
  const rules = css.slice(start, css.indexOf("/* Navegação móvel global", start));
  assert.ok(rules.includes('html[data-client-theme="quatree-dog"] {'));
  assert.ok(rules.includes('html[data-client-theme="quatree-dog"] .nexus-top-logo'));
  for (const color of ["#E88400", "#C03C34", "#88401C"]) assert.ok(rules.includes(color), "falta a cor " + color);
  for (const old of ["#C8102E", "#8B0A1F", "#B8BCC2"]) assert.ok(!rules.includes(old), "cor antiga: " + old);
  for (const line of rules.split(/\r?\n/)) {
    if (/^\s*[.#]/.test(line)) assert.fail("regra sem o escopo da Quatree: " + line);
  }
});
