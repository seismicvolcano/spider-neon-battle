import { COMBAT } from './config.js';

export function createWeapon(type) {
  return { type, ammo: type === 'pistol' ? COMBAT.pistol.ammo : null, readyAt: 0 };
}
export function useWeapon(weapon, time) {
  if (!weapon || time < weapon.readyAt || weapon.ammo === 0) return false;
  weapon.readyAt = time + COMBAT[weapon.type].cooldownMs;
  if (weapon.type === 'pistol') weapon.ammo--;
  return true;
}
export function canDamage(target, time) {
  return !target.dead && time >= target.invulnerableUntil;
}
