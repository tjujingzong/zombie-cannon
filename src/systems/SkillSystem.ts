import { MetaUpgrades } from './MetaUpgrades';
import {
  SKILLS, SYNERGIES, getSkill,
  rarityWeight, type Rarity, type SynergyDef, type SkillDef,
} from '../data/skills';
import { BUILD_PATHS, type BuildPathKey } from '../data/combat';
import type { DamageElement } from '../data/zombies';
import type { RandomSource } from './SeededRandom';

/** 刷新结果项 */
export interface RollChoice {
  skill: SkillDef;
  currentLevel: number;
  /** 该技能能参与的组合技 */
  synergyHints: SynergyDef[];
  /** 差一个技能就能激活的组合技 */
  nearSynergies: SynergyDef[];
}

export interface BuildProgress {
  key: BuildPathKey;
  name: string;
  color: number;
  colorHex: string;
  tagline: string;
  progress: number;
  ultimateName: string;
  ultimateActive: boolean;
}

/**
 * 局内技能系统：管理技能等级、稀有度刷新、组合技检测
 */
export class SkillSystem {
  private levels: Record<string, number> = {};
  private activeSynergies: Set<string> = new Set();
  private overdriveActive = false;
  private enemyFireRateMultiplier = 1;
  private wallRatio = 1;
  /** 当前连击数（由场景每帧同步，用于惯性火力/临界连锁） */
  private comboCount = 0;
  /** 当前过载充能（由场景同步，用于过载聚变） */
  private overdriveChargeValue = 0;
  /** 关卡深渊词缀提供的重铸折扣 */
  private levelRerollDiscount = 0;
  /** 本波是否已使用免费重铸（重铸回响） */
  private waveFreeRerollUsed = false;

  /** 连杀计数 */
  killStreak = 0;
  /** 最大连杀 */
  maxKillStreak = 0;
  /** 本局总击杀 */
  totalKills = 0;
  /** 已使用 reroll 次数 */
  rerollsUsed = 0;

  /** 修墙回调 */
  onRepair: (ratio: number) => void = () => {};
  /** 增加墙体上限并同比补充当前耐久 */
  onWallCapacity: (ratio: number) => void = () => {};
  /** 组合技激活回调 */
  onSynergyActivated: (synergy: SynergyDef) => void = () => {};
  /** 连杀回调 */
  onKillStreak: (streak: number) => void = () => {};

  constructor(private readonly random: RandomSource = Math.random) {}

  // ── 属性计算 ──

  get damage(): number {
    const base = MetaUpgrades.baseDamage();
    const bonus = this.getLevel('firePower') * getSkill('firePower').perLevel
      + this.getLevel('titanRound') * getSkill('titanRound').perLevel
      + this.getLevel('glassCannon') * getSkill('glassCannon').perLevel
      + this.lastBreathBonus
      + this.overdriveFusionBonus;
    const lastStand = this.wallRatio <= 0.3
      ? this.getLevel('lastStand') * getSkill('lastStand').perLevel
      : 0;
    const apocalypse = this.hasSynergy('apocalypseArray') ? 0.25 : 0;
    return base * (1 + bonus + lastStand + apocalypse) * (this.overdriveActive ? 1.65 : 1);
  }

  /** 最后一口气：每损失 10% 墙血提高伤害 */
  private get lastBreathBonus(): number {
    const level = this.getLevel('lastBreath');
    if (level === 0) return 0;
    const missing = Math.max(0, 1 - this.wallRatio);
    return Math.floor(missing * 10) * level * getSkill('lastBreath').perLevel;
  }

  /** 过载聚变：按过载充能比例转化为伤害 */
  private get overdriveFusionBonus(): number {
    const level = this.getLevel('overdriveFusion');
    if (level === 0) return 0;
    let rate = level * getSkill('overdriveFusion').perLevel;
    if (this.hasSynergy('coldFusionReactor')) rate += 0.2;
    if (this.hasSynergy('apocalypseArray')) rate *= 2;
    return (this.overdriveChargeValue / 100) * rate;
  }

