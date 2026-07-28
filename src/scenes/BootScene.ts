import Phaser from 'phaser';

/**
 * BootScene：不加载外部资源，全部纹理用 Graphics 程序化生成，
 * 生成完毕直接进入菜单。
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
    this.scene.start('Menu');
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  private makeBullet(): void {
    const g = this.g();
    // 炮弹：橙黄色椭圆 + 亮芯
    g.fillStyle(0xff9f1c, 1).fillEllipse(9, 14, 14, 26);
    g.fillStyle(0xffe066, 1).fillEllipse(9, 10, 8, 12);
    g.generateTexture('bullet', 18, 28);
    g.destroy();
  }

  /** 卡通僵尸：身体 + 头 + 双臂前伸，按类型配色区分 */
  private drawZombie(key: string, bodyColor: number, headColor: number, size: number): void {
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
    // 眼睛（呆滞红点）
    g.fillStyle(0x2d0a0a, 1);
    g.fillCircle(cx - w * 0.1, h * 0.2, w * 0.05);
    g.fillCircle(cx + w * 0.1, h * 0.2, w * 0.05);
    g.fillStyle(0xff5252, 1);
    g.fillCircle(cx - w * 0.1, h * 0.2, w * 0.022);
    g.fillCircle(cx + w * 0.1, h * 0.2, w * 0.022);
    // 嘴
    g.fillStyle(0x2d0a0a, 1);
    g.fillRect(cx - w * 0.08, h * 0.29, w * 0.16, w * 0.04);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeZombies(): void {
    this.drawZombie('zombie_normal', 0x4f7a3a, 0x7aa85c, 64);
    this.drawZombie('zombie_fast', 0x3a6a7a, 0x66a3b5, 64);
    this.drawZombie('zombie_tank', 0x6a4a2e, 0x9c7a52, 64);
    this.drawZombie('zombie_boss', 0x5a2a6a, 0x9455a8, 64);
  }

  private makeCoin(): void {
    const g = this.g();
    g.fillStyle(0xb8860b, 1).fillCircle(14, 14, 13);
    g.fillStyle(0xffd54a, 1).fillCircle(14, 13, 11.5);
    g.fillStyle(0xb8860b, 0.9);
    // 简易 "$" 竖线
    g.fillRect(12.5, 6, 3, 15);
    g.generateTexture('coin', 28, 28);
    g.destroy();
  }

  private makeCannon(): void {
    // 底座
    let g = this.g();
    g.fillStyle(0x37474f, 1).fillRoundedRect(0, 18, 120, 46, 12);
    g.fillStyle(0x546e7a, 1).fillCircle(60, 26, 34);
    g.fillStyle(0x455a64, 1).fillCircle(60, 26, 24);
    g.generateTexture('cannon_base', 120, 64);
    g.destroy();
    // 炮管（默认朝上，origin 设在下部）
    g = this.g();
    g.fillStyle(0x263238, 1).fillRoundedRect(8, 0, 24, 78, 8);
    g.fillStyle(0x607d8b, 1).fillRoundedRect(11, 4, 18, 70, 6);
    g.fillStyle(0x90a4ae, 1).fillRoundedRect(4, 0, 32, 14, 5); // 炮口箍
    g.generateTexture('cannon_barrel', 40, 100);
    g.destroy();
  }

  private makeWall(): void {
    const g = this.g();
    // 砖墙：两排砖
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
    // 火力：红色炮弹
    mk('icon_damage', (g) => {
      g.fillStyle(0xe74c3c, 1).fillEllipse(32, 34, 22, 40);
      g.fillStyle(0xffab91, 1).fillEllipse(32, 24, 12, 16);
    });
    // 攻速：双箭头
    mk('icon_firerate', (g) => {
      g.fillStyle(0xf5a623, 1);
      g.fillTriangle(16, 44, 32, 16, 48, 44);
      g.fillTriangle(20, 56, 32, 36, 44, 56);
    });
    // 多重：三发子弹
    mk('icon_multishot', (g) => {
      g.fillStyle(0x4fc3f7, 1);
      g.fillEllipse(16, 36, 10, 24);
      g.fillEllipse(32, 28, 10, 24);
      g.fillEllipse(48, 36, 10, 24);
    });
    // 穿透：箭穿靶
    mk('icon_pierce', (g) => {
      g.fillStyle(0x9575cd, 1).fillCircle(32, 32, 18);
      g.fillStyle(0xd1c4e9, 1).fillCircle(32, 32, 10);
      g.fillStyle(0xffd54a, 1).fillRect(8, 29, 48, 6);
      g.fillTriangle(56, 25, 56, 39, 64, 32);
    });
    // 暴击：星形闪光
    mk('icon_crit', (g) => {
      g.fillStyle(0xffd54a, 1);
      g.fillTriangle(32, 6, 26, 30, 38, 30);
      g.fillTriangle(32, 58, 26, 34, 38, 34);
      g.fillTriangle(6, 32, 30, 26, 30, 38);
      g.fillTriangle(58, 32, 34, 26, 34, 38);
      g.fillStyle(0xfff9c4, 1).fillCircle(32, 32, 7);
    });
    // 维修：绿色十字扳手
    mk('icon_repair', (g) => {
      g.fillStyle(0x66bb6a, 1);
      g.fillRect(26, 10, 12, 44);
      g.fillRect(10, 26, 44, 12);
    });
    // 星星（结算用）
    mk('star', (g) => {
      g.fillStyle(0xffd54a, 1);
      const cx = 32,
        cy = 34,
        outer = 26,
        inner = 11;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
    });
    // 灰星
    mk('star_empty', (g) => {
      g.fillStyle(0x555c66, 1);
      const cx = 32,
        cy = 34,
        outer = 26,
        inner = 11;
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
    // 血雾粒子
    let g = this.g();
    g.fillStyle(0x8bc34a, 1).fillCircle(5, 5, 5);
    g.generateTexture('blood', 10, 10);
    g.destroy();
    // 白色小方块（通用粒子/像素）
    g = this.g();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8);
    g.generateTexture('pixel', 8, 8);
    g.destroy();
  }
}
