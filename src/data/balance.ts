// 全局数值平衡常量
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// 基地墙
export const WALL_Y = GAME_HEIGHT - 220; // 墙顶部 y 坐标
export const WALL_BASE_HP = 100;

// 炮台
export const CANNON_Y = GAME_HEIGHT - 130;
export const CANNON_BASE_DAMAGE = 10;
export const CANNON_BASE_FIRE_RATE = 2.0; // 每秒发射次数
export const BULLET_SPEED = 900;
export const CANNON_RANGE = 1400; // 索敌距离（覆盖全屏）

// 局内升级每级加成
export const RUN_UPGRADES = {
  damage: { name: '火力强化', desc: '攻击力 +30%', icon: 'icon_damage', max: 8 },
  fireRate: { name: '急速装填', desc: '攻速 +20%', icon: 'icon_firerate', max: 8 },
  multishot: { name: '多重炮管', desc: '子弹数量 +1', icon: 'icon_multishot', max: 3 },
  pierce: { name: '穿甲弹', desc: '子弹穿透 +1', icon: 'icon_pierce', max: 3 },
  crit: { name: '致命瞄准', desc: '暴击率 +10% (2倍伤害)', icon: 'icon_crit', max: 5 },
  repair: { name: '紧急维修', desc: '立即修复 30% 墙体', icon: 'icon_repair', max: 99 },
} as const;

export type RunUpgradeKey = keyof typeof RUN_UPGRADES;

// 局外永久养成：cost(level) = base * (level + 1)^1.6
export const META_UPGRADES = {
  damage: { name: '基础攻击', desc: '每级攻击 +8%', baseCost: 100, max: 20 },
  fireRate: { name: '基础攻速', desc: '每级攻速 +5%', baseCost: 120, max: 20 },
  wallHp: { name: '墙体上限', desc: '每级墙血 +15%', baseCost: 100, max: 20 },
  coinBonus: { name: '金币加成', desc: '每级金币 +10%', baseCost: 150, max: 15 },
} as const;

export type MetaUpgradeKey = keyof typeof META_UPGRADES;

export function metaUpgradeCost(key: MetaUpgradeKey, level: number): number {
  return Math.round(META_UPGRADES[key].baseCost * Math.pow(level + 1, 1.6));
}

// 僵尸基础属性（关卡通过 hpScale 系数放大）
export interface ZombieStats {
  hp: number;
  speed: number;
  damage: number; // 对墙每次攻击伤害
  coin: number;
  scale: number;
  texture: string;
  tint: number;
}

export const ZOMBIE_TYPES: Record<string, ZombieStats> = {
  normal: { hp: 30, speed: 60, damage: 5, coin: 5, scale: 1, texture: 'zombie_normal', tint: 0xffffff },
  fast: { hp: 18, speed: 120, damage: 4, coin: 7, scale: 0.85, texture: 'zombie_fast', tint: 0xffffff },
  tank: { hp: 120, speed: 38, damage: 12, coin: 15, scale: 1.3, texture: 'zombie_tank', tint: 0xffffff },
  boss: { hp: 900, speed: 28, damage: 30, coin: 100, scale: 2.1, texture: 'zombie_boss', tint: 0xffffff },
};

export type ZombieTypeKey = keyof typeof ZOMBIE_TYPES;

export const ZOMBIE_ATTACK_INTERVAL = 1.0; // 触墙后攻击间隔（秒）
export const BOSS_SUMMON_INTERVAL = 6.0; // Boss 召唤小怪间隔（秒）

// 结算星级：按剩余墙血百分比
export function starsForWallRatio(ratio: number): number {
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.35) return 2;
  return 1;
}

// 通关基础奖励（关卡序号 1 起）
export function levelClearReward(levelId: number, stars: number): number {
  return Math.round((80 + levelId * 40) * (1 + (stars - 1) * 0.25));
}