  get fireRate(): number {
    let rate = MetaUpgrades.baseFireRate();
    rate *= 1 + this.getLevel('rapidFire') * getSkill('rapidFire').perLevel;
    rate *= 1 + this.getLevel('swiftLoader') * getSkill('swiftLoader').perLevel;
    rate *= Math.max(0.5, 1 - this.getLevel('titanRound') * 0.06);
    // 惯性火力：连击越高攻速越快
    const momentum = this.getLevel('momentumFire');
    if (momentum > 0 && this.comboCount >= 25) {
      rate *= 1 + momentum * getSkill('momentumFire').perLevel * (this.comboCount >= 60 ? 2 : 1);
    }
    // 狂战协议：墙体战损越高攻速越快
    const berserker = this.getLevel('berserkerProtocol');
    if (berserker > 0 && this.wallRatio < 0.6) {
      const strain = Math.max(0, Math.min(1, (0.6 - this.wallRatio) / 0.6));
      rate *= 1 + berserker * getSkill('berserkerProtocol').perLevel * strain;
    }
    // 组合技：火力全开 - 多重炮管时攻速额外+50%
    if (this.hasSynergy('barrage') && this.getLevel('multiBarrel') > 0) {
      rate *= 1.5;
    }
    if (this.hasSynergy('infiniteBarrage')) rate *= 1.35;
    return rate * (this.overdriveActive ? 1.75 : 1) * this.enemyFireRateMultiplier;
  }

  get bulletCount(): number {
    return 1 + this.getLevel('multiBarrel');
  }

  get pierce(): number {
    return MetaUpgrades.basePierce() + this.getLevel('armorPiercing')
      + this.getLevel('depletedRounds') * getSkill('depletedRounds').perLevel
      + (this.overdriveActive ? 2 : 0);
  }

  get critChance(): number {
    let chance = MetaUpgrades.baseCritChance()
      + this.getLevel('criticalAim') * getSkill('criticalAim').perLevel
      + this.getLevel('swiftLoader') * 0.02;
    // 临界连锁：高连击提供额外暴击率
    const chain = this.getLevel('chainCritCombo');
    if (chain > 0 && this.comboCount >= 40) {
      chance += chain * getSkill('chainCritCombo').perLevel * (this.comboCount >= 80 ? 2 : 1);
    }
    return Math.min(0.85, chance);
  }

  /** 暴击伤害倍率（暴伤训练） */
  get critDamageMultiplier(): number {
    return MetaUpgrades.critDamageMultiplier();
  }

  get burnDps(): number {
    const lv = this.getLevel('burnBullets');
    if (lv === 0) return 0;
    const base = getSkill('burnBullets').perLevel;
    return base + (lv - 1) * 2;
  }

  get ricochetCount(): number {
    return this.getLevel('ricochet') + (this.hasSynergy('infiniteBarrage') ? 1 : 0);
  }

  get missileInterval(): number {
    const lv = this.getLevel('homingMissile');
    if (lv === 0) return Infinity;
    const interval = Math.max(2, 4 - (lv - 1) * 0.5);
    return this.hasSynergy('orbitalCommand') ? interval * 0.62 : interval;
  }

  get missileCount(): number {
    const base = this.hasSynergy('saturationStrike') ? 3 : 1;
    return base
      + (this.hasSynergy('orbitalCommand') ? 2 : 0)
      + this.getLevel('missileRack');
  }

  get explosiveDamage(): number {
    return this.getLevel('explosiveRound') * 20;
  }

  get explosiveRadius(): number {
    const cluster = this.getLevel('clusterWarhead') * getSkill('clusterWarhead').perLevel;
    return (80 + this.getLevel('explosiveRound') * 20) * (1 + cluster);
  }

  /** 暴击起爆：暴击命中引发的小型爆炸伤害系数 */
  get criticalDetonationMultiplier(): number {
    const level = this.getLevel('criticalDetonation');
    return level > 0 ? 0.35 + (level - 1) * 0.15 : 0;
  }

  /** 重锤冲击：主炮击退概率 */
  get heavyImpactChance(): number {
    return this.getLevel('heavyImpact') * getSkill('heavyImpact').perLevel;
  }

  /** 共振增幅：弱点命中额外增伤 */
  get resonanceBonus(): number {
    return this.getLevel('resonanceAmplifier') * getSkill('resonanceAmplifier').perLevel;
  }

