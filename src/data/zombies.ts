export type DamageElement =
  | 'kinetic'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'explosive'
  | 'toxic'
  | 'energy'
  | 'gravity';

interface DamageElementDef {
  key: DamageElement;
  name: string;
  shortName: string;
  color: number;
  icon: string;
}

export const DAMAGE_ELEMENTS: Record<DamageElement, DamageElementDef> = {
  kinetic: { key: 'kinetic', name: '动能', shortName: '动', color: 0xcfd8dc, icon: 'icon_pierce' },
  fire: { key: 'fire', name: '火焰', shortName: '火', color: 0xff7043, icon: 'icon_burn' },
  frost: { key: 'frost', name: '寒冰', shortName: '冰', color: 0x80deea, icon: 'icon_frost' },
  lightning: { key: 'lightning', name: '雷电', shortName: '雷', color: 0xffee58, icon: 'icon_chain' },
  explosive: { key: 'explosive', name: '爆破', shortName: '爆', color: 0xffb74d, icon: 'icon_explosion' },
  toxic: { key: 'toxic', name: '腐蚀', shortName: '蚀', color: 0x9ccc65, icon: 'icon_toxic' },
  energy: { key: 'energy', name: '能量', shortName: '能', color: 0xce93d8, icon: 'icon_laser' },
  gravity: { key: 'gravity', name: '引力', shortName: '引', color: 0xb388ff, icon: 'icon_gravity' },
};

export type ZombieBehaviorKey =
  | 'swarm'
  | 'normal'
  | 'fast'
  | 'tank'
  | 'boss'
  | 'spitter'
  | 'exploder'
  | 'healer'
  | 'shield'
  | 'ghost'
  | 'berserker'
  | 'summoner'
  | 'leaper'
  | 'splitter'
  | 'jammer'
  | 'burrower'
  | 'conductor'
  | 'siphon';

interface ZombieStats {
  hp: number;
  speed: number;
  damage: number;
  coin: number;
  scale: number;
  texture: string;
  tint: number;
  archetype: ZombieBehaviorKey;
  element: DamageElement;
  damageMultipliers: Partial<Record<DamageElement, number>>;
  palette: { skin: number; clothes: number; accent: number };
  artTexture?: string;
}

interface ZombieCodex {
  role: string;
  behavior: string;
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
  counter: string;
  firstSeen: number;
  threat: number;
}

interface ZombieDefinition extends ZombieStats {
  role: string;
  behavior: string;
  counter: string;
  firstSeen: number;
  threat: number;
}

const profile = (
  weak: DamageElement[],
  resist: DamageElement[] = [],
  immune: DamageElement[] = [],
): Partial<Record<DamageElement, number>> => {
  const result: Partial<Record<DamageElement, number>> = {};
  weak.forEach((element) => { result[element] = 1.55; });
  resist.forEach((element) => { result[element] = 0.58; });
  immune.forEach((element) => { result[element] = 0; });
  return result;
};

const core = (definition: ZombieDefinition): ZombieDefinition => definition;

