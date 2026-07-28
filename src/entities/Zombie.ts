import Phaser from 'phaser';
import {
  BOSS_SUMMON_INTERVAL,
  WALL_Y,
  ZOMBIE_ATTACK_INTERVAL,
  ZOMBIE_TYPES,
  type ZombieTypeKey,
  SPITTER_ATTACK_INTERVAL,
  SPITTER_RANGE,
  HEALER_HEAL_INTERVAL,
  HEALER_HEAL_AMOUNT,
  HEALER_HEAL_RANGE,
  SHIELD_MAX,
  GHOST_PHASE_INTERVAL,
  GHOST_VISIBLE_TIME,
  SUMMONER_INTERVAL,
  RANGED_ZOMBIE_TYPES,
} from '../data/balance';

/**
 * 僵尸（对象池成员）：支持 11 种类型，每种有独特行为
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  zType: ZombieTypeKey = 'normal';
  hp = 1;
  maxHp = 1;
  shield = 0; // 护盾僵尸的能量盾
  wallDamage = 0;
  coinValue = 0;
  baseSpeed = 0;

  // 各类行为计时器
  private attackTimer = 0;
  private summonTimer = 0;
  private spitTimer = 0;
  private healTimer = 0;
  private ghostTimer = 0;
  private isGhostVisible = true;

  private hpBar!: Phaser.GameObjects.Graphics;
  private shieldBar!: Phaser.GameObjects.Graphics;

  /** 触墙攻击回调 */
  onAttackWall: (dmg: number) => void = () => {};
  /** boss/召唤者 召唤回调 */
  onSummon: (x: number, y: number, type?: ZombieTypeKey) => void = () => {};
  /** 喷射者射击回调 */
  onSpit: (x: number, y: number, angle: number, damage: number) => void = () => {};
  /** 治愈者治疗回调 */
  onHeal?: (zombie: Zombie) => void;
  /** 死亡爆炸回调 */
  onExplode?: (x: number, y: number) => void;

  /** 死亡动画播放中 */
  dying = false;

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
    this.baseSpeed = stats.speed * speedScale;
    this.shield = type === 'shield' ? SHIELD_MAX : 0;
    this.attackTimer = 0;
    this.summonTimer = 0;
    this.spitTimer = 0;
    this.healTimer = 0;
    this.ghostTimer = type === 'ghost' ? GHOST_VISIBLE_TIME : 0;
    this.isGhostVisible = type !== 'ghost';

    this.enableBody(true, x, y, true, true);
    this.setTexture(stats.texture);
    this.setScale(stats.scale);
    this.clearTint();
    this.setAlpha(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.7, this.height * 0.8);
    this.setVelocity(0, this.baseSpeed);
    this.setDepth(5);

    if (!this.hpBar) this.hpBar = this.scene.add.graphics();
    if (!this.shieldBar) this.shieldBar = this.scene.add.graphics();
    this.hpBar.setVisible(true).setDepth(6);
    this.shieldBar.setVisible(type === 'shield').setDepth(6);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    const w = 56 * this.scaleX;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.clear();
    if (ratio >= 1 || this.hp <= 0) return;
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight / 2 - (this.shield > 0 ? 18 : 12);
    this.hpBar.fillStyle(0x000000, 0.55).fillRect(x, y, w, 7);
    const color = ratio > 0.5 ? 0x6ecb3c : ratio > 0.25 ? 0xf5a623 : 0xe74c3c;
    this.hpBar.fillStyle(color, 1).fillRect(x + 1, y + 1, (w - 2) * ratio, 5);
  }

  private drawShieldBar(): void {
    if (this.shield <= 0) { this.shieldBar.clear(); return; }
    const w = 56 * this.scaleX;
    const ratio = Phaser.Math.Clamp(this.shield / SHIELD_MAX, 0, 1);
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight / 2 - 12;
    this.shieldBar.clear();
    this.shieldBar.fillStyle(0x000000, 0.55).fillRect(x, y, w, 5);
    this.shieldBar.fillStyle(0x42a5f5, 1).fillRect(x + 1, y + 1, (w - 2) * ratio, 3);
  }

  /** 返回 true 表示死亡 */
  takeDamage(dmg: number): boolean {
    if (this.hp <= 0 || !this.isGhostVisible || this.dying) return false;

    // 护盾优先吸收
    if (this.shield > 0) {
      if (dmg <= this.shield) {
        this.shield -= dmg;
        this.drawShieldBar();
        this.flashHit();
        return false;
      }
      dmg -= this.shield;
      this.shield = 0;
      this.shieldBar.clear();
    }

    this.hp -= dmg;
    this.flashHit();
    this.drawHpBar();
    return this.hp <= 0;
  }

  private flashHit(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
  }

  recycle(): void {
    this.hp = 0;
    this.shield = 0;
    this.dying = false;
    if (this.hpBar) this.hpBar.clear().setVisible(false);
    if (this.shieldBar) this.shieldBar.clear().setVisible(false);
    this.disableBody(true, true);
  }

  /** 死亡动画：闪烁 → 膨胀 → 缩小消失 */
  die(onComplete?: () => void): void {
    if (this.dying) { onComplete?.(); return; }
    this.dying = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // 动画序列
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.3,
      scaleY: this.scaleY * 1.3,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        if (!this.active) { onComplete?.(); return; }
        // 闪白
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
          if (!this.active) { onComplete?.(); return; }
          this.clearTint();
          // 缩小消失
          this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Back.In',
            onComplete: () => onComplete?.(),
          });
        });
      },
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dying) return; // 死亡动画中跳过行为逻辑
    const dt = delta / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bottom = this.y + this.displayHeight / 2;

    // ── 幽灵隐身 ──
    if (this.zType === 'ghost' && this.hp > 0) {
      this.ghostTimer -= dt;
      if (this.isGhostVisible && this.ghostTimer <= 0) {
        this.isGhostVisible = false;
        this.ghostTimer = GHOST_PHASE_INTERVAL - GHOST_VISIBLE_TIME;
        this.setAlpha(0.2);
      } else if (!this.isGhostVisible && this.ghostTimer <= 0) {
        this.isGhostVisible = true;
        this.ghostTimer = GHOST_VISIBLE_TIME;
        this.setAlpha(1);
      }
    }

    // ── 狂暴者加速 ──
    if (this.zType === 'berserker' && this.hp > 0 && bottom < WALL_Y) {
      const hpRatio = this.hp / this.maxHp;
      const speedMult = 1 + (1 - hpRatio) * 1.8; // 血量越低越快，最高2.8倍
      this.setVelocity(0, this.baseSpeed * speedMult);
    }

    // ── 远程攻击（喷射者） ──
    if (RANGED_ZOMBIE_TYPES.has(this.zType) && this.hp > 0) {
      const wallDist = WALL_Y - bottom;
      if (wallDist > 0 && wallDist < SPITTER_RANGE) {
        // 在射程内，停下并射击
        if (body.velocity.y !== 0) {
          this.setVelocity(0, 0);
        }
        this.spitTimer += dt;
        if (this.spitTimer >= SPITTER_ATTACK_INTERVAL) {
          this.spitTimer = 0;
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.x, WALL_Y);
          this.onSpit(this.x, this.y - this.displayHeight / 2, angle, this.wallDamage);
        }
      } else if (bottom < WALL_Y && body.velocity.y === 0) {
        this.setVelocity(0, this.baseSpeed);
      }
    }

    // ── 触墙攻击（非远程类型） ──
    if (!RANGED_ZOMBIE_TYPES.has(this.zType) && bottom >= WALL_Y) {
      if (body.velocity.y !== 0) {
        this.setVelocity(0, 0);
        this.y = WALL_Y - this.displayHeight / 2;
      }
      this.attackTimer += dt;
      if (this.attackTimer >= ZOMBIE_ATTACK_INTERVAL) {
        this.attackTimer = 0;
        this.onAttackWall(this.wallDamage);
        this.scene.tweens.add({ targets: this, y: this.y + 10, duration: 90, yoyo: true });
      }
    }

    // ── Boss 召唤 ──
    if (this.zType === 'boss' && this.hp > 0) {
      this.summonTimer += dt;
      if (this.summonTimer >= BOSS_SUMMON_INTERVAL) {
        this.summonTimer = 0;
        this.onSummon(this.x, this.y + this.displayHeight / 2 + 20);
      }
    }

    // ── 召唤者 ──
    if (this.zType === 'summoner' && this.hp > 0) {
      this.summonTimer += dt;
      if (this.summonTimer >= SUMMONER_INTERVAL) {
        this.summonTimer = 0;
        this.onSummon(
          this.x + Phaser.Math.Between(-60, 60),
          this.y + this.displayHeight / 2 + 10,
          'fast',
        );
      }
    }

    // ── 治愈者 ──
    if (this.zType === 'healer' && this.hp > 0 && this.onHeal) {
      this.healTimer += dt;
      if (this.healTimer >= HEALER_HEAL_INTERVAL) {
        this.healTimer = 0;
        this.onHeal(this);
      }
    }

    this.drawHpBar();
    if (this.shield > 0) this.drawShieldBar();
  }

  /** 治愈者治疗附近僵尸（由 GameScene 调用） */
  healNearby(allZombies: Zombie[]): void {
    for (const z of allZombies) {
      if (z === this || !z.active || z.hp <= 0 || z.hp >= z.maxHp) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, z.x, z.y);
      if (dist < HEALER_HEAL_RANGE) {
        z.hp = Math.min(z.maxHp, z.hp + HEALER_HEAL_AMOUNT);
      }
    }
  }
}
