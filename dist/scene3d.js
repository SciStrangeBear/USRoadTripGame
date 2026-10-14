import * as THREE from './vendor/three.module.js';
import { easeHeading } from './motion.js';
import { createXC60 } from './xc60.js';

import { project } from './geography.js';
import { createTerrain } from './terrain.js';

/** Coordinates: route (x,y) -> world (x, height, z=y). Car nose is local +X. */
export function createScene(container, { points, stops = [], terrain: terrainData }) {
  if (!container || !points?.length) throw new Error('3D scene needs a container and route points.');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xd2edf0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab;';
  renderer.domElement.setAttribute('aria-label', '立体美国自驾地图，可拖动旋转、滚轮缩放');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd2edf0);
  scene.fog = new THREE.Fog(0xd2edf0, 2200, 5500);
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 6500);
  const hemi = new THREE.HemisphereLight(0xf5fdff, 0xc7bd99, 2.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4db, 3.0);
  sun.position.set(250, 900, 100);
  sun.target.position.set(590, 0, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, near: 1, far: 1900 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1;
  scene.add(sun, sun.target);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const terrain=createTerrain(scene,terrainData);
  const ground=terrain.heightAt;
  const terrainLabels=new THREE.Group();scene.add(terrainLabels);
  for(const [name,lon,lat] of [['内华达山脉',-119.4,37.3],['落基山脉',-107.7,42.2],['科罗拉多高原',-110.6,37.2],['大平原',-100.1,40.3]]){
    const p=project([lon,lat]),c=document.createElement('canvas');c.width=512;c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#fffdf2d9';ctx.beginPath();ctx.roundRect(2,2,508,92,22);ctx.fill();ctx.fillStyle='#53654b';ctx.font='64px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,256,50);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));label.position.set(p.x,ground(p.x,p.y)+18,p.y);label.scale.set(140,27,1);terrainLabels.add(label);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), mat(0xbadfe7));
  water.rotation.x = -Math.PI / 2;
  water.position.set(600, -18, 400);
  water.receiveShadow = true;
  scene.add(water);

  // One indexed ribbon per road layer: remains three draw calls at 10,000+ points.
  const roadPoints=[points[0]];
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let k=1;k<=count;k++)roadPoints.push({x:a.x+(b.x-a.x)*k/count,y:a.y+(b.y-a.y)*k/count});}
  function ribbon(width, elevation, color) {
    const vertices = [], indices = [];
    for (let i = 0; i < roadPoints.length; i++) {
      const p = roadPoints[i], before = roadPoints[Math.max(0, i - 1)], after = roadPoints[Math.min(roadPoints.length - 1, i + 1)];
      const dx = after.x - before.x, dz = after.y - before.y, length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length * width / 2, nz = dx / length * width / 2;
      vertices.push(p.x+nx,ground(p.x+nx,p.y+nz)+elevation,p.y+nz, p.x,ground(p.x,p.y)+elevation,p.y, p.x-nx,ground(p.x-nx,p.y-nz)+elevation,p.y-nz);
      if(i){const n=i*3;indices.push(n-3,n,n-2,n-2,n,n+1,n-2,n+1,n-1,n-1,n+1,n+2);}
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat(color, { side: THREE.DoubleSide }));
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  ribbon(8, 0.35, 0xfff9df);
  ribbon(5.6, 0.5, 0x748e8a);
  ribbon(0.65, 0.65, 0xf6ce7c);

  const decorative = new THREE.Group();
  scene.add(decorative);
  const dummy = new THREE.Object3D();
  function instance(geometry, material, positions, transform) {
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.h || 0, p.y); dummy.rotation.set(0, p.r || 0, 0); dummy.scale.setScalar(p.s || 1);
      if (transform) transform(dummy, p);
      dummy.position.y+=ground(p.x,p.y);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = true; mesh.receiveShadow = true; decorative.add(mesh);
  }
  const awayFromRoad = p => !roadPoints.some(q => Math.abs(p.x - q.x) < 15 && Math.abs(p.y - q.y) < 15);
  const trees = [];
  for (let i=0;i<65;i++) {
    const p = {x:186+(i*67%254),y:130+(i*47%253),s:.55+(i%5)*.11};
    if (awayFromRoad(p)) trees.push(p);
  }
  instance(new THREE.CylinderGeometry(1.2,1.4,8,5),mat(0xb8986a),trees,(o,p)=>o.position.y=4*p.s);
  instance(new THREE.ConeGeometry(7,21,6),mat(0x79a48b),trees,(o,p)=>o.position.y=15*p.s);
  const boulders = [[373,500],[388,509],[423,553],[557,542],[580,580],[612,535],[660,590]].map(([x,y],i)=>({x,y,s:1+i%3*.3,h:3})).filter(awayFromRoad);
  instance(new THREE.DodecahedronGeometry(5,0),mat(0xd6b185,{flatShading:true}),boulders);

  const seen = new Set();
  const pinMaterial = mat(0xe09b61);
  const pinGeometry = new THREE.CylinderGeometry(2.7,2.7,10,10);
  stops.forEach(stop => {
    if (!Number.isFinite(stop.x) || !Number.isFinite(stop.y)) return;
    const key = `${Math.round(stop.x)},${Math.round(stop.y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const pin = new THREE.Mesh(pinGeometry,pinMaterial);
    pin.position.set(stop.x+12,ground(stop.x+12,stop.y)+5,stop.y); pin.castShadow=true; scene.add(pin);
    const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fffaf0'; ctx.beginPath(); ctx.arc(64,64,51,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#dbaa76';ctx.lineWidth=5;ctx.stroke();
    ctx.font='57px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#48665d';ctx.fillText(stop.icon || '📍',64,67);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
    sprite.position.set(stop.x+12,ground(stop.x+12,stop.y)+22,stop.y);sprite.scale.set(24,24,1);scene.add(sprite);
  });

  const {car,wheels,wheelRadius}=createXC60();
  car.scale.setScalar(1.25);scene.add(car);
  car.position.set(points[0].x,ground(points[0].x,points[0].y)+.9,points[0].y);
  let mode='overview', disposed=false, yaw=0, polar=.69, radius=1150, dragging=false, lastX=0,lastY=0,lastDistance=null;
  let width=1,height=1;
  let motionReady=false, cameraHeading=0;
  const overviewTarget=new THREE.Vector3(600,0,425), target=overviewTarget.clone();
  const desiredCamera=new THREE.Vector3();
  function positionCamera(dt=0) {
    terrainLabels.visible=mode==='overview'&&width>600;
    if(mode==='follow') {
      const a=-cameraHeading;
      target.lerp(new THREE.Vector3(car.position.x,car.position.y+6,car.position.z),dt ? 1-Math.exp(-dt/.18) : 1);
      desiredCamera.set(car.position.x-Math.cos(a)*120,car.position.y+130,car.position.z-Math.sin(a)*120+65);
      camera.position.lerp(desiredCamera,dt ? 1-Math.exp(-dt/ .38) : 1);
    } else {
      target.copy(overviewTarget);
      const effectiveRadius=radius*Math.max(1,1.35/(width/height));
      camera.position.set(target.x+Math.sin(yaw)*Math.sin(polar)*effectiveRadius,Math.cos(polar)*effectiveRadius,target.z+Math.cos(yaw)*Math.sin(polar)*effectiveRadius);
    }
    camera.lookAt(target);
  }
  function resize() {
    if(disposed)return;
    const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();positionCamera();renderer.render(scene,camera);
  }
  const canvas=renderer.domElement;
  const exitFollow=()=>{if(mode==='follow'){mode='overview';container.dispatchEvent(new CustomEvent('camerachange',{detail:mode}));}};
  const down=e=>{if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';};
  const move=e=>{if(!dragging)return;exitFollow();yaw-=(e.clientX-lastX)*.005;polar=THREE.MathUtils.clamp(polar+(e.clientY-lastY)*.004,.18,1.3);lastX=e.clientX;lastY=e.clientY;positionCamera();};
  const up=()=>{dragging=false;canvas.style.cursor='grab';};
  const wheel=e=>{e.preventDefault();exitFollow();radius=THREE.MathUtils.clamp(radius*Math.exp(e.deltaY*.001),260,2300);positionCamera();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  return {
    update(state,dt=0) {
      if(disposed)return;
      if(Number.isFinite(state?.x)&&Number.isFinite(state?.y))car.position.set(state.x,ground(state.x,state.y)+.9,state.y);
      const firstFrame=!motionReady;
      if(Number.isFinite(state?.angle)){
        const heading=-state.angle*Math.PI/180;
        car.rotation.y=firstFrame?heading:easeHeading(car.rotation.y,heading,dt);
        cameraHeading=firstFrame?heading:easeHeading(cameraHeading,car.rotation.y,dt,.75,.85);
        motionReady=true;
      }
      if(Number.isFinite(state?.distance)){
        const delta=lastDistance===null?0:state.distance-lastDistance;
        wheels.forEach(w=>w.rotateZ(-delta/(wheelRadius*1.25)));lastDistance=state.distance;
      }
      positionCamera(firstFrame?0:Math.min(.1,Math.max(0,dt)));renderer.render(scene,camera);
    },
    resetMotion(){motionReady=false;lastDistance=null;},
    setCamera(next) {mode=next==='follow'?'follow':'overview';if(mode==='overview'){yaw=0;polar=.69;radius=1150;}positionCamera();renderer.render(scene,camera);},
    resize,
    getInfo:()=>({renderer:'webgl',cameraMode:mode,car:{x:car.position.x,y:car.position.y,z:car.position.z,rotationY:car.rotation.y},terrain:{source:'Mapzen Terrain Tiles',triangles:terrain.triangles,height:ground(car.position.x,car.position.z)},model:car.userData.model,pointsCount:points.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),
    dispose() {
      if(disposed)return;disposed=true;observer.disconnect();
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);
      const geometries=new Set(),materials=new Set(),textures=new Set();
      scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);if(m.map)textures.add(m.map);});});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();
    },
  };
}
