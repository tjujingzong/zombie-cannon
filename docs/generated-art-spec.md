# 正式游戏素材规范

《僵尸炮台》的敌人美术采用两条明确分工的生产线：普通僵尸使用 Phaser 程序绘制，Boss 使用 ImageGen 正式位图。这样可以让高密度尸潮保持统一、轻量和高可读性，同时让首领登场拥有足够的视觉冲击。

## 资产分工

| 类型 | 生产方式 | 运行时尺寸 | 设计目标 |
| --- | --- | --- | --- |
| 普通僵尸、元素变体、精英词缀 | `BootScene.drawZombie()` 程序绘制 | 约 32~96 px | 同一骨架语言、靠轮廓/挂件/元素色快速识别 |
| 首领 | ImageGen `gpt-image-2` + 本地色键去背 | 最长边 512 px | 独特轮廓、完整全身、章节主题与元素属性一眼可见 |
| 技能和模块图标 | Phaser 程序图标；终极技能保留正式位图 | 64~256 px | 高对比、无文字、小尺寸仍清晰 |

普通敌人不得使用 AI 角色立绘替换。旧的四张精英位图已经从运行时和仓库移除，精英能力继续通过原始程序绘制形体、色带和战斗特效表达。

## Boss v2 批次

- 熔冠暴君：`public/assets/generated/zombies/zombie-boss-inferno-v2.png`
- 永冻母皇：`public/assets/generated/zombies/zombie-boss-glacier-v2.png`
- 雷暴主教：`public/assets/generated/zombies/zombie-boss-tempest-v2.png`
- 疫医缝合王：`public/assets/generated/zombies/zombie-boss-plague-v2.png`
- 虚空典狱长：`public/assets/generated/zombies/zombie-boss-void-v2.png`
- 完整生成参数与提示词：`docs/generated-art-prompts-v2.jsonl`

生成模式为用户授权的 ImageGen CLI fallback，模型 `gpt-image-2`，质量 `high`。源图使用纯色键背景：一般角色使用 `#00ff00`，绿色疫医使用 `#ff00ff`。随后调用技能内置 `remove_chroma_key.py`，参数为 `--auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill`，最终用 Lanczos 缩放至最长边 512 px。

## 普通僵尸规范

- 共用原始程序绘制的头、躯干、手臂、腿部结构，不改变游戏原有卡通比例。
- 通过护盾、背包、导电线圈、药罐、装甲、元素胸标等挂件区分行为原型。
- 八种伤害属性都有固定强调色：动能灰、火焰橙、寒冰青、雷电黄、爆破橙红、腐蚀绿、能量紫、引力紫黑。
- 颜色不是装饰。胸标颜色必须与 `zombies.ts` 的元素、弱点、抗性和免疫数据一致。
- 尸潮密集时优先保证头部、肩宽和强调色可辨识，避免过细线条和大面积半透明效果。

## 验收标准

- Boss PNG 必须为 RGBA，四角 alpha 为 0，主体边界不能接触画布。
- 完整身体、脚部和武器必须在画布内；不得出现文字、标志、水印、地面或投影。
- 缩到 96 px 后仍能通过轮廓和主色区分五个 Boss。
- 绿色或洋红色残边不可见；主体内部不能被误抠出大面积孔洞。
- `BootScene` 必须为所有运行时纹理提供加载或程序兜底，Android 离线包内不得依赖远程图片。
