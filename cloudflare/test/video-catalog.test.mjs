import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeUrl, searchCatalog, catalogMetadata, catalogPreviewUrl, distinctRelatedTitles, portugueseTrailerScore } from '../src/video-catalog.js';

test('Every title requires a verified official trailer with Portuguese evidence; English and fan uploads are rejected', () => {
  const valid = { title: 'Reacher — Trailer oficial dublado', channel: 'Prime Video Brasil', channelVerified: true };
  assert.ok(portugueseTrailerScore(valid) >= 0);
  assert.ok(portugueseTrailerScore({...valid,channelVerified:false,channelId:'UCuNjvqjTzw9LcD9PVpTVWRA'}) >= 0);
  assert.ok(portugueseTrailerScore({...valid,channelVerified:false,channelId:'fake'}) >= 0);
  for (const patch of [
    { title: 'Reacher — Official trailer English' },
    { title: 'Reacher — Trailer legendado' },
    { channel: 'Fan trailers Brasil' },
    { title: 'Reacher entrevista dublada' },
    { title: 'Michael Official Trailer', channel: 'Universal Pictures' }
  ]) assert.equal(portugueseTrailerScore({ ...valid, ...patch }), -1);
});

test('YouTube imports accept canonical public video URLs and reject foreign hosts and playlists', () => {
  for (const url of ['https://youtu.be/0123456789_', 'https://www.youtube.com/watch?v=0123456789_&list=ignore', 'https://youtube.com/shorts/0123456789_']) assert.equal(youtubeUrl(url), 'https://www.youtube.com/watch?v=0123456789_');
  for (const url of ['https://youtube.com.evil.test/watch?v=0123456789_', 'http://youtube.com/watch?v=0123456789_', 'https://youtube.com/playlist?list=x', 'https://127.0.0.1/source.mp4']) assert.equal(youtubeUrl(url), '');
});


test('Catalog preview accepts only Apple HTTPS media hosts', () => {
  assert.equal(catalogPreviewUrl('https://video-ssl.itunes.apple.com/path/trailer.m4v'), 'https://video-ssl.itunes.apple.com/path/trailer.m4v');
  assert.equal(catalogPreviewUrl('https://is1-ssl.mzstatic.com/path/preview.mp4'), 'https://is1-ssl.mzstatic.com/path/preview.mp4');
  assert.equal(catalogPreviewUrl('http://video-ssl.itunes.apple.com/path/trailer.m4v'), '');
  assert.equal(catalogPreviewUrl('https://itunes.apple.com.evil.test/path/trailer.m4v'), '');
});

test('Series metadata selects the requested catalogue ID and never uses another title as fallback', async () => {
  const previous=global.fetch;
  global.fetch=async url => {
    const payload=String(url).includes('search/shows') ? [{show:{id:1,name:'Reacher',premiered:'2022-02-04',summary:'<p>Jack Reacher investigates.</p>',image:{original:'https://static.tvmaze.com/poster.jpg'}}}]
      : String(url).endsWith('/cast') ? [{person:{name:'Alan Ritchson',image:{original:'https://static.tvmaze.com/alan.jpg'}}}]
      : String(url).includes('?page=0') ? [{id:2,name:'Other thriller',genres:['Action'],rating:{average:8},image:{original:'https://static.tvmaze.com/related.jpg'}}]
      : {id:1,name:'Reacher',genres:['Action'],averageRuntime:60,rating:{average:8.1},url:'https://www.tvmaze.com/shows/1/reacher'};
    return new Response(JSON.stringify(payload));
  };
  try {
    const matches=await searchCatalog('Reacher','series'); assert.equal(matches[0].overview,'Jack Reacher investigates.');
    const metadata=await catalogMetadata('Reacher','series','tvmaze:1');
    assert.equal(metadata.cast[0].name,'Alan Ritchson');
    const inferred=await catalogMetadata('Reacher temporada 1','series');
    assert.equal(inferred.title,'Reacher'); assert.equal(metadata.reviews[0].source,'TVmaze'); assert.equal(metadata.related[0].title,'Other thriller');
    await assert.rejects(catalogMetadata('Reacher','series','tvmaze:999'), /catalog_title_not_found/);
  } finally {global.fetch=previous;}
});

test('related carousel does not repeat Spider-Man or reuse his main poster', () => {
  const options = [
    {title:'Homem-Aranha',image:'https://example.test/main.jpg'},
    {title:'Homem Aranha',image:'https://example.test/alternate.jpg'},
    {title:'Homem-Aranha 2',image:'https://example.test/main.jpg'},
    {title:'Homem-Aranha 2',image:'https://example.test/sequel.jpg'},
    {title:'Homem-Aranha 2',image:'https://example.test/duplicate.jpg'},
    {title:'Doutor Estranho',image:'https://example.test/magic.jpg'},
    {title:'Outro Filme',image:''}
  ];
  const selected = distinctRelatedTitles(options,'Homem-Aranha','https://example.test/main.jpg');
  assert.deepEqual(selected.map(x => x.title), ['Homem-Aranha 2','Doutor Estranho']);
  assert.ok(selected.every(x => x.image && x.image !== 'https://example.test/main.jpg'));
  assert.deepEqual(distinctRelatedTitles([{title:'Homem Aranha',image:'https://example.test/other.jpg'}],'Homem-Aranha'), []);
});
