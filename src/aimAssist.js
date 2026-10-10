import { raycast } from './raycast.js';
import { WEB, GAMEPLAY } from './config.js';
import { aimDirection } from './actions.js';

// Every candidate keeps its FIRST exact intersection; no ray can skip a wall.
export function webTarget(bodies, start, direction, settings = WEB, reach = GAMEPLAY.webMaxDistance) {
  const aim = aimDirection(direction.x, direction.y, { x: 0, y: -1 }, 0);
  const cast = (angle) => {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const end = { x: start.x + (aim.x * cos - aim.y * sin) * reach,
      y: start.y + (aim.x * sin + aim.y * cos) * reach };
    return { start: { ...start }, end, hit: raycast(bodies, start, end), angle };
  };
  const exact = cast(0);
  // A too-close first wall also blocks assistance: never aim around that wall.
  if (exact.hit) return exact;
  for (let step = 1; step <= settings.assistSteps; step++) {
    const angle = settings.assistAngleDeg * Math.PI / 180 * step / settings.assistSteps;
    const candidates = [cast(-angle), cast(angle)]
      .filter((ray) => ray.hit && ray.hit.t * reach >= GAMEPLAY.radius + 4);
    if (candidates.length) return candidates.sort((a, b) => a.hit.t - b.hit.t)[0];
  }
  return exact;
}
