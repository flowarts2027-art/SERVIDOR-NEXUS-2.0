import test from "node:test";
import assert from "node:assert/strict";
import { instagramPublishTarget } from "../src/publisher.js";

test("reel never falls back to image when format builder is pending", () => {
  const target = instagramPublishTarget({
    imageUrl: "https://example.com/fallback.jpg",
    creativeFeatures: { requestedFormat: "reel" },
    qualityGates: { formatBuilder: "pending" },
    formatBuild: {}
  });
  assert.deepEqual(target, { ok:false, kind:"reel", error:"format_build_pending" });
});

test("approved reel resolves only the rendered video asset", () => {
  const target = instagramPublishTarget({
    imageUrl: "https://example.com/source.jpg",
    creativeFeatures: { requestedFormat: "reel" },
    qualityGates: { formatBuilder: "approved" },
    formatBuild: { videoUrl: "https://example.com/final.mp4" }
  });
  assert.deepEqual(target, { ok:true, kind:"reel", videoUrl:"https://example.com/final.mp4" });
});

test("carousel requires approved builder and at least two public cards", () => {
  const pending = instagramPublishTarget({
    creativeFeatures: { requestedFormat: "carousel" },
    qualityGates: { formatBuilder: "pending" },
    formatBuild: { carouselUrls:["https://example.com/a.jpg","https://example.com/b.jpg"] }
  });
  assert.equal(pending.error, "format_build_pending");

  const ready = instagramPublishTarget({
    creativeFeatures: { requestedFormat: "carousel" },
    qualityGates: { formatBuilder: "approved" },
    formatBuild: { carouselUrls:["https://example.com/a.jpg","https://example.com/b.jpg"] }
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.kind, "carousel");
  assert.equal(ready.carouselUrls.length, 2);
});

test("ordinary post resolves image asset", () => {
  const target = instagramPublishTarget({
    creativeFeatures: { requestedFormat: "post" },
    imageUrl: "https://example.com/post.jpg"
  });
  assert.deepEqual(target, { ok:true, kind:"post", imageUrl:"https://example.com/post.jpg" });
});
