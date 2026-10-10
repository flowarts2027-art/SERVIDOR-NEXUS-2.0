// YouTube-interest-informed film AND series poster index.
// Panel searches are real demand signals; trailer-view charts are only a temporary
// discovery seed, NEVER described as counts of user searches.
// Catalogue artwork stays at its publisher URL unless separate caching rights exist.
import { searchCatalog, catalogIdentityConfidence, distinctRelatedTitles } from "./video-catalog.js";
import { rememberRelatedTitles } from "./video-related-library.js";
import { rememberVerifiedPoster } from "./video-poster-library.js";

// Source: FlixPatrol, most-watched YouTube trailers, 2026-10-05.
// Trailer views do not measure YouTube search query volume. Expire this seed.
export const TRAILER_DISCOVERY_SEED = [
  { title: "Dexter: Resurrection", type: "series" },
  { title: "VisionQuest", type: "series" },
  { title: "Tulsa King", type: "series" },
  { title: "The Lowdown", type: "series" },
  { title: "YAGA", type: "series" },
  { title: "Phony", type: "series" },
  { title: "Street Fighter", type: "movie" },
  { title: "Avengers: Doomsday", type: "movie" },
  { title: "Clayface", type: "movie" },
  { title: "Resident Evil", type: "movie" }
];

const normalize = value => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function allowedPoster(url) {
  try {
    const parsed = new URL(String(url || ""));
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && ["mzstatic.com", "tvmaze.com", "tmdb.org", "sonypictures.com.br"]
      .some(suffix => host === suffix || host.endsWith("." + suffix));
  } catch { return false; }
}

export async function verifyPosterLocation(url, fetcher = fetch) {
  if (!allowedPoster(url)) return false;
  try {
    const response = await fetcher(url, { method: "HEAD", signal: AbortSignal.timeout(3500) });
    if (!response.ok) return false;
    return /^image\/(?:jpeg|png|webp)(?:\s*;|$)/i.test(response.headers.get("content-type") || "");
  } catch { return false; }
}

export async function indexCatalogResults(env, items, { limit = 3, fetcher = fetch } = {}) {
  if (!env?.MEDIA) return { indexed: 0 };
  let indexed = 0;
  for (const item of (Array.isArray(items) ? items : []).slice(0, limit)) {
    const type = /s[eé]rie|series|tv/i.test(String(item?.mediaType || "")) ? "series" : "movie";
    const identity = { title: item?.title, year: item?.year, type, catalogId: item?.id };
    if (!identity.catalogId || !identity.title || !identity.year || !await verifyPosterLocation(item.posterUrl, fetcher)) continue;
    if (await rememberVerifiedPoster(env, identity, item.posterUrl)) indexed++;
  }
  return { indexed };
}

export function rankCatalogDemand(rows, asOf = new Date()) {
  const tally = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    let settings = {};
    try { settings = JSON.parse(String(row?.settings_json || "")); } catch {}
    if (settings.searchOnly !== true) continue;
    const title = String(settings.contentTitle || "").trim();
    const type = settings.searchType === "series" ? "series" : "movie";
    const slug = normalize(title);
    if (slug.length < 3) continue;
    const key = type + ":" + slug;
    const entry = tally.get(key) || { title, type, searches: 0, signal: "nexus-youtube-search" };
    entry.searches++;
    tally.set(key, entry);
  }
  // Historical chart seed expires after two weeks. Daily ranking is then driven
  // by observed panel queries, not by an old, static "trending" list.
  const seedAge = (asOf.getTime() - Date.parse("2026-10-05T00:00:00Z")) / 86400000;
  if (seedAge >= 0 && seedAge <= 14) {
    for (const seed of TRAILER_DISCOVERY_SEED) {
      const key = seed.type + ":" + normalize(seed.title);
      if (!tally.has(key)) tally.set(key, { ...seed, searches: 0, signal: "youtube-trailer-views" });
    }
  }
  const sorted = [...tally.values()].sort((a, b) =>
    (b.searches - a.searches) || a.title.localeCompare(b.title, "pt-BR"));
  const cap = { movie: 0, series: 0 };
  return sorted.filter(item => ++cap[item.type] <= 8);
}

export async function dailyYoutubeDemandPosterWarmup(env, asOf = new Date(), { fetcher = fetch } = {}) {
  if (!env?.MEDIA || !env?.DB || asOf.getUTCHours() !== 9) return { skipped: "outside-window-or-unbound" };
  const dateKey = asOf.toISOString().slice(0, 10);
  const checkpointKey = "verified-posters/v1/youtube-demand/checkpoints/" + dateKey + ".json";
  if (await env.MEDIA.head(checkpointKey).catch(() => null)) return { skipped: "already-processed" };
  // At most 180 recent observed YouTube searches, reused from existing video_jobs.
  // Avoid expensive scans and new D1 migrations on the free tier.
  const found = await env.DB.prepare(
    "SELECT settings_json FROM video_jobs WHERE id LIKE 'search_%' AND created_at >= datetime('now','-14 days') ORDER BY created_at DESC LIMIT 180"
  ).all().catch(() => ({ results: [] }));
  const ranked = rankCatalogDemand(found.results, asOf);
  let indexed = 0;
  for (const candidate of ranked) {
    try {
      const results = await searchCatalog(candidate.title, candidate.type, { timeoutMs: 5000 });
      const exact = results.find(item => catalogIdentityConfidence(candidate.title, item.title) >= 0.84 && item.posterUrl);
      if (!exact) continue;
      indexed += (await indexCatalogResults(env, [exact], { fetcher })).indexed;
      // Related films/series come from the same provider, with their own ID and
      // accessible artwork. They are never clips borrowed from the main trailer.
      const words = new Set(normalize(exact.title).split(" ").filter(word => word.length > 4));
      const comparable = results.filter(item => {
        if (!item.id || item.id === exact.id || !item.posterUrl) return false;
        const sharesFranchise = normalize(item.title).split(" ").some(word => words.has(word) && word.length > 4);
        const sharesGenre = Boolean(item.genre && exact.genre && item.genre === exact.genre);
        return sharesFranchise || sharesGenre;
      }).slice(0, 6);
      const checked = (await Promise.all(comparable.map(async item =>
        await verifyPosterLocation(item.posterUrl, fetcher) ? item : null
      ))).filter(Boolean);
      const related = distinctRelatedTitles(checked.map(item => ({
        id: item.id, title: item.title, year: item.year, image: item.posterUrl, genre: item.genre
      })), exact.title, exact.posterUrl);
      if (related.length) {
        await rememberRelatedTitles(env, {
          title: exact.title, year: exact.year, type: candidate.type,
          catalogId: exact.id, posterUrl: exact.posterUrl
        }, related);
      }
    } catch { /* one inaccessible catalog must not interrupt other titles */ }
  }
  await env.MEDIA.put(checkpointKey, JSON.stringify({
    date: dateKey, indexed, examined: ranked.length,
    movies: ranked.filter(x => x.type === "movie").length,
    series: ranked.filter(x => x.type === "series").length,
    measurement: "observed-panel-queries-and-public-trailer-view-discovery"
  }), { httpMetadata: { contentType: "application/json" } });
  return { indexed, examined: ranked.length };
}
