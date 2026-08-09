export type CompanionProtocolKey = 'companion_hunter' | 'companion_vortex' | 'companion_medic';

export interface CompanionProtocolDef {
  key: CompanionProtocolKey;
  name: string;
  shortName: string;
  desc: string;
  cost: number;
  icon: string;
  color: number;
  threshold: number;
  chargeSource: 'hit' | 'kill';
}

export const DEFAULT_COMPANION_PROTOCOL: CompanionProtocolKey = 'companion_hunter';

export const COMPANION_PROTOCOLS: CompanionProtocolDef[] = [
  {
    key: 'companion_hunter', name: '追猎协议', shortName: '追猎',
    desc: '主炮命中蓄能；充满后锁定最危险的伤员，释放一发处决射线。',
    cost: 0, icon: 'icon_air_support', color: 0xffd54a, threshold: 8, chargeSource: 'hit',
  },
  {
    key: 'companion_vortex', name: '磁暴协议', shortName: '磁暴',
    desc: '主炮命中蓄能；充满后寻找最密集尸群，聚拢、震退并强减速。',
    cost: 1200, icon: 'icon_gravity', color: 0xb388ff, threshold: 12, chargeSource: 'hit',
  },
  {
    key: 'companion_medic', name: '急救协议', shortName: '急救',
    desc: '击杀蓄能；充满后俯冲抢修防线，同时补充一层临时护盾。',
    cost: 1000, icon: 'icon_repair', color: 0x69f0ae, threshold: 10, chargeSource: 'kill',
  },
];

export function getCompanionProtocol(key: string): CompanionProtocolDef | undefined {
  return COMPANION_PROTOCOLS.find((protocol) => protocol.key === key);
}

export function isCompanionProtocolKey(key: unknown): key is CompanionProtocolKey {
  return typeof key === 'string' && getCompanionProtocol(key) !== undefined;
}
