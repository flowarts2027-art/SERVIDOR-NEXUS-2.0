import test from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_PLAY_AUDIT_BASELINE, globalPlayCampaignForDay, globalPlayCampaignStrategy } from "../src/globalplay-campaign.js";

test("Global Play audit campaign runs two daily slots at 09h and 15h",()=>{
  const strategy=globalPlayCampaignStrategy();
  assert.equal(strategy.dailySlots,2);
  assert.deepEqual(strategy.recommendedPostTimes,["09:00","15:00"]);
  assert.deepEqual(strategy.contentRatio,{entertainmentEngagement:50,painSolution:30,offer:20});
});

test("30-day campaign exposes two actionable pieces per day",()=>{
  const formats=new Set();
  for(let day=1;day<=30;day++){
    const pieces=globalPlayCampaignForDay(new Date(2026,9,day,12,0,0));
    assert.equal(pieces.length,2);
    for(const piece of pieces){
      formats.add(piece.format);
      assert.ok(piece.hook.length>0);
      assert.ok(piece.cta.length>0);
      assert.equal(piece.storytelling,true);
    }
  }
  assert.ok(formats.has("reel"));
  assert.ok(formats.has("carousel"));
  assert.ok(formats.has("post"));
});


test("Global Play strategy carries the measured audit baseline and funnel diagnosis",()=>{
  const strategy=globalPlayCampaignStrategy();
  assert.equal(GLOBAL_PLAY_AUDIT_BASELINE.views,1342);
  assert.equal(GLOBAL_PLAY_AUDIT_BASELINE.nonFollowersViewShare,56.6);
  assert.equal(GLOBAL_PLAY_AUDIT_BASELINE.nonFollowersInteractionShare,14.5);
  assert.equal(GLOBAL_PLAY_AUDIT_BASELINE.profileVisits,140);
  assert.equal(GLOBAL_PLAY_AUDIT_BASELINE.externalLinkTaps,6);
  assert.match(strategy.funnelDiagnosis.interaction,/não seguidores/i);
  assert.match(strategy.funnelDiagnosis.profileToLink,/gargalo/i);
});

test("every Global Play audited piece carries audience, funnel and story metadata",()=>{
  for(let day=1;day<=30;day++){
    for(const piece of globalPlayCampaignForDay(new Date(2026,9,day,12,0,0))){
      assert.ok(["entertainmentEngagement","painSolution","offer"].includes(piece.auditCategory));
      assert.match(piece.targetSegment,/não seguidores/i);
      assert.ok(piece.conversionBridge.length>0);
      assert.deepEqual(piece.storyStructure,["situação","emoção","problema","virada","CTA"]);
      assert.match(piece.visualBrief,/hook visível imediatamente/i);
    }
  }
});
