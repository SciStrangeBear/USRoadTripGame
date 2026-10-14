import { stops as sourceStops } from './route-data.js';
import { buildRoadGeometry } from './road-geometry.js';
import { roadHeading } from './motion.js';
import { createJourney, advance } from './engine.js';

const $ = id => document.getElementById(id);
const stops = sourceStops.map(s => ({...s, x:100+(s.lon+125)*27, y:75+(50-s.lat)*28}));
let state = createJourney(stops), shownStop=0, lastFrame=0, pauseUntil=0, pointerDirection=0;
const held=new Set(), last=stops.length-1;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let geometry=null, scene=null, cameraMode='overview', loadError=null;
try {
  const response=await fetch('./road-route.json');
  if(!response.ok)throw Error('公路轨迹未能载入');
  geometry=buildRoadGeometry(await response.json());
  // Markers snap to the same road samples that drive the car.
  const roadStops=stops.map((s,i)=>({...s,...geometry.sample(geometry.stopDistances[i])}));
  const { createScene }=await import('./scene3d.js');
  const terrainResponse=await fetch('./terrain-data.json');
  if(!terrainResponse.ok)throw Error('地形数据未能载入');
  scene=createScene($('game-map'),{points:geometry.points,stops:roadStops,terrain:await terrainResponse.json()});
  $('scene-loading').hidden=true;
} catch(error) {
  loadError=error.message;
  $('scene-loading').textContent='3D 场景未能载入。请使用支持 WebGL 2 的浏览器后重试。';
  $('scene-loading').classList.add('scene-error');
  $('scene-retry').hidden=false;
  $('forward').disabled=true;$('backward').disabled=true;$('camera-toggle').disabled=true;
}
$('scene-retry').addEventListener('click',()=>location.reload());
$('game-map').addEventListener('camerachange',e=>{
  cameraMode=e.detail;
  $('camera-toggle').textContent=cameraMode==='overview'?'切换跟车视角':'返回全程视角';
  $('camera-toggle').setAttribute('aria-pressed',String(cameraMode==='follow'));
});
$('camera-toggle').addEventListener('click',()=>{
  cameraMode=cameraMode==='overview'?'follow':'overview';
  scene?.setCamera(cameraMode);
  $('camera-toggle').textContent=cameraMode==='overview'?'切换跟车视角':'返回全程视角';
  $('camera-toggle').setAttribute('aria-pressed',String(cameraMode==='follow'));
});
$('game-map').addEventListener('webglcontextlost',()=>{clearInput();$('scene-loading').hidden=false;$('scene-loading').textContent='3D 画面已暂停，请重新载入。';$('scene-retry').hidden=false;},true);

