import test from "node:test";
import assert from "node:assert/strict";
import {globalPlayCarouselPlan,globalPlayReferenceDirection} from "../src/media-references.js";

test("four individual scenes follow the supplied carousel, Reel reserves copy panel",()=>{
  assert.deepEqual(globalPlayCarouselPlan().map(x=>x.role),["cinema","catalog","children","football"]);
  assert.match(globalPlayReferenceDirection("carousel",3),/football match/);
  assert.match(globalPlayReferenceDirection("carousel",0),/never the four-panel/);
  assert.match(globalPlayReferenceDirection("reel"),/dark copy panel/);
});
