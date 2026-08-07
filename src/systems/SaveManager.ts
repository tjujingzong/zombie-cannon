import { META_UPGRADES, type MetaUpgradeKey } from '../data/balance';
import type { ArmoryItemKind } from '../data/shop';

interface ArmorySave {
  owned: string[];
  equipped: Record<ArmoryItemKind, string>;
}

// 存档数据结构
export interface SaveData {
  version: number;
  coins: number;
  // 已解锁的最大关卡 id（1 表示只有第 1 关可玩）
  unlockedLevel: number;
  // 每关星级：{ levelId: stars }
  stars: Record<number, number>;
  // 局外养成等级
  meta: Record<MetaUpgradeKey, number>;
  armory: ArmorySave;
}

const SAVE_KEY = 'zombie-cannon-save-v1';

function defaultSave(): SaveData {
  return {
    version: 1,
    coins: 0,
    unlockedLevel: 1,
    stars: {},
    meta: { damage: 0, fireRate: 0, wallHp: 0, coinBonus: 0, overdriveStart: 0, salvage: 0 },
    armory: {
      owned: [],
      equipped: { background: 'default', decor: 'none', support: 'none' },
    },
  };
}

// localStorage 存档管理（Capacitor WebView 同样支持 localStorage）
class SaveManagerImpl {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const def = defaultSave();
      const num = (v: unknown, fallback: number): number =>
        typeof v === 'number' && Number.isFinite(v) ? v : fallback;
      const rec = (v: unknown): Record<string, unknown> =>
        typeof v === 'object' && v !== null && !Array.isArray(v)
          ? (v as Record<string, unknown>)
          : {};
      const filterNum = (o: Record<string, unknown>): Record<number, number> =>
        Object.fromEntries(
          Object.entries(o).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)),
        ) as Record<number, number>;
      const armory = rec(parsed.armory);
      const equipped = rec(armory.equipped);
      return {
        version: num(parsed.version, def.version),
        coins: num(parsed.coins, def.coins),
        unlockedLevel: num(parsed.unlockedLevel, def.unlockedLevel),
        stars: { ...def.stars, ...filterNum(rec(parsed.stars)) },
        meta: { ...def.meta, ...filterNum(rec(parsed.meta)) as Record<MetaUpgradeKey, number> },
        armory: {
          owned: Array.isArray(armory.owned)
            ? armory.owned.filter((key): key is string => typeof key === 'string')
            : def.armory.owned,
          equipped: {
            background: typeof equipped.background === 'string' ? equipped.background : def.armory.equipped.background,
            decor: typeof equipped.decor === 'string' ? equipped.decor : def.armory.equipped.decor,
            support: typeof equipped.support === 'string' ? equipped.support : def.armory.equipped.support,
          },
        },
      };
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // 存储不可用时静默失败（例如隐私模式）
    }
  }

  get coins(): number {
    return this.data.coins;
  }

  addCoins(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) return;
    this.data.coins += amount;
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.save();
    return true;
  }

  get unlockedLevel(): number {
    return this.data.unlockedLevel;
  }

  getStars(levelId: number): number {
    return this.data.stars[levelId] ?? 0;
  }

  // 通关结算：更新星级与解锁进度
  recordLevelClear(levelId: number, stars: number, totalLevels: number): void {
    const clamped = Math.min(3, Math.max(0, Math.floor(stars)));
    this.data.stars[levelId] = Math.max(this.getStars(levelId), clamped);
    if (levelId >= this.data.unlockedLevel && levelId < totalLevels) {
      this.data.unlockedLevel = levelId + 1;
    }
    this.save();
  }

  getMetaLevel(key: MetaUpgradeKey): number {
    return this.data.meta[key] ?? 0;
  }

  upgradeMeta(key: MetaUpgradeKey): void {
    if (this.getMetaLevel(key) >= META_UPGRADES[key].max) return;
    this.data.meta[key] = this.getMetaLevel(key) + 1;
    this.save();
  }

  ownsArmoryItem(key: string): boolean {
    return this.data.armory.owned.includes(key);
  }

  buyArmoryItem(key: string, cost: number): boolean {
    if (this.ownsArmoryItem(key) || !this.spendCoins(cost)) return false;
    this.data.armory.owned.push(key);
    this.save();
    return true;
  }

  equipArmoryItem(kind: ArmoryItemKind, key: string): void {
    if (key !== 'default' && key !== 'none' && !this.ownsArmoryItem(key)) return;
    this.data.armory.equipped[kind] = key;
    this.save();
  }

  getEquippedArmoryItem(kind: ArmoryItemKind): string {
    return this.data.armory.equipped[kind];
  }

  // 调试用：清空存档
  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

export const SaveManager = new SaveManagerImpl();
