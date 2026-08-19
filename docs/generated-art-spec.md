# 正式游戏素材规范

> 运行时资产审计：2026-08-19（v1.1.0）。本文只约束游戏实际加载的素材；`output/` 和 `tmp/` 中的生成源图、色键图与验证脚本不进入 Web 或 APK。

《僵尸炮台》采用“程序绘制为主、关键节点位图强化”的混合资源方案。普通尸潮需要高同屏、低内存和统一轮廓，因此由 Phaser Graphics 生成；正式透明 PNG 集中用于首领和少数终极技能。

## 一、资产分工

| 类型 | 生产方式 | 运行时尺寸 | 设计目标 |
| --- | --- | --- | --- |
| 普通、元素、深渊、梦魇敌人 | `BootScene.drawZombie()` 程序绘制 | 约 32–96 px | 共享骨架，靠轮廓附件、胸标、元素色和行为识别 |
| 精英词缀 | 程序敌人 + 标签、色彩、光环与战斗特效 | 约 32–120 px | 能力可读，状态回池后可完整重置 |
| 前 6 类首领 | 正式透明 PNG + 程序光环/王冠 | 源文件最长边 512 px | 关键首领拥有独特轮廓和登场冲击 |
| 后 6 类首领 | Phaser 程序绘制 | 约 64–120 px | 控制资源预算，并与梦魇敌群保持一致 |
| 前 4 个终极技能 | 正式透明 PNG | 64–256 px | 在技能卡和构筑面板中形成高辨识锚点 |
| 湮灭阵列、钢铁王朝 | Phaser 程序图标 | 64 px | 与现有技能图标一致，避免把 UI 图标误当角色插画生产 |
| 其余技能、军械、装备、伙伴 | Phaser 程序图标 | 32–96 px | 高对比、无文字、小尺寸清晰 |

普通敌人不得批量改成 AI 角色位图。旧的四张精英位图已退出运行时；精英能力由原程序骨架、短标签和效果表达。

## 二、运行时位图清单

### 首领：6 张

| 纹理键 | 文件 | 对应角色 |
| --- | --- | --- |
| `art_zombie_boss_v1` | `public/assets/generated/zombies/zombie-boss-v1.png` | 初始首领 |
| `art_zombie_boss_inferno_v2` | `public/assets/generated/zombies/zombie-boss-inferno-v2.png` | 熔冠暴君 |
| `art_zombie_boss_glacier_v2` | `public/assets/generated/zombies/zombie-boss-glacier-v2.png` | 永冻母皇 |
| `art_zombie_boss_tempest_v2` | `public/assets/generated/zombies/zombie-boss-tempest-v2.png` | 雷暴主教 |
| `art_zombie_boss_plague_v2` | `public/assets/generated/zombies/zombie-boss-plague-v2.png` | 疫医缝合王 |
| `art_zombie_boss_void_v2` | `public/assets/generated/zombies/zombie-boss-void-v2.png` | 虚空典狱长 |

钢铁君主、灼阳暴君、渊狱霸主、腐化大帝、辉光至尊、终焉核心没有独立位图，按设计使用 `zombie_boss_*` 程序纹理。`Zombie` 会优先使用 `artTexture`，不存在时回退到 `texture`。

### 终极技能：4 张

| 纹理键 | 文件 |
| --- | --- |
| `art_ultimate_elemental_cataclysm_v1` | `public/assets/generated/skills/ultimate-elemental-cataclysm-v1.png` |
| `art_ultimate_infinite_barrage_v1` | `public/assets/generated/skills/ultimate-infinite-barrage-v1.png` |
| `art_ultimate_orbital_command_v1` | `public/assets/generated/skills/ultimate-orbital-command-v1.png` |
| `art_ultimate_eternal_fortress_v1` | `public/assets/generated/skills/ultimate-eternal-fortress-v1.png` |

另外两个终极节点分别使用 `icon_ultimate_apocalypse` 和 `icon_ultimate_dynasty`，由 `BootScene` 生成。

## 三、缺口审计结论

