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
    webHeld: false, attackHeld: false, powerPressed: false, pausePressed: false,
    confirmPressed: false, resetPressed: false, menuX: 0, menuY: 0 };
}

// Standard Xbox mapping is centralized in config. One mapper per device/seat.
export class GamepadActions {
  constructor() { this.reset(); this.aim = { ...INPUT.initialAim }; }
  reset() { this.previous = {}; }
  sample(pad) {
    if (!pad?.connected) { this.reset(); return neutralAction(this.aim); }
    const button = (index) => pad.buttons[index]?.value ?? 0;
    this.aim = aimDirection(pad.axes[2] ?? 0, pad.axes[3] ?? 0, this.aim);
    const b = INPUT.buttons;
    const edge = (name) => {
      const held = button(b[name]) > 0.5, pressed = held && !this.previous[name];
      this.previous[name] = held; return pressed;
    };
    const menuX = Math.sign((button(b.right) - button(b.left)) ||
      (Math.abs(pad.axes[0]) > INPUT.menuDeadzone ? pad.axes[0] : 0));
    const menuY = Math.sign((button(b.down) - button(b.up)) ||
      (Math.abs(pad.axes[1]) > INPUT.menuDeadzone ? pad.axes[1] : 0));
    const action = { ...neutralAction(this.aim), moveX: deadzone(pad.axes[0] ?? 0),
      jumpPressed: edge('jump'), powerPressed: edge('power'), confirmPressed: edge('confirm'),
      pausePressed: edge('pause'), menuX: menuX !== this.previous.menuX ? menuX : 0,
      menuY: menuY !== this.previous.menuY ? menuY : 0,
      webHeld: button(b.web) > INPUT.triggerThreshold, attackHeld: button(b.attack) > INPUT.triggerThreshold };
    this.previous.menuX = menuX; this.previous.menuY = menuY;
    return action;
  }
}
