import { readFile, writeFile } from 'node:fs/promises';
import { stops } from '../dist/route-data.js';
import { buildRoadGeometry } from '../dist/road-geometry.js';

const routes = JSON.parse(await readFile(new URL('../../roadbook/dist/routes.json', import.meta.url), 'utf8'));
let source;
try { source = await readFile(new URL('../roadbook-source.json', import.meta.url), 'utf8'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  source = await readFile(new URL('../../roadbook/.local-data/roadbook.json', import.meta.url), 'utf8');
}
const trip = JSON.parse(source).trips.find(t => t.id === 'trip-usa-roadbook');
const project = ([lat, lon]) => ({ x: 100 + (lon + 125) * 27, y: 75 + (50 - lat) * 28 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function projection(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { t, x: a.x + dx * t, y: a.y + dy * t };
}
function simplify(points, tolerance) {
  const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = tolerance, index = -1;
    for (let i = a + 1; i < b; i++) {
      const gap = distance(points[i], projection(points[i], points[a], points[b]));
      if (gap > far) { far = gap; index = i; }
    }
    if (index >= 0) { keep.add(index); stack.push([a, index], [index, b]); }
  }
  return [...keep].sort((a, b) => a - b).map(i => points[i]);
}
const tolerance = 0.075, points = [], stopIndices = [0], legs = [], stopKeys = [];
let rawPointCount = 0, previousRawEnd;
for (const day of trip.days.filter(d => d.type === 'drive')) {
  const vias = (Array.isArray(day.via) ? day.via : [day.via]).filter(Boolean);
  const keys = [day.from, ...vias, day.to], key = keys.join(':');
  const raw = routes[key];
  if (!raw || raw.length < 2) throw new Error(`Missing complete cached road: ${key}`);
  if (previousRawEnd && JSON.stringify(previousRawEnd) !== JSON.stringify(raw[0])) throw new Error(`Disconnected cached road: ${key}; no straight connector permitted`);
  previousRawEnd = raw.at(-1);
  rawPointCount += raw.length - (legs.length ? 1 : 0);
  const projected = raw.map(project), anchors = [{ position: 0, point: projected[0] }];
  for (const via of vias) {
    const target = project(trip.places[via]);
    let best = { gap: Infinity };
    for (let i = Math.floor(anchors.at(-1).position); i < projected.length - 1; i++) {
      const point = projection(target, projected[i], projected[i + 1]), position = i + point.t;
      if (position <= anchors.at(-1).position) continue;
      const gap = distance(target, point);
      if (gap < best.gap) best = { position, point: { x: point.x, y: point.y }, gap };
    }
    if (!Number.isFinite(best.gap)) throw new Error(`Cannot map via: ${via}`);
    anchors.push(best);
  }
  anchors.push({ position: projected.length - 1, point: projected.at(-1) });
  const startIndex = Math.max(0, points.length - 1);
  if (!points.length) { points.push(projected[0]); stopKeys.push(day.from); }
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i], chunk = [a.point];
    for (let j = Math.floor(a.position) + 1; j < b.position; j++) chunk.push(projected[j]);
    chunk.push(b.point);
    const simplified = simplify(chunk, tolerance);
    for (const point of simplified.slice(1)) if (distance(point, points.at(-1)) > 1e-12) points.push(point);
    stopIndices.push(points.length - 1);
    stopKeys.push(keys[i]);
  }
  legs.push({ key, startIndex, endIndex: points.length - 1 });
}
if (JSON.stringify(stopKeys) !== JSON.stringify(stops.map(s => s.key))) throw new Error('Road stops do not match the game itinerary');
const arc = [0];
for (let i = 1; i < points.length; i++) arc.push(arc.at(-1) + distance(points[i - 1], points[i]));
const data = { version: 1, source: 'roadbook/dist/routes.json', projection: { xOrigin: 100, lonOrigin: -125, xScale: 27, yOrigin: 75, latOrigin: 50, yScale: 28 }, tolerance, points, stopIds: stops.map(s => s.id), stopDistances: stopIndices.map(i => arc[i]), stopIndices, legs, rawPointCount };
buildRoadGeometry(data);
await writeFile(new URL('../dist/road-route.json', import.meta.url), JSON.stringify(data));
console.log(`Built ${legs.length} cached road legs; ${rawPointCount} raw points → ${points.length} map points; ${stopIndices.length} stops.`);