  /** 弱点标记：被标记目标承受的全伤害加成 */
  get weaknessMarkBonus(): number {
    return this.getLevel('weaknessMark') * getSkill('weaknessMark').perLevel;
  }

  /** 火成岩流：死亡扩散火焰的目标数 */
  get pyroclastTargets(): number {
    const level = this.getLevel('pyroclastFlow');
    if (level === 0) return 0;
    return level + (this.hasSynergy('pyroclasmChain') ? 1 : 0);
  }

  /** 冰碎新星：击杀减速敌人引发冰爆（伤害系数） */
  get cryoShatterMultiplier(): number {
    const level = this.getLevel('cryoShatterNova');
    if (level === 0) return 0;
    return (0.5 + level * 0.25) * (this.hasSynergy('shatterstormNova') ? 1.3 : 1);
  }

  get cryoShatterRadius(): number {
    return 110 * (this.hasSynergy('shatterstormNova') ? 1.4 : 1);
  }

  /** 腐毒绽放：死亡腐蚀传染目标数 */
  get toxicBloomTargets(): number {
    const level = this.getLevel('toxicBloom');
    if (level === 0) return 0;
    return level + (this.hasSynergy('toxicMeltdown') ? 2 : 0);
  }

  /** 静电领域：近墙减速强度与范围 */
  get staticFieldSlow(): number {
    const level = this.getLevel('staticField');
    if (level === 0) return 0;
    return 0.08 + (level - 1) * getSkill('staticField').perLevel
      + (this.hasSynergy('permafrostPrison') ? 0.04 : 0);
  }

  get staticFieldRange(): number {
    return 260 + (this.hasSynergy('permafrostPrison') ? 80 : 0);
  }

  /** 电弧延长器：连锁闪电额外弹射与增伤 */
  get arcBounceBonus(): number {
    return this.getLevel('arcExtender') + (this.hasSynergy('superconductorGrid') ? 2 : 0);
  }

  get arcDamageMultiplier(): number {
    return 1 + this.getLevel('arcExtender') * 0.08;
  }

  /** 连击伤害每层加成（连击养护） */
  get comboDamagePerStack(): number {
    return 0.02 + this.getLevel('comboMaintenance') * getSkill('comboMaintenance').perLevel;
  }

  get hasLaser(): boolean {
    return this.getLevel('laserBeam') > 0;
  }

  get laserDps(): number {
    return this.damage * 0.5 * (1 + this.getLevel('lensFocus') * getSkill('lensFocus').perLevel);
  }

  get wallDamageReduction(): number {
    const base = this.getLevel('steelWall') * getSkill('steelWall').perLevel;
    const reactive = this.getLevel('reactiveArmor') * getSkill('reactiveArmor').perLevel;
    const synergy = this.hasSynergy('resilientCore') ? 0.08 : 0;
    return Math.min(0.86, base + reactive + synergy + (this.hasSynergy('eternalFortress') ? 0.07 : 0));
  }

  /** 玻璃大炮 + 应急隔舱相关的动态墙体承伤修正（由场景在 damageWall 中应用） */
  get glassCannonWallPenalty(): number {
    const penalty = this.getLevel('glassCannon') * 0.16;
    return Math.max(0, penalty - (this.hasSynergy('apocalypseArray') ? 0.08 : 0));
  }

  get bulkheadReduction(): number {
    const level = this.getLevel('emergencyBulkhead');
    if (level === 0 || this.wallRatio > 0.3) return 0;
    return level * getSkill('emergencyBulkhead').perLevel;
  }

  /** 防爆闸门：单次墙体伤害上限 */
  get blastDoorCap(): number {
    const level = this.getLevel('blastDoors');
    return level > 0 ? Math.max(12, 30 - level * getSkill('blastDoors').perLevel) : Infinity;
  }

  get thornsDamage(): number {
    const amplifier = this.getLevel('thornAmplifier') * getSkill('thornAmplifier').perLevel;
    const fortress = this.hasSynergy('thornFortress') ? 1.4 : 1;
    return this.getLevel('thorns') * getSkill('thorns').perLevel * (1 + amplifier) * fortress;
  }

  /** 反击火炮：墙体受击反击概率 */
  get counterBatteryChance(): number {
    return this.getLevel('counterBattery') * getSkill('counterBattery').perLevel;
  }

