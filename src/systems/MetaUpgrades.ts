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
};
