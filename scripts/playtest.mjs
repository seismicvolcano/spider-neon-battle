// Optional browser integration check. Start npm run dev first; requires Playwright + Chrome.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.testPad = null;
    navigator.getGamepads = () => window.testPad ? [window.testPad] : [];
  });
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173');
  await page.waitForFunction(() => window.__spiderGame?.scene.getScene('cavern')?.controls);
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.__spiderGame.scene.getScene('cavern').spider.body.position.x > 350);
  await page.keyboard.up('d');
  const results = await page.evaluate(async () => {
    const s = window.__spiderGame.scene.getScene('cavern');
    s.game.loop.sleep();
    const { createWeapon } = await import('/src/weaponState.js');
    const { neutralAction } = await import('/src/actions.js');
    const { COMBAT, GAMEPLAY, CAMERA } = await import('/src/config.js');
    const results = [];
    const check = (value, label) => { if (!value) throw new Error(label); results.push(label); };
    const setPad = (axes = [0, 0, 1, 0], values = {}) => {
      window.testPad = { id: 'Simulated Xbox', index: 0, connected: true, mapping: 'standard',
        timestamp: performance.now(), axes,
        buttons: Array.from({ length: 17 }, (_, i) => ({ value: values[i] ?? 0,
          pressed: (values[i] ?? 0) > 0.5, touched: (values[i] ?? 0) > 0 })) };
    };
    const tick = (n = 1) => { for (let i = 0; i < n; i++) s.update(0, GAMEPLAY.fixedStep); };
    const bodyAt = (spider, x, y) => {
      s.matter.body.setPosition(spider.body, { x, y });
      s.matter.body.setVelocity(spider.body, { x: 0, y: 0 });
    };
    const realAI = s.ai.sample.bind(s.ai);
    s.ai.sample = () => neutralAction({ x: -1, y: 0 });
    s.restartMatch(); setPad(); tick(5);
    check(s.controls.source === 'gamepad', 'Standard Gamepad API takes priority');
    setPad([1, 0, 1, 0]); tick(18);
    check(s.spider.body.position.x > 390 && s.spider.weapon?.type === 'sword', 'LS movement + automatic platform pickup');
    setPad([0, 0, 0.6, -0.8]); tick();
    setPad([0, 0, 0, 0]); tick();
    check(Math.abs(s.spider.aim.x - 0.6) < 1e-9 && Math.abs(s.spider.aim.y + 0.8) < 1e-9, 'RS keeps last normalized aim');
    setPad([0, 0, 0, -1], { 0: 1 }); tick();
    check(s.spider.body.velocity.y < -10, 'A jump uses buffered locomotion');
    const firstJump = s.spider.jumpQueuedUntil; tick(8);
    check(s.spider.jumpQueuedUntil === firstJump, 'Holding A does not requeue jump');
    setPad([0.7, 0, 0, -1], { 6: 1 }); tick();
    const constraint = s.web.constraint;
    check(!!constraint, 'LT attaches exact surface'); tick(15);
    check(s.web.constraint === constraint, 'Holding LT keeps the same constraint');
    const anchor = { ...s.web.anchor };
    s.matter.body.setPosition(s.spider.body, { x: anchor.x, y: anchor.y + constraint.length * 0.5 });
    s.web.beforeStep();
    check(constraint.stiffness === 0 && constraint.damping === 0, 'Slack rope never pushes');
    s.matter.body.setPosition(s.spider.body, { x: anchor.x, y: anchor.y + constraint.length + 1 });
    s.web.beforeStep();
    check(constraint.stiffness === GAMEPLAY.webStiffness, 'Taut rope pulls with original stiffness');
    s.spider.weapon = createWeapon('pistol');
    setPad([0.7, 0, 1, 0], { 6: 1, 7: 1 }); tick();
    check(s.web.constraint === constraint && s.spider.weapon.ammo === 9 && s.spider.body.velocity.x > 0,
      'LT + RS + LS + RT work simultaneously');
    const before = { ...s.spider.body.velocity };
    s.web.release();
    check(Math.abs(s.spider.body.velocity.x - before.x) < 1e-9 && Math.abs(s.spider.body.velocity.y - before.y) < 1e-9,
      'Web release preserves exact Matter momentum');
    s.spider.webHeld = false;
    setPad([0, 0, 0, -1], { 6: 1 }); tick();
    check(s.web.attached, 'Web can reattach after release');
    setPad([0, 0, 0, -1]); tick(); check(!s.web.attached, 'Releasing LT releases rope');
    setPad([0, 0, 0, -1], { 6: 1 }); tick();
    window.testPad = null; tick();
    check(!s.web.attached && s.controls.source === 'keyboard' && s.controls.pending.moveX === 0,
      'Disconnect releases rope and clears held inputs');

    s.restartMatch(); setPad(); tick(2);
    bodyAt(s.spider, 360, 1480); bodyAt(s.enemy, 430, 1480);
    s.spider.invulnerableUntil = s.enemy.invulnerableUntil = 0;
    s.spider.weapon = createWeapon('sword');
    setPad([0, 0, 1, 0], { 7: 1 }); tick();
    check(s.enemy.hearts === 2 && s.enemy.body.velocity.x > 8, 'RT sword removes a heart and adds strong knockback');
    const damageProtection = s.enemy.invulnerableUntil;
    s.enemy.invulnerableUntil = 0;
    bodyAt(s.enemy, 430, 1480); tick(6);
    check(s.enemy.hearts === 2, 'One swing hits once and damage grants invulnerability');
    s.enemy.invulnerableUntil = damageProtection;
    setPad();
    check(!s.combat.damage(s.enemy, s.spider, { x: 1, y: 0 }, 'pistol', s.simTime), 'Invulnerability blocks a second weapon');
    s.enemy.invulnerableUntil = 0;
    s.combat.damage(s.enemy, s.spider, { x: 1, y: 0 }, 'pistol', s.simTime);
    s.enemy.invulnerableUntil = 0;
    s.combat.damage(s.enemy, s.spider, { x: 1, y: 0 }, 'pistol', s.simTime);
    check(s.enemy.dead && s.spider.score === 1 && !s.enemy.web.attached, 'Three hearts trigger death, score and rope removal');
    tick(Math.ceil(COMBAT.respawnMs / GAMEPLAY.fixedStep) + 2);
    check(!s.enemy.dead && s.enemy.hearts === 3 && s.enemy.invulnerableUntil > s.simTime && !s.enemy.body.isStatic,
      'Respawn restores hearts, dynamic body and spawn invulnerability');

    s.restartMatch(); setPad(); tick(2);
    bodyAt(s.spider, 350, 1480); bodyAt(s.enemy, 500, 1480);
    s.enemy.invulnerableUntil = 0; s.spider.weapon = createWeapon('pistol');
    setPad([0, 0, 1, 0], { 7: 1 }); tick(); setPad(); tick(12);
    check(s.enemy.hearts === 2, 'Laser projectile hits opposing Matter body');
    s.enemy.invulnerableUntil = 0; s.spider.invulnerableUntil = 0;
    s.combat.damage(s.spider, s.enemy, { x: -1, y: 0 }, 'pistol', s.simTime);
    check(s.spider.hearts === 2 && s.spider.body.velocity.x < 0, 'Player receives damage and moderate laser knockback');
    for (let i = 0; i < 2; i++) {
      s.spider.invulnerableUntil = 0;
      s.combat.damage(s.spider, s.enemy, { x: -1, y: 0 }, 'pistol', s.simTime);
    }
    check(s.spider.dead && s.enemy.score === 1, 'Player death awards enemy a point');
    tick(Math.ceil(COMBAT.respawnMs / GAMEPLAY.fixedStep) + 2);
    check(!s.spider.dead && s.spider.hearts === 3, 'Player respawns with restored hearts');
    // A real cavern platform sits between this shot and the target.
    s.combat.projectiles.length = 0;
    bodyAt(s.spider, 350, 1450); bodyAt(s.enemy, 350, 1600);
    const health = s.enemy.hearts;
    s.spider.weapon = createWeapon('pistol');
    setPad([0, 0, 0, 1], { 7: 1 }); tick(); setPad(); tick(8);
    check(s.enemy.hearts === health && s.combat.projectiles.length === 0, 'Geometry blocks and removes laser shots');
    s.spider.weapon = createWeapon('pistol');
    for (let i = 0; i < COMBAT.pistol.ammo; i++) {
      s.spider.weapon.readyAt = 0; s.combat.attack(s.spider, s.simTime);
    }
    check(s.spider.weapon === null, 'Pistol disappears after ten shots');
    const pickup = s.combat.pickups[0]; pickup.availableAt = s.simTime + 100;
    bodyAt(s.spider, pickup.x, pickup.y); s.spider.weapon = null;
    s.combat.step(s.simTime);
    check(s.spider.weapon === null, 'Pickup respects its respawn cooldown');
    s.combat.step(s.simTime + 101);
    check(s.spider.weapon?.type === 'sword', 'Weapon reappears after cooldown');

    s.restartMatch(); setPad([0, 0, 1, 0], { 9: 1 }); tick();
    const pausedTime = s.simTime; tick(10);
    check(s.paused && s.simTime === pausedTime, 'Menu pauses once even when held');
    setPad(); tick(); setPad([0, 0, 1, 0], { 9: 1 }); tick();
    check(!s.paused, 'Second Menu press resumes'); setPad();
    bodyAt(s.spider, 150, 500); bodyAt(s.enemy, 2800, 1600); tick(100);
    check(s.cameras.main.zoom >= CAMERA.minZoom && s.cameras.main.zoom <= CAMERA.maxZoom,
      'Two-fighter camera stays within configured zoom limits');
    s.restartMatch(); setPad(); tick();
    bodyAt(s.spider, 1100, GAMEPLAY.riverY); tick();
    check(s.spider.body.velocity.y < -20 && s.spider.hearts === 3, 'Energy river bounces without fall damage');
    s.restartMatch(); setPad(); tick();
    for (let point = 0; point < COMBAT.scoreToWin; point++) {
      for (let hit = 0; hit < COMBAT.hearts; hit++) {
        s.enemy.invulnerableUntil = 0;
        s.combat.damage(s.enemy, s.spider, { x: 1, y: 0 }, 'sword', s.simTime);
      }
      if (!s.winner) tick(Math.ceil(COMBAT.respawnMs / GAMEPLAY.fixedStep) + 2);
    }
    tick();
    check(s.winner === s.spider && s.spider.score === 3 && document.getElementById('match-title').textContent === 'CYAN WINS',
      'Three points end the match and display winner');
    setPad([0, 0, 1, 0], { 0: 1 }); tick();
    check(!s.winner && s.spider.score === 0 && s.enemy.score === 0 && s.enemy.hearts === 3,
      'A restarts complete match');
    setPad(); s.ai.sample = realAI; s.ai.reset();
    const startX = s.enemy.body.position.x;
    tick(180);
    check(Math.abs(s.enemy.body.position.x - startX) > 60 && s.enemy.weapon?.type === 'pistol' && s.enemy.weapon.ammo < COMBAT.pistol.ammo,
      'Easy AI seeks weapon, moves and fires using shared actions');
    // Ground/coyote/buffer use the original controller with the new ActionState.
    s.restartMatch(); s.ai.sample = () => neutralAction(); setPad(); tick(5);
    s.spider.lastGrounded = s.simTime; bodyAt(s.spider, 630, 1460);
    setPad([0, 0, 1, 0], { 0: 1 }); tick();
    check(s.spider.body.velocity.y < -10, 'Coyote jump still works');
    setPad(); tick(); s.spider.lastGrounded = -Infinity;
    bodyAt(s.spider, 320, 1480); s.matter.body.setVelocity(s.spider.body, { x: 0, y: 1 });
    s.spider.queueJump(s.simTime); tick(3);
    check(s.spider.body.velocity.y < -9, 'Buffered jump still fires on landing');
    setPad([0.4, 0, 1, 0]); s.spider.web.release();
    bodyAt(s.spider, 1000, 1200);
    s.matter.body.setVelocity(s.spider.body, { x: 18, y: 0 });
    tick();
    check(s.spider.body.velocity.x > 17, 'Partial analog air input preserves speed above run cap');
    s.restartMatch(); setPad(); s.ai.sample = realAI; s.ai.reset();
    const random = Math.random;
    let seed = 7;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let webTicks = 0, combatOccurred = false;
    try {
      for (let i = 0; i < 3600 && !s.winner; i++) {
        tick();
        if (s.enemy.web.attached) webTicks++;
        if (s.spider.hearts < COMBAT.hearts || s.enemy.score > 0) combatOccurred = true;
      }
    } finally { Math.random = random; }
    check(webTicks > 0 && combatOccurred, 'One-minute AI simulation traverses ledges, uses web and damages player');
    s.restartMatch(); setPad(); s.ai.sample = realAI; s.game.loop.wake();
    return results;
  });
  results.forEach((result) => console.log(`PASS ${result}`));
  const screenshotPath = process.env.SCREENSHOT_PATH || '.playtest/v02-validated.png';
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  assert.deepEqual(errors, [], 'Browser console should have no errors');
  console.log(`PASS ${results.length} browser checks; no console errors`);
} finally { await browser.close(); }
