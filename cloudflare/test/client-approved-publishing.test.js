import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('client approval remains mandatory across publish paths',()=>{
 const src=[source('posts.js'),source('agent-runtime.js'),source('scheduler.js')];
 for(const s of src)assert.match(s,/approval_status|approvalStatus/);
 assert.match(src[0],/post_not_approved/);
 assert.match(src[1],/approval_status===\"approved\"/);
});
test('approved items do not require copy/designer sign-off again in publish query',()=>{
 const scheduler=source('scheduler.js');
 const portion=scheduler.slice(scheduler.indexOf('const ready = await env.DB.prepare('));
 assert.doesNotMatch(portion,/qualityGates\.copyChief/);
 assert.doesNotMatch(portion,/qualityGates\.designer/);
 const runtime=source('agent-runtime.js');
 assert.doesNotMatch(runtime,/quality\.copyChief!==\"approved\"\|\|quality\.designer/);
});
test('revision request revokes approval and blocks publication',()=>{
 const posts=source('posts.js');
 assert.match(posts,/approvalStatus: \"correction_requested\"/);
 const scheduler=source('scheduler.js');
 assert.match(scheduler,/approval_status='approved'/);
});