const CORE_ZOMBIES = {
  swarm: core({
    hp: 9, speed: 78, damage: 2, coin: 1, scale: 0.68, texture: 'zombie_swarm', tint: 0xffffff,
    archetype: 'swarm', element: 'kinetic', damageMultipliers: profile(['fire', 'lightning', 'explosive'], ['kinetic']),
    palette: { skin: 0x6e9b58, clothes: 0x355a31, accent: 0xd7e883 },
    role: '尸潮腐尸', behavior: '成群高速涌入，单体脆弱但数量极多。',
    counter: '火焰、雷电与爆破能把密集目标一次清空。', firstSeen: 1, threat: 2,
  }),
  normal: core({
    hp: 30, speed: 60, damage: 5, coin: 5, scale: 1, texture: 'zombie_normal', tint: 0xffffff,
    archetype: 'normal', element: 'kinetic', damageMultipliers: profile(['kinetic'], ['toxic']),
    palette: { skin: 0x7aa85c, clothes: 0x4f7a3a, accent: 0xc5e1a5 },
    role: '普通步兵', behavior: '直线推进，触墙后周期攻击。',
    counter: '动能校准后的主炮最有效，适合维持连杀。', firstSeen: 1, threat: 1,
  }),
  fast: core({
    hp: 18, speed: 120, damage: 4, coin: 7, scale: 0.85, texture: 'zombie_fast', tint: 0xffffff,
    archetype: 'fast', element: 'kinetic', damageMultipliers: profile(['frost'], ['lightning']),
    palette: { skin: 0x66a3b5, clothes: 0x3a6a7a, accent: 0x9be7ff },
    role: '突袭兵', behavior: '移动速度极快，会提前逼近墙体。',
    counter: '寒冰伤害与减速能直接瓦解其速度优势。', firstSeen: 1, threat: 2,
  }),
  tank: core({
    hp: 120, speed: 38, damage: 12, coin: 15, scale: 1.3, texture: 'zombie_tank', tint: 0xffffff,
    archetype: 'tank', element: 'kinetic', damageMultipliers: profile(['fire', 'toxic'], ['kinetic', 'frost']),
    palette: { skin: 0x9c7a52, clothes: 0x6a4a2e, accent: 0xffcc80 },
    role: '重甲肉盾', behavior: '高耐久低速推进，为后排吸收主炮火力。',
    counter: '用灼烧和腐蚀绕过厚甲，爆发留给其身后的支援单位。', firstSeen: 2, threat: 3,
  }),
  boss: core({
    hp: 900, speed: 28, damage: 30, coin: 100, scale: 2.1, texture: 'zombie_boss', tint: 0xffffff,
    archetype: 'boss', element: 'energy', damageMultipliers: profile(['explosive', 'gravity'], ['kinetic', 'energy']),
    palette: { skin: 0x9455a8, clothes: 0x5a2a6a, accent: 0xffb74d }, artTexture: 'art_zombie_boss_v1',
    role: '尸潮之王', behavior: '半血狂暴，周期召唤护卫并追加远程轰击。',
    counter: '引力聚怪后以爆破集中削血，保留过载处理召唤物。', firstSeen: 5, threat: 5,
  }),
  spitter: core({
    hp: 25, speed: 50, damage: 8, coin: 12, scale: 0.95, texture: 'zombie_spitter', tint: 0xffffff,
    archetype: 'spitter', element: 'toxic', damageMultipliers: profile(['energy', 'kinetic'], ['toxic']),
    palette: { skin: 0x66bb6a, clothes: 0x2e7d32, accent: 0xb2ff59 },
    role: '远程喷射者', behavior: '进入射程后停下，以酸液持续消耗城墙。',
    counter: '追踪弹和能量束可越过前排优先点杀。', firstSeen: 4, threat: 3,
  }),
  exploder: core({
    hp: 15, speed: 90, damage: 40, coin: 10, scale: 0.9, texture: 'zombie_exploder', tint: 0xffffff,
    archetype: 'exploder', element: 'explosive', damageMultipliers: profile(['frost', 'kinetic'], ['explosive']),
    palette: { skin: 0xef5350, clothes: 0xc62828, accent: 0xffeb3b },
    role: '自爆兵', behavior: '死亡时引爆，对周围同伴和防线造成冲击。',
    counter: '用寒冰控制并在远处以动能单点引爆。', firstSeen: 3, threat: 3,
  }),
  healer: core({
    hp: 40, speed: 45, damage: 4, coin: 18, scale: 1.05, texture: 'zombie_healer', tint: 0xffffff,
    archetype: 'healer', element: 'toxic', damageMultipliers: profile(['fire', 'energy'], ['toxic']),
    palette: { skin: 0x4db6ac, clothes: 0x00695c, accent: 0x69f0ae },
    role: '治愈者', behavior: '周期治疗范围内的受伤单位。',
    counter: '火焰会压制其恢复节奏，能量武器适合快速点名。', firstSeen: 4, threat: 4,
  }),
  shield: core({
    hp: 60, speed: 55, damage: 8, coin: 20, scale: 1.2, texture: 'zombie_shield', tint: 0xffffff,
    archetype: 'shield', element: 'energy', damageMultipliers: profile(['lightning', 'explosive'], ['energy']),
    palette: { skin: 0x42a5f5, clothes: 0x1565c0, accent: 0x80d8ff },
    role: '护盾卫士', behavior: '携带额外能量盾，破盾前本体不会受损。',
    counter: '雷电过载护盾，再用爆破清理被保护的敌群。', firstSeen: 5, threat: 4,
  }),
  ghost: core({
    hp: 20, speed: 75, damage: 6, coin: 14, scale: 0.9, texture: 'zombie_ghost', tint: 0xffffff,
    archetype: 'ghost', element: 'energy', damageMultipliers: profile(['fire', 'energy'], ['kinetic'], ['gravity']),
    palette: { skin: 0x90a4ae, clothes: 0x455a64, accent: 0xeceff1 },
    role: '幽灵', behavior: '周期隐身，隐身期间无法被直接命中。',
    counter: '现身时附加灼烧，持续伤害会跨越下一次隐身窗口。', firstSeen: 6, threat: 4,
  }),
  berserker: core({
    hp: 50, speed: 40, damage: 10, coin: 16, scale: 1.1, texture: 'zombie_berserker', tint: 0xffffff,
    archetype: 'berserker', element: 'fire', damageMultipliers: profile(['frost', 'energy'], ['fire']),
    palette: { skin: 0xb71c1c, clothes: 0x8b0000, accent: 0xff5252 },
    role: '狂暴者', behavior: '血量越低速度越快，濒死时会极速冲墙。',
    counter: '寒冰控制后一次处决，不要让它长时间停留在残血。', firstSeen: 7, threat: 4,
  }),
  summoner: core({
    hp: 70, speed: 35, damage: 6, coin: 25, scale: 1.15, texture: 'zombie_summoner', tint: 0xffffff,
    archetype: 'summoner', element: 'gravity', damageMultipliers: profile(['energy', 'lightning'], ['gravity']),
    palette: { skin: 0x9c27b0, clothes: 0x4a148c, accent: 0xce93d8 },
    role: '召唤者', behavior: '周期召来突袭兵，存活越久战场压力越高。',
    counter: '能量与雷电适合越过召唤物快速锁定本体。', firstSeen: 8, threat: 5,
  }),
  leaper: core({
    hp: 32, speed: 62, damage: 9, coin: 15, scale: 0.95, texture: 'zombie_leaper', tint: 0xffffff,
    archetype: 'leaper', element: 'kinetic', damageMultipliers: profile(['frost', 'gravity'], ['kinetic']),
    palette: { skin: 0xf59e0b, clothes: 0xb45309, accent: 0xfff176 },
    role: '跃袭者', behavior: '周期高速跃进，短时间跨越大段路程。',
    counter: '寒冰减速和引力牵引都能破坏跃袭节奏。', firstSeen: 7, threat: 3,
  }),
  splitter: core({
    hp: 42, speed: 48, damage: 6, coin: 14, scale: 1.05, texture: 'zombie_splitter', tint: 0xffffff,
    archetype: 'splitter', element: 'toxic', damageMultipliers: profile(['fire', 'explosive'], ['toxic']),
    palette: { skin: 0x91b66c, clothes: 0x4d6b35, accent: 0xc6ff00 },
    role: '分裂母体', behavior: '死亡后分裂为两只尸潮腐尸。',
    counter: '火焰与爆破能把母体和分裂产物一并清理。', firstSeen: 6, threat: 4,
  }),
  jammer: core({
    hp: 58, speed: 42, damage: 5, coin: 22, scale: 1.1, texture: 'zombie_jammer', tint: 0xffffff,
    archetype: 'jammer', element: 'lightning', damageMultipliers: profile(['explosive', 'toxic'], ['lightning']),
    palette: { skin: 0x5c6bc0, clothes: 0x283593, accent: 0x80d8ff },
    role: '电磁干扰者', behavior: '存活时压制炮台射速，多只会叠加。',
    counter: '爆破和腐蚀不依赖电路，适合快速拆除干扰核心。', firstSeen: 8, threat: 5,
  }),
  burrower: core({
    hp: 38, speed: 58, damage: 12, coin: 18, scale: 0.95, texture: 'zombie_burrower', tint: 0xffffff,
    archetype: 'burrower', element: 'gravity', damageMultipliers: profile(['explosive', 'frost'], ['gravity']),
    palette: { skin: 0x8d6e63, clothes: 0x493226, accent: 0xffc107 },
    role: '掘地伏击者', behavior: '潜地高速接近防线，破土前不受普通攻击。',
    counter: '地雷可迫使其破土，随后立刻用寒冰控制。', firstSeen: 6, threat: 4,
  }),
  conductor: core({
    hp: 82, speed: 36, damage: 7, coin: 28, scale: 1.15, texture: 'zombie_conductor', tint: 0xffffff,
    archetype: 'conductor', element: 'lightning', damageMultipliers: profile(['toxic', 'kinetic'], ['lightning']),
    palette: { skin: 0x26a69a, clothes: 0x124e5b, accent: 0x80deea },
    role: '尸群导体', behavior: '展开链接，为附近僵尸提供伤害减免。',
    counter: '腐蚀与穿甲主炮能迅速破坏导体，先杀它再清场。', firstSeen: 7, threat: 5,
  }),
  siphon: core({
    hp: 68, speed: 46, damage: 11, coin: 24, scale: 1.08, texture: 'zombie_siphon', tint: 0xffffff,
    archetype: 'siphon', element: 'toxic', damageMultipliers: profile(['fire', 'frost'], ['toxic']),
    palette: { skin: 0x9f3a48, clothes: 0x5b1f2a, accent: 0xff8a80 },
    role: '血肉汲取者', behavior: '攻击城墙时恢复自身，并治疗周围单位。',
    counter: '火焰压制恢复，寒冰确保它无法接触城墙。', firstSeen: 8, threat: 5,
  }),
} satisfies Record<string, ZombieDefinition>;

interface VariantOptions {
  texture: string;
  role: string;
  element: DamageElement;
  weak: DamageElement[];
  resist?: DamageElement[];
  immune?: DamageElement[];
  hp: number;
  speed: number;
  damage: number;
  coin: number;
  firstSeen: number;
  threat: number;
  palette: { skin: number; clothes: number; accent: number };
  gimmick: string;
  counter: string;
  artTexture?: string;
}

function variant(base: ZombieDefinition, options: VariantOptions): ZombieDefinition {
  return {
    ...base,
    hp: options.hp,
    speed: options.speed,
    damage: options.damage,
    coin: options.coin,
    texture: options.texture,
    element: options.element,
    damageMultipliers: profile(options.weak, options.resist, options.immune),
    palette: options.palette,
    artTexture: options.artTexture,
    role: options.role,
    behavior: `${options.gimmick}；${base.behavior}`,
    counter: options.counter,
    firstSeen: options.firstSeen,
    threat: options.threat,
  };
}

