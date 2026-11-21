import test from "node:test";
import assert from "node:assert/strict";
import { movies, series } from "../src/providers/movies.js";
import { bannerDoDia } from "../src/banner-do-dia.js";

test("Wikidata agrupa as datas e direções sem confundir entidades ou baixar imagens", async () => {
  const urls = [];
  const field = (value) => ({ value });
  const row = {
    item: field("http://www.wikidata.org/entity/Q1"),
    itemLabel: field("Filme"),
    directorLabel: field("Ana"),
    date: field("2020-04-02"),
    genreLabel: field("ação"),
    descr: field("Descrição da fonte"),
  };
  const hits = await movies("Cinema & café", async (url) => {
    urls.push(new URL(url));
    return urls.length === 1
      ? { search: [{ id: "Q1" }, { id: "inválido" }] }
      : {
          results: {
            bindings: [
              row,
              {
                ...row,
                date: field("2019-09-10"),
                directorLabel: field("Lia"),
              },
            ],
          },
        };
  });
  assert.equal(urls[0].searchParams.get("search"), "Cinema & café");
  assert.match(urls[1].searchParams.get("query"), /VALUES \?item \{ wd:Q1 \}/);
  assert.equal(hits[0].meta, "2019 • ação");
  assert.equal(hits[0].director, "Ana, Lia");
  assert.equal(hits[0].body, "Descrição da fonte");
  assert.equal(hits[0].poster, undefined);
});

test("TVmaze expõe texto, crédito e licença, mesmo se o catálogo oferecer capa oficial", async () => {
  const [r] = await series("Dark", async () => [
    {
      show: {
        id: 7,
        name: "Dark",
        genres: ["Science-Fiction"],
        summary: "<p>A &amp; B</p>",
        image: { original: "https://example.org/capa.jpg" },
      },
    },
  ]);
  assert.deepEqual(r.genres, ["Ficção científica"]);
  assert.equal(r.body, "A & B");
  assert.equal(r.credit, "Dados: TVmaze");
  assert.match(r.license, /CC BY-SA/);
  assert.ok(!JSON.stringify(r).includes("capa.jpg"));
});

test("acesso e logo usam o assinante autenticado", async () => {
  const url = new URL("https://nexus.example/api/portal/banner/logo");
  const keys = [];
  const env = {
    BANNER_DO_DIA_CLIENTES: "alpha,beta",
    MEDIA: {
      get(key) {
        keys.push(key);
        return null;
      },
    },
  };
  for (const [id, status] of [
    ["outro", 403],
    ["alpha", 204],
    ["beta", 204],
  ]) {
    assert.equal(
      (await bannerDoDia(new Request(url), env, url, id)).status,
      status,
    );
  }
  assert.deepEqual(keys, [
    "banner-do-dia/logos/alpha.png",
    "banner-do-dia/logos/beta.png",
  ]);
});
