import Phaser from 'phaser';
import {
  GAME_HEIGHT, GAME_WIDTH, WALL_Y, ZombieTypeKey,
  levelClearReward, starsForWallRatio, EXPLOSION_DAMAGE,
  KILL_STREAK_THRESHOLDS,
  PRE_GAME_FREE_SKILLS, PRE_GAME_MONSTER_MULTIPLIER,
  CONDUCTOR_AURA_RANGE, CONDUCTOR_DAMAGE_REDUCTION,
  SHIELD_MAX,
  ZOMBIE_TYPES,
  type DamageElement,
} from '../data/balance';
import {
  LEVELS, LevelConfig, getLevel, getLevelModifier, type LevelModifierDef,
} from '../data/levels';
import { AudioSystem } from '../systems/AudioSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { MetaUpgrades } from '../systems/MetaUpgrades';
import { SaveManager } from '../systems/SaveManager';
import { WaveManager } from '../systems/WaveManager';
import { Bullet } from '../entities/Bullet';
import { Cannon } from '../entities/Cannon';
import { Coin } from '../entities/Coin';
import { Zombie } from '../entities/Zombie';
import { FONT, createButton, createOverlay, textStyle } from '../ui/helpers';
import { RARITY_HEX, SKILLS, getSkill, type SynergyDef } from '../data/skills';
import type { RollChoice } from '../systems/SkillSystem';
import {
  BUILD_PATHS,
  DAMAGE_SOURCE_LABELS,
  type CombatPerformanceSnapshot,
  type DamageSourceKey,
  type EliteAffix,
} from '../data/combat';
import type { Rarity } from '../data/skills';
import { BattlefieldEventSystem, type ActiveBattlefieldEvent } from '../systems/BattlefieldEventSystem';
import { getDailyChallenge, type DailyChallengeConfig } from '../data/daily';
import { ENDLESS_LEVEL } from '../data/endless';
import { EndlessRunSystem } from '../systems/EndlessRunSystem';
import {
  createSeededRandom,
  deriveSeed,
  randomBetween,
  type RandomSource,
} from '../systems/SeededRandom';
import {
  AMMO_SLOT_UNLOCK_LEVEL,
  WALL_SLOT_UNLOCK_LEVEL,
  getBehaviorEquipment,
  type BehaviorLoadout,
} from '../data/equipment';
import type { BulletProfile } from '../entities/Bullet';
import {
  getCompanionProtocol,
  type CompanionProtocolKey,
} from '../data/companion';
import { getChallengeContract, type ChallengeContractKey, type ChallengeContractDef } from '../data/challengeContracts';

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

