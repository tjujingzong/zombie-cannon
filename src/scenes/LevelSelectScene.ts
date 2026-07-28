import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  META_UPGRADES,
  MetaUpgradeKey,
  metaUpgradeCost,
} from '../data/balance';
import { LEVELS } from '../data/levels';
import { SaveManager } from '../systems/SaveManager';
import { createButton, FONT, textStyle, titleStyle } from '../ui/helpers';

/**
 * 关卡选择 + 局外养成商店
 */
export class LevelSelectScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private shopRows: Partial<Record<MetaUpgradeKey, () => void>> = {};

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

    createButton(this, GAME_WIDTH - 90, 70, '返回', () => this.scene.start('Menu'), {
      width: 130,
      height: 64,
      color: 0x455a64,
      colorDown: 0x37474f,
      fontSize: 26,
    });

    // 关卡网格：3 列
    const cols = 3;
    const cellW = 210;
    const cellH = 150;
    const startX = cx - cellW * (cols - 1) / 2;
    const startY = 220;
    LEVELS.forEach((lv, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.createLevelCell(startX + col * cellW, startY + row * cellH, lv.id, lv.name);
    });

    // 养成商店
    const shopY = startY + Math.ceil(LEVELS.length / cols) * cellH + 30;
    this.add.text(cx, shopY, '—— 永久强化 ——', textStyle(30, '#8fbf8f')).setOrigin(0.5);
    (Object.keys(META_UPGRADES) as MetaUpgradeKey[]).forEach((key, i) => {
      this.createShopRow(key, shopY + 60 + i * 108);
    });
  }

  private createLevelCell(x: number, y: number, id: number, name: string): void {
    const unlocked = id <= SaveManager.unlockedLevel;
    const stars = SaveManager.getStars(id);
    const w = 190;
    const h = 130;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 16);
    g.fillStyle(unlocked ? 0x2b4a33 : 0x2a3138, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    if (unlocked) {
      g.lineStyle(3, 0x4caf50, 0.8).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    }

    if (unlocked) {
      this.add
        .text(x, y - 34, `第 ${id} 关`, {
          fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
        })
        .setOrigin(0.5);
      this.add.text(x, y + 2, name, textStyle(20, '#a8c8a8')).setOrigin(0.5);
      // 星级
      for (let s = 0; s < 3; s++) {
        this.add
          .image(x - 34 + s * 34, y + 40, s < stars ? 'star' : 'star_empty')
          .setScale(0.42);
      }
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      let pressed = false;
      zone.on('pointerdown', () => (pressed = true));
      zone.on('pointerout', () => (pressed = false));
      zone.on('pointerup', () => {
        if (pressed) this.scene.start('Game', { levelId: id });
      });
    } else {
      this.add.text(x, y - 10, '🔒', { fontSize: '44px' }).setOrigin(0.5);
      this.add.text(x, y + 38, `第 ${id} 关`, textStyle(20, '#5a6570')).setOrigin(0.5);
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
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    });
    const descText = this.add.text(x0 + 24, y + 14, cfg.desc, textStyle(20, '#8a9aa8'));

    let btn: Phaser.GameObjects.Container | null = null;
    const refresh = () => {
      const level = SaveManager.getMetaLevel(key);
      const maxed = level >= cfg.max;
      nameText.setText(`${cfg.name}  Lv.${level}${maxed ? ' (满级)' : ''}`);
      descText.setText(cfg.desc);
      btn?.destroy();
      if (maxed) {
        btn = createButton(this, x0 + w - 110, y, '已满级', () => {}, {
          width: 170, height: 64, fontSize: 24, disabled: true,
        });
        return;
      }
      const cost = metaUpgradeCost(key, level);
      const affordable = SaveManager.coins >= cost;
      btn = createButton(
        this,
        x0 + w - 110,
        y,
        `${cost} 金币`,
        () => {
          if (SaveManager.spendCoins(cost)) {
            SaveManager.upgradeMeta(key);
            this.coinText.setText(`${SaveManager.coins}`);
            // 刷新所有商店行的按钮（金币变化影响可购买态）
            Object.values(this.shopRows).forEach((fn) => fn && fn());
          }
        },
        {
          width: 170,
          height: 64,
          fontSize: 24,
          color: affordable ? 0xb8860b : 0x4a5560,
          colorDown: 0x8a6508,
          disabled: !affordable,
        }
      );
    };
    this.shopRows[key] = refresh;
    refresh();
  }
}
