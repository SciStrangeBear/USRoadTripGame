import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Delaunator from './vendor/delaunator.cjs';
import {coastline} from '../dist/geography.js';
const require=createRequire(import.meta.url);
const {PNG}=require(process.env.PNGJS_MODULE||'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root=fileURLToPath(new URL('../',import.meta.url)),cache=path.join(root,'artifacts/terrain-tiles');fs.mkdirSync(cache,{recursive:true});
const zoom=5,n=2**zoom,tiles=new Map();
function tileXY(lon,lat){const r=lat*Math.PI/180;return [(lon+180)/360*n,(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n];}
const pending=[];
for(let x=4;x<=8;x++)for(let y=10;y<=13;y++)pending.push([x,y]);
async function worker(){while(pending.length){const [x,y]=pending.shift(),key=`${x}-${y}`,file=path.join(cache,key+'.png');if(!fs.existsSync(file)){
 const response=await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Elevation tile ${key}: HTTP ${response.status}`);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));
}tiles.set(key,PNG.sync.read(fs.readFileSync(file)));}}
await Promise.all([worker(),worker(),worker(),worker()]);
function elevation(lon,lat){const [x,y]=tileXY(lon,lat),t=tiles.get(`${Math.floor(x)}-${Math.floor(y)}`);if(!t)throw Error('Missing elevation tile');const px=Math.min(255,Math.floor((x%1)*256)),py=Math.min(255,Math.floor((y%1)*256)),i=(py*256+px)*4;return Math.max(0,t.data[i]*256+t.data[i+1]+t.data[i+2]/256-32768);}
const grid={west:-126,north:50,step:.25,cols:169,rows:101,meters:[]};
for(let j=0;j<grid.rows;j++)for(let i=0;i<grid.cols;i++)grid.meters.push(elevation(grid.west+i*grid.step,grid.north-j*grid.step));
// A single gentle 3x3 weighted pass removes tiny features while keeping major ranges.
const raw=grid.meters;grid.meters=raw.map((v,k)=>{const i=k%grid.cols,j=Math.floor(k/grid.cols);let sum=0,w=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const weight=(dx===0?2:1)*(dy===0?2:1);sum+=raw[Math.max(0,Math.min(grid.rows-1,j+dy))*grid.cols+Math.max(0,Math.min(grid.cols-1,i+dx))]*weight;w+=weight;}return Math.round(sum/w);});
function height(x,z){const lon=(x-100)/27-125,lat=50-(z-75)/28;const u=Math.max(0,Math.min(grid.cols-1,(lon-grid.west)/grid.step)),v=Math.max(0,Math.min(grid.rows-1,(grid.north-lat)/grid.step)),i=Math.min(grid.cols-2,Math.floor(u)),j=Math.min(grid.rows-2,Math.floor(v)),a=u-i,b=v-j;const at=(dx,dy)=>grid.meters[(j+dy)*grid.cols+i+dx];return ((at(0,0)*(1-a)+at(1,0)*a)*(1-b)+(at(0,1)*(1-a)+at(1,1)*a)*b)/55;}
function inside(x,z){let yes=false;for(let i=0,j=coastline.length-1;i<coastline.length;j=i++){const a=coastline[i],b=coastline[j];if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
const pts=[],shore=[];
coastline.forEach((a,i)=>{const b=coastline[(i+1)%coastline.length],count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);for(let k=0;k<count;k++){shore.push(pts.length);pts.push([a.x+(b.x-a.x)*k/count,a.y+(b.y-a.y)*k/count]);}});
for(let z=104;z<752;z+=7)for(let x=103;x<1202;x+=7)if(inside(x,z))pts.push([x,z]);
const delaunay=Delaunator.from(pts),indices=[];
for(let i=0;i<delaunay.triangles.length;i+=3){const ids=[...delaunay.triangles.slice(i,i+3)],p=ids.map(id=>pts[id]);if(inside((p[0][0]+p[1][0]+p[2][0])/3,(p[0][1]+p[1][1]+p[2][1])/3))indices.push(...ids);}
const positions=pts.flatMap(([x,z])=>[+x.toFixed(4),+height(x,z).toFixed(4),+z.toFixed(4)]);
const data={source:'Mapzen / Tilezen Terrain Tiles (AWS Open Data)',sourceUrl:'https://registry.opendata.aws/terrain-tiles/',accessed:'2026-10-14',zoom,metersPerSceneUnit:55,grid,positions,indices,shore};
fs.writeFileSync(path.join(root,'dist/terrain-data.json'),JSON.stringify(data));
console.log(JSON.stringify({vertices:pts.length,triangles:indices.length/3,maxMeters:Math.max(...grid.meters),bytes:fs.statSync(path.join(root,'dist/terrain-data.json')).size}));
