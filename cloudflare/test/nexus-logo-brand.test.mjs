import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) => readFileSync(new URL("../../public/" + file, import.meta.url), "utf8");
const asset = "/assets/nexus-logo-azul-oficial.webp";

test("Marca Nexus oficial aparece no Master e no Portal", () => {
  const master = read("index.html");
  const portal = read("portal.html");
  assert.match(master, /nexus-logo-azul-oficial\\.webp/);
  assert.match(portal, /nexus-logo-azul-oficial\\.webp/);
  assert.match(portal, /nexus-top-logo/);
  assert.match(portal, /nexus-login-logo/);
  assert.doesNotMatch(master, /nexus-mark-blue\\.svg/);
  assert.doesNotMatch(portal, /nexus-mark-blue\\.svg/);
});

test("Arte WebP é válida e logotipos próprios são preservados", () => {
  const logo = readFileSync(new URL("../../public" + asset, import.meta.url));
  assert.equal(logo.toString("ascii", 0, 4), "RIFF");
  assert.equal(logo.toString("ascii", 8, 12), "WEBP");
  assert.match(read("client-lite.js"), /daniela-martins-logo\\.png/);
  assert.match(read("client-lite.css"), /data-client-theme="daniela-martins"\\] \\.nexus-top-logo/);
});
