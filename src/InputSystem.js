import { GamepadActions, aimDirection, neutralAction } from './actions.js';

export default class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.gamepad = new GamepadActions();
    this.keys = scene.input.keyboard.addKeys('A,D,W,SPACE,R,F1,ESC');
    scene.input.keyboard.addCapture(['SPACE', 'F1']);
    scene.input.mouse.disableContextMenu();
    this.keyboardJump = this.keyboardPause = this.keyboardReset = false;
    this.mouseWeb = this.mouseAttack = false;
    this.aim = { ...this.gamepad.aim };
    this.pending = neutralAction(this.aim);
    this.status = 'PRESS ANY BUTTON · KEYBOARD READY';
    this.source = 'keyboard';
    this.disconnected = false;
    this.override = null;
    for (const key of [this.keys.W, this.keys.SPACE]) key.on('down', (event) => {
      if (!event.repeat) this.keyboardJump = true;
    });
    this.keys.ESC.on('down', (event) => { if (!event.repeat) this.keyboardPause = true; });
    this.keys.R.on('down', (event) => { if (!event.repeat) this.keyboardReset = true; });
    scene.input.on('pointerdown', (p) => {
      if (p.button === 2) this.mouseWeb = true;
      if (p.button === 0) this.mouseAttack = true;
    });
    const release = (p) => {
      if (p.button === 2) this.mouseWeb = false;
      if (p.button === 0) this.mouseAttack = false;
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    this.onBlur = () => this.clear();
    window.addEventListener('blur', this.onBlur);
    scene.events.once('shutdown', () => window.removeEventListener('blur', this.onBlur));
  }

  clear(resetGamepad = true) {
    Object.values(this.keys).forEach((key) => key.reset());
    this.keyboardJump = this.keyboardPause = this.keyboardReset = false;
    this.mouseWeb = this.mouseAttack = false;
    if (resetGamepad) this.gamepad.reset();
    this.pending = neutralAction(this.aim);
    this.scene.spider.web.release();
    this.scene.spider.jumpQueuedUntil = -Infinity;
  }

  poll() {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((p) => p?.connected && p.mapping === 'standard');
    const source = this.override ? 'simulation' : pad ? 'gamepad' : 'keyboard';
    if (source !== this.source) {
      this.disconnected = this.source === 'gamepad' && source === 'keyboard';
      this.clear(); this.source = source;
    }
    let action;
    if (this.override) {
      action = this.gamepad.sample(this.override);
      this.status = 'SIMULATED STANDARD GAMEPAD';
    } else if (pad) {
      action = this.gamepad.sample(pad);
      this.status = 'XBOX / STANDARD GAMEPAD CONNECTED';
    } else {
      const p = this.scene.spider.body.position;
      const pointer = this.scene.input.activePointer;
      const cursor = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.aim = aimDirection(cursor.x - p.x, cursor.y - p.y, this.aim, 1);
      action = { ...neutralAction(this.aim), moveX: Number(this.keys.D.isDown) - Number(this.keys.A.isDown),
        jumpPressed: this.keyboardJump, pausePressed: this.keyboardPause,
        resetPressed: this.keyboardReset, webHeld: this.mouseWeb, attackHeld: this.mouseAttack };
      this.status = Array.from(pads).some((p) => p?.connected)
        ? 'NON-STANDARD PAD · KEYBOARD READY' : this.disconnected
          ? 'GAMEPAD DISCONNECTED · KEYBOARD READY' : 'PRESS ANY BUTTON · KEYBOARD READY';
    }
    this.keyboardJump = this.keyboardPause = this.keyboardReset = false;
    this.aim = { x: action.aimX, y: action.aimY };
    for (const edge of ['jumpPressed', 'pausePressed', 'resetPressed']) action[edge] ||= this.pending[edge];
    this.pending = action;
    document.body.classList.toggle('gamepad', source !== 'keyboard');
  }

  consume() {
    const action = { ...this.pending };
    this.pending.jumpPressed = this.pending.pausePressed = this.pending.resetPressed = false;
    return action;
  }
}
