export type BehaviorEquipmentSlot = 'barrel' | 'ammo' | 'wall';

export type BehaviorEquipmentKey =
  | 'barrel_cycler'
  | 'barrel_rail'
  | 'barrel_scatter'
  | 'barrel_overclock'
  | 'barrel_siege'
  | 'ammo_cryo'
  | 'ammo_shrapnel'
  | 'ammo_volatile'
  | 'ammo_incendiary'
  | 'ammo_arc'
  | 'wall_pulse'
  | 'wall_salvage'
  | 'wall_reflector'
  | 'wall_barrier'
  | 'wall_nanites';

export interface BehaviorEquipmentDef {
  key: BehaviorEquipmentKey;
  slot: BehaviorEquipmentSlot;
  name: string;
  shortName: string;
  desc: string;
  cost: number;
  icon: string;
  color: number;
}

export type BehaviorLoadout = Record<BehaviorEquipmentSlot, BehaviorEquipmentKey>;

// 机制渐进解锁：战役前期只保留「炮管积热 + 过载」两条基础机制，
// 弹药槽与城墙槽随关卡推进加入，避免新手局一上来被四套机制淹没。
// 每日挑战与末日无尽视为进阶模式，始终启用全部槽位。
export const AMMO_SLOT_UNLOCK_LEVEL = 4;
export const WALL_SLOT_UNLOCK_LEVEL = 7;

export const BEHAVIOR_SLOT_LABELS: Record<BehaviorEquipmentSlot, string> = {
  barrel: '炮管槽',
  ammo: '弹药槽',
  wall: '城墙模块槽',
};

export const DEFAULT_BEHAVIOR_LOADOUT: BehaviorLoadout = {
  barrel: 'barrel_cycler',
  ammo: 'ammo_cryo',
  wall: 'wall_pulse',
};

export const BEHAVIOR_EQUIPMENT: BehaviorEquipmentDef[] = [
  {
    key: 'barrel_cycler', slot: 'barrel', name: '涡轮旋管', shortName: '旋管',
    desc: '连续齐射积热提速；满热强制排热，并喷出一轮扇形弹幕。',
    cost: 0, icon: 'icon_firerate', color: 0xffb74d,
  },
  {
    key: 'barrel_rail', slot: 'barrel', name: '贯线重炮', shortName: '重炮',
    desc: '射速降低，单发重击、额外穿透并将幸存目标击退。',
    cost: 950, icon: 'icon_pierce', color: 0xd1c4e9,
  },
  {
    key: 'barrel_scatter', slot: 'barrel', name: '扇面补偿器', shortName: '扇射',
    desc: '每第三轮齐射追加两枚侧翼弹，快速横扫密集尸潮。',
    cost: 1250, icon: 'icon_ricochet', color: 0x4dd0e1,
  },
  {
    key: 'barrel_overclock', slot: 'barrel', name: '永续超频器', shortName: '超频',
    desc: '射速提高 42%，单发伤害降低 18%，稳定倾泻弹幕且无需排热。',
    cost: 1580, icon: 'icon_firerate', color: 0xffca28,
  },
  {
    key: 'barrel_siege', slot: 'barrel', name: '攻城压缩炮', shortName: '攻城',
    desc: '射速大幅降低，单发伤害提高并在首次命中时产生小型爆破。',
    cost: 1880, icon: 'icon_explosion', color: 0xff7043,
  },
  {
    key: 'ammo_cryo', slot: 'ammo', name: '零度冷凝弹', shortName: '冷凝',
    desc: '每第五枚弹触发冷凝冲击，强减速命中点附近的敌人。',
    cost: 0, icon: 'icon_frost', color: 0x80deea,
  },
  {
    key: 'ammo_shrapnel', slot: 'ammo', name: '猎杀破片弹', shortName: '破片',
    desc: '主炮击杀会向附近目标飞散五枚碎片，连续收割尸群。',
    cost: 1100, icon: 'icon_ricochet', color: 0xa5d6a7,
  },
  {
    key: 'ammo_volatile', slot: 'ammo', name: '不稳定弹芯', shortName: '爆芯',
    desc: '每第六枚弹在首次命中时爆炸，穿透弹也只引爆一次。',
    cost: 1450, icon: 'icon_explosion', color: 0xff8a65,
  },
  {
    key: 'ammo_incendiary', slot: 'ammo', name: '高温燃素弹', shortName: '燃素',
    desc: '主炮转为火焰伤害；命中会附加短时灼烧，专门熔解冻甲。',
    cost: 1680, icon: 'icon_burn', color: 0xff7043,
  },
  {
    key: 'ammo_arc', slot: 'ammo', name: '电弧跳跃弹', shortName: '电弧',
    desc: '主炮转为雷电伤害；每第四次有效命中向附近目标跳链。',
    cost: 1820, icon: 'icon_chain', color: 0xffee58,
  },
  {
    key: 'wall_pulse', slot: 'wall', name: '震荡电网', shortName: '电网',
    desc: '冷却就绪后受击释放防线脉冲，伤害并大幅击退近墙敌人。',
    cost: 0, icon: 'icon_shield', color: 0x64b5f6,
  },
  {
    key: 'wall_salvage', slot: 'wall', name: '战场回收网', shortName: '回收',
    desc: '击杀精英或首领时回收材料，立刻修复一部分城墙。',
    cost: 1050, icon: 'icon_repair', color: 0x81c784,
  },
  {
    key: 'wall_reflector', slot: 'wall', name: '动能反射甲', shortName: '反射',
    desc: '城墙受击时向前线反射冲击，震退并伤害最近的一批敌人。',
    cost: 1350, icon: 'icon_thorns', color: 0xffcc80,
  },
  {
    key: 'wall_barrier', slot: 'wall', name: '相位壁垒', shortName: '壁垒',
    desc: '城墙受击时周期补充最大生命 7% 的护盾，并降低 12% 穿盾伤害。',
    cost: 1650, icon: 'icon_shield', color: 0x80deea,
  },
  {
    key: 'wall_nanites', slot: 'wall', name: '纳米蜂群舱', shortName: '纳米',
    desc: '城墙受击时周期抢修最大生命 3%，适合长线消耗战。',
    cost: 1780, icon: 'icon_repair', color: 0x69f0ae,
  },
];

export function getBehaviorEquipment(key: string): BehaviorEquipmentDef | undefined {
  return BEHAVIOR_EQUIPMENT.find((item) => item.key === key);
}

export function isBehaviorEquipmentForSlot(
  key: unknown,
  slot: BehaviorEquipmentSlot,
): key is BehaviorEquipmentKey {
  return typeof key === 'string' && getBehaviorEquipment(key)?.slot === slot;
}
