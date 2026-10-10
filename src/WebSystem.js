import { GAMEPLAY, WEB } from './config.js';
import { webTarget } from './aimAssist.js';

export default class WebSystem {
  constructor(scene, spider) {
    this.scene = scene; this.spider = spider;
    this.rope = scene.add.graphics().setDepth(7);
    this.aim = scene.add.graphics().setDepth(8);
    this.constraint = null; this.anchor = null; this.lastRay = null; this.missedUntil = 0;
  }
  get attached() { return this.constraint !== null; }
  target(direction = this.spider.aim) {
    return webTarget(this.scene.solids, this.spider.body.position, direction);
  }
  attach(direction) {
    if (this.attached) return;
    const ray = this.target(direction);
    this.lastRay = ray;
    if (!ray.hit) { this.missedUntil = this.scene.simTime + 650; return; }
    const length = Math.hypot(ray.hit.x - ray.start.x, ray.hit.y - ray.start.y);
    if (length < GAMEPLAY.radius + 4) return;
    this.anchor = { x: ray.hit.x, y: ray.hit.y };
    this.constraint = this.scene.matter.add.worldConstraint(this.spider.body, length, GAMEPLAY.webStiffness, {
      pointA: this.anchor, pointB: { x: 0, y: 0 }, damping: GAMEPLAY.webDamping,
      angularStiffness: 1, label: `web-${this.spider.id}`, render: { visible: false },
    });
    this.scene.pulse(this.anchor.x, this.anchor.y, this.spider.color);
  }
  release() {
    if (!this.constraint) return;
    const velocity = { ...this.spider.body.velocity };
    this.scene.matter.world.removeConstraint(this.constraint);
    this.constraint = null; this.anchor = null;
    // Preserve the V0.1 launch velocity and clear the solver's old rope impulse.
    this.spider.body.constraintImpulse.x = 0;
    this.spider.body.constraintImpulse.y = 0;
    this.scene.matter.body.setVelocity(this.spider.body, velocity);
  }
  beforeStep() {
    if (!this.attached) return;
    const p = this.spider.body.position;
    const distance = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y);
    // V0.1 rope only pulls while taut; no spring compression.
    this.constraint.stiffness = distance >= this.constraint.length - 1 ? GAMEPLAY.webStiffness : 0;
    this.constraint.damping = this.constraint.stiffness ? GAMEPLAY.webDamping : 0;
  }
  draw() {
    this.rope.clear(); this.aim.clear();
    if (this.spider.dead) return;
    const p = this.spider.body.position, d = this.spider.aim, color = this.spider.color;
    const length = WEB.indicatorLength, ray = this.target();
    const tip = { x: p.x + d.x * length, y: p.y + d.y * length };
    this.aim.lineStyle(4, color, ray.hit ? 0.12 : 0.04)
      .lineBetween(p.x + d.x * 37, p.y + d.y * 37, tip.x, tip.y);
    this.aim.lineStyle(1.5, color, ray.hit ? 0.85 : 0.35)
      .lineBetween(p.x + d.x * 37, p.y + d.y * 37, tip.x, tip.y)
      .lineBetween(tip.x, tip.y, tip.x - d.x * 10 - d.y * 5, tip.y - d.y * 10 + d.x * 5)
      .lineBetween(tip.x, tip.y, tip.x - d.x * 10 + d.y * 5, tip.y - d.y * 10 - d.x * 5);
    if (ray.hit && !this.attached && this.spider === this.scene.spider)
      this.aim.lineStyle(1, color, 0.3).strokeCircle(ray.hit.x, ray.hit.y, 5);
    if (this.attached) {
      this.rope.lineStyle(6, color, 0.055).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.lineStyle(1.5, this.spider.accentColor, 0.9).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.fillStyle(this.spider.accentColor).fillCircle(this.anchor.x, this.anchor.y, 3);
      this.rope.lineStyle(1, color, 0.5).strokeCircle(this.anchor.x, this.anchor.y, 8);
    }
  }
}
