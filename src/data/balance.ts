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
  normal:      { hp: 30,  speed: 60,  damage: 5,  coin: 5,   scale: 1,   texture: 'zombie_normal',      tint: 0xffffff },
  fast:        { hp: 18,  speed: 120, damage: 4,  coin: 7,   scale: 0.85, texture: 'zombie_fast',       tint: 0xffffff },
  tank:        { hp: 120, speed: 38,  damage: 12, coin: 15,  scale: 1.3, texture: 'zombie_tank',       tint: 0xffffff },
  boss:        { hp: 900, speed: 28,  damage: 30, coin: 100, scale: 2.1, texture: 'zombie_boss',       tint: 0xffffff },
  // ── 新增类型 ──
  spitter:     { hp: 25,  speed: 50,  damage: 8,  coin: 12,  scale: 0.95, texture: 'zombie_spitter',    tint: 0xffffff },  // 远程：到达射程后停下喷酸
  exploder:    { hp: 15,  speed: 90,  damage: 40, coin: 10,  scale: 0.9,  texture: 'zombie_exploder',   tint: 0xffffff },  // 死亡爆炸
  healer:      { hp: 40,  speed: 45,  damage: 4,  coin: 18,  scale: 1.05, texture: 'zombie_healer',     tint: 0xffffff },  // 治疗附近僵尸
  shield:      { hp: 60,  speed: 55,  damage: 8,  coin: 20,  scale: 1.2,  texture: 'zombie_shield',     tint: 0xffffff },  // 有能量护盾
  ghost:       { hp: 20,  speed: 75,  damage: 6,  coin: 14,  scale: 0.9,  texture: 'zombie_ghost',      tint: 0xffffff },  // 周期隐身
  berserker:   { hp: 50,  speed: 40,  damage: 10, coin: 16,  scale: 1.1,  texture: 'zombie_berserker',  tint: 0xffffff },  // 血量越低越快
  summoner:    { hp: 70,  speed: 35,  damage: 6,  coin: 25,  scale: 1.15, texture: 'zombie_summoner',   tint: 0xffffff },  // 召唤小怪
};

export type ZombieTypeKey = keyof typeof ZOMBIE_TYPES;

// 远程攻击僵尸类型
export const RANGED_ZOMBIE_TYPES: Set<string> = new Set(['spitter']);
// 死亡爆炸僵尸类型
export const EXPLODER_TYPES: Set<string> = new Set(['exploder']);
// 治疗僵尸类型
export const HEALER_TYPES: Set<string> = new Set(['healer']);

export const ZOMBIE_ATTACK_INTERVAL = 1.0; // 触墙后攻击间隔（秒）
export const BOSS_SUMMON_INTERVAL = 6.0; // Boss 召唤小怪间隔（秒）
export const SPITTER_ATTACK_INTERVAL = 2.0; // 喷射者攻击间隔
export const SPITTER_RANGE = 350; // 喷射者射程
export const HEALER_HEAL_INTERVAL = 3.0; // 治愈者治疗间隔
export const HEALER_HEAL_AMOUNT = 8; // 每次治疗量
export const HEALER_HEAL_RANGE = 150; // 治疗范围
export const SHIELD_MAX = 40; // 护盾僵尸初始护盾量
export const GHOST_PHASE_INTERVAL = 4.0; // 幽灵隐身周期（秒）
export const GHOST_VISIBLE_TIME = 2.5; // 幽灵可见时间
export const SUMMONER_INTERVAL = 5.0; // 召唤者召唤间隔
export const EXPLOSION_RADIUS = 100; // 爆炸范围
export const EXPLOSION_DAMAGE = 15; // 爆炸对周围僵尸伤害

// 连杀系统
export const KILL_STREAK_THRESHOLDS = [5, 15, 30, 50]; // 连杀阈值
export const KILL_STREAK_BONUS = [0.1, 0.2, 0.35, 0.5]; // 对应伤害加成

// ── 局外永久养成 ──
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
