import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4178');await page.waitForFunction(()=>window.__roadtrip?.snapshot().scene);
 assert.match(await page.evaluate(()=>window.__roadtrip.snapshot().scene.model),/XC60/);
 await page.locator('#camera-toggle').click();await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
 await page.screenshot({path:'artifacts/xc60-in-game.png',fullPage:true,animations:'disabled'});
 // Render the very same runtime model from two angles for visual review.
 await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createXC60}=await import('/xc60.js');
  const wrap=document.createElement('div');wrap.style.cssText='position:fixed;inset:0;background:#edf0e9;z-index:10000';document.body.appendChild(wrap);
  wrap.innerHTML='<div style="position:absolute;top:36px;left:52px;color:#304c45;font:700 30px Arial">XC60 <span style="font-size:16px;font-weight:400;letter-spacing:3px"> / WHITE · CHIBI EDITION</span></div><div style="position:absolute;bottom:32px;left:52px;color:#5f7b71;font:14px Arial;letter-spacing:2px">FRONT THREE-QUARTER</div><div style="position:absolute;bottom:32px;left:750px;color:#5f7b71;font:14px Arial;letter-spacing:2px">REAR THREE-QUARTER</div>';
  const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1400,800);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.25;wrap.appendChild(r.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0xedf0e9);scene.add(new T.HemisphereLight(0xffffff,0x84958a,2.4));const light=new T.DirectionalLight(0xffffff,3);light.position.set(12,30,20);scene.add(light);
  const {car}=createXC60();scene.add(car);
  const floor=new T.Mesh(new T.CircleGeometry(17,64),new T.MeshStandardMaterial({color:0xd5ddd1,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.12;scene.add(floor);
  const camera=new T.PerspectiveCamera(35,700/800,.1,300);
  r.setScissorTest(true);
  for(let i=0;i<2;i++){
   camera.position.set(i?-33:33,24,i?-33:33);camera.lookAt(0,5,0);r.setViewport(i*700,0,700,800);r.setScissor(i*700,0,700,800);r.render(scene,camera);
  }
 });
 await page.screenshot({path:'artifacts/xc60-model.png'});assert.deepEqual(errors,[]);console.log('PASS XC60 in game and front/rear rendered model preview');
}finally{await browser.close();}
