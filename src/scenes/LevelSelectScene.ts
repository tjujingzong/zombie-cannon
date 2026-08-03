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
  private contentHeight = 0;
  private scrollY = 0;
  private scrollHitbox!: Phaser.GameObjects.Zone;
  private scrollbar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x101820, 0x101820, 0x16222c, 0x16222c, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 顶栏
    this.add.text(cx, 70, '选择关卡', titleStyle(52)).setOrigin(0.5);
    this.add.image(48, 70, 'coin').setScale(1.1);
    this.coinText = this.add.text(72, 70, `${SaveManager.coins}`, textStyle(30, '#ffd54a')).setOrigin(0, 0.5);

    createButton(this, 60, 70, '返回', () => {
      AudioSystem.play('ui_click');
      AudioSystem.startBGM('menu');
      this.scene.start('Menu');
    }, { width: 100, height: 52, fontSize: 22, color: 0x455a64, colorDown: 0x37474f });

    // 图鉴入口（右上角）
    createButton(this, GAME_WIDTH - 60, 70, '图鉴', () => {
      AudioSystem.play('ui_click');
      this.scene.start('Codex', { returnTo: 'LevelSelect' });
    }, { width: 110, height: 52, fontSize: 22, color: 0x6a3b8a, colorDown: 0x4a2b6a });

    // 滚动容器：关卡网格 + 商店
    this.contentContainer = this.add.container(0, 130).setDepth(5);

    const cols = 5;
    const cellW = 130;
    const cellH = 156;
    const startX = (GAME_WIDTH - cellW * (cols - 1)) / 2;

    // 按章节分组渲染
    const chapterSize = LEVEL_ENGINE_INFO.chapterSize;
    let y = 20;

    for (let chapter = 0; chapter < Math.ceil(TOTAL_LEVELS / chapterSize); chapter++) {
      const startId = chapter * chapterSize + 1;
      const endId = Math.min(startId + chapterSize - 1, TOTAL_LEVELS);
      if (startId > TOTAL_LEVELS) break;

      // 章节标题条
      const headerG = this.add.graphics();
      headerG.fillStyle(0x2a3b2c, 0.7).fillRoundedRect(20, y, GAME_WIDTH - 40, 40, 10);
      const headerTxt = this.add.text(40, y + 20, `第 ${chapter + 1} 章`, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffd54a',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5);
      this.contentContainer.add([headerG, headerTxt]);
      y += 56;

      // 该章节的关卡
      for (let id = startId; id <= endId; id++) {
        const lv = LEVELS.find((l) => l.id === id);
        if (!lv) continue;
        const idx = id - startId;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        this.createLevelCell(startX + col * cellW, y + row * cellH, lv.id, lv.name, lv.bossLevel);
      }
      const rows = Math.ceil((endId - startId + 1) / cols);
      y += rows * cellH + 20;
    }

    // 养成商店
    this.contentContainer.add(this.add.text(cx, y + 10, '—— 永久强化 ——', {
      ...textStyle(30, '#ffffff'),
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0));
    y += 60;
    (Object.keys(META_UPGRADES) as MetaUpgradeKey[]).forEach((key, i) => {
      this.createShopRow(key, y + i * 108);
    });
    y += Object.keys(META_UPGRADES).length * 108 + 40;

    this.contentHeight = y;

    // 滚动 hitbox（覆盖关卡 + 商店区）
    this.scrollbar = this.add.graphics().setDepth(8);
    const viewTop = 130;
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

    if (unlocked) {
      // Boss 关标记
      if (isBoss) {
        this.contentContainer.add(this.add.image(x, y - h / 2 + 14, 'boss_crown').setScale(0.7));
      }
      this.contentContainer.add(
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
      this.contentContainer.add(nameTxt);
      // 星级
      for (let s = 0; s < 3; s++) {
        this.contentContainer.add(
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
      this.contentContainer.add(zone);
    } else {
      this.contentContainer.add(this.add.text(x, y - 12, '🔒', { fontSize: '36px' }).setOrigin(0.5));
      this.contentContainer.add(this.add.text(x, y + 36, `${id}`, textStyle(16, '#8a9aa8')).setOrigin(0.5));
    }
    this.contentContainer.add(g);
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
    };
    this.shopRows[key] = refresh;
    refresh();
    this.contentContainer.add([g, nameText, descText]);
  }

  // ── 滚动 ──
  private setScroll(target: number): void {
    const viewTop = 130;
    const viewH = GAME_HEIGHT - viewTop - 20;
    const maxScroll = Math.max(0, this.contentHeight - viewH);
    this.scrollY = Phaser.Math.Clamp(target, 0, maxScroll);
    this.contentContainer.setY(viewTop - this.scrollY);
    this.drawScrollbar();
  }

  private scrollBy(delta: number): void {
    this.setScroll(this.scrollY + delta);
  }

  private drawScrollbar(): void {
    this.scrollbar.clear();
    const viewTop = 130;
    const viewH = GAME_HEIGHT - viewTop - 20;
    if (this.contentHeight <= viewH) return;
    const trackX = GAME_WIDTH - 8;
    this.scrollbar.fillStyle(0xffffff, 0.08).fillRoundedRect(trackX, viewTop, 4, viewH, 2);
    const ratio = viewH / this.contentHeight;
    const thumbH = Math.max(40, viewH * ratio);
    const maxScroll = this.contentHeight - viewH;
    const thumbY = viewTop + (maxScroll > 0 ? (this.scrollY / maxScroll) * (viewH - thumbH) : 0);
    this.scrollbar.fillStyle(0xffd54a, 0.6).fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
  }
}
