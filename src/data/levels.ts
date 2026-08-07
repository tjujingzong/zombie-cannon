import type { ZombieTypeKey } from './balance';

// 一个波次中的一组刷怪配置
export interface SpawnGroup {
  type: ZombieTypeKey;
  count: number;
  interval: number; // 组内刷怪间隔（秒）
  delay?: number; // 相对波次开始的延迟（秒）
}

export interface WaveConfig {
  groups: SpawnGroup[];
  /** 是否为 Boss 波（用于触发 Boss 入场动画/音乐） */
  bossWave?: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  hpScale: number; // 该关所有僵尸血量系数
  speedScale: number; // 速度系数
  waves: WaveConfig[];
  /** 主题/地形 key（影响背景色调） */
  biome: string;
  /** 是否为 Boss 关 */
  bossLevel: boolean;
}

// 快捷构造
function g(type: ZombieTypeKey, count: number, interval = 1.2, delay = 0): SpawnGroup {
  return { type, count, interval, delay };
}

// ── 主题循环（每 10 关一个大循环） ──
const BIOME_CYCLE = [
  { key: 'suburb',   name: '城郊公路',   tint: 0x18222b },
  { key: 'gas',      name: '废弃加油站', tint: 0x2a2018 },
  { key: 'town',     name: '荒废小镇',   tint: 0x1c2618 },
  { key: 'tunnel',   name: '黑暗隧道',   tint: 0x141822 },
  { key: 'bridge',   name: '断桥要塞',   tint: 0x182830 },
  { key: 'graveyard',name: '雨夜墓园',   tint: 0x161e22 },
  { key: 'factory',  name: '化工废墟',   tint: 0x221a18 },
  { key: 'hospital', name: '午夜医院',   tint: 0x1a1620 },
  { key: 'city',     name: '沦陷都市',   tint: 0x101a22 },
  { key: 'throne',   name: '尸潮王座',   tint: 0x2a1020 },
];

