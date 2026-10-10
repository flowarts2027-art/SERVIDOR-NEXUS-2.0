import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedVideoSource, isMp4Header } from '../src/video-source.js';
import { startYouTubeVideoIngest, recoverLocalIngestViaServer, retryFailedYoutubeIngestWithLocalHelper, startGitHubVideoRender, handleGitHubVideoRenderCallback } from '../src/github-video-render.js';

function fixture() {
  const row = { id: 'job', client_id: 'client-a', source_object_key: '', status: 'importing', settings_json: JSON.stringify({contentTitle:'Reacher',overview:'Um investigador enfrenta uma conspiração.',posterUrl:'https://images.example.test/reacher.jpg',movieMetadata:{cast:[{name:'Alan Ritchson',image:'https://images.example.test/alan.jpg'}]},sourceUrl:'https://www.youtube.com/watch?v=htlUwNs2AjQ',ingestCallbackToken:'ingest-secret'}), result_json:'{}' };
  const updates=[];
  const objects=new Map();
  const env={ NEXUS_DOWNLOADER_URL:'https://downloader.test', GITHUB_ACTIONS_TOKEN:'fixture-only', DB:{prepare(sql){return{bind(...args){return{first:async()=>({...row}),run:async()=>{
    updates.push({sql,args});
    if(sql.includes("source_object_key=?3")){row.source_object_key=args[2];row.status='awaiting_configuration';row.settings_json=args[3];row.result_json=args[4];}
    else if(sql.includes("settings_json=?3")){row.settings_json=args[2];if(args[3])row.result_json=args[3];}
    if(sql.includes("SET status='importing'"))row.status='importing';
    if(sql.includes("SET status='failed'"))row.status='failed';
    if(sql.includes("SET status='cutting'"))row.status='cutting';
    return {meta:{changes:1}};
  }};}}}}, MEDIA:{head:async key=>objects.get(key)||null,put:async(key,body,options)=>{
    const bytes=await new Response(body).arrayBuffer();const obj={size:bytes.byteLength,...options};objects.set(key,obj);return obj;
  }}};
  return {row,env,updates,objects};
}

test('failed YouTube authentication job can retry through the PC without losing original metadata', async () => {
  const f = fixture();
  f.row.status = 'failed';
  f.row.result_json = JSON.stringify({progress: 0, error: 'youtube_authentication_required'});
  f.row.settings_json = JSON.stringify({
    ...JSON.parse(f.row.settings_json), sourceProvider: 'youtube',
    selectedYoutubeUrl: 'https://www.youtube.com/watch?v=htlUwNs2AjQ',
    ingestTransport: 'github-actions'
  });
  const ticket = await retryFailedYoutubeIngestWithLocalHelper(f.env, 'client-a', 'job');
  const state = JSON.parse(f.row.settings_json);
  assert.equal(f.row.status, 'importing');
  assert.equal(state.contentTitle, 'Reacher');
  assert.equal(state.overview, 'Um investigador enfrenta uma conspiração.');
  assert.equal(state.posterUrl, 'https://images.example.test/reacher.jpg');
  assert.equal(state.ingestCallbackToken, undefined);
  assert.equal(state.ingestTransport, 'local-helper');
  assert.equal(state.localRetryAfterYoutubeBlock, true);
  assert.equal(ticket.sourceUrl, state.selectedYoutubeUrl);
  assert.equal(ticket.uploadTicket, state.localUploadTicket);
  assert.equal(ticket.uploadTicket.length, 64);
  assert.equal(JSON.parse(f.row.result_json).error, '');
  assert.ok(f.updates[0].sql.includes('settings_json=?5'));
  assert.ok(f.updates[0].sql.includes('client_id=?2'));
  await assert.rejects(retryFailedYoutubeIngestWithLocalHelper(f.env, 'client-a', 'job'), /video_local_retry_unavailable/);

  // A failed local handoff must NOT dispatch the already blocked GitHub importer.
  const recovery = await recoverLocalIngestViaServer(f.env, 'client-a', 'job', 'auxiliar_indisponivel');
  assert.equal(recovery.failed, true);
  assert.equal(recovery.requiresLocalHelper, true);
  assert.equal(f.row.status, 'failed');
  assert.equal(JSON.parse(f.row.result_json).error, 'local_helper_retry_failed');
  assert.equal(JSON.parse(f.row.settings_json).localUploadTicket, undefined);
  assert.equal(f.updates.some(u => u.sql.includes('github.com')), false);
});

