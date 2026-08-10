import type { DamageElement } from './zombies';

// ─── 稀有度 ────────────────────────────────────────
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};
export const RARITY_HEX: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffa726',
};

// ─── 技能定义 ──────────────────────────────────────
export interface SkillDef {
  key: string;
  name: string;
  desc: string;
  icon: string;
  rarity: Rarity;
  category: 'offense' | 'defense' | 'utility';
  maxLevel: number;
  /** 每级数值增量（由 SkillSystem 解释） */
  perLevel: number;
  /** 对应元素通道，用于图鉴与克制提示 */
  element?: DamageElement;
}

export const SKILLS: SkillDef[] = [
  // ── 攻击类 ──
  {
    key: 'firePower', name: '火力强化', desc: '攻击力 +25%',
    icon: 'icon_damage', rarity: 'common', category: 'offense', maxLevel: 5, perLevel: 0.25,
  },
  {
    key: 'rapidFire', name: '急速装填', desc: '攻速 +20%',
    icon: 'icon_firerate', rarity: 'common', category: 'offense', maxLevel: 5, perLevel: 0.20,
  },
  {
    key: 'multiBarrel', name: '多重炮管', desc: '子弹数量 +1',
    icon: 'icon_multishot', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'armorPiercing', name: '穿甲弹', desc: '穿透 +1',
    icon: 'icon_pierce', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'criticalAim', name: '致命瞄准', desc: '暴击率 +12%',
    icon: 'icon_crit', rarity: 'common', category: 'offense', maxLevel: 5, perLevel: 0.12,
  },
  {
    key: 'burnBullets', name: '灼烧弹', desc: '命中附带持续3秒的灼烧伤害',
    icon: 'icon_burn', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 2,
  },
  {
    key: 'ricochet', name: '弹射弹', desc: '子弹命中后弹射最近敌人',
    icon: 'icon_ricochet', rarity: 'epic', category: 'offense', maxLevel: 2, perLevel: 1,
  },
  {
    key: 'homingMissile', name: '追踪导弹', desc: '每4秒发射追踪导弹',
    icon: 'icon_missile', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'explosiveRound', name: '爆炸弹', desc: '击杀时小范围爆炸',
    icon: 'icon_explosion', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'laserBeam', name: '激光束', desc: '持续发射贯穿敌群的高能光束',
    icon: 'icon_laser', rarity: 'legendary', category: 'offense', maxLevel: 1, perLevel: 1,
  },
  {
    key: 'frostRounds', name: '冰冻弹头', desc: '命中减速12%，持续2.5秒',
    icon: 'icon_frost', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 0.12,
  },
  {
    key: 'executioner', name: '处决协议', desc: '对低血量敌人造成额外伤害',
    icon: 'icon_execute', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.15,
  },
  {
    key: 'airSupport', name: '空中支援', desc: '周期发射无人机追踪弹',
    icon: 'icon_air_support', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'gravityWell', name: '引力奇点', desc: '周期生成引力场，聚拢并持续伤害敌群',
    icon: 'icon_gravity', rarity: 'legendary', category: 'offense', maxLevel: 3, perLevel: 1, element: 'gravity',
  },
  {
    key: 'kineticCalibration', name: '动能校准', desc: '动能伤害 +18%，克制普通与轻甲目标',
    icon: 'icon_pierce', rarity: 'common', category: 'offense', maxLevel: 4, perLevel: 0.18, element: 'kinetic',
  },
  {
    key: 'incendiaryCore', name: '燃烧核心', desc: '火焰伤害 +22%，提升灼烧与冰火震爆',
    icon: 'icon_burn', rarity: 'rare', category: 'offense', maxLevel: 4, perLevel: 0.22, element: 'fire',
  },
  {
    key: 'cryoAmplifier', name: '极寒增幅器', desc: '寒冰伤害 +22%，减速强度与持续时间提高',
    icon: 'icon_frost', rarity: 'rare', category: 'offense', maxLevel: 4, perLevel: 0.22, element: 'frost',
  },
  {
    key: 'stormCoil', name: '风暴线圈', desc: '主炮命中有概率释放小型连锁闪电',
    icon: 'icon_chain', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.08, element: 'lightning',
  },
  {
    key: 'toxicPayload', name: '腐蚀载荷', desc: '主炮附加腐蚀持续伤害，专破重甲与导体',
    icon: 'icon_toxic', rarity: 'rare', category: 'offense', maxLevel: 4, perLevel: 1.8, element: 'toxic',
  },
  {
    key: 'plasmaLance', name: '等离子枪膛', desc: '能量伤害 +24%，强化激光与空中支援',
    icon: 'icon_laser', rarity: 'epic', category: 'offense', maxLevel: 4, perLevel: 0.24, element: 'energy',
  },
  {
    key: 'demolitionExpert', name: '爆破专家', desc: '爆破伤害 +20%，扩大爆炸与地雷威力',
    icon: 'icon_explosion', rarity: 'rare', category: 'offense', maxLevel: 4, perLevel: 0.20, element: 'explosive',
  },
  {
    key: 'gravityLens', name: '曲率透镜', desc: '引力伤害 +25%，奇点牵引范围同步扩大',
    icon: 'icon_gravity', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.25, element: 'gravity',
  },
  {
    key: 'elementalMastery', name: '元素洞察', desc: '命中敌人弱点时额外提高克制倍率',
    icon: 'icon_lucky', rarity: 'epic', category: 'offense', maxLevel: 4, perLevel: 0.08,
  },
  {
    key: 'shatterRounds', name: '碎冰弹', desc: '对减速目标造成额外伤害',
    icon: 'icon_cryo_mine', rarity: 'rare', category: 'offense', maxLevel: 3, perLevel: 0.16, element: 'frost',
  },
  {
    key: 'heatExecution', name: '热能处决', desc: '对灼烧或腐蚀目标造成额外伤害',
    icon: 'icon_execute', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.18, element: 'fire',
  },
  {
    key: 'clusterWarhead', name: '集束战斗部', desc: '范围爆炸扩大，并提高边缘伤害',
    icon: 'icon_doom', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.14, element: 'explosive',
  },
  {
    key: 'bossHunter', name: '首领猎杀令', desc: '对首领和精英造成额外伤害',
    icon: 'icon_fatal', rarity: 'rare', category: 'offense', maxLevel: 4, perLevel: 0.12,
  },
  {
    key: 'crowdBreaker', name: '尸潮粉碎机', desc: '场上敌人越多，范围伤害越高',
    icon: 'icon_storm', rarity: 'epic', category: 'offense', maxLevel: 3, perLevel: 0.06,
  },

  // ── 防御类 ──
  {
    key: 'emergencyRepair', name: '紧急维修', desc: '立即修复30%墙体',
    icon: 'icon_repair', rarity: 'common', category: 'defense', maxLevel: 99, perLevel: 0.3,
  },
  {
    key: 'steelWall', name: '钢铁壁垒', desc: '墙体受伤减少25%',
    icon: 'icon_steel', rarity: 'rare', category: 'defense', maxLevel: 3, perLevel: 0.25,
  },
  {
    key: 'thorns', name: '反伤棘刺', desc: '墙体被攻击时反弹30%伤害',
    icon: 'icon_thorns', rarity: 'rare', category: 'defense', maxLevel: 3, perLevel: 0.3,
  },
  {
    key: 'energyShield', name: '能量护盾', desc: '每10秒为墙体生成50点护盾',
    icon: 'icon_shield', rarity: 'epic', category: 'defense', maxLevel: 3, perLevel: 25,
  },
  {
    key: 'minefield', name: '防线雷区', desc: '在城墙前持续部署范围地雷',
    icon: 'icon_minefield', rarity: 'rare', category: 'defense', maxLevel: 3, perLevel: 1,
  },
  {
    key: 'fieldMedic', name: '战地修复', desc: '累计击杀后自动修复城墙',
    icon: 'icon_field_medic', rarity: 'rare', category: 'defense', maxLevel: 3, perLevel: 0.02,
  },
  {
    key: 'reinforcedFoundation', name: '加固地基', desc: '墙体上限与当前耐久 +12%',
    icon: 'icon_steel', rarity: 'common', category: 'defense', maxLevel: 4, perLevel: 0.12,
  },
  {
    key: 'reactiveArmor', name: '反应装甲', desc: '墙体受击伤害额外降低 7%',
    icon: 'icon_shield', rarity: 'rare', category: 'defense', maxLevel: 4, perLevel: 0.07,
  },
  {
    key: 'emergencyBarrier', name: '应急屏障', desc: '墙体低于 30% 时周期获得临时护盾',
    icon: 'icon_fortress', rarity: 'epic', category: 'defense', maxLevel: 3, perLevel: 18,
  },
  {
    key: 'nanoRepair', name: '纳米修复群', desc: '波次间自动修复部分墙体',
    icon: 'icon_repair', rarity: 'rare', category: 'defense', maxLevel: 4, perLevel: 0.025,
  },
  {
    key: 'repulsionField', name: '斥力防线', desc: '墙体受击时提高击退脉冲范围',
    icon: 'icon_gravity', rarity: 'epic', category: 'defense', maxLevel: 3, perLevel: 28, element: 'gravity',
  },
  {
    key: 'lastStand', name: '背水一战', desc: '墙体低血量时炮台伤害大幅提高',
    icon: 'icon_fatal', rarity: 'legendary', category: 'defense', maxLevel: 2, perLevel: 0.28,
  },

  // ── 辅助类 ──
  {
    key: 'goldRush', name: '赏金猎人', desc: '金币获取 +40%',
    icon: 'icon_gold', rarity: 'common', category: 'utility', maxLevel: 3, perLevel: 0.4,
  },
  {
    key: 'magnet', name: '磁铁吸附', desc: '自动吸取掉落金币',
    icon: 'icon_magnet', rarity: 'rare', category: 'utility', maxLevel: 2, perLevel: 1,
  },
  {
    key: 'luckyStar', name: '幸运星', desc: '技能刷新出现高稀有度概率 +15%',
    icon: 'icon_lucky', rarity: 'rare', category: 'utility', maxLevel: 3, perLevel: 0.15,
  },
  {
    key: 'salvageScanner', name: '战场扫描仪', desc: '精英与首领奖励金币提高 24%',
    icon: 'icon_gold', rarity: 'rare', category: 'utility', maxLevel: 3, perLevel: 0.24,
  },
  {
    key: 'overdriveReservoir', name: '过载储液罐', desc: '击杀获得的过载能量提高 18%',
    icon: 'icon_barrage', rarity: 'rare', category: 'utility', maxLevel: 3, perLevel: 0.18,
  },
  {
    key: 'tacticalReserve', name: '战术储备', desc: '刷新技能的金币消耗降低 15%',
    icon: 'icon_air_support', rarity: 'common', category: 'utility', maxLevel: 3, perLevel: 0.15,
  },
  {
    key: 'rareRequisition', name: '稀有征调令', desc: '进一步提高史诗与传说技能出现率',
    icon: 'icon_lucky', rarity: 'epic', category: 'utility', maxLevel: 3, perLevel: 0.12,
  },
];

