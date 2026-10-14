import * as THREE from './vendor/three.module.js';
import { easeHeading } from './motion.js';

const project = ([lon, lat]) => ({ x: 100 + (lon + 125) * 27, y: 75 + (50 - lat) * 28 });
const coastline = [
  [-124.73,48.4],[-123.1,48.2],[-122.75,48.65],[-123.1,49],[-95.2,49],
  [-94.5,48.7],[-89.5,48],[-87,46.5],[-84.3,46.4],[-84.3,30.1],[-88,30.4],
  [-89.6,29.4],[-91.1,29.6],[-93.8,29.8],[-95.1,29.05],[-96.2,28.5],[-97.1,27.8],
  [-97.4,26],[-99.2,26.4],[-100.1,28],[-101.1,29.2],[-102.9,29.8],[-103.3,29],
  [-104.5,29.7],[-106.5,31.75],[-108.2,31.75],[-108.2,31.33],[-111.05,31.33],
  [-114.75,32.72],[-117.1,32.55],[-117.45,33.1],[-118.45,33.75],[-119.7,34.4],
  [-120.5,34.5],[-120.7,35.2],[-121.4,36.25],[-121.9,36.65],[-122.5,37.75],
  [-122.4,38.25],[-123.7,39.7],[-124.4,40.4],[-124.1,41.4],[-124.35,42.1],
  [-124.25,43.2],[-124,44.7],[-123.95,46.2],[-124.35,47.4],
].map(project);

