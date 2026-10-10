import test from "node:test";
import assert from "node:assert/strict";
import { officialMovieFromTrailer, verifyOfficialMoviePoster } from "../src/official-movie-poster.js";

const movie = {title: "homem aranha",youtubeTitle:"HOMEM-ARANHA: UM NOVO DIA Trailer Dublado Oficial (2026)",type:"movie"};
test("YouTube official trailer resolves the precise movie when iTunes has no entry", () => {
  const item = officialMovieFromTrailer(movie);
  assert.equal(item.id, "sony:spider-man-brand-new-day-2026");
  assert.equal(item.title, "Homem-Aranha: Um Novo Dia");
  assert.equal(item.year, "2026");
  assert.ok(item.posterUrl.startsWith("https://www.sonypictures.com.br/sites/brazil/files/"));
  assert.ok(item.cast.some(p=>p.name==="Tom Holland"));
  assert.notEqual(item.posterUrl, "https://i.ytimg.com/vi/Xl7ZiIunTm8/hqdefault.jpg");
});
test("Actual 08/10 portal trailer title with plural 'Todos os Trailers' keeps the correct Sony poster", () => {
  const movie = officialMovieFromTrailer({
    title: "homem aranha",
    youtubeTitle: "HOMEM-ARANHA: UM NOVO DIA Todos os Trailers Dublado Oficial (2026)",
    type: "movie"
  });
  assert.equal(movie?.id, "sony:spider-man-brand-new-day-2026");
  assert.equal(movie?.year, "2026");
  assert.match(movie?.posterUrl || "", /sonypictures\.com\.br/);
});
test("Generic franchise search and unrelated video cannot silently pick a movie poster", () => {
  for(const item of [
    {title:"homem aranha",youtubeTitle:"Homem Aranha Trailer 2002 dublado",type:"movie"},
    {title:"homem aranha",youtubeTitle:"HOMEM ARANHA trailer fã 2026",type:"movie"},
    {title:"Batman",youtubeTitle:movie.youtubeTitle,type:"movie"},
    {title:"homem aranha",youtubeTitle:movie.youtubeTitle,type:"series"},
    {title:"homem aranha",youtubeTitle:"",type:"movie"}
  ]) assert.equal(officialMovieFromTrailer(item),null);
});
test("Imported jobs recover publisher metadata from the precise stored title without YouTube search fields", () => {
  for (const title of ["Homem-Aranha: Um Novo Dia", "Spider-Man: Brand New Day"]) {
    const item = officialMovieFromTrailer({ title, type: "movie" });
    assert.equal(item?.id, "sony:spider-man-brand-new-day-2026");
    assert.equal(item?.year, "2026");
  }
  for (const item of [
    {title:"Homem-Aranha",type:"movie"},
    {title:"Homem-Aranha 2026",type:"movie"},
    {title:"Homem-Aranha: Um Novo Dia",youtubeTitle:"Homem-Aranha: Sem Volta Para Casa Trailer",type:"movie"},
    {title:"Homem-Aranha: Um Novo Dia",type:"series"}
  ]) assert.equal(officialMovieFromTrailer(item), null);
});
test("Cloudflare must confirm publisher image bytes before dispatching a renderer", async () => {
  const poster = officialMovieFromTrailer(movie).posterUrl;
  const calls = [];
  const allowed = await verifyOfficialMoviePoster(poster, async (url, opts) => {
    calls.push({url, method:opts.method, range:opts.headers.Range});
    return new Response(new Uint8Array([0xff,0xd8]), {
      status:206,headers:{"content-type":"image/jpeg"}
    });
  });
  assert.equal(allowed,true);
  assert.equal(calls[0].method,"GET");
  assert.equal(calls[0].range,"bytes=0-2047");
  assert.equal(await verifyOfficialMoviePoster(poster,async()=>new Response("<html>bad</html>",{headers:{"content-type":"text/html"}})),false);
  assert.equal(await verifyOfficialMoviePoster("https://sonypictures.com.br.evil.test/poster.jpg",async()=>{throw Error("must not fetch");}),false);
});

test("Broad 2026 search still resolves complete Sony metadata from chosen exact trailer", async () => {
  const { readFileSync } = await import("node:fs");
  const portal = readFileSync(new URL("../src/portal.js", import.meta.url), "utf8");
  const render = readFileSync(new URL("../src/github-video-render.js", import.meta.url), "utf8");
  const item = officialMovieFromTrailer({
    title: "HOMEM ARANHA 2026",
    youtubeTitle: "HOMEM-ARANHA: UM NOVO DIA Todos os Trailers Dublado Oficial (2026)",
    type: "movie"
  });
  assert.equal(item?.title, "Homem-Aranha: Um Novo Dia");
  assert.equal(item?.cast.length, 6);
  assert.ok(item.overview.length > 40);
  assert.ok(portal.includes("const authoritativeTitle = publisherMovie?.title || title"));
  assert.ok(portal.includes("contentTitle: publisherMovie?.title || metadata.title || title"));
  assert.ok(render.includes("settings.movieMetadata = publisherMovie"));
  assert.ok(render.includes("settings.posterUrl = publisherMovie.posterUrl"));
  assert.ok(render.includes("source_title: String(settings.selectedYoutubeTitle"));
});
