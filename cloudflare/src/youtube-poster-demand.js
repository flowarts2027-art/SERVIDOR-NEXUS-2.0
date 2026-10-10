import { dailyYoutubeDemandPosterWarmup, TRAILER_DISCOVERY_SEED } from "./video-demand-catalog.js";

export const YOUTUBE_TRAILER_SEEDS = Object.freeze(
  TRAILER_DISCOVERY_SEED.map(({ title, type }) => ({ query: title, type }))
);

// Maintain the compatibility export, with an independent ranking per media type.
export function rankYoutubePosterDemand(rows = [], seeds = YOUTUBE_TRAILER_SEEDS, max = 8) {
  const normalize = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const merged = new Map();
  for (const item of rows) {
    const query = String(item?.query || "").trim().slice(0, 120);
    const type = item?.type === "series" ? "series" : "movie";
    const key = type + ":" + normalize(query);
    if (normalize(query).length < 3) continue;
    const weight = Math.max(1, Math.min(10000, Number(item.searches || 1)));
    const prev = merged.get(key);
    if (prev) prev.searches += weight;
    else merged.set(key, { query, type, searches: weight, origin: "youtube-client-search" });
  }
  for (const entry of seeds) {
    const query = String(entry?.query || "").trim();
    const type = entry?.type === "series" ? "series" : "movie";
    const key = type + ":" + normalize(query);
    if (!merged.has(key) && query) merged.set(key, { query, type, searches: 0, origin: "youtube-trailer-views" });
  }
  const sorted = [...merged.values()].sort((a, b) =>
    b.searches - a.searches || a.query.localeCompare(b.query, "pt-BR"));
  const caps = { movie: 0, series: 0 };
  const each = Math.max(1, Math.min(10, Number(max) || 8));
  return sorted.filter(item => ++caps[item.type] <= each);
}

export async function warmYoutubePosterLibrary(env, at = new Date()) {
  // 06:00 Brasília; checkpoint prevents duplicate work on repeated 15-min crons.
  // This remains isolated from Instagram publishing, as scheduled in index.js.
  return dailyYoutubeDemandPosterWarmup(env, at);
}
