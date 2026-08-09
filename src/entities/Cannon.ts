import Phaser from 'phaser';
import { CANNON_Y, GAME_WIDTH } from '../data/balance';
import { AudioSystem } from '../systems/AudioSystem';
import type { SkillSystem } from '../systems/SkillSystem';
import type { Zombie } from './Zombie';

/**
 * 炮台：由玩家用鼠标/触摸控制方向，按射速自动开火；不自动索敌
 */
export class Cannon extends Phaser.GameObjects.Container {
  private barrel: Phaser.GameObjects.Image;
  private base: Phaser.GameObjects.Image;
  private fireCooldown = 0;
  private fireRateMultiplier = 1;
  private firingLocked = false;
  private aimAngle = -Math.PI / 2;
  private skills: SkillSystem;

  /** 开火回调 */
  onFire: (x: number, y: number, angle: number) => void = () => {};
  onVolley: (x: number, y: number, angle: number, shots: number) => void = () => {};

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
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, worldX, worldY);
  }

  setFireProfile(rateMultiplier: number, locked: boolean): void {
    this.fireRateMultiplier = Phaser.Math.Clamp(rateMultiplier, 0.2, 3);
    this.firingLocked = locked;
  }

  update(dt: number, zombies: Zombie[]): void {
    this.barrel.setRotation(this.aimAngle + Math.PI / 2);

    this.fireCooldown -= dt;
    if (!this.firingLocked && zombies.length > 0 && this.fireCooldown <= 0) {
      this.fireCooldown = 1 / (this.skills.fireRate * this.fireRateMultiplier);
      this.fireVolley(this.aimAngle);
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
      // 枪口闪光
      const flash = this.scene.add.image(mx, my, 'muzzle_flash').setDepth(11).setScale(1.2);
      this.scene.tweens.add({
        targets: flash, scale: 2.2, alpha: 0, duration: 90, ease: 'Cubic.Out',
        onComplete: () => flash.destroy(),
      });
    }
    const centerX = this.x + Math.cos(angle) * muzzleLen;
    const centerY = this.y + Math.sin(angle) * muzzleLen;
    this.onVolley(centerX, centerY, angle, count);
    // 后坐力
    this.scene.tweens.add({
      targets: this.barrel, scaleY: 0.86, duration: 45, yoyo: true,
    });
    // 射击音效（多管时音调略高）
    AudioSystem.play('shoot', { volume: Math.min(1, 0.7 + count * 0.1) });
  }
}
