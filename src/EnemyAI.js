import { AI, COMBAT } from './config.js';
import { neutralAction, aimDirection } from './actions.js';
import { raycast } from './raycast.js';

export default class EnemyAI {
  constructor(scene, spider, target) {
    this.scene = scene; this.spider = spider; this.target = target;
    this.reset();
  }
  reset() {
    this.nextThink = this.nextJump = this.nextShot = 0;
    this.nextWeb = AI.webIntervalMs; this.webUntil = 0;
    this.goal = { ...this.target.body.position }; this.aim = { x: -1, y: 0 };
  }
  sample(time) {
    const spider = this.spider, p = spider.body.position;
    if (spider.dead || this.target.dead) return neutralAction(this.aim);
    if (time >= this.nextThink) {
      this.nextThink = time + AI.reactionMs;
      const target = this.target.body.position;
      this.goal = { ...target };
      if (!spider.weapon) {
        const pickups = this.scene.combat.pickups.filter((w) => time >= w.availableAt)
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        if (pickups[0]) this.goal = { x: pickups[0].x, y: pickups[0].y };
      }
      const error = (Math.random() * 2 - 1) * AI.aimErrorRad;
      const angle = Math.atan2(target.y - p.y, target.x - p.x) + error;
      this.aim = { x: Math.cos(angle), y: Math.sin(angle) };
    }
    const action = neutralAction(this.aim), dx = this.goal.x - p.x;
    action.moveX = Math.abs(dx) > (spider.weapon ? AI.stopDistance : COMBAT.pickupRadius * 0.5)
      ? Math.sign(dx) * AI.moveStrength : 0;
    const obstacle = raycast(this.scene.solids, { x: p.x, y: p.y + 4 },
      { x: p.x + Math.sign(dx) * AI.obstacleProbe, y: p.y + 4 });
    if (spider.grounded && time >= this.nextJump && (this.goal.y < p.y - AI.higherTarget || obstacle)) {
      action.jumpPressed = true; this.nextJump = time + AI.jumpCooldownMs;
    }
    if (time >= this.nextWeb && !spider.grounded && Math.abs(dx) > AI.stopDistance * 3) {
      this.nextWeb = time + AI.webIntervalMs;
      const webAim = aimDirection(Math.sign(dx) * 0.6, -1);
      if (spider.web.target(webAim).hit) {
        this.webUntil = time + AI.webHoldMs;
        action.aimX = webAim.x; action.aimY = webAim.y;
      }
    }
    action.webHeld = time < this.webUntil;
    const target = this.target.body.position;
    const distance = Math.hypot(target.x - p.x, target.y - p.y);
    const visible = !raycast(this.scene.solids, p, target);
    if (spider.weapon?.type === 'sword') action.attackHeld = visible && distance < AI.swordRange;
    if (spider.weapon?.type === 'pistol' && visible && distance < AI.attackRange && time >= this.nextShot && !action.webHeld) {
      action.attackHeld = true; this.nextShot = time + AI.pistolFireMs;
    }
    return action;
  }
}