// ── 手工关卡 1~10（教学递进，引入每种僵尸） ──
const HANDCRAFTED_LEVELS: LevelConfig[] = [
  {
    id: 1, name: '城郊公路', hpScale: 1.0, speedScale: 1.0, biome: 'suburb', bossLevel: false,
    waves: [
      { groups: [g('normal', 8, 1.4)] },
      { groups: [g('normal', 10, 1.2), g('fast', 3, 2.0, 3)] },
      { groups: [g('normal', 12, 1.0), g('fast', 5, 1.5, 2)] },
    ],
  },
  {
    id: 2, name: '废弃加油站', hpScale: 1.15, speedScale: 1.0, biome: 'gas', bossLevel: false,
    waves: [
      { groups: [g('normal', 10, 1.2), g('fast', 4, 1.8, 2)] },
      { groups: [g('normal', 12, 1.0), g('fast', 6, 1.2, 2), g('tank', 1, 1.0, 5)] },
      { groups: [g('normal', 14, 0.9), g('fast', 6, 1.2, 2), g('tank', 2, 4.0, 4)] },
    ],
  },
  {
    id: 3, name: '荒废小镇', hpScale: 1.35, speedScale: 1.05, biome: 'town', bossLevel: false,
    waves: [
      { groups: [g('normal', 12, 1.0), g('fast', 5, 1.5, 2)] },
      { groups: [g('normal', 10, 1.0), g('tank', 2, 3.0, 3), g('exploder', 3, 2.0, 5)] },
      { groups: [g('normal', 14, 0.8), g('fast', 8, 1.0, 2), g('tank', 2, 3.5, 4), g('exploder', 4, 1.8, 6)] },
    ],
  },
  {
    id: 4, name: '黑暗隧道', hpScale: 1.6, speedScale: 1.05, biome: 'tunnel', bossLevel: false,
    waves: [
      { groups: [g('fast', 8, 1.0), g('spitter', 3, 2.0, 3)] },
      { groups: [g('normal', 14, 0.8), g('tank', 2, 3.0, 3), g('healer', 1, 1.0, 6)] },
      { groups: [g('normal', 12, 0.8), g('fast', 10, 0.8, 2), g('spitter', 4, 1.5, 4)] },
      { groups: [g('normal', 16, 0.7), g('tank', 3, 2.5, 3), g('healer', 2, 4.0, 5), g('exploder', 3, 2.0, 7)] },
    ],
  },
  {
    id: 5, name: '断桥要塞', hpScale: 1.9, speedScale: 1.1, biome: 'bridge', bossLevel: true,
    waves: [
      { groups: [g('normal', 14, 0.8), g('fast', 6, 1.2, 2), g('shield', 2, 3.0, 4)] },
      { groups: [g('tank', 4, 2.5), g('fast', 8, 0.9, 2), g('spitter', 3, 2.0, 5)] },
      { groups: [g('normal', 18, 0.6), g('fast', 10, 0.8, 2), g('shield', 3, 2.5, 4)] },
      { bossWave: true, groups: [g('boss', 1, 1.0), g('normal', 10, 1.5, 3), g('healer', 2, 5.0, 5), g('shield', 2, 4.0, 8)] },
    ],
  },
  {
    id: 6, name: '雨夜墓园', hpScale: 2.3, speedScale: 1.1, biome: 'graveyard', bossLevel: false,
    waves: [
      { groups: [g('normal', 16, 0.7), g('ghost', 5, 1.5, 2), g('fast', 6, 1.0, 3)] },
      { groups: [g('tank', 4, 2.2), g('normal', 12, 0.8, 2), g('spitter', 4, 1.8, 4), g('healer', 2, 4.0, 6)] },
      { groups: [g('fast', 14, 0.6), g('ghost', 6, 1.2, 2), g('burrower', 4, 1.5, 3), g('splitter', 4, 1.4, 4), g('shield', 3, 2.5, 5)] },
      { groups: [g('normal', 20, 0.55), g('tank', 5, 2.0, 3), g('burrower', 5, 1.2, 4), g('exploder', 5, 1.5, 5), g('healer', 3, 3.0, 7)] },
    ],
  },
  {
    id: 7, name: '化工废墟', hpScale: 2.8, speedScale: 1.15, biome: 'factory', bossLevel: false,
    waves: [
      { groups: [g('normal', 16, 0.7), g('berserker', 5, 1.5, 2), g('spitter', 4, 1.5, 3)] },
      { groups: [g('tank', 5, 2.0), g('fast', 10, 0.8, 2), g('berserker', 4, 1.8, 4), g('healer', 2, 4.0, 6)] },
      { groups: [g('normal', 18, 0.6), g('ghost', 6, 1.0, 2), g('shield', 4, 2.0, 4), g('exploder', 4, 1.5, 6)] },
      { groups: [g('fast', 16, 0.5), g('leaper', 6, 1.0, 2), g('berserker', 6, 1.2, 3), g('conductor', 2, 3.0, 4), g('spitter', 5, 1.5, 5)] },
      { groups: [g('normal', 22, 0.5), g('tank', 5, 2.0, 3), g('conductor', 3, 2.8, 4), g('berserker', 5, 1.5, 5), g('healer', 3, 3.0, 7), g('shield', 3, 2.5, 9)] },
    ],
  },
  {
    id: 8, name: '午夜医院', hpScale: 3.4, speedScale: 1.2, biome: 'hospital', bossLevel: true,
    waves: [
      { groups: [g('normal', 18, 0.6), g('summoner', 2, 4.0, 2), g('fast', 8, 0.8, 3)] },
      { groups: [g('tank', 6, 1.8), g('normal', 14, 0.7, 2), g('jammer', 2, 3.0, 3), g('siphon', 3, 2.2, 4), g('spitter', 5, 1.2, 5), g('healer', 3, 3.0, 6)] },
      { groups: [g('fast', 18, 0.5), g('ghost', 8, 0.9, 2), g('berserker', 6, 1.2, 4), g('summoner', 3, 3.5, 6)] },
      { groups: [g('normal', 24, 0.45), g('tank', 6, 1.8, 2), g('shield', 5, 2.0, 4), g('exploder', 6, 1.2, 6)] },
      { bossWave: true, groups: [g('boss', 1, 1.0), g('summoner', 3, 4.0, 3), g('siphon', 3, 2.5, 4), g('healer', 3, 3.0, 5), g('fast', 12, 0.8, 8)] },
    ],
  },
  {
    id: 9, name: '沦陷都市', hpScale: 4.2, speedScale: 1.25, biome: 'city', bossLevel: false,
    waves: [
      { groups: [g('normal', 20, 0.55), g('fast', 12, 0.7, 2), g('spitter', 5, 1.2, 3), g('berserker', 4, 1.5, 5)] },
      { groups: [g('tank', 7, 1.6), g('normal', 16, 0.6, 2), g('ghost', 8, 0.8, 3), g('shield', 4, 2.0, 5), g('healer', 3, 3.0, 7)] },
      { groups: [g('fast', 22, 0.45), g('berserker', 8, 1.0, 2), g('exploder', 6, 1.2, 4), g('summoner', 4, 3.0, 6)] },
      { groups: [g('normal', 26, 0.45), g('tank', 6, 1.8, 2), g('fast', 14, 0.6, 3), g('spitter', 6, 1.0, 5), g('healer', 4, 2.5, 7)] },
      { groups: [g('normal', 28, 0.4), g('tank', 8, 1.5, 2), g('ghost', 10, 0.7, 3), g('berserker', 8, 1.0, 5), g('shield', 5, 2.0, 7), g('exploder', 6, 1.2, 9)] },
    ],
  },
  {
    id: 10, name: '尸潮之王', hpScale: 5.0, speedScale: 1.3, biome: 'throne', bossLevel: true,
    waves: [
      { groups: [g('normal', 22, 0.5), g('fast', 14, 0.6, 2), g('berserker', 6, 1.2, 3), g('spitter', 6, 1.0, 4)] },
      { groups: [g('tank', 8, 1.5), g('normal', 18, 0.6, 2), g('summoner', 4, 3.0, 3), g('healer', 4, 2.5, 5), g('shield', 4, 2.0, 7)] },
      { groups: [g('fast', 24, 0.4), g('ghost', 10, 0.7, 2), g('berserker', 8, 1.0, 3), g('exploder', 8, 1.0, 5)] },
      { groups: [g('normal', 30, 0.4), g('tank', 10, 1.2, 2), g('fast', 16, 0.5, 3), g('spitter', 8, 0.8, 4), g('shield', 6, 1.5, 6), g('healer', 4, 2.5, 8)] },
      { bossWave: true, groups: [g('boss', 2, 6.0), g('summoner', 5, 2.5, 3), g('berserker', 10, 0.8, 5), g('ghost', 10, 0.6, 7), g('normal', 20, 0.5, 9), g('exploder', 8, 1.0, 12)] },
    ],
  },
];

