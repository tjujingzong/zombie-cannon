import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  RUN_UPGRADES,
  RunUpgradeKey,
  WALL_Y,
  ZombieTypeKey,
  levelClearReward,
  starsForWallRatio,
} from '../data/balance';
import { LEVELS, LevelConfig, getLevel } from '../data/levels';
import { Bullet } from '../entities/Bullet';
import { Cannon } from '../entities/Cannon';
import { Coin } from '../entities/Coin';
import { Zombie } from '../entities/Zombie';
import { MetaUpgrades } from '../systems/MetaUpgrades';
import { SaveManager } from '../systems/SaveManager';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { WaveManager } from '../systems/WaveManager';
import { FONT, createOverlay, textStyle } from '../ui/helpers';

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig;
  private waveManager!: WaveManager;
  private upgrades!: UpgradeSystem;
  private cannon!: Cannon;
  private bullets!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.GameObjects.Group;

  // 供 UIScene 读取的公开状态
  runCoins = 0;
  wallHp = 0;
  wallMaxHp = 0;
  levelName = '';
  waveLabel = '';

  private choosingUpgrade = false;
  private finished = false;

  constructor() {
    super('Game');
  }

  init(data: { levelId?: number }): void {
    this.level = getLevel(data.levelId ?? 1);
    this.runCoins = 0;
    this.choosingUpgrade = false;
    this.finished = false;
  }

  create(): void {
    this.levelName = this.level.name;
    this.wallMaxHp = MetaUpgrades.wallMaxHp();
    this.wallHp = this.wallMaxHp;

    this.createBackground();

    // 系统
    this.upgrades = new UpgradeSystem();
    this.upgrades.onRepair = () => {
      this.wallHp = Math.min(this.wallMaxHp, this.wallHp + Math.round(this.wallMaxHp * 0.3));
    };

    this.waveManager = new WaveManager(this.level);
    this.waveManager.onSpawn = (type) => this.spawnZombie(type);

    // 对象池
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 300 });
    this.zombies = this.physics.add.group({ classType: Zombie, maxSize: 120 });
    this.coins = this.add.group({ classType: Coin, maxSize: 80 });

    // 炮台
    this.cannon = new Cannon(this, this.upgrades);
    this.cannon.onFire = (x, y, angle) => this.fireBullet(x, y, angle);

    // 碰撞
    this.physics.add.overlap(this.bullets, this.zombies, (bObj, zObj) => {
      this.onBulletHit(bObj as Bullet, zObj as Zombie);
    });

    // 手动瞄准
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.cannon.setManualAim(p.worldX, p.worldY));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.cannon.setManualAim(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => this.cannon.clearManualAim());

    // HUD
    this.scene.launch('UI');

    // 第一波
    this.time.delayedCall(800, () => this.beginWave());
  }

  private createBackground(): void {
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x18222b, 0x18222b, 0x243b2c, 0x243b2c, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 路面纹理：随机碎石点
    bg.fillStyle(0xffffff, 0.03);
    for (let i = 0; i < 90; i++) {
      bg.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, WALL_Y), Phaser.Math.Between(2, 6));
    }
    // 基地墙
    this.add.tileSprite(GAME_WIDTH / 2, WALL_Y + 24, GAME_WIDTH, 48, 'wall_tile').setDepth(9);
    // 墙后地面
    bg.fillStyle(0x11181f, 1).fillRect(0, WALL_Y + 48, GAME_WIDTH, GAME_HEIGHT - WALL_Y - 48);
  }

  private beginWave(): void {
    if (this.finished) return;
    const started = this.waveManager.startNextWave();
    if (!started) return;
    this.waveLabel = `${this.waveManager.currentWave}/${this.waveManager.totalWaves}`;

    // 波次横幅
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, `第 ${this.waveManager.currentWave} 波`, {
        fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#ffd54a',
        stroke: '#1a2530', strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 700,
      onComplete: () => banner.destroy(),
    });
  }

  private spawnZombie(type: ZombieTypeKey, x?: number, y?: number): void {
    const z = this.zombies.get() as Zombie | null;
    if (!z) return;
    const sx = x ?? Phaser.Math.Between(70, GAME_WIDTH - 70);
    const sy = y ?? -80;
    z.spawn(type, sx, sy, this.level.hpScale, this.level.speedScale);
    z.onAttackWall = (dmg) => this.damageWall(dmg);
    z.onSummon = (bx, by) => this.spawnZombie('normal', Phaser.Math.Clamp(bx + Phaser.Math.Between(-80, 80), 60, GAME_WIDTH - 60), by);
  }

  private fireBullet(x: number, y: number, angle: number): void {
    const b = this.bullets.get() as Bullet | null;
    if (!b) return;
    const isCrit = Math.random() < this.upgrades.critChance;
    const dmg = this.upgrades.damage * (isCrit ? 2 : 1);
    b.fire(x, y, angle, dmg, this.upgrades.pierce, isCrit);
  }

  private onBulletHit(bullet: Bullet, zombie: Zombie): void {
    if (!bullet.active || !zombie.active || zombie.hp <= 0) return;

    const died = zombie.takeDamage(bullet.damage);
    this.showDamageText(zombie.x, zombie.y - 30, Math.round(bullet.damage), bullet.isCrit);
    if (bullet.onHit()) bullet.recycle();

    if (died) this.killZombie(zombie);
  }

  private showDamageText(x: number, y: number, dmg: number, crit: boolean): void {
    const t = this.add
      .text(x, y, `${dmg}`, {
        fontFamily: FONT,
        fontSize: crit ? '34px' : '24px',
        fontStyle: 'bold',
        color: crit ? '#ffd54a' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(15);
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  private killZombie(zombie: Zombie): void {
    // 血雾粒子
    this.add.particles(zombie.x, zombie.y, 'blood', {
      speed: { min: 60, max: 180 },
      lifespan: 380,
      scale: { start: 1, end: 0 },
      quantity: 10,
      emitting: false,
    }).explode(10);

    // 掉金币
    const value = Math.max(1, Math.round(zombie.coinValue * MetaUpgrades.coinMultiplier()));
    const c = this.coins.get() as Coin | null;
    if (c) {
      c.drop(zombie.x, zombie.y, value, (v) => {
        this.runCoins += v;
      });
    } else {
      this.runCoins += value;
    }

    zombie.recycle();
  }

  private damageWall(dmg: number): void {
    if (this.finished) return;
    this.wallHp = Math.max(0, this.wallHp - dmg);
    this.cameras.main.shake(120, 0.004);
    if (this.wallHp <= 0) {
      this.endLevel(false);
    }
  }

  private aliveZombies(): Zombie[] {
    return (this.zombies.getChildren() as Zombie[]).filter((z) => z.active && z.hp > 0);
  }

  update(_time: number, delta: number): void {
    if (this.finished || this.choosingUpgrade) return;
    const dt = delta / 1000;

    const alive = this.aliveZombies();
    this.cannon.update(dt, alive);
    this.waveManager.update(dt, alive.length);

    // 一波清空
    if (this.waveManager.state === 'idle' && this.waveManager.currentWave > 0 && alive.length === 0) {
      if (this.waveManager.isLastWave) {
        this.endLevel(true);
      } else {
        this.showUpgradeChoices();
      }
    }
  }

  // ---------- 三选一升级 ----------

  private showUpgradeChoices(): void {
    this.choosingUpgrade = true;
    this.physics.pause();

    const choices = this.upgrades.rollChoices(3);
    if (choices.length === 0) {
      // 全满级：直接下一波
      this.resumeAfterChoice();
      return;
    }

    const overlay = createOverlay(this, 0.6).setDepth(30);
    const title = this.add
      .text(GAME_WIDTH / 2, 300, '选择一项强化', {
        fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#1a2530', strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(31);

    const cards: Phaser.GameObjects.Container[] = [];
    const cardW = 200;
    const gap = 24;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;

    choices.forEach((key, i) => {
      const card = this.createUpgradeCard(startX + i * (cardW + gap), 560, key, () => {
        this.upgrades.apply(key);
        overlay.destroy();
        title.destroy();
        cards.forEach((c) => c.destroy());
        this.resumeAfterChoice();
      });
      cards.push(card);
    });
  }

  private createUpgradeCard(x: number, y: number, key: RunUpgradeKey, onPick: () => void): Phaser.GameObjects.Container {
    const cfg = RUN_UPGRADES[key];
    const w = 200;
    const h = 300;

    const g = this.add.graphics();
    g.fillStyle(0x22303c, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(3, 0x4caf50, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

    const icon = this.add.image(0, -70, cfg.icon).setScale(1.2);
    const name = this.add
      .text(0, 10, cfg.name, {
        fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5);
    const lv = this.add
      .text(0, 48, `Lv.${this.upgrades.getLevel(key)} → Lv.${this.upgrades.getLevel(key) + 1}`, textStyle(20, '#8fbf8f'))
      .setOrigin(0.5);
    const desc = this.add
      .text(0, 100, cfg.desc, { ...textStyle(20, '#aab8c2'), wordWrap: { width: w - 30 }, align: 'center' })
      .setOrigin(0.5);

    const card = this.add.container(x, y, [g, icon, name, lv, desc]).setDepth(31);
    card.setSize(w, h).setInteractive({ useHandCursor: true });
    let pressed = false; // 要求按下+释放都在卡片上，避免瞬间误选
    card.on('pointerdown', () => {
      pressed = true;
      card.setScale(1.05);
    });
    card.on('pointerover', () => card.setScale(1.05));
    card.on('pointerout', () => {
      pressed = false;
      card.setScale(1);
    });
    card.on('pointerup', () => {
      if (pressed) onPick();
    });

    // 入场动画
    card.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    return card;
  }

  private resumeAfterChoice(): void {
    this.choosingUpgrade = false;
    this.physics.resume();
    this.beginWave();
  }

  // ---------- 结算 ----------

  private endLevel(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();

    let coinsEarned: number;
    let stars = 0;
    if (victory) {
      stars = starsForWallRatio(this.wallHp / this.wallMaxHp);
      coinsEarned = this.runCoins + levelClearReward(this.level.id, stars);
      SaveManager.recordLevelClear(this.level.id, stars, LEVELS.length);
    } else {
      // 失败保留一半局内金币
      coinsEarned = Math.floor(this.runCoins / 2);
    }
    SaveManager.addCoins(coinsEarned);

    this.time.delayedCall(600, () => {
      this.scene.stop('UI');
      this.scene.start('Result', {
        levelId: this.level.id,
        victory,
        stars,
        coinsEarned,
      });
    });
  }
}
