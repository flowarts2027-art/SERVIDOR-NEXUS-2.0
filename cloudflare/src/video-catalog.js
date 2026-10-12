const plain = value => String(value || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
export function portugueseTrailerScore(item) {
  const clean = value => String(value || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const title = clean(item.title), channel = clean(item.channel);
  if (/legendad|subtitled|english|ingles|original audio|audio original/.test(title)) return -1;
  if (/\bfan\b|fan trailer|trailer fan|reupload|re-upload|compilacao|compilation/.test(channel)) return -1;

  const studio = /^(?:amazon )?(?:prime video|netflix|warner bros\.? pictures|warner play|universal pictures|paramount pictures|paramount brasil|sony pictures|disney|disney studios|20th century studios|diamond films|paris filmes|imagem filmes|hbo|max|globoplay|lionsgate|mubi|fox film do brasil|cinecolor films|synapse distribution|a2 filmes|vitrine filmes|imovision)(?: brasil| brazil| br)?$/.test(channel);
  const brazil = /brasil|brazil|\bbr\b|portugues/.test(channel);
  const dubbed = /dublad|portugu[eê]s|pt[- ]?br|audio em portugu[eê]s|vers[aã]o brasileira/.test(title);
  const promo = /trailer|teaser|shorts?|vertical|spot|previa/.test(title);

  // Strict language rule: a result must explicitly identify Portuguese dubbing.
  // Brazilian channel alone is no longer enough.
  const officialIdentity = item.channelVerified || item.channelId === 'UCuNjvqjTzw9LcD9PVpTVWRA' || (studio && brazil);
  if (!officialIdentity || !dubbed || !promo) return -1;

  const verticalBonus = item.verticalCandidate === true ? 100 : 0;
  const explicitVerticalBonus = /shorts?|vertical/.test(title) ? 50 : 0;
  return 400 + verticalBonus + explicitVerticalBonus + (brazil ? 80 : 0) + (/oficial/.test(title) ? 40 : 0) + (item.channelVerified ? 25 : 0);
}
export function youtubeUrl(value) {
  try {
    const u = new URL(value); let id = "";
    if (u.protocol !== "https:") return "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)) {
      id = u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)$/)?.[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id || "") ? "https://www.youtube.com/watch?v=" + id : "";
  } catch { return ""; }
}
export function catalogPreviewUrl(value) {
  try {
    const u = new URL(String(value || ""));
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return "";
    const allowed = host === "itunes.apple.com" || host.endsWith(".itunes.apple.com") || host === "mzstatic.com" || host.endsWith(".mzstatic.com");
    return allowed ? u.toString() : "";
  } catch { return ""; }
}

async function get(url, timeoutMs = 15000) {
  const r = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "NEXUS/2.0 metadata resolver"
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!r.ok) throw new Error("catalog_unavailable");
  return r.json();
}

function normalizedLabel(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identityLabel(value) {
  return normalizedLabel(value)
    .replace(/\bparte\s+(dois|2)\b/g, " 2 ")
    .replace(/\bparte\s+(tres|3)\b/g, " 3 ")
    .replace(/\bparte\s+(quatro|4)\b/g, " 4 ")
    .replace(/\bparte\s+(cinco|5)\b/g, " 5 ")
    .replace(/\bdois\b/g, "2").replace(/\btres\b/g, "3")
    .replace(/\bquatro\b/g, "4").replace(/\bcinco\b/g, "5")
    .replace(/\s+/g, " ").trim();
}

function editDistance(a, b) {
  a = String(a || ""); b = String(b || "");
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    let left=i, diag=i-1;
    for (let j=1;j<=b.length;j++) {
      const up=prev[j], cost=a[i-1]===b[j-1]?0:1;
      const next=Math.min(up+1,left+1,diag+cost);
      prev[j-1]=left; diag=up; left=next;
    }
    prev[b.length]=left;
  }
  return prev[b.length];
}

