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
}

export interface LevelConfig {
  id: number;
  name: string;
  hpScale: number; // 该关所有僵尸血量系数
  speedScale: number; // 速度系数
  waves: WaveConfig[];
}

// 快捷构造
function g(type: ZombieTypeKey, count: number, interval = 1.2, delay = 0): SpawnGroup {
  return { type, count, interval, delay };
}

export const LEVELS: LevelConfig[] = [
  // ── 第1关：城郊公路（教学关，少量normal + fast） ──
  {
    id: 1, name: '城郊公路', hpScale: 1.0, speedScale: 1.0,
    waves: [
      { groups: [g('normal', 8, 1.4)] },
      { groups: [g('normal', 10, 1.2), g('fast', 3, 2.0, 3)] },
      { groups: [g('normal', 12, 1.0), g('fast', 5, 1.5, 2)] },
    ],
  },
  // ── 第2关：废弃加油站（引入tank） ──
  {
    id: 2, name: '废弃加油站', hpScale: 1.15, speedScale: 1.0,
    waves: [
      { groups: [g('normal', 10, 1.2), g('fast', 4, 1.8, 2)] },
      { groups: [g('normal', 12, 1.0), g('fast', 6, 1.2, 2), g('tank', 1, 1.0, 5)] },
      { groups: [g('normal', 14, 0.9), g('fast', 6, 1.2, 2), g('tank', 2, 4.0, 4)] },
    ],
  },
  // ── 第3关：荒废小镇（引入exploder） ──
  {
    id: 3, name: '荒废小镇', hpScale: 1.35, speedScale: 1.05,
    waves: [
      { groups: [g('normal', 12, 1.0), g('fast', 5, 1.5, 2)] },
      { groups: [g('normal', 10, 1.0), g('tank', 2, 3.0, 3), g('exploder', 3, 2.0, 5)] },
      { groups: [g('normal', 14, 0.8), g('fast', 8, 1.0, 2), g('tank', 2, 3.5, 4), g('exploder', 4, 1.8, 6)] },
    ],
  },
  // ── 第4关：黑暗隧道（引入spitter远程 + healer） ──
  {
    id: 4, name: '黑暗隧道', hpScale: 1.6, speedScale: 1.05,
    waves: [
      { groups: [g('fast', 8, 1.0), g('spitter', 3, 2.0, 3)] },
      { groups: [g('normal', 14, 0.8), g('tank', 2, 3.0, 3), g('healer', 1, 1.0, 6)] },
      { groups: [g('normal', 12, 0.8), g('fast', 10, 0.8, 2), g('spitter', 4, 1.5, 4)] },
      { groups: [g('normal', 16, 0.7), g('tank', 3, 2.5, 3), g('healer', 2, 4.0, 5), g('exploder', 3, 2.0, 7)] },
    ],
  },
  // ── 第5关：断桥要塞（引入shield + boss） ──
  {
    id: 5, name: '断桥要塞', hpScale: 1.9, speedScale: 1.1,
    waves: [
      { groups: [g('normal', 14, 0.8), g('fast', 6, 1.2, 2), g('shield', 2, 3.0, 4)] },
      { groups: [g('tank', 4, 2.5), g('fast', 8, 0.9, 2), g('spitter', 3, 2.0, 5)] },
      { groups: [g('normal', 18, 0.6), g('fast', 10, 0.8, 2), g('shield', 3, 2.5, 4)] },
      { groups: [g('boss', 1, 1.0), g('normal', 10, 1.5, 3), g('healer', 2, 5.0, 5), g('shield', 2, 4.0, 8)] },
    ],
  },
  // ── 第6关：雨夜墓园（引入ghost幽灵） ──
  {
    id: 6, name: '雨夜墓园', hpScale: 2.3, speedScale: 1.1,
    waves: [
      { groups: [g('normal', 16, 0.7), g('ghost', 5, 1.5, 2), g('fast', 6, 1.0, 3)] },
      { groups: [g('tank', 4, 2.2), g('normal', 12, 0.8, 2), g('spitter', 4, 1.8, 4), g('healer', 2, 4.0, 6)] },
      { groups: [g('fast', 14, 0.6), g('ghost', 6, 1.2, 2), g('shield', 3, 2.5, 5)] },
      { groups: [g('normal', 20, 0.55), g('tank', 5, 2.0, 3), g('exploder', 5, 1.5, 5), g('healer', 3, 3.0, 7)] },
    ],
  },
  // ── 第7关：化工废墟（引入berserker狂暴者） ──
  {
    id: 7, name: '化工废墟', hpScale: 2.8, speedScale: 1.15,
    waves: [
      { groups: [g('normal', 16, 0.7), g('berserker', 5, 1.5, 2), g('spitter', 4, 1.5, 3)] },
      { groups: [g('tank', 5, 2.0), g('fast', 10, 0.8, 2), g('berserker', 4, 1.8, 4), g('healer', 2, 4.0, 6)] },
      { groups: [g('normal', 18, 0.6), g('ghost', 6, 1.0, 2), g('shield', 4, 2.0, 4), g('exploder', 4, 1.5, 6)] },
      { groups: [g('fast', 16, 0.5), g('berserker', 6, 1.2, 2), g('spitter', 5, 1.5, 4)] },
      { groups: [g('normal', 22, 0.5), g('tank', 5, 2.0, 3), g('berserker', 5, 1.5, 5), g('healer', 3, 3.0, 7), g('shield', 3, 2.5, 9)] },
    ],
  },
  // ── 第8关：午夜医院（引入summoner召唤者 + boss） ──
  {
    id: 8, name: '午夜医院', hpScale: 3.4, speedScale: 1.2,
    waves: [
      { groups: [g('normal', 18, 0.6), g('summoner', 2, 4.0, 2), g('fast', 8, 0.8, 3)] },
      { groups: [g('tank', 6, 1.8), g('normal', 14, 0.7, 2), g('spitter', 5, 1.2, 4), g('healer', 3, 3.0, 6)] },
      { groups: [g('fast', 18, 0.5), g('ghost', 8, 0.9, 2), g('berserker', 6, 1.2, 4), g('summoner', 3, 3.5, 6)] },
      { groups: [g('normal', 24, 0.45), g('tank', 6, 1.8, 2), g('shield', 5, 2.0, 4), g('exploder', 6, 1.2, 6)] },
      { groups: [g('boss', 1, 1.0), g('summoner', 3, 4.0, 3), g('healer', 3, 3.0, 5), g('fast', 12, 0.8, 8)] },
    ],
  },
  // ── 第9关：沦陷都市（大量混合怪潮） ──
  {
    id: 9, name: '沦陷都市', hpScale: 4.2, speedScale: 1.25,
    waves: [
      { groups: [g('normal', 20, 0.55), g('fast', 12, 0.7, 2), g('spitter', 5, 1.2, 3), g('berserker', 4, 1.5, 5)] },
      { groups: [g('tank', 7, 1.6), g('normal', 16, 0.6, 2), g('ghost', 8, 0.8, 3), g('shield', 4, 2.0, 5), g('healer', 3, 3.0, 7)] },
      { groups: [g('fast', 22, 0.45), g('berserker', 8, 1.0, 2), g('exploder', 6, 1.2, 4), g('summoner', 4, 3.0, 6)] },
      { groups: [g('normal', 26, 0.45), g('tank', 6, 1.8, 2), g('fast', 14, 0.6, 3), g('spitter', 6, 1.0, 5), g('healer', 4, 2.5, 7)] },
      { groups: [g('normal', 28, 0.4), g('tank', 8, 1.5, 2), g('ghost', 10, 0.7, 3), g('berserker', 8, 1.0, 5), g('shield', 5, 2.0, 7), g('exploder', 6, 1.2, 9)] },
    ],
  },
  // ── 第10关：尸潮之王（终极BOSS + 全怪物类型） ──
  {
    id: 10, name: '尸潮之王', hpScale: 5.0, speedScale: 1.3,
    waves: [
      { groups: [g('normal', 22, 0.5), g('fast', 14, 0.6, 2), g('berserker', 6, 1.2, 3), g('spitter', 6, 1.0, 4)] },
      { groups: [g('tank', 8, 1.5), g('normal', 18, 0.6, 2), g('summoner', 4, 3.0, 3), g('healer', 4, 2.5, 5), g('shield', 4, 2.0, 7)] },
      { groups: [g('fast', 24, 0.4), g('ghost', 10, 0.7, 2), g('berserker', 8, 1.0, 3), g('exploder', 8, 1.0, 5)] },
      { groups: [g('normal', 30, 0.4), g('tank', 10, 1.2, 2), g('fast', 16, 0.5, 3), g('spitter', 8, 0.8, 4), g('shield', 6, 1.5, 6), g('healer', 4, 2.5, 8)] },
      { groups: [g('boss', 2, 6.0), g('summoner', 5, 2.5, 3), g('berserker', 10, 0.8, 5), g('ghost', 10, 0.6, 7), g('normal', 20, 0.5, 9), g('exploder', 8, 1.0, 12)] },
    ],
  },
];

export function getLevel(id: number): LevelConfig {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) throw new Error(`Level ${id} not found`);
  return lv;
}