const stampKeys=['LA','Seattle','Glacier','Houston','SF','Yellowstone'];
function updateCollection(){
  $('visited-count').textContent=state.visited.size;
  $('total-count').textContent=stops.length;
  $('progress-fill').style.width=`${state.visited.size/stops.length*100}%`;
  $('progress').setAttribute('aria-valuemax',stops.length);
  $('progress').setAttribute('aria-valuenow',state.visited.size);
  $('stamp-row').innerHTML=stampKeys.map(key=>{const i=stops.findIndex(s=>s.key===key),s=stops[i];return `<span class="stamp ${state.visited.has(i)?'unlocked':''}" title="${escape(s.name)}${state.visited.has(i)?' · 已抵达':' · 待探索'}" aria-label="${escape(s.name)}${state.visited.has(i)?'已抵达':'待探索'}">${s.icon}</span>`}).join('');
}
function showPlace(index){
  shownStop=index;
  const s=stops[index];
  $('place-name').textContent=s.name;
  $('place-english').textContent=s.en;
  $('place-description').textContent=s.description;
  $('place-icon').textContent=s.icon;
  $('art-caption').textContent=s.en.toUpperCase();
  $('stop-number').textContent=`${String(index+1).padStart(2,'0')} / ${stops.length}`;
  $('arrival-label').textContent=index===last?'● 完成环线，欢迎回来':index===0?'● 旅程起点':'● 已抵达 · 旅途印记';
  $('announcement').textContent=`抵达${s.name}。${s.description}`;
  const art=$('postcard-art');art.classList.remove('arrival-pop');void art.offsetWidth;art.classList.add('arrival-pop');
  const tones=['#e8eedb','#e2ecdf','#e1ece9','#efe6d1'];
  art.style.background=tones[index%tones.length];
  updateCollection();
}
function direction(){return pointerDirection || ((held.has('ArrowUp')||held.has('KeyW')?1:0)-(held.has('ArrowDown')||held.has('KeyS')?1:0));}
function render(){
  const dir=direction();
  const nextIndex=dir<0?Math.max(0,Math.ceil(state.position)-1):Math.min(last,Math.floor(state.position)+1);
  $('next-stop').textContent=state.completed?'已回到洛杉矶 · 环线完成':`下一站 · ${stops[nextIndex].name}`;
  $('drive-status').textContent=state.completed?'旅程完成！按 ↓ 可以回头看看':state.position===0?'准备出发':dir<0?'回头看看沿途风景':dir>0?'正在路上':'停下来，看看风景';
  $('forward').classList.toggle('pressed',dir>0);$('backward').classList.toggle('pressed',dir<0);
  document.body.classList.toggle('complete',state.completed);
  $('collection-note').textContent=state.completed?'一路的风景，已经成为你的收藏。':'每一次抵达，收集一枚旅行印记。';
}
function frame(now){
  const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  const dir=direction();
  if(scene && dir && now>=pauseUntil && !$('route-dialog').open){
    // Constant visual speed with a minimum leg duration keeps nearby stops readable.
    const i=Math.min(last-1,Math.max(0,dir<0?Math.ceil(state.position)-1:Math.floor(state.position)));
    const length=geometry.stopDistances[i+1]-geometry.stopDistances[i];
    const move=dir*dt/Math.max(1.1,length/(geometry.length/80));
    const target=dir>0?Math.min(last,Math.floor(state.position)+1):Math.max(0,Math.ceil(state.position)-1);
    const delta=dir>0?Math.min(move,target-state.position):Math.max(move,target-state.position);
    advance(state,delta);
    if(state.arrivals.length){showPlace(state.arrivals.at(-1));pauseUntil=now+700;}
    render();
  }
  if(scene){
    const distance=geometry.distanceAt(state.position);
    scene.update({...geometry.sample(distance),angle:roadHeading(geometry,distance),distance,position:state.position,visited:[...state.visited]},dt);
  }
  requestAnimationFrame(frame);
}
function clearInput(){held.clear();pointerDirection=0;pauseUntil=0;render();}
const accepted=new Set(['ArrowUp','ArrowDown','KeyW','KeyS']);
window.addEventListener('keydown',e=>{
  if(!scene||!accepted.has(e.code)||e.ctrlKey||e.metaKey||e.altKey||$('route-dialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  e.preventDefault();held.add(e.code);render();
});
window.addEventListener('keyup',e=>{if(accepted.has(e.code)){held.delete(e.code);pauseUntil=0;render();}});
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
for(const [id,dir] of [['forward',1],['backward',-1]]){
  const button=$(id);
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pointerDirection=dir;render();});
  button.addEventListener('pointerup',clearInput);button.addEventListener('pointercancel',clearInput);button.addEventListener('lostpointercapture',clearInput);
  button.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();pointerDirection=dir;render();}});
  button.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();clearInput();}});
  button.addEventListener('blur',clearInput);
}
$('reset').addEventListener('click',()=>{clearInput();state=createJourney(stops);scene?.resetMotion();pauseUntil=0;showPlace(0);render();});
$('open-route').addEventListener('click',()=>{
  clearInput();$('route-list').innerHTML=stops.map((s,i)=>`<li class="${state.visited.has(i)?'seen':''}"><span class="route-order">${String(i+1).padStart(2,'0')}</span><span>${s.icon}</span><span>${escape(s.name)}${i===last?'（返回）':''}</span></li>`).join('');$('route-dialog').showModal();
});
$('close-route').addEventListener('click',()=>$('route-dialog').close());
$('route-dialog').addEventListener('close',clearInput);
// Read-only observation for the harness: tests drive the actual keyboard/pointer inputs.
window.__roadtrip=Object.freeze({snapshot:()=>({position:state.position,visited:[...state.visited],completed:state.completed,currentPlace:stops[shownStop].name,totalStops:stops.length,distance:geometry?.distanceAt(state.position)||0,totalDistance:geometry?.length||0,scene:scene?.getInfo(),loadError})});
showPlace(0);render();requestAnimationFrame(frame);
