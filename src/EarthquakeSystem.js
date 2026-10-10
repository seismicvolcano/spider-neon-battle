import { EARTHQUAKE as E, GAMEPLAY } from './config.js';
import { raycast } from './raycast.js';
import { earthquakeCanHit } from './matchRules.js';

// Earliest contact with a circle, including starting inside. Used with relative
// motion so a fast fighter or falling rock cannot tunnel through the other.
export function circleContact(start, end, center, radius) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const ox = start.x - center.x, oy = start.y - center.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (ox * dx + oy * dy), disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export default class EarthquakeSystem {
  constructor(scene) { this.scene = scene; this.graphics = scene.add.graphics().setDepth(9); this.reset(); }
  reset() { this.warnings = []; this.rocks = []; this.previousPositions = new Map(); this.graphics.clear(); }
  activate(owner, time) {
    if (owner.dead || owner.powerCharges <= 0 || this.scene.winner ||
      this.warnings.length + this.rocks.length + E.rockCount > E.maxRocks) return false;
    const rivals = this.scene.spiders.filter((s) => !s.dead && earthquakeCanHit(owner, s));
    if (!rivals.length) return false;
    const plans = [];
    for (let i = 0; i < E.rockCount; i++) {
      const target = rivals[i % rivals.length].body.position;
      const x = Math.max(100, Math.min(GAMEPLAY.worldWidth - 100, target.x + (Math.random() * 2 - 1) * E.spread));
      const top = raycast(this.scene.solids, { x, y: target.y - GAMEPLAY.radius - 1 }, { x, y: 78 });
      if (top && (top.normal.y < 0.15 || target.y - top.y < E.safeDropHeight + E.radius)) continue;
      let y = top ? top.y + E.radius + 3 : 100;
      // Keep spawn points away from every living fighter and out of solid geometry.
      if (this.scene.spiders.some((s) => !s.dead && Math.hypot(s.body.position.x - x, s.body.position.y - y) < E.safeDropHeight)) continue;
      const ground = raycast(this.scene.solids, { x, y }, { x, y: GAMEPLAY.riverY + 20 });
      if (ground && ground.y - y < E.radius * 3) continue;
      const due = time + E.warningMs + i / Math.max(1, E.rockCount - 1) * E.durationMs;
      plans.push({ owner, x, y, bottom: ground?.y ?? GAMEPLAY.riverY, born: time, due });
    }
    if (!plans.length) return false;
    owner.powerCharges--; this.warnings.push(...plans);
    this.scene.audio?.play('earthquake');
    this.scene.cameras?.main.shake(E.shakeMs, E.shakeIntensity);
    return true;
  }
  step(time) {
    const dt = GAMEPLAY.fixedStep / 1000;
    const due = this.warnings.filter((w) => time >= w.due);
    this.warnings = this.warnings.filter((w) => time < w.due);
    for (const w of due) {
      this.rocks.push({ ...w, speed: E.fallSpeed, expires: time + E.lifetimeMs, hit: new Set() });
      this.scene.audio?.play('rockFall');
    }
    this.rocks = this.rocks.filter((rock) => {
      if (time >= rock.expires || rock.y > GAMEPLAY.worldHeight) return false;
      const start = { x: rock.x, y: rock.y };
      rock.speed += E.acceleration * dt;
      const end = { x: rock.x, y: rock.y + rock.speed * dt };
      // Three swept rays cover the width of the rock against the existing solids.
      let wallT = 1, wall = null;
      for (const offset of [-E.radius, 0, E.radius]) {
        const hit = raycast(this.scene.solids, { x: start.x + offset, y: start.y + E.radius },
          { x: end.x + offset, y: end.y + E.radius });
        if (hit) {
          const t = Math.max(0, (hit.y - E.radius - start.y) / (end.y - start.y));
          if (t <= wallT) { wallT = t; wall = hit; }
        }
      }
      for (const target of this.scene.spiders) {
        if (target.dead || rock.hit.has(target.id) || !earthquakeCanHit(rock.owner, target)) continue;
        const q = target.body.position, previous = this.previousPositions.get(target.id) ?? q;
        const t = circleContact({ x: start.x - previous.x, y: start.y - previous.y },
          { x: end.x - q.x, y: end.y - q.y }, { x: 0, y: 0 }, E.radius + GAMEPLAY.radius);
        if (t === null || t > wallT) continue;
        rock.hit.add(target.id);
        this.scene.combat.damage(target, rock.owner, { x: Math.sign(q.x - rock.x) * 0.7, y: 0.3 }, 'rock', time);
      }
      rock.y = start.y + (end.y - start.y) * wallT;
      if (wall) {
        this.scene.audio?.play('rockHit');
        this.scene.combat.burst(rock.x, rock.y, rock.owner.color, time, 8);
        return false;
      }
      return true;
    });
    for (const s of this.scene.spiders) this.previousPositions.set(s.id, { ...s.body.position });
  }
  draw(time) {
    const g = this.graphics; g.clear();
    for (const w of this.warnings) {
      const alpha = 0.32 + Math.sin(time * 0.016) * 0.12;
      g.lineStyle(1, w.owner.color, alpha).lineBetween(w.x, w.y, w.x, w.bottom);
      g.fillStyle(w.owner.color, 0.1).fillRect(w.x - E.radius, w.y, E.radius * 2, w.bottom - w.y);
      g.lineStyle(2, w.owner.color, 0.65).strokeEllipse(w.x, w.bottom - 2, E.radius * 3, 12);
      g.lineBetween(w.x - 7, w.y + 12, w.x, w.y + 24).lineBetween(w.x, w.y + 24, w.x + 7, w.y + 12);
    }
    for (const r of this.rocks) {
      g.fillStyle(0x273149).fillCircle(r.x, r.y, E.radius);
      g.lineStyle(2, r.owner.color, 0.85).strokeCircle(r.x, r.y, E.radius);
      g.lineStyle(1, r.owner.color, 0.5).lineBetween(r.x - 8, r.y - 7, r.x + 4, r.y + 8);
    }
  }
}