test('local retry rejects jobs with already stored source or without a YouTube origin', async () => {
  const f = fixture();
  f.row.status = 'failed';
  f.row.source_object_key = 'library/client-a/video.mp4';
  f.row.settings_json = JSON.stringify({...JSON.parse(f.row.settings_json), sourceProvider: 'youtube'});
  await assert.rejects(retryFailedYoutubeIngestWithLocalHelper(f.env, 'client-a', 'job'), /video_local_retry_unavailable/);
  f.row.source_object_key = '';
  f.row.settings_json = JSON.stringify({...JSON.parse(f.row.settings_json), sourceProvider: 'catalog-preview'});
  await assert.rejects(retryFailedYoutubeIngestWithLocalHelper(f.env, 'client-a', 'job'), /video_local_retry_unavailable/);
});

test('source confirmation rejects missing, wrong-client, empty and incomplete objects', async()=>{
  const f=fixture();
  await assert.rejects(confirmedVideoSource(f.env,'client-a','library/client-b/video.mp4'),/video_source_missing/);
  await assert.rejects(confirmedVideoSource(f.env,'client-a','library/client-a/video.mp4'),/video_source_missing/);
  f.objects.set('library/client-a/video.mp4',{size:0,httpMetadata:{contentType:'video/mp4'}});
  await assert.rejects(confirmedVideoSource(f.env,'client-a','library/client-a/video.mp4'),/video_source_missing/);
  f.objects.set('library/client-a/video.mp4',{size:8,httpMetadata:{contentType:'video/mp4'}});
  await assert.rejects(confirmedVideoSource(f.env,'client-a','library/client-a/video.mp4',9),/video_source_size_mismatch/);
  assert.equal((await confirmedVideoSource(f.env,'client-a','library/client-a/video.mp4',8)).size,8);
  assert.equal(isMp4Header(new TextEncoder().encode('xxxxftypisom')),true);
  assert.equal(isMp4Header(new TextEncoder().encode('<html>error</html>')),false);
});

test('dedicated downloader is preferred when URL and secret are configured',async()=>{
  const f=fixture();
  f.env.NEXUS_DOWNLOADER_SECRET='dedicated-secret';
  f.env.PUBLIC_BASE_URL='https://nexus.test';
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url)==='https://downloader.test/ingest') return new Response('{"accepted":true}',{status:202,headers:{'content-type':'application/json'}});
    throw new Error('github_dispatch_should_not_run');
  };
  try{
    const result=await startYouTubeVideoIngest(f.env,'client-a','job');
    assert.equal(result.transport,'dedicated-downloader');
    assert.equal(calls.length,1);
    assert.equal(calls[0].init.headers.authorization,'Bearer dedicated-secret');
    const body=JSON.parse(calls[0].init.body);
    assert.equal(body.callback_base,'https://nexus.test');
    assert.equal(body.source_url,'https://www.youtube.com/watch?v=htlUwNs2AjQ');
  }finally{globalThis.fetch=original;}
});

test('YouTube ingest dispatch failures are persisted instead of staying at ten percent',async()=>{
  const original=globalThis.fetch;
  try{
    for(const [fail,pattern] of [
      [async()=>{throw new DOMException('timeout','TimeoutError');},/youtube_ingest_dispatch_timeout/],
      [async()=>Response.json({ok:true}),/youtube_ingest_dispatch_200/]
    ]){
      const f=fixture();globalThis.fetch=fail;
      await assert.rejects(startYouTubeVideoIngest(f.env,'client-a','job'),pattern);
      assert.equal(f.row.status,'failed');assert.equal(JSON.parse(f.row.result_json).progress,0);
      assert.equal(JSON.parse(f.row.settings_json).ingestCallbackToken,undefined);
    }
  }finally{globalThis.fetch=original;}
});

