import { GamepadActions, aimDirection, neutralAction } from './actions.js';
import DeviceAssignments, { standardPads, padNeutral } from './DeviceAssignments.js';
import { INPUT } from './config.js';

const EDGES = ['jumpPressed', 'powerPressed', 'pausePressed', 'confirmPressed', 'resetPressed'];
export default class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.assignments = new DeviceAssignments(); this.channels = []; this.menuMappers = new Map();
    this.keys = scene.input.keyboard.addKeys('A,D,W,SPACE,R,F1,ESC,Q,ENTER,UP,DOWN,LEFT,RIGHT,M');
    scene.input.keyboard.addCapture(['SPACE', 'F1', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    scene.input.mouse.disableContextMenu();
    this.keyboard = neutralAction(); this.mouseWeb = this.mouseAttack = false;
    this.heldKeyboard = new Set(); this.heldMouse = new Set();
    this.aim = { ...INPUT.initialAim }; this.status = 'KEYBOARD READY';
    this.onKey = (event) => {
      scene.audio.unlock(true); this.heldKeyboard.add(event.code);
      if (event.repeat) return;
      const edges = { KeyW: 'jumpPressed', Space: 'jumpPressed', KeyQ: 'powerPressed',
        Escape: 'pausePressed', KeyR: 'resetPressed', Enter: 'confirmPressed' };
      if (edges[event.code]) this.keyboard[edges[event.code]] = true;
      if (event.code === 'Space' && scene.inMenu) this.keyboard.confirmPressed = true;
      if (event.code === 'ArrowUp') this.keyboard.menuY = -1;
      if (event.code === 'ArrowDown') this.keyboard.menuY = 1;
      if (event.code === 'ArrowLeft') this.keyboard.menuX = -1;
      if (event.code === 'ArrowRight') this.keyboard.menuX = 1;
      if (event.code === 'KeyM') { scene.audio.setMute(!scene.audio.mute); scene.audio.unlock(true); }
    };
    this.onDown = (p) => {
      scene.audio.unlock(true); this.heldMouse.add(p.button);
      if (p.button === 2) this.mouseWeb = true;
      if (p.button === 0) this.mouseAttack = true;
    };
    this.onUp = (p) => { this.heldMouse.delete(p.button); if (p.button === 2) this.mouseWeb = false; if (p.button === 0) this.mouseAttack = false; };
    this.onKeyUp = (event) => this.heldKeyboard.delete(event.code);
    this.onBlur = () => this.clear();
    scene.input.keyboard.on('keydown', this.onKey);
    scene.input.keyboard.on('keyup', this.onKeyUp);
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointerup', this.onUp); scene.input.on('pointerupoutside', this.onUp);
    window.addEventListener('blur', this.onBlur);
    scene.events.once('shutdown', () => {
      window.removeEventListener('blur', this.onBlur);
      scene.input.keyboard.off('keydown', this.onKey);
      scene.input.keyboard.off('keyup', this.onKeyUp);
      scene.input.off('pointerdown', this.onDown); scene.input.off('pointerup', this.onUp);
      scene.input.off('pointerupoutside', this.onUp);
    });
  }
  pads() { try { return navigator.getGamepads?.() ?? []; } catch { return []; } }
  configure(humans, layout) {
    this.clear(); this.ready = false; this.assignments.configure(humans, layout, this.pads());
    this.channels = this.assignments.seats.map(() => ({ mapper: new GamepadActions(),
      pending: neutralAction(), connected: false, armed: false, source: 'disconnected' }));
  }
  clear() {
    Object.values(this.keys).forEach((key) => key.reset());
    this.keyboard = neutralAction(this.aim); this.mouseWeb = this.mouseAttack = false;
    for (const c of this.channels) { c.pending = neutralAction(c.mapper.aim); c.armed = false; c.mapper.reset(); }
    for (const s of this.scene.spiders ?? []) {
      s.web.release(); s.webHeld = false; s.jumpQueuedUntil = -Infinity;
    }
  }
  poll() {
    const pads = this.pads();
    const keyboard = { ...this.keyboard, moveX: Number(this.keys.D.isDown) - Number(this.keys.A.isDown),
      webHeld: this.mouseWeb, attackHeld: this.mouseAttack };
    this.menuAction = { ...keyboard };
    const available = standardPads(pads);
    for (const pad of available) {
      if (!this.menuMappers.has(pad.index)) this.menuMappers.set(pad.index, new GamepadActions());
      const a = this.menuMappers.get(pad.index).sample(pad);
      for (const edge of EDGES) this.menuAction[edge] ||= a[edge];
      this.menuAction.menuX ||= a.menuX; this.menuAction.menuY ||= a.menuY;
      if (pad.buttons.some((b) => b.pressed || b.value > 0.5)) this.scene.audio.unlock();
    }
    for (const [index, mapper] of this.menuMappers) if (!available.some((p) => p.index === index)) mapper.reset();
    const resolved = this.assignments.resolve(pads);
    this.lostConnection = false;
    resolved.forEach(({ seat, pad, connected }, i) => {
      const c = this.channels[i];
      if (c.connected && !connected) { this.lostConnection = true; this.scene.spiders[i]?.web.release(); }
      if (connected !== c.connected) { c.armed = false; c.mapper.reset(); c.pending = neutralAction(c.mapper.aim); }
      c.connected = connected;
      c.source = seat.type === 'keyboard' ? 'keyboard' : connected ? 'gamepad' : 'disconnected';
      let action = neutralAction(c.mapper.aim);
      if (seat.type === 'keyboard') {
        if (!keyboard.moveX && !keyboard.webHeld && !keyboard.attackHeld && !this.keys.SPACE.isDown &&
          !this.keys.W.isDown && !this.keys.Q.isDown && !this.heldMouse.size &&
          !['KeyA', 'KeyD', 'KeyW', 'Space', 'KeyQ'].some((code) => this.heldKeyboard.has(code))) c.armed = true;
        const spider = this.scene.spiders[i];
        if (spider) {
          const pointer = this.scene.input.activePointer;
          const cursor = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y), p = spider.body.position;
          this.aim = aimDirection(cursor.x - p.x, cursor.y - p.y, this.aim, 1);
        }
        if (c.armed) action = { ...keyboard, aimX: this.aim.x, aimY: this.aim.y };
      } else if (pad) {
        if (padNeutral(pad)) c.armed = true;
        if (c.armed) action = c.mapper.sample(pad);
      }
      for (const edge of EDGES) action[edge] ||= c.pending[edge];
      c.pending = action;
    });
    this.ready = resolved.length > 0 && this.channels.every((c) => c.connected && c.armed);
    this.status = this.channels.map((c, i) => `P${i + 1}: ${c.source === 'gamepad' ? `PAD ${resolved[i].seat.index}` : c.source.toUpperCase()}${c.connected && !c.armed ? ' · RELEASE CONTROLS' : ''}`).join(' / ');
    this.source = this.channels[0]?.source ?? 'keyboard'; this.pending = this.channels[0]?.pending ?? neutralAction();
    this.keyboard = neutralAction(this.aim);
    document.body.classList.toggle('gamepad', !this.channels.some((c) => c.source === 'keyboard'));
  }
  consumeAll() {
    return this.channels.map((c) => {
      const a = { ...c.pending }; for (const edge of EDGES) c.pending[edge] = false; return a;
    });
  }
  retainEdges(actions) {
    actions.forEach((a, i) => { for (const edge of ['jumpPressed', 'powerPressed']) this.channels[i].pending[edge] ||= a[edge]; });
  }
}
