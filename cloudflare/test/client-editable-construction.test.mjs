import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const portal = readFileSync(new URL("../../public/portal.html", import.meta.url), "utf8");
const client = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../public/client-lite.css", import.meta.url), "utf8");

test("editable mode is explicitly disabled and advertises construction status", () => {
  assert.match(portal, /<button id="video-mode-edit"[^>]*\bdisabled\b[^>]*>/);
  assert.match(portal, /<span class="mode-title">Vídeo editável<\/span>\s*<small>Em construção<\/small>/);
  assert.match(css, /#video-mode-edit:disabled/);
  assert.match(portal, /<button id="video-mode-auto" class="active"[^>]*data-video-mode="auto"/);
});

test("unfinished editing cannot be activated or dispatched from the client UI", () => {
  assert.match(client, /const VIDEO_EDITABLE_ENABLED = false/);
  assert.match(client, /videoCreationMode = VIDEO_EDITABLE_ENABLED && mode === "edit" \? "edit" : "auto"/);
  assert.match(client, /async function generateEditableVideo\(\) \{\s*if \(!VIDEO_EDITABLE_ENABLED\) return;/);
  assert.match(client, /function bindEditableSource\(job\) \{\s*if \(!VIDEO_EDITABLE_ENABLED\) return;/);
  assert.doesNotMatch(client, /editSource\.textContent = "Editar este vídeo"/);
});

test("automatic video controls, catalogue search and original download remain available", () => {
  for (const id of ["trailer-search-form", "trailer-search-btn", "trailer-query", "video-whatsapp-number", "media-upload-form", "video-job-list"]) {
    assert.match(portal, new RegExp('id="' + id + '"'));
  }
  assert.match(client, /sourceDownload\.textContent = "Baixar original"/);
  assert.match(client, /\$\("#trailer-search-form"\)\?\.addEventListener\("submit", searchTrailers\)/);
  assert.match(portal, /id="video-editor-panel"[^>]*hidden/);
});
