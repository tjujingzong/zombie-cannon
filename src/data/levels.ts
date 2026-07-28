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
  {
    id: 1,
    name: '城郊公路',
    hpScale: 1.0,
    speedScale: 1.0,
    waves: [
      { groups: [g('normal', 5, 1.6)] },
      { groups: [g('normal', 8, 1.3)] },
      { groups: [g('normal', 10, 1.0), g('fast', 2, 2.0, 4)] },
    ],
  },
  {
    id: 2,
    name: '废弃加油站',
    hpScale: 1.15,
    speedScale: 1.0,
    waves: [
      { groups: [g('normal', 8, 1.3)] },
      { groups: [g('normal', 8, 1.1), g('fast', 4, 1.8, 3)] },
      { groups: [g('normal', 12, 0.9), g('fast', 5, 1.5, 2)] },
    ],
  },
  {
    id: 3,
    name: '荒废小镇',
    hpScale: 1.35,
    speedScale: 1.05,
    waves: [
      { groups: [g('normal', 10, 1.1), g('fast', 3, 1.6, 2)] },
      { groups: [g('normal', 10, 1.0), g('tank', 1, 1.0, 5)] },
      { groups: [g('normal', 12, 0.9), g('fast', 6, 1.2, 2), g('tank', 2, 4.0, 6)] },
    ],
  },
  {
    id: 4,
    name: '黑暗隧道',
    hpScale: 1.6,
    speedScale: 1.05,
    waves: [
      { groups: [g('fast', 8, 1.0)] },
      { groups: [g('normal', 12, 0.9), g('tank', 2, 3.5, 4)] },
      { groups: [g('normal', 10, 0.9), g('fast', 8, 1.0, 2)] },
      { groups: [g('normal', 14, 0.8), g('tank', 3, 3.0, 5)] },
    ],
  },
  {
    id: 5,
    name: '断桥要塞',
    hpScale: 1.9,
    speedScale: 1.1,
    waves: [
      { groups: [g('normal', 12, 0.9), g('fast', 5, 1.2, 3)] },
      { groups: [g('tank', 4, 2.8), g('fast', 6, 1.0, 3)] },
      { groups: [g('normal', 16, 0.7), g('fast', 8, 0.9, 2)] },
      { groups: [g('boss', 1, 1.0), g('normal', 8, 1.6, 3)] },
    ],
  },
  {
    id: 6,
    name: '雨夜墓园',
    hpScale: 2.3,
    speedScale: 1.1,
    waves: [
      { groups: [g('normal', 14, 0.8), g('fast', 6, 1.1, 2)] },
      { groups: [g('tank', 4, 2.5), g('normal', 10, 0.9, 2)] },
      { groups: [g('fast', 12, 0.7), g('tank', 2, 4.0, 4)] },
      { groups: [g('normal', 18, 0.65), g('tank', 4, 2.5, 5)] },
    ],
  },
  {
    id: 7,
    name: '化工废墟',
    hpScale: 2.8,
    speedScale: 1.15,
    waves: [
      { groups: [g('normal', 15, 0.75), g('fast', 8, 0.9, 2)] },
      { groups: [g('tank', 5, 2.2), g('fast', 8, 0.9, 3)] },
      { groups: [g('normal', 18, 0.6), g('tank', 3, 3.0, 4)] },
      { groups: [g('fast', 14, 0.6), g('normal', 10, 0.9, 2)] },
      { groups: [g('normal', 20, 0.55), g('tank', 5, 2.2, 5)] },
    ],
  },
  {
    id: 8,
    name: '午夜医院',
    hpScale: 3.4,
    speedScale: 1.2,
    waves: [
      { groups: [g('normal', 16, 0.7), g('fast', 8, 0.85, 2)] },
      { groups: [g('tank', 6, 2.0), g('normal', 12, 0.8, 2)] },
      { groups: [g('fast', 16, 0.55), g('tank', 3, 3.0, 4)] },
      { groups: [g('normal', 22, 0.5), g('fast', 10, 0.7, 3)] },
      { groups: [g('boss', 1, 1.0), g('fast', 10, 1.2, 3)] },
    ],
  },
  {
    id: 9,
    name: '沦陷都市',
    hpScale: 4.2,
    speedScale: 1.25,
    waves: [
      { groups: [g('normal', 18, 0.65), g('fast', 10, 0.8, 2)] },
      { groups: [g('tank', 7, 1.8), g('fast', 10, 0.8, 3)] },
      { groups: [g('normal', 24, 0.5), g('tank', 4, 2.5, 4)] },
      { groups: [g('fast', 20, 0.5), g('normal', 12, 0.8, 2)] },
      { groups: [g('normal', 24, 0.45), g('tank', 6, 2.0, 4), g('fast', 10, 0.8, 8)] },
    ],
  },
  {
    id: 10,
    name: '尸潮之王',
    hpScale: 5.0,
    speedScale: 1.3,
    waves: [
      { groups: [g('normal', 20, 0.6), g('fast', 10, 0.8, 3)] },
      { groups: [g('tank', 8, 1.6), g('normal', 14, 0.7, 2)] },
      { groups: [g('fast', 22, 0.45), g('tank', 4, 2.5, 5)] },
      { groups: [g('normal', 26, 0.45), g('fast', 14, 0.6, 3), g('tank', 5, 2.2, 6)] },
      { groups: [g('boss', 2, 8.0), g('normal', 16, 0.9, 4), g('fast', 10, 1.0, 10)] },
    ],
  },
];

export function getLevel(id: number): LevelConfig {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) throw new Error(`Level ${id} not found`);
  return lv;
}
