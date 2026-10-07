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
