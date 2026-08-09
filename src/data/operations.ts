export const OPERATION_METRIC_KEYS = [
  'kills',
  'waves',
  'overdrives',
  'synergies',
  'bosses',
  'victories',
  'maxStreak',
  'endlessWave',
] as const;

export type OperationMetricKey = typeof OPERATION_METRIC_KEYS[number];
export type OperationProgress = Record<OperationMetricKey, number>;

export interface CareerStats extends OperationProgress {
  perfectVictories: number;
}

export interface CombatProgress {
  kills: number;
  waves: number;
  overdrives: number;
  synergies: number;
  bosses: number;
  victories: number;
  maxStreak: number;
  endlessWave: number;
  perfectVictories: number;
}

export interface WeeklyMissionDef {
  id: string;
  metric: OperationMetricKey;
  mode: 'sum' | 'max';
  category: 'cleanup' | 'burst' | 'challenge';
  categoryName: string;
  name: string;
  desc: string;
  target: number;
  rewardCoins: number;
  color: number;
  colorHex: string;
}

export interface WeeklyOperationDef {
  weekKey: string;
  displayRange: string;
  missions: WeeklyMissionDef[];
  cacheCoins: number;
  cacheStartIndex: number;
}

export interface AchievementDef {
  id: string;
  metric: keyof CareerStats;
  name: string;
  desc: string;
  target: number;
  rewardCoins: number;
  color: number;
  colorHex: string;
}

type WeeklyMissionTemplate = Omit<WeeklyMissionDef, 'id' | 'category' | 'categoryName' | 'color' | 'colorHex'>;

const WEEKLY_POOLS: Array<{
  category: WeeklyMissionDef['category'];
  categoryName: string;
  color: number;
  colorHex: string;
  missions: WeeklyMissionTemplate[];
}> = [
  {
    category: 'cleanup', categoryName: '清扫', color: 0x4caf50, colorHex: '#69f0ae',
    missions: [
      { metric: 'kills', mode: 'sum', name: '尸潮清道夫', desc: '累计击破 400 名敌军', target: 400, rewardCoins: 120 },
      { metric: 'waves', mode: 'sum', name: '连续推进', desc: '累计突破 30 个波次', target: 30, rewardCoins: 120 },
    ],
  },
  {
    category: 'burst', categoryName: '爆发', color: 0x00a8c6, colorHex: '#4dd0e1',
    missions: [
      { metric: 'overdrives', mode: 'sum', name: '释放压力', desc: '成功释放 6 次过载', target: 6, rewardCoins: 150 },
      { metric: 'synergies', mode: 'sum', name: '火力化学反应', desc: '累计激活 6 个组合技', target: 6, rewardCoins: 150 },
      { metric: 'maxStreak', mode: 'max', name: '不断火', desc: '单局达成 40 连杀', target: 40, rewardCoins: 160 },
    ],
  },
  {
    category: 'challenge', categoryName: '挑战', color: 0xe53935, colorHex: '#ff8a80',
    missions: [
      { metric: 'bosses', mode: 'sum', name: '斩首行动', desc: '累计击破 3 名首领', target: 3, rewardCoins: 190 },
      { metric: 'victories', mode: 'sum', name: '守线成功', desc: '赢得 3 场战斗', target: 3, rewardCoins: 180 },
      { metric: 'endlessWave', mode: 'max', name: '深入末日', desc: '无尽模式抵达第 10 波', target: 10, rewardCoins: 210 },
    ],
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_victory', metric: 'victories', name: '第一道曙光', desc: '赢得第一场战斗',
    target: 1, rewardCoins: 100, color: 0x43a047, colorHex: '#69f0ae',
  },
  {
    id: 'corpse_cleaner', metric: 'kills', name: '千尸不留', desc: '累计击破 1000 名敌军',
    target: 1000, rewardCoins: 260, color: 0x558b2f, colorHex: '#b2ff59',
  },
  {
    id: 'wave_veteran', metric: 'waves', name: '百波老兵', desc: '累计突破 100 个波次',
    target: 100, rewardCoins: 320, color: 0x00838f, colorHex: '#4dd0e1',
  },
  {
    id: 'overdrive_master', metric: 'overdrives', name: '高压释放', desc: '累计释放 30 次过载',
    target: 30, rewardCoins: 360, color: 0x0277bd, colorHex: '#81d4fa',
  },
  {
    id: 'synergy_architect', metric: 'synergies', name: '火力架构师', desc: '累计激活 25 个组合技',
    target: 25, rewardCoins: 380, color: 0xef6c00, colorHex: '#ffb74d',
  },
  {
    id: 'streak_legend', metric: 'maxStreak', name: '杀戮节拍', desc: '单局达成 75 连杀',
    target: 75, rewardCoins: 460, color: 0xc62828, colorHex: '#ff8a80',
  },
  {
    id: 'unbroken_wall', metric: 'perfectVictories', name: '铜墙铁壁', desc: '防线至少保留 90% 并获胜 5 次',
    target: 5, rewardCoins: 520, color: 0x546e7a, colorHex: '#b0bec5',
  },
  {
    id: 'abyss_walker', metric: 'endlessWave', name: '深渊行者', desc: '无尽模式抵达第 20 波',
    target: 20, rewardCoins: 720, color: 0x8e24aa, colorHex: '#ce93d8',
  },
];

export function createEmptyOperationProgress(): OperationProgress {
  return {
    kills: 0,
    waves: 0,
    overdrives: 0,
    synergies: 0,
    bosses: 0,
    victories: 0,
    maxStreak: 0,
    endlessWave: 0,
  };
}

export function createEmptyCareerStats(): CareerStats {
  return { ...createEmptyOperationProgress(), perfectVictories: 0 };
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function shanghaiDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function weeklyIdentity(date: Date): { weekKey: string; displayRange: string } {
  const { year, month, day } = shanghaiDateParts(date);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const isoDay = localDate.getUTCDay() || 7;
  const monday = new Date(localDate);
  monday.setUTCDate(localDate.getUTCDate() - isoDay + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const thursday = new Date(localDate);
  thursday.setUTCDate(localDate.getUTCDate() + 4 - isoDay);
  const weekYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const range = `${monday.getUTCMonth() + 1}月${monday.getUTCDate()}日 - ${sunday.getUTCMonth() + 1}月${sunday.getUTCDate()}日`;
  return { weekKey: `${weekYear}-W${String(week).padStart(2, '0')}`, displayRange: range };
}

export function getWeeklyOperation(date = new Date()): WeeklyOperationDef {
  const identity = weeklyIdentity(date);
  const hash = hashString(identity.weekKey);
  const missions = WEEKLY_POOLS.map((pool, index): WeeklyMissionDef => {
    const mixed = hashString(`${identity.weekKey}:${index}:${hash}`);
    const template = pool.missions[mixed % pool.missions.length];
    return {
      ...template,
      id: `${identity.weekKey}:${template.metric}`,
      category: pool.category,
      categoryName: pool.categoryName,
      color: pool.color,
      colorHex: pool.colorHex,
    };
  });
  return {
    ...identity,
    missions,
    cacheCoins: 240,
    cacheStartIndex: hash % 6,
  };
}

export function getAchievementProgress(def: AchievementDef, stats: CareerStats): number {
  return Math.max(0, Math.floor(stats[def.metric]));
}