interface GameSceneData {
  levelId?: number;
  dailyChallengeDate?: string;
  endlessMode?: boolean;
  endlessSeed?: number;
}

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
  private companionGraphics!: Phaser.GameObjects.Graphics;
  private conductorGraphics!: Phaser.GameObjects.Graphics;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** 氛围粒子（飘落的灰尘/灰烬） */
  private ambientEmbers: Phaser.GameObjects.Image[] = [];

  /** 导弹计时器 */
  private missileTimer = 0;
  private airSupportTimer = 0;
  private armorySupportTimer = 0;
  private gravityWellTimer = 0;
  private mineTimer = 0;
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
  private gravityWells: { sprite: Phaser.GameObjects.Image; x: number; y: number; timer: number; tick: number }[] = [];
  private deployedMines: Phaser.GameObjects.Image[] = [];
  private thermalShockReadyAt = new WeakMap<Zombie, number>();
  private damageTotals: Record<DamageSourceKey, number> = this.createEmptyDamageTotals();
  private contractOfferWaves = new Set<number>();
  private contractWave = 0;
  private performanceLowFps = 60;
  private performanceSampleTimer = 0;
  private battlefieldEvents!: BattlefieldEventSystem;
  private eventOverlay?: Phaser.GameObjects.Rectangle;
  private supplyDrop?: Phaser.GameObjects.Container;
  private eventEnemySpeedMultiplier = 1;
  private eventFireRateMultiplier = 1;
  private eventEliteQuota = 0;
  private eventEliteSpawned = 0;
  private eventEliteKills = 0;
  private waveStartDelay = 0;
  private eventGameplayStarted = false;
  private dailyChallenge: DailyChallengeConfig | null = null;
  private endlessRun: EndlessRunSystem | null = null;
  private eventRandom: RandomSource = Math.random;
  private skillRandom: RandomSource = Math.random;
  private eliteRandom: RandomSource = Math.random;
  private spawnRandom: RandomSource = Math.random;
  private waveRandom: RandomSource = Math.random;
  private behaviorLoadout!: BehaviorLoadout;
  private ammoSlotActive = true;
  private wallSlotActive = true;
  private equipmentVolleyCount = 0;
  private equipmentProjectileCount = 0;
  private cyclerHeat = 0;
  private cyclerLockTimer = 0;
  private wallModuleCooldown = 0;
  /** 瞄准线（手机端瞄准辅助） */
  private aimGraphics!: Phaser.GameObjects.Graphics;
  /** 本局机制提示队列（首次接触时逐条弹出） */
  private mechanicTipShown = false;
  private companionProtocol!: CompanionProtocolKey;
  private companionCharge = 0;
  private companionDrone?: Phaser.GameObjects.Image;
  private challengeContract!: ChallengeContractKey;
  private challengeContractDef!: ChallengeContractDef;
  /** 深渊词缀（关卡携带的全局修正） */
  private levelModifier!: LevelModifierDef;
  /** 保险协议是否已触发 */
  private insuranceUsed = false;
  /** 各类周期计时器 */
  private staticFieldTimer = 0;
  private eliteAuraTimer = 0;
  private supplyContractTimer = 0;
  private idleRepairAccumulator = 0;

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
  contractStatus = '';
  battlefieldEventStatus = '';
  battlefieldEventProgress = 0;
  battlefieldEventColor = 0xffffff;
  dailyChallengeStatus = '';
  dailyChallengeColor = 0xffffff;
  endlessStatus = '';
  endlessColor = 0xffa726;
  behaviorEquipmentLabel = '';
  behaviorEquipmentStatus = '';
  behaviorEquipmentColor = 0xce93d8;
  behaviorTelemetry = {
    volleys: 0,
    cryoBursts: 0,
    shrapnelBursts: 0,
    volatileBursts: 0,
    wallPulses: 0,
    salvageRepairs: 0,
    reflectionBlasts: 0,
  };
  companionStatus = '';
  companionColor = 0xffd54a;
  challengeContractStatus = '';
  companionTelemetry = {
    hunterShots: 0,
    vortexBursts: 0,
    controlledTargets: 0,
    medicRepairs: 0,
  };
  isDailyMode = false;
  isEndlessMode = false;
  private runOverdriveUses = 0;
  private runSynergiesActivated = 0;
  private runBossKills = 0;
  private runWavesCleared = 0;
  performanceStats: CombatPerformanceSnapshot = {
    enabled: false, fps: 60, lowFps: 60, enemies: 0, projectiles: 0, particles: 0, elites: 0,
  };

  private choosingUpgrade = false;
  private finished = false;
  /** 波次清空后、进入下一波/结算前的过渡态，防止每帧重复调度 */
  private transitioning = false;
  /** 战前免费选技能剩余次数 */
  private preGamePicksLeft = PRE_GAME_FREE_SKILLS;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData = {}): void {
    this.isEndlessMode = Boolean(data.endlessMode);
    this.isDailyMode = !this.isEndlessMode && Boolean(data.dailyChallengeDate);
    this.dailyChallenge = this.isDailyMode && data.dailyChallengeDate
      ? getDailyChallenge(data.dailyChallengeDate)
      : null;
    const generatedEndlessSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.endlessRun = this.isEndlessMode
      ? new EndlessRunSystem(data.endlessSeed ?? generatedEndlessSeed)
      : null;
    this.level = this.isEndlessMode
      ? ENDLESS_LEVEL
      : getLevel(this.dailyChallenge?.levelId ?? data.levelId ?? 1);
    const campaignLevel = this.isEndlessMode || this.isDailyMode
      ? Number.POSITIVE_INFINITY
      : this.level.id;
    this.ammoSlotActive = campaignLevel >= AMMO_SLOT_UNLOCK_LEVEL;
    this.wallSlotActive = campaignLevel >= WALL_SLOT_UNLOCK_LEVEL;
    const seededRun = this.dailyChallenge?.seed ?? this.endlessRun?.seed;
    if (seededRun !== undefined) {
      this.eventRandom = createSeededRandom(deriveSeed(seededRun, 'events'));
      this.skillRandom = createSeededRandom(deriveSeed(seededRun, 'skills'));
      this.eliteRandom = createSeededRandom(deriveSeed(seededRun, 'elites'));
      this.spawnRandom = createSeededRandom(deriveSeed(seededRun, 'spawns'));
      this.waveRandom = createSeededRandom(deriveSeed(seededRun, 'waves'));
    } else {
      this.eventRandom = Math.random;
      this.skillRandom = Math.random;
      this.eliteRandom = Math.random;
      this.spawnRandom = Math.random;
      this.waveRandom = Math.random;
    }
    this.runCoins = 0;
    this.behaviorLoadout = SaveManager.getBehaviorLoadout();
    this.equipmentVolleyCount = 0;
    this.equipmentProjectileCount = 0;
    this.cyclerHeat = 0;
    this.cyclerLockTimer = 0;
    this.wallModuleCooldown = 0;
    this.companionProtocol = SaveManager.getEquippedCompanionProtocol();
    this.companionCharge = 0;
    this.challengeContract = SaveManager.getChallengeContract();
    this.challengeContractDef = getChallengeContract(this.challengeContract);
    this.challengeContractStatus = this.challengeContractDef.key === 'none'
      ? '' : `挑战契约 · ${this.challengeContractDef.name}`;
    this.levelModifier = getLevelModifier(this.level);
    this.insuranceUsed = false;
    this.staticFieldTimer = 0;
    this.eliteAuraTimer = 0;
    this.supplyContractTimer = 0;
    this.idleRepairAccumulator = 0;
    this.mechanicTipShown = false;
    this.behaviorTelemetry = {
      volleys: 0,
      cryoBursts: 0,
      shrapnelBursts: 0,
      volatileBursts: 0,
      wallPulses: 0,
      salvageRepairs: 0,
      reflectionBlasts: 0,
    };
    this.companionTelemetry = {
      hunterShots: 0,
      vortexBursts: 0,
      controlledTargets: 0,
      medicRepairs: 0,
    };
    this.refreshCompanionStatus();
    this.choosingUpgrade = false;
    this.finished = false;
    this.transitioning = false;
    this.preGamePicksLeft = MetaUpgrades.preGamePicks();
    this.missileTimer = 0;
    this.airSupportTimer = 0;
    this.armorySupportTimer = 0;
    this.gravityWellTimer = 0;
    this.mineTimer = 0;
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
    this.gravityWells = [];
    this.deployedMines = [];
    this.thermalShockReadyAt = new WeakMap<Zombie, number>();
    this.damageTotals = this.createEmptyDamageTotals();
    const lastOffer = Math.max(1, this.level.waves.length - 1);
    this.contractOfferWaves = this.isEndlessMode ? new Set() : new Set([1, lastOffer]);
    this.contractWave = 0;
    this.contractStatus = '';
    this.performanceLowFps = 60;
    this.performanceSampleTimer = 0;
    this.performanceStats = {
      enabled: false, fps: 60, lowFps: 60, enemies: 0, projectiles: 0, particles: 0, elites: 0,
    };
    let eligibleEventWaves: number[];
    if (this.isEndlessMode) {
      eligibleEventWaves = [3, 7];
    } else {
      eligibleEventWaves = this.level.waves
        .map((wave, index) => ({ wave: index + 1, boss: !!wave.bossWave }))
        .filter((entry) => entry.wave > 1 && !entry.boss)
        .map((entry) => entry.wave);
      if (eligibleEventWaves.length < 2) {
        eligibleEventWaves = this.level.waves.map((_wave, index) => index + 1).filter((wave) => wave > 1);
      }
    }
    this.battlefieldEvents = new BattlefieldEventSystem(eligibleEventWaves, this.eventRandom);
    this.eventOverlay = undefined;
    this.supplyDrop = undefined;
    this.eventEnemySpeedMultiplier = 1;
    this.eventFireRateMultiplier = 1;
    this.eventEliteQuota = 0;
    this.eventEliteSpawned = 0;
    this.eventEliteKills = 0;
    this.waveStartDelay = 0;
    this.eventGameplayStarted = false;
    this.battlefieldEventStatus = '';
    this.battlefieldEventProgress = 0;
    this.battlefieldEventColor = 0xffffff;
    this.dailyChallengeStatus = this.dailyChallenge
      ? `每日 ${this.dailyChallenge.displayDate} · ${this.dailyChallenge.modifier.name} · #${this.dailyChallenge.code}`
      : '';
    this.dailyChallengeColor = this.dailyChallenge?.modifier.color ?? 0xffffff;
    this.endlessStatus = this.endlessRun ? `无尽 #${this.endlessRun.code} · 0 分 · 变异 0` : '';
    this.endlessColor = 0xffa726;
    this.runOverdriveUses = 0;
    this.runSynergiesActivated = 0;
    this.runBossKills = 0;
    this.runWavesCleared = 0;
  }

  create(): void {
    const modifierLabel = this.level.modifier ? ` · ${this.levelModifier.shortLabel}` : '';
    this.levelName = this.isEndlessMode ? '末日无尽' : `${this.level.name}${modifierLabel}`;
    this.wallMaxHp = Math.max(1, Math.round(
      MetaUpgrades.wallMaxHp()
        * this.challengeContractDef.wallHpMultiplier
        * this.levelModifier.wallHpMultiplier,
    ));
    this.wallHp = this.wallMaxHp;
    this.wallShield = MetaUpgrades.initialShield();

    this.createBackground();

    // 技能系统
    this.skills = new SkillSystem(this.skillRandom);
    this.skills.setLevelRerollDiscount(this.levelModifier.rerollDiscount);
    this.overdriveCharge = Math.min(
      100,
      MetaUpgrades.initialOverdrive()
        + (this.dailyChallenge?.modifier.initialOverdrive ?? 0)
        + this.levelModifier.initialOverdrive
        + (this.endlessRun ? 20 : 0),
    );
    this.overdriveReady = this.overdriveCharge >= 100;
    // 启动资金（局外养成）
    this.runCoins = MetaUpgrades.startingFund();
    // 老兵增援：开局随机获得技能
    this.applyVeteranStartSkills();
    this.skills.onRepair = (ratio) => {
      this.wallHp = Math.min(this.wallMaxHp, this.wallHp + Math.round(this.wallMaxHp * ratio));
      AudioSystem.play('heal');
    };
    this.skills.onWallCapacity = (ratio) => {
      const gain = Math.max(1, Math.round(this.wallMaxHp * ratio));
      this.wallMaxHp += gain;
      this.wallHp += gain;
      AudioSystem.play('upgrade', { volume: 0.5 });
    };
    this.skills.onSynergyActivated = (syn) => {
      this.runSynergiesActivated++;
      this.showSynergyNotification(syn);
      AudioSystem.play('synergy');
    };
    this.skills.onKillStreak = (streak) => {
      if (KILL_STREAK_THRESHOLDS.includes(streak)) {
        this.showKillStreakBanner(streak);
        AudioSystem.play('kill_streak');
        // 连杀盛宴：达到阈值获得金币与过载
        const feast = this.skills.streakFeastLevel;
        if (feast > 0) {
          const coins = 10 * feast + streak;
          this.runCoins += coins;
          this.grantOverdriveCharge(4 * feast);
          this.showEventRewardFeedback(`连杀盛宴 · +${coins} 金 · 过载 +${4 * feast}`, 0xffd54a);
        }
      }
    };

    this.waveManager = new WaveManager(this.level, 1, this.isEndlessMode, this.waveRandom);
    this.waveManager.onSpawn = (type) => this.spawnZombie(type);
    this.waveManager.onHordeStart = () => {
      this.isHordeActive = true;
      if (!this.hordeBannerShown) {
        this.hordeBannerShown = true;
        if (!this.waveManager.isBossWave) this.showHordeIntro();
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
    this.companionGraphics = this.add.graphics().setDepth(15);
    this.conductorGraphics = this.add.graphics().setDepth(4);
    this.bloodEmitter = this.add.particles(0, 0, 'blood', {
      speed: { min: 80, max: 280 }, lifespan: 450,
      scale: { start: 1.1, end: 0 }, quantity: 16, emitting: false,
    }).setDepth(13);
    this.explosionEmitter = this.add.particles(0, 0, 'explosion_particle', {
      speed: { min: 100, max: 320 }, lifespan: 450,
      scale: { start: 1.4, end: 0 }, quantity: 20, emitting: false,
      rotate: { min: 0, max: 360 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(13);
    this.sparkEmitter = this.add.particles(0, 0, 'impact_spark', {
      speed: { min: 180, max: 480 }, lifespan: { min: 170, max: 330 },
      scale: { start: 0.75, end: 0.08 }, quantity: 12, emitting: false,
      rotate: { min: 0, max: 360 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(14);
    this.smokeEmitter = this.add.particles(0, 0, 'smoke_puff', {
      speed: { min: 18, max: 72 }, lifespan: { min: 500, max: 900 },
      scale: { start: 0.35, end: 1.35 }, alpha: { start: 0.32, end: 0 },
      quantity: 5, emitting: false,
    }).setDepth(12);
    // 氛围粒子：飘落的灰烬
    this.ambientEmbers = [];
    for (let i = 0; i < 30; i++) {
      const e = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, WALL_Y),
        'ambient_mote'
      ).setDepth(-4).setAlpha(Phaser.Math.FloatBetween(0.08, 0.3))
        .setScale(Phaser.Math.FloatBetween(0.12, 0.5))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(this.level.bossLevel ? 0xff6d00 : 0x9fdbe8);
      this.ambientEmbers.push(e);
    }

    // 低血量红屏警告
    this.redVignette = this.add.graphics().setDepth(19).setAlpha(0);

    // 炮台
    this.cannon = new Cannon(this, this.skills);
    this.cannon.onFire = (x, y, angle) => this.fireBullet(x, y, angle);
    this.cannon.onVolley = (x, y, angle) => this.onEquipmentVolley(x, y, angle);
    // 瞄准线：虚线指向 + 落点标记，手机上拖拽瞄准更容易判断弹道
    this.aimGraphics = this.add.graphics().setDepth(10);
    this.drawAimLine();
    this.createSupportEmplacement();
    this.createCompanion();

    // 子弹 vs 僵尸
    this.physics.add.overlap(this.bullets, this.zombies, (bObj, zObj) => {
      this.onBulletHit(bObj as Bullet, zObj as Zombie);
    });

    // 导弹 vs 僵尸（追踪导弹命中后造成伤害并回收）
    this.physics.add.overlap(this.missiles, this.zombies, (mObj, zObj) => {
      const m = mObj as Bullet;
      const z = zObj as Zombie;
      if (!m.active || !z.active || z.hp <= 0 || z.dying) return;
      const died = this.dealDamage(z, m.damage, m.element, true);
      const source = (m.getData('damageSource') as DamageSourceKey | undefined) ?? 'missile';
      this.recordDamage(source, z);
      this.showDamageText(z.x, z.y - 30, Math.round(z.lastDamageTaken), false);
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

    if (this.dailyChallenge) this.showDailyChallengeIntro();
    else if (this.endlessRun) this.showEndlessIntro();
    // 战前免费选技能：选满 PRE_GAME_FREE_SKILLS 项后，提升怪物数量并开始第一波
    this.time.delayedCall(this.dailyChallenge || this.endlessRun ? 1650 : 600, () => this.showPreGameSkillSelection());
  }

  private showEndlessIntro(): void {
    const run = this.endlessRun;
    if (!run) return;
    const band = this.add.rectangle(GAME_WIDTH / 2, 250, GAME_WIDTH, 220, 0x071015, 0.94)
      .setDepth(24).setAlpha(0);
    const accent = this.add.rectangle(GAME_WIDTH / 2, 142, GAME_WIDTH, 5, 0xff6d00, 1)
      .setDepth(25).setAlpha(0);
    const title = this.add.text(GAME_WIDTH / 2, 184, '末 日 无 尽', {
      fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: '#ffb74d',
      stroke: '#071015', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const code = this.add.text(GAME_WIDTH / 2, 232, `本局编号 · #${run.code}`, {
      fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const danger = this.add.text(GAME_WIDTH / 2, 276, '威胁 · 5 波变异 · 10 波首领尸潮', {
      fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ff8a80',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const reward = this.add.text(GAME_WIDTH / 2, 314, '突破 · 修复防线 · 补充过载 · 稀有军火', {
      fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const elements: Phaser.GameObjects.GameObject[] = [band, accent, title, code, danger, reward];
    this.tweens.add({
      targets: elements, alpha: 1, duration: 180, yoyo: true, hold: 1040,
      onComplete: () => elements.forEach((element) => element.destroy()),
    });
    AudioSystem.play('boss', { volume: 0.7 });
  }

  private showDailyChallengeIntro(): void {
    const challenge = this.dailyChallenge;
    if (!challenge) return;
    const band = this.add.rectangle(GAME_WIDTH / 2, 250, GAME_WIDTH, 220, 0x071015, 0.94)
      .setDepth(24).setAlpha(0);
    const accent = this.add.rectangle(GAME_WIDTH / 2, 142, GAME_WIDTH, 5, challenge.modifier.color, 1)
      .setDepth(25).setAlpha(0);
    const title = this.add.text(GAME_WIDTH / 2, 184, `${challenge.displayDate} · 每日挑战`, {
      fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: challenge.modifier.colorHex,
      stroke: '#071015', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const modifier = this.add.text(GAME_WIDTH / 2, 232, challenge.modifier.name, {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const danger = this.add.text(GAME_WIDTH / 2, 276, `危险 · ${challenge.modifier.danger}`, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ff8a80',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const reward = this.add.text(
      GAME_WIDTH / 2,
      314,
      `增援 · ${challenge.modifier.boon}  ·  首胜 ${challenge.firstClearReward} 金`,
      { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#69f0ae' },
    ).setOrigin(0.5).setDepth(25).setAlpha(0);
    const elements: Phaser.GameObjects.GameObject[] = [band, accent, title, modifier, danger, reward];
    this.tweens.add({
      targets: elements, alpha: 1, duration: 180, yoyo: true, hold: 1040,
      onComplete: () => elements.forEach((element) => element.destroy()),
    });
    AudioSystem.play('wave', { volume: 0.72 });
  }

  private createBackground(): void {
    let pal = BIOME_PALETTE[this.level.biome] ?? BIOME_PALETTE.suburb;
    const equippedBackground = SaveManager.getEquippedArmoryItem('background');
    if (equippedBackground === 'bg_embers') {
      pal = { top: 0x24120f, bottom: 0x5a2a18, road: 0xff7a32, ground: 0x140a08 };
    } else if (equippedBackground === 'bg_neon') {
      pal = { top: 0x0a1020, bottom: 0x17384a, road: 0x4de7ff, ground: 0x070b13 };
    } else if (equippedBackground === 'bg_aurora') {
      pal = { top: 0x07141c, bottom: 0x164759, road: 0x80deea, ground: 0x071117 };
    } else if (equippedBackground === 'bg_eclipse') {
      pal = { top: 0x120c1d, bottom: 0x38224a, road: 0xb388ff, ground: 0x0b0710 };
    }
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(pal.top, pal.top, pal.bottom, pal.bottom, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 天际辉光和远处冷月，建立最远景层。
    const moonX = GAME_WIDTH * 0.78;
    const moonY = 144;
    bg.fillStyle(pal.road, 0.018).fillCircle(moonX, moonY, 122);
    bg.fillStyle(pal.road, 0.035).fillCircle(moonX, moonY, 82);
    bg.fillStyle(0xd9f2f2, 0.07).fillCircle(moonX, moonY, 48);
    bg.fillStyle(0x000000, 0.16).fillCircle(moonX + 14, moonY - 8, 42);
    bg.fillGradientStyle(pal.road, pal.road, pal.top, pal.top, 0.1);
    bg.fillRect(0, 178, GAME_WIDTH, 108);

    // 透视战斗通道：收束的路肩和导向线把视线拉向出生点。
    bg.fillStyle(pal.road, 0.045).fillPoints([
      new Phaser.Math.Vector2(GAME_WIDTH * 0.39, 86),
      new Phaser.Math.Vector2(GAME_WIDTH * 0.61, 86),
      new Phaser.Math.Vector2(GAME_WIDTH * 0.91, WALL_Y),
      new Phaser.Math.Vector2(GAME_WIDTH * 0.09, WALL_Y),
    ], true);
    bg.lineStyle(4, pal.road, 0.17);
    bg.lineBetween(GAME_WIDTH * 0.39, 90, GAME_WIDTH * 0.11, WALL_Y);
    bg.lineBetween(GAME_WIDTH * 0.61, 90, GAME_WIDTH * 0.89, WALL_Y);
    bg.lineStyle(2, 0xffffff, 0.035);
    bg.lineBetween(GAME_WIDTH * 0.45, 90, GAME_WIDTH * 0.28, WALL_Y);
    bg.lineBetween(GAME_WIDTH * 0.55, 90, GAME_WIDTH * 0.72, WALL_Y);
    // 纵深路面：中心车道、边缘碎石和远处雾带
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
    for (let y = 230; y < WALL_Y - 90; y += 145) {
      const spread = Phaser.Math.Linear(70, 300, y / WALL_Y);
      bg.fillStyle(pal.road, 0.28)
        .fillRoundedRect(GAME_WIDTH / 2 - spread, y, 13, 6, 3)
        .fillRoundedRect(GAME_WIDTH / 2 + spread - 13, y, 13, 6, 3);
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
    this.drawBiomeLandmarks(bg, pal.road);
    // 路边残骸/路灯剪影，给不同 biome 的色板提供可读的场景结构
    bg.fillStyle(0x000000, 0.32);
    bg.fillRect(54, WALL_Y - 210, 8, 210);
    bg.fillRect(48, WALL_Y - 210, 54, 7);
    bg.fillCircle(102, WALL_Y - 207, 14);
    bg.fillRect(GAME_WIDTH - 62, WALL_Y - 170, 8, 170);
    bg.fillRect(GAME_WIDTH - 112, WALL_Y - 170, 58, 7);
    bg.fillCircle(GAME_WIDTH - 112, WALL_Y - 167, 13);
    const equippedDecor = SaveManager.getEquippedArmoryItem('decor');
    if (equippedDecor === 'decor_floodlights') {
      bg.fillStyle(0xfff3b0, 0.075).fillTriangle(102, WALL_Y - 198, 250, WALL_Y, 24, WALL_Y);
      bg.fillStyle(0xb3e5fc, 0.07).fillTriangle(GAME_WIDTH - 112, WALL_Y - 158, GAME_WIDTH - 22, WALL_Y, GAME_WIDTH - 280, WALL_Y);
      bg.fillStyle(0xffd54a, 0.8).fillCircle(102, WALL_Y - 207, 8);
      bg.fillStyle(0x80d8ff, 0.8).fillCircle(GAME_WIDTH - 112, WALL_Y - 167, 8);
    } else if (equippedDecor === 'decor_banners') {
      bg.fillStyle(0x263238, 1).fillRect(42, WALL_Y - 152, 7, 152).fillRect(GAME_WIDTH - 49, WALL_Y - 152, 7, 152);
      bg.fillStyle(0xb71c1c, 0.9)
        .fillTriangle(49, WALL_Y - 146, 49, WALL_Y - 74, 126, WALL_Y - 118)
        .fillTriangle(GAME_WIDTH - 49, WALL_Y - 146, GAME_WIDTH - 49, WALL_Y - 74, GAME_WIDTH - 126, WALL_Y - 118);
      bg.fillStyle(0xffd54a, 0.8).fillCircle(78, WALL_Y - 113, 8).fillCircle(GAME_WIDTH - 78, WALL_Y - 113, 8);
    } else if (equippedDecor === 'decor_radar') {
      const radar = this.add.image(GAME_WIDTH - 88, WALL_Y + 86, 'icon_radar').setDepth(11).setScale(0.82);
      this.tweens.add({ targets: radar, angle: 360, duration: 2600, repeat: -1, ease: 'Linear' });
      bg.lineStyle(3, 0x69f0ae, 0.28).strokeCircle(GAME_WIDTH - 88, WALL_Y + 86, 54);
    } else if (equippedDecor === 'decor_memorial') {
      const memorial = this.add.image(GAME_WIDTH / 2, WALL_Y + 82, 'icon_memorial').setDepth(11).setScale(0.92);
      this.tweens.add({ targets: memorial, alpha: 0.62, duration: 720, yoyo: true, repeat: -1 });
      bg.fillStyle(0xffb74d, 0.08).fillCircle(GAME_WIDTH / 2, WALL_Y + 72, 82);
    }
    // 基地常亮探照灯把墙前区域从背景中切出来。
    bg.fillStyle(0xffe082, 0.035).fillTriangle(70, WALL_Y, 245, WALL_Y - 370, 330, WALL_Y);
    bg.fillStyle(0x80deea, 0.028).fillTriangle(GAME_WIDTH - 70, WALL_Y, GAME_WIDTH - 245, WALL_Y - 340, GAME_WIDTH - 350, WALL_Y);
    bg.fillStyle(0xffca28, 0.5)
      .fillRoundedRect(16, WALL_Y - 18, 26, 7, 3)
      .fillRoundedRect(GAME_WIDTH - 42, WALL_Y - 18, 26, 7, 3);
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

  private drawBiomeLandmarks(bg: Phaser.GameObjects.Graphics, accent: number): void {
    bg.lineStyle(3, accent, 0.13);
    bg.lineBetween(80, WALL_Y, 275, 90);
    bg.lineBetween(GAME_WIDTH - 80, WALL_Y, GAME_WIDTH - 275, 90);
    bg.lineStyle(2, 0x000000, 0.26);
    for (let y = 260; y < WALL_Y - 80; y += 170) {
      const x = Phaser.Math.Between(160, GAME_WIDTH - 160);
      bg.lineBetween(x - 35, y, x + 8, y + 24);
      bg.lineBetween(x + 8, y + 24, x - 18, y + 54);
    }

    bg.fillStyle(0x05090c, 0.62);
    switch (this.level.biome) {
      case 'gas':
        bg.fillRect(36, 150, 220, 18).fillRect(58, 168, 14, 128).fillRect(218, 168, 14, 128);
        bg.fillStyle(accent, 0.28).fillRoundedRect(96, 214, 42, 70, 5).fillRoundedRect(158, 214, 42, 70, 5);
        break;
      case 'town':
        bg.fillTriangle(34, 260, 126, 178, 220, 260).fillRect(52, 260, 150, 112);
        bg.fillTriangle(492, 238, 570, 166, 666, 238).fillRect(510, 238, 136, 128);
        break;
      case 'tunnel':
        bg.lineStyle(30, 0x030609, 0.72).strokeEllipse(GAME_WIDTH / 2, 330, 620, 520);
        bg.lineStyle(5, accent, 0.13).strokeEllipse(GAME_WIDTH / 2, 330, 540, 450);
        bg.fillStyle(accent, 0.35).fillRect(74, 218, 42, 10).fillRect(GAME_WIDTH - 116, 218, 42, 10);
        break;
      case 'bridge':
        bg.fillRect(34, 170, 18, 550).fillRect(GAME_WIDTH - 52, 170, 18, 550);
        bg.lineStyle(5, 0x05090c, 0.65).lineBetween(43, 190, 215, 640).lineBetween(GAME_WIDTH - 43, 190, GAME_WIDTH - 215, 640);
        bg.lineStyle(3, accent, 0.18).lineBetween(54, 360, 220, 360).lineBetween(GAME_WIDTH - 54, 360, GAME_WIDTH - 220, 360);
        break;
      case 'graveyard':
        for (let i = 0; i < 9; i++) {
          const x = 42 + i * 78;
          const y = 220 + (i % 3) * 78;
          bg.fillRoundedRect(x, y, 34, 54, 8).fillRect(x - 8, y + 48, 50, 9);
        }
        break;
      case 'factory':
        bg.fillRect(40, 150, 86, 240).fillRect(150, 205, 150, 180).fillRect(570, 125, 64, 270);
        bg.fillStyle(accent, 0.26).fillRect(64, 180, 28, 160).fillRect(594, 155, 18, 190);
        bg.lineStyle(12, 0x05090c, 0.62).lineBetween(126, 245, 570, 245);
        break;
      case 'hospital':
        bg.fillRect(74, 142, 244, 246).fillRect(412, 188, 224, 198);
        bg.fillStyle(accent, 0.32).fillRect(178, 174, 34, 100).fillRect(145, 207, 100, 34);
        for (let x = 438; x < 610; x += 48) bg.fillRect(x, 224, 24, 36);
        break;
      case 'city':
        for (let i = 0; i < 7; i++) {
          const x = i * 112 - 18;
          const h = 150 + (i % 3) * 65;
          bg.fillRect(x, 410 - h, 90, h);
          bg.fillStyle(accent, 0.24).fillRect(x + 18, 440 - h, 12, 22).fillRect(x + 52, 470 - h, 12, 22);
          bg.fillStyle(0x05090c, 0.62);
        }
        break;
      case 'throne':
        for (let i = 0; i < 11; i++) {
          const x = i * 72 - 18;
          bg.fillTriangle(x, 382, x + 34, 180 + (i % 2) * 70, x + 68, 382);
        }
        bg.fillStyle(accent, 0.2).fillTriangle(278, 380, 360, 116, 442, 380);
        break;
      default:
        bg.fillRect(42, 184, 14, 176).fillRect(GAME_WIDTH - 56, 184, 14, 176);
        bg.fillStyle(accent, 0.24).fillTriangle(72, 280, 122, 190, 172, 280).fillTriangle(548, 280, 598, 190, 648, 280);
        break;
    }
  }

  private createSupportEmplacement(): void {
    const support = SaveManager.getEquippedArmoryItem('support');
    if (support === 'none') return;
    const icons: Record<string, string> = {
      support_sentry: 'icon_support_sentry',
      support_tesla: 'icon_support_tesla',
      support_mortar: 'icon_support_mortar',
      support_cryo: 'icon_support_cryo',
      support_plasma: 'icon_support_plasma',
      support_drones: 'icon_support_drones',
    };
    const icon = icons[support] ?? 'icon_support_sentry';
    this.add.image(112, WALL_Y + 95, icon).setDepth(10).setScale(0.9);
    const pad = this.add.graphics().setDepth(9);
    pad.fillStyle(0x17252d, 1).fillRoundedRect(64, WALL_Y + 120, 96, 24, 7);
    pad.lineStyle(2, 0x607d8b, 0.8).strokeRoundedRect(64, WALL_Y + 120, 96, 24, 7);
  }

  private updateArmorySupport(dt: number, alive: Zombie[]): void {
    const support = SaveManager.getEquippedArmoryItem('support');
    if (support === 'none' || alive.length === 0) return;
    this.armorySupportTimer += dt;
    const intervals: Record<string, number> = {
      support_sentry: 0.72,
      support_tesla: 1.8,
      support_mortar: 3.1,
      support_cryo: 2.35,
      support_plasma: 2.75,
      support_drones: 1.15,
    };
    const interval = intervals[support] ?? 1.5;
    if (this.armorySupportTimer < interval) return;
    this.armorySupportTimer = 0;

    if (support === 'support_sentry') {
      const target = [...alive].sort((a, b) => b.y - a.y)[0];
      this.supportGraphics.lineStyle(4, 0xffd54a, 0.9).lineBetween(112, WALL_Y + 50, target.x, target.y);
      const died = this.dealDamage(target, this.skills.damage * 0.55, 'kinetic');
      this.recordDamage('support', target);
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
        const died = this.dealDamage(target, this.skills.damage * 0.48, 'lightning');
        this.recordDamage('support', target);
        if (died) this.killZombie(target);
        fromX = target.x; fromY = target.y;
      }
      this.time.delayedCall(110, () => this.supportGraphics.clear());
      AudioSystem.play('lightning', { volume: 0.45 });
      return;
    }

    if (support === 'support_cryo') {
      const anchor = [...alive].sort((a, b) => b.y - a.y)[0];
      const targets = alive.filter((target) =>
        Phaser.Math.Distance.Between(anchor.x, anchor.y, target.x, target.y) <= 155);
      const pulse = this.add.image(anchor.x, anchor.y, 'shockwave')
        .setDepth(13).setTint(0x80deea).setScale(0.32).setAlpha(0.85);
      this.tweens.add({ targets: pulse, scale: 1.55, alpha: 0, duration: 360, onComplete: () => pulse.destroy() });
      targets.forEach((target) => {
        const died = this.dealDamage(target, this.skills.damage * 0.5, 'frost', true);
        this.recordDamage('support', target);
        if (died) this.killZombie(target);
        else target.applySlow(0.38, 2.6);
      });
      AudioSystem.play('hit', { volume: 0.4 });
      return;
    }

    if (support === 'support_plasma') {
      const target = [...alive].sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield))[0];
      this.supportGraphics.lineStyle(12, 0xce93d8, 0.2).lineBetween(112, WALL_Y + 50, target.x, target.y);
      this.supportGraphics.lineStyle(4, 0xffffff, 0.95).lineBetween(112, WALL_Y + 50, target.x, target.y);
      const died = this.dealDamage(target, this.skills.damage * 1.65, 'energy');
      this.recordDamage('support', target);
      if (died) this.killZombie(target);
      this.time.delayedCall(120, () => this.supportGraphics.clear());
      AudioSystem.play('crit', { volume: 0.5 });
      return;
    }

    if (support === 'support_drones') {
      const targets = [...alive].sort((a, b) => b.y - a.y).slice(0, 4);
      targets.forEach((target) => {
        this.supportGraphics.lineStyle(2, 0x69f0ae, 0.85).lineBetween(112, WALL_Y + 50, target.x, target.y);
        const died = this.dealDamage(target, this.skills.damage * 0.34, 'kinetic');
        this.recordDamage('support', target);
        if (died) this.killZombie(target);
      });
      this.time.delayedCall(80, () => this.supportGraphics.clear());
      AudioSystem.play('shoot', { volume: 0.3 });
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
      const died = this.dealDamage(zombie, damage * (1 - dist / 180), 'explosive', true);
      this.recordDamage('support', zombie);
      if (died) this.killZombie(zombie);
    }
    this.cameras.main.shake(90, 0.004);
    AudioSystem.play('explosion', { volume: 0.45 });
  }

  private createCompanion(): void {
    const protocol = getCompanionProtocol(this.companionProtocol);
    if (!protocol) return;
    const homeX = GAME_WIDTH - 108;
    const homeY = WALL_Y + 83;
    this.companionDrone = this.add.image(homeX, homeY, 'icon_drone_swarm')
      .setDepth(11).setScale(0.74).setTint(protocol.color);
    this.add.text(homeX, homeY + 43, 'R-7', {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#b0bec5',
      stroke: '#071015', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);
    this.tweens.add({
      targets: this.companionDrone,
      y: homeY - 9,
      angle: 3,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private refreshCompanionStatus(): void {
    const protocol = getCompanionProtocol(this.companionProtocol);
    if (!protocol) {
      this.companionStatus = '';
      return;
    }
    this.companionColor = protocol.color;
    this.companionStatus = this.companionCharge >= protocol.threshold
      ? `R-7 · ${protocol.shortName}就绪`
      : `R-7 · ${protocol.shortName} ${this.companionCharge}/${protocol.threshold}`;
  }

  private chargeCompanion(source: 'hit' | 'kill'): void {
    const protocol = getCompanionProtocol(this.companionProtocol);
    if (!protocol || protocol.chargeSource !== source) return;
    this.companionCharge = Math.min(protocol.threshold, this.companionCharge + 1);
    if (this.companionCharge < protocol.threshold) {
      this.refreshCompanionStatus();
      return;
    }

    let triggered = false;
    switch (this.companionProtocol) {
      case 'companion_hunter': triggered = this.triggerCompanionHunter(); break;
      case 'companion_vortex': triggered = this.triggerCompanionVortex(); break;
      case 'companion_medic': triggered = this.triggerCompanionMedic(); break;
      case 'companion_bomber': triggered = this.triggerCompanionBomber(); break;
      case 'companion_arc': triggered = this.triggerCompanionArc(); break;
      case 'companion_guardian': triggered = this.triggerCompanionGuardian(); break;
    }
    if (triggered) this.companionCharge = 0;
    this.refreshCompanionStatus();
  }

  private triggerCompanionHunter(): boolean {
    const targets = this.aliveZombies();
    if (targets.length === 0) return false;
    const target = [...targets].sort((a, b) => {
      const score = (zombie: Zombie): number => zombie.y
        + (1 - zombie.hp / Math.max(1, zombie.maxHp)) * 230
        + (zombie.isBoss ? 120 : 0)
        + (zombie.eliteAffix ? 65 : 0);
      return score(b) - score(a);
    })[0];
    const hpRatio = target.hp / Math.max(1, target.maxHp);
    const damage = hpRatio <= 0.2
      ? Math.max(this.skills.damage * 1.4, target.maxHp * 2 + target.shield)
      : this.skills.damage * 1.4;
    this.companionGraphics.clear();
    this.companionGraphics.lineStyle(11, 0xffd54a, 0.22)
      .lineBetween(this.companionDrone?.x ?? GAME_WIDTH - 108, this.companionDrone?.y ?? WALL_Y + 83, target.x, target.y);
    this.companionGraphics.lineStyle(3, 0xffffff, 0.95)
      .lineBetween(this.companionDrone?.x ?? GAME_WIDTH - 108, this.companionDrone?.y ?? WALL_Y + 83, target.x, target.y);
    this.time.delayedCall(100, () => this.companionGraphics.clear());
    const died = this.dealDamage(target, damage, 'energy');
    this.recordDamage('companion', target);
    this.showCompanionFeedback(target.x, target.y - 38, `追猎 ${Math.round(target.lastDamageTaken)}`, 0xffd54a);
    this.companionTelemetry.hunterShots++;
    this.hitStop(28);
    if (died) this.killZombie(target);
    AudioSystem.play('crit', { volume: 0.55 });
    return true;
  }

  private triggerCompanionVortex(): boolean {
    const alive = this.aliveZombies();
    if (alive.length === 0) return false;
    let anchor = alive[0];
    let bestScore = -Infinity;
    for (const candidate of alive) {
      const nearby = alive.reduce((count, target) => count
        + (Phaser.Math.Distance.Between(candidate.x, candidate.y, target.x, target.y) <= 190 ? 1 : 0), 0);
      const score = nearby * 1000 + candidate.y;
      if (score > bestScore) {
        bestScore = score;
        anchor = candidate;
      }
    }
    const targets = alive
      .filter((target) => Phaser.Math.Distance.Between(anchor.x, anchor.y, target.x, target.y) <= 190)
      .sort((a, b) => b.y - a.y)
      .slice(0, 9);
    const field = this.add.image(anchor.x, anchor.y, 'gravity_field')
      .setDepth(12).setTint(0xb388ff).setScale(0.28).setAlpha(0.9);
    this.tweens.add({
      targets: field, scale: 1.35, alpha: 0, duration: 620,
      onComplete: () => field.destroy(),
    });
    this.companionGraphics.clear();
    this.companionGraphics.lineStyle(3, 0xb388ff, 0.85)
      .lineBetween(this.companionDrone?.x ?? GAME_WIDTH - 108, this.companionDrone?.y ?? WALL_Y + 83, anchor.x, anchor.y);
    this.time.delayedCall(150, () => this.companionGraphics.clear());
    targets.forEach((target) => {
      target.x = Phaser.Math.Clamp(anchor.x + (target.x - anchor.x) * 0.48, 40, GAME_WIDTH - 40);
      const died = this.dealDamage(target, this.skills.damage * 0.22, 'gravity', true);
      this.recordDamage('companion', target);
      if (died) this.killZombie(target);
      else {
        target.applyKnockback(42);
        target.applySlow(0.42, 2.5);
      }
    });
    this.companionTelemetry.vortexBursts++;
    this.companionTelemetry.controlledTargets += targets.length;
    this.showCompanionFeedback(anchor.x, anchor.y - 58, `磁暴聚束 ×${targets.length}`, 0xb388ff);
    this.cameras.main.shake(120, 0.005);
    AudioSystem.play('lightning', { volume: 0.52 });
    return true;
  }

  private triggerCompanionMedic(): boolean {
    const shieldCap = this.wallMaxHp * 0.45;
    if (this.wallHp >= this.wallMaxHp && this.wallShield >= shieldCap) return false;
    const repaired = Math.min(
      Math.max(0, this.wallMaxHp - this.wallHp),
      Math.max(1, Math.round(this.wallMaxHp * 0.04)),
    );
    const shieldBefore = this.wallShield;
    this.wallHp += repaired;
    this.wallShield = Math.min(shieldCap, this.wallShield + this.wallMaxHp * 0.03);
    const shieldGained = Math.round(this.wallShield - shieldBefore);
    const drone = this.add.image(this.companionDrone?.x ?? GAME_WIDTH - 108, this.companionDrone?.y ?? WALL_Y + 83, 'icon_drone_swarm')
      .setDepth(18).setScale(0.72).setTint(0x69f0ae);
    this.tweens.add({
      targets: drone,
      x: GAME_WIDTH / 2,
      y: WALL_Y + 20,
      scale: 1.05,
      duration: 260,
      yoyo: true,
      hold: 120,
      onComplete: () => drone.destroy(),
    });
    this.showShieldActivateEffect();
    this.showCompanionFeedback(
      GAME_WIDTH / 2,
      WALL_Y - 40,
      `急救 +${repaired} · 护盾 +${shieldGained}`,
      0x69f0ae,
    );
    this.companionTelemetry.medicRepairs++;
    AudioSystem.play('heal', { volume: 0.58 });
    return true;
  }

  private triggerCompanionBomber(): boolean {
    const alive = this.aliveZombies();
    if (alive.length === 0) return false;
    let anchor = alive[0];
    let bestCount = 0;
    for (const candidate of alive) {
      const count = alive.filter((target) =>
        Phaser.Math.Distance.Between(candidate.x, candidate.y, target.x, target.y) <= 170).length;
      if (count > bestCount) { bestCount = count; anchor = candidate; }
    }
    this.explosionEmitter.setPosition(anchor.x, anchor.y).setParticleTint(0xff8a65).explode(24);
    const targets = alive.filter((target) =>
      Phaser.Math.Distance.Between(anchor.x, anchor.y, target.x, target.y) <= 170);
    targets.forEach((target) => {
      const died = this.dealDamage(target, this.skills.damage * 0.92, 'explosive', true);
      this.recordDamage('companion', target);
      if (died) this.killZombie(target);
    });
    this.showCompanionFeedback(anchor.x, anchor.y - 52, `轰炸清场 ×${targets.length}`, 0xff8a65);
    this.cameras.main.shake(160, 0.007);
    AudioSystem.play('explosion', { volume: 0.58 });
    return true;
  }

  private triggerCompanionArc(): boolean {
    const targets = [...this.aliveZombies()].sort((a, b) => b.y - a.y).slice(0, 7);
    if (targets.length === 0) return false;
    let fromX = this.companionDrone?.x ?? GAME_WIDTH - 108;
    let fromY = this.companionDrone?.y ?? WALL_Y + 83;
    this.companionGraphics.clear();
    targets.forEach((target, index) => {
      this.companionGraphics.lineStyle(index === 0 ? 6 : 3, 0xffee58, 0.9)
        .lineBetween(fromX, fromY, target.x, target.y);
      const died = this.dealDamage(target, this.skills.damage * (0.78 - index * 0.055), 'lightning');
      this.recordDamage('companion', target);
      if (died) this.killZombie(target);
      fromX = target.x; fromY = target.y;
    });
    this.time.delayedCall(150, () => this.companionGraphics.clear());
    this.showCompanionFeedback(targets[0].x, targets[0].y - 52, `链闪 ×${targets.length}`, 0xffee58);
    AudioSystem.play('lightning', { volume: 0.58 });
    return true;
  }

  private triggerCompanionGuardian(): boolean {
    const shieldCap = this.wallMaxHp * 0.75;
    const before = this.wallShield;
    this.wallShield = Math.min(shieldCap, this.wallShield + this.wallMaxHp * 0.12);
    const targets = this.aliveZombies().filter((target) => WALL_Y - target.y <= 360);
    targets.forEach((target) => target.applyKnockback(115 + this.skills.repulsionBonus));
    const gained = Math.round(this.wallShield - before);
    if (gained <= 0 && targets.length === 0) return false;
    this.showShieldActivateEffect();
    this.showCompanionFeedback(GAME_WIDTH / 2, WALL_Y - 42, `守护 +${gained} · 击退 ${targets.length}`, 0x80deea);
    AudioSystem.play('wave', { volume: 0.5 });
    return true;
  }

  private showCompanionFeedback(x: number, y: number, message: string, color: number): void {
    const label = this.add.text(x, y, message, {
      fontFamily: FONT, fontSize: '21px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#071015', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: label, y: y - 34, alpha: 0, duration: 760,
      onComplete: () => label.destroy(),
    });
  }

  private updateConductorAuras(alive: Zombie[]): void {
    this.conductorGraphics.clear();
    for (const zombie of alive) zombie.setDamageReduction(0);
    const conductors = alive.filter((zombie) => zombie.isBehavior('conductor') && !zombie.dying);
    const pulse = 0.55 + Math.sin(this.time.now * 0.006) * 0.15;
    for (const conductor of conductors) {
      this.conductorGraphics.lineStyle(3, 0x4dd0e1, pulse).strokeCircle(
        conductor.x, conductor.y, CONDUCTOR_AURA_RANGE,
      );
      this.conductorGraphics.lineStyle(10, 0x26c6da, 0.06).strokeCircle(
        conductor.x, conductor.y, CONDUCTOR_AURA_RANGE - 6,
      );
      for (const zombie of alive) {
        if (zombie === conductor || zombie.dying) continue;
        if (Phaser.Math.Distance.Between(conductor.x, conductor.y, zombie.x, zombie.y) <= CONDUCTOR_AURA_RANGE) {
          zombie.setDamageReduction(CONDUCTOR_DAMAGE_REDUCTION);
        }
      }
    }
  }

  private updateGravityWells(dt: number, alive: Zombie[]): void {
    if (this.skills.gravityWellInterval < Infinity && alive.length > 0) {
      this.gravityWellTimer += dt;
      if (this.gravityWellTimer >= this.skills.gravityWellInterval) {
        this.gravityWellTimer = 0;
        const candidates = alive.filter((zombie) => !zombie.burrowed && !zombie.dying);
        if (candidates.length > 0) {
          let target = candidates[0];
          let bestScore = -1;
          const step = Math.max(1, Math.floor(candidates.length / 18));
          for (let i = 0; i < candidates.length; i += step) {
            const candidate = candidates[i];
            let score = 0;
            for (const zombie of candidates) {
              if (Phaser.Math.Distance.Between(candidate.x, candidate.y, zombie.x, zombie.y) < 170) score++;
            }
            if (score > bestScore) { bestScore = score; target = candidate; }
          }
          const sprite = this.add.image(target.x, target.y, 'gravity_field')
            .setDepth(3).setScale(0.6).setAlpha(0.88);
          this.gravityWells.push({ sprite, x: target.x, y: target.y, timer: 3.8, tick: 0 });
          this.cameras.main.flash(100, 126, 87, 194, false);
          AudioSystem.play('synergy', { volume: 0.4 });
        }
      }
    }

    for (let i = this.gravityWells.length - 1; i >= 0; i--) {
      const well = this.gravityWells[i];
      well.timer -= dt;
      well.tick -= dt;
      well.sprite.rotation += dt * 2.4;
      well.sprite.setScale(0.72 + Math.sin(this.time.now * 0.01 + i) * 0.08);
      const damageTick = well.tick <= 0;
      if (damageTick) well.tick = 0.42;
      for (const zombie of alive) {
        if (!zombie.active || zombie.hp <= 0 || zombie.dying || zombie.burrowed) continue;
        const dist = Phaser.Math.Distance.Between(well.x, well.y, zombie.x, zombie.y);
        if (dist >= this.skills.gravityWellRadius || dist < 4) continue;
        const pull = 125 * dt * (1 - dist / this.skills.gravityWellRadius);
        zombie.x += ((well.x - zombie.x) / dist) * pull;
        zombie.y += ((well.y - zombie.y) / dist) * pull * 0.6;
        if (damageTick) {
          const died = this.dealDamage(zombie, this.skills.gravityWellDamage, 'gravity', true);
          this.recordDamage('gravity', zombie);
          if (died) this.killZombie(zombie);
        }
      }
      if (well.timer <= 0) {
        if (this.skills.hasSynergy('singularityBomb')) this.doExplosion(well.x, well.y, 'gravity');
        well.sprite.destroy();
        this.gravityWells.splice(i, 1);
      }
    }
  }

  private updateMinefield(dt: number, alive: Zombie[]): void {
    if (this.skills.mineInterval === Infinity) return;
    this.mineTimer += dt;
    if (this.mineTimer >= this.skills.mineInterval && this.deployedMines.length < this.skills.mineLimit) {
      this.mineTimer = 0;
      const mine = this.add.image(
        Phaser.Math.Between(72, GAME_WIDTH - 72),
        Phaser.Math.Between(WALL_Y - 260, WALL_Y - 95),
        'field_mine',
      ).setDepth(2).setScale(0.72).setAlpha(0.9);
      this.deployedMines.push(mine);
      this.tweens.add({ targets: mine, alpha: 0.55, duration: 420, yoyo: true, repeat: 2 });
    }

    for (let i = this.deployedMines.length - 1; i >= 0; i--) {
      const mine = this.deployedMines[i];
      const target = alive.find((zombie) => zombie.active && zombie.hp > 0
        && Phaser.Math.Distance.Between(mine.x, mine.y, zombie.x, zombie.y) <= 58);
      if (!target) continue;
      this.deployedMines.splice(i, 1);
      mine.destroy();
      this.detonateMine(target.x, target.y, alive);
    }
  }

  private detonateMine(x: number, y: number, alive: Zombie[]): void {
    const radius = 128;
    this.explosionEmitter.setPosition(x, y)
      .setParticleTint(this.skills.hasSynergy('cryoMine') ? 0x80deea : 0xffca28).explode(22);
    for (const zombie of alive) {
      if (!zombie.active || zombie.hp <= 0 || zombie.dying) continue;
      const dist = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (dist > radius) continue;
      if (zombie.burrowed) zombie.forceSurface();
      const mineFalloff = Math.max(this.skills.clusterEdgeFloor, 1 - dist / 180);
      const died = this.dealDamage(zombie, this.skills.mineDamage * mineFalloff, 'explosive', true);
      this.recordDamage('mine', zombie);
      if (!died && this.skills.hasSynergy('cryoMine')) zombie.applySlow(0.48, 3.2);
      if (died) this.killZombie(zombie);
    }
    this.cameras.main.shake(130, 0.007);
    AudioSystem.play('explosion', { volume: 0.6 });
  }

  private applyFieldMedicIfReady(): void {
    const interval = this.skills.fieldMedicKillInterval;
    if (interval === Infinity || this.skills.totalKills === 0 || this.skills.totalKills % interval !== 0) return;
    const repaired = Math.max(1, Math.round(this.wallMaxHp * this.skills.fieldMedicRepairRatio));
    this.wallHp = Math.min(this.wallMaxHp, this.wallHp + repaired);
    if (this.skills.hasSynergy('fieldHospital')) {
      this.wallShield = Math.min(this.wallMaxHp * 0.75, this.wallShield + repaired * 0.7);
      this.showShieldActivateEffect();
    }
    const label = this.add.text(GAME_WIDTH / 2, WALL_Y - 34, `战地修复 +${repaired}`, {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#69f0ae',
      stroke: '#102218', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: label, y: label.y - 42, alpha: 0, duration: 850, onComplete: () => label.destroy() });
    AudioSystem.play('heal', { volume: 0.55 });
  }

  // ─── 波次 ───

  private beginWave(): void {
    if (this.finished) return;
    if (this.endlessRun) {
      this.waveManager.setMonsterMultiplier(
        PRE_GAME_MONSTER_MULTIPLIER
        * this.endlessRun.countMultiplier
        * this.challengeContractDef.enemyCountMultiplier,
      );
      if ((this.waveManager.currentWave + 1) % 5 === 0) this.hordeBannerShown = false;
    }
    const started = this.waveManager.startNextWave();
    if (!started) return;
    const waveTotalLabel = this.isEndlessMode ? '∞' : `${this.waveManager.totalWaves}`;
    this.waveLabel = `${this.waveManager.currentWave}/${waveTotalLabel}`;
    this.isHordeActive = this.waveManager.isHordeWave;

    // 每波重置免费重铸；晨间加固补盾；军需官补给金币
    this.skills.resetWaveReroll();
    if (this.skills.dawnShieldAmount > 0) {
      this.wallShield = Math.min(this.wallMaxHp * 0.6, this.wallShield + this.skills.dawnShieldAmount);
      this.showShieldActivateEffect();
    }
    if (this.skills.quartermasterWaveCoins > 0) {
      this.runCoins += this.skills.quartermasterWaveCoins;
    }

    // 检测当前波是否为 bossWave
    const isBossWave = this.waveManager.isBossWave;
    this.isBossWave = isBossWave;

    if (isBossWave) {
      this.showBossIntro(this.isHordeActive);
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

    if (!isBossWave) {
      const bannerText = this.isHordeActive
        ? `尸潮来袭 · ${this.waveManager.currentWave}/${waveTotalLabel}`
        : `第 ${this.waveManager.currentWave} 波`;
      const banner = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, bannerText, {
          fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#ffd54a',
          stroke: '#1a2530', strokeThickness: 8,
        })
        .setOrigin(0.5).setDepth(20).setAlpha(0);
      this.tweens.add({
        targets: banner, alpha: 1, duration: 250, yoyo: true, hold: 700,
        onComplete: () => banner.destroy(),
      });
    }
    // Boss 波全屏震动
    if (isBossWave) {
      this.cameras.main.shake(400, 0.012);
    }
    if (this.waveManager.currentWave === 1) this.scheduleMechanicTips();
    this.activateScheduledBattlefieldEvent();
  }

  private showBossIntro(hordeWave = false): void {
    // 全屏红色闪烁 + 缩放警告
    const flash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff1744, 0.4
    ).setDepth(22);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 500, ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
    const warn = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.27,
      hordeWave ? '⚠ 首领尸潮 ⚠' : '⚠ 首领来袭 ⚠',
      {
      fontFamily: FONT, fontSize: hordeWave ? '64px' : '72px', fontStyle: 'bold', color: '#ff1744',
      stroke: '#1a2530', strokeThickness: 12,
      },
    ).setOrigin(0.5).setDepth(23).setScale(0.2);
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

  // ─── 随机战场事件 ───

  private activateScheduledBattlefieldEvent(): void {
    const active = this.battlefieldEvents.startWave(this.waveManager.currentWave);
    if (!active) return;
    this.eventEliteQuota = active.def.key === 'eliteHunt' ? 4 : 0;
    this.eventEliteSpawned = 0;
    this.eventEliteKills = 0;
    this.eventEnemySpeedMultiplier = active.def.key === 'infectionStorm' ? 1.18 : 1;
    this.eventFireRateMultiplier = active.def.key === 'blackout' ? 0.65 : 1;
    this.waveStartDelay = 2.55;
    this.eventGameplayStarted = false;
    this.battlefieldEventColor = active.def.color;
    this.battlefieldEventProgress = 1;
    this.updateBattlefieldEventStatus(active);
    this.time.delayedCall(1000, () => {
      if (this.finished || this.battlefieldEvents.active !== active) return;
      this.showBattlefieldEventIntro(active);
    });
  }

  private showBattlefieldEventIntro(active: ActiveBattlefieldEvent): void {
    const band = this.add.rectangle(GAME_WIDTH / 2, 240, GAME_WIDTH, 178, 0x081015, 0.9)
      .setDepth(24).setAlpha(0);
    const accent = this.add.rectangle(GAME_WIDTH / 2, 154, GAME_WIDTH, 5, active.def.color, 1)
      .setDepth(25).setAlpha(0);
    const title = this.add.text(GAME_WIDTH / 2, 192, active.def.name, {
      fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: active.def.colorHex,
      stroke: '#071015', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const danger = this.add.text(GAME_WIDTH / 2, 244, `危险 · ${active.def.danger}`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ff8a80',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const reward = this.add.text(GAME_WIDTH / 2, 282, `回报 · ${active.def.reward}`, {
      fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(25).setAlpha(0);
    const elements: Phaser.GameObjects.GameObject[] = [band, accent, title, danger, reward];
    this.tweens.add({
      targets: elements, alpha: 1, duration: 180, yoyo: true, hold: 900,
      onComplete: () => elements.forEach((element) => element.destroy()),
    });
    AudioSystem.play('wave', { volume: 0.75 });
  }

  private beginBattlefieldEventGameplay(): void {
    const active = this.battlefieldEvents.active;
    if (!active || this.eventGameplayStarted) return;
    this.eventGameplayStarted = true;
    if (active.def.key === 'supplyDrop') {
      this.createSupplyDrop();
      return;
    }
    const color = active.def.key === 'infectionStorm' ? 0x1b5e20
      : active.def.key === 'blackout' ? 0x000000 : 0x8b1a1a;
    const alpha = active.def.key === 'blackout' ? 0.36 : active.def.key === 'infectionStorm' ? 0.12 : 0.07;
    this.eventOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha,
    ).setDepth(active.def.key === 'blackout' ? 4 : 2);
  }

  private createSupplyDrop(): void {
    const x = randomBetween(this.spawnRandom, 140, GAME_WIDTH - 140);
    const y = randomBetween(this.spawnRandom, 360, 660);
    const glow = this.add.graphics();
    glow.fillStyle(0xffca28, 0.16).fillCircle(0, 0, 76);
    glow.lineStyle(3, 0xffca28, 0.7).strokeCircle(0, 0, 70);
    const crate = this.add.graphics();
    crate.fillStyle(0x5d4037, 1).fillRoundedRect(-56, -38, 112, 76, 8);
    crate.fillStyle(0xffca28, 0.9).fillRect(-56, -8, 112, 16).fillRect(-9, -38, 18, 76);
    crate.lineStyle(3, 0xffe082, 0.9).strokeRoundedRect(-56, -38, 112, 76, 8);
    const cross = this.add.text(0, 0, '+', {
      fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#4e342e', strokeThickness: 5,
    }).setOrigin(0.5);
    const label = this.add.text(0, 58, '补给', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd54f',
      stroke: '#071015', strokeThickness: 4,
    }).setOrigin(0.5);
    const drop = this.add.container(x, y, [glow, crate, cross, label])
      .setSize(152, 144).setDepth(18).setInteractive({ useHandCursor: true });
    drop.on('pointerup', () => this.claimSupplyDrop());
    this.tweens.add({ targets: drop, y: y - 16, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.supplyDrop = drop;
  }

  private claimSupplyDrop(): void {
    if (this.battlefieldEvents.active?.def.key !== 'supplyDrop' || !this.supplyDrop) return;
    const coins = 40 + this.level.id * 5;
    const repair = Math.round(this.wallMaxHp * 0.22);
    this.runCoins += coins;
    this.wallHp = Math.min(this.wallMaxHp, this.wallHp + repair);
    this.grantOverdriveCharge(35);
    this.showEventRewardFeedback(`补给回收 · +${coins} 金 · 修复 ${repair}`, 0xffd54f);
    AudioSystem.play('upgrade', { volume: 0.85 });
    this.completeBattlefieldEvent('claimed');
  }

  private updateBattlefieldEvent(dt: number): void {
    const active = this.battlefieldEvents.active;
    if (!active || !this.eventGameplayStarted) return;
    if (this.battlefieldEvents.update(dt)) {
      this.completeBattlefieldEvent('timeout');
      return;
    }
    this.battlefieldEventProgress = active.def.duration > 0 ? active.remaining / active.def.duration : 0;
    this.updateBattlefieldEventStatus(active);
  }

  private updateBattlefieldEventStatus(active: ActiveBattlefieldEvent): void {
    if (active.def.key === 'eliteHunt') {
      this.battlefieldEventStatus = `${active.def.name} ${this.eventEliteKills}/${this.eventEliteQuota} · ${Math.ceil(active.remaining)}s`;
    } else {
      this.battlefieldEventStatus = `${active.def.name} · ${Math.ceil(active.remaining)}s`;
    }
  }

  private completeBattlefieldEvent(reason: 'claimed' | 'timeout' | 'waveEnd' | 'huntComplete'): void {
    const finished = this.battlefieldEvents.finishActive();
    if (!finished) return;
    this.cleanupBattlefieldEventObjects();
    if (finished.def.key === 'infectionStorm' && this.eventEnemySpeedMultiplier !== 1) {
      for (const zombie of this.aliveZombies()) {
        zombie.baseSpeed /= this.eventEnemySpeedMultiplier;
        const body = zombie.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y > 0) body.setVelocityY(body.velocity.y / this.eventEnemySpeedMultiplier);
      }
    }
    this.eventEnemySpeedMultiplier = 1;
    this.eventFireRateMultiplier = 1;
    this.eventGameplayStarted = false;
    this.battlefieldEventProgress = 0;

    let completion = '';
    if (finished.def.key === 'infectionStorm') {
      this.runCoins += 20;
      this.grantOverdriveCharge(25);
      completion = '感染风暴结束 · 过载 +25';
    } else if (finished.def.key === 'blackout') {
      this.runCoins += 40;
      this.grantOverdriveCharge(35);
      completion = '供电恢复 · +40 金 · 过载 +35';
    } else if (finished.def.key === 'eliteHunt' && reason === 'huntComplete') {
      this.runCoins += 65;
      this.grantOverdriveCharge(40);
      completion = '精英悬赏完成 · +65 金 · 过载 +40';
    } else if (finished.def.key === 'supplyDrop' && reason !== 'claimed') {
      completion = '补给箱已坠毁';
    } else if (finished.def.key === 'eliteHunt') {
      completion = `精英猎杀结束 · ${this.eventEliteKills}/${this.eventEliteQuota}`;
    }

    this.eventEliteQuota = 0;
    this.eventEliteSpawned = 0;
    this.eventEliteKills = 0;
    if (!completion) {
      this.battlefieldEventStatus = '';
      return;
    }
    this.battlefieldEventStatus = completion;
    this.showEventRewardFeedback(completion, finished.def.color);
    this.time.delayedCall(1600, () => {
      if (this.battlefieldEventStatus === completion) this.battlefieldEventStatus = '';
    });
  }

  private cleanupBattlefieldEventObjects(): void {
    if (this.supplyDrop) {
      this.tweens.killTweensOf(this.supplyDrop);
      this.supplyDrop.destroy();
      this.supplyDrop = undefined;
    }
    this.eventOverlay?.destroy();
    this.eventOverlay = undefined;
  }

  private showEventRewardFeedback(message: string, color: number): void {
    const text = this.add.text(GAME_WIDTH / 2, 840, message, {
      fontFamily: FONT, fontSize: '25px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#071015', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({
      targets: text, y: 790, alpha: 0, duration: 1200,
      onComplete: () => text.destroy(),
    });
  }

  // ─── 生成僵尸 ───

  spawnZombie(type: ZombieTypeKey, x?: number, y?: number, eliteAffix?: EliteAffix | null): void {
    const z = this.zombies.get() as Zombie | null;
    if (!z) return;
    const sx = x ?? randomBetween(this.spawnRandom, 70, GAME_WIDTH - 70);
    const sy = y ?? -80;
    const rolledAffix = eliteAffix === undefined ? this.rollEliteAffix(type) : eliteAffix;
    const contractSpeed = (this.contractWave === this.waveManager.currentWave ? 1.14 : 1)
      * this.challengeContractDef.enemySpeedMultiplier;
    const dailySpeed = this.dailyChallenge?.modifier.enemySpeedMultiplier ?? 1;
    const endlessWave = Math.max(1, this.waveManager.currentWave);
    const endlessHp = this.endlessRun?.enemyHpMultiplier(endlessWave) ?? 1;
    const endlessSpeed = this.endlessRun?.enemySpeedMultiplier(endlessWave) ?? 1;
    z.spawn(
      type,
      sx,
      sy,
      this.level.hpScale * endlessHp * this.levelModifier.enemyHpMultiplier,
      this.level.speedScale * contractSpeed * this.eventEnemySpeedMultiplier * dailySpeed * endlessSpeed * this.levelModifier.enemySpeedMultiplier,
      rolledAffix,
    );
    z.onAttackWall = (dmg) => this.damageWall(dmg, z);
    z.onSummon = (bx, by, summonType) => {
      this.spawnZombie(summonType ?? 'normal',
        Phaser.Math.Clamp(bx + randomBetween(this.spawnRandom, -80, 80), 60, GAME_WIDTH - 60), by, null);
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
    z.onSurface = (burrower) => {
      this.explosionEmitter.setPosition(burrower.x, burrower.y).setParticleTint(0x8d6e63).explode(12);
      this.showShockwave(burrower.x, burrower.y);
      AudioSystem.play('wall_hit', { volume: 0.35 });
    };
    z.onBossPhase = (boss, phase) => this.showBossPhaseChange(boss, phase);

    // Boss 出生特效
    if (z.isBoss) {
      this.showBossSpawnEffect(z.x, z.y);
    }
    // 自爆者出场带闪烁
    if (z.isBehavior('exploder')) {
      this.tweens.add({ targets: z, alpha: 0.7, duration: 120, yoyo: true, repeat: 2 });
    }
    if (z.isBehavior('conductor')) {
      this.cameras.main.flash(90, 77, 208, 225, false);
    }
  }

  private rollEliteAffix(type: ZombieTypeKey): EliteAffix | null {
    const archetype = ZOMBIE_TYPES[type].archetype;
    if (archetype === 'swarm' || archetype === 'boss') return null;
    const affixes: EliteAffix[] = [
      'swift', 'armored', 'regenerating', 'splitting',
      'volatile', 'warden', 'warhorn', 'adaptive',
    ];
    const activeEvent = this.battlefieldEvents.active;
    if (
      activeEvent?.def.key === 'eliteHunt'
      && this.eventGameplayStarted
      && this.eventEliteSpawned < this.eventEliteQuota
    ) {
      this.eventEliteSpawned++;
      return affixes[randomBetween(this.eliteRandom, 0, affixes.length - 1)];
    }
    const wave = this.waveManager?.currentWave ?? 1;
    const baseChance = this.endlessRun
      ? Math.min(0.24, 0.025 + wave * 0.008)
      : this.level.id <= 2 ? 0.015 : Math.min(0.16, 0.025 + this.level.id * 0.003 + wave * 0.012);
    const contractBonus = this.contractWave === wave ? 0.2 : 0;
    const eventBonus = activeEvent?.def.key === 'infectionStorm' && this.eventGameplayStarted ? 0.12 : 0;
    const dailyBonus = this.dailyChallenge?.modifier.eliteChanceBonus ?? 0;
    const endlessBonus = this.endlessRun?.eliteChanceBonus ?? 0;
    const radarBonus = MetaUpgrades.eliteChanceBonus();
    if (this.eliteRandom() >= baseChance + contractBonus + eventBonus + dailyBonus + endlessBonus + radarBonus) return null;
    return affixes[randomBetween(this.eliteRandom, 0, affixes.length - 1)];
  }

  private showBossPhaseChange(boss: Zombie, phase: number): void {
    const finalPhase = phase >= 3;
    this.cameras.main.flash(260, 255, finalPhase ? 120 : 45, finalPhase ? 40 : 45, false);
    this.cameras.main.shake(finalPhase ? 700 : 520, finalPhase ? 0.026 : 0.018);
    this.applySlowMo(0.5, 0.42);
    const label = finalPhase ? '首领濒死 · 终末狂暴' : '首领狂暴 · 二阶段';
    const phaseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.235, label, {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: finalPhase ? '#ff1744' : '#ff5252',
      stroke: '#2b0b0b', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(24).setScale(0.4).setAlpha(0);
    this.tweens.add({
      targets: phaseText, scale: 1, alpha: 1, duration: 240, yoyo: true, hold: 850,
      onComplete: () => phaseText.destroy(),
    });
    if (finalPhase) {
      // 终末狂暴：召来带词缀的精锐护航
      const escortTypes: ZombieTypeKey[] = ['berserker', 'shield', 'leaper'];
      for (let i = 0; i < 3; i++) {
        this.spawnZombie(
          escortTypes[i % escortTypes.length],
          Phaser.Math.Clamp(boss.x + randomBetween(this.spawnRandom, -200, 200), 54, GAME_WIDTH - 54),
          boss.y + randomBetween(this.spawnRandom, 60, 150),
          undefined,
        );
      }
      this.grantOverdriveCharge(10);
    } else {
      for (let i = 0; i < 6; i++) {
        this.spawnZombie(
          'fast',
          Phaser.Math.Clamp(boss.x + randomBetween(this.spawnRandom, -170, 170), 54, GAME_WIDTH - 54),
          boss.y + randomBetween(this.spawnRandom, 70, 150),
          null,
        );
      }
    }
    AudioSystem.play('boss', { volume: 1 });
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

  private fireBullet(x: number, y: number, angle: number, damageMultiplier = 1): void {
    const b = this.bullets.get() as Bullet | null;
    if (!b) return;
    const isCrit = Math.random() < this.skills.critChance;
    const rawDmg = this.skills.damage * (1 + this.skills.streakDamageBonus) * (isCrit ? this.skills.critDamageMultiplier : 1);
    const comboMult = 1 + Math.min(this.hitCombo * this.skills.comboDamagePerStack, 1.0); // 连击倍率
    let dmg = rawDmg * comboMult * damageMultiplier * this.challengeContractDef.cannonDamageMultiplier
      * this.levelModifier.cannonDamageMultiplier;
    let pierce = this.skills.pierce;
    const profile: BulletProfile = {};

    if (this.behaviorLoadout.barrel === 'barrel_rail') {
      dmg *= 2.15;
      pierce += 4;
      profile.knockback = 34;
      profile.tint = 0xffe082;
      profile.scale = 1.34;
    } else if (this.behaviorLoadout.barrel === 'barrel_overclock') {
      dmg *= 0.82;
      profile.tint = 0xffca28;
      profile.scale = 0.88;
    } else if (this.behaviorLoadout.barrel === 'barrel_siege') {
      dmg *= 2.55;
      pierce += 1;
      profile.volatileCore = true;
      profile.tint = 0xff7043;
      profile.scale = 1.42;
    }

    this.equipmentProjectileCount++;
    if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_cryo' && this.equipmentProjectileCount % 5 === 0) {
      profile.cryoBurst = true;
      profile.tint = 0x80deea;
      profile.scale = (profile.scale ?? 1) * 1.16;
    } else if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_shrapnel') {
      profile.shrapnelOnKill = true;
    } else if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_volatile' && this.equipmentProjectileCount % 6 === 0) {
      profile.volatileCore = true;
      profile.tint = 0xff7043;
      profile.scale = (profile.scale ?? 1) * 1.22;
    } else if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_incendiary') {
      profile.element = 'fire';
      profile.tint = 0xff8a65;
    } else if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_arc') {
      profile.element = 'lightning';
      profile.arcBurst = this.equipmentProjectileCount % 4 === 0;
      profile.tint = 0xffee58;
    }

    b.fire(x, y, angle, dmg, pierce, isCrit, this.skills.ricochetCount, profile);
  }

  private onEquipmentVolley(x: number, y: number, angle: number): void {
    this.equipmentVolleyCount++;
    this.behaviorTelemetry.volleys++;
    if (this.behaviorLoadout.barrel === 'barrel_cycler') {
      this.cyclerHeat = Math.min(100, this.cyclerHeat + 9);
      if (this.cyclerHeat >= 100) {
        this.cyclerHeat = 0;
        this.cyclerLockTimer = 1.05;
        this.fireCyclerVent(x, y, angle);
      }
    } else if (this.behaviorLoadout.barrel === 'barrel_scatter' && this.equipmentVolleyCount % 3 === 0) {
      this.fireBullet(x, y, angle - 0.24, 0.58);
      this.fireBullet(x, y, angle + 0.24, 0.58);
    }
  }

  private fireCyclerVent(x: number, y: number, angle: number): void {
    const comboMult = 1 + Math.min(this.hitCombo * 0.02, 1);
    const damage = this.skills.damage * (1 + this.skills.streakDamageBonus) * comboMult * 0.44;
    for (const offset of [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54]) {
      const bullet = this.bullets.get() as Bullet | null;
      if (!bullet) continue;
      bullet.fire(x, y, angle + offset, damage, 0, false, 0, {
        damageSource: 'equipment', tint: 0xffb74d, scale: 0.82,
      });
    }
    this.cameras.main.shake(100, 0.004);
  }

  /** 机制提示横幅：新手阶段逐条介绍新机制，避免一次性堆给玩家 */
  private showMechanicTip(title: string, desc: string, color = 0x69f0ae): void {
    if (this.finished) return;
    const band = this.add.rectangle(GAME_WIDTH / 2, 216, GAME_WIDTH - 48, 106, 0x071015, 0.9)
      .setDepth(21).setAlpha(0);
    const accent = this.add.rectangle(GAME_WIDTH / 2, 163, GAME_WIDTH - 48, 4, color, 1)
      .setDepth(22).setAlpha(0);
    const titleTxt = this.add.text(GAME_WIDTH / 2, 190, title, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#071015', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22).setAlpha(0);
    const descTxt = this.add.text(GAME_WIDTH / 2, 240, desc, {
      fontFamily: FONT, fontSize: '17px', color: '#d7e3e8',
      stroke: '#071015', strokeThickness: 2,
      wordWrap: { width: GAME_WIDTH - 96 }, align: 'center',
    }).setOrigin(0.5).setDepth(22).setAlpha(0);
    const elements: Phaser.GameObjects.GameObject[] = [band, accent, titleTxt, descTxt];
    this.tweens.add({
      targets: elements, alpha: 1, duration: 220, yoyo: true, hold: 2500,
      onComplete: () => elements.forEach((element) => element.destroy()),
    });
    AudioSystem.play('wave', { volume: 0.5 });
  }

  /** 首波开始时按关卡进度安排机制讲解（只讲本局会遇到的机制） */
  private scheduleMechanicTips(): void {
    if (this.mechanicTipShown || this.isDailyMode || this.isEndlessMode) return;
    this.mechanicTipShown = true;
    if (this.level.id === 1) {
      this.time.delayedCall(1200, () => this.showMechanicTip(
        '操作提示',
        '按住并拖动屏幕瞄准，虚线就是弹道；敌人进场后炮台自动开火',
        0x4fc3f7,
      ));
      if (this.behaviorLoadout.barrel === 'barrel_cycler') {
        this.time.delayedCall(5400, () => this.showMechanicTip(
          '涡轮旋管 · 热量',
          '连续开火会积热并提升射速；热量满时自动排热，向前方喷出一轮扇形弹幕',
          0xffb74d,
        ));
      }
    } else if (this.level.id === AMMO_SLOT_UNLOCK_LEVEL) {
      const ammo = getBehaviorEquipment(this.behaviorLoadout.ammo);
      this.time.delayedCall(1200, () => this.showMechanicTip(
        '新机制解锁 · 弹药槽',
        `${ammo?.name ?? '弹药'}：${ammo?.desc ?? ''}`,
        0x80deea,
      ));
    } else if (this.level.id === WALL_SLOT_UNLOCK_LEVEL) {
      const wall = getBehaviorEquipment(this.behaviorLoadout.wall);
      this.time.delayedCall(1200, () => this.showMechanicTip(
        '新机制解锁 · 城墙模块',
        `${wall?.name ?? '城墙模块'}：${wall?.desc ?? ''}`,
        0x64b5f6,
      ));
    }
  }

  /** 绘制瞄准线：从炮口沿当前瞄准方向延伸的渐隐虚线，末端带落点标记 */
  private drawAimLine(): void {
    this.aimGraphics.clear();
    if (this.finished || this.choosingUpgrade) return;
    const angle = this.cannon.currentAimAngle;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    if (dirY >= -0.02) return;
    const muzzle = this.cannon.muzzlePosition(angle);
    let travel = (86 - muzzle.y) / dirY;
    if (dirX > 0.001) travel = Math.min(travel, (GAME_WIDTH - 14 - muzzle.x) / dirX);
    else if (dirX < -0.001) travel = Math.min(travel, (14 - muzzle.x) / dirX);
    if (travel <= 12) return;
    const color = this.cyclerLockTimer > 0 ? 0xff8a65 : 0xffe082;
    const dash = 18;
    const gap = 13;
    let traveled = 0;
    while (traveled < travel) {
      const segEnd = Math.min(travel, traveled + dash);
      const alpha = Math.max(0.12, 0.4 * (1 - 0.65 * (traveled / travel)));
      this.aimGraphics.lineStyle(3, color, alpha)
        .lineBetween(
          muzzle.x + dirX * traveled, muzzle.y + dirY * traveled,
          muzzle.x + dirX * segEnd, muzzle.y + dirY * segEnd,
        );
      traveled += dash + gap;
    }
    const endX = muzzle.x + dirX * travel;
    const endY = muzzle.y + dirY * travel;
    this.aimGraphics.lineStyle(2.5, color, 0.55).strokeCircle(endX, endY, 10);
    this.aimGraphics.fillStyle(color, 0.5).fillCircle(endX, endY, 2.6);
  }

  private updateBehaviorEquipment(dt: number, hasTargets: boolean): void {
    this.wallModuleCooldown = Math.max(0, this.wallModuleCooldown - dt);
    let barrelStatus: string;
    if (this.behaviorLoadout.barrel === 'barrel_cycler') {
      if (this.cyclerLockTimer > 0) {
        this.cyclerLockTimer = Math.max(0, this.cyclerLockTimer - dt);
      } else if (!hasTargets) {
        this.cyclerHeat = Math.max(0, this.cyclerHeat - dt * 42);
      }
      const locked = this.cyclerLockTimer > 0;
      this.cannon.setFireProfile(
        (1.05 + this.cyclerHeat * 0.0082) * this.challengeContractDef.cannonFireRateMultiplier,
        locked,
      );
      barrelStatus = locked ? `排热 ${this.cyclerLockTimer.toFixed(1)}s` : `热 ${Math.round(this.cyclerHeat)}%`;
    } else if (this.behaviorLoadout.barrel === 'barrel_rail') {
      this.cannon.setFireProfile(0.56 * this.challengeContractDef.cannonFireRateMultiplier, false);
      barrelStatus = '重击穿透';
    } else if (this.behaviorLoadout.barrel === 'barrel_overclock') {
      this.cannon.setFireProfile(1.42 * this.challengeContractDef.cannonFireRateMultiplier, false);
      barrelStatus = '恒定超频 +42%';
    } else if (this.behaviorLoadout.barrel === 'barrel_siege') {
      this.cannon.setFireProfile(0.38 * this.challengeContractDef.cannonFireRateMultiplier, false);
      barrelStatus = '攻城爆破';
    } else {
      this.cannon.setFireProfile(0.88 * this.challengeContractDef.cannonFireRateMultiplier, false);
      barrelStatus = `侧翼 ${this.equipmentVolleyCount % 3}/3`;
    }

    const ammoStatus = !this.ammoSlotActive
      ? `第 ${AMMO_SLOT_UNLOCK_LEVEL} 关解锁`
      : this.behaviorLoadout.ammo === 'ammo_cryo'
        ? `冷凝 ${this.equipmentProjectileCount % 5}/5`
        : this.behaviorLoadout.ammo === 'ammo_volatile'
          ? `爆芯 ${this.equipmentProjectileCount % 6}/6`
          : this.behaviorLoadout.ammo === 'ammo_incendiary'
            ? '火焰灼烧'
            : this.behaviorLoadout.ammo === 'ammo_arc'
              ? `电弧 ${this.equipmentProjectileCount % 4}/4`
              : '击杀裂变';
    const wallStatus = !this.wallSlotActive
      ? `第 ${WALL_SLOT_UNLOCK_LEVEL} 关解锁`
      : this.behaviorLoadout.wall === 'wall_salvage'
        ? '精英回收'
        : this.wallModuleCooldown > 0
          ? `${this.behaviorLoadout.wall === 'wall_pulse'
            ? '电网'
            : this.behaviorLoadout.wall === 'wall_reflector'
              ? '反射'
              : this.behaviorLoadout.wall === 'wall_barrier' ? '壁垒' : '纳米'} ${this.wallModuleCooldown.toFixed(1)}s`
          : '防线就绪';
    const barrel = getBehaviorEquipment(this.behaviorLoadout.barrel);
    const ammo = getBehaviorEquipment(this.behaviorLoadout.ammo);
    const wall = getBehaviorEquipment(this.behaviorLoadout.wall);
    const ammoLabel = this.ammoSlotActive ? (ammo?.shortName ?? '') : `弹药·${AMMO_SLOT_UNLOCK_LEVEL}关开`;
    const wallLabel = this.wallSlotActive ? (wall?.shortName ?? '') : `城墙·${WALL_SLOT_UNLOCK_LEVEL}关开`;
    this.behaviorEquipmentLabel = `${barrel?.shortName ?? ''} · ${ammoLabel} · ${wallLabel}`;
    this.behaviorEquipmentStatus = `${barrelStatus} · ${ammoStatus} · ${wallStatus}`;
    this.behaviorEquipmentColor = barrel?.color ?? 0xce93d8;
  }

  private dealDamage(
    zombie: Zombie,
    damage: number,
    element: DamageElement,
    areaDamage = false,
  ): boolean {
    let adjusted = damage * this.skills.getElementDamageMultiplier(element);
    if (zombie.slowed) adjusted *= this.skills.shatterDamageMultiplier;
    const burning = this.burnEffects.some((effect) => effect.zombie === zombie);
    const corroded = this.corrosionEffects.some((effect) => effect.zombie === zombie);
    if (burning || corroded) adjusted *= this.skills.heatExecutionMultiplier;
    if (burning && corroded && this.skills.hasSynergy('toxicCombustion')) adjusted *= 1.32;
    if (zombie.isBoss || zombie.eliteAffix) adjusted *= this.skills.eliteBossDamageMultiplier;
    if (areaDamage) {
      const crowdSteps = Math.min(4, Math.floor(this.aliveZombies().length / 10));
      adjusted *= 1 + crowdSteps * this.skills.crowdDamagePerTen;
    }
    if (element === 'energy' && this.skills.hasSynergy('antimatterLens')) {
      const insideWell = this.gravityWells.some((well) =>
        Phaser.Math.Distance.Between(well.x, well.y, zombie.x, zombie.y) <= this.skills.gravityWellRadius);
      if (insideWell) adjusted *= 1.35;
    }
    // 共振增幅 + 弱点标记：命中弱点时增伤并标记目标
    const isWeaknessHit = zombie.getElementMultiplier(element) > 1;
    if (isWeaknessHit) {
      adjusted *= 1 + this.skills.resonanceBonus;
      if (this.skills.weaknessMarkBonus > 0) zombie.applyWeaknessMark(3.5);
    }
    if (zombie.marked) {
      adjusted *= 1 + this.skills.weaknessMarkBonus
        + ((zombie.isBoss || zombie.eliteAffix) ? this.skills.markAndHuntBonus : 0);
    }
    return zombie.takeDamage(adjusted, element, this.skills.weaknessBonus);
  }

  private onBulletHit(bullet: Bullet, zombie: Zombie): void {
    if (!bullet.active || !zombie.active || zombie.hp <= 0 || zombie.dying) return;

    const hpRatio = zombie.hp / zombie.maxHp;
    const executing = this.skills.executionThreshold > 0 && hpRatio <= this.skills.executionThreshold;
    const hitDamage = bullet.damage * (executing ? this.skills.executionDamageMultiplier : 1);
    const died = this.dealDamage(zombie, hitDamage, bullet.element);
    this.recordDamage(bullet.damageSource, zombie);
    const actualDmg = Math.round(zombie.lastDamageTaken);
    this.showDamageText(zombie.x, zombie.y - 30, actualDmg, bullet.isCrit);
    if (bullet.damageSource === 'bullet' && actualDmg > 0) this.chargeCompanion('hit');

    if (this.skills.frostSlowMultiplier < 1 && zombie.hp > 0) {
      zombie.applySlow(this.skills.frostSlowMultiplier, 2.5 * MetaUpgrades.slowDurationMultiplier());
    }
    if (bullet.cryoBurst && !bullet.cryoTriggered) {
      this.triggerEquipmentCryo(bullet, zombie);
    }
    if (!died && bullet.knockback > 0) zombie.applyKnockback(bullet.knockback);
    // 重锤冲击：主炮击退非首领单位（震荡教条附加震荡伤害）
    if (!died && zombie.hp > 0 && !zombie.isBoss && this.skills.heavyImpactChance > 0
      && Math.random() < this.skills.heavyImpactChance) {
      zombie.applyKnockback(30);
      if (this.skills.hasSynergy('shockDoctrine')) {
        const shockDied = this.dealDamage(zombie, bullet.damage * 0.3, 'explosive', true);
        this.recordDamage('bullet', zombie);
        if (shockDied) this.killZombie(zombie);
      }
    }
    if (bullet.volatileCore && !bullet.volatileTriggered) {
      bullet.volatileTriggered = true;
      this.behaviorTelemetry.volatileBursts++;
      this.doEquipmentExplosion(zombie.x, zombie.y, bullet.damage * 0.68, 118, zombie);
    }
    if (bullet.arcBurst && !bullet.arcTriggered && !died) {
      bullet.arcTriggered = true;
      this.doChainLightning(zombie, 4);
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
      this.applyBurn(zombie, this.skills.burnDps * MetaUpgrades.burnMultiplier());
    }
    if (this.ammoSlotActive && this.behaviorLoadout.ammo === 'ammo_incendiary' && zombie.hp > 0) {
      this.applyBurn(zombie, this.skills.damage * 0.18);
    }
    if (this.skills.toxicDps > 0 && zombie.hp > 0) {
      this.applyCorrosion(zombie, this.skills.toxicDps);
    }
    if (!died && zombie.hp > 0 && this.skills.stormCoilChance > 0
      && Math.random() < this.skills.stormCoilChance) {
      this.doChainLightning(zombie, 2 + this.skills.getLevel('stormCoil') + this.skills.arcBounceBonus);
    }
    if (!died && zombie.hp > 0 && this.skills.hasSynergy('thermalShock')) {
      this.triggerThermalShock(zombie);
    }

    // 暴击起爆：暴击命中触发小型范围爆炸
    if (bullet.isCrit && this.skills.criticalDetonationMultiplier > 0) {
      this.doEquipmentExplosion(
        zombie.x, zombie.y,
        bullet.damage * this.skills.criticalDetonationMultiplier, 95, zombie,
      );
    }

    // 穿甲组合技：地狱穿甲弹
    if (bullet.isCrit && this.skills.hasSynergy('detonation')) {
      this.doExplosion(zombie.x, zombie.y);
    }

    if (died && bullet.shrapnelOnKill && !bullet.fragment) {
      this.spawnEquipmentShrapnel(zombie, bullet.damage * 0.34);
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

  private triggerEquipmentCryo(bullet: Bullet, source: Zombie): void {
    bullet.cryoTriggered = true;
    this.behaviorTelemetry.cryoBursts++;
    const burst = this.add.image(source.x, source.y, 'shockwave')
      .setDepth(13).setTint(0x80deea).setScale(0.28).setAlpha(0.82);
    this.tweens.add({
      targets: burst, scale: 1.35, alpha: 0, duration: 260,
      onComplete: () => burst.destroy(),
    });
    for (const target of this.aliveZombies()) {
      if (Phaser.Math.Distance.Between(source.x, source.y, target.x, target.y) <= 118) {
        target.applySlow(0.35, 2.4);
      }
    }
  }

  private spawnEquipmentShrapnel(source: Zombie, damage: number): void {
    this.behaviorTelemetry.shrapnelBursts++;
    const targets = this.aliveZombies()
      .filter((target) => target !== source && target.hp > 0)
      .sort((a, b) => Phaser.Math.Distance.Between(source.x, source.y, a.x, a.y)
        - Phaser.Math.Distance.Between(source.x, source.y, b.x, b.y))
      .slice(0, 5);
    targets.forEach((target) => {
      const fragment = this.bullets.get() as Bullet | null;
      if (!fragment) return;
      const angle = Phaser.Math.Angle.Between(source.x, source.y, target.x, target.y);
      fragment.fire(source.x, source.y, angle, damage, 0, false, 0, {
        damageSource: 'equipment', fragment: true, tint: 0xa5d6a7, scale: 0.7,
      });
    });
  }

  private doEquipmentExplosion(
    x: number,
    y: number,
    damage: number,
    radius: number,
    excluded?: Zombie,
  ): void {
    this.explosionEmitter.setPosition(x, y).setParticleTint(0xff7043).explode(14);
    this.cameras.main.shake(90, 0.004);
    AudioSystem.play('explosion', { volume: 0.42 });
    for (const target of this.aliveZombies()) {
      if (target === excluded || target.hp <= 0 || target.dying) continue;
      const dist = Phaser.Math.Distance.Between(x, y, target.x, target.y);
      if (dist > radius) continue;
      const targetDied = this.dealDamage(
        target,
        damage * Math.max(this.skills.clusterEdgeFloor, 1 - dist / radius),
        'explosive',
        true,
      );
      this.recordDamage('equipment', target);
      if (targetDied) this.killZombie(target);
    }
  }

  private showShockwave(x: number, y: number): void {
    const sw = this.add.image(x, y, 'shockwave').setDepth(13).setScale(0.16).setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: sw, scale: 1.35, alpha: 0, duration: 340, ease: 'Cubic.Out',
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

  private doChainLightning(source: Zombie, maxTargets = 4 + this.skills.arcBounceBonus): void {
    const targets = this.aliveZombies()
      .filter((z) => z !== source && z.hp > 0)
      .sort((a, b) => Phaser.Math.Distance.Between(source.x, source.y, a.x, a.y)
        - Phaser.Math.Distance.Between(source.x, source.y, b.x, b.x))
      .slice(0, maxTargets);
    let fromX = source.x;
    let fromY = source.y;
    for (const target of targets) {
      this.lightningGraphics.lineStyle(5, 0xfff176, 0.95);
      this.lightningGraphics.lineBetween(fromX, fromY, target.x, target.y);
      this.lightningGraphics.lineStyle(12, 0xffd54f, 0.18);
      this.lightningGraphics.lineBetween(fromX, fromY, target.x, target.y);
      const died = this.dealDamage(target, this.skills.damage * 0.7 * this.skills.arcDamageMultiplier, 'lightning');
      this.recordDamage('lightning', target);
      if (died) this.killZombie(target);
      fromX = target.x;
      fromY = target.y;
    }
    this.time.delayedCall(90, () => this.lightningGraphics.clear());
    if (targets.length > 0) AudioSystem.play('lightning', { volume: 0.7 });
  }

  private triggerThermalShock(source: Zombie): void {
    const now = this.time.now;
    if ((this.thermalShockReadyAt.get(source) ?? 0) > now) return;
    this.thermalShockReadyAt.set(source, now + 1100);
    const evolved = this.skills.hasSynergy('elementalCataclysm');
    const radius = evolved ? 165 : 105;
    const damage = this.skills.damage * (evolved ? 1.28 : 0.78);
    this.explosionEmitter.setPosition(source.x, source.y).setParticleTint(0x80deea).explode(16);
    const ring = this.add.image(source.x, source.y, 'shockwave').setDepth(13).setScale(0.35).setTint(0xff8a65);
    this.tweens.add({
      targets: ring, scale: 2.2, alpha: 0, duration: 320,
      onComplete: () => ring.destroy(),
    });
    for (const zombie of this.aliveZombies()) {
      if (Phaser.Math.Distance.Between(source.x, source.y, zombie.x, zombie.y) > radius) continue;
      const died = this.dealDamage(zombie, damage, 'explosive', true);
      this.recordDamage('explosion', zombie);
      zombie.applySlow(Math.min(this.skills.frostSlowMultiplier, 0.7), 1.2);
      if (died) this.killZombie(zombie);
    }
    if (evolved) this.doExplosion(source.x, source.y, 'explosion');
    AudioSystem.play('explosion', { volume: 0.42 });
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
        this.skills.damage * 1.5 * MetaUpgrades.missileDamageMultiplier(),
        0,
        false,
        0,
        { damageSource: 'missile', element: 'explosive' },
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
      m.setData('damageSource', 'missile');
    }
    AudioSystem.play('shoot', { volume: 0.6 });
  }

  private fireAirSupport(): void {
    const alive = this.aliveZombies();
    if (alive.length === 0) return;
    const priority = alive.filter((zombie) => zombie.isBehavior('jammer'));
    for (let i = 0; i < this.skills.airSupportCount; i++) {
      const targetPool = priority.length > 0 ? priority : alive;
      const target = targetPool[Phaser.Math.Between(0, targetPool.length - 1)];
      const missile = this.missiles.get() as Bullet | null;
      if (!missile) return;
      const startX = i % 2 === 0 ? 74 : GAME_WIDTH - 74;
      const startY = WALL_Y + 78;
      const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y);
      missile.setTexture('bullet');
      missile.fire(startX, startY, angle, this.skills.damage * 1.05 * MetaUpgrades.missileDamageMultiplier(), 0, false, 0, {
        damageSource: 'airSupport', element: 'energy',
      });
      missile.setScale(1.2).setTint(0x4de7ff);
      missile.setData('target', target);
      missile.setData('homing', true);
      missile.setData('damageSource', 'airSupport');
    }
    AudioSystem.play('shoot', { volume: 0.45 });
  }

  // ─── 灼烧系统 ───

  private burnEffects: { zombie: Zombie; dps: number; timer: number }[] = [];
  private corrosionEffects: { zombie: Zombie; dps: number; timer: number }[] = [];

  private applyBurn(zombie: Zombie, dps: number): void {
    if (zombie.isImmuneTo('fire')) return;
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
      const died = this.dealDamage(e.zombie, dmg, 'fire');
      this.recordDamage('burn', e.zombie);
      // 灼烧粒子
      if (Math.random() < 0.3) {
        this.showBurnParticle(e.zombie.x, e.zombie.y);
      }
      if (died) this.killZombie(e.zombie);
    }
  }

  // ─── 护盾系统 ───

  private updateWallShield(dt: number): void {
    const emergencyReady = this.skills.emergencyBarrierAmount > 0
      && this.wallMaxHp > 0
      && this.wallHp / this.wallMaxHp <= 0.3;
    const interval = this.skills.shieldInterval < Infinity
      ? this.skills.shieldInterval
      : emergencyReady ? 8 : Infinity;
    if (interval === Infinity) return;
    this.shieldTimer += dt;
    if (this.shieldTimer >= interval && this.wallShield <= 0) {
      this.shieldTimer = 0;
      this.wallShield = Math.max(
        this.skills.hasSkill('energyShield') ? this.skills.shieldAmount : 0,
        emergencyReady ? this.skills.emergencyBarrierAmount : 0,
      );
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
    let gain = zombie.isBoss ? 32 : zombie.isBehavior('swarm') ? 1 : 4;
    if (this.battlefieldEvents.active?.def.key === 'infectionStorm' && this.eventGameplayStarted) {
      gain += zombie.isBehavior('swarm') ? 1 : 2;
    }
    gain += MetaUpgrades.flatKillOverdrive();
    this.grantOverdriveCharge(gain * this.skills.overdriveGainMultiplier);
  }

  private grantOverdriveCharge(amount: number): void {
    const wasReady = this.overdriveReady;
    const adjustedAmount = amount * this.challengeContractDef.overdriveMultiplier;
    this.overdriveCharge = Math.min(100, this.overdriveCharge + Math.max(0, adjustedAmount));
    this.overdriveReady = this.overdriveCharge >= 100 && !this.skills.isOverdriveActive;
    if (!wasReady && this.overdriveReady) {
      // 早期战役关卡附带释放按钮指引，降低新玩家理解成本
      const hint = !this.isEndlessMode && !this.isDailyMode && this.level.id <= WALL_SLOT_UNLOCK_LEVEL
        ? ' · 点右下「释放」全火力爆发'
        : '';
      const banner = this.add.text(GAME_WIDTH / 2, 930, `⚡ 过载就绪${hint}`, {
        fontFamily: FONT, fontSize: hint ? '24px' : '30px', fontStyle: 'bold', color: '#66e08a',
        stroke: '#102218', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: banner, y: 890, alpha: 0, duration: 900, onComplete: () => banner.destroy() });
      AudioSystem.play('overdrive', { volume: 0.55 });
    }
  }

  private applyCorrosion(zombie: Zombie, dps: number): void {
    if (zombie.isImmuneTo('toxic')) return;
    const existing = this.corrosionEffects.find((effect) => effect.zombie === zombie);
    if (existing) {
      existing.dps = Math.max(existing.dps, dps);
      existing.timer = 4;
    } else {
      this.corrosionEffects.push({ zombie, dps, timer: 4 });
    }
  }

  private updateCorrosion(dt: number): void {
    for (let index = this.corrosionEffects.length - 1; index >= 0; index--) {
      const effect = this.corrosionEffects[index];
      effect.timer -= dt;
      if (effect.timer <= 0 || !effect.zombie.active || effect.zombie.hp <= 0) {
        this.corrosionEffects.splice(index, 1);
        continue;
      }
      const died = this.dealDamage(effect.zombie, effect.dps * dt, 'toxic');
      this.recordDamage('toxic', effect.zombie);
      if (Math.random() < 0.18) {
        this.explosionEmitter.setPosition(effect.zombie.x, effect.zombie.y)
          .setParticleTint(0x9ccc65).explode(1);
      }
      if (died) this.killZombie(effect.zombie);
    }
  }

  /** 新机制周期行为：静电领域 / 精英光环 / 补给契约 / 空窗修复 */
  private updateNewMechanics(dt: number, alive: Zombie[]): void {
    // 静电领域：近墙敌人持续减速
    if (this.skills.staticFieldSlow > 0) {
      this.staticFieldTimer += dt;
      if (this.staticFieldTimer >= 0.3) {
        this.staticFieldTimer = 0;
        const range = this.skills.staticFieldRange;
        const slow = 1 - this.skills.staticFieldSlow;
        for (const zombie of alive) {
          if (WALL_Y - zombie.y < range) zombie.applySlow(slow, 0.5);
        }
      }
    }

    // 精英光环：战号加速、庇护补盾
    if (alive.length > 1) {
      this.eliteAuraTimer += dt;
      if (this.eliteAuraTimer >= 0.45) {
        this.eliteAuraTimer = 0;
        for (const elite of alive) {
          if (elite.eliteAffix === 'warhorn') {
            for (const ally of alive) {
              if (ally !== elite && Phaser.Math.Distance.Between(elite.x, elite.y, ally.x, ally.y) < 190) {
                ally.applyHaste(1.35, 0.9);
              }
            }
          } else if (elite.eliteAffix === 'warden') {
            let granted = 0;
            for (const ally of alive) {
              if (granted >= 4) break;
              if (ally !== elite && ally.shield < SHIELD_MAX
                && Phaser.Math.Distance.Between(elite.x, elite.y, ally.x, ally.y) < 170) {
                ally.grantShield(16);
                granted++;
              }
            }
            if (granted > 0) this.showHealEffect(elite.x, elite.y);
          }
        }
      }
    }

    // 补给契约：被动金币
    if (this.skills.supplyContractCoins > 0) {
      this.supplyContractTimer += dt;
      if (this.supplyContractTimer >= 5) {
        this.supplyContractTimer = 0;
        this.runCoins += this.skills.supplyContractCoins;
      }
    }

    // 空窗修复：自动焊机（技能）+ 战地抢修（养成）
    const idleRate = this.skills.autoWelderRate + MetaUpgrades.idleRepairRate();
    if (idleRate > 0 && alive.length === 0 && this.wallHp > 0 && this.wallHp < this.wallMaxHp) {
      this.idleRepairAccumulator += this.wallMaxHp * idleRate * dt * this.skills.repairBonus;
      if (this.idleRepairAccumulator >= 1) {
        const amount = Math.floor(this.idleRepairAccumulator);
        this.idleRepairAccumulator -= amount;
        this.wallHp = Math.min(this.wallMaxHp, this.wallHp + amount);
      }
    } else if (this.idleRepairAccumulator > 0) {
      this.idleRepairAccumulator = 0;
    }
  }

  /** 由 HUD 按钮调用的主动爆发技能 */
  triggerOverdrive(): boolean {
    if (!this.overdriveReady || this.skills.isOverdriveActive || this.finished || this.choosingUpgrade) return false;
    this.overdriveCharge = 0;
    this.overdriveReady = false;
    this.overdriveTimer = MetaUpgrades.overdriveDuration();
    this.skills.setOverdrive(true);
    this.runOverdriveUses++;
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
        const died = this.dealDamage(z, dmg, 'energy');
        this.recordDamage('laser', z);
        if (died) this.killZombie(z);
      }
    }
  }

  // ─── 爆炸 ───

  private doExplosion(x: number, y: number, source: DamageSourceKey = 'explosion'): void {
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
        const element: DamageElement = source === 'gravity' ? 'gravity' : 'explosive';
        const died = this.dealDamage(
          z,
          damage * Math.max(this.skills.clusterEdgeFloor, 1 - dist / radius),
          element,
          true,
        );
        this.recordDamage(source, z);
        if (died) this.killZombie(z);
      }
    }
  }

  // ─── 墙壁伤害 ───

  private damageWall(dmg: number, attacker?: Zombie | null): void {
    if (this.finished) return;

    // 铜墙铁壁无敌
    if (this.wallInvulnTimer > 0) return;

    dmg *= this.challengeContractDef.wallDamageMultiplier;
    if (this.wallSlotActive && this.behaviorLoadout.wall === 'wall_barrier') dmg *= 0.88;
    // 玻璃大炮：输出更高但墙体更脆
    dmg *= 1 + this.skills.glassCannonWallPenalty;
    // 防爆闸门：单次受击伤害封顶
    dmg = Math.min(dmg, this.skills.blastDoorCap);
    // 应急隔舱：墙体濒危时额外减伤
    dmg *= 1 - this.skills.bulkheadReduction;
    this.triggerBehaviorWallModule(dmg);

    // 护盾吸收
    if (this.wallShield > 0) {
      if (dmg <= this.wallShield) {
        this.wallShield -= dmg;
        this.cameras.main.shake(60, 0.002);
        AudioSystem.play('wall_hit', { volume: 0.3 });
        this.counterAttack(attacker);
        return;
      }
      dmg -= this.wallShield;
      this.wallShield = 0;
    }

    // 钢铁壁垒减伤
    dmg *= 1 - this.skills.wallDamageReduction;

    // 外墙尖刺（局外养成）：受击即反弹
    if (attacker && MetaUpgrades.wallSpikeRatio() > 0) {
      const spikeDamage = dmg / Math.max(0.01, 1 - this.skills.wallDamageReduction) * MetaUpgrades.wallSpikeRatio();
      const spikeDied = this.dealDamage(attacker, spikeDamage, 'kinetic');
      this.recordDamage('thorns', attacker);
      if (spikeDied) this.killZombie(attacker);
    }

    this.wallHp = Math.max(0, this.wallHp - dmg);
    this.cameras.main.shake(120, 0.004);
    AudioSystem.play('wall_hit', { volume: 0.55 });

    this.counterAttack(attacker);

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
        const died = this.dealDamage(nearest, dmg * this.skills.thornsDamage, 'kinetic');
        this.recordDamage('thorns', nearest);
        this.showDamageText(nearest.x, nearest.y - 20, Math.round(nearest.lastDamageTaken), false);
        if (died) this.killZombie(nearest);
      }
    }

    // 铜墙铁壁：受伤后无敌
    if (this.skills.hasIronWall) {
      this.wallInvulnTimer = 2;
    }

    if (this.wallHp <= 0) {
      // 保险协议：首次倒下转化为紧急修复
      if (!this.insuranceUsed && this.skills.insuranceRepairRatio > 0) {
        this.insuranceUsed = true;
        this.wallHp = Math.max(1, Math.round(this.wallMaxHp * this.skills.insuranceRepairRatio));
        this.showEventRewardFeedback('保险协议生效 · 紧急修复防线', 0x80deea);
        this.cameras.main.flash(160, 128, 222, 235, false);
        AudioSystem.play('heal', { volume: 0.9 });
        return;
      }
      this.endLevel(false);
    }
  }

  /** 反击火炮：墙体受击时概率反击攻击者 */
  private counterAttack(attacker: Zombie | null | undefined): void {
    if (!attacker || !attacker.active || attacker.hp <= 0) return;
    if (this.skills.counterBatteryChance > 0 && Math.random() < this.skills.counterBatteryChance) {
      const died = this.dealDamage(attacker, this.skills.damage, 'kinetic');
      this.recordDamage('thorns', attacker);
      this.showDamageText(attacker.x, attacker.y - 24, Math.round(attacker.lastDamageTaken), false);
      if (died) this.killZombie(attacker);
    }
  }

  private triggerBehaviorWallModule(incomingDamage: number): void {
    if (!this.wallSlotActive || this.wallModuleCooldown > 0) return;
    if (this.behaviorLoadout.wall === 'wall_barrier') {
      this.wallModuleCooldown = 9;
      this.wallShield = Math.min(this.wallMaxHp * 0.55, this.wallShield + this.wallMaxHp * 0.07);
      this.showShieldActivateEffect();
      AudioSystem.play('wave', { volume: 0.35 });
      return;
    }
    if (this.behaviorLoadout.wall === 'wall_nanites') {
      this.wallModuleCooldown = 6;
      const repair = Math.min(this.wallMaxHp - this.wallHp, Math.max(1, Math.round(this.wallMaxHp * 0.03)));
      this.wallHp += repair;
      if (repair > 0) this.showCompanionFeedback(GAME_WIDTH / 2, WALL_Y - 36, `纳米抢修 +${repair}`, 0x69f0ae);
      AudioSystem.play('heal', { volume: 0.35 });
      return;
    }
    const nearWall = this.aliveZombies()
      .filter((zombie) => WALL_Y - zombie.y <= 340 + this.skills.repulsionBonus)
      .sort((a, b) => b.y - a.y);
    if (nearWall.length === 0) return;

    let targets: Zombie[];
    let damage: number;
    let knockback: number;
    let tint: number;
    if (this.behaviorLoadout.wall === 'wall_pulse') {
      this.wallModuleCooldown = 8;
      this.behaviorTelemetry.wallPulses++;
      targets = nearWall;
      damage = this.skills.damage * 1.05;
      knockback = 96 + this.skills.repulsionBonus;
      tint = 0x64b5f6;
    } else if (this.behaviorLoadout.wall === 'wall_reflector') {
      this.wallModuleCooldown = 0.8;
      this.behaviorTelemetry.reflectionBlasts++;
      targets = nearWall.slice(0, 6);
      damage = Math.max(this.skills.damage * 0.72, incomingDamage * 0.62);
      knockback = 54;
      tint = 0xffcc80;
    } else {
      return;
    }

    const pulse = this.add.image(GAME_WIDTH / 2, WALL_Y - 20, 'shockwave')
      .setDepth(14).setTint(tint).setScale(0.55, 0.22).setAlpha(0.9);
    this.tweens.add({
      targets: pulse, scaleX: 7.5, scaleY: 2.2, alpha: 0, duration: 330,
      onComplete: () => pulse.destroy(),
    });
    targets.forEach((target) => {
      const wallElement: DamageElement = this.behaviorLoadout.wall === 'wall_pulse' ? 'lightning' : 'kinetic';
      const died = this.dealDamage(target, damage, wallElement, true);
      this.recordDamage('equipment', target);
      if (died) this.killZombie(target);
      else target.applyKnockback(knockback);
    });
    this.cameras.main.shake(130, 0.006);
    AudioSystem.play('lightning', { volume: 0.48 });
  }

  // ─── 击杀僵尸 ───

  private killZombie(zombie: Zombie): void {
    const isBoss = zombie.isBoss;
    const isSwarm = zombie.isBehavior('swarm');
    const killedElite = zombie.eliteAffix !== null;
    const wasSlowed = zombie.slowed;
    const wasMarked = zombie.marked;
    const wasBurning = this.burnEffects.some((effect) => effect.zombie === zombie);
    const wasCorroded = this.corrosionEffects.some((effect) => effect.zombie === zombie);
    if (isBoss) this.runBossKills++;
    // 击杀爆破感：共享粒子发射器，尸潮时不会为每只敌人创建新对象
    const particleCount = isBoss ? 40 : isSwarm ? 5 : 16;
    this.bloodEmitter.setPosition(zombie.x, zombie.y);
    this.bloodEmitter.setParticleTint(isBoss ? 0xffd54a : 0x8bc34a);
    this.bloodEmitter.explode(particleCount);
    if (!isSwarm || Math.random() < 0.25) {
      this.sparkEmitter.setPosition(zombie.x, zombie.y)
        .setParticleTint(isBoss ? 0xff4f81 : 0xffd54a)
        .explode(isBoss ? 28 : 8);
    }
    if (isBoss || zombie.eliteAffix) {
      this.smokeEmitter.setPosition(zombie.x, zombie.y)
        .setParticleTint(isBoss ? 0x7c3a6e : 0x52646b)
        .explode(isBoss ? 14 : 5);
    }

    // 击杀径向闪光 + 冲击波
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

    if (this.wallSlotActive && this.behaviorLoadout.wall === 'wall_salvage' && (killedElite || isBoss)) {
      this.applyBehaviorSalvage(isBoss);
    }

    // 连杀
    this.skills.onKill();
    this.chargeCompanion('kill');
    if (this.endlessRun) {
      this.endlessRun.recordKill(zombie.coinValue, killedElite, isBoss);
      this.updateEndlessStatus();
    }
    this.applyFieldMedicIfReady();
    this.streakTimer = 0;
    this.addOverdriveCharge(zombie);

    // 过载虹吸：精英/首领击杀额外充能
    if ((killedElite || isBoss) && this.skills.overdriveSiphonAmount > 0) {
      this.grantOverdriveCharge(this.skills.overdriveSiphonAmount);
    }

    if (killedElite && this.battlefieldEvents.active?.def.key === 'eliteHunt' && this.eventGameplayStarted) {
      this.eventEliteKills++;
      this.runCoins += 12;
      this.grantOverdriveCharge(6);
      this.updateBattlefieldEventStatus(this.battlefieldEvents.active);
      this.showEventRewardFeedback(`精英击破 ${this.eventEliteKills}/${this.eventEliteQuota} · +12 金`, 0xff6e6e);
      if (this.eventEliteKills >= this.eventEliteQuota) this.completeBattlefieldEvent('huntComplete');
    }

    if (zombie.isBehavior('splitter') || zombie.eliteAffix === 'splitting') {
      const splitCount = zombie.isBehavior('splitter') && zombie.eliteAffix === 'splitting' ? 4 : 2;
      for (let i = 0; i < splitCount; i++) {
        const offset = (i - (splitCount - 1) / 2) * 24;
        this.spawnZombie(
          'swarm',
          Phaser.Math.Clamp(zombie.x + offset, 48, GAME_WIDTH - 48),
          zombie.y + (i % 2) * 10,
          null,
        );
      }
      AudioSystem.play('summon', { volume: 0.35 });
    }

    // 爆燃精英：死亡时引爆，波及同伴与防线
    if (zombie.eliteAffix === 'volatile') {
      this.doEquipmentExplosion(zombie.x, zombie.y, Math.max(25, this.skills.damage * 0.9), 130, zombie);
      if (WALL_Y - zombie.y < 260) this.damageWall(8);
    }

    // 火成岩流：灼烧中的尸体把火焰扩散给周围敌人
    const pyroTargets = this.skills.pyroclastTargets;
    if (pyroTargets > 0 && wasBurning) {
      const burnDps = Math.max(this.skills.burnDps * MetaUpgrades.burnMultiplier(), this.skills.damage * 0.12);
      this.aliveZombies()
        .filter((z) => z !== zombie && Phaser.Math.Distance.Between(zombie.x, zombie.y, z.x, z.y) < 140)
        .slice(0, pyroTargets)
        .forEach((z) => this.applyBurn(z, burnDps));
      this.explosionEmitter.setPosition(zombie.x, zombie.y).setParticleTint(0xff6d00).explode(8);
    }

    // 腐毒绽放：腐蚀传染给最近的敌人
    const bloomTargets = this.skills.toxicBloomTargets;
    if (bloomTargets > 0 && wasCorroded) {
      const corrosionDps = Math.max(this.skills.toxicDps, this.skills.damage * 0.1);
      this.aliveZombies()
        .filter((z) => z !== zombie && Phaser.Math.Distance.Between(zombie.x, zombie.y, z.x, z.y) < 150)
        .sort((a, b) => Phaser.Math.Distance.Between(zombie.x, zombie.y, a.x, a.y)
          - Phaser.Math.Distance.Between(zombie.x, zombie.y, b.x, b.x))
        .slice(0, bloomTargets)
        .forEach((z) => this.applyCorrosion(z, corrosionDps));
      this.explosionEmitter.setPosition(zombie.x, zombie.y).setParticleTint(0x9ccc65).explode(10);
    }

    // 冰碎新星：击杀被减速的敌人引发冰爆
    if (wasSlowed && this.skills.cryoShatterMultiplier > 0) {
      const radius = this.skills.cryoShatterRadius;
      const damage = this.skills.damage * this.skills.cryoShatterMultiplier;
      const ring = this.add.image(zombie.x, zombie.y, 'shockwave').setDepth(13).setScale(0.3).setTint(0x80deea);
      this.tweens.add({
        targets: ring, scale: radius / 48, alpha: 0, duration: 300,
        onComplete: () => ring.destroy(),
      });
      for (const target of this.aliveZombies()) {
        if (target === zombie || Phaser.Math.Distance.Between(zombie.x, zombie.y, target.x, target.y) > radius) continue;
        target.applySlow(Math.min(this.skills.frostSlowMultiplier, 0.62), 1.6);
        const novaDied = this.dealDamage(target, damage, 'frost', true);
        this.recordDamage('explosion', target);
        if (novaDied) this.killZombie(target);
      }
    }

    // 爆炸弹效果
    if (this.skills.explosiveDamage > 0) {
      this.doExplosion(zombie.x, zombie.y);
    }

    // 掉金币
    const deepScanBonus = wasMarked ? 1 + this.skills.deepScanCoinBonus : 1;
    const gloryBossBonus = isBoss ? 1 + this.skills.gloryBossCoinBonus : 1;
    const luckyDouble = this.skills.luckyPennyChance > 0 && Math.random() < this.skills.luckyPennyChance ? 2 : 1;
    const value = Math.max(1,
      Math.round(
        zombie.coinValue
        * this.skills.coinMultiplier
        * this.challengeContractDef.coinMultiplier
        * this.levelModifier.coinMultiplier
        * deepScanBonus * gloryBossBonus * luckyDouble
        * (killedElite || isBoss ? this.skills.eliteBountyMultiplier * this.levelModifier.eliteBountyMultiplier : 1)
        * (this.dailyChallenge?.modifier.key === 'eliteBounty' && killedElite ? 1.5 : 1),
      ) + MetaUpgrades.flatCoinBonus() + this.skills.bountyFlatCoins,
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

    // 嗜血弹头：击杀修复墙体（血肉堡垒同步补盾）
    if (this.skills.vampiricRepairRatio > 0 && this.wallHp > 0) {
      const amount = Math.max(1, Math.round(this.wallMaxHp * this.skills.vampiricRepairRatio));
      const repaired = Math.min(this.wallMaxHp - this.wallHp, Math.round(amount * this.skills.repairBonus));
      if (repaired > 0) this.wallHp += repaired;
      if (this.skills.hasSynergy('bloodFortress')) {
        this.wallShield = Math.min(this.wallMaxHp * 0.5, this.wallShield + amount * 0.5);
      }
    }

    // 自爆者死亡爆炸
    if (zombie.isBehavior('exploder') && zombie.onExplode) {
      zombie.onExplode(zombie.x, zombie.y);
    }

    // 死亡动画后回收
    zombie.die(() => {
      zombie.recycle();
    });
  }

  private applyBehaviorSalvage(isBoss: boolean): void {
    this.behaviorTelemetry.salvageRepairs++;
    const requested = Math.max(1, Math.round(this.wallMaxHp * (isBoss ? 0.14 : 0.045)));
    const repaired = Math.min(requested, Math.max(0, this.wallMaxHp - this.wallHp));
    if (repaired <= 0) return;
    this.wallHp += repaired;
    const label = this.add.text(GAME_WIDTH / 2, WALL_Y - 42, `回收修复 +${repaired}`, {
      fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: '#81c784',
      stroke: '#102218', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: label, y: label.y - 38, alpha: 0, duration: 820,
      onComplete: () => label.destroy(),
    });
    AudioSystem.play('heal', { volume: 0.5 });
  }

  // ─── 工具方法 ───

  private aliveZombies(): Zombie[] {
    return (this.zombies.getChildren() as Zombie[]).filter((z) => z.active && z.hp > 0);
  }

  private createEmptyDamageTotals(): Record<DamageSourceKey, number> {
    return {
      bullet: 0, burn: 0, toxic: 0, explosion: 0, missile: 0, airSupport: 0,
      laser: 0, lightning: 0, gravity: 0, mine: 0, support: 0, thorns: 0,
      equipment: 0,
      companion: 0,
    };
  }

  private recordDamage(source: DamageSourceKey, zombie: Zombie): void {
    if (zombie.lastDamageTaken <= 0) return;
    this.damageTotals[source] += zombie.lastDamageTaken;
  }

  getDamageBreakdown(): { key: DamageSourceKey; label: string; damage: number; percent: number }[] {
    const total = Object.values(this.damageTotals).reduce((sum, value) => sum + value, 0);
    return (Object.keys(this.damageTotals) as DamageSourceKey[])
      .map((key) => ({
        key,
        label: DAMAGE_SOURCE_LABELS[key],
        damage: Math.round(this.damageTotals[key]),
        percent: total > 0 ? this.damageTotals[key] / total : 0,
      }))
      .filter((entry) => entry.damage > 0)
      .sort((a, b) => b.damage - a.damage);
  }

  setPerformanceMonitoring(enabled: boolean): void {
    this.performanceStats.enabled = enabled;
    if (enabled) this.performanceLowFps = this.game.loop.actualFps || 60;
  }

  private updatePerformanceStats(dt: number, alive: Zombie[]): void {
    if (!this.performanceStats.enabled) return;
    const fps = this.game.loop.actualFps || 60;
    this.performanceLowFps = Math.min(this.performanceLowFps, fps);
    this.performanceSampleTimer += dt;
    if (this.performanceSampleTimer < 0.25) return;
    this.performanceSampleTimer = 0;
    const projectiles = (this.bullets.countActive(true) + this.missiles.countActive(true) + this.acidBalls.countActive(true));
    const particles = this.bloodEmitter.getAliveParticleCount()
      + this.explosionEmitter.getAliveParticleCount()
      + this.sparkEmitter.getAliveParticleCount()
      + this.smokeEmitter.getAliveParticleCount();
    this.performanceStats = {
      enabled: true,
      fps: Math.round(fps),
      lowFps: Math.round(this.performanceLowFps),
      enemies: alive.length,
      projectiles,
      particles,
      elites: alive.reduce((count, zombie) => count + (zombie.eliteAffix ? 1 : 0), 0),
    };
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
    burst.fillStyle(color, 0.18).fillCircle(0, 0, maxR);
    burst.fillStyle(0xffffff, 0.75).fillCircle(0, 0, isBoss ? 22 : 9);
    burst.lineStyle(isBoss ? 6 : 3, color, 0.92).strokeCircle(0, 0, maxR * 0.62);
    burst.lineStyle(isBoss ? 5 : 3, 0xffffff, 0.7);
    const rays = isBoss ? 12 : 8;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      burst.lineBetween(
        Math.cos(angle) * maxR * 0.2,
        Math.sin(angle) * maxR * 0.2,
        Math.cos(angle) * maxR,
        Math.sin(angle) * maxR,
      );
    }
    burst.setPosition(x, y);
    this.tweens.add({
      targets: burst, alpha: 0, scale: isBoss ? 1.45 : 1.7, duration: 320, ease: 'Cubic.Out',
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

    const icon = this.add.image(GAME_WIDTH / 2 - 180, 205, syn.icon).setDisplaySize(84, 84).setDepth(26);
    const title = this.add.text(GAME_WIDTH / 2 - 140, 185, syn.name, {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#1a2530',
    }).setDepth(26);
    const desc = this.add.text(GAME_WIDTH / 2 - 140, 218, syn.desc, {
      fontFamily: FONT, fontSize: '18px', color: '#4a2500',
      wordWrap: { width: 305, useAdvancedWrap: true },
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
    if (this.finished || this.choosingUpgrade) {
      this.aimGraphics.clear();
      return;
    }
    const dt = delta / 1000;

    const alive = this.aliveZombies();
    this.enemyCount = alive.length;
    this.skills.setWallRatio(this.wallMaxHp > 0 ? this.wallHp / this.wallMaxHp : 0);
    this.skills.setCombo(this.hitCombo);
    this.skills.setOverdriveChargeValue(this.overdriveCharge);
    this.updatePerformanceStats(dt, alive);
    this.hordeProgress = this.waveManager.hordeProgress;
    this.updateConductorAuras(alive);

    if (this.waveStartDelay > 0) {
      this.waveStartDelay = Math.max(0, this.waveStartDelay - dt);
      if (this.waveStartDelay === 0) this.beginBattlefieldEventGameplay();
      // 延迟期内仍可瞄准
      this.cannon.update(dt, alive);
      this.drawAimLine();
      return;
    }

    const jammerCount = alive.reduce((count, zombie) => count + (zombie.isBehavior('jammer') ? 1 : 0), 0);
    const jammerMultiplier = Phaser.Math.Clamp(1 - jammerCount * 0.08, 0.65, 1);
    this.skills.setEnemyFireRateMultiplier(jammerMultiplier * this.eventFireRateMultiplier);
    this.updateBehaviorEquipment(dt, alive.length > 0);
    this.cannon.update(dt, alive);
    this.drawAimLine();
    this.waveManager.update(dt, alive.length);
    this.updateBattlefieldEvent(dt);

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
    this.updateGravityWells(effectiveDt, alive);
    this.updateMinefield(effectiveDt, alive);

    if (this.skills.airSupportInterval < Infinity) {
      this.airSupportTimer += effectiveDt;
      if (this.airSupportTimer >= this.skills.airSupportInterval) {
        this.airSupportTimer = 0;
        this.fireAirSupport();
      }
    }

    // 灼烧
    this.updateBurns(effectiveDt);
    this.updateCorrosion(effectiveDt);

    // 新机制周期行为
    this.updateNewMechanics(effectiveDt, alive);

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
      this.completeBattlefieldEvent('waveEnd');
      const clearedWave = this.waveManager.currentWave;
      this.runWavesCleared++;
      if (this.skills.nanoRepairRatio > 0 && this.wallHp < this.wallMaxHp) {
        const repair = Math.min(
          this.wallMaxHp - this.wallHp,
          Math.max(1, Math.round(this.wallMaxHp * this.skills.nanoRepairRatio * this.skills.repairBonus)),
        );
        this.wallHp += repair;
        this.showEventRewardFeedback(`纳米修复 +${repair}`, 0x69f0ae);
      }
      // 战争金库利息 + 战场回收员
      let waveIncome = this.skills.battlefieldRecyclerCoins;
      if (this.skills.warChestRate > 0 && this.runCoins > 0) {
        waveIncome += Math.min(this.skills.warChestCap, Math.round(this.runCoins * this.skills.warChestRate));
      }
      if (waveIncome > 0) {
        this.runCoins += waveIncome;
        this.showEventRewardFeedback(`波次结算 · +${waveIncome} 金`, 0xffd54a);
      }
      if (this.waveManager.isLastWave) {
        this.applySlowMo(0.8, 0.3);
        this.time.delayedCall(450, () => this.endLevel(true));
      } else {
        this.applySlowMo(0.5, 0.4);
        if (this.endlessRun) {
          this.endlessRun.completeWave(clearedWave, this.wallHp / this.wallMaxHp);
          this.isHordeActive = false;
          this.updateEndlessStatus();
        }
        if (this.contractWave === clearedWave) {
          this.contractWave = 0;
          this.contractStatus = '';
        }
        this.time.delayedCall(180, () => {
          if (this.endlessRun && clearedWave % 5 === 0) this.showEndlessMilestone(clearedWave);
          else if (this.contractOfferWaves.has(clearedWave)) this.showPressureContract();
          else this.showUpgradeChoices();
        });
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

  // ─── 老兵增援 ───

  /** 战斗开始时按「老兵增援」随机获得技能 */
  private applyVeteranStartSkills(): void {
    const count = this.skills.veteranStartCount;
    if (count <= 0) return;
    const veteranLevel = this.skills.getLevel('veteranStart');
    const pool = SKILLS.filter((skill) => skill.key !== 'emergencyRepair'
      && (veteranLevel >= 2 || skill.rarity === 'common' || skill.rarity === 'rare'));
    const picks: string[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const index = Math.floor(this.skillRandom() * pool.length);
      picks.push(pool[index].key);
      pool.splice(index, 1);
    }
    picks.forEach((key) => this.skills.apply(key));
    if (picks.length > 0) {
      const names = picks.map((key) => getSkill(key).name).join('、');
      this.time.delayedCall(400, () => {
        this.showEventRewardFeedback(`老兵增援 · ${names}`, 0xce93d8);
      });
    }
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
        .text(GAME_WIDTH / 2, 236, `还可选择 ${this.preGamePicksLeft} 项 · 选满后敌军规模提升 ${Math.round((PRE_GAME_MONSTER_MULTIPLIER - 1) * 100)}%`, {
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
    this.waveManager.setMonsterMultiplier(
      PRE_GAME_MONSTER_MULTIPLIER
      * (this.dailyChallenge?.modifier.enemyCountMultiplier ?? 1)
      * this.challengeContractDef.enemyCountMultiplier
      * this.levelModifier.enemyCountMultiplier,
    );
    this.physics.resume();
    this.beginWave();
  }

  private updateEndlessStatus(): void {
    const run = this.endlessRun;
    if (!run) {
      this.endlessStatus = '';
      return;
    }
    this.endlessStatus = `无尽 #${run.code} · ${run.score} 分 · 变异 ${run.totalMutationStacks}`;
  }

  private showEndlessMilestone(wave: number): void {
    const milestone = this.endlessRun?.addMilestone(wave);
    if (!milestone || this.finished) {
      this.showUpgradeChoices();
      return;
    }
    this.choosingUpgrade = true;
    this.physics.pause();
    const repaired = Math.round(this.wallMaxHp * milestone.repairRatio);
    this.wallHp = Math.min(this.wallMaxHp, this.wallHp + repaired);
    this.runCoins += milestone.coins;
    this.grantOverdriveCharge(milestone.overdrive);
    this.endlessColor = milestone.mutation.def.color;
    this.updateEndlessStatus();

    const overlay = createOverlay(this, 0.72).setDepth(30);
    const panel = this.add.graphics().setDepth(31);
    panel.fillStyle(0x101820, 0.98).fillRoundedRect(46, 224, GAME_WIDTH - 92, 590, 8);
    panel.lineStyle(3, milestone.mutation.def.color, 0.9)
      .strokeRoundedRect(46, 224, GAME_WIDTH - 92, 590, 8);
    const title = this.add.text(GAME_WIDTH / 2, 294, `第 ${wave} 波突破`, {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#ffd54a',
      stroke: '#1a2530', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(32);
    const mutation = this.add.text(GAME_WIDTH / 2, 390, milestone.mutation.def.name, {
      fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: milestone.mutation.def.colorHex,
      stroke: '#1a2530', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(32).setScale(0.4);
    this.tweens.add({ targets: mutation, scale: 1, duration: 320, ease: 'Back.Out' });
    const stacks = this.add.text(
      GAME_WIDTH / 2,
      448,
      `${milestone.mutation.def.danger} · 层数 ${milestone.mutation.stacks}`,
      { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ff8a80' },
    ).setOrigin(0.5).setDepth(32);
    const reward = this.add.text(
      GAME_WIDTH / 2,
      548,
      `防线修复 ${repaired}\n过载 +${milestone.overdrive}\n金币 +${milestone.coins}`,
      { fontFamily: FONT, fontSize: '25px', fontStyle: 'bold', color: '#69f0ae', align: 'center', lineSpacing: 14 },
    ).setOrigin(0.5).setDepth(32);
    const next = this.add.text(GAME_WIDTH / 2, 718, '稀有军火投送中', {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#90caf9',
    }).setOrigin(0.5).setDepth(32);
    this.cameras.main.flash(220, 255, 167, 38, false);
    AudioSystem.play('upgrade', { volume: 0.9 });

    this.time.delayedCall(1650, () => {
      [overlay, panel, title, mutation, stacks, reward, next].forEach((object) => object.destroy());
      if (this.finished) return;
      this.choosingUpgrade = false;
      this.showUpgradeChoices({ title: '无尽补给 · 稀有保底', minimumRarity: 'rare', accent: '#69f0ae' });
    });
  }

  // ─── 三选一技能选择 ───

  private showPressureContract(): void {
    if (this.choosingUpgrade || this.finished) return;
    this.choosingUpgrade = true;
    this.physics.pause();
    const nextWave = this.waveManager.currentWave + 1;
    const rewardCoins = 45 + this.level.id * 8;
    const overlay = createOverlay(this, 0.72).setDepth(30);
    const panel = this.add.graphics().setDepth(31);
    panel.fillStyle(0x121b22, 0.98).fillRoundedRect(54, 220, GAME_WIDTH - 108, 690, 8);
    panel.lineStyle(3, 0xff5252, 0.8).strokeRoundedRect(54, 220, GAME_WIDTH - 108, 690, 8);
    const title = this.add.text(GAME_WIDTH / 2, 286, '压力契约', {
      fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#ff6e6e',
      stroke: '#260b0b', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(32);
    const subtitle = this.add.text(GAME_WIDTH / 2, 346, `下一波 · 第 ${nextWave} 波`, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#b0bec5',
    }).setOrigin(0.5).setDepth(32);

    const danger = this.add.text(104, 430,
      '危险增幅\n\n敌军规模 +38%\n移动速度 +14%\n精英出现率 +20%', {
        fontFamily: FONT, fontSize: '25px', fontStyle: 'bold', color: '#ff8a80',
        lineSpacing: 12,
      }).setDepth(32);
    const reward = this.add.text(390, 430,
      `契约军火\n\n稀有以上三选一\n立即获得 ${rewardCoins} 金\n精英掉落翻倍`, {
        fontFamily: FONT, fontSize: '25px', fontStyle: 'bold', color: '#69f0ae',
        lineSpacing: 12,
      }).setDepth(32);

    const contractUi: Phaser.GameObjects.GameObject[] = [overlay, panel, title, subtitle, danger, reward];
    const cleanup = () => {
      contractUi.forEach((item) => item.destroy());
      this.choosingUpgrade = false;
    };
    const accept = createButton(this, GAME_WIDTH / 2, 720, '签下契约', () => {
      cleanup();
      this.contractWave = nextWave;
      this.contractStatus = `压力契约 · 第 ${nextWave} 波`;
      this.waveManager.setNextWaveMultiplier(1.38);
      this.runCoins += rewardCoins;
      AudioSystem.play('upgrade');
      this.showUpgradeChoices({ title: '契约军火 · 稀有保底', minimumRarity: 'rare', accent: '#69f0ae' });
    }, { width: 360, height: 82, color: 0xa83232, colorDown: 0x7a2020, fontSize: 30 });
    const decline = createButton(this, GAME_WIDTH / 2, 830, '稳守阵线', () => {
      cleanup();
      this.showUpgradeChoices();
    }, { width: 300, height: 68, color: 0x455a64, colorDown: 0x33434d, fontSize: 25 });
    accept.setDepth(32);
    decline.setDepth(32);
    contractUi.push(accept, decline);
  }

  private showUpgradeChoices(options: { title?: string; minimumRarity?: Rarity; accent?: string } = {}): void {
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

      let choices = this.skills.rollChoices(this.skills.choiceCount, options.minimumRarity ?? 'common');
      if (choices.length === 0 && options.minimumRarity && options.minimumRarity !== 'common') {
        choices = this.skills.rollChoices(this.skills.choiceCount);
      }
      if (choices.length === 0) {
        this.resumeAfterChoice();
        return;
      }

      overlay = createOverlay(this, 0.6).setDepth(30);
      title = this.add
        .text(GAME_WIDTH / 2, 180, options.title ?? '选择一项强化', {
          fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: options.accent ?? '#ffffff',
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

      // 选项数量可能超过 3（战术网络），按比例压缩卡片间距与尺寸
      const choiceCount = choices.length;
      const gap = choiceCount >= 4 ? 12 : 20;
      const cardW = choiceCount >= 4
        ? Math.floor((GAME_WIDTH - 24 - gap * (choiceCount - 1)) / choiceCount)
        : 190;
      const cardScale = choiceCount >= 4 ? cardW / 190 : 1;
      const totalW = choiceCount * cardW + (choiceCount - 1) * gap;
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
        }, cardScale);
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
      const rbTxt = this.add.text(0, -2, `🔄 重铸 · ${rerollCost} 金`, {
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

  private createSkillCard(x: number, y: number, choice: RollChoice, onPick: () => void, cardScale = 1): Phaser.GameObjects.Container {
    const { skill, currentLevel, nearSynergies, synergyHints } = choice;
    const w = 180;
    const hasNearSynergy = nearSynergies.length > 0;
    const h = hasNearSynergy ? 370 : 320;
    const rarityColor = RARITY_HEX[skill.rarity];

    const g = this.add.graphics();
    const borderColor = parseInt(rarityColor.replace('#', ''), 16);
    // 阴影、深色复合材质和顶部稀有度光带。
    g.fillStyle(0x000000, 0.42).fillRoundedRect(-w / 2 + 5, -h / 2 + 9, w, h, 12);
    g.fillGradientStyle(0x243540, 0x243540, 0x111a21, 0x111a21, 1)
      .fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.fillStyle(0xffffff, 0.035).fillRoundedRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 8);
    g.fillGradientStyle(borderColor, borderColor, 0x111a21, 0x111a21, 0.34)
      .fillRoundedRect(-w / 2, -h / 2, w, 64, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(3, borderColor, 0.94).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.lineStyle(1, 0xffffff, 0.15).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 8);
    // 军械卡片角标，缩小时比细密纹理更清晰。
    g.lineStyle(3, borderColor, 0.85)
      .lineBetween(-w / 2 + 9, -h / 2 + 22, -w / 2 + 9, -h / 2 + 9)
      .lineBetween(-w / 2 + 9, -h / 2 + 9, -w / 2 + 22, -h / 2 + 9)
      .lineBetween(w / 2 - 9, h / 2 - 22, w / 2 - 9, h / 2 - 9)
      .lineBetween(w / 2 - 9, h / 2 - 9, w / 2 - 22, h / 2 - 9);
    g.fillStyle(borderColor, 0.8).fillCircle(0, h / 2 - 11, 3);
    // 即将激活组合技的高亮边框
    if (hasNearSynergy) {
      g.lineStyle(3, 0xffa726, 0.9).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 20);
    }

    const rarityText = this.add
      .text(0, -h / 2 + 25, skill.rarity === 'legendary' ? '传说' : skill.rarity === 'epic' ? '史诗' : skill.rarity === 'rare' ? '稀有' : '普通', {
        fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: rarityColor,
      })
      .setOrigin(0.5);

    const pathNames = BUILD_PATHS
      .filter((path) => path.goals.some((goal) => goal.skill === skill.key))
      .map((path) => path.name);
    const pathText = this.add.text(0, -h / 2 + 62, pathNames.length > 0 ? `流派 · ${pathNames.join(' / ')}` : `战术 · ${skill.category === 'defense' ? '防线' : skill.category === 'utility' ? '支援' : '通用'}`, {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#8fa3b0',
    }).setOrigin(0.5);

    const iconHalo = this.add.graphics();
    iconHalo.fillStyle(borderColor, 0.08).fillCircle(0, -50, 55);
    iconHalo.lineStyle(2, borderColor, 0.44).strokeCircle(0, -50, 44);
    iconHalo.lineStyle(1, 0xffffff, 0.18).arc(0, -50, 37, 3.4, 5.8);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      iconHalo.lineStyle(2, borderColor, 0.35).lineBetween(
        Math.cos(angle) * 47,
        -50 + Math.sin(angle) * 47,
        Math.cos(angle) * 53,
        -50 + Math.sin(angle) * 53,
      );
    }
    const icon = this.add.image(0, -50, skill.icon).setScale(1.15);
    const name = this.add
      .text(0, 20, skill.name, {
        fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5);
    const lv = this.add
      .text(0, 55, currentLevel === 0 ? '新技能!' : `Lv.${currentLevel} → Lv.${currentLevel + 1}`,
        textStyle(18, '#8fbf8f'))
      .setOrigin(0.5);
    const wrappedDesc = skill.desc.match(/.{1,10}/g)?.join('\n') ?? skill.desc;
    const desc = this.add
      .text(0, 100, wrappedDesc, { ...textStyle(17, '#aab8c2'), align: 'center', lineSpacing: 2 })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [g, rarityText, pathText, iconHalo, icon, name, lv, desc];

    // 组合技提示
    if (hasNearSynergy) {
      const nearText = nearSynergies.map((s) => `${s.ultimate ? '终极进化' : '可激活'}: ${s.name}`).join('\n');
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
    card.on('pointerdown', () => { pressed = true; card.setScale(1.06 * cardScale); });
    card.on('pointerover', () => card.setScale(1.06 * cardScale));
    card.on('pointerout', () => { pressed = false; card.setScale(cardScale); });
    card.on('pointerup', () => { if (pressed) onPick(); });

    card.setScale(0.8 * cardScale).setAlpha(0);
    this.tweens.add({ targets: card, scale: cardScale, alpha: 1, duration: 220, ease: 'Back.Out' });
    if (hasNearSynergy) {
      this.tweens.add({ targets: iconHalo, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    return card;
  }

  private resumeAfterChoice(): void {
    this.choosingUpgrade = false;
    this.transitioning = false;
    this.physics.resume();
    this.beginWave();
  }

  // ─── 结算 ───

  finishEndlessRun(): void {
    if (this.endlessRun) this.endLevel(false);
  }

  private endLevel(victory: boolean): void {
    if (this.finished) return;
    if (this.endlessRun) victory = false;
    this.finished = true;
    this.transitioning = false;
    this.battlefieldEvents.finishActive();
    this.cleanupBattlefieldEventObjects();
    this.eventEnemySpeedMultiplier = 1;
    this.eventFireRateMultiplier = 1;
    this.eventEliteQuota = 0;
    this.eventEliteSpawned = 0;
    this.eventEliteKills = 0;
    this.waveStartDelay = 0;
    this.eventGameplayStarted = false;
    this.battlefieldEventStatus = '';
    this.battlefieldEventProgress = 0;
    this.physics.pause();
    AudioSystem.stopBGM();
    AudioSystem.play(victory ? 'win' : 'lose');

    let coinsEarned: number;
    let stars = 0;
    let dailyFirstClear = false;
    if (this.endlessRun) {
      coinsEarned = Math.floor(this.runCoins * 0.7);
      SaveManager.recordEndlessRun(this.waveManager.currentWave, this.endlessRun.score);
    } else if (victory) {
      stars = starsForWallRatio(this.wallHp / this.wallMaxHp);
      if (this.dailyChallenge) {
        dailyFirstClear = !SaveManager.hasDailyClear(this.dailyChallenge.dateKey);
        coinsEarned = this.runCoins + (dailyFirstClear
          ? this.dailyChallenge.firstClearReward
          : this.dailyChallenge.repeatReward);
        SaveManager.recordDailyClear(this.dailyChallenge.dateKey, stars);
      } else {
        const clearReward = Math.round(
          levelClearReward(this.level.id, stars) * this.challengeContractDef.coinMultiplier,
        );
        coinsEarned = this.runCoins + clearReward;
        SaveManager.recordLevelClear(this.level.id, stars, LEVELS.length);
      }
    } else {
      coinsEarned = Math.floor(this.runCoins / 2);
    }
    const wallRatio = this.wallMaxHp > 0 ? this.wallHp / this.wallMaxHp : 0;
    SaveManager.recordCombatProgress({
      kills: this.skills.totalKills,
      waves: this.runWavesCleared,
      overdrives: this.runOverdriveUses,
      synergies: this.runSynergiesActivated,
      bosses: this.runBossKills,
      victories: victory ? 1 : 0,
      maxStreak: this.skills.maxKillStreak,
      endlessWave: this.endlessRun ? this.waveManager.currentWave : 0,
      perfectVictories: victory && wallRatio >= 0.9 ? 1 : 0,
    });
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
        dailyChallengeDate: this.dailyChallenge?.dateKey,
        dailyModifierName: this.dailyChallenge?.modifier.name,
        dailyFirstClear,
        endlessSeed: this.endlessRun?.seed,
        endlessWave: this.endlessRun ? this.waveManager.currentWave : undefined,
        endlessScore: this.endlessRun?.score,
        endlessBestWave: this.endlessRun ? SaveManager.endlessBestWave : undefined,
        endlessBestScore: this.endlessRun ? SaveManager.endlessBestScore : undefined,
        endlessMutations: this.endlessRun?.activeMutations.map((mutation) =>
          `${mutation.def.name}${mutation.stacks > 1 ? `×${mutation.stacks}` : ''}`),
      });
    });
  }
}
