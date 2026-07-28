# 僵尸炮台 Zombie Cannon

类"向僵尸开炮"的竖屏塔防射击 H5 小游戏：炮台自动索敌开火（按住屏幕可手动瞄准），僵尸成波推进攻击基地墙；击杀掉金币，波次间三选一局内强化，通关解锁关卡、赚金币做永久养成。

- 技术栈：Phaser 3 + TypeScript + Vite
- 部署：GitHub Pages（自动 CI）
- 安卓：Capacitor 打包 WebView 应用
- 美术：全部程序化生成（零外部资源），可随时替换正式素材

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 产物输出到 dist/
```

## 游戏内容

| 模块 | 说明 |
| --- | --- |
| 关卡 | 10 关（`src/data/levels.ts`），波次/怪物类型/血量系数可配置 |
| 敌人 | 普通 / 快速 / 肉盾 / Boss（周期召唤小怪） |
| 局内升级 | 波次间三选一：火力、攻速、多重、穿透、暴击、修墙 |
| 局外养成 | 金币永久升级：攻击、攻速、墙体上限、金币加成 |
| 存档 | localStorage（金币、关卡星级、养成等级），安卓 WebView 同样生效 |

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

首次生成安卓工程（本仓库已包含 `android/` 则跳过第 1 步）：

```bash
npx cap add android      # 1. 生成 android/ 原生工程
npm run android:sync     # 2. 构建 web 产物并同步进安卓工程
npm run android:open     # 3. 用 Android Studio 打开
```

在 Android Studio 中：

1. 等待 Gradle 同步完成（首次需下载依赖）。
2. 菜单 Build -> Build Bundle(s) / APK(s) -> Build APK(s) 生成调试版 APK。
3. 正式发布用 Build -> Generate Signed Bundle / APK 并配置签名。

建议在 `android/app/src/main/AndroidManifest.xml` 的 `<activity>` 上加
`android:screenOrientation="portrait"` 锁定竖屏。

改动 web 代码后重新执行 `npm run android:sync` 即可同步到安卓工程。

## 目录结构

```
src/
  main.ts              # Phaser 启动与缩放配置（720x1280 FIT）
  data/                # 数值平衡 balance.ts、关卡配置 levels.ts
  systems/             # WaveManager 波次 / UpgradeSystem 局内升级
                       # SaveManager 存档 / MetaUpgrades 局外养成
  entities/            # Cannon 炮台 / Bullet 子弹 / Zombie 僵尸 / Coin 金币（对象池）
  scenes/              # Boot(纹理生成) / Menu / LevelSelect(含商店)
                       # Game(战斗) / UI(HUD) / Result(结算)
  ui/helpers.ts        # 按钮、文本样式等 UI 工具
```
