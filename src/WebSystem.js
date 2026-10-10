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
    this.scene.audio?.play('webLaunch');
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
    this.scene.audio?.play('webAttach');
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
    this.scene.audio?.play('webRelease');
  }
  beforeStep() {
    if (!this.attached) return;
    const p = this.spider.body.position;
    const distance = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y);
    const v = this.spider.body.velocity;
    const nextDistance = Math.hypot(p.x + v.x - this.anchor.x, p.y + v.y - this.anchor.y);
    // A rope only pulls. When jumping toward an anchor in the same tick as LT,
    // leave it slack rather than letting the constraint cancel inward velocity.
    this.constraint.stiffness = Math.min(distance, nextDistance) >= this.constraint.length - 1 ? GAMEPLAY.webStiffness : 0;
    this.constraint.damping = this.constraint.stiffness ? GAMEPLAY.webDamping : 0;
  }
  draw() {
    this.rope.clear(); this.aim.clear();
    if (this.spider.dead) return;
    const p = this.spider.body.position, d = this.spider.aim, color = this.spider.color;
    if (WEB.aimIndicatorMode === 'minimal') {
      const start = WEB.indicatorOffset, end = start + WEB.indicatorLength;
      this.aim.lineStyle(1, color, WEB.indicatorAlpha)
        .lineBetween(p.x + d.x * start, p.y + d.y * start, p.x + d.x * end, p.y + d.y * end);
    }
    if (this.attached) {
      this.rope.lineStyle(6, color, 0.055).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.lineStyle(1.5, this.spider.accentColor, 0.9).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.fillStyle(this.spider.accentColor).fillCircle(this.anchor.x, this.anchor.y, 3);
      this.rope.lineStyle(1, color, 0.5).strokeCircle(this.anchor.x, this.anchor.y, 8);
    }
  }
}
