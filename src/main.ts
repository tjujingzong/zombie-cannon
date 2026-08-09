import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './data/balance';
import { BootScene } from './scenes/BootScene';
import { CodexScene } from './scenes/CodexScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { OperationsScene } from './scenes/OperationsScene';
import { ResultScene } from './scenes/ResultScene';
import { UIScene } from './scenes/UIScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0f14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, LevelSelectScene, CodexScene, OperationsScene, GameScene, UIScene, ResultScene],
});

// 调试入口（控制台可访问 game 实例）
(window as unknown as { game: Phaser.Game }).game = game;
