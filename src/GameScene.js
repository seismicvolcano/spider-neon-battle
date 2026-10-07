import Phaser from 'phaser';
import Spider from './Spider.js';
import WebSystem from './WebSystem.js';
import InputSystem from './InputSystem.js';
import CombatSystem from './CombatSystem.js';
import EnemyAI from './EnemyAI.js';
import { GAMEPLAY, COLORS, FIGHTERS, CAMERA, COMBAT } from './config.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('cavern'); }

  create() {
    this.solids = [];
    this.accumulator = 0;
    this.simTime = 0;
    this.debug = false;
    this.matter.world.autoUpdate = false;
    this.matter.world.setGravity(0, GAMEPLAY.gravity);
    this.background();
    this.terrain = this.add.graphics().setDepth(1);
    this.buildArena();
    this.effects = this.add.graphics().setDepth(6);
    this.debugGraphics = this.add.graphics().setDepth(20);
    this.spider = new Spider(this, FIGHTERS.player);
    this.enemy = new Spider(this, FIGHTERS.enemy);
    this.spiders = [this.spider, this.enemy];
    for (const spider of this.spiders) spider.web = new WebSystem(this, spider);
    this.web = this.spider.web;
    this.combat = new CombatSystem(this);
    this.controls = new InputSystem(this);
    this.ai = new EnemyAI(this, this.enemy, this.spider);
    this.keys = this.controls.keys;
    this.paused = false; this.winner = null;
    this.keys.F1.on('down', (event) => {
      if (event.repeat) return;
      this.debug = !this.debug;
      document.getElementById('debug-info').hidden = !this.debug;
    });
    const camera = this.cameras.main;
    camera.setBounds(0, 0, GAMEPLAY.worldWidth, GAMEPLAY.worldHeight);
    this.cameraTarget = { x: (this.spider.x + this.enemy.x) / 2, y: this.spider.y - CAMERA.verticalOffset };
    camera.startFollow(this.cameraTarget, false, GAMEPLAY.cameraLerp, GAMEPLAY.cameraLerp);
    camera.centerOn(this.cameraTarget.x, this.cameraTarget.y);
    this.scale.on('resize', this.fitView, this);
    this.fitView();
    this.game.events.on('blur', this.onBlur, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fitView, this);
      this.game.events.off('blur', this.onBlur, this);
    });
  }

  onBlur() {
    this.controls.clear();
    if (!this.winner) { this.paused = true; this.tweens.pauseAll(); }
    this.accumulator = 0;
  }

  fitView() {
    this.baseZoom = Phaser.Math.Clamp(this.scale.width / 1440, 0.65, CAMERA.maxZoom);
    this.cameras.main.setZoom(this.baseZoom);
  }

  finishMatch(winner) {
    this.winner = winner;
    for (const spider of this.spiders) { spider.web.release(); spider.webHeld = false; }
    this.accumulator = 0;
  }

  restartMatch() {
    this.winner = null; this.paused = false; this.simTime = 0; this.accumulator = 0;
    this.combat.reset();
    for (const spider of this.spiders) { spider.score = 0; spider.reset(0); }
    this.ai.reset(); this.tweens.resumeAll();
  }

  updateHud() {
    const hearts = (s) => '♥'.repeat(s.hearts) + '♡'.repeat(COMBAT.hearts - s.hearts);
    const weapon = (s) => s.dead ? 'RESPAWNING…' : !s.weapon ? 'FIND A WEAPON' :
      s.weapon.type === 'pistol' ? `LASER PISTOL · ${s.weapon.ammo}/${COMBAT.pistol.ammo}` : 'LASER SWORD';
    document.getElementById('cyan-hearts').textContent = hearts(this.spider);
    document.getElementById('magenta-hearts').textContent = hearts(this.enemy);
    document.getElementById('cyan-weapon').textContent = weapon(this.spider);
    document.getElementById('magenta-weapon').textContent = weapon(this.enemy);
    document.getElementById('score').textContent = `${this.spider.score} — ${this.enemy.score}`;
    document.getElementById('pad-status').textContent = this.controls.status;
    document.getElementById('web-status').textContent = this.web.attached ? 'WEB: ATTACHED' :
      this.simTime < this.web.missedUntil ? 'WEB: OUT OF REACH' : 'WEB: READY';
    document.getElementById('web-detail').textContent = this.web.attached ? 'RELEASE LT TO FLY' : 'AIM AT A SOLID SURFACE';
    const overlay = document.getElementById('match-overlay');
    overlay.hidden = !this.winner && !this.paused;
    document.getElementById('match-title').textContent = this.winner ? `${this.winner.id.toUpperCase()} WINS` : 'PAUSED';
    document.getElementById('match-hint').textContent = this.winner ? 'A / SPACE · PLAY AGAIN' : 'MENU / ESC · RESUME';
  }

  background() {
    const g = this.add.graphics().setDepth(-4).setScrollFactor(0.88);
    const random = new Phaser.Math.RandomDataGenerator(['neon-cavern-v01']);
    g.fillStyle(0x0b1021).fillRect(-500, -400, 4000, 2800);
    for (let i = 0; i < 28; i++) {
      const x = random.between(0, 3300);
      const y = random.between(0, 2100);
      g.fillStyle(i % 2 ? 0x0e1528 : 0x0b1424, 0.8);
      g.fillPoints([{ x, y: y - 260 }, { x: x + 140, y: y - 130 }, { x: x + 100, y: y + 340 },
        { x: x - 80, y: y + 490 }, { x: x - 120, y: y + 40 }], true);
    }
    g.lineStyle(1, 0x25485d, 0.13);
    for (let x = 140; x < 3300; x += 280) {
      g.lineBetween(x, 130, x, 1860);
      for (let y = 200; y < 1900; y += 160) g.lineBetween(x - 6, y, x + 6, y);
    }
    for (let i = 0; i < 120; i++) {
      const x = random.between(90, 3200);
      const y = random.between(130, 2000);
      g.fillStyle(i % 4 ? 0x4eacbc : COLORS.magenta, random.realInRange(0.1, 0.35));
      g.fillRect(x, y, 2, i % 3 ? 2 : 8);
    }
    for (const [x, y] of [[180, 1320], [740, 1700], [2100, 1590], [2550, 750], [1200, 400]]) {
      g.lineStyle(2, 0x25314f, 0.5).strokeRect(x, y, 80, 130);
      g.lineStyle(1, COLORS.cyan, 0.15).lineBetween(x + 12, y + 20, x + 65, y + 20);
      g.fillStyle(COLORS.cyan, 0.25).fillRect(x + 12, y + 35, 3, 3);
      g.lineStyle(3, 0x1d2941, 0.5).lineBetween(x + 40, y - 170, x + 40, y);
    }
    this.add.text(1080, 1450, 'CORE / 07', { fontFamily: 'Consolas, monospace', fontSize: '65px', color: '#223047' })
      .setAlpha(0.35).setDepth(-2);
  }

  rectangle(x, y, width, height, angle = 0, color = COLORS.cyan) {
    const body = this.matter.add.rectangle(x, y, width, height, {
      isStatic: true, angle, label: 'cavern-surface', friction: 0.1,
    });
    this.solids.push(body);
    this.drawSolid(body, color);
    return body;
  }

  drawSolid(body, color, crystal = false) {
    const g = this.terrain;
    const points = body.vertices.map(({ x, y }) => ({ x, y }));
    g.fillStyle(crystal ? 0x381849 : COLORS.rock).fillPoints(points, true);
    g.lineStyle(crystal ? 13 : 8, color, 0.025).strokePoints(points, true);
    g.lineStyle(crystal ? 5 : 4, color, 0.075).strokePoints(points, true);
    g.lineStyle(1.4, color, crystal ? 0.8 : 0.55).strokePoints(points, true);
    if (!crystal) {
      const a = points[0];
      const b = points[1];
      g.lineStyle(2, color, 0.65).lineBetween(a.x, a.y, b.x, b.y);
      if (body.bounds.max.x - body.bounds.min.x > 100) {
        const cx = body.position.x;
        const cy = body.position.y;
        g.lineStyle(1, 0x415268, 0.3).lineBetween(cx - 22, cy - 4, cx + 22, cy - 4);
        g.fillStyle(color, 0.45).fillRect(cx - 4, cy + 4, 8, 2);
      }
    }
  }

  buildArena() {
    const C = COLORS;
    this.rectangle(1500, 25, 3000, 110, 0, C.violet);
    this.rectangle(25, 950, 100, 1900, 0, C.violet);
    this.rectangle(2975, 950, 100, 1900, 0, C.violet);
    this.rectangle(1500, 1885, 3000, 90, 0, C.magenta);
    this.rectangle(340, 1540, 560, 80);
    this.rectangle(150, 1705, 220, 330, -0.13, C.violet);
    this.rectangle(815, 1680, 350, 90, -0.12, C.violet);
    this.rectangle(1210, 1720, 210, 75, 0.18);
    this.rectangle(1455, 1750, 300, 55, -0.08, C.violet);
    this.rectangle(1735, 1660, 270, 65, -0.17, C.magenta);
    this.rectangle(2300, 1550, 500, 80);
    this.rectangle(2780, 1745, 350, 240, 0.13, C.violet);
    // Long open arcs between suspended structures, plus smaller landing shelves.
    this.rectangle(440, 1000, 470, 52);
    this.rectangle(1015, 820, 270, 80, 0.1, C.violet);
    this.rectangle(2050, 850, 420, 65, -0.07);
    this.rectangle(2590, 1110, 370, 60, 0.12, C.magenta);
    this.rectangle(890, 1530, 240, 40);
    this.rectangle(1940, 1340, 230, 45);
    this.rectangle(120, 1190, 155, 55, 0, C.violet);
    this.rectangle(2850, 810, 240, 55, 0, C.violet);
    this.rectangle(670, 370, 65, 510, 0, C.violet);
    this.rectangle(810, 650, 355, 50);
    this.rectangle(1370, 420, 400, 70, -0.13, C.magenta);
    this.rectangle(1810, 235, 90, 320, 0.13, C.violet);
    this.rectangle(2300, 430, 330, 55);
    this.rectangle(2500, 295, 65, 380, 0, C.violet);
    this.rectangle(290, 350, 250, 55, 0.1);
    const crystal = this.matter.add.fromVertices(1500, 1020, [
      { x: 0, y: -285 }, { x: 118, y: -110 }, { x: 90, y: 165 },
      { x: 0, y: 270 }, { x: -95, y: 145 }, { x: -125, y: -100 },
    ], { isStatic: true, label: 'energy-crystal', friction: 0.1 });
    this.solids.push(crystal);
    this.drawSolid(crystal, C.magenta, true);
    const v = crystal.vertices;
    const center = crystal.position;
    const g = this.terrain;
    g.fillStyle(C.magenta, 0.14).fillTriangle(v[0].x, v[0].y, center.x + 15, center.y, v[5].x, v[5].y);
    g.fillStyle(0xf9b4ff, 0.18).fillTriangle(v[0].x, v[0].y, center.x + 15, center.y, v[1].x, v[1].y);
    g.lineStyle(2, 0xf7a7ff, 0.6).lineBetween(v[0].x, v[0].y, center.x + 15, center.y);
    g.lineBetween(center.x + 15, center.y, v[3].x, v[3].y);
    g.lineStyle(1, C.magenta, 0.35).strokeCircle(center.x, center.y, 165);
    g.lineStyle(1, C.magenta, 0.12).strokeCircle(center.x, center.y, 181);
    this.add.text(center.x, center.y + 340, 'N E O N   C O R E', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#966eb5',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(255, 1587, '01 / LAUNCH DECK', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#578795',
    }).setDepth(2);
    this.add.text(315, 1230, 'JUMP. ATTACH. SWING. RELEASE.', {
      fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#435c73',
    }).setDepth(-1);
    this.river = this.add.graphics().setDepth(3);
  }

  pulse(x, y, color, radius = 35) {
    const g = this.add.graphics().setDepth(11);
    const pulse = { radius: 4, alpha: 0.8 };
    this.tweens.add({ targets: pulse, radius, alpha: 0, duration: 420,
      onUpdate: () => { g.clear().lineStyle(1.5, color, pulse.alpha).strokeCircle(x, y, pulse.radius); },
      onComplete: () => g.destroy() });
  }

  update(time, delta) {
    this.controls.poll();
    const action = this.controls.consume();
    if (this.winner && (action.jumpPressed || action.resetPressed)) this.restartMatch();
    else if (action.resetPressed) this.restartMatch();
    else if (!this.winner && action.pausePressed) {
      this.paused = !this.paused; this.accumulator = 0;
      if (this.paused) { this.controls.clear(); this.tweens.pauseAll(); }
      else this.tweens.resumeAll();
    }
    // Bound catch-up after tab suspension; Matter always receives a fixed delta.
    if (!this.paused && !this.winner) this.accumulator += Math.min(delta, 83.34);
    // Retain jump edges if this render frame contains no simulation tick.
    if (this.accumulator < GAMEPLAY.fixedStep && !this.paused && !this.winner)
      this.controls.pending.jumpPressed ||= action.jumpPressed;
    while (!this.paused && !this.winner && this.accumulator >= GAMEPLAY.fixedStep) {
      this.simTime += GAMEPLAY.fixedStep;
      this.spider.act(this.simTime, action);
      this.enemy.act(this.simTime, this.ai.sample(this.simTime));
      action.jumpPressed = false;
      this.matter.world.step(GAMEPLAY.fixedStep);
      this.combat.step(this.simTime);
      this.accumulator -= GAMEPLAY.fixedStep;
    }
    for (const spider of this.spiders) { spider.draw(this.paused || this.winner ? 0 : delta); spider.web.draw(); }
    const p = this.spider.body.position, q = this.enemy.body.position;
    this.cameraTarget.x = (p.x + q.x) / 2;
    this.cameraTarget.y = (p.y + q.y) / 2 - CAMERA.verticalOffset;
    const desired = Phaser.Math.Clamp(Math.min(this.baseZoom,
      this.scale.width / (Math.abs(p.x - q.x) + CAMERA.paddingX),
      this.scale.height / (Math.abs(p.y - q.y) + CAMERA.paddingY)), CAMERA.minZoom, CAMERA.maxZoom);
    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Linear(camera.zoom, desired, 1 - Math.pow(1 - CAMERA.zoomLerp, delta / GAMEPLAY.fixedStep)));
    this.combat.draw(this.simTime);
    this.drawEffects(this.simTime);
    this.drawDebug();
    this.updateHud();
  }

  drawEffects(time) {
    const river = this.river;
    river.clear().fillStyle(COLORS.magenta, 0.035).fillRect(75, GAMEPLAY.riverY - 30, 2850, 90);
    river.fillStyle(0x501d67, 0.5).fillRect(75, GAMEPLAY.riverY + 2, 2850, 45);
    river.lineStyle(2, COLORS.magenta, 0.7);
    const wave = [];
    for (let x = 75; x <= 2925; x += 15) wave.push({ x, y: GAMEPLAY.riverY + Math.sin(x * 0.017 + time * 0.002) * 4 });
    river.strokePoints(wave);
    river.lineStyle(1, COLORS.magenta, 0.12).lineBetween(75, GAMEPLAY.riverY + 15, 2925, GAMEPLAY.riverY + 15);
    const g = this.effects;
    g.clear();
    for (const spider of this.spiders) {
      const p = spider.body.position, v = spider.body.velocity;
      if (!spider.dead && !this.paused && !this.winner && Math.hypot(v.x, v.y) > 10)
        spider.trail.push({ x: p.x, y: p.y, time });
      spider.trail = spider.trail.filter((point) => time - point.time < 250).slice(-18);
      spider.trail.forEach((point, i) => {
        const alpha = (1 - (time - point.time) / 250) * 0.2;
        g.fillStyle(spider.color, alpha).fillCircle(point.x, point.y, 2 + i / 12);
        if (i) g.lineStyle(2, spider.color, alpha * 0.5)
          .lineBetween(spider.trail[i - 1].x, spider.trail[i - 1].y, point.x, point.y);
      });
    }
  }

  drawDebug() {
    const g = this.debugGraphics;
    g.clear();
    if (!this.debug) return;
    for (const body of this.solids) g.lineStyle(1, 0x64ff96, 0.65).strokePoints(body.vertices, true);
    const p = this.spider.body.position;
    const v = this.spider.body.velocity;
    g.lineStyle(1, 0x64ff96).strokeCircle(p.x, p.y, GAMEPLAY.radius);
    g.lineStyle(2, 0xffdf6b).lineBetween(p.x, p.y, p.x + v.x * 10, p.y + v.y * 10);
    const ray = this.web.target();
    g.lineStyle(1, 0xffb96b, 0.45).lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    if (ray.hit) g.lineStyle(1, 0xffb96b).strokeCircle(ray.hit.x, ray.hit.y, 7);
    if (this.web.anchor) {
      g.lineStyle(2, 0xff73da).lineBetween(p.x, p.y, this.web.anchor.x, this.web.anchor.y);
      g.strokeCircle(this.web.anchor.x, this.web.anchor.y, 11);
    }
    document.getElementById('debug-info').textContent =
      `MATTER / FIXED 60 Hz · ${this.controls.source}\nPOS ${p.x.toFixed(0)}, ${p.y.toFixed(0)}\nVEL ${v.x.toFixed(2)}, ${v.y.toFixed(2)}\nSPEED ${Math.hypot(v.x, v.y).toFixed(2)}\nGROUND ${this.spider.grounded}\nROPE ${this.web.constraint?.length.toFixed(1) ?? '—'}\nAIM ${this.spider.aim.x.toFixed(2)}, ${this.spider.aim.y.toFixed(2)}\nAI POS ${this.enemy.x.toFixed(0)}, ${this.enemy.y.toFixed(0)}`;
  }
}
