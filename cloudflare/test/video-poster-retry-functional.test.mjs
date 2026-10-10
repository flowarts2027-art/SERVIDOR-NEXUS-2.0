import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handlePortalApi } from '../src/portal.js';
import { createPortalSession } from '../src/auth.js';

async function retryFixture({ selectedYoutubeTitle = '', posterAvailable = true, title = 'Homem-Aranha: Um Novo Dia' } = {}) {
  const db = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  const DB = { prepare(sql) { const wrap = args => {
    const parameters = Object.fromEntries(args.map((value, i) => ['?' + (i + 1), value ?? null]));
    return { first: async () => db.prepare(sql).get(parameters) || null,
      all: async () => ({ results: db.prepare(sql).all(parameters) }),
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } }) };
  }; return { ...wrap([]), bind: (...args) => wrap(args) }; } };
  const sourceKey = 'videos/poster-client/sources/original.mp4';
  const original = {size: 512, httpMetadata: {contentType:'video/mp4'}, customMetadata:{clientId:'poster-client'}};
  const env = { DB, NEXUS_SECRET_KEY:'fixture-only-secret', GITHUB_ACTIONS_TOKEN:'fixture-only-token', PUBLIC_BASE_URL:'https://nexus.test',
    MEDIA: {head: async key => key === sourceKey ? original : null, get: async () => null, put: async () => ({})} };
  db.prepare("INSERT INTO clients(id,name,status,config_json) VALUES('poster-client','Poster client','online','{}')").run();
  const settings = {contentTitle:title,requestedSearchTitle:'homem aranha',selectedYoutubeTitle,overview:'Peter Parker enfrenta uma nova ameaça em Nova York.',mediaType:'FILME',releaseYear:'2026',posterUrl:'',movieMetadata:{title,overview:'Peter Parker enfrenta uma nova ameaça em Nova York.',cast:[],related:[],reviews:[]}};
  db.prepare("INSERT INTO video_jobs(id,client_id,status,source_object_key,settings_json,result_json) VALUES('poster-retry','poster-client','failed',?1,?2,?3)").run({'?1':sourceKey,'?2':JSON.stringify(settings),'?3':JSON.stringify({error:'video_official_poster_required'})});
  const session = await createPortalSession(env,'poster-client');
  const nativeFetch = globalThis.fetch;
  const dispatches = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if(target.startsWith('https://api.github.com/')) { dispatches.push(JSON.parse(options.body)); return new Response(null,{status:204}); }
    if(target.startsWith('https://www.sonypictures.com.br/sites/brazil/files/')) return new Response(posterAvailable ? new Uint8Array([255,216,255,217]) : 'unavailable',{status:posterAvailable ? 200 : 404,headers:{'content-type':posterAvailable ? 'image/jpeg' : 'text/html'}});
    throw new Error('external_network_disabled_in_fixture');
  };
  try {
    const url = new URL('https://nexus.test/api/portal/videos/poster-retry/process');
    const request = new Request(url,{method:'POST',headers:{'x-nexus-session':session.token,'content-type':'application/json'},body:'{}'});
    const response = await handlePortalApi(request,env,url,{waitUntil(){}});
    const row = db.prepare("SELECT * FROM video_jobs WHERE id='poster-retry'").get();
    return {status:response.status,body:await response.json(),row,settings:JSON.parse(row.settings_json),dispatches,sourceKey};
  } finally { globalThis.fetch = nativeFetch; db.close(); }
}

test('failed existing MP4 recovers publisher poster from exact movie identity without trailer title',async()=>{
  const result = await retryFixture();
  assert.equal(result.status,202,JSON.stringify(result.body));
  assert.equal(result.row.status,'cutting');
  assert.equal(result.row.source_object_key,result.sourceKey);
  assert.equal(result.settings.contentTitle,'Homem-Aranha: Um Novo Dia');
  assert.equal(result.settings.catalogId,'sony:spider-man-brand-new-day-2026');
  assert.match(result.settings.posterUrl,/^https:\/\/www\.sonypictures\.com\.br\/sites\/brazil\/files\//);
  assert.equal(result.dispatches.length,1);
  assert.equal(result.dispatches[0].client_payload.job_id,'poster-retry');
  assert.equal(result.dispatches[0].client_payload.render.poster_url,result.settings.posterUrl);
});

test('unavailable official image keeps original and blocks render instead of inventing a poster',async()=>{
  const result = await retryFixture({posterAvailable:false});
  assert.equal(result.status,409);
  assert.equal(result.body.error,'video_official_poster_required');
  assert.equal(result.row.source_object_key,result.sourceKey);
  assert.equal(result.dispatches.length,0);
});

test('generic franchise search alone cannot select a publisher film poster',async()=>{
  const result = await retryFixture({title:'homem aranha'});
  assert.equal(result.status,409);
  assert.equal(result.body.error,'video_official_poster_required');
  assert.equal(result.dispatches.length,0);
});

 test('conflicting selected trailer prevents recovery from exact stored film title',async()=>{
  const result = await retryFixture({selectedYoutubeTitle:'HOMEM-ARANHA: SEM VOLTA PARA CASA Trailer Dublado Oficial (2021)'});
  assert.equal(result.status,409);
  assert.equal(result.body.error,'video_official_poster_required');
  assert.equal(result.dispatches.length,0);
});
