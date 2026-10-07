import Phaser from 'phaser';
import Spider from './Spider.js';
import WebSystem from './WebSystem.js';
import { GAMEPLAY, COLORS } from './config.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('cavern'); }

  create() {
    this.solids = [];
    this.trail = [];
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
    this.spider = new Spider(this);
    this.web = new WebSystem(this, this.spider);
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE,R,F1');
    this.input.keyboard.addCapture(['SPACE', 'F1']);
    for (const key of [this.keys.W, this.keys.SPACE]) {
      key.on('down', (event) => { if (!event.repeat) this.spider.queueJump(this.simTime); });
    }
    this.keys.R.on('down', () => this.spider.reset(this.web));
    this.keys.F1.on('down', (event) => {
      if (event.repeat) return;
      this.debug = !this.debug;
      document.getElementById('debug-info').hidden = !this.debug;
    });
    const camera = this.cameras.main;
    camera.setBounds(0, 0, GAMEPLAY.worldWidth, GAMEPLAY.worldHeight);
    this.cameraTarget = { x: GAMEPLAY.spawn.x, y: GAMEPLAY.spawn.y - 80 };
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
    this.keys.A.reset();
    this.keys.D.reset();
    this.spider.jumpQueuedUntil = -Infinity;
    this.accumulator = 0;
  }

  fitView() {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.scale.width / 1440, 0.65, 1.15));
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
    // Bound catch-up after tab suspension; Matter always receives a fixed delta.
    this.accumulator += Math.min(delta, 83.34);
    while (this.accumulator >= GAMEPLAY.fixedStep) {
      this.simTime += GAMEPLAY.fixedStep;
      const direction = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
      this.spider.step(this.simTime, direction, this.web);
      this.web.beforeStep();
      this.matter.world.step(GAMEPLAY.fixedStep);
      this.accumulator -= GAMEPLAY.fixedStep;
    }
    this.spider.draw(delta);
    const p = this.spider.body.position;
    const v = this.spider.body.velocity;
    this.cameraTarget.x = p.x + Phaser.Math.Clamp(v.x * GAMEPLAY.cameraLookAhead, -140, 140);
    this.cameraTarget.y = p.y - 80 + Phaser.Math.Clamp(v.y * 4, -65, 65);
    this.web.draw(time);
    this.drawEffects(time, p, v);
    this.drawDebug();
  }

  drawEffects(time, p, v) {
    const river = this.river;
    river.clear().fillStyle(COLORS.magenta, 0.035).fillRect(75, GAMEPLAY.riverY - 30, 2850, 90);
    river.fillStyle(0x501d67, 0.5).fillRect(75, GAMEPLAY.riverY + 2, 2850, 45);
    river.lineStyle(2, COLORS.magenta, 0.7);
    const wave = [];
    for (let x = 75; x <= 2925; x += 15) wave.push({ x, y: GAMEPLAY.riverY + Math.sin(x * 0.017 + time * 0.002) * 4 });
    river.strokePoints(wave);
    river.lineStyle(1, COLORS.magenta, 0.12).lineBetween(75, GAMEPLAY.riverY + 15, 2925, GAMEPLAY.riverY + 15);
    if (Math.hypot(v.x, v.y) > 10) this.trail.push({ x: p.x, y: p.y, time });
    this.trail = this.trail.filter((point) => time - point.time < 250).slice(-18);
    const g = this.effects;
    g.clear();
    this.trail.forEach((point, i) => {
      const alpha = (1 - (time - point.time) / 250) * 0.2;
      g.fillStyle(COLORS.cyan, alpha).fillCircle(point.x, point.y, 2 + i / 12);
      if (i) g.lineStyle(2, COLORS.cyan, alpha * 0.5).lineBetween(this.trail[i - 1].x, this.trail[i - 1].y, point.x, point.y);
    });
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
      `MATTER / FIXED 60 Hz\nPOS ${p.x.toFixed(0)}, ${p.y.toFixed(0)}\nVEL ${v.x.toFixed(2)}, ${v.y.toFixed(2)}\nSPEED ${Math.hypot(v.x, v.y).toFixed(2)}\nGROUND ${this.spider.grounded}\nROPE ${this.web.constraint?.length.toFixed(1) ?? '—'}`;
  }
}
