import Phaser from 'phaser';
import { CANNON_RANGE, CANNON_Y, GAME_WIDTH } from '../data/balance';
import type { SkillSystem } from '../systems/SkillSystem';
import type { Zombie } from './Zombie';

/**
 * 炮台：自动索敌最近僵尸开火；玩家按住屏幕时优先朝指针方向射击
 */
export class Cannon extends Phaser.GameObjects.Container {
  private barrel: Phaser.GameObjects.Image;
  private base: Phaser.GameObjects.Image;
  private fireCooldown = 0;
  private manualAngle: number | null = null;
  private skills: SkillSystem;

  /** 开火回调 */
  onFire: (x: number, y: number, angle: number) => void = () => {};

  constructor(scene: Phaser.Scene, skills: SkillSystem) {
    super(scene, GAME_WIDTH / 2, CANNON_Y);
    this.skills = skills;

    this.base = scene.add.image(0, 22, 'cannon_base');
    this.barrel = scene.add.image(0, 0, 'cannon_barrel').setOrigin(0.5, 0.78);
    this.add([this.base, this.barrel]);
    this.setDepth(10);
    scene.add.existing(this);
  }

  setManualAim(worldX: number, worldY: number): void {
    if (worldY > this.y - 30) worldY = this.y - 30;
    this.manualAngle = Phaser.Math.Angle.Between(this.x, this.y, worldX, worldY);
  }

  clearManualAim(): void {
    this.manualAngle = null;
  }

  update(dt: number, zombies: Zombie[]): void {
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

    this.barrel.setRotation(targetAngle + Math.PI / 2);

    this.fireCooldown -= dt;
    if (hasTarget && this.fireCooldown <= 0) {
      this.fireCooldown = 1 / this.skills.fireRate;
      this.fireVolley(targetAngle);
    }
  }

  private fireVolley(angle: number): void {
    const count = this.skills.bulletCount;
    const spread = 0.14;
    const start = angle - ((count - 1) * spread) / 2;
    const muzzleLen = this.barrel.displayHeight * 0.78;
    for (let i = 0; i < count; i++) {
      const a = start + i * spread;
      const mx = this.x + Math.cos(a) * muzzleLen;
      const my = this.y + Math.sin(a) * muzzleLen;
      this.onFire(mx, my, a);
    }
    this.scene.tweens.add({
      targets: this.barrel, scaleY: 0.86, duration: 45, yoyo: true,
    });
  }
}
