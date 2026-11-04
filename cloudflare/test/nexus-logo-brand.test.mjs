import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../../public/" + file, import.meta.url), "utf8");
const asset = "/assets/nexus-logo-azul-oficial.webp";

test("Marca oficial do NEXUS aparece no Master e no Portal", () => {
  const master = read("index.html");
  const portal = read("portal.html");
  assert.ok(master.includes("/assets/nexus-mark-green.png"));
  assert.ok(portal.includes(asset));
  assert.ok(portal.includes("/assets/nexus-mark-green.png"));
  assert.ok(portal.includes("nexus-top-logo"));
  assert.ok(portal.includes("nexus-login-logo"));
  assert.ok(!master.includes("/assets/nexus-mark-blue.svg"));
  assert.ok(!portal.includes("/assets/nexus-mark-blue.svg"));
});

test("Arquivo WebP oficial antigo preservado e marca personalizada mantida", () => {
  const logo = readFileSync(new URL("../../public" + asset, import.meta.url));
  assert.equal(logo.toString("ascii", 0, 4), "RIFF");
  assert.equal(logo.toString("ascii", 8, 12), "WEBP");
  assert.ok(read("client-lite.js").includes("/brand/daniela-martins-logo.png"));
  assert.ok(read("client-lite.css").includes('html[data-client-theme="daniela-martins"] .nexus-top-logo'));
});
