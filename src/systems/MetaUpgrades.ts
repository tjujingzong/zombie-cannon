import { CANNON_BASE_DAMAGE, CANNON_BASE_FIRE_RATE, WALL_BASE_HP } from '../data/balance';
import { SaveManager } from './SaveManager';

// 局外养成数值换算：读取存档等级，输出实际战斗初始属性
export const MetaUpgrades = {
  /** 局内初始攻击力 */
  baseDamage(): number {
    return CANNON_BASE_DAMAGE * (1 + SaveManager.getMetaLevel('damage') * 0.08);
  },

  /** 局内初始攻速（每秒发射数） */
  baseFireRate(): number {
    return CANNON_BASE_FIRE_RATE * (1 + SaveManager.getMetaLevel('fireRate') * 0.05);
  },

  /** 局内墙体上限 */
  wallMaxHp(): number {
    return Math.round(WALL_BASE_HP * (1 + SaveManager.getMetaLevel('wallHp') * 0.15));
  },

  /** 金币倍率 */
  coinMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('coinBonus') * 0.1;
  },

  initialOverdrive(): number {
    return SaveManager.getMetaLevel('overdriveStart') * 10;
  },

  flatCoinBonus(): number {
    return SaveManager.getMetaLevel('salvage');
  },

  baseCritChance(): number {
    return SaveManager.getMetaLevel('critTraining') * 0.015;
  },

  elementalWeaknessBonus(): number {
    return SaveManager.getMetaLevel('elementalResearch') * 0.03;
  },

  basePierce(): number {
    return Math.floor(SaveManager.getMetaLevel('penetration') / 3);
  },

  initialShield(): number {
    return SaveManager.getMetaLevel('startingShield') * 12;
  },

  overdriveGainMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('overdriveGain') * 0.05;
  },

  eliteBountyMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('eliteBounty') * 0.08;
  },

  /** 暴击伤害倍率（基础 2 倍） */
  critDamageMultiplier(): number {
    return 2 + SaveManager.getMetaLevel('critDamage') * 0.12;
  },

  /** 过载爆发持续时间（秒） */
  overdriveDuration(): number {
    return 8 + SaveManager.getMetaLevel('overdriveDuration') * 0.5;
  },

  /** 战斗空窗期墙体自修复速率（每秒回复的最大生命比例） */
  idleRepairRate(): number {
    return SaveManager.getMetaLevel('combatRepair') * 0.0012;
  },

  /** 每局开局金币 */
  startingFund(): number {
    return SaveManager.getMetaLevel('startingFund') * 40;
  },

  /** 精英出现率加成 */
  eliteChanceBonus(): number {
    return SaveManager.getMetaLevel('eliteRadar') * 0.015;
  },

  /** 灼烧伤害倍率 */
  burnMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('burnMastery') * 0.12;
  },

  /** 减速持续时间倍率 */
  slowDurationMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('frostMastery') * 0.08;
  },

  /** 导弹/空中支援伤害倍率 */
  missileDamageMultiplier(): number {
    return 1 + SaveManager.getMetaLevel('missilePayload') * 0.08;
  },

  /** 战前免费技能数量 */
  preGamePicks(): number {
    return 5 + Math.floor(SaveManager.getMetaLevel('preGameSupply') / 3);
  },

  /** 每次击杀附加过载 */
  flatKillOverdrive(): number {
    return SaveManager.getMetaLevel('killOverdrive') * 0.3;
  },

  /** 墙体受击反弹伤害比例 */
  wallSpikeRatio(): number {
    return SaveManager.getMetaLevel('wallSpikes') * 0.03;
  },

  /** 稀有度运气加成（用于技能刷新） */
  luckBlessing(): number {
    return SaveManager.getMetaLevel('luckyBless') * 0.04;
  },
};
