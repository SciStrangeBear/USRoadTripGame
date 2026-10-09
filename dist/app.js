import { stops as sourceStops } from './route-data.js';
import { mapArtwork } from './map-art.js';
import { createJourney, advance, sampleRoute } from './engine.js';

const $ = id => document.getElementById(id);
const stops = sourceStops.map(s => ({...s, x:100+(s.lon+125)*27, y:75+(50-s.lat)*28}));
let state = createJourney(stops), shownStop=0, lastFrame=0, pauseUntil=0, pointerDirection=0;
const held=new Set(), last=stops.length-1;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const road=stops.map((s,i)=>`${i?'L':'M'}${s.x},${s.y}`).join(' ');
const labelKeys=new Set(['LA','Redding','Seattle','Glacier','Denver','Houston','SantaFe','SF','Yellowstone','LasVegas','Tucson']);
const labelOffsets={LA:[-14,32],Redding:[-15,22],Seattle:[-18,-20],Glacier:[15,-12],Denver:[15,-10],Houston:[12,25],SantaFe:[14,-13],SF:[-15,-18],Yellowstone:[18,-16],LasVegas:[12,27],Tucson:[0,26]};
const landmarks=new Set(['Seattle','Glacier','Houston','SF','Yellowstone','LasVegas']);
$('game-map').innerHTML=mapArtwork()+`
 <path class="map-route" d="${road}" stroke="#fff9eb" stroke-width="11"/>
 <path class="map-route" d="${road}" stroke="#d49a71" stroke-width="5"/>
 <path class="map-route" d="${road}" stroke="#fff9eb" stroke-width="1.5" stroke-dasharray="3 9" opacity=".8"/>
 <path id="traveled-route" class="map-route" stroke="#4a775c" stroke-width="5"/>
 ${stops.slice(0,-1).map((s,i)=>`<g><circle class="route-marker" id="marker-${i}" cx="${s.x}" cy="${s.y}" r="${labelKeys.has(s.key)?6:4}" fill="${i===0?'#315d48':'#fff9ed'}" stroke="#b47f54" stroke-width="2"/><title>${escape(s.name)}</title>${landmarks.has(s.key)?`<text x="${s.x}" y="${s.y-22}" text-anchor="middle" font-size="25">${s.icon}</text>`:''}${labelKeys.has(s.key)?`<text class="map-label" x="${s.x+labelOffsets[s.key][0]}" y="${s.y+labelOffsets[s.key][1]}" text-anchor="${['SF','Redding','Seattle'].includes(s.key)?'end':'start'}">${escape(s.name)}</text>`:''}</g>`).join('')}
 <circle id="current-ring" r="15" fill="#e8b05922" stroke="#e1a352" stroke-width="2" stroke-dasharray="3 4"/>
 <g id="car" class="car-shadow" data-position="0"><ellipse cy="3" rx="22" ry="11" fill="#21433322"/><g transform="translate(-22,-12)"><rect x="7" y="-3" width="8" height="7" rx="3" fill="#334737"/><rect x="7" y="20" width="8" height="7" rx="3" fill="#334737"/><rect x="30" y="-3" width="8" height="7" rx="3" fill="#334737"/><rect x="30" y="20" width="8" height="7" rx="3" fill="#334737"/><rect width="46" height="24" rx="9" fill="#e4a64c" stroke="#935d39" stroke-width="1.5"/><rect x="12" y="3" width="22" height="18" rx="5" fill="#f8da81"/><path d="M29 4h5l4 4v8l-4 4h-5Z" fill="#719a9b" stroke="#fff1c5" stroke-width="1.5"/><path d="M11 5h5v14h-5l-3-4V9Z" fill="#83aaa7"/><path d="M20 4v16" stroke="#d2aa55"/><path d="M42 5v4m0 6v4" stroke="#fff7cf" stroke-width="3" stroke-linecap="round"/></g></g>`;

const stampKeys=['LA','Seattle','Glacier','Houston','SF','Yellowstone'];
function updateCollection(){
  $('visited-count').textContent=state.visited.size;
  $('total-count').textContent=stops.length;
  $('progress-fill').style.width=`${state.visited.size/stops.length*100}%`;
  $('progress').setAttribute('aria-valuemax',stops.length);
  $('progress').setAttribute('aria-valuenow',state.visited.size);
  $('stamp-row').innerHTML=stampKeys.map(key=>{const i=stops.findIndex(s=>s.key===key),s=stops[i];return `<span class="stamp ${state.visited.has(i)?'unlocked':''}" title="${escape(s.name)}${state.visited.has(i)?' · 已抵达':' · 待探索'}" aria-label="${escape(s.name)}${state.visited.has(i)?'已抵达':'待探索'}">${s.icon}</span>`}).join('');
  stops.slice(0,-1).forEach((s,i)=>$('marker-'+i).setAttribute('fill',state.visited.has(i)?'#4a775c':'#fff9ed'));
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
  const p=sampleRoute(stops,state.position), dir=direction();
  $('car').setAttribute('transform',`translate(${p.x},${p.y}) rotate(${p.angle})`);
  $('car').dataset.position=state.position.toFixed(5);
  $('current-ring').setAttribute('cx',p.x);$('current-ring').setAttribute('cy',p.y);
  const completedPoints=stops.slice(0,Math.floor(state.position)+1);
  $('traveled-route').setAttribute('d',completedPoints.map((s,i)=>`${i?'L':'M'}${s.x},${s.y}`).join(' ')+` L${p.x},${p.y}`);
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
  if(dir && now>=pauseUntil && !$('route-dialog').open){
    // Constant visual speed with a minimum leg duration keeps nearby stops readable.
    const i=Math.min(last-1,Math.max(0,dir<0?Math.ceil(state.position)-1:Math.floor(state.position)));
    const length=Math.hypot(stops[i+1].x-stops[i].x,stops[i+1].y-stops[i].y);
    const move=dir*dt/Math.max(1.1,length/95);
    const target=dir>0?Math.min(last,Math.floor(state.position)+1):Math.max(0,Math.ceil(state.position)-1);
    const delta=dir>0?Math.min(move,target-state.position):Math.max(move,target-state.position);
    advance(state,delta);
    if(state.arrivals.length){showPlace(state.arrivals.at(-1));pauseUntil=now+700;}
    render();
  }
  requestAnimationFrame(frame);
}
function clearInput(){held.clear();pointerDirection=0;pauseUntil=0;render();}
const accepted=new Set(['ArrowUp','ArrowDown','KeyW','KeyS']);
window.addEventListener('keydown',e=>{
  if(!accepted.has(e.code)||e.ctrlKey||e.metaKey||e.altKey||$('route-dialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
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
$('reset').addEventListener('click',()=>{clearInput();state=createJourney(stops);pauseUntil=0;showPlace(0);render();});
$('open-route').addEventListener('click',()=>{
  clearInput();$('route-list').innerHTML=stops.map((s,i)=>`<li class="${state.visited.has(i)?'seen':''}"><span class="route-order">${String(i+1).padStart(2,'0')}</span><span>${s.icon}</span><span>${escape(s.name)}${i===last?'（返回）':''}</span></li>`).join('');$('route-dialog').showModal();
});
$('close-route').addEventListener('click',()=>$('route-dialog').close());
$('route-dialog').addEventListener('close',clearInput);
// Read-only observation for the harness: tests drive the actual keyboard/pointer inputs.
window.__roadtrip=Object.freeze({snapshot:()=>({position:state.position,visited:[...state.visited],completed:state.completed,currentPlace:stops[shownStop].name,totalStops:stops.length})});
showPlace(0);render();requestAnimationFrame(frame);
