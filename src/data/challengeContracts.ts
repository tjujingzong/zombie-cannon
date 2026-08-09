export type ChallengeContractKey = 'none' | 'blood_tide' | 'blackout' | 'glass_wall';

export interface ChallengeContractDef {
  key: ChallengeContractKey;
  name: string;
  shortName: string;
  desc: string;
  color: number;
  enemyCountMultiplier: number;
  enemySpeedMultiplier: number;
  cannonFireRateMultiplier: number;
  cannonDamageMultiplier: number;
  wallHpMultiplier: number;
  wallDamageMultiplier: number;
  coinMultiplier: number;
  overdriveMultiplier: number;
}

export const DEFAULT_CHALLENGE_CONTRACT: ChallengeContractKey = 'none';

export const CHALLENGE_CONTRACTS: ChallengeContractDef[] = [
  {
    key: 'blood_tide', name: '血潮增压', shortName: '血潮',
    desc: '尸群更多、更快；每次击杀金币与过载收益提高。', color: 0xff6e6e,
    enemyCountMultiplier: 1.28, enemySpeedMultiplier: 1.08,
    cannonFireRateMultiplier: 1, cannonDamageMultiplier: 1,
    wallHpMultiplier: 1, wallDamageMultiplier: 1,
    coinMultiplier: 1.65, overdriveMultiplier: 1.28,
  },
  {
    key: 'blackout', name: '断电静默', shortName: '断电',
    desc: '炮台射速降低；每次击杀却能积攒更多过载，逼你抓准爆发窗口。', color: 0x90caf9,
    enemyCountMultiplier: 1, enemySpeedMultiplier: 1,
    cannonFireRateMultiplier: 0.76, cannonDamageMultiplier: 1,
    wallHpMultiplier: 1, wallDamageMultiplier: 1,
    coinMultiplier: 1.55, overdriveMultiplier: 1.55,
  },
  {
    key: 'glass_wall', name: '玻璃高墙', shortName: '玻璃',
    desc: '城墙更脆，但炮击更重、金币翻倍；适合主动清场的极限构筑。', color: 0xffcc80,
    enemyCountMultiplier: 1, enemySpeedMultiplier: 1,
    cannonFireRateMultiplier: 1, cannonDamageMultiplier: 1.24,
    wallHpMultiplier: 0.68, wallDamageMultiplier: 1.12,
    coinMultiplier: 2.05, overdriveMultiplier: 1.15,
  },
];

export function getChallengeContract(key: string): ChallengeContractDef {
  return CHALLENGE_CONTRACTS.find((contract) => contract.key === key)
    ?? {
      key: 'none', name: '稳守阵线', shortName: '稳守', desc: '不启用额外挑战。', color: 0x8a9aa8,
      enemyCountMultiplier: 1, enemySpeedMultiplier: 1,
      cannonFireRateMultiplier: 1, cannonDamageMultiplier: 1,
      wallHpMultiplier: 1, wallDamageMultiplier: 1,
      coinMultiplier: 1, overdriveMultiplier: 1,
    };
}

export function isChallengeContractKey(key: unknown): key is ChallengeContractKey {
  return key === 'none' || (typeof key === 'string' && CHALLENGE_CONTRACTS.some((contract) => contract.key === key));
}
