import Phaser from 'phaser';
import { BULLET_SPEED, GAME_HEIGHT, GAME_WIDTH } from '../data/balance';

/**
 * 子弹（对象池成员）：直线飞行，支持穿透和弹射
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  pierceLeft = 0;
  ricochetLeft = 0;
  isCrit = false;
  acidMode = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
  }

  fire(x: number, y: number, angle: number, damage: number, pierce: number, isCrit: boolean): void {
    this.enableBody(true, x, y, true, true);
    this.damage = damage;
    this.pierceLeft = pierce;
    this.ricochetLeft = this.acidMode ? 0 : 1;
    this.isCrit = isCrit;
    this.setRotation(angle + Math.PI / 2);
    this.setTint(isCrit ? 0xffd54a : 0xffffff);
    this.setScale(isCrit ? 1.35 : 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.6, this.height * 0.6);
    this.scene.physics.velocityFromRotation(angle, BULLET_SPEED, body.velocity);
  }

  onHit(): boolean {
    this.pierceLeft--;
    return this.pierceLeft < 0;
  }

  recycle(): void {
    this.acidMode = false;
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.y < -60 || this.y > GAME_HEIGHT + 60 || this.x < -60 || this.x > GAME_WIDTH + 60) {
      this.recycle();
    }
  }
}
