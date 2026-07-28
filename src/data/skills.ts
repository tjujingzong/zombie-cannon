// ─── 稀有度 ────────────────────────────────────────
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLOR: Record<Rarity, number> = {
  common: 0xb0bec5,
  rare: 0x42a5f5,
  epic: 0xab47bc,
  legendary: 0xffa726,
};
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
    key: 'burnBullets', name: '灼烧弹', desc: '子弹附带灼烧 (6/秒, 3秒)',
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
    key: 'laserBeam', name: '激光束', desc: '持续激光 (伤害=攻击×0.5/帧)',
    icon: 'icon_laser', rarity: 'legendary', category: 'offense', maxLevel: 1, perLevel: 1,
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
