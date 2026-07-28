import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { LEVELS } from '../data/levels';
import { SaveManager } from '../systems/SaveManager';
import { createButton, textStyle, titleStyle } from '../ui/helpers';

interface ResultData {
  levelId: number;
  victory: boolean;
  stars: number;
  coinsEarned: number;
}

export class ResultScene extends Phaser.Scene {
  private data_!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.data_ = data;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { victory, stars, coinsEarned, levelId } = this.data_;

    const bg = this.add.graphics();
    if (victory) {
      bg.fillGradientStyle(0x101820, 0x101820, 0x1d3324, 0x1d3324, 1);
    } else {
      bg.fillGradientStyle(0x1a1012, 0x1a1012, 0x2b181c, 0x2b181c, 1);
    }
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 300, victory ? '胜利！' : '基地失守…', titleStyle(84))
      .setOrigin(0.5)
      .setColor(victory ? '#ffd54a' : '#e74c3c');

    // 星级
    if (victory) {
      for (let i = 0; i < 3; i++) {
        const img = this.add
          .image(cx - 110 + i * 110, 470, i < stars ? 'star' : 'star_empty')
          .setScale(0)
          .setDepth(5);
        this.tweens.add({
          targets: img,
          scale: 1.4,
          delay: 200 + i * 180,
          duration: 300,
          ease: 'Back.Out',
        });
      }
    }

    // 金币结算
    this.add.image(cx - 70, 620, 'coin').setScale(1.4);
    this.add
      .text(cx - 36, 620, `+${coinsEarned}`, textStyle(44, '#ffd54a'))
      .setOrigin(0, 0.5);
    this.add
      .text(cx, 690, `当前金币: ${SaveManager.coins}`, textStyle(24, '#8a9aa8'))
      .setOrigin(0.5);

    // 按钮
    const hasNext = victory && levelId < LEVELS.length;
    let y = 840;
    if (hasNext) {
      createButton(this, cx, y, '下一关', () => this.scene.start('Game', { levelId: levelId + 1 }), {
        width: 360, height: 96, fontSize: 34,
      });
      y += 120;
    }
    createButton(
      this,
      cx,
      y,
      victory ? '再次挑战' : '重新挑战',
      () => this.scene.start('Game', { levelId }),
      { width: 360, height: 96, fontSize: 34, color: hasNext ? 0x455a64 : 0x2e7d32, colorDown: hasNext ? 0x37474f : 0x1b5e20 }
    );
    y += 120;
    createButton(this, cx, y, '返回选关', () => this.scene.start('LevelSelect'), {
      width: 360, height: 96, fontSize: 34, color: 0x455a64, colorDown: 0x37474f,
    });
  }
}