export function getSkill(key: string): SkillDef {
  const s = SKILLS.find((sk) => sk.key === key);
  if (!s) throw new Error(`Skill ${key} not found`);
  return s;
}

// ─── 组合技定义 ────────────────────────────────────
export interface SynergyDef {
  key: string;
  name: string;
  desc: string;
  icon: string;
  /** 所需技能及其最低等级 */
  requires: { skill: string; minLevel: number }[];
  /** 四条核心流派的终局进化节点 */
  ultimate?: boolean;
}

export const SYNERGIES: SynergyDef[] = [
  {
    key: 'hellPiercer',
    name: '地狱穿甲弹',
    desc: '被穿透的敌人也会被灼烧',
    icon: 'icon_hell',
    requires: [{ skill: 'burnBullets', minLevel: 1 }, { skill: 'armorPiercing', minLevel: 1 }],
  },
  {
    key: 'bulletStorm',
    name: '弹幕风暴',
    desc: '弹射时额外发射2发子弹',
    icon: 'icon_storm',
    requires: [{ skill: 'multiBarrel', minLevel: 1 }, { skill: 'ricochet', minLevel: 1 }],
  },
  {
    key: 'fatalLaser',
    name: '致命光束',
    desc: '激光必定暴击',
    icon: 'icon_fatal',
    requires: [{ skill: 'criticalAim', minLevel: 1 }, { skill: 'laserBeam', minLevel: 1 }],
  },
  {
    key: 'ironWall',
    name: '铜墙铁壁',
    desc: '墙体受伤后2秒无敌',
    icon: 'icon_iron',
    requires: [{ skill: 'thorns', minLevel: 1 }, { skill: 'steelWall', minLevel: 1 }],
  },
  {
    key: 'saturationStrike',
    name: '饱和打击',
    desc: '追踪导弹一次发射3枚',
    icon: 'icon_satur',
    requires: [{ skill: 'homingMissile', minLevel: 1 }, { skill: 'multiBarrel', minLevel: 1 }],
  },
  {
    key: 'detonation',
    name: '爆燃弹',
    desc: '暴击时产生范围爆炸',
    icon: 'icon_deton',
    requires: [{ skill: 'burnBullets', minLevel: 1 }, { skill: 'criticalAim', minLevel: 1 }],
  },
  {
    key: 'doomsday',
    name: '末日弹',
    desc: '爆炸范围扩大50%，伤害+50%',
    icon: 'icon_doom',
    requires: [{ skill: 'explosiveRound', minLevel: 1 }, { skill: 'armorPiercing', minLevel: 1 }],
  },
  {
    key: 'barrage',
    name: '火力全开',
    desc: '多重炮管时攻速额外+50%',
    icon: 'icon_barrage',
    requires: [{ skill: 'rapidFire', minLevel: 2 }, { skill: 'multiBarrel', minLevel: 1 }],
  },
  {
    key: 'fortress',
    name: '铁壁堡垒',
    desc: '护盾恢复速度翻倍',
    icon: 'icon_fortress',
    requires: [{ skill: 'energyShield', minLevel: 1 }, { skill: 'steelWall', minLevel: 1 }],
  },
  {
    key: 'goldHunter',
    name: '黄金猎手',
    desc: '拾取金币恢复墙体5点HP',
    icon: 'icon_goldHunter',
    requires: [{ skill: 'goldRush', minLevel: 1 }, { skill: 'magnet', minLevel: 1 }],
  },
  {
    key: 'chainLightning',
    name: '连锁闪电',
    desc: '弹射弹命中3个以上敌人时释放闪电',
    icon: 'icon_chain',
    requires: [{ skill: 'ricochet', minLevel: 2 }, { skill: 'criticalAim', minLevel: 2 }],
  },
  {
    key: 'armageddon',
    name: '末日审判',
    desc: '激光+导弹+爆炸同时激活时，全屏轰炸一波',
    icon: 'icon_armageddon',
    requires: [{ skill: 'laserBeam', minLevel: 1 }, { skill: 'homingMissile', minLevel: 1 }, { skill: 'explosiveRound', minLevel: 1 }],
  },
  {
    key: 'thermalShock',
    name: '冰火震爆',
    desc: '冰冻与灼烧同时命中会引发范围震爆',
    icon: 'icon_thermal_shock',
    requires: [{ skill: 'frostRounds', minLevel: 1 }, { skill: 'burnBullets', minLevel: 1 }],
  },
  {
    key: 'singularityBomb',
    name: '坍缩炸弹',
    desc: '引力场消失时引发一次强力爆炸',
    icon: 'icon_singularity_bomb',
    requires: [{ skill: 'gravityWell', minLevel: 1 }, { skill: 'explosiveRound', minLevel: 1 }],
  },
  {
    key: 'cryoMine',
    name: '极寒雷区',
    desc: '地雷爆炸会大幅减速范围内的敌人',
    icon: 'icon_cryo_mine',
    requires: [{ skill: 'minefield', minLevel: 1 }, { skill: 'frostRounds', minLevel: 1 }],
  },
  {
    key: 'droneSwarm',
    name: '无人机蜂群',
    desc: '空中支援发射更多导弹且呼叫更频繁',
    icon: 'icon_drone_swarm',
    requires: [{ skill: 'airSupport', minLevel: 1 }, { skill: 'homingMissile', minLevel: 1 }],
  },
  {
    key: 'fieldHospital',
    name: '战地医院',
    desc: '自动修复城墙时同步补充能量护盾',
    icon: 'icon_field_hospital',
    requires: [{ skill: 'fieldMedic', minLevel: 1 }, { skill: 'energyShield', minLevel: 1 }],
  },
  {
    key: 'firestormCircuit',
    name: '炽雷回路',
    desc: '火焰命中会提高风暴线圈触发率，电弧同时点燃目标',
    icon: 'icon_chain',
    requires: [{ skill: 'incendiaryCore', minLevel: 2 }, { skill: 'stormCoil', minLevel: 2 }],
  },
  {
    key: 'toxicCombustion',
    name: '腐蚀爆燃',
    desc: '同时处于灼烧和腐蚀的目标受到额外持续伤害',
    icon: 'icon_deton',
    requires: [{ skill: 'toxicPayload', minLevel: 2 }, { skill: 'burnBullets', minLevel: 2 }],
  },
  {
    key: 'shatterstorm',
    name: '极寒碎裂',
    desc: '对减速目标的碎冰增伤翻倍，并扩散一圈寒冰冲击',
    icon: 'icon_cryo_mine',
    requires: [{ skill: 'cryoAmplifier', minLevel: 2 }, { skill: 'shatterRounds', minLevel: 2 }],
  },
  {
    key: 'antimatterLens',
    name: '反物质透镜',
    desc: '引力场中的目标受到更多能量伤害',
    icon: 'icon_singularity_bomb',
    requires: [{ skill: 'plasmaLance', minLevel: 2 }, { skill: 'gravityLens', minLevel: 2 }],
  },
  {
    key: 'siegeDoctrine',
    name: '集束攻城学',
    desc: '爆炸范围与边缘伤害进一步提高，地雷追加二次冲击',
    icon: 'icon_doom',
    requires: [{ skill: 'demolitionExpert', minLevel: 2 }, { skill: 'clusterWarhead', minLevel: 2 }],
  },
  {
    key: 'adaptiveHunter',
    name: '自适应猎杀',
    desc: '对首领或精英触发元素克制时再追加一次增伤',
    icon: 'icon_fatal',
    requires: [{ skill: 'elementalMastery', minLevel: 2 }, { skill: 'bossHunter', minLevel: 2 }],
  },
  {
    key: 'resilientCore',
    name: '自愈装甲核',
    desc: '受击减伤与波间修复效果同步提高',
    icon: 'icon_field_hospital',
    requires: [{ skill: 'reactiveArmor', minLevel: 2 }, { skill: 'nanoRepair', minLevel: 2 }],
  },
  {
    key: 'requisitionNetwork',
    name: '军需征调网',
    desc: '精英悬赏提高，刷新技能时更容易获得高稀有度',
    icon: 'icon_goldHunter',
    requires: [{ skill: 'salvageScanner', minLevel: 2 }, { skill: 'rareRequisition', minLevel: 2 }],
  },
  {
    key: 'elementalCataclysm',
    name: '终极·冰火湮灭',
    desc: '冰火震爆范围扩大，并引发二次爆破',
    icon: 'art_ultimate_elemental_cataclysm_v1',
    requires: [
      { skill: 'burnBullets', minLevel: 3 },
      { skill: 'frostRounds', minLevel: 3 },
      { skill: 'explosiveRound', minLevel: 2 },
    ],
    ultimate: true,
  },
  {
    key: 'infiniteBarrage',
    name: '终极·无限弹幕',
    desc: '攻速再次提升35%，并增加一次弹射',
    icon: 'art_ultimate_infinite_barrage_v1',
    requires: [
      { skill: 'rapidFire', minLevel: 4 },
      { skill: 'multiBarrel', minLevel: 3 },
      { skill: 'ricochet', minLevel: 2 },
    ],
    ultimate: true,
  },
  {
    key: 'orbitalCommand',
    name: '终极·天基指挥',
    desc: '导弹与空中支援频率、齐射数量全面提升',
    icon: 'art_ultimate_orbital_command_v1',
    requires: [
      { skill: 'homingMissile', minLevel: 3 },
      { skill: 'airSupport', minLevel: 3 },
      { skill: 'gravityWell', minLevel: 1 },
    ],
    ultimate: true,
  },
  {
    key: 'eternalFortress',
    name: '终极·永恒堡垒',
    desc: '护盾容量与雷区部署效率大幅提升',
    icon: 'art_ultimate_eternal_fortress_v1',
    requires: [
      { skill: 'steelWall', minLevel: 3 },
      { skill: 'energyShield', minLevel: 3 },
      { skill: 'minefield', minLevel: 3 },
      { skill: 'fieldMedic', minLevel: 2 },
    ],
    ultimate: true,
  },
];

// ─── 稀有度权重（用于刷新） ──────────────────────
export function rarityWeight(r: Rarity, luckBonus: number): number {
  const base: Record<Rarity, number> = {
    common: 55,
    rare: 30,
    epic: 12,
    legendary: 3,
  };
  // luckBonus 将 common 的权重转移到高稀有度
  const transfer = base.common * luckBonus;
  return Math.max(0, base[r] + (r === 'common' ? -transfer : transfer * (r === 'rare' ? 0.5 : r === 'epic' ? 0.35 : 0.15)));
}