test('render never dispatches if the database key has no confirmed R2 object',async()=>{
  const f=fixture();f.row.status='awaiting_configuration';f.row.source_object_key='library/client-a/missing.mp4';
  await assert.rejects(startGitHubVideoRender(f.env,'client-a','job'),/video_source_missing/);
  assert.equal(f.updates.length,0);
});

test('missing official poster uses safe title card without borrowing unrelated artwork', async () => {
  const f=fixture();f.row.status='ready';f.row.source_object_key='library/client-a/video.mp4';
  f.objects.set(f.row.source_object_key,{size:12,httpMetadata:{contentType:'video/mp4'}});
  f.row.settings_json=JSON.stringify({contentTitle:'random-file-name',overview:'',mediaType:'',movieMetadata:{},composition:{showPoster:false,showOverview:true,showCast:true}});
  const original=globalThis.fetch;
  let dispatch=null;
  globalThis.fetch=async(url,options={})=>{
    if(String(url).includes('/dispatches')) dispatch=JSON.parse(options.body);
    return new Response(null,{status:204});
  };
  try {
    await startGitHubVideoRender(f.env,'client-a','job');
    const saved=JSON.parse(f.row.settings_json);
    assert.equal(f.row.status,'cutting');
    assert.equal(saved.contentTitle,'random-file-name');
    assert.equal(saved.posterSource,'title-card');
    assert.equal(saved.posterUrl,'');
    assert.equal(saved.composition.showPoster,true);
    assert.equal(saved.composition.showOverview,false);
    assert.equal(dispatch?.client_payload?.render?.poster_url,'');
    assert.equal(dispatch?.client_payload?.render?.title,'random-file-name');
  } finally {globalThis.fetch=original;}
});

test('ingest upload confirms R2 and starts the fixed 9x16 render automatically',async()=>{
  const f=fixture();const url=new URL('https://nexus.test/api/internal/video-ingest/upload');
  const request=new Request(url,{method:'PUT',body:'xxxxftypisom',headers:{'content-length':'12','content-type':'video/mp4','x-nexus-client-id':'client-a','x-nexus-job-id':'job','x-nexus-callback-token':'ingest-secret'}});
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(null,{status:204});
  try{
    const response=await handleGitHubVideoRenderCallback(request,f.env,url);
    assert.equal(response.status,201);assert.equal(f.row.status,'cutting');
    assert.equal((await f.env.MEDIA.head(f.row.source_object_key)).size,12);
    assert.equal(f.updates.some(x=>x.sql.includes("status='cutting'")),true);
    assert.equal((await response.json()).renderStarted,true);
  }finally{globalThis.fetch=original;}
});

test('local helper upload ticket is accepted once and rejected on reuse', async () => {
  const f = fixture();
  const ticket = 'a'.repeat(64);
  const base = JSON.parse(f.row.settings_json);
  f.row.settings_json = JSON.stringify({
    ...base,
    localUploadTicket: ticket,
    localUploadExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    creationMode: 'edit',
    composition: { trimStart: 1, trimEnd: 4, showPoster: true, showOverview: true, showCast: true }
  });
  const url = new URL('https://nexus.test/api/local-video-ingest/upload');
  const makeRequest = () => new Request(url, {
    method: 'PUT',
    body: 'xxxxftypisom',
    headers: {
      'content-length': '12',
      'content-type': 'video/mp4',
      'x-nexus-client-id': 'client-a',
      'x-nexus-job-id': 'job',
      'x-nexus-upload-ticket': ticket
    }
  });
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const first = await handleGitHubVideoRenderCallback(makeRequest(), f.env, url);
    assert.equal(first.status, 201);
    const firstPayload = await first.json();
    assert.equal(firstPayload.renderStarted, false);
    assert.equal(firstPayload.editable, true);
    assert.equal(f.row.status, 'awaiting_configuration');
    assert.equal(JSON.parse(f.row.settings_json).localUploadTicket, undefined);

    const second = await handleGitHubVideoRenderCallback(makeRequest(), f.env, url);
    assert.equal(second.status, 401);
    assert.equal((await second.json()).error, 'unauthorized');
  } finally {
    globalThis.fetch = original;
  }
});

