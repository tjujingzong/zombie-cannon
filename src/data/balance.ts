export {
  BOSS_ZOMBIE_TYPES,
  DAMAGE_ELEMENTS,
  RANGED_ZOMBIE_BEHAVIORS,
  ZOMBIE_CODEX,
  ZOMBIE_DEFINITIONS,
  ZOMBIE_TYPES,
  getUnlockedZombieTypes,
  type DamageElement,
  type ZombieBehaviorKey,
  type ZombieTypeKey,
} from './zombies';

// 全局数值平衡常量
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// 基地墙
export const WALL_Y = GAME_HEIGHT - 220;
export const WALL_BASE_HP = 100;

// 炮台
export const CANNON_Y = GAME_HEIGHT - 130;
export const CANNON_BASE_DAMAGE = 10;
export const CANNON_BASE_FIRE_RATE = 2.0;
export const BULLET_SPEED = 900;

export const ZOMBIE_ATTACK_INTERVAL = 1.0;
export const BOSS_SUMMON_INTERVAL = 6.0;
export const SPITTER_ATTACK_INTERVAL = 2.0;
export const SPITTER_RANGE = 350;
export const HEALER_HEAL_INTERVAL = 3.0;
export const HEALER_HEAL_AMOUNT = 8;
export const HEALER_HEAL_RANGE = 150;
export const SHIELD_MAX = 40;
export const GHOST_PHASE_INTERVAL = 4.0;
export const GHOST_VISIBLE_TIME = 2.5;
export const SUMMONER_INTERVAL = 5.0;
export const LEAPER_INTERVAL = 3.2;
export const BURROW_DURATION = 2.8;
export const CONDUCTOR_AURA_RANGE = 175;
export const CONDUCTOR_DAMAGE_REDUCTION = 0.34;
export const SIPHON_HEAL_RATIO = 0.12;
export const EXPLOSION_DAMAGE = 15;

// 连杀系统
export const KILL_STREAK_THRESHOLDS = [5, 15, 30, 50];

// 最终波尸潮：使用低血量腐尸制造密度，避免把普通敌人血量生硬堆高
export const HORDE_BASE_COUNT = 52;
export const HORDE_COUNT_PER_LEVEL = 2.2;
export const HORDE_MAX_COUNT = 180;
export const HORDE_SPAWN_INTERVAL = 0.085;

// 战前免费选技能
export const PRE_GAME_FREE_SKILLS = 5;
export const PRE_GAME_MONSTER_MULTIPLIER = 1.6;

// 局外永久养成
export const META_UPGRADES = {
  damage: { name: '基础攻击', desc: '每级攻击 +8%', baseCost: 100, max: 20 },
  fireRate: { name: '基础攻速', desc: '每级攻速 +5%', baseCost: 120, max: 20 },
  wallHp: { name: '墙体上限', desc: '每级墙血 +15%', baseCost: 100, max: 20 },
  coinBonus: { name: '金币加成', desc: '每级金币 +10%', baseCost: 150, max: 15 },
  overdriveStart: { name: '过载储能', desc: '每级初始过载 +10%', baseCost: 180, max: 10 },
  salvage: { name: '战利品精炼', desc: '每次击杀额外 +1 金币', baseCost: 220, max: 8 },
  critTraining: { name: '弱点训练', desc: '每级初始暴击率 +1.5%', baseCost: 260, max: 10 },
  elementalResearch: { name: '元素研究', desc: '每级克制伤害 +3%', baseCost: 320, max: 10 },
  penetration: { name: '膛线改造', desc: '每 3 级初始穿透 +1', baseCost: 300, max: 9 },
  startingShield: { name: '预充护盾', desc: '每级开局获得 12 点护盾', baseCost: 280, max: 10 },
  overdriveGain: { name: '热能回收', desc: '每级过载获取 +5%', baseCost: 340, max: 10 },
  eliteBounty: { name: '精英悬赏', desc: '每级精英与首领赏金 +8%', baseCost: 360, max: 10 },
} as const;

export type MetaUpgradeKey = keyof typeof META_UPGRADES;

export function metaUpgradeCost(key: MetaUpgradeKey, level: number): number {
  return Math.round(META_UPGRADES[key].baseCost * Math.pow(level + 1, 1.6));
}

export function starsForWallRatio(ratio: number): number {
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.35) return 2;
  return 1;
}

export function levelClearReward(levelId: number, stars: number): number {
  return Math.round((80 + levelId * 40) * (1 + (stars - 1) * 0.25));
}
