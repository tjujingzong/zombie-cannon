import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';

/**
 * BootScene：全部纹理用 graphics 程序化生成，生成完毕直接进入菜单
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
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
    g.fillStyle(0xffffff, 1).fillCircle(16, 16, 5);
    g.fillStyle(0xffeb3b, 0.8).fillCircle(16, 16, 10);
    g.fillStyle(0xff9800, 0.4).fillCircle(16, 16, 16);
    g.generateTexture('muzzle_flash', 32, 32);
    g.destroy();
  }

  private makeBossAura(): void {
    const g = this.g();
    g.fillStyle(0x9455a8, 0.25).fillCircle(40, 12, 36);
    g.lineStyle(3, 0xce93d8, 0.7).strokeCircle(40, 12, 30);
    g.lineStyle(2, 0xff66ff, 0.4).strokeCircle(40, 12, 22);
    g.generateTexture('boss_aura', 80, 24);
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
    g.lineStyle(3, 0xffffff, 0.9).strokeCircle(24, 24, 20);
    g.lineStyle(2, 0xffd54a, 0.5).strokeCircle(24, 24, 14);
    g.generateTexture('shockwave', 48, 48);
    g.destroy();
  }

  private makeBossCrown(): void {
    const g = this.g();
    g.fillStyle(0xffd54a, 1);
    g.fillTriangle(10, 18, 4, 4, 16, 8);
    g.fillTriangle(20, 18, 16, 2, 28, 8);
    g.fillTriangle(30, 18, 24, 4, 36, 8);
    g.fillStyle(0xe74c3c, 1).fillCircle(20, 8, 3);
    g.generateTexture('boss_crown', 40, 20);
    g.destroy();
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private makeBullet(): void {
    const g = this.g();
    g.fillStyle(0xff9f1c, 1).fillEllipse(9, 14, 14, 26);
    g.fillStyle(0xffe066, 1).fillEllipse(9, 10, 8, 12);
    g.generateTexture('bullet', 18, 28);
    g.destroy();
  }

  // ─── 僵尸绘制 ───

  private drawZombie(key: string, bodyColor: number, headColor: number, size: number, extras?: (g: Phaser.GameObjects.Graphics, cx: number, h: number, w: number) => void): void {
    const g = this.g();
    const w = size;
    const h = size * 1.25;
    const cx = w / 2;
    // 地面阴影和不对称腿部，让小尺寸单位在尸潮中仍然有轮廓
    g.fillStyle(0x000000, 0.28).fillEllipse(cx, h * 0.96, w * 0.62, w * 0.14);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(cx - w * 0.2, h * 0.72, w * 0.14, h * 0.24, w * 0.06);
    g.fillRoundedRect(cx + w * 0.06, h * 0.74, w * 0.14, h * 0.22, w * 0.06);
    // 双臂（前伸向下）
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(cx - w * 0.46, h * 0.42, w * 0.2, h * 0.4, w * 0.09);
    g.fillRoundedRect(cx + w * 0.26, h * 0.42, w * 0.2, h * 0.4, w * 0.09);
    // 身体
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(cx - w * 0.3, h * 0.34, w * 0.6, h * 0.52, w * 0.12);
    // 破烂衣服阴影
    g.fillStyle(0x000000, 0.18);
    g.fillRect(cx - w * 0.3, h * 0.62, w * 0.6, h * 0.08);
    // 头
    g.fillStyle(headColor, 1);
    g.fillCircle(cx, h * 0.22, w * 0.24);
    // 眼睛
    g.fillStyle(0x2d0a0a, 1);
    g.fillCircle(cx - w * 0.1, h * 0.2, w * 0.05);
    g.fillCircle(cx + w * 0.1, h * 0.2, w * 0.05);
    g.fillStyle(0xff5252, 1);
    g.fillCircle(cx - w * 0.1, h * 0.2, w * 0.022);
    g.fillCircle(cx + w * 0.1, h * 0.2, w * 0.022);
    // 嘴
    g.fillStyle(0x2d0a0a, 1);
    g.fillRect(cx - w * 0.08, h * 0.29, w * 0.16, w * 0.04);
    // 眉骨、高光和破损衣角
    g.fillStyle(0x000000, 0.24).fillEllipse(cx - w * 0.16, h * 0.16, w * 0.14, w * 0.05);
    g.fillStyle(0xffffff, 0.14).fillRoundedRect(cx - w * 0.2, h * 0.4, w * 0.12, h * 0.17, 3);
    g.fillStyle(0x000000, 0.25);
    g.fillTriangle(cx - w * 0.28, h * 0.78, cx - w * 0.08, h * 0.78, cx - w * 0.2, h * 0.88);
    g.fillTriangle(cx + w * 0.1, h * 0.78, cx + w * 0.28, h * 0.78, cx + w * 0.2, h * 0.88);
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
    g.fillStyle(0x263238, 1).fillRoundedRect(0, 18, 120, 46, 12);
    g.fillStyle(0x455a64, 1).fillRoundedRect(6, 22, 108, 36, 10);
    g.fillStyle(0x607d8b, 1).fillCircle(60, 26, 34);
    g.fillStyle(0x263238, 1).fillCircle(60, 26, 25);
    g.lineStyle(3, 0x90a4ae, 0.7).strokeCircle(60, 26, 19);
    g.fillStyle(0xffd54a, 0.75).fillCircle(60, 26, 5);
    g.generateTexture('cannon_base', 120, 64);
    g.destroy();

    g = this.g();
    g.fillStyle(0x263238, 1).fillRoundedRect(8, 0, 24, 78, 8);
    g.fillStyle(0x607d8b, 1).fillRoundedRect(11, 4, 18, 70, 6);
    g.fillStyle(0x90a4ae, 1).fillRoundedRect(4, 0, 32, 14, 5);
    g.generateTexture('cannon_barrel', 40, 100);
    g.destroy();
  }

  private makeWall(): void {
    const g = this.g();
    g.fillStyle(0x6d4c41, 1).fillRect(0, 0, 120, 48);
    g.fillStyle(0x9e8277, 1).fillRect(0, 0, 120, 5);
    g.fillStyle(0x795548, 1);
    for (let row = 0; row < 2; row++) {
      const off = row % 2 === 0 ? 0 : 30;
      for (let x = -30; x < 120; x += 60) {
        g.fillRect(x + off + 2, row * 24 + 2, 56, 20);
      }
    }
    g.lineStyle(2, 0x4e342e, 0.8).lineBetween(0, 23, 120, 23);
    g.fillStyle(0xd7ccc8, 0.2).fillRect(8, 7, 3, 12);
    g.fillStyle(0x2f1d1b, 0.55).fillRect(84, 29, 24, 3);
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
    mk('icon_floodlight', (g) => {
      g.fillStyle(0x78909c, 1).fillRect(29, 26, 6, 32);
      g.fillStyle(0xffd54a, 1).fillRoundedRect(17, 10, 30, 20, 5);
      g.fillStyle(0xffffff, 0.55).fillTriangle(20, 30, 44, 30, 54, 58);
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
  }

  private makeParticles(): void {
    let g = this.g();
    g.fillStyle(0x8bc34a, 1).fillCircle(5, 5, 5);
    g.generateTexture('blood', 10, 10);
    g.destroy();

    g = this.g();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8);
    g.generateTexture('pixel', 8, 8);
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
    g.fillStyle(0xff6d00, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xffeb3b, 0.8).fillCircle(16, 16, 8);
    g.fillStyle(0xffffff, 0.5).fillCircle(16, 16, 3);
    g.generateTexture('explosion_particle', 32, 32);
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
