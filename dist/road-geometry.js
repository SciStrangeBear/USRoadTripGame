const clamp = (value, max) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
const intervalAt = (values, value) => {
  let lo = 0, hi = values.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] <= value) lo = mid; else hi = mid;
  }
  return Math.min(lo, values.length - 2);
};

export function buildRoadGeometry(data) {
  const points = data?.points;
  const stopDistances = data?.stopDistances;
  if (!Array.isArray(points) || points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new TypeError('Road geometry needs finite points');
  const arc = [0];
  for (let i = 1; i < points.length; i++) arc.push(arc.at(-1) + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const length = arc.at(-1);
  if (!length || !Array.isArray(stopDistances) || stopDistances.length < 2 || stopDistances[0] !== 0 || stopDistances.some((d, i) => !Number.isFinite(d) || (i && d <= stopDistances[i - 1])) || Math.abs(stopDistances.at(-1) - length) > 1e-7) throw new TypeError('Stop distances must cover the road in increasing order');
  return {
    points, length, stopDistances,
    sample(distance) {
      const d = clamp(distance, length);
      let i = intervalAt(arc, d);
      while (i < points.length - 2 && arc[i + 1] === arc[i]) i++;
      const a = points[i], b = points[i + 1];
      const t = (d - arc[i]) / (arc[i + 1] - arc[i] || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
    },
    positionAt(distance) {
      const d = clamp(distance, length), i = intervalAt(stopDistances, d);
      return i + (d - stopDistances[i]) / (stopDistances[i + 1] - stopDistances[i]);
    },
    distanceAt(position) {
      const p = clamp(position, stopDistances.length - 1), i = Math.min(Math.floor(p), stopDistances.length - 2);
      return stopDistances[i] + (p - i) * (stopDistances[i + 1] - stopDistances[i]);
    },
  };
}
