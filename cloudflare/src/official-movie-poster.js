// Publisher-confirmed artwork for titles that are not yet listed in the
// iTunes movie catalogue (new theatrical releases in particular).
// Each mapping requires an explicit film identity in the chosen trailer title
// or the exact catalogue title retained by an already imported video.
// Do NOT associate a generic "Homem-Aranha" query with a random movie.
const SPIDER_BRAND_NEW_DAY = Object.freeze({
  id: "sony:spider-man-brand-new-day-2026",
  title: "Homem-Aranha: Um Novo Dia",
  year: "2026",
  mediaType: "FILME",
  genre: "Ação • Aventura",
  posterUrl: "https://www.sonypictures.com.br/sites/brazil/files/2026-09/SMBND_BRA_1400%20X%202100%20%28Vertical%29.jpg",
  overview: "Quatro anos depois de Sem Volta para Casa, Peter Parker vive sozinho e protege Nova York, enquanto uma nova ameaça coloca sua existência em risco.",
  cast: ["Tom Holland", "Zendaya", "Mark Ruffalo", "Jacob Batalon", "Jon Bernthal", "Sadie Sink"].map(name => ({ name, image: "" })),
  sources: ["https://www.sonypictures.com.br/filmes/homem-aranha-um-novo-dia"]
});

const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function officialMovieFromTrailer({ title, youtubeTitle, type } = {}) {
  if (type === "series") return null;
  const requested = norm(title);
  const trailer = norm(youtubeTitle);
  const isSpider = /\b(?:homem aranha|spider man)\b/.test(requested);
  const exactNewMovie = /\b(?:homem aranha um novo dia|spider man brand new day)\b/.test(trailer)
    && /\b(?:trailers?|teasers?)\b/.test(trailer);
  // Legacy/imported jobs may retain the resolved film title without the
  // original YouTube search fields. This is an exact identity, unlike a broad
  // franchise search. A supplied conflicting trailer must still be rejected.
  const exactStoredMovie = !trailer && /^(?:homem aranha um novo dia|spider man brand new day)$/.test(requested);
  if (!isSpider || (!exactNewMovie && !exactStoredMovie)) return null;
  return {
    ...SPIDER_BRAND_NEW_DAY,
    cast: SPIDER_BRAND_NEW_DAY.cast.map(member => ({ ...member })),
    related: [], reviews: [], previewUrl: "",
    posterSource: "publisher-official",
    catalogType: "movie"
  };
}

// Confirm that the publisher actually serves an IMAGE rather than HTML/error.
// The Worker checks this before accepting a job. Do not copy publisher artwork
// into public storage unless the customer's reuse license permits it.
export async function verifyOfficialMoviePoster(url, fetcher = fetch) {
  let parsed;
  try { parsed = new URL(String(url || "")); }
  catch { return false; }
  if (parsed.protocol !== "https:" ||
    parsed.hostname !== "www.sonypictures.com.br" ||
    !parsed.pathname.startsWith("/sites/brazil/files/")) return false;
  try {
    const response = await fetcher(parsed.toString(), {
      method: "GET",
      headers: { Range: "bytes=0-2047", Accept: "image/jpeg,image/png,image/webp" },
      redirect: "follow",
      signal: AbortSignal.timeout(8500)
    });
    const image = response.ok && /^image\/(?:jpeg|png|webp)(?:\s*;|$)/i.test(response.headers.get("content-type") || "");
    await response.body?.cancel?.().catch(() => {});
    return Boolean(image);
  } catch { return false; }
}
