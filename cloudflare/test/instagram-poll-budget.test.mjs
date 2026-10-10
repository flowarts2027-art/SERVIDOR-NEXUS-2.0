import test from "node:test";
import assert from "node:assert/strict";
import {waitInstagramContainer} from "../src/publisher.js";

test("pending carousel has at most twelve status fetches, with time left for publish",async()=>{
  let elapsed=0,calls=0;const delays=[];
  await assert.rejects(waitInstagramContainer("mock","container","carousel",120000,{
    now:()=>elapsed,wait:async ms=>{delays.push(ms);elapsed+=ms;},request:async()=>{calls++;return {status_code:"IN_PROGRESS"};}
  }),/instagram_carousel_processing_timeout/);
  assert.equal(calls,12);assert.equal(elapsed,113000);assert.deepEqual(delays,[3000,...Array(11).fill(10000)]);
  // Four generations + four reviews + five container POSTs + status checks
  // + one publish + one permalink remain below 50 external fetches.
  assert.equal(8+5+calls+2,27);
});
test("approved processing stops immediately without issuing any publish request itself",async()=>{
  const paths=[];
  await waitInstagramContainer("mock","container","carousel",120000,{now:()=>0,wait:async()=>{},request:async(token,path)=>{paths.push(path);return {status_code:paths.length===3?"FINISHED":"IN_PROGRESS"};}});
  assert.equal(paths.length,3);assert.ok(paths.every(path=>path==="container?fields=status_code,status"));
});
test("processing rejection stops after one request and preserves diagnostic",async()=>{
  let calls=0;
  await assert.rejects(waitInstagramContainer("mock","container","carousel",120000,{now:()=>0,wait:async()=>{},request:async()=>{calls++;return {status_code:"ERROR",status:"invalid media"};}}),error=>error.message==="instagram_carousel_processing_failed"&&error.detail==="invalid media");
  assert.equal(calls,1);
});
test("image shorter deadline remains bounded",async()=>{
  let elapsed=0,calls=0;
  await assert.rejects(waitInstagramContainer("mock","container","media",85000,{now:()=>elapsed,wait:async ms=>{elapsed+=ms;},request:async()=>{calls++;return {status_code:"IN_PROGRESS"};}}),/instagram_media_processing_timeout/);
  assert.equal(elapsed,85000);assert.equal(calls,10);
});