/** Coordinates: route (x,y) -> world (x, height, z=y). Car nose is local +X. */
export function createScene(container, { points, stops = [] }) {
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
  const landShape = new THREE.Shape();
  coastline.forEach((p, i) => i ? landShape.lineTo(p.x, -p.y) : landShape.moveTo(p.x, -p.y));
  landShape.closePath();
  const land = new THREE.Mesh(new THREE.ExtrudeGeometry(landShape, { depth: 17, bevelEnabled: false }), [mat(0xf4edce), mat(0xd3ba89)]);
  land.rotation.x = -Math.PI / 2;
  land.position.y = -17;
  land.receiveShadow = true;
  scene.add(land);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), mat(0xbadfe7));
  water.rotation.x = -Math.PI / 2;
  water.position.set(600, -18, 400);
  water.receiveShadow = true;
  scene.add(water);

  // One indexed ribbon per road layer: remains three draw calls at 10,000+ points.
  const roadPoints = points.filter((p, i) => !i || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.0001);
  function ribbon(width, elevation, color) {
    const vertices = [], indices = [];
    for (let i = 0; i < roadPoints.length; i++) {
      const p = roadPoints[i], before = roadPoints[Math.max(0, i - 1)], after = roadPoints[Math.min(roadPoints.length - 1, i + 1)];
      const dx = after.x - before.x, dz = after.y - before.y, length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length * width / 2, nz = dx / length * width / 2;
      vertices.push(p.x + nx, elevation, p.y + nz, p.x - nx, elevation, p.y - nz);
      if (i) { const n = i * 2; indices.push(n - 2, n, n - 1, n - 1, n, n + 1); }
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
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = true; mesh.receiveShadow = true; decorative.add(mesh);
  }
  const awayFromRoad = p => !roadPoints.some(q => Math.abs(p.x - q.x) < 15 && Math.abs(p.y - q.y) < 15);
  const mountains = [[275,205],[290,227],[410,162],[432,185],[451,211],[460,290],[444,320],[463,346],[488,371],[545,397],[280,330],[301,355]]
    .map(([x,y],i) => ({x,y,s:0.8+(i%3)*0.22,r:i*.73})).filter(awayFromRoad);
  instance(new THREE.ConeGeometry(17, 38, 4), mat(0x91ad8e, { flatShading: true }), mountains, (o,p) => o.position.y = 19*p.s);
  instance(new THREE.ConeGeometry(5.7, 12.7, 4), mat(0xfff9e9, { flatShading: true }), mountains, (o,p) => o.position.y = 31.7*p.s);
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
    pin.position.set(stop.x+12,5,stop.y); pin.castShadow=true; scene.add(pin);
    const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fffaf0'; ctx.beginPath(); ctx.arc(64,64,51,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#dbaa76';ctx.lineWidth=5;ctx.stroke();
    ctx.font='57px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#48665d';ctx.fillText(stop.icon || '📍',64,67);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
    sprite.position.set(stop.x+12,22,stop.y);sprite.scale.set(24,24,1);scene.add(sprite);
  });

  const car = new THREE.Group(); car.scale.setScalar(1.25); scene.add(car);
  const coral = mat(0xef785d), dark = mat(0x354b50), glass = mat(0xa6d7dc, {metalness:.15,roughness:.3});
  function box(w,h,d,material,x,y,z) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;car.add(mesh);return mesh;
  }
  box(15,4,8,coral,0,4,0);box(8,4,7,coral,-1,8,0);
  box(.3,2.5,5.8,glass,3.1,8.4,0);box(.3,2.5,5.8,glass,-5.1,8.4,0);
  box(5.8,2.5,.2,glass,-1,8.4,-3.55);box(5.8,2.5,.2,glass,-1,8.4,3.55);
  box(1.2,1.3,1.6,mat(0xffefb5),7.55,4,-2.7);box(1.2,1.3,1.6,mat(0xffefb5),7.55,4,2.7);
  box(.8,1,6.5,mat(0xe4e7da),8,2.8,0);box(.8,1,6.5,mat(0xe4e7da),-8,2.8,0);
  const wheels=[];
  for (const x of [-4.8,4.8]) for (const z of [-4.1,4.1]) {
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.25,1.6,12),dark);
    wheel.rotation.x=Math.PI/2;wheel.position.set(x,2.25,z);wheel.castShadow=true;car.add(wheel);wheels.push(wheel);
  }
  car.position.set(points[0].x,.9,points[0].y);
  let mode='overview', disposed=false, yaw=0, polar=.69, radius=1150, dragging=false, lastX=0,lastY=0,lastDistance=null;
  let width=1,height=1;
  let motionReady=false, cameraHeading=0;
  const overviewTarget=new THREE.Vector3(600,0,425), target=overviewTarget.clone();
  const desiredCamera=new THREE.Vector3();
  function positionCamera(dt=0) {
    if(mode==='follow') {
      const a=-cameraHeading;
      target.lerp(new THREE.Vector3(car.position.x,6,car.position.z),dt ? 1-Math.exp(-dt/.18) : 1);
      desiredCamera.set(car.position.x-Math.cos(a)*120,130,car.position.z-Math.sin(a)*120+65);
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
      if(Number.isFinite(state?.x)&&Number.isFinite(state?.y))car.position.set(state.x,.9,state.y);
      const firstFrame=!motionReady;
      if(Number.isFinite(state?.angle)){
        const heading=-state.angle*Math.PI/180;
        car.rotation.y=firstFrame?heading:easeHeading(car.rotation.y,heading,dt);
        cameraHeading=firstFrame?heading:easeHeading(cameraHeading,car.rotation.y,dt,.75,.85);
        motionReady=true;
      }
      if(Number.isFinite(state?.distance)){
        const delta=lastDistance===null?0:state.distance-lastDistance;
        wheels.forEach(w=>w.rotateY(delta/2.25));lastDistance=state.distance;
      }
      positionCamera(firstFrame?0:Math.min(.1,Math.max(0,dt)));renderer.render(scene,camera);
    },
    resetMotion(){motionReady=false;lastDistance=null;},
    setCamera(next) {mode=next==='follow'?'follow':'overview';if(mode==='overview'){yaw=0;polar=.69;radius=1150;}positionCamera();renderer.render(scene,camera);},
    resize,
    getInfo:()=>({renderer:'webgl',cameraMode:mode,car:{x:car.position.x,y:car.position.y,z:car.position.z,rotationY:car.rotation.y},pointsCount:points.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),
    dispose() {
      if(disposed)return;disposed=true;observer.disconnect();
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);
      const geometries=new Set(),materials=new Set(),textures=new Set();
      scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);if(m.map)textures.add(m.map);});});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();
    },
  };
}
