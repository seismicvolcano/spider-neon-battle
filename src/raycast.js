// Matter.Query.ray reports bodies, not an exact surface intersection. Intersect
// their polygon edges so inclined platforms and the crystal anchor precisely.
export function raycast(bodies, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let nearest = null;
  for (const body of bodies) {
    if (body.isSensor) continue;
    const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
    for (const part of parts) {
      const vertices = part.vertices;
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const denominator = dx * ey - dy * ex;
        if (Math.abs(denominator) < 1e-8) continue;
        const ax = a.x - start.x;
        const ay = a.y - start.y;
        const t = (ax * ey - ay * ex) / denominator;
        const u = (ax * dy - ay * dx) / denominator;
        if (t < 0 || t > 1 || u < 0 || u > 1 || (nearest && t >= nearest.t)) continue;
        const length = Math.hypot(ex, ey);
        nearest = { x: start.x + t * dx, y: start.y + t * dy, t,
          normal: { x: ey / length, y: -ex / length }, body };
      }
    }
  }
  return nearest;
}
