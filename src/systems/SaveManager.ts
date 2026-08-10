import { META_UPGRADES, type MetaUpgradeKey } from '../data/balance';
import {
  ACHIEVEMENTS,
  OPERATION_METRIC_KEYS,
  createEmptyCareerStats,
  createEmptyOperationProgress,
  getAchievementProgress,
  getWeeklyOperation,
  type CareerStats,
  type CombatProgress,
  type OperationMetricKey,
  type OperationProgress,
  type WeeklyOperationDef,
} from '../data/operations';
import { ARMORY_ITEMS, type ArmoryItemKind } from '../data/shop';
import {
  DEFAULT_BEHAVIOR_LOADOUT,
  getBehaviorEquipment,
  isBehaviorEquipmentForSlot,
  type BehaviorEquipmentKey,
  type BehaviorEquipmentSlot,
  type BehaviorLoadout,
} from '../data/equipment';
import {
  DEFAULT_COMPANION_PROTOCOL,
  getCompanionProtocol,
  isCompanionProtocolKey,
  type CompanionProtocolKey,
} from '../data/companion';
import {
  DEFAULT_CHALLENGE_CONTRACT,
  isChallengeContractKey,
  type ChallengeContractKey,
} from '../data/challengeContracts';

interface ArmorySave {
  owned: string[];
  equipped: Record<ArmoryItemKind, string>;
}

interface BehaviorEquipmentSave {
  owned: BehaviorEquipmentKey[];
  equipped: BehaviorLoadout;
}

interface CompanionSave {
  owned: CompanionProtocolKey[];
  equipped: CompanionProtocolKey;
}

interface OperationsSave {
  lastSeenAt: number;
  weekly: {
    weekKey: string;
    progress: OperationProgress;
    claimed: string[];
    cacheClaimed: boolean;
  };
  career: CareerStats;
  claimedAchievements: string[];
}

export interface WeeklyCacheReward {
  coins: number;
  itemKey?: string;
}

// 存档数据结构
interface SaveData {
  version: number;
  coins: number;
  // 已解锁的最大关卡 id（1 表示只有第 1 关可玩）
  unlockedLevel: number;
  // 每关星级：{ levelId: stars }
  stars: Record<number, number>;
  // 局外养成等级
  meta: Record<MetaUpgradeKey, number>;
  armory: ArmorySave;
  behaviorEquipment: BehaviorEquipmentSave;
  companion: CompanionSave;
  challengeContract: ChallengeContractKey;
  dailyClears: Record<string, number>;
  endlessBestWave: number;
  endlessBestScore: number;
  operations: OperationsSave;
}

const SAVE_KEY = 'zombie-cannon-save-v1';
const SAVE_VERSION = 5;

function defaultOperations(now = Date.now()): OperationsSave {
  const operation = getWeeklyOperation(new Date(now));
  return {
    lastSeenAt: now,
    weekly: {
      weekKey: operation.weekKey,
      progress: createEmptyOperationProgress(),
      claimed: [],
      cacheClaimed: false,
    },
    career: createEmptyCareerStats(),
    claimedAchievements: [],
  };
}

function defaultSave(): SaveData {
  const emptyMeta = Object.fromEntries(
    (Object.keys(META_UPGRADES) as MetaUpgradeKey[]).map((key) => [key, 0]),
  ) as Record<MetaUpgradeKey, number>;
  return {
    version: SAVE_VERSION,
    coins: 0,
    unlockedLevel: 1,
    stars: {},
    meta: emptyMeta,
    armory: {
      owned: [],
      equipped: { background: 'default', decor: 'none', support: 'none' },
    },
    behaviorEquipment: {
      owned: Object.values(DEFAULT_BEHAVIOR_LOADOUT),
      equipped: { ...DEFAULT_BEHAVIOR_LOADOUT },
    },
    companion: {
      owned: [DEFAULT_COMPANION_PROTOCOL],
      equipped: DEFAULT_COMPANION_PROTOCOL,
    },
    challengeContract: DEFAULT_CHALLENGE_CONTRACT,
    dailyClears: {},
    endlessBestWave: 0,
    endlessBestScore: 0,
    operations: defaultOperations(),
  };
}

// localStorage 存档管理（Capacitor WebView 同样支持 localStorage）
class SaveManagerImpl {
  private data: SaveData;

