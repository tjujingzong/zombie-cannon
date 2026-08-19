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
  private contractText!: Phaser.GameObjects.Text;
  private battlefieldEventText!: Phaser.GameObjects.Text;
  private battlefieldEventBar!: Phaser.GameObjects.Graphics;
  private dailyChallengeText!: Phaser.GameObjects.Text;
  private performanceText!: Phaser.GameObjects.Text;
  private behaviorEquipmentText!: Phaser.GameObjects.Text;
  private companionText!: Phaser.GameObjects.Text;
  private synergyIcons: Phaser.GameObjects.Text[] = [];
  private pendingIcons: Phaser.GameObjects.Text[] = [];
  private pauseGroup: Phaser.GameObjects.GameObject[] = [];
  private buildGroup: Phaser.GameObjects.GameObject[] = [];
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
      .text(GAME_WIDTH / 2 - 60, 44, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.waveText = this.add.text(GAME_WIDTH - 200, 44, '', textStyle(26, '#8fbf8f')).setOrigin(1, 0.5);

    // 静音按钮（左上角，暂停按钮旁）
    this.createMuteButton(GAME_WIDTH - 130, 44);
    // 暂停按钮
    createButton(this, GAME_WIDTH - 60, 44, 'II', () => this.showPause(), {
      width: 64, height: 52, color: 0x455a64, colorDown: 0x37474f, fontSize: 24,
    });

    // Boss 波提示（顶部居中下方）
    this.bossWaveText = this.add.text(GAME_WIDTH / 2, 90, '⚠ 首领波 ⚠', {
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
    createButton(this, GAME_WIDTH - 72, 934, '构筑', () => this.showBuildPanel(), {
      width: 112, height: 46, color: 0x37474f, colorDown: 0x263238, fontSize: 19,
    }).setDepth(16);
    this.contractText = this.add.text(40, 942, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ff8a80',
      stroke: '#180909', strokeThickness: 3,
    }).setDepth(16);
    this.battlefieldEventText = this.add.text(40, 156, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#071015', strokeThickness: 4,
    }).setDepth(18).setAlpha(0);
    this.battlefieldEventBar = this.add.graphics().setDepth(18);
    this.dailyChallengeText = this.add.text(40, 914, '', {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#071015', strokeThickness: 3,
    }).setDepth(16).setAlpha(0);
    this.performanceText = this.add.text(16, 196, '', {
      fontFamily: 'Consolas, monospace', fontSize: '15px', color: '#a7ffeb',
      backgroundColor: '#071014cc', padding: { x: 7, y: 5 }, lineSpacing: 2,
    }).setDepth(24).setVisible(false);
    this.behaviorEquipmentText = this.add.text(40, 1062, '', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ce93d8',
      stroke: '#071015', strokeThickness: 3,
    }).setDepth(16).setFixedSize(GAME_WIDTH - 80, 24);
    this.companionText = this.add.text(40, 1090, '', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffd54a',
      stroke: '#071015', strokeThickness: 3,
    }).setDepth(16).setFixedSize(GAME_WIDTH - 80, 24);

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
      this, GAME_WIDTH / 2, 730, this.game_.isEndlessMode ? '结束征程' : '放弃关卡',
      () => {
        this.closePause();
        if (this.game_.isEndlessMode) {
          this.game_.finishEndlessRun();
          return;
        }
        this.scene.stop('Game');
        this.scene.stop();
        this.scene.start(this.game_.isDailyMode ? 'Menu' : 'LevelSelect');
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

  private showBuildPanel(): void {
    if (this.buildGroup.length > 0 || this.pauseGroup.length > 0) return;
    this.scene.pause('Game');
    this.performanceText.setVisible(false);

    const overlay = createOverlay(this, 0.78).setDepth(50);
    const panel = this.add.graphics().setDepth(51);
    panel.fillStyle(0x101820, 0.99).fillRoundedRect(34, 76, GAME_WIDTH - 68, GAME_HEIGHT - 152, 8);
    panel.lineStyle(2, 0x607d8b, 0.8).strokeRoundedRect(34, 76, GAME_WIDTH - 68, GAME_HEIGHT - 152, 8);
    const title = this.add.text(72, 112, '火力构筑', {
      fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#ffffff',
    }).setDepth(52);
    const close = createButton(this, GAME_WIDTH - 76, 126, '×', () => this.closeBuildPanel(), {
      width: 54, height: 54, color: 0x455a64, colorDown: 0x263238, fontSize: 34,
    }).setDepth(52);

    const objects: Phaser.GameObjects.GameObject[] = [overlay, panel, title, close];
    const loadout = this.add.text(72, 156,
      `行为装备 · ${this.game_.behaviorEquipmentLabel} · ${this.game_.behaviorEquipmentStatus}`, {
        fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ce93d8',
      }).setDepth(52);
    objects.push(loadout);
    this.game_.skills.getBuildProgress().forEach((build, index) => {
      const y = 190 + index * 80;
      const name = this.add.text(72, y, build.name, {
        fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: build.colorHex,
      }).setDepth(52);
      const percent = Math.round(build.progress * 100);
      const status = this.add.text(GAME_WIDTH - 72, y + 2, build.ultimateActive ? '终极已激活' : `${percent}%`, {
        fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: build.ultimateActive ? '#ffd54a' : '#b0bec5',
      }).setOrigin(1, 0).setDepth(52);
      const tagline = this.add.text(72, y + 30, build.ultimateActive ? build.ultimateName : build.tagline, {
        fontFamily: FONT, fontSize: '14px', color: '#83939e',
      }).setDepth(52);
      const bar = this.add.graphics().setDepth(52);
      bar.fillStyle(0x26343d, 1).fillRoundedRect(72, y + 56, GAME_WIDTH - 144, 10, 5);
      if (build.progress > 0) {
        bar.fillStyle(build.ultimateActive ? 0xffca28 : build.color, 1)
          .fillRoundedRect(72, y + 56, Math.max(8, (GAME_WIDTH - 144) * build.progress), 10, 5);
      }
      objects.push(name, status, tagline, bar);
    });

    const owned = this.game_.skills.getOwnedSkills();
    const skillsTitleY = 190 + this.game_.skills.getBuildProgress().length * 80 + 12;
    const skillsTitle = this.add.text(72, skillsTitleY, `技能载荷 · ${owned.length}`, {
      fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: '#ffffff',
    }).setDepth(52);
    objects.push(skillsTitle);
    owned.slice(0, 8).forEach((entry, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const skillText = this.add.text(72 + col * 292, skillsTitleY + 38 + row * 30, `${entry.skill.name}  Lv.${entry.level}`, {
        fontFamily: FONT, fontSize: '16px', color: entry.skill.category === 'defense' ? '#81c784' : '#cfd8dc',
      }).setDepth(52);
      objects.push(skillText);
    });

    const synergies = this.game_.skills.getActiveSynergies();
    const synergyTitleY = skillsTitleY + 172;
    const synergyTitle = this.add.text(72, synergyTitleY, `组合技 · ${synergies.length}`, {
      fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: '#ffa726',
    }).setDepth(52);
    const synergyText = this.add.text(72, synergyTitleY + 36,
      synergies.length > 0 ? synergies.slice(-6).map((item) => item.name).join(' · ') : '尚未激活', {
        fontFamily: FONT, fontSize: '16px', color: '#c6a76c',
        wordWrap: { width: GAME_WIDTH - 144 }, lineSpacing: 7,
      }).setDepth(52);
    objects.push(synergyTitle, synergyText);

    const damage = this.game_.getDamageBreakdown().slice(0, 4);
    const damageTitleY = synergyTitleY + 108;
    const damageTitle = this.add.text(72, damageTitleY, '主要伤害来源', {
      fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: '#ffffff',
    }).setDepth(52);
    const damageText = this.add.text(72, damageTitleY + 36,
      damage.length > 0
        ? damage.map((item) => `${item.label} ${Math.round(item.percent * 100)}%`).join('  ·  ')
        : '战斗开始后生成统计', {
        fontFamily: FONT, fontSize: '16px', color: '#90caf9',
        wordWrap: { width: GAME_WIDTH - 144 }, lineSpacing: 6,
      }).setDepth(52);
    objects.push(damageTitle, damageText);

    const performance = this.game_.performanceStats;
    const perfLabel = performance.enabled
      ? `FPS ${performance.fps} / 低点 ${performance.lowFps} · 敌 ${performance.enemies} · 弹 ${performance.projectiles} · 粒 ${performance.particles}`
      : '性能监测当前关闭';
    const perfText = this.add.text(72, damageTitleY + 100, perfLabel, {
      fontFamily: 'Consolas, monospace', fontSize: '15px', color: performance.enabled ? '#a7ffeb' : '#78909c',
    }).setDepth(52);
    const perfButton = createButton(this, GAME_WIDTH - 152, damageTitleY + 128, performance.enabled ? '关闭监测' : '开启监测', () => {
      this.game_.setPerformanceMonitoring(!this.game_.performanceStats.enabled);
      this.closeBuildPanel();
      this.showBuildPanel();
    }, {
      width: 190, height: 50, color: performance.enabled ? 0x546e7a : 0x2e7d6f,
      colorDown: 0x245a52, fontSize: 18,
    }).setDepth(52);
    objects.push(perfText, perfButton);
    this.buildGroup = objects;
  }

  private closeBuildPanel(): void {
    this.buildGroup.forEach((object) => object.destroy());
    this.buildGroup = [];
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
    const entries: { label: string; pending: boolean }[] = synergies.length > 8
      ? [
          { label: `已激活 ${synergies.length} 项`, pending: false },
          ...synergies.slice(-7).map((syn) => ({ label: syn.name, pending: false })),
        ]
      : synergies.map((syn) => ({ label: syn.name, pending: false }));

    const pending = this.game_.skills.getPendingSynergies();
    const pendingSlots = Math.max(0, 8 - entries.length);
    entries.push(...pending.slice(0, pendingSlots).map((item) => ({
      label: item.synergy.name,
      pending: true,
    })));

    entries.forEach((entry, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const txt = this.add
        .text(18 + col * 174, GAME_HEIGHT - 26 - row * 30, `${entry.pending ? '○' : '⚡'} ${entry.label}`, {
          fontFamily: FONT, fontSize: '14px', fontStyle: 'bold',
          color: entry.pending ? '#60717e' : '#ffa726',
          backgroundColor: entry.pending ? '#101820aa' : '#1a2530dd',
          align: 'center',
        })
        .setFixedSize(164, 24)
        .setOrigin(0, 0.5)
        .setDepth(15);
      if (entry.pending) this.pendingIcons.push(txt);
      else this.synergyIcons.push(txt);
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
      this.comboText.setText(`×${combo} 连击 · ${mult.toFixed(1)}倍伤害`).setAlpha(1);
      if (combo >= 40) this.comboText.setColor('#ff1744');
      else if (combo >= 20) this.comboText.setColor('#ffd54a');
      else this.comboText.setColor('#4fc3f7');
    } else {
      this.comboText.setAlpha(0);
    }

    // 击杀计数
    const kills = this.game_.skills?.totalKills ?? 0;
    this.killText.setText(kills > 0 ? `☠${kills}` : '');
    this.contractText.setText(
      this.game_.contractStatus || this.game_.challengeContractStatus,
    );
    const modeStatus = this.game_.dailyChallengeStatus || this.game_.endlessStatus;
    const modeColor = this.game_.dailyChallengeStatus
      ? this.game_.dailyChallengeColor
      : this.game_.endlessColor;
    this.dailyChallengeText.setText(modeStatus).setAlpha(modeStatus ? 1 : 0);
    if (modeStatus) {
      this.dailyChallengeText.setColor(`#${modeColor.toString(16).padStart(6, '0')}`);
    }
    const eventStatus = this.game_.battlefieldEventStatus;
    this.battlefieldEventText.setText(eventStatus).setAlpha(eventStatus ? 1 : 0);
    if (eventStatus) {
      this.battlefieldEventText.setColor(`#${this.game_.battlefieldEventColor.toString(16).padStart(6, '0')}`);
    }
    this.battlefieldEventBar.clear();
    const eventProgress = Phaser.Math.Clamp(this.game_.battlefieldEventProgress, 0, 1);
    if (eventProgress > 0) {
      this.battlefieldEventBar.fillStyle(0x071015, 0.82).fillRoundedRect(40, 178, 286, 9, 4);
      this.battlefieldEventBar.fillStyle(this.game_.battlefieldEventColor, 1)
        .fillRoundedRect(41, 179, Math.max(7, 284 * eventProgress), 7, 3);
    }
    const performance = this.game_.performanceStats;
    this.performanceText.setVisible(performance.enabled && this.buildGroup.length === 0);
    if (performance.enabled) {
      this.performanceText.setText(
        `FPS ${performance.fps}  LOW ${performance.lowFps}\nE ${performance.enemies}  B ${performance.projectiles}  P ${performance.particles}  EL ${performance.elites}`,
      );
    }
    this.behaviorEquipmentText
      .setText(`${this.game_.behaviorEquipmentLabel}  |  ${this.game_.behaviorEquipmentStatus}`)
      .setColor(`#${this.game_.behaviorEquipmentColor.toString(16).padStart(6, '0')}`);
    this.companionText
      .setText(this.game_.companionStatus)
      .setColor(`#${this.game_.companionColor.toString(16).padStart(6, '0')}`);

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
