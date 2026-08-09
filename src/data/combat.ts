export type EliteAffix = 'swift' | 'armored' | 'regenerating' | 'splitting';

export interface EliteAffixDef {
  key: EliteAffix;
  name: string;
  shortLabel: string;
  color: number;
  description: string;
}

export const ELITE_AFFIXES: Record<EliteAffix, EliteAffixDef> = {
  swift: {
    key: 'swift', name: '疾行', shortLabel: '疾', color: 0xffca28,
    description: '移动速度大幅提升',
  },
  armored: {
    key: 'armored', name: '重甲', shortLabel: '甲', color: 0x90a4ae,
    description: '生命与伤害抗性提升',
  },
  regenerating: {
    key: 'regenerating', name: '再生', shortLabel: '愈', color: 0x69f0ae,
    description: '脱离受击后快速恢复生命',
  },
  splitting: {
    key: 'splitting', name: '分裂', shortLabel: '裂', color: 0xff8a80,
    description: '死亡后分裂出尸潮腐尸',
  },
};

export type DamageSourceKey =
  | 'bullet'
  | 'burn'
  | 'explosion'
  | 'missile'
  | 'airSupport'
  | 'laser'
  | 'lightning'
  | 'gravity'
  | 'mine'
  | 'support'
  | 'thorns'
  | 'equipment'
  | 'companion';

export const DAMAGE_SOURCE_LABELS: Record<DamageSourceKey, string> = {
  bullet: '主炮弹幕',
  burn: '灼烧',
  explosion: '范围爆破',
  missile: '追踪导弹',
  airSupport: '空中支援',
  laser: '激光束',
  lightning: '连锁闪电',
  gravity: '引力奇点',
  mine: '防线雷区',
  support: '辅助炮台',
  thorns: '壁垒反伤',
  equipment: '行为装备',
  companion: '战术伙伴',
};

export type BuildPathKey = 'elemental' | 'barrage' | 'missile' | 'fortress';

export interface BuildPathDef {
  key: BuildPathKey;
  name: string;
  color: number;
  colorHex: string;
  tagline: string;
  ultimateSynergy: string;
  goals: { skill: string; level: number }[];
}

export const BUILD_PATHS: BuildPathDef[] = [
  {
    key: 'elemental', name: '冰火湮灭', color: 0xff7043, colorHex: '#ff8a65',
    tagline: '冻结聚怪，点燃连爆', ultimateSynergy: 'elementalCataclysm',
    goals: [
      { skill: 'burnBullets', level: 3 },
      { skill: 'frostRounds', level: 3 },
      { skill: 'explosiveRound', level: 2 },
    ],
  },
  {
    key: 'barrage', name: '无限弹幕', color: 0x4fc3f7, colorHex: '#4fc3f7',
    tagline: '高速分裂，跳弹清屏', ultimateSynergy: 'infiniteBarrage',
    goals: [
      { skill: 'rapidFire', level: 4 },
      { skill: 'multiBarrel', level: 3 },
      { skill: 'ricochet', level: 2 },
    ],
  },
  {
    key: 'missile', name: '天基指挥', color: 0xce93d8, colorHex: '#ce93d8',
    tagline: '锁定威胁，持续轰炸', ultimateSynergy: 'orbitalCommand',
    goals: [
      { skill: 'homingMissile', level: 3 },
      { skill: 'airSupport', level: 3 },
      { skill: 'gravityWell', level: 1 },
    ],
  },
  {
    key: 'fortress', name: '永恒堡垒', color: 0x81c784, colorHex: '#81c784',
    tagline: '护盾雷区，越守越强', ultimateSynergy: 'eternalFortress',
    goals: [
      { skill: 'steelWall', level: 3 },
      { skill: 'energyShield', level: 3 },
      { skill: 'minefield', level: 3 },
      { skill: 'fieldMedic', level: 2 },
    ],
  },
];

export interface CombatPerformanceSnapshot {
  enabled: boolean;
  fps: number;
  lowFps: number;
  enemies: number;
  projectiles: number;
  particles: number;
  elites: number;
}
