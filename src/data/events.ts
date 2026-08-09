export type BattlefieldEventKey = 'supplyDrop' | 'infectionStorm' | 'blackout' | 'eliteHunt';

export interface BattlefieldEventDef {
  key: BattlefieldEventKey;
  name: string;
  danger: string;
  reward: string;
  duration: number;
  color: number;
  colorHex: string;
}

export const BATTLEFIELD_EVENTS: Record<BattlefieldEventKey, BattlefieldEventDef> = {
  supplyDrop: {
    key: 'supplyDrop',
    name: '补给空投',
    danger: '补给箱 10 秒后坠毁',
    reward: '回收可修墙、充能并获得金币',
    duration: 10,
    color: 0xffca28,
    colorHex: '#ffd54f',
  },
  infectionStorm: {
    key: 'infectionStorm',
    name: '感染风暴',
    danger: '敌军速度与精英率提升',
    reward: '风暴中的击杀加速过载充能',
    duration: 16,
    color: 0x76ff7a,
    colorHex: '#76ff7a',
  },
  blackout: {
    key: 'blackout',
    name: '断电作战',
    danger: '炮台射速降低 35%',
    reward: '坚持到供电恢复获得金币和过载',
    duration: 14,
    color: 0x90a4ae,
    colorHex: '#b0bec5',
  },
  eliteHunt: {
    key: 'eliteHunt',
    name: '精英猎杀',
    danger: '下一批敌军必带精英词缀',
    reward: '击破 4 名精英获得悬赏与充能',
    duration: 18,
    color: 0xff6e6e,
    colorHex: '#ff8a80',
  },
};
