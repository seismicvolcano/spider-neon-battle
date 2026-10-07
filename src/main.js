import Phaser from 'phaser';
import GameScene from './GameScene.js';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#070b17',
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: {
    default: 'matter',
    matter: { gravity: { y: 1.2 }, enableSleeping: false,
      positionIterations: 8, velocityIterations: 8, constraintIterations: 6 },
  },
  scene: [GameScene],
  callbacks: { postBoot: (game) => {
    game.canvas.setAttribute('tabindex', '0');
    game.canvas.setAttribute('aria-label', 'Caverna Neón. A/D mover, W o Space saltar, botón derecho telaraña.');
  } },
});

// Local inspection for physics tuning; excluded from production builds.
if (import.meta.env.DEV) window.__spiderGame = game;
