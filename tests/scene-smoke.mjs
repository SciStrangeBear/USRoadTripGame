import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium }=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4178');
 await page.waitForFunction(()=>window.__roadtrip?.snapshot().scene?.pointsCount>1000);
 await page.screenshot({path:'artifacts/desktop.png',fullPage:true,animations:'disabled'});
 await page.locator('#camera-toggle').click();
 await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
 await page.screenshot({path:'artifacts/camera-follow.png',fullPage:true,animations:'disabled'});
 const canvas=await page.locator('#game-map canvas').boundingBox();
 await page.mouse.move(canvas.x+200,canvas.y+200);await page.mouse.down();await page.mouse.move(canvas.x+240,canvas.y+215);await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.__roadtrip.snapshot().scene.cameraMode),'overview');
 assert.equal(await page.locator('#camera-toggle').getAttribute('aria-pressed'),'false');
 await page.locator('#camera-toggle').click();
 assert.equal(await page.evaluate(()=>window.__roadtrip.snapshot().scene.cameraMode),'follow');
 await page.locator('#camera-toggle').click();await page.locator('#reset').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'artifacts/mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('PASS final scene: 3D rendering, drag exits follow, button state stays synchronized, mobile layout');
}finally{await browser.close();}
