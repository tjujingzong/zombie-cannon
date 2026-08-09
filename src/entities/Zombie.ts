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
  LEAPER_INTERVAL,
  BURROW_DURATION,
  SIPHON_HEAL_RATIO,
  RANGED_ZOMBIE_TYPES,
} from '../data/balance';
import { ELITE_AFFIXES, type EliteAffix } from '../data/combat';

const BOSS_ART_TEXTURE = 'art_zombie_boss_v1';
const ELITE_ART_TEXTURES: Record<EliteAffix, string> = {
  swift: 'art_elite_swift_v1',
  armored: 'art_elite_armored_v1',
  regenerating: 'art_elite_regenerating_v1',
  splitting: 'art_elite_splitting_v1',
};

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
  eliteAffix: EliteAffix | null = null;
  lastDamageTaken = 0;
  bossPhase = 1;

  // 各类行为计时器
  private attackTimer = 0;
  private summonTimer = 0;
  private spitTimer = 0;
  private healTimer = 0;
  private ghostTimer = 0;
  private isGhostVisible = true;
  private slowMultiplier = 1;
  private slowTimer = 0;
  private leapTimer = 0;
  private leapBurstTimer = 0;
  private burrowTimer = 0;
  private isBurrowed = false;
  private damageReduction = 0;
  private eliteDamageReduction = 0;
  private regenerationCooldown = 0;
  private knockbackTimer = 0;
  private usesGeneratedArt = false;
  private visualScale = 1;
  private hudScale = 1;

  private hpBar!: Phaser.GameObjects.Graphics;
  private shieldBar!: Phaser.GameObjects.Graphics;
  /** Boss 脚下光环（持续显示） */
  private bossAura?: Phaser.GameObjects.Image;
  /** Boss 头顶王冠 */
  private bossCrown?: Phaser.GameObjects.Image;
  /** 精英脚下的战术光环，和普通单位形成清晰层级。 */
  private eliteAura?: Phaser.GameObjects.Image;
  private eliteMark?: Phaser.GameObjects.Text;

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
  /** 掘地者破土回调 */
  onSurface?: (zombie: Zombie) => void;
  /** 首领半血狂暴阶段回调 */
  onBossPhase?: (zombie: Zombie, phase: number) => void;

  /** 死亡动画播放中 */
  dying = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'zombie_normal');
  }

  spawn(
    type: ZombieTypeKey,
    x: number,
    y: number,
    hpScale: number,
    speedScale: number,
    eliteAffix: EliteAffix | null = null,
  ): void {
    const stats = ZOMBIE_TYPES[type];
    this.zType = type;
    this.eliteAffix = eliteAffix;
    const hpMultiplier = eliteAffix === 'armored' ? 2.35
      : eliteAffix === 'regenerating' ? 1.65
        : eliteAffix === 'splitting' ? 1.4
          : eliteAffix === 'swift' ? 1.15 : 1;
    const speedMultiplier = eliteAffix === 'swift' ? 1.72
      : eliteAffix === 'armored' ? 0.78
        : eliteAffix === 'splitting' ? 1.08 : 1;
    this.maxHp = Math.round(stats.hp * hpScale * hpMultiplier);
    this.hp = this.maxHp;
    this.wallDamage = stats.damage;
    this.coinValue = Math.round(stats.coin * (eliteAffix === 'armored' || eliteAffix === 'regenerating' ? 3 : eliteAffix ? 2 : 1));
    this.baseSpeed = stats.speed * speedScale * speedMultiplier;
    this.shield = type === 'shield' ? SHIELD_MAX : 0;
    this.attackTimer = 0;
    this.summonTimer = 0;
    this.spitTimer = 0;
    this.healTimer = 0;
    this.ghostTimer = type === 'ghost' ? GHOST_VISIBLE_TIME : 0;
    this.isGhostVisible = type !== 'ghost';
    this.slowMultiplier = 1;
    this.slowTimer = 0;
    this.leapTimer = 0;
    this.leapBurstTimer = 0;
    this.burrowTimer = type === 'burrower' ? BURROW_DURATION : 0;
    this.isBurrowed = type === 'burrower';
    this.damageReduction = 0;
    this.eliteDamageReduction = eliteAffix === 'armored' ? 0.34 : 0;
    this.regenerationCooldown = 0;
    this.knockbackTimer = 0;
    this.lastDamageTaken = 0;
    this.bossPhase = 1;

    this.enableBody(true, x, y, true, true);
    const generatedTexture = type === 'boss'
      ? BOSS_ART_TEXTURE
      : eliteAffix ? ELITE_ART_TEXTURES[eliteAffix] : null;
    const visualTexture = generatedTexture && this.scene.textures.exists(generatedTexture)
      ? generatedTexture
      : stats.texture;
    this.usesGeneratedArt = visualTexture !== stats.texture;
    this.setTexture(visualTexture);
    this.visualScale = this.usesGeneratedArt ? (80 * stats.scale) / this.height : stats.scale;
    this.hudScale = stats.scale;
    this.setScale(this.visualScale, this.isBurrowed ? this.visualScale * 0.42 : this.visualScale);
    this.setRotation(0);
    this.clearTint();
    this.setAlpha(this.isBurrowed ? 0.42 : 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.7, this.height * 0.8);
    this.setVelocity(0, this.baseSpeed * (this.isBurrowed ? 2.15 : 1));
    this.setDepth(5);

    if (!this.hpBar) this.hpBar = this.scene.add.graphics();
    if (!this.shieldBar) this.shieldBar = this.scene.add.graphics();
    this.hpBar.setVisible(true).setDepth(6);
    this.shieldBar.setVisible(type === 'shield').setDepth(6);

    if (eliteAffix) {
      const affix = ELITE_AFFIXES[eliteAffix];
      if (!this.eliteAura) {
        this.eliteAura = this.scene.add.image(0, 0, 'boss_aura').setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
      }
      this.eliteAura
        .setVisible(true)
        .setPosition(this.x, this.y + this.displayHeight * 0.28)
        .setScale(0.5 * stats.scale)
        .setTint(affix.color)
        .setAlpha(0.34);
      if (!this.eliteMark) {
        this.eliteMark = this.scene.add.text(0, 0, '', {
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
          stroke: '#101820', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(8);
      }
      this.eliteMark.setText(affix.shortLabel).setColor(`#${affix.color.toString(16).padStart(6, '0')}`).setVisible(true);
      this.restoreVisualTint();
    } else {
      this.eliteAura?.setVisible(false);
      this.eliteMark?.setVisible(false);
    }

    // Boss 光环 + 王冠
    if (type === 'boss') {
      if (!this.bossAura) {
        this.bossAura = this.scene.add.image(this.x, this.y + 30, 'boss_aura').setDepth(4);
      }
      this.bossAura.setVisible(true).setPosition(this.x, this.y + this.displayHeight * 0.3).setScale(1.25);
      this.scene.tweens.add({
        targets: this.bossAura, alpha: 0.4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
      if (!this.usesGeneratedArt) {
        if (!this.bossCrown) {
          this.bossCrown = this.scene.add.image(this.x, this.y - 50, 'boss_crown').setDepth(7);
        }
        this.bossCrown.setVisible(true).setPosition(this.x, this.y - this.displayHeight * 0.5);
      } else {
        this.bossCrown?.setVisible(false);
      }
    } else {
      this.bossAura?.setVisible(false);
      this.bossCrown?.setVisible(false);
    }

    this.drawHpBar();
  }

  private drawHpBar(): void {
    if (this.isBurrowed) { this.hpBar.clear(); return; }
    const w = 56 * this.hudScale;
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
    const w = 56 * this.hudScale;
    const ratio = Phaser.Math.Clamp(this.shield / SHIELD_MAX, 0, 1);
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight / 2 - 12;
    this.shieldBar.clear();
    this.shieldBar.fillStyle(0x000000, 0.55).fillRect(x, y, w, 5);
    this.shieldBar.fillStyle(0x42a5f5, 1).fillRect(x + 1, y + 1, (w - 2) * ratio, 3);
  }

  /** 返回 true 表示死亡 */
  takeDamage(dmg: number): boolean {
    this.lastDamageTaken = 0;
    if (this.hp <= 0 || !this.isGhostVisible || this.isBurrowed || this.dying) return false;
    dmg *= 1 - Phaser.Math.Clamp(this.damageReduction + this.eliteDamageReduction, 0, 0.78);
    this.lastDamageTaken = Math.min(this.hp + this.shield, Math.max(0, dmg));
    if (this.eliteAffix === 'regenerating') this.regenerationCooldown = 3;

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
    if (this.zType === 'boss' && this.bossPhase === 1 && this.hp > 0 && this.hp / this.maxHp <= 0.5) {
      this.bossPhase = 2;
      this.baseSpeed *= 1.62;
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y > 0) body.setVelocityY(this.baseSpeed * this.slowMultiplier);
      this.onBossPhase?.(this, 2);
    }
    this.flashHit();
    this.drawHpBar();
    return this.hp <= 0;
  }

  applySlow(multiplier: number, duration: number): void {
    if (!this.active || this.hp <= 0) return;
    const next = Phaser.Math.Clamp(multiplier, 0.35, 1);
    const previous = this.slowMultiplier;
    this.slowMultiplier = Math.min(this.slowMultiplier, next);
    this.slowTimer = Math.max(this.slowTimer, duration);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y > 0 && previous > 0) {
      body.setVelocityY(body.velocity.y * (this.slowMultiplier / previous));
    }
    this.setTint(0x9be7ff);
  }

  applyKnockback(distance: number): void {
    if (!this.active || this.hp <= 0 || this.dying || this.isBurrowed) return;
    this.y = Math.max(this.displayHeight / 2 + 12, this.y - Math.max(0, distance));
    this.attackTimer = 0;
    this.knockbackTimer = 0.14;
    this.setVelocity(0, -Math.max(150, this.baseSpeed * 2.4));
  }

  setDamageReduction(value: number): void {
    this.damageReduction = Phaser.Math.Clamp(value, 0, 0.75);
  }

  get burrowed(): boolean {
    return this.isBurrowed;
  }

  forceSurface(): void {
    if (this.active && this.isBurrowed) this.surfaceFromBurrow();
  }

  private surfaceFromBurrow(): void {
    this.isBurrowed = false;
    this.burrowTimer = 0;
    this.setScale(this.visualScale).setAlpha(1);
    this.setVelocity(0, this.baseSpeed * this.slowMultiplier);
    this.drawHpBar();
    this.onSurface?.(this);
  }

  private flashHit(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) {
        this.restoreVisualTint();
      }
    });
  }

  private restoreVisualTint(): void {
    if (this.slowTimer > 0) {
      this.setTint(0x9be7ff);
    } else if (this.eliteAffix && !this.usesGeneratedArt) {
      this.setTint(ELITE_AFFIXES[this.eliteAffix].color);
    } else {
      this.clearTint();
    }
  }

  recycle(): void {
    this.hp = 0;
    this.shield = 0;
    this.dying = false;
    this.isBurrowed = false;
    this.damageReduction = 0;
    this.eliteDamageReduction = 0;
    this.eliteAffix = null;
    this.regenerationCooldown = 0;
    this.knockbackTimer = 0;
    this.lastDamageTaken = 0;
    this.bossPhase = 1;
    this.usesGeneratedArt = false;
    this.visualScale = 1;
    this.hudScale = 1;
    if (this.hpBar) this.hpBar.clear().setVisible(false);
    if (this.shieldBar) this.shieldBar.clear().setVisible(false);
    this.bossAura?.setVisible(false);
    this.bossCrown?.setVisible(false);
    this.eliteAura?.setVisible(false);
    this.eliteMark?.setVisible(false);
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

    if (!this.isBurrowed && this.zType !== 'leaper' && bottom < WALL_Y) {
      const sway = this.zType === 'boss' ? 0.025 : 0.045;
      this.setRotation(Math.sin(time * 0.006 + this.x * 0.025) * sway);
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      if (this.knockbackTimer <= 0) this.setVelocity(0, this.baseSpeed * this.slowMultiplier);
      this.drawHpBar();
      if (this.shield > 0) this.drawShieldBar();
      return;
    }

    if (this.eliteAffix === 'regenerating' && this.hp > 0 && this.hp < this.maxHp) {
      this.regenerationCooldown -= dt;
      if (this.regenerationCooldown <= 0) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.035 * dt);
      }
    }

    if (this.isBurrowed && this.hp > 0) {
      this.burrowTimer -= dt;
      this.setVelocity(0, this.baseSpeed * 2.15 * this.slowMultiplier);
      this.setRotation(Math.sin(time * 0.014) * 0.05);
      if (this.burrowTimer <= 0 || WALL_Y - bottom < 270) this.surfaceFromBurrow();
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1;
        this.restoreVisualTint();
        if (bottom < WALL_Y && body.velocity.y > 0 && !RANGED_ZOMBIE_TYPES.has(this.zType)) {
          this.setVelocity(0, this.baseSpeed);
        }
      }
    }

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
      this.setVelocity(0, this.baseSpeed * speedMult * this.slowMultiplier);
    }

    // ── 跃袭者周期冲刺 ──
    if (this.zType === 'leaper' && this.hp > 0 && bottom < WALL_Y) {
      if (this.leapBurstTimer > 0) {
        this.leapBurstTimer -= dt;
        this.setVelocity(0, this.baseSpeed * 3.2 * this.slowMultiplier);
        this.setRotation(Math.sin(time * 0.025) * 0.08);
      } else {
        this.setRotation(0);
        this.leapTimer += dt;
        this.setVelocity(0, this.baseSpeed * this.slowMultiplier);
        if (this.leapTimer >= LEAPER_INTERVAL) {
          this.leapTimer = 0;
          this.leapBurstTimer = 0.48;
        }
      }
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
        this.setVelocity(0, this.baseSpeed * this.slowMultiplier);
      }
    }

    // ── 触墙攻击（非远程类型） ──
    if (!this.isBurrowed && !RANGED_ZOMBIE_TYPES.has(this.zType) && bottom >= WALL_Y) {
      if (body.velocity.y !== 0) {
        this.setVelocity(0, 0);
        this.setRotation(0);
        this.y = WALL_Y - this.displayHeight / 2;
      }
      this.attackTimer += dt;
      if (this.attackTimer >= ZOMBIE_ATTACK_INTERVAL) {
        this.attackTimer = 0;
        this.onAttackWall(this.wallDamage);
        if (this.zType === 'siphon') {
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * SIPHON_HEAL_RATIO);
          this.drawHpBar();
          this.onHeal?.(this);
        }
        this.scene.tweens.add({ targets: this, y: this.y + 10, duration: 90, yoyo: true });
      }
    }

    // ── Boss 召唤 ──
    if (this.zType === 'boss' && this.hp > 0) {
      this.summonTimer += dt;
      const summonInterval = BOSS_SUMMON_INTERVAL * (this.bossPhase === 2 ? 0.48 : 1);
      if (this.summonTimer >= summonInterval) {
        this.summonTimer = 0;
        this.onSummon(this.x, this.y + this.displayHeight / 2 + 20, this.bossPhase === 2 ? 'fast' : undefined);
      }
      if (this.bossPhase === 2) {
        this.spitTimer += dt;
        if (this.spitTimer >= 2.4) {
          this.spitTimer = 0;
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.x, WALL_Y);
          this.onSpit(this.x, this.y, angle, this.wallDamage * 0.55);
        }
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

    // Boss 光环/王冠跟随移动
    if (this.bossAura && this.bossAura.visible) {
      this.bossAura.setPosition(this.x, this.y + this.displayHeight * 0.3).setRotation(-this.rotation * 0.35);
    }
    if (this.bossCrown && this.bossCrown.visible) {
      this.bossCrown.setPosition(this.x, this.y - this.displayHeight * 0.5).setRotation(this.rotation * 0.6);
    }
    if (this.eliteAura?.visible) {
      this.eliteAura.setPosition(this.x, this.y + this.displayHeight * 0.28).setRotation(time * 0.00035);
      this.eliteAura.setAlpha(0.26 + Math.sin(time * 0.005 + this.x) * 0.09);
    }
    if (this.eliteMark?.visible) {
      this.eliteMark.setPosition(this.x, this.y - this.displayHeight / 2 - 24);
    }
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
