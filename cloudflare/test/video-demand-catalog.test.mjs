import test from "node:test";
import assert from "node:assert/strict";
import { catalogMetadata, catalogItemById } from "../src/video-catalog.js";
import { indexCatalogResults, rankCatalogDemand, verifyPosterLocation } from "../src/video-demand-catalog.js";
import { readVerifiedPoster } from "../src/video-poster-library.js";
import { rankYoutubePosterDemand } from "../src/youtube-poster-demand.js";

test("Top YouTube panel searches rank movies and series independently; trailer-view seeds are not search counts", () => {
  const rows = [
    { settings_json: JSON.stringify({ searchOnly: true, searchType: "series", contentTitle: "Dexter: Resurrection" }) },
    { settings_json: JSON.stringify({ searchOnly: true, searchType: "series", contentTitle: "Dexter: Resurrection" }) },
    { settings_json: JSON.stringify({ searchOnly: true, searchType: "movie", contentTitle: "Homem-Aranha" }) },
    { settings_json: JSON.stringify({ searchOnly: true, searchType: "series", contentTitle: "Homem-Aranha" }) },
    { settings_json: JSON.stringify({ searchOnly: false, searchType: "movie", contentTitle: "ignored" }) }
  ];
  const active = rankCatalogDemand(rows, new Date("2026-10-08T09:00:00Z"));
  assert.equal(active[0].title, "Dexter: Resurrection");
  assert.equal(active[0].searches, 2);
  assert.ok(active.some(item => item.type === "series" && item.title === "Homem-Aranha"));
  assert.ok(active.some(item => item.type === "movie" && item.title === "Homem-Aranha"));
  assert.ok(active.some(item => item.signal === "youtube-trailer-views" && item.searches === 0));
  const future = rankCatalogDemand(rows, new Date("2026-11-08T09:00:00Z"));
  assert.ok(future.every(item => item.searches > 0));
  const legacy = rankYoutubePosterDemand([
    { query: "Homem-Aranha", type: "movie", searches: 3 },
    { query: "Homem-Aranha", type: "series", searches: 2 }
  ], [], 5);
  assert.equal(legacy.length, 2);
});

test("Selected film and series catalogue IDs resolve even when text search returns zero entries", async () => {
  const original = global.fetch;
  global.fetch = async raw => {
    const url = String(raw);
    if (url.includes("/lookup?id=123&")) return new Response(JSON.stringify({
      results: [{ trackId: 123, trackName: "Homem-Aranha", releaseDate: "2026-10-01",
        artworkUrl100: "https://is1-ssl.mzstatic.com/img/100x100bb.jpg" }]
    }));
    if (url.includes("/shows/99/cast")) return new Response(JSON.stringify([]));
    if (url.includes("/shows/99")) return new Response(JSON.stringify({
      id: 99, name: "Dexter: Resurrection", premiered: "2025-06-01",
      image: { original: "https://static.tvmaze.com/poster.jpg" }, genres: ["Drama"], rating: { average: 8 },
      url: "https://www.tvmaze.com/shows/99"
    }));
    if (url.includes("/shows?page=0")) return new Response(JSON.stringify([]));
    if (url.includes("/search/shows")) return new Response(JSON.stringify([]));
    if (url.includes("itunes.apple.com/search")) return new Response(JSON.stringify({ results: [] }));
    return new Response(JSON.stringify({ search: [] }));
  };
  try {
    const movie = await catalogMetadata("Homem-Aranha", "movie", "itunes:123");
    assert.equal(movie.id, "itunes:123");
    assert.ok(movie.posterUrl.includes("600x900bb"));
    const show = await catalogMetadata("Dexter: Resurrection", "series", "tvmaze:99");
    assert.equal(show.id, "tvmaze:99");
    assert.equal(show.posterUrl, "https://static.tvmaze.com/poster.jpg");
    assert.equal(await catalogItemById("itunes:abc", "movie"), null);
    await assert.rejects(catalogMetadata("Dexter: Resurrection", "series", "tvmaze:100"), /catalog_title_not_found/);
  } finally { global.fetch = original; }
});

test("Only validated, separately identified film and series poster URLs are stored in the R2 index", async () => {
  const objects = new Map();
  const env = { MEDIA: {
    async put(key, content) { objects.set(key, content); return true; },
    async get(key) { const content = objects.get(key); return content ? { json: async () => JSON.parse(content) } : null; }
  } };
  const fetcher = async url => new Response(null, {
    status: url.includes("missing") ? 404 : 200,
    headers: { "content-type": "image/jpeg" }
  });
  assert.equal(await verifyPosterLocation("https://evil.example/poster.jpg", fetcher), false);
  assert.equal(await verifyPosterLocation("https://static.tvmaze.com/missing.jpg", fetcher), false);
  const result = await indexCatalogResults(env, [
    { id: "itunes:123", title: "Homem-Aranha", year: "2026", mediaType: "FILME",
      posterUrl: "https://is1-ssl.mzstatic.com/poster.jpg" },
    { id: "tvmaze:99", title: "Dexter: Resurrection", year: "2025", mediaType: "SÉRIE",
      posterUrl: "https://static.tvmaze.com/poster.jpg" },
    { id: "itunes:124", title: "Unverified", year: "2026", mediaType: "FILME",
      posterUrl: "https://evil.example/poster.jpg" }
  ], { fetcher });
  assert.equal(result.indexed, 2);
  assert.equal(objects.size, 2);
  assert.equal(await readVerifiedPoster(env, { title: "Dexter: Resurrection", year: "2025",
    type: "series", catalogId: "tvmaze:99" }), "https://static.tvmaze.com/poster.jpg");
  assert.equal(await readVerifiedPoster(env, { title: "Homem-Aranha", year: "2026",
    type: "movie", catalogId: "tvmaze:99" }), "");
});
