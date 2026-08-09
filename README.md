# 僵尸炮台 Zombie Cannon

类"向僵尸开炮"的竖屏塔防射击 H5 小游戏：炮台自动索敌开火（按住屏幕可手动瞄准），僵尸成波推进攻击基地墙；击杀掉金币，波次间三选一局内强化，通关解锁关卡、赚金币做永久养成。

[直接下载 Android APK](https://github.com/tjujingzong/zombie-cannon/releases/download/android-latest/zombie-cannon-android.apk) · [在线游玩](https://tjujingzong.github.io/zombie-cannon/)

- 技术栈：Phaser 3 + TypeScript + Vite
- 部署：GitHub Pages（自动 CI）
- 安卓：Capacitor 打包 WebView 应用
- 美术/音效：统一的末日军械视觉与程序化音频，角色/技能纹理保留正式位图替换能力

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 产物输出到 dist/
```

## 游戏内容

| 模块 | 说明 |
| --- | --- |
| 关卡引擎 | 50 关（`src/data/levels.ts`）：1~10 关手工教学递进；11~50 关由确定性 PRNG 程序化生成，难度持续上升。每 5 关一个 Boss 关（5/10/15/.../50），每 10 关一个大章节，biome 循环 |
| 敌人 | 18 种僵尸，覆盖远程、治疗、召唤、潜地、分裂、减伤、吸血等行为，并带四种精英词缀与首领二阶段 |
| 图鉴 | 主菜单「图鉴」入口：僵尸图鉴（行为/弱点/对策/威胁等级）、技能图鉴、组合技、战术指南（`src/scenes/CodexScene.ts`） |
| 局内升级 | 24 个技能、17 个组合技、四条终极流派，以及战前选技、波间风险契约、三种开局挑战契约、过载与随机战场事件 |
| 局外养成 | 六项永久强化、背景/装饰/辅助炮台、27 种行为装备组合，以及追猎/磁暴/急救三协议的 R-7 战术伙伴 |
| 长期模式 | 上海时区每日挑战、种子化末日无尽、每周行动任务、军需奖励与八项终身成就 |
| 音效系统 | Web Audio API 程序化合成（`src/systems/AudioSystem.ts`）：分层 BGM（普通/Boss/菜单三种主题）+ 18 种 SFX。首次交互自动解锁，菜单/HUD 提供静音按钮 |
| 视觉特效 | 子弹拖尾、枪口闪光、击杀冲击波、Boss 光环王冠入场、暴击顿帧、低血红屏、10 种 biome 背景配色、氛围灰烬粒子 |
| 存档 | localStorage v5，保存进度、构筑、军械、行为装备、伙伴协议、挑战契约、每日/无尽/行动档案数据，并支持菜单导入/导出 |

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库并推送本项目：
   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. 仓库 Settings -> Pages -> Build and deployment，Source 选择 **GitHub Actions**。
3. 之后每次 push 到 `main`，`.github/workflows/deploy.yml` 会自动构建并发布。
   访问地址：`https://<你的用户名>.github.io/<仓库名>/`

> `vite.config.ts` 已设置 `base: './'`（相对路径），无需按仓库名改 base。

## 打包安卓应用（Capacitor）

### 从 GitHub 下载

每次推送 `main` 时，`Build Android APK` 工作流都会更新 [Android 最新体验版](https://github.com/tjujingzong/zombie-cannon/releases/tag/android-latest)。点击页面 Assets 下的 `zombie-cannon-android.apk` 即可下载；也可以使用 README 顶部的固定直链。这个体验包由 Android 调试证书签名，可直接侧载安装，不会过期。

首次侧载时，Android 会要求允许浏览器或文件管理器“安装未知应用”。配置正式签名后，带 `v*` 的 Git 标签会构建签名正式版，并自动附加到独立的 GitHub Release，文件名类似 `zombie-cannon-v0.1.0.apk`。

### 本地构建测试 APK

仓库已经包含 `android/` 原生工程：

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug       # macOS / Linux
./gradlew.bat assembleDebug   # Windows
```

APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`。也可运行 `npm run android:open`，在 Android Studio
中连接真机调试。Web 代码有变化时要先重新执行 `npm run android:sync`。

### 配置 GitHub 正式签名

先在本机创建一次长期保存的发布密钥：

```bash
keytool -genkeypair -v -keystore zombie-cannon-release.jks -alias zombie-cannon \
  -keyalg RSA -keysize 2048 -validity 10000
```

在仓库 `Settings -> Secrets and variables -> Actions` 添加：

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `.jks` 文件的 Base64 文本 |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库密码 |
| `ANDROID_KEY_ALIAS` | 例如 `zombie-cannon` |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

Windows PowerShell 可用下面的命令取得 Base64 文本：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('zombie-cannon-release.jks')) | Set-Clipboard
```

四项 Secret 配好后，用版本标签触发正式发布：

```bash
git tag v0.1.0
git push origin v0.1.0
```

发布密钥一旦用于首个正式版本，后续更新必须继续使用同一份 `.jks`。请把它离线备份，绝不能提交到 Git。

## 目录结构

```
src/
  main.ts              # Phaser 启动与缩放配置（720x1280 FIT）
  data/                # 数值平衡 balance.ts、关卡引擎 levels.ts、技能 skills.ts
  systems/             # WaveManager 波次 / SkillSystem 局内升级 / SaveManager 存档
                       # MetaUpgrades 局外养成 / AudioSystem 程序化音频
  entities/            # Cannon 炮台 / Bullet 子弹 / Zombie 僵尸 / Coin 金币（对象池）
  scenes/              # Boot(纹理生成) / Menu / LevelSelect(含商店,50关滚动)
                       # Codex(图鉴) / Game(战斗) / UI(HUD+静音) / Result(结算)
  ui/helpers.ts        # 按钮、文本样式等 UI 工具
```
