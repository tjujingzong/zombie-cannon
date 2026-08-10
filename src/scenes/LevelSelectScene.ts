import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  META_UPGRADES,
  MetaUpgradeKey,
  metaUpgradeCost,
  ZOMBIE_CODEX,
  ZOMBIE_TYPES,
} from '../data/balance';
import { LEVELS, LEVEL_ENGINE_INFO, TOTAL_LEVELS } from '../data/levels';
import { ARMORY_ITEMS, type ArmoryItemDef } from '../data/shop';
import {
  BEHAVIOR_EQUIPMENT,
  BEHAVIOR_SLOT_LABELS,
  type BehaviorEquipmentDef,
  type BehaviorEquipmentSlot,
} from '../data/equipment';
import {
  COMPANION_PROTOCOLS,
  type CompanionProtocolDef,
} from '../data/companion';
import {
  CHALLENGE_CONTRACTS,
  type ChallengeContractDef,
} from '../data/challengeContracts';
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
  private arsenalContainer!: Phaser.GameObjects.Container;
  private moduleContainer!: Phaser.GameObjects.Container;
  private renderTarget!: Phaser.GameObjects.Container;
  private contentHeight = 0;
  private levelContentHeight = 0;
  private shopContentHeight = 0;
  private arsenalContentHeight = 0;
  private moduleContentHeight = 0;
  private scrollY = 0;
  private scrollHitbox!: Phaser.GameObjects.Zone;
  private scrollbar!: Phaser.GameObjects.Graphics;
  private pageLabel!: Phaser.GameObjects.Text;
  private pageNavBand!: Phaser.GameObjects.Rectangle;
  private chapterPage = 0;
  private activeTab: 'levels' | 'shop' | 'arsenal' | 'modules' = 'levels';
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
    this.arsenalContainer = this.add.container(0, 188).setVisible(false);
    this.moduleContainer = this.add.container(0, 188).setVisible(false);
    this.contentContainer.add([this.levelsContainer, this.shopContainer, this.arsenalContainer, this.moduleContainer]);
    const contentMaskShape = this.make.graphics({ x: 0, y: 0 });
    contentMaskShape.fillStyle(0xffffff).fillRect(0, 188, GAME_WIDTH, GAME_HEIGHT - 208);
    this.contentContainer.setMask(contentMaskShape.createGeometryMask());
    this.scrollbar = this.add.graphics().setDepth(8);

    this.tabButtons = [
      createButton(this, 96, 126, '关卡', () => this.showTab('levels'), {
        width: 138, height: 50, fontSize: 20, color: 0x2f754b, colorDown: 0x205636,
      }),
      createButton(this, 272, 126, '强化', () => this.showTab('shop'), {
        width: 138, height: 50, fontSize: 20, color: 0x7a5a19, colorDown: 0x604411,
      }),
      createButton(this, 448, 126, '军械库', () => this.showTab('arsenal'), {
        width: 138, height: 50, fontSize: 20, color: 0x355d78, colorDown: 0x27475c,
      }),
      createButton(this, 624, 126, '模块', () => this.showTab('modules'), {
        width: 138, height: 50, fontSize: 20, color: 0x6a4b7c, colorDown: 0x50385f,
      }),
    ];
    this.tabButtons[1].setAlpha(0.62);
    this.tabButtons[2].setAlpha(0.62);
    this.tabButtons[3].setAlpha(0.62);

    this.chapterPage = Phaser.Math.Clamp(
      Math.floor((SaveManager.unlockedLevel - 1) / LEVEL_ENGINE_INFO.chapterSize),
      0, Math.ceil(TOTAL_LEVELS / LEVEL_ENGINE_INFO.chapterSize) - 1,
    );
    this.pageNavBand = this.add.rectangle(cx, GAME_HEIGHT - 48, GAME_WIDTH, 86, 0x101820, 0.96)
      .setDepth(7);
    this.pageLabel = this.add.text(cx, GAME_HEIGHT - 48, '', textStyle(19, '#b0bec5'))
      .setOrigin(0.5).setDepth(9);
    this.buildLevelPage();
    this.buildShopPage();
    this.buildArsenalPage();
    this.buildModulePage();
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

    // 章节情报：填充关卡网格下方空间，给玩家明确的进度和威胁预期
    const intelY = 500;
    const intelBg = this.add.graphics();
    intelBg.fillStyle(0x16242d, 0.96).fillRoundedRect(28, intelY, GAME_WIDTH - 56, 338, 8);
    intelBg.fillStyle(0x263b32, 1).fillRect(28, intelY, GAME_WIDTH - 56, 48);
    intelBg.lineStyle(1, 0x4d6659, 0.65).lineBetween(48, intelY + 160, GAME_WIDTH - 48, intelY + 160);
    this.levelsContainer.add(intelBg);

    const chapterLevels = LEVELS.slice(startId - 1, endId);
    const earnedStars = chapterLevels.reduce((sum, level) => sum + SaveManager.getStars(level.id), 0);
    const cleared = chapterLevels.filter((level) => SaveManager.getStars(level.id) > 0).length;
    const threatTypes = Array.from(new Set(
      chapterLevels.flatMap((level) => level.waves.flatMap((wave) => wave.groups.map((group) => group.type))),
    )).sort((a, b) => (ZOMBIE_CODEX[b]?.threat ?? 0) - (ZOMBIE_CODEX[a]?.threat ?? 0)).slice(0, 7);
    const modifiers = [
      '腐尸密度上升 · 最终波必定触发尸潮',
      '快速单位增多 · 需要穿透与减速',
      '精英护航加强 · 优先击杀支援单位',
      '远程威胁增加 · 注意防线持续损耗',
      '多首领压境 · 保留过载应对终局',
    ];

    this.levelsContainer.add(this.add.text(48, intelY + 24, '章节作战情报', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5));
    this.levelsContainer.add(this.add.text(GAME_WIDTH - 48, intelY + 24, `${cleared}/10 关  ·  ${earnedStars}/30 星`, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(1, 0.5));

    const progress = Phaser.Math.Clamp(earnedStars / 30, 0, 1);
    const progressG = this.add.graphics();
    progressG.fillStyle(0x0b1116, 0.9).fillRoundedRect(48, intelY + 70, GAME_WIDTH - 96, 14, 7);
    if (progress > 0) progressG.fillStyle(0x4caf50, 1).fillRoundedRect(50, intelY + 72, (GAME_WIDTH - 100) * progress, 10, 5);
    this.levelsContainer.add(progressG);
    this.levelsContainer.add(this.add.text(48, intelY + 112, `章节词缀  ${modifiers[this.chapterPage]}`, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#a9c9b4',
      wordWrap: { width: GAME_WIDTH - 96 },
    }));
    this.levelsContainer.add(this.add.text(48, intelY + 180, '可能遭遇', {
      fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffd54a',
    }));

    threatTypes.forEach((type, i) => {
      const stats = ZOMBIE_TYPES[type];
      const codex = ZOMBIE_CODEX[type];
      if (!stats || !codex) return;
      const x = 78 + i * 92;
      this.levelsContainer.add(this.add.image(x, intelY + 242, stats.texture).setScale(Math.min(0.68, stats.scale * 0.58)));
      this.levelsContainer.add(this.add.text(x, intelY + 294, codex.role.replace('者', ''), {
        fontFamily: FONT, fontSize: '13px', color: '#b0bec5', align: 'center',
      }).setOrigin(0.5));
    });
    this.levelsContainer.add(this.add.text(48, intelY + 320, '章节奖励：首次通关金币、星级记录与下一关解锁', {
      fontFamily: FONT, fontSize: '16px', color: '#78909c',
    }).setOrigin(0, 0.5));

    this.levelContentHeight = 188 + intelY + 356;
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

  private buildArsenalPage(): void {
    this.arsenalContainer.removeAll(true);
    this.arsenalContainer.add(this.add.text(GAME_WIDTH / 2, 30, '军械与战场装配', {
      ...textStyle(30, '#7dd3fc'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5));
    this.arsenalContainer.add(this.add.text(GAME_WIDTH / 2, 64, '购买后永久解锁 · 同类装备可随时切换', textStyle(16, '#8a9aa8')).setOrigin(0.5));

    ARMORY_ITEMS.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.createArmoryCard(item, 190 + col * 340, 190 + row * 254);
    });
    const rows = Math.ceil(ARMORY_ITEMS.length / 2);
    this.arsenalContentHeight = 188 + 190 + rows * 254 + 20;
    if (this.activeTab === 'arsenal') this.contentHeight = this.arsenalContentHeight;
  }

  private createArmoryCard(item: ArmoryItemDef, x: number, y: number): void {
    const w = 310, h = 224;
    const owned = SaveManager.ownsArmoryItem(item.key);
    const equipped = SaveManager.getEquippedArmoryItem(item.kind) === item.key;
    const affordable = SaveManager.coins >= item.cost;
    const g = this.add.graphics();
    g.fillStyle(0x0b1116, 0.35).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 5, w, h, 8);
    g.fillStyle(equipped ? 0x183a36 : 0x1b2733, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(2, equipped ? 0x4de7b0 : 0x3f5666, 0.9).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.arsenalContainer.add(g);
    this.arsenalContainer.add(this.add.image(x - 102, y - 52, item.icon).setScale(0.86));
    this.arsenalContainer.add(this.add.text(x - 62, y - 82, item.name, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: equipped ? '#66e0b0' : '#ffffff',
    }));
    const kindLabel = item.kind === 'background' ? '战场背景' : item.kind === 'decor' ? '基地装饰' : '辅助炮台';
    this.arsenalContainer.add(this.add.text(x - 62, y - 50, kindLabel, textStyle(15, '#7dd3fc')));
    this.arsenalContainer.add(this.add.text(x - 130, y + 2, item.desc, {
      ...textStyle(16, '#aab8c2'), wordWrap: { width: 260 }, align: 'left',
    }));

    const label = equipped ? '卸下' : owned ? '装备' : `${item.cost} 金`;
    const button = createButton(this, x, y + 72, label, () => {
      if (equipped) {
        SaveManager.equipArmoryItem(item.kind, item.kind === 'background' ? 'default' : 'none');
        AudioSystem.play('ui_click');
        this.buildArsenalPage();
        return;
      }
      if (!SaveManager.ownsArmoryItem(item.key)) {
        if (!SaveManager.buyArmoryItem(item.key, item.cost)) return;
        this.coinText.setText(`${SaveManager.coins}`);
      }
      SaveManager.equipArmoryItem(item.kind, item.key);
      AudioSystem.play('upgrade');
      this.buildArsenalPage();
    }, {
      width: 220, height: 52, fontSize: 19,
      color: equipped ? 0x455a64 : owned ? 0x2f8f63 : affordable ? 0xb8860b : 0x4a5560,
      colorDown: owned ? 0x236e4c : 0x8a6508,
      disabled: !owned && !affordable,
    });
    this.arsenalContainer.add(button);
  }

  private buildModulePage(): void {
    this.moduleContainer.removeAll(true);
    this.moduleContainer.add(this.add.text(GAME_WIDTH / 2, 28, '行为装备', {
      ...textStyle(30, '#ce93d8'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5));
    this.moduleContainer.add(this.add.text(
      GAME_WIDTH / 2,
      64,
      '三槽同时生效 · 5 × 5 × 5 = 125 种战斗组合 · 6 套伙伴协议',
      textStyle(16, '#9ba8b2'),
    ).setOrigin(0.5));

    const slots: BehaviorEquipmentSlot[] = ['barrel', 'ammo', 'wall'];
    let cursorY = 106;
    slots.forEach((slot) => {
      const items = BEHAVIOR_EQUIPMENT.filter((item) => item.slot === slot);
      const headerY = cursorY;
      this.moduleContainer.add(this.add.text(30, headerY, BEHAVIOR_SLOT_LABELS[slot], {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      }));
      this.moduleContainer.add(this.add.text(GAME_WIDTH - 30, headerY + 2, `${items.length} 选一`, {
        ...textStyle(15, '#78909c'), align: 'right',
      }).setOrigin(1, 0));
      items.forEach((item, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        this.createModuleCard(item, 124 + col * 236, headerY + 145 + row * 228);
      });
      cursorY += Math.ceil(items.length / 3) * 228 + 48;
    });

    const companionHeaderY = cursorY;
    this.moduleContainer.add(this.add.text(30, companionHeaderY, '战术伙伴 R-7 · 协同协议', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }));
    this.moduleContainer.add(this.add.text(GAME_WIDTH - 30, companionHeaderY + 2, `${COMPANION_PROTOCOLS.length} 选一`, {
      ...textStyle(15, '#78909c'), align: 'right',
    }).setOrigin(1, 0));
    COMPANION_PROTOCOLS.forEach((protocol, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      this.createCompanionCard(protocol, 124 + col * 236, companionHeaderY + 145 + row * 228);
    });

    cursorY += Math.ceil(COMPANION_PROTOCOLS.length / 3) * 228 + 66;
    const challengeHeaderY = cursorY;
    this.moduleContainer.add(this.add.text(30, challengeHeaderY, '自定义挑战契约', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }));
    const equippedContract = SaveManager.getChallengeContract();
    const clearContract = createButton(this, GAME_WIDTH - 58, challengeHeaderY + 20, '清除', () => {
      SaveManager.equipChallengeContract('none');
      AudioSystem.play('ui_click');
      this.buildModulePage();
    }, {
      width: 92, height: 38, fontSize: 16, color: equippedContract === 'none' ? 0x355247 : 0x455a64,
      colorDown: 0x37474f, disabled: equippedContract === 'none',
    });
    this.moduleContainer.add(clearContract);
    CHALLENGE_CONTRACTS.forEach((contract, col) => {
      this.createChallengeCard(contract, 124 + col * 236, challengeHeaderY + 157);
    });

    this.moduleContentHeight = 188 + challengeHeaderY + 290;
    if (this.activeTab === 'modules') this.contentHeight = this.moduleContentHeight;
  }

  private createModuleCard(item: BehaviorEquipmentDef, x: number, y: number): void {
    const w = 212, h = 210;
    const owned = SaveManager.ownsBehaviorEquipment(item.key);
    const equipped = SaveManager.getEquippedBehaviorEquipment(item.slot) === item.key;
    const affordable = SaveManager.coins >= item.cost;
    const g = this.add.graphics();
    g.fillStyle(0x071015, 0.32).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 8);
    g.fillStyle(equipped ? 0x203b36 : 0x18242e, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(2, equipped ? item.color : 0x3f5360, equipped ? 1 : 0.75)
      .strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.moduleContainer.add(g);
    this.moduleContainer.add(this.add.image(x - 72, y - 66, item.icon).setScale(0.66).setTint(item.color));
    this.moduleContainer.add(this.add.text(x - 42, y - 82, item.name, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: equipped ? '#8ff0c8' : '#ffffff',
    }));
    this.moduleContainer.add(this.add.text(x - 42, y - 53, equipped ? '当前装配' : BEHAVIOR_SLOT_LABELS[item.slot], {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: equipped ? '#66e0b0' : '#8296a3',
    }));
    this.moduleContainer.add(this.add.text(x - 88, y - 22, item.desc, {
      ...textStyle(14, '#b4c0c8'),
      wordWrap: { width: 176, useAdvancedWrap: true }, lineSpacing: 3,
    }).setFixedSize(176, 72));

    const label = equipped ? '已装备' : owned ? '装备' : `${item.cost} 金`;
    const button = createButton(this, x, y + 72, label, () => {
      if (!SaveManager.ownsBehaviorEquipment(item.key)) {
        if (!SaveManager.buyBehaviorEquipment(item.key)) return;
        this.coinText.setText(`${SaveManager.coins}`);
      }
      if (!SaveManager.equipBehaviorEquipment(item.slot, item.key)) return;
      AudioSystem.play('upgrade');
      this.buildModulePage();
    }, {
      width: 166, height: 42, fontSize: 16,
      color: equipped ? 0x355247 : owned ? 0x2f8f63 : affordable ? 0x8f6a16 : 0x4a5560,
      colorDown: owned ? 0x236e4c : 0x76550e,
      disabled: equipped || (!owned && !affordable),
    });
    this.moduleContainer.add(button);
  }

  private createCompanionCard(protocol: CompanionProtocolDef, x: number, y: number): void {
    const w = 212, h = 210;
    const owned = SaveManager.ownsCompanionProtocol(protocol.key);
    const equipped = SaveManager.getEquippedCompanionProtocol() === protocol.key;
    const affordable = SaveManager.coins >= protocol.cost;
    const g = this.add.graphics();
    g.fillStyle(0x071015, 0.32).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 8);
    g.fillStyle(equipped ? 0x263746 : 0x18242e, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(2, equipped ? protocol.color : 0x3f5360, equipped ? 1 : 0.75)
      .strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.moduleContainer.add(g);
    this.moduleContainer.add(this.add.image(x - 72, y - 66, protocol.icon).setScale(0.66).setTint(protocol.color));
    this.moduleContainer.add(this.add.text(x - 42, y - 82, protocol.name, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: equipped ? '#90caf9' : '#ffffff',
    }));
    this.moduleContainer.add(this.add.text(x - 42, y - 53, equipped ? '当前协议' : 'R-7 行为核心', {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: equipped ? '#90caf9' : '#8296a3',
    }));
    this.moduleContainer.add(this.add.text(x - 88, y - 22, protocol.desc, {
      ...textStyle(14, '#b4c0c8'),
      wordWrap: { width: 176, useAdvancedWrap: true }, lineSpacing: 3,
    }).setFixedSize(176, 72));

    const label = equipped ? '已启用' : owned ? '启用' : `${protocol.cost} 金`;
    const button = createButton(this, x, y + 72, label, () => {
      if (!SaveManager.ownsCompanionProtocol(protocol.key)) {
        if (!SaveManager.buyCompanionProtocol(protocol.key)) return;
        this.coinText.setText(`${SaveManager.coins}`);
      }
      if (!SaveManager.equipCompanionProtocol(protocol.key)) return;
      AudioSystem.play('upgrade');
      this.buildModulePage();
    }, {
      width: 166, height: 42, fontSize: 16,
      color: equipped ? 0x3f5360 : owned ? 0x376a88 : affordable ? 0x8f6a16 : 0x4a5560,
      colorDown: owned ? 0x2c5873 : 0x76550e,
      disabled: equipped || (!owned && !affordable),
    });
    this.moduleContainer.add(button);
  }

  private createChallengeCard(contract: ChallengeContractDef, x: number, y: number): void {
    const w = 212, h = 210;
    const equipped = SaveManager.getChallengeContract() === contract.key;
    const g = this.add.graphics();
    g.fillStyle(0x071015, 0.32).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 8);
    g.fillStyle(equipped ? 0x3b2d28 : 0x18242e, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(2, equipped ? contract.color : 0x3f5360, equipped ? 1 : 0.75)
      .strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.moduleContainer.add(g);
    this.moduleContainer.add(this.add.image(x - 72, y - 66, 'icon_armageddon').setScale(0.66).setTint(contract.color));
    this.moduleContainer.add(this.add.text(x - 42, y - 82, contract.name, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: equipped ? '#ffd180' : '#ffffff',
    }));
    this.moduleContainer.add(this.add.text(x - 42, y - 53, equipped ? '当前契约' : '整局挑战', {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: equipped ? '#ffcc80' : '#8296a3',
    }));
    this.moduleContainer.add(this.add.text(x - 88, y - 22, contract.desc, {
      ...textStyle(14, '#b4c0c8'),
      wordWrap: { width: 176, useAdvancedWrap: true }, lineSpacing: 3,
    }).setFixedSize(176, 72));
    const button = createButton(this, x, y + 72, equipped ? '已选择' : '选择', () => {
      SaveManager.equipChallengeContract(contract.key);
      AudioSystem.play('upgrade');
      this.buildModulePage();
    }, {
      width: 166, height: 42, fontSize: 16,
      color: equipped ? 0x7d5726 : 0x6d4b26, colorDown: 0x51381d,
      disabled: equipped,
    });
    this.moduleContainer.add(button);
  }

  private showTab(tab: 'levels' | 'shop' | 'arsenal' | 'modules'): void {
    this.activeTab = tab;
    this.levelsContainer.setVisible(tab === 'levels');
    this.shopContainer.setVisible(tab === 'shop');
    this.arsenalContainer.setVisible(tab === 'arsenal');
    this.moduleContainer.setVisible(tab === 'modules');
    this.tabButtons[0].setAlpha(tab === 'levels' ? 1 : 0.62);
    this.tabButtons[1].setAlpha(tab === 'shop' ? 1 : 0.62);
    this.tabButtons[2].setAlpha(tab === 'arsenal' ? 1 : 0.62);
    this.tabButtons[3].setAlpha(tab === 'modules' ? 1 : 0.62);
    this.pageLabel.setVisible(tab === 'levels');
    this.pageNavBand.setVisible(tab === 'levels');
    this.pageButtons.forEach((b) => b.setVisible(tab === 'levels'));
    this.contentHeight = tab === 'levels'
      ? this.levelContentHeight
      : tab === 'shop'
        ? this.shopContentHeight
        : tab === 'arsenal' ? this.arsenalContentHeight : this.moduleContentHeight;
    this.setScroll(0);
    AudioSystem.play('ui_click');
  }

  private refreshPageControls(): void {
    this.pageButtons.forEach((b) => b.destroy());
    this.pageButtons = [];
    const maxPage = Math.ceil(TOTAL_LEVELS / LEVEL_ENGINE_INFO.chapterSize) - 1;
    if (this.chapterPage > 0) {
      const previous = createButton(this, 74, GAME_HEIGHT - 48, '◀', () => {
        this.chapterPage--;
        this.buildLevelPage();
        this.refreshPageControls();
      }, { width: 58, height: 42, fontSize: 20, color: 0x455a64, colorDown: 0x37474f }).setDepth(9);
      this.pageButtons.push(previous);
    }
    if (this.chapterPage < maxPage) {
      const next = createButton(this, GAME_WIDTH - 74, GAME_HEIGHT - 48, '▶', () => {
        this.chapterPage++;
        this.buildLevelPage();
        this.refreshPageControls();
      }, { width: 58, height: 42, fontSize: 20, color: 0x455a64, colorDown: 0x37474f }).setDepth(9);
      this.pageButtons.push(next);
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
        ...textStyle(18, '#ffffff'), fontStyle: 'bold',
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
      nameText.setText(`${cfg.name}  Lv.${level}${maxed ? ' · 已满级' : ''}`);
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
    const bottomInset = this.activeTab === 'levels' ? 92 : 20;
    const viewH = GAME_HEIGHT - viewTop - bottomInset;
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
    const bottomInset = this.activeTab === 'levels' ? 92 : 20;
    const viewH = GAME_HEIGHT - viewTop - bottomInset;
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
