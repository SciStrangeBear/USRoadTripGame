// Frame-rate independent easing on the shortest angular arc (radians).
export function easeHeading(current, target, dt, tau = .28, maxSpeed = 2.1) {
  const delta = Math.atan2(Math.sin(target-current), Math.cos(target-current));
  const step = delta * (1-Math.exp(-Math.max(0,dt)/tau));
  const limit = maxSpeed*Math.max(0,dt);
  return current + Math.max(-limit,Math.min(limit,step));
}

// Heading spans a short section of road; the car's position remains on the exact polyline.
export function roadHeading(geometry, distance, span = 10) {
  const a=geometry.sample(distance-span), b=geometry.sample(distance+span);
  return Math.hypot(b.x-a.x,b.y-a.y)>1e-5
    ? Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI
    : geometry.sample(distance).angle;
}
