import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../../public/client-lite.js", import.meta.url), "utf8");
const start = source.indexOf("function trailerStartFailureMessage(");
const end = source.indexOf("\nasync function startTrailerJob(", start);
assert.ok(start >= 0 && end > start, "Error formatter must exist in client bundle");
const format = vm.runInNewContext("(" + source.slice(start, end).trim() + ")", {});

test("initial Cloudflare error preserves original actionable message without false recovery", () => {
  const message = format(new Error("O pôster oficial não foi encontrado no catálogo."), null);
  assert.match(message, /Não foi possível iniciar o vídeo/);
  assert.match(message, /O pôster oficial não foi encontrado/);
  assert.doesNotMatch(message, /recuperação automática/);
});
test("30-second initial request timeout is visible instead of generic recovery failure", () => {
  const message = format(new DOMException("signal timed out", "TimeoutError"), null);
  assert.match(message, /Cloudflare demorou|demorou para responder/);
  assert.match(message, /não confirmou um ticket/);
});
test("busy/old local helper and expected YouTube rejection have distinct guidance", () => {
  const job = {jobId:"video_123"};
  assert.match(format(new Error("404: rota /handoff indisponível"), job), /versão.*antiga/i);
  assert.match(format(new Error("Um download já está em andamento."), job), /download atual terminar/);
  assert.match(format(new Error("local_helper_failed"), job, {requiresLocalHelper:true}), /Windows/);
  assert.match(format(new Error("local_helper_failed"), job, {fallbackStarted:true}), /confirmou a continuação/);
  assert.match(format(new Error("local_helper_failed"), job, {ignored:true}), /já recebeu este trabalho/);
});
test("video ticket must be created before any slow enrichment of cast or related films", () => {
  const portal = readFileSync(new URL("../src/portal.js", import.meta.url),"utf8");
  const entry = portal.slice(portal.indexOf('if (url.pathname === "/api/portal/videos/youtube"'), portal.indexOf('const localFailMatch ='));
  assert.ok(entry.includes("const publisherMovie ="),"publisher trailer identity required");
  assert.ok(entry.includes("const id = \"video_\""),"ticket creation required");
  assert.doesNotMatch(entry,/await enrichVerifiedFilmPresentation\(/,
    "Enrichment cannot block creation of the YouTube ticket");
  const render = readFileSync(new URL("../src/github-video-render.js", import.meta.url),"utf8");
  assert.match(render,/await enrichVerifiedFilmPresentation\(settings.movieMetadata \|\| \{\}\)/);
  assert.ok(render.indexOf("await enrichVerifiedFilmPresentation") > render.indexOf("await confirmedVideoSource(env"),
    "Cast and related title enrichment must happen only after R2 source confirmation");
  assert.match(source,/detail\.handoffReady === false/);
  assert.doesNotMatch(source,/O NEXUS não conseguiu iniciar a recuperação automática/);
});

test("server generation and download remain available while PC is opt-in", () => {
  assert.match(source, /actions\.append\(generate, download, pcAlternative, watch\)/);
  assert.match(source, /download\.addEventListener\("click", \(\) => downloadTrailerOnly/);
  assert.match(source, /pcAlternative\.addEventListener\("click", \(\) => startTrailerJob\(item, pcAlternative, actionStatus, true\)/);
  assert.match(source, /async function startTrailerJob\(item, button, actionStatus, preferLocal = false\)/);
  assert.match(source, /let useLocalHelper = false/);
  assert.match(source, /if \(preferLocal && isYouTubeTrailer\)/);
  assert.match(source, /action: useLocalHelper \? "local_generate" : "server_generate"/);
  assert.match(source, /action: "download"/);
  assert.match(source, /Gerar pelo meu PC/);
  assert.match(source, /retryFailedYouTubeViaPC\(job, retryOnPC\)/);
  const portal = readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  const start = portal.indexOf('const sourceProvider = directSourceUrl ? "catalog-preview" : "youtube"');
  const createJob = portal.indexOf('const id = "video_"', start);
  assert.ok(start >= 0 && createJob > start, "server jobs must be created");
  assert.doesNotMatch(portal.slice(start, createJob), /if \(sourceProvider === "youtube" && action !== "local_generate"\)/,
    "YouTube server attempt must not be rejected before dispatch");
  assert.match(portal, /await startYouTubeVideoIngest\(env, client.id, id\)/);
  assert.match(portal, /retryFailedYoutubeIngestWithLocalHelper\(env, client.id, jobId\)/);
});
