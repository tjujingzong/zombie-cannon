import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  META_UPGRADES,
  MetaUpgradeKey,
  metaUpgradeCost,
} from '../data/balance';
import { LEVELS, LEVEL_ENGINE_INFO, TOTAL_LEVELS } from '../data/levels';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveManager } from '../systems/SaveManager';
import { createButton, FONT, textStyle, titleStyle } from '../ui/helpers';

/**
 * 关卡选择 + 局外养成商店（50 关可滚动，按章节分段，Boss 关标记）
 */
export class LevelSelectScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private shopRows: Partial<Record<MetaUpgradeKey, () => void>> = {};
  private contentContainer!: Phaser.GameObjects.Container;
  private levelsContainer!: Phaser.GameObjects.Container;
  private shopContainer!: Phaser.GameObjects.Container;
  private renderTarget!: Phaser.GameObjects.Container;
  private contentHeight = 0;
  private levelContentHeight = 0;
  private shopContentHeight = 0;
  private scrollY = 0;
  private scrollHitbox!: Phaser.GameObjects.Zone;
  private scrollbar!: Phaser.GameObjects.Graphics;
  private pageLabel!: Phaser.GameObjects.Text;
  private chapterPage = 0;
  private activeTab: 'levels' | 'shop' = 'levels';
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private pageButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x101820, 0x101820, 0x16222c, 0x16222c, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 顶栏：标题单独占一行，避免被返回/图鉴按钮遮挡
    this.add.text(cx, 54, '选择关卡', titleStyle(48)).setOrigin(0.5);
    this.add.image(126, 54, 'coin').setScale(0.9);
    this.coinText = this.add.text(148, 54, `${SaveManager.coins}`, textStyle(25, '#ffd54a')).setOrigin(0, 0.5);

    createButton(this, 58, 54, '返回', () => {
      AudioSystem.play('ui_click');
      AudioSystem.startBGM('menu');
      this.scene.start('Menu');
    }, { width: 92, height: 48, fontSize: 20, color: 0x455a64, colorDown: 0x37474f });

    // 图鉴入口（右上角）
    createButton(this, GAME_WIDTH - 58, 54, '图鉴', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Codex', { returnTo: 'LevelSelect' });
    }, { width: 104, height: 48, fontSize: 20, color: 0x6a3b8a, colorDown: 0x4a2b6a });

    // 分栏：关卡分页与金币商店分开，避免把商店挤到长列表底部
    this.contentContainer = this.add.container(0, 0).setDepth(5);
    this.levelsContainer = this.add.container(0, 188);
    this.shopContainer = this.add.container(0, 188).setVisible(false);
    this.contentContainer.add([this.levelsContainer, this.shopContainer]);
    this.scrollbar = this.add.graphics().setDepth(8);

    this.tabButtons = [
      createButton(this, GAME_WIDTH / 2 - 100, 126, '关卡', () => this.showTab('levels'), {
        width: 180, height: 50, fontSize: 22, color: 0x2f754b, colorDown: 0x205636,
      }),
      createButton(this, GAME_WIDTH / 2 + 100, 126, '金币商店', () => this.showTab('shop'), {
        width: 180, height: 50, fontSize: 22, color: 0x7a5a19, colorDown: 0x604411,
      }),
    ];
    this.tabButtons[1].setAlpha(0.62);

    this.chapterPage = Phaser.Math.Clamp(
      Math.floor((SaveManager.unlockedLevel - 1) / LEVEL_ENGINE_INFO.chapterSize),
      0, Math.ceil(TOTAL_LEVELS / LEVEL_ENGINE_INFO.chapterSize) - 1,
    );
    this.pageLabel = this.add.text(cx, 164, '', textStyle(20, '#b0bec5')).setOrigin(0.5);
    this.buildLevelPage();
    this.buildShopPage();
    this.refreshPageControls();

    // 轻量滚动容器：商店未来扩展时仍可继续容纳内容
    const viewTop = 188;
    const viewH = GAME_HEIGHT - viewTop - 20;
    this.scrollHitbox = this.add.zone(GAME_WIDTH / 2, viewTop + viewH / 2, GAME_WIDTH, viewH)
      .setInteractive({ useHandCursor: true });
    this.scrollHitbox.on('wheel', (_pointer: Phaser.Input.Pointer, _deltaX: number, _deltaY: number, delta: number) => this.scrollBy(delta > 0 ? 90 : -90));
    let dragStartY = 0;
    let dragStartScroll = 0;
    this.scrollHitbox.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragStartY = p.y; dragStartScroll = this.scrollY;
    });
    this.scrollHitbox.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.setScroll(dragStartScroll - (p.y - dragStartY));
    });
    this.drawScrollbar();
  }

  private buildLevelPage(): void {
    this.levelsContainer.removeAll(true);
    const chapterSize = LEVEL_ENGINE_INFO.chapterSize;
    const startId = this.chapterPage * chapterSize + 1;
    const endId = Math.min(startId + chapterSize - 1, TOTAL_LEVELS);
    const headerG = this.add.graphics();
    headerG.fillStyle(0x2a3b2c, 0.75).fillRoundedRect(20, 18, GAME_WIDTH - 40, 44, 12);
    const headerTxt = this.add.text(40, 40, `第 ${this.chapterPage + 1} 章  ·  ${LEVELS[startId - 1]?.name ?? ''}`, {
      fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: '#ffd54a',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5);
    this.levelsContainer.add([headerG, headerTxt]);

    const cols = 5;
    const cellW = 130;
    const cellH = 156;
    const startX = (GAME_WIDTH - cellW * (cols - 1)) / 2;
    for (let id = startId; id <= endId; id++) {
      const lv = LEVELS.find((l) => l.id === id);
      if (!lv) continue;
      const idx = id - startId;
      this.renderTarget = this.levelsContainer;
      this.createLevelCell(startX + (idx % cols) * cellW, 134 + Math.floor(idx / cols) * cellH, lv.id, lv.name, lv.bossLevel);
    }
    this.levelContentHeight = 188 + 134 + 2 * cellH + 28;
    if (this.activeTab === 'levels') this.contentHeight = this.levelContentHeight;
    this.pageLabel.setText(`章节 ${this.chapterPage + 1} / ${Math.ceil(TOTAL_LEVELS / chapterSize)}  ·  ${startId}-${endId} 关`);
    this.setScroll(0);
  }

  private buildShopPage(): void {
    this.shopContainer.removeAll(true);
    this.renderTarget = this.shopContainer;
    this.shopContainer.add(this.add.text(GAME_WIDTH / 2, 30, '金币商店', {
      ...textStyle(30, '#ffd54a'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5));
    this.shopContainer.add(this.add.text(GAME_WIDTH / 2, 64, '永久效果 · 每局都会生效', textStyle(16, '#8a9aa8')).setOrigin(0.5));
    (Object.keys(META_UPGRADES) as MetaUpgradeKey[]).forEach((key, i) => this.createShopRow(key, 122 + i * 108));
    this.shopContentHeight = 188 + 122 + Object.keys(META_UPGRADES).length * 108 + 24;
    if (this.activeTab === 'shop') this.contentHeight = this.shopContentHeight;
  }

  private showTab(tab: 'levels' | 'shop'): void {
    this.activeTab = tab;
    this.levelsContainer.setVisible(tab === 'levels');
    this.shopContainer.setVisible(tab === 'shop');
    this.tabButtons[0].setAlpha(tab === 'levels' ? 1 : 0.62);
    this.tabButtons[1].setAlpha(tab === 'shop' ? 1 : 0.62);
    this.pageLabel.setVisible(tab === 'levels');
    this.pageButtons.forEach((b) => b.setVisible(tab === 'levels'));
    this.contentHeight = tab === 'levels' ? this.levelContentHeight : this.shopContentHeight;
    this.setScroll(0);
    AudioSystem.play('ui_click');
  }

  private refreshPageControls(): void {
    this.pageButtons.forEach((b) => b.destroy());
    this.pageButtons = [];
    const maxPage = Math.ceil(TOTAL_LEVELS / LEVEL_ENGINE_INFO.chapterSize) - 1;
    if (this.chapterPage > 0) {
      this.pageButtons.push(createButton(this, 74, 164, '◀', () => {
        this.chapterPage--;
        this.buildLevelPage();
        this.refreshPageControls();
      }, { width: 58, height: 42, fontSize: 20, color: 0x455a64, colorDown: 0x37474f }));
    }
    if (this.chapterPage < maxPage) {
      this.pageButtons.push(createButton(this, GAME_WIDTH - 74, 164, '▶', () => {
        this.chapterPage++;
        this.buildLevelPage();
        this.refreshPageControls();
      }, { width: 58, height: 42, fontSize: 20, color: 0x455a64, colorDown: 0x37474f }));
    }
  }

  private createLevelCell(x: number, y: number, id: number, name: string, isBoss: boolean): void {
    const unlocked = id <= SaveManager.unlockedLevel;
    const stars = SaveManager.getStars(id);
    const w = 116, h = 142;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 14);
    let bgC: number;
    if (isBoss && unlocked) bgC = 0x4a1a2a;
    else if (unlocked) bgC = 0x2b4a33;
    else bgC = 0x2a3138;
    g.fillStyle(bgC, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    if (unlocked) {
      g.lineStyle(3, isBoss ? 0xe74c3c : 0x4caf50, 0.85).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    }
    // 先添加背景图形到容器
    this.renderTarget.add(g);

    if (unlocked) {
      // Boss 关标记
      if (isBoss) {
        this.renderTarget.add(this.add.image(x, y - h / 2 + 14, 'boss_crown').setScale(0.7));
      }
      this.renderTarget.add(
        this.add.text(x, y - h / 2 + (isBoss ? 34 : 26), `${id}`, {
          fontFamily: FONT, fontSize: isBoss ? '26px' : '30px', fontStyle: 'bold',
          color: isBoss ? '#ffd54a' : '#ffffff',
        }).setOrigin(0.5)
      );
      // 关卡题目（完整名称，自动换行最多两行）
      const nameTxt = this.add.text(x, y + 2, name, {
        ...textStyle(14, '#ffffff'), fontStyle: 'bold',
        align: 'center', wordWrap: { width: w - 8 },
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
      this.renderTarget.add(nameTxt);
      // 星级
      for (let s = 0; s < 3; s++) {
        this.renderTarget.add(
          this.add.image(x - 24 + s * 24, y + h / 2 - 18, s < stars ? 'star' : 'star_empty').setScale(0.32)
        );
      }
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      let pressed = false;
      zone.on('pointerdown', () => { pressed = true; });
      zone.on('pointerout', () => { pressed = false; });
      zone.on('pointerup', () => {
        if (pressed) {
          AudioSystem.play('ui_click');
          this.scene.start('Game', { levelId: id });
        }
      });
      this.renderTarget.add(zone);
    } else {
      this.renderTarget.add(this.add.text(x, y - 12, '🔒', { fontSize: '36px' }).setOrigin(0.5));
      this.renderTarget.add(this.add.text(x, y + 36, `${id}`, textStyle(16, '#8a9aa8')).setOrigin(0.5));
    }
  }

  private createShopRow(key: MetaUpgradeKey, y: number): void {
    const cfg = META_UPGRADES[key];
    const x0 = 40;
    const w = GAME_WIDTH - 80;
    const h = 94;

    const g = this.add.graphics();
    g.fillStyle(0x1b2733, 1).fillRoundedRect(x0, y - h / 2, w, h, 14);

    const nameText = this.add.text(x0 + 24, y - 20, '', {
      fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
    });
    const descText = this.add.text(x0 + 24, y + 14, cfg.desc, textStyle(18, '#8a9aa8'));

    let btn: Phaser.GameObjects.Container | null = null;
    const refresh = () => {
      const level = SaveManager.getMetaLevel(key);
      const maxed = level >= cfg.max;
      nameText.setText(`${cfg.name}  Lv.${level}${maxed ? ' (满级)' : ''}`);
      descText.setText(cfg.desc);
      btn?.destroy();
      if (maxed) {
        btn = createButton(this, x0 + w - 100, y, '已满级', () => {}, {
          width: 160, height: 60, fontSize: 22, disabled: true,
        });
        this.shopContainer.add(btn);
        return;
      }
      const cost = metaUpgradeCost(key, level);
      const affordable = SaveManager.coins >= cost;
      btn = createButton(
        this,
        x0 + w - 100,
        y,
        `${cost} 金`,
        () => {
          if (SaveManager.spendCoins(cost)) {
            SaveManager.upgradeMeta(key);
            this.coinText.setText(`${SaveManager.coins}`);
            AudioSystem.play('upgrade');
            Object.values(this.shopRows).forEach((fn) => fn && fn());
          }
        },
        {
          width: 160, height: 60, fontSize: 22,
          color: affordable ? 0xb8860b : 0x4a5560,
          colorDown: 0x8a6508, disabled: !affordable,
        }
      );
      this.shopContainer.add(btn);
    };
    this.shopContainer.add([g, nameText, descText]);
    this.shopRows[key] = refresh;
    refresh();
  }

  // ── 滚动 ──
  private setScroll(target: number): void {
    const viewTop = 188;
    const viewH = GAME_HEIGHT - viewTop - 20;
    const maxScroll = Math.max(0, this.contentHeight - (viewTop + viewH));
    this.scrollY = Phaser.Math.Clamp(target, 0, maxScroll);
    this.contentContainer.setY(-this.scrollY);
    this.drawScrollbar();
  }

  private scrollBy(delta: number): void {
    this.setScroll(this.scrollY + delta);
  }

  private drawScrollbar(): void {
    this.scrollbar.clear();
    const viewTop = 188;
    const viewH = GAME_HEIGHT - viewTop - 20;
    const contentLength = Math.max(viewH, this.contentHeight - viewTop);
    if (contentLength <= viewH) return;
    const trackX = GAME_WIDTH - 8;
    this.scrollbar.fillStyle(0xffffff, 0.08).fillRoundedRect(trackX, viewTop, 4, viewH, 2);
    const ratio = viewH / contentLength;
    const thumbH = Math.max(40, viewH * ratio);
    const maxScroll = contentLength - viewH;
    const thumbY = viewTop + (maxScroll > 0 ? (this.scrollY / maxScroll) * (viewH - thumbH) : 0);
    this.scrollbar.fillStyle(0xffd54a, 0.6).fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
  }
}