export function catalogIdentityConfidence(requestedTitle, catalogTitle) {
  const q=identityLabel(requestedTitle), t=identityLabel(catalogTitle);
  if (!q || !t) return 0;
  if (q===t) return 1;
  const compactQ=q.replace(/\s+/g,""), compactT=t.replace(/\s+/g,"");
  const maxLen=Math.max(compactQ.length,compactT.length);
  if (maxLen >= 6) {
    const similarity=1-(editDistance(compactQ,compactT)/maxLen);
    if (similarity >= 0.9) return 0.95;
    if (similarity >= 0.82) return 0.86;
  }
  if ((q.includes(t) || t.includes(q)) && Math.min(q.length,t.length) >= 5) return 0.88;
  const qTokens=new Set(q.split(" ").filter(Boolean));
  const tTokens=new Set(t.split(" ").filter(Boolean));
  let common=0; for (const token of qTokens) if (tTokens.has(token)) common++;
  const ratio=common/Math.max(1,Math.max(qTokens.size,tTokens.size));
  if (ratio>=0.8) return 0.84;
  if (ratio>=0.6) return 0.72;
  return ratio*0.7;
}

export function catalogUploadTitle(filename) {
  return String(filename || "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[_.+\-]+/g, " ")
    .replace(/\b(?:trailer|teaser|official|oficial|dublado|dubbed|legendado|legendada|portugu[eê]s|pt\s*br|full\s*hd|uhd|4k|2160p|1080p|720p|480p|webrip|web\s*dl|bluray|x264|x265|h264|h265|aac|mp4|mkv|mov|download)\b/gi, " ")
    .replace(/\bs\d{1,2}(?:e\d{1,2})?\b/gi, " ")
    .replace(/\b(?:temporada|season|epis[oó]dio|episode)\s*\d+\b/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

function commonsFileUrl(filename, width = 520) {
  const clean = String(filename || "").trim();
  if (!clean) return "";
  return "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + encodeURIComponent(clean.replace(/ /g, "_")) + "?width=" + width;
}

function entityLabel(entity) {
  return entity?.labels?.pt?.value || entity?.labels?.en?.value || "";
}

function claimEntityIds(entity, property) {
  return (entity?.claims?.[property] || [])
    .map(claim => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function claimFilename(entity, property) {
  return String(entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value || "").trim();
}

async function wikidataSearchEntity(title, year, type) {
  const wanted = normalizedLabel(title);
  const queries = [
    { search: [title, year].filter(Boolean).join(" "), language: "pt" },
    { search: title, language: "pt" },
    { search: title, language: "en" }
  ];
  let best = null;
  for (const query of queries) {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      format: "json",
      type: "item",
      limit: "8",
      language: query.language,
      uselang: query.language,
      origin: "*",
      search: query.search
    });
    let data;
    try { data = await get("https://www.wikidata.org/w/api.php?" + params.toString()); }
    catch { continue; }
    for (const item of data?.search || []) {
      const label = normalizedLabel(item.label);
      const description = normalizedLabel(item.description);
      let score = label === wanted ? 100 : (label.includes(wanted) || wanted.includes(label) ? 50 : 0);
      if (year && description.includes(String(year))) score += 25;
      if (type === "series" && /(serie|series|television|tv)/.test(description)) score += 35;
      if (type !== "series" && /(filme|film|movie|motion picture|longa metragem)/.test(description)) score += 35;
      if (!best || score > best.score) best = { id: item.id, score };
    }
    if (best?.score >= 100) break;
  }
  return best?.id || "";
}

async function wikidataTitleAliases(title, type) {
  const candidates = movieCatalogQueries(title);
  for (const candidate of candidates) {
    const entityId = await wikidataSearchEntity(candidate, "", type);
    if (!entityId) continue;
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: entityId,
      props: "labels",
      languages: "pt|en",
      languagefallback: "1",
      origin: "*"
    });
    try {
      const data = await get("https://www.wikidata.org/w/api.php?" + params.toString());
      const entity = data?.entities?.[entityId];
      const labels = [
        entity?.labels?.pt?.value,
        entity?.labels?.en?.value
      ].map(value => String(value || "").trim()).filter(Boolean);
      const unique = [];
      const seen = new Set();
      for (const label of labels) {
        const key = normalizedLabel(label);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(label);
      }
      if (unique.length) return unique;
    } catch {}
  }
  return [];
}

async function wikidataCanonicalTitle(title, type) {
  const aliases = await wikidataTitleAliases(title, type);
  return aliases[0] || "";
}

// Verified encyclopedia article fallback: use only names explicitly listed
// under the Cast/Elenco heading of the article linked from the exact Wikidata film.
async function wikipediaCastFallback(entity) {
  const link = entity?.sitelinks?.enwiki || entity?.sitelinks?.ptwiki;
  if (!link?.title) return [];
  const language = entity?.sitelinks?.enwiki ? "en" : "pt";
  try {
    const params = new URLSearchParams({
      action: "parse", format: "json", prop: "wikitext",
      page: link.title, redirects: "1"
    });
    const result = await get("https://" + language + ".wikipedia.org/w/api.php?" + params.toString());
    const text = String(result?.parse?.wikitext?.["*"] || "");
    const heading = /^={2,4}\s*(?:cast|elenco)\s*={2,4}\s*$/im.exec(text);
    if (!heading) return [];
    const section = text.slice(heading.index + heading[0].length).split(/^={2,4}[^=\n]+={2,4}\s*$/m)[0];
    const seen = new Set();
    return section.split("\n").filter(line => /^\s*[\*#]/.test(line))
      .map(line => {
        const actor = line.match(/^\s*[\*#]\s*(?:'''|)\[\[([^|\]#]+)(?:\|[^\]]+)?\]\]/);
        return actor ? actor[1].trim() : "";
      })
      .filter(name => {
        const key = normalizedLabel(name);
        if (!key || name.split(/\s+/).length < 2 || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8).map(name => ({ name, image: "" }));
  } catch {
    return [];
  }
}

async function wikidataMetadata(title, year, type) {
  const entityId = await wikidataSearchEntity(title, year, type);
  if (!entityId) return null;
  const entityParams = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    ids: entityId,
    props: "claims|labels|sitelinks",
    sitefilter: "enwiki|ptwiki",
    languages: "pt|en",
    languagefallback: "1",
    origin: "*"
  });
  const entityData = await get("https://www.wikidata.org/w/api.php?" + entityParams.toString());
  const entity = entityData?.entities?.[entityId];
  if (!entity || entity.missing !== undefined) return null;

  const castIds = [...new Set([
    ...claimEntityIds(entity, "P161"),
    ...claimEntityIds(entity, "P725")
  ])].slice(0, 9);
  let cast = [];
  if (castIds.length) {
    const peopleParams = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: castIds.join("|"),
      props: "claims|labels",
      languages: "pt|en",
      languagefallback: "1",
      origin: "*"
    });
    const peopleData = await get("https://www.wikidata.org/w/api.php?" + peopleParams.toString());
    cast = castIds.map(id => {
      const person = peopleData?.entities?.[id];
      const name = entityLabel(person);
      return name ? { name, image: commonsFileUrl(claimFilename(person, "P18"), 420) } : null;
    }).filter(Boolean);
  }

  if (cast.length < 3) {
    const more = await wikipediaCastFallback(entity);
    const seen = new Set(cast.map(person => normalizedLabel(person.name)));
    for (const person of more) {
      const key = normalizedLabel(person.name);
      if (!seen.has(key)) { cast.push(person); seen.add(key); }
      if (cast.length >= 6) break;
    }
  }
  return {
    cast,
    posterUrl: commonsFileUrl(claimFilename(entity, "P18"), 900),
    source: "https://www.wikidata.org/wiki/" + entityId
  };
}

function movieCatalogQueries(query) {
  const raw = String(query || "").trim();
  const out = [raw];
  const sequelWords = {
    "2": ["parte dois", "parte 2"],
    "3": ["parte tres", "parte três", "parte 3"],
    "4": ["parte quatro", "parte 4"],
    "5": ["parte cinco", "parte 5"]
  };
  const match = raw.match(/^(.*?)(?:[\s:._-]+)?([2-5])$/);
  if (match && /[A-Za-zÀ-ÿ]/.test(match[1])) {
    const base = match[1].trim();
    for (const suffix of sequelWords[match[2]] || []) out.push(base + " " + suffix);
  }
  const unique = [];
  const seen = new Set();
  for (const value of out) {
    const key = normalizedLabel(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique.slice(0, 4);
}

export async function catalogSearchAliases(query, type = "movie") {
  const raw = String(query || "").trim();
  const aliases = [raw];
  try {
    const wikiAliases = await wikidataTitleAliases(raw, type);
    for (const alias of wikiAliases) {
      if (alias && !aliases.some(value => normalizedLabel(value) === normalizedLabel(alias))) aliases.push(alias);
    }
  } catch {}
  try {
    const matches = await searchCatalog(raw, type);
    for (const item of matches.slice(0, 3)) {
      if (item?.title && !aliases.some(value => normalizedLabel(value) === normalizedLabel(item.title))) aliases.push(item.title);
    }
  } catch {}
  return aliases.filter(Boolean).slice(0, 4);
}

export async function searchCatalog(query, type = "movie", { timeoutMs = 15000, country = "BR" } = {}) {
  if (type === "series") {
    const data = await get("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(query), timeoutMs);
    return data.slice(0, 8).map(({ show: s }) => ({ id: "tvmaze:" + s.id, title: s.name, year: (s.premiered || "").slice(0, 4), overview: plain(s.summary), posterUrl: s.image?.original || s.image?.medium || "", genre: (s.genres || []).join(" • "), mediaType: "SÉRIE" }));
  }
  const wanted = normalizedLabel(query);
  const storefront = /^[A-Z]{2}$/.test(String(country)) ? country : "BR";
  const queries = movieCatalogQueries(query);
  const batches = await Promise.all(queries.map(value =>
    get("https://itunes.apple.com/search?entity=movie&country=" + storefront + "&limit=12&term=" + encodeURIComponent(value), timeoutMs)
      .catch(() => ({ results: [] }))
  ));
  const merged = new Map();
  for (const data of batches) {
    for (const s of data.results || []) {
      const item = {
        id: "itunes:" + s.trackId,
        title: s.trackName,
        year: (s.releaseDate || "").slice(0, 4),
        overview: plain(s.longDescription || s.shortDescription),
        posterUrl: (s.artworkUrl100 || "").replace("100x100bb", "600x900bb"),
        genre: String(s.primaryGenreName || ""),
        previewUrl: catalogPreviewUrl(s.previewUrl),
        mediaType: "FILME"
      };
      const label = normalizedLabel(item.title);
      const baseWanted = wanted.replace(/(?:\s+)?[2-5]$/, "").trim();
      const baseLabel = label.replace(/\b(?:parte )?(?:dois|tres|três|quatro|cinco|[2-5])\b/g, "").trim();
      item._score =
        label === wanted ? 1200 :
        (label.includes(wanted) || wanted.includes(label)) ? 900 :
        (baseWanted && baseLabel && (baseLabel.includes(baseWanted) || baseWanted.includes(baseLabel))) ? 700 :
        0;
      const current = merged.get(item.id);
      if (!current || item._score > current._score || (!current.previewUrl && item.previewUrl)) merged.set(item.id, item);
    }
  }
  return [...merged.values()]
    .sort((a, b) => (Boolean(b.previewUrl) - Boolean(a.previewUrl)) || b._score - a._score)
    .slice(0, 8)
    .map(({ _score, ...item }) => item);
}

// Resolve the exact catalogue selection independently of free-text search.
// A YouTube query such as "homem aranha" must never replace the selected sequel.
export async function catalogItemById(catalogId, type = "movie", { timeoutMs = 5000 } = {}) {
  const match = /^(itunes|tvmaze):([1-9][0-9]{0,15})$/.exec(String(catalogId || ""));
  if (!match) return null;
  const [, source, id] = match;
  if (source === "tvmaze" && type === "series") {
    const show = await get("https://api.tvmaze.com/shows/" + id, timeoutMs);
    if (String(show?.id) !== id || !show?.name) return null;
    return { id: "tvmaze:" + id, title: String(show.name), year: (show.premiered || "").slice(0, 4),
      overview: plain(show.summary), posterUrl: show.image?.original || show.image?.medium || "", genre: (show.genres || []).join(" • "), mediaType: "SÉRIE" };
  }
  if (source === "itunes" && type !== "series") {
    const data = await get("https://itunes.apple.com/lookup?id=" + id + "&country=BR&entity=movie", timeoutMs);
    const movie = (data?.results || []).find(item => String(item.trackId) === id && item.trackName);
    if (!movie) return null;
    return { id: "itunes:" + id, title: String(movie.trackName), year: (movie.releaseDate || "").slice(0, 4),
      overview: plain(movie.longDescription || movie.shortDescription),
      posterUrl: (movie.artworkUrl100 || "").replace("100x100bb", "600x900bb"), genre: String(movie.primaryGenreName || ""),
      previewUrl: catalogPreviewUrl(movie.previewUrl), mediaType: "FILME" };
  }
  return null;
}

// A recommendation needs a different title AND its own artwork.
export function distinctRelatedTitles(items, mainTitle, mainPosterUrl = "") {
  const artKey = value => String(value || "").trim().replace(/\d+x\d+bb/gi, "{size}");
  const titles = new Set([normalizedLabel(mainTitle)]);
  const artwork = new Set([artKey(mainPosterUrl)].filter(Boolean));
  const output = [];
  for (const item of Array.isArray(items) ? items : []) {
    const title = String(item?.title || "").trim();
    const image = String(item?.image || item?.posterUrl || "").trim();
    const name = normalizedLabel(title), picture = artKey(image);
    if (!name || !picture || titles.has(name) || artwork.has(picture)) continue;
    titles.add(name);
    artwork.add(picture);
    output.push({ id: String(item?.id || "").trim(), title, year: String(item?.year || "").trim(), image, genre: String(item?.genre || "").trim() });
    if (output.length === 3) break;
  }
  return output;
}

export async function catalogMetadata(title, type, catalogId = "") {
  let resolvedTitle = String(title || "").trim();
  // If an ID was selected in the panel, query that ID before any text search.
  // Do not silently replace a missing ID with the first similarly named film.
  let direct = null;
  if (catalogId) {
    try { direct = await catalogItemById(catalogId, type); } catch {}
  }
  let matches = direct ? await searchCatalog(direct.title, type, { timeoutMs: 5000 }).catch(() => []) : await searchCatalog(resolvedTitle, type);
  let exact = matches.find(x => x.title.toLowerCase() === resolvedTitle.toLowerCase());
  let match = direct || (catalogId ? matches.find(x => x.id === catalogId) : (exact || matches[0]));

  if (!match && !catalogId && type !== "series") {
    try {
      const canonical = await wikidataCanonicalTitle(resolvedTitle, type);
      if (canonical && normalizedLabel(canonical) !== normalizedLabel(resolvedTitle)) {
        resolvedTitle = canonical;
        matches = await searchCatalog(resolvedTitle, type);
        exact = matches.find(x => x.title.toLowerCase() === resolvedTitle.toLowerCase());
        match = exact || matches[0];
      }
    } catch {}
  }

  if (!match) throw new Error("catalog_title_not_found");
  const result = { ...match, cast: [], reviews: [], related: [], sources: [] };

  if (match.id.startsWith("tvmaze:")) {
    const id = match.id.split(":")[1];
    const [show, cast] = await Promise.all([get("https://api.tvmaze.com/shows/" + id), get("https://api.tvmaze.com/shows/" + id + "/cast")]);
    result.cast = cast.slice(0, 9).map(x => ({ name: x.person.name, image: x.person.image?.original || x.person.image?.medium || "" }));
    result.genres = (show.genres || []).join(" • ");
    result.runtime = show.averageRuntime ? show.averageRuntime + " min / episódio" : "";
    result.rating = show.rating?.average ? "TVmaze " + show.rating.average + "/10" : "";
    if (result.rating) result.reviews = [{ author: "Avaliação do público", source: "TVmaze", text: result.rating, summary: false }];
    result.sources.push(show.url);
    const candidates = await get("https://api.tvmaze.com/shows?page=0");
    const relatedCandidates = candidates.filter(x => x.id !== show.id && x.image && x.genres?.some(g => show.genres?.includes(g)))
      .map(x => ({ ...x, score: x.genres.filter(g => show.genres.includes(g)).length }))
      .sort((a, b) => b.score - a.score || (b.rating?.average || 0) - (a.rating?.average || 0))
      .map(x => ({ id: "tvmaze:" + x.id, title: x.name, year: (x.premiered || "").slice(0, 4), image: x.image.original || x.image.medium, genre: (x.genres || []).join(" • ") }));
    result.related = distinctRelatedTitles(relatedCandidates, result.title, result.posterUrl);
  } else {
    result.sources.push("https://itunes.apple.com/lookup?id=" + match.id.split(":")[1]);
    result.related = distinctRelatedTitles(
      matches.filter(x => x.id !== match.id)
        .sort((a,b) => {
          const score = item => (item.genre && item.genre === match.genre ? 3 : 0) +
            (normalizedLabel(item.title).split(" ").some(token => token.length > 4 && normalizedLabel(match.title).split(" ").includes(token)) ? 2 : 0);
          return score(b) - score(a);
        }).map(x => ({ id: x.id, title: x.title, year: x.year, image: x.posterUrl, genre: x.genre })),
      result.title, result.posterUrl
    );
  }

  try {
    const wiki = await wikidataMetadata(result.title, result.year, type);
    if (wiki) {
      if (!result.posterUrl && wiki.posterUrl) result.posterUrl = wiki.posterUrl;
      if (wiki.source && !result.sources.includes(wiki.source)) result.sources.push(wiki.source);
      const merged = [...(result.cast || []), ...(wiki.cast || [])];
      const seen = new Set();
      result.cast = merged.filter(person => {
        const key = normalizedLabel(person?.name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 9);
    }
  } catch {
    // Primary catalog data remains usable if the free Wikidata enrichment is unavailable.
  }

  return result;
}
export async function dispatchVideoSearch(env, clientId, query, type, aliases = []) {
  const token = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!token) throw new Error("github_actions_token_missing");
  const id = "search_" + crypto.randomUUID().replace(/-/g, "");
  const callbackToken = crypto.randomUUID() + crypto.randomUUID();
  const cleanAliases = [...new Set([query, ...(Array.isArray(aliases) ? aliases : [])]
    .map(value => String(value || "").trim()).filter(Boolean))].slice(0, 4);
  await env.DB.prepare("INSERT INTO video_jobs(id,client_id,source_object_key,status,settings_json,result_json,created_at,updated_at) VALUES(?1,?2,'','searching',?3,'{}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
    .bind(id, clientId, JSON.stringify({ contentTitle: query, searchType: type === "series" ? "series" : "movie", searchAliases: cleanAliases, githubRenderToken: callbackToken, searchOnly: true })).run();
  const r = await fetch("https://api.github.com/repos/" + String(env.GITHUB_INGEST_REPOSITORY || "globalplay27/SERVIDOR-GLOBAL-PLAY").trim() + "/dispatches", {
    method: "POST", headers: { authorization: "Bearer " + token, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "NEXUS" },
    body: JSON.stringify({ event_type: "video-youtube-search", client_payload: {
      job_id: id, client_id: clientId, callback_token: callbackToken,
      query: query.slice(0, 120), aliases: cleanAliases.join("|||")
    } })
  });
  if (r.status !== 204) throw new Error("youtube_search_dispatch_failed");
  return id;
}