test('interrupted local helper upload restores ticket and allows retry', async () => {
  const f = fixture();
  const ticket = 'c'.repeat(64);
  const base = JSON.parse(f.row.settings_json);
  f.row.settings_json = JSON.stringify({
    ...base,
    localUploadTicket: ticket,
    localUploadExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    creationMode: 'edit',
    composition: { showPoster: true, showOverview: true, showCast: true }
  });
  const url = new URL('https://nexus.test/api/local-video-ingest/upload');
  const makeRequest = () => new Request(url, {
    method: 'PUT',
    body: 'xxxxftypisom',
    headers: {
      'content-length': '12',
      'content-type': 'video/mp4',
      'x-nexus-client-id': 'client-a',
      'x-nexus-job-id': 'job',
      'x-nexus-upload-ticket': ticket
    }
  });

  const originalPut = f.env.MEDIA.put;
  let firstStore = true;
  f.env.MEDIA.put = async (...args) => {
    if (firstStore) {
      firstStore = false;
      throw new Error('simulated_interrupted_upload');
    }
    return originalPut(...args);
  };
  f.env.MEDIA.delete = async key => { f.objects.delete(key); };

  const first = await handleGitHubVideoRenderCallback(makeRequest(), f.env, url);
  assert.equal(first.status, 502);
  assert.equal((await first.json()).error, 'local_upload_interrupted');
  assert.equal(JSON.parse(f.row.settings_json).localUploadTicket, ticket);

  const second = await handleGitHubVideoRenderCallback(makeRequest(), f.env, url);
  assert.equal(second.status, 201);
  assert.equal((await second.json()).editable, true);
  assert.equal(JSON.parse(f.row.settings_json).localUploadTicket, undefined);
});

test('local helper automatic mode uploads and starts render immediately', async () => {
  const f = fixture();
  const ticket = 'b'.repeat(64);
  const base = JSON.parse(f.row.settings_json);
  f.row.settings_json = JSON.stringify({
    ...base,
    localUploadTicket: ticket,
    localUploadExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    creationMode: 'auto',
    composition: { showPoster: true, showOverview: true, showCast: true }
  });
  const url = new URL('https://nexus.test/api/local-video-ingest/upload');
  const request = new Request(url, {
    method: 'PUT',
    body: 'xxxxftypisom',
    headers: {
      'content-length': '12',
      'content-type': 'video/mp4',
      'x-nexus-client-id': 'client-a',
      'x-nexus-job-id': 'job',
      'x-nexus-upload-ticket': ticket
    }
  });
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const response = await handleGitHubVideoRenderCallback(request, f.env, url);
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.editable, false);
    assert.equal(payload.renderStarted, true);
    assert.equal(f.row.status, 'cutting');
  } finally {
    globalThis.fetch = original;
  }
});

test('local helper automatic render dispatch failure is persisted on the job', async () => {
  const f = fixture();
  const ticket = 'd'.repeat(64);
  const base = JSON.parse(f.row.settings_json);
  f.row.settings_json = JSON.stringify({
    ...base,
    localUploadTicket: ticket,
    localUploadExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    creationMode: 'auto',
    overview: '',
    mediaType: '',
    movieMetadata: {},
    posterUrl: 'https://images.example.test/fallback.jpg',
    movieMetadata: { posterUrl: 'https://images.example.test/fallback.jpg', cast: [] },
    composition: { showPoster: true, showOverview: true, showCast: true }
  });
  const request = new Request('https://nexus.test/api/local-video-ingest/upload', {
    method: 'PUT',
    body: 'xxxxftypisom',
    headers: {
      'content-length': '12',
      'content-type': 'video/mp4',
      'x-nexus-client-id': 'client-a',
      'x-nexus-job-id': 'job',
      'x-nexus-upload-ticket': ticket
    }
  });
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Bad credentials'}),{status:401,headers:{'content-type':'application/json'}});
  try{
    const response = await handleGitHubVideoRenderCallback(request, f.env, new URL(request.url));
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.renderStarted, false);
    assert.equal(f.row.status, 'failed');
    assert.match(JSON.parse(f.row.result_json).error, /^github_render_dispatch_401:/);
  }finally{globalThis.fetch=original;}
});

