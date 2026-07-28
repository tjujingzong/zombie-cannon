import Phaser from 'phaser';
import {
  BOSS_SUMMON_INTERVAL,
  WALL_Y,
  ZOMBIE_ATTACK_INTERVAL,
  ZOMBIE_TYPES,
  ZombieTypeKey,
} from '../data/balance';

/**
 * 僵尸（对象池成员）：向下推进，触墙后周期性攻击；boss 会周期召唤小怪。
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  zType: ZombieTypeKey = 'normal';
  hp = 1;
  maxHp = 1;
  wallDamage = 0;
  coinValue = 0;
  private attackTimer = 0;
  private summonTimer = 0;
  private hpBar!: Phaser.GameObjects.Graphics;
  /** 触墙攻击回调（由 GameScene 注入） */
  onAttackWall: (dmg: number) => void = () => {};
  /** boss 召唤回调 */
  onSummon: (x: number, y: number) => void = () => {};

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'zombie_normal');
  }

  spawn(type: ZombieTypeKey, x: number, y: number, hpScale: number, speedScale: number): void {
    const stats = ZOMBIE_TYPES[type];
    this.zType = type;
    this.maxHp = Math.round(stats.hp * hpScale);
    this.hp = this.maxHp;
    this.wallDamage = stats.damage;
    this.coinValue = stats.coin;
    this.attackTimer = 0;
    this.summonTimer = 0;

    this.enableBody(true, x, y, true, true);
    this.setTexture(stats.texture);
    this.setScale(stats.scale);
    this.clearTint();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.7, this.height * 0.8);
    this.setVelocity(0, stats.speed * speedScale);
    this.setDepth(5);

    if (!this.hpBar) {
      this.hpBar = this.scene.add.graphics();
    }
    this.hpBar.setVisible(true).setDepth(6);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    const w = 56 * this.scaleX;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.clear();
    if (ratio >= 1 || this.hp <= 0) return;
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight / 2 - 12;
    this.hpBar.fillStyle(0x000000, 0.55).fillRect(x, y, w, 7);
    const color = ratio > 0.5 ? 0x6ecb3c : ratio > 0.25 ? 0xf5a623 : 0xe74c3c;
    this.hpBar.fillStyle(color, 1).fillRect(x + 1, y + 1, (w - 2) * ratio, 5);
  }

  /** 返回 true 表示死亡 */
  takeDamage(dmg: number): boolean {
    if (this.hp <= 0) return false;
    this.hp -= dmg;
    // 受击闪白
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    this.drawHpBar();
    return this.hp <= 0;
  }

  recycle(): void {
    this.hp = 0;
    if (this.hpBar) this.hpBar.clear().setVisible(false);
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = delta / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 触墙：停止移动并周期攻击
    const bottom = this.y + this.displayHeight / 2;
    if (bottom >= WALL_Y) {
      if (body.velocity.y !== 0) {
        this.setVelocity(0, 0);
        this.y = WALL_Y - this.displayHeight / 2;
      }
      this.attackTimer += dt;
      if (this.attackTimer >= ZOMBIE_ATTACK_INTERVAL) {
        this.attackTimer = 0;
        this.onAttackWall(this.wallDamage);
        // 攻击顿挫动画
        this.scene.tweens.add({ targets: this, y: this.y + 10, duration: 90, yoyo: true });
      }
    }

    // boss 召唤
    if (this.zType === 'boss' && this.hp > 0) {
      this.summonTimer += dt;
      if (this.summonTimer >= BOSS_SUMMON_INTERVAL) {
        this.summonTimer = 0;
        this.onSummon(this.x, this.y + this.displayHeight / 2 + 20);
      }
    }

    this.drawHpBar();
  }
}
