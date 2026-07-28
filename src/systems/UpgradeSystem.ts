import { RUN_UPGRADES, RunUpgradeKey } from '../data/balance';
import { MetaUpgrades } from './MetaUpgrades';

// Fisher-Yates 洗牌（保持本模块不依赖引擎）
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 局内升级状态：管理本局玩家的战斗属性，
 * 波次间隙三选一时调用 rollChoices / apply。
 */
export class UpgradeSystem {
  private levels: Record<RunUpgradeKey, number> = {
    damage: 0,
    fireRate: 0,
    multishot: 0,
    pierce: 0,
    crit: 0,
    repair: 0,
  };

  /** 修墙回调（repair 选项即时生效） */
  onRepair: () => void = () => {};

  get damage(): number {
    return MetaUpgrades.baseDamage() * (1 + this.levels.damage * 0.3);
  }

  get fireRate(): number {
    return MetaUpgrades.baseFireRate() * (1 + this.levels.fireRate * 0.2);
  }

  /** 每次开火的子弹数 */
  get bulletCount(): number {
    return 1 + this.levels.multishot;
  }

  /** 子弹可穿透的额外敌人数 */
  get pierce(): number {
    return this.levels.pierce;
  }

  /** 暴击率 0~1 */
  get critChance(): number {
    return this.levels.crit * 0.1;
  }

  getLevel(key: RunUpgradeKey): number {
    return this.levels[key];
  }

  /** 随机抽取 3 个未满级的升级项 */
  rollChoices(count = 3): RunUpgradeKey[] {
    const available = (Object.keys(RUN_UPGRADES) as RunUpgradeKey[]).filter(
      (k) => this.levels[k] < RUN_UPGRADES[k].max
    );
    shuffle(available);
    return available.slice(0, count);
  }

  apply(key: RunUpgradeKey): void {
    this.levels[key]++;
    if (key === 'repair') {
      this.onRepair();
    }
  }
}
