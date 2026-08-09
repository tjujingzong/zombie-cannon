import Phaser from 'phaser';
import { BULLET_SPEED, GAME_HEIGHT, GAME_WIDTH } from '../data/balance';
import type { DamageSourceKey } from '../data/combat';

export interface BulletProfile {
  damageSource?: DamageSourceKey;
  cryoBurst?: boolean;
  shrapnelOnKill?: boolean;
  volatileCore?: boolean;
  knockback?: number;
  fragment?: boolean;
  tint?: number;
  scale?: number;
}

/**
 * 子弹（对象池成员）：直线飞行，支持穿透和弹射；带拖尾
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  pierceLeft = 0;
  ricochetLeft = 0;
  isCrit = false;
  hitCount = 0;
  acidMode = false;
  damageSource: DamageSourceKey = 'bullet';
  cryoBurst = false;
  cryoTriggered = false;
  shrapnelOnKill = false;
  volatileCore = false;
  volatileTriggered = false;
  knockback = 0;
  fragment = false;
  private trailTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
  }

  fire(
    x: number,
    y: number,
    angle: number,
    damage: number,
    pierce: number,
    isCrit: boolean,
    ricochet = 0,
    profile: BulletProfile = {},
  ): void {
    this.enableBody(true, x, y, true, true);
    this.damage = damage;
    this.pierceLeft = pierce;
    this.ricochetLeft = this.acidMode ? 0 : ricochet;
    this.isCrit = isCrit;
    this.hitCount = 0;
    this.damageSource = profile.damageSource ?? 'bullet';
    this.cryoBurst = profile.cryoBurst ?? false;
    this.cryoTriggered = false;
    this.shrapnelOnKill = profile.shrapnelOnKill ?? false;
    this.volatileCore = profile.volatileCore ?? false;
    this.volatileTriggered = false;
    this.knockback = profile.knockback ?? 0;
    this.fragment = profile.fragment ?? false;
    this.setRotation(angle + Math.PI / 2);
    this.setTint(profile.tint ?? (isCrit ? 0xffd54a : 0xffffff));
    this.setScale((isCrit ? 1.35 : 1) * (profile.scale ?? 1));
    this.trailTimer = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.6, this.height * 0.6);
    this.scene.physics.velocityFromRotation(angle, BULLET_SPEED, body.velocity);
  }

  onHit(): boolean {
    this.hitCount++;
    this.pierceLeft--;
    return this.pierceLeft < 0;
  }

  /** 改变弹射方向但保留本次子弹的连锁命中计数 */
  redirect(angle: number): void {
    this.setRotation(angle + Math.PI / 2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.scene.physics.velocityFromRotation(angle, BULLET_SPEED, body.velocity);
  }

  recycle(): void {
    this.acidMode = false;
    this.damageSource = 'bullet';
    this.cryoBurst = false;
    this.cryoTriggered = false;
    this.shrapnelOnKill = false;
    this.volatileCore = false;
    this.volatileTriggered = false;
    this.knockback = 0;
    this.fragment = false;
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.y < -60 || this.y > GAME_HEIGHT + 60 || this.x < -60 || this.x > GAME_WIDTH + 60) {
      this.recycle();
      return;
    }
    // 拖尾粒子（每 ~50ms 一个，暴击子弹更密）
    this.trailTimer -= delta;
    if (this.trailTimer <= 0 && this.scene && this.active) {
      this.trailTimer = this.isCrit ? 25 : 50;
      const trail = this.scene.add.image(this.x, this.y, 'bullet_trail').setDepth(9).setScale(0.6).setAlpha(0.6);
      this.scene.tweens.add({
        targets: trail, alpha: 0, scale: 0.2, duration: 200, ease: 'Cubic.Out',
        onComplete: () => trail.destroy(),
      });
    }
  }
}
