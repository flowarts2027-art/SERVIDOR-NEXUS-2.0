import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localUploadReceptionProgress, localHelperStaleReason } from "../src/github-video-render.js";
import { videoErrorMessages } from "../src/video-source.js";

test("Only confirmed bytes sent by the PC advance upload from 12 to 19%", () => {
  const total = 80 * 1024 * 1024;
  assert.equal(localUploadReceptionProgress(0,total),12);
  assert.equal(localUploadReceptionProgress(total/2,total),15);
  assert.equal(localUploadReceptionProgress(total,total),19);
  assert.equal(localUploadReceptionProgress(total/3,total,17),17);
  assert.equal(localUploadReceptionProgress(total+1,total),12);
  assert.equal(localUploadReceptionProgress(-1,total),12);
  assert.equal(localUploadReceptionProgress(total,0),12);
  assert.equal(localUploadReceptionProgress(total,100*1024*1024),12);
});

test("A claimed R2 upload expires only after eight minutes without helper activity", () => {
  const now = Date.parse("2026-10-08T15:00:00Z");
  const iso = minutes=>new Date(now-minutes*60000).toISOString();
  const job={ingestTransport:"local-helper",localUploadConsumedAt:iso(12),
    localHelperStage:"ENVIANDO AO NEXUS",localHelperUpdatedAt:iso(3)};
  assert.equal(localHelperStaleReason(job,iso(12),now),"");
  assert.equal(localHelperStaleReason({...job,localHelperUpdatedAt:iso(9)},iso(12),now),"local_upload_stalled");
  assert.equal(localHelperStaleReason({ingestTransport:"local-helper",localUploadConsumedAt:iso(9)},iso(9),now),"local_upload_stalled");
  assert.equal(localHelperStaleReason({ingestTransport:"other",localUploadConsumedAt:iso(30)},iso(30),now),"");
  assert.match(videoErrorMessages.local_upload_stalled,/12%/);
});

test("Claim remains authenticated for heartbeats, but a second PUT is rejected", () => {
  const source=readFileSync(new URL("../src/github-video-render.js",import.meta.url),"utf8");
  assert.match(source,/settings\.localUploadConsumedAt = new Date\(\)\.toISOString\(\)/);
  const start=source.indexOf('if (url.pathname === "/api/local-video-ingest/upload")');
  const body=source.slice(start,source.indexOf('if (url.pathname.startsWith("/api/internal/video-ingest/"))',start));
  const claim=body.indexOf('settings.localUploadConsumedAt =');
  const deleteToken=body.indexOf('delete settings.localUploadTicket;');
  assert.ok(claim >= 0 && deleteToken > claim, "Upload ticket must survive during R2.put");
  assert.match(body,/if \(row\.status !== "importing" \|\| settings\.localUploadConsumedAt\)/);
  assert.match(body,/json_extract\(settings_json,'\$\.localUploadConsumedAt'\)=\?6/);
  assert.match(body,/await env\.MEDIA\.delete\?\.\(key\)/);
  assert.match(source,/Math\.floor\(100 \* sent \/ total\)/);
});
