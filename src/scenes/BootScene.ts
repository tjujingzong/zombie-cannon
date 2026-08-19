import Phaser from 'phaser';
import { DAMAGE_ELEMENTS, ZOMBIE_DEFINITIONS } from '../data/balance';
import { AudioSystem } from '../systems/AudioSystem';

/**
 * BootScene：全部纹理用 graphics 程序化生成，生成完毕直接进入菜单
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('art_zombie_boss_v1', 'assets/generated/zombies/zombie-boss-v1.png');
    this.load.image('art_zombie_boss_inferno_v2', 'assets/generated/zombies/zombie-boss-inferno-v2.png');
    this.load.image('art_zombie_boss_glacier_v2', 'assets/generated/zombies/zombie-boss-glacier-v2.png');
    this.load.image('art_zombie_boss_tempest_v2', 'assets/generated/zombies/zombie-boss-tempest-v2.png');
    this.load.image('art_zombie_boss_plague_v2', 'assets/generated/zombies/zombie-boss-plague-v2.png');
    this.load.image('art_zombie_boss_void_v2', 'assets/generated/zombies/zombie-boss-void-v2.png');
    this.load.image('art_ultimate_elemental_cataclysm_v1', 'assets/generated/skills/ultimate-elemental-cataclysm-v1.png');
    this.load.image('art_ultimate_infinite_barrage_v1', 'assets/generated/skills/ultimate-infinite-barrage-v1.png');
    this.load.image('art_ultimate_orbital_command_v1', 'assets/generated/skills/ultimate-orbital-command-v1.png');
    this.load.image('art_ultimate_eternal_fortress_v1', 'assets/generated/skills/ultimate-eternal-fortress-v1.png');
  }

  create(): void {
    try {
      this.makeBullet();
      this.makeZombies();
      this.makeCoin();
      this.makeCannon();
      this.makeWall();
      this.makeUpgradeIcons();
      this.makeArmoryIcons();
      this.makeParticles();
      this.makeAcidBall();
      this.makeExplosionEffect();
      this.makeHealEffect();
      this.makeShieldEffect();
      this.makeMuzzleFlash();
      this.makeBossAura();
      this.makeBulletTrail();
      this.makeShockwave();
      this.makeBossCrown();
      this.makeTacticalEffects();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Boot] 纹理生成失败:', e);
    }

    AudioSystem.loadMutedPref();
    // 全局手势解锁由 AudioSystem 内部接管（解决 autoplay policy）

    this.scene.start('Menu');
  }

  private makeMuzzleFlash(): void {
    const g = this.g();
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 16; i++) {
      const radius = i % 2 === 0 ? (i % 4 === 0 ? 30 : 23) : 9;
      const angle = -Math.PI / 2 + (i * Math.PI) / 8;
      points.push(new Phaser.Math.Vector2(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius));
    }
    g.fillStyle(0xff6d00, 0.22).fillCircle(32, 32, 31);
    g.fillStyle(0xffa000, 0.65).fillPoints(points, true);
    g.fillStyle(0xffea70, 0.95).fillCircle(32, 32, 13);
    g.fillStyle(0xffffff, 1).fillCircle(32, 32, 6);
    g.generateTexture('muzzle_flash', 64, 64);
    g.destroy();
  }

  private makeBossAura(): void {
    const g = this.g();
    g.fillStyle(0x7c1d68, 0.14).fillEllipse(64, 32, 122, 54);
    g.lineStyle(4, 0xff4fc3, 0.52).strokeEllipse(64, 32, 112, 43);
    g.lineStyle(2, 0xc084fc, 0.8).strokeEllipse(64, 32, 88, 31);
    g.lineStyle(2, 0xffffff, 0.35).arc(64, 32, 50, 3.5, 5.7);
    g.generateTexture('boss_aura', 128, 64);
    g.destroy();
  }

  private makeBulletTrail(): void {
    const g = this.g();
    g.fillStyle(0xffe066, 0.7).fillEllipse(4, 12, 6, 22);
    g.fillStyle(0xffffff, 0.4).fillEllipse(4, 8, 3, 14);
    g.generateTexture('bullet_trail', 8, 24);
    g.destroy();
  }

  private makeShockwave(): void {
    const g = this.g();
    g.fillStyle(0xffd54a, 0.08).fillCircle(48, 48, 45);
    g.lineStyle(5, 0xffffff, 0.88).strokeCircle(48, 48, 39);
    g.lineStyle(3, 0xffd54a, 0.72).strokeCircle(48, 48, 31);
    g.lineStyle(2, 0xff8f00, 0.45).strokeCircle(48, 48, 22);
    g.generateTexture('shockwave', 96, 96);
    g.destroy();
  }

  private makeBossCrown(): void {
    const g = this.g();
    g.fillStyle(0x000000, 0.28).fillEllipse(32, 35, 52, 9);
    g.fillStyle(0x6d3f00, 1).fillRoundedRect(6, 25, 52, 12, 4);
    g.fillStyle(0xffb300, 1)
      .fillTriangle(8, 28, 5, 5, 23, 24)
      .fillTriangle(22, 28, 32, 1, 42, 28)
      .fillTriangle(41, 28, 58, 5, 56, 29);
    g.fillStyle(0xffe082, 1).fillRoundedRect(9, 25, 46, 7, 3);
    g.fillStyle(0xff1744, 1).fillCircle(32, 24, 5);
    g.fillStyle(0xffffff, 0.8).fillCircle(30, 22, 1.5);
    g.generateTexture('boss_crown', 64, 42);
    g.destroy();
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private makeBullet(): void {
    const g = this.g();
    g.fillStyle(0xff6d00, 0.18).fillEllipse(12, 18, 23, 35);
    g.fillStyle(0x7a3211, 1).fillEllipse(12, 19, 14, 28);
    g.fillStyle(0xffa726, 1).fillEllipse(12, 16, 13, 27);
    g.fillStyle(0xfff3b0, 1).fillEllipse(10, 10, 6, 11);
    g.fillStyle(0xffffff, 0.75).fillEllipse(9, 8, 3, 6);
    g.generateTexture('bullet', 24, 36);
    g.destroy();
  }

  // ─── 僵尸绘制 ───

  private drawZombie(key: string, bodyColor: number, headColor: number, size: number, extras?: (g: Phaser.GameObjects.Graphics, cx: number, h: number, w: number) => void): void {
    const g = this.g();
    const w = size;
    const h = size * 1.25;
    const cx = w / 2;
    const outline = 0x10171a;
    // 统一粗轮廓和脚底阴影，让高密度尸潮在手机尺寸下仍然可读。
    g.fillStyle(0x000000, 0.34).fillEllipse(cx, h * 0.94, w * 0.68, w * 0.16);
    g.fillStyle(outline, 1)
      .fillRoundedRect(cx - w * 0.23, h * 0.68, w * 0.2, h * 0.27, w * 0.07)
      .fillRoundedRect(cx + w * 0.03, h * 0.7, w * 0.2, h * 0.25, w * 0.07);
    g.fillStyle(bodyColor, 1)
      .fillRoundedRect(cx - w * 0.19, h * 0.69, w * 0.13, h * 0.23, w * 0.05)
      .fillRoundedRect(cx + w * 0.07, h * 0.71, w * 0.13, h * 0.21, w * 0.05);
    g.fillStyle(outline, 1)
      .fillRoundedRect(cx - w * 0.49, h * 0.39, w * 0.24, h * 0.42, w * 0.1)
      .fillRoundedRect(cx + w * 0.25, h * 0.39, w * 0.24, h * 0.42, w * 0.1)
      .fillRoundedRect(cx - w * 0.34, h * 0.3, w * 0.68, h * 0.58, w * 0.14);
    g.fillStyle(bodyColor, 1)
      .fillRoundedRect(cx - w * 0.44, h * 0.42, w * 0.17, h * 0.35, w * 0.07)
      .fillRoundedRect(cx + w * 0.27, h * 0.42, w * 0.17, h * 0.35, w * 0.07)
      .fillRoundedRect(cx - w * 0.29, h * 0.34, w * 0.58, h * 0.5, w * 0.1);
    g.fillStyle(0x000000, 0.22).fillRect(cx - w * 0.29, h * 0.6, w * 0.58, h * 0.1);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(cx - w * 0.22, h * 0.39, w * 0.1, h * 0.19, 3);
    g.fillStyle(outline, 1).fillCircle(cx, h * 0.21, w * 0.285);
    g.fillStyle(headColor, 1).fillCircle(cx, h * 0.21, w * 0.235);
    g.fillStyle(0xffffff, 0.13).fillEllipse(cx - w * 0.09, h * 0.13, w * 0.12, w * 0.07);
    g.fillStyle(0x251011, 1)
      .fillCircle(cx - w * 0.1, h * 0.2, w * 0.055)
      .fillCircle(cx + w * 0.1, h * 0.2, w * 0.055);
    g.fillStyle(0xff5b57, 1)
      .fillCircle(cx - w * 0.1, h * 0.2, w * 0.026)
      .fillCircle(cx + w * 0.1, h * 0.2, w * 0.026);
    g.fillStyle(0xffd4a3, 0.8)
      .fillCircle(cx - w * 0.092, h * 0.192, w * 0.01)
      .fillCircle(cx + w * 0.108, h * 0.192, w * 0.01);
    g.fillStyle(0x251011, 1).fillRoundedRect(cx - w * 0.1, h * 0.275, w * 0.2, w * 0.055, 2);
    g.fillStyle(0xe7d7ba, 0.8)
      .fillRect(cx - w * 0.065, h * 0.278, w * 0.025, w * 0.04)
      .fillRect(cx + w * 0.035, h * 0.278, w * 0.025, w * 0.04);
    g.fillStyle(0x000000, 0.28).fillEllipse(cx - w * 0.15, h * 0.145, w * 0.17, w * 0.055);
    g.fillStyle(0x000000, 0.3)
      .fillTriangle(cx - w * 0.28, h * 0.75, cx - w * 0.07, h * 0.75, cx - w * 0.19, h * 0.87)
      .fillTriangle(cx + w * 0.08, h * 0.75, cx + w * 0.29, h * 0.75, cx + w * 0.19, h * 0.87);
    // 额外装饰
    if (extras) extras(g, cx, h, w);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeZombies(): void {
    // 尸潮腐尸：低矮、肩膀外扩，缩小后仍能形成密集的群体轮廓
    this.drawZombie('zombie_swarm', 0x355a31, 0x6e9b58, 64, (g, cx, h, w) => {
      g.fillStyle(0xb7d47c, 0.8).fillCircle(cx - w * 0.09, h * 0.2, w * 0.035);
      g.fillStyle(0xffd54f, 0.8).fillCircle(cx + w * 0.11, h * 0.2, w * 0.035);
    });
    // 原始四种
    this.drawZombie('zombie_normal', 0x4f7a3a, 0x7aa85c, 64);
    this.drawZombie('zombie_fast', 0x3a6a7a, 0x66a3b5, 64);
    this.drawZombie('zombie_tank', 0x6a4a2e, 0x9c7a52, 64);
    this.drawZombie('zombie_boss', 0x5a2a6a, 0x9455a8, 64);

    // 新增僵尸
    // 喷射者：绿色酸液主题
    this.drawZombie('zombie_spitter', 0x2e7d32, 0x66bb6a, 64, (g, cx, h) => {
      // 酸液囊
      g.fillStyle(0x76ff03, 0.7).fillCircle(cx, h * 0.5, 12);
    });
    // 自爆者：红色警告
    this.drawZombie('zombie_exploder', 0xc62828, 0xef5350, 64, (g, cx, h, w) => {
      // 身上闪烁纹路
      g.fillStyle(0xffeb3b, 0.6);
      g.fillRect(cx - w * 0.05, h * 0.4, w * 0.1, h * 0.3);
      g.fillRect(cx - w * 0.2, h * 0.5, w * 0.4, h * 0.06);
    });
    // 治愈者：白色+绿色十字
    this.drawZombie('zombie_healer', 0x00695c, 0x4db6ac, 64, (g, cx, h) => {
      g.fillStyle(0x69f0ae, 1);
      g.fillRect(cx - 3, h * 0.38, 6, 16);
      g.fillRect(cx - 8, h * 0.44, 16, 6);
    });
    // 护盾者：蓝色护盾轮廓
    this.drawZombie('zombie_shield', 0x1565c0, 0x42a5f5, 64, (g, cx, h, w) => {
      g.lineStyle(3, 0x64b5f6, 0.8);
      g.strokeCircle(cx, h * 0.48, w * 0.38);
    });
    // 幽灵：半透明白色
    this.drawZombie('zombie_ghost', 0x455a64, 0x90a4ae, 64, (g, cx, h, w) => {
      g.fillStyle(0xb0bec5, 0.4).fillCircle(cx, h * 0.22, w * 0.3);
    });
    // 狂暴者：深红色+暴怒纹路
    this.drawZombie('zombie_berserker', 0x8b0000, 0xb71c1c, 64, (g, cx, h, w) => {
      // 暴怒纹路
      g.fillStyle(0xff1744, 0.7);
      g.fillRect(cx - w * 0.25, h * 0.35, w * 0.5, 4);
      g.fillRect(cx - w * 0.2, h * 0.45, w * 0.4, 4);
    });
    // 召唤者：紫色光环
    this.drawZombie('zombie_summoner', 0x4a148c, 0x9c27b0, 64, (g, cx, h) => {
      // 头顶光环
      g.lineStyle(2, 0xce93d8, 0.7);
      g.strokeCircle(cx, h * 0.08, 14);
    });
    // 跃袭者：高亮护膝与前倾警示纹
    this.drawZombie('zombie_leaper', 0xb45309, 0xf59e0b, 64, (g, cx, h, w) => {
      g.fillStyle(0xfff176, 0.9).fillTriangle(cx - w * 0.24, h * 0.52, cx + w * 0.2, h * 0.46, cx + w * 0.12, h * 0.6);
      g.fillStyle(0x263238, 0.8).fillRect(cx - w * 0.22, h * 0.8, w * 0.16, 6);
    });
    // 分裂母体：荧光裂纹
    this.drawZombie('zombie_splitter', 0x4d6b35, 0x91b66c, 64, (g, cx, h, w) => {
      g.lineStyle(3, 0xc6ff00, 0.9).lineBetween(cx, h * 0.34, cx - w * 0.16, h * 0.62);
      g.lineBetween(cx, h * 0.34, cx + w * 0.18, h * 0.56);
      g.fillStyle(0xc6ff00, 0.6).fillCircle(cx, h * 0.46, 7);
    });
    // 电磁干扰者：蓝紫线圈
    this.drawZombie('zombie_jammer', 0x283593, 0x5c6bc0, 64, (g, cx, h, w) => {
      g.lineStyle(3, 0x80d8ff, 0.9).strokeCircle(cx, h * 0.47, w * 0.22);
      g.fillStyle(0xe1f5fe, 1).fillCircle(cx, h * 0.47, 5);
      g.lineStyle(2, 0xb388ff, 0.8).lineBetween(cx, h * 0.3, cx + w * 0.28, h * 0.18);
    });
    // 掘地伏击者：土甲、利爪与头灯
    this.drawZombie('zombie_burrower', 0x493226, 0x8d6e63, 64, (g, cx, h, w) => {
      g.fillStyle(0xffc107, 1).fillCircle(cx, h * 0.17, 5);
      g.fillStyle(0x3e2723, 1).fillTriangle(cx - w * 0.42, h * 0.68, cx - w * 0.58, h * 0.78, cx - w * 0.32, h * 0.75);
      g.fillTriangle(cx + w * 0.42, h * 0.68, cx + w * 0.58, h * 0.78, cx + w * 0.32, h * 0.75);
    });
    // 尸群导体：胸口线圈和双肩电极
    this.drawZombie('zombie_conductor', 0x124e5b, 0x26a69a, 64, (g, cx, h, w) => {
      g.lineStyle(3, 0x80deea, 1).strokeCircle(cx, h * 0.5, w * 0.19);
      g.fillStyle(0xe0f7fa, 1).fillCircle(cx, h * 0.5, 5);
      g.fillStyle(0x4dd0e1, 1).fillCircle(cx - w * 0.34, h * 0.35, 5).fillCircle(cx + w * 0.34, h * 0.35, 5);
    });
    // 血肉汲取者：猩红储血囊与导管
    this.drawZombie('zombie_siphon', 0x5b1f2a, 0x9f3a48, 64, (g, cx, h, w) => {
      g.fillStyle(0xef5350, 0.85).fillCircle(cx, h * 0.53, w * 0.18);
      g.lineStyle(3, 0xff8a80, 0.8).lineBetween(cx, h * 0.53, cx + w * 0.34, h * 0.72);
      g.fillStyle(0xffcdd2, 0.75).fillCircle(cx - w * 0.08, h * 0.5, 3);
    });

    // 元素变体仍使用同一套程序化骨架，只通过轮廓附件、胸前元素徽记和配色区分。
    Object.values(ZOMBIE_DEFINITIONS).forEach((definition) => {
      if (this.textures.exists(definition.texture)) return;
      this.drawZombie(
        definition.texture,
        definition.palette.clothes,
        definition.palette.skin,
        64,
        (g, cx, h, w) => {
          const accent = definition.palette.accent;
          g.fillStyle(accent, 0.9).fillCircle(cx, h * 0.48, w * 0.115);
          g.lineStyle(3, accent, 0.82).strokeCircle(cx, h * 0.48, w * 0.18);
          const element = DAMAGE_ELEMENTS[definition.element];
          g.fillStyle(0x071015, 0.86).fillRoundedRect(cx - 9, h * 0.43, 18, 18, 4);
          g.fillStyle(element.color, 1).fillCircle(cx, h * 0.48, 5);

          if (definition.archetype === 'fast' || definition.archetype === 'leaper') {
            g.fillStyle(accent, 0.9)
              .fillTriangle(cx - w * 0.46, h * 0.66, cx - w * 0.22, h * 0.59, cx - w * 0.28, h * 0.75)
              .fillTriangle(cx + w * 0.46, h * 0.66, cx + w * 0.22, h * 0.59, cx + w * 0.28, h * 0.75);
          } else if (definition.archetype === 'tank' || definition.archetype === 'shield') {
            g.lineStyle(5, accent, 0.8).strokeRoundedRect(cx - w * 0.42, h * 0.31, w * 0.84, h * 0.43, 8);
          } else if (definition.archetype === 'spitter' || definition.archetype === 'exploder') {
            g.fillStyle(accent, 0.72).fillCircle(cx + w * 0.23, h * 0.55, w * 0.16);
          } else if (definition.archetype === 'healer' || definition.archetype === 'summoner') {
            g.lineStyle(3, accent, 0.9).strokeCircle(cx, h * 0.1, w * 0.2);
          } else if (definition.archetype === 'burrower') {
            g.fillStyle(accent, 0.9)
              .fillTriangle(cx - w * 0.36, h * 0.72, cx - w * 0.58, h * 0.82, cx - w * 0.26, h * 0.8)
              .fillTriangle(cx + w * 0.36, h * 0.72, cx + w * 0.58, h * 0.82, cx + w * 0.26, h * 0.8);
          } else if (definition.archetype === 'boss') {
            g.fillStyle(accent, 0.95)
              .fillTriangle(cx - 18, h * 0.12, cx - 9, 0, cx, h * 0.12)
              .fillTriangle(cx, h * 0.12, cx + 9, 0, cx + 18, h * 0.12);
          }
        },
      );
    });
  }

  private makeCoin(): void {
    const g = this.g();
    g.fillStyle(0xb8860b, 1).fillCircle(14, 14, 13);
    g.fillStyle(0xffd54a, 1).fillCircle(14, 13, 11.5);
    g.fillStyle(0xb8860b, 0.9);
    g.fillRect(12.5, 6, 3, 15);
    g.generateTexture('coin', 28, 28);
    g.destroy();
  }

  private makeCannon(): void {
    let g = this.g();
    g.fillStyle(0x000000, 0.36).fillEllipse(60, 65, 112, 14);
    g.fillStyle(0x11191f, 1).fillRoundedRect(0, 25, 120, 39, 11);
    g.fillStyle(0x2b3e49, 1).fillRoundedRect(5, 20, 110, 40, 10);
    g.fillStyle(0x4e6877, 1).fillRoundedRect(10, 23, 100, 30, 8);
    g.fillStyle(0x1d2a31, 1).fillCircle(60, 25, 34);
    g.fillStyle(0x78909c, 1).fillCircle(60, 25, 29);
    g.fillStyle(0x26343d, 1).fillCircle(60, 25, 23);
    g.lineStyle(4, 0xb0c7d3, 0.8).arc(60, 25, 26, 3.45, 5.85);
    g.lineStyle(3, 0x0e161b, 0.9).strokeCircle(60, 25, 17);
    g.fillStyle(0xffb300, 0.28).fillCircle(60, 25, 13);
    g.fillStyle(0xffca28, 1).fillCircle(60, 25, 7);
    g.fillStyle(0xffffff, 0.78).fillCircle(57, 22, 2.5);
    for (const x of [14, 106]) g.fillStyle(0xa8bec9, 0.8).fillCircle(x, 38, 3);
    g.generateTexture('cannon_base', 120, 72);
    g.destroy();

    g = this.g();
    g.fillStyle(0x11191f, 1).fillRoundedRect(6, 2, 28, 83, 8);
    g.fillStyle(0x4e6877, 1).fillRoundedRect(10, 5, 20, 76, 6);
    g.fillStyle(0x91a8b5, 0.55).fillRoundedRect(12, 8, 6, 66, 3);
    g.fillStyle(0x17242c, 0.9).fillRect(9, 47, 22, 8);
    g.fillStyle(0xb5c8d2, 1).fillRoundedRect(2, 0, 36, 16, 5);
    g.fillStyle(0x26343d, 1).fillRoundedRect(6, 3, 28, 9, 3);
    g.fillStyle(0xffffff, 0.3).fillRect(9, 3, 15, 2);
    g.generateTexture('cannon_barrel', 40, 100);
    g.destroy();
  }

  private makeWall(): void {
    const g = this.g();
    g.fillStyle(0x11191f, 1).fillRect(0, 0, 120, 48);
    g.fillStyle(0x3f5059, 1).fillRect(0, 4, 120, 40);
    g.fillStyle(0x26343c, 1);
    for (let x = -16; x < 120; x += 40) {
      g.fillTriangle(x, 44, x + 21, 4, x + 42, 44);
    }
    g.fillStyle(0x66808c, 0.62).fillRect(0, 4, 120, 6);
    g.fillStyle(0x0c1419, 0.72).fillRect(0, 40, 120, 8);
    g.lineStyle(2, 0x92aab5, 0.55).lineBetween(0, 4, 120, 4);
    g.lineStyle(2, 0x10181d, 0.85).lineBetween(0, 22, 120, 22);
    for (const x of [10, 50, 90]) {
      g.fillStyle(0xc6d4da, 0.85).fillCircle(x, 14, 2.5).fillCircle(x + 20, 34, 2.5);
    }
    g.generateTexture('wall_tile', 120, 48);
    g.destroy();
  }

  private makeUpgradeIcons(): void {
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.g();
      draw(g);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    // ── 攻击类 ──
    mk('icon_damage', (g) => {
      g.fillStyle(0xe74c3c, 1).fillEllipse(32, 34, 22, 40);
      g.fillStyle(0xffab91, 1).fillEllipse(32, 24, 12, 16);
    });
    mk('icon_firerate', (g) => {
      g.fillStyle(0xf5a623, 1);
      g.fillTriangle(16, 44, 32, 16, 48, 44);
      g.fillTriangle(20, 56, 32, 36, 44, 56);
    });
    mk('icon_multishot', (g) => {
      g.fillStyle(0x4fc3f7, 1);
      g.fillEllipse(16, 36, 10, 24);
      g.fillEllipse(32, 28, 10, 24);
      g.fillEllipse(48, 36, 10, 24);
    });
    mk('icon_pierce', (g) => {
      g.fillStyle(0x9575cd, 1).fillCircle(32, 32, 18);
      g.fillStyle(0xd1c4e9, 1).fillCircle(32, 32, 10);
      g.fillStyle(0xffd54a, 1).fillRect(8, 29, 48, 6);
      g.fillTriangle(56, 25, 56, 39, 64, 32);
    });
    mk('icon_crit', (g) => {
      g.fillStyle(0xffd54a, 1);
      g.fillTriangle(32, 6, 26, 30, 38, 30);
      g.fillTriangle(32, 58, 26, 34, 38, 34);
      g.fillTriangle(6, 32, 30, 26, 30, 38);
      g.fillTriangle(58, 32, 34, 26, 34, 38);
      g.fillStyle(0xfff9c4, 1).fillCircle(32, 32, 7);
    });
    mk('icon_burn', (g) => {
      g.fillStyle(0xff6d00, 1);
      g.fillTriangle(32, 8, 20, 44, 32, 36);
      g.fillTriangle(32, 8, 44, 44, 32, 36);
      g.fillStyle(0xffab00, 1).fillCircle(32, 38, 10);
    });
    mk('icon_ricochet', (g) => {
      g.fillStyle(0x26c6da, 1);
      g.fillCircle(16, 40, 8);
      g.fillCircle(48, 40, 8);
      g.lineStyle(3, 0x26c6da, 1);
      g.lineBetween(24, 36, 40, 20);
      g.fillTriangle(38, 16, 44, 22, 36, 24);
    });
    mk('icon_missile', (g) => {
      g.fillStyle(0x78909c, 1).fillRoundedRect(26, 10, 12, 40, 4);
      g.fillStyle(0xff6d00, 1);
      g.fillTriangle(24, 50, 32, 62, 40, 50);
      g.fillStyle(0xf44336, 1).fillCircle(32, 14, 5);
    });
    mk('icon_explosion', (g) => {
      g.fillStyle(0xff6d00, 1);
      const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? 24 : 14;
        return { x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r };
      });
      g.fillPoints(pts as Phaser.Math.Vector2[], true);
      g.fillStyle(0xffeb3b, 1).fillCircle(32, 32, 8);
    });
    mk('icon_laser', (g) => {
      g.fillStyle(0xf44336, 1).fillRect(28, 4, 8, 56);
      g.fillStyle(0xff8a80, 0.6).fillRect(22, 4, 20, 56);
      g.fillStyle(0xffcdd2, 1).fillRect(30, 4, 4, 56);
    });
    mk('icon_frost', (g) => {
      g.lineStyle(5, 0x80deea, 1);
      g.lineBetween(32, 6, 32, 58);
      g.lineBetween(8, 20, 56, 44);
      g.lineBetween(8, 44, 56, 20);
      g.fillStyle(0xe0f7fa, 1).fillCircle(32, 32, 7);
    });
    mk('icon_toxic', (g) => {
      g.fillStyle(0x33691e, 1).fillCircle(32, 34, 22);
      g.fillStyle(0x9ccc65, 1).fillCircle(24, 29, 7).fillCircle(41, 37, 9).fillCircle(31, 45, 6);
      g.fillStyle(0xe6ee9c, 0.95).fillCircle(22, 26, 3).fillCircle(38, 33, 3);
      g.fillStyle(0x263238, 1).fillCircle(22, 33, 3).fillCircle(42, 30, 3).fillTriangle(32, 34, 27, 42, 37, 42);
    });
    mk('icon_execute', (g) => {
      g.lineStyle(5, 0xff5252, 1).strokeCircle(32, 32, 20);
      g.lineStyle(4, 0xffffff, 0.9).lineBetween(12, 52, 52, 12);
      g.fillStyle(0xffd54a, 1).fillTriangle(44, 8, 56, 8, 56, 20);
    });
    mk('icon_air_support', (g) => {
      g.fillStyle(0x90a4ae, 1).fillRoundedRect(12, 25, 40, 14, 5);
      g.fillStyle(0x4fc3f7, 1).fillTriangle(8, 32, 24, 18, 24, 46);
      g.fillTriangle(56, 32, 40, 18, 40, 46);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 5);
    });
    mk('icon_gravity', (g) => {
      g.fillStyle(0x101020, 1).fillCircle(32, 32, 13);
      g.lineStyle(4, 0xb388ff, 1).strokeCircle(32, 32, 22);
      g.lineStyle(3, 0x4fc3f7, 0.9).arc(32, 32, 28, 0.2, 4.7);
      g.fillStyle(0xffffff, 1).fillCircle(50, 15, 4);
    });

    // ── 防御类 ──
    mk('icon_repair', (g) => {
      g.fillStyle(0x66bb6a, 1);
      g.fillRect(26, 10, 12, 44);
      g.fillRect(10, 26, 44, 12);
    });
    mk('icon_steel', (g) => {
      g.fillStyle(0x78909c, 1).fillRoundedRect(10, 14, 44, 36, 6);
      g.fillStyle(0xb0bec5, 1).fillRoundedRect(14, 18, 36, 28, 4);
      g.fillStyle(0x546e7a, 1).fillRect(30, 14, 4, 36);
    });
    mk('icon_thorns', (g) => {
      g.fillStyle(0x8d6e63, 1).fillRoundedRect(12, 34, 40, 20, 4);
      g.fillStyle(0xc8e6c9, 1);
      g.fillTriangle(20, 34, 16, 18, 24, 34);
      g.fillTriangle(32, 34, 28, 14, 36, 34);
      g.fillTriangle(44, 34, 40, 20, 48, 34);
    });
    mk('icon_shield', (g) => {
      g.fillStyle(0x42a5f5, 0.3).fillCircle(32, 32, 24);
      g.lineStyle(4, 0x42a5f5, 1);
      g.strokeCircle(32, 32, 24);
      g.fillStyle(0xbbdefb, 1).fillCircle(32, 32, 10);
    });
    mk('icon_minefield', (g) => {
      g.fillStyle(0x37474f, 1).fillCircle(32, 36, 20);
      g.lineStyle(4, 0xffca28, 1).strokeCircle(32, 36, 13);
      g.fillStyle(0xef5350, 1).fillCircle(32, 36, 5);
      g.fillStyle(0x90a4ae, 1).fillRect(29, 8, 6, 12);
    });
    mk('icon_field_medic', (g) => {
      g.fillStyle(0x2e7d32, 1).fillRoundedRect(8, 12, 48, 44, 8);
      g.fillStyle(0xe8f5e9, 1).fillRect(27, 18, 10, 32);
      g.fillRect(16, 29, 32, 10);
      g.fillStyle(0xffd54f, 1).fillCircle(50, 14, 6);
    });

    // ── 辅助类 ──
    mk('icon_gold', (g) => {
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 20);
      g.fillStyle(0xf9a825, 1).fillCircle(32, 31, 16);
      g.fillStyle(0xffd54a, 1).fillRoundedRect(27, 16, 10, 32, 4);
    });
    mk('icon_magnet', (g) => {
      g.fillStyle(0xe53935, 1);
      g.fillRoundedRect(12, 10, 8, 28, 4);
      g.fillRoundedRect(44, 10, 8, 28, 4);
      g.fillStyle(0xb71c1c, 1).fillRoundedRect(12, 10, 40, 14, { tl: 10, tr: 10, bl: 0, br: 0 });
    });
    mk('icon_lucky', (g) => {
      g.fillStyle(0x7c4dff, 1);
      const cx = 32, cy = 34, outer = 24, inner = 10;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
      g.fillStyle(0xea80fc, 1).fillCircle(cx, cy, 7);
    });

    // ── 组合技图标 ──
    mk('icon_hell', (g) => {
      // 火焰+穿透
      g.fillStyle(0xff6d00, 1);
      g.fillTriangle(32, 8, 20, 40, 32, 32);
      g.fillTriangle(32, 8, 44, 40, 32, 32);
      g.fillStyle(0xffd54a, 1).fillRect(8, 29, 48, 6);
      g.fillTriangle(56, 25, 56, 39, 64, 32);
    });
    mk('icon_storm', (g) => {
      // 弹幕风暴
      g.fillStyle(0x4fc3f7, 1);
      g.fillEllipse(16, 40, 8, 18);
      g.fillEllipse(32, 30, 8, 18);
      g.fillEllipse(48, 40, 8, 18);
      g.fillStyle(0x80deea, 1);
      g.fillEllipse(24, 34, 6, 12);
      g.fillEllipse(40, 34, 6, 12);
    });
    mk('icon_fatal', (g) => {
      // 致命光束
      g.fillStyle(0xf44336, 1).fillRect(28, 4, 8, 56);
      g.fillStyle(0xffd54a, 0.7).fillRect(24, 4, 16, 56);
      g.fillStyle(0xffffff, 0.5).fillRect(30, 4, 4, 56);
    });
    mk('icon_iron', (g) => {
      // 铜墙铁壁
      g.fillStyle(0x78909c, 1).fillRoundedRect(10, 14, 44, 36, 6);
      g.fillStyle(0xb0bec5, 1).fillRoundedRect(14, 18, 36, 28, 4);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 8);
      g.fillStyle(0x78909c, 1).fillRect(28, 14, 8, 36);
    });
    mk('icon_satur', (g) => {
      // 饱和打击（三导弹）
      g.fillStyle(0x78909c, 1).fillRoundedRect(10, 14, 8, 30, 3);
      g.fillRoundedRect(28, 10, 8, 30, 3);
      g.fillRoundedRect(46, 14, 8, 30, 3);
      g.fillStyle(0xff6d00, 1);
      g.fillTriangle(8, 44, 14, 54, 20, 44);
      g.fillTriangle(26, 40, 32, 50, 38, 40);
      g.fillTriangle(44, 44, 50, 54, 56, 44);
    });
    mk('icon_deton', (g) => {
      // 爆燃弹
      g.fillStyle(0xff6d00, 1);
      g.fillCircle(32, 32, 16);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 8);
      g.fillStyle(0xffffff, 0.6).fillCircle(32, 32, 3);
    });
    mk('icon_doom', (g) => {
      // 末日弹
      g.fillStyle(0xff6d00, 1);
      const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? 28 : 16;
        return { x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r };
      });
      g.fillPoints(pts as Phaser.Math.Vector2[], true);
      g.fillStyle(0xff1744, 1).fillCircle(32, 32, 8);
    });
    mk('icon_barrage', (g) => {
      // 火力全开
      g.fillStyle(0xf44336, 1);
      g.fillTriangle(16, 44, 24, 12, 32, 44);
      g.fillTriangle(32, 44, 40, 12, 48, 44);
      g.fillStyle(0xffd54a, 1);
      g.fillEllipse(24, 36, 6, 14);
      g.fillEllipse(40, 36, 6, 14);
    });
    mk('icon_fortress', (g) => {
      // 铁壁堡垒
      g.fillStyle(0x42a5f5, 0.3).fillCircle(32, 32, 24);
      g.lineStyle(4, 0x42a5f5, 1);
      g.strokeCircle(32, 32, 24);
      g.strokeCircle(32, 32, 16);
      g.fillStyle(0xbbdefb, 1).fillCircle(32, 32, 8);
    });
    mk('icon_goldHunter', (g) => {
      // 黄金猎手
      g.fillStyle(0xffd54a, 1).fillCircle(32, 28, 18);
      g.fillStyle(0xf9a825, 1).fillCircle(32, 27, 14);
      g.fillStyle(0x66bb6a, 1);
      g.fillRect(26, 46, 12, 12);
      g.fillRect(20, 52, 24, 6);
    });
    mk('icon_chain', (g) => {
      // 连锁闪电
      g.fillStyle(0xffd54a, 1);
      g.fillTriangle(24, 8, 16, 30, 32, 28);
      g.fillTriangle(32, 28, 40, 8, 48, 30);
      g.fillTriangle(16, 36, 8, 56, 32, 38);
      g.fillTriangle(32, 38, 56, 56, 48, 36);
      g.fillStyle(0xfff9c4, 1).fillCircle(32, 32, 5);
    });
    mk('icon_armageddon', (g) => {
      // 末日审判
      g.fillStyle(0xff1744, 1).fillCircle(32, 32, 24);
      g.fillStyle(0xff6d00, 1).fillCircle(32, 32, 16);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 8);
      g.fillStyle(0xffffff, 0.6).fillCircle(32, 32, 3);
    });
    mk('icon_thermal_shock', (g) => {
      g.fillStyle(0xff6d00, 1).fillCircle(24, 32, 17);
      g.fillStyle(0x4fc3f7, 0.9).fillCircle(40, 32, 17);
      g.fillStyle(0xffffff, 1).fillCircle(32, 32, 7);
    });
    mk('icon_singularity_bomb', (g) => {
      g.fillStyle(0x16102a, 1).fillCircle(32, 32, 16);
      g.lineStyle(5, 0xb388ff, 1).strokeCircle(32, 32, 24);
      g.fillStyle(0xff6d00, 1).fillTriangle(32, 2, 26, 18, 38, 18);
    });
    mk('icon_cryo_mine', (g) => {
      g.fillStyle(0x37474f, 1).fillCircle(32, 36, 20);
      g.lineStyle(4, 0x80deea, 1).strokeCircle(32, 36, 14);
      g.lineStyle(3, 0xe0f7fa, 1).lineBetween(32, 15, 32, 55);
      g.lineBetween(15, 36, 49, 36);
    });
    mk('icon_drone_swarm', (g) => {
      g.fillStyle(0x90a4ae, 1);
      g.fillTriangle(6, 22, 24, 12, 20, 32);
      g.fillTriangle(40, 32, 44, 12, 62, 22);
      g.fillTriangle(18, 48, 32, 34, 46, 48);
      g.fillStyle(0x4fc3f7, 1).fillCircle(20, 23, 4).fillCircle(44, 23, 4).fillCircle(32, 44, 4);
    });
    mk('icon_field_hospital', (g) => {
      g.fillStyle(0x1565c0, 0.35).fillCircle(32, 32, 28);
      g.lineStyle(3, 0x64b5f6, 1).strokeCircle(32, 32, 26);
      g.fillStyle(0xe8f5e9, 1).fillRect(27, 13, 10, 38);
      g.fillRect(13, 27, 38, 10);
    });
    // ── 终极流派图标 ──
    mk('icon_ultimate_apocalypse', (g) => {
      g.fillStyle(0x1a0a0a, 1).fillCircle(32, 32, 26);
      g.fillStyle(0xff1744, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.fillTriangle(
          32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8,
          32 + Math.cos(a + 0.25) * 26, 32 + Math.sin(a + 0.25) * 26,
          32 + Math.cos(a - 0.25) * 26, 32 + Math.sin(a - 0.25) * 26,
        );
      }
      g.fillStyle(0xffd54a, 1).fillCircle(32, 32, 9);
      g.fillStyle(0xffffff, 0.85).fillCircle(32, 32, 4);
    });
    mk('icon_ultimate_dynasty', (g) => {
      g.fillStyle(0x0a1a18, 1).fillRoundedRect(8, 14, 48, 44, 6);
      g.lineStyle(4, 0x4db6ac, 1).strokeRoundedRect(8, 14, 48, 44, 6);
      g.lineStyle(4, 0x80cbc4, 1);
      g.lineBetween(8, 30, 56, 30);
      g.lineBetween(8, 44, 56, 44);
      g.fillStyle(0xffd54a, 1);
      g.fillTriangle(18, 14, 24, 2, 30, 14);
      g.fillTriangle(34, 14, 40, 2, 46, 14);
      g.fillStyle(0x4db6ac, 1).fillCircle(32, 37, 7);
      g.fillStyle(0xffffff, 0.8).fillCircle(32, 37, 3);
    });

    // ── 结算星星 ──
    mk('star', (g) => {
      g.fillStyle(0xffd54a, 1);
      const cx = 32, cy = 34, outer = 26, inner = 11;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
    });
    mk('star_empty', (g) => {
      g.fillStyle(0x555c66, 1);
      const cx = 32, cy = 34, outer = 26, inner = 11;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
    });
  }

  private makeArmoryIcons(): void {
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.g();
      draw(g);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };
    mk('icon_bg_embers', (g) => {
      g.fillGradientStyle(0x2a1410, 0x2a1410, 0x7a3218, 0x7a3218, 1).fillRoundedRect(4, 6, 56, 52, 8);
      g.fillStyle(0xff6d00, 0.9).fillCircle(18, 44, 4).fillCircle(42, 34, 3).fillCircle(50, 48, 5);
    });
    mk('icon_bg_neon', (g) => {
      g.fillGradientStyle(0x0b1020, 0x0b1020, 0x123b4a, 0x123b4a, 1).fillRoundedRect(4, 6, 56, 52, 8);
      g.lineStyle(3, 0x4de7ff, 0.9).lineBetween(10, 48, 52, 16);
      g.lineStyle(2, 0xff4fd8, 0.8).lineBetween(14, 18, 52, 46);
    });
    mk('icon_bg_aurora', (g) => {
      g.fillGradientStyle(0x07141c, 0x07141c, 0x164759, 0x164759, 1).fillRoundedRect(4, 6, 56, 52, 8);
      g.lineStyle(5, 0x80deea, 0.65).arc(32, 38, 30, 3.5, 5.9);
      g.lineStyle(3, 0x69f0ae, 0.7).arc(32, 44, 34, 3.45, 5.95);
      g.fillStyle(0xe0f7fa, 0.85).fillTriangle(8, 54, 26, 32, 38, 54).fillTriangle(28, 54, 45, 28, 58, 54);
    });
    mk('icon_bg_eclipse', (g) => {
      g.fillGradientStyle(0x120c1d, 0x120c1d, 0x38224a, 0x38224a, 1).fillRoundedRect(4, 6, 56, 52, 8);
      g.fillStyle(0xb388ff, 0.65).fillCircle(32, 29, 18);
      g.fillStyle(0x09070d, 1).fillCircle(36, 25, 16);
      g.lineStyle(3, 0xce93d8, 0.8).lineBetween(10, 52, 54, 42);
    });
    mk('icon_floodlight', (g) => {
      g.fillStyle(0x78909c, 1).fillRect(29, 26, 6, 32);
      g.fillStyle(0xffd54a, 1).fillRoundedRect(17, 10, 30, 20, 5);
      g.fillStyle(0xffffff, 0.55).fillTriangle(20, 30, 44, 30, 54, 58);
    });
    mk('icon_banners', (g) => {
      g.fillStyle(0x78909c, 1).fillRect(13, 7, 5, 52).fillRect(46, 7, 5, 52);
      g.fillStyle(0xb71c1c, 1).fillTriangle(18, 12, 18, 43, 42, 26).fillTriangle(46, 12, 46, 43, 22, 26);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 26, 6);
    });
    mk('icon_radar', (g) => {
      g.fillStyle(0x10251f, 1).fillCircle(32, 32, 27);
      g.lineStyle(3, 0x69f0ae, 0.9).strokeCircle(32, 32, 23).strokeCircle(32, 32, 13);
      g.lineStyle(4, 0xa7ffeb, 1).lineBetween(32, 32, 49, 17);
      g.fillStyle(0xffd54a, 1).fillCircle(21, 42, 4);
    });
    mk('icon_memorial', (g) => {
      g.fillStyle(0x546e7a, 1).fillRoundedRect(17, 20, 30, 38, 5);
      g.fillStyle(0x90a4ae, 1).fillTriangle(32, 5, 21, 23, 43, 23);
      g.fillStyle(0xffb74d, 1).fillTriangle(32, 15, 25, 32, 32, 28).fillTriangle(32, 15, 39, 32, 32, 28);
      g.fillStyle(0xffd54a, 1).fillCircle(32, 34, 5);
    });
    mk('icon_support_sentry', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(10, 40, 44, 16, 5);
      g.fillStyle(0x90a4ae, 1).fillRoundedRect(23, 21, 18, 25, 5);
      g.fillStyle(0xffd54a, 1).fillRoundedRect(30, 8, 8, 25, 3);
    });
    mk('icon_support_tesla', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(16, 46, 32, 12, 4);
      g.lineStyle(5, 0x4fc3f7, 1).lineBetween(32, 48, 32, 16);
      g.fillStyle(0xfff176, 1).fillTriangle(32, 4, 22, 26, 34, 24);
      g.fillTriangle(34, 24, 44, 18, 30, 42);
    });
    mk('icon_support_mortar', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(10, 45, 44, 13, 4);
      g.lineStyle(9, 0x90a4ae, 1).lineBetween(25, 43, 42, 14);
      g.fillStyle(0xff6d00, 1).fillCircle(45, 10, 7);
    });
    mk('icon_support_cryo', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(12, 46, 40, 12, 4);
      g.fillStyle(0x80deea, 0.35).fillCircle(32, 28, 22);
      g.lineStyle(4, 0xe0f7fa, 1).lineBetween(32, 8, 32, 48).lineBetween(14, 19, 50, 39).lineBetween(14, 39, 50, 19);
    });
    mk('icon_support_plasma', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(12, 46, 40, 12, 4);
      g.fillStyle(0xce93d8, 0.4).fillCircle(32, 27, 21);
      g.fillStyle(0xffffff, 1).fillRect(29, 7, 6, 42);
      g.fillStyle(0xea80fc, 0.9).fillRect(24, 11, 16, 34);
    });
    mk('icon_support_drones', (g) => {
      g.fillStyle(0x455a64, 1).fillRoundedRect(8, 48, 48, 10, 4);
      for (const x of [16, 32, 48]) {
        g.fillStyle(0x90a4ae, 1).fillTriangle(x - 9, 28, x, 18, x + 9, 28);
        g.fillStyle(0x69f0ae, 1).fillCircle(x, 27, 4);
      }
    });
  }

  private makeParticles(): void {
    let g = this.g();
    g.fillStyle(0x263d20, 0.7).fillCircle(7, 7, 7);
    g.fillStyle(0x8bc34a, 1).fillCircle(7, 7, 5);
    g.fillStyle(0xdcedc8, 0.7).fillCircle(5, 5, 2);
    g.generateTexture('blood', 14, 14);
    g.destroy();

    g = this.g();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8);
    g.generateTexture('pixel', 8, 8);
    g.destroy();

    g = this.g();
    g.fillStyle(0xff6d00, 0.12).fillCircle(12, 12, 12);
    g.fillStyle(0xffca28, 0.75).fillCircle(12, 12, 5);
    g.fillStyle(0xffffff, 1).fillCircle(11, 10, 2);
    g.generateTexture('ambient_mote', 24, 24);
    g.destroy();

    g = this.g();
    g.fillStyle(0xffffff, 1).fillTriangle(2, 8, 18, 4, 18, 12);
    g.fillStyle(0xffca28, 0.8).fillTriangle(8, 8, 22, 6, 22, 10);
    g.generateTexture('impact_spark', 24, 16);
    g.destroy();

    g = this.g();
    g.fillStyle(0x263238, 0.12).fillCircle(24, 24, 23);
    g.fillStyle(0x607d8b, 0.22).fillCircle(24, 24, 16);
    g.fillStyle(0xb0bec5, 0.28).fillCircle(20, 19, 9);
    g.generateTexture('smoke_puff', 48, 48);
    g.destroy();
  }

  private makeTacticalEffects(): void {
    let g = this.g();
    g.fillStyle(0x10101c, 0.9).fillCircle(48, 48, 18);
    g.lineStyle(5, 0x7e57c2, 0.8).strokeCircle(48, 48, 29);
    g.lineStyle(3, 0x4fc3f7, 0.8).arc(48, 48, 40, 0.3, 5.2);
    g.fillStyle(0xffffff, 0.9).fillCircle(74, 24, 4);
    g.generateTexture('gravity_field', 96, 96);
    g.destroy();

    g = this.g();
    g.fillStyle(0x263238, 1).fillCircle(24, 24, 18);
    g.lineStyle(3, 0x78909c, 1).strokeCircle(24, 24, 15);
    g.fillStyle(0xffca28, 1).fillCircle(24, 24, 7);
    g.fillStyle(0xef5350, 1).fillCircle(24, 24, 3);
    g.generateTexture('field_mine', 48, 48);
    g.destroy();
  }

  private makeAcidBall(): void {
    const g = this.g();
    g.fillStyle(0x76ff03, 0.9).fillCircle(7, 7, 7);
    g.fillStyle(0xb2ff59, 0.6).fillCircle(6, 5, 3);
    g.generateTexture('acid_ball', 14, 14);
    g.destroy();
  }

  private makeExplosionEffect(): void {
    const g = this.g();
    g.fillStyle(0xff3d00, 0.25).fillCircle(18, 18, 17);
    g.fillStyle(0xff6d00, 0.95)
      .fillTriangle(18, 0, 23, 13, 34, 8)
      .fillTriangle(36, 18, 23, 23, 29, 35)
      .fillTriangle(18, 36, 13, 23, 1, 29)
      .fillTriangle(0, 18, 13, 13, 7, 2);
    g.fillStyle(0xffd740, 1).fillCircle(18, 18, 10);
    g.fillStyle(0xffffff, 0.9).fillCircle(16, 15, 4);
    g.generateTexture('explosion_particle', 36, 36);
    g.destroy();
  }

  private makeHealEffect(): void {
    const g = this.g();
    g.fillStyle(0x69f0ae, 0.8);
    g.fillRect(4, 0, 4, 12);
    g.fillRect(0, 4, 12, 4);
    g.generateTexture('heal_cross', 12, 12);
    g.destroy();
  }

  private makeShieldEffect(): void {
    const g = this.g();
    g.lineStyle(3, 0x42a5f5, 0.9);
    g.strokeCircle(16, 16, 14);
    g.fillStyle(0x42a5f5, 0.2).fillCircle(16, 16, 14);
    g.generateTexture('shield_bubble', 32, 32);
    g.destroy();
  }
}
