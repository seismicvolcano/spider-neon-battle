import { COMBAT, MATCH } from './config.js';

export const MODES = [
  { id: 'solo', label: 'P1 vs AI', humans: 1, ai: true },
  { id: 'duel', label: 'P1 vs P2', humans: 2, ai: false },
  { id: 'coop', label: 'P1 + P2 vs AI', humans: 2, ai: true },
  { id: 'ffa', label: 'P1 vs P2 vs AI', humans: 2, ai: true },
];
export function selectMode(index) { return MODES[((index % MODES.length) + MODES.length) % MODES.length]; }
export function teamFor(mode, id) { return mode === 'coop' && id !== 'orange' ? 'players' : id; }
export function opponents(a, b, friendlyFire = MATCH.friendlyFire) {
  return a !== b && a.id !== b.id && (friendlyFire || a.team !== b.team);
}
export function earthquakeCanHit(owner, target) {
  return owner !== target && owner.id !== target.id && owner.team !== target.team;
}
export function awardPoint(attacker, fighters, mode, required = COMBAT.scoreToWin) {
  attacker.score++;
  const members = mode === 'coop' ? fighters.filter((s) => s.team === attacker.team) : [attacker];
  const score = members.reduce((total, s) => total + s.score, 0);
  return score >= required ? attacker : null;
}
export function teamScore(fighters, team) {
  return fighters.filter((s) => s.team === team).reduce((total, s) => total + s.score, 0);
}
