import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { SaveManager } from '../systems/SaveManager';
import { createButton, textStyle, titleStyle } from '../ui/helpers';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // 背景渐变
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x101820, 0x101820, 0x1d3324, 0x1d3324, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 装饰僵尸剪影
    for (let i = 0; i < 6; i++) {
      this.add
        .image(
          Phaser.Math.Between(60, GAME_WIDTH - 60),
          Phaser.Math.Between(GAME_HEIGHT * 0.55, GAME_HEIGHT - 120),
          'zombie_normal'
        )
        .setTint(0x0a0f0a)
        .setAlpha(0.5)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6));
    }

    this.add.text(cx, 300, '僵尸炮台', titleStyle(96)).setOrigin(0.5);
    this.add.text(cx, 400, 'ZOMBIE CANNON', textStyle(30, '#8fbf8f')).setOrigin(0.5);

    // 展示一个大炮台
    this.add.image(cx, 640, 'cannon_base').setScale(2);
    this.add.image(cx, 596, 'cannon_barrel').setOrigin(0.5, 0.78).setScale(2);

    createButton(this, cx, 880, '开始游戏', () => this.scene.start('LevelSelect'), {
      width: 380,
      height: 104,
      fontSize: 40,
    });

    this.add
      .text(cx, 1020, `金币: ${SaveManager.coins}`, textStyle(30, '#ffd54a'))
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 50, '击退尸潮，守住高墙！', textStyle(24, '#7a8a99'))
      .setOrigin(0.5);
  }
}