  /** 自动焊机：空窗期墙体回复速率（每秒最大生命比例） */
  get autoWelderRate(): number {
    const level = this.getLevel('autoWelder');
    if (level === 0) return 0;
    return level * getSkill('autoWelder').perLevel * (this.hasSynergy('ironDynasty') ? 1.5 : 1);
  }

  /** 保险协议：墙体首次倒下时的紧急修复比例 */
  get insuranceRepairRatio(): number {
    if (this.getLevel('insuranceProtocol') === 0) return 0;
    return this.hasSynergy('ironDynasty') ? 0.6 : getSkill('insuranceProtocol').perLevel;
  }

  /** 维修效率：所有墙体修复效果的增幅 */
  get repairBonus(): number {
    return 1 + this.getLevel('repairEfficiency') * getSkill('repairEfficiency').perLevel;
  }

  /** 晨间加固：每波开始的临时护盾量 */
  get dawnShieldAmount(): number {
    return this.getLevel('dawnFortify') * getSkill('dawnFortify').perLevel;
  }

  get hasIronWall(): boolean {
    return this.hasSynergy('ironWall');
  }

  get shieldInterval(): number {
    const lv = this.getLevel('energyShield');
    if (lv === 0) return Infinity;
    const base = 10;
    const fortressInterval = this.hasSynergy('fortress') ? base / 2 : base;
    return fortressInterval / (1 + this.getLevel('energyBackflow') * getSkill('energyBackflow').perLevel);
  }

  get shieldAmount(): number {
    const amount = 50 + this.getLevel('energyShield') * getSkill('energyShield').perLevel;
    const backflow = 1 + this.getLevel('energyBackflow') * 0.08;
    return amount * backflow * (this.hasSynergy('eternalFortress') ? 1.5 : 1);
  }

  get coinMultiplier(): number {
    let m = MetaUpgrades.coinMultiplier();
    m *= 1 + this.getLevel('goldRush') * getSkill('goldRush').perLevel;
    m *= 1 + this.getLevel('quartermaster') * getSkill('quartermaster').perLevel;
    return m;
  }

  /** 战争金库：波次结束利息率与上限 */
  get warChestRate(): number {
    const level = this.getLevel('warChest');
    if (level === 0) return 0;
    return level * getSkill('warChest').perLevel + (this.hasSynergy('goldenEra') ? 0.02 : 0);
  }

  get warChestCap(): number {
    const level = this.getLevel('warChest');
    return level * 60 * (this.hasSynergy('goldenEra') ? 2 : 1);
  }

  /** 幸运硬币：掉落翻倍概率 */
  get luckyPennyChance(): number {
    return this.getLevel('luckyPenny') * getSkill('luckyPenny').perLevel;
  }

  /** 过载虹吸：精英/首领击杀过载 */
  get overdriveSiphonAmount(): number {
    const amount = this.getLevel('overdriveSiphon') * getSkill('overdriveSiphon').perLevel;
    return amount * (this.hasSynergy('overdriveMomentum') ? 1.2 : 1);
  }

  /** 深层扫描：击杀被标记敌人金币加成 */
  get deepScanCoinBonus(): number {
    return this.getLevel('deepScanBounty') * getSkill('deepScanBounty').perLevel;
  }

  /** 军需官：每波开始补给金币 */
  get quartermasterWaveCoins(): number {
    return this.getLevel('quartermaster') * 8;
  }

  /** 补给契约：每 5 秒被动金币 */
  get supplyContractCoins(): number {
    return this.getLevel('supplyContract') * getSkill('supplyContract').perLevel;
  }

  /** 连杀盛宴等级（奖励规模） */
  get streakFeastLevel(): number {
    return this.getLevel('streakFeast');
  }

  /** 赏金弹头：每次击杀固定金币 */
  get bountyFlatCoins(): number {
    return this.getLevel('bountyRounds') * getSkill('bountyRounds').perLevel;
  }

  /** 战场回收员：清波金币 */
  get battlefieldRecyclerCoins(): number {
    return this.getLevel('battlefieldRecycler') * getSkill('battlefieldRecycler').perLevel;
  }

