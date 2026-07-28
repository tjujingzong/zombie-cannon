import Phaser from 'phaser';
import { CANNON_RANGE, CANNON_Y, GAME_WIDTH } from '../data/balance';
import type { UpgradeSystem } from '../systems/UpgradeSystem';
import type { Zombie } from './Zombie';

/**
 * 炮台：自动索敌最近僵尸开火；玩家按住屏幕时优先朝指针方向射击。
 */
export class Cannon extends Phaser.GameObjects.Container {
  private barrel: Phaser.GameObjects.Image;
  private base: Phaser.GameObjects.Image;
  private fireCooldown = 0;
  private manualAngle: number | null = null;
  private upgrades: UpgradeSystem;

  /** 开火回调：由 GameScene 生成子弹 */
  onFire: (x: number, y: number, angle: number) => void = () => {};

  constructor(scene: Phaser.Scene, upgrades: UpgradeSystem) {
    super(scene, GAME_WIDTH / 2, CANNON_Y);
    this.upgrades = upgrades;

    this.base = scene.add.image(0, 22, 'cannon_base');
    this.barrel = scene.add.image(0, 0, 'cannon_barrel').setOrigin(0.5, 0.78);
    this.add([this.base, this.barrel]);
    this.setDepth(10);
    scene.add.existing(this);
  }

  setManualAim(worldX: number, worldY: number): void {
    // 只允许朝上方半圆瞄准
    if (worldY > this.y - 30) worldY = this.y - 30;
    this.manualAngle = Phaser.Math.Angle.Between(this.x, this.y, worldX, worldY);
  }

  clearManualAim(): void {
    this.manualAngle = null;
  }

  update(dt: number, zombies: Zombie[]): void {
    // 目标角度：手动优先，否则最近僵尸，否则朝正上
    let targetAngle = -Math.PI / 2;
    let hasTarget = false;

    if (this.manualAngle !== null) {
      targetAngle = this.manualAngle;
      hasTarget = true;
    } else {
      let nearest: Zombie | null = null;
      let nearestDist = CANNON_RANGE;
      for (const z of zombies) {
        if (!z.active || z.hp <= 0) continue;
        const d = Phaser.Math.Distance.Between(this.x, this.y, z.x, z.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = z;
        }
      }
      if (nearest) {
        targetAngle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
        hasTarget = true;
      }
    }

    // 炮管朝向（贴图默认朝上，故 +PI/2）
    this.barrel.setRotation(targetAngle + Math.PI / 2);

    // 开火节奏
    this.fireCooldown -= dt;
    if (hasTarget && this.fireCooldown <= 0) {
      this.fireCooldown = 1 / this.upgrades.fireRate;
      this.fireVolley(targetAngle);
    }
  }

  private fireVolley(angle: number): void {
    const count = this.upgrades.bulletCount;
    const spread = 0.14; // 多发弹的扇形间隔（弧度）
    const start = angle - ((count - 1) * spread) / 2;
    const muzzleLen = this.barrel.displayHeight * 0.78;
    for (let i = 0; i < count; i++) {
      const a = start + i * spread;
      const mx = this.x + Math.cos(a) * muzzleLen;
      const my = this.y + Math.sin(a) * muzzleLen;
      this.onFire(mx, my, a);
    }
    // 后坐力动画
    this.scene.tweens.add({
      targets: this.barrel,
      scaleY: 0.86,
      duration: 45,
      yoyo: true,
    });
  }
}
