import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Override these paths when running outside this workstation.
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] });
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.clock.install();
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4178', { waitUntil: 'networkidle' });
  assert.deepEqual(errors, [], 'Initial page loads without browser errors or missing assets');
  await page.locator('#game-map canvas').waitFor();
  const snapshot = () => page.evaluate(() => window.__roadtrip.snapshot());
  const hold = async (key, milliseconds) => {
    await page.keyboard.down(key);
    await page.clock.runFor(milliseconds);
    await page.keyboard.up(key);
  };

  const initial = await snapshot();
  assert.equal(initial.position, 0);
  assert.equal(initial.scene.renderer, 'webgl', 'The scene uses WebGL');
  assert.ok(initial.scene.pointsCount > initial.totalStops * 10, 'Road geometry contains detailed curves, not direct stop connections');
  assert.ok(initial.totalDistance > 0, 'The full route has a measurable arc length');
  const canvas = await page.locator('#game-map canvas').boundingBox();
  assert.ok(canvas.width > 200 && canvas.height > 200, 'The WebGL canvas is visible at useful dimensions');
  assert.equal(await page.locator('#game-map canvas').evaluate(el => Boolean(el.getContext('webgl2'))), true, 'The canvas owns an actual WebGL2 context');
  console.log('PASS initial WebGL scene and detailed route geometry');
  assert.match(await page.locator('#place-name').innerText(), /洛杉矶/);
  await page.screenshot({ path: new URL('desktop.png', artifacts).pathname.replace(/^\/(.:)/, '$1'), fullPage: true });
  await hold('w', 2200);
  const forwardPosition = (await snapshot()).position;
  assert.ok(forwardPosition > 0, 'W advances the car');
  await page.clock.runFor(500);
  assert.equal((await snapshot()).position, forwardPosition, 'Releasing W stops movement');
  const forwardHeading = (await snapshot()).scene.car.rotationY;
  await page.keyboard.down('s');
  const reverseHeading = (await snapshot()).scene.car.rotationY;
  const headingChange = Math.atan2(Math.sin(reverseHeading - forwardHeading), Math.cos(reverseHeading - forwardHeading));
  assert.ok(Math.abs(headingChange) < 0.05, 'Starting reverse retains the car heading instead of turning around');
  await page.clock.runFor(500);
  await page.keyboard.up('s');
  assert.ok((await snapshot()).position < forwardPosition, 'S reverses the car');
  const reversed = await snapshot();
  assert.ok(reversed.distance > 0 && reversed.distance < initial.totalDistance);
  assert.ok(Number.isFinite(reversed.scene.car.rotationY), 'Vehicle heading remains finite during reverse movement');

  const beforeCamera = (await snapshot()).scene.cameraMode;
  await page.locator('#camera-toggle').click();
  await page.clock.runFor(350);
  assert.notEqual((await snapshot()).scene.cameraMode, beforeCamera, 'Camera button changes follow/overview mode');
  await page.screenshot({ path: new URL('camera-follow.png', artifacts).pathname.replace(/^\/(.:)/, '$1'), fullPage: true, animations: 'disabled' });
  await page.locator('#camera-toggle').click();
  await page.clock.runFor(350);
  assert.equal((await snapshot()).scene.cameraMode, beforeCamera, 'Camera button returns to the original mode');

  await page.keyboard.down('ArrowUp');
  await page.clock.runFor(400);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const blurredPosition = (await snapshot()).position;
  await page.clock.runFor(500);
  assert.equal((await snapshot()).position, blurredPosition, 'Blur clears held controls');
  await page.keyboard.up('ArrowUp');

  const button = await page.locator('#forward').boundingBox();
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await page.clock.runFor(600);
  await page.mouse.up();
  const pointerPosition = (await snapshot()).position;
  assert.ok(pointerPosition > blurredPosition, 'Pointer hold advances');
  await page.clock.runFor(500);
  assert.equal((await snapshot()).position, pointerPosition, 'Pointer release stops movement');

  await page.locator('#reset').click();
  assert.equal((await snapshot()).position, 0, 'Reset returns to start');
  await hold('ArrowDown', 500);
  assert.equal((await snapshot()).position, 0, 'Reverse movement clamps at start');
  console.log('PASS controls, reverse, blur, pointer, reset and camera toggle');
  await page.keyboard.down('ArrowUp');
  for (let elapsed = 0; elapsed < 150000 && !(await snapshot()).completed; elapsed += 10000) {
    await page.clock.runFor(10000);
    const progress = await snapshot();
    console.log(`Route progress: ${progress.visited.length}/${progress.totalStops} stops`);
  }
  await page.keyboard.up('ArrowUp');
  const finished = await snapshot();
  assert.equal(finished.completed, true, 'Continuous keyboard travel reaches finish');
  assert.equal(finished.visited.length, finished.totalStops, 'All route stops have been discovered');
  assert.match(await page.locator('#place-name').innerText(), /洛杉矶/);
  await hold('ArrowUp', 500);
  assert.equal((await snapshot()).position, finished.position, 'Forward movement clamps at finish');
  await hold('ArrowDown', 500);
  assert.equal((await snapshot()).completed, false, 'Backing up clears completed status');
  assert.ok((await snapshot()).position < finished.position);
  assert.equal(await page.evaluate(() => window.scrollY), 0, 'Arrow keys do not scroll desktop');
  await page.locator('#reset').click();

  await page.locator('#open-route').click();
  assert.equal(await page.locator('#route-list li').count(), initial.totalStops, 'Route overview lists every stop');
  await page.locator('#close-route').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.activeElement?.blur());
  await page.clock.runFor(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'Mobile layout has no horizontal overflow');
  assert.ok(await page.locator('#forward').isVisible());
  assert.ok(await page.locator('#backward').isVisible());
  const mobileForward = await page.locator('#forward').boundingBox();
  await page.mouse.move(mobileForward.x + mobileForward.width / 2, mobileForward.y + mobileForward.height / 2);
  await page.mouse.down();
  await page.clock.runFor(300);
  const mobilePosition = (await snapshot()).position;
  assert.ok(mobilePosition > 0, 'Mobile controls advance the vehicle');
  await page.locator('#forward').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await page.clock.runFor(300);
  assert.equal((await snapshot()).position, mobilePosition, 'Pointer cancellation releases mobile driving input');
  await page.mouse.up();
  await page.locator('#reset').click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.clock.runFor(350);
  await page.screenshot({ path: new URL('mobile.png', artifacts).pathname.replace(/^\/(.:)/, '$1'), fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, [], 'No browser errors or failed resources');
  console.log('PASS browser smoke: WebGL, real road geometry, keyboard, release, reverse, blur, pointer, reset, camera, route boundaries, all-stop completion, route dialog, mobile layout.');
} catch (error) {
  if (errors.length) console.error('Browser diagnostics:', errors);
  throw error;
} finally {
  await browser.close();
}
