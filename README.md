# 僵尸炮台 Zombie Cannon

> 一款把“瞄准、爆发、清屏、再来一波”压缩进竖屏的末日塔防射击游戏。

[在线游玩](https://tjujingzong.github.io/zombie-cannon/) · [下载 Android 1.0 APK](https://github.com/tjujingzong/zombie-cannon/releases/download/v1.0.0/zombie-cannon-v1.0.0.apk) · [查看全部 Releases](https://github.com/tjujingzong/zombie-cannon/releases)

![Phaser 3](https://img.shields.io/badge/Phaser-3.85-2f855a) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6) ![Android](https://img.shields.io/badge/Android-APK-3ddc84) ![Enemies](https://img.shields.io/badge/Enemies-55-ef5350) ![Skills](https://img.shields.io/badge/Skills-48-ffca28)

![战斗画面](https://raw.githubusercontent.com/tjujingzong/zombie-cannon/main/pics/zombie-cannon-v1.0-battle.png)

## 为什么它玩起来很解压

《僵尸炮台》的核心不是慢慢磨血，而是让压力快速堆高，再用构筑爆发把整片尸潮清空。

- **尸潮够密**：腐尸、突袭者、重甲、治疗、召唤和元素变体一起压向防线，画面始终有目标可打。
- **反馈够爽**：多重炮管、穿透、弹射、连锁闪电、爆破、引力聚怪、暴击顿帧和屏震能叠成真正的清屏时刻。
- **构筑有变化**：每波三选一、战前免费技能、29 个组合技、行为装备和伙伴协议共同决定这一局怎么赢。
- **克制有意义**：八种伤害属性会真实参与伤害结算。打到免疫目标是 0 伤害，命中弱点则能获得 1.55 倍基础倍率。
- **随时能开一局**：网页直接玩，Android APK 直接安装；关卡、无尽、每日挑战和行动任务共用同一份离线存档。

## 内容规模

| 系统 | 当前内容 |
| --- | --- |
| 关卡 | 50 关；第 1 至第 10 关为手工教学，第 11 至第 50 关由确定性随机引擎生成；每 5 关进入 Boss 战 |
| 敌人 | 55 类：18 个基础行为单位、32 个程序绘制元素变体、5 个正式立绘元素 Boss |
| 元素 | 动能、火焰、寒冰、雷电、爆破、腐蚀、能量、引力；弱点 ×1.55、抗性 ×0.58、免疫 ×0 |
| 技能 | 48 个局内技能、29 个组合技、过载主动爆发与四条终极构筑路线 |
| 永久强化 | 12 项金币升级，覆盖攻击、攻速、暴击、穿透、元素克制、护盾、赏金与过载 |
| 军械库 | 14 件背景、装饰和辅助武器；哨戒、特斯拉、迫击炮、寒潮、等离子与无人机均有独立战斗逻辑 |
| 行为装备 | 炮管、弹药、城墙各 5 件，共 125 种三槽组合 |
| 战术伙伴 | R-7 提供追猎、磁暴、急救、轰炸、链闪、守护 6 套协议 |
| 长期玩法 | 每日挑战、种子化末日无尽、每周行动、军需奖励、挑战契约与终身成就 |

普通僵尸保留原始 Phaser 程序绘制风格，确保大规模同屏时轻量且易读；只有 Boss 使用 ImageGen 正式位图。素材生产与验收规则见 [正式游戏素材规范](docs/generated-art-spec.md)。

## Android 下载

最直接的下载地址：

**[下载正式版 zombie-cannon-v1.0.0.apk](https://github.com/tjujingzong/zombie-cannon/releases/download/v1.0.0/zombie-cannon-v1.0.0.apk)**

也可以打开 [v1.0.0 正式版 Release](https://github.com/tjujingzong/zombie-cannon/releases/tag/v1.0.0)，展开页面底部的 **Assets**，点击 `zombie-cannon-v1.0.0.apk`。持续集成版仍可从 [Android 最新体验版](https://github.com/tjujingzong/zombie-cannon/releases/tag/android-latest) 下载。

体验版由 GitHub Actions 在每次推送 `main` 后自动构建，并覆盖 `android-latest` 标签下的同名 APK。首次安装时，Android 会提示允许浏览器或文件管理器“安装未知应用”。正式签名版使用 `v*` 标签发布，当前正式版本为 `v1.0.0`。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev -- --port 7897
npm run build
npm run lint
```

开发地址为 `http://localhost:7897`。生产构建输出到 `dist/`。

## 本地构建 Android APK

仓库已经包含 Capacitor Android 工程，并与网页版共用同一份 `dist/`：

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug       # macOS / Linux
./gradlew.bat assembleDebug   # Windows
```

APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

`android/app/build.gradle` 对 CI 环境变量提供默认值；没有正式签名 Secret 时构建可安装的 debug APK，有完整签名配置和 `v*` 标签时构建 release APK。

## 正式签名发布

在仓库 `Settings -> Secrets and variables -> Actions` 配置：

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 发布 `.jks` 的 Base64 内容 |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

然后推送版本标签：

```bash
git tag v1.0.0
git push origin v1.0.0
```

发布密钥用于首个正式版本后必须长期保留，并且不能提交到 Git。

## 项目结构

```text
src/
  data/       关卡、55 类敌人、技能、军械、装备与长期玩法数据
  entities/   炮台、子弹、僵尸、金币及对象池实体
  scenes/     启动、菜单、选关/商店、图鉴、战斗、HUD、结算
  systems/    波次、技能、存档、局外养成、音频、无尽与事件系统
public/assets/generated/
  zombies/    六张正式 Boss 透明 PNG
  skills/     终极技能正式图标
android/      Capacitor Android 原生工程
.github/      Pages 与 Android APK 自动构建工作流
```

## 质量检查

```bash
npm run check        # TypeScript + ESLint + Knip
npm run android:sync # Web 构建并同步 Android 资源
npx cap doctor android
```

核心设计、数值与跨平台决策见 [设计思路](docs/设计思路.md)，版本演进见 [迭代记录](docs/迭代记录.md)。