test('download-only YouTube ingest stores the source without auto-rendering', async () => {
  const originalFetch = global.fetch;
  let dispatches = 0;
  global.fetch = async (url, init = {}) => {
    if (String(url).includes('/dispatches')) { dispatches++; return new Response('', { status: 204 }); }
    return new Response('{}', { status: 200 });
  };
  const state = {
    row: {
      id: 'job-download-only',
      client_id: 'client-a',
      source_object_key: '',
      status: 'importing',
      settings_json: JSON.stringify({
        contentTitle: 'Trailer',
        overview: 'Sinopse suficiente para o teste.',
        sourceUrl: 'https://www.youtube.com/watch?v=0123456789_',
        selectedYoutubeUrl: 'https://www.youtube.com/watch?v=0123456789_',
        downloadOnly: true,
        ingestCallbackToken: 'token'
      }),
      result_json: '{}'
    }
  };
  const stored = new Map();
  const env = {
    GITHUB_ACTIONS_TOKEN: 'x',
    MEDIA: {
      async put(key, body) { stored.set(key, new Uint8Array(await new Response(body).arrayBuffer())); return { key }; },
      async head(key) {
        const value = stored.get(key);
        return value ? { size: value.byteLength, httpMetadata: { contentType: 'video/mp4' }, customMetadata: { clientId: 'client-a' } } : null;
      }
    },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() { return state.row; },
              async run() {
                if (sql.includes("source_object_key=?3")) {
                  state.row.source_object_key = args[2];
                  state.row.status = 'awaiting_configuration';
                  state.row.settings_json = args[3];
                  state.row.result_json = args[4];
                }
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    }
  };
  try {
    const request = new Request('https://nexus.test/api/internal/video-ingest/upload', {
      method: 'PUT',
      headers: {
        'x-nexus-job-id': 'job-download-only',
        'x-nexus-client-id': 'client-a',
        'x-nexus-callback-token': 'token',
        'content-length': '12'
      },
      body: new Uint8Array([0,0,0,0,102,116,121,112,0,0,0,0])
    });
    const response = await handleGitHubVideoRenderCallback(request, env, new URL(request.url));
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.downloadOnly, true);
    assert.equal(payload.renderStarted, false);
    assert.equal(state.row.status, 'awaiting_configuration');
    assert.equal(dispatches, 0);
  } finally { global.fetch = originalFetch; }
});

test('a renderer transport failure is stored as failure and can be retried',async()=>{
  const f=fixture();f.row.status='awaiting_configuration';f.row.source_object_key='library/client-a/video.mp4';
  f.objects.set(f.row.source_object_key,{size:12,httpMetadata:{contentType:'video/mp4'}});
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw new TypeError('fetch failed');};
  try{await assert.rejects(startGitHubVideoRender(f.env,'client-a','job'),/github_render_dispatch_transport_failed/);assert.equal(f.row.status,'failed');}
  finally{globalThis.fetch=original;}
});

test('YouTube job requiring local helper does not loop back to blocked GitHub ingest', async () => {
  const f = fixture();
  f.row.settings_json = JSON.stringify({
    ...JSON.parse(f.row.settings_json),
    sourceProvider: 'youtube',
    ingestTransport: 'local-helper'
  });
  const oldFetch = globalThis.fetch;
  let dispatch = null;
  globalThis.fetch = async (url, options={}) => {
    if (String(url).includes('/dispatches')) {
      dispatch = JSON.parse(options.body);
      return new Response(null, { status: 204 });
    }
    throw new Error('unexpected_external_request');
  };
  try {
    const recovered = await recoverLocalIngestViaServer(f.env, 'client-a', 'job', 'local_helper_unavailable');
    assert.equal(recovered.recovered, false);
    assert.equal(recovered.failed, true);
    assert.equal(recovered.requiresLocalHelper, true);
    assert.equal(dispatch, null);
    assert.equal(JSON.parse(f.row.settings_json).ingestTransport, 'local-helper');
    assert.equal(f.row.status, 'failed');
    assert.equal(JSON.parse(f.row.result_json).error, 'local_helper_required');
  } finally {
    globalThis.fetch = oldFetch;
  }
});
