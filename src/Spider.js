import { GAMEPLAY, COLORS } from './config.js';
import { raycast } from './raycast.js';

export default class Spider {
  constructor(scene) {
    this.scene = scene;
    this.body = scene.matter.add.circle(GAMEPLAY.spawn.x, GAMEPLAY.spawn.y, GAMEPLAY.radius, {
      label: 'spider', friction: 0, frictionStatic: 0, frictionAir: GAMEPLAY.airDrag,
      restitution: 0, density: 0.003,
    });
    scene.matter.body.setInertia(this.body, Infinity);
    this.graphics = scene.add.graphics().setDepth(10);
    this.x = this.body.position.x;
    this.y = this.body.position.y;
    this.grounded = false;
    this.lastGrounded = -Infinity;
    this.jumpQueuedUntil = -Infinity;
    this.gait = 0;
    this.riverCooldown = 0;
  }

  queueJump(time) { this.jumpQueuedUntil = time + GAMEPLAY.jumpBufferMs; }

  checkGround() {
    if (this.body.velocity.y < -2) return false;
    const p = this.body.position;
    return [-10, 0, 10].some((offset) => {
      const hit = raycast(this.scene.solids,
        { x: p.x + offset, y: p.y + 7 },
        { x: p.x + offset, y: p.y + GAMEPLAY.radius + 5 });
      return hit && hit.normal.y < -0.45;
    });
  }

  step(time, direction, web) {
    const Body = this.scene.matter.body;
    this.grounded = this.checkGround();
    if (this.grounded) this.lastGrounded = time;
    const v = this.body.velocity;
    if (web.attached) {
      const dx = this.body.position.x - web.anchor.x;
      const dy = this.body.position.y - web.anchor.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      // Pump along the tangent; A/D keep their screen-horizontal meaning.
      const tx = dy / length;
      const ty = -dx / length;
      const sign = tx < 0 ? -1 : 1;
      Body.applyForce(this.body, this.body.position, {
        x: tx * sign * direction * GAMEPLAY.swingForce,
        y: ty * sign * direction * GAMEPLAY.swingForce,
      });
      if (this.grounded) this.accelerate(direction, GAMEPLAY.moveAcceleration, GAMEPLAY.maxRunSpeed);
    } else if (this.grounded) {
      if (direction) this.accelerate(direction, GAMEPLAY.moveAcceleration, GAMEPLAY.maxRunSpeed);
      else Body.setVelocity(this.body, { x: v.x * GAMEPLAY.groundDrag, y: v.y });
    } else {
      // Only accelerate toward the air-control cap: never truncate web momentum.
      this.accelerate(direction, GAMEPLAY.airControl, GAMEPLAY.maxRunSpeed);
    }
    if (this.jumpQueuedUntil >= time && time - this.lastGrounded <= GAMEPLAY.coyoteMs) {
      Body.setVelocity(this.body, { x: this.body.velocity.x, y: -GAMEPLAY.jumpSpeed });
      this.jumpQueuedUntil = -Infinity;
      this.lastGrounded = -Infinity;
      this.grounded = false;
      this.scene.pulse(this.body.position.x, this.body.position.y + 17, COLORS.cyan);
    }
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
    if (speed > GAMEPLAY.maxSwingSpeed) {
      const scale = GAMEPLAY.maxSwingSpeed / speed;
      Body.setVelocity(this.body, { x: this.body.velocity.x * scale, y: this.body.velocity.y * scale });
    }
    if (this.body.position.y > GAMEPLAY.riverY - 22 && time > this.riverCooldown) {
      web.release();
      Body.setVelocity(this.body, { x: this.body.velocity.x, y: -GAMEPLAY.riverBounceSpeed });
      this.riverCooldown = time + 500;
      this.scene.pulse(this.body.position.x, GAMEPLAY.riverY, COLORS.magenta, 95);
    }
  }

  accelerate(direction, acceleration, limit) {
    if (!direction) return;
    const v = this.body.velocity;
    if (v.x * direction < limit) {
      const next = v.x + direction * acceleration;
      this.scene.matter.body.setVelocity(this.body, { x: direction > 0 ? Math.min(next, limit) : Math.max(next, -limit), y: v.y });
    }
  }

  reset(web) {
    web.release();
    this.scene.matter.body.setPosition(this.body, GAMEPLAY.spawn);
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    this.body.force.x = this.body.force.y = 0;
    this.lastGrounded = this.jumpQueuedUntil = -Infinity;
    this.riverCooldown = 0;
    this.scene.trail.length = 0;
  }

  draw(delta) {
    const p = this.body.position;
    this.x = p.x;
    this.y = p.y;
    this.gait += Math.abs(this.body.velocity.x) * delta * 0.008;
    const g = this.graphics;
    g.clear().setPosition(p.x, p.y);
    g.rotation = Math.max(-0.3, Math.min(0.3, this.body.velocity.x * 0.018));
    for (const side of [-1, 1]) {
      for (let leg = 0; leg < 4; leg++) {
        const y = -13 + leg * 9;
        const walk = this.grounded ? Math.sin(this.gait + leg * Math.PI * 0.85) * 4 : 0;
        const lift = this.grounded ? 6 : -7;
        const points = [{ x: side * 9, y }, { x: side * (23 + walk), y: y - 7 },
          { x: side * (32 + walk), y: y + lift }];
        g.lineStyle(5, 0x080d19).strokePoints(points);
        g.lineStyle(2, 0x597284).strokePoints(points);
        g.fillStyle(COLORS.cyan, 0.9).fillCircle(points[1].x, points[1].y, 1.6);
      }
    }
    g.fillStyle(COLORS.cyan, 0.055).fillEllipse(0, 1, 53, 61);
    g.fillStyle(0x080f1c).fillEllipse(0, 5, 28, 32);
    g.lineStyle(1.5, 0x426b7a).strokeEllipse(0, 5, 28, 32);
    g.fillStyle(0x142c3a).fillEllipse(-3, 1, 11, 20);
    g.lineStyle(2, COLORS.cyan, 0.8).lineBetween(-5, 9, 0, 13).lineBetween(0, 13, 5, 9);
    g.fillStyle(0x101a28).fillEllipse(0, -12, 23, 20);
    g.lineStyle(1, 0x4d8794).strokeEllipse(0, -12, 23, 20);
    g.fillStyle(COLORS.cyan, 0.18).fillCircle(-5, -16, 6).fillCircle(5, -16, 6);
    g.fillStyle(0xadfff2).fillCircle(-5, -16, 2.8).fillCircle(5, -16, 2.8);
  }
}
