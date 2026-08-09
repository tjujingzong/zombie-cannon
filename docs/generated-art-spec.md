# AI 游戏素材生成规格

本规格用于把 AI 生图资产接入《僵尸炮台》。2026-08-09 已在用户授权下通过 `imagegen` CLI fallback 完成 v1 批次，模型为 `gpt-image-2`、质量为 `high`。游戏继续保留程序化纹理作为加载失败时的兜底。

- 完整批次提示词：`docs/generated-art-prompts-v1.jsonl`
- 原始色键图：`output/imagegen/zombie-cannon-v1/`
- 最终透明运行时素材：`public/assets/generated/zombies/` 与 `public/assets/generated/skills/`
- 角色最长边：512 px；终极技能图标：256×256 px。

## 视觉方向

- 用途：竖屏移动塔防，敌人战斗显示约 44 至 132 px，技能图标显示约 64 至 96 px。
- 风格：精致 2.5D 卡通末日军事风，轮廓粗而清楚，材质有轻量手绘高光，不做写实血腥。
- 可读性：缩到 64 px 时仍能凭轮廓和主色识别；避免细碎配件、灰黑一团和大面积透明烟雾。
- 统一光照：左上方冷白主光，右下方柔和暗部，角色正面略亮。
- 输出：源图 1024×1024 PNG；主体四周至少留 12% 空白；无文字、标志、水印、地面和投影。
- 抠图：内置生图使用纯色 `#00ff00` 背景，生成后调用 `remove_chroma_key.py`，最终保存透明 PNG。
- 最终目录：`public/assets/generated/zombies/` 与 `public/assets/generated/skills/`。

## 敌人素材

每个条目必须单独生成，不使用一张图同时承载多个不同角色。

### 尸潮之王

```text
Use case: stylized-concept
Asset type: mobile tower-defense enemy sprite
Primary request: full-body zombie king, huge asymmetric upper body, broken military coat, bio-mechanical crown fused into the skull, clenched heavy fists
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background
Style/medium: polished 2.5D hand-painted mobile game character, bold readable silhouette, restrained non-gory decay
Composition/framing: centered front three-quarter view, entire body visible, generous padding, feet aligned, readable at 96 px
Lighting/mood: cold upper-left rim light, ominous but playful power fantasy
Color palette: bruised violet skin, charcoal coat, hot amber crown core, small red warning accents; no green on the subject
Constraints: one character only; crisp edges; no floor, shadow, reflection, text, UI, watermark, smoke, loose particles, or #00ff00 on the subject
```

### 四种精英

共用基础形体：穿破损工装的强壮腐尸，宽肩、短腿、双臂前伸。分别生成以下变体：

- `elite-swift-v1.png`：前倾冲刺姿态，黄色导流绑带，鞋底机械增压器，轮廓细长。
- `elite-armored-v1.png`：灰白拼装重甲、胸前厚钢板、方形肩甲，轮廓最宽。
- `elite-regenerating-v1.png`：青绿色医疗罐与发光缝合线，背部再生泵，避免透明液体和软边烟雾。
- `elite-splitting-v1.png`：珊瑚红裂殖囊、左右略不对称，腹侧有两个封闭的小型芽体，不出现额外角色。

共用提示词尾部：

```text
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background
Style/medium: polished 2.5D hand-painted mobile game enemy, bold readable silhouette, non-gory
Composition/framing: one full-body character centered in front three-quarter view, entire body visible, generous padding, readable at 64 px
Constraints: crisp opaque edges; no green on the subject; no floor, shadow, reflection, text, UI, watermark, smoke, or loose particles
```

## 终极技能图标

每个图标单独生成。主体需填满画布约 72%，不使用文字或外部方框；最终统一裁成 256×256 透明 PNG。

- `ultimate-elemental-cataclysm-v1.png`：橙红火核被青蓝冰环夹碎，中心强亮、冷热对撞、轮廓近圆形。
- `ultimate-infinite-barrage-v1.png`：五条青蓝弹道从银色炮口扇形爆发，并有两条回旋跳弹轨迹。
- `ultimate-orbital-command-v1.png`：紫色轨道准星锁定橙色目标核心，三枚微型导弹向中心俯冲。
- `ultimate-eternal-fortress-v1.png`：绿色六边护盾包住钢铁城墙，下方三个金色地雷节点形成稳定三角形。

共用提示词尾部：

```text
Use case: stylized-concept
Asset type: premium mobile game ultimate skill icon
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background
Style/medium: polished 2.5D hand-painted icon, bold simple silhouette, high contrast, restrained highlights
Composition/framing: single centered emblem, square composition, generous clean padding, readable at 64 px
Constraints: no text, letters, numbers, border frame, UI card, watermark, floor, cast shadow, or #00ff00 in the icon
```

## 验收

- 透明角像素 alpha 必须为 0，主体覆盖率建议 45% 至 78%。
- 缩放到 64×64 后，四种精英与四种终极技能仍可盲测区分。
- 角色脚底锚点统一为 `(0.5, 0.88)`，技能图标锚点统一为 `(0.5, 0.5)`。
- 不覆盖现有程序化纹理；先以 `-v1` 文件名接入并截图对比，确认后再切换默认清单。
