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

// ── 僵尸图鉴：弱点 / 行为 / 战术（用于 CodexScene 展示） ──
export interface ZombieCodex {
  /** 角色定位 */
  role: string;
  /** 行为描述 */
  behavior: string;
  /** 弱点标签（与技能关键字对齐） */
  weaknesses: string[];
  /** 推荐应对策略 */
  counter: string;
  /** 首次出现关卡 */
  firstSeen: number;
  /** 威胁等级 1~5 */
  threat: number;
}

export const ZOMBIE_CODEX: Record<ZombieTypeKey, ZombieCodex> = {
  normal: {
    role: '普通步兵', behavior: '直线推进，触墙后周期攻击。无特殊能力。',
    weaknesses: ['任何攻击'], counter: '基础攻击即可应对，注意数量积累。',
    firstSeen: 1, threat: 1,
  },
  fast: {
    role: '突袭兵', behavior: '移动速度极快，提前逼近墙体。',
    weaknesses: ['范围伤害', '减速'], counter: '用多重炮管/弹射弹覆盖，或穿甲弹一击多发。',
    firstSeen: 1, threat: 2,
  },
  tank: {
    role: '重甲肉盾', behavior: '血厚、速度慢，吸收火力掩护同伴。',
    weaknesses: ['灼烧（持续伤害）', '暴击', '百分比伤害'], counter: '用灼烧弹+暴击组合（爆燃弹）高效削减。',
    firstSeen: 2, threat: 3,
  },
  boss: {
    role: '尸潮之王', behavior: '血量极高，周期召唤普通僵尸，触墙伤害巨大。',
    weaknesses: ['持续输出', '组合技爆发'], counter: '囤满激光+导弹+爆炸（末日审判）一波带走，注意控场小怪。',
    firstSeen: 5, threat: 5,
  },
  spitter: {
    role: '远程喷射者', behavior: '进入射程后停下，远程喷射酸球攻击墙体。',
    weaknesses: ['穿透弹', '追踪导弹'], counter: '穿甲弹越过小怪直接命中；追踪导弹优先点名。',
    firstSeen: 4, threat: 3,
  },
  exploder: {
    role: '自爆兵', behavior: '死亡时爆炸，对周围僵尸和墙体造成范围伤害。',
    weaknesses: ['远程击杀', '范围伤害'], counter: '在远处用穿透弹/导弹击杀，远离墙体；爆炸可波及友军。',
    firstSeen: 3, threat: 3,
  },
  healer: {
    role: '治愈者', behavior: '周期治疗附近僵尸，恢复其血量。',
    weaknesses: ['优先击杀', '爆发伤害'], counter: '必须最先击杀！用追踪导弹/激光点名，否则前排打不动。',
    firstSeen: 4, threat: 4,
  },
  shield: {
    role: '护盾卫士', behavior: '携带能量护盾，必须先破盾才能造成本体伤害。',
    weaknesses: ['高爆发', '范围伤害'], counter: '用爆炸弹/末日弹破盾，或激光持续穿透护盾。',
    firstSeen: 5, threat: 4,
  },
  ghost: {
    role: '幽灵', behavior: '周期性隐身，隐身期间无法被命中（灼烧仍生效）。',
    weaknesses: ['灼烧（持续生效）', '现身窗口'], counter: '上灼烧弹让 DOT 持续生效；把握现身瞬间爆发输出。',
    firstSeen: 6, threat: 4,
  },
  berserker: {
    role: '狂暴者', behavior: '血量越低移动越快，濒死时极速冲墙。',
    weaknesses: ['一击致命', '减速爆发'], counter: '保持高爆发别让它进残血，或用激光+导弹瞬间带走。',
    firstSeen: 7, threat: 4,
  },
  summoner: {
    role: '召唤者', behavior: '周期召唤快速僵尸加入战场，数量失控会崩盘。',
    weaknesses: ['优先击杀', '范围清场'], counter: '与治愈者同列为"必须先杀"，用爆炸弹连锁清理召唤物并削本体。',
    firstSeen: 8, threat: 5,
  },
};

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
