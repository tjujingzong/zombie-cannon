import { MetaUpgrades } from './MetaUpgrades';
import {
  SKILLS, SYNERGIES, getSkill,
  rarityWeight, type Rarity, type SynergyDef, type SkillDef,
} from '../data/skills';

/** 刷新结果项 */
export interface RollChoice {
  skill: SkillDef;
  currentLevel: number;
  /** 该技能能参与的组合技 */
  synergyHints: SynergyDef[];
  /** 差一个技能就能激活的组合技 */
  nearSynergies: SynergyDef[];
}

/**
 * 局内技能系统：管理技能等级、稀有度刷新、组合技检测
 */
export class SkillSystem {
  private levels: Record<string, number> = {};
  private activeSynergies: Set<string> = new Set();
  private overdriveActive = false;
  private enemyFireRateMultiplier = 1;

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
  /** 组合技激活回调 */
  onSynergyActivated: (synergy: SynergyDef) => void = () => {};
  /** 连杀回调 */
  onKillStreak: (streak: number) => void = () => {};

  // ── 属性计算 ──

  get damage(): number {
    const base = MetaUpgrades.baseDamage();
    const bonus = this.getLevel('firePower') * getSkill('firePower').perLevel;
    return base * (1 + bonus) * (this.overdriveActive ? 1.65 : 1);
  }

  get fireRate(): number {
    let rate = MetaUpgrades.baseFireRate();
    rate *= 1 + this.getLevel('rapidFire') * getSkill('rapidFire').perLevel;
    // 组合技：火力全开 - 多重炮管时攻速额外+50%
    if (this.hasSynergy('barrage') && this.getLevel('multiBarrel') > 0) {
      rate *= 1.5;
    }
    return rate * (this.overdriveActive ? 1.75 : 1) * this.enemyFireRateMultiplier;
  }

  get bulletCount(): number {
    return 1 + this.getLevel('multiBarrel');
  }

  get pierce(): number {
    return this.getLevel('armorPiercing') + (this.overdriveActive ? 2 : 0);
  }

  get critChance(): number {
    return this.getLevel('criticalAim') * getSkill('criticalAim').perLevel;
  }

  get burnDps(): number {
    const lv = this.getLevel('burnBullets');
    if (lv === 0) return 0;
    const base = getSkill('burnBullets').perLevel;
    return base + (lv - 1) * 2;
  }

  get ricochetCount(): number {
    return this.getLevel('ricochet');
  }

  get missileInterval(): number {
    const lv = this.getLevel('homingMissile');
    if (lv === 0) return Infinity;
    return Math.max(2, 4 - (lv - 1) * 0.5);
  }

  get missileCount(): number {
    if (!this.hasSynergy('saturationStrike')) return 1;
    return 3;
  }

  get explosiveDamage(): number {
    return this.getLevel('explosiveRound') * 20;
  }

  get explosiveRadius(): number {
    return 80 + this.getLevel('explosiveRound') * 20;
  }

  get hasLaser(): boolean {
    return this.getLevel('laserBeam') > 0;
  }

  get laserDps(): number {
    return this.damage * 0.5;
  }

  get wallDamageReduction(): number {
    return this.getLevel('steelWall') * getSkill('steelWall').perLevel;
  }

  get thornsDamage(): number {
    return this.getLevel('thorns') * getSkill('thorns').perLevel;
  }

  get hasIronWall(): boolean {
    return this.hasSynergy('ironWall');
  }

  get shieldInterval(): number {
    const lv = this.getLevel('energyShield');
    if (lv === 0) return Infinity;
    const base = 10;
    return this.hasSynergy('fortress') ? base / 2 : base;
  }

  get shieldAmount(): number {
    return 50 + this.getLevel('energyShield') * getSkill('energyShield').perLevel;
  }

  get coinMultiplier(): number {
    let m = MetaUpgrades.coinMultiplier();
    m *= 1 + this.getLevel('goldRush') * getSkill('goldRush').perLevel;
    return m;
  }

