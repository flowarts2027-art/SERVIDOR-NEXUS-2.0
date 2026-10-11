import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A ferramenta de vídeo saiu do painel do cliente (2026-10-11). As rotas de
// vídeo continuam no servidor; aqui ficam só as garantias do lado do servidor.

test("video ticket must be created before any slow enrichment of cast or related films", () => {
  const portal = readFileSync(new URL("../src/portal.js", import.meta.url),"utf8");
  const entry = portal.slice(portal.indexOf('if (url.pathname === "/api/portal/videos/youtube"'), portal.indexOf('const localFailMatch ='));
  assert.ok(entry.includes("const publisherMovie ="),"publisher trailer identity required");
  assert.ok(entry.includes("const id = \"video_\""),"ticket creation required");
  assert.doesNotMatch(entry,/await enrichVerifiedFilmPresentation\(/);
  const render = readFileSync(new URL("../src/github-video-render.js", import.meta.url),"utf8");
  assert.match(render,/await enrichVerifiedFilmPresentation\(settings.movieMetadata \|\| \{\}\)/);
  assert.ok(render.indexOf("await enrichVerifiedFilmPresentation") > render.indexOf("await confirmedVideoSource(env"));
});

test("server video jobs are still created and retried on the server", () => {
  const portal = readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  const start = portal.indexOf('const sourceProvider = directSourceUrl ? "catalog-preview" : "youtube"');
  const createJob = portal.indexOf('const id = "video_"', start);
  assert.ok(start >= 0 && createJob > start);
  assert.match(portal, /await startYouTubeVideoIngest\(env, client.id, id\)/);
  assert.match(portal, /retryFailedYoutubeIngestWithLocalHelper\(env, client.id, jobId\)/);
});
