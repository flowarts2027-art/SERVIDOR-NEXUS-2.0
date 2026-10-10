// Nexus #96: editor model regression checks. No browser or extra dependencies.
"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const overlays = require("../public/video-overlay-core.js");

test("preview text is proportional to the encoded 1080px canvas", () => {
  assert.equal(overlays.previewFontPixels(26, 1080), 78);
  assert.equal(overlays.previewFontPixels(26, 270), 19.5);
  assert.equal(overlays.previewFontPixels(26, 540), 39);
});
test("coordinates, duration and style remain bounded", () => {
  const item = overlays.normalize({
    type: "text", text: "NEXUS", x: 120, y: -6, fontSize: 999,
    start: -10, end: 9999, effect: "unknown", color: "invalid"
  }, 12);
  assert.equal(item.x, 100);
  assert.equal(item.y, 0);
  assert.equal(item.fontSize, 90);
  assert.equal(item.start, 0);
  assert.equal(item.end, 12);
  assert.equal(item.effect, "none");
  assert.equal(item.color, "#ffffff");
  assert.equal(overlays.visibleAt(item, 11.9), true);
  assert.equal(overlays.visibleAt(item, 12), false);
});
test("unsafe sticker URLs and HTML payloads are rejected or handled as plain text", () => {
  assert.throws(() => overlays.normalize({ type: "sticker", src: "javascript:alert(1)" }));
  assert.throws(() => overlays.normalize({ type: "gif", src: "//attacker.example/a.gif" }));
  assert.throws(() => overlays.normalize({ type: "gif", src: "http://attacker.example/a.gif" }));
  const item = overlays.normalize({ type: "text", text: "<img src=x onerror=alert(1)>" });
  assert.equal(item.text, "<img src=x onerror=alert(1)>");
});

test("pointer dragging updates normalized coordinates without scrolling", () => {
  const layer = overlays.normalize({ type: "text", text: "Mova", x: 50, y: 50 });
  const handlers = new Map();
  const el = {
    parentElement: { getBoundingClientRect: () => ({ width: 270, height: 480 }) },
    style: {},
    addEventListener: (type, handler) => handlers.set(type, handler),
    setPointerCapture: () => {},
  };
  let changed = 0, prevented = false;
  overlays.attachDrag(el, layer, () => changed++);
  handlers.get("pointerdown")({ button: 0, pointerId: 3, clientX: 100, clientY: 100, preventDefault() { prevented = true; } });
  handlers.get("pointermove")({ pointerId: 3, clientX: 127, clientY: 148 });
  assert.equal(prevented, true);
  assert.equal(layer.x, 60);
  assert.equal(layer.y, 60);
  assert.equal(el.style.left, "60%");
  assert.equal(changed, 1);
  handlers.get("pointerup")({ pointerId: 3 });
  handlers.get("pointermove")({ pointerId: 3, clientX: 200, clientY: 200 });
  assert.equal(changed, 1);
});
test("responsive styles do not override dynamically computed overlay font sizes", () => {
  const fs = require("node:fs");
  const css = fs.readFileSync(require("node:path").join(__dirname, "../public/video-overlay-ui.css"), "utf8");
  assert.equal(/\.nexus-overlay\s*\{[^}]*font-size\s*:[^}]*!important/i.test(css), false);
  assert.match(css, /\.nexus-overlay-surface/);
});
