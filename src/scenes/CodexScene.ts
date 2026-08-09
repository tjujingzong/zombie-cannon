import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import { ZOMBIE_TYPES, ZOMBIE_CODEX, type ZombieTypeKey } from '../data/balance';
import { SKILLS, SYNERGIES, RARITY_LABEL, RARITY_HEX } from '../data/skills';
import { LEVEL_ENGINE_INFO } from '../data/levels';
import { createButton, FONT, textStyle, titleStyle } from '../ui/helpers';

type Tab = 'bestiary' | 'skills' | 'synergies' | 'strategy';

const THREAT_COLORS = [0x66bb6a, 0xfdd835, 0xfb8c00, 0xe53935, 0xd50000];

/**
 * 图鉴场景（CodexScene）：僵尸图鉴 / 技能图鉴 / 组合技 / 战术指南
 * 用四个 tab 切换，每个 tab 内可滚动列表
 */
export class CodexScene extends Phaser.Scene {
  private tabButtons: Record<Tab, Phaser.GameObjects.Container> = {} as never;
  private contentContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private contentHeight = 0;
  private scrollbar!: Phaser.GameObjects.Graphics;
  private scrollHitbox!: Phaser.GameObjects.Zone;
  private returnTo = 'Menu';

  constructor() {
    super('Codex');
  }

