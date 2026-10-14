import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {easeHeading,roadHeading} from '../dist/motion.js';
import {buildRoadGeometry} from '../dist/road-geometry.js';
const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('heading crosses the 180-degree seam by the short arc, with bounded turns',()=>{
 const a=179*Math.PI/180,b=-179*Math.PI/180;
 const next=easeHeading(a,b,1/60);
 assert.ok(next>a);assert.ok(next-a<2*Math.PI/180);
 assert.ok(Math.abs(easeHeading(0,Math.PI,.016))<=2.1*.016);
 assert.equal(easeHeading(1,2,0),1);
});
test('steady heading response agrees at 30 and 120 fps and settles without overshoot',()=>{
 const simulate=fps=>{let h=0;for(let i=0;i<fps;i++)h=easeHeading(h,.3,1/fps);return h;};
 assert.ok(Math.abs(simulate(30)-simulate(120))<1e-10);
 assert.ok(simulate(30)> .28 && simulate(30)<.3);
});
test('actual complete route has substantially less angular jitter without changing road positions',()=>{
 const road=buildRoadGeometry(JSON.parse(readFileSync(new URL('../dist/road-route.json',import.meta.url))));
 let rawTotal=0,softTotal=0,oldRaw=road.sample(0).angle*Math.PI/180,h=roadHeading(road,0)*Math.PI/180;
 const before=road.points.map(p=>({...p}));
 for(let i=1;i<=4800;i++){
  const d=road.length*i/4800,raw=road.sample(d).angle*Math.PI/180;
  const next=easeHeading(h,roadHeading(road,d)*Math.PI/180,1/60);
  rawTotal+=Math.abs(diff(raw,oldRaw));softTotal+=Math.abs(diff(next,h));
  assert.ok(Math.abs(next-h)<=2.1/60+1e-10);
  oldRaw=raw;h=next;
 }
 assert.ok(softTotal<rawTotal*.6,`Expected less jitter; raw=${rawTotal}, smoothed=${softTotal}`);
 assert.deepEqual(road.points,before);
 console.log(`Route angular variation: ${(100*(1-softTotal/rawTotal)).toFixed(1)}% lower`);
 for(const d of [0,road.length])assert.ok(Number.isFinite(roadHeading(road,d)));
});
