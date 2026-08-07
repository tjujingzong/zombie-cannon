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
  swarm:       { hp: 9,   speed: 78,  damage: 2,  coin: 1,   scale: 0.68, texture: 'zombie_swarm',       tint: 0xffffff },
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
  leaper:      { hp: 32,  speed: 62,  damage: 9,  coin: 15,  scale: 0.95, texture: 'zombie_leaper',     tint: 0xffffff },  // 周期冲刺
  splitter:    { hp: 42,  speed: 48,  damage: 6,  coin: 14,  scale: 1.05, texture: 'zombie_splitter',   tint: 0xffffff },  // 死亡分裂
  jammer:      { hp: 58,  speed: 42,  damage: 5,  coin: 22,  scale: 1.1,  texture: 'zombie_jammer',     tint: 0xffffff },  // 压制炮台攻速
  burrower:    { hp: 38,  speed: 58,  damage: 12, coin: 18,  scale: 0.95, texture: 'zombie_burrower',   tint: 0xffffff },  // 潜地接近后破土
  conductor:   { hp: 82,  speed: 36,  damage: 7,  coin: 28,  scale: 1.15, texture: 'zombie_conductor',  tint: 0xffffff },  // 为附近单位减伤
  siphon:      { hp: 68,  speed: 46,  damage: 11, coin: 24,  scale: 1.08, texture: 'zombie_siphon',     tint: 0xffffff },  // 攻墙吸血并治疗队友
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
  swarm: {
    role: '尸潮腐尸', behavior: '成群结队高速涌入，单体脆弱但数量极多。',
    weaknesses: ['范围伤害', '穿透', '弹射'], counter: '保留爆炸、穿透与过载，在尸潮密集时一次清场。',
    firstSeen: 1, threat: 2,
  },
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
    weaknesses: ['持续灼烧', '暴击', '百分比伤害'], counter: '用灼烧弹和暴击触发爆燃弹，高效削减重甲单位。',
    firstSeen: 2, threat: 3,
  },
  boss: {
    role: '尸潮之王', behavior: '血量极高，周期召唤普通僵尸，触墙伤害巨大。',
    weaknesses: ['持续输出', '组合技爆发'], counter: '集齐激光、导弹和爆炸触发末日审判，同时控制召唤物。',
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
    role: '幽灵', behavior: '周期性隐身，隐身期间无法被命中，但已有灼烧仍会生效。',
    weaknesses: ['持续灼烧', '现身窗口'], counter: '先附加灼烧，再把握现身窗口集中输出。',
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
  leaper: {
    role: '跃袭者', behavior: '周期性高速跃进，短时间跨越大段路程。',
    weaknesses: ['减速', '爆发伤害'], counter: '冰冻弹头可打断冲刺节奏，优先在远处击杀。',
    firstSeen: 7, threat: 3,
  },
  splitter: {
    role: '分裂母体', behavior: '死亡时分裂为两只尸潮腐尸，持续占用防线火力。',
    weaknesses: ['范围伤害', '连锁攻击'], counter: '使用爆炸与连锁技能一次清理分裂产物。',
    firstSeen: 6, threat: 4,
  },
  jammer: {
    role: '电磁干扰者', behavior: '存活时降低炮台射速，多只效果叠加但存在下限。',
    weaknesses: ['处决', '追踪攻击'], counter: '尽快用处决协议或空中支援点杀。',
    firstSeen: 8, threat: 5,
  },
  burrower: {
    role: '掘地伏击者', behavior: '潜入地下高速推进，接近防线后破土并恢复可攻击状态。',
    weaknesses: ['地雷', '破土爆发', '减速'], counter: '在防线前布置地雷，等它破土后用冰冻与爆发火力截杀。',
    firstSeen: 6, threat: 4,
  },
  conductor: {
    role: '尸群导体', behavior: '展开电浆链接，使附近僵尸获得伤害减免。',
    weaknesses: ['优先击杀', '处决', '聚怪'], counter: '先击杀导体解除群体减伤，再处理被保护的尸群。',
    firstSeen: 7, threat: 5,
  },
  siphon: {
    role: '血肉汲取者', behavior: '每次攻击城墙都会恢复自身，并治疗周围受伤单位。',
    weaknesses: ['远程击杀', '持续控制'], counter: '不要让它接触城墙，使用引力场和冰冻技能延缓推进。',
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
export const LEAPER_INTERVAL = 3.2; // 跃袭者冲刺间隔
export const BURROW_DURATION = 2.8;
export const CONDUCTOR_AURA_RANGE = 175;
export const CONDUCTOR_DAMAGE_REDUCTION = 0.34;
export const SIPHON_HEAL_RATIO = 0.12;
export const EXPLOSION_RADIUS = 100; // 爆炸范围
export const EXPLOSION_DAMAGE = 15; // 爆炸对周围僵尸伤害

// 连杀系统
export const KILL_STREAK_THRESHOLDS = [5, 15, 30, 50]; // 连杀阈值
export const KILL_STREAK_BONUS = [0.1, 0.2, 0.35, 0.5]; // 对应伤害加成

// 最终波尸潮：使用低血量腐尸制造密度，避免把普通敌人血量生硬堆高
export const HORDE_BASE_COUNT = 52;
export const HORDE_COUNT_PER_LEVEL = 2.2;
export const HORDE_MAX_COUNT = 180;
export const HORDE_SPAWN_INTERVAL = 0.085;

// ── 战前免费选技能 ──
// 每关开局可免费挑选的技能数；同时按此倍率增加怪物数量以平衡难度
export const PRE_GAME_FREE_SKILLS = 5;
export const PRE_GAME_MONSTER_MULTIPLIER = 1.6;

// ── 局外永久养成 ──
export const META_UPGRADES = {
  damage: { name: '基础攻击', desc: '每级攻击 +8%', baseCost: 100, max: 20 },
  fireRate: { name: '基础攻速', desc: '每级攻速 +5%', baseCost: 120, max: 20 },
  wallHp: { name: '墙体上限', desc: '每级墙血 +15%', baseCost: 100, max: 20 },
  coinBonus: { name: '金币加成', desc: '每级金币 +10%', baseCost: 150, max: 15 },
  overdriveStart: { name: '过载储能', desc: '每级初始过载 +10%', baseCost: 180, max: 10 },
  salvage: { name: '战利品精炼', desc: '每次击杀额外 +1 金币', baseCost: 220, max: 8 },
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
