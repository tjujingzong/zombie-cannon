import Phaser from 'phaser';
import {
  GAME_HEIGHT, GAME_WIDTH, WALL_Y, ZombieTypeKey,
  levelClearReward, starsForWallRatio, EXPLOSION_DAMAGE,
  KILL_STREAK_THRESHOLDS,
  PRE_GAME_FREE_SKILLS, PRE_GAME_MONSTER_MULTIPLIER,
} from '../data/balance';
import { LEVELS, LevelConfig, getLevel } from '../data/levels';
import { AudioSystem } from '../systems/AudioSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { MetaUpgrades } from '../systems/MetaUpgrades';
import { SaveManager } from '../systems/SaveManager';
import { WaveManager } from '../systems/WaveManager';
import { Bullet } from '../entities/Bullet';
import { Cannon } from '../entities/Cannon';
import { Coin } from '../entities/Coin';
import { Zombie } from '../entities/Zombie';
import { FONT, createOverlay, textStyle } from '../ui/helpers';
import { RARITY_HEX, getSkill, type SynergyDef } from '../data/skills';
import type { RollChoice } from '../systems/SkillSystem';

// 各 biome 的背景色调（与 levels.ts BIOME_CYCLE 对齐）
const BIOME_PALETTE: Record<string, { top: number; bottom: number; road: number; ground: number }> = {
  suburb:    { top: 0x18222b, bottom: 0x243b2c, road: 0xffffff, ground: 0x11181f },
  gas:       { top: 0x2a2018, bottom: 0x3a2a1c, road: 0xffd54a, ground: 0x181210 },
  town:      { top: 0x1c2618, bottom: 0x2c3a20, road: 0xffffff, ground: 0x101810 },
  tunnel:    { top: 0x141822, bottom: 0x1c2238, road: 0xff9800, ground: 0x0a0e16 },
  bridge:    { top: 0x182830, bottom: 0x204048, road: 0xffffff, ground: 0x0e1820 },
  graveyard: { top: 0x161e22, bottom: 0x223038, road: 0xb0bec5, ground: 0x0a0e10 },
  factory:   { top: 0x221a18, bottom: 0x3a281c, road: 0xff6d00, ground: 0x181008 },
  hospital:  { top: 0x1a1620, bottom: 0x28203a, road: 0xf06292, ground: 0x100a18 },
  city:      { top: 0x101a22, bottom: 0x18283a, road: 0x4fc3f7, ground: 0x080e16 },
  throne:    { top: 0x2a1020, bottom: 0x3a1830, road: 0xff1744, ground: 0x180a14 },
};

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig;
  private waveManager!: WaveManager;
  skills!: SkillSystem;
  private cannon!: Cannon;
  private bullets!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.GameObjects.Group;
  private acidBalls!: Phaser.Physics.Arcade.Group;
  private missiles!: Phaser.Physics.Arcade.Group;

  /** 激光束图形 */
  private laserGraphics!: Phaser.GameObjects.Graphics;
  private lightningGraphics!: Phaser.GameObjects.Graphics;
  private supportGraphics!: Phaser.GameObjects.Graphics;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** 氛围粒子（飘落的灰尘/灰烬） */
  private ambientEmbers: Phaser.GameObjects.Image[] = [];

  /** 导弹计时器 */
  private missileTimer = 0;
  private airSupportTimer = 0;
  private armorySupportTimer = 0;
  /** 护盾计时器 */
  private shieldTimer = 0;
  /** 连杀计时器（连杀中断） */
  private streakTimer = 0;
  /** 墙壁无敌时间（铜墙铁壁） */
  private wallInvulnTimer = 0;

  // ── 战斗打击感 ──
  /** 暴击顿帧计时器 */
  private hitStopTimer = 0;
  /** 慢动作计时器 */
  private slowMoTimer = 0;
  private slowMoScale = 1;
  /** 连击计数器 */
  private hitCombo = 0;
  private comboTimer = 0;
  private hitComboMax = 0;
  /** 低血量红屏 */
  private redVignette!: Phaser.GameObjects.Graphics;
  private overdriveTimer = 0;
  private armageddonTimer = 0;
  private hordeBannerShown = false;
  private synergyQueue: SynergyDef[] = [];
  private synergyNoticeActive = false;

  // 供 UIScene 读取的公开状态
  runCoins = 0;
  wallHp = 0;
  wallMaxHp = 0;
  wallShield = 0;
  levelName = '';
  waveLabel = '';
  hitComboDisplay = 0;
  isBossWave = false;
  isHordeActive = false;
  hordeProgress = 0;
  enemyCount = 0;
  overdriveCharge = 0;
  overdriveReady = false;

  private choosingUpgrade = false;
  private finished = false;
  /** 波次清空后、进入下一波/结算前的过渡态，防止每帧重复调度 */
  private transitioning = false;
  /** 战前免费选技能剩余次数 */
  private preGamePicksLeft = PRE_GAME_FREE_SKILLS;

  constructor() {
    super('Game');
  }

  init(data: { levelId?: number }): void {
    this.level = getLevel(data.levelId ?? 1);
    this.runCoins = 0;
    this.choosingUpgrade = false;
    this.finished = false;
    this.transitioning = false;
    this.preGamePicksLeft = PRE_GAME_FREE_SKILLS;
    this.missileTimer = 0;
    this.airSupportTimer = 0;
    this.armorySupportTimer = 0;
    this.shieldTimer = 0;
    this.streakTimer = 0;
    this.wallInvulnTimer = 0;
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.slowMoScale = 1;
    this.hitCombo = 0;
    this.comboTimer = 0;
    this.hitComboMax = 0;
    this.isBossWave = false;
    this.isHordeActive = false;
    this.hordeProgress = 0;
    this.enemyCount = 0;
    this.overdriveCharge = 0;
    this.overdriveReady = false;
    this.overdriveTimer = 0;
    this.armageddonTimer = 0;
    this.hordeBannerShown = false;
    this.synergyQueue = [];
    this.synergyNoticeActive = false;
  }

  create(): void {
    this.levelName = this.level.name;
    this.wallMaxHp = MetaUpgrades.wallMaxHp();
    this.wallHp = this.wallMaxHp;
    this.wallShield = 0;

    this.createBackground();

    // 技能系统
    this.skills = new SkillSystem();
    this.overdriveCharge = MetaUpgrades.initialOverdrive();
    this.overdriveReady = this.overdriveCharge >= 100;
    this.skills.onRepair = (ratio) => {
      this.wallHp = Math.min(this.wallMaxHp, this.wallHp + Math.round(this.wallMaxHp * ratio));
      AudioSystem.play('heal');
    };
    this.skills.onSynergyActivated = (syn) => {
      this.showSynergyNotification(syn);
      AudioSystem.play('synergy');
    };
    this.skills.onKillStreak = (streak) => {
      if (KILL_STREAK_THRESHOLDS.includes(streak)) {
        this.showKillStreakBanner(streak);
        AudioSystem.play('kill_streak');
      }
    };

    this.waveManager = new WaveManager(this.level);
    this.waveManager.onSpawn = (type) => this.spawnZombie(type);
    this.waveManager.onHordeStart = () => {
      this.isHordeActive = true;
      if (!this.hordeBannerShown) {
        this.hordeBannerShown = true;
        this.showHordeIntro();
      }
      AudioSystem.startBGM('horde');
      AudioSystem.play('horde', { volume: 0.9 });
    };

    // 对象池（满屏僵尸：扩大池上限）
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 800 });
    // 尸潮末波最高约 450 个单位（含护航和召唤），给对象池留出安全余量
    this.zombies = this.physics.add.group({ classType: Zombie, maxSize: 520 });
    this.coins = this.add.group({ classType: Coin, maxSize: 200 });
    this.acidBalls = this.physics.add.group({ classType: Bullet, maxSize: 80 });
    this.missiles = this.physics.add.group({ classType: Bullet, maxSize: 60 });

    // 激光束图形层
    this.laserGraphics = this.add.graphics().setDepth(12);
    this.lightningGraphics = this.add.graphics().setDepth(14);
    this.supportGraphics = this.add.graphics().setDepth(14);
    this.bloodEmitter = this.add.particles(0, 0, 'blood', {
      speed: { min: 80, max: 280 }, lifespan: 450,
      scale: { start: 1.1, end: 0 }, quantity: 16, emitting: false,
    }).setDepth(13);
    this.explosionEmitter = this.add.particles(0, 0, 'explosion_particle', {
      speed: { min: 100, max: 320 }, lifespan: 450,
      scale: { start: 1.4, end: 0 }, quantity: 20, emitting: false,
    }).setDepth(13);
    // 氛围粒子：飘落的灰烬
    this.ambientEmbers = [];
    for (let i = 0; i < 30; i++) {
      const e = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, WALL_Y),
        'pixel'
      ).setDepth(-4).setAlpha(Phaser.Math.FloatBetween(0.05, 0.25))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.8))
        .setTint(this.level.bossLevel ? 0xff6d00 : 0xb0bec5);
      this.ambientEmbers.push(e);
    }

    // 低血量红屏警告
    this.redVignette = this.add.graphics().setDepth(19).setAlpha(0);

    // 炮台
    this.cannon = new Cannon(this, this.skills);
    this.cannon.onFire = (x, y, angle) => this.fireBullet(x, y, angle);
    this.createSupportEmplacement();

    // 子弹 vs 僵尸
    this.physics.add.overlap(this.bullets, this.zombies, (bObj, zObj) => {
      this.onBulletHit(bObj as Bullet, zObj as Zombie);
    });

    // 导弹 vs 僵尸（追踪导弹命中后造成伤害并回收）
    this.physics.add.overlap(this.missiles, this.zombies, (mObj, zObj) => {
      const m = mObj as Bullet;
      const z = zObj as Zombie;
      if (!m.active || !z.active || z.hp <= 0 || z.dying) return;
      const died = z.takeDamage(m.damage);
      this.showDamageText(z.x, z.y - 30, Math.round(m.damage), false);
      this.showShockwave(z.x, z.y);
      AudioSystem.play('explosion', { volume: 0.6 });
      m.recycle();
      if (died) this.killZombie(z);
    });

    // 方向控制：网页鼠标移动 / 安卓触摸拖动均可瞄准，松手后保持最后方向
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.cannon.setManualAim(p.worldX, p.worldY));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.cannon.setManualAim(p.worldX, p.worldY));

    // HUD
    this.scene.launch('UI');

    // 启动战斗 BGM
    AudioSystem.startBGM('normal');

    // 战前免费选技能：选满 PRE_GAME_FREE_SKILLS 项后，提升怪物数量并开始第一波
    this.time.delayedCall(600, () => this.showPreGameSkillSelection());
  }

  private createBackground(): void {
    let pal = BIOME_PALETTE[this.level.biome] ?? BIOME_PALETTE.suburb;
    const equippedBackground = SaveManager.getEquippedArmoryItem('background');
    if (equippedBackground === 'bg_embers') {
      pal = { top: 0x24120f, bottom: 0x5a2a18, road: 0xff7a32, ground: 0x140a08 };
    } else if (equippedBackground === 'bg_neon') {
      pal = { top: 0x0a1020, bottom: 0x17384a, road: 0x4de7ff, ground: 0x070b13 };
    }
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 纵深路面：中心车道、边缘碎石和远处雾带
    bg.fillStyle(pal.road, 0.045).fillRect(GAME_WIDTH * 0.25, 0, GAME_WIDTH * 0.5, WALL_Y);
    bg.fillStyle(pal.road, 0.025);
    for (let i = 0; i < 160; i++) {
      bg.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, WALL_Y), Phaser.Math.Between(2, 7));
    }
    bg.fillStyle(0xffffff, 0.025);
    for (let y = 120; y < WALL_Y - 40; y += 150) bg.fillRect(0, y, GAME_WIDTH, 18);
    bg.fillStyle(pal.road, 0.12);
    for (let y = 140; y < WALL_Y - 80; y += 170) {
      bg.fillRoundedRect(GAME_WIDTH / 2 - 6, y, 12, 72, 6);
    }
    // 远景剪影（增加层次）
    bg.fillStyle(0x000000, 0.18);
    for (let i = 0; i < 8; i++) {
      const bx = (i / 8) * GAME_WIDTH + Phaser.Math.Between(-30, 30);
      const bw = Phaser.Math.Between(80, 160);
      const bh = Phaser.Math.Between(60, 140);
      bg.fillRect(bx, WALL_Y - bh, bw, bh);
      bg.fillStyle(pal.road, 0.08);
      for (let wx = bx + 12; wx < bx + bw - 8; wx += 24) {
        bg.fillRect(wx, WALL_Y - bh + 18, 8, 12);
        bg.fillRect(wx, WALL_Y - bh + 44, 8, 12);
      }
      bg.fillStyle(0x000000, 0.18);
    }
    // 路边残骸/路灯剪影，给不同 biome 的色板提供可读的场景结构
    bg.fillStyle(0x000000, 0.32);
    bg.fillRect(54, WALL_Y - 210, 8, 210);
    bg.fillRect(48, WALL_Y - 210, 54, 7);
    bg.fillCircle(102, WALL_Y - 207, 14);
    bg.fillRect(GAME_WIDTH - 62, WALL_Y - 170, 8, 170);
    bg.fillRect(GAME_WIDTH - 112, WALL_Y - 170, 58, 7);
    bg.fillCircle(GAME_WIDTH - 112, WALL_Y - 167, 13);
    if (SaveManager.getEquippedArmoryItem('decor') === 'decor_floodlights') {
      bg.fillStyle(0xfff3b0, 0.075).fillTriangle(102, WALL_Y - 198, 250, WALL_Y, 24, WALL_Y);
      bg.fillStyle(0xb3e5fc, 0.07).fillTriangle(GAME_WIDTH - 112, WALL_Y - 158, GAME_WIDTH - 22, WALL_Y, GAME_WIDTH - 280, WALL_Y);
      bg.fillStyle(0xffd54a, 0.8).fillCircle(102, WALL_Y - 207, 8);
      bg.fillStyle(0x80d8ff, 0.8).fillCircle(GAME_WIDTH - 112, WALL_Y - 167, 8);
    }
    // 基地墙
    this.add.tileSprite(GAME_WIDTH / 2, WALL_Y + 24, GAME_WIDTH, 48, 'wall_tile').setDepth(9);
    // 墙后地面
    bg.fillStyle(pal.ground, 1).fillRect(0, WALL_Y + 48, GAME_WIDTH, GAME_HEIGHT - WALL_Y - 48);
    // Boss 关：地面带血色警示
    if (this.level.bossLevel) {
      bg.fillStyle(0xff1744, 0.08).fillRect(0, 0, GAME_WIDTH, WALL_Y);
    }
    // 顶部冷色雾幕：保持场景明暗分层，同时让僵尸从远处压进来的感觉更强
    bg.fillStyle(pal.road, 0.035).fillRect(0, 82, GAME_WIDTH, 110);
    bg.fillStyle(0x000000, 0.12).fillRect(0, WALL_Y - 120, GAME_WIDTH, 120);
  }

  private createSupportEmplacement(): void {
    const support = SaveManager.getEquippedArmoryItem('support');
    if (support === 'none') return;
    const icon = support === 'support_sentry'
      ? 'icon_support_sentry'
      : support === 'support_tesla' ? 'icon_support_tesla' : 'icon_support_mortar';
    this.add.image(112, WALL_Y + 95, icon).setDepth(10).setScale(0.9);
    const pad = this.add.graphics().setDepth(9);
    pad.fillStyle(0x17252d, 1).fillRoundedRect(64, WALL_Y + 120, 96, 24, 7);
    pad.lineStyle(2, 0x607d8b, 0.8).strokeRoundedRect(64, WALL_Y + 120, 96, 24, 7);
  }

  private updateArmorySupport(dt: number, alive: Zombie[]): void {
    const support = SaveManager.getEquippedArmoryItem('support');
    if (support === 'none' || alive.length === 0) return;
    this.armorySupportTimer += dt;
    const interval = support === 'support_sentry' ? 0.72 : support === 'support_tesla' ? 1.8 : 3.1;
    if (this.armorySupportTimer < interval) return;
    this.armorySupportTimer = 0;

    if (support === 'support_sentry') {
      const target = [...alive].sort((a, b) => b.y - a.y)[0];
      this.supportGraphics.lineStyle(4, 0xffd54a, 0.9).lineBetween(112, WALL_Y + 50, target.x, target.y);
      const died = target.takeDamage(this.skills.damage * 0.55);
      if (died) this.killZombie(target);
      this.time.delayedCall(70, () => this.supportGraphics.clear());
      AudioSystem.play('shoot', { volume: 0.35 });
      return;
    }

    if (support === 'support_tesla') {
      const targets = [...alive].sort((a, b) => b.y - a.y).slice(0, 3);
      let fromX = 112, fromY = WALL_Y + 50;
      for (const target of targets) {
        this.supportGraphics.lineStyle(5, 0x4fc3f7, 0.9).lineBetween(fromX, fromY, target.x, target.y);
        const died = target.takeDamage(this.skills.damage * 0.48);
        if (died) this.killZombie(target);
        fromX = target.x; fromY = target.y;
      }
      this.time.delayedCall(110, () => this.supportGraphics.clear());
      AudioSystem.play('lightning', { volume: 0.45 });
      return;
    }

    const target = alive[Phaser.Math.Between(0, alive.length - 1)];
    this.doSupportExplosion(target.x, target.y);
  }

  private doSupportExplosion(x: number, y: number): void {
    this.explosionEmitter.setPosition(x, y).setParticleTint(0xffb74d).explode(18);
    const damage = this.skills.damage * 1.15;
    for (const zombie of this.aliveZombies()) {
      const dist = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (dist > 120) continue;
      const died = zombie.takeDamage(damage * (1 - dist / 180));
      if (died) this.killZombie(zombie);
    }
    this.cameras.main.shake(90, 0.004);
    AudioSystem.play('explosion', { volume: 0.45 });
  }

  // ─── 波次 ───

  private beginWave(): void {
    if (this.finished) return;
    const started = this.waveManager.startNextWave();
    if (!started) return;
    this.waveLabel = `${this.waveManager.currentWave}/${this.waveManager.totalWaves}`;

    // 检测当前波是否为 bossWave
    const curWaveCfg = this.level.waves[this.waveManager.currentWave - 1];
    const isBossWave = !!(curWaveCfg && curWaveCfg.bossWave);
    this.isBossWave = isBossWave;

    if (isBossWave) {
      this.showBossIntro();
      AudioSystem.startBGM(this.isHordeActive ? 'horde' : 'boss');
      AudioSystem.play('boss');
    } else {
      // 切回普通 BGM（若之前是 boss）
      if (this.isHordeActive) {
        AudioSystem.startBGM('horde');
      } else if (this.waveManager.currentWave > 1) {
        AudioSystem.startBGM('normal');
      }
      AudioSystem.play('wave');
    }

    const bannerColor = isBossWave ? '#ff1744' : '#ffd54a';
    const bannerText = isBossWave
      ? `⚠ BOSS 波 ${this.waveManager.currentWave}/${this.waveManager.totalWaves}`
      : this.isHordeActive
        ? `尸潮来袭 · ${this.waveManager.currentWave}/${this.waveManager.totalWaves}`
        : `第 ${this.waveManager.currentWave} 波`;
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, bannerText, {
        fontFamily: FONT, fontSize: isBossWave ? '56px' : '64px', fontStyle: 'bold', color: bannerColor,
        stroke: '#1a2530', strokeThickness: 8,
      })
      .setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: 1, duration: 250, yoyo: true, hold: 700,
      onComplete: () => banner.destroy(),
    });
    // Boss 波全屏震动
    if (isBossWave) {
      this.cameras.main.shake(400, 0.012);
    }
  }

  private showBossIntro(): void {
    // 全屏红色闪烁 + 缩放警告
    const flash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff1744, 0.4
    ).setDepth(22);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 500, ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
    // "危险" 大字
    const warn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, '⚠ 危险 ⚠', {
      fontFamily: FONT, fontSize: '80px', fontStyle: 'bold', color: '#ff1744',
      stroke: '#1a2530', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(23).setScale(0.2);
    this.tweens.add({
      targets: warn, scale: 1.1, duration: 350, ease: 'Back.Out',
      yoyo: true, hold: 800,
      onComplete: () => warn.destroy(),
    });
  }

  private showHordeIntro(): void {
    const flash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2cff9a, 0.22,
    ).setDepth(22);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 650, ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
    const warn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, '尸 潮', {
      fontFamily: FONT, fontSize: '86px', fontStyle: 'bold', color: '#b6ff6a',
      stroke: '#102218', strokeThickness: 14,
    }).setOrigin(0.5).setDepth(23).setScale(0.35);
    this.tweens.add({
      targets: warn, scale: 1.12, duration: 420, ease: 'Back.Out',
      yoyo: true, hold: 900,
      onComplete: () => warn.destroy(),
    });
    this.cameras.main.shake(500, 0.012);
  }

  // ─── 生成僵尸 ───

  spawnZombie(type: ZombieTypeKey, x?: number, y?: number): void {
    const z = this.zombies.get() as Zombie | null;
    if (!z) return;
    const sx = x ?? Phaser.Math.Between(70, GAME_WIDTH - 70);
    const sy = y ?? -80;
    z.spawn(type, sx, sy, this.level.hpScale, this.level.speedScale);
    z.onAttackWall = (dmg) => this.damageWall(dmg);
    z.onSummon = (bx, by, summonType) => {
      this.spawnZombie(summonType ?? 'normal',
        Phaser.Math.Clamp(bx + Phaser.Math.Between(-80, 80), 60, GAME_WIDTH - 60), by);
      AudioSystem.play('summon', { volume: 0.5 });
    };
    z.onSpit = (sx2, sy2, angle, damage) => this.fireAcidBall(sx2, sy2, angle, damage);
    z.onHeal = (healer) => {
      const alive = this.aliveZombies();
      healer.healNearby(alive);
      this.showHealEffect(healer.x, healer.y);
      AudioSystem.play('heal', { volume: 0.4 });
    };
    z.onExplode = (ex, ey) => this.doExplosion(ex, ey);

    // Boss 出生特效
    if (type === 'boss') {
      this.showBossSpawnEffect(z.x, z.y);
    }
    // 自爆者出场带闪烁
    if (type === 'exploder') {
      this.tweens.add({ targets: z, alpha: 0.7, duration: 120, yoyo: true, repeat: 2 });
    }
  }

  private showBossSpawnEffect(x: number, y: number): void {
    // 紫色光环 + 王冠 + 屏幕震动
    const aura = this.add.image(x, y + 30, 'boss_aura').setDepth(4).setScale(0.5).setAlpha(0.9);
    this.tweens.add({
      targets: aura, scale: 1.5, alpha: 0, duration: 800, ease: 'Cubic.Out',
      onComplete: () => aura.destroy(),
    });
    this.cameras.main.shake(200, 0.01);
    // 出场粒子环
    this.explosionEmitter.setPosition(x, y);
    this.explosionEmitter.setParticleTint(0xce93d8);
    this.explosionEmitter.explode(20);
  }

  // ─── 子弹系统 ───

  private fireBullet(x: number, y: number, angle: number): void {
    const b = this.bullets.get() as Bullet | null;
    if (!b) return;
    const isCrit = Math.random() < this.skills.critChance;
    const rawDmg = this.skills.damage * (1 + this.skills.streakDamageBonus) * (isCrit ? 2 : 1);
    const comboMult = 1 + Math.min(this.hitCombo * 0.02, 1.0); // 连击倍率最高×2
    const dmg = rawDmg * comboMult;
    b.fire(x, y, angle, dmg, this.skills.pierce, isCrit, this.skills.ricochetCount);
  }

  private onBulletHit(bullet: Bullet, zombie: Zombie): void {
    if (!bullet.active || !zombie.active || zombie.hp <= 0 || zombie.dying) return;

    const hpRatio = zombie.hp / zombie.maxHp;
    const executing = this.skills.executionThreshold > 0 && hpRatio <= this.skills.executionThreshold;
    const hitDamage = bullet.damage * (executing ? this.skills.executionDamageMultiplier : 1);
    const died = zombie.takeDamage(hitDamage);
    const actualDmg = Math.round(hitDamage);
    this.showDamageText(zombie.x, zombie.y - 30, actualDmg, bullet.isCrit);

    if (this.skills.frostSlowMultiplier < 1 && zombie.hp > 0) {
      zombie.applySlow(this.skills.frostSlowMultiplier, 2.5);
    }
    if (executing) this.showShockwave(zombie.x, zombie.y);

    // 命中音效
    AudioSystem.play(bullet.isCrit ? 'crit' : 'hit', { volume: 0.6 });

    // 命中顿帧：暴击时短暂顿帧
    if (bullet.isCrit) {
      this.hitStop(40);
      this.cameras.main.shake(80, 0.006);
      this.showShockwave(zombie.x, zombie.y);
    } else if (actualDmg > this.skills.damage * 1.5) {
      this.hitStop(20);
    }

    // 连击计数
    this.hitCombo++;
    this.comboTimer = 2.0;
    if (this.hitCombo > this.hitComboMax) this.hitComboMax = this.hitCombo;
    this.hitComboDisplay = this.hitCombo;

    // 灼烧效果
    if (this.skills.burnDps > 0 && zombie.hp > 0) {
      this.applyBurn(zombie, this.skills.burnDps);
    }

    // 穿甲组合技：地狱穿甲弹
    if (bullet.isCrit && this.skills.hasSynergy('detonation')) {
      this.doExplosion(zombie.x, zombie.y);
    }

    const bulletEnded = bullet.onHit();

    // 连锁闪电：高等级弹射连续命中后自动跳链，专门对付尸潮密集区
    if (this.skills.hasSynergy('chainLightning') && bullet.hitCount % 3 === 0) {
      this.doChainLightning(zombie);
    }

    if (bulletEnded) {
      // 弹射
      if (this.skills.ricochetCount > 0 && bullet.ricochetLeft > 0) {
        this.ricochetBullet(bullet, zombie);
      } else {
        bullet.recycle();
      }
    }

    if (died) {
      this.killZombie(zombie);
    }
  }

  private showShockwave(x: number, y: number): void {
    const sw = this.add.image(x, y, 'shockwave').setDepth(13).setScale(0.3).setAlpha(0.9);
    this.tweens.add({
      targets: sw, scale: 1.8, alpha: 0, duration: 280, ease: 'Cubic.Out',
      onComplete: () => sw.destroy(),
    });
  }

  private ricochetBullet(bullet: Bullet, lastHit: Zombie): void {
    const alive = this.aliveZombies().filter((z) => z !== lastHit && z.hp > 0);
    if (alive.length === 0) { bullet.recycle(); return; }

    let nearest: Zombie | null = null;
    let minDist = 400;
    for (const z of alive) {
      const d = Phaser.Math.Distance.Between(lastHit.x, lastHit.y, z.x, z.y);
      if (d < minDist) { minDist = d; nearest = z; }
    }

    if (nearest) {
      bullet.ricochetLeft--;
      const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, nearest.x, nearest.y);
      bullet.redirect(angle);

      // 弹幕风暴：每次弹射分裂两枚轻量子弹，形成可见的清屏扇面
      if (this.skills.hasSynergy('bulletStorm')) {
        for (const offset of [-0.12, 0.12]) {
          const split = this.bullets.get() as Bullet | null;
          if (!split) continue;
          split.fire(bullet.x, bullet.y, angle + offset, bullet.damage * 0.62, 0, false, 0);
        }
      }
    } else {
      bullet.recycle();
    }
  }

  private doChainLightning(source: Zombie): void {
    const targets = this.aliveZombies()
      .filter((z) => z !== source && z.hp > 0)
      .sort((a, b) => Phaser.Math.Distance.Between(source.x, source.y, a.x, a.y)
        - Phaser.Math.Distance.Between(source.x, source.y, b.x, b.y))
      .slice(0, 4);
    let fromX = source.x;
    let fromY = source.y;
    for (const target of targets) {
      this.lightningGraphics.lineStyle(5, 0xfff176, 0.95);
      this.lightningGraphics.lineBetween(fromX, fromY, target.x, target.y);
      this.lightningGraphics.lineStyle(12, 0xffd54f, 0.18);
      this.lightningGraphics.lineBetween(fromX, fromY, target.x, target.y);
      const died = target.takeDamage(this.skills.damage * 0.7);
      if (died) this.killZombie(target);
      fromX = target.x;
      fromY = target.y;
    }
    this.time.delayedCall(90, () => this.lightningGraphics.clear());
    if (targets.length > 0) AudioSystem.play('lightning', { volume: 0.7 });
  }

  // ─── 酸球（远程僵尸攻击） ───

  private fireAcidBall(x: number, y: number, angle: number, damage: number): void {
    const b = this.acidBalls.get() as Bullet | null;
    if (!b) return;
    b.setTexture('acid_ball');
    b.fire(x, y, angle, damage, 0, false);
    b.setScale(1.2);
    AudioSystem.play('acid', { volume: 0.5 });
    // 酸球碰到墙时伤害（自定义逻辑：检查y坐标）
  }

  // ─── 导弹系统 ───

  private fireMissile(): void {
    const alive = this.aliveZombies();
    if (alive.length === 0) return;

    for (let i = 0; i < this.skills.missileCount; i++) {
      const m = this.missiles.get() as Bullet | null;
      if (!m) return;
      m.setTexture('bullet');
      const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      m.fire(
        this.cannon.x + Phaser.Math.Between(-20, 20),
        this.cannon.y - 20,
        angle,
        this.skills.damage * 1.5,
        0,
        false,
      );
      m.setScale(1.5);
      m.setTint(0xff4444);
      // 发射尾焰
      const trail = this.add.image(m.x, m.y, 'muzzle_flash').setDepth(11).setScale(0.8).setTint(0xff6d00);
      this.tweens.add({
        targets: trail, alpha: 0, scale: 1.5, duration: 200, ease: 'Cubic.Out',
        onComplete: () => trail.destroy(),
      });

      // 追踪逻辑：每帧更新方向
      const targetZombie = alive[Phaser.Math.Between(0, alive.length - 1)];
      m.setData('target', targetZombie);
      m.setData('homing', true);
    }
    AudioSystem.play('shoot', { volume: 0.6 });
  }

  private fireAirSupport(): void {
    const alive = this.aliveZombies();
    if (alive.length === 0) return;
    const priority = alive.filter((zombie) => zombie.zType === 'jammer');
    for (let i = 0; i < this.skills.airSupportCount; i++) {
      const targetPool = priority.length > 0 ? priority : alive;
      const target = targetPool[Phaser.Math.Between(0, targetPool.length - 1)];
      const missile = this.missiles.get() as Bullet | null;
      if (!missile) return;
      const startX = i % 2 === 0 ? 74 : GAME_WIDTH - 74;
      const startY = WALL_Y + 78;
      const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y);
      missile.setTexture('bullet');
      missile.fire(startX, startY, angle, this.skills.damage * 1.05, 0, false);
      missile.setScale(1.2).setTint(0x4de7ff);
      missile.setData('target', target);
      missile.setData('homing', true);
    }
    AudioSystem.play('shoot', { volume: 0.45 });
  }

  // ─── 灼烧系统 ───

  private burnEffects: { zombie: Zombie; dps: number; timer: number }[] = [];

  private applyBurn(zombie: Zombie, dps: number): void {
    // 刷新或叠加
    const existing = this.burnEffects.find((e) => e.zombie === zombie);
    if (existing) {
      existing.dps = Math.max(existing.dps, dps);
      existing.timer = 3;
    } else {
      this.burnEffects.push({ zombie, dps, timer: 3 });
    }
  }

  private updateBurns(dt: number): void {
    for (let i = this.burnEffects.length - 1; i >= 0; i--) {
      const e = this.burnEffects[i];
      e.timer -= dt;
      if (e.timer <= 0 || !e.zombie.active || e.zombie.hp <= 0) {
        this.burnEffects.splice(i, 1);
        continue;
      }
      const dmg = e.dps * dt;
      const died = e.zombie.takeDamage(dmg);
      // 灼烧粒子
      if (Math.random() < 0.3) {
        this.showBurnParticle(e.zombie.x, e.zombie.y);
      }
      if (died) this.killZombie(e.zombie);
    }
  }

  // ─── 护盾系统 ───

  private updateWallShield(dt: number): void {
    if (this.skills.shieldInterval === Infinity) return;
    this.shieldTimer += dt;
    if (this.shieldTimer >= this.skills.shieldInterval && this.wallShield <= 0) {
      this.shieldTimer = 0;
      this.wallShield = this.skills.shieldAmount;
      this.showShieldActivateEffect();
    }
  }

  // ─── 连杀系统 ───

  private updateStreak(dt: number): void {
    if (this.skills.killStreak > 0) {
      this.streakTimer += dt;
      if (this.streakTimer > 5) {
        this.skills.resetStreak();
        this.streakTimer = 0;
      }
    }
  }

  private addOverdriveCharge(zombie: Zombie): void {
    const wasReady = this.overdriveReady;
    const gain = zombie.zType === 'boss' ? 32 : zombie.zType === 'swarm' ? 1 : 4;
    this.overdriveCharge = Math.min(100, this.overdriveCharge + gain);
    this.overdriveReady = this.overdriveCharge >= 100 && !this.skills.isOverdriveActive;
    if (!wasReady && this.overdriveReady) {
      const banner = this.add.text(GAME_WIDTH / 2, 930, '⚡ 过载就绪', {
        fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#66e08a',
        stroke: '#102218', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: banner, y: 890, alpha: 0, duration: 900, onComplete: () => banner.destroy() });
      AudioSystem.play('overdrive', { volume: 0.55 });
    }
  }

  /** 由 HUD 按钮调用的主动爆发技能 */
  triggerOverdrive(): boolean {
    if (!this.overdriveReady || this.skills.isOverdriveActive || this.finished || this.choosingUpgrade) return false;
    this.overdriveCharge = 0;
    this.overdriveReady = false;
    this.overdriveTimer = 8;
    this.skills.setOverdrive(true);
    this.cameras.main.flash(180, 182, 255, 106);
    this.showKillStreakBanner(99);
    AudioSystem.play('overdrive', { volume: 1 });
    return true;
  }

  private updateOverdrive(dt: number): void {
    if (!this.skills.isOverdriveActive) return;
    this.overdriveTimer -= dt;
    if (this.overdriveTimer <= 0) {
      this.overdriveTimer = 0;
      this.skills.setOverdrive(false);
      this.overdriveReady = this.overdriveCharge >= 100;
    }
  }

  private triggerArmageddon(): void {
    this.armageddonTimer = 0;
    const count = this.isHordeActive ? 8 : 5;
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, '末 日 审 判', {
      fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#ffb300',
      stroke: '#401414', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({ targets: label, alpha: 0, y: label.y - 50, duration: 900, onComplete: () => label.destroy() });
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 90, () => {
        if (this.finished) return;
        const target = this.aliveZombies()[i % Math.max(1, this.aliveZombies().length)];
        const x = target?.x ?? Phaser.Math.Between(90, GAME_WIDTH - 90);
        const y = target?.y ?? Phaser.Math.Between(160, WALL_Y - 80);
        this.doExplosion(x, y);
      });
    }
    this.cameras.main.shake(350, 0.018);
    AudioSystem.play('armageddon', { volume: 1 });
  }

  // ─── 激光束 ───

  private updateLaser(): void {
    this.laserGraphics.clear();
    if (!this.skills.hasLaser || this.finished || this.choosingUpgrade) return;

    const alive = this.aliveZombies();
    if (alive.length === 0) return;

    // 找最近僵尸
    let nearest: Zombie | null = null;
    let minDist = 1500;
    for (const z of alive) {
      if (!z.active || z.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.cannon.x, this.cannon.y, z.x, z.y);
      if (d < minDist) { minDist = d; nearest = z; }
    }
    if (!nearest) return;

    const angle = Phaser.Math.Angle.Between(this.cannon.x, this.cannon.y, nearest.x, nearest.y);
    const len = 1200;
    const ex = this.cannon.x + Math.cos(angle) * len;
    const ey = this.cannon.y + Math.sin(angle) * len;

    // 画激光
    this.laserGraphics.lineStyle(4, 0xff2222, 0.9);
    this.laserGraphics.lineBetween(this.cannon.x, this.cannon.y, ex, ey);
    this.laserGraphics.lineStyle(8, 0xff6666, 0.3);
    this.laserGraphics.lineBetween(this.cannon.x, this.cannon.y, ex, ey);

    // 激光伤害（每帧）
    const isCrit = this.skills.hasSynergy('fatalLaser') || Math.random() < this.skills.critChance;
    const dmg = this.skills.laserDps * (isCrit ? 2 : 1) * this.effectiveDelta;

    // 碰撞检测：点到线段距离
    for (const z of alive) {
      if (!z.active || z.hp <= 0) continue;
      const lx = ex - this.cannon.x;
      const ly = ey - this.cannon.y;
      const lenSq = lx * lx + ly * ly;
      let t = ((z.x - this.cannon.x) * lx + (z.y - this.cannon.y) * ly) / lenSq;
      t = Phaser.Math.Clamp(t, 0, 1);
      const projX = this.cannon.x + t * lx;
      const projY = this.cannon.y + t * ly;
      const dist = Phaser.Math.Distance.Between(z.x, z.y, projX, projY);
      if (dist < 30) {
        const died = z.takeDamage(dmg);
        if (died) this.killZombie(z);
      }
    }
  }

  // ─── 爆炸 ───

  private doExplosion(x: number, y: number): void {
    const radius = this.skills.hasSynergy('doomsday')
      ? this.skills.explosiveRadius * 1.5
      : this.skills.explosiveRadius;
    const damage = this.skills.hasSynergy('doomsday')
      ? this.skills.explosiveDamage * 1.5
      : Math.max(this.skills.explosiveDamage, EXPLOSION_DAMAGE);

    // 爆炸粒子：共享发射器，避免尸潮连锁爆炸创建大量 GameObject
    this.explosionEmitter.setPosition(x, y);
    this.explosionEmitter.setParticleTint(0xff6d00);
    this.explosionEmitter.explode(20);

    this.cameras.main.shake(150, 0.008);
    if (!this.skills.hasSynergy('doomsday')) {
      AudioSystem.play('explosion', { volume: 0.7 });
    }

    // 对范围内僵尸造成伤害
    const alive = this.aliveZombies();
    for (const z of alive) {
      if (!z.active || z.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(x, y, z.x, z.y);
      if (dist < radius) {
        const died = z.takeDamage(damage * (1 - dist / radius));
        if (died) this.killZombie(z);
      }
    }
  }

  // ─── 墙壁伤害 ───

  private damageWall(dmg: number): void {
    if (this.finished) return;

    // 铜墙铁壁无敌
    if (this.wallInvulnTimer > 0) return;

    // 护盾吸收
    if (this.wallShield > 0) {
      if (dmg <= this.wallShield) {
        this.wallShield -= dmg;
        this.cameras.main.shake(60, 0.002);
        AudioSystem.play('wall_hit', { volume: 0.3 });
        return;
      }
      dmg -= this.wallShield;
      this.wallShield = 0;
    }

    // 钢铁壁垒减伤
    dmg *= 1 - this.skills.wallDamageReduction;

    this.wallHp = Math.max(0, this.wallHp - dmg);
    this.cameras.main.shake(120, 0.004);
    AudioSystem.play('wall_hit', { volume: 0.55 });

    // 反伤
    if (this.skills.thornsDamage > 0) {
      // 对最近的僵尸造成反弹伤害
      const alive = this.aliveZombies();
      if (alive.length > 0) {
        let nearest = alive[0];
        let minD = Infinity;
        for (const z of alive) {
          if (!z.active || z.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(GAME_WIDTH / 2, WALL_Y, z.x, z.y);
          if (d < minD) { minD = d; nearest = z; }
        }
        nearest.takeDamage(dmg * this.skills.thornsDamage);
        this.showDamageText(nearest.x, nearest.y - 20, Math.round(dmg * this.skills.thornsDamage), false);
      }
    }

    // 铜墙铁壁：受伤后无敌
    if (this.skills.hasIronWall) {
      this.wallInvulnTimer = 2;
    }

    if (this.wallHp <= 0) {
      this.endLevel(false);
    }
  }

  // ─── 击杀僵尸 ───

  private killZombie(zombie: Zombie): void {
    const isBoss = zombie.zType === 'boss';
    // 击杀爆破感：共享粒子发射器，尸潮时不会为每只敌人创建新对象
    const particleCount = isBoss ? 40 : zombie.zType === 'swarm' ? 5 : 16;
    this.bloodEmitter.setPosition(zombie.x, zombie.y);
    this.bloodEmitter.setParticleTint(isBoss ? 0xffd54a : 0x8bc34a);
    this.bloodEmitter.explode(particleCount);

    // 击杀径向闪光 + 冲击波
    const isSwarm = zombie.zType === 'swarm';
    if (!isSwarm || Math.random() < 0.3) this.showKillBurst(zombie.x, zombie.y, isBoss);
    if (!isSwarm || Math.random() < 0.2) this.showShockwave(zombie.x, zombie.y);
    if (isBoss) {
      // Boss 死亡更大冲击波 + 屏震
      this.showShockwave(zombie.x, zombie.y);
      this.cameras.main.shake(500, 0.02);
      this.applySlowMo(0.4, 0.8);
    }

    // 击杀音效
    AudioSystem.play(isBoss ? 'explosion' : 'kill', { volume: isBoss ? 1 : 0.7 });

    // 连杀
    this.skills.onKill();
    this.streakTimer = 0;
    this.addOverdriveCharge(zombie);

    if (zombie.zType === 'splitter') {
      this.spawnZombie('swarm', Phaser.Math.Clamp(zombie.x - 24, 48, GAME_WIDTH - 48), zombie.y);
      this.spawnZombie('swarm', Phaser.Math.Clamp(zombie.x + 24, 48, GAME_WIDTH - 48), zombie.y + 10);
      AudioSystem.play('summon', { volume: 0.35 });
    }

    // 爆炸弹效果
    if (this.skills.explosiveDamage > 0) {
      this.doExplosion(zombie.x, zombie.y);
    }

    // 掉金币
    const value = Math.max(1,
      Math.round(zombie.coinValue * this.skills.coinMultiplier) + MetaUpgrades.flatCoinBonus(),
    );
    const c = this.coins.get() as Coin | null;
    if (c) {
      c.drop(zombie.x, zombie.y, value, (v) => {
        this.runCoins += v;
        AudioSystem.play('coin', { volume: 0.4 });
        if (this.skills.healPerCoin > 0) {
          this.wallHp = Math.min(this.wallMaxHp, this.wallHp + this.skills.healPerCoin);
        }
      });
    } else {
      this.runCoins += value;
    }

    // 自爆者死亡爆炸
    if (zombie.zType === 'exploder' && zombie.onExplode) {
      zombie.onExplode(zombie.x, zombie.y);
    }

    // 死亡动画后回收
    zombie.die(() => {
      zombie.recycle();
    });
  }

  // ─── 工具方法 ───

  private aliveZombies(): Zombie[] {
    return (this.zombies.getChildren() as Zombie[]).filter((z) => z.active && z.hp > 0);
  }

  private showDamageText(x: number, y: number, dmg: number, crit: boolean): void {
    if (!crit && this.enemyCount > 70 && Math.random() > 0.18) return;
    const isMega = crit || dmg > this.skills.damage * 3;
    const size = crit ? (dmg > 50 ? '48px' : '38px') : (dmg > 20 ? '28px' : '22px');
    const color = crit ? '#ffd54a' : '#ffffff';
    const prefix = crit ? '暴击! ' : '';
    const t = this.add
      .text(x + Phaser.Math.Between(-10, 10), y, `${prefix}${dmg}`, {
        fontFamily: FONT,
        fontSize: size,
        fontStyle: 'bold',
        color,
        stroke: crit ? '#6d4c00' : '#000000',
        strokeThickness: crit ? 6 : 4,
      })
      .setOrigin(0.5).setDepth(15).setScale(isMega ? 1.3 : 1);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 520, ease: 'Cubic.Out',
      scale: isMega ? 0.8 : 0.6,
      onComplete: () => t.destroy(),
    });
  }

  private showKillBurst(x: number, y: number, isBoss: boolean): void {
    const burst = this.add.graphics().setDepth(13);
    const maxR = isBoss ? 120 : 50;
    const color = isBoss ? 0xff1744 : 0xffd54a;
    burst.fillStyle(color, 0.7).fillCircle(0, 0, maxR);
    burst.setPosition(x, y);
    this.tweens.add({
      targets: burst, alpha: 0, scale: isBoss ? 2 : 1.8, duration: 300, ease: 'Cubic.Out',
      onComplete: () => burst.destroy(),
    });
    // 击杀镜头震动
    if (isBoss) {
      this.cameras.main.shake(300, 0.015);
    }
  }

  private showBurnParticle(x: number, y: number): void {
    const px = x + Phaser.Math.Between(-15, 15);
    const py = y + Phaser.Math.Between(-20, 10);
    const dot = this.add.graphics().setDepth(14);
    dot.fillStyle(0xff6d00, 0.8).fillCircle(0, 0, 4);
    dot.setPosition(px, py);
    this.tweens.add({
      targets: dot, y: py - 30, alpha: 0, duration: 400,
      onComplete: () => dot.destroy(),
    });
  }

  private showHealEffect(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const cross = this.add.image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-10, 20), 'heal_cross')
        .setDepth(14).setAlpha(0.8).setScale(0.8);
      this.tweens.add({
        targets: cross, y: cross.y - 40, alpha: 0, duration: 600, delay: i * 100,
        onComplete: () => cross.destroy(),
      });
    }
  }

  private showShieldActivateEffect(): void {
    const shield = this.add.image(GAME_WIDTH / 2, WALL_Y + 24, 'shield_bubble')
      .setDepth(11).setScale(0).setAlpha(0.6);
    this.tweens.add({
      targets: shield, scale: 4, alpha: 0, duration: 800, ease: 'Cubic.Out',
      onComplete: () => shield.destroy(),
    });
  }

  private showSynergyNotification(syn: SynergyDef): void {
    this.synergyQueue.push(syn);
    this.displayNextSynergyNotification();
  }

  private displayNextSynergyNotification(): void {
    if (this.synergyNoticeActive || this.synergyQueue.length === 0) return;
    this.synergyNoticeActive = true;
    const syn = this.synergyQueue.shift()!;
    const bg = this.add.graphics().setDepth(25);
    bg.fillStyle(0xffa726, 0.9).fillRoundedRect(GAME_WIDTH / 2 - 240, 160, 480, 90, 16);
    bg.fillStyle(0xffffff, 0.15).fillRoundedRect(GAME_WIDTH / 2 - 240, 160, 480, 45, { tl: 16, tr: 16, bl: 0, br: 0 });

    const icon = this.add.image(GAME_WIDTH / 2 - 180, 205, syn.icon).setScale(1.3).setDepth(26);
    const title = this.add.text(GAME_WIDTH / 2 - 140, 185, syn.name, {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#1a2530',
    }).setDepth(26);
    const desc = this.add.text(GAME_WIDTH / 2 - 140, 218, syn.desc, {
      fontFamily: FONT, fontSize: '20px', color: '#4a2500',
    }).setDepth(26);
    const label = this.add.text(GAME_WIDTH / 2 + 200, 185, '组合技!', {
      fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(26);

    const elements = [bg, icon, title, desc, label];
    this.tweens.add({
      targets: elements, alpha: 0, duration: 400, delay: 3000,
      onComplete: () => {
        elements.forEach((e) => e.destroy());
        this.synergyNoticeActive = false;
        this.time.delayedCall(120, () => this.displayNextSynergyNotification());
      },
    });
  }

  private showKillStreakBanner(streak: number): void {
    let text: string;
    let color = '#ffd54a';
    if (streak >= 50) { text = `连杀 ${streak}!  暴走!!!`; color = '#ff1744'; }
    else if (streak >= 30) { text = `连杀 ${streak}!  无人能挡!`; color = '#ff6d00'; }
    else if (streak >= 15) { text = `连杀 ${streak}!  势不可挡!`; color = '#ffd54a'; }
    else { text = `连杀 ${streak}!`; }

    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, text, {
        fontFamily: FONT, fontSize: '52px', fontStyle: 'bold', color,
        stroke: '#1a2530', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: 1, duration: 200, yoyo: true, hold: 800,
      onComplete: () => banner.destroy(),
    });
  }

  // ─── 主循环 ───

  private effectiveDelta = 0;

  update(_time: number, delta: number): void {
    if (this.finished || this.choosingUpgrade) return;
    const dt = delta / 1000;

    const alive = this.aliveZombies();
    this.enemyCount = alive.length;
    this.hordeProgress = this.waveManager.hordeProgress;
    const jammerCount = alive.reduce((count, zombie) => count + (zombie.zType === 'jammer' ? 1 : 0), 0);
    this.skills.setEnemyFireRateMultiplier(1 - jammerCount * 0.08);
    this.cannon.update(dt, alive);
    this.waveManager.update(dt, alive.length);

    // 顿帧：顿帧期间跳过游戏逻辑更新
    this.updateHitStop(dt);
    if (this.hitStopTimer > 0) return;

    // 慢动作
    this.updateSlowMo(dt);
    const effectiveDt = dt * this.slowMoScale;
    this.effectiveDelta = effectiveDt;

    // 连击计时
    this.updateCombo(dt);

    // 低血量红屏
    this.updateRedVignette();

    // 连杀超时
    this.updateStreak(effectiveDt);
    this.updateOverdrive(effectiveDt);

    // 末日审判：组合技形成周期性全屏轰炸，尸潮时更密集
    if (this.skills.hasSynergy('armageddon') && alive.length > 0) {
      this.armageddonTimer += effectiveDt;
      if (this.armageddonTimer >= (this.isHordeActive ? 8 : 12)) {
        this.triggerArmageddon();
      }
    }

    this.updateArmorySupport(effectiveDt, alive);

    if (this.skills.airSupportInterval < Infinity) {
      this.airSupportTimer += effectiveDt;
      if (this.airSupportTimer >= this.skills.airSupportInterval) {
        this.airSupportTimer = 0;
        this.fireAirSupport();
      }
    }

    // 灼烧
    this.updateBurns(effectiveDt);

    // 护盾
    this.updateWallShield(effectiveDt);

    // 铜墙铁壁无敌计时
    if (this.wallInvulnTimer > 0) this.wallInvulnTimer -= effectiveDt;

    // 追踪导弹
    if (this.skills.missileInterval < Infinity) {
      this.missileTimer += effectiveDt;
      if (this.missileTimer >= this.skills.missileInterval) {
        this.missileTimer = 0;
        this.fireMissile();
      }
    }

    // 激光束
    this.updateLaser();

    // 酸球出屏回收
    (this.acidBalls.getChildren() as Bullet[]).forEach((b) => {
      if (b.active && b.y > WALL_Y) {
        this.damageWall(b.damage);
        b.recycle();
      }
    });

    // 氛围灰烬飘落
    for (const e of this.ambientEmbers) {
      if (!e.active) continue;
      e.y += (20 * effectiveDt) * (e.scaleX);
      e.x += Math.sin(this.time.now * 0.0005 + e.x) * 0.3;
      if (e.y > WALL_Y) {
        e.y = -10;
        e.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }

    // 追踪导弹更新
    (this.missiles.getChildren() as Bullet[]).forEach((m) => {
      if (!m.active) return;
      const target = m.getData('target') as Zombie | undefined;
      if (target && target.active && target.hp > 0) {
        const angle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);
        const body = m.body as Phaser.Physics.Arcade.Body;
        this.physics.velocityFromRotation(angle, 600, body.velocity);
        m.setRotation(angle + Math.PI / 2);
      }
      // 出屏或接近目标回收
      if (m.y < -60 || m.y > GAME_HEIGHT + 60 || m.x < -60 || m.x > GAME_WIDTH + 60) {
        m.recycle();
      }
    });

    // 波次清空：慢动作 + 下一波提示
    if (!this.transitioning && this.waveManager.state === 'idle' && this.waveManager.currentWave > 0 && alive.length === 0) {
      this.transitioning = true;
      if (this.waveManager.isLastWave) {
        this.applySlowMo(0.8, 0.3);
        this.time.delayedCall(450, () => this.endLevel(true));
      } else {
        this.applySlowMo(0.5, 0.4);
        this.time.delayedCall(180, () => this.showUpgradeChoices());
      }
    }
  }

  // ─── 战斗手感系统 ───

  /** 暴击顿帧 */
  private hitStop(ms: number): void {
    this.hitStopTimer = ms / 1000;
  }

  /** 慢动作效果 */
  private applySlowMo(duration: number, scale: number): void {
    this.slowMoTimer = duration;
    this.slowMoScale = scale;
  }

  private updateSlowMo(dt: number): void {
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) this.slowMoScale = 1;
    }
  }

  private updateHitStop(dt: number): void {
    if (this.hitStopTimer > 0) this.hitStopTimer -= dt;
  }

  private updateCombo(dt: number): void {
    if (this.hitCombo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.hitCombo = 0;
        this.hitComboDisplay = 0;
      }
    }
  }

  private updateRedVignette(): void {
    this.redVignette.clear();
    if (this.wallMaxHp <= 0) return;
    const ratio = this.wallHp / this.wallMaxHp;
    if (ratio > 0.25) {
      this.redVignette.setAlpha(0);
      return;
    }
    // 低血量红屏：越低越红，带脉动
    const intensity = (0.25 - ratio) / 0.25; // 0~1
    const pulse = Math.sin(this.time.now * 0.005) * 0.15 + 0.85;
    const alpha = intensity * 0.5 * pulse;
    // 从屏幕边缘画红色渐变
    this.redVignette.fillStyle(0xff0000, alpha * 0.3);
    this.redVignette.fillRect(0, 0, GAME_WIDTH, 40);
    this.redVignette.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);
    this.redVignette.fillRect(0, 0, 20, GAME_HEIGHT);
    this.redVignette.fillRect(GAME_WIDTH - 20, 0, 20, GAME_HEIGHT);
  }

  // ─── 战前免费选技能 ───

  private showPreGameSkillSelection(): void {
    if (this.finished) return;
    this.choosingUpgrade = true;
    this.physics.pause();

    let overlay: Phaser.GameObjects.Rectangle | null = null;
    let title: Phaser.GameObjects.Text | null = null;
    let hint: Phaser.GameObjects.Text | null = null;
    let cards: Phaser.GameObjects.Container[] = [];

    const rebuild = () => {
      overlay?.destroy();
      title?.destroy();
      hint?.destroy();
      cards.forEach((c) => c.destroy());
      cards = [];

      const choices = this.skills.rollChoices(3);
      if (choices.length === 0 || this.preGamePicksLeft <= 0) {
        this.finishPreGame();
        return;
      }

      overlay = createOverlay(this, 0.65).setDepth(30);
      title = this.add
        .text(GAME_WIDTH / 2, 180, '战前准备 · 免费选技能', {
          fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffd54a',
          stroke: '#1a2530', strokeThickness: 6,
        })
        .setOrigin(0.5).setDepth(31);
      hint = this.add
        .text(GAME_WIDTH / 2, 236, `还可选择 ${this.preGamePicksLeft} 项  （选满后怪物数量 +${Math.round((PRE_GAME_MONSTER_MULTIPLIER - 1) * 100)}% 平衡难度）`, {
          fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffa726',
          stroke: '#1a2530', strokeThickness: 3,
          wordWrap: { width: GAME_WIDTH - 60 }, align: 'center',
        })
        .setOrigin(0.5).setDepth(31);

      const cardW = 190;
      const gap = 20;
      const totalW = choices.length * cardW + (choices.length - 1) * gap;
      const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;

      choices.forEach((choice, i) => {
        const card = this.createSkillCard(startX + i * (cardW + gap), 540, choice, () => {
          this.skills.apply(choice.skill.key);
          AudioSystem.play('upgrade');
          this.preGamePicksLeft--;
          if (this.preGamePicksLeft <= 0) {
            overlay?.destroy();
            title?.destroy();
            hint?.destroy();
            cards.forEach((c) => c.destroy());
            cards = [];
            this.finishPreGame();
          } else {
            rebuild();
          }
        });
        cards.push(card);
      });
    };

    rebuild();
  }

  /** 战前选技能结束：应用怪物倍率并开始第一波 */
  private finishPreGame(): void {
    this.choosingUpgrade = false;
    this.transitioning = false;
    this.waveManager.setMonsterMultiplier(PRE_GAME_MONSTER_MULTIPLIER);
    this.physics.resume();
    this.beginWave();
  }

  // ─── 三选一技能选择 ───

  private showUpgradeChoices(): void {
    if (this.choosingUpgrade) return;
    this.choosingUpgrade = true;
    this.physics.pause();

    const rebuild = () => {
      // 清理旧UI
      overlay?.destroy();
      title?.destroy();
      cards.forEach((c) => c.destroy());
      rerollBtn?.destroy();
      pendingText?.destroy();
      cards = [];

      const choices = this.skills.rollChoices(3);
      if (choices.length === 0) {
        this.resumeAfterChoice();
        return;
      }

      overlay = createOverlay(this, 0.6).setDepth(30);
      title = this.add
        .text(GAME_WIDTH / 2, 180, '选择一项强化', {
          fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
          stroke: '#1a2530', strokeThickness: 6,
        })
        .setOrigin(0.5).setDepth(31);

      // 显示差一个就能激活的组合技提示
      const pending = this.skills.getPendingSynergies();
      if (pending.length > 0) {
        const pText = pending.map((p) => `⚡${p.synergy.name} → 需要 ${getSkill(p.missingSkill).name}`).join('  |  ');
        pendingText = this.add
          .text(GAME_WIDTH / 2, 240, pText, {
            fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffa726',
            stroke: '#1a2530', strokeThickness: 3,
            wordWrap: { width: GAME_WIDTH - 60 }, align: 'center',
          })
          .setOrigin(0.5).setDepth(31);
      }

      const cardW = 190;
      const gap = 20;
      const totalW = choices.length * cardW + (choices.length - 1) * gap;
      const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;

      choices.forEach((choice, i) => {
        const card = this.createSkillCard(startX + i * (cardW + gap), 520, choice, () => {
          this.skills.apply(choice.skill.key);
          overlay?.destroy();
          title?.destroy();
          cards.forEach((c) => c.destroy());
          rerollBtn?.destroy();
          pendingText?.destroy();
          AudioSystem.play('upgrade');
          this.resumeAfterChoice();
        });
        cards.push(card);
      });

      // Reroll 按钮
      const rerollCost = this.skills.getRerollCost();
      const canAfford = this.skills.canReroll(this.runCoins);
      rerollBtn = this.add.container(GAME_WIDTH / 2, 780).setDepth(31);
      const rbBg = this.add.graphics();
      const rbW = 200;
      const rbH = 56;
      const rbColor = canAfford ? 0x5d4037 : 0x3a3a3a;
      rbBg.fillStyle(0x000000, 0.3).fillRoundedRect(-rbW / 2 + 2, -rbH / 2 + 3, rbW, rbH, 12);
      rbBg.fillStyle(rbColor, 1).fillRoundedRect(-rbW / 2, -rbH / 2, rbW, rbH, 12);
      const rbTxt = this.add.text(0, -2, `🔄 重铸 (${rerollCost}金)`, {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold',
        color: canAfford ? '#ffd54a' : '#666666',
      }).setOrigin(0.5);
      rerollBtn.add([rbBg, rbTxt]);
      rerollBtn.setSize(rbW, rbH);
      if (canAfford) {
        rerollBtn.setInteractive({ useHandCursor: true });
        rerollBtn.on('pointerdown', () => {
          if (this.skills.canReroll(this.runCoins)) {
            this.runCoins -= this.skills.getRerollCost();
            AudioSystem.play('reroll');
            rebuild();
          }
        });
        rerollBtn.on('pointerover', () => rerollBtn!.setScale(1.08));
        rerollBtn.on('pointerout', () => rerollBtn!.setScale(1));
      }
    };

    let overlay: Phaser.GameObjects.Rectangle | null = null;
    let title: Phaser.GameObjects.Text | null = null;
    let cards: Phaser.GameObjects.Container[] = [];
    let rerollBtn: Phaser.GameObjects.Container | null = null;
    let pendingText: Phaser.GameObjects.Text | null = null;
    rebuild();
  }

  private createSkillCard(x: number, y: number, choice: RollChoice, onPick: () => void): Phaser.GameObjects.Container {
    const { skill, currentLevel, nearSynergies, synergyHints } = choice;
    const w = 180;
    const hasNearSynergy = nearSynergies.length > 0;
    const h = hasNearSynergy ? 370 : 320;
    const rarityColor = RARITY_HEX[skill.rarity];

    const g = this.add.graphics();
    // 背景
    g.fillStyle(0x1a2530, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    // 稀有度边框
    const borderColor = parseInt(rarityColor.replace('#', ''), 16);
    g.lineStyle(3, borderColor, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    // 顶部稀有度色带
    g.fillStyle(borderColor, 0.3).fillRoundedRect(-w / 2, -h / 2, w, 50,
      { tl: 18, tr: 18, bl: 0, br: 0 });
    // 即将激活组合技的高亮边框
    if (hasNearSynergy) {
      g.lineStyle(3, 0xffa726, 0.9).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 20);
    }

    const rarityText = this.add
      .text(0, -h / 2 + 25, skill.rarity === 'legendary' ? '传说' : skill.rarity === 'epic' ? '史诗' : skill.rarity === 'rare' ? '稀有' : '普通', {
        fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: rarityColor,
      })
      .setOrigin(0.5);

    const icon = this.add.image(0, -50, skill.icon).setScale(1.2);
    const name = this.add
      .text(0, 20, skill.name, {
        fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5);
    const lv = this.add
      .text(0, 55, currentLevel === 0 ? '新技能!' : `Lv.${currentLevel} → Lv.${currentLevel + 1}`,
        textStyle(18, '#8fbf8f'))
      .setOrigin(0.5);
    const desc = this.add
      .text(0, 105, skill.desc, { ...textStyle(18, '#aab8c2'), wordWrap: { width: w - 24 }, align: 'center' })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [g, rarityText, icon, name, lv, desc];

    // 组合技提示
    if (hasNearSynergy) {
      const nearText = nearSynergies.map((s) => `⚡可激活: ${s.name}`).join('\n');
      const hint = this.add
        .text(0, 155, nearText, {
          ...textStyle(16, '#ffa726'), fontStyle: 'bold',
          wordWrap: { width: w - 20 }, align: 'center',
        })
        .setOrigin(0.5);
      children.push(hint);
    } else if (synergyHints.length > 0) {
      const hintText = synergyHints.slice(0, 2).map((s) => `→ ${s.name}`).join('\n');
      const hint = this.add
        .text(0, h / 2 - 30, hintText, {
          ...textStyle(14, '#7a8a99'),
          wordWrap: { width: w - 20 }, align: 'center',
        })
        .setOrigin(0.5);
      children.push(hint);
    }

    const card = this.add.container(x, y, children).setDepth(31);
    card.setSize(w, h).setInteractive({ useHandCursor: true });
    let pressed = false;
    card.on('pointerdown', () => { pressed = true; card.setScale(1.06); });
    card.on('pointerover', () => card.setScale(1.06));
    card.on('pointerout', () => { pressed = false; card.setScale(1); });
    card.on('pointerup', () => { if (pressed) onPick(); });

    card.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    return card;
  }

  private resumeAfterChoice(): void {
    this.choosingUpgrade = false;
    this.transitioning = false;
    this.physics.resume();
    this.beginWave();
  }

  // ─── 结算 ───

  private endLevel(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.transitioning = false;
    this.physics.pause();
    AudioSystem.stopBGM();
    AudioSystem.play(victory ? 'win' : 'lose');

    let coinsEarned: number;
    let stars = 0;
    if (victory) {
      stars = starsForWallRatio(this.wallHp / this.wallMaxHp);
      coinsEarned = this.runCoins + levelClearReward(this.level.id, stars);
      SaveManager.recordLevelClear(this.level.id, stars, LEVELS.length);
    } else {
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
        maxStreak: this.skills.maxKillStreak,
        totalKills: this.skills.totalKills,
        synergies: this.skills.getActiveSynergies().map((s) => s.name),
      });
    });
  }
}
