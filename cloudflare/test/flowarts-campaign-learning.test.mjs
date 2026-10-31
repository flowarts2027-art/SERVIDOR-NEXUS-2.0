import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFlowArtsPosts, formatFlowArtsLearningReport } from '../src/flowarts-campaign-learning.js';
test('summarizes authorized metrics without inventing conversions', () => {
 const s=summarizeFlowArtsPosts([{id:'1',tipo:'IMAGE',alcance:3,visualizacoes:4,curtidas:1},{id:'2',tipo:'CAROUSEL_ALBUM',alcance:2,visualizacoes:2}]);
 assert.equal(s.posts,2);assert.equal(s.totals.reach,5);assert.equal(s.totals.views,6);
 assert.equal(s.topReach[0].id,'1');assert.equal(s.styleEvidenceReady,0);
 assert.match(s.recommendation,/Amostra insuficiente/);
});
test('report discloses missing style metadata',()=>{
 const report=formatFlowArtsLearningReport({posts:[{tipo:'IMAGE',alcance:1,link:'https://www.instagram.com/p/test/'}]},'2026-10-31');
 assert.match(report,/0\\/1/);assert.match(report,/Aprovação humana obrigatória/);
});
