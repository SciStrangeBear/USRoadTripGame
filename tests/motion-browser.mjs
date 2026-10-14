import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.clock.install();await page.goto('http://127.0.0.1:4178');
 await page.waitForFunction(()=>window.__roadtrip?.snapshot().scene);await page.clock.runFor(50);
 await page.locator('#camera-toggle').click();
 let previous=await page.evaluate(()=>window.__roadtrip.snapshot());
 await page.keyboard.down('w');
 for(let i=0;i<40;i++){
  await page.clock.runFor(50);const next=await page.evaluate(()=>window.__roadtrip.snapshot());
  const change=Math.abs(next.scene.car.rotationY-previous.scene.car.rotationY);
  assert.ok(change<.14,`Unexpected heading jump: ${change}`);previous=next;
 }
 await page.keyboard.up('w');const stopped=previous.position;
 await page.clock.runFor(600);assert.equal((await page.evaluate(()=>window.__roadtrip.snapshot())).position,stopped);
 await page.keyboard.down('s');await page.clock.runFor(300);await page.keyboard.up('s');
 assert.ok((await page.evaluate(()=>window.__roadtrip.snapshot())).position<stopped);
 await page.locator('#reset').click();await page.clock.runFor(50);
 const reset=await page.evaluate(async()=>{
  const {buildRoadGeometry}=await import('/road-geometry.js');const {roadHeading}=await import('/motion.js');
  const g=buildRoadGeometry(await(await fetch('/road-route.json')).json());
  return {state:window.__roadtrip.snapshot(),p:g.sample(0),heading:-roadHeading(g,0)*Math.PI/180};
 });
 assert.equal(reset.state.position,0);assert.ok(Math.abs(reset.state.scene.car.x-reset.p.x)<1e-8);
 assert.ok(Math.abs(reset.state.scene.car.rotationY-reset.heading)<1e-8);
 console.log('PASS browser motion: capped heading changes, follow mode, stop/reverse, reset without residual rotation');
}finally{await browser.close();}