  /** 荣耀猎手：首领增伤与首领金币加成 */
  get gloryBossDamageBonus(): number {
    return this.getLevel('glorySeeker') * getSkill('glorySeeker').perLevel;
  }

  get gloryBossCoinBonus(): number {
    return this.getLevel('glorySeeker') > 0 ? 0.6 : 0;
  }

  /** 嗜血弹头：击杀修复比例（叠加血堡组合技时附带护盾） */
  get vampiricRepairRatio(): number {
    return this.getLevel('vampiricRounds') * getSkill('vampiricRounds').perLevel;
  }

  get hasMagnet(): boolean {
    return this.getLevel('magnet') > 0;
  }

  get frostSlowMultiplier(): number {
    const level = this.getLevel('frostRounds');
    if (level === 0) return 1;
    const amplifier = this.getLevel('cryoAmplifier') * 0.025;
    return Math.max(0.42, 1 - level * getSkill('frostRounds').perLevel - amplifier);
  }

  get executionThreshold(): number {
    const level = this.getLevel('executioner');
    const eliteBonus = this.getLevel('eliteExecutioner') * getSkill('eliteExecutioner').perLevel;
    const protocolBonus = this.hasSynergy('executionProtocol') ? 0.06 : 0;
    return level > 0 ? 0.18 + level * 0.06 + eliteBonus + protocolBonus : 0;
  }

  get executionDamageMultiplier(): number {
    const level = this.getLevel('executioner');
    const eliteBoost = this.getLevel('eliteExecutioner') > 0 ? 1.25 : 1;
    return level > 0 ? (1.45 + level * getSkill('executioner').perLevel) * eliteBoost : 1;
  }

  get airSupportInterval(): number {
    const level = this.getLevel('airSupport');
    if (level === 0) return Infinity;
    const interval = Math.max(1.8, 4.5 - level * 0.75);
    if (this.hasSynergy('droneSwarm')) return interval * (this.hasSynergy('orbitalCommand') ? 0.45 : 0.72);
    return this.hasSynergy('orbitalCommand') ? interval * 0.62 : interval;
  }

  get airSupportCount(): number {
    const level = this.getLevel('airSupport');
    const base = level >= 3 ? 2 : level > 0 ? 1 : 0;
    return base
      + (base > 0 && this.hasSynergy('droneSwarm') ? 2 : 0)
      + (base > 0 && this.hasSynergy('orbitalCommand') ? 2 : 0);
  }

  get gravityWellInterval(): number {
    const level = this.getLevel('gravityWell');
    return level > 0 ? Math.max(5.5, 9 - level) : Infinity;
  }

  get gravityWellRadius(): number {
    return 145 + this.getLevel('gravityWell') * 20 + this.getLevel('gravityLens') * 16;
  }

  get gravityWellDamage(): number {
    return this.damage * (0.24 + this.getLevel('gravityWell') * 0.08);
  }

  get mineInterval(): number {
    const level = this.getLevel('minefield');
    if (level === 0) return Infinity;
    const interval = Math.max(2.8, 5.8 - level * 0.8);
    return this.hasSynergy('eternalFortress') ? interval * 0.58 : interval;
  }

  get mineLimit(): number {
    const level = this.getLevel('minefield');
    const expanded = this.getLevel('expandedMinefield') * getSkill('expandedMinefield').perLevel;
    return level > 0 ? 3 + level * 2 + expanded : 0;
  }

  get mineDamage(): number {
    const expansion = 1 + this.getLevel('expandedMinefield') * 0.15;
    return this.damage * (1.8 + this.getLevel('minefield') * 0.65) * expansion;
  }

  get fieldMedicKillInterval(): number {
    const level = this.getLevel('fieldMedic');
    return level > 0 ? 22 - level * 4 : Infinity;
  }

  get fieldMedicRepairRatio(): number {
    const level = this.getLevel('fieldMedic');
    return level > 0 ? 0.025 + level * getSkill('fieldMedic').perLevel : 0;
  }

  get toxicDps(): number {
    const level = this.getLevel('toxicPayload');
    return level > 0 ? level * getSkill('toxicPayload').perLevel : 0;
  }

