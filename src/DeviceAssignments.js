import { INPUT } from './config.js';

export const standardPads = (pads) => Array.from(pads).filter((p) => p?.connected && p.mapping === 'standard')
  .sort((a, b) => a.index - b.index);
export function padNeutral(pad) {
  return pad.axes.every((v) => Math.abs(v) <= INPUT.moveDeadzone) &&
    pad.buttons.every((b) => (b.value ?? 0) <= INPUT.triggerThreshold);
}

// Reserve an index even while disconnected. Never steal another player's pad or keyboard.
export default class DeviceAssignments {
  constructor() { this.seats = []; }
  configure(humans, layout, pads) {
    const available = standardPads(pads);
    this.seats = Array.from({ length: humans }, (_, i) => {
      if (layout === 'mixed' && i === 1) return { type: 'keyboard' };
      if (available[i] && !(layout === 'mixed' && i > 0))
        return { type: 'gamepad', index: available[i].index, id: available[i].id };
      if (layout !== 'pads' && !available.length && i === 0) return { type: 'keyboard' };
      if (layout === 'auto' && available.length === 1 && i === 1) return { type: 'keyboard' };
      return { type: 'gamepad', index: null, id: null };
    });
    // Mixed always reserves P1 for a pad, even if it has not been exposed yet.
    if (layout === 'mixed' && !available.length) this.seats[0] = { type: 'gamepad', index: null, id: null };
  }
  resolve(pads) {
    const available = standardPads(pads);
    const reserved = new Set(this.seats.filter((s) => s.index !== null && s.type === 'gamepad').map((s) => s.index));
    return this.seats.map((seat) => {
      if (seat.type === 'keyboard') return { seat, connected: true, pad: null };
      if (seat.index === null) {
        const pad = available.find((p) => !reserved.has(p.index));
        if (pad) { seat.index = pad.index; seat.id = pad.id; reserved.add(pad.index); }
      }
      const pad = available.find((p) => p.index === seat.index && p.id === seat.id);
      return { seat, pad: pad ?? null, connected: !!pad };
    });
  }
}
