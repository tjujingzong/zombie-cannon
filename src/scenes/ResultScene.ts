import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { LEVELS } from '../data/levels';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager } from '../systems/SaveManager';
import { createButton, textStyle, titleStyle } from '../ui/helpers';

interface ResultData {
  levelId: number;
  victory: boolean;
  stars: number;
  coinsEarned: number;
  maxStreak?: number;
  totalKills?: number;
  synergies?: string[];
  dailyChallengeDate?: string;
  dailyModifierName?: string;
  dailyFirstClear?: boolean;
  endlessSeed?: number;
  endlessWave?: number;
  endlessScore?: number;
  endlessBestWave?: number;
  endlessBestScore?: number;
  endlessMutations?: string[];
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
    if (!this.data_) {
      this.scene.start('LevelSelect');
      return;
    }
    const cx = GAME_WIDTH / 2;
    const {
      victory, stars, coinsEarned, levelId, maxStreak = 0, totalKills = 0, synergies = [],
      dailyChallengeDate, dailyModifierName, dailyFirstClear = false,
      endlessSeed, endlessWave = 0, endlessScore = 0, endlessBestWave = 0, endlessBestScore = 0,
      endlessMutations = [],
    } = this.data_;
    const isDailyChallenge = Boolean(dailyChallengeDate);
    const isEndless = endlessSeed !== undefined;

    const bg = this.add.graphics();
    if (victory) {
      bg.fillGradientStyle(0x101820, 0x101820, 0x1d3324, 0x1d3324, 1);
    } else {
      bg.fillGradientStyle(0x1a1012, 0x1a1012, 0x2b181c, 0x2b181c, 1);
    }
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(
        cx,
        isEndless ? 170 : 240,
        isEndless ? '无尽征程' : victory ? isDailyChallenge ? '每日挑战完成' : '胜利！' : '基地失守…',
        titleStyle(isEndless || isDailyChallenge ? 66 : 84),
      )
      .setOrigin(0.5)
      .setColor(isEndless ? '#ffb74d' : victory ? '#ffd54a' : '#e74c3c');

    // 星级
    if (victory && !isEndless) {
      for (let i = 0; i < 3; i++) {
        const img = this.add
          .image(cx - 110 + i * 110, 400, i < stars ? 'star' : 'star_empty')
          .setScale(0).setDepth(5);
        this.tweens.add({
          targets: img, scale: 1.4, delay: 200 + i * 180, duration: 300, ease: 'Back.Out',
        });
      }
    }

    // 金币结算
    const coinY = isEndless ? 300 : 530;
    this.add.image(cx - 70, coinY, 'coin').setScale(1.4);
    this.add
      .text(cx - 36, coinY, `+${coinsEarned}`, textStyle(44, '#ffd54a'))
      .setOrigin(0, 0.5);
    this.add
      .text(cx, isEndless ? 356 : 590, `当前金币: ${SaveManager.coins}`, textStyle(24, '#8a9aa8'))
      .setOrigin(0.5);

    // 战斗统计
    let statY = isEndless ? 420 : 650;
    if (isEndless) {
      this.add.text(cx, statY, `坚持 ${endlessWave} 波 · ${endlessScore} 分`, {
        ...textStyle(30, '#ffb74d'), fontStyle: 'bold',
      }).setOrigin(0.5);
      statY += 46;
      this.add.text(cx, statY, `历史最佳 ${endlessBestWave} 波 · ${endlessBestScore} 分`, textStyle(21, '#90a4ae'))
        .setOrigin(0.5);
      statY += 42;
      this.add.text(
        cx,
        statY,
        endlessMutations.length > 0 ? `战场变异 · ${endlessMutations.join(' · ')}` : '战场变异 · 尚未出现',
        { ...textStyle(19, '#ce93d8'), wordWrap: { width: GAME_WIDTH - 100 }, align: 'center' },
      ).setOrigin(0.5, 0);
      statY += endlessMutations.length > 2 ? 70 : 42;
    }
    if (isDailyChallenge) {
      this.add.text(cx, statY, `${dailyChallengeDate} · ${dailyModifierName ?? '每日词缀'}`, {
        ...textStyle(24, '#64b5f6'), fontStyle: 'bold',
      }).setOrigin(0.5);
      statY += 40;
      if (victory) {
        this.add.text(
          cx,
          statY,
          dailyFirstClear ? '今日首胜奖励已领取' : '重复挑战奖励',
          textStyle(20, dailyFirstClear ? '#69f0ae' : '#90a4ae'),
        ).setOrigin(0.5);
        statY += 36;
      }
    }
    if (totalKills > 0) {
      this.add.text(cx, statY, `击杀数: ${totalKills}`, textStyle(26, '#b0bec5')).setOrigin(0.5);
      statY += 40;
    }
    if (maxStreak > 0) {
      this.add.text(cx, statY, `最大连杀: ${maxStreak}`, textStyle(26, maxStreak >= 30 ? '#ff6d00' : '#ffd54a')).setOrigin(0.5);
      statY += 40;
    }
    if (synergies.length > 0 && isEndless) {
      this.add.text(
        cx,
        statY,
        `组合技 ${synergies.length} · ${synergies.slice(-4).join(' · ')}`,
        { ...textStyle(19, '#ffa726'), wordWrap: { width: GAME_WIDTH - 100 }, align: 'center' },
      ).setOrigin(0.5, 0);
      statY += 70;
    } else if (synergies.length > 0) {
      this.add.text(cx, statY, '组合技:', textStyle(24, '#ffa726')).setOrigin(0.5);
      statY += 35;
      synergies.forEach((name) => {
        this.add.text(cx, statY, `⚡ ${name}`, textStyle(22, '#ffa726')).setOrigin(0.5);
        statY += 32;
      });
    }

    // 按钮
    const hasNext = !isDailyChallenge && !isEndless && victory && levelId < LEVELS.length;
    let y = Math.max(statY + 20, isEndless ? 760 : 840);
    // 进入结算页时恢复菜单 BGM
    this.time.delayedCall(1200, () => AudioSystem.startBGM('menu'));

    if (hasNext) {
      createButton(this, cx, y, '下一关', () => {
        AudioSystem.play('ui_click');
        this.scene.start('Game', { levelId: levelId + 1 });
      }, { width: 360, height: 96, fontSize: 34 });
      y += 120;
    }
    createButton(
      this, cx, y,
      isEndless ? '重试本局' : victory ? '再次挑战' : '重新挑战',
      () => {
        AudioSystem.play('ui_click');
        this.scene.start(
          'Game',
          isEndless ? { endlessMode: true, endlessSeed } : dailyChallengeDate ? { dailyChallengeDate } : { levelId },
        );
      },
      { width: 360, height: 96, fontSize: 34, color: hasNext ? 0x455a64 : 0x2e7d32, colorDown: hasNext ? 0x37474f : 0x1b5e20 }
    );
    y += 120;
    createButton(this, cx, y, isDailyChallenge || isEndless ? '返回主菜单' : '返回选关', () => {
      AudioSystem.play('ui_click');
      this.scene.start(isDailyChallenge || isEndless ? 'Menu' : 'LevelSelect');
    }, { width: 360, height: 96, fontSize: 34, color: 0x455a64, colorDown: 0x37474f });
  }
}
