import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichVerifiedFilmPresentation, fetchWikipediaCastPortraits, fetchRelatedFranchiseFilms, trustedWikimediaPortrait } from '../src/video-metadata-enrichment.js';

const movie = {id:'sony:spider-man-brand-new-day-2026',title:'Homem-Aranha: Um Novo Dia',
  posterUrl:'https://www.sonypictures.com.br/sites/brazil/files/poster.jpg',
  cast:['Tom Holland','Zendaya','Mark Ruffalo'].map(name=>({name,image:''})),
  related:[],reviews:[]};
const pics = ['Tom Holland (actor)','Zendaya','Mark Ruffalo'].map((title,n)=>({
  title,thumbnail:{source:'https://upload.wikimedia.org/wikipedia/commons/1/1'+n+'/actor.jpg'}
}));
const fakeWikipedia = async (_url, options) => {
  assert.match(_url, /en\.wikipedia\.org\/w\/api\.php/);
  assert.equal(options.headers.Accept, 'application/json');
  return new Response(JSON.stringify({query:{pages:pics}}),{status:200});
};
const fakeLookup = async title => {
  const list = {
    'Spider-Man No Way Home':{id:'itunes:1',title:'Spider-Man: No Way Home',year:'2021',posterUrl:'https://is1-ssl.mzstatic.com/posters/1.jpg'},
    'Spider-Man Far From Home':{id:'itunes:2',title:'Spider-Man: Far From Home',year:'2019',posterUrl:'https://is2-ssl.mzstatic.com/posters/2.jpg'},
    'Spider-Man Homecoming':{id:'itunes:3',title:'Spider-Man: Homecoming',year:'2017',posterUrl:'https://is3-ssl.mzstatic.com/posters/3.jpg'}
  };
  return [list[title]];
};
test('Cast URLs must be real Wikimedia Commons thumbnail hosts and independent of current poster', async () => {
  assert.equal(trustedWikimediaPortrait('https://upload.wikimedia.org/wikipedia/commons/a/b/photo.jpg'),
    'https://upload.wikimedia.org/wikipedia/commons/a/b/photo.jpg');
  for(const url of ['https://evil.test/photo.jpg','http://upload.wikimedia.org/wikipedia/commons/a/b.jpg',
    'https://upload.wikimedia.org/wikipedia/en/photo.jpg','https://upload.wikimedia.org.evil.test/wikipedia/commons/a/b.jpg'])
    assert.equal(trustedWikimediaPortrait(url),'');
  assert.equal(trustedWikimediaPortrait('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Z.jpg/500px-Z.jpg'),
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Z.jpg/500px-Z.jpg');
  const found = await fetchWikipediaCastPortraits(movie.cast,fakeWikipedia);
  assert.equal(found.length,3);
  assert.ok(found.every(p=>p.image));
});
test('Distinct verified sequels have individual identities, distinct covers and correct years',async()=>{
  const related = await fetchRelatedFranchiseFilms(movie,{lookup:fakeLookup,check:async url=>url.includes('mzstatic.com')});
  assert.equal(related.length,3);
  assert.deepEqual(related.map(x=>x.id),['itunes:1','itunes:2','itunes:3']);
  assert.equal(new Set(related.map(x=>x.image)).size,3);
  assert.ok(related.every(x=>x.image!==movie.posterUrl));
});
test('When Apple lacks all three films, only verified Sony covers are allowed', async()=>{
  const main={...movie};
  const seen=[];
  const out=await fetchRelatedFranchiseFilms(main,{
    lookup:async()=>[],
    check:async url => { seen.push(url); return url.includes('sonypictures.com.br/sites/brazil/files/'); }
  });
  assert.equal(out.length,3);
  assert.ok(out.every(item=>item.id.startsWith('sony:')));
  assert.equal(new Set(out.map(item=>item.image)).size,3);
  assert.equal(new Set(out.map(item=>item.year)).size,3);
  assert.equal(seen.length,3);
});
test('Spider-Man final presentation includes credited factual scores and actual cast photos',async()=>{
  const result=await enrichVerifiedFilmPresentation(movie,{fetcher:fakeWikipedia,lookup:fakeLookup,check:async()=>true});
  assert.equal(result.cast.length,3);
  assert.ok(result.cast.every(x=>x.image.startsWith('https://upload.wikimedia.org/wikipedia/commons/')));
  assert.equal(result.related.length,3);
  assert.match(result.rating,/Rotten Tomatoes/);
  assert.equal(result.reviews.length,2);
  assert.match(result.reviews[0].text,/08\/10\/2026/);
  assert.ok(result.sources.includes('https://www.rottentomatoes.com/m/spider_man_brand_new_day'));
  const unrelated={id:'itunes:123',title:'Outro filme',cast:[]};
  assert.equal(await enrichVerifiedFilmPresentation(unrelated),unrelated);
});
