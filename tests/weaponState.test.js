import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeapon, useWeapon, canDamage } from '../src/weaponState.js';
import { COMBAT } from '../src/config.js';

test('sword cooldown allows one swing per interval', () => {
  const sword = createWeapon('sword');
  assert.equal(useWeapon(sword, 0), true);
  assert.equal(useWeapon(sword, COMBAT.sword.cooldownMs - 1), false);
  assert.equal(useWeapon(sword, COMBAT.sword.cooldownMs), true);
});
test('pistol consumes ammo only on valid shots and stops at zero', () => {
  const pistol = createWeapon('pistol');
  for (let i = 0; i < COMBAT.pistol.ammo; i++) {
    assert.equal(useWeapon(pistol, i * COMBAT.pistol.cooldownMs), true);
    assert.equal(useWeapon(pistol, i * COMBAT.pistol.cooldownMs + 1), false);
  }
  assert.equal(pistol.ammo, 0);
  assert.equal(useWeapon(pistol, 10000), false);
  assert.equal(useWeapon(null, 0), false);
});
test('damage gate respects death and exact invulnerability expiry', () => {
  assert.equal(canDamage({ dead: false, invulnerableUntil: 900 }, 899), false);
  assert.equal(canDamage({ dead: false, invulnerableUntil: 900 }, 900), true);
  assert.equal(canDamage({ dead: true, invulnerableUntil: 0 }, 1000), false);
});
