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
    key: 'decor_floodlights', name: '防线探照灯', desc: '在基地两侧安装动态探照灯。',
    cost: 380, kind: 'decor', icon: 'icon_floodlight',
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
];