const FIRE = { skin: 0xa8442d, clothes: 0x55251d, accent: 0xffb300 };
const FROST = { skin: 0x76a9b8, clothes: 0x315968, accent: 0xb2ebf2 };
const LIGHTNING = { skin: 0x6d73b8, clothes: 0x30356e, accent: 0xfff176 };
const BLAST = { skin: 0x9a6648, clothes: 0x4d3427, accent: 0xff8a65 };
const TOXIC = { skin: 0x759548, clothes: 0x354728, accent: 0xc6ff00 };
const ENERGY = { skin: 0x8d6aa8, clothes: 0x3f3157, accent: 0xea80fc };
const GRAVITY = { skin: 0x55537f, clothes: 0x23243d, accent: 0xb388ff };
const KINETIC = { skin: 0x818d94, clothes: 0x39434a, accent: 0xffd180 };

const ELEMENTAL_VARIANTS = {
  ember_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_ember_runner', role: '余烬疾行者', element: 'fire', weak: ['frost'], resist: ['explosive'], immune: ['fire'], hp: 30, speed: 132, damage: 6, coin: 11, firstSeen: 11, threat: 3, palette: FIRE, gimmick: '燃烧外壳免疫火焰', counter: '寒冰伤害可造成 1.55 倍伤害并强力减速' }),
  furnace_tank: variant(CORE_ZOMBIES.tank, { texture: 'zombie_furnace_tank', role: '熔炉巨尸', element: 'fire', weak: ['frost', 'toxic'], resist: ['kinetic'], immune: ['fire'], hp: 175, speed: 32, damage: 16, coin: 25, firstSeen: 12, threat: 4, palette: FIRE, gimmick: '熔炉甲壳完全隔绝灼烧', counter: '先冰裂外壳，再用腐蚀扩大伤害' }),
  cinder_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_cinder_spitter', role: '火渣投手', element: 'fire', weak: ['frost', 'energy'], resist: ['explosive'], immune: ['fire'], hp: 44, speed: 46, damage: 11, coin: 18, firstSeen: 13, threat: 4, palette: FIRE, gimmick: '远程喷吐炽热火渣', counter: '寒冰或能量点杀，避免让它持续轰墙' }),
  immolator: variant(CORE_ZOMBIES.exploder, { texture: 'zombie_immolator', role: '焚化自爆体', element: 'fire', weak: ['frost', 'gravity'], resist: ['explosive'], immune: ['fire'], hp: 24, speed: 96, damage: 52, coin: 17, firstSeen: 14, threat: 4, palette: FIRE, gimmick: '靠近时核心升温，死亡引爆', counter: '引力牵制后用寒冰在远处引爆' }),

  frostwalker: variant(CORE_ZOMBIES.normal, { texture: 'zombie_frostwalker', role: '冻土行尸', element: 'frost', weak: ['fire'], resist: ['kinetic'], immune: ['frost'], hp: 54, speed: 52, damage: 7, coin: 12, firstSeen: 15, threat: 3, palette: FROST, gimmick: '冻甲免疫寒冰与减速', counter: '火焰会熔化冻甲并造成 1.55 倍伤害' }),
  rime_guard: variant(CORE_ZOMBIES.shield, { texture: 'zombie_rime_guard', role: '霜盾禁卫', element: 'frost', weak: ['fire', 'lightning'], resist: ['kinetic'], immune: ['frost'], hp: 88, speed: 48, damage: 10, coin: 28, firstSeen: 16, threat: 4, palette: FROST, gimmick: '霜晶护盾免疫寒冰', counter: '雷电破盾后用火焰熔毁本体' }),
  ice_leaper: variant(CORE_ZOMBIES.leaper, { texture: 'zombie_ice_leaper', role: '冰脊跃袭者', element: 'frost', weak: ['fire', 'gravity'], resist: ['kinetic'], immune: ['frost'], hp: 48, speed: 70, damage: 12, coin: 21, firstSeen: 17, threat: 4, palette: FROST, gimmick: '冰脊蓄力后连续跃进', counter: '引力能打断位移，火焰负责快速处决' }),
  cryo_healer: variant(CORE_ZOMBIES.healer, { texture: 'zombie_cryo_healer', role: '低温医师', element: 'frost', weak: ['fire', 'toxic'], resist: ['energy'], immune: ['frost'], hp: 64, speed: 40, damage: 5, coin: 27, firstSeen: 18, threat: 5, palette: FROST, gimmick: '以低温凝胶修复周围尸群', counter: '火焰和腐蚀都能针对其修复装置' }),

  volt_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_volt_runner', role: '伏特奔袭者', element: 'lightning', weak: ['explosive', 'toxic'], resist: ['energy'], immune: ['lightning'], hp: 38, speed: 145, damage: 7, coin: 15, firstSeen: 19, threat: 4, palette: LIGHTNING, gimmick: '雷电免疫并以电容推进', counter: '爆破打断冲锋，腐蚀能短路电容' }),
  storm_conductor: variant(CORE_ZOMBIES.conductor, { texture: 'zombie_storm_conductor', role: '风暴导体', element: 'lightning', weak: ['toxic', 'kinetic'], resist: ['energy'], immune: ['lightning'], hp: 110, speed: 34, damage: 9, coin: 35, firstSeen: 20, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫并强化群体减伤链接', counter: '穿甲动能与腐蚀能绕过导电护层' }),
  arc_jammer: variant(CORE_ZOMBIES.jammer, { texture: 'zombie_arc_jammer', role: '电弧噪声体', element: 'lightning', weak: ['explosive', 'gravity'], resist: ['energy'], immune: ['lightning'], hp: 82, speed: 44, damage: 7, coin: 31, firstSeen: 21, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫且更强地压制炮速', counter: '用爆破或引力技能越过其电磁场' }),
  thunder_tank: variant(CORE_ZOMBIES.tank, { texture: 'zombie_thunder_tank', role: '雷铠巨尸', element: 'lightning', weak: ['toxic', 'explosive'], resist: ['kinetic'], immune: ['lightning'], hp: 210, speed: 35, damage: 18, coin: 32, firstSeen: 22, threat: 5, palette: LIGHTNING, gimmick: '雷铠完全吸收电击', counter: '腐蚀先破甲，随后以爆破完成清场' }),

  powder_keg: variant(CORE_ZOMBIES.exploder, { texture: 'zombie_powder_keg', role: '火药桶尸', element: 'explosive', weak: ['fire', 'frost'], resist: ['kinetic'], immune: ['explosive'], hp: 30, speed: 88, damage: 62, coin: 21, firstSeen: 23, threat: 4, palette: BLAST, gimmick: '爆破免疫，受火焰时极易失稳', counter: '寒冰控制位置，火焰负责提前引爆' }),
  shrapnel_splitter: variant(CORE_ZOMBIES.splitter, { texture: 'zombie_shrapnel_splitter', role: '破片母体', element: 'explosive', weak: ['energy', 'fire'], resist: ['kinetic'], immune: ['explosive'], hp: 72, speed: 43, damage: 8, coin: 24, firstSeen: 24, threat: 4, palette: BLAST, gimmick: '爆破免疫，分裂体携带破片甲', counter: '能量与火焰可在分裂前持续削血' }),
  siege_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_siege_spitter', role: '攻城投弹手', element: 'explosive', weak: ['kinetic', 'lightning'], resist: ['fire'], immune: ['explosive'], hp: 66, speed: 39, damage: 17, coin: 29, firstSeen: 25, threat: 5, palette: BLAST, gimmick: '爆破免疫并远程投射攻城弹', counter: '用穿甲和雷电优先击杀，别让它建立射击阵地' }),
  blast_burrower: variant(CORE_ZOMBIES.burrower, { texture: 'zombie_blast_burrower', role: '爆破掘地者', element: 'explosive', weak: ['frost', 'toxic'], resist: ['kinetic'], immune: ['explosive'], hp: 60, speed: 64, damage: 16, coin: 27, firstSeen: 26, threat: 5, palette: BLAST, gimmick: '爆破免疫，破土时携带震荡核心', counter: '迫使其破土后用寒冰和腐蚀截杀' }),

  plague_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_plague_spitter', role: '瘟疫喷吐者', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost'], immune: ['toxic'], hp: 58, speed: 45, damage: 14, coin: 24, firstSeen: 27, threat: 4, palette: TOXIC, gimmick: '腐蚀免疫并喷吐高浓度疫液', counter: '火焰净化，能量武器负责远程点杀' }),
  bile_healer: variant(CORE_ZOMBIES.healer, { texture: 'zombie_bile_healer', role: '胆汁缝合师', element: 'toxic', weak: ['fire', 'frost'], resist: ['energy'], immune: ['toxic'], hp: 86, speed: 36, damage: 6, coin: 34, firstSeen: 28, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫并强化群体治疗', counter: '火焰压制恢复，寒冰限制其治疗覆盖范围' }),
  rot_summoner: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_rot_summoner', role: '腐巢召唤师', element: 'toxic', weak: ['fire', 'explosive'], resist: ['frost'], immune: ['toxic'], hp: 98, speed: 31, damage: 8, coin: 38, firstSeen: 29, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，持续孵化突袭腐尸', counter: '用火焰和爆破把召唤物连同本体一起清除' }),
  venom_siphon: variant(CORE_ZOMBIES.siphon, { texture: 'zombie_venom_siphon', role: '毒腺汲取者', element: 'toxic', weak: ['fire', 'lightning'], resist: ['frost'], immune: ['toxic'], hp: 105, speed: 42, damage: 15, coin: 37, firstSeen: 30, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，触墙后进行强力群体汲取', counter: '火焰与雷电都能在它接墙前形成高爆发' }),

  phase_ghost: variant(CORE_ZOMBIES.ghost, { texture: 'zombie_phase_ghost', role: '相位幽魂', element: 'energy', weak: ['kinetic', 'fire'], resist: ['gravity'], immune: ['energy'], hp: 42, speed: 84, damage: 9, coin: 23, firstSeen: 31, threat: 4, palette: ENERGY, gimmick: '能量免疫，隐身周期更难预测', counter: '动能主炮与灼烧能在现身窗口造成有效伤害' }),
  prism_shield: variant(CORE_ZOMBIES.shield, { texture: 'zombie_prism_shield', role: '棱镜护卫', element: 'energy', weak: ['kinetic', 'lightning'], resist: ['fire'], immune: ['energy'], hp: 105, speed: 50, damage: 12, coin: 36, firstSeen: 32, threat: 5, palette: ENERGY, gimmick: '能量免疫，棱镜盾会偏转光束', counter: '用动能穿甲和雷电过载护盾' }),
  pulse_jammer: variant(CORE_ZOMBIES.jammer, { texture: 'zombie_pulse_jammer', role: '脉冲压制者', element: 'energy', weak: ['kinetic', 'toxic'], resist: ['lightning'], immune: ['energy'], hp: 96, speed: 37, damage: 8, coin: 39, firstSeen: 33, threat: 5, palette: ENERGY, gimmick: '能量免疫并周期压制炮台', counter: '穿甲主炮和腐蚀载荷不受脉冲干扰' }),
  laser_berserker: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_laser_berserker', role: '光灼狂尸', element: 'energy', weak: ['kinetic', 'explosive'], resist: ['fire'], immune: ['energy'], hp: 88, speed: 46, damage: 15, coin: 32, firstSeen: 34, threat: 5, palette: ENERGY, gimmick: '能量免疫，残血时核心过载加速', counter: '动能处决或爆破连击，不要依赖激光' }),

  void_burrower: variant(CORE_ZOMBIES.burrower, { texture: 'zombie_void_burrower', role: '虚空掘行者', element: 'gravity', weak: ['energy', 'explosive'], resist: ['kinetic'], immune: ['gravity'], hp: 76, speed: 68, damage: 17, coin: 34, firstSeen: 35, threat: 5, palette: GRAVITY, gimmick: '引力免疫，以短距折跃模拟潜地', counter: '能量和爆破在其现身时最有效' }),
  mass_tank: variant(CORE_ZOMBIES.tank, { texture: 'zombie_mass_tank', role: '超重巨尸', element: 'gravity', weak: ['energy', 'toxic'], resist: ['kinetic', 'explosive'], immune: ['gravity'], hp: 260, speed: 27, damage: 22, coin: 43, firstSeen: 36, threat: 5, palette: GRAVITY, gimmick: '引力免疫且质量装甲抵抗动能与爆破', counter: '使用能量和腐蚀，避免把弹药浪费在厚甲上' }),
  singularity_summoner: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_singularity_summoner', role: '奇点祭司', element: 'gravity', weak: ['energy', 'lightning'], resist: ['explosive'], immune: ['gravity'], hp: 118, speed: 29, damage: 10, coin: 45, firstSeen: 37, threat: 5, palette: GRAVITY, gimmick: '引力免疫，通过微型奇点召唤援军', counter: '能量与雷电能击穿奇点护层并快速点杀' }),
  orbit_leaper: variant(CORE_ZOMBIES.leaper, { texture: 'zombie_orbit_leaper', role: '轨道跃迁者', element: 'gravity', weak: ['energy', 'frost'], resist: ['kinetic'], immune: ['gravity'], hp: 68, speed: 75, damage: 16, coin: 31, firstSeen: 38, threat: 5, palette: GRAVITY, gimmick: '引力免疫，以弧形跃迁越过火力线', counter: '能量伤害配合寒冰控制可以稳定截杀' }),

  riot_guard: variant(CORE_ZOMBIES.tank, { texture: 'zombie_riot_guard', role: '防暴铁卫', element: 'kinetic', weak: ['explosive', 'toxic'], resist: ['frost', 'fire'], immune: ['kinetic'], hp: 235, speed: 31, damage: 20, coin: 39, firstSeen: 39, threat: 5, palette: KINETIC, gimmick: '正面装甲免疫动能', counter: '爆破与腐蚀可以绕过防暴甲板' }),
  blade_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_blade_runner', role: '刃足奔袭者', element: 'kinetic', weak: ['frost', 'lightning'], resist: ['fire'], immune: ['kinetic'], hp: 52, speed: 154, damage: 10, coin: 23, firstSeen: 40, threat: 5, palette: KINETIC, gimmick: '动能免疫，刃足提供极高冲刺速度', counter: '寒冰限制位移，雷电负责快速连锁清除' }),
  iron_splitter: variant(CORE_ZOMBIES.splitter, { texture: 'zombie_iron_splitter', role: '铁壳裂殖体', element: 'kinetic', weak: ['explosive', 'fire'], resist: ['frost'], immune: ['kinetic'], hp: 96, speed: 39, damage: 10, coin: 32, firstSeen: 41, threat: 5, palette: KINETIC, gimmick: '动能免疫，铁壳分裂后仍会占用火力', counter: '火焰与爆破可同时处理母体和分裂物' }),
  breacher: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_breacher', role: '攻城破门者', element: 'kinetic', weak: ['explosive', 'gravity'], resist: ['fire'], immune: ['kinetic'], hp: 128, speed: 38, damage: 24, coin: 41, firstSeen: 42, threat: 5, palette: KINETIC, gimmick: '动能免疫，残血后发动攻城冲锋', counter: '爆破削血并用引力阻止它接触高墙' }),
} satisfies Record<string, ZombieDefinition>;

// 深渊变体（第 5~7 章）：元素亲和更进一步，数值全面强化
const ABYSSAL_VARIANTS = {
  cinder_berserker: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_cinder_berserker', role: '焚灰狂徒', element: 'fire', weak: ['frost', 'energy'], resist: ['explosive'], immune: ['fire'], hp: 120, speed: 44, damage: 18, coin: 30, firstSeen: 43, threat: 4, palette: FIRE, gimmick: '火焰免疫，残血时体表爆燃', counter: '寒冰压制后用能量武器处决' }),
  rime_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_rime_runner', role: '霜棱疾行者', element: 'frost', weak: ['fire'], resist: ['kinetic'], immune: ['frost'], hp: 55, speed: 138, damage: 10, coin: 20, firstSeen: 44, threat: 4, palette: FROST, gimmick: '寒冰免疫，冰棱足刃踏地无声', counter: '火焰是唯一能熔化其足刃的手段' }),
  ash_summoner: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_ash_summoner', role: '灰烬唤灵者', element: 'fire', weak: ['energy', 'lightning'], resist: ['explosive'], immune: ['fire'], hp: 150, speed: 30, damage: 12, coin: 42, firstSeen: 45, threat: 5, palette: FIRE, gimmick: '火焰免疫，从余烬中唤出冲锋腐尸', counter: '能量与雷电可穿透灰烬护层点杀' }),
  glacier_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_glacier_spitter', role: '冰瀑投射者', element: 'frost', weak: ['fire', 'energy'], resist: ['kinetic'], immune: ['frost'], hp: 80, speed: 42, damage: 16, coin: 26, firstSeen: 46, threat: 4, palette: FROST, gimmick: '寒冰免疫，远程投掷尖锐冰瀑', counter: '火焰熔冰或能量点杀，别让它架好阵地' }),
  ember_ghost: variant(CORE_ZOMBIES.ghost, { texture: 'zombie_ember_ghost', role: '余烬怨灵', element: 'fire', weak: ['kinetic', 'energy'], resist: ['gravity'], immune: ['fire'], hp: 62, speed: 82, damage: 13, coin: 28, firstSeen: 47, threat: 4, palette: FIRE, gimmick: '火焰免疫，隐身周期随体温紊乱', counter: '现身窗口用动能与能量集中输出' }),
  permafrost_colossus: variant(CORE_ZOMBIES.tank, { texture: 'zombie_permafrost_colossus', role: '永冻巨兽', element: 'frost', weak: ['fire', 'toxic'], resist: ['kinetic', 'explosive'], immune: ['frost'], hp: 320, speed: 26, damage: 24, coin: 48, firstSeen: 48, threat: 5, palette: FROST, gimmick: '寒冰免疫，永冻甲壳厚重异常', counter: '持续灼烧与腐蚀才能磨穿冻壳' }),
  magma_siphon: variant(CORE_ZOMBIES.siphon, { texture: 'zombie_magma_siphon', role: '熔岩汲取者', element: 'fire', weak: ['frost', 'lightning'], resist: ['toxic'], immune: ['fire'], hp: 145, speed: 40, damage: 19, coin: 40, firstSeen: 49, threat: 5, palette: FIRE, gimmick: '火焰免疫，触墙时抽取热量群体回复', counter: '寒冰与雷电在它接墙前将其截杀' }),
  frost_splitter: variant(CORE_ZOMBIES.splitter, { texture: 'zombie_frost_splitter', role: '碎冰母体', element: 'frost', weak: ['fire', 'explosive'], resist: ['kinetic'], immune: ['frost'], hp: 105, speed: 44, damage: 10, coin: 27, firstSeen: 50, threat: 4, palette: FROST, gimmick: '寒冰免疫，碎裂的冰壳仍会冲锋', counter: '火焰与爆破一并清理母体与碎冰' }),

  volt_shambler: variant(CORE_ZOMBIES.normal, { texture: 'zombie_volt_shambler', role: '电磁行尸', element: 'lightning', weak: ['explosive', 'toxic'], resist: ['energy'], immune: ['lightning'], hp: 95, speed: 58, damage: 12, coin: 22, firstSeen: 51, threat: 4, palette: LIGHTNING, gimmick: '雷电免疫，体表电弧随步伐跳动', counter: '爆破与腐蚀不依赖导电即可生效' }),
  detonator_colossus: variant(CORE_ZOMBIES.tank, { texture: 'zombie_detonator_colossus', role: '爆轰巨尸', element: 'explosive', weak: ['fire', 'frost'], resist: ['kinetic'], immune: ['explosive'], hp: 340, speed: 27, damage: 26, coin: 50, firstSeen: 52, threat: 5, palette: BLAST, gimmick: '爆破免疫，体内弹药随受击闷响', counter: '火焰引燃或寒冰控住再集火' }),
  storm_mender: variant(CORE_ZOMBIES.healer, { texture: 'zombie_storm_mender', role: '风暴医师', element: 'lightning', weak: ['toxic', 'kinetic'], resist: ['energy'], immune: ['lightning'], hp: 115, speed: 36, damage: 9, coin: 38, firstSeen: 53, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，以电弧缝合周围尸群', counter: '腐蚀与穿甲弹优先切断其治疗线' }),
  detonating_berserker: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_detonating_berserker', role: '燃爆狂徒', element: 'explosive', weak: ['frost', 'energy'], resist: ['fire'], immune: ['explosive'], hp: 130, speed: 46, damage: 20, coin: 33, firstSeen: 54, threat: 5, palette: BLAST, gimmick: '爆破免疫，濒死时核心剧烈升温', counter: '寒冰处决，切勿用爆炸收尾' }),
  arc_wraith: variant(CORE_ZOMBIES.ghost, { texture: 'zombie_arc_wraith', role: '电弧怨灵', element: 'lightning', weak: ['kinetic', 'fire'], resist: ['gravity'], immune: ['lightning'], hp: 70, speed: 88, damage: 14, coin: 30, firstSeen: 55, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，以电弧闪烁伪装隐身节奏', counter: '动能主炮与灼烧覆盖其现身窗口' }),
  blastcaller: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_blastcaller', role: '爆轰召唤师', element: 'explosive', weak: ['energy', 'kinetic'], resist: ['fire'], immune: ['explosive'], hp: 165, speed: 29, damage: 13, coin: 44, firstSeen: 56, threat: 5, palette: BLAST, gimmick: '爆破免疫，召唤物同样携带不稳定核心', counter: '能量点杀本体，别让召唤物贴墙' }),
  surge_burrower: variant(CORE_ZOMBIES.burrower, { texture: 'zombie_surge_burrower', role: '电涌掘地者', element: 'lightning', weak: ['explosive', 'frost'], resist: ['energy'], immune: ['lightning'], hp: 92, speed: 66, damage: 18, coin: 32, firstSeen: 57, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，破土瞬间释放环形电涌', counter: '地雷逼出后立即寒冰控制' }),
  blastguard: variant(CORE_ZOMBIES.shield, { texture: 'zombie_blastguard', role: '震爆卫士', element: 'explosive', weak: ['lightning', 'energy'], resist: ['kinetic'], immune: ['explosive'], hp: 150, speed: 44, damage: 15, coin: 36, firstSeen: 58, threat: 5, palette: BLAST, gimmick: '爆破免疫，震荡盾会吸收冲击波', counter: '雷电与能量过载其震荡护盾' }),

  plague_shambler: variant(CORE_ZOMBIES.normal, { texture: 'zombie_plague_shambler', role: '疫病行尸', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost'], immune: ['toxic'], hp: 105, speed: 54, damage: 13, coin: 24, firstSeen: 59, threat: 4, palette: TOXIC, gimmick: '腐蚀免疫，溃烂体液滴落路面', counter: '火焰净化或能量快速贯穿' }),
  plasma_shambler: variant(CORE_ZOMBIES.normal, { texture: 'zombie_plasma_shambler', role: '等离子行尸', element: 'energy', weak: ['kinetic', 'explosive'], resist: ['fire'], immune: ['energy'], hp: 110, speed: 56, damage: 14, coin: 25, firstSeen: 60, threat: 4, palette: ENERGY, gimmick: '能量免疫，体表游离高温等离子体', counter: '动能穿甲与爆破最为有效' }),
  venom_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_venom_runner', role: '毒液奔袭者', element: 'toxic', weak: ['fire', 'lightning'], resist: ['kinetic'], immune: ['toxic'], hp: 62, speed: 135, damage: 11, coin: 22, firstSeen: 61, threat: 4, palette: TOXIC, gimmick: '腐蚀免疫，尾迹残留剧毒黏液', counter: '火焰与雷电在半路将其拦截' }),
  photon_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_photon_runner', role: '光子奔袭者', element: 'energy', weak: ['kinetic', 'frost'], resist: ['lightning'], immune: ['energy'], hp: 66, speed: 148, damage: 12, coin: 24, firstSeen: 62, threat: 4, palette: ENERGY, gimmick: '能量免疫，冲刺时留下一道残影', counter: '动能点射或寒冰减速截停' }),
  toxic_leaper: variant(CORE_ZOMBIES.leaper, { texture: 'zombie_toxic_leaper', role: '剧毒跃袭者', element: 'toxic', weak: ['fire', 'gravity'], resist: ['frost'], immune: ['toxic'], hp: 88, speed: 68, damage: 16, coin: 29, firstSeen: 63, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，跃袭时喷洒毒雾', counter: '引力牵引打断跃袭节奏再灼烧' }),
  energy_colossus: variant(CORE_ZOMBIES.tank, { texture: 'zombie_energy_colossus', role: '能量巨像', element: 'energy', weak: ['kinetic', 'toxic'], resist: ['lightning'], immune: ['energy'], hp: 360, speed: 26, damage: 27, coin: 52, firstSeen: 64, threat: 5, palette: ENERGY, gimmick: '能量免疫，力场外壳折射光束', counter: '穿甲主炮与腐蚀持续侵蚀力场' }),
  miasma_conductor: variant(CORE_ZOMBIES.conductor, { texture: 'zombie_miasma_conductor', role: '瘴气导体', element: 'toxic', weak: ['fire', 'kinetic'], resist: ['frost'], immune: ['toxic'], hp: 150, speed: 33, damage: 12, coin: 42, firstSeen: 65, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，瘴气链路减免群体伤害', counter: '先以火焰烧断瘴气链再清场' }),
  nexus_summoner: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_nexus_summoner', role: '节点召唤师', element: 'energy', weak: ['fire', 'explosive'], resist: ['gravity'], immune: ['energy'], hp: 175, speed: 28, damage: 14, coin: 46, firstSeen: 66, threat: 5, palette: ENERGY, gimmick: '能量免疫，通过光矩节点投送援军', counter: '火焰与爆破覆盖其召唤落点' }),

  void_shambler: variant(CORE_ZOMBIES.normal, { texture: 'zombie_void_shambler', role: '虚空行尸', element: 'gravity', weak: ['energy', 'fire'], resist: ['kinetic'], immune: ['gravity'], hp: 115, speed: 55, damage: 15, coin: 26, firstSeen: 67, threat: 4, palette: GRAVITY, gimmick: '引力免疫，轮廓在引力褶皱里晃动', counter: '能量与火焰在其显形时最有效' }),
  steel_shambler: variant(CORE_ZOMBIES.normal, { texture: 'zombie_steel_shambler', role: '钢铁行尸', element: 'kinetic', weak: ['explosive', 'toxic'], resist: ['fire'], immune: ['kinetic'], hp: 125, speed: 52, damage: 16, coin: 27, firstSeen: 68, threat: 4, palette: KINETIC, gimmick: '动能免疫，全身铆接回收钢板', counter: '爆破与腐蚀是唯一高效的拆除手段' }),
  warp_runner: variant(CORE_ZOMBIES.fast, { texture: 'zombie_warp_runner', role: '曲率奔袭者', element: 'gravity', weak: ['energy', 'frost'], resist: ['explosive'], immune: ['gravity'], hp: 70, speed: 142, damage: 13, coin: 25, firstSeen: 69, threat: 4, palette: GRAVITY, gimmick: '引力免疫，短距折跃贴近防线', counter: '能量与寒冰封锁折跃路径' }),
  railgun_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_railgun_spitter', role: '磁轨投射者', element: 'kinetic', weak: ['lightning', 'fire'], resist: ['frost'], immune: ['kinetic'], hp: 100, speed: 38, damage: 21, coin: 35, firstSeen: 70, threat: 5, palette: KINETIC, gimmick: '动能免疫，以磁轨加速投射钢钉', counter: '雷电瘫痪磁轨，火焰完成熔毁' }),
  collapse_spitter: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_collapse_spitter', role: '坍缩投射者', element: 'gravity', weak: ['energy', 'lightning'], resist: ['kinetic'], immune: ['gravity'], hp: 95, speed: 40, damage: 19, coin: 34, firstSeen: 71, threat: 5, palette: GRAVITY, gimmick: '引力免疫，投掷微型坍缩核心', counter: '能量与雷电在其蓄力前点杀' }),
  warband_mender: variant(CORE_ZOMBIES.healer, { texture: 'zombie_warband_mender', role: '战团医师', element: 'kinetic', weak: ['fire', 'toxic'], resist: ['frost'], immune: ['kinetic'], hp: 135, speed: 35, damage: 11, coin: 41, firstSeen: 71, threat: 5, palette: KINETIC, gimmick: '动能免疫，以战地器械缝合重甲单位', counter: '火焰与腐蚀绕过其装甲维修' }),
  singularity_mender: variant(CORE_ZOMBIES.healer, { texture: 'zombie_singularity_mender', role: '奇点修复师', element: 'gravity', weak: ['energy', 'lightning'], resist: ['kinetic'], immune: ['gravity'], hp: 130, speed: 34, damage: 10, coin: 40, firstSeen: 72, threat: 5, palette: GRAVITY, gimmick: '引力免疫，以奇点缝合尸群伤口', counter: '能量与雷电快速锁定本体' }),
  piston_leaper: variant(CORE_ZOMBIES.leaper, { texture: 'zombie_piston_leaper', role: '活塞跃袭者', element: 'kinetic', weak: ['frost', 'explosive'], resist: ['fire'], immune: ['kinetic'], hp: 95, speed: 72, damage: 18, coin: 31, firstSeen: 72, threat: 5, palette: KINETIC, gimmick: '动能免疫，液压活塞提供恐怖爆发', counter: '寒冰冻结活塞，爆破终结跃袭' }),
} satisfies Record<string, ZombieDefinition>;

// 梦魇变体（第 8~10 章）：终局敌群，各行为原型的极限强化形态
const NIGHTMARE_VARIANTS = {
  nightmare_vanguard: variant(CORE_ZOMBIES.normal, { texture: 'zombie_nightmare_vanguard', role: '梦魇先锋', element: 'kinetic', weak: ['explosive', 'toxic'], resist: ['fire', 'frost'], immune: ['kinetic'], hp: 190, speed: 60, damage: 20, coin: 34, firstSeen: 73, threat: 5, palette: KINETIC, gimmick: '动能免疫，梦魇合金全面包覆', counter: '爆破与腐蚀是唯一答案' }),
  nightmare_stalker: variant(CORE_ZOMBIES.fast, { texture: 'zombie_nightmare_stalker', role: '梦魇猎手', element: 'kinetic', weak: ['frost', 'lightning'], resist: ['fire'], immune: ['kinetic'], hp: 105, speed: 158, damage: 16, coin: 32, firstSeen: 74, threat: 5, palette: KINETIC, gimmick: '动能免疫，刃足在黑暗中留下残影', counter: '寒冰减速后以雷电链清除' }),
  nightmare_colossus: variant(CORE_ZOMBIES.tank, { texture: 'zombie_nightmare_colossus', role: '梦魇巨像', element: 'gravity', weak: ['energy', 'toxic'], resist: ['kinetic', 'explosive'], immune: ['gravity'], hp: 520, speed: 24, damage: 34, coin: 66, firstSeen: 76, threat: 5, palette: GRAVITY, gimmick: '引力免疫，质量核心扭曲周围弹道', counter: '能量束与腐蚀持续输出才能撼动' }),
  nightmare_berserker: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_nightmare_berserker', role: '梦魇狂徒', element: 'fire', weak: ['frost', 'energy'], resist: ['explosive'], immune: ['fire'], hp: 210, speed: 50, damage: 26, coin: 42, firstSeen: 78, threat: 5, palette: FIRE, gimmick: '火焰免疫，残血时进入爆燃冲锋', counter: '寒冰处决窗口极短，务必留手' }),
  nightmare_mender: variant(CORE_ZOMBIES.healer, { texture: 'zombie_nightmare_mender', role: '梦魇缝合师', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost'], immune: ['toxic'], hp: 220, speed: 32, damage: 14, coin: 52, firstSeen: 80, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，缝合线能拉起濒死单位', counter: '火焰与能量必须先于治疗生效' }),
  nightmare_conjurer: variant(CORE_ZOMBIES.summoner, { texture: 'zombie_nightmare_conjurer', role: '梦魇唤魔师', element: 'gravity', weak: ['energy', 'lightning'], resist: ['explosive'], immune: ['gravity'], hp: 260, speed: 27, damage: 18, coin: 58, firstSeen: 82, threat: 5, palette: GRAVITY, gimmick: '引力免疫，持续撕开虚空裂隙增援', counter: '能量与雷电抢在裂隙成型前点杀' }),
  nightmare_warden: variant(CORE_ZOMBIES.shield, { texture: 'zombie_nightmare_warden', role: '梦魇棱镜卫士', element: 'energy', weak: ['kinetic', 'lightning'], resist: ['fire'], immune: ['energy'], hp: 240, speed: 46, damage: 20, coin: 46, firstSeen: 84, threat: 5, palette: ENERGY, gimmick: '能量免疫，棱镜护罩折射一切光束', counter: '动能穿甲与雷电过载双管齐下' }),
  nightmare_wraith: variant(CORE_ZOMBIES.ghost, { texture: 'zombie_nightmare_wraith', role: '梦魇怨灵', element: 'energy', weak: ['kinetic', 'fire'], resist: ['gravity'], immune: ['energy'], hp: 120, speed: 92, damage: 18, coin: 38, firstSeen: 85, threat: 5, palette: ENERGY, gimmick: '能量免疫，相位周期几乎无法预判', counter: '灼烧能跨越相位持续生效' }),
  nightmare_spewer: variant(CORE_ZOMBIES.spitter, { texture: 'zombie_nightmare_spewer', role: '梦魇喷吐者', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost'], immune: ['toxic'], hp: 160, speed: 38, damage: 26, coin: 44, firstSeen: 86, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，高压疫液能贯穿掩体', counter: '火焰净化并以能量远程清除' }),
  nightmare_conductor: variant(CORE_ZOMBIES.conductor, { texture: 'zombie_nightmare_conductor', role: '梦魇导体', element: 'lightning', weak: ['toxic', 'kinetic'], resist: ['energy'], immune: ['lightning'], hp: 250, speed: 32, damage: 16, coin: 56, firstSeen: 88, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，梦魇链路大幅减免群伤', counter: '腐蚀与穿甲先斩断链路' }),
  nightmare_suppressor: variant(CORE_ZOMBIES.jammer, { texture: 'zombie_nightmare_suppressor', role: '梦魇压制者', element: 'lightning', weak: ['explosive', 'gravity'], resist: ['energy'], immune: ['lightning'], hp: 200, speed: 40, damage: 13, coin: 50, firstSeen: 89, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，压制场使炮台几近停摆', counter: '爆破与引力技能不受电磁干扰' }),
  nightmare_digger: variant(CORE_ZOMBIES.burrower, { texture: 'zombie_nightmare_digger', role: '梦魇掘地者', element: 'explosive', weak: ['frost', 'toxic'], resist: ['kinetic'], immune: ['explosive'], hp: 170, speed: 70, damage: 24, coin: 44, firstSeen: 90, threat: 5, palette: BLAST, gimmick: '爆破免疫，破土时掀起震荡冲击', counter: '地雷逼出后寒冰接腐蚀截杀' }),
  nightmare_leaper: variant(CORE_ZOMBIES.leaper, { texture: 'zombie_nightmare_leaper', role: '梦魇跃迁者', element: 'frost', weak: ['fire', 'gravity'], resist: ['kinetic'], immune: ['frost'], hp: 150, speed: 78, damage: 22, coin: 40, firstSeen: 91, threat: 5, palette: FROST, gimmick: '寒冰免疫，跃迁轨迹无视减速带', counter: '引力牵引能打断跃迁落点' }),
  nightmare_broodmother: variant(CORE_ZOMBIES.splitter, { texture: 'zombie_nightmare_broodmother', role: '梦魇母体', element: 'toxic', weak: ['fire', 'explosive'], resist: ['frost'], immune: ['toxic'], hp: 230, speed: 40, damage: 15, coin: 48, firstSeen: 92, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，分裂出的幼体更具威胁', counter: '火焰与爆破一次带走整窝' }),
  nightmare_devourer: variant(CORE_ZOMBIES.siphon, { texture: 'zombie_nightmare_devourer', role: '梦魇吞噬者', element: 'fire', weak: ['frost', 'lightning'], resist: ['toxic'], immune: ['fire'], hp: 245, speed: 42, damage: 25, coin: 54, firstSeen: 93, threat: 5, palette: FIRE, gimmick: '火焰免疫，接墙后抽取整条防线热量', counter: '寒冰与雷电绝不能让它触墙' }),
  nightmare_detonator: variant(CORE_ZOMBIES.exploder, { texture: 'zombie_nightmare_detonator', role: '梦魇自爆体', element: 'explosive', weak: ['frost', 'kinetic'], resist: ['fire'], immune: ['explosive'], hp: 90, speed: 98, damage: 75, coin: 36, firstSeen: 94, threat: 5, palette: BLAST, gimmick: '爆破免疫，核心当量远超常规自爆兵', counter: '寒冰远端冻结后单点引爆' }),
  nightmare_crusher: variant(CORE_ZOMBIES.berserker, { texture: 'zombie_nightmare_crusher', role: '梦魇粉碎者', element: 'kinetic', weak: ['explosive', 'gravity'], resist: ['fire'], immune: ['kinetic'], hp: 280, speed: 36, damage: 32, coin: 60, firstSeen: 96, threat: 5, palette: KINETIC, gimmick: '动能免疫，双拳能撼动整段城墙', counter: '爆破削血并用引力拖住步伐' }),
} satisfies Record<string, ZombieDefinition>;

const BOSS_VARIANTS = {
  boss_inferno: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_inferno', artTexture: 'art_zombie_boss_inferno_v2', role: '熔冠暴君', element: 'fire', weak: ['frost', 'toxic'], resist: ['explosive', 'kinetic'], immune: ['fire'], hp: 1250, speed: 27, damage: 36, coin: 145, firstSeen: 10, threat: 5, palette: FIRE, gimmick: '火焰免疫，半血后熔冠全面过载', counter: '用寒冰控速并叠加腐蚀，切勿依赖灼烧' }),
  boss_glacier: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_glacier', artTexture: 'art_zombie_boss_glacier_v2', role: '永冻母皇', element: 'frost', weak: ['fire', 'lightning'], resist: ['kinetic', 'energy'], immune: ['frost'], hp: 1450, speed: 24, damage: 38, coin: 165, firstSeen: 15, threat: 5, palette: FROST, gimmick: '寒冰免疫，永冻甲壳压低爆发窗口', counter: '火焰持续熔甲，雷电负责清理护卫' }),
  boss_tempest: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_tempest', artTexture: 'art_zombie_boss_tempest_v2', role: '雷暴主教', element: 'lightning', weak: ['explosive', 'toxic'], resist: ['energy'], immune: ['lightning'], hp: 1600, speed: 30, damage: 42, coin: 185, firstSeen: 20, threat: 5, palette: LIGHTNING, gimmick: '雷电免疫，半血后以电磁压制炮速', counter: '爆破与腐蚀不会被导电圣甲吸收' }),
  boss_plague: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_plague', artTexture: 'art_zombie_boss_plague_v2', role: '疫医缝合王', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost'], immune: ['toxic'], hp: 1780, speed: 25, damage: 45, coin: 210, firstSeen: 25, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，召唤并持续修复疫群', counter: '火焰压制恢复，能量爆发锁定本体' }),
  boss_void: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_void', artTexture: 'art_zombie_boss_void_v2', role: '虚空典狱长', element: 'gravity', weak: ['energy', 'lightning'], resist: ['kinetic', 'explosive'], immune: ['gravity'], hp: 2050, speed: 22, damage: 50, coin: 250, firstSeen: 30, threat: 5, palette: GRAVITY, gimmick: '引力免疫，半血后持续召来高阶护卫', counter: '使用能量与雷电构筑，保留过载清除护卫' }),
  boss_monarch: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_monarch', role: '钢铁君主', element: 'kinetic', weak: ['explosive', 'toxic'], resist: ['fire', 'frost'], immune: ['kinetic'], hp: 2300, speed: 26, damage: 54, coin: 280, firstSeen: 35, threat: 5, palette: KINETIC, gimmick: '动能免疫，半血后启动攻城冲撞程序', counter: '爆破与腐蚀才能撼动君主重甲' }),
  boss_solar: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_solar', role: '灼阳暴君', element: 'fire', weak: ['frost', 'toxic'], resist: ['explosive', 'energy'], immune: ['fire'], hp: 2600, speed: 27, damage: 58, coin: 320, firstSeen: 45, threat: 5, palette: FIRE, gimmick: '火焰免疫，半血后日冕全面点燃战场', counter: '寒冰持续压制并以腐蚀扩大伤口' }),
  boss_abyss: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_abyss', role: '渊狱霸主', element: 'gravity', weak: ['energy', 'lightning'], resist: ['kinetic', 'explosive'], immune: ['gravity'], hp: 2950, speed: 23, damage: 62, coin: 360, firstSeen: 55, threat: 5, palette: GRAVITY, gimmick: '引力免疫，半血后深渊裂隙持续增兵', counter: '能量与雷电穿透裂隙直击本体' }),
  boss_blight: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_blight', role: '腐化大帝', element: 'toxic', weak: ['fire', 'energy'], resist: ['frost', 'kinetic'], immune: ['toxic'], hp: 3300, speed: 25, damage: 66, coin: 400, firstSeen: 65, threat: 5, palette: TOXIC, gimmick: '腐蚀免疫，半血后疫雾覆盖整条战线', counter: '火焰净化疫雾，能量锁定心脏' }),
  boss_radiant: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_radiant', role: '辉光至尊', element: 'energy', weak: ['kinetic', 'explosive'], resist: ['lightning', 'gravity'], immune: ['energy'], hp: 3700, speed: 28, damage: 70, coin: 450, firstSeen: 75, threat: 5, palette: ENERGY, gimmick: '能量免疫，半血后辉光阵列折射所有光束', counter: '动能穿甲与爆破轰开辉光护层' }),
  boss_omega: variant(CORE_ZOMBIES.boss, { texture: 'zombie_boss_omega', role: '终焉核心', element: 'explosive', weak: ['frost', 'gravity'], resist: ['fire', 'kinetic'], immune: ['explosive'], hp: 4200, speed: 24, damage: 76, coin: 520, firstSeen: 85, threat: 5, palette: BLAST, gimmick: '爆破免疫，半血后核心进入临界脉冲倒计时', counter: '寒冰与引力是抑制临界的关键' }),
} satisfies Record<string, ZombieDefinition>;

export const ZOMBIE_DEFINITIONS = {
  ...CORE_ZOMBIES,
  ...ELEMENTAL_VARIANTS,
  ...ABYSSAL_VARIANTS,
  ...NIGHTMARE_VARIANTS,
  ...BOSS_VARIANTS,
} satisfies Record<string, ZombieDefinition>;

export type ZombieTypeKey = keyof typeof ZOMBIE_DEFINITIONS;

export const ZOMBIE_TYPES = ZOMBIE_DEFINITIONS as Record<ZombieTypeKey, ZombieStats>;

const describe = (multipliers: Partial<Record<DamageElement, number>>, predicate: (value: number) => boolean): string[] =>
  (Object.entries(multipliers) as [DamageElement, number][])
    .filter(([, value]) => predicate(value))
    .map(([element, value]) => value === 0
      ? DAMAGE_ELEMENTS[element].name
      : `${DAMAGE_ELEMENTS[element].name} ×${value.toFixed(2)}`);

export const ZOMBIE_CODEX = Object.fromEntries(
  (Object.entries(ZOMBIE_DEFINITIONS) as [ZombieTypeKey, ZombieDefinition][]).map(([key, definition]) => [
    key,
    {
      role: definition.role,
      behavior: definition.behavior,
      weaknesses: describe(definition.damageMultipliers, (value) => value > 1),
      resistances: describe(definition.damageMultipliers, (value) => value > 0 && value < 1),
      immunities: describe(definition.damageMultipliers, (value) => value === 0),
      counter: definition.counter,
      firstSeen: definition.firstSeen,
      threat: definition.threat,
    },
  ]),
) as Record<ZombieTypeKey, ZombieCodex>;

export const BOSS_ZOMBIE_TYPES = (Object.keys(ZOMBIE_DEFINITIONS) as ZombieTypeKey[])
  .filter((key) => ZOMBIE_DEFINITIONS[key].archetype === 'boss');

const STANDARD_ZOMBIE_TYPES = (Object.keys(ZOMBIE_DEFINITIONS) as ZombieTypeKey[])
  .filter((key) => ZOMBIE_DEFINITIONS[key].archetype !== 'boss');

export function getUnlockedZombieTypes(levelId: number): ZombieTypeKey[] {
  return STANDARD_ZOMBIE_TYPES.filter((key) => ZOMBIE_CODEX[key].firstSeen <= levelId);
}

export const RANGED_ZOMBIE_BEHAVIORS = new Set<ZombieBehaviorKey>(['spitter']);
