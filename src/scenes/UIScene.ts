import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { AudioSystem } from '../systems/AudioSystem';
import type { GameScene } from './GameScene';
import { FONT, createButton, createOverlay, textStyle } from '../ui/helpers';

/**
 * HUD：金币 / 波次 / 墙血条 / 连杀 / 技能图标 / 暂停 / 静音
 */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private coinText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private wallBar!: Phaser.GameObjects.Graphics;
  private shieldBar!: Phaser.GameObjects.Graphics;
  private streakText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private bossWaveText!: Phaser.GameObjects.Text;
  private hordeText!: Phaser.GameObjects.Text;
  private overdriveBar!: Phaser.GameObjects.Graphics;
  private overdriveText!: Phaser.GameObjects.Text;
  private overdriveButton!: Phaser.GameObjects.Container;
  private synergyIcons: Phaser.GameObjects.Text[] = [];
  private pendingIcons: Phaser.GameObjects.Text[] = [];
  private pauseGroup: Phaser.GameObjects.GameObject[] = [];
  private lastSynergyHash = '';

  constructor() {
    super('UI');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;

    // 顶栏底
    const top = this.add.graphics();
    top.fillStyle(0x000000, 0.4).fillRoundedRect(12, 12, GAME_WIDTH - 24, 64, 14);

    this.add.image(48, 44, 'coin').setScale(0.95);
    this.coinText = this.add.text(72, 44, '0', textStyle(28, '#ffd54a')).setOrigin(0, 0.5);

    this.levelText = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.waveText = this.add.text(GAME_WIDTH - 200, 44, '', textStyle(26, '#8fbf8f')).setOrigin(1, 0.5);

    // 静音按钮（左上角，暂停按钮旁）
    this.createMuteButton(GAME_WIDTH - 130, 44);
    // 暂停按钮
    createButton(this, GAME_WIDTH - 60, 44, 'II', () => this.showPause(), {
      width: 64, height: 52, color: 0x455a64, colorDown: 0x37474f, fontSize: 24,
    });

    // Boss 波提示（顶部居中下方）
    this.bossWaveText = this.add.text(GAME_WIDTH / 2, 90, '⚠ BOSS 波 ⚠', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ff1744',
      stroke: '#1a2530', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.hordeText = this.add.text(48, 92, '', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#b6ff6a',
      stroke: '#102218', strokeThickness: 3,
    }).setOrigin(0, 0.5).setAlpha(0);

    // 连杀显示
    this.streakText = this.add
      .text(GAME_WIDTH / 2, 130, '', {
        fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffd54a',
        stroke: '#1a2530', strokeThickness: 4,
      })
      .setOrigin(0.5).setAlpha(0);

    // 连击显示
    this.comboText = this.add
      .text(GAME_WIDTH - 80, 150, '', {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#4fc3f7',
        stroke: '#1a2530', strokeThickness: 3,
      })
      .setOrigin(0.5).setAlpha(0);

    // 击杀计数
    this.killText = this.add.text(GAME_WIDTH - 80, 180, '', textStyle(18, '#8a9aa8')).setOrigin(0.5);

    // 墙血条 + 护盾条
    this.wallBar = this.add.graphics();
    this.shieldBar = this.add.graphics();
    this.overdriveBar = this.add.graphics().setDepth(15);
    this.overdriveText = this.add.text(40, 974, '⚡ 过载 0%', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#95a9b6',
      stroke: '#101820', strokeThickness: 3,
    }).setDepth(15);
    this.overdriveButton = this.createOverdriveButton();

    // 底部技能图标区
    this.updateSynergyDisplay();
  }

  private createMuteButton(x: number, y: number): Phaser.GameObjects.Container {
    const w = 56, h = 48;
    const g = this.add.graphics();
    const draw = (muted: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 10);
      g.fillStyle(muted ? 0x4a5560 : 0x455a64, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    };
    draw(AudioSystem.isMuted);
    const txt = this.add.text(0, 0, AudioSystem.isMuted ? '🔇' : '🔊', { fontSize: '22px' }).setOrigin(0.5);
    const c = this.add.container(x, y, [g, txt]).setSize(w, h).setInteractive({ useHandCursor: true }).setDepth(20);
    c.on('pointerup', () => {
      AudioSystem.toggleMuted();
      AudioSystem.refreshMuteState();
      draw(AudioSystem.isMuted);
      txt.setText(AudioSystem.isMuted ? '🔇' : '🔊');
    });
    (c as Phaser.GameObjects.Container & { _draw?: (m: boolean) => void })._draw = draw;
    return c;
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
      this, GAME_WIDTH / 2, 730, '放弃关卡',
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

  private updateSynergyDisplay(): void {
    // 清除旧的
    this.synergyIcons.forEach((s) => s.destroy());
    this.synergyIcons = [];
    this.pendingIcons.forEach((s) => s.destroy());
    this.pendingIcons = [];

    if (!this.game_?.skills) return;
    const synergies = this.game_.skills.getActiveSynergies();
    const startX = 30;
    const y = GAME_HEIGHT - 40;

    synergies.forEach((syn, i) => {
      const txt = this.add
        .text(startX + i * 110, y, `⚡${syn.name}`, {
          fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffa726',
          backgroundColor: '#1a2530cc', padding: { x: 6, y: 3 },
        })
        .setDepth(15);
      this.synergyIcons.push(txt);
    });

    // 显示差一个就能激活的组合技（暗色提示）
    const pending = this.game_.skills.getPendingSynergies();
    pending.slice(0, 2).forEach((p, i) => {
      const txt = this.add
        .text(startX + (synergies.length + i) * 110, y, `○ ${p.synergy.name}`, {
          fontFamily: FONT, fontSize: '14px', color: '#5a6a7a',
          backgroundColor: '#1a253066', padding: { x: 4, y: 2 },
        })
        .setDepth(15);
      this.pendingIcons.push(txt);
    });
  }

  private createOverdriveButton(): Phaser.GameObjects.Container {
    const w = 150, h = 48;
    const bg = this.add.graphics();
    const txt = this.add.text(0, 0, '⚡ 过载', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#788894',
    }).setOrigin(0.5);
    const button = this.add.container(GAME_WIDTH - 112, 990, [bg, txt])
      .setSize(w, h).setDepth(16).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => {
      if (this.game_?.triggerOverdrive()) AudioSystem.play('ui_click');
    });
    (button as Phaser.GameObjects.Container & { _draw?: (ready: boolean, active: boolean) => void })._draw = (ready, active) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 12);
      bg.fillStyle(active ? 0x007c91 : ready ? 0x2f8f63 : 0x293640, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.fillStyle(0xffffff, active || ready ? 0.2 : 0.06).fillRoundedRect(-w / 2, -h / 2, w, h / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
      txt.setColor(active || ready ? '#ffffff' : '#788894');
      txt.setText(active ? '⚡ 爆发中' : ready ? '⚡ 释放' : '⚡ 过载');
    };
    return button;
  }

  update(): void {
    if (!this.game_) return;
    this.coinText.setText(`${this.game_.runCoins}`);
    this.levelText.setText(this.game_.levelName);
    this.waveText.setText(`波次 ${this.game_.waveLabel}`);

    // Boss 波提示
    if (this.game_.isBossWave) {
      const pulse = 0.6 + Math.sin(this.time.now * 0.006) * 0.4;
      this.bossWaveText.setAlpha(pulse);
    } else {
      this.bossWaveText.setAlpha(0);
    }
    if (this.game_.isHordeActive) {
      this.hordeText.setText(`尸潮 · ${this.game_.enemyCount}`).setAlpha(1);
    } else {
      this.hordeText.setAlpha(0);
    }

    // 连杀
    const streak = this.game_.skills?.killStreak ?? 0;
    if (streak >= 5) {
      this.streakText.setText(`🔥 x${streak}`).setAlpha(1);
      if (streak >= 50) this.streakText.setColor('#ff1744');
      else if (streak >= 30) this.streakText.setColor('#ff6d00');
      else if (streak >= 15) this.streakText.setColor('#ffd54a');
      else this.streakText.setColor('#8fbf8f');
    } else {
      this.streakText.setAlpha(0);
    }

    // 连击倍率显示
    const combo = this.game_.hitComboDisplay ?? 0;
    if (combo >= 5) {
      const mult = 1 + Math.min(combo * 0.02, 1.0);
      this.comboText.setText(`×${combo} 连击 (×${mult.toFixed(1)})`).setAlpha(1);
      if (combo >= 40) this.comboText.setColor('#ff1744');
      else if (combo >= 20) this.comboText.setColor('#ffd54a');
      else this.comboText.setColor('#4fc3f7');
    } else {
      this.comboText.setAlpha(0);
    }

    // 击杀计数
    const kills = this.game_.skills?.totalKills ?? 0;
    this.killText.setText(kills > 0 ? `☠${kills}` : '');

    // 墙血条
    const ratio = this.game_.wallMaxHp > 0 ? this.game_.wallHp / this.game_.wallMaxHp : 0;
    const w = GAME_WIDTH - 80;
    const y = 1030;
    this.wallBar.clear();
    this.wallBar.fillStyle(0x000000, 0.5).fillRoundedRect(40, y, w, 18, 9);
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xf5a623 : 0xe74c3c;
    if (ratio > 0) {
      this.wallBar.fillStyle(color, 1).fillRoundedRect(42, y + 2, Math.max(10, (w - 4) * ratio), 14, 7);
    }

    // 护盾条
    const shieldRatio = this.game_.wallMaxHp > 0 ? this.game_.wallShield / this.game_.wallMaxHp : 0;
    this.shieldBar.clear();
    if (shieldRatio > 0) {
      this.shieldBar.fillStyle(0x42a5f5, 0.7).fillRoundedRect(42, y - 6, (w - 4) * shieldRatio, 4, 2);
    }

    // 过载槽与主动按钮
    const charge = Phaser.Math.Clamp(this.game_.overdriveCharge / 100, 0, 1);
    const active = this.game_.skills?.isOverdriveActive ?? false;
    const ready = this.game_.overdriveReady;
    this.overdriveBar.clear();
    this.overdriveBar.fillStyle(0x000000, 0.5).fillRoundedRect(40, 988, 440, 12, 6);
    this.overdriveBar.fillStyle(active ? 0x4de7ff : ready ? 0x66e08a : 0x607d8b, 1)
      .fillRoundedRect(42, 990, Math.max(6, 436 * (active ? 1 : charge)), 8, 4);
    this.overdriveText.setText(active ? '⚡ 过载 · 火力全开' : `⚡ 过载 ${Math.round(charge * 100)}%`)
      .setColor(active ? '#4de7ff' : ready ? '#66e08a' : '#95a9b6');
    const draw = (this.overdriveButton as Phaser.GameObjects.Container & { _draw?: (r: boolean, a: boolean) => void })._draw;
    draw?.(ready, active);

    // 刷新组合技显示（仅在组合技/待激活列表变化时重建，避免每帧 GC）
    const synHash = JSON.stringify({
      active: this.game_.skills?.getActiveSynergies().map((s) => s.key) ?? [],
      pending: this.game_.skills?.getPendingSynergies().map((p) => p.synergy.key) ?? [],
    });
    if (synHash !== this.lastSynergyHash) {
      this.lastSynergyHash = synHash;
      this.updateSynergyDisplay();
    }
  }
}
