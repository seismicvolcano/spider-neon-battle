import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadzone, aimDirection, GamepadActions } from '../src/actions.js';

const pad = (axes = [0, 0, 0, 0], values = {}) => ({ connected: true, axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ value: values[i] ?? 0 })) });

test('movement deadzone rejects drift and scales analog input continuously', () => {
  for (const value of [-0.2, -0.1, 0, 0.1, 0.2, NaN]) assert.equal(deadzone(value), 0);
  assert.ok(Math.abs(deadzone(0.6) - 0.5) < 1e-12);
  assert.equal(deadzone(-1), -1); assert.equal(deadzone(1), 1);
});
test('aim is normalized regardless of stick magnitude and retains last valid direction', () => {
  const last = { x: 0, y: -1 };
  assert.deepEqual(aimDirection(0.1, 0.1, last), last);
  assert.deepEqual(aimDirection(0, 0, last), last);
  const direction = aimDirection(0.3, 0.4, last);
  assert.ok(Math.abs(direction.x - 0.6) < 1e-12);
  assert.ok(Math.abs(direction.y - 0.8) < 1e-12);
  assert.deepEqual(aimDirection(0, 0, direction), direction);
});
test('Xbox buttons have independent edges and LT/RT/LS/RS work together', () => {
  const mapper = new GamepadActions();
  const held = pad([1, -1, 0.6, -0.8], { 0: 1, 6: 0.8, 7: 1, 9: 1 });
  const action = mapper.sample(held);
  assert.equal(action.moveX, 1); assert.equal(action.jumpPressed, true);
  assert.equal(action.pausePressed, true); assert.equal(action.webHeld, true);
  assert.equal(action.attackHeld, true);
  assert.equal(action.aimX, 0.6); assert.equal(action.aimY, -0.8);
  const next = mapper.sample(held);
  assert.equal(next.jumpPressed, false); assert.equal(next.pausePressed, false);
  assert.equal(next.webHeld, true); assert.equal(next.attackHeld, true);
  const centered = mapper.sample(pad());
  assert.equal(centered.aimX, 0.6); assert.equal(centered.aimY, -0.8);
  assert.equal(centered.webHeld, false);
  assert.equal(mapper.sample(held).jumpPressed, true);
});
test('disconnect clears all held inputs and reconnect can jump again', () => {
  const mapper = new GamepadActions();
  mapper.sample(pad([1, 0, 1, 0], { 0: 1, 6: 1, 7: 1 }));
  const action = mapper.sample(null);
  assert.equal(action.moveX, 0); assert.equal(action.webHeld, false);
  assert.equal(action.attackHeld, false); assert.equal(action.jumpPressed, false);
  assert.equal(action.aimX, 1);
  assert.equal(mapper.sample(pad([], { 0: 1 })).jumpPressed, true);
});