export const TOTAL_LEVELS = 50;

// ── 关卡引擎：程序化生成 11~50 关 ──────────────────────────
// 难度曲线：每关 hpScale 增长 ~10%，speedScale 缓慢爬升
// Boss 关卡：5/10/15/20/25/30/35/40/45/50（每 5 关一次）
// 章节循环：每 10 关一个大循环，biome 重新轮转，难度高于上一轮

// 关卡引擎解锁的僵尸类型池（按等级解锁）
const ZOMBIE_POOL_BY_TIER: Record<number, ZombieTypeKey[]> = {
  1:  ['normal', 'fast'],
  2:  ['normal', 'fast', 'tank'],
  3:  ['normal', 'fast', 'tank', 'exploder', 'splitter'],
  4:  ['normal', 'fast', 'tank', 'exploder', 'splitter', 'spitter', 'healer'],
  5:  ['normal', 'fast', 'tank', 'exploder', 'splitter', 'spitter', 'healer', 'shield', 'leaper'],
  6:  ['normal', 'fast', 'tank', 'exploder', 'splitter', 'spitter', 'healer', 'shield', 'ghost', 'leaper', 'burrower'],
  7:  ['normal', 'fast', 'tank', 'exploder', 'splitter', 'spitter', 'healer', 'shield', 'ghost', 'berserker', 'leaper', 'jammer', 'burrower', 'conductor'],
  8:  ['normal', 'fast', 'tank', 'exploder', 'splitter', 'spitter', 'healer', 'shield', 'ghost', 'berserker', 'summoner', 'leaper', 'jammer', 'burrower', 'conductor', 'siphon'],
};

function tierFor(levelId: number): number {
  // 章节 1（1-10）逐步引入；之后所有类型全开
  if (levelId <= 10) return Math.min(8, Math.ceil(levelId / 1.25));
  return 8;
}