  constructor() {
    this.data = this.load();
    this.save();
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
      const behaviorEquipment = rec(parsed.behaviorEquipment);
      const behaviorEquipped = rec(behaviorEquipment.equipped);
      const companion = rec(parsed.companion);
      const savedChallengeContract = isChallengeContractKey(parsed.challengeContract)
        ? parsed.challengeContract
        : DEFAULT_CHALLENGE_CONTRACT;
      const operations = rec(parsed.operations);
      const weekly = rec(operations.weekly);
      const savedLastSeenAt = num(operations.lastSeenAt, Date.now());
      const trustedNow = Math.max(Date.now(), savedLastSeenAt);
      const currentOperation = getWeeklyOperation(new Date(trustedNow));
      const readProgress = (source: Record<string, unknown>): OperationProgress => {
        const progress = createEmptyOperationProgress();
        OPERATION_METRIC_KEYS.forEach((key) => {
          progress[key] = Math.max(0, Math.floor(num(source[key], 0)));
        });
        return progress;
      };
      const savedWeekKey = typeof weekly.weekKey === 'string' ? weekly.weekKey : '';
      const weeklyIsCurrent = savedWeekKey === currentOperation.weekKey;
      const careerSource = rec(operations.career);
      const career = {
        ...readProgress(careerSource),
        perfectVictories: Math.max(0, Math.floor(num(careerSource.perfectVictories, 0))),
      };
      const starterEquipment = Object.values(DEFAULT_BEHAVIOR_LOADOUT);
      const ownedBehaviorEquipment = Array.from(new Set([
        ...starterEquipment,
        ...(Array.isArray(behaviorEquipment.owned)
          ? behaviorEquipment.owned.filter((key): key is BehaviorEquipmentKey =>
              typeof key === 'string' && getBehaviorEquipment(key) !== undefined)
          : []),
      ]));
      const readEquippedBehavior = (slot: BehaviorEquipmentSlot): BehaviorEquipmentKey => {
        const key = behaviorEquipped[slot];
        return isBehaviorEquipmentForSlot(key, slot) && ownedBehaviorEquipment.includes(key)
          ? key
          : DEFAULT_BEHAVIOR_LOADOUT[slot];
      };
      const ownedCompanionProtocols = Array.from(new Set([
        DEFAULT_COMPANION_PROTOCOL,
        ...(Array.isArray(companion.owned)
          ? companion.owned.filter(isCompanionProtocolKey)
          : []),
      ]));
      const equippedCompanion = isCompanionProtocolKey(companion.equipped)
        && ownedCompanionProtocols.includes(companion.equipped)
        ? companion.equipped
        : DEFAULT_COMPANION_PROTOCOL;
      return {
        version: SAVE_VERSION,
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
        behaviorEquipment: {
          owned: ownedBehaviorEquipment,
          equipped: {
            barrel: readEquippedBehavior('barrel'),
            ammo: readEquippedBehavior('ammo'),
            wall: readEquippedBehavior('wall'),
          },
        },
        companion: {
          owned: ownedCompanionProtocols,
          equipped: equippedCompanion,
        },
        challengeContract: savedChallengeContract,
        dailyClears: { ...filterNum(rec(parsed.dailyClears)) },
        endlessBestWave: num(parsed.endlessBestWave, def.endlessBestWave),
        endlessBestScore: num(parsed.endlessBestScore, def.endlessBestScore),
        operations: {
          lastSeenAt: trustedNow,
          weekly: weeklyIsCurrent ? {
            weekKey: currentOperation.weekKey,
            progress: readProgress(rec(weekly.progress)),
            claimed: Array.isArray(weekly.claimed)
              ? weekly.claimed.filter((id): id is string => typeof id === 'string')
              : [],
            cacheClaimed: weekly.cacheClaimed === true,
          } : {
            weekKey: currentOperation.weekKey,
            progress: createEmptyOperationProgress(),
            claimed: [],
            cacheClaimed: false,
          },
          career,
          claimedAchievements: Array.isArray(operations.claimedAchievements)
            ? operations.claimedAchievements.filter((id): id is string => typeof id === 'string')
            : [],
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

  exportSave(): string {
    return JSON.stringify({
      format: 'zombie-cannon-save',
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      save: this.data,
    }, null, 2);
  }

  importSave(raw: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const envelope = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    const candidate = envelope?.format === 'zombie-cannon-save' ? envelope.save : parsed;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    const candidateRecord = candidate as Record<string, unknown>;
    const version = candidateRecord.version;
    const coins = candidateRecord.coins;
    const level = candidateRecord.unlockedLevel;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > SAVE_VERSION) {
      return false;
    }
    if (typeof coins !== 'number' || !Number.isFinite(coins) || coins < 0) return false;
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) return false;
    if (!candidateRecord.meta || typeof candidateRecord.meta !== 'object') return false;

    const previous = localStorage.getItem(SAVE_KEY);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(candidate));
      this.data = this.load();
      this.save();
      return true;
    } catch {
      if (previous === null) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, previous);
      return false;
    }
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

  ownsBehaviorEquipment(key: BehaviorEquipmentKey): boolean {
    return this.data.behaviorEquipment.owned.includes(key);
  }

  buyBehaviorEquipment(key: BehaviorEquipmentKey): boolean {
    const item = getBehaviorEquipment(key);
    if (!item || this.ownsBehaviorEquipment(key) || !this.spendCoins(item.cost)) return false;
    this.data.behaviorEquipment.owned.push(key);
    this.save();
    return true;
  }

  equipBehaviorEquipment(slot: BehaviorEquipmentSlot, key: BehaviorEquipmentKey): boolean {
    if (!isBehaviorEquipmentForSlot(key, slot) || !this.ownsBehaviorEquipment(key)) return false;
    this.data.behaviorEquipment.equipped[slot] = key;
    this.save();
    return true;
  }

  getEquippedBehaviorEquipment(slot: BehaviorEquipmentSlot): BehaviorEquipmentKey {
    return this.data.behaviorEquipment.equipped[slot];
  }

  getBehaviorLoadout(): BehaviorLoadout {
    return { ...this.data.behaviorEquipment.equipped };
  }

  ownsCompanionProtocol(key: CompanionProtocolKey): boolean {
    return this.data.companion.owned.includes(key);
  }

  buyCompanionProtocol(key: CompanionProtocolKey): boolean {
    const protocol = getCompanionProtocol(key);
    if (!protocol || this.ownsCompanionProtocol(key) || !this.spendCoins(protocol.cost)) return false;
    this.data.companion.owned.push(key);
    this.save();
    return true;
  }

  equipCompanionProtocol(key: CompanionProtocolKey): boolean {
    if (!this.ownsCompanionProtocol(key)) return false;
    this.data.companion.equipped = key;
    this.save();
    return true;
  }

  getEquippedCompanionProtocol(): CompanionProtocolKey {
    return this.data.companion.equipped;
  }

  getChallengeContract(): ChallengeContractKey {
    return this.data.challengeContract;
  }

  equipChallengeContract(key: ChallengeContractKey): void {
    if (!isChallengeContractKey(key)) return;
    this.data.challengeContract = key;
    this.save();
  }

  hasDailyClear(dateKey: string): boolean {
    return (this.data.dailyClears[dateKey] ?? 0) > 0;
  }

  getDailyStars(dateKey: string): number {
    return this.data.dailyClears[dateKey] ?? 0;
  }

  recordDailyClear(dateKey: string, stars: number): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const clamped = Math.min(3, Math.max(1, Math.floor(stars)));
    this.data.dailyClears[dateKey] = Math.max(this.getDailyStars(dateKey), clamped);
    this.save();
  }

  get endlessBestWave(): number {
    return this.data.endlessBestWave;
  }

  get endlessBestScore(): number {
    return this.data.endlessBestScore;
  }

  recordEndlessRun(wave: number, score: number): void {
    this.data.endlessBestWave = Math.max(this.data.endlessBestWave, Math.max(0, Math.floor(wave)));
    this.data.endlessBestScore = Math.max(this.data.endlessBestScore, Math.max(0, Math.floor(score)));
    this.save();
  }

  get weeklyOperation(): WeeklyOperationDef {
    this.ensureCurrentOperation();
    return getWeeklyOperation(new Date(this.data.operations.lastSeenAt));
  }

  get careerStats(): CareerStats {
    this.ensureCurrentOperation();
    return { ...this.data.operations.career };
  }

  getWeeklyProgress(metric: OperationMetricKey): number {
    this.ensureCurrentOperation();
    return this.data.operations.weekly.progress[metric];
  }

  isWeeklyMissionClaimed(id: string): boolean {
    this.ensureCurrentOperation();
    return this.data.operations.weekly.claimed.includes(id);
  }

  claimWeeklyMission(id: string): number {
    this.ensureCurrentOperation();
    const mission = this.weeklyOperation.missions.find((entry) => entry.id === id);
    if (!mission || this.isWeeklyMissionClaimed(id)) return 0;
    if (this.getWeeklyProgress(mission.metric) < mission.target) return 0;
    this.data.operations.weekly.claimed.push(id);
    this.data.coins += mission.rewardCoins;
    this.save();
    return mission.rewardCoins;
  }

  getWeeklyCachePreview(): WeeklyCacheReward {
    const operation = this.weeklyOperation;
    for (let offset = 0; offset < ARMORY_ITEMS.length; offset++) {
      const item = ARMORY_ITEMS[(operation.cacheStartIndex + offset) % ARMORY_ITEMS.length];
      if (!this.ownsArmoryItem(item.key)) return { coins: operation.cacheCoins, itemKey: item.key };
    }
    return { coins: operation.cacheCoins + 500 };
  }

  canClaimWeeklyCache(): boolean {
    this.ensureCurrentOperation();
    return !this.data.operations.weekly.cacheClaimed
      && this.weeklyOperation.missions.every((mission) => this.isWeeklyMissionClaimed(mission.id));
  }

  get weeklyCacheClaimed(): boolean {
    this.ensureCurrentOperation();
    return this.data.operations.weekly.cacheClaimed;
  }

  claimWeeklyCache(): WeeklyCacheReward | null {
    if (!this.canClaimWeeklyCache()) return null;
    const reward = this.getWeeklyCachePreview();
    this.data.operations.weekly.cacheClaimed = true;
    this.data.coins += reward.coins;
    if (reward.itemKey && !this.ownsArmoryItem(reward.itemKey)) {
      this.data.armory.owned.push(reward.itemKey);
    }
    this.save();
    return reward;
  }

  isAchievementClaimed(id: string): boolean {
    return this.data.operations.claimedAchievements.includes(id);
  }

  claimAchievement(id: string): number {
    const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
    if (!achievement || this.isAchievementClaimed(id)) return 0;
    if (getAchievementProgress(achievement, this.careerStats) < achievement.target) return 0;
    this.data.operations.claimedAchievements.push(id);
    this.data.coins += achievement.rewardCoins;
    this.save();
    return achievement.rewardCoins;
  }

  recordCombatProgress(progress: CombatProgress): void {
    this.ensureCurrentOperation();
    const sumKeys: OperationMetricKey[] = ['kills', 'waves', 'overdrives', 'synergies', 'bosses', 'victories'];
    const maxKeys: OperationMetricKey[] = ['maxStreak', 'endlessWave'];
    sumKeys.forEach((key) => {
      const delta = Math.max(0, Math.floor(progress[key]));
      this.data.operations.weekly.progress[key] += delta;
      this.data.operations.career[key] += delta;
    });
    maxKeys.forEach((key) => {
      const value = Math.max(0, Math.floor(progress[key]));
      this.data.operations.weekly.progress[key] = Math.max(this.data.operations.weekly.progress[key], value);
      this.data.operations.career[key] = Math.max(this.data.operations.career[key], value);
    });
    this.data.operations.career.perfectVictories += Math.max(0, Math.floor(progress.perfectVictories));
    this.save();
  }

  getClaimableOperationCount(): number {
    this.ensureCurrentOperation();
    const weekly = this.weeklyOperation.missions.filter((mission) =>
      !this.isWeeklyMissionClaimed(mission.id)
      && this.getWeeklyProgress(mission.metric) >= mission.target).length;
    const cache = this.canClaimWeeklyCache() ? 1 : 0;
    const achievements = ACHIEVEMENTS.filter((achievement) =>
      !this.isAchievementClaimed(achievement.id)
      && getAchievementProgress(achievement, this.careerStats) >= achievement.target).length;
    return weekly + cache + achievements;
  }

  private ensureCurrentOperation(): void {
    const now = Date.now();
    const previous = this.data.operations.lastSeenAt;
    const trustedNow = Math.max(now, previous);
    const operation = getWeeklyOperation(new Date(trustedNow));
    let changed = false;
    if (operation.weekKey !== this.data.operations.weekly.weekKey) {
      this.data.operations.weekly = {
        weekKey: operation.weekKey,
        progress: createEmptyOperationProgress(),
        claimed: [],
        cacheClaimed: false,
      };
      changed = true;
    }
    if (trustedNow - previous >= 60_000) {
      this.data.operations.lastSeenAt = trustedNow;
      changed = true;
    }
    if (changed) this.save();
  }

  // 调试用：清空存档
  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

export const SaveManager = new SaveManagerImpl();