  get stormCoilChance(): number {
    const base = this.getLevel('stormCoil') * getSkill('stormCoil').perLevel;
    return Math.min(0.55, base
      + (this.hasSynergy('firestormCircuit') ? 0.12 : 0)
      + (this.hasSynergy('superconductorGrid') ? 0.06 : 0));
  }

  get weaknessBonus(): number {
    return MetaUpgrades.elementalWeaknessBonus()
      + this.getLevel('elementalMastery') * getSkill('elementalMastery').perLevel;
  }

  get eliteBossDamageMultiplier(): number {
    const base = 1 + this.getLevel('bossHunter') * getSkill('bossHunter').perLevel;
    const glory = 1 + this.gloryBossDamageBonus;
    return (this.hasSynergy('adaptiveHunter') ? base + 0.22 : base) * glory;
  }

  /** 弱点标记猎杀：被标记目标额外承受的猎杀增伤 */
  get markAndHuntBonus(): number {
    return this.hasSynergy('markAndHunt') ? 0.15 : 0;
  }

  get overdriveGainMultiplier(): number {
    return MetaUpgrades.overdriveGainMultiplier()
      * (1 + this.getLevel('overdriveReservoir') * getSkill('overdriveReservoir').perLevel);
  }

  get eliteBountyMultiplier(): number {
    return MetaUpgrades.eliteBountyMultiplier()
      * (1 + this.getLevel('salvageScanner') * getSkill('salvageScanner').perLevel)
      * (this.hasSynergy('requisitionNetwork') ? 1.2 : 1);
  }

  get nanoRepairRatio(): number {
    const value = this.getLevel('nanoRepair') * getSkill('nanoRepair').perLevel;
    return value * (this.hasSynergy('resilientCore') ? 1.5 : 1);
  }

  get emergencyBarrierAmount(): number {
    return this.getLevel('emergencyBarrier') * getSkill('emergencyBarrier').perLevel;
  }

  get repulsionBonus(): number {
    return this.getLevel('repulsionField') * getSkill('repulsionField').perLevel;
  }

  get shatterDamageMultiplier(): number {
    const value = this.getLevel('shatterRounds') * getSkill('shatterRounds').perLevel;
    return 1 + value * (this.hasSynergy('shatterstorm') ? 2 : 1);
  }

  get heatExecutionMultiplier(): number {
    return 1 + this.getLevel('heatExecution') * getSkill('heatExecution').perLevel;
  }

  get crowdDamagePerTen(): number {
    return this.getLevel('crowdBreaker') * getSkill('crowdBreaker').perLevel;
  }

  get clusterEdgeFloor(): number {
    const level = this.getLevel('clusterWarhead');
    return Math.min(0.7, 0.32 + level * 0.1 + (this.hasSynergy('siegeDoctrine') ? 0.12 : 0));
  }

  getElementDamageMultiplier(element: DamageElement): number {
    const keyByElement: Partial<Record<DamageElement, string>> = {
      kinetic: 'kineticCalibration',
      fire: 'incendiaryCore',
      frost: 'cryoAmplifier',
      energy: 'plasmaLance',
      explosive: 'demolitionExpert',
      gravity: 'gravityLens',
    };
    const skillKey = keyByElement[element];
    if (!skillKey) return 1;
    const level = this.getLevel(skillKey);
    return level > 0 ? 1 + level * getSkill(skillKey).perLevel : 1;
  }

  setWallRatio(ratio: number): void {
    this.wallRatio = Math.min(1, Math.max(0, ratio));
  }

  get isOverdriveActive(): boolean {
    return this.overdriveActive;
  }

  setOverdrive(active: boolean): void {
    this.overdriveActive = active;
  }

  setEnemyFireRateMultiplier(multiplier: number): void {
    this.enemyFireRateMultiplier = Math.min(1, Math.max(0.35, multiplier));
  }

  get luckBonus(): number {
    const requisition = this.getLevel('rareRequisition') * getSkill('rareRequisition').perLevel;
    return this.getLevel('luckyStar') * getSkill('luckyStar').perLevel
      + requisition
      + (this.hasSynergy('requisitionNetwork') ? 0.12 : 0)
      + (this.hasSynergy('commandNetwork') ? 0.1 : 0)
      + MetaUpgrades.luckBlessing();
  }

