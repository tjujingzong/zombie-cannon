import type { LevelConfig } from './levels';

export type EndlessMutationKey = 'overrun' | 'carapace' | 'frenzy' | 'ascension';

export interface EndlessMutationDef {
  key: EndlessMutationKey;
  name: string;
  danger: string;
  color: number;
  colorHex: string;
  countPerStack: number;
  hpPerStack: number;
  speedPerStack: number;
  eliteChancePerStack: number;
}

export const ENDLESS_MUTATIONS: Record<EndlessMutationKey, EndlessMutationDef> = {
  overrun: {
    key: 'overrun', name: '尸潮增殖', danger: '后续敌军规模 +16%',
    color: 0xffa726, colorHex: '#ffb74d',
    countPerStack: 0.16, hpPerStack: 0, speedPerStack: 0, eliteChancePerStack: 0,
  },
  carapace: {
    key: 'carapace', name: '硬化甲壳', danger: '后续敌军生命 +22%',
    color: 0x90a4ae, colorHex: '#b0bec5',
    countPerStack: 0, hpPerStack: 0.22, speedPerStack: 0, eliteChancePerStack: 0,
  },
  frenzy: {
    key: 'frenzy', name: '狂热疾行', danger: '后续敌军速度 +9%',
    color: 0xef5350, colorHex: '#ff6e6e',
    countPerStack: 0, hpPerStack: 0, speedPerStack: 0.09, eliteChancePerStack: 0,
  },
  ascension: {
    key: 'ascension', name: '精英升格', danger: '精英出现率 +8%',
    color: 0xab47bc, colorHex: '#ce93d8',
    countPerStack: 0, hpPerStack: 0.06, speedPerStack: 0, eliteChancePerStack: 0.08,
  },
};

export const ENDLESS_LEVEL: LevelConfig = {
  id: 1,
  name: '末日无尽',
  hpScale: 1,
  speedScale: 1,
  biome: 'throne',
  bossLevel: true,
  waves: [],
};
