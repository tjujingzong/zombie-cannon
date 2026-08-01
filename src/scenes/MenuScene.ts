import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager } from '../systems/SaveManager';
import { createButton, textStyle, titleStyle } from '../ui/helpers';

export class MenuScene extends Phaser.Scene {
  private muteBtn!: Phaser.GameObjects.Container;
  private decorZombies: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // 背景渐变
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x101820, 0x101820, 0x1d3324, 0x1d3324, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 装饰僵尸剪影（缓慢晃动）
    for (let i = 0; i < 8; i++) {
      const z = this.add
        .image(
          Phaser.Math.Between(60, GAME_WIDTH - 60),
          Phaser.Math.Between(GAME_HEIGHT * 0.5, GAME_HEIGHT - 120),
          'zombie_normal'
        )
        .setTint(0x0a0f0a)
        .setAlpha(0.45)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.7));
      this.decorZombies.push(z);
      this.tweens.add({
        targets: z, y: z.y - 8, duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    }

    // 标题带光晕
    const titleGlow = this.add.graphics();
    titleGlow.fillStyle(0xffd54a, 0.18).fillCircle(cx, 300, 240);
    titleGlow.fillStyle(0xffd54a, 0.08).fillCircle(cx, 300, 320);
    this.add.text(cx, 300, '僵尸炮台', titleStyle(96)).setOrigin(0.5);
    this.add.text(cx, 400, 'ZOMBIE CANNON', textStyle(30, '#8fbf8f')).setOrigin(0.5);

    // 展示炮台
    this.add.image(cx, 640, 'cannon_base').setScale(2);
    this.add.image(cx, 596, 'cannon_barrel').setOrigin(0.5, 0.78).setScale(2);
    // 炮台微光
    const glow = this.add.image(cx, 640, 'muzzle_flash').setScale(3).setAlpha(0.35);
    this.tweens.add({ targets: glow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    createButton(this, cx, 880, '开始游戏', () => {
      AudioSystem.play('ui_click');
      this.scene.start('LevelSelect');
    }, { width: 380, height: 104, fontSize: 40 });

    // 图鉴按钮
    createButton(this, cx - 110, 1000, '图鉴', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Codex');
    }, { width: 180, height: 72, fontSize: 28, color: 0x6a3b8a, colorDown: 0x4a2b6a });

    // 静音按钮
    this.muteBtn = this.createMuteButton(cx + 110, 1000);
    this.updateMuteBtn();

    this.add
      .text(cx, 1080, `金币: ${SaveManager.coins}`, textStyle(30, '#ffd54a'))
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 40, '击退尸潮，守住高墙！', textStyle(24, '#7a8a99'))
      .setOrigin(0.5);

    // 进入菜单时启动 BGM
    this.time.delayedCall(120, () => AudioSystem.startBGM('menu'));
  }

  private createMuteButton(x: number, y: number): Phaser.GameObjects.Container {
    const w = 72, h = 72;
    const g = this.add.graphics();
    const draw = (muted: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 12);
      g.fillStyle(muted ? 0x4a5560 : 0x37474f, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    };
    draw(AudioSystem.isMuted);
    const txt = this.add.text(0, 0, AudioSystem.isMuted ? '🔇' : '🔊', {
      fontSize: '30px',
    }).setOrigin(0.5);
    const c = this.add.container(x, y, [g, txt]).setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      AudioSystem.toggleMuted();
      AudioSystem.refreshMuteState();
      draw(AudioSystem.isMuted);
      txt.setText(AudioSystem.isMuted ? '🔇' : '🔊');
    });
    (c as Phaser.GameObjects.Container & { _draw?: (m: boolean) => void })._draw = draw;
    return c;
  }

  private updateMuteBtn(): void {
    const draw = (this.muteBtn as Phaser.GameObjects.Container & { _draw?: (m: boolean) => void })._draw;
    if (draw) draw(AudioSystem.isMuted);
  }

  shutdown(): void {
    // 离开菜单时不停 BGM（让其他场景接管）
  }
}
