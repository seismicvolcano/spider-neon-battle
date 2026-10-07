// Speeds are Matter velocities (pixels per 1/60 second). Forces act each fixed tick.
export const GAMEPLAY = {
  worldWidth: 3000,
  worldHeight: 1900,
  spawn: { x: 320, y: 1478 },
  gravity: 1.2,
  fixedStep: 1000 / 60,
  radius: 17,
  moveAcceleration: 0.85,
  maxRunSpeed: 7.6,
  groundDrag: 0.78,
  jumpSpeed: 13.5,
  coyoteMs: 90,
  jumpBufferMs: 110,
  airControl: 0.16,
  airDrag: 0.0015,
  webMaxDistance: 850,
  webStiffness: 0.95,
  webDamping: 0.0025,
  swingForce: 0.0016,
  maxSwingSpeed: 24,
  riverY: 1815,
  riverBounceSpeed: 23,
  cameraLerp: 0.075,
  cameraLookAhead: 10,
};

export const COLORS = {
  cyan: 0x5be9e1,
  magenta: 0xe66dff,
  violet: 0x8674dd,
  rock: 0x111b2b,
  metal: 0x182638,
};

export const INPUT = {
  moveDeadzone: 0.2, aimDeadzone: 0.23, triggerThreshold: 0.4,
  initialAim: { x: 0.6, y: -0.8 },
};
export const WEB = { assistAngleDeg: 10, assistSteps: 4, indicatorLength: 92 };
export const COMBAT = {
  hearts: 3, invulnerabilityMs: 900, spawnInvulnerabilityMs: 1200,
  respawnMs: 1100, scoreToWin: 3, pickupRadius: 39, weaponRespawnMs: 6500,
  spawnPreviewMs: 1100,
  sword: { cooldownMs: 520, durationMs: 180, reach: 91, halfAngle: 1.05,
    knockback: 11, upwardKick: 4, momentumFactor: 0.22 },
  pistol: { cooldownMs: 340, ammo: 10, speed: 1150, lifetimeMs: 1600,
    radius: 4, knockback: 5, upwardKick: 2 },
  weaponSpawns: [
    { x: 410, y: 1478, type: 'sword' }, { x: 875, y: 1488, type: 'pistol' },
    { x: 460, y: 952, type: 'pistol' }, { x: 1200, y: 1655, type: 'sword' },
    { x: 1940, y: 1295, type: 'sword' }, { x: 2270, y: 1486, type: 'pistol' },
  ],
};
export const FIGHTERS = {
  player: { id: 'cyan', spawn: { ...GAMEPLAY.spawn }, color: COLORS.cyan, accentColor: 0xadfff2 },
  enemy: { id: 'magenta', spawn: { x: 890, y: 1480 }, color: COLORS.magenta, accentColor: 0xf7c1ff },
};
export const CAMERA = { minZoom: 0.48, maxZoom: 1.15, paddingX: 360, paddingY: 400,
  zoomLerp: 0.025, verticalOffset: 65 };
export const AI = {
  reactionMs: 280, aimErrorRad: 0.12, moveStrength: 0.85, stopDistance: 65,
  jumpCooldownMs: 850, higherTarget: 65, obstacleProbe: 62,
  attackRange: 720, webIntervalMs: 2200, webHoldMs: 800,
  swordRange: 105, pistolFireMs: 720,
};
