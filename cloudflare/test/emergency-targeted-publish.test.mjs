import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const emergency = fs.readFileSync(new URL("../src/emergency-publisher.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

test("emergency publisher can target exactly one managed Instagram client", () => {
  assert.match(emergency, /runEmergencyPublisher\(env, now = new Date\(\), targetClientId = "", options = \{\}\)/);
  assert.match(emergency, /CLIENTS\.filter\(client => client\.id === String\(targetClientId\)\)/);
  assert.match(emergency, /unknown_client/);
  assert.match(index, /url\.searchParams\.get\("format"\)/);
  assert.match(index, /forceTest/);
});

test("emergency publish route forwards clientId to targeted publisher", () => {
  assert.match(index, /url\.searchParams\.get\("clientId"\)/);
  assert.match(index, /runEmergencyPublisher\(env, new Date\(\), targetClientId, \{ format, forceTest, testId:[^}]+\}\)/);
});

test("emergency carousel uses branded overlay generation instead of raw images", () => {
  assert.match(emergency, /import \{ generateOriginalMedia \} from "\.\/media-generation\.js"/);
  assert.doesNotMatch(emergency, /buildVisualPrompt/);
  assert.match(emergency, /title: overlayTitle/);
  assert.match(emergency, /CHEGA DE TRAVAR/);
  assert.match(emergency, /DIGITE QUERO/);
  assert.match(emergency, /No abstract TV gradients/);
});
