import { createSeededRandom, hashString } from '../systems/SeededRandom';

type DailyModifierKey = 'overrun' | 'redline' | 'eliteBounty' | 'lastStand';

interface DailyModifierDef {
  key: DailyModifierKey;
  name: string;
  danger: string;
  boon: string;
  enemyCountMultiplier: number;
  enemySpeedMultiplier: number;
  eliteChanceBonus: number;
  initialOverdrive: number;
  color: number;
  colorHex: string;
}

export interface DailyChallengeConfig {
  dateKey: string;
  displayDate: string;
  seed: number;
  code: string;
  levelId: number;
  modifier: DailyModifierDef;
  firstClearReward: number;
  repeatReward: number;
}

const DAILY_TIME_ZONE = 'Asia/Shanghai';

const DAILY_MODIFIERS: Record<DailyModifierKey, DailyModifierDef> = {
  overrun: {
    key: 'overrun',
    name: '尸潮扩容',
    danger: '敌军规模 +26%，精英率小幅提升',
    boon: '初始过载 +30',
    enemyCountMultiplier: 1.26,
    enemySpeedMultiplier: 1,
    eliteChanceBonus: 0.03,
    initialOverdrive: 30,
    color: 0xffa726,
    colorHex: '#ffb74d',
  },
  redline: {
    key: 'redline',
    name: '感染红线',
    danger: '敌军速度 +14%，规模 +8%',
    boon: '初始过载 +40',
    enemyCountMultiplier: 1.08,
    enemySpeedMultiplier: 1.14,
    eliteChanceBonus: 0.04,
    initialOverdrive: 40,
    color: 0xef5350,
    colorHex: '#ff6e6e',
  },
  eliteBounty: {
    key: 'eliteBounty',
    name: '精英悬赏',
    danger: '精英出现率 +18%，敌军规模 +12%',
    boon: '精英掉落更高，初始过载 +25',
    enemyCountMultiplier: 1.12,
    enemySpeedMultiplier: 1.04,
    eliteChanceBonus: 0.18,
    initialOverdrive: 25,
    color: 0xab47bc,
    colorHex: '#ce93d8',
  },
  lastStand: {
    key: 'lastStand',
    name: '终夜围城',
    danger: '敌军规模 +20%，速度 +8%，精英率 +10%',
    boon: '初始过载 +35',
    enemyCountMultiplier: 1.2,
    enemySpeedMultiplier: 1.08,
    eliteChanceBonus: 0.1,
    initialOverdrive: 35,
    color: 0x42a5f5,
    colorHex: '#64b5f6',
  },
};

function getDailyDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getDailyChallenge(dateKey = getDailyDateKey()): DailyChallengeConfig {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error(`Invalid daily challenge date: ${dateKey}`);
  const seed = hashString(`zombie-cannon-daily:${dateKey}`);
  const random = createSeededRandom(seed);
  const modifierKeys = Object.keys(DAILY_MODIFIERS) as DailyModifierKey[];
  const levelId = 5 + Math.floor(random() * 6);
  const modifier = DAILY_MODIFIERS[modifierKeys[Math.floor(random() * modifierKeys.length)]];
  const [, month, day] = dateKey.split('-').map(Number);
  const firstClearReward = 160 + (levelId - 5) * 10;
  return {
    dateKey,
    displayDate: `${month}月${day}日`,
    seed,
    code: seed.toString(36).toUpperCase().padStart(7, '0').slice(0, 7),
    levelId,
    modifier,
    firstClearReward,
    repeatReward: Math.round(firstClearReward * 0.25),
  };
}
