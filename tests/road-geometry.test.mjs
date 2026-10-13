import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRoadGeometry } from '../dist/road-geometry.js';
import { stops } from '../dist/route-data.js';

const data = JSON.parse(await readFile(new URL('../dist/road-route.json', import.meta.url), 'utf8'));
const routes = JSON.parse(await readFile(new URL('../../roadbook/dist/routes.json', import.meta.url), 'utf8'));
const geometry = buildRoadGeometry(data);
const project = ([lat, lon]) => ({ x: 100 + (lon + 125) * 27, y: 75 + (50 - lat) * 28 });
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segmentGap(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

test('complete cached road legs are connected and cover all ordered stops', () => {
  assert.equal(data.legs.length, 24);
  assert.deepEqual(data.stopIds, stops.map(s => s.id));
  assert.equal(data.rawPointCount, 109926);
  assert.ok(data.points.length > 2000);
  assert.equal(data.stopDistances[0], 0);
  assert.equal(data.stopDistances.at(-1), geometry.length);
  let previous;
  for (const leg of data.legs) {
    const raw = routes[leg.key];
    if (previous) assert.deepEqual(raw[0], previous);
    previous = raw.at(-1);
    assert.deepEqual(data.points[leg.startIndex], project(raw[0]));
    assert.deepEqual(data.points[leg.endIndex], project(raw.at(-1)));
  }
});

test('every original road vertex remains within 0.08 map units of its simplified leg', () => {
  let largest = 0;
  for (const leg of data.legs) {
    const line = data.points.slice(leg.startIndex, leg.endIndex + 1);
    for (const coordinate of routes[leg.key]) {
      const p = project(coordinate);
      let nearest = Infinity;
      for (let i = 1; i < line.length; i++) nearest = Math.min(nearest, segmentGap(p, line[i - 1], line[i]));
      largest = Math.max(largest, nearest);
    }
  }
  assert.ok(largest <= 0.08, `Maximum road deviation ${largest}`);
});

test('distance and continuous stop position round-trip, including each arrival', () => {
  for (let i = 0; i < stops.length; i++) {
    const d = geometry.distanceAt(i);
    assert.equal(d, data.stopDistances[i]);
    assert.ok(Math.abs(geometry.positionAt(d) - i) < 1e-10);
    assert.ok(gap(geometry.sample(d), data.points[data.stopIndices[i]]) < 1e-10);
  }
  for (let p = 0; p <= stops.length - 1; p += 0.013) assert.ok(Math.abs(geometry.positionAt(geometry.distanceAt(p)) - p) < 1e-10);
  assert.equal(geometry.distanceAt(-2), 0);
  assert.equal(geometry.distanceAt(999), geometry.length);
  assert.equal(geometry.positionAt(-2), 0);
  assert.equal(geometry.positionAt(geometry.length + 1), stops.length - 1);
  assert.deepEqual(geometry.sample(-1), geometry.sample(0));
  assert.deepEqual(geometry.sample(geometry.length + 1), geometry.sample(geometry.length));
});

test('samples stay on the cached polyline and report finite heading', () => {
  let arc = 0;
  for (let i = 1; i < data.points.length; i++) {
    const a = data.points[i - 1], b = data.points[i], distance = gap(a, b);
    const sample = geometry.sample(arc + distance / 2);
    assert.ok(gap(sample, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) < 1e-8);
    assert.ok(Number.isFinite(sample.angle));
    arc += distance;
  }
});

test('invalid road geometry is rejected instead of silently using straight stop connectors', () => {
  assert.throws(() => buildRoadGeometry({}), TypeError);
  assert.throws(() => buildRoadGeometry({ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], stopDistances: [0, 10] }), TypeError);
});
