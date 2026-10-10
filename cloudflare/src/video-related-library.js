// R2 relation index. Recommendations have their OWN catalogue ID and provider artwork.
// Only provider URLs are indexed, not copyrighted image binaries.
import { distinctRelatedTitles } from "./video-catalog.js";

const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110);

function key(identity) {
  const kind = identity?.type === "series" ? "series" : "movie";
  const id = norm(identity?.catalogId);
  if (id) return "verified-posters/v1/related/" + kind + "/id/" + id + ".json";
  const title = norm(identity?.title), year = String(identity?.year || "");
  return title && /^(19|20)\d\d$/.test(year)
    ? "verified-posters/v1/related/" + kind + "/name/" + year + "/" + title + ".json" : "";
}
function safeArtwork(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && ["mzstatic.com", "tvmaze.com", "tmdb.org", "sonypictures.com.br"]
      .some(domain => host === domain || host.endsWith("." + domain)) ? url.toString() : "";
  } catch { return ""; }
}
function safeRelated(identity, items) {
  const mainPoster = safeArtwork(identity.posterUrl);
  const valid = (Array.isArray(items) ? items : []).filter(item => {
    const relatedId = String(item?.id || "").trim();
    const allowedId = identity.type === "series" ? relatedId.startsWith("tvmaze:") : /^(itunes|sony):/.test(relatedId);
    return allowedId && relatedId !== identity.catalogId &&
      safeArtwork(item.image || item.posterUrl) && String(item?.title || "").trim();
  }).map(item => ({
    id: String(item.id).slice(0, 100),
    title: String(item.title).trim().slice(0, 150),
    year: String(item.year || "").slice(0, 4),
    image: safeArtwork(item.image || item.posterUrl),
    genre: String(item.genre || "").trim().slice(0, 90)
  }));
  const unique = distinctRelatedTitles(valid, identity.title, mainPoster);
  return unique.map(item => valid.find(candidate => candidate.title === item.title && candidate.image === item.image)).filter(Boolean);
}
export async function rememberRelatedTitles(env, identity, items) {
  if (!env?.MEDIA || !identity?.title || !identity?.catalogId || !identity?.year) return false;
  const objectKey = key(identity);
  const related = safeRelated(identity, items);
  if (!objectKey || !related.length) return false;
  try {
    await env.MEDIA.put(objectKey, JSON.stringify({
      identity: { title: String(identity.title), year: String(identity.year),
        type: identity.type === "series" ? "series" : "movie", catalogId: String(identity.catalogId) },
      related, savedAt: new Date().toISOString(), source: "provider-recommendations"
    }), { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
    return true;
  } catch { return false; }
}
export async function readRelatedTitles(env, identity) {
  const objectKey = key(identity);
  if (!env?.MEDIA || !objectKey) return [];
  try {
    const object = await env.MEDIA.get(objectKey);
    if (!object) return [];
    const record = await object.json();
    const saved = record?.identity || {};
    if (norm(saved.title) !== norm(identity.title) || String(saved.year) !== String(identity.year) ||
        String(saved.catalogId) !== String(identity.catalogId) || saved.type !== (identity.type === "series" ? "series" : "movie")) return [];
    const ageMs = Date.now() - Date.parse(record.savedAt || "");
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 30 * 86400e3) return [];
    return safeRelated(identity, record.related);
  } catch { return []; }
}
