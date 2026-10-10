import { INPUT } from './config.js';

export function deadzone(value, threshold = INPUT.moveDeadzone) {
  if (!Number.isFinite(value) || Math.abs(value) <= threshold) return 0;
  return Math.sign(value) * Math.min(1, (Math.abs(value) - threshold) / (1 - threshold));
}

export function aimDirection(x, y, last = INPUT.initialAim, threshold = INPUT.aimDeadzone) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= threshold) return { ...last };
  return { x: x / length, y: y / length };
}

export function neutralAction(aim = INPUT.initialAim) {
  return { moveX: 0, aimX: aim.x, aimY: aim.y, jumpPressed: false,
    webHeld: false, attackHeld: false, pausePressed: false, resetPressed: false };
}

// Standard Gamepad API indices: A=0, LT=6, RT=7, Menu=9, RS axes=2/3.
export class GamepadActions {
  constructor() { this.reset(); this.aim = { ...INPUT.initialAim }; }
  reset() { this.previousJump = false; this.previousPause = false; }
  sample(pad) {
    if (!pad?.connected) { this.reset(); return neutralAction(this.aim); }
    const button = (index) => pad.buttons[index]?.value ?? 0;
    this.aim = aimDirection(pad.axes[2] ?? 0, pad.axes[3] ?? 0, this.aim);
    const jump = button(0) > 0.5;
    const pause = button(9) > 0.5;
    const action = { ...neutralAction(this.aim), moveX: deadzone(pad.axes[0] ?? 0),
      jumpPressed: jump && !this.previousJump, pausePressed: pause && !this.previousPause,
      webHeld: button(6) > INPUT.triggerThreshold, attackHeld: button(7) > INPUT.triggerThreshold };
    this.previousJump = jump; this.previousPause = pause;
    return action;
  }
}
