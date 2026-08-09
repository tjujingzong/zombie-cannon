import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager } from '../systems/SaveManager';
import { createButton, FONT, textStyle, titleStyle } from '../ui/helpers';
import { getDailyChallenge } from '../data/daily';

export class MenuScene extends Phaser.Scene {
  private muteBtn!: Phaser.GameObjects.Container;
  private decorZombies: Phaser.GameObjects.Image[] = [];
  private saveFeedback?: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const daily = getDailyChallenge();
    this.decorZombies = [];

    // 夜战前哨：深色天空、城市剪影与通向基地的透视道路。
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x081117, 0x081117, 0x173329, 0x173329, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x68d391, 0.025).fillCircle(cx + 170, 176, 190);
    bg.fillStyle(0xd8f3e4, 0.055).fillCircle(cx + 170, 176, 88);
    bg.fillStyle(0x071015, 0.82);
    for (let i = 0; i < 10; i++) {
      const x = i * 82 - 24;
      const height = 78 + (i % 4) * 30;
      bg.fillRect(x, 470 - height, 68, height);
      bg.fillStyle(0xa7f3d0, 0.055).fillRect(x + 13, 424 - height, 7, 11).fillRect(x + 39, 445 - height, 7, 11);
      bg.fillStyle(0x071015, 0.82);
    }
    bg.fillStyle(0x8fbf8f, 0.04).fillPoints([
      new Phaser.Math.Vector2(cx - 68, 420),
      new Phaser.Math.Vector2(cx + 68, 420),
      new Phaser.Math.Vector2(GAME_WIDTH - 20, GAME_HEIGHT),
      new Phaser.Math.Vector2(20, GAME_HEIGHT),
    ], true);
    bg.lineStyle(3, 0x8fbf8f, 0.08)
      .lineBetween(cx - 68, 420, 20, GAME_HEIGHT)
      .lineBetween(cx + 68, 420, GAME_WIDTH - 20, GAME_HEIGHT);

    for (let i = 0; i < 18; i++) {
      const mote = this.add.image(
        Phaser.Math.Between(20, GAME_WIDTH - 20),
        Phaser.Math.Between(120, GAME_HEIGHT - 90),
        'ambient_mote',
      ).setScale(Phaser.Math.FloatBetween(0.1, 0.35)).setAlpha(Phaser.Math.FloatBetween(0.08, 0.24))
        .setTint(i % 3 === 0 ? 0xffb74d : 0x8fd8c5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(24, 70),
        x: mote.x + Phaser.Math.Between(-12, 12),
        alpha: 0,
        duration: Phaser.Math.Between(2200, 4700),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    // 装饰僵尸剪影（缓慢晃动）
    const decorTypes = ['zombie_normal', 'zombie_fast', 'zombie_tank', 'zombie_spitter'];
    for (let i = 0; i < 8; i++) {
      const z = this.add
        .image(
          Phaser.Math.Between(60, GAME_WIDTH - 60),
          Phaser.Math.Between(GAME_HEIGHT * 0.5, GAME_HEIGHT - 120),
          decorTypes[i % decorTypes.length]
        )
        .setTint(i % 3 === 0 ? 0x385946 : 0x17251e)
        .setAlpha(i % 3 === 0 ? 0.34 : 0.48)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.7));
      this.decorZombies.push(z);
      this.tweens.add({
        targets: z, y: z.y - 8, duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    }

    // 标题瞄准环：环线分层缓慢反向旋转，保持动势但不干扰文字。
    const titleGlow = this.add.graphics();
    titleGlow.fillStyle(0xffd54a, 0.035).fillRect(0, 210, GAME_WIDTH, 180);
    titleGlow.lineStyle(3, 0xffd54a, 0.12);
    titleGlow.lineBetween(24, 300, 154, 300);
    titleGlow.lineBetween(GAME_WIDTH - 154, 300, GAME_WIDTH - 24, 300);
    const outerRing = this.add.graphics().setPosition(cx, 300);
    outerRing.lineStyle(2, 0x8fbf8f, 0.15).strokeCircle(0, 0, 310);
    outerRing.lineStyle(5, 0x8fbf8f, 0.22).arc(0, 0, 310, 0.12, 0.82).arc(0, 0, 310, 3.25, 3.95);
    const innerRing = this.add.graphics().setPosition(cx, 300);
    innerRing.lineStyle(3, 0xffd54a, 0.17).strokeCircle(0, 0, 238);
    innerRing.lineStyle(5, 0xffd54a, 0.3).arc(0, 0, 238, 1.15, 1.65).arc(0, 0, 238, 4.3, 4.8);
    this.tweens.add({ targets: outerRing, angle: 360, duration: 60000, repeat: -1 });
    this.tweens.add({ targets: innerRing, angle: -360, duration: 42000, repeat: -1 });
    this.add.text(cx, 224, '前哨 07 · 最后防线', textStyle(18, '#ffd166')).setOrigin(0.5).setAlpha(0.82);
    this.add.text(cx, 300, '僵尸炮台', titleStyle(88)).setOrigin(0.5);
    this.add.text(cx, 394, '尸 潮 生 存 防 线', textStyle(25, '#8fd8a9')).setOrigin(0.5);

    // 展示炮台
    const cannonStage = this.add.graphics();
    cannonStage.fillStyle(0xffca28, 0.035).fillEllipse(cx, 650, 330, 150);
    cannonStage.fillStyle(0x80deea, 0.025).fillTriangle(cx, 510, cx - 185, 690, cx + 185, 690);
    cannonStage.lineStyle(2, 0x9fbac5, 0.12).strokeEllipse(cx, 650, 310, 90);
    this.add.image(cx, 640, 'cannon_base').setScale(2);
    this.add.image(cx, 596, 'cannon_barrel').setOrigin(0.5, 0.78).setScale(2);
    // 炮台微光
    const glow = this.add.image(cx, 640, 'muzzle_flash').setScale(1.8).setAlpha(0.24).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.08, scale: 2.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    createButton(this, cx, 790, '开始游戏', () => {
      AudioSystem.play('ui_click');
      this.scene.start('LevelSelect');
    }, { width: 380, height: 84, fontSize: 34 });

    createButton(this, cx, 890, `每日挑战 · ${daily.modifier.name}`, () => {
      AudioSystem.play('ui_click');
      this.scene.start('Game', { dailyChallengeDate: daily.dateKey });
    }, {
      width: 380, height: 76, fontSize: 27,
      color: daily.modifier.color, colorDown: 0x5d4037,
    });

    createButton(this, cx, 985, '末日无尽', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Game', { endlessMode: true });
    }, {
      width: 380, height: 76, fontSize: 30,
      color: 0xb64a2f, colorDown: 0x7a2d20,
    });

    // 图鉴与行动档案
    createButton(this, 150, 1085, '图鉴', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Codex');
    }, { width: 190, height: 72, fontSize: 27, color: 0x6a3b8a, colorDown: 0x4a2b6a });

    const claimable = SaveManager.getClaimableOperationCount();
    createButton(this, 390, 1085, claimable > 0 ? `行动档案 · ${claimable}` : '行动档案', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Operations');
    }, { width: 260, height: 72, fontSize: 25, color: 0x2f754b, colorDown: 0x205636 });

    // 静音按钮
    this.muteBtn = this.createMuteButton(570, 1085);
    this.updateMuteBtn();

    createButton(this, 150, 1170, '导出存档', () => this.exportSave(), {
      width: 160, height: 48, fontSize: 18, color: 0x455a64, colorDown: 0x37474f,
    });
    createButton(this, 570, 1170, '导入存档', () => this.importSave(), {
      width: 160, height: 48, fontSize: 18, color: 0x455a64, colorDown: 0x37474f,
    });
    this.saveFeedback = this.add.text(cx, 1124, '', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#8fbf8f',
    }).setOrigin(0.5);

    this.add
      .text(cx, 1165, `金币: ${SaveManager.coins}`, textStyle(28, '#ffd54a'))
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

  private exportSave(): void {
    const payload = SaveManager.exportSave();
    const copied = navigator.clipboard?.writeText(payload);
    if (copied) {
      copied.then(
        () => this.showSaveFeedback('存档已复制到剪贴板', '#8fbf8f'),
        () => { window.prompt('复制下面的存档文本', payload); },
      );
    } else {
      window.prompt('复制下面的存档文本', payload);
    }
  }

  private importSave(): void {
    const raw = window.prompt('粘贴存档文本');
    if (!raw) return;
    if (!SaveManager.importSave(raw)) {
      this.showSaveFeedback('存档无效，当前进度未改变', '#ff8a80');
      return;
    }
    this.showSaveFeedback('存档已导入', '#8fbf8f');
    this.time.delayedCall(450, () => this.scene.restart());
  }

  private showSaveFeedback(message: string, color: string): void {
    this.saveFeedback?.setText(message).setColor(color);
    this.time.delayedCall(2400, () => {
      if (this.saveFeedback?.text === message) this.saveFeedback.setText('');
    });
  }

  shutdown(): void {
    // 离开菜单时不停 BGM（让其他场景接管）
  }
}
