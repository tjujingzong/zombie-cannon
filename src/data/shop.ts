export type ArmoryItemKind = 'background' | 'decor' | 'support';

export interface ArmoryItemDef {
  key: string;
  name: string;
  desc: string;
  cost: number;
  kind: ArmoryItemKind;
  icon: string;
}

export const ARMORY_ITEMS: ArmoryItemDef[] = [
  {
    key: 'bg_embers', name: '余烬荒原', desc: '切换为炽热废土战场背景。',
    cost: 450, kind: 'background', icon: 'icon_bg_embers',
  },
  {
    key: 'bg_neon', name: '霓虹废城', desc: '切换为冷色霓虹战场背景。',
    cost: 700, kind: 'background', icon: 'icon_bg_neon',
  },
  {
    key: 'bg_aurora', name: '极光冻原', desc: '切换为冰蓝极光与冻土战场。',
    cost: 920, kind: 'background', icon: 'icon_bg_aurora',
  },
  {
    key: 'bg_eclipse', name: '虚空日蚀', desc: '切换为紫黑日蚀与重力裂隙战场。',
    cost: 1180, kind: 'background', icon: 'icon_bg_eclipse',
  },
  {
    key: 'decor_floodlights', name: '防线探照灯', desc: '在基地两侧安装动态探照灯。',
    cost: 380, kind: 'decor', icon: 'icon_floodlight',
  },
  {
    key: 'decor_banners', name: '猎尸战旗', desc: '在城墙两侧竖起随风摆动的猎尸战旗。',
    cost: 560, kind: 'decor', icon: 'icon_banners',
  },
  {
    key: 'decor_radar', name: '战术雷达', desc: '在基地部署旋转扫描阵列与脉冲光环。',
    cost: 760, kind: 'decor', icon: 'icon_radar',
  },
  {
    key: 'decor_memorial', name: '末日纪念碑', desc: '点亮防线中央的胜利纪念碑与长明火。',
    cost: 980, kind: 'decor', icon: 'icon_memorial',
  },
  {
    key: 'support_sentry', name: '哨戒机炮', desc: '快速点射最接近防线的敌人。',
    cost: 900, kind: 'support', icon: 'icon_support_sentry',
  },
  {
    key: 'support_tesla', name: '特斯拉塔', desc: '周期释放三段跳跃电弧。',
    cost: 1350, kind: 'support', icon: 'icon_support_tesla',
  },
  {
    key: 'support_mortar', name: '迫击炮阵地', desc: '周期轰炸僵尸最密集区域。',
    cost: 1800, kind: 'support', icon: 'icon_support_mortar',
  },
  {
    key: 'support_cryo', name: '寒潮发生器', desc: '周期冻结近墙尸群，并造成寒冰伤害。',
    cost: 2050, kind: 'support', icon: 'icon_support_cryo',
  },
  {
    key: 'support_plasma', name: '等离子长矛', desc: '蓄能后贯穿高耐久目标，造成能量重击。',
    cost: 2380, kind: 'support', icon: 'icon_support_plasma',
  },
  {
    key: 'support_drones', name: '猎群无人机', desc: '快速分裂火力，同时猎杀多名靠前敌人。',
    cost: 2680, kind: 'support', icon: 'icon_support_drones',
  },
];
