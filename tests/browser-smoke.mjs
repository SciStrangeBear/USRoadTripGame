import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Override these paths when running outside this workstation.
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ executablePath, headless: true });
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
  await page.locator('#car').waitFor();
  const snapshot = () => page.evaluate(() => window.__roadtrip.snapshot());
  const hold = async (key, milliseconds) => {
    await page.keyboard.down(key);
    await page.clock.runFor(milliseconds);
    await page.keyboard.up(key);
  };

  assert.equal((await snapshot()).position, 0);
  assert.match(await page.locator('#place-name').innerText(), /洛杉矶/);
  await page.screenshot({ path: new URL('desktop.png', artifacts).pathname.replace(/^\/(.:)/, '$1'), fullPage: true });
  await hold('w', 2200);
  const forwardPosition = (await snapshot()).position;
  assert.ok(forwardPosition > 0, 'W advances the car');
  await page.clock.runFor(500);
  assert.equal((await snapshot()).position, forwardPosition, 'Releasing W stops movement');
  await hold('s', 500);
  assert.ok((await snapshot()).position < forwardPosition, 'S reverses the car');

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
  await hold('ArrowUp', 180000);
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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.activeElement?.blur());
  await page.clock.runFor(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'Mobile layout has no horizontal overflow');
  assert.ok(await page.locator('#forward').isVisible());
  assert.ok(await page.locator('#backward').isVisible());
  await page.screenshot({ path: new URL('mobile.png', artifacts).pathname.replace(/^\/(.:)/, '$1'), fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, [], 'No browser errors or failed resources');
  console.log('PASS browser smoke: keyboard, release, reverse, blur, pointer, reset, route boundaries, completion, mobile layout.');
} catch (error) {
  if (errors.length) console.error('Browser diagnostics:', errors);
  throw error;
} finally {
  await browser.close();
}
