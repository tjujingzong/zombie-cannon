import Phaser from 'phaser';

/**
 * BootScene：全部纹理用 Graphics 程序化生成，生成完毕直接进入菜单
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeBullet();
    this.makeZombies();
    this.makeCoin();
    this.makeCannon();
    this.makeWall();
    this.makeUpgradeIcons();
    this.makeParticles();
    this.makeAcidBall();
    this.makeExplosionEffect();
    this.makeHealEffect();
    this.makeShieldEffect();
    this.scene.start('Menu');
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
    // 额外装饰
    if (extras) extras(g, cx, h, w);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeZombies(): void {
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
    g.fillStyle(0x37474f, 1).fillRoundedRect(0, 18, 120, 46, 12);
    g.fillStyle(0x546e7a, 1).fillCircle(60, 26, 34);
    g.fillStyle(0x455a64, 1).fillCircle(60, 26, 24);
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
    g.fillStyle(0x8d6e63, 1).fillRect(0, 0, 120, 48);
    g.fillStyle(0x795548, 1);
    for (let row = 0; row < 2; row++) {
      const off = row % 2 === 0 ? 0 : 30;
      for (let x = -30; x < 120; x += 60) {
        g.fillRect(x + off + 2, row * 24 + 2, 56, 20);
      }
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
