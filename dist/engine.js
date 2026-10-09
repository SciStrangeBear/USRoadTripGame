export function createJourney(stops) {
  if (!Array.isArray(stops) || stops.length < 2 || stops.some(s => !Number.isFinite(s.x) || !Number.isFinite(s.y))) throw new TypeError('At least two finite map points are required');
  return { position: 0, visited: new Set([0]), arrivals: [], completed: false, stops };
}

export function advance(state, distance) {
  state.arrivals = [];
  if (!Number.isFinite(distance)) return state;
  const previous = state.position;
  const last = state.stops.length - 1;
  const next = Math.max(0, Math.min(last, previous + distance));
  if (next > previous) {
    for (let i = Math.floor(previous) + 1; i <= Math.floor(next); i++) { state.arrivals.push(i); state.visited.add(i); }
  } else if (next < previous) {
    for (let i = Math.ceil(previous) - 1; i >= Math.ceil(next); i--) { state.arrivals.push(i); state.visited.add(i); }
  }
  state.position = next;
  state.completed = next === last;
  return state;
}

export function sampleRoute(stops, position) {
  const p = Math.max(0, Math.min(stops.length - 1, Number.isFinite(position) ? position : 0));
  const i = Math.min(Math.floor(p), stops.length - 2);
  const t = p - i, a = stops[i], b = stops[i + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
}
