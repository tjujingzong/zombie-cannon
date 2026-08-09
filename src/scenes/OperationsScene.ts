import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { ACHIEVEMENTS, getAchievementProgress, type WeeklyMissionDef } from '../data/operations';
import { ARMORY_ITEMS } from '../data/shop';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager, type WeeklyCacheReward } from '../systems/SaveManager';
import { createButton, FONT, textStyle, titleStyle } from '../ui/helpers';

type OperationsTab = 'weekly' | 'achievements';

export class OperationsScene extends Phaser.Scene {
  private activeTab: OperationsTab = 'weekly';
  private content?: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private tabButtons: Record<OperationsTab, Phaser.GameObjects.Container> = {} as Record<OperationsTab, Phaser.GameObjects.Container>;
  private compactToast: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Operations');
  }

  create(): void {
    this.compactToast = [];
    const cx = GAME_WIDTH / 2;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c151b, 0x0c151b, 0x17272a, 0x17272a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(cx, 62, '行动档案', titleStyle(50)).setOrigin(0.5);
    createButton(this, 62, 62, '返回', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Menu');
    }, { width: 100, height: 50, fontSize: 20, color: 0x455a64, colorDown: 0x37474f });
    this.add.image(GAME_WIDTH - 138, 62, 'coin').setScale(0.9);
    this.coinText = this.add.text(GAME_WIDTH - 116, 62, `${SaveManager.coins}`, textStyle(24, '#ffd54a')).setOrigin(0, 0.5);

    this.tabButtons.weekly = createButton(this, cx - 145, 142, '本周行动', () => this.showTab('weekly'), {
      width: 250, height: 58, fontSize: 25, color: 0x2f754b, colorDown: 0x205636,
    });
    this.tabButtons.achievements = createButton(this, cx + 145, 142, '终身成就', () => this.showTab('achievements'), {
      width: 250, height: 58, fontSize: 25, color: 0x755b2f, colorDown: 0x584320,
    });
    this.renderContent();
  }

  private showTab(tab: OperationsTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    AudioSystem.play('ui_click');
    this.renderContent();
  }

  private renderContent(): void {
    this.content?.destroy(true);
    this.content = this.add.container(0, 0);
    this.tabButtons.weekly.setAlpha(this.activeTab === 'weekly' ? 1 : 0.55);
    this.tabButtons.achievements.setAlpha(this.activeTab === 'achievements' ? 1 : 0.55);
    if (this.activeTab === 'weekly') this.renderWeekly();
    else this.renderAchievements();
    this.coinText.setText(`${SaveManager.coins}`);
  }

  private renderWeekly(): void {
    const operation = SaveManager.weeklyOperation;
    const claimedCount = operation.missions.filter((mission) => SaveManager.isWeeklyMissionClaimed(mission.id)).length;
    const band = this.add.graphics();
    band.fillStyle(0x0b1116, 0.7).fillRect(0, 188, GAME_WIDTH, 74);
    band.fillStyle(0x4caf50, 0.9).fillRect(0, 188, 6, 74);
    this.addContent(band);
    this.addContent(this.add.text(34, 210, `${operation.weekKey} · ${operation.displayRange}`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }));
    this.addContent(this.add.text(GAME_WIDTH - 34, 210, `${claimedCount}/3 已领取`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: claimedCount === 3 ? '#69f0ae' : '#b0bec5',
    }).setOrigin(1, 0));

    operation.missions.forEach((mission, index) => this.createWeeklyMissionCard(mission, 350 + index * 205));
    this.createWeeklyCacheCard(1002);
    this.addContent(this.add.text(GAME_WIDTH / 2, 1210, '周一 00:00 更新 · 上海时间', textStyle(16, '#71828e')).setOrigin(0.5));
  }

  private createWeeklyMissionCard(mission: WeeklyMissionDef, y: number): void {
    const progress = SaveManager.getWeeklyProgress(mission.metric);
    const ratio = Phaser.Math.Clamp(progress / mission.target, 0, 1);
    const claimed = SaveManager.isWeeklyMissionClaimed(mission.id);
    const complete = progress >= mission.target;
    const left = 36;
    const width = GAME_WIDTH - 72;
    const height = 170;
    const card = this.add.graphics();
    card.fillStyle(0x091015, 0.45).fillRoundedRect(left + 3, y - height / 2 + 5, width, height, 8);
    card.fillStyle(claimed ? 0x13241e : 0x17242d, 0.98).fillRoundedRect(left, y - height / 2, width, height, 8);
    card.lineStyle(2, mission.color, claimed ? 0.45 : 0.85).strokeRoundedRect(left, y - height / 2, width, height, 8);
    card.fillStyle(mission.color, 1).fillRect(left, y - height / 2, 7, height);
    this.addContent(card);

    this.addContent(this.add.text(62, y - 60, `${mission.categoryName} · ${mission.name}`, {
      fontFamily: FONT, fontSize: '25px', fontStyle: 'bold', color: mission.colorHex,
    }));
    this.addContent(this.add.text(62, y - 21, mission.desc, textStyle(18, '#b8c5cd')));
    this.addContent(this.add.text(62, y + 18, `${Math.min(progress, mission.target)} / ${mission.target}`, {
      fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: complete ? '#69f0ae' : '#90a4ae',
    }));
    this.addContent(this.add.text(500, y - 52, `+${mission.rewardCoins}`, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(1, 0));
    this.addContent(this.add.image(514, y - 41, 'coin').setScale(0.68));

    const bar = this.add.graphics();
    bar.fillStyle(0x071015, 1).fillRoundedRect(62, y + 49, 420, 12, 6);
    if (ratio > 0) bar.fillStyle(mission.color, 1).fillRoundedRect(64, y + 51, Math.max(8, 416 * ratio), 8, 4);
    this.addContent(bar);

    const button = createButton(this, 578, y + 42, claimed ? '已领取' : complete ? '领取' : '进行中', () => {
      const reward = SaveManager.claimWeeklyMission(mission.id);
      if (reward <= 0) return;
      AudioSystem.play('upgrade');
      this.renderContent();
      this.showCompactToast('行动完成', `金币 +${reward}`, mission.color);
    }, {
      width: 130, height: 56, fontSize: 21,
      color: 0x2f8f63, colorDown: 0x236e4c, disabled: claimed || !complete,
    });
    this.addContent(button);
  }

  private createWeeklyCacheCard(y: number): void {
    const preview = SaveManager.getWeeklyCachePreview();
    const item = preview.itemKey ? ARMORY_ITEMS.find((entry) => entry.key === preview.itemKey) : undefined;
    const claimed = SaveManager.weeklyCacheClaimed;
    const claimable = SaveManager.canClaimWeeklyCache();
    const card = this.add.graphics();
    card.fillStyle(0x19130a, 0.96).fillRoundedRect(36, y - 78, GAME_WIDTH - 72, 156, 8);
    card.lineStyle(3, 0xffb300, claimed ? 0.4 : 0.9).strokeRoundedRect(36, y - 78, GAME_WIDTH - 72, 156, 8);
    this.addContent(card);
    this.addContent(this.add.text(62, y - 56, '周度军需箱', {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffd54a',
    }));
    const rewardText = claimed
      ? '本周奖励已入库'
      : item
        ? `${item.name} · 金币 +${preview.coins}`
        : `军械已集齐 · 金币 +${preview.coins}`;
    this.addContent(this.add.text(62, y - 13, rewardText, textStyle(18, '#ffe082')));
    this.addContent(this.add.text(62, y + 26, claimed ? '周一刷新新行动' : '三份行动奖励全部领取后开启', textStyle(16, '#9f9280')));
    const button = createButton(this, 574, y + 15, claimed ? '已开启' : claimable ? '开启' : '未解锁', () => {
      const reward = SaveManager.claimWeeklyCache();
      if (!reward) return;
      AudioSystem.play('upgrade');
      this.renderContent();
      this.showCacheReward(reward);
    }, {
      width: 138, height: 62, fontSize: 22, color: 0xb8860b, colorDown: 0x8a6508,
      disabled: claimed || !claimable,
    });
    this.addContent(button);
  }

  private renderAchievements(): void {
    const stats = SaveManager.careerStats;
    const claimedCount = ACHIEVEMENTS.filter((achievement) => SaveManager.isAchievementClaimed(achievement.id)).length;
    const band = this.add.graphics();
    band.fillStyle(0x0b1116, 0.7).fillRect(0, 188, GAME_WIDTH, 74);
    band.fillStyle(0xffb300, 0.9).fillRect(0, 188, 6, 74);
    this.addContent(band);
    this.addContent(this.add.text(34, 210, '防线荣誉记录', {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }));
    this.addContent(this.add.text(GAME_WIDTH - 34, 210, `${claimedCount}/${ACHIEVEMENTS.length} 已领取`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(1, 0));

    ACHIEVEMENTS.forEach((achievement, index) => {
      const x = index % 2 === 0 ? 190 : 530;
      const y = 360 + Math.floor(index / 2) * 220;
      const progress = getAchievementProgress(achievement, stats);
      const ratio = Phaser.Math.Clamp(progress / achievement.target, 0, 1);
      const claimed = SaveManager.isAchievementClaimed(achievement.id);
      const complete = progress >= achievement.target;
      const card = this.add.graphics();
      card.fillStyle(claimed ? 0x16241e : 0x17242d, 0.98).fillRoundedRect(x - 156, y - 94, 312, 188, 8);
      card.lineStyle(2, achievement.color, claimed ? 0.38 : 0.78).strokeRoundedRect(x - 156, y - 94, 312, 188, 8);
      this.addContent(card);
      this.addContent(this.add.text(x - 136, y - 76, achievement.name, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: achievement.colorHex,
      }));
      this.addContent(this.add.text(x - 136, y - 40, achievement.desc, {
        ...textStyle(15, '#aab8c2'), wordWrap: { width: 272 },
      }));
      this.addContent(this.add.text(x - 136, y + 15, `${Math.min(progress, achievement.target)} / ${achievement.target}`, {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: complete ? '#69f0ae' : '#82939e',
      }));
      const bar = this.add.graphics();
      bar.fillStyle(0x071015, 1).fillRoundedRect(x - 136, y + 42, 150, 10, 5);
      if (ratio > 0) bar.fillStyle(achievement.color, 1).fillRoundedRect(x - 134, y + 44, Math.max(7, 146 * ratio), 6, 3);
      this.addContent(bar);
      this.addContent(this.add.text(x - 136, y + 67, `+${achievement.rewardCoins} 金`, {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffd54a',
      }).setOrigin(0, 0.5));
      const button = createButton(this, x + 84, y + 68, claimed ? '已领取' : complete ? '领取' : '未达成', () => {
        const reward = SaveManager.claimAchievement(achievement.id);
        if (reward <= 0) return;
        AudioSystem.play('upgrade');
        this.renderContent();
        this.showCompactToast('成就解锁', `金币 +${reward}`, achievement.color);
      }, {
        width: 120, height: 48, fontSize: 18, color: 0x8b6b24, colorDown: 0x6c5118,
        disabled: claimed || !complete,
      });
      this.addContent(button);
    });
  }

  private showCacheReward(reward: WeeklyCacheReward): void {
    const item = reward.itemKey ? ARMORY_ITEMS.find((entry) => entry.key === reward.itemKey) : undefined;
    this.showRewardModal('军需箱开启', item ? `${item.name}\n金币 +${reward.coins}` : `金币 +${reward.coins}`, 0xffb300);
  }

  private showCompactToast(titleText: string, rewardText: string, color: number): void {
    this.compactToast.forEach((object) => {
      this.tweens.killTweensOf(object);
      object.destroy();
    });
    const band = this.add.rectangle(GAME_WIDTH / 2, 1160, 430, 70, 0x071015, 0.96)
      .setStrokeStyle(2, color, 0.9).setDepth(80).setAlpha(0);
    const text = this.add.text(GAME_WIDTH / 2, 1160, `${titleText} · ${rewardText}`, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setDepth(81).setAlpha(0);
    this.compactToast = [band, text];
    this.tweens.add({
      targets: [band, text], alpha: 1, duration: 140, hold: 820, yoyo: true,
      onComplete: () => {
        band.destroy();
        text.destroy();
        if (this.compactToast[0] === band) this.compactToast = [];
      },
    });
  }

  private showRewardModal(titleText: string, rewardText: string, color: number): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68)
      .setDepth(80).setInteractive();
    const panel = this.add.graphics().setDepth(81);
    panel.fillStyle(0x101820, 0.99).fillRoundedRect(80, 430, GAME_WIDTH - 160, 330, 8);
    panel.lineStyle(3, color, 0.95).strokeRoundedRect(80, 430, GAME_WIDTH - 160, 330, 8);
    const title = this.add.text(GAME_WIDTH / 2, 505, titleText, {
      fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#071015', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(82);
    const reward = this.add.text(GAME_WIDTH / 2, 615, rewardText, {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`,
      align: 'center', lineSpacing: 12,
    }).setOrigin(0.5).setDepth(82);
    const close = createButton(this, GAME_WIDTH / 2, 704, '签收', () => {
      [overlay, panel, title, reward, close].forEach((object) => object.destroy());
    }, { width: 220, height: 64, fontSize: 24, color: 0x2f754b, colorDown: 0x205636 }).setDepth(82);
  }

  private addContent<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.content?.add(object);
    return object;
  }
}
