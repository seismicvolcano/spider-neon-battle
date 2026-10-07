import { COMBAT, GAMEPLAY } from './config.js';
import { raycast } from './raycast.js';
import { createWeapon, useWeapon, canDamage } from './weaponState.js';

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(12);
    this.reset();
  }
  reset() {
    this.projectiles = []; this.swings = []; this.sparks = [];
    this.pickups = COMBAT.weaponSpawns.map((spawn) => ({ ...spawn, availableAt: 0 }));
  }
  attack(spider, time) {
    if (!useWeapon(spider.weapon, time)) return;
    const p = spider.body.position, aim = { ...spider.aim };
    if (spider.weapon.type === 'sword') {
      this.swings.push({ owner: spider, start: time, end: time + COMBAT.sword.durationMs,
        aim, hit: new Set() });
    } else {
      // Cast from the body center on the first tick so a nearby wall is not skipped.
      this.projectiles.push({ owner: spider, x: p.x, y: p.y, aim,
        expires: time + COMBAT.pistol.lifetimeMs });
      this.burst(p.x + aim.x * 25, p.y + aim.y * 25, spider.color, time, 5);
      if (spider.weapon.ammo === 0) spider.weapon = null;
    }
  }
  burst(x, y, color, time, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 3;
      this.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, born: time, end: time + 350 + Math.random() * 180 });
    }
  }
  damage(target, attacker, direction, type, time) {
    if (!canDamage(target, time) || this.scene.winner) return false;
    const settings = COMBAT[type], v = target.body.velocity;
    const relative = Math.hypot(attacker.body.velocity.x - v.x, attacker.body.velocity.y - v.y);
    const strength = settings.knockback + (type === 'sword' ? Math.min(5, relative * settings.momentumFactor) : 0);
    target.hearts--;
    target.invulnerableUntil = time + COMBAT.invulnerabilityMs;
    this.scene.matter.body.setVelocity(target.body, {
      x: v.x + direction.x * strength, y: v.y + direction.y * strength - settings.upwardKick,
    });
    this.burst(target.body.position.x, target.body.position.y, target.color, time);
    this.scene.pulse(target.body.position.x, target.body.position.y, target.color, 55);
    if (target.hearts === 0) {
      target.dead = true; target.weapon = null; target.web.release(); target.webHeld = false;
      target.jumpQueuedUntil = -Infinity; target.respawnAt = time + COMBAT.respawnMs;
      target.body.isSensor = true;
      this.scene.matter.body.setStatic(target.body, true);
      attacker.score++;
      this.burst(target.body.position.x, target.body.position.y, target.color, time, 32);
      this.scene.pulse(target.body.position.x, target.body.position.y, target.color, 110);
      if (attacker.score >= COMBAT.scoreToWin) this.scene.finishMatch(attacker);
    }
    return true;
  }
  step(time) {
    const spiders = this.scene.spiders;
    for (const spider of spiders) {
      if (spider.dead && time >= spider.respawnAt) spider.reset(time);
      if (spider.dead || spider.weapon) continue;
      const p = spider.body.position;
      for (const pickup of this.pickups) {
        if (time < pickup.availableAt || Math.hypot(p.x - pickup.x, p.y - pickup.y) > COMBAT.pickupRadius) continue;
        if (raycast(this.scene.solids, p, pickup)) continue;
        spider.weapon = createWeapon(pickup.type);
        pickup.availableAt = time + COMBAT.weaponRespawnMs;
        this.scene.pulse(pickup.x, pickup.y, spider.color);
        break;
      }
    }
    for (const swing of this.swings) {
      if (swing.owner.dead || time > swing.end) continue;
      const p = swing.owner.body.position;
      for (const target of spiders) {
        if (target === swing.owner || target.dead || swing.hit.has(target.id)) continue;
        const q = target.body.position, dx = q.x - p.x, dy = q.y - p.y;
        const distance = Math.hypot(dx, dy);
        const dot = (dx * swing.aim.x + dy * swing.aim.y) / Math.max(1, distance);
        if (distance > COMBAT.sword.reach + GAMEPLAY.radius || dot < Math.cos(COMBAT.sword.halfAngle)) continue;
        if (raycast(this.scene.solids, p, q)) continue;
        swing.hit.add(target.id);
        this.damage(target, swing.owner, swing.aim, 'sword', time);
      }
    }
    this.swings = this.swings.filter((s) => time < s.end && !s.owner.dead);
    this.projectiles = this.projectiles.filter((shot) => {
      if (time >= shot.expires) return false;
      const start = { x: shot.x, y: shot.y };
      const step = COMBAT.pistol.speed * GAMEPLAY.fixedStep / 1000;
      const end = { x: shot.x + shot.aim.x * step, y: shot.y + shot.aim.y * step };
      const targets = spiders.filter((s) => s !== shot.owner && !s.dead);
      const hit = raycast([...this.scene.solids, ...targets.map((s) => s.body)], start, end);
      if (hit) {
        const target = targets.find((s) => s.body === hit.body);
        if (target) this.damage(target, shot.owner, shot.aim, 'pistol', time);
        this.burst(hit.x, hit.y, shot.owner.color, time, 7);
        return false;
      }
      shot.x = end.x; shot.y = end.y;
      return true;
    });
    this.sparks = this.sparks.filter((s) => time < s.end);
  }
  drawWeapon(g, type, x, y, angle, color, alpha = 1) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const end = type === 'sword' ? COMBAT.sword.reach - 20 : 22;
    g.lineStyle(type === 'sword' ? 11 : 9, 0x09101d, alpha)
      .lineBetween(x - dx * 7, y - dy * 7, x + dx * 9, y + dy * 9);
    g.lineStyle(type === 'sword' ? 12 : 10, color, 0.1 * alpha)
      .lineBetween(x + dx * 10, y + dy * 10, x + dx * end, y + dy * end);
    g.lineStyle(type === 'sword' ? 3 : 5, color, alpha)
      .lineBetween(x + dx * 10, y + dy * 10, x + dx * end, y + dy * end);
    if (type === 'sword') g.lineStyle(1, 0xffffff, alpha * 0.8)
      .lineBetween(x + dx * 10, y + dy * 10, x + dx * end, y + dy * end);
  }
  draw(time) {
    const g = this.graphics; g.clear();
    for (const pickup of this.pickups) {
      const available = time >= pickup.availableAt;
      if (!available && pickup.availableAt - time > COMBAT.spawnPreviewMs) continue;
      const color = pickup.type === 'sword' ? 0xc1ff89 : 0xffd579;
      const alpha = available ? 0.8 : 0.2 + Math.sin(time * 0.02) * 0.1;
      g.lineStyle(1, color, alpha * 0.5).strokeEllipse(pickup.x, pickup.y + 19, 45, 12);
      this.drawWeapon(g, pickup.type, pickup.x - 12, pickup.y + Math.sin(time * 0.004) * 3,
        -Math.PI / 4, color, alpha);
    }
    for (const spider of this.scene.spiders) {
      if (spider.dead || !spider.weapon) continue;
      const p = spider.body.position;
      const swing = this.swings.find((s) => s.owner === spider);
      const aim = swing?.aim ?? spider.aim;
      let angle = Math.atan2(aim.y, aim.x);
      if (swing) angle += -COMBAT.sword.halfAngle + (time - swing.start) / COMBAT.sword.durationMs * COMBAT.sword.halfAngle * 2;
      this.drawWeapon(g, spider.weapon.type, p.x + Math.cos(angle) * 20,
        p.y + Math.sin(angle) * 20, angle, spider.color);
      if (swing) g.lineStyle(10, spider.color, 0.12).beginPath()
        .arc(p.x, p.y, COMBAT.sword.reach - 15, angle - 0.4, angle).strokePath();
    }
    for (const shot of this.projectiles) {
      g.lineStyle(10, shot.owner.color, 0.12).lineBetween(shot.x, shot.y, shot.x - shot.aim.x * 17, shot.y - shot.aim.y * 17);
      g.lineStyle(3, shot.owner.accentColor, 0.95).lineBetween(shot.x, shot.y, shot.x - shot.aim.x * 12, shot.y - shot.aim.y * 12);
    }
    for (const spark of this.sparks) {
      const age = (time - spark.born) / GAMEPLAY.fixedStep;
      g.fillStyle(spark.color, Math.max(0, 1 - (time - spark.born) / (spark.end - spark.born)))
        .fillCircle(spark.x + spark.vx * age, spark.y + spark.vy * age + age * age * 0.04, 2);
    }
  }
}