  /** 波次强化选项数量（战术网络/指挥网络） */
  get choiceCount(): number {
    return 3
      + (this.hasSkill('tacticalNetwork') ? 1 : 0)
      + (this.hasSynergy('commandNetwork') ? 1 : 0);
  }

  /** 老兵增援：战斗开始时随机获得的技能数量 */
  get veteranStartCount(): number {
    if (this.getLevel('veteranStart') === 0) return 0;
    return this.hasSynergy('veteranLegion') ? 2 : 1;
  }

  setCombo(count: number): void {
    this.comboCount = Math.max(0, count);
  }

  setOverdriveChargeValue(value: number): void {
    this.overdriveChargeValue = Math.max(0, Math.min(100, value));
  }

  setLevelRerollDiscount(discount: number): void {
    this.levelRerollDiscount = Math.max(0, Math.min(0.6, discount));
  }

  /** 每波开始重置免费重铸（重铸回响） */
  resetWaveReroll(): void {
    this.waveFreeRerollUsed = false;
  }

  /** 连杀伤害加成 */
  get streakDamageBonus(): number {
    const thresholds = [5, 15, 30, 50];
    const bonuses = [0.1, 0.2, 0.35, 0.5];
    let bonus = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.killStreak >= thresholds[i]) {
        bonus = bonuses[i];
        break;
      }
    }
    return bonus;
  }

  /** 金币拾取回血（黄金猎手组合技） */
  get healPerCoin(): number {
    return this.hasSynergy('goldHunter') ? 5 : 0;
  }

  // ── 连杀 ──

  onKill(): void {
    this.killStreak++;
    this.totalKills++;
    if (this.killStreak > this.maxKillStreak) {
      this.maxKillStreak = this.killStreak;
    }
    this.onKillStreak(this.killStreak);
  }

  resetStreak(): void {
    this.killStreak = 0;
  }

  // ── 技能查询 ──

  getLevel(key: string): number {
    return this.levels[key] ?? 0;
  }

  hasSkill(key: string): boolean {
    return this.getLevel(key) > 0;
  }

  hasSynergy(key: string): boolean {
    return this.activeSynergies.has(key);
  }

  getActiveSynergies(): SynergyDef[] {
    return SYNERGIES.filter((s) => this.activeSynergies.has(s.key));
  }

  getOwnedSkills(): { skill: SkillDef; level: number }[] {
    return SKILLS
      .map((skill) => ({ skill, level: this.getLevel(skill.key) }))
      .filter((entry) => entry.level > 0)
      .sort((a, b) => b.level - a.level || a.skill.name.localeCompare(b.skill.name, 'zh-CN'));
  }

  getBuildProgress(): BuildProgress[] {
    return BUILD_PATHS.map((path) => {
      const completed = path.goals.reduce(
        (sum, goal) => sum + Math.min(this.getLevel(goal.skill), goal.level) / goal.level,
        0,
      );
      const ultimate = SYNERGIES.find((synergy) => synergy.key === path.ultimateSynergy);
      return {
        key: path.key,
        name: path.name,
        color: path.color,
        colorHex: path.colorHex,
        tagline: path.tagline,
        progress: path.goals.length > 0 ? completed / path.goals.length : 0,
        ultimateName: ultimate?.name ?? '',
        ultimateActive: this.hasSynergy(path.ultimateSynergy),
      };
    });
  }

  // ── 技能刷新 ──

  /** 随机抽取 count 个技能选择 */
  rollChoices(count = 3, minimumRarity: Rarity = 'common'): RollChoice[] {
    interface AvailableItem { skill: SkillDef; currentLevel: number }
    const available: AvailableItem[] = [];
    const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

    for (const skill of SKILLS) {
      const lv = this.getLevel(skill.key);
      if (lv >= skill.maxLevel) continue;
      // repair 类技能（maxLevel=99）限制最多买3次
      if (skill.key === 'emergencyRepair' && lv >= 3) continue;
      if (rarityRank[skill.rarity] < rarityRank[minimumRarity]) continue;
      available.push({ skill, currentLevel: lv });
    }

    // 按稀有度加权随机
    const luckBonus = this.luckBonus;
    const weighted: { choice: RollChoice; weight: number }[] = available.map((c) => ({
      choice: {
        skill: c.skill,
        currentLevel: c.currentLevel,
        synergyHints: this.getSynergiesForSkill(c.skill.key),
        nearSynergies: this.getNearSynergies(c.skill.key),
      },
      weight: rarityWeight(c.skill.rarity, luckBonus),
    }));

    const result: RollChoice[] = [];
    const pool = [...weighted];
    while (result.length < count && pool.length > 0) {
      const totalWeight = pool.reduce((s, w) => s + w.weight, 0);
      let r = this.random() * totalWeight;
      let picked = -1;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) { picked = i; break; }
      }
      if (picked === -1) picked = pool.length - 1;
      result.push(pool[picked].choice);
      pool.splice(picked, 1);
    }

    // 排序：稀有度高的在前
    result.sort((a, b) => rarityRank[b.skill.rarity] - rarityRank[a.skill.rarity]);

    return result;
  }

  // ── Reroll 系统 ──

  /** reroll 花费金币数 */
  getRerollCost(): number {
    if (this.hasSkill('rerollEcho') && !this.waveFreeRerollUsed) return 0;
    const base = 30 + this.rerollsUsed * 20;
    const discount = this.getLevel('tacticalReserve') * getSkill('tacticalReserve').perLevel
      + this.getLevel('logisticsExpert') * getSkill('logisticsExpert').perLevel
      + (this.hasSynergy('armsNetwork') ? 0.15 : 0)
      + this.levelRerollDiscount;
    return Math.max(10, Math.round(base * Math.max(0.35, 1 - discount)));
  }

  canReroll(coins: number): boolean {
    return coins >= this.getRerollCost();
  }

  doReroll(): RollChoice[] {
    if (this.hasSkill('rerollEcho') && !this.waveFreeRerollUsed) {
      this.waveFreeRerollUsed = true;
    }
    this.rerollsUsed++;
    return this.rollChoices(3);
  }

  // ── 组合技提示 ──

  /** 某技能能参与哪些组合技 */
  private getSynergiesForSkill(skillKey: string): SynergyDef[] {
    return SYNERGIES.filter((s) =>
      s.requires.some((r) => r.skill === skillKey) && !this.activeSynergies.has(s.key),
    );
  }

  /** 差一个技能就能激活的组合技（已满足除一项外的所有条件） */
  private getNearSynergies(skillKey: string): SynergyDef[] {
    return SYNERGIES.filter((s) => {
      if (this.activeSynergies.has(s.key)) return false;
      if (!s.requires.some((r) => r.skill === skillKey)) return false;
      // 检查是否只差这一个技能
      const unsatisfied = s.requires.filter((r) => this.getLevel(r.skill) < r.minLevel);
      return unsatisfied.length === 1 && unsatisfied[0].skill === skillKey;
    });
  }

  /** 整体的 "差一个就激活" 组合技列表（不依赖某个特定技能） */
  getPendingSynergies(): { synergy: SynergyDef; missingSkill: string }[] {
    const result: { synergy: SynergyDef; missingSkill: string }[] = [];
    for (const syn of SYNERGIES) {
      if (this.activeSynergies.has(syn.key)) continue;
      const unsatisfied = syn.requires.filter((r) => this.getLevel(r.skill) < r.minLevel);
      if (unsatisfied.length === 1) {
        result.push({ synergy: syn, missingSkill: unsatisfied[0].skill });
      }
    }
    return result;
  }

  /** 应用技能升级 */
  apply(key: string): void {
    const skill = getSkill(key);
    const lv = this.getLevel(key);
    this.levels[key] = lv + 1;

    if (key === 'emergencyRepair') {
      this.onRepair(skill.perLevel);
    }
    if (key === 'reinforcedFoundation' || key === 'bulwarkAura') {
      this.onWallCapacity(skill.perLevel);
    }

    // 检查组合技
    this.checkSynergies();
  }

  // ── 组合技检测 ──

  private checkSynergies(): void {
    for (const syn of SYNERGIES) {
      if (this.activeSynergies.has(syn.key)) continue;
      const met = syn.requires.every((r) => this.getLevel(r.skill) >= r.minLevel);
      if (met) {
        this.activeSynergies.add(syn.key);
        this.onSynergyActivated(syn);
      }
    }
  }
}
