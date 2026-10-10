import test from "node:test";
import assert from "node:assert/strict";
import { rememberRelatedTitles, readRelatedTitles } from "../src/video-related-library.js";

function fakeStorage() {
  const store = new Map();
  return { store, env: { MEDIA: {
    async put(key, data) { store.set(key, JSON.parse(data)); return {}; },
    async get(key) { const data = store.get(key); return data ? { json: async () => data } : null; }
  } } };
}

test("The related-title library caches distinct film IDs and their own trusted artwork", async () => {
  const { env, store } = fakeStorage();
  const identity = { title: "Homem-Aranha", year: "2026", type: "movie",
    catalogId: "itunes:123", posterUrl: "https://is1-ssl.mzstatic.com/main.jpg" };
  const candidates = [
    { id: "itunes:123", title: "Homem-Aranha 2", year: "2004", image: "https://is1-ssl.mzstatic.com/other.jpg" },
    { id: "itunes:222", title: "Homem-Aranha", year: "2002", image: "https://is1-ssl.mzstatic.com/other2.jpg" },
    { id: "itunes:223", title: "Homem-Aranha 2", year: "2004", image: "https://is1-ssl.mzstatic.com/main.jpg" },
    { id: "itunes:224", title: "Homem-Aranha 2", year: "2004", image: "https://is1-ssl.mzstatic.com/sequel.jpg" },
    { id: "itunes:225", title: "Homem-Aranha 2", year: "2004", image: "https://is1-ssl.mzstatic.com/duplicate.jpg" },
    { id: "itunes:226", title: "Doutor Estranho", year: "2016", image: "https://evil.test/poster.jpg" },
    { id: "itunes:227", title: "Doutor Estranho", year: "2016", image: "https://is1-ssl.mzstatic.com/strange.jpg" }
  ];
  assert.equal(await rememberRelatedTitles(env, identity, candidates), true);
  const saved = await readRelatedTitles(env, identity);
  assert.deepEqual(saved.map(entry => entry.id), ["itunes:224", "itunes:227"]);
  assert.ok(saved.every(entry => entry.image !== identity.posterUrl));
  assert.equal(store.size, 1);
  assert.deepEqual(await readRelatedTitles(env, { ...identity, catalogId: "itunes:999" }), []);
  assert.deepEqual(await readRelatedTitles(env, { ...identity, year: "2025" }), []);
  assert.deepEqual(await readRelatedTitles(env, { ...identity, title: "Outro Filme" }), []);
});

test("Recommendations never borrow the main movie artwork or a series title from the wrong provider", async () => {
  const { env } = fakeStorage();
  const main = { title: "Dexter", year: "2025", type: "series", catalogId: "tvmaze:10",
    posterUrl: "https://static.tvmaze.com/dexter.jpg" };
  assert.equal(await rememberRelatedTitles(env, main, [
    { id: "itunes:43", title: "Drama errado", image: "https://is1-ssl.mzstatic.com/bad.jpg" },
    { id: "tvmaze:11", title: "Dexter", image: "https://static.tvmaze.com/dexter2.jpg" },
    { id: "tvmaze:12", title: "Outra série", image: "https://static.tvmaze.com/dexter.jpg" }
  ]), false);
  assert.deepEqual(await readRelatedTitles(env, main), []);
  assert.equal(await rememberRelatedTitles(env, main, [
    { id: "tvmaze:13", title: "Outra série", year: "2024", image: "https://static.tvmaze.com/other.jpg" }
  ]), true);
  assert.equal((await readRelatedTitles(env, main))[0].id, "tvmaze:13");
});