v1.1.0 的所有资源引用均有加载项或程序纹理，当前**没有会造成空白、404 或 Android 离线缺图的必需 ImageGen 素材**。

- 6 张 Boss 位图、4 张终极技能位图已在 `BootScene.preload()` 注册。
- 后续 Boss 的 `artTexture` 留空是明确的程序绘制策略。
- 两个新终极图标已由 `makeSkillIcons()` 生成，不是占位键或缺失文件。
- `npm run android:sync` 会把 `public/assets/generated/` 同步进 APK；只执行 Gradle 不会自动刷新这些 Web 资源。

未来只有在以下条件同时满足时，才将程序素材升级为正式位图：该对象是高频视觉锚点；现有程序轮廓无法在目标尺寸表达机制；增加资源不会破坏内存、包体和风格预算；Web 与 Android 都能离线打包并验证。

## 四、ImageGen 生产规则

已交付的五张元素 Boss v2 使用 `gpt-image-2` 高质量方图生成，完整参数保存在 `generated-art-prompts-v2.jsonl`。生成时使用纯色键背景，一般角色使用 `#00ff00`，绿色疫医使用 `#ff00ff`，再用技能内置 `remove_chroma_key.py` 去背并以 Lanczos 缩放到最长边 512 px。

新生产任务必须保留：

1. 版本化文件名，例如 `zombie-boss-<theme>-v3.png`，不直接覆盖已发布资产。
2. 最终提示词、模型、尺寸、质量、输出格式和色键选择。
3. 原始色键图与可复现处理参数；这些中间产物放在被 Git 忽略的 `output/` 或 `tmp/`。
4. 最终 RGBA 文件放入 `public/assets/generated/`，并更新 `BootScene`、本清单和 Android 同步产物。

生成提示词应包含：单角色、完整全身、居中、三分之四视角、足部不裁切、留足边距、无文字、无 Logo、无水印、无地面、无投影、无烟雾散粒，并要求缩到 96 px 后轮廓仍可辨识。

## 五、程序敌人规范

- 共用头、躯干、手臂、腿和胸前徽记的基础语言，不随内容扩展任意更换比例。
- 快速/跃袭者强化腿部或侧翼；重甲/护盾强化外轮廓；远程/自爆强化投射或核心；治疗/召唤强化头顶结构；Boss 强化王冠轮廓。
- 八种元素使用固定强调色：动能灰、火焰橙、寒冰青、雷电黄、爆破橙红、腐蚀绿、能量紫、引力紫黑。
- 颜色不是装饰。胸标必须对应 `zombies.ts` 的 `element`，图鉴中的弱点、抗性和免疫必须与伤害结算一致。
- 密集尸潮优先保证头部、肩宽、胸标和精英短标签可读，避免细线和大面积半透明。

## 六、验收标准

### 位图

- PNG 为 RGBA，四角 alpha 为 0，主体边界不接触画布。
- 身体、脚部、装备完整，没有额外角色、文字、标志、水印、地面或投影。
- 缩到 96 px 后仍能通过轮廓和主色区分。
- 无绿色或洋红残边，主体内部没有误抠孔洞。
- `BootScene` 有明确加载键；消费端有程序纹理回退；浏览器网络面板无 404。

### 游戏与 Android

- 720 × 1280 和宽屏 FIT 下不拉伸、不遮挡 UI，Boss 血条与精英标签保持可见。
- `npm run build` 后文件存在于 `dist/assets/generated/`。
- `npm run android:sync` 后文件存在于 `android/app/src/main/assets/public/assets/generated/`。
- APK 在飞行模式下进入图鉴和首领战，所有正式位图正常显示。
- 新素材加入前后记录构建体积和目标设备内存，异常增长必须说明原因。

## 七、快速核对

```bash
npm run check
npm run android:sync
```

代码审计重点：

- `src/scenes/BootScene.ts`：加载键、程序生成键与兜底。
- `src/data/zombies.ts`：`texture` / `artTexture` 映射。
- `src/data/skills.ts`：终极技能 `icon` 映射。
- `public/assets/generated/`：Web 正式资产。
- `android/app/src/main/assets/public/assets/generated/`：APK 同步结果。