  init(data: { returnTo?: string }): void {
    this.returnTo = data?.returnTo ?? 'Menu';
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // 背景
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x101820, 0x101820, 0x16222c, 0x16222c, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 标题
    this.add.text(cx, 60, '战术图鉴', titleStyle(48)).setOrigin(0.5);

    // 返回按钮（回到来源场景）
    createButton(this, 60, 60, '返回', () => this.scene.start(this.returnTo), {
      width: 110, height: 50, fontSize: 22, color: 0x455a64, colorDown: 0x37474f,
    });

    // tab 栏
    const tabs: { key: Tab; label: string }[] = [
      { key: 'bestiary', label: '僵尸图鉴' },
      { key: 'skills', label: '技能图鉴' },
      { key: 'synergies', label: '组合技' },
      { key: 'strategy', label: '战术指南' },
    ];
    const tabW = 160;
    const tabGap = 8;
    const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = (GAME_WIDTH - totalTabW) / 2 + tabW / 2;
    tabs.forEach((t, i) => {
      this.tabButtons[t.key] = this.createTab(tabStartX + i * (tabW + tabGap), 130, t.label, t.key);
    });

    // 内容容器
    this.contentContainer = this.add.container(0, 180).setDepth(5);

    // 滚动条 + 滚动 hitbox
    this.scrollbar = this.add.graphics().setDepth(6);
    this.scrollHitbox = this.add.zone(GAME_WIDTH / 2, 180 + (GAME_HEIGHT - 280) / 2, GAME_WIDTH, GAME_HEIGHT - 280)
      .setInteractive({ useHandCursor: true });
    this.scrollHitbox.on('wheel', (_p: Phaser.Input.Pointer, _ox: number, _oy: number, delta: number) => {
      this.scrollBy(delta > 0 ? 80 : -80);
    });
    // 触摸拖动
    let dragStartY = 0;
    let dragStartScroll = 0;
    this.scrollHitbox.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragStartY = p.y; dragStartScroll = this.scrollY;
    });
    this.scrollHitbox.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        this.setScroll(dragStartScroll - (p.y - dragStartY));
      }
    });

    this.showTab('bestiary');
  }

  private createTab(x: number, y: number, label: string, key: Tab): Phaser.GameObjects.Container {
    const w = 150, h = 56;
    const g = this.add.graphics();
    const draw = (active: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 12);
      g.fillStyle(active ? 0x2e7d32 : 0x1b2733, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      g.fillStyle(active ? 0x66bb6a : 0x4a5560, 0.4).fillRoundedRect(-w / 2, -h / 2, w, 6, { tl: 12, tr: 12, bl: 0, br: 0 });
    };
    draw(false);
    const txt = this.add.text(0, 0, label, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const c = this.add.container(x, y, [g, txt]).setSize(w, h).setInteractive({ useHandCursor: true }).setDepth(6);
    c.on('pointerup', () => this.showTab(key));
    (c as Phaser.GameObjects.Container & { _draw?: (a: boolean) => void })._draw = draw;
    return c;
  }

  private showTab(tab: Tab): void {
    // 更新 tab 高亮
    (Object.keys(this.tabButtons) as Tab[]).forEach((k) => {
      const c = this.tabButtons[k];
      const draw = (c as Phaser.GameObjects.Container & { _draw?: (a: boolean) => void })._draw;
      if (draw) draw(k === tab);
    });
    // 清空内容
    this.contentContainer.removeAll(true);
    this.scrollY = 0;
    this.contentContainer.setY(180);

    switch (tab) {
      case 'bestiary':  this.buildBestiary(); break;
      case 'skills':    this.buildSkills(); break;
      case 'synergies':  this.buildSynergies(); break;
      case 'strategy':   this.buildStrategy(); break;
    }
    this.drawScrollbar();
  }

  // ── 僵尸图鉴 ──
  private buildBestiary(): void {
    const margin = 24;
    const cardW = GAME_WIDTH - margin * 2;
    const types: ZombieTypeKey[] = Object.keys(ZOMBIE_TYPES) as ZombieTypeKey[];
    let y = 20;
    const padding = 14;
    types.forEach((type) => {
      const stats = ZOMBIE_TYPES[type];
      const codex = ZOMBIE_CODEX[type];
      const threat = Phaser.Math.Clamp(codex.threat, 1, 5);
      const cardH = 230;

      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRoundedRect(margin + 2, y + 3, cardW, cardH, 14);
      g.fillStyle(0x1b2733, 1).fillRoundedRect(margin, y, cardW, cardH, 14);
      // 左侧色带
      g.fillStyle(THREAT_COLORS[threat - 1], 1).fillRoundedRect(margin, y, 8, cardH, { tl: 14, tr: 0, bl: 14, br: 0 });

      // 僵尸预览
      const preview = this.add.image(margin + 70, y + 70, stats.texture).setScale(stats.scale * 1.1);

      // 名称 + 威胁
      const nameTxt = this.add.text(margin + 130, y + 16, codex.role, {
        fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffd54a',
      });
      // 威胁星
      const threatStr = '★'.repeat(threat) + '☆'.repeat(5 - threat);
      const threatTxt = this.add.text(margin + 130, y + 46, `威胁 ${threatStr}`, {
        fontFamily: FONT, fontSize: '16px', color: '#' + THREAT_COLORS[threat - 1].toString(16).padStart(6, '0'),
      });
      // 首次出现
      const firstTxt = this.add.text(margin + cardW - 16, y + 18, `第 ${codex.firstSeen} 关起`, {
        fontFamily: FONT, fontSize: '16px', color: '#8a9aa8',
      }).setOrigin(1, 0);

      // 数值
      const statsTxt = this.add.text(
        margin + 130, y + 76,
        `耐久 ${stats.hp}  速度 ${stats.speed}  攻城 ${stats.damage}  赏金 ${stats.coin}`,
        { fontFamily: FONT, fontSize: '17px', color: '#b0bec5' }
      );

      // 行为
      const behavTxt = this.add.text(margin + 16, y + 108, `行为: ${codex.behavior}`, {
        ...textStyle(15, '#aab8c2'), wordWrap: { width: cardW - 32 }
      });

      // 弱点
      const weakTxt = this.add.text(margin + 16, y + 150, `弱点: ${codex.weaknesses.join('、')}`, {
        ...textStyle(15, '#ff8a65'), fontStyle: 'bold', wordWrap: { width: cardW - 32 }
      });

      // 应对
      const counterTxt = this.add.text(margin + 16, y + 180, `对策: ${codex.counter}`, {
        ...textStyle(15, '#8fbf8f'), wordWrap: { width: cardW - 32 }
      });

      this.contentContainer.add([g, preview, nameTxt, threatTxt, firstTxt, statsTxt, behavTxt, weakTxt, counterTxt]);
      y += cardH + padding;
    });

    this.contentHeight = y;
  }

  // ── 技能图鉴 ──
  private buildSkills(): void {
    const margin = 24;
    const cardW = (GAME_WIDTH - margin * 2 - 16) / 2;
    let y = 20;
    const padding = 14;
    const categories: { key: 'offense' | 'defense' | 'utility'; label: string }[] = [
      { key: 'offense', label: '攻击' }, { key: 'defense', label: '防御' }, { key: 'utility', label: '辅助' },
    ];
    categories.forEach((cat) => {
      const titleBg = this.add.graphics();
      titleBg.fillStyle(0x2a3b2c, 0.6).fillRoundedRect(margin, y, GAME_WIDTH - margin * 2, 36, 8);
      const title = this.add.text(margin + 14, y + 18, `—— ${cat.label} ——`, {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd54a',
      }).setOrigin(0, 0.5);
      this.contentContainer.add([titleBg, title]);
      y += 50;
      const skills = SKILLS.filter((s) => s.category === cat.key);
      skills.forEach((s, i) => {
        const col = i % 2;
        const x = margin + col * (cardW + 16);
        const cardH = 150;
        const g = this.add.graphics();
        const borderColor = parseInt(RARITY_HEX[s.rarity].replace('#', ''), 16);
        g.fillStyle(0x1b2733, 1).fillRoundedRect(x, y, cardW, cardH, 12);
        g.lineStyle(2, borderColor, 0.8).strokeRoundedRect(x, y, cardW, cardH, 12);
        g.fillStyle(borderColor, 0.25).fillRoundedRect(x, y, cardW, 32, { tl: 12, tr: 12, bl: 0, br: 0 });

        const icon = this.add.image(x + 32, y + 64, s.icon).setScale(0.9);
        const nameTxt = this.add.text(x + 64, y + 8, s.name, {
          fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
        });
        const rarityTxt = this.add.text(x + cardW - 10, y + 8, RARITY_LABEL[s.rarity], {
          fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: RARITY_HEX[s.rarity],
        }).setOrigin(1, 0);
        const descTxt = this.add.text(x + 64, y + 36, s.desc, {
          ...textStyle(13, '#aab8c2'), wordWrap: { width: cardW - 72 }
        });
        const maxTxt = this.add.text(x + 64, y + 110, `最大 ${s.maxLevel} 级`, textStyle(12, '#7a8a99'));

        this.contentContainer.add([g, icon, nameTxt, rarityTxt, descTxt, maxTxt]);
        if (col === 1) y += cardH + padding;
      });
      if (skills.length % 2 !== 0) y += 150 + padding;
    });
    this.contentHeight = y;
  }

  // ── 组合技 ──
  private buildSynergies(): void {
    const margin = 24;
    const cardW = GAME_WIDTH - margin * 2;
    let y = 20;
    const padding = 14;
    SYNERGIES.forEach((syn) => {
      const cardH = 130;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRoundedRect(margin + 2, y + 3, cardW, cardH, 14);
      g.fillStyle(0x251a0a, 1).fillRoundedRect(margin, y, cardW, cardH, 14);
      g.fillStyle(0xffa726, 0.5).fillRoundedRect(margin, y, 8, cardH, { tl: 14, tr: 0, bl: 14, br: 0 });

      const icon = this.add.image(margin + 60, y + 50, syn.icon).setDisplaySize(76, 76);
      const nameTxt = this.add.text(margin + 110, y + 16, syn.name, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffd54a',
      });
      const label = this.add.text(margin + cardW - 16, y + 18, '⚡ 组合技', {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffa726',
      }).setOrigin(1, 0);

      const descTxt = this.add.text(margin + 110, y + 50, syn.desc, {
        ...textStyle(16, '#e0c8a0'), wordWrap: { width: cardW - 130 }
      });

      const reqTexts = syn.requires.map((r) => {
        const sk = SKILLS.find((s) => s.key === r.skill);
        return `${sk?.name ?? '未知技能'} ${r.minLevel}级`;
      });
      const reqTxt = this.add.text(margin + 16, y + 95, `需要: ${reqTexts.join('  +  ')}`, {
        ...textStyle(14, '#8a9aa8'), fontStyle: 'bold', wordWrap: { width: cardW - 32 }
      });

      this.contentContainer.add([g, icon, nameTxt, label, descTxt, reqTxt]);
      y += cardH + padding;
    });
    this.contentHeight = y;
  }

  // ── 战术指南 ──
  private buildStrategy(): void {
    const margin = 24;
    const cardW = GAME_WIDTH - margin * 2;
    let y = 20;
    const padding = 16;

    const guides: { title: string; body: string; color: number }[] = [
      {
        title: '入门心法',
        color: 0x66bb6a,
        body:
          '炮台自动开火但仅瞄准你指向的方向，按住屏幕拖动可手动瞄准。' +
          '每关开局可免费挑选 5 项技能作为战前储备，但怪物数量会相应增加以平衡难度。' +
          '波次间三选一强化，连杀有伤害加成。前期优先攻速+多重炮管铺量，' +
          '后期靠组合技爆发。墙血低于 25% 会红屏警告。',
      },
      {
        title: '推荐组合 · 弹幕流',
        color: 0x4fc3f7,
        body:
          '多重炮管 + 急速装填 → 触发「火力全开」，获得额外攻速。' +
          '再配弹射弹触发「弹幕风暴」，让弹射产生更多子弹覆盖全场。',
      },
      {
        title: '推荐组合 · 一击必杀流',
        color: 0xffd54a,
        body:
          '致命瞄准 + 灼烧弹触发「爆燃弹」，让暴击产生范围爆炸。' +
          '再叠加灼烧弹和穿甲弹触发「地狱穿甲弹」持续灼烧，适合首领关。',
      },
      {
        title: '推荐组合 · 末日审判',
        color: 0xff1744,
        body:
          '激光束 + 追踪导弹 + 爆炸弹 同时激活 → "末日审判"全屏轰炸。' +
          '需先在前期集齐三个前置技能，在首领波和终局尸潮中收益最高。',
      },
      {
        title: '推荐组合 · 铜墙铁壁',
        color: 0x42a5f5,
        body:
          '反伤棘刺 + 钢铁壁垒 → "铜墙铁壁"墙体受伤后 2 秒无敌。' +
          '配合能量护盾 → "铁壁堡垒"护盾恢复翻倍，容错率极高。',
      },
      {
        title: '应对首领',
        color: 0xff6d00,
        body:
          '首领每 5 关出现一次，从第 5 关持续到第 50 关。首领会周期召唤小怪，' +
          '必须保留爆炸弹或激光等范围清场技能。首领触墙伤害巨大，' +
          '务必在其到达前清掉小怪，集中火力击杀。',
      },
      {
        title: '优先击杀目标',
        color: 0xe53935,
        body:
          '以下僵尸必须优先击杀，否则会让战斗崩盘：\n' +
          '• 治愈者 —— 持续回血导致前排打不动\n' +
          '• 召唤者 —— 召唤物无限增长\n' +
          '• 自爆者 —— 必须远程击杀，远离墙体\n' +
          '• 喷射者 —— 远程消耗墙体血量',
      },
      {
        title: '关卡引擎说明',
        color: 0xab47bc,
        body:
          `共 ${LEVEL_ENGINE_INFO.totalLevels} 关，每 ${LEVEL_ENGINE_INFO.bossInterval} 关一个首领关。` +
          `每 ${LEVEL_ENGINE_INFO.chapterSize} 关进入新章节，场景主题循环且难度跃升。` +
          `第 11 关起为程序化生成的关卡，难度持续上升，越往后越硬核。`,
      },
      {
        title: '战前免费选技能',
        color: 0x4fc3f7,
        body:
          '每次进入关卡，开局即可免费挑选 5 项技能作为战前储备。' +
          '建议优先选择「多重炮管 + 急速装填 + 致命瞄准」等核心输出技能，' +
          '或凑齐组合技前置，例如灼烧弹与穿甲弹可触发地狱穿甲弹。' +
          '为平衡难度，选满 5 项后本关怪物数量会增加约 60%，' +
          '因此请合理搭配，避免只选单一类型技能被克制。',
      },
      {
        title: '推荐组合 · 冰火控场',
        color: 0x26c6da,
        body:
          '冰冻弹头 + 灼烧弹 → 触发「冰火震爆」，连续制造范围伤害。' +
          '再加入防线雷区触发「极寒雷区」，可以在尸潮贴墙前反复控制。',
      },
      {
        title: '推荐组合 · 奇点爆破',
        color: 0xb388ff,
        body:
          '引力奇点会自动锁定最密集的尸群并聚怪。' +
          '搭配爆炸弹触发「坍缩炸弹」，引力场结束时完成集中清屏。',
      },
    ];

    guides.forEach((gd) => {
      const cardH = 30 + Math.ceil(gd.body.length / 26) * 22;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRoundedRect(margin + 2, y + 3, cardW, cardH, 14);
      g.fillStyle(0x1b2733, 1).fillRoundedRect(margin, y, cardW, cardH, 14);
      g.fillStyle(gd.color, 1).fillRoundedRect(margin, y, 8, cardH, { tl: 14, tr: 0, bl: 14, br: 0 });

      const title = this.add.text(margin + 20, y + 14, gd.title, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#' + gd.color.toString(16).padStart(6, '0'),
      });
      const body = this.add.text(margin + 20, y + 50, gd.body, {
        ...textStyle(16, '#cfd8dc'), wordWrap: { width: cardW - 40 }, align: 'left',
      });
      this.contentContainer.add([g, title, body]);
      y += cardH + padding;
    });
    this.contentHeight = y;
  }

  // ── 滚动 ──
  private setScroll(target: number): void {
    const viewH = GAME_HEIGHT - 280;
    const maxScroll = Math.max(0, this.contentHeight - viewH);
    this.scrollY = Phaser.Math.Clamp(target, 0, maxScroll);
    this.contentContainer.setY(180 - this.scrollY);
    this.drawScrollbar();
  }

  private scrollBy(delta: number): void {
    this.setScroll(this.scrollY + delta);
  }

  private drawScrollbar(): void {
    this.scrollbar.clear();
    const viewH = GAME_HEIGHT - 280;
    if (this.contentHeight <= viewH) return;
    const trackH = viewH;
    const trackY = 180;
    const trackX = GAME_WIDTH - 10;
    this.scrollbar.fillStyle(0xffffff, 0.08).fillRoundedRect(trackX, trackY, 4, trackH, 2);
    const ratio = viewH / this.contentHeight;
    const thumbH = Math.max(40, trackH * ratio);
    const maxScroll = this.contentHeight - viewH;
    const thumbY = trackY + (maxScroll > 0 ? (this.scrollY / maxScroll) * (trackH - thumbH) : 0);
    this.scrollbar.fillStyle(0xffd54a, 0.6).fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
  }
}