function pickN<T>(arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// 用确定性 PRNG（基于关卡 id），保证同一关每次进入配置一致
function makeRng(seed: number): () => number {
  let s = seed | 0;
  if (s === 0) s = 0x12345678;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 程序化生成单个关卡（id 11~50）
 */
function generateLevel(id: number): LevelConfig {
  const rng = makeRng(id * 2654435761);
  const between = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));

  // 章节与 biomes
  const chapter = Math.floor((id - 1) / 10); // 0,1,2,3,4
  const idxInChapter = (id - 1) % 10; // 0~9
  const biome = BIOME_CYCLE[idxInChapter];
  const bossLevel = id % 5 === 0;

  // 难度曲线
  // 章节 0 (1-10) 用手工程，不会走这里；章节 1+ 起步 hpScale 跳跃
  const chapterBase = chapter === 0 ? 1.0 : 5 + (chapter - 1) * 7; // 第11关起步6
  const hpScale = Math.round((chapterBase + idxInChapter * 1.1) * 10) / 10;
  const speedScale = Math.round((1.3 + chapter * 0.18 + idxInChapter * 0.02) * 100) / 100;

  // 波次数：每关 5~7 波；Boss 关追加终局波
  const baseWaves = between(5, 7);
  const waveCount = bossLevel ? baseWaves + 1 : baseWaves;

  const tier = tierFor(id);
  const pool = ZOMBIE_POOL_BY_TIER[tier];

  const waves: WaveConfig[] = [];

  for (let w = 0; w < waveCount; w++) {
    const isLast = w === waveCount - 1;
    const groups: SpawnGroup[] = [];

    if (bossLevel && isLast) {
      // Boss 波
      const bossCount = chapter >= 3 ? between(2, 3) : (chapter >= 1 ? between(1, 2) : 1);
      groups.push(g('boss', bossCount, 6.0));
      // Boss 护航
      const escortTypes = pickN(pool.filter((t) => t !== 'boss'), between(3, 5));
      escortTypes.forEach((t, i) => {
        groups.push(g(t, between(6, 14), between(0.5, 1.0), 2 + i * 2));
      });
      // 高级关卡 Boss 波带召唤者/治愈者
      if (chapter >= 1) {
        groups.push(g('summoner', between(2, 4), 3.5, 4));
        groups.push(g('healer', between(2, 4), 3.0, 6));
      }
      waves.push({ groups, bossWave: true });
      continue;
    }

    // 普通波：混合类型，越往后数量越多
    const typeCount = between(2, Math.min(5, 2 + chapter));
    const chosenTypes = pickN(pool, typeCount);

    chosenTypes.forEach((t, i) => {
      // 数量随章节和波次增长
      let baseCount: number;
      if (t === 'tank') baseCount = between(2, 3 + chapter);
      else if (t === 'healer' || t === 'summoner' || t === 'shield' || t === 'jammer' || t === 'conductor' || t === 'siphon') baseCount = between(1, 2 + Math.floor(chapter / 2));
      else if (t === 'exploder' || t === 'berserker' || t === 'ghost' || t === 'leaper' || t === 'splitter') baseCount = between(3, 6 + chapter);
      else baseCount = between(8, 14 + chapter * 2);

      // 间隔随章节缩短（更密集）
      const interval = Math.max(0.35, 0.9 - chapter * 0.08 - rng() * 0.2);
      const delay = i * between(1, 3);
      groups.push(g(t, baseCount, Math.round(interval * 100) / 100, delay));
    });

    // 后半段波次加入"尸潮压力"波：大量普通+快速
    if (w >= waveCount - 2 && rng() < 0.6) {
      groups.push(g('normal', between(10, 20 + chapter * 3), 0.4, between(2, 5)));
      groups.push(g('fast', between(6, 12 + chapter * 2), 0.5, between(3, 7)));
    }

    waves.push({ groups });
  }

  // 关卡名称：biome 名 + 章节序号
  return {
    id,
    name: chapter === 0 ? biome.name : `${biome.name}·第${chapter + 1}章`,
    hpScale,
    speedScale,
    waves,
    biome: biome.key,
    bossLevel,
  };
}

function expandHandcraftedWaves(level: LevelConfig): LevelConfig {
  const targetWaves = level.id <= 3 ? 5 : 6;
  const waves: WaveConfig[] = level.waves.map((wave) => ({
    ...wave,
    groups: wave.groups.map((group) => ({ ...group })),
  }));
  while (waves.length < targetWaves) {
    const insertAt = Math.max(1, waves.length - 1);
    const source = waves[Math.max(0, insertAt - 1)];
    const intensity = 1 + waves.length * 0.08;
    waves.splice(insertAt, 0, {
      groups: source.groups.map((group, index) => ({
        ...group,
        count: Math.max(1, Math.round(group.count * intensity)),
        interval: Math.max(0.18, Number((group.interval * 0.78).toFixed(2))),
        delay: (group.delay ?? 0) * 0.55 + index * 0.25,
      })),
    });
  }
  return { ...level, waves };
}

// ── 合并手工 + 程序化关卡 ──
const ALL_LEVELS: LevelConfig[] = HANDCRAFTED_LEVELS.map(expandHandcraftedWaves);
for (let id = HANDCRAFTED_LEVELS.length + 1; id <= TOTAL_LEVELS; id++) {
  ALL_LEVELS.push(generateLevel(id));
}

export const LEVELS: LevelConfig[] = ALL_LEVELS;

export function getLevel(id: number): LevelConfig {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) throw new Error(`Level ${id} not found`);
  return lv;
}

// ── 关卡引擎元信息（供 UI 展示难度曲线） ──
export const LEVEL_ENGINE_INFO = {
  totalLevels: TOTAL_LEVELS,
  bossInterval: 5,
  chapterSize: 10,
  biomes: BIOME_CYCLE.map((b) => ({ key: b.key, name: b.name })),
};
