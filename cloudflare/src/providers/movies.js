// Only normalized text leaves the provider. Neither catalogue supplies artwork here.
const genreNames = {
  Action: "Ação",
  Adventure: "Aventura",
  Comedy: "Comédia",
  Romance: "Romance",
  Animation: "Animação",
  "Science-Fiction": "Ficção científica",
  Horror: "Terror",
  Thriller: "Suspense",
  Crime: "Policial",
  Family: "Família",
  Fantasy: "Fantasia",
  Mystery: "Mistério",
};
const fields = (values) => values.filter(Boolean).join(" • ");
function plain(summary) {
  return (summary || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export async function series(query, source) {
  const hits = await source(
    "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(query),
  );
  return hits.map(({ show }) => {
    const genres = (show.genres || []).map((g) => genreNames[g] || g);
    return {
      title: show.name,
      genres,
      meta: fields([show.premiered?.slice(0, 4), ...genres]),
      body: plain(show.summary) || "Sinopse indisponível.",
      credit: "Dados: TVmaze",
      license: "tvmaze.com/shows/" + show.id + " • CC BY-SA 4.0",
      kind: "series",
    };
  });
}
export async function movies(query, source) {
  const headers = {
    "User-Agent": "NexusBannerDoDia/1.0 (https://flowarts.com.br)",
  };
  const search = await source(
    "https://www.wikidata.org/w/api.php?" +
      new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: "pt",
        uselang: "pt",
        format: "json",
        limit: "15",
      }),
    headers,
  );
  const ids = search.search.map((x) => x.id).filter((id) => /^Q\d+$/.test(id));
  if (!ids.length) return [];
  const sparql = `SELECT DISTINCT ?item ?itemLabel ?date ?directorLabel ?genreLabel ?descr ?abstract WHERE {
    VALUES ?item { ${ids.map((id) => "wd:" + id).join(" ")} }
    ?item wdt:P31/wdt:P279* wd:Q11424 .
    OPTIONAL { ?item wdt:P577 ?date }
    OPTIONAL { ?item wdt:P57 ?director }
    OPTIONAL { ?item wdt:P136 ?genre }
    OPTIONAL { ?item schema:description ?descr FILTER(LANG(?descr)="pt") }
    OPTIONAL { ?item schema:abstract ?abstract FILTER(LANG(?abstract)="pt") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
  }`;
  const result = await source(
    "https://query.wikidata.org/sparql?" +
      new URLSearchParams({ query: sparql, format: "json" }),
    headers,
  );
  const films = new Map();
  for (const row of result.results.bindings) {
    const id = row.item.value.split("/").pop();
    if (!films.has(id))
      films.set(id, {
        title: row.itemLabel.value,
        genres: new Set(),
        directors: new Set(),
        years: new Set(),
        body:
          row.abstract?.value ||
          row.descr?.value ||
          "Sinopse indisponível no Wikidata.",
        credit: "Dados: Wikidata",
      });
    const film = films.get(id);
    if (row.genreLabel) film.genres.add(row.genreLabel.value);
    if (row.directorLabel) film.directors.add(row.directorLabel.value);
    if (row.date) film.years.add(row.date.value.slice(0, 4));
  }
  return ids
    .filter((id) => films.has(id))
    .map((id) => {
      const f = films.get(id),
        genres = [...f.genres];
      return {
        title: f.title,
        genres,
        body: f.body,
        credit: f.credit,
        meta: fields([[...f.years].sort()[0], ...genres]),
        director: [...f.directors].join(", "),
        kind: "movies",
      };
    });
}
