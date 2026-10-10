// Verified poster index in the existing NEXUS R2 bucket. No new database required.
// Strict key matching: never reuse artwork across unrelated titles or years.
function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110);
}
function key(title, year, type, catalogId) {
  const kind = type === "series" ? "series" : "movie";
  const id = normalize(catalogId);
  if (id) return "verified-posters/v1/" + kind + "/id/" + id + ".json";
  const titleKey = normalize(title);
  const yearKey = String(year || "").match(/^(19|20)\d\d$/)?.[0];
  if (!titleKey || !yearKey) return "";
  return "verified-posters/v1/" + kind + "/name/" + yearKey + "/" + titleKey + ".json";
}
function trustedPosterUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && ["tmdb.org", "tvmaze.com", "mzstatic.com", "sonypictures.com.br"].some(x => host === x || host.endsWith("." + x))
      ? url.toString() : "";
  } catch { return ""; }
}
export async function readVerifiedPoster(env, identity) {
  if (!env.MEDIA) return "";
  const objectKey = key(identity.title, identity.year, identity.type, identity.catalogId);
  if (!objectKey) return "";
  try {
    const object = await env.MEDIA.get(objectKey);
    if (!object) return "";
    const saved = await object.json();
    if (normalize(saved.title) !== normalize(identity.title)) return "";
    if (String(saved.year || "") !== String(identity.year || "")) return "";
    if ((saved.type || "movie") !== (identity.type || "movie")) return "";
    if (identity.catalogId && String(saved.catalogId || "") !== String(identity.catalogId)) return "";
    return trustedPosterUrl(saved.posterUrl);
  } catch { return ""; }
}
export async function rememberVerifiedPoster(env, identity, posterUrl) {
  if (!env.MEDIA) return false;
  const url = trustedPosterUrl(posterUrl);
  const objectKey = key(identity.title, identity.year, identity.type, identity.catalogId);
  if (!url || !objectKey || !identity.title || !identity.year) return false;
  try {
    await env.MEDIA.put(objectKey, JSON.stringify({
      title: String(identity.title), year: String(identity.year),
      type: identity.type === "series" ? "series" : "movie",
      catalogId: String(identity.catalogId || ""), posterUrl: url,
      savedAt: new Date().toISOString()
    }), { httpMetadata: {contentType: "application/json", cacheControl: "private, no-store"} });
    return true;
  } catch { return false; }
}
