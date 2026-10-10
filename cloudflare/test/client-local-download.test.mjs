import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../public/client-lite.js", import.meta.url), "utf8");

test("server video generation is the default; local Nexus helper is an explicit alternative", () => {
  assert.match(source, /action: useLocalHelper \? "local_generate" : "server_generate"/);
  assert.match(source, /let useLocalHelper = false/);
  assert.match(source, /if \(preferLocal && isYouTubeTrailer\)/);
  assert.match(source, /pcAlternative\.addEventListener\("click", \(\) => startTrailerJob\(item, pcAlternative, actionStatus, true\)/);
  assert.match(source, /useLocalHelper = helperAvailable && !helperBusy && !helperOutdated/);
  assert.match(source, /fetch\("http:\/\/127\.0\.0\.1:8765\/handoff"/);
  assert.match(source, /JSON\.stringify\(job\.localUpload\)/);
  assert.match(source, /Download iniciado no computador\. O upload para o NEXUS será automático\./);
  assert.match(source, /download\.addEventListener\("click", \(\) => downloadTrailerOnly\(item, download, actionStatus\)\)/);
});

test("legacy popup and manual local-download flow are absent", () => {
  assert.doesNotMatch(source, /window\.open\(/);
  assert.doesNotMatch(source, /function downloadTrailerOnPC\(/);
  assert.doesNotMatch(source, /about:blank/);
});
