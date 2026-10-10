import { test } from 'node:test';
import assert from 'node:assert/strict';
import DeviceAssignments, { padNeutral } from '../src/DeviceAssignments.js';
import { MODES, selectMode, teamFor, opponents, earthquakeCanHit, awardPoint, teamScore } from '../src/matchRules.js';
import { EARTHQUAKE as E, COMBAT } from '../src/config.js';
import EarthquakeSystem, { circleContact } from '../src/EarthquakeSystem.js';
import AudioSystem, { SOUNDS } from '../src/AudioSystem.js';
import Spider from '../src/Spider.js';
import CombatSystem from '../src/CombatSystem.js';

const pad = (index, values = {}) => ({ id: `Xbox ${index}`, index, mapping: 'standard', connected: true,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ value: values[i] ?? 0 })) });
const fighter = (id, mode = 'solo') => ({ id, team: teamFor(mode, id), score: 0, hearts: 3,
  powerCharges: 1, dead: false, invulnerableUntil: 0, body: { position: { x: 600, y: 900 }, velocity: { x: 0, y: 0 } } });
const graphics = () => ({ setDepth() { return this; }, clear() { return this; } });

test('mode selection wraps and contains the four requested lineups', () => {
  assert.deepEqual(MODES.map((m) => [m.id, m.humans, m.ai]),
    [['solo', 1, true], ['duel', 2, false], ['coop', 2, true], ['ffa', 2, true]]);
  assert.equal(selectMode(-1).id, 'ffa'); assert.equal(selectMode(4).id, 'solo');
});
test('assignments use distinct sparse Gamepad.index values and retain disconnected reservations', () => {
  const devices = new DeviceAssignments(), a = pad(2), b = pad(7);
  devices.configure(2, 'auto', [b, null, a]);
  assert.deepEqual(devices.resolve([a, b]).map((r) => r.pad.index), [2, 7]);
  const lost = devices.resolve([b]);
  assert.equal(lost[0].connected, false); assert.equal(lost[1].pad.index, 7);
  assert.equal(devices.resolve([pad(3), b])[0].connected, false);
  assert.deepEqual(devices.resolve([b, a]).map((r) => r.pad.index), [2, 7]);
});
test('one pad + keyboard have one owner each; missing seats bind only unreserved pads', () => {
  const devices = new DeviceAssignments();
  devices.configure(2, 'auto', [pad(4)]);
  assert.deepEqual(devices.seats.map((s) => s.type), ['gamepad', 'keyboard']);
  devices.configure(2, 'mixed', [pad(4), pad(9)]);
  assert.deepEqual(devices.seats.map((s) => s.type), ['gamepad', 'keyboard']);
  devices.configure(2, 'pads', [pad(4)]);
  assert.equal(devices.resolve([pad(4)])[1].connected, false);
  assert.deepEqual(devices.resolve([pad(4), pad(9)]).map((r) => r.pad.index), [4, 9]);
  devices.configure(2, 'auto', []);
  assert.deepEqual(devices.seats.map((s) => s.type), ['keyboard', 'gamepad']);
  assert.equal(padNeutral(pad(0)), true); assert.equal(padNeutral(pad(0, { 6: 1 })), false);
});
test('teams disable allied damage; FFA has three adversaries; earthquake always protects team', () => {
  const a = fighter('cyan', 'coop'), b = fighter('magenta', 'coop'), c = fighter('orange', 'coop');
  assert.equal(opponents(a, b), false); assert.equal(opponents(a, c), true);
  assert.equal(earthquakeCanHit(a, a), false); assert.equal(earthquakeCanHit(a, b), false);
  assert.equal(earthquakeCanHit(a, c), true);
  assert.equal(opponents(a, b, true), true); assert.equal(earthquakeCanHit(a, b), false);
  b.team = teamFor('ffa', b.id); a.team = teamFor('ffa', a.id);
  assert.equal(opponents(a, b), true); assert.equal(earthquakeCanHit(a, b), true);
});
test('individual and cooperative wins require three attributed kills', () => {
  const a = fighter('cyan', 'coop'), b = fighter('magenta', 'coop'), c = fighter('orange', 'coop');
  assert.equal(awardPoint(a, [a, b, c], 'coop'), null);
  assert.equal(awardPoint(b, [a, b, c], 'coop'), null);
  assert.equal(awardPoint(a, [a, b, c], 'coop'), a);
  assert.equal(teamScore([a, b, c], 'players'), COMBAT.scoreToWin);
  const x = fighter('cyan'), y = fighter('orange');
  assert.equal(awardPoint(x, [x, y], 'solo'), null);
  assert.equal(awardPoint(x, [x, y], 'solo'), null);
  assert.equal(awardPoint(x, [x, y], 'solo'), x); assert.equal(y.score, 0);
});
test('earthquake consumes one charge, warns before falling and bounds all active rocks', () => {
  const owner = fighter('cyan'), rival = fighter('orange');
  const scene = { spiders: [owner, rival], solids: [], add: { graphics }, audio: { play() {} } };
  const power = new EarthquakeSystem(scene);
  assert.equal(power.activate(owner, 0), true); assert.equal(owner.powerCharges, 0);
  assert.equal(power.activate(owner, 1), false); assert.ok(power.warnings.length <= E.rockCount);
  power.step(E.warningMs - 1); assert.equal(power.rocks.length, 0);
  power.step(E.warningMs); assert.ok(power.rocks.length > 0);
  owner.powerCharges = 1; power.warnings = Array.from({ length: E.maxRocks }, () => ({}));
  assert.equal(power.activate(owner, 0), false); assert.equal(owner.powerCharges, 1);
  power.reset(); assert.equal(power.rocks.length + power.warnings.length, 0);
});
test('rocks damage rivals once, spare executor/allies and expire without any Matter bodies', () => {
  const owner = fighter('cyan', 'coop'), ally = fighter('magenta', 'coop'), rival = fighter('orange', 'coop');
  const hits = [];
  const scene = { spiders: [owner, ally, rival], solids: [], add: { graphics },
    combat: { damage(target, attacker, dir, type) { hits.push([target.id, attacker.id, type]); }, burst() {} } };
  const power = new EarthquakeSystem(scene);
  power.rocks.push({ owner, x: 600, y: 875, speed: 0, expires: 1000, hit: new Set() });
  power.step(0); power.step(16);
  assert.deepEqual(hits, [['orange', 'cyan', 'rock']]);
  power.step(1001); assert.equal(power.rocks.length, 0); assert.deepEqual(scene.solids, []);
});
test('swept circle contact catches fast crossings and rejects misses', () => {
  assert.equal(circleContact({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 50 }, 10), 0.4);
  assert.equal(circleContact({ x: 20, y: 0 }, { x: 20, y: 100 }, { x: 0, y: 50 }, 10), null);
});
test('respawn restores configured power and three hearts using the existing Spider reset', () => {
  const s = fighter('cyan'); s.spawn = { x: 320, y: 1478 }; s.powerCharges = 0; s.hearts = 0;
  s.web = { release() {} }; s.trail = []; s.body.force = { x: 1, y: 1 };
  s.scene = { matter: { body: { setStatic(b, value) { b.isStatic = value; }, setInertia() {},
    setPosition(b, p) { b.position = { ...p }; }, setVelocity(b, v) { b.velocity = { ...v }; } } } };
  Spider.prototype.reset.call(s, 100);
  assert.equal(s.hearts, 3); assert.equal(s.powerCharges, E.chargesPerRespawn);
  assert.equal(s.invulnerableUntil, 100 + COMBAT.spawnInvulnerabilityMs);
});
test('shared combat applies rock damage and attributes the lethal point to its owner', () => {
  const owner = fighter('cyan'), target = fighter('orange'); target.hearts = 1;
  target.web = { release() {} }; target.body.force = { x: 0, y: 0 };
  const scene = { mode: 'solo', spiders: [owner, target], add: { graphics }, pulse() {},
    matter: { body: { setVelocity(b, v) { b.velocity = v; }, setStatic() {} } }, finishMatch() {} };
  const combat = new CombatSystem(scene);
  assert.equal(combat.damage(target, owner, { x: 1, y: 0 }, 'rock', 0), true);
  assert.equal(target.dead, true); assert.equal(owner.score, 1); assert.equal(target.score, 0);
});
test('mute, unavailable audio and rejected AudioContext initialization never prevent play', () => {
  const mute = new AudioSystem({ mute: true, Context: class { constructor() { throw new Error('must not initialize'); } } });
  mute.unlock(); for (const name of Object.keys(SOUNDS)) assert.equal(mute.play(name), false);
  const absent = new AudioSystem({ Context: false }); absent.unlock(); assert.equal(absent.play('jump'), false);
  const fail = new AudioSystem({ Context: class { constructor() { throw new Error('not available'); } } });
  assert.doesNotThrow(() => { fail.unlock(); fail.play('earthquake'); fail.destroy(); });
  mute.setVolume(2); assert.equal(mute.volume, 1); mute.setVolume(-1); assert.equal(mute.volume, 0);
});
