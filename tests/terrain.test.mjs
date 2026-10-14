import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeightSampler} from '../dist/terrain-height.js';
import {buildRoadGeometry} from '../dist/road-geometry.js';
const data=JSON.parse(readFileSync(new URL('../dist/terrain-data.json',import.meta.url))),terrain=createHeightSampler(data);
test('real elevation reference retains high plateaus and mountains above low coastal plains',()=>{
 assert.ok(terrain.metersAt(-106.5,39.5)>2000);
 assert.ok(terrain.metersAt(-110,37.5)>1000);
 assert.ok(terrain.metersAt(-95.37,29.76)<200);
 assert.ok(data.indices.length/3<30000);
});
test('height query matches the rendered terrain at triangle interiors',()=>{
 const p=data.positions;
 for(let i=0;i<data.indices.length;i+=111){const [a,b,c]=data.indices.slice(i,i+3).map(n=>n*3);if(c===undefined)continue;const x=(p[a]+p[b]+p[c])/3,z=(p[a+2]+p[b+2]+p[c+2])/3,h=(p[a+1]+p[b+1]+p[c+1])/3;assert.ok(Math.abs(terrain.heightAt(x,z)-h)<1e-4);}
});
test('whole road has finite bounded heights and no abrupt terrain seams',()=>{
 const road=buildRoadGeometry(JSON.parse(readFileSync(new URL('../dist/road-route.json',import.meta.url))));let previous=null,maxJump=0;
 for(let d=0;d<=road.length;d+=.5){const p=road.sample(d),h=terrain.heightAt(p.x,p.y);assert.ok(Number.isFinite(h)&&h>=0&&h<90);if(previous!==null)maxJump=Math.max(maxJump,Math.abs(h-previous));previous=h;}
 assert.ok(maxJump<3,`Unexpected height seam: ${maxJump}`);console.log(`Maximum road height step at 0.5-unit sampling: ${maxJump.toFixed(3)}`);
});
