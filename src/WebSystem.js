import { GAMEPLAY, COLORS } from './config.js';
import { raycast } from './raycast.js';

export default class WebSystem {
  constructor(scene, spider) {
    this.scene = scene;
    this.spider = spider;
    this.rope = scene.add.graphics().setDepth(7);
    this.aim = scene.add.graphics().setDepth(8);
    this.constraint = null;
    this.anchor = null;
    this.lastRay = null;
    this.missedUntil = 0;
    this.status = document.getElementById('web-status');
    this.detail = document.getElementById('web-detail');
    scene.input.mouse.disableContextMenu();
    scene.input.on('pointerdown', (pointer) => {
      if (pointer.button === 2) this.attach(pointer);
    });
    scene.input.on('pointerup', (pointer) => {
      if (pointer.button === 2) this.release();
    });
    scene.input.on('pointerupoutside', (pointer) => {
      if (pointer.button === 2) this.release();
    });
    this.onBlur = () => this.release();
    window.addEventListener('blur', this.onBlur);
    scene.game.events.on('blur', this.onBlur);
    scene.events.once('shutdown', () => {
      window.removeEventListener('blur', this.onBlur);
      scene.game.events.off('blur', this.onBlur);
    });
  }

  get attached() { return this.constraint !== null; }

  target(pointer = this.scene.input.activePointer) {
    const cursor = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const start = this.spider.body.position;
    const distance = Math.hypot(cursor.x - start.x, cursor.y - start.y);
    const scale = GAMEPLAY.webMaxDistance / Math.max(0.001, distance);
    const end = { x: start.x + (cursor.x - start.x) * scale,
      y: start.y + (cursor.y - start.y) * scale };
    return { start: { ...start }, end, cursor, hit: raycast(this.scene.solids, start, end) };
  }

  attach(pointer) {
    this.release();
    const ray = this.target(pointer);
    this.lastRay = ray;
    if (!ray.hit) {
      this.missedUntil = this.scene.time.now + 650;
      return;
    }
    const length = Math.hypot(ray.hit.x - ray.start.x, ray.hit.y - ray.start.y);
    if (length < GAMEPLAY.radius + 4) return;
    this.anchor = { x: ray.hit.x, y: ray.hit.y };
    this.constraint = this.scene.matter.add.worldConstraint(this.spider.body, length, GAMEPLAY.webStiffness, {
      pointA: this.anchor, pointB: { x: 0, y: 0 },
      damping: GAMEPLAY.webDamping, angularStiffness: 1,
      label: 'web', render: { visible: false },
    });
    this.scene.pulse(this.anchor.x, this.anchor.y, COLORS.cyan);
  }

  release() {
    if (!this.constraint) return;
    const velocity = { ...this.spider.body.velocity };
    this.scene.matter.world.removeConstraint(this.constraint);
    this.constraint = null;
    this.anchor = null;
    // Removing the constraint must not replace launch velocity with run speed.
    this.spider.body.constraintImpulse.x = 0;
    this.spider.body.constraintImpulse.y = 0;
    this.scene.matter.body.setVelocity(this.spider.body, velocity);
  }

  beforeStep() {
    if (!this.attached) return;
    const p = this.spider.body.position;
    const distance = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y);
    // A rope only pulls. Disable spring compression while the rope is slack.
    this.constraint.stiffness = distance >= this.constraint.length - 1 ? GAMEPLAY.webStiffness : 0;
    this.constraint.damping = this.constraint.stiffness ? GAMEPLAY.webDamping : 0;
  }

  draw(time) {
    this.rope.clear();
    this.aim.clear();
    const p = this.spider.body.position;
    const ray = this.target();
    const color = ray.hit ? COLORS.cyan : 0x64748f;
    const c = ray.cursor;
    this.aim.lineStyle(1, color, 0.7).strokeCircle(c.x, c.y, 8);
    this.aim.lineBetween(c.x - 13, c.y, c.x - 5, c.y);
    this.aim.lineBetween(c.x + 5, c.y, c.x + 13, c.y);
    this.aim.lineBetween(c.x, c.y - 13, c.x, c.y - 5);
    this.aim.lineBetween(c.x, c.y + 5, c.x, c.y + 13);
    if (ray.hit && !this.attached) {
      this.aim.lineStyle(1, COLORS.cyan, 0.35).strokeCircle(ray.hit.x, ray.hit.y, 5);
      const dx = ray.hit.x - p.x;
      const dy = ray.hit.y - p.y;
      const distance = Math.hypot(dx, dy);
      for (let d = 38; d < Math.min(distance, 155); d += 22) {
        this.aim.fillStyle(COLORS.cyan, 0.2).fillCircle(p.x + dx * d / distance, p.y + dy * d / distance, 1);
      }
    }
    if (this.attached) {
      this.rope.lineStyle(6, COLORS.cyan, 0.055).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.lineStyle(1.5, 0xc1fff6, 0.9).lineBetween(p.x, p.y, this.anchor.x, this.anchor.y);
      this.rope.fillStyle(0xe7fffd).fillCircle(this.anchor.x, this.anchor.y, 3);
      this.rope.lineStyle(1, COLORS.cyan, 0.5).strokeCircle(this.anchor.x, this.anchor.y, 8);
    }
    const missed = time < this.missedUntil;
    this.status.textContent = this.attached ? 'WEB: ATTACHED' : missed ? 'WEB: OUT OF REACH' : 'WEB: READY';
    this.detail.textContent = this.attached ? `${Math.round(this.constraint.length)} PX / RELEASE TO FLY` : 'AIM AT A SOLID SURFACE';
  }
}
