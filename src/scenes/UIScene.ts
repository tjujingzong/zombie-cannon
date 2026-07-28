import Phaser from 'phaser';
import { GAME_WIDTH } from '../data/balance';
import type { GameScene } from './GameScene';
import { FONT, createButton, createOverlay, textStyle } from '../ui/helpers';

/**
 * HUD：金币 / 波次 / 墙血条 / 暂停，每帧从 GameScene 拉取状态。
 */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private coinText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private wallBar!: Phaser.GameObjects.Graphics;
  private pauseGroup: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('UI');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;

    // 顶栏底
    const top = this.add.graphics();
    top.fillStyle(0x000000, 0.35).fillRoundedRect(12, 12, GAME_WIDTH - 24, 64, 14);

    this.add.image(48, 44, 'coin').setScale(0.95);
    this.coinText = this.add.text(72, 44, '0', textStyle(28, '#ffd54a')).setOrigin(0, 0.5);

    this.levelText = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.waveText = this.add.text(GAME_WIDTH - 170, 44, '', textStyle(26, '#8fbf8f')).setOrigin(0.5);

    // 暂停按钮
    createButton(this, GAME_WIDTH - 60, 44, 'II', () => this.showPause(), {
      width: 64, height: 52, color: 0x455a64, colorDown: 0x37474f, fontSize: 24,
    });

    // 墙血条（画在墙上方）
    this.wallBar = this.add.graphics();
  }

  private showPause(): void {
    if (this.pauseGroup.length > 0) return;
    this.scene.pause('Game');

    const overlay = createOverlay(this, 0.6);
    const title = this.add
      .text(GAME_WIDTH / 2, 460, '游戏暂停', { fontFamily: FONT, fontSize: '52px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    const resume = createButton(this, GAME_WIDTH / 2, 610, '继续游戏', () => this.closePause(), {
      width: 340, height: 92,
    });
    const quit = createButton(
      this,
      GAME_WIDTH / 2,
      730,
      '放弃关卡',
      () => {
        this.closePause();
        this.scene.stop('Game');
        this.scene.stop();
        this.scene.start('LevelSelect');
      },
      { width: 340, height: 92, color: 0x8d3b3b, colorDown: 0x6d2b2b }
    );
    this.pauseGroup = [overlay, title, resume, quit];
  }

  private closePause(): void {
    this.pauseGroup.forEach((o) => o.destroy());
    this.pauseGroup = [];
    this.scene.resume('Game');
  }

  update(): void {
    if (!this.game_) return;
    this.coinText.setText(`${this.game_.runCoins}`);
    this.levelText.setText(this.game_.levelName);
    this.waveText.setText(`波次 ${this.game_.waveLabel}`);

    // 墙血条
    const ratio = this.game_.wallMaxHp > 0 ? this.game_.wallHp / this.game_.wallMaxHp : 0;
    const w = GAME_WIDTH - 80;
    const y = 1030; // WALL_Y - 30
    this.wallBar.clear();
    this.wallBar.fillStyle(0x000000, 0.5).fillRoundedRect(40, y, w, 18, 9);
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xf5a623 : 0xe74c3c;
    if (ratio > 0) {
      this.wallBar.fillStyle(color, 1).fillRoundedRect(42, y + 2, Math.max(10, (w - 4) * ratio), 14, 7);
    }
  }
}