  get hasMagnet(): boolean {
    return this.getLevel('magnet') > 0;
  }

  get frostSlowMultiplier(): number {
    const level = this.getLevel('frostRounds');
    return level > 0 ? Math.max(0.55, 1 - level * getSkill('frostRounds').perLevel) : 1;
  }

  get executionThreshold(): number {
    const level = this.getLevel('executioner');
    return level > 0 ? 0.18 + level * 0.06 : 0;
  }

  get executionDamageMultiplier(): number {
    const level = this.getLevel('executioner');
    return level > 0 ? 1.45 + level * getSkill('executioner').perLevel : 1;
  }

  get airSupportInterval(): number {
    const level = this.getLevel('airSupport');
    if (level === 0) return Infinity;
    const interval = Math.max(1.8, 4.5 - level * 0.75);
    return this.hasSynergy('droneSwarm') ? interval * 0.72 : interval;
  }

  get airSupportCount(): number {
    const level = this.getLevel('airSupport');
    const base = level >= 3 ? 2 : level > 0 ? 1 : 0;
    return base + (base > 0 && this.hasSynergy('droneSwarm') ? 2 : 0);
  }

  get gravityWellInterval(): number {
    const level = this.getLevel('gravityWell');
    return level > 0 ? Math.max(5.5, 9 - level) : Infinity;
  }

  get gravityWellRadius(): number {
    return 145 + this.getLevel('gravityWell') * 20;
  }

  get gravityWellDamage(): number {
    return this.damage * (0.24 + this.getLevel('gravityWell') * 0.08);
  }

  get mineInterval(): number {
    const level = this.getLevel('minefield');
    return level > 0 ? Math.max(2.8, 5.8 - level * 0.8) : Infinity;
  }

  get mineLimit(): number {
    const level = this.getLevel('minefield');
    return level > 0 ? 3 + level * 2 : 0;
  }

  get mineDamage(): number {
    return this.damage * (1.8 + this.getLevel('minefield') * 0.65);
  }

  get fieldMedicKillInterval(): number {
    const level = this.getLevel('fieldMedic');
    return level > 0 ? 22 - level * 4 : Infinity;
  }

  get fieldMedicRepairRatio(): number {
    const level = this.getLevel('fieldMedic');
    return level > 0 ? 0.025 + level * getSkill('fieldMedic').perLevel : 0;
  }

  get isOverdriveActive(): boolean {
    return this.overdriveActive;
  }

  setOverdrive(active: boolean): void {
    this.overdriveActive = active;
  }

  setEnemyFireRateMultiplier(multiplier: number): void {
    this.enemyFireRateMultiplier = Math.min(1, Math.max(0.65, multiplier));
  }

  get luckBonus(): number {
    return this.getLevel('luckyStar') * getSkill('luckyStar').perLevel;
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

  // ── 技能刷新 ──

  /** 随机抽取 count 个技能选择 */
  rollChoices(count = 3): RollChoice[] {
    interface AvailableItem { skill: SkillDef; currentLevel: number }
    const available: AvailableItem[] = [];

    for (const skill of SKILLS) {
      const lv = this.getLevel(skill.key);
      if (lv >= skill.maxLevel) continue;
      // repair 类技能（maxLevel=99）限制最多买3次
      if (skill.key === 'emergencyRepair' && lv >= 3) continue;
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
      let r = Math.random() * totalWeight;
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
    const rarityOrder: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
    result.sort((a, b) => rarityOrder[b.skill.rarity] - rarityOrder[a.skill.rarity]);

    return result;
  }

  // ── Reroll 系统 ──

  /** reroll 花费金币数 */
  getRerollCost(): number {
    return 30 + this.rerollsUsed * 20;
  }

  canReroll(coins: number): boolean {
    return coins >= this.getRerollCost();
  }

  doReroll(): RollChoice[] {
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
