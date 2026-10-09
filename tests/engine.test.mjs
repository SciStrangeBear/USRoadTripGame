import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourney, advance, sampleRoute } from '../dist/engine.js';

const stops = [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
  { x: 20, y: 10 }, { x: 20, y: 20 },
];
const near = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} ≈ ${expected}`);

test('journeys start at the first stop and keep independent mutable state', () => {
  const a = createJourney(stops);
  const b = createJourney(stops);
  assert.equal(a.position, 0);
  assert.deepEqual([...a.visited], [0]);
  assert.deepEqual(a.arrivals, []);
  assert.equal(a.completed, false);
  advance(a, 2.2);
  assert.equal(b.position, 0);
  assert.deepEqual([...b.visited], [0]);
});

test('invalid route geometry is rejected before gameplay starts', () => {
  for (const route of [[], [{ x: 0, y: 0 }], [{ x: NaN, y: 0 }, stops[1]],
    [{ x: 0, y: Infinity }, stops[1]], [{ x: '1', y: 0 }, stops[1]]]) {
    assert.throws(() => createJourney(route));
  }
});

test('crossing multiple stops reports every arrival in travel order', () => {
  const state = createJourney(stops);
  advance(state, 3.25);
  near(state.position, 3.25);
  assert.deepEqual(state.arrivals, [1, 2, 3]);
  assert.deepEqual([...state.visited], [0, 1, 2, 3]);
  assert.equal(state.completed, false);
});

test('reverse travel reports stops in reverse order and retains discoveries', () => {
  const state = createJourney(stops);
  advance(state, 3.25);
  advance(state, -2.5);
  near(state.position, 0.75);
  assert.deepEqual(state.arrivals, [3, 2, 1]);
  assert.deepEqual([...state.visited], [0, 1, 2, 3]);
});

test('arrivals reset each update and departing an exact stop is not a new arrival', () => {
  const state = createJourney(stops);
  advance(state, 2);
  assert.deepEqual(state.arrivals, [1, 2]);
  advance(state, 0);
  assert.deepEqual(state.arrivals, []);
  advance(state, -0.25);
  assert.deepEqual(state.arrivals, []);
  advance(state, 0.25);
  assert.deepEqual(state.arrivals, [2]);
});

test('route endpoints clamp movement, with completion reversible by backing up', () => {
  const state = createJourney(stops);
  advance(state, -100);
  assert.equal(state.position, 0);
  assert.deepEqual(state.arrivals, []);
  advance(state, 100);
  assert.equal(state.position, 4);
  assert.deepEqual(state.arrivals, [1, 2, 3, 4]);
  assert.equal(state.completed, true);
  advance(state, 100);
  assert.deepEqual(state.arrivals, []);
  advance(state, -0.5);
  assert.equal(state.completed, false);
  advance(state, -100);
  assert.equal(state.position, 0);
  assert.deepEqual(state.arrivals, [3, 2, 1, 0]);
  assert.deepEqual([...state.visited], [0, 1, 2, 3, 4]);
});

test('equal travel split across frames produces equal position and arrival history', () => {
  const oneFrame = createJourney(stops);
  const manyFrames = createJourney(stops);
  advance(oneFrame, 3.5);
  const history = [];
  for (let i = 0; i < 14; i += 1) {
    advance(manyFrames, 0.25);
    history.push(...manyFrames.arrivals);
  }
  near(manyFrames.position, oneFrame.position);
  assert.deepEqual(history, oneFrame.arrivals);
  assert.deepEqual([...manyFrames.visited], [...oneFrame.visited]);
  const reverseHistory = [];
  advance(oneFrame, -2.5);
  for (let i = 0; i < 10; i += 1) {
    advance(manyFrames, -0.25);
    reverseHistory.push(...manyFrames.arrivals);
  }
  near(manyFrames.position, oneFrame.position);
  assert.deepEqual(reverseHistory, oneFrame.arrivals);
});

test('route sampling interpolates coordinates and exposes the segment heading', () => {
  assert.deepEqual(sampleRoute(stops, 0), { x: 0, y: 0, angle: 0 });
  const horizontal = sampleRoute(stops, 0.5);
  near(horizontal.x, 5);
  near(horizontal.y, 0);
  near(horizontal.angle, 0);
  const vertical = sampleRoute(stops, 1.25);
  near(vertical.x, 10);
  near(vertical.y, 2.5);
  near(vertical.angle, 90);
  const end = sampleRoute(stops, 4);
  near(end.x, 20);
  near(end.y, 20);
  assert.ok(Number.isFinite(end.angle));
});
