import { AUDIO } from './config.js';

// Original oscillator patches: [start Hz, end Hz, seconds, waveform, gain]. No assets.
export const SOUNDS = {
  pickup: [550, 1100, 0.13, 'sine', 0.25], sword: [180, 700, 0.1, 'sawtooth', 0.12],
  swordHit: [250, 60, 0.12, 'square', 0.16], pistol: [1400, 260, 0.07, 'sawtooth', 0.12],
  shotHit: [650, 100, 0.09, 'triangle', 0.22], jump: [180, 520, 0.12, 'sine', 0.22],
  webLaunch: [850, 1400, 0.06, 'triangle', 0.12], webAttach: [1200, 600, 0.09, 'sine', 0.2],
  webRelease: [700, 220, 0.08, 'triangle', 0.12], damage: [150, 55, 0.16, 'sawtooth', 0.2],
  death: [350, 35, 0.32, 'triangle', 0.25], river: [120, 900, 0.21, 'sine', 0.24],
  earthquake: [65, 27, 0.55, 'sawtooth', 0.3], rockFall: [300, 70, 0.2, 'triangle', 0.12],
  rockHit: [90, 28, 0.16, 'square', 0.18], victory: [440, 1320, 0.45, 'sine', 0.25],
  menuMove: [330, 440, 0.045, 'sine', 0.16], menuConfirm: [550, 880, 0.11, 'triangle', 0.2],
};
export default class AudioSystem {
  constructor(options = {}) {
    this.volume = options.volume ?? AUDIO.volume; this.mute = options.mute ?? AUDIO.mute;
    this.Context = options.Context ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
    this.context = null; this.voices = new Set(); this.last = new Map(); this.resuming = false;
  }
  unlock(userGesture = false) {
    if (this.mute || !this.Context) return;
    try {
      if (!this.context) {
        this.context = new this.Context(); this.master = this.context.createGain();
        this.master.connect(this.context.destination); this.setVolume(this.volume);
      }
      if (this.context.state === 'suspended' && (!this.resuming || userGesture)) {
        this.resuming = true;
        Promise.resolve(this.context.resume()).catch(() => {}).finally(() => { this.resuming = false; });
      }
    } catch { this.Context = null; }
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.master) this.master.gain.value = this.mute ? 0 : this.volume;
  }
  setMute(value) { this.mute = !!value; this.setVolume(this.volume); }
  play(name) {
    const ctx = this.context, patch = SOUNDS[name];
    if (this.mute || !ctx || ctx.state !== 'running' || !patch || this.voices.size >= AUDIO.maxVoices) return false;
    const now = ctx.currentTime;
    const interval = name === 'earthquake' ? 0.35 : AUDIO.minIntervalMs / 1000;
    if (now - (this.last.get(name) ?? -Infinity) < interval) return false;
    try {
      const [start, end, duration, type, volume] = patch;
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
      gain.gain.setValueAtTime(0.001, now); gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain); gain.connect(this.master); this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + duration + 0.01); this.last.set(name, now);
      return true;
    } catch { return false; }
  }
  silence() { for (const voice of this.voices) { try { voice.stop(); } catch {} } this.voices.clear(); }
  destroy() { this.silence(); this.context?.close()?.catch(() => {}); }
}
