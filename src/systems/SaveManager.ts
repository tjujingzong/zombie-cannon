import type { MetaUpgradeKey } from '../data/balance';

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
}

const SAVE_KEY = 'zombie-cannon-save-v1';

function defaultSave(): SaveData {
  return {
    version: 1,
    coins: 0,
    unlockedLevel: 1,
    stars: {},
    meta: { damage: 0, fireRate: 0, wallHp: 0, coinBonus: 0 },
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
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // 与默认值合并，容忍旧版本缺字段
      const def = defaultSave();
      return {
        ...def,
        ...parsed,
        stars: { ...def.stars, ...(parsed.stars ?? {}) },
        meta: { ...def.meta, ...(parsed.meta ?? {}) },
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
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.save();
  }

  spendCoins(amount: number): boolean {
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
    this.data.stars[levelId] = Math.max(this.getStars(levelId), stars);
    if (levelId >= this.data.unlockedLevel && levelId < totalLevels) {
      this.data.unlockedLevel = levelId + 1;
    }
    this.save();
  }

  getMetaLevel(key: MetaUpgradeKey): number {
    return this.data.meta[key] ?? 0;
  }

  upgradeMeta(key: MetaUpgradeKey): void {
    this.data.meta[key] = this.getMetaLevel(key) + 1;
    this.save();
  }

  // 调试用：清空存档
  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

export const SaveManager = new SaveManagerImpl();
